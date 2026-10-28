# importadora

Sistema interno white-label para importadoras de vehículos: equipo y permisos, inventario por origen, cotizador, logística, repuestos,
chat, agenda y la web pública. Una empresa por despliegue. Sólo español, de tú.

## Al empezar

1. `docs/ESTADO.md` (en qué vamos) y `docs/MAPA.md` (generado: módulos, API, rutas, tablas). **El mapa antes que grep.**
2. La ficha `CLAUDE.md` de un módulo y `.claude/rules/*` se cargan solas al tocar sus archivos.
3. Con grep, bajo demanda: `docs/GLOSARIO.md`, `UX.md`, `COTIZADOR.md`, `PLAN.md`, `DECISIONES.md`, `RENDIMIENTO.md`, `ARQUITECTURA.md`,
   `PILOTO.md`. La historia completa está en `docs/archivo/` (sólo grep). Si costó encontrar algo, arregla el mapa o la ficha.

## Comandos

`pnpm dev` (:3000) · `test` · `lint` · `typecheck` · `test:e2e <spec>` · `test:e2e:completo` · `db:base` · `db:reset` · `db:types` ·
`db:probar` · `db:lint` · `db:carreras` · `db:medir:volumen` · `bash scripts/mapa.sh`. La base y el e2e van con candado (`scripts/candado.sh`).

## Arquitectura: monolito modular

- `src/modules/<dominio>/`: `entities/` (tipos, reglas puras, permisos, interfaces; cero I/O), `features/<caso>/` (`components`, `hooks`,
  `actions`, `schemas`), `infra/` (repositorios Supabase, adaptadores). `features` no importa `infra`: lo une `composicion.ts`.
- Entradas: `index.ts` (Server Components; sin componentes), `client.ts` (Client Components), `shell.ts`/`shell.client.ts` (sólo el
  layout `(app)`), `pantallas/<pantalla>.ts` (sólo `src/app`: lo que dibuja esa pantalla). Entre módulos sólo entradas; adentro, rutas
  relativas. `src/app` = rutas y composición; `src/shared` sólo importa `shared`. Lo vigilan `eslint-plugin-boundaries` y `mapa.sh --check`.
- `supabase/schemas/` (estructura) → `pnpm db:base` genera `migrations/20261011000000_esquema_base.sql` (no se edita); RLS, grants,
  triggers, RPC, `web`, storage y cron van en `supabase/migrations/` a mano.

## Reglas

- Código que se pide al usarse: `diferido()`, nunca `next/dynamic`. Un número que se muestra nunca es un total exacto. Toda lista para miles
  de filas, probada con volumen (`.claude/rules/escala.md`).
- Un archivo, una responsabilidad (> 300 líneas: se parte). Toda función exportada de `entities/` lleva test.
- Zod en todo límite (formulario, action, params, RPC); ids con `z.guid()`. Errores como valores (`{ ok: false, error }`).
- Ningún componente ni hook consulta Supabase: lecturas en `infra/`, mutaciones por Server Actions (`next-safe-action`), realtime en `*.client.ts`.
- Lo que otorga permisos (fase, dueño, vitrina, papelera, publicar fórmula) se escribe por RPC, nunca con `.update()`.
- Cambio de schema = `db:base`, `db:reset`, `db:types` y `db:probar` en el mismo commit.
- Unidad nueva = su `CLAUDE.md`. Término nuevo = entrada en `docs/GLOSARIO.md`, y ese nombre en tipos, tablas y UI; nunca un sinónimo.
- `docs/MAPA.md` lo genera `scripts/mapa.sh`. Fechas de DECISIONES y BITACORA: `TZ=America/La_Paz date +%F`.
- Orígenes, fases, tipos de documento, categorías y monedas salen de la base: ningún texto fijo los nombra.
- Nadie prueba a mano: toda verificación es un test o un recorrido de la IA.

## Stack: lo que muerde

- **Next 16:** `src/proxy.ts`; `params`, `searchParams`, `cookies()` y `headers()` son async; `pnpm lint` = eslint; `revalidateTag('x', 'max')`.
  `cacheComponents`: nada de `export const dynamic`, `useSearchParams()` dentro de `<Suspense>`, y leer sesión o base va tras `<Suspense>` con
  `await connection()`. Una pantalla conserva su estado al volver (`key` para reiniciar). `redirect()` tipado: `redirigir()`.
- **Supabase:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; en servidor `getClaims()`, nunca `getSession()`; cliente por request; cookies
  `getAll`/`setAll`. `db reset` sólo aplica `migrations/`. Local en 546xx (API 54621, base 54622, Studio 54623, correo 54624).
  `storage.objects`: sólo policies. RLS no esconde columnas (la app lee `leads_vista`). Conflictos: `PT409` con mensaje humano, nunca `40001`.
- **Tailwind 4** sin config (loader en `next.config.ts`); tokens en `design/tokens.css`; propios con `bg-(--color-surface)`; shadcn en `src/shared/ui`.
- **Zod 4** (`z.email()`, `{ error }`, `z.record(k, v)`), **TanStack Query 5.1xx** (`queryClient.query()`), **TypeScript 6** a propósito,
  `noUncheckedIndexedAccess`. Vitest no testea Server Components async (Playwright). Fechas cruzan como ISO y se muestran con `fechas.ts`.
- Uploads: fotos a WebP ≤ 1600 px, documentos sin comprimir, objetos por hash, borrar por refcount. PDF con `@react-pdf/renderer` (TTF).

## Commits

Conventional Commits: tipo en inglés, descripción en español, infinitivo y minúscula (`feat(leads): verificar el teléfono al tipear`).
Scopes: equipo, empresa, origenes, vehiculos, leads, cotizaciones, flujos, logistica, repuestos, agenda, chat, notificaciones, actividad,
web, buscador, tablero, datos, shared, app, db, ci, deps, config, docs. Un commit = un cambio: si el mensaje necesita «y», son dos.

## Terminado significa

`lint` y `typecheck` sin warnings · `test` (lo nuevo con test) y `db:probar` si tocaste `supabase/` · los estados de `docs/UX.md` y
`.claude/rules/ui.md` · capas respetadas · `docs/ESTADO.md` al día y `mapa.sh --check` · la decisión no obvia en `docs/DECISIONES.md` ·
commit convencional.

## Nunca

`--no-verify` · versiones nuevas sin verificarlas hoy · la secret key fuera del servidor o en `NEXT_PUBLIC_*` · desactivar una regla de lint ·
una tabla sin RLS, un `security definer` sin `set search_path = ''`, `auth.uid()` suelto (va `(select auth.uid())`) · `if (rol === 'dueno')`
en la UI (va `puede(permisos, clave, origen)`) · dinero sin `<Monto>` o fecha sin `formato.ts` · más de una fase de `docs/PLAN.md` sin parar.
