-- Lo del panel de una unidad que no da `vehiculos` (paso 6.02-3, C2 y C3): si está demorada, si está fuera de regla con lo que le falta a su fase
-- actual, y quién la movió por última vez. `security definer` porque `evaluar_requisitos` ya no es de `authenticated` (6.02-1): el acceso es el de la
-- cadena (`_logistica_alcance`, el menor de `logistica.ver` y `vehiculos.ver` del origen, y el «propios» de la policy «vehiculos: leer»), y se decide
-- antes de leer nada de las hijas. No existe, está en la papelera o no la ves: un solo texto (42501 hint `acceso`), para no decir si existe.

create function public.logistica_unidad(p_vehiculo uuid) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v record;
  v_alcance public.alcance_permiso;
  v_dias integer;
  v_faltan jsonb := '[]'::jsonb;
  v_movida jsonb;
begin
  if p_vehiculo is null then
    raise exception 'Falta el vehículo.' using errcode = '22023', hint = 'p_vehiculo';
  end if;
  -- Por la clave primaria.
  select x.origen_id, x.creado_por, x.lead_id, x.fase_id, x.fase_desde, x.eliminado_en into v from public.vehiculos x where x.id = p_vehiculo;
  if found and v.eliminado_en is null then
    v_alcance := public._logistica_alcance(v.origen_id);
  end if;
  if v_alcance is null
     or (v_alcance = 'propios' and v.creado_por is distinct from (select auth.uid())
         and not (v.lead_id is not null and public.en_cartera(v.lead_id))) then
    raise exception '%', public._unidad_sin_acceso(p_vehiculo) using errcode = '42501', hint = 'acceso';
  end if;

  if v.fase_id is not null then
    v_dias := public._logistica_dias(v.fase_id);
    -- Sólo los bloqueantes sin cumplir de su fase actual: el criterio de «fuera de regla» (`flujo_fuera_de_regla`).
    select coalesce(jsonb_agg(jsonb_build_object('requisito_id', e.requisito_id, 'tipo', e.tipo, 'descripcion', e.descripcion, 'detalle', e.detalle)
                              order by e.k), '[]'::jsonb)
      into v_faltan
      from public.evaluar_requisitos(p_vehiculo, null, v.fase_id) with ordinality as e(requisito_id, tipo, bloqueante, descripcion, cumplido, detalle, k)
     where e.bloqueante and not e.cumplido;
  end if;

  -- La última fila de su historial, por `historial_fases_vehiculo_idx (vehiculo_id, creado_en)`; el nombre, de `perfiles` (sin la nota).
  select jsonb_build_object('historial_id', h.id, 'usuario_id', h.usuario_id, 'nombre', nullif(btrim(p.nombre), ''), 'en', h.creado_en,
                            'de_fase_id', h.de_fase_id, 'a_fase_id', h.a_fase_id)
    into v_movida
    from (select * from public.historial_fases hf where hf.vehiculo_id = p_vehiculo order by hf.creado_en desc, hf.id desc limit 1) h
    left join public.perfiles p on p.id = h.usuario_id;

  return jsonb_build_object(
    'vehiculo_id', p_vehiculo,
    'fase_id', v.fase_id,
    'fase_desde', v.fase_desde,
    'demora_dias', v_dias,
    'demorada', coalesce(v_dias > 0 and v.fase_desde < now() - make_interval(days => v_dias), false),
    'fuera_de_regla', jsonb_array_length(v_faltan) > 0,
    'faltan', v_faltan,
    'movida', v_movida);
end;
$$;

revoke all on function public.logistica_unidad(uuid) from public, anon;
grant execute on function public.logistica_unidad(uuid) to authenticated, service_role;

comment on function public.logistica_unidad(uuid) is
  'Lo del panel de una unidad que no da vehiculos (6.02-3): {vehiculo_id, fase_id, fase_desde, demora_dias, demorada, fuera_de_regla, faltan: '
  '[{requisito_id, tipo, descripcion, detalle}] (los bloqueantes sin cumplir de su fase actual), movida: {historial_id, usuario_id, nombre, en, de_fase_id, '
  'a_fase_id} | null}. Definer con el acceso de la cadena (el menor de logistica.ver y vehiculos.ver del origen; «propios» = la creó o su lead está en '
  'la cartera); inexistente, papelera o sin acceso: 42501 hint acceso con un solo texto. No devuelve lead_id ni creado_por.';
