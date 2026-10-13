# equipo

Autenticación, perfiles, roles y permisos (RBAC puro), invitaciones, bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como».

## Entra y sale

- Entra: sesión de Supabase Auth (email+contraseña, Google), enlaces de los correos de Auth (confirmar, recuperar, invitar), acciones de quien gestiona el equipo y los roles, la cookie `perspectiva`.
- Sale por `index.ts` (servidor):
  - Sesión: `requerirSesion()`, `getPermisos()`, `puede()`, `sinRol()`, `nombreVisible()`.
  - Acceso: `FormularioIngreso`, `FormularioRegistro`, `RegistroCerrado`, `FormularioRecuperar`, `FormularioNuevaContrasena`, `canjearAcceso()`, `cerrarSiInactiva()`, `requerirSesionDeEnlace()`, `googleHabilitado()`, `avisoDe()`, action `cerrarSesion`.
  - Perfil: `FormularioPerfil`, `PreferenciasPerfil`, `ProveedorPreferencias`.
  - Equipo: `leerEquipo()`, `leerVistaPreviaDeBaja()`, `idDePersona()`, `<ListaEquipo>`.
  - Roles: `leerMatriz()`, `agruparPorModulo()`, `<MatrizDeRoles>`, `<RoleBadge>`.
  - Perspectiva: `<ProveedorPerspectiva>`, `<BannerPerspectiva>`.
  - Vistas guardadas: `leerVistas(pantalla)` (las de quien llama).
- Sale por `client.ts` (Client Components de `app/` y de otros módulos): `usePerspectiva()`, `<RoleBadge>`, tipos `Perspectiva` y `RolParaVerComo`; y `<MenuDeVistas pantalla vistas actuales puedeGuardar>` con los tipos `VistaGuardada` y `ParamsDeVista`: el menú que un listado monta en el hueco `vistas` de `<FilterShell>`.
- Lo consumen `app/` y todos los módulos. Depende de: `empresa` (registro abierto, ajustes). **Nunca de `origenes`** (que depende de este): la página lee los orígenes y se los pasa a la matriz por props.

## Archivos clave

- `entities/sesion.ts` — `Sesion` a partir de `mi_sesion()`: estado de la cuenta, perfil, roles reales, permisos **efectivos**, perspectiva y preferencias.
- `entities/dominancia.ts` — espejo de `concesion_dominada()` y `rol_dominado()`, y los motivos que se muestran. `entities/matriz.ts` — catálogo agrupado por módulo, lugares donde se da un permiso, resumen de una celda. `entities/rol.ts` — `Rol`, `claveDeRol()`, `versionMasNueva()`, `motivoDeNoEliminar()`.
- `entities/persona.ts` — `PersonaDelEquipo`, `EstadoPersona`, `accionesSobre()`, filtros, `VistaPreviaDeBaja`, `descripcionDeBaja()`. `entities/invitacion.ts` — `enlaceDeInvitacion()`. `entities/perspectiva.ts` — `Perspectiva`, `COOKIE_PERSPECTIVA`, `leerPerspectiva()`.
- `entities/repositorios.ts` (acceso, perfil, sesión) y `entities/repositorios-equipo.ts` (roles, equipo, `CuentasInvitadas`, lectores). `composicion.ts` (servidor) y `composicion.client.ts` (navegador) les dan la implementación de `infra/`: `features/` importa de ahí, nunca de `infra/`.
- `infra/rbac.ts`, `infra/equipo.ts` (RPC), `infra/queries/{sesion,equipo,roles}.ts` (lecturas), `infra/acceso.ts`, `infra/perfil.ts`, `infra/avatar.client.ts`.
- `infra/invitaciones.ts` — **la excepción del cliente admin**: `conAdminDeAuth()` comprueba el permiso y entrega sólo `auth.admin` como `CuentasInvitadas`.
- `features/auth/`, `features/perfil/` — acceso y perfil propio.
- `features/roles/` — matriz (`matriz-de-roles`, `grupo-matriz`, `celda-concesion`, `editor-concesion`), `hooks/use-matriz.ts` (una edición por rol a la vez), crear y eliminar rol.
- `features/equipo/` — `invitar.ts` (los pasos de invitar, con puertos), lista, panel de roles, bloqueo, baja, enlace copiable; `hooks/use-acciones-equipo.ts`, `hooks/use-invitaciones.ts`.
- `entities/vista.ts` — `VistaGuardada`, `RUTA_DE_PANTALLA` (qué listados guardan vistas y su ruta: uno nuevo se suma ahí), `esLaVistaActual()`, `urlDeVista()`, `motivoParaNoGuardar()`. `infra/vistas.ts`, `infra/queries/vistas.ts`, `features/vistas/` (actions, `use-vistas.ts`, `menu-de-vistas.tsx`).
- `features/perspectiva/` — `cookie.ts`, actions `verComo` y `salirDePerspectiva`, `usePerspectiva()`, banner.
- `puede()` y el catálogo de claves y módulos viven en `@/shared/lib/permisos` (docs/DECISIONES.md).

## Tablas

