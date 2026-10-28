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

| Etapa                           | Estado                     | Uso (salida · caché leída)                                          |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------- |
| Plan (exploración y preguntas)  | hecho                      | principal 89 K · 9,6 M; subagentes (Opus) 180 K · 33,3 M; 1,5 h     |
| 0 — Backup y disco              | hecho (2026-10-28)         | principal 20 K · 12,3 M; 0,24 h                                     |
| 3 — Docs livianos               | hecho (2026-10-28)         | principal 93 K · 31,6 M; subagentes (Sonnet) 960 K · 48,5 M; 0,72 h |
| 1 — Aplastar y resetear la demo | en curso (desde 17:58 UTC) | —                                                                   |
| 2 — Entornos y configuración    | pendiente                  | —                                                                   |
| 4 — Quitar lo que sobra         | pendiente                  | —                                                                   |
| 5 — Worktrees en paralelo       | pendiente                  | —                                                                   |
| 6 — Flujo de dos carriles       | pendiente                  | —                                                                   |
| 7 — Cierre                      | pendiente                  | —                                                                   |

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

- (nada todavía)

## Lo que necesito de ti, por etapa

- **Etapa 2:** `.env.demo` (email y clave del dueño de la demo, clave de los usuarios de demo, `SMTP_*`/`EMAIL_*` de Resend, Google;
  `APIBARA_CLAVE` opcional); la API key de Resend y el dominio con su subdominio de envío; acceso a la cuenta de Vercel.
- **Etapa 6:** los secretos de GitHub para `desplegar-demo` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, el ref).
