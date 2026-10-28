# Preparación para Orca

> Rama `preparar-orca`. Una sesión nueva retoma leyendo **sólo este archivo y `docs/ESTADO.md`**. El plan aprobado (2026-10-28) está resumido
> abajo; el original, en `~/.claude/plans/pasted-content-id-0629-vas-a-streamed-wilkes.md`. No se hace merge a `main`: lo revisa la persona.

**Orden:** 0 → 3 (docs) → 1 (aplastar) → 2 (entornos) → 4 (sobrantes) → 5 (worktrees) → 6 (carriles) → 7 (cierre).
**Al cerrar cada etapa:** `pnpm lint`, `typecheck`, `test` y, si tocó `supabase/`, `db:probar` y `db:lint`. Rojo = no se sigue.
**Uso:** se anota por etapa (tokens de la sesión y de los subagentes, `uso.py` del scratchpad). Si una etapa pasa de una sesión de 5 h, se para y se reporta.

## Decidido con la persona

- **Remoto:** la sesión sólo **lee** el proyecto remoto (`db dump`, `migration list`, `db diff`, `inspect` con `--linked`: excepción en
  `bloquear-peligrosos.sh`). Lo que **cambia** la demo pasa por `scripts/demo/*.sh`, que leen los secretos de `.env.demo` (lo escribe la persona;
  `Read(.env.demo)` está negado). La sesión los corre avisando antes de cada reset. `db push`, `link`, `secrets` sueltos, `config push` suelto y
  la CLI de Vercel siguen bloqueados.
- **Docs:** también las fichas `CLAUDE.md` de los módulos (copia tal cual a `docs/archivo/modulos/`, ficha viva ≤ 8 KB).
- **Docker:** `docker image prune -a` (las imágenes sin contenedor).
- **Vercel:** el proyecto está en otra cuenta; la persona da acceso (pendiente de la etapa 2).
- **Aplastado con salida:** si el diff A/B (ACL incluidos) no queda en cero tras dos intentos, se queda con las 146 migraciones congeladas por
  sha256 y se sigue.
- **Correo mínimo:** contrato `enviarEmail()`, adaptador `mailpit`, regla de ESLint, SMTP con `env()` y la sección «Cambiar de Resend a
  Cloudflare». `resend` y `cloudflare`: abierto de la Fase 7.
- **`env:check` sólo local** (`.env.local` y `.env.demo`). Leer Vercel y Supabase por API: abierto.
- **Carriles:** el piloto sólo para A, publicando por rama y PR. B: sesiones de Orca con las mismas skills y reglas, anota en
  su archivo de carril en `docs/carriles/` (lo crea la etapa 6). La guarda que frena a B (ESTADO, PLAN, DECISIONES, migraciones compartidas) es de CI sobre el diff del PR.
- **Dependencias:** salen `@tanstack/react-query` y `sanitize-html` (+ `@types`); se quedan `@react-pdf/renderer` y `web-push`.
- **Jobs:** además de `db:probar`, una prueba local de que un job con `url_proyecto` llega a `storage-gc` y vuelve con 200.
- **ENTORNOS.md:** el comodín de previews, marcado «solo demo; se quita en la instalación de un cliente».

## Etapas

| Etapa                           | Estado                                                         | Uso (salida · caché leída)                                          |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Plan (exploración y preguntas)  | hecho                                                          | principal 89 K · 9,6 M; subagentes (Opus) 180 K · 33,3 M; 1,5 h     |
| 0 — Backup y disco              | hecho (2026-10-28)                                             | principal 20 K · 12,3 M; 0,24 h                                     |
| 3 — Docs livianos               | hecho (2026-10-28)                                             | principal 93 K · 31,6 M; subagentes (Sonnet) 960 K · 48,5 M; 0,72 h |
| 1 — Aplastar y resetear la demo | hecho (2026-10-28)                                             | principal 140 K · 92,3 M; subagentes (Sonnet) 25 K · 4,8 M; 1,41 h  |
| 2 — Entornos y configuración    | hecha en local (2026-10-28); espera `.env.demo` y Vercel       | principal 96 K · 87,4 M; subagentes (Opus) 102 K · 21,4 M; 0,75 h   |
| 4 — Quitar lo que sobra         | hecho lo aprobado (2026-10-28); el resto espera tu visto bueno | principal 12 K · 11,3 M; 0,1 h (más knip en la etapa 2)             |
| 5 — Worktrees en paralelo       | hecho (2026-10-28)                                             | principal 72 K · 23,2 M; 0,55 h                                     |
| 6 — Flujo de dos carriles       | pendiente                                                      | —                                                                   |
| 7 — Cierre                      | pendiente                                                      | —                                                                   |