`perfiles` (con `invitado_en` e `invitacion_aceptada_en`), `roles`, `permisos` (catálogo fijo), `roles_permisos`, `usuarios_roles`, `preferencias_usuario`, `vistas_guardadas`, `visitados`.
RPC: `mi_sesion(p_perspectiva)`, `permisos_efectivos`, `mis_permisos`, `tiene_permiso`, `alcance_de`, `origenes_con_permiso`, `origenes_con_alcance`, `rol_dominado`, `concesion_dominada`, `rbac_crear_rol`, `rbac_eliminar_rol`, `rbac_otorgar`, `rbac_revocar`, `rbac_asignar_rol`, `rbac_quitar_rol`, `equipo_bloquear`, `equipo_dar_de_baja`, `equipo_vista_previa_baja`, `equipo_aceptar_invitacion`.

## No se rompe

- Permisos = unión de los roles; sin deny, sin herencia. El catálogo `permisos` sólo cambia por migración (sin enforcement no hay permiso).
- Dominancia: nadie otorga, edita, asigna ni quita lo que no tiene. La decide la base en cada RPC; la UI la muestra antes (deshabilitado con el motivo).
- `rbac_guardian()`: al commit queda ≥1 persona que puede operar (activa, sin bloqueo, invitación aceptada) cuyos roles **sumados** dan `equipo.roles.gestionar` y `equipo.usuarios.gestionar`; y el rol `dueno` conserva todos los permisos de `equipo`. Su mensaje llega tal cual a la pantalla.
- Toda edición de un rol manda su versión (`roles.actualizado_en`); otra versión es `PT409`. Bloquear y dar de baja usan el estado de la cuenta como precondición.
- La perspectiva es sólo UI: `sesion.permisos` son los efectivos (míos ∩ rol elegido, calculados en SQL, nunca más que los reales); RLS, las RPC y `actionClient` usan los reales. Sólo la usa quien tiene `equipo.roles.gestionar` de verdad.
- Invitar: la cuenta nace con `auth.admin.createUser` y `app_metadata.invitado = true`; el rol lo asigna `rbac_asignar_rol` con la sesión de quien invita; si eso falla, la cuenta se borra. Hay un solo enlace vigente por persona.
- Generar el enlace de una invitación exige dominar los roles de esa persona: quien abre el enlace elige la contraseña de la cuenta.
- El cliente admin sólo se crea en `infra/invitaciones.ts`, después de comprobar `equipo.usuarios.gestionar`, y nunca sale de ahí más que `auth.admin` (lo cuida el lint).
- Dar de baja manda al limbo los leads que quedan sin ningún asesor vigente; la vista previa y la baja cuentan con la misma función. Bloquear no toca datos.
- Una cuenta bloqueada o dada de baja nunca se queda adentro: al ingresar, al canjear un enlace y en cada pantalla (`requerirSesion()` → `/auth/cerrar`) se cierra la sesión y se dice el motivo.
- Una vista guardada son **parámetros de URL** (`vistas_guardadas.params`) de una pantalla: aplicarla es navegar. Son de quien las guarda (RLS de fila propia), no otorgan nada y no chocan con nadie: se escriben directo, sin RPC ni versión, como las preferencias. Guardar con un nombre que ya existe reemplaza; hay un tope de 20 por pantalla; eliminar ofrece «Deshacer». Qué significa cada parámetro lo decide el listado al leerlos (tolerante): `equipo` no conoce los filtros de nadie.
- El ingreso no revela si un correo existe. El texto de un aviso sale del catálogo, nunca de la URL.

## Ojo

- `auth_registro_permitido()` corre en trigger sobre `auth.users`, **diferido al cierre de la transacción**: Auth inserta la cuenta y después le pone `app_metadata` en un UPDATE, y un `BEFORE INSERT` rechazaba también a las invitadas. Con registro cerrado el signup falla aunque la UI lo esconda, pero Auth responde un error sin detalle: la app comprueba `registroDisponible()` antes de pedir el alta (`registrarse`) y al volver de Google (`canjearAcceso`).
- La invitación vence con `otp_expiry` de Auth (1 h en local, hasta 24 h en la nube). Para eso está «Generar otro enlace». Si la persona ya abrió un enlace pero no eligió contraseña, Auth sólo deja generar uno de recuperación: llega a la misma pantalla.
- `equipo.usuarios.ver` y `equipo.roles.ver` no tienen enforcement en la base (`perfiles`, `roles` y sus concesiones las lee cualquier cuenta activa): los comprueba la página.
- Bloquear y dar de baja **no** exigen dominar los roles de la persona (deuda anotada en docs/ESTADO.md).
- Las policies llaman `(select tiene_permiso('…'))` como InitPlan: nunca cambiar la firma sin tocar `20261011000200_rls_y_grants.sql`. Sólo es InitPlan si la llamada **no nombra una columna de la fila**: `(select alcance_de('x', origen_id))` corre por fila. Para acotar por origen, `origen_id = any ((select origenes_con_alcance('x', 'todos'))::uuid[])` (así está `vehiculos`).
- `perfiles.rol` no existe a propósito: ningún `if (rol === …)` en componentes.
- `index.ts` mezcla servidor y cliente: lo importan Server Components. Un Client Component de afuera importa `client.ts`.
- Una etiqueta de menú de Base UI (`DropdownMenuLabel`) sólo vale dentro de un grupo: suelta, tumba la pantalla al abrir el menú.
- Una persona bloqueada no puede leer `perfiles`: su estado sale de `mi_sesion()`, que es DEFINER.
- Los correos de Auth usan `token_hash` (plantillas en `supabase/templates/`, tres: confirmar, recuperar, invitar). En la nube se cargan a mano.
- Una action que escribe cookies (ingresar, `verComo`) hace que la página se vuelva a dibujar.
