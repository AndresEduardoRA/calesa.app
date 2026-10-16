# importadora

Sistema interno white-label para importadoras de vehículos: equipo con permisos, inventario por
origen configurable, cotizador configurable por origen, flujos de logística por origen, repuestos,
chat, agenda y el contenido de la web pública. Una empresa por despliegue. Sólo español.

## Orientarte antes de tocar nada

1. `docs/ESTADO.md` — en qué vamos. Al empezar cualquier sesión.
2. `docs/MAPA.md` — índice generado de módulos, API pública, dependencias, rutas y tablas.
   **Léelo antes de buscar con grep**: casi siempre te dice el archivo exacto.
3. El `CLAUDE.md` de cada módulo se carga solo cuando tocas sus archivos. Es su ficha.
4. Bajo demanda: `docs/GLOSARIO.md` (términos del negocio ↔ nombres en el código),
   `docs/UX.md` (roles, tareas de oro y estados de cada pantalla), `docs/ARQUITECTURA.md`,
   `docs/COTIZADOR.md` (el grafo de la fórmula), `docs/DECISIONES.md`, `docs/PLAN.md`,
   `docs/RENDIMIENTO.md` (cada lista que crece: su tope, su índice y su presupuesto).

Si tuviste que explorar mucho para encontrar algo, el mapa o una ficha están incompletos:
arréglalos en la misma tarea.

## Comandos

```bash
pnpm install             # instalar
pnpm dev                 # desarrollo (http://localhost:3000)
pnpm test                # tests unitarios (vitest)
pnpm test:e2e            # Playwright contra la app compilada y Supabase local
pnpm lint                # eslint --max-warnings 0
pnpm typecheck           # next typegen + tsc --noEmit (los tipos de rutas salen de .next/types)
pnpm db:base             # regenera la migración base a partir de supabase/schemas
pnpm db:reset            # supabase db reset: migraciones (la base incluida) + seed en local
pnpm db:types            # regenera src/shared/types/database.types.ts desde la base local
pnpm db:probar           # aplica schema+migraciones+seed en Postgres embebido y corre supabase/tests/humo.sql
```

## Arquitectura

Nivel 2, monolito modular: `src/modules/<dominio>/` con sus propias capas adentro.

| Desde (dentro de un módulo) | Puede importar                                                               |
| --------------------------- | ---------------------------------------------------------------------------- |
| `features/`                 | `entities/` del mismo módulo, `@/shared`, las entradas de `@/modules/<otro>` |
| `entities/`                 | `@/shared`                                                                   |
| `infra/`                    | `entities/` del mismo módulo, `@/shared`                                     |
| `src/app/`                  | las entradas de `@/modules/<x>`, `@/shared`                                  |
| `src/shared/`               | `src/shared/`                                                                |

Las entradas de un módulo son dos: `@/modules/<x>` (su `index.ts`, sólo desde Server Components) y
`@/modules/<x>/client` (su `client.ts`, desde Client Components: hooks y componentes de cliente).

`features` **no** importa `infra`: los casos de uso dependen de la interfaz que declara `entities`
y la composición del módulo (`composicion.ts`) le da la implementación. Entre módulos sólo las dos
entradas; dentro del módulo, rutas relativas. Lo verifican `eslint-plugin-boundaries` y `scripts/mapa.sh --check`.

Dónde va cada cosa:

- `src/app/` — rutas, layouts, `manifest.ts`, route handlers. Composition root.
- `src/proxy.ts` — refresco de sesión en cada request. Va al nivel de `app/`, no adentro.
- `src/modules/<dominio>/features/<caso>/` — `components/`, `hooks/`, `actions/`, `schemas/`.
- `src/modules/<dominio>/entities/` — tipos, reglas puras, permisos y transiciones, interfaces de repositorio. Cero I/O.
- `src/modules/<dominio>/infra/` — repositorios Supabase, adaptadores externos (apibara, push, PDF).
- `src/modules/<dominio>/index.ts` — la API pública del módulo para el servidor.
- `src/modules/<dominio>/client.ts` — la API pública para Client Components (si el módulo la necesita).
- `src/shared/ui/` — shadcn y componentes transversales (XCell, FilterShell, Drawer, Monto, estados, esqueletos).
- `src/shared/lib/` — `supabase/` (clientes server/browser/admin), `formato.ts`, `fechas.ts`, `permisos.ts`.
- `src/shared/types/database.types.ts` — generado por `pnpm db:types`. No se edita.
- `supabase/schemas/<dominio>/` — estado declarativo; `supabase/migrations/` — RLS, grants, triggers, RPC, `web`, storage, cron, escritas a mano,
  más `20261011000000_esquema_base.sql`, que es la copia **generada** de `schemas/` (`pnpm db:base`): no se edita.

