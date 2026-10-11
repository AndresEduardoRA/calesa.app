-- RBAC: funciones de permiso para las policies, perfil espejo, registro on/off, dominancia
-- y guardián. Escrito a mano: el diff declarativo no trackea nada de esto.

-- ---------------------------------------------------------------------------
-- Perfil espejo + registro abierto/cerrado (aplicado en DB, no sólo en UI)
-- ---------------------------------------------------------------------------
create or replace function public.auth_registro_permitido()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  abierto boolean;
  hay_usuarios boolean;
begin
  select registro_abierto into abierto from public.ajustes_empresa where id = 1;
  select exists (select 1 from public.perfiles) into hay_usuarios;
  -- El primer usuario siempre puede nacer (es el dueño). Los invitados por un admin traen
  -- raw_app_meta_data.invitado = true (lo pone la RPC equipo_invitar vía API de admin).
  if hay_usuarios and coalesce(abierto, false) = false
     and coalesce((new.raw_app_meta_data ->> 'invitado')::boolean, false) = false then
    raise exception 'El registro de cuentas nuevas está cerrado.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_auth_registro_permitido on auth.users;
create trigger trg_auth_registro_permitido before insert on auth.users
  for each row execute function public.auth_registro_permitido();

create or replace function public.auth_crear_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rol_dueno uuid;
  es_primero boolean;
begin
  select not exists (select 1 from public.perfiles) into es_primero;
  begin
    insert into public.perfiles (id, nombre, email, handle)
    values (new.id,
            coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
            new.email,
            null);
  exception when others then
    -- nunca bloquear el signup por un dato opcional
    insert into public.perfiles (id, nombre, email) values (new.id, '', new.email) on conflict do nothing;
  end;
  if es_primero then
    select id into rol_dueno from public.roles where clave = 'dueno';
    if rol_dueno is not null then
      insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (new.id, rol_dueno, true);
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_auth_crear_perfil on auth.users;
create trigger trg_auth_crear_perfil after insert on auth.users
  for each row execute function public.auth_crear_perfil();

-- ---------------------------------------------------------------------------
-- Permisos efectivos
-- ---------------------------------------------------------------------------
-- Devuelve las concesiones del usuario actual. STABLE + DEFINER: las policies la llaman
-- envuelta en (select …) para que sea un InitPlan por sentencia.
create or replace function public.mis_permisos()
returns table (clave text, origen_id uuid, alcance public.alcance_permiso)
language sql stable security definer set search_path = '' as $$
  select rp.permiso_clave, rp.origen_id, rp.alcance
  from public.usuarios_roles ur
  join public.roles_permisos rp on rp.rol_id = ur.rol_id
  join public.perfiles p on p.id = ur.usuario_id
  where ur.usuario_id = (select auth.uid())
    and p.activo and not p.bloqueado;
$$;
revoke all on function public.mis_permisos() from public, anon;
grant execute on function public.mis_permisos() to authenticated;

create or replace function public.tiene_permiso(p_clave text, p_origen uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mis_permisos() m
    where m.clave = p_clave and (m.origen_id is null or p_origen is null or m.origen_id = p_origen)
  );
$$;
revoke all on function public.tiene_permiso(text, uuid) from public, anon;
grant execute on function public.tiene_permiso(text, uuid) to authenticated;

-- 'todos' si alguna concesión lo da; si no 'propios'; NULL si no tiene el permiso.
create or replace function public.alcance_de(p_clave text, p_origen uuid default null)
returns public.alcance_permiso language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.mis_permisos() m where m.clave = p_clave and (m.origen_id is null or p_origen is null or m.origen_id = p_origen) and m.alcance = 'todos') then 'todos'::public.alcance_permiso
    when exists (select 1 from public.mis_permisos() m where m.clave = p_clave and (m.origen_id is null or p_origen is null or m.origen_id = p_origen)) then 'propios'::public.alcance_permiso
    else null end;
