# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-11
**Fase actual:** 1 — Equipo, empresa y shell, **abierta**. Hechas las partes 1 y 2 de 3.

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (254), `pnpm db:probar` (17 pruebas de humo),
  `bash scripts/mapa.sh --check`, `pnpm build` y `pnpm test:e2e` (16: 8 casos × escritorio y móvil).
- Parte 1: acceso, proxy con `returnTo`, shell por permisos, bandeja, perfil propio.
- **Invitar** (`/configuracion/equipo?panel=invitar`): por correo y con un rol. La cuenta nace con
  `auth.admin.createUser` e `invitado = true`; el rol lo da `rbac_asignar_rol` con la sesión de
  quien invita. Sale el correo de Auth; si falla, el enlace queda a la vista. Un solo enlace
  vigente: «Copiar enlace» y «Generar otro enlace» reemplazan al anterior.
- **Equipo:** lista con estado (activa, invitación pendiente, bloqueada, dada de baja), búsqueda y
  filtro en la URL, roles por persona con un interruptor por rol, bloquear con «Deshacer», y baja
  con un diálogo que nombra a la persona y dice cuántos leads van al limbo.
- **Roles** (`/configuracion/roles`): matriz por módulo, crear y eliminar, otorgar y revocar con
  origen y alcance. Dominancia visible. Cada celda manda la versión del rol; `PT409` → «Recargar».
- **«Ver como»:** selector en el menú del usuario, banner fijo «Viendo como <rol> · Salir»,
  permisos efectivos calculados en SQL. Sólo para quien tiene `equipo.roles.gestionar`.
- `client.ts`: segunda entrada de un módulo, para Client Components (lint y mapa la reconocen).
- Voz en tuteo (`errores.ts`, `safe-action.ts`, SQL de equipo y roles). Google apagado en local.

## Siguiente: fase 1, parte 3 — empresa

- Formularios de ajustes, monedas, tipos de cambio (y llenar el hueco de la barra superior),
  integraciones, «Regenerar íconos». `getAjustes()` hoy es mínimo.
- Al crear una pantalla: sumarla a `configuracion/secciones.ts` (el test exige que exista) y, si
  es de primer nivel, prender su `disponible` en `_shell/navegacion.ts`.
- Un permiso nuevo de `equipo` se le otorga al rol dueño en su misma migración (lo exige el guardián).

## Pendiente de decidir

- **Dominancia sobre la persona:** quien tiene `equipo.usuarios.gestionar` puede bloquear o dar
  de baja a alguien con más permisos que él (el guardián sólo salva al último). Se dejó afuera.
- **Vencimiento de la invitación:** es el `otp_expiry` de Auth (1 h en local; en la nube, hasta
  24 h). Subirlo afecta también a recuperar contraseña.
- **En la nube (una persona):** proyecto y `supabase link`; las **tres** plantillas de
  `supabase/templates/` en Auth › Emails (confirmar, recuperar, invitar); `Site URL` real y
  `…/auth/callback` en Redirect URLs; SMTP; credenciales de Google y encender el proveedor.
- Rama: sigue `master`.

## Descubierto sobre la marcha

- **Auth pone `app_metadata` después de insertar la cuenta**, en un UPDATE de la misma
  transacción. El trigger de registro cerrado rechazaba a los invitados; ahora es diferido. Efecto:
  con el registro cerrado Auth responde un error sin detalle, y la app lo comprueba por su cuenta.
- Auth guarda un solo token de invitación por cuenta y `generateLink` no manda correo: el enlace
  copiable y el del correo no pueden ser el mismo. Sobre una cuenta ya confirmada sólo deja
  generar uno de recuperación.
- Una etiqueta de menú de Base UI fuera de un grupo tumba la pantalla recién al abrir ese menú.
- El rol `dueno`, el catálogo de permisos y la fila de `ajustes_empresa` viven en `seed.sql`: el
  primer `db push` a producción necesita `--include-seed`, o el primer usuario nace sin rol.
- Con Cache Components, leer sesión o base exige `await connection()` además de `<Suspense>`; una
  action que escribe cookies redibuja la página (así se aplica «ver como», sin nada a mano).
- Cambiar `supabase/config.toml` (plantillas, proveedores) pide `supabase stop` y `start`.
- Un commit que falla en el pre-commit no avisa si se filtra su salida: mirar `git log` después.

## Deuda aceptada

- Los e2e exigen la base local sin personas ajenas (frenan y piden `pnpm db:reset`) y usan el
  origen `oficina` de `seed.sql`: el CRUD de orígenes llega en la fase 2.
- Sin e2e de Google, recuperación, perfil, conflicto en la matriz ni «ver como»: se recorrieron a
  mano. El conflicto y la perspectiva sí tienen prueba de humo en SQL.
- Las RPC de leads, flujos y cotizaciones siguen hablando de vos: se reescriben con su fase.
- `equipo.usuarios.ver` y `equipo.roles.ver` no tienen enforcement en la base (los comprueba la
  página); tampoco `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push` ni
  `logistica.pagos.confirmar`.
- No se puede renombrar un rol ni reactivar a alguien dado de baja desde la interfaz.
- Tras dar de baja a alguien recién bloqueado, el toast «Deshacer» del bloqueo sigue a la vista;
  usarlo responde «ya no forma parte del equipo».
- Quitar o reemplazar la foto puede dejar un objeto huérfano hasta que exista `storage-gc`.
- Edge functions sólo declaradas en `supabase/functions/README.md`; RPC del cotizador de repuestos
  y vistas de embarques y agenda: llegan en sus fases. Permisos en el JWT: sólo si `mi_sesion()` pesa.
