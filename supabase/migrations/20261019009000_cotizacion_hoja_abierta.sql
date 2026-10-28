-- La hoja abierta, firmada por la base (paso 4.13, prompt 3a; 4-27, 4-28, 4-31 y 4-32). docs/DECISIONES.md, «Paso 4.13 (3a de 5)».
--
-- 4-27: «Guardar con la N» ya no acepta una hora que mande el cliente. `cotizacion_hoja()` devuelve `abierta`, un texto `<fórmula>.<µs>.<HMAC>` que firma la base
--   con una clave de Vault (`cotizacion:abierta`) sobre la persona, el origen, la versión de la fórmula y la hora de la apertura; `cotizacion_crear()` y
--   `cotizacion_evaluar()` lo reciben como `p_abierta` y de ahí sacan la versión y la hora. El tope de 24 h corre siempre que se guarda «con la abierta».
-- 4-28: `cotizacion_evaluar(…, p_abierta)` calcula con la versión Y las tarifas de la apertura: el total que se ve es el de la hoja que se dibujó.
-- 4-31: el `secundario` de un par trae `tipo_nodo` (el del porcentaje): la hoja deja de adivinarlo por la fuente de la última respuesta.
-- 4-32: cotizar pide `cotizaciones.crear` Y `cotizaciones.ver` del origen (la hoja, el recálculo por origen y el alta). La matriz de Roles no puede imponerlo: los
--   permisos son la unión de los roles y `crear` puede venir de uno y `ver` de otro.
--
-- Cambian dos firmas: se borran las de antes (una sobrecarga haría ambigua toda llamada con menos argumentos, como en …008900):
--   cotizacion_crear(id, origen, lead, entradas, formula_abierta, abierta_en, vehiculo?, vehiculo_nuevo?, modo_tc?, clase, con_la_abierta)
--     -> cotizacion_crear(id, origen, lead, entradas, abierta, vehiculo?, vehiculo_nuevo?, modo_tc?, clase, con_la_abierta)
--   cotizacion_evaluar(entradas, cotizacion?, origen?, vehiculo?, modo?, modo_tc?) -> (…, modo_tc?, abierta?)
-- `_cotizacion_abierta()` pasa a STABLE y sin el `for share` (lo toma `cotizacion_crear()` cuando cambió la versión): así la puede llamar `cotizacion_evaluar()`.

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La clave que firma la hoja abierta
-- ---------------------------------------------------------------------------------------------------------------------------------
-- 32 bytes al azar, una sola vez. Rotarla (actualizar el secreto) invalida las hojas que están abiertas: «ábrela de nuevo». Nadie la lee salvo las dos funciones de abajo.
do $$
begin
  if not exists (select 1 from vault.secrets s where s.name = 'cotizacion:abierta') then
    perform vault.create_secret(new_secret => encode(extensions.gen_random_bytes(32), 'hex'), new_name => 'cotizacion:abierta',
                                new_description => 'Clave que firma la hoja abierta de cotizar (4.13-3a)');
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Firmar y leer la hoja abierta
-- ---------------------------------------------------------------------------------------------------------------------------------
-- `<fórmula>.<µs desde 1970>.<hmac sha256 en hex>`. La firma cubre la persona, el origen, la fórmula y los µs: otra persona, otro origen o cualquier cambio de una letra la invalida.
-- Los µs van como entero y vuelven exactos mientras quepan en un double (hasta el año 2255).
create function public._cotizacion_abierta_firmar(p_origen uuid, p_formula uuid, p_cuando timestamptz)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_clave text; v_us bigint;
begin
  if v_uid is null or p_origen is null or p_formula is null or p_cuando is null then
    raise exception 'No se puede firmar la hoja abierta sin persona, origen, versión y hora.' using errcode = '42501';
  end if;
  select s.decrypted_secret into v_clave from vault.decrypted_secrets s where s.name = 'cotizacion:abierta';
  if v_clave is null then
    raise exception 'Falta la clave que firma la hoja abierta: avisa a quien administra el sistema.' using errcode = 'XX000';
  end if;
  v_us := round(extract(epoch from p_cuando) * 1000000)::bigint;
  return p_formula::text || '.' || v_us::text || '.'
         || encode(extensions.hmac(convert_to(format('cotizacion_abierta|%s|%s|%s|%s', v_uid, p_origen, p_formula, v_us), 'UTF8'), decode(v_clave, 'hex'), 'sha256'), 'hex');
