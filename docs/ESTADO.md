# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-11
**Fase actual:** 1 — Equipo, empresa y shell, **abierta**. Hecha la parte 1 de 3 (acceso y shell).

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (164), `pnpm db:probar` (11 pruebas de humo),
  `bash scripts/mapa.sh --check`, `pnpm build` y `pnpm test:e2e` (8: 4 casos × escritorio y móvil).
- Acceso: registro (si está abierto o es la primera persona), ingreso con contraseña, cerrar sesión,
  recuperación por correo. `/auth/callback` canjea el código de Google y los enlaces de los correos.
- Google: **sin probar de punta a punta** (en local las credenciales son de relleno). Probados la
  salida hacia Google y todos los regresos por `/auth/callback` (cancelado, registro cerrado, error).
- `src/proxy.ts` refresca la sesión y decide el acceso: sin sesión → `/ingreso?returnTo=…`; con
  sesión, `/ingreso` y `/registro` devuelven al inicio. Una Server Action nunca se redirige.
- Casos no felices probados en vivo: contraseña mala (mismo mensaje exista o no el correo), cuenta
  bloqueada o dada de baja (mensaje y sesión cerrada, al ingresar y con la sesión abierta), registro
  cerrado (sin botón; forzado, error legible y ninguna cuenta creada), persona sin rol, falla y
  cancelación de Google, enlace vencido o reusado, sesión que vence con un formulario abierto
  (no se pierde lo tipeado), conflicto al editar el perfil.
- Shell `(app)`: barra lateral por permisos, barra superior (buscador deshabilitado, hueco para el
  tipo de cambio), menú del usuario, tema y densidad recordados por persona, Modo Live, View
  Transitions. Inicio = bandeja con 10 bloques por permiso, vacíos. Perfil propio.
- `src/shared/ui`: estados, esqueletos, `<Monto>`, `<Drawer>`, `<Modal>`, `<Bloque>`, `<Confirmar>`,
  toasts y registro de atajos (`Esc` funcionando; `N` y `Ctrl/Cmd+K` en el catálogo, sin destino).

## Siguiente: fase 1, partes 2 y 3

- **Parte 2 — equipo:** lista, roles y matriz de permisos, invitaciones, bloquear, dar de baja,
  «ver como». Lo anotado antes sigue en pie: no existe la RPC `equipo_invitar` (alta con
  `auth.admin.createUser` y `app_metadata.invitado = true`, rol con `rbac_asignar_rol` bajo la
  sesión de quien invita); `.claude/rules/datos.md` necesita la excepción escrita para ese uso del
  cliente admin; falta la vista previa de cuántos leads van al limbo; «ver como» pide su migración.
  El enlace de invitación tiene que ser `/auth/callback?token_hash=…&type=invite` (ya soportado).
- **Parte 3 — empresa:** formularios de ajustes, monedas, tipos de cambio (y llenar el hueco de la
  barra superior), integraciones, «Regenerar íconos». `getAjustes()` hoy es mínimo.
- Al crear una pantalla: prender su `disponible` en `_shell/navegacion.ts` (el test lo exige).

## Pendiente de decidir

- **Voz de los textos:** `ui.md` pide español neutro y lo nuevo quedó así («avisa», «pide»); los
  mensajes de la base y de `errores.ts` / `safe-action.ts` hablan de vos («No tenés permiso»).
- **Hooks de módulo para Client Components** (`usePerspectiva()`): el `index.ts` no se importa
  desde el navegador; segunda entrada (ajustando mapa y lint) o todo por props (docs/DECISIONES.md).
- **Google en local:** el proveedor está encendido con credenciales de relleno; el botón aparece y
  falla en la página de Google. Poner credenciales reales o apagarlo en `config.toml`.
- **En la nube (una persona):** proyecto y `supabase link`; plantillas de `supabase/templates/` en
  Auth › Emails; `Site URL` real y `…/auth/callback` en Redirect URLs; SMTP; credenciales de Google.
- Secretos de integraciones (Vault o variables de entorno): antes de la parte 3. Rama: sigue `master`.

## Descubierto sobre la marcha

- El rol `dueno`, el catálogo de permisos y la fila de `ajustes_empresa` viven en `seed.sql`: el
  primer `db push` a producción necesita `--include-seed`, o el primer usuario nace sin rol.
- Auth no reenvía el mensaje del trigger de registro cerrado: responde «Database error saving new
  user». Se traduce en `errorDeAuth()`.
- Con Cache Components, leer sesión o base exige `await connection()` además de `<Suspense>`; Next
  conserva el estado de una pantalla al volver a ella; una action que escribe cookies redibuja la
  página (el e2e lo encontró: «revisa tu correo» se convertía en «registro cerrado»).
- Cambiar `supabase/config.toml` (plantillas, redirect URLs) pide `supabase stop` y `start`.
- `lint-archivo.sh` corre ESLint también sobre archivos de fuera del repo, y ahí falla sin config.
- `next build` con `NEXT_DIST_DIR=.next-e2e` reescribía `tsconfig.json`; ahora esas rutas están declaradas.

## Deuda aceptada

- El e2e de acceso exige la base local sin personas (frena y pide `pnpm db:reset`).
- Sin e2e de Google, recuperación, bloqueo ni perfil: se recorrieron a mano contra el stack local.
- Quitar o reemplazar la foto borra el objeto anterior desde el navegador; si falla queda un
  huérfano hasta que exista `storage-gc`.
- Seis claves del catálogo siguen sin enforcement en la base (`equipo.usuarios.ver`,
  `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push`,
  `logistica.pagos.confirmar`).
- El guardián sólo impide que `dueno` pierda `equipo.roles.gestionar`, no todo `equipo.*`.
- Edge functions sólo declaradas en `supabase/functions/README.md`; RPC del cotizador de repuestos
  y vistas de embarques y agenda: llegan en sus fases. Permisos en el JWT: sólo si `mi_sesion()` pesa.