$$;
revoke all on function public.alcance_de(text, uuid) from public, anon;
grant execute on function public.alcance_de(text, uuid) to authenticated;

-- Orígenes sobre los que el usuario tiene un permiso (NULL en la concesión = todos los activos).
create or replace function public.origenes_con_permiso(p_clave text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select o.id from public.origenes o
  where exists (select 1 from public.mis_permisos() m where m.clave = p_clave and (m.origen_id is null or m.origen_id = o.id));
$$;
revoke all on function public.origenes_con_permiso(text) from public, anon;
grant execute on function public.origenes_con_permiso(text) to authenticated;

create or replace function public.es_usuario_activo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.activo and not p.bloqueado);
$$;
revoke all on function public.es_usuario_activo() from public, anon;
grant execute on function public.es_usuario_activo() to authenticated;

create or replace function public.assert_activo()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_usuario_activo() then
    raise exception 'Tu cuenta está bloqueada o dada de baja.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.assert_activo() from public, anon;
grant execute on function public.assert_activo() to authenticated;

create or replace function public.assert_permiso(p_clave text, p_origen uuid default null)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_activo();
  if not public.tiene_permiso(p_clave, p_origen) then
    raise exception 'No tenés el permiso «%».', p_clave using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.assert_permiso(text, uuid) from public, anon;
