# equipo

Autenticación, perfiles, roles y permisos (RBAC puro), bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como».

## Entra y sale

- Entra: sesión de Supabase Auth (email+contraseña, Google), enlaces de los correos de Auth (confirmar, recuperar, invitar), acciones del dueño sobre el equipo.
- Sale (hoy): `requerirSesion()`, `getPermisos()`, `puede()`, `sinRol()`, `nombreVisible()`; el acceso (`FormularioIngreso`, `FormularioRegistro`, `RegistroCerrado`, `FormularioRecuperar`, `FormularioNuevaContrasena`, `canjearAcceso()`, `cerrarSiInactiva()`, `requerirSesionDeEnlace()`, `googleHabilitado()`, `avisoDe()`, action `cerrarSesion`); el perfil propio (`FormularioPerfil`, `PreferenciasPerfil`, `ProveedorPreferencias`). Lo consumen `app/` y todos los módulos.
- Sale (partes 2 y 3 de la fase 1): lista del equipo, invitaciones, matriz de roles, `<RoleBadge>`, `usePerspectiva()`.
- Depende de: `empresa` (registro abierto, ajustes).

## Archivos clave

- `entities/sesion.ts` — `Sesion` (estado de la cuenta, perfil, roles, permisos, preferencias) a partir de `mi_sesion()`; `sinRol()`, `nombreVisible()`.
- `entities/errores-acceso.ts` — error de Auth → `ErrorApp` legible; `entities/avisos.ts` — catálogo de `?aviso=`; `entities/canje.ts` — qué llegó a `/auth/callback` y a dónde va; `entities/preferencias.ts` — densidad y tema.
- `entities/repositorios.ts` — interfaces `ServicioAcceso`, `RepositorioPerfil`, `LectorDeSesion`. `composicion.ts` (servidor) y `composicion.client.ts` (navegador) les dan la implementación de `infra/`: `features/` importa de ahí, nunca de `infra/`.
- `infra/acceso.ts` (Supabase Auth), `infra/queries/sesion.ts` (`getSesion()`, una RPC por request), `infra/perfil.ts`, `infra/avatar.client.ts`.
- `features/auth/` — `sesion.ts` (`requerirSesion`, `getPermisos`), `canjear.ts`, `actions/`, `components/`, `schemas/acceso.ts`. `features/perfil/` — formulario, foto con commit diferido (`hooks/use-guardar-perfil.ts`), preferencias.
- `puede()` y el tipo `ClavePermiso` viven en `@/shared/lib/permisos` (docs/DECISIONES.md); `index.ts` los reexporta.
- Pendiente: `entities/dominancia.ts`, `infra/rbac.ts`, `features/equipo/`, `features/roles/`.

## Tablas

`perfiles`, `roles`, `permisos` (catálogo fijo), `roles_permisos`, `usuarios_roles`, `preferencias_usuario`, `vistas_guardadas`, `visitados`.
RPC: `mi_sesion`, `rbac_crear_rol`, `rbac_eliminar_rol`, `rbac_otorgar`, `rbac_revocar`, `rbac_asignar_rol`, `rbac_quitar_rol`, `equipo_bloquear`, `equipo_dar_de_baja`, `mis_permisos`, `tiene_permiso`, `alcance_de`, `origenes_con_permiso`.

## No se rompe

- Permisos = unión de los roles; sin deny, sin herencia. El catálogo `permisos` sólo cambia por migración (sin enforcement no hay permiso).
- `rbac_guardian()`: al commit siempre queda ≥1 persona activa con `equipo.roles.gestionar` y `equipo.usuarios.gestionar`.
- Dar de baja manda los leads al limbo (`lead_en_limbo`); bloquear no toca datos.
- La perspectiva es sólo UI: RLS siempre usa el rol real. `permisos_efectivos = míos ∩ perspectiva`, calculado en SQL.
- Una cuenta bloqueada o dada de baja nunca se queda adentro: al ingresar, al canjear un enlace y en cada pantalla (`requerirSesion()` → `/auth/cerrar`) se cierra la sesión y se dice el motivo.
- El ingreso no revela si un correo existe: contraseña mala y correo inexistente dicen lo mismo; recuperar responde igual en los dos casos.
- El texto de un aviso sale del catálogo, nunca de la URL (`?aviso=` lleva sólo la clave).

## Ojo

- `auth_registro_permitido()` corre en trigger sobre `auth.users`: con registro cerrado el signup falla aunque la UI lo esconda. Auth no reenvía el mensaje del trigger: responde `Database error saving new user`, que `errorDeAuth()` traduce.
- Las policies llaman `(select tiene_permiso('…'))` como InitPlan: nunca cambiar la firma sin tocar `20261011000200_rls_y_grants.sql`.
- `perfiles.rol` no existe a propósito: ningún `if (rol === …)` en componentes.
- `index.ts` mezcla servidor y cliente: lo importan Server Components. Un Client Component de `app/` o de otro módulo recibe la action o el dato por props (importar el índice arrastraría `server-only` al navegador).
- Una persona bloqueada no puede leer `perfiles` (la policy exige estar activa): su estado sale de `mi_sesion()`, que es DEFINER.
- Los correos de Auth usan `token_hash` (plantillas en `supabase/templates/`), no el código PKCE: así el enlace sirve en otro navegador. En la nube las plantillas se cargan a mano.
- Una action que escribe cookies (registrarse, ingresar) hace que la página se vuelva a dibujar: lo que haya que decir después va en la URL (`?aviso=`), no en el estado del formulario.