## Reglas del proyecto

- Un archivo, una responsabilidad. Si pasa de 300 líneas, se parte por responsabilidad, no por tamaño.
- Nada de I/O en `entities/`. Ahí viven tipos, reglas puras (permisos, transiciones, cálculo de la
  fórmula) e interfaces. Toda función exportada de `entities/` lleva test.
- Todo dato que cruza un límite (formulario, action, params, respuesta de RPC) se valida con Zod.
- Los errores se modelan como valores (`{ ok: false, error }`), no como excepciones entre capas.
- Ningún componente ni hook consulta Supabase: lecturas en `infra/` vía `queries`, mutaciones vía
  Server Actions con `next-safe-action`, realtime vía `*.client.ts`.
- Lo que otorga permisos (fase, dueño del lead, vitrina, papelera, publicar fórmula) **se escribe
  por RPC**, nunca con `.update()` directo. La lista está en `docs/MAPA.md` › Tablas y en `supabase/migrations`.
- Un cambio de schema = `pnpm db:base`, `pnpm db:reset`, `pnpm db:types` y `pnpm db:probar` en el mismo commit.
- Unidad nueva = su `CLAUDE.md`. Término nuevo = fila en `docs/GLOSARIO.md`, y se usa ese nombre
  en tipos, tablas y UI. Nunca un sinónimo.
- `docs/MAPA.md` no se edita a mano: `bash scripts/mapa.sh` lo regenera (el hook Stop lo corre).
- Los nombres de orígenes, fases, tipos de documento, categorías y monedas salen de la base: ningún
  texto fijo de la UI los nombra.
- Toda lista se diseña para miles de filas y se prueba con volumen: `.claude/rules/escala.md`.
- Nadie prueba a mano: toda verificación es un test o un recorrido de la IA.

## Gotchas de este stack

- **Next 16**: `middleware.ts` es `proxy.ts` y vive en `src/proxy.ts` (al nivel de `app/`); `params`, `searchParams`, `cookies()` y `headers()`
  son async; `next lint` no existe (`pnpm lint` = eslint); `revalidateTag('x', 'max')` exige
  perfil; `cacheComponents: true` → nada de `export const dynamic`, y `useSearchParams()` va
  dentro de `<Suspense>`.
- **Cache Components en la práctica**: leer la sesión o la base es de cada request → va detrás de
  `<Suspense>` y empieza con `await connection()` (si no, Next lo intenta al preparar la ruta por
  adelantado). Next conserva el estado de una pantalla al salir y volver (un formulario reaparece
  con su último resultado: `key` para reiniciarlo). Una action que escribe cookies vuelve a dibujar
  la página. `redirect()` está tipado: destinos calculados con `redirigir()`. El `index.ts` de un
  módulo sólo se importa desde Server Components; un Client Component importa `client.ts`.
- **Supabase**: la clave pública es `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`);
  en servidor `getClaims()`, nunca `getSession()`; cliente de servidor por request, jamás global;
  cookies con `getAll`/`setAll`. El schema `web` se expone en PostgREST (`config.toml`).
  `supabase start` y `db reset` sólo aplican `migrations/`, nunca `schemas/`: por eso existe la
  migración base. Stack local en los puertos 546xx (API 54621, base 54622, Studio 54623, correo 54624).
  `storage.objects` no es nuestra: se le crean policies, nunca `alter table`.
- **RLS no esconde columnas**: `leads.telefono_principal` no es legible; la app lee `leads_vista`.
  Un `INSERT … RETURNING` falla si la policy SELECT no cubre la fila nueva.
- **Conflictos**: las RPC levantan `PT409` (HTTP 409) con el mensaje humano; el cliente lo muestra
  con «Recargar». Nunca `40001` (PostgREST reintenta 60 s).
