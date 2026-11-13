# importadora

Sistema interno white-label para importadoras de vehículos (Next 16 + Supabase). Una empresa por
despliegue. Antes de tocar código lee `CLAUDE.md`, `docs/ESTADO.md` y `docs/MAPA.md` (si falta: `bash scripts/mapa.sh`).

## Arrancar en local

```bash
pnpm install                      # dependencias y hooks de git (lefthook)
cp .env.example .env.local        # y completa las claves (publishable key sb_publishable_…, no la anon): docs/ENTORNOS.md
npx supabase start                # Postgres + Auth + Storage locales (Docker)
pnpm db:reset && pnpm db:types    # las migraciones (supabase/migrations) + seed, y los tipos generados
pnpm dev                          # http://localhost:3000  (PWA: pnpm dev --experimental-https)
```

Un carril (un worktree con su propia pila, para trabajar en paralelo) se arranca con `bash scripts/worktree/preparar.sh`:
`docs/FLUJO.md` › «En paralelo».

## Cambiar algo

Una actualización es una rama, un PR y un commit en `main`: `docs/FLUJO.md`. `bash scripts/flujo/publicar.sh` empuja la rama, abre el
PR con auto-merge y espera al CI; con todo en verde GitHub lo integra solo. Lo que falta por hacer está en `docs/PENDIENTES.md`.

## Verificar

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm db:probar` (schema en Postgres embebido +
pruebas; `pnpm db:probar:rapido` sin las siete exhaustivas) · `pnpm test:e2e:completo` (los e2e, ver abajo) · `bash scripts/mapa.sh --check`.
Los hooks de git y de Claude Code corren esto solos; saltarse los hooks de commit está bloqueado.

### e2e

Playwright contra la app compilada (`.next-e2e`) y el Supabase local, en escritorio y móvil. Necesita
`npx supabase start` y, en otra terminal, `pnpm funciones` (si no, falla en segundos y lo
dice). La integración de apibara queda apagada y sin clave: se prueba con las respuestas grabadas.

- `pnpm test:e2e:completo`: **resetea la base local** (`db:reset`) y corre todo, sin saltar nada. Es el
  que vale como «el e2e pasa». Borra los datos de desarrollo (ver abajo) y la sesión de `next dev`.
- `pnpm test:e2e [spec] [--project=movil]`: un spec suelto sobre la base como esté, con datos. Las
  pruebas que exigen el equipo vacío se saltan avisando: eso no es un e2e completo.

### Dejar el desarrollo como estaba tras un reset

`db:reset` deja lo que trae `supabase/seed.sql` (permisos, roles, orígenes de ejemplo, monedas) y borra
cuentas, leads, vehículos, ajustes de la empresa, layouts y archivos. Para volver a trabajar:

1. `pnpm dev` y abrir `/registro`: la primera persona que se registra nace dueña.
2. Configuración › Empresa: nombre y zona horaria; el código de país de los teléfonos ya viene en `+591`
   (Región) y se cambia ahí si tu país es otro.
3. Lo demás (leads de prueba, layout de campos) se vuelve a crear a mano: no hay cuenta automática.

## Dónde está cada cosa

`src/modules/<dominio>/` (ficha en su `CLAUDE.md`) · `src/shared/` · `supabase/migrations` (la base
aplastada y una migración por cambio; `pnpm db:aplastar` las vuelve a fundir) · `docs/` (estado, flujo, producto, UX, cotizador,
decisiones, lecciones, pendientes). La historia anterior al 2026-11-13 está en la etiqueta `fases-0-9`.
