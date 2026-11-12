-- Aduana: leer una declaración con sus vehículos (paso 6.07-3, C12–C15, D31–D33). Definer por lo mismo que declaraciones_listar: `pagada` y
-- `hay_ocultos` miran vehículos que quien llama no ve, y de ellos sólo sale un sí o no.

-- C12–C14 · con logistica.aduana.gestionar, toda declaración; con logistica.ver, la que tiene un vehículo vivo que se ve (D32). La que no existe y la que
-- no se ve dan el mismo P0002 (D33). Los vehículos: los vivos que se ven, hasta 200 por declaraciones_vehiculos_pkey (declaracion_id, vehiculo_id).
create function public.declaracion_leer(p_id uuid) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_gestiona boolean;
  v_todos uuid[]; v_algun uuid[];
  d public.declaraciones_aduana; s record;
  v_vehiculos jsonb; v_mas boolean;
begin
  perform public.assert_activo();
  v_gestiona := public.tiene_permiso('logistica.aduana.gestionar');
  if not (v_gestiona or public.tiene_permiso('logistica.ver')) then
    raise exception 'No tienes permiso para ver las declaraciones.' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'Falta la declaración.' using errcode = '22023', hint = 'id';
  end if;
  v_todos := public.origenes_con_alcance('logistica.ver', 'todos');
  v_algun := public.origenes_con_alcance('logistica.ver', 'propios');
  select * into d from public.declaraciones_aduana x where x.id = p_id;
  if d.id is not null then
    select * into s from public._declaracion_resumen(d.id, v_todos, v_algun, v_yo);
  end if;
  if d.id is null or (not v_gestiona and s.vehiculos = 0) then
    raise exception 'La declaración no existe o no la ves.' using errcode = 'P0002';
  end if;
  -- Hasta 201 (201 = hay más) por la PK, en orden de vehiculo_id; el tributo con la condición de aduana.tributos_pagados (gastos_vehiculo_idx).
  select coalesce(jsonb_agg(jsonb_build_object('vehiculo_id', y.vehiculo_id, 'titulo', y.titulo, 'origen_id', y.origen_id, 'fase_id', y.fase_id,
                                               'fase', y.fase, 'agregado_en', y.agregado_en, 'tributo', y.tributo) order by y.vehiculo_id)
                    filter (where y.n <= 200), '[]'::jsonb),
         count(*) > 200
    into v_vehiculos, v_mas
    from (select x.*, row_number() over (order by x.vehiculo_id) as n
            from (select dv.vehiculo_id, v.titulo, v.origen_id, v.fase_id, f.nombre as fase, dv.agregado_en,
                         exists (select 1 from public.gastos g join public.categorias_gasto cg on cg.id = g.categoria_id
                                  where g.vehiculo_id = dv.vehiculo_id and g.eliminado_en is null and cg.proposito = 'tributos') as tributo
                    from public.declaraciones_vehiculos dv
                    join public.vehiculos v on v.id = dv.vehiculo_id and v.eliminado_en is null
                    left join public.fases f on f.id = v.fase_id
                   where dv.declaracion_id = d.id and dv.removido_en is null
                     and public._aduana_vehiculo_visible(v.origen_id, v.creado_por, v.lead_id, v_todos, v_algun, v_yo)
                   order by dv.vehiculo_id
                   limit 201) x) y;
  -- C15 · actualizado_en es la versión de declaracion_version(): sirve de esperada para guardar, poner vehículos y el canal.
  return jsonb_build_object(
    'id', d.id, 'numero', d.numero, 'canal', d.canal, 'aceptada_el', d.aceptada_el, 'vence_tributos_el', d.vence_tributos_el,
    'despachante', d.despachante, 'deposito', d.deposito, 'notas', d.notas, 'creado_en', d.creado_en, 'actualizado_en', d.actualizado_en,
    'vehiculos', v_vehiculos, 'hay_mas', v_mas, 'hay_ocultos', s.hay_ocultos, 'pagada', s.pagada, 'faltan', s.faltan);
end;
$$;

comment on function public.declaracion_leer(uuid) is 'Una declaración de aduana con los vehículos vivos que quien llama ve (hasta 200, hay_mas), hay_ocultos, pagada (de todos los vivos, D31), faltan y por vehículo tributo. Con logistica.aduana.gestionar, toda declaración; con logistica.ver, la que tiene un vehículo que ve. La que no existe y la que no se ve, el mismo P0002 (6.07-3).';
revoke all on function public.declaracion_leer(uuid) from public, anon;
grant execute on function public.declaracion_leer(uuid) to authenticated, service_role;
