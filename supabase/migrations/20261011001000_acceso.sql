-- Acceso: lo que la app necesita antes de ingresar y en cada request ya con sesión.
-- Escrito a mano. Ninguna de las dos funciones escribe.

-- ---------------------------------------------------------------------------
-- Antes de ingresar: lo mínimo de la empresa que ve alguien SIN sesión
-- ---------------------------------------------------------------------------
-- Las pantallas de ingreso y registro muestran el nombre y el logo, y necesitan saber si hay que
-- ofrecer «Crear cuenta». `ajustes_empresa` sólo la lee `authenticated`, y `anon` sólo toca el
-- esquema `web`: por eso vive acá, con las columnas contadas. `primer_registro` repite la
-- excepción de `auth_registro_permitido()`: sin personas todavía, la primera cuenta siempre nace.
create or replace function web.ajustes_acceso()
returns table (nombre text, logo_ruta text, locale text, moneda_base text, registro_abierto boolean, primer_registro boolean)
language sql stable security definer set search_path = '' as $$
  select e.nombre, e.logo_ruta, e.locale, e.moneda_base::text, e.registro_abierto,
         not exists (select 1 from public.perfiles)
  from public.ajustes_empresa e
  where e.id = 1;
$$;
revoke all on function web.ajustes_acceso() from public;
grant execute on function web.ajustes_acceso() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Con sesión: todo lo que el shell necesita de la persona, en una sola ida a la base
-- ---------------------------------------------------------------------------
-- Estado de la cuenta, perfil, roles, concesiones y preferencias. DEFINER porque una persona
-- bloqueada o dada de baja no puede leer `perfiles` (la policy exige estar activa) y la app
-- tiene que poder decirle por qué no entra. Sólo devuelve datos de quien llama. Para una cuenta
-- que no está activa, `permisos` viene vacío (lo decide `mis_permisos()`).
create or replace function public.mi_sesion()
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
      from public.mis_permisos() m), '[]'::jsonb),
    'preferencias', coalesce((
      select jsonb_object_agg(pu.clave, pu.valor)
      from public.preferencias_usuario pu
      where pu.usuario_id = p.id), '{}'::jsonb))
  from public.perfiles p
  where p.id = (select auth.uid());
$$;
revoke all on function public.mi_sesion() from public, anon;
grant execute on function public.mi_sesion() to authenticated;
