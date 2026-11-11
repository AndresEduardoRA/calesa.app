-- Cuántas unidades de la fase dejaría fuera de regla un requisito (paso 5.07-2, C12): lo que la pantalla avisa antes de volverlo bloqueante.
-- Mira el requisito como si ya fuera bloqueante (informativo o bloqueante da igual). Recorre a lo sumo 1.000 unidades de la fase, sin orden
-- (D14: ordenar leería la fase entera), tomadas una sola vez: de ahí salen `revisadas` y el conteo, que corta en `tope + 1`. Con más de 1.000
-- es una muestra y `revisadas` lo dice. Sólo quien configura el flujo; devuelve conteos, nunca ids ni títulos.

create or replace function public.requisito_impacto(p_requisito uuid, p_tope int default null) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fase uuid;
  v_flujo uuid;
  v_ambito public.ambito_flujo;
  v_tope int := public._acotar_pagina(p_tope, 50, 100);
  v_ids uuid[];
  v_n int;
begin
  select r.fase_id, f.flujo_id, fl.ambito into v_fase, v_flujo, v_ambito
  from public.fases_requisitos r join public.fases f on f.id = r.fase_id join public.flujos fl on fl.id = f.flujo_id
  where r.id = p_requisito;
  if v_fase is null then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if not public.puede_configurar_flujo(v_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;

  if v_ambito = 'repuestos' then
    -- repuestos_items_fase_id_idx; los de stock cuentan (5.07:D9).
    v_ids := array(select i.id from public.repuestos_items i where i.fase_id = v_fase and i.eliminado_en is null limit 1000);
  else
    -- vehiculos_fase_id_idx
    v_ids := array(select v.id from public.vehiculos v where v.fase_id = v_fase and v.eliminado_en is null limit 1000);
  end if;

  select count(*) into v_n from (
    select 1 from unnest(v_ids) u(id)
    where exists (
      select 1 from public.evaluar_requisitos(
        case when v_ambito = 'repuestos' then null else u.id end,
        case when v_ambito = 'repuestos' then u.id end,
        v_fase) e
      where e.requisito_id = p_requisito and not e.cumplido)
    limit v_tope + 1) q;

  return jsonb_build_object('fuera', least(v_n, v_tope), 'hay_mas', v_n > v_tope, 'revisadas', coalesce(cardinality(v_ids), 0));
end $$;

comment on function public.requisito_impacto(uuid, int) is
  'Cuántas unidades de la fase (a lo sumo 1.000 revisadas) no cumplen el requisito: {fuera, hay_mas, revisadas}, cortado en _acotar_pagina(p_tope, 50, 100). Sólo quien configura el flujo.';

revoke all on function public.requisito_impacto(uuid, int) from public, anon;
grant execute on function public.requisito_impacto(uuid, int) to authenticated, service_role;
