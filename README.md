# importadora

Sistema interno white-label para importadoras de vehículos (Next 16 + Supabase). Una empresa por
despliegue. Antes de tocar código leé `CLAUDE.md`, `docs/ESTADO.md` y `docs/MAPA.md`.

## Arrancar en local

```bash
bash setup.sh                     # una sola vez: scaffolding con las versiones del día + deps + hooks
cp .env.example .env.local        # y llená las claves (publishable key sb_publishable_…, no la anon)
npx supabase start                # Postgres + Auth + Storage locales (Docker)
pnpm db:reset && pnpm db:types    # migraciones (la base sale de schemas/) + seed, y los tipos generados
pnpm dev                          # http://localhost:3000  (PWA: pnpm dev --experimental-https)
```

## Verificar

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm db:probar` (schema en Postgres embebido +
pruebas de humo) · `pnpm test:e2e` (Playwright contra la app compilada) · `bash scripts/mapa.sh --check`.
Los hooks de git y de Claude Code corren esto solos; `git commit --no-verify` está bloqueado.

## Dónde está cada cosa

`src/modules/<dominio>/` (ficha en su `CLAUDE.md`) · `src/shared/` · `supabase/schemas` (estado
declarativo) y `supabase/migrations` (RLS, RPC, cron) · `docs/` (producto, UX, plan, decisiones).
