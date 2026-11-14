-- La dominancia mira los permisos de quien llama y los de la persona o el rol que toca. Toda RPC que la comprueba, y la que cambia lo
-- que alguien domina sin comprobarla (crear un nivel le suma permisos al rol `dueno`), empieza por el mismo candado de transacción,
-- antes que el permiso: así dos que se tocan a la vez (se bloquean, se recortan los roles) no confirman los dos con lo que cada uno
-- tenía al empezar, y el segundo vuelve a mirar el permiso y la dominancia con lo que dejó el primero. Al ser el primer candado de
-- todas, no forma ciclos (sin 40P01). Dar de baja lo toma compartido: dos bajas siguen corriendo a la vez (la segunda salta los leads
-- que la primera tiene tomados), y entre ellas se ordenan por las dos cuentas. Sus carreras: scripts/carreras/dominancia.mjs.

create or replace function public._dominancia_tomar(p_compartido boolean default false) returns void
    language plpgsql
    set search_path to ''
    as $$
begin
  if p_compartido then
    perform pg_advisory_xact_lock_shared(hashtextextended('dominancia', 0));
  else
    perform pg_advisory_xact_lock(hashtextextended('dominancia', 0));
  end if;
end;
$$;

comment on function public._dominancia_tomar(boolean) is
  'Interna: el candado de transacción de la dominancia. Lo toman primero, antes del permiso, las RPC que comprueban la dominancia de quien llama (equipo_bloquear, rbac_asignar_rol, rbac_quitar_rol, rbac_otorgar, rbac_revocar, rbac_eliminar_rol) y nivel_crear, que suma permisos al rol dueno; equipo_dar_de_baja, compartido (p_compartido). docs/DECISIONES.md › «Dominancia sobre la persona».';

revoke all on function public._dominancia_tomar(boolean) from public, anon, authenticated;
grant execute on function public._dominancia_tomar(boolean) to service_role;


create or replace function public.equipo_bloquear(p_usuario uuid, p_bloquear boolean, p_motivo text default null::text) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare v_activo boolean; v_bloqueado boolean; v_nombre text;
begin
  perform public._dominancia_tomar();
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if p_usuario = (select auth.uid()) then raise exception 'No puedes bloquearte a ti mismo.' using errcode = '42501'; end if;
  select activo, bloqueado, coalesce(nullif(nombre, ''), email::text) into v_activo, v_bloqueado, v_nombre
  from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
  perform public._exigir_persona_dominada(p_usuario, case when p_bloquear then 'bloquear a' else 'desbloquear a' end);
  if not v_activo then raise exception '% ya no forma parte del equipo.', v_nombre using errcode = 'PT409'; end if;
  if v_bloqueado = p_bloquear then
    raise exception 'La cuenta de % ya estaba %.', v_nombre, case when p_bloquear then 'bloqueada' else 'desbloqueada' end using errcode = 'PT409';
  end if;
  update public.perfiles set bloqueado = p_bloquear,
    bloqueado_en = case when p_bloquear then now() else null end,
    bloqueado_por = case when p_bloquear then (select auth.uid()) else null end,
    bloqueo_motivo = case when p_bloquear then p_motivo else null end
  where id = p_usuario;
  perform public.registrar_actividad(case when p_bloquear then 'usuario.bloqueado' else 'usuario.desbloqueado' end, 'perfiles', p_usuario::text, null, jsonb_build_object('motivo', p_motivo));
end;
$$;

revoke all on function public.equipo_bloquear(uuid, boolean, text) from public, anon;
grant execute on function public.equipo_bloquear(uuid, boolean, text) to authenticated, service_role;


create or replace function public.equipo_dar_de_baja(p_usuario uuid) returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare v_activo boolean; v_nombre text; v_terminada boolean; v_baja public.equipo_bajas; v_existe boolean;
  v_yo uuid := (select auth.uid());
