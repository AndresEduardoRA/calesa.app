-- La cadena de logística de un origen por columnas (paso 6.02-2, C7). Una lectura: el alcance se resuelve una vez y cada columna es una consulta de
-- `_logistica_columna` sin cursor (`p_tope + 1` filas por `vehiculos_cadena_idx`), en un bucle sobre las fases del flujo (decenas, no crecen).
-- Orden: «Sin fase» primero y sólo si trae tarjetas; las fases activas con `es_logistica` por `orden`, aunque vacías; al final las jubiladas con
-- `es_logistica`, sólo si traen tarjetas con los filtros aplicados. Una fase activa sin `es_logistica` no es columna.

create function public.logistica_cadena(p_origen uuid, p_tope integer default 50, p_filtros jsonb default '{}'::jsonb) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_n integer := public._acotar_pagina(p_tope, 50, 100);
  v_f jsonb;
  v_alcance public.alcance_permiso;
  v_todos boolean;
  v_col jsonb;
  v_columnas jsonb := '[]'::jsonb;
  r record;
begin
  if p_origen is null then
    raise exception 'Falta el origen.' using errcode = '22023', hint = 'p_origen';
  end if;
  v_f := public._logistica_filtros(p_filtros);
  v_alcance := public._logistica_alcance(p_origen);
  if v_alcance is null then
    raise exception 'No tienes acceso a la logística de este origen.' using errcode = '42501', hint = 'acceso';
  end if;
  v_todos := v_alcance = 'todos';

  v_col := public._logistica_columna(p_origen, null, null, null, v_n, v_f, v_todos, null);
  if jsonb_array_length(v_col -> 'tarjetas') > 0 then
    v_columnas := v_columnas || jsonb_build_array(jsonb_build_object(
      'fase_id', null, 'nombre', null, 'color', null, 'orden', null, 'activa', null, 'es_final', false, 'demora_dias', null) || v_col);
  end if;

  for r in
    select f.id, f.nombre, f.color, f.orden, f.activa, f.es_final, public._logistica_dias(f.id) as dias
      from public.fases f
      join public.flujos fl on fl.id = f.flujo_id
     where fl.ambito = 'vehiculos' and fl.origen_id = p_origen and f.es_logistica
     order by not f.activa, f.orden, f.id
  loop
    v_col := public._logistica_columna(p_origen, r.id, null, null, v_n, v_f, v_todos, r.dias);
    if r.activa or jsonb_array_length(v_col -> 'tarjetas') > 0 then
      v_columnas := v_columnas || jsonb_build_array(jsonb_build_object(
        'fase_id', r.id, 'nombre', r.nombre, 'color', r.color, 'orden', r.orden, 'activa', r.activa, 'es_final', r.es_final,
        'demora_dias', r.dias) || v_col);
    end if;
  end loop;

  return jsonb_build_object('columnas', v_columnas);
end;
$$;

revoke all on function public.logistica_cadena(uuid, integer, jsonb) from public, anon;
grant execute on function public.logistica_cadena(uuid, integer, jsonb) to authenticated, service_role;

comment on function public.logistica_cadena(uuid, integer, jsonb) is
  'La cadena de logística de un origen (6.02-2): {columnas: [{fase_id, nombre, color, orden, activa, es_final, demora_dias, tarjetas, hay_mas}]}. '
  '«Sin fase» (fase_id nulo; el texto lo pone la interfaz) primero y sólo con tarjetas; activas con es_logistica por orden; jubiladas al final y sólo con '
  'tarjetas. demora_dias = los días con que alerta (nulo si no alerta). Cada columna trae p_tope tarjetas (_acotar_pagina 50/100) y hay_mas; «Ver más» '
  'es logistica_cadena_columna. Definer, mismo acceso y filtros que la columna.';
