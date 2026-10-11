-- Perspectiva «ver como»: mirar la app con los permisos de otro rol. Escrito a mano.
-- Es sólo interfaz. Las policies, las RPC y las Server Actions siguen preguntándole a
-- `mis_permisos()` (los permisos reales): la perspectiva decide qué se dibuja, nunca qué se puede.

-- ---------------------------------------------------------------------------
-- Permisos efectivos = los míos ∩ los del rol elegido
-- ---------------------------------------------------------------------------
-- Por cada concesión mía y cada concesión del rol sobre el mismo permiso y orígenes compatibles,
-- queda el origen más angosto y el alcance menor. Toda fila que sale está cubierta por una mía:
-- nunca puede dar más de lo real, aunque el rol elegido tenga más que yo.
-- Sólo la usa quien tiene `equipo.roles.gestionar` de verdad (es la herramienta de quien diseña
-- roles). Sin ese permiso, sin perspectiva o con un rol que no existe, devuelve los reales.
create or replace function public.permisos_efectivos(p_perspectiva uuid default null)
returns table (clave text, origen_id uuid, alcance public.alcance_permiso)
language sql stable security definer set search_path = '' as $$
  with usa as (
    select (p_perspectiva is not null
            and public.tiene_permiso('equipo.roles.gestionar')
            and exists (select 1 from public.roles r where r.id = p_perspectiva)) as si
  )
  select m.clave, m.origen_id, m.alcance
  from public.mis_permisos() m cross join usa
  where not usa.si
  union
  select m.clave,
         coalesce(rp.origen_id, m.origen_id),
         (case when m.alcance = 'todos' and rp.alcance = 'todos' then 'todos' else 'propios' end)::public.alcance_permiso
  from public.mis_permisos() m
  join public.roles_permisos rp
    on rp.rol_id = p_perspectiva and rp.permiso_clave = m.clave
   and (m.origen_id is null or rp.origen_id is null or m.origen_id = rp.origen_id)
  cross join usa
  where usa.si;
$$;
revoke all on function public.permisos_efectivos(uuid) from public, anon;
grant execute on function public.permisos_efectivos(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Con sesión: todo lo que el shell necesita de la persona, en una sola ida a la base
-- ---------------------------------------------------------------------------
-- Estado de la cuenta, perfil, roles, concesiones y preferencias. DEFINER porque una persona
-- bloqueada o dada de baja no puede leer `perfiles` (la policy exige estar activa) y la app
-- tiene que poder decirle por qué no entra. Sólo devuelve datos de quien llama. Para una cuenta
-- que no está activa, `permisos` viene vacío (lo decide `mis_permisos()`).
-- `permisos` son los EFECTIVOS: con una perspectiva activa, lo que la interfaz debe dibujar.
-- `roles` son siempre los reales. `perspectiva.disponible` sale del permiso real, así «Salir»
-- sigue ahí aunque el rol que se mira no tenga nada de `equipo`.
create or replace function public.mi_sesion(p_perspectiva uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'estado', case when not p.activo then 'baja' when p.bloqueado then 'bloqueada' else 'activa' end,
    'perfil', jsonb_build_object(
      'id', p.id, 'nombre', p.nombre, 'email', p.email, 'avatar_ruta', p.avatar_ruta,
      'actualizado_en', p.actualizado_en),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'clave', r.clave, 'nombre', r.nombre, 'color', r.color, 'es_principal', ur.es_principal)
                       order by ur.es_principal desc, r.orden, r.nombre)
      from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
      where ur.usuario_id = p.id), '[]'::jsonb),
    'permisos', coalesce((
      select jsonb_agg(jsonb_build_object('clave', m.clave, 'origen_id', m.origen_id, 'alcance', m.alcance))
      from public.permisos_efectivos(p_perspectiva) m), '[]'::jsonb),
    'perspectiva', jsonb_build_object(
      'disponible', v.disponible,
      'rol', (
        select jsonb_build_object('id', r.id, 'nombre', r.nombre, 'color', r.color)
        from public.roles r where v.disponible and r.id = p_perspectiva),
      'roles', coalesce((
        select jsonb_agg(jsonb_build_object('id', r.id, 'nombre', r.nombre, 'color', r.color) order by r.orden, r.nombre)
        from public.roles r where v.disponible), '[]'::jsonb)),
    'preferencias', coalesce((
      select jsonb_object_agg(pu.clave, pu.valor)
      from public.preferencias_usuario pu
      where pu.usuario_id = p.id), '{}'::jsonb))
  from public.perfiles p
  cross join lateral (select public.tiene_permiso('equipo.roles.gestionar') as disponible) v
  where p.id = (select auth.uid());
$$;
revoke all on function public.mi_sesion(uuid) from public, anon;
grant execute on function public.mi_sesion(uuid) to authenticated;
