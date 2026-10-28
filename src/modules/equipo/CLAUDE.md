# equipo

Autenticación, perfiles, roles y permisos (RBAC puro), invitaciones, bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como».

Ficha completa: `docs/archivo/modulos/equipo.md`, sólo con grep.

## Entra y sale

- Entra: sesión de Supabase Auth (email+contraseña, Google), enlaces de correos de Auth, acciones de gestión del equipo y roles, la cookie `perspectiva`.
- `index.ts` (servidor, **sin componentes**):
  - Sesión: `requerirSesion()`, `getPermisos()`, `puede()`, `sinRol()`, `nombreVisible()`.
  - Acceso: `canjearAcceso()`, `cerrarSiInactiva()`, `requerirSesionDeEnlace()`, `googleHabilitado()`, `avisoDe()`, `cerrarSesion`.
  - Equipo: `leerEquipo(filtro)` (100 primeras por nombre según `?q=&estado=`), `leerPersona(id)`, `leerSoloYo()`, `leerVistaPreviaDeBaja()`, `idDePersona()`, `filtroDelEquipoDesde()`.
  - `leerMatriz()`, `leerVistas(pantalla)`.
- Componentes por `pantallas/<pantalla>.ts` (sólo `src/app`): `ingreso`, `registro`, `recuperar`, `nueva-contrasena`, `perfil`, `roles`, `equipo`. Pantalla nueva = su archivo.
- `client.ts`: `usePerspectiva()`, `<RoleBadge>`, `Perspectiva`, `RolParaVerComo`; `<MenuDeVistas>` con `VistaGuardada` y `ParamsDeVista` (hueco `vistas` de `<FilterShell>`).
- `shell.ts` / `shell.client.ts` (sólo layout `(app)`): sesión, `puede()`, `cerrarSesion`, `<ProveedorPreferencias>`, `<ProveedorPerspectiva>`, `<BannerPerspectiva>`.
- Lo consumen `app/` y todos los módulos. Depende de `empresa`. **Nunca de `origenes`**: la página le pasa los orígenes a la matriz por props.

## Archivos clave

- `entities/sesion.ts` — `Sesion` desde `mi_sesion()`: estado, perfil, roles reales, permisos **efectivos**, perspectiva, preferencias. `entities/preferencias.ts` — `densidad`, `tema`, `porPagina` (10, 25, 50, 100); última escritura gana, sin versión.
- `entities/dominancia.ts` — espejo de `concesion_dominada()` y `rol_dominado()`. `entities/{matriz,rol}.ts`; personas por rol = `ConteoAcotado`. `puede()` y el catálogo de claves: `@/shared/lib/permisos`.
- `entities/lista-equipo.ts` — `MINIMO_DE_BUSQUEDA_DEL_EQUIPO` (3 letras o dígitos), `TOPE_DEL_EQUIPO`. `entities/persona.ts` — `accionesSobre()`, `VistaPreviaDeBaja`. `entities/{invitacion,perspectiva,vista}.ts` (`RUTA_DE_PANTALLA`: un listado nuevo que guarda vistas se suma ahí).
- `composicion.ts` / `composicion.client.ts` dan a `features/` la implementación de `infra/` (nunca la importa) para las interfaces de `entities/repositorios*.ts`.
- `infra/{rbac,equipo,acceso,perfil,vistas}.ts`, `infra/queries/{sesion,equipo,roles,vistas}.ts` (el equipo lee ids por `equipo_lista()` y luego filas por `id`), `infra/avatar.client.ts`.
- `infra/invitaciones.ts` — **la excepción del cliente admin**: `conAdminDeAuth()` comprueba el permiso y entrega sólo `auth.admin` como `CuentasInvitadas`.
- `features/`: `auth`, `perfil`, `roles` (matriz de una sola vista por ancho; `?panel=nuevo-rol` sólo con `equipo.roles.gestionar`), `equipo` (`invitar.ts` con puertos; crear rol o invitar no es idempotente), `vistas`, `perspectiva`.

## Tablas

`perfiles` (`invitado_en`, `invitacion_aceptada_en`; la miniatura de avatar o su fallo **no mueven `actualizado_en`**), `equipo_bajas` (una fila por baja; `terminada_en` nulo = en curso; la lee `equipo.usuarios.ver`, la escriben sólo la baja y su job), `roles`, `permisos` (catálogo fijo), `roles_permisos`, `usuarios_roles`, `preferencias_usuario`, `vistas_guardadas`, `visitados`.
RPC: `mi_sesion(p_perspectiva)`, `permisos_efectivos`, `mis_permisos`, `tiene_permiso`, `alcance_de`, `origenes_con_permiso|alcance`, `rol_dominado`, `concesion_dominada`, `rbac_crear_rol|eliminar_rol|otorgar|revocar|asignar_rol|quitar_rol`, `equipo_bloquear`, `equipo_dar_de_baja` (`{ terminada, leads_al_limbo }`), `equipo_vista_previa_baja`, `equipo_lista(texto, estado, límite)` (`security definer`, exige `equipo.usuarios.ver` o `.gestionar`; texto sin 3 letras o dígitos seguidos no filtra), `equipo_aceptar_invitacion`, `roles_personas()`. Baja por lotes: `_baja_lote_desde`, `_baja_terminar`, `_baja_lote`, `_bajas_en_curso()`, `_lead_aplicar_bajas`, job `equipo_bajas_continuar()` (`equipo-bajas`, cada minuto).

