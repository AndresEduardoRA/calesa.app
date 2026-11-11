-- Tipos de documento: ordenar dentro de su grupo (paso 5.03, C8). Renumera de a 10 sólo el grupo de la fila (el global o el de su flujo) y escribe
-- sólo las filas cuyo orden cambia; ordenar no mueve la versión de nadie (C1). `p_despues_de` nulo = al principio.

create or replace function public.tipo_documento_mover(p_id uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.tipos_documento;
begin
  select * into o from public.tipos_documento x where x.id = p_id;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._tipo_documento_exigir_permiso(o.flujo_id);
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de documento mientras lo editabas.');
  if p_despues_de = p_id then
    raise exception 'Un tipo de documento no puede ir después de sí mismo.' using errcode = '22023';
  end if;
  if p_despues_de is not null
     and not exists (select 1 from public.tipos_documento x
                     where x.id = p_despues_de and ((o.flujo_id is null and x.flujo_id is null) or x.flujo_id = o.flujo_id)) then
    raise exception 'Ese tipo de documento ya no está en esta lista. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  -- El grupo, por el btree de tipos_documento_flujo_id_nombre_key (flujo_id primero); a lo sumo _tipos_documento_tope() filas.
  update public.tipos_documento x set orden = n.orden_nuevo
  from public._campos_reordenar((
    select jsonb_agg(jsonb_build_object('id', y.id, 'clave', y.nombre, 'orden', y.orden)) from public.tipos_documento y
    where (o.flujo_id is null and y.flujo_id is null) or y.flujo_id = o.flujo_id),
    p_id, p_despues_de) n
  where x.id = n.campo_id and x.orden <> n.orden_nuevo;
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en);
end;
$$;

revoke all on function public.tipo_documento_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.tipo_documento_mover(uuid, timestamptz, uuid) to authenticated, service_role;
