-- El buscador, las rutas de `buscador_cotizaciones` (paso 7.12-2, contingencia de la medición): `supabase/tests/medir-buscador.sql` midió, con el plan genérico,
-- que un título raro de la dueña recorría su `cotizaciones_creador_idx` entero (2.235 bloques con 50.000 cotizaciones y 11.147 con 250.000; 46 y 229 ms): la ruta de
-- las propias corría también donde se ve «todos» (`origenes_con_alcance(…, 'propios')` incluye esos orígenes) y, sin el texto al planear, Postgres prefería el orden
-- del índice a buscar por el GIN. Ahora la ruta de las propias sólo corre en los orígenes donde quien llama tiene «propios» y no «todos» (donde ve todo, la ruta del
-- título ya las encuentra), y acota por esos orígenes. Sin tocar la firma, lo que devuelve ni la policy repetida: menos candidatas nunca muestran algo más.
-- Las consultas siguen estáticas (plan genérico): planificada con el texto, la del título va por un Seq Scan con `limit 1000` para un título común, que lee la tabla
-- entera si las coincidencias quedan al final (`docs/pasos/7.12-2/decisiones.md`, D22).
create or replace function public.buscador_cotizaciones(p_texto text, p_tamano integer)
returns table (id uuid, numero bigint, origen_id uuid, titulo text, clase public.clase_cotizacion, estado public.estado_cotizacion, creado_en timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_yo constant uuid := (select auth.uid());
  v_n constant integer := public._acotar_pagina(p_tamano, 5, 20);
  v_t uuid[];
  v_p uuid[];
  v_solo_propios uuid[];
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
    -- El título, por `cotizaciones_titulo_trgm`: a lo sumo 1.000 candidatas de los orígenes que quien llama ve, antes del resto de la visibilidad
    -- (sin el filtro de origen, 1.000 de otros orígenes con el mismo título dejaban fuera las que sí le corresponden).
    v_ids := v_ids || array(
      select c.id from public.cotizaciones c
       where c.titulo ilike v_patron and c.eliminado_en is null and c.origen_id = any (v_t || v_p)
       limit 1000);
    -- Las propias, por `cotizaciones_creador_idx (creado_por, creado_en desc, id desc) where eliminado_en is null`, sólo donde quien llama tiene «propios» sin
    -- «todos»: encuentra las suyas aunque el título lo compartan miles de ajenas. Crece con las propias de quien busca, no con N (límite declarado en RENDIMIENTO).
    v_solo_propios := array(select unnest(v_p) except select unnest(v_t));
    if cardinality(v_solo_propios) > 0 then
      v_ids := v_ids || array(
        select c.id from public.cotizaciones c
         where c.creado_por = v_yo and c.eliminado_en is null and c.origen_id = any (v_solo_propios) and c.titulo ilike v_patron
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
  'El buscador (7.12), sección cotizaciones: por número exacto (cotizaciones_numero_key) o por título (cotizaciones_titulo_trgm, hasta 1.000 candidatas, más las propias por cotizaciones_creador_idx sólo donde se tiene «propios» sin «todos»), nunca por el lead. Security definer: repite la policy «cotizaciones: leer» fila por fila; sin papelera, sin montos, sin lead_id, vehiculo_id ni creado_por. Mínimo de _buscador_interpretar; hasta _acotar_pagina(p_tamano, 5, 20) + 1. La llama el navegador (src/modules/buscador).';
