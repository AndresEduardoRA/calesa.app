-- El buscador, la base (paso 7.12-1): una búsqueda por sección (leads, vehículos y cotizaciones) que el navegador llama y puede cancelar, con el mínimo
-- de búsqueda en el servidor y un tope chico por sección. Las de leads y vehículos son invocadoras (la RLS decide); la de cotizaciones es `security definer`
-- porque bajo la RLS un `ilike` no es condición de índice (`.claude/rules/migraciones.md` › «Forma») y vuelve a aplicar, fila por fila, la policy
-- «cotizaciones: leer». Nunca se busca por teléfono ni por un campo de un lead.

-- Qué busca un texto, espejo de `interpretarBusqueda()` (`src/modules/leads/entities/busqueda-de-leads.ts`) con `MINIMO_DE_BUSQUEDA`: `numero` si el texto
-- sin un `#` inicial son de 1 a 15 dígitos; `texto` (ese texto limpio) si tiene 3 letras o dígitos seguidos y no es «sólo número» (empezaba con `#` o tiene
-- menos de 3 caracteres). Los dos nulos = no busca nada (vacío, «Ro», «a b», «#»). Más de 100 caracteres tampoco busca. Puro.
create function public._buscador_interpretar(p_texto text, out numero bigint, out texto text)
language plpgsql immutable parallel safe
set search_path = ''
as $$
declare
  v_recortado constant text := btrim(coalesce(p_texto, ''));
  v_limpio constant text := btrim(regexp_replace(v_recortado, '^#', ''));
  v_solo_numero boolean;
begin
  if v_limpio = '' or length(v_recortado) > 100 then
    return;
  end if;
  if v_limpio ~ '^[0-9]{1,15}$' then
    numero := v_limpio::bigint;
  end if;
  v_solo_numero := numero is not null and (v_recortado like '#%' or length(v_limpio) < 3);
  if not v_solo_numero and v_limpio ~ '[[:alnum:]]{3}' then
    texto := v_limpio;
  end if;
end $$;

revoke all on function public._buscador_interpretar(text) from public, anon;
grant execute on function public._buscador_interpretar(text) to authenticated;

comment on function public._buscador_interpretar(text) is
  'Qué busca un texto del buscador (7.12): numero (1 a 15 dígitos, con o sin #) y texto (3 letras o dígitos seguidos, salvo «sólo número»). Espejo de interpretarBusqueda() con MINIMO_DE_BUSQUEDA. Puro; lo llaman buscador_leads, buscador_vehiculos y buscador_cotizaciones.';

-- Leads por nombre y `#n`. Devuelve ids (no filas: una `setof leads_vista` sólo nace en `_leads_vista_crear()`); el navegador los hidrata con
-- `leads_vista_por_ids`, que recorta teléfono y privados. Invocadora: la RLS de quien llama decide.
create function public.buscador_leads(p_texto text, p_tamano integer)
returns uuid[]
language plpgsql stable
set search_path = ''
as $$
declare
  v_n constant integer := public._acotar_pagina(p_tamano, 5, 20);
  b record;
  v_ids uuid[] := '{}'::uuid[];
begin
  if (select auth.uid()) is null then
    return '{}'::uuid[];
  end if;
  select i.numero, i.texto into b from public._buscador_interpretar(p_texto) i;
  if b.numero is null and b.texto is null then
    return '{}'::uuid[];
  end if;
  -- El número: el global con `leads.numero_global.ver`, si no el propio de quien llama (`leads_numeros_globales`/`leads_numeros_propios`, por su PK).
  if b.numero is not null then
    v_ids := public.leads_ids_del_numero(b.numero, (select public.tiene_permiso('leads.numero_global.ver')));
  end if;
  -- El nombre: la ventana de `leads_candidatos()` (índice de trigramas de `leads.nombre`, la búsqueda del listado) con sólo el texto, nunca
  -- `comparaciones`, `privados` ni `extra`: el texto se aplica a `l.nombre` y a nada más.
  if b.texto is not null then
    v_ids := v_ids || array(
      select j.x::uuid
        from jsonb_array_elements_text(public.leads_candidatos(jsonb_build_object('texto', b.texto, 'sentido', 'siguiente')) -> 'ids') with ordinality j (x, o)
       order by j.o);
  end if;
  -- Una sola pasada por `leads_vista_por_ids()` (la RLS de leads es el único filtro), sin repetir y en el orden de llegada: el número primero.
  return coalesce(array(
    select u.id
      from (select distinct on (x) x as id, o from unnest(v_ids) with ordinality t (x, o) order by x, o) u
     where u.id in (select v.id from public.leads_vista_por_ids(v_ids) v)
     order by u.o
     limit v_n + 1), '{}'::uuid[]);
end $$;

revoke all on function public.buscador_leads(text, integer) from public, anon;
grant execute on function public.buscador_leads(text, integer) to authenticated;

comment on function public.buscador_leads(text, integer) is
  'El buscador (7.12), sección leads: ids de los leads que quien llama ve, por número (leads_ids_del_numero) y por nombre (leads_candidatos con sólo el texto), el número primero, pasados por leads_vista_por_ids. Nunca por teléfono ni por un campo. Mínimo de _buscador_interpretar; hasta _acotar_pagina(p_tamano, 5, 20) + 1. Invocadora. La llama el navegador (src/modules/buscador).';

-- Vehículos por título, VIN o lote. Invocadora: la policy «vehiculos: leer» decide. Una ruta por origen visible.
create function public.buscador_vehiculos(p_texto text, p_tamano integer)
returns table (id uuid, origen_id uuid, titulo text, vin text, lote text, creado_en timestamptz)
language plpgsql stable
set search_path = ''
as $$
declare
  v_n constant integer := public._acotar_pagina(p_tamano, 5, 20);
  v_texto text;
  v_patron text;
begin
  if (select auth.uid()) is null then
    return;
  end if;
  select i.texto into v_texto from public._buscador_interpretar(p_texto) i;
  -- `#n` (sólo número) no busca vehículos; un número de 3 o más dígitos se busca como texto.
  if v_texto is null then
    return;
  end if;
  -- El patrón «contiene», escapado en línea como `_vehiculos_inventario_patron()` (`_lead_busqueda_patron` es de service_role).
  v_patron := '%' || replace(replace(replace(v_texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  -- Cada origen visible por `vehiculos_origen_listado_idx (origen_id, creado_en desc, id desc) where eliminado_en is null`, n + 1 por origen.
  return query
    select v.id, v.origen_id, v.titulo, v.vin, v.lote, v.creado_en
      from unnest(public.origenes_con_alcance('vehiculos.ver', 'propios')) o (id)
     cross join lateral (
       select x.id, x.origen_id, x.titulo, x.vin, x.lote, x.creado_en
         from public.vehiculos x
        where x.origen_id = o.id and x.eliminado_en is null
          and (x.titulo ilike v_patron or x.vin ilike v_patron or x.lote ilike v_patron)
        order by x.creado_en desc, x.id desc
        limit v_n + 1) v
     order by v.creado_en desc, v.id desc
     limit v_n + 1;
end $$;

revoke all on function public.buscador_vehiculos(text, integer) from public, anon;
grant execute on function public.buscador_vehiculos(text, integer) to authenticated;

comment on function public.buscador_vehiculos(text, integer) is
  'El buscador (7.12), sección vehículos: los que quien llama ve cuyo título, VIN o lote contiene el texto, del más nuevo al más viejo. Una ruta por origen de origenes_con_alcance(vehiculos.ver, propios) por vehiculos_origen_listado_idx. #n no busca vehículos. Mínimo de _buscador_interpretar; hasta _acotar_pagina(p_tamano, 5, 20) + 1. Invocadora. La llama el navegador (src/modules/buscador).';

-- Cotizaciones por número exacto o por título. `security definer`: vuelve a aplicar, sobre cada fila, la condición exacta de la policy «cotizaciones: leer»
-- (`20261028180656_base.sql`); quien cambie esa policy cambia ésta (`supabase/tests/areas/buscador/buscador.sql` compara las dos). Sin montos ni nada oculto.
create function public.buscador_cotizaciones(p_texto text, p_tamano integer)
returns table (id uuid, numero bigint, origen_id uuid, titulo text, clase public.clase_cotizacion, estado public.estado_cotizacion, creado_en timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_yo constant uuid := (select auth.uid());
  v_n constant integer := public._acotar_pagina(p_tamano, 5, 20);
  v_t uuid[];
  v_p uuid[];
  b record;
  v_patron text;
  v_ids uuid[] := '{}'::uuid[];
begin
  if v_yo is null then
    return;
  end if;
  select i.numero, i.texto into b from public._buscador_interpretar(p_texto) i;
  if b.numero is null and b.texto is null then
    return;
  end if;
  v_t := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'todos')), '{}');
  v_p := coalesce((select public.origenes_con_alcance('cotizaciones.ver', 'propios')), '{}');
  if cardinality(v_t) = 0 and cardinality(v_p) = 0 then
    return;
  end if;
  -- El número exacto, por `cotizaciones_numero_key`.
  if b.numero is not null then
    v_ids := array(select c.id from public.cotizaciones c where c.numero = b.numero and c.eliminado_en is null);
  end if;
  if b.texto is not null then
    v_patron := '%' || replace(replace(replace(b.texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    -- El título, por `cotizaciones_titulo_trgm`: a lo sumo 1.000 candidatas, antes de la visibilidad.
    v_ids := v_ids || array(select c.id from public.cotizaciones c where c.titulo ilike v_patron and c.eliminado_en is null limit 1000);
    -- Las propias, por `cotizaciones_creador_idx (creado_por, creado_en desc, id desc) where eliminado_en is null`: quien tiene «propios» encuentra las
    -- suyas aunque el título lo compartan miles de ajenas.
    if cardinality(v_p) > 0 then
      v_ids := v_ids || array(
        select c.id from public.cotizaciones c
         where c.creado_por = v_yo and c.eliminado_en is null and c.titulo ilike v_patron
         order by c.creado_en desc, c.id desc
         limit v_n + 1);
    end if;
  end if;
  if cardinality(v_ids) = 0 then
    return;
  end if;
  -- La policy «cotizaciones: leer», tal cual, sobre las candidatas (por la PK).
  return query
    select c.id, c.numero, c.origen_id, c.titulo, c.clase, c.estado, c.creado_en
      from public.cotizaciones c
     where c.id = any (v_ids)
       and c.eliminado_en is null
       and (c.origen_id = any (v_t)
            or (c.origen_id = any (v_p) and (c.creado_por = v_yo or public.en_cartera(c.lead_id))))
     order by (c.numero = b.numero) desc nulls last, c.creado_en desc, c.id desc
     limit v_n + 1;
end $$;

revoke all on function public.buscador_cotizaciones(text, integer) from public, anon;
grant execute on function public.buscador_cotizaciones(text, integer) to authenticated;

comment on function public.buscador_cotizaciones(text, integer) is
  'El buscador (7.12), sección cotizaciones: por número exacto (cotizaciones_numero_key) o por título (cotizaciones_titulo_trgm, hasta 1.000 candidatas, más las propias por cotizaciones_creador_idx), nunca por el lead. Security definer: repite la policy «cotizaciones: leer» fila por fila; sin papelera, sin montos, sin lead_id, vehiculo_id ni creado_por. Mínimo de _buscador_interpretar; hasta _acotar_pagina(p_tamano, 5, 20) + 1. La llama el navegador (src/modules/buscador).';