## Etapa 0 — Backup y disco

- [x] Rama `preparar-orca` (desde `main` = `origin/main`, `e972cfe`).
- [x] Hook: excepción de lectura remota y `config push` bloqueado (casos en `bloquear-peligrosos.casos.ts`); `Read(.env.demo)` negado;
      `respaldos/` ignorado.
- [x] Backup de la demo en `respaldos/2026-10-28/` (permisos 600): `esquema.sql` 1,45 MB, `datos.sql` 428 KB (el seed, 4 usuarios,
      467 filas de `actividad`) y `migraciones-remotas.txt`: las **146 migraciones aplicadas y alineadas** con las locales.
- [x] Disco: de 96 % (11,35 GB libres) a **91 % (23,47 GB libres): 12,1 GB liberados**. Builds y salidas de pruebas 5,64 GB (`.next`
      4,86 GB), `pnpm store prune` 1,02 GB, `docker image prune -a` 5,46 GB. El `next-server` vivo era Supabase Studio (root, Docker).
- [x] Arreglo de paso: `arrancar.test.ts` «sin el binario de claude» fallaba en esta máquina desde que `claude` está en `~/.local/bin`
      (2026-10-27); ahora usa un PATH propio.
- Verde: lint, typecheck, test (5.318).

## Etapa 3 — Docs livianos (hecha)

- `docs/archivo/` (con `LEEME.md`): copia tal cual de BITACORA, DECISIONES, PLAN, RENDIMIENTO, GLOSARIO, COTIZADOR, UX, ESTADO, el
  CLAUDE.md raíz, cada ficha de módulo (`modulos/`) y cada regla (`reglas/`). Fuera de prettier; `Read(docs/archivo/**)` negado.
- Destilado por 14 subagentes Sonnet, revisado: DECISIONES deja las 258 vigentes o parciales de 267 (9 sólo en el archivo, con el mismo
  título); PLAN, del 4.13-4 al 4.28 como lista, 42 abiertos vivos y las Fases 5 a 9; GLOSARIO con los 311 términos.
- Guardas: `fechas-de-entradas` acepta `## AAAA-MM-DD — ` y revisa también el archivo; se retira `indice-de-decisiones`; nuevo
  `scripts/enlaces-internos.mjs` en `mapa.sh --check` (una sección citada tiene que ser título del doc vivo o de su copia). Arregló 3 anclas
  rotas en comentarios de migraciones y de la semilla. Las skills del piloto apuntan a los docs vivos (ESTADO: 60 líneas, `wc -l`).
- La bitácora viva empieza con el 4.13-3c y su `e2e completo: sí`: la cuenta del piloto sigue en 0 de 3.
- Verde: lint, typecheck, test (5.314), `db:probar`, `db:lint`, `mapa.sh --check`.

| Archivo                        | Antes (KB) |                     Después (KB) |
| ------------------------------ | ---------: | -------------------------------: |
| `CLAUDE.md`                    |       13,3 |                              5,8 |
| `docs/ESTADO.md`               |       12,1 |                  5,6 (60 líneas) |
| `docs/BITACORA.md`             |      696,5 |                              0,8 |
| `docs/DECISIONES.md`           |      825,9 |                             96,4 |
| `docs/PLAN.md`                 |      344,3 |                             54,4 |
| `docs/RENDIMIENTO.md`          |      303,6 |                             25,0 |
| `docs/GLOSARIO.md`             |      216,7 |                             44,8 |
| `docs/COTIZADOR.md`            |      162,5 |                             39,8 |
| `docs/UX.md`                   |      133,6 |                             40,0 |
| `.claude/rules/escala.md`      |       33,8 |                              6,8 |
| `.claude/rules/ui.md`          |       12,1 |                              4,9 |
| `.claude/rules/e2e.md`         |       11,3 |                              5,5 |
| `.claude/rules/datos.md`       |        6,8 |                              3,5 |
| `.claude/rules/migraciones.md` |        8,7 | 8,7 (se reescribe en la etapa 1) |
| ficha `leads`                  |      140,8 |                              8,0 |
| ficha `vehiculos`              |       49,4 |                              8,0 |
| ficha `shared`                 |       44,0 |                              7,8 |
| ficha `cotizaciones`           |       35,5 |                              8,0 |
| ficha `equipo`                 |       21,1 |                              8,0 |
| ficha `origenes`               |       13,5 |                              8,0 |
| ficha `empresa`                |       12,1 |                              7,9 |