## No se rompe

- Permisos = unión de los roles; sin deny ni herencia; el catálogo sólo cambia por migración.
- Dominancia: nadie otorga, edita, asigna ni quita lo que no tiene. La decide la base en cada RPC; la UI la muestra antes (con el motivo).
- `rbac_guardian()`: al commit queda ≥1 persona que puede operar (activa, sin bloqueo, invitación aceptada) cuyos roles **sumados** dan `equipo.roles.gestionar` y `equipo.usuarios.gestionar`; el rol `dueno` conserva todos los permisos de `equipo`. Su mensaje llega tal cual.
- Toda edición de un rol manda su versión (`roles.actualizado_en`); otra versión es `PT409`. Bloquear y dar de baja usan el estado de la cuenta como precondición.
- La perspectiva es sólo UI: `sesion.permisos` = míos ∩ rol elegido (SQL, nunca más que los reales); RLS, RPC y `actionClient` usan los reales. Sólo con `equipo.roles.gestionar` real.
- Invitar: la cuenta nace con `auth.admin.createUser` y `app_metadata.invitado = true`; el rol lo asigna `rbac_asignar_rol` con la sesión de quien invita; si falla, la cuenta se borra. Un solo enlace vigente por persona. Generar el enlace exige dominar los roles de esa persona (quien lo abre elige la contraseña).
- El cliente admin sólo se crea en `infra/invitaciones.ts`, tras comprobar `equipo.usuarios.gestionar`, y sólo sale `auth.admin` (lo cuida el lint).
- Dar de baja manda al limbo los leads sin ningún asesor vigente; vista previa y baja cuentan igual. Bloquear no toca datos.
- **La baja va en dos tiempos:** apaga la cuenta, anota `equipo_bajas` y corre un lote de 5.000; con más queda en curso y el job la termina. Mientras dura, `_bajas_en_curso()` entra a la visibilidad de leads: quien está en baja ya cuenta como fuera. Los lotes bloquean `skip locked` (nunca esperan); compartir o transferir **a** quien se da de baja toma su perfil `for share`.
- Cuenta bloqueada o dada de baja nunca se queda adentro: al ingresar, al canjear un enlace y en cada pantalla (`requerirSesion()` → `/auth/cerrar`) se cierra la sesión con el motivo. El ingreso no revela si un correo existe; el texto de un aviso sale del catálogo, no de la URL.
- Vista guardada = parámetros de URL de una pantalla; de quien la guarda (RLS de fila propia), no otorga nada, se escribe directo sin RPC ni versión. Mismo nombre reemplaza; tope 20 por pantalla.

## Ojo

- `auth_registro_permitido()` corre en trigger sobre `auth.users`, **diferido al cierre de la transacción** (un `BEFORE INSERT` rechazaba a las invitadas). Con registro cerrado Auth falla sin detalle: la app comprueba `registroDisponible()` antes de `registrarse` y en `canjearAcceso`.
- La invitación vence con `otp_expiry` (1 h local; 24 h en la nube): «Generar otro enlace». Si abrió el enlace sin elegir contraseña, Auth sólo deja uno de recuperación.
- `equipo.roles.ver` tiene un solo punto de enforcement en la base, `niveles_con_uso()`; `equipo.usuarios.ver` está en la policy de `equipo_bajas` y en `equipo_lista()`.
- Bloquear y dar de baja **aún no** exigen dominar los roles de la persona; decidido el 2026-10-21, se implementa en 9-1 (`docs/PLAN.md`).
- Las policies llaman `(select tiene_permiso('…'))` como InitPlan: no cambiar su firma: la usan todas las policies de la base. Si la llamada nombra una columna de la fila corre por fila; por origen: `origen_id = any ((select origenes_con_alcance('x', 'todos'))::uuid[])`.
- `_bajas_en_curso()` sólo habla a una cuenta activa o a los jobs (apagada/bloqueada recibe `{}`).
- Una persona bloqueada no lee `perfiles`: su estado sale de `mi_sesion()` (DEFINER). `perfiles.rol` no existe a propósito.
- `DropdownMenuLabel` sólo vale dentro de un grupo. Correos de Auth: `token_hash` (`supabase/templates/`; en la nube, a mano).
