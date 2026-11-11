-- Las unidades fuera de regla de un flujo (paso 5.07-2, C13 y C14): las que están en una fase cuyos requisitos bloqueantes ya no cumplen.
-- Reemplaza a `fuera_de_regla()`, que daba ids a cualquier `authenticated` sin permiso ni tope (5.07:D2). Ésta exige `puede_configurar_flujo()`,
-- mira sólo las fases con requisitos bloqueantes (también las jubiladas: quien sigue ahí sigue fuera de regla, D13), cada una con a lo sumo
-- 1.000 unidades sin orden por su índice (D14) y su `limit`, y en total devuelve a lo sumo `tope + 1` filas: quien llama corta con
-- `cortarAlTope()`. Sólo ids, fase y cuántos faltan; nunca títulos.

drop function public.fuera_de_regla(uuid);

create or replace function public.flujo_fuera_de_regla(p_flujo uuid, p_tope int default null)
returns table (vehiculo_id uuid, repuesto_id uuid, fase_id uuid, faltan int)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_ambito public.ambito_flujo;
  v_resto int := public._acotar_pagina(p_tope, 50, 100) + 1;
  v_fase uuid;
  v_ids uuid[];
  v_n int;
begin
  select fl.ambito into v_ambito from public.flujos fl where fl.id = p_flujo;
  if v_ambito is null then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;

  for v_fase in
    select f.id from public.fases f
    where f.flujo_id = p_flujo and exists (select 1 from public.fases_requisitos r where r.fase_id = f.id and r.bloqueante)
    order by f.orden, f.id
  loop
    if v_ambito = 'repuestos' then
      -- repuestos_items_fase_id_idx
      v_ids := array(select i.id from public.repuestos_items i where i.fase_id = v_fase and i.eliminado_en is null limit 1000);
      return query
        select null::uuid, u.id, v_fase, c.n
        from unnest(v_ids) u(id)
        cross join lateral (select count(*)::int as n from public.evaluar_requisitos(null, u.id, v_fase) e where e.bloqueante and not e.cumplido) c
        where c.n > 0
        limit v_resto;
    else
      -- vehiculos_fase_id_idx
      v_ids := array(select v.id from public.vehiculos v where v.fase_id = v_fase and v.eliminado_en is null limit 1000);
      return query
        select u.id, null::uuid, v_fase, c.n
        from unnest(v_ids) u(id)
        cross join lateral (select count(*)::int as n from public.evaluar_requisitos(u.id, null, v_fase) e where e.bloqueante and not e.cumplido) c
        where c.n > 0
        limit v_resto;
    end if;
    get diagnostics v_n = row_count;
    v_resto := v_resto - v_n;
    exit when v_resto <= 0;
  end loop;
end $$;

comment on function public.flujo_fuera_de_regla(uuid, int) is
  'Unidades del flujo que no cumplen los requisitos bloqueantes de su fase: ids, fase y cuántos faltan, a lo sumo _acotar_pagina(p_tope, 50, 100) + 1 filas (1.000 revisadas por fase). Sólo quien configura el flujo. Reemplaza a fuera_de_regla().';

revoke all on function public.flujo_fuera_de_regla(uuid, int) from public, anon;
grant execute on function public.flujo_fuera_de_regla(uuid, int) to authenticated, service_role;