**Lo que carga una sesión:** siempre CLAUDE 5,8 + ESTADO 5,6 + MAPA 25,0 = 36,4 KB. Tocar un componente de un módulo suma escala, ui,
modulos y la ficha: **≈ 58,8 KB**. El peor caso (componente + infra + e2e del mismo módulo) llega a 67,8 KB: MAPA es lo más pesado, y su
sección «Tablas» (8 KB, una línea por tabla con su archivo de `schemas/`) se compacta en la etapa 1, al retirar `schemas/`.

## Etapa 1 — Aplastar y resetear la demo (hecha)

- **Inventario de lo que el volcado no conserva** (en las 146 viejas; están en git, en el padre de `dba2118`):
  - datos de catálogo sólo en migraciones: 9 buckets (`…000800`), 6 campos de fábrica de `leads_campos` (`…20261014000800`, con 6
    filas de `actividad` de efecto lateral), `tipos_lead` (`…002800`, icono por `…004000`), 3 `tonos` (`…005700`), niveles `todos` y
    `costos` con 2 permisos (`…006100`), 4 permisos repetidos del seed (`…20261015000400`, `…20261016000400`, `…000900`, `…003800`);
  - Vault: `cotizacion:abierta` (`…009000`); cron: 6 jobs (`…001000`, `…20261014000400`, `…000500`, `…20261017000100`,
    `…20261019000500`, `…001500`, `…001700`; los 5 de `…20261011000800` nunca corrían);
  - en esquemas de Supabase: 3 triggers de `auth.users` (`…20261011000100`) y 18 policies de `storage.objects` (`…000800`, `…20261013000500`);
  - sin publicaciones de Realtime, sin `alter default privileges`, sin configuración de base; extensiones `pg_cron`/`pg_net` condicionales.
- **La base** `20261028180656_base.sql`: privilegios por defecto apagados → `supabase db dump --local` → triggers y policies ajenos →
  datos (buckets, catálogo con `session_replication_role = replica`, la clave de Vault, los jobs). **Diff cero al primer intento**, con
  seed y sin seed: `pg_dump --schema-only` de toda la base (26.801 líneas), ACL por rol (relaciones, columnas, funciones, esquemas, por
  defecto), datos normalizados, cron, buckets, Vault, policies, triggers ajenos, extensiones y secuencias. Control negativo: con seed contra
  sin seed da 1.110 líneas distintas. **Mutación:** sin la sección de privilegios, `anon` lee `leads` y `authenticated` lee
  `telefono_principal` y `cotizaciones.valores`.
- **Hallazgos:** las vistas de la app tenían escritura para `authenticated` y lectura para `anon` por los privilegios por defecto (no llegaba
  a ninguna fila: son `security_invoker`); lo arregla `20261028181638_vistas_de_la_app_solo_se_leen.sql`. Queda **4-40** (tu decisión):
  `anon` tiene uso de 15 secuencias y `EXECUTE` en 32 funciones de `public` por esos mismos privilegios.
- **Una sola fuente:** se retiraron `supabase/schemas/`, `db:base` y `esquema-base.mjs`; `probar-schema` aplica migraciones y seed;
  `rls-en-todo.sql`; la guarda del orden fija el sha256 de la base y exige fecha real; `scripts/lib/definicion-sql.ts` para las 13 pruebas
  que leían archivos; el disparador 6 del Nivel 2 es «la estructura»; MAPA saca las tablas de las migraciones (19 KB).