end $$;
revoke all on function public._cotizacion_abierta_firmar(uuid, uuid, timestamptz) from public, anon, authenticated;
comment on function public._cotizacion_abierta_firmar(uuid, uuid, timestamptz) is
  'Firma (HMAC con la clave de Vault cotizacion:abierta) la hoja abierta de quien llama: fórmula, origen y hora. De nadie; la llama cotizacion_hoja. docs/COTIZADOR.md › «La hoja abierta (4.13-3a)».';

-- La verifica ANTES de convertir nada: una regex estricta (nada de mayúsculas, uuids a medias ni más de 16 dígitos) y la firma; recién entonces se casteca. Quien la lee es
-- la misma persona, en el mismo origen: lo firmado para otra no vale. Nula, mal formada o con la firma mal: 22023 `abierta_invalida` (hint `abierta`).
create function public._cotizacion_abierta_leer(p_abierta text, p_origen uuid)
returns table (formula_id uuid, abierta_en timestamptz) language plpgsql stable security definer set search_path = '' as $$
declare
  c_forma constant text := '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9]{1,16})\.([0-9a-f]{64})$';
  v_uid uuid := (select auth.uid());
  v_partes text[]; v_clave text; v_firma text;
begin
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  v_partes := regexp_match(p_abierta, c_forma);
  select s.decrypted_secret into v_clave from vault.decrypted_secrets s where s.name = 'cotizacion:abierta';
  if v_partes is null or v_uid is null or p_origen is null or v_clave is null then
    raise exception 'La hoja que abriste ya no es válida: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_invalida', hint = 'abierta';
  end if;
  v_firma := encode(extensions.hmac(convert_to(format('cotizacion_abierta|%s|%s|%s|%s', v_uid, p_origen, v_partes[1], v_partes[2]::bigint), 'UTF8'), decode(v_clave, 'hex'), 'sha256'), 'hex');
  if v_firma <> v_partes[3] then
    raise exception 'La hoja que abriste ya no es válida: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_invalida', hint = 'abierta';
  end if;
  return query select v_partes[1]::uuid, 'epoch'::timestamptz + v_partes[2]::bigint * interval '1 microsecond';
end $$;
revoke all on function public._cotizacion_abierta_leer(text, uuid) from public, anon, authenticated;
comment on function public._cotizacion_abierta_leer(text, uuid) is
  'Verifica la hoja abierta de quien llama en ese origen y devuelve la versión de la fórmula y la hora de la apertura; 22023 abierta_invalida si no es la que firmó la base. De nadie; la llaman cotizacion_crear y cotizacion_evaluar. docs/COTIZADOR.md › «La hoja abierta (4.13-3a)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- «Guardar con la N»: lo que todavía se puede guardar con esa versión
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Misma firma que en …008500, pero STABLE (el reloj es `statement_timestamp()`, no `clock_timestamp()`: la diferencia con un día de tope no se nota) y sin el candado, y el tope de 24 h de la apertura corre siempre (la llaman `cotizacion_crear` y `cotizacion_evaluar`). Que la versión haya
-- dejado de ser la publicada hace menos de un día sólo se mira si la abierta está archivada: la publicada no tiene «siguiente».
create or replace function public._cotizacion_abierta(p_origen uuid, p_formula uuid, p_abierta_en timestamptz)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  v_version int; v_estado text; v_siguiente timestamptz;
begin
  -- «Guardar con la N» no fija precios viejos para siempre: la hoja tiene que haberse abierto hace menos de un día y, si la versión ya no es la publicada, haber dejado de serlo hace menos de un día.
  if p_abierta_en < statement_timestamp() - interval '24 hours' then
    raise exception 'Abriste la hoja hace más de un día: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_vencida', hint = 'abierta';
  end if;
  select f.version, f.estado::text into v_version, v_estado from public.formulas f where f.id = p_formula and f.origen_id = p_origen and f.estado in ('publicada', 'archivada');
  if not found then
    raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
  end if;
  if v_estado = 'archivada' then
    select min(f.publicado_en) into v_siguiente from public.formulas f where f.origen_id = p_origen and f.version > v_version and f.estado in ('publicada', 'archivada');
    if v_siguiente is null or v_siguiente < statement_timestamp() - interval '24 hours' then
      raise exception 'Esa versión de la hoja se reemplazó hace más de un día: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_vencida', hint = 'abierta';
    end if;
  end if;
