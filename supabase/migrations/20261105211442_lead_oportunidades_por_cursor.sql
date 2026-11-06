-- Las oportunidades de un lead por cursor (paso 4.17-1, base de 5a-12): `lead_oportunidades()` deja de traer las 100 primeras de una vez y pasa a leer de a `p_tamano`
-- (por defecto 20, máximo 100: `_acotar_pagina`) con un cursor de tres valores, la última fila de la página anterior. Sigue siendo de invocadora: la RLS de
-- «oportunidades: leer» decide qué se ve (sólo las propias, sobre un lead vivo de su cartera). Medida en `supabase/tests/medir-lead-oportunidades.sql`.
--
-- Orden de siempre: las abiertas primero y, en cada grupo, `ultima_actividad_en desc, id desc`. Por eso el cursor lleva `p_antes_abierta` (el grupo de la última fila) además del
-- instante y el id, y la lectura va por rutas, cada una con su `order by … limit` (nunca ramas de una `setof` bajo un `order by` de afuera):
--   (a) sin cursor: las abiertas (`oportunidades_lead_abiertas_idx`) y, si caben menos que la página más una, se completa con las cerradas desde la primera;
--   (b) cursor en una abierta: las abiertas que siguen y, igual que en (a), se completa con las cerradas;
--   (c) cursor en una cerrada: las cerradas que siguen (`oportunidades_lead_cerradas_idx`).
-- Los dos índices son parciales y la rama lleva el estado literal: `enum_eq` no es leakproof y, bajo la RLS, una comparación de enum no sería condición de índice (medido en el
-- 4.16-1). `oportunidades_lead_id_idx` (la FK) se queda. El JSON se arma sobre las filas que la ruta ya leyó: releerlas por id pagaría otra pasada de la RLS.

create index oportunidades_lead_abiertas_idx on public.oportunidades (lead_id, usuario_id, ultima_actividad_en desc, id desc) where eliminado_en is null and estado = 'abierta';
create index oportunidades_lead_cerradas_idx on public.oportunidades (lead_id, usuario_id, ultima_actividad_en desc, id desc) where eliminado_en is null and estado <> 'abierta';

drop function public.lead_oportunidades(uuid);

create function public.lead_oportunidades(
  p_lead uuid, p_antes_abierta boolean default null, p_antes_en timestamptz default null, p_antes_id uuid default null, p_tamano integer default null)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tamano, 20, 100);
  v_yo uuid := (select auth.uid());
  v_filas public.oportunidades[];
begin
  if p_antes_en is not null and (p_antes_abierta is null or p_antes_id is null) then
    raise exception 'El cursor de las oportunidades está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  if p_antes_en is null or p_antes_abierta then
    if p_antes_en is null then  -- (a) oportunidades_lead_abiertas_idx
      select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) into v_filas from (
        select o from public.oportunidades o
         where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado = 'abierta'
         order by o.ultima_actividad_en desc, o.id desc limit v_n + 1) x;
    else  -- (b) oportunidades_lead_abiertas_idx
      select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) into v_filas from (
        select o from public.oportunidades o
         where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado = 'abierta'
           and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
         order by o.ultima_actividad_en desc, o.id desc limit v_n + 1) x;
    end if;
    v_filas := coalesce(v_filas, '{}');
    if cardinality(v_filas) <= v_n then  -- se completa con las cerradas desde la primera: oportunidades_lead_cerradas_idx
      v_filas := v_filas || coalesce((
        select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) from (
          select o from public.oportunidades o
           where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado <> 'abierta'
           order by o.ultima_actividad_en desc, o.id desc limit v_n + 1 - cardinality(v_filas)) x), '{}');
    end if;
  else  -- (c) oportunidades_lead_cerradas_idx
    select array_agg(x.o order by (x.o).ultima_actividad_en desc, (x.o).id desc) into v_filas from (
      select o from public.oportunidades o
       where o.lead_id = p_lead and o.usuario_id = v_yo and o.eliminado_en is null and o.estado <> 'abierta'
         and (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id)
       order by o.ultima_actividad_en desc, o.id desc limit v_n + 1) x;
  end if;
  return jsonb_build_object(
    'puedo_crear', public.puede_actuar_lead(p_lead, 'leads.editar'),
    'hay_mas', coalesce(cardinality(v_filas), 0) > v_n,
    'oportunidades', coalesce((
      select jsonb_agg(public._oportunidad_json(v_filas[k]) || jsonb_build_object(
               'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
               'embudo', jsonb_build_object('id', e.id, 'nombre', e.nombre)) order by k)
        from generate_series(1, least(v_n, coalesce(cardinality(v_filas), 0))) k
        join public.embudos e on e.id = (v_filas[k]).embudo_id
        join public.embudos_etapas s on s.id = (v_filas[k]).etapa_id), '[]'::jsonb));
end $$;

revoke all on function public.lead_oportunidades(uuid, boolean, timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.lead_oportunidades(uuid, boolean, timestamptz, uuid, integer) to authenticated, service_role;
comment on function public.lead_oportunidades(uuid, boolean, timestamptz, uuid, integer) is 'Una página de las oportunidades de quien mira sobre un lead: las abiertas primero y, en cada grupo, por ultima_actividad_en desc, id desc, de a p_tamano (por defecto 20, máximo 100). El cursor es la última fila de la página anterior (p_antes_abierta, p_antes_en, p_antes_id; incompleto da 22023 con hint cursor). Corre como quien la llama: la RLS de «oportunidades: leer» decide qué se ve. Cada ruta va por su índice parcial (oportunidades_lead_abiertas_idx, oportunidades_lead_cerradas_idx). Devuelve {puedo_crear, hay_mas, oportunidades}. Lo mide supabase/tests/medir-lead-oportunidades.sql.';
