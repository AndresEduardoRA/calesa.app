-- 9.01-4: la cabecera del diff suma la moneda de cada lado y el origen de un vehículo, tomados de la foto del cambio (nunca de la fila vigente:
-- pudo cambiar de moneda, de origen o estar borrada). Lo demás de actividad_diff no cambia.
create or replace function public.actividad_diff(p_id bigint) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  a public.actividad;
  v jsonb;
  v_moneda boolean;
begin
  if not public.tiene_permiso('actividad.ver') then
    raise exception 'No tienes permiso para ver la actividad.' using errcode = '42501';
  end if;
  -- actividad_pkey
  select x.* into a from public.actividad x where x.id = p_id;
  if not found then
    return jsonb_build_object('id', p_id, 'visible', false);
  end if;
  v := public._actividad_recortar(a.tabla, a.registro_id, a.antes, a.despues);
  if not (v ->> 'visible')::boolean then
    return jsonb_build_object('id', p_id, 'visible', false);
  end if;
  -- La moneda sale con la misma regla de columnas que el recorte: fuera de leads y sólo si authenticated lee esa columna.
  v_moneda := a.tabla <> 'leads' and exists (
    select 1 from pg_catalog.pg_attribute x
     where x.attrelid = to_regclass('public.' || quote_ident(a.tabla)) and x.attname = 'moneda' and not x.attisdropped
       and has_column_privilege('authenticated', x.attrelid, x.attnum, 'select'));
  return jsonb_build_object(
    'id', a.id, 'accion', a.accion, 'tabla', a.tabla, 'registro_id', a.registro_id, 'actor_id', a.actor_id,
    'actor_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = a.actor_id),
    'creado_en', a.creado_en, 'visible', true, 'cambios', v -> 'cambios',
    'moneda_antes', case when v_moneda then nullif(a.antes ->> 'moneda', '') end,
    'moneda_despues', case when v_moneda then nullif(a.despues ->> 'moneda', '') end,
    'origen_id', case when a.tabla = 'vehiculos' then coalesce(a.despues ->> 'origen_id', a.antes ->> 'origen_id') end);
end;
$$;

revoke all on function public.actividad_diff(bigint) from public, anon, authenticated;
grant execute on function public.actividad_diff(bigint) to authenticated, service_role;

comment on function public.actividad_diff(bigint) is
  'El diff de un cambio de la actividad, recortado (9.01-1). Pide actividad.ver (42501). {id, visible: false} si no existe o no se ve. Con visible: true suma moneda_antes y moneda_despues de la foto (fuera de leads y sólo si authenticated lee moneda) y origen_id de un vehículo (9.01-4).';