end $$;
revoke all on function public._cotizacion_abierta(uuid, uuid, timestamptz) from public, anon, authenticated;
comment on function public._cotizacion_abierta(uuid, uuid, timestamptz) is
  'Valida la versión de la hoja abierta para «Guardar con la N» (publicada o archivada de este origen; abierta hace menos de un día y, si ya no es la publicada, reemplazada hace menos de un día). STABLE y sin candado: el for share lo toma cotizacion_crear. De nadie; la llaman cotizacion_crear y cotizacion_evaluar. docs/COTIZADOR.md › «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La lectura que abre la hoja
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Misma que en …008900 con `tipo_nodo` en el secundario de un par (4-31), y `cotizacion_hoja()` con `ver` y la hoja abierta firmada.
create or replace function public._cotizacion_hoja(p_formula uuid, p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  fo public.formulas;
  v_cfg boolean; v_tc boolean; v_arr text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_nodos jsonb; v_grupos jsonb; v_niveles jsonb; v_visib jsonb; v_lee jsonb; v_vivas jsonb; v_opcion text; v_opcion_ok boolean;
  v_secciones jsonb; v_claves text[]; v_tarjeta jsonb; v_tonos jsonb;
begin
  select * into fo from public.formulas x where x.id = p_formula;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', p_origen);
  v_tc := public.tiene_permiso('empresa.tipos_cambio.gestionar');
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_arr, v_editables from public._nodos_visibles(p_formula) n;
  v_ctx := public._cotizacion_contexto(v_arr, fo.definicion, fo.visibilidad);
  v_ok := v_ctx -> 'ok';
  -- Copias en memoria de lo que se busca por nodo (un jsonb que viene de la tabla se vuelve a leer entero en cada operador).
  v_nodos := coalesce((select jsonb_object_agg(n ->> 'id', n) from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n), '{}'::jsonb);
  v_grupos := coalesce((select jsonb_object_agg(g ->> 'id', g ->> 'tono') from jsonb_array_elements(coalesce(fo.definicion -> 'grupos', '[]'::jsonb)) g where (g ->> 'tono') is not null), '{}'::jsonb);
  v_niveles := coalesce((select jsonb_object_agg(l.clave, l.nombre) from public.cotizaciones_niveles l), '{}'::jsonb);
  v_visib := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(fo.visibilidad, '{}'::jsonb)) e), '{}'::jsonb);
  -- Las tablas que lee algún nodo que quien llama ve (la regla de `cotizacion_tabla()`) y las que existen vivas para este origen.
  v_lee := coalesce((select jsonb_object_agg(t.nombre, true)
                       from (select distinct n ->> 'tabla' as nombre from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n
                              where (n ->> 'tabla') is not null and n ->> 'id' = any (v_arr)) t), '{}'::jsonb);
  v_vivas := coalesce((select jsonb_object_agg(r.clave, true) from public.tablas_referencia r where r.activa and (r.origen_id = p_origen or r.origen_id is null)), '{}'::jsonb);
  select n ->> 'id' into v_opcion from jsonb_array_elements(coalesce(fo.definicion -> 'nodos', '[]'::jsonb)) n where n ->> 'tipo' = 'opcion' limit 1;
  v_opcion_ok := v_opcion is not null and v_ok ? v_opcion;

  with it as (
    select s.ord as so, i.ord as io, s.value as sec, i.value as item, i.value ->> 'tipo' as t, i.value ->> 'nodo' as nid
      from jsonb_array_elements(fo.diseno -> 'secciones') with ordinality s (value, ord)
     cross join lateral jsonb_array_elements(s.value -> 'items') with ordinality i (value, ord)
  ), vis as (
    -- Sólo viaja lo que su nodo (y, en un par, su porcentaje) permite.
    select it.*, v_nodos -> it.nid as n
      from it
     where v_ok ? it.nid and v_nodos ? it.nid
       and (it.t <> 'celda' or not (it.item ? 'secundario') or v_ok ? (v_nodos -> it.nid ->> 'pct'))
  ), obj as (
    select vis.so, vis.io, vis.sec,
           case when vis.t in ('celda', 'subtotal') then v_grupos ->> (vis.n ->> 'grupo') end as tono,
           case vis.t
             when 'celda' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'celda', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'tipo_nodo', vis.n ->> 'tipo',
                 'formato', coalesce(vis.n ->> 'formato', 'usd'), 'ancho', vis.item ->> 'ancho',
                 'tono', v_grupos ->> (vis.n ->> 'grupo'),
                 'ayuda', case
                            when (vis.item -> 'ayuda') ? 'texto' then jsonb_build_object('texto', vis.item -> 'ayuda' ->> 'texto')
                            when (vis.item -> 'ayuda') ? 'tabla'
                                 and (v_cfg or v_lee ? (vis.item -> 'ayuda' ->> 'tabla'))
                                 and ((jsonb_typeof(fo.params -> 'tablas') = 'object' and (fo.params -> 'tablas') ? (vis.item -> 'ayuda' ->> 'tabla'))
                                      or v_vivas ? (vis.item -> 'ayuda' ->> 'tabla'))
                              then jsonb_build_object('tabla', vis.item -> 'ayuda' ->> 'tabla') end,
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end,
                 'condicion', case when v_ok ? (vis.n ->> 'condicion') then vis.n ->> 'condicion' end,
                 'requerido_si', case when v_ok ? (vis.n ->> 'requerido_si') then vis.n ->> 'requerido_si' end,
                 'secundario', case when vis.item ? 'secundario' then
                     jsonb_build_object('nodo', vis.n ->> 'pct', 'como', vis.item ->> 'secundario', 'tipo_nodo', v_nodos -> (vis.n ->> 'pct') ->> 'tipo',
                                        'formato', coalesce(v_nodos -> (vis.n ->> 'pct') ->> 'formato', 'usd'))
                     || public._hoja_estado(v_nodos -> (vis.n ->> 'pct'), true, v_editables ? (vis.n ->> 'pct'),
                                            v_visib -> (vis.n ->> 'pct') ->> 'editar', v_niveles ->> (v_visib -> (vis.n ->> 'pct') ->> 'editar'), v_cfg, v_tc) end))
               || public._hoja_estado(vis.n, true, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
             when 'atajos' then jsonb_build_object('tipo', 'atajos', 'nodo', vis.nid,
                 'chips', public._hoja_chips(p_origen, fo.params, vis.n, vis.item ->> 'columna', (vis.item ->> 'filas')::int))
             when 'variante' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'variante', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta',
                 'opciones', coalesce((select jsonb_agg(jsonb_build_object('clave', o ->> 'clave', 'etiqueta', o ->> 'etiqueta', 'titulo', o ->> 'titulo'))
                                         from jsonb_array_elements(vis.n -> 'opciones') o), '[]'::jsonb),
                 'por_defecto', vis.n ->> 'por_defecto'))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
             when 'interruptor' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'interruptor', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'efecto', vis.item ->> 'efecto',
                 'solo_en', case when v_opcion_ok then vis.n -> 'solo_en' end))
               || public._hoja_estado(vis.n, false, v_editables ? vis.nid, v_visib -> vis.nid ->> 'editar', v_niveles ->> (v_visib -> vis.nid ->> 'editar'), v_cfg, v_tc)
             when 'subtotal' then jsonb_strip_nulls(jsonb_build_object(
                 'tipo', 'subtotal', 'nodo', vis.nid, 'etiqueta', vis.n ->> 'etiqueta', 'formato', coalesce(vis.n ->> 'formato', 'usd'),
                 'tono', v_grupos ->> (vis.n ->> 'grupo')))
           end as o
      from vis
  ), secs as (
    select o.so, jsonb_strip_nulls(jsonb_build_object('id', o.sec ->> 'id', 'titulo', o.sec ->> 'titulo', 'presentacion', o.sec ->> 'presentacion'))
                 || jsonb_build_object('items', jsonb_agg(o.o order by o.io)) as sec
      from obj o
     where o.o is not null
     group by o.so, o.sec ->> 'id', o.sec ->> 'titulo', o.sec ->> 'presentacion'
  )
  select coalesce((select jsonb_agg(s.sec order by s.so) from secs s), '[]'::jsonb),
         coalesce((select array_agg(distinct x.tono) from obj x where x.tono is not null), '{}'::text[])
    into v_secciones, v_claves;

  select coalesce(jsonb_agg(jsonb_build_object('clave', t.clave,
                                               'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                               'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave), '[]'::jsonb)
    into v_tonos from public.tonos t where t.clave = any (v_claves);

  v_tarjeta := jsonb_build_object('nodo', fo.diseno -> 'tarjeta_total' ->> 'nodo',
                                  'etiqueta', v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'etiqueta',
                                  'formato', coalesce(v_nodos -> (fo.diseno -> 'tarjeta_total' ->> 'nodo') ->> 'formato', 'usd'),
                                  'secundarios', coalesce((select jsonb_agg(jsonb_build_object('nodo', x.s, 'etiqueta', v_nodos -> x.s ->> 'etiqueta',
                                                                                              'formato', coalesce(v_nodos -> x.s ->> 'formato', 'usd')) order by x.o)
                                                             from jsonb_array_elements_text(coalesce(fo.diseno -> 'tarjeta_total' -> 'secundarios', '[]'::jsonb)) with ordinality x (s, o)
                                                            where v_ok ? x.s), '[]'::jsonb));

  return jsonb_build_object(
    'formula', jsonb_build_object('id', fo.id, 'version', fo.version),
    'cabecera', jsonb_build_object(
      'modos', coalesce((select jsonb_agg(jsonb_build_object('clave', m ->> 'clave', 'nombre', m ->> 'nombre'))
                           from jsonb_array_elements(coalesce(fo.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m), '[]'::jsonb),
      'ver_total_bs', coalesce((fo.diseno -> 'cabecera' ->> 'ver_total_bs')::boolean, false)),
    'secciones', v_secciones,
    'tarjeta_total', v_tarjeta,
    'tonos', v_tonos);
end $$;
revoke all on function public._cotizacion_hoja(uuid, uuid) from public, anon, authenticated;
comment on function public._cotizacion_hoja(uuid, uuid) is
  'El diseño de una versión de la fórmula recortado al nivel de quien llama: ítems cuyo nodo se ve, con su candado y su motivo, ayudas, atajos, modos (clave y nombre), tarjeta y tonos. De nadie; la llama cotizacion_hoja. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».';

create or replace function public.cotizacion_hoja(p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_nombre text; v_formula uuid; v_obligatorio boolean;
begin
  -- Los permisos, antes de mirar si el origen existe: con cualquier uuid, quien no cotiza ahí recibe el mismo 42501. Cotizar pide ver (4-32): con sólo `crear` la hoja iba vacía.
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023';
  end if;
  select o.nombre into v_nombre from public.origenes o where o.id = p_origen;
  if v_nombre is null then
    raise exception 'No encontramos ese origen.' using errcode = '22023';
  end if;
  select x.id into v_formula from public.formulas x where x.origen_id = p_origen and x.estado = 'publicada';   -- formulas_publicada_unica
  if v_formula is null then
    return jsonb_build_object('estado', 'sin_publicar', 'origen', jsonb_build_object('id', p_origen, 'nombre', v_nombre),
                              'puede_configurar', public.tiene_permiso('cotizaciones.configurar', p_origen));
  end if;
  select a.vehiculo_obligatorio_al_cotizar into v_obligatorio from public.ajustes_empresa a where a.id = 1;
  -- `abierta` es lo que `cotizacion_crear()` y `cotizacion_evaluar()` reciben como `p_abierta`: la versión y la hora, firmadas para esta persona y este origen (4-27 y 4-28).
  return jsonb_build_object('estado', 'lista', 'origen', jsonb_build_object('id', p_origen, 'nombre', v_nombre),
                            'abierta_en', now(), 'abierta', public._cotizacion_abierta_firmar(p_origen, v_formula, now()), 'vehiculo_obligatorio', coalesce(v_obligatorio, true))
         || public._cotizacion_hoja(v_formula, p_origen);
end $$;
revoke all on function public.cotizacion_hoja(uuid) from public, anon;
grant execute on function public.cotizacion_hoja(uuid) to authenticated;
comment on function public.cotizacion_hoja(uuid) is
  'La lectura que abre la hoja de cotizar de un origen: el diseño publicado recortado al nivel de quien llama, la versión de la fórmula, la hora y la hoja abierta firmada (p_abierta de cotizacion_crear y cotizacion_evaluar) o «sin_publicar». Con cotizaciones.crear y cotizaciones.ver del origen. docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)» y «La hoja abierta (4.13-3a)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- `cotizacion_evaluar` con la hoja abierta
-- ---------------------------------------------------------------------------------------------------------------------------------
drop function if exists public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text);

create function public.cotizacion_evaluar(
  p_entradas jsonb,
  p_cotizacion uuid default null,
  p_origen uuid default null,
  p_vehiculo uuid default null,
  p_modo jsonb default null,
  p_modo_tc text default null,
  p_abierta text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb; v_ok jsonb;
  v_cfg boolean;
  v_ent jsonb; v_ov_ocultos text[];
  v_modo jsonb := p_modo;
  v_formula uuid; v_abierta_en timestamptz; v_publicada uuid;
  v_res jsonb;
begin
  -- La hoja abierta es de una hoja nueva (por origen): una cotización ya trae su versión y sus tipos de cambio.
  if p_abierta is not null and p_cotizacion is not null then
    perform public.assert_activo();
    perform public._motor_fallar('llamada_invalida', 'p_abierta', 'Una cotización ya trae su versión de la hoja y sus tipos de cambio.');
  end if;
  -- Por origen se cotiza con `crear` y `ver` del origen (4-32), antes de leer la hoja abierta y de mirar nada más.
  if p_cotizacion is null and p_origen is not null then
    perform public.assert_permiso('cotizaciones.crear', p_origen);
    perform public.assert_permiso('cotizaciones.ver', p_origen);
    if p_abierta is not null then
      select l.formula_id, l.abierta_en into v_formula, v_abierta_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;
      select f.id into v_publicada from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';       -- formulas_publicada_unica
      -- Una versión que ya no es la publicada: ¿todavía se podría guardar con ella? Si no, «abierta_vencida» y la hoja pide recargar.
      if v_formula is distinct from v_publicada then
        perform public._cotizacion_abierta(p_origen, v_formula, v_abierta_en);
      end if;
    end if;
  end if;
  -- Con la hoja abierta (4-28): la versión Y las tarifas de la apertura, lo mismo que verá D2 al guardar «con la N»; sin ella, la publicada y las tarifas de hoy.
  if v_formula is not null then
    select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo, v_formula, v_abierta_en, true);
  else
    select * into a from public._cotizacion_armar(p_entradas, p_cotizacion, p_origen, p_vehiculo);
  end if;
  -- El modo por su clave (de esa versión) se vuelve la forma del motor antes de revisar lo tipeado.
  if p_modo_tc is not null then
    if p_modo is not null then
      perform public._motor_fallar('llamada_invalida', null, 'Pide el modo por su clave o completo, no los dos.');
    end if;
    v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  end if;
  v_cfg := public.tiene_permiso('cotizaciones.configurar', a.origen_id);
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb) into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  v_ok := v_ctx -> 'ok';
  v_ent := a.entrada;

  -- Lo tipeado (la forma, la fórmula inválida, inputs, banderas y variante que se ven): `_cotizacion_tipeado()`, la misma que revisa `cotizacion_crear()`.
  v_ov_ocultos := public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ok, p_cotizacion is not null);
  -- Un override de un nodo que existe y no se ve se quita antes del motor; vuelve como `nodo_inexistente` (abajo).
  if cardinality(v_ov_ocultos) > 0 then
    v_ent := jsonb_set(a.entrada, '{overrides}', (a.entrada -> 'overrides') - v_ov_ocultos);
  end if;
  -- Con una cotización, lo que quien llama no ve o no edita es lo GUARDADO (D7: guardar conserva lo que quien guarda no ve), y un valor distinto para un nodo que se ve y no se edita es un
  -- error. Con un origen no hay nada guardado.
  if p_cotizacion is not null then
    v_ent := public._cotizacion_conservar(a.definicion, v_ent, v_editables, a.guardado);
  end if;

  -- El modo: quien no configura sólo elige uno de los del diseño de esa versión (convertido a la forma del motor).
  if v_modo is not null and not v_cfg and not exists (
       select 1 from public.formulas f, jsonb_array_elements(coalesce(f.diseno -> 'cabecera' -> 'modos', '[]'::jsonb)) m
        where f.id = a.formula_id
          and jsonb_build_object('buckets', coalesce((select jsonb_object_agg(b ->> 'bucket', b ->> 'nodo') from jsonb_array_elements(m -> 'buckets') b), '{}'::jsonb),
                                 'total_en', m ->> 'total_en') = v_modo) then
    perform public._motor_fallar('modo_invalido', null, 'El modo no es uno de los que ofrece la hoja.');
  end if;

  v_res := public.evaluar_formula(a.definicion, a.params, v_ent, v_modo);
  v_res := public._cotizacion_recorte(v_res, v_ctx);

  -- Los overrides que se quitaron vuelven como inexistentes, entre los inexistentes y en su orden (por id, en bytes), después de los descartados de nodos que existen: es lo que el
  -- motor habría dicho si el nodo no estuviera. (Se agregan después de recortar: el recorte descarta, con razón, todo lo de un nodo que existe y no se ve.)
  if cardinality(v_ov_ocultos) > 0 then
    v_res := jsonb_set(v_res, '{overrides_descartados}', (
      select coalesce(jsonb_agg(x.e order by x.grupo, x.id collate "C", x.ord), '[]'::jsonb)
        from (select d.e, case when d.e ->> 'motivo' = 'nodo_inexistente' then 1 else 0 end as grupo, d.e ->> 'id' as id, d.ord
                from jsonb_array_elements(coalesce(v_res -> 'overrides_descartados', '[]'::jsonb)) with ordinality d (e, ord)
              union all
              select jsonb_build_object('id', k, 'motivo', 'nodo_inexistente'), 1, k, 0 from unnest(v_ov_ocultos) k) x));
  end if;
  return v_res;
end $$;
revoke all on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text) from public, anon;
grant execute on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text) to authenticated;
comment on function public.cotizacion_evaluar(jsonb, uuid, uuid, uuid, jsonb, text, text) is
  'Calcula una hoja y devuelve sólo lo que quien llama ve. El modo, completo (p_modo, el editor de la fórmula) o por su clave (p_modo_tc, la hoja), no los dos. Por origen pide cotizaciones.crear y cotizaciones.ver; con p_abierta (la de cotizacion_hoja) calcula con la versión y las tarifas de esa apertura. docs/COTIZADOR.md › «En la base (4.06-2)» y «La hoja abierta (4.13-3a)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- `cotizacion_crear` con la hoja abierta
