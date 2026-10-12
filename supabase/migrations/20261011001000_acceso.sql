-- Acceso: lo que la app necesita antes de ingresar. Escrito a mano; no escribe.
-- Lo de cada request ya con sesión (`mi_sesion()`) está en `…001100_perspectiva.sql`.

-- ---------------------------------------------------------------------------
-- Antes de ingresar: lo mínimo de la empresa que ve alguien SIN sesión
-- ---------------------------------------------------------------------------
-- Las pantallas de ingreso y registro muestran el nombre y el logo con el color de la marca, y
-- necesitan saber si hay que ofrecer «Crear cuenta». El manifest de la PWA también se pide sin
-- sesión: de acá salen sus íconos. `ajustes_empresa` sólo la lee `authenticated`, y `anon` sólo toca el
-- esquema `web`: por eso vive acá, con las columnas contadas. `primer_registro` repite la
-- excepción de `auth_registro_permitido()`: sin personas todavía, la primera cuenta siempre nace.
create or replace function web.ajustes_acceso()
returns table (nombre text, logo_ruta text, color_acento text, iconos jsonb, locale text, zona_horaria text, moneda_base text, registro_abierto boolean, primer_registro boolean)
language sql stable security definer set search_path = '' as $$
  select e.nombre, e.logo_ruta, e.color_acento, e.iconos, e.locale, e.zona_horaria, e.moneda_base::text,
         e.registro_abierto, not exists (select 1 from public.perfiles)
  from public.ajustes_empresa e
  where e.id = 1;
$$;
revoke all on function web.ajustes_acceso() from public;
grant execute on function web.ajustes_acceso() to anon, authenticated, service_role;