- **Tailwind 4**: sin `tailwind.config.js` ni PostCSS: lo procesa el loader `@tailwindcss/turbopack`
  declarado en `next.config.ts`. `src/app/globals.css` importa `design/tokens.css` (la fuente) y
  puentea las variables de shadcn (`--primary`, `--border`…) a los tokens. En componentes propios,
  `bg-(--color-surface)` / `text-(--color-ink)`. shadcn vive en `src/shared/ui` (`components.json`).
- **eslint-plugin-boundaries 7**: elementos = carpetas (`src/modules/*/features`, sin `**/*` ni
  `mode`), reglas en `policies`, mismo módulo = `captured: { modulo: "{{ from.element.captured.modulo }}" }`.
  La sintaxis vieja (`rules`, `${from.modulo}`) anda pero avisa que muere en la v8.
- **Zod 4**: `z.email()`, errores en `{ error }`, `z.record(k, v)` con dos argumentos; locale `es`.
  Para ids de la base, `z.guid()`: `z.uuid()` exige versión y variante RFC y rechaza uuids válidos en Postgres.
- **TanStack Query 5.1xx**: `queryClient.query()` reemplaza a `fetchQuery`/`prefetchQuery`;
  `environmentManager.isServer()` en vez de `isServer`. No se usa Query para Server Actions.
- **TypeScript 6** a propósito (TS 7 rompe el typed linting). `exactOptionalPropertyTypes` no está
  activo; `noUncheckedIndexedAccess` sí.
- **Vitest no testea Server Components async**: esos van a Playwright. Unit = junto al archivo.
- **Fechas**: cruzan servidor→cliente como string ISO; se muestran en la zona de la empresa con
  `src/shared/lib/fechas.ts`. Nunca `Date` en props de Server → Client.
- **Uploads** desde el browser (bodySizeLimit 2 MB): fotos comprimidas a WebP ≤ 1600 px antes de
  subir; documentos nunca se comprimen; objetos nombrados por hash; borrar pasa por refcount.
- **PDF** de cotizaciones con `@react-pdf/renderer` en un route handler, sólo fuentes TTF.

## Commits

Conventional Commits, tipo en inglés, descripción en español, en infinitivo y minúscula.

```
feat(leads): verificar el teléfono mientras se tipea
fix(flujos): mostrar el motivo cuando la fase destino está jubilada
refactor(cotizaciones): extraer el evaluador del grafo a entities
```

Scopes válidos: equipo, empresa, origenes, vehiculos, leads, cotizaciones, flujos, logistica,
repuestos, agenda, chat, notificaciones, actividad, web, buscador, tablero, datos, shared, app, db,
ci, deps, config, docs. Un commit = un cambio coherente. Si el mensaje necesita "y", son dos commits.

## Terminado significa

1. `pnpm lint` y `pnpm typecheck` pasan sin warnings.
2. `pnpm test` pasa, y lo nuevo tiene test; si tocaste `supabase/`, `pnpm db:probar` pasa.
3. La pantalla resuelve los estados que exige `docs/UX.md` y `.claude/rules/ui.md`.
4. El cambio respeta las dependencias entre capas y módulos.
5. `docs/ESTADO.md` refleja lo que acabas de hacer, y `bash scripts/mapa.sh --check` pasa.
6. Si tomaste una decisión no obvia, está en `docs/DECISIONES.md` con su razón.
7. El commit está hecho con mensaje convencional bien formado.

## Nunca

- `git commit --no-verify`. Si un hook falla, el problema es el código, no el hook.
- Fijar versiones nuevas de dependencias sin verificarlas hoy.
- La secret key de Supabase fuera del servidor, ni en una variable `NEXT_PUBLIC_*`.
- Desactivar una regla de lint para hacer pasar un archivo.
- Crear una tabla sin RLS, una función `security definer` sin `set search_path = ''`, o una
  policy con `auth.uid()` suelto (va `(select auth.uid())`).
- Un `if (rol === 'dueno')` en la UI: las acciones salen de `puede(permisos, clave, origen)`.
- Un número de dinero impreso sin `<Monto>` (Modo Live) ni fecha sin `formato.ts`.
- Implementar más de una fase de `docs/PLAN.md` sin parar a reportar.
