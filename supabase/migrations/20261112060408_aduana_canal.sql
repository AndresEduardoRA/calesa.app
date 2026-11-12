-- Aduana: asignar o cambiar el canal de aforo de una declaración (paso 6.07-2, C14–C16). Con canal la composición queda congelada (la RPC de poner y el
-- trigger de la tabla lo frenan) y el canal no vuelve a nulo (D3). Toma la cabecera `for update`, como declaracion_vehiculos_poner: poner y canal sobre
-- la misma declaración se serializan y el segundo ve la versión nueva (PT409).

create function public.declaracion_canal(p_id uuid, p_actualizado_en_esperado timestamptz, p_canal text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare d public.declaraciones_aduana; v_ver timestamptz;
begin
  perform public.assert_activo();
  if not (select public.tiene_permiso('logistica.aduana.gestionar')) then
    raise exception 'No tienes el permiso «logistica.aduana.gestionar».' using errcode = '42501';
  end if;
  -- C15.
  if p_canal is null then
    raise exception 'El canal no se puede quitar: la composición quedó congelada.' using errcode = '22023', hint = 'canal';
  end if;
  if not pg_input_is_valid(p_canal, 'public.canal_aforo') then
    raise exception 'Ese canal de aforo no existe.' using errcode = '22023', hint = 'canal';
  end if;
  -- C16 · la cabecera por su PK y la versión.
  select * into d from public.declaraciones_aduana c where c.id = p_id for update;
  if not found then
    raise exception 'La declaración ya no existe. Recarga.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null or d.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('declaraciones_aduana', d.id, d.actualizado_en, 'esta declaración');
  end if;
  if d.canal is not distinct from p_canal::public.canal_aforo then
    return jsonb_build_object('id', d.id, 'actualizado_en', d.actualizado_en, 'canal', d.canal, 'sin_cambios', true);
  end if;
  -- D26 · no se congela una composición vacía. Por declaraciones_vehiculos_pkey.
  if not exists (select 1 from public.declaraciones_vehiculos dv where dv.declaracion_id = d.id and dv.removido_en is null limit 1) then
    raise exception 'Agrega al menos un vehículo antes de asignar el canal.' using errcode = '23514', hint = 'canal';
  end if;
  update public.declaraciones_aduana c set canal = p_canal::public.canal_aforo where c.id = d.id returning c.actualizado_en into v_ver;
  return jsonb_build_object('id', d.id, 'actualizado_en', v_ver, 'canal', p_canal, 'sin_cambios', false);
end;
$$;

revoke all on function public.declaracion_canal(uuid, timestamptz, text) from public, anon;
grant execute on function public.declaracion_canal(uuid, timestamptz, text) to authenticated, service_role;

comment on function public.declaracion_canal(uuid, timestamptz, text) is
  'Asigna o cambia el canal de aforo de una declaración con la versión (paso 6.07-2). Nunca a nulo; no a una declaración sin vehículos vivos. '
  'Congela la composición. Pide logistica.aduana.gestionar. Devuelve {id, actualizado_en, canal, sin_cambios}.';