- **Jobs solos:** `20261028183622_jobs_con_la_url_del_proyecto.sql` (Vault `url_proyecto`); `jobs.sql` en `db:probar` y
  `supabase/tests/jobs-de-verdad.sh` contra la base local: el job llegó a `storage-gc`, 200, pase canjeado.
- **Demo reseteada** con `scripts/demo/resetear.sh` (respaldo en `respaldos/2026-10-28_151236/`): `migration list` alineado (3), `db diff
--linked` vacío, los 8 jobs en `cron.job`, colación igual a la local (ICU `en-US`), seed aplicado (74 permisos, 4 roles).
- Verde: lint, typecheck, test (5.318), `db:probar` (417), `db:lint`, `db:carreras`, splinter sin errores, `db:types` (3 funciones nuevas).
- **Ventana abierta:** la demo quedó **sin usuarios**; la primera cuenta que se registre queda dueña. Se cierra en la etapa 2 con
  `restaurar.sh`, que necesita tu `.env.demo`.

## Etapa 2 — Entornos y configuración (hecha en local; lo remoto espera a la persona)

- `docs/ENTORNOS.md`: la tabla de cada variable y ajuste (para qué, dónde vive, si es secreta, quién la pone), la plantilla de `.env.demo`,
  Auth en la nube (con el paso a paso del panel), el registro, Vercel, el correo y «Cambiar de Resend a Cloudflare».
- **Validación:** `src/shared/config/esquemas.ts` (Zod, puro); el build cae sin las públicas, el arranque sin las del servidor
  (`src/instrumentation.ts`); `pnpm env:check` revisa `.env.local` y `.env.demo` sin mostrar valores.
- **Auth en la nube:** `[remotes.demo]` en `config.toml` (Site URL, redirecciones con el comodín de previews «sólo demo», `otp_expiry`
  86400, SMTP con `env()`; el puerto fijo en 465 porque la CLI no lee `env()` en un número, verificado) y las 6 plantillas en español. La
  CLI acepta `env()` sin definir dentro de `[remotes]` (verificado en local). Lo sube `restaurar.sh` (el push de configuración de la CLI)
  si hay SMTP.
- **Registro:** ya se cerraba en la base; nuevas pruebas (`registro.sql`: Google sin marca cae, abierto no crea otro dueño, cambiar una
  cuenta existente no pasa por el candado) y un e2e del `signUp` directo a la API.
- **Vercel:** sin acceso todavía (el proyecto está en otra cuenta). `.github/workflows/demo.yml` migra la demo al integrar en `main`.
- **`scripts/demo/restaurar.sh [--local]`** y `sembrar.mjs` (subagente): el dueño y un usuario por rol (`<rol>@demo.invalid`) por la API de
  admin, registro cerrado, clave de apibara opcional, 30 leads, 10 vehículos y 5 cotizaciones por las RPC (totales del motor), sin datos
  reales; idempotente. **Probado de punta a punta en local.** Contra la demo, espera tu `.env.demo`.
- **Correo:** `enviarEmail()` + adaptador `mailpit` (probado contra el Mailpit real), regla de ESLint contra los SDK de proveedores;
  `resend`, `cloudflare` y `pnpm email:probar` son el abierto **7-1**.
- **Verificado en la doc vigente:** Resend SMTP (`smtp.resend.com`, 465 implícito, usuario `resend`); Cloudflare SMTP
  (`smtp.mx.cloudflare.net`, sólo 465, usuario `api_token`, token con «Email Sending: Edit») y que su dominio tiene que ser una zona de tu
  cuenta (por eso la recomendación del DNS en Cloudflare).
- Verde: lint, typecheck, test (5.363), `db:probar` (421), `db:lint`, `mapa.sh --check`.

## Etapa 4 — Quitar lo que sobra

- **Hecho (aprobado):** fuera `@tanstack/react-query`, `sanitize-html` y `@types/sanitize-html` (ningún import; knip y grep). Verde:
  lint, typecheck, test (5.363).
