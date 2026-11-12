-- Dominancia sobre la persona (9-1, paso 9.03-1; regla del 2026-10-21, docs/DECISIONES.md): nadie bloquea, desbloquea, da de baja ni cambia
-- los roles de quien tiene permisos que él no cubre; el dueño sí, sobre todos. La comparación es la de `rol_dominado()` (clave, origen y
-- alcance), pero sobre todas las concesiones de la persona. Las cuatro RPC la exigen tras tomar la fila de `perfiles` `for update` y las de
-- `roles` de la persona `for share`: un cambio de roles o de permisos que corre a la vez espera o es esperado, nunca se cuela.

-- El núcleo por conjunto: de los ids dados, las personas (con perfil) que quien llama domina. Mis permisos se leen una vez.
create or replace function public._personas_dominadas(p_ids uuid[]) returns setof uuid
  language sql stable security definer
  set search_path = ''
  as $$
  with mias as materialized (select * from public.mis_permisos()),
  soy_dueno as materialized (
    select exists (
      select 1 from public.usuarios_roles ur
      join public.roles r on r.id = ur.rol_id
      join public.perfiles p on p.id = ur.usuario_id
      where ur.usuario_id = (select auth.uid()) and r.clave = 'dueno' and p.activo and not p.bloqueado
    ) as si
  )
  select p.id from public.perfiles p
  where p.id = any (coalesce(p_ids, '{}'::uuid[]))
    and (
      (select si from soy_dueno)
      or not exists (
        select 1 from public.usuarios_roles ur
        join public.roles_permisos rp on rp.rol_id = ur.rol_id
        where ur.usuario_id = p.id
          and not exists (
            select 1 from mias m
            where m.clave = rp.permiso_clave
              and (m.origen_id is null or m.origen_id = rp.origen_id)
              and (m.alcance = 'todos' or rp.alcance = 'propios')
          )
      )
    );
$$;

alter function public._personas_dominadas(uuid[]) owner to postgres;
revoke all on function public._personas_dominadas(uuid[]) from public, anon, authenticated;
grant execute on function public._personas_dominadas(uuid[]) to service_role;

-- ¿Quien llama domina a esta persona? Falso si no tiene perfil.
create or replace function public.persona_dominada(p_usuario uuid) returns boolean
  language sql stable security definer
  set search_path = ''
  as $$
  select exists (select 1 from public._personas_dominadas(array[p_usuario]));
$$;

alter function public.persona_dominada(uuid) owner to postgres;
revoke all on function public.persona_dominada(uuid) from public, anon, authenticated;
grant execute on function public.persona_dominada(uuid) to service_role;

-- Lo exigen las cuatro RPC, con la fila de `perfiles` ya tomada. Volátil y en dos sentencias a propósito: en READ COMMITTED cada sentencia
-- toma instantánea nueva, así que tras esperar el candado de un rol se ve el permiso que el otro acaba de confirmar.
create or replace function public._exigir_persona_dominada(p_usuario uuid, p_accion text) returns void
  language plpgsql volatile security definer
  set search_path = ''
  as $$
declare v_nombre text;
begin
  perform 1 from public.roles
  where id in (select ur.rol_id from public.usuarios_roles ur where ur.usuario_id = p_usuario)
  for share;
  if not public.persona_dominada(p_usuario) then
    select coalesce(nullif(nombre, ''), email::text) into v_nombre from public.perfiles where id = p_usuario;
    raise exception 'No puedes % %: tiene permisos que tú no tienes.', p_accion, v_nombre using errcode = '42501';
  end if;
end;
$$;

alter function public._exigir_persona_dominada(uuid, text) owner to postgres;
revoke all on function public._exigir_persona_dominada(uuid, text) from public, anon, authenticated;
grant execute on function public._exigir_persona_dominada(uuid, text) to service_role;

-- Las cuatro RPC: misma firma (conservan sus grants), y la dominancia antes de las comprobaciones de estado.
create or replace function public.equipo_bloquear(p_usuario uuid, p_bloquear boolean, p_motivo text default null) returns void
  language plpgsql security definer
  set search_path = ''
  as $$
declare v_activo boolean; v_bloqueado boolean; v_nombre text;
begin
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

create or replace function public.equipo_dar_de_baja(p_usuario uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
  as $$
declare v_activo boolean; v_nombre text; v_terminada boolean; v_baja public.equipo_bajas;
begin
  perform public.assert_permiso('equipo.usuarios.gestionar');
  if p_usuario = (select auth.uid()) then raise exception 'No puedes darte de baja a ti mismo.' using errcode = '42501'; end if;
  select activo, coalesce(nullif(nombre, ''), email::text) into v_activo, v_nombre
  from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa persona ya no está en el equipo.' using errcode = 'PT409'; end if;
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

-- Asignar y quitar: el rol se toma `for share` antes de mirar si lo domino (un `rbac_otorgar()` sobre él espera o es esperado) y la
-- persona `for update` antes de mirar si la domino.
create or replace function public.rbac_asignar_rol(p_usuario uuid, p_rol uuid, p_principal boolean default false) returns void
  language plpgsql security definer
  set search_path = ''
  as $$
begin
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

create or replace function public.rbac_quitar_rol(p_usuario uuid, p_rol uuid) returns void
  language plpgsql security definer
  set search_path = ''
  as $$
begin
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

-- La lectura para la interfaz (paso 9.03-2): de las personas de una página de la lista (o de una sola), a cuáles domina quien mira.
-- Sólo para quien ya ve al equipo; a lo sumo 101 ids (el tope de `equipo_lista()` y uno más).
create or replace function public.personas_dominadas(p_ids uuid[]) returns setof uuid
  language plpgsql stable security definer
  set search_path = ''
  as $$
begin
  perform public.assert_activo();
  if not (public.tiene_permiso('equipo.usuarios.ver') or public.tiene_permiso('equipo.usuarios.gestionar')) then
    raise exception 'No tienes el permiso «equipo.usuarios.ver».' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_ids), 0) > 101 then
    raise exception 'Se piden a lo sumo 101 personas.' using errcode = '22023';
  end if;
  return query select * from public._personas_dominadas(p_ids);
end;
$$;

alter function public.personas_dominadas(uuid[]) owner to postgres;
revoke all on function public.personas_dominadas(uuid[]) from public, anon, authenticated;
grant execute on function public.personas_dominadas(uuid[]) to authenticated, service_role;
