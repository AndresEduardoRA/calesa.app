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
  `docs/carriles/b.md`. La guarda que frena a B (ESTADO, PLAN, DECISIONES, migraciones compartidas) es de CI sobre el diff del PR.
- **Dependencias:** salen `@tanstack/react-query` y `sanitize-html` (+ `@types`); se quedan `@react-pdf/renderer` y `web-push`.
- **Jobs:** además de `db:probar`, una prueba local de que un job con `url_proyecto` llega a `storage-gc` y vuelve con 200.
- **ENTORNOS.md:** el comodín de previews, marcado «solo demo; se quita en la instalación de un cliente».

## Etapas

| Etapa                           | Estado                     | Uso (salida · caché leída)                                      |
| ------------------------------- | -------------------------- | --------------------------------------------------------------- |
| Plan (exploración y preguntas)  | hecho                      | principal 89 K · 9,6 M; subagentes (Opus) 180 K · 33,3 M; 1,5 h |
| 0 — Backup y disco              | hecho (2026-10-28)         | principal 20 K · 12,3 M; 0,24 h                                 |
| 3 — Docs livianos               | en curso (desde 17:15 UTC) | —                                                               |
| 1 — Aplastar y resetear la demo | pendiente                  | —                                                               |
| 2 — Entornos y configuración    | pendiente                  | —                                                               |
| 4 — Quitar lo que sobra         | pendiente                  | —                                                               |
| 5 — Worktrees en paralelo       | pendiente                  | —                                                               |
| 6 — Flujo de dos carriles       | pendiente                  | —                                                               |
| 7 — Cierre                      | pendiente                  | —                                                               |

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

## Esperando a la persona

- (nada todavía)

## Lo que necesito de ti, por etapa

- **Etapa 2:** `.env.demo` (email y clave del dueño de la demo, clave de los usuarios de demo, `SMTP_*`/`EMAIL_*` de Resend, Google;
  `APIBARA_CLAVE` opcional); la API key de Resend y el dominio con su subdominio de envío; acceso a la cuenta de Vercel.
- **Etapa 6:** los secretos de GitHub para `desplegar-demo` (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, el ref).