-- ---------------------------------------------------------------------------------------------------------------------------------
drop function if exists public.cotizacion_crear(uuid, uuid, uuid, jsonb, uuid, timestamptz, uuid, jsonb, text, public.clase_cotizacion, boolean);

create function public.cotizacion_crear(
  p_id uuid,
  p_origen uuid,
  p_lead uuid,
  p_entradas jsonb,
  p_abierta text,
  p_vehiculo uuid default null,
  p_vehiculo_nuevo jsonb default null,
  p_modo_tc text default null,
  p_clase public.clase_cotizacion default 'preventa',
  p_con_la_abierta boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_uso uuid; v_vuelta int := 0; v_version int;
  v_ab_formula uuid; v_ab_en timestamptz;
  v_veh uuid := p_vehiculo;
  v_obligatorio boolean;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb;
  v_total_base numeric;
  v_constraint text;
begin
  perform public.assert_activo();
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  -- Cotizar pide también ver: con sólo `crear` la hoja no tiene nada que mostrar (4-32). Después de `crear`: quien no cotiza ahí sigue recibiendo ese permiso en el error.
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  -- D2: la hoja que se abrió. La firma la base (`cotizacion_hoja()`): trae la versión de la fórmula y la hora de la apertura, y no se puede inventar (4-27).
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  if p_clase = 'final' then
    perform public.assert_permiso('cotizaciones.final.gestionar', p_origen);
  end if;

  -- El intento: dos llamadas con el mismo id se ordenan acá (la segunda espera a que la primera confirme). Sólo una cotización MÍA, de este origen y viva se devuelve; un id ajeno
  -- no se mira (sería una sonda barata de ids): sigue y choca con la clave en el `insert`.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  if found then
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La hoja abierta: su firma, su versión y su hora. Después del intento: un reintento vuelve lo guardado aunque la clave haya rotado o la hoja sea vieja.
  select l.formula_id, l.abierta_en into v_ab_formula, v_ab_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;

  -- El lead (comprobar, bloquear y volver a comprobar: nadie bloquea un lead que no ve).
  if p_lead is null then
    raise exception 'Elige el lead de la cotización.' using errcode = '22023', hint = 'lead';
  end if;
  if not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for key share;
  if not found or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El vehículo.
  if p_vehiculo is not null and p_vehiculo_nuevo is not null then
    raise exception 'Elige un vehículo del inventario o carga uno a mano, no los dos.' using errcode = '22023', hint = 'vehiculo';
  end if;
  select coalesce((select e.vehiculo_obligatorio_al_cotizar from public.ajustes_empresa e where e.id = 1), true) into v_obligatorio;
  if p_vehiculo_nuevo is not null then
    if jsonb_typeof(p_vehiculo_nuevo) <> 'object' or (p_vehiculo_nuevo - array['id', 'datos', 'consulta']) <> '{}'::jsonb
       or coalesce(p_vehiculo_nuevo ->> 'id', '') !~ c_uuid
       or (p_vehiculo_nuevo ? 'consulta' and coalesce(p_vehiculo_nuevo ->> 'consulta', '') !~ c_uuid)
       or (p_vehiculo_nuevo ? 'datos' and jsonb_typeof(p_vehiculo_nuevo -> 'datos') <> 'object') then
      raise exception 'El vehículo a mano lleva su identificador y sus datos.' using errcode = '22023', hint = 'vehiculo';
    end if;
    v_veh := (p_vehiculo_nuevo ->> 'id')::uuid;
    -- En su propia sentencia y antes de armar: `_cotizacion_armar()` es STABLE y ve lo que esta transacción ya escribió.
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid);
  elsif p_vehiculo is not null then
    perform public._cotizacion_vehiculo(p_vehiculo);
  elsif v_obligatorio or p_clase = 'final' then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- La fórmula publicada, `for share` por su id: si publicaron mientras esperábamos, READ COMMITTED descarta la fila que ya se archivó y se vuelve a leer la nueva.
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- D2: la hoja se abrió sobre otra versión que la publicada. Sin «Guardar con la N», se avisa y no se guarda; con ella, se usa esa versión (publicada o archivada de este origen, y reciente).
  -- «Con la abierta» vale siempre dentro de las 24 h de la apertura (4-27): con la versión vigente sólo cambia algo si una tarifa cambió desde entonces, y la hora ya no la elige el cliente.
  v_uso := v_formula;
  if v_ab_formula is distinct from v_formula then
    select f.version into v_version from public.formulas f where f.id = v_formula;
    if not p_con_la_abierta then
      raise exception 'Se publicó la versión % de la hoja mientras cotizabas.', v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
    end if;
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
    -- `for share`, como la publicada: archivada ya no cambia, pero el candado ordena esta alta con quien la borre (un origen que se elimina).
    perform 1 from public.formulas f where f.id = v_ab_formula and f.estado in ('publicada', 'archivada') for share;
    if not found then
      raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
    end if;
    v_uso := v_ab_formula;
  elsif p_con_la_abierta then
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
  end if;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh, v_uso, v_ab_en, p_con_la_abierta);
  if a.formula_id is distinct from v_uso then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  -- D2: algún tipo de cambio que la hoja usa cambió desde que se abrió (ARMAR lo lee en una sola foto con los de hoy).
  if a.tc_cambiado and not p_con_la_abierta then
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok');

  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;
  -- Un valor para un nodo que se ve y no se edita.
  select min(t.k collate "C") into v_k
    from (select jsonb_object_keys(a.entrada -> 'inputs') as k
          union all select jsonb_object_keys(a.entrada -> 'banderas')
          union all select jsonb_object_keys(a.entrada -> 'overrides')) t
   where not v_editables ? t.k;
  if v_k is null and a.entrada ? 'variante' then
    select n ->> 'id' into v_opc from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
    if v_opc is not null and not v_editables ? v_opc then v_k := v_opc; end if;
  end if;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;

  -- El cálculo, entero (los nodos que quien llama no ve toman el valor de la fórmula y se guardan igual).
  v_res := public.evaluar_formula(a.definicion, a.params, a.entrada, v_modo);
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio; el total tiene que tener valor, caber y estar en la moneda base: `_cotizacion_guardable()`.
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_final_por_vehiculo' then
      raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
    end if;
    raise;
  end;

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $$;

revoke all on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean) from public, anon;
grant execute on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean) to authenticated;
comment on function public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean) is
  'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen, o sobre la abierta con p_con_la_abierta) y devuelve lo que quien llama ve (_cotizacion_respuesta). Pide cotizaciones.crear y cotizaciones.ver. Idempotente por el id del intento. D2: PT409 desactualizada si la hoja que se abrió (p_abierta, la de cotizacion_hoja) ya no es la vigente. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)», «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Los permisos dicen dónde se aplican
-- ---------------------------------------------------------------------------------------------------------------------------------
update public.permisos set descripcion = 'Crear cotizaciones preventa (por origen; pide también cotizaciones.ver del origen)' where clave = 'cotizaciones.crear';
update public.permisos set aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla, cotizacion_hoja, cotizacion_crear' where clave = 'cotizaciones.ver';