- **Propuesto, espera tu aprobación** (salida de `pnpm dlx knip@5`, revisada a mano):
  1. `src/shared/ui/select.tsx`, `separator.tsx` y `tooltip.tsx`: componentes de shadcn que nadie importa (se vuelven a traer con
     `shadcn add`).
  2. `setup.sh` y `scripts/configurar-package.mjs`: el andamiaje de una sola vez; nadie los llama.
  3. `supabase/tests/medir-importacion-etapas.sql`: un diagnóstico manual que ningún script corre.
  4. `shadcn` de `dependencies` a `devDependencies`: sólo lo importa el CSS al compilar.
- **Se queda, con su motivo:** los corpus JSON de `supabase/tests/` (los usan vitest, `db:probar` y `db:medir`); `src/shared/lib/utils.ts`
  (el alias de `shadcn add`); los `index.ts`/`client.ts` de módulos vacíos (la API de cada módulo); los scripts que knip da por sin uso
  (los llama `package.json` a través del candado); `supabase/functions/*` y `public/sw.js` (entradas); `@react-pdf/renderer` y `web-push`
  (4.18 y Fase 7); `pg`, `@tailwindcss/turbopack` y `typescript-eslint` (carreras, `next.config.ts`, `eslint.config.mjs`); los dos
  workflows y la acción `preparar`; `.piloto/informes/` (las salidas y planes viejos ya se borraron en la etapa 0).
- **Sin tocar:** knip cuenta 113 exports y 184 tipos sin uso; casi todos son API de un módulo o se usan sólo en sus pruebas, y sin un
  `knip.json` con las entradas del repo no se distinguen. Sugerencia: configurarlo en la Fase 9 (no lo hago sin tu visto bueno).

## Etapa 5 — Worktrees en paralelo (hecha)

- **La CLI acepta overrides por entorno** (verificado): `SUPABASE_PROJECT_ID` cambia los contenedores; `SUPABASE_API_PORT`, `_DB_PORT`,
  `_STUDIO_PORT`, `_LOCAL_SMTP_PORT` y `SUPABASE_AUTH_SITE_URL` (`GOTRUE_SITE_URL` del contenedor) cambian lo suyo. Así un carril no toca
  `config.toml`: `scripts/worktree/preparar.sh` escribe `.env.carril` (ignorado) con el project_id `importadora-<carril>` y los puertos con
  desfase (a: 547xx, app 3100, e2e 3310; b: 548xx, 3200, 3410).
- **Un solo ayudante por lenguaje:** `scripts/lib/stack-local.mjs` (JS: e2e de SQL y de volumen, carreras, medir, sembrar volumen, jobs de
  verdad, resetear) y `scripts/lib/carril.sh` (bash: lo cargan `candado.sh`, `hechos.sh`, `restaurar.sh --local`). El candado es uno por
  puerto de la base (`candado-base-<puerto>.lock`) y exporta el carril al comando: `pnpm db:*` y `test:e2e` usan el stack de su worktree.
- `pnpm dev` y `pnpm funciones` pasan por `scripts/worktree/con-carril.sh` (sólo `next dev` y `supabase functions serve|start|stop|status`).
  Los avisos y reglas dicen `pnpm funciones`. `quitar.sh` baja el stack sin volúmenes.
- **Orca** (doc vigente): `orca.yaml` › `worktree.sharedDirectories` enlaza `docs/referencias/cotizador-actual` (ignorada, de lectura);
  `.worktreeinclude` copia `.env.local` y `.env.demo`. Orca no da variables por worktree: por eso `.env.carril`.
- **Prueba real** (dos worktrees de `af80fa22`, ramas `a/…` y `b/…`): `preparar.sh` en 78 s y 68 s; después, **a la vez** en los dos,
  `pnpm db:reset` (30 s) y `pnpm test:e2e acceso + roles-conteo-acotado --project=escritorio` con su build (52 s): 7 de 7 en cada uno. **Sin
  cruces:** cada base registró sus propias 1.053 altas de `auth.users`, y la principal ninguna (4, las de antes; su Kong, 0 pedidos de
  Auth). `pnpm dev` del carril a abrió en el 3100 contra su API. `quitar.sh`: 6 s, sin contenedores ni volúmenes.
