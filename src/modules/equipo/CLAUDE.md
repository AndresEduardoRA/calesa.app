# equipo

Autenticación, perfiles, roles y permisos (RBAC puro), bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como».

## Entra y sale

- Entra: sesión de Supabase Auth (email+contraseña, Google), invitaciones por API admin, acciones del dueño sobre el equipo.
- Sale: `puede()`, `getPermisos()` (claves tipadas + alcance + origen), `requerirSesion()`, `<RoleBadge>`, `usePerspectiva()`. Lo consumen `app/` y todos los módulos.
- Depende de: `empresa` (registro abierto, ajustes).

## Archivos clave

- `entities/permisos.ts` — tipo `ClavePermiso` (espejo de `permisos` del seed), `puede(permisos, clave, origenId?)`.
- `entities/dominancia.ts` — regla pura «nadie otorga lo que no tiene»; test al lado.
- `infra/queries/perfiles.ts`, `infra/rbac.ts` — RPC `rbac_*`, `mis_permisos()`.
- `features/equipo/`, `features/roles/` (matriz), `features/auth/` (login, recuperar, registro), `features/perfil/`.

## Tablas

`perfiles`, `roles`, `permisos` (catálogo fijo), `roles_permisos`, `usuarios_roles`, `preferencias_usuario`, `vistas_guardadas`, `visitados`.
RPC: `rbac_crear_rol`, `rbac_eliminar_rol`, `rbac_otorgar`, `rbac_revocar`, `rbac_asignar_rol`, `rbac_quitar_rol`, `equipo_bloquear`, `equipo_dar_de_baja`, `mis_permisos`, `tiene_permiso`, `alcance_de`, `origenes_con_permiso`.

## No se rompe

- Permisos = unión de los roles; sin deny, sin herencia. El catálogo `permisos` sólo cambia por migración (sin enforcement no hay permiso).
- `rbac_guardian()`: al commit siempre queda ≥1 persona activa con `equipo.roles.gestionar` y `equipo.usuarios.gestionar`.
- Dar de baja manda los leads al limbo (`lead_en_limbo`); bloquear no toca datos.
- La perspectiva es sólo UI: RLS siempre usa el rol real. `permisos_efectivos = míos ∩ perspectiva`, calculado en SQL.

## Ojo

- `auth_registro_permitido()` corre en trigger sobre `auth.users`: con registro cerrado el signup falla aunque la UI lo esconda.
- Las policies llaman `(select tiene_permiso('…'))` como InitPlan: nunca cambiar la firma sin tocar `20261011000200_rls_y_grants.sql`.
- `perfiles.rol` no existe a propósito: ningún `if (rol === …)` en componentes.