grant execute on function public.assert_permiso(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoría (la usan todas las RPC)
-- ---------------------------------------------------------------------------
create or replace function public.registrar_actividad(p_accion text, p_tabla text, p_registro_id text, p_antes jsonb default null, p_despues jsonb default null, p_detalle jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.actividad (accion, actor_id, tabla, registro_id, antes, despues, detalle)
  values (p_accion, (select auth.uid()), p_tabla, p_registro_id, p_antes, p_despues, p_detalle);
$$;
revoke all on function public.registrar_actividad(text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.registrar_actividad(text, text, text, jsonb, jsonb, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Dominancia: R ⊑ yo ⟺ cada concesión de R está cubierta por una mía (misma clave, mi
-- origen NULL o igual, mi alcance ≥). Nadie otorga lo que no tiene.
-- ---------------------------------------------------------------------------
create or replace function public.rol_dominado(p_rol uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.roles_permisos rp
    where rp.rol_id = p_rol
      and not exists (
        select 1 from public.mis_permisos() m
        where m.clave = rp.permiso_clave
          and (m.origen_id is null or m.origen_id = rp.origen_id)
          and (m.alcance = 'todos' or rp.alcance = 'propios')
      )
  );
$$;
revoke all on function public.rol_dominado(uuid) from public, anon;
grant execute on function public.rol_dominado(uuid) to authenticated;

create or replace function public.concesion_dominada(p_clave text, p_origen uuid, p_alcance public.alcance_permiso)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mis_permisos() m
    where m.clave = p_clave
      and (m.origen_id is null or m.origen_id = p_origen)
      and (m.alcance = 'todos' or p_alcance = 'propios')
  );
$$;
revoke all on function public.concesion_dominada(text, uuid, public.alcance_permiso) from public, anon;
grant execute on function public.concesion_dominada(text, uuid, public.alcance_permiso) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC de administración de roles (única puerta de escritura)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_crear_rol(p_clave text, p_nombre text, p_color text default null, p_descripcion text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  insert into public.roles (clave, nombre, color, descripcion) values (p_clave, p_nombre, p_color, p_descripcion) returning id into v_id;
  perform public.registrar_actividad('rol.creado', 'roles', v_id::text, null, jsonb_build_object('clave', p_clave, 'nombre', p_nombre));
  return v_id;
end;
$$;

create or replace function public.rbac_otorgar(p_rol uuid, p_clave text, p_origen uuid default null, p_alcance public.alcance_permiso default 'todos')
returns void language plpgsql security definer set search_path = '' as $$
declare v_por_origen boolean; v_con_alcance boolean;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  select por_origen, con_alcance into v_por_origen, v_con_alcance from public.permisos where clave = p_clave;
  if not found then raise exception 'Permiso desconocido: %', p_clave using errcode = '22023'; end if;
  if p_origen is not null and not v_por_origen then raise exception 'El permiso % no se acota por origen.', p_clave using errcode = '22023'; end if;
  if p_alcance = 'propios' and not v_con_alcance then raise exception 'El permiso % no tiene alcance propios/todos.', p_clave using errcode = '22023'; end if;
  if not public.rol_dominado(p_rol) then raise exception 'No podés editar un rol con permisos que no tenés.' using errcode = '42501'; end if;
  if not public.concesion_dominada(p_clave, p_origen, p_alcance) then raise exception 'No podés otorgar «%» con ese alcance: no lo tenés.', p_clave using errcode = '42501'; end if;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (p_rol, p_clave, p_origen, p_alcance)
  on conflict (rol_id, permiso_clave, origen_id) do update set alcance = excluded.alcance;
  perform public.registrar_actividad('rol.permiso_otorgado', 'roles_permisos', p_rol::text, null, jsonb_build_object('clave', p_clave, 'origen', p_origen, 'alcance', p_alcance));
end;
$$;

create or replace function public.rbac_revocar(p_rol uuid, p_clave text, p_origen uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  if not public.rol_dominado(p_rol) then raise exception 'No podés editar un rol con permisos que no tenés.' using errcode = '42501'; end if;
  delete from public.roles_permisos where rol_id = p_rol and permiso_clave = p_clave and origen_id is not distinct from p_origen;
  perform public.registrar_actividad('rol.permiso_revocado', 'roles_permisos', p_rol::text, jsonb_build_object('clave', p_clave, 'origen', p_origen), null);
end;
$$;

create or replace function public.rbac_asignar_rol(p_usuario uuid, p_rol uuid, p_principal boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if not public.rol_dominado(p_rol) then raise exception 'No podés asignar un rol con permisos que no tenés.' using errcode = '42501'; end if;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal, asignado_por) values (p_usuario, p_rol, p_principal, (select auth.uid()))
  on conflict (usuario_id, rol_id) do update set es_principal = excluded.es_principal;
  if p_principal then update public.usuarios_roles set es_principal = false where usuario_id = p_usuario and rol_id <> p_rol; end if;
  perform public.registrar_actividad('usuario.rol_asignado', 'usuarios_roles', p_usuario::text, null, jsonb_build_object('rol', p_rol));
end;
$$;

create or replace function public.rbac_quitar_rol(p_usuario uuid, p_rol uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if not public.rol_dominado(p_rol) then raise exception 'No podés quitar un rol con permisos que no tenés.' using errcode = '42501'; end if;
  delete from public.usuarios_roles where usuario_id = p_usuario and rol_id = p_rol;
  perform public.registrar_actividad('usuario.rol_quitado', 'usuarios_roles', p_usuario::text, jsonb_build_object('rol', p_rol), null);
end;
$$;

create or replace function public.rbac_eliminar_rol(p_rol uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sistema boolean; v_usuarios int;
begin
  perform public.assert_permiso('equipo.roles.gestionar');
  select es_sistema into v_sistema from public.roles where id = p_rol;
  if v_sistema then raise exception 'Un rol de sistema no se elimina.' using errcode = '42501'; end if;
  if not public.rol_dominado(p_rol) then raise exception 'No podés eliminar un rol con permisos que no tenés.' using errcode = '42501'; end if;
  select count(*) into v_usuarios from public.usuarios_roles where rol_id = p_rol;
  if v_usuarios > 0 then raise exception 'El rol tiene % usuario(s): reasignalos antes.', v_usuarios using errcode = '23503'; end if;
  delete from public.roles where id = p_rol;
  perform public.registrar_actividad('rol.eliminado', 'roles', p_rol::text, null, null);
end;
$$;

-- Guardián diferido: al cerrar la transacción siempre queda alguien ACTIVO con los dos
-- permisos de administración, y el rol `dueno` nunca pierde equipo.*.
create or replace function public.rbac_guardian()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.perfiles p
    join public.usuarios_roles ur on ur.usuario_id = p.id
    join public.roles_permisos a on a.rol_id = ur.rol_id and a.permiso_clave = 'equipo.roles.gestionar'
    join public.roles_permisos b on b.rol_id = ur.rol_id and b.permiso_clave = 'equipo.usuarios.gestionar'
    where p.activo and not p.bloqueado
  ) and exists (select 1 from public.perfiles) then
    raise exception 'Siempre tiene que quedar alguien activo que administre roles y usuarios.' using errcode = '23514';
  end if;
  if exists (select 1 from public.roles where clave = 'dueno')
     and not exists (select 1 from public.roles r join public.roles_permisos rp on rp.rol_id = r.id where r.clave = 'dueno' and rp.permiso_clave = 'equipo.roles.gestionar') then
    raise exception 'El rol dueño no puede perder equipo.roles.gestionar.' using errcode = '23514';
  end if;
  return null;
end;
$$;
drop trigger if exists trg_rbac_guardian_rp on public.roles_permisos;
create constraint trigger trg_rbac_guardian_rp after insert or update or delete on public.roles_permisos
  deferrable initially deferred for each row execute function public.rbac_guardian();
drop trigger if exists trg_rbac_guardian_ur on public.usuarios_roles;
create constraint trigger trg_rbac_guardian_ur after insert or update or delete on public.usuarios_roles
  deferrable initially deferred for each row execute function public.rbac_guardian();
drop trigger if exists trg_rbac_guardian_perfiles on public.perfiles;
create constraint trigger trg_rbac_guardian_perfiles after update of activo, bloqueado on public.perfiles
  deferrable initially deferred for each row execute function public.rbac_guardian();

-- Bloquear / desbloquear
create or replace function public.equipo_bloquear(p_usuario uuid, p_bloquear boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if p_usuario = (select auth.uid()) then raise exception 'No podés bloquearte a vos mismo.' using errcode = '42501'; end if;
  update public.perfiles set bloqueado = p_bloquear,
    bloqueado_en = case when p_bloquear then now() else null end,
    bloqueado_por = case when p_bloquear then (select auth.uid()) else null end,
    bloqueo_motivo = case when p_bloquear then p_motivo else null end
  where id = p_usuario;
  perform public.registrar_actividad(case when p_bloquear then 'usuario.bloqueado' else 'usuario.desbloqueado' end, 'perfiles', p_usuario::text, null, jsonb_build_object('motivo', p_motivo));
end;
$$;

revoke all on function public.rbac_crear_rol(text, text, text, text) from public, anon;
revoke all on function public.rbac_otorgar(uuid, text, uuid, public.alcance_permiso) from public, anon;
revoke all on function public.rbac_revocar(uuid, text, uuid) from public, anon;
revoke all on function public.rbac_asignar_rol(uuid, uuid, boolean) from public, anon;
revoke all on function public.rbac_quitar_rol(uuid, uuid) from public, anon;
revoke all on function public.rbac_eliminar_rol(uuid) from public, anon;
revoke all on function public.equipo_bloquear(uuid, boolean, text) from public, anon;
grant execute on function public.rbac_crear_rol(text, text, text, text), public.rbac_otorgar(uuid, text, uuid, public.alcance_permiso), public.rbac_revocar(uuid, text, uuid), public.rbac_asignar_rol(uuid, uuid, boolean), public.rbac_quitar_rol(uuid, uuid), public.rbac_eliminar_rol(uuid), public.equipo_bloquear(uuid, boolean, text) to authenticated;