- **RAM:** stack de un carril ≈ 0,85 GB (sin Studio, imgproxy ni logs); la principal, 1,78 GB (con Studio y analytics). Sistema: 11 GB con
  la principal sola; 14 GB con los tres stacks; **pico de 19,6 GB** con los dos builds, los dos `next start` y los dos Chromium (de 30 GB).
  Disco por worktree: ≈ 0,3 GB más sus builds.
- Verde: lint, typecheck, test (5.371), `db:probar`, `db:lint`, `mapa.sh --check`; `jobs-de-verdad.sh` con `pnpm funciones` (200).

## Recogido de «Lista para la nube» (salió de ESTADO en la etapa 3; original en `docs/archivo/ESTADO.md`)

- **Etapa 1:** al congelar la base, `db:base` deja de existir y la regla «sólo migraciones» reemplaza a la de DECISIONES (2026-10-11) y al
  chequeo de `db:probar`. Tras el reset de la demo: `cron.job` completo (`pg_cron` corre en UTC) y que el runtime de las funciones inyecta
  `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`. **Colación:** `leads_busqueda_idx` (trigram) y el `ilike` pliegan con la colación de la
  base; repetir la huella de `supabase/tests/busqueda-volumen.sql` (ñ, tildes) contra la demo; un cambio de ICU o glibc pide
  `reindex index leads_busqueda_idx` (y `perfiles_busqueda_idx`, sobre `unaccent`).
- **Etapa 2:** `otp_expiry` en la nube = 86400 s (24 h, el máximo; decidido el 2026-10-21); local sigue en 3600. El seed corre en el orden de
  `[db.seed] sql_paths`. El código de país va en Empresa › Región.
- **De la persona, fuera de esta preparación:** probar apibara con una clave real (plan de pago) antes de desplegar para un cliente: alta
  por enlace (Copart e IAAI), VIN y lote, Refrescar, fotos (hasta 24), cuota agotada (429) y clave rechazada (401), y comparar la respuesta
  real con `e2e/fixtures/apibara`.

## Esperando a la persona

- **Urgente (cierra la ventana de la demo sin dueño):** el `.env.demo` (plantilla en `docs/ENTORNOS.md` › «.env.demo»). Con él corro
  `bash scripts/demo/restaurar.sh` contra la demo.
- **4-40** (decisión): apagar o no los privilegios por defecto de Supabase en `public` (`anon` con 15 secuencias y 32 funciones).
- **4-41** (decisión): si `env:check` debe leer Vercel y Supabase por API (pide `VERCEL_TOKEN` y `SUPABASE_ACCESS_TOKEN`).
- **Etapa 4:** aprobar (o no) los cuatro borrados propuestos de la sección «Etapa 4».

## Lo que necesito de ti, por etapa

- **Etapa 2:**
  - `.env.demo` completo: `DEMO_CLAVE_PUBLICA` y `DEMO_CLAVE_SECRETA` de la demo (panel › Project Settings › API Keys), `DEMO_SITE_URL`
    (la URL de producción en Vercel), `DEMO_VERCEL_EQUIPO` (el slug del equipo), `DEMO_DUENO_EMAIL`, `DEMO_DUENO_CLAVE` y
    `DEMO_CLAVE_USUARIOS` (12 o más caracteres), y el SMTP de Resend (`SMTP_CLAVE` = la API key; `EMAIL_REMITENTE` en el subdominio).
  - **Resend:** crear la cuenta, dar de alta `correo.<tu dominio>` y poner en el DNS los registros que te muestra (SPF, DKIM y DMARC del
    subdominio); recomendación: mover antes el DNS del dominio a Cloudflare (gratis), que es lo que pide Email Sending para migrar después.
  - **Vercel:** acceso al proyecto (está en otra cuenta) para cargar las variables de producción y preview, o cargarlas tú: las tres
    públicas y `SUPABASE_SECRET_KEY` de la demo en «Production» y «Preview».
  - Google (opcional): client id y secret de OAuth.
- **Etapa 6:** en GitHub, la variable `DEMO_PROJECT_REF` = `fjvrjndglytyhvlxifeb` y los secretos `SUPABASE_ACCESS_TOKEN` (un token
  personal de Supabase) y `SUPABASE_DB_PASSWORD` (la clave de la base de la demo): con eso `.github/workflows/demo.yml` migra la demo al
  integrar en `main`.
