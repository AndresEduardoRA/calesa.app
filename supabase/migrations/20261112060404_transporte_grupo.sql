-- Transporte: leer las unidades de un embarque (booking) o un contenedor (paso 6.07-1, C14–C15). Definer para poder decir `hay_ocultas` (sí o no, sin
-- número) sin devolver nunca una fila que quien mira no ve. Pide `logistica.ver` o `repuestos.ver` en algún origen (D18): sin eso, cualquier cuenta
-- podría probar números de booking y saber si existen. Una fila cuya unidad está en la papelera no es del grupo (D19): nadie la ve ni la edita, y si
-- contara, el grupo quedaría con `hay_ocultas` y sin poder editarse en bloque hasta purgarla o restaurarla.

-- C14 · el tipo de grupo y su clave, normalizada como al guardar (D5).
create or replace function public._transporte_clave(p_tipo text, p_clave text) returns text
language plpgsql immutable
set search_path = ''
as $$
declare v text;
begin
  if p_tipo is null or p_tipo not in ('booking', 'contenedor') then
    raise exception 'El grupo es por booking o por contenedor.' using errcode = '22023', hint = 'tipo';
  end if;
  v := nullif(upper(regexp_replace(coalesce(p_clave, ''), '\s', '', 'g')), '');
  if v is null then
    raise exception 'Falta el % del grupo.', p_tipo using errcode = '22023', hint = 'clave';
  end if;
  return v;
end;
$$;

-- C15 · hasta 200 filas de la clave en orden de id (por transportes_booking_idx o transportes_contenedor_idx); `hay_mas` si había una 201.ª. La unidad
-- viva, por las PK de vehiculos y repuestos_items (D19).
create or replace function public.transporte_grupo(p_tipo text, p_clave text) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_clave text := public._transporte_clave(p_tipo, p_clave);
  r public.transportes; v_n int := 0; v_ocultas boolean := false; v_unidades jsonb := '[]'::jsonb; v_titulo text; v_fase uuid; v_fase_nombre text;
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('logistica.ver') or public.tiene_permiso('repuestos.ver')) then
    raise exception 'No tienes permiso para ver la logística.' using errcode = '42501';
  end if;
  for r in execute format('select t.* from public.transportes t where t.%I = $1 and '
    || '(exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)'
    || ' or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))'
    || ' order by t.id limit 201', p_tipo) using v_clave
  loop
    v_n := v_n + 1;
    exit when v_n > 200;
    if not public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.ver', 'repuestos.ver') then
      v_ocultas := true;
      continue;
    end if;
    if r.vehiculo_id is not null then
      select v.titulo, v.fase_id, f.nombre into v_titulo, v_fase, v_fase_nombre
        from public.vehiculos v left join public.fases f on f.id = v.fase_id where v.id = r.vehiculo_id;
    else
      select i.descripcion, i.fase_id, f.nombre into v_titulo, v_fase, v_fase_nombre
        from public.repuestos_items i left join public.fases f on f.id = i.fase_id where i.id = r.repuesto_id;
    end if;
    v_unidades := v_unidades || jsonb_build_object(
      'transporte_id', r.id, 'vehiculo_id', r.vehiculo_id, 'repuesto_id', r.repuesto_id, 'titulo', v_titulo, 'fase_id', v_fase, 'fase', v_fase_nombre,
      'naviera_id', r.naviera_id, 'puerto_origen_id', r.puerto_origen_id, 'puerto_destino_id', r.puerto_destino_id, 'contenedor', r.contenedor,
      'booking', r.booking, 'zarpe_el', r.zarpe_el, 'eta_el', r.eta_el, 'arribo_el', r.arribo_el, 'actualizado_en', r.actualizado_en,
      'editable', public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar'));
  end loop;
  return jsonb_build_object('tipo', p_tipo, 'clave', v_clave, 'unidades', v_unidades, 'hay_mas', v_n > 200, 'hay_ocultas', v_ocultas);
end;
$$;

revoke all on function public._transporte_clave(text, text) from public, anon, authenticated;
grant execute on function public._transporte_clave(text, text) to service_role;
revoke all on function public.transporte_grupo(text, text) from public, anon;
grant execute on function public.transporte_grupo(text, text) to authenticated, service_role;

comment on function public.transporte_grupo(text, text) is
  'Las unidades de un embarque (p_tipo booking) o contenedor que quien mira ve, hasta 200 (paso 6.07-1): {tipo, clave, unidades, hay_mas, hay_ocultas}. '
  'Cada unidad con sus datos de transporte, su versión y editable.';
