# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-11
**Fase actual:** 0 — Cimientos, cerrada. Sigue la 1 — Equipo, empresa y shell (ver `docs/PLAN.md`)

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (39 tests), `pnpm db:probar` (10 pruebas de humo),
  `bash scripts/mapa.sh --check` y `pnpm build` pasan. Los 5 jobs de lefthook pasan en el commit.
- Hooks de Claude Code probados uno por uno: PostToolUse devuelve la regla y la línea (`any`,
  promesa sin `await`, `auth.uid()` suelto, `security definer` sin `search_path`); PreToolUse
  bloquea `--no-verify`, push forzado, `db push`, `db reset --linked`, `rm -rf` fuera del proyecto,
  instalaciones globales y la secret key; Stop regenera el mapa y frena si algo falla.
- Lint y `mapa.sh` rechazan el import a las tripas de otro módulo y `features → infra`.
- Supabase local (`npx supabase start`, puertos 546xx) con las 10 migraciones y el seed; tipos
  generados. Probado contra Auth real: el primer registro nace con el rol `dueno`.
- `src/shared`: clientes de Supabase, `actionClient` (con `ctx.permisos`), permisos (68 claves, test
  contra el seed), errores como valores, formato y fechas. `src/proxy.ts` refresca la sesión.
- Tema con `design/tokens.css` en claro y oscuro, manifest e íconos, service worker mínimo.

## Siguiente: fase 1 — equipo, empresa y shell (sesión nueva)

- La perspectiva «ver como» **entra** en la fase 1: migración con los permisos efectivos (míos ∩ rol
  elegido), `usePerspectiva()` y selector en el menú del usuario. RLS sigue usando el rol real.
- Invitaciones: no existe la RPC `equipo_invitar`. Alta con `auth.admin.createUser` y
  `app_metadata.invitado = true`; rol con `rbac_asignar_rol` bajo la sesión de quien invita (así
  vale la dominancia); enlace para fijar contraseña, copiable o por correo.
- `.claude/rules/datos.md` limita el cliente admin a portal, webhooks y crons: la invitación por
  API admin que pide el plan necesita esa excepción escrita en la regla.
- Las actions de `features/` no importan `infra/`: un archivo de composición en la raíz del módulo
  entrega las implementaciones.
- Falta una vista previa de cuántos leads van al limbo: `equipo_dar_de_baja` lo devuelve después.
- `src/proxy.ts` todavía no redirige al ingreso; entra con esa pantalla.
- `e2e/` está vacío: `pnpm test:e2e` falla por «sin tests» hasta que exista el primero.

## Pendiente de decidir

- Proyecto Supabase Pro nuevo: crearlo y `npx supabase link --project-ref …` (lo hace una persona).
- Google OAuth: credenciales en Auth › Providers. En local hay valores de relleno en `.env.local`
  para que el stack arranque; el botón no funciona hasta poner las reales.
- Secretos de integraciones: la ficha de `empresa` dice Vault por RPC, `docs/DECISIONES.md` dice
  variables de entorno. Elegir una antes de construir integraciones.
- Correo de auth en producción: hace falta SMTP propio (el de Supabase está limitado).
- Rama: el repo local nació en `master` y el CI apuntaba sólo a `main`; hoy escucha las dos.
- Logo e identidad del primer despliegue: se cargan desde Configuración › Empresa.

## Descubierto sobre la marcha

- `supabase start` / `db reset` sólo aplican `migrations/`: las tablas de `schemas/` llegan por la
  migración base generada (`pnpm db:base`). Ver `docs/DECISIONES.md`.
- El rol `dueno`, el catálogo de permisos y la fila de `ajustes_empresa` viven en `seed.sql`: el
  primer `db push` a producción necesita `--include-seed`, o el primer usuario nace sin rol.
- Un hook que sale con código 2 sólo le devuelve a Claude lo que escribe en **stderr**:
  `lint-archivo.sh` mandaba el detalle por JSON en stdout y Claude veía «ESLint falló» sin saber
  qué. Corregido, y con `--no-warn-ignored` (igual que el job de lint de lefthook).
- El CI traía los puertos por defecto (5432x) y no verificaba la migración base. Corregido.
- `z.uuid()` de Zod 4 rechaza uuids que Postgres acepta: para ids de la base va `z.guid()`.
- `storage.objects` no admite `alter table` desde una migración (PGlite no lo detecta).
- `max-params` de ESLint 10 toma `countThis: "never"`, no un booleano: la config no cargaba.
- Una policy SELECT basada en `puede_x(id)` (función STABLE) no ve la fila recién insertada en
  `INSERT … RETURNING`: las policies de `vehiculos`, `leads` y `cotizaciones` van inline.
- `alcance_permiso` como nombre de función chocaba con el enum: la función se llama `alcance_de()`.

## Deuda aceptada

- Seis claves del catálogo no tienen enforcement en la base (`equipo.usuarios.ver`,
  `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push`,
  `logistica.pagos.confirmar`, cuya RPC `pago_confirmar` no existe).
- El guardián sólo impide que `dueno` pierda `equipo.roles.gestionar`, no todo `equipo.*`.
- Edge functions (`storage-gc`, `push`, `apibara`, `importar-csv`) sólo declaradas en
  `supabase/functions/README.md`; se construyen en sus fases.
- RPC del cotizador de repuestos y vistas `embarques` / agenda unificada: llegan en las fases 6–8.
- Hook de access token con permisos en el JWT: sólo si `mis_permisos()` se vuelve caro (medir).