begin
  -- Compartido con otras bajas; con lo demás que toca la dominancia, exclusivo.
  perform public._dominancia_tomar(true);
  -- Entre dos bajas, las dos cuentas por id antes del permiso: la propia `for share` (la baja que me da de baja a mí la toma
  -- `for update` y una de las dos espera a la otra), la de la persona `for update`.
  if v_yo < p_usuario then perform 1 from public.perfiles where id = v_yo for share; end if;
  select activo, coalesce(nullif(nombre, ''), email::text) into v_activo, v_nombre
  from public.perfiles where id = p_usuario for update;
  v_existe := found;
  if v_yo > p_usuario then perform 1 from public.perfiles where id = v_yo for share; end if;
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if p_usuario = v_yo then raise exception 'No puedes darte de baja a ti mismo.' using errcode = '42501'; end if;
  if not v_existe then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
  perform public._exigir_persona_dominada(p_usuario, 'dar de baja a');
  if not v_activo then raise exception '% ya no forma parte del equipo.', v_nombre using errcode = 'PT409'; end if;
  update public.perfiles set activo = false, baja_en = now(), baja_por = (select auth.uid()), publico_web = false where id = p_usuario;
  update public.cola_web_asesores set habilitado = false, disponible = false where usuario_id = p_usuario;
  insert into public.equipo_bajas (usuario_id, por) values (p_usuario, (select auth.uid()))
  on conflict (usuario_id) do update set por = excluded.por, empezada_en = now(), terminada_en = null,
    leads_al_limbo = 0, oportunidades_canceladas = 0;
  -- El primer lote, en esta misma llamada: una cartera chica termina acá.
  v_terminada := public._baja_lote(p_usuario, 5000);
  select * into v_baja from public.equipo_bajas where usuario_id = p_usuario;
  perform public.registrar_actividad('usuario.baja', 'perfiles', p_usuario::text, null,
    jsonb_build_object('leads_al_limbo', v_baja.leads_al_limbo, 'terminada', v_terminada));
  return jsonb_build_object('terminada', v_terminada, 'leads_al_limbo', v_baja.leads_al_limbo);
end;
$$;

revoke all on function public.equipo_dar_de_baja(uuid) from public, anon;
grant execute on function public.equipo_dar_de_baja(uuid) to authenticated, service_role;


create or replace function public.rbac_asignar_rol(p_usuario uuid, p_rol uuid, p_principal boolean default false) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  perform public._dominancia_tomar();
  perform public.assert_permiso('equipo.usuarios.gestionar');
  perform 1 from public.roles where id = p_rol for share;
  if not public.rol_dominado(p_rol) then raise exception 'No puedes asignar un rol con permisos que no tienes.' using errcode = '42501'; end if;
  perform 1 from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
  perform public._exigir_persona_dominada(p_usuario, 'cambiar los roles de');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal, asignado_por) values (p_usuario, p_rol, p_principal, (select auth.uid()))
  on conflict (usuario_id, rol_id) do update set es_principal = excluded.es_principal;
  if p_principal then update public.usuarios_roles set es_principal = false where usuario_id = p_usuario and rol_id <> p_rol; end if;
  perform public.registrar_actividad('usuario.rol_asignado', 'usuarios_roles', p_usuario::text, null, jsonb_build_object('rol', p_rol));
end;
$$;

revoke all on function public.rbac_asignar_rol(uuid, uuid, boolean) from public, anon;
grant execute on function public.rbac_asignar_rol(uuid, uuid, boolean) to authenticated, service_role;


create or replace function public.rbac_quitar_rol(p_usuario uuid, p_rol uuid) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  perform public._dominancia_tomar();
  perform public.assert_permiso('equipo.usuarios.gestionar');
  perform 1 from public.roles where id = p_rol for share;
  if not public.rol_dominado(p_rol) then raise exception 'No puedes quitar un rol con permisos que no tienes.' using errcode = '42501'; end if;
  perform 1 from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
  perform public._exigir_persona_dominada(p_usuario, 'cambiar los roles de');
  delete from public.usuarios_roles where usuario_id = p_usuario and rol_id = p_rol;
  perform public.registrar_actividad('usuario.rol_quitado', 'usuarios_roles', p_usuario::text, jsonb_build_object('rol', p_rol), null);
end;
$$;

revoke all on function public.rbac_quitar_rol(uuid, uuid) from public, anon;
grant execute on function public.rbac_quitar_rol(uuid, uuid) to authenticated, service_role;


create or replace function public.rbac_otorgar(p_rol uuid, p_clave text, p_actualizado_en_esperado timestamp with time zone, p_origen uuid default null::uuid, p_alcance public.alcance_permiso default 'todos'::public.alcance_permiso) returns timestamp with time zone
    language plpgsql security definer
    set search_path to ''
    as $$
declare v_por_origen boolean; v_con_alcance boolean;
begin
  perform public._dominancia_tomar();
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

revoke all on function public.rbac_otorgar(uuid, text, timestamp with time zone, uuid, public.alcance_permiso) from public, anon;
grant execute on function public.rbac_otorgar(uuid, text, timestamp with time zone, uuid, public.alcance_permiso) to authenticated, service_role;


