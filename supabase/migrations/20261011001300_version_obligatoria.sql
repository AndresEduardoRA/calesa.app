-- Versión obligatoria en toda RPC de edición. Escrito a mano.
-- Hasta acá, `p_esperado` nulo saltaba el control de conflicto «para el seed y las pruebas»: un
-- llamador que olvidaba mandar la versión pisaba en silencio lo que otra persona había cambiado.
-- Ahora un nulo se rechaza con un mensaje legible. El seed y las pruebas pasan la versión real.
--
-- `create or replace` no puede quitar el default de un parámetro: las tres RPC de roles se
-- recrean. Postgres exige que lo que sigue a un parámetro con default también lo tenga, así que
-- `p_actualizado_en_esperado` pasa antes de `p_origen` y `p_alcance`. PostgREST llama por nombre.

create or replace function public._exigir_version(p_actual timestamptz, p_esperado timestamptz, p_mensaje text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_actual is distinct from p_esperado then
    raise exception '%', p_mensaje using errcode = 'PT409';
  end if;
end;
$$;

create or replace function public._rol_para_editar(p_rol uuid, p_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actual timestamptz;
begin
  if p_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  select actualizado_en into v_actual from public.roles where id = p_rol for update;
  if not found then raise exception 'Ese rol ya no existe.' using errcode = 'PT409'; end if;
  if v_actual is distinct from p_esperado then
    raise exception 'Otra persona cambió este rol mientras lo editabas.' using errcode = 'PT409';
  end if;
end;
$$;

drop function if exists public.rbac_otorgar(uuid, text, uuid, public.alcance_permiso, timestamptz);
drop function if exists public.rbac_revocar(uuid, text, uuid, timestamptz);
drop function if exists public.rbac_eliminar_rol(uuid, timestamptz);

create or replace function public.rbac_otorgar(p_rol uuid, p_clave text, p_actualizado_en_esperado timestamptz, p_origen uuid default null, p_alcance public.alcance_permiso default 'todos')
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_por_origen boolean; v_con_alcance boolean;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  perform public._rol_para_editar(p_rol, p_actualizado_en_esperado);
  select por_origen, con_alcance into v_por_origen, v_con_alcance from public.permisos where clave = p_clave;
  if not found then raise exception 'Permiso desconocido: %', p_clave using errcode = '22023'; end if;
  if p_origen is not null and not v_por_origen then raise exception 'El permiso % no se acota por origen.', p_clave using errcode = '22023'; end if;
  if p_alcance = 'propios' and not v_con_alcance then raise exception 'El permiso % no distingue entre lo propio y todo.', p_clave using errcode = '22023'; end if;
  if not public.rol_dominado(p_rol) then raise exception 'No puedes editar un rol con permisos que no tienes.' using errcode = '42501'; end if;
  if not public.concesion_dominada(p_clave, p_origen, p_alcance) then raise exception 'No puedes otorgar «%» con ese origen y alcance: no lo tienes.', p_clave using errcode = '42501'; end if;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (p_rol, p_clave, p_origen, p_alcance)
  on conflict (rol_id, permiso_clave, origen_id) do update set alcance = excluded.alcance;
  perform public.registrar_actividad('rol.permiso_otorgado', 'roles_permisos', p_rol::text, null, jsonb_build_object('clave', p_clave, 'origen', p_origen, 'alcance', p_alcance));
  return public._rol_tocar(p_rol);
end;
$$;

create or replace function public.rbac_revocar(p_rol uuid, p_clave text, p_actualizado_en_esperado timestamptz, p_origen uuid default null)
returns timestamptz language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  perform public._rol_para_editar(p_rol, p_actualizado_en_esperado);
  if not public.rol_dominado(p_rol) then raise exception 'No puedes editar un rol con permisos que no tienes.' using errcode = '42501'; end if;
  delete from public.roles_permisos where rol_id = p_rol and permiso_clave = p_clave and origen_id is not distinct from p_origen;
  perform public.registrar_actividad('rol.permiso_revocado', 'roles_permisos', p_rol::text, jsonb_build_object('clave', p_clave, 'origen', p_origen), null);
  return public._rol_tocar(p_rol);
end;
$$;

create or replace function public.rbac_eliminar_rol(p_rol uuid, p_actualizado_en_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sistema boolean; v_personas int;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  perform public._rol_para_editar(p_rol, p_actualizado_en_esperado);
  select es_sistema into v_sistema from public.roles where id = p_rol;
  if v_sistema then raise exception 'Un rol de sistema no se elimina.' using errcode = '42501'; end if;
  if not public.rol_dominado(p_rol) then raise exception 'No puedes eliminar un rol con permisos que no tienes.' using errcode = '42501'; end if;
  select count(*) into v_personas from public.usuarios_roles where rol_id = p_rol;
  if v_personas = 1 then raise exception 'Una persona tiene este rol: quítaselo antes de eliminarlo.' using errcode = '23503'; end if;
  if v_personas > 1 then raise exception '% personas tienen este rol: quítaselo antes de eliminarlo.', v_personas using errcode = '23503'; end if;
  delete from public.roles where id = p_rol;
  perform public.registrar_actividad('rol.eliminado', 'roles', p_rol::text, null, null);
end;
$$;

revoke all on function public.rbac_otorgar(uuid, text, timestamptz, uuid, public.alcance_permiso) from public, anon;
revoke all on function public.rbac_revocar(uuid, text, timestamptz, uuid) from public, anon;
revoke all on function public.rbac_eliminar_rol(uuid, timestamptz) from public, anon;
grant execute on function public.rbac_otorgar(uuid, text, timestamptz, uuid, public.alcance_permiso),
  public.rbac_revocar(uuid, text, timestamptz, uuid),
  public.rbac_eliminar_rol(uuid, timestamptz) to authenticated;
