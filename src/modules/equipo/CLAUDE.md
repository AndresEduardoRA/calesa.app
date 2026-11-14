# equipo

Autenticación, perfiles, roles y permisos (RBAC puro), invitaciones, bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como».

## Entra y sale

- Entra: sesión de Supabase Auth (email+contraseña, Google), enlaces de correos de Auth, gestión del equipo y roles, la cookie `perspectiva`.
- `index.ts`: sesión (`requerirSesion()`, `getPermisos()`, `puede()`, `sinRol()`), acceso (`canjearAcceso()`, `cerrarSiInactiva()`, `cerrarSesion`…),
  equipo (`leerEquipo(filtro)`: 100 primeras por nombre; `leerPersona`, `leerMatriz`, `leerVistas`…), y para `tablero` `leerPersonasSinRol({ tope })`.
- `client.ts`: `usePerspectiva()`, `<RoleBadge>`, `<MenuDeVistas>`, `guardarPreferencia`. `shell.ts` / `shell.client.ts`: sesión, proveedores y
  `<BannerPerspectiva>`.
- Lo consumen todos. Depende de `empresa`. **Nunca de `origenes`**: la página pasa los orígenes a la matriz por props.

## Archivos clave

- `entities/sesion.ts` — `Sesion` desde `mi_sesion()` (permisos **efectivos**). `entities/preferencias.ts` — última escritura gana, sin versión.
- `entities/dominancia.ts` — espejo de `concesion_dominada()` y `rol_dominado()`. `puede()` y el catálogo de claves: `@/shared/lib/permisos`.
- `entities/vista.ts` — `RUTA_DE_PANTALLA`: un listado nuevo que guarda vistas se suma ahí.
- `infra/invitaciones.ts` — **la excepción del cliente admin**: `conAdminDeAuth()` comprueba `equipo.usuarios.gestionar` y entrega sólo `auth.admin`
  (lo cuida el lint). Crear rol o invitar no es idempotente.

- «Visto» (`features/vistos/`, `entities/vistos.ts`): `ProveedorDeMarcasDeVisto` (una lectura de `vistos_de` por página y el abierto marcado al
  abrirse), `RegistrarVisto` (la ficha), `VistosDelPerfil` y la preferencia `vistos` (en `ProveedorPreferencias`). Las marcas se dibujan en
  `@/shared/ui/lista` (`idDeVisto`, `<SufijoDeVisto>`).

## Tablas

`perfiles` (el avatar o su fallo **no mueven `actualizado_en`**), `equipo_bajas` (`terminada_en` nulo = en curso), `roles`, `permisos` (catálogo fijo),
`roles_permisos`, `usuarios_roles`, `preferencias_usuario`, `vistas_guardadas`, `visitados`, `vistos` (por RPC `visto_registrar`;
se lee con `vistos_de`; job `vistos-purgar`).
RPC: `mi_sesion(p_perspectiva)`, `permisos_efectivos`, `mis_permisos`, `tiene_permiso`, `alcance_de`, `origenes_con_permiso|alcance`, `rol_dominado`,
`concesion_dominada`, `persona_dominada` (privada), `personas_dominadas(ids)` (≤ 101 ids), `rbac_crear_rol`, `rbac_eliminar_rol`,
`rbac_otorgar`, `rbac_revocar`, `rbac_asignar_rol`, `rbac_quitar_rol`, `equipo_bloquear`, `equipo_dar_de_baja`, `equipo_vista_previa_baja`, `equipo_lista(texto, estado, límite)` (definer; exige
`equipo.usuarios.ver` o `.gestionar`), `equipo_aceptar_invitacion`, `roles_personas()`. Baja por lotes: `_baja_lote*`, `_baja_terminar`,
`_bajas_en_curso()`, `_lead_aplicar_bajas`, job `equipo-bajas` cada minuto.

## No se rompe

- Permisos = unión de los roles; sin deny ni herencia; el catálogo sólo cambia por migración.
- Dominancia: nadie otorga, edita, asigna ni quita lo que no tiene; nadie bloquea, da de baja ni cambia los roles de quien tiene permisos que él no
  cubre (el rol `dueno` sí, sobre todos). La decide la base en cada RPC, que empieza por `_dominancia_tomar()` (también `nivel_crear`,
  que le suma permisos al rol `dueno`; la baja, compartido), toma el perfil `for update` y los roles `for share`
  (`scripts/carreras/dominancia.mjs`); la UI la muestra antes con el motivo y, si `personas_dominadas()` falla, apaga igual.
- `rbac_guardian()`: al commit queda ≥ 1 persona operativa (activa, sin bloqueo, invitación aceptada) cuyos roles **sumados** dan
  `equipo.roles.gestionar` y `equipo.usuarios.gestionar`; el rol `dueno` conserva todos los permisos de `equipo`. Su mensaje llega tal cual.
- Toda edición de un rol manda `roles.actualizado_en` (`PT409`). Bloquear y dar de baja usan el estado de la cuenta como precondición.
- La perspectiva es sólo UI: `sesion.permisos` = míos ∩ rol elegido; RLS, RPC y `actionClient` usan los reales. Sólo con `equipo.roles.gestionar` real.
- Invitar: `auth.admin.createUser` con `app_metadata.invitado = true`; el rol lo asigna `rbac_asignar_rol` con la sesión de quien invita; si falla, la
  cuenta se borra. Un solo enlace vigente por persona; generarlo exige dominar sus roles.
- Dar de baja manda al limbo los leads sin ningún asesor vigente; vista previa y baja cuentan igual. Bloquear no toca datos.
- **La baja va en dos tiempos:** apaga la cuenta y corre un lote de 5.000; con más queda en curso y el job la termina. Mientras dura,
  `_bajas_en_curso()` entra a la visibilidad de leads. Los lotes usan `skip locked`; compartir o transferir **a** quien se da de baja toma su perfil
  `for share`.
- Cuenta bloqueada o dada de baja nunca se queda adentro: al ingresar, al canjear un enlace y en cada pantalla (`requerirSesion()` → `/auth/cerrar`).
  El ingreso no revela si un correo existe; el texto de un aviso sale del catálogo, no de la URL.
- Vista guardada = parámetros de URL; de quien la guarda (RLS de fila propia), sin RPC ni versión; mismo nombre reemplaza; tope 20 por pantalla.

## Ojo

- `auth_registro_permitido()` corre en trigger sobre `auth.users` **diferido al cierre de la transacción** (un `BEFORE INSERT` rechazaba a las
  invitadas). Con registro cerrado Auth falla sin detalle: la app comprueba `registroDisponible()` antes.
- La invitación vence con `otp_expiry` (1 h local; 24 h en la nube). Si abrió el enlace sin elegir contraseña, Auth sólo deja uno de recuperación.
- `equipo.roles.ver` se hace cumplir sólo en `niveles_con_uso()`; `equipo.usuarios.ver`, en la policy de `equipo_bajas` y en `equipo_lista()`.
- Las policies llaman `(select tiene_permiso('…'))` como InitPlan: no cambies su firma. Si la llamada nombra una columna de la fila corre por fila; por
  origen: `origen_id = any ((select origenes_con_alcance('x', 'todos'))::uuid[])`.
- `_bajas_en_curso()` sólo habla a una cuenta activa o a los jobs (apagada o bloqueada recibe `{}`).
- Una persona bloqueada no lee `perfiles`: su estado sale de `mi_sesion()`. `perfiles.rol` no existe a propósito.
- `DropdownMenuLabel` sólo vale dentro de un grupo. Correos de Auth: `token_hash` (`supabase/templates/`; en la nube, a mano).