create or replace function public.rbac_revocar(p_rol uuid, p_clave text, p_actualizado_en_esperado timestamp with time zone, p_origen uuid default null::uuid) returns timestamp with time zone
    language plpgsql security definer
    set search_path to ''
    as $$
begin
  perform public._dominancia_tomar();
  perform public.assert_permiso('equipo.roles.gestionar');
  perform public._rol_para_editar(p_rol, p_actualizado_en_esperado);
  if not public.rol_dominado(p_rol) then raise exception 'No puedes editar un rol con permisos que no tienes.' using errcode = '42501'; end if;
  delete from public.roles_permisos where rol_id = p_rol and permiso_clave = p_clave and origen_id is not distinct from p_origen;
  perform public.registrar_actividad('rol.permiso_revocado', 'roles_permisos', p_rol::text, jsonb_build_object('clave', p_clave, 'origen', p_origen), null);
  return public._rol_tocar(p_rol);
end;
$$;

revoke all on function public.rbac_revocar(uuid, text, timestamp with time zone, uuid) from public, anon;
grant execute on function public.rbac_revocar(uuid, text, timestamp with time zone, uuid) to authenticated, service_role;


create or replace function public.rbac_eliminar_rol(p_rol uuid, p_actualizado_en_esperado timestamp with time zone) returns void
    language plpgsql security definer
    set search_path to ''
    as $$
declare v_sistema boolean; v_personas int;
begin
  perform public._dominancia_tomar();
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

revoke all on function public.rbac_eliminar_rol(uuid, timestamp with time zone) from public, anon;
grant execute on function public.rbac_eliminar_rol(uuid, timestamp with time zone) to authenticated, service_role;


-- Crear un nivel le suma sus dos permisos al rol `dueno`: toma el candado de la dominancia y el rol `dueno` (`for no key update`, que
-- choca con el `for share` de quien mira la dominancia de una persona con ese rol y deja pasar el `key share` de quien le asigna el rol).
create or replace function public.nivel_crear(p_id uuid, p_nombre text) returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare v_nombre text; v_clave text; v_version timestamptz; v_estado text; v_tope integer := public._niveles_tope();
begin
  perform public._dominancia_tomar();
  perform public.assert_permiso('equipo.roles.gestionar');
  lock table public.cotizaciones_niveles in share row exclusive mode;
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  select n.actualizado_en into v_version from public.cotizaciones_niveles n where n.id = p_id;
  if found then
    return jsonb_build_object('id', p_id, 'actualizado_en', v_version, 'repetido', true, 'lista', public._niveles_lista());
  end if;
  v_nombre := public._nivel_nombre(p_nombre);
  v_clave := public._nivel_clave(v_nombre);
  if (select count(*) from (select 1 from public.cotizaciones_niveles limit v_tope) t) >= v_tope then
    raise exception 'Ya hay % niveles, que es el máximo. Elimina uno que ninguna hoja use.', v_tope using errcode = '22023', hint = 'nombre';
  end if;
  if exists (select 1 from public.cotizaciones_niveles n where lower(btrim(n.nombre)) = lower(v_nombre)) then
    raise exception 'Ya hay un nivel «%».', v_nombre using errcode = '23505', hint = 'nombre';
  end if;
  select case when n.retirado_en is not null then ' (retirado)' else '' end into v_estado from public.cotizaciones_niveles n where n.clave = v_clave;
  if found then
    raise exception 'Ya hay un nivel con la clave «%»%: elige otro nombre.', v_clave, v_estado using errcode = '23505', hint = 'nombre';
  end if;
  perform 1 from public.roles where clave = 'dueno' for no key update;
  insert into public.cotizaciones_niveles (id, clave, nombre) values (p_id, v_clave, v_nombre) returning actualizado_en into v_version;
  perform public._nivel_permisos_crear(v_clave, v_nombre, true);
  perform public.registrar_actividad('nivel.crear', 'cotizaciones_niveles', p_id::text, null, jsonb_build_object('clave', v_clave, 'nombre', v_nombre));
  return jsonb_build_object('id', p_id, 'clave', v_clave, 'actualizado_en', v_version, 'repetido', false, 'lista', public._niveles_lista());
end;
$$;

revoke all on function public.nivel_crear(uuid, text) from public, anon;
grant execute on function public.nivel_crear(uuid, text) to authenticated, service_role;
