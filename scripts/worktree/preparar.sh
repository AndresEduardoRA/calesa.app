#!/usr/bin/env bash
# Deja un worktree de Orca listo para trabajar como un carril, con su propio stack de Supabase, sin pisar a la principal ni al otro
# carril. Idempotente: corre las veces que haga falta. Se corre en el worktree del carril, nunca en la principal.
#
#   bash scripts/worktree/preparar.sh [a|b]     (sin carril: lo saca de la rama, `a/…` o `b/…`)
#
# 1) `.env.carril`: el project_id `importadora-<carril>` y los puertos con su desfase (scripts/lib/stack-local.mjs: a = +100, b = +200).
#    Lo cargan el candado (`pnpm db:*`, `test:e2e`), `pnpm dev`, `pnpm funciones` y los scripts de medir: config.toml no se toca.
# 2) `pnpm install` si falta. 3) `supabase start` del carril, sin Studio, imgproxy ni logs (como el e2e de CI).
# 4) `.env.local`: lo de Supabase sale de `supabase status`; lo demás, de la `.env.local` de la principal. Nada se imprime.
# 5) La base: `restaurar.sh --local` (reset y datos de demo) si hay credenciales de demo; si no, `pnpm db:reset`. 6) El mapa.
# Quitarlo: scripts/worktree/quitar.sh.
set -euo pipefail
RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ"
falta() { echo "✗ $1" >&2; exit 64; }

if [ "$(git rev-parse --path-format=absolute --git-dir)" = "$(git rev-parse --path-format=absolute --git-common-dir)" ]; then
  falta "esto es la principal: preparar.sh va en el worktree de un carril (lo crea Orca)."
fi
PRINCIPAL=$(git worktree list --porcelain | sed -n '1s/^worktree //p')

CARRIL="${1:-}"
if [ -z "$CARRIL" ]; then
  case "$(git symbolic-ref --quiet --short HEAD || true)" in
    a/*) CARRIL=a ;;
    b/*) CARRIL=b ;;
    *) falta "no sé el carril: pásalo (a o b) o usa una rama a/… o b/…" ;;
  esac
fi

# 1) .env.carril
node --input-type=module -e "
import { writeFileSync } from 'node:fs'
import { variablesDelCarril } from './scripts/lib/stack-local.mjs'
const v = variablesDelCarril(process.argv[1])
const lineas = Object.entries(v).map(([k, x]) => k + '=' + String(x))
writeFileSync('.env.carril', '# Carril ' + process.argv[1] + ': lo escribe scripts/worktree/preparar.sh. No se edita a mano.\n' + lineas.join('\n') + '\n')
" "$CARRIL"
# shellcheck source=../lib/carril.sh
source scripts/lib/carril.sh
echo "✓ carril $CARRIL: stack $SUPABASE_PROJECT_ID, API $SUPABASE_API_PORT, base $SUPABASE_DB_PORT, app $PUERTO_APP, e2e $E2E_PORT"

# 2) Dependencias (pnpm las enlaza desde el store: no se bajan de nuevo).
[ -d node_modules ] || pnpm install --frozen-lockfile --prefer-offline >/dev/null
echo "✓ dependencias"

# 3) El stack del carril.
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }
if sb status >/dev/null 2>&1; then
  echo "✓ stack $SUPABASE_PROJECT_ID ya estaba arriba"
else
  sb start -x studio,imgproxy,logflare,vector >/dev/null
  echo "✓ stack $SUPABASE_PROJECT_ID arriba"
fi

# 4) .env.local: lo de Supabase de este stack y lo demás de la principal, sin imprimir valores.
estado=$(sb status -o env)
leer() { printf '%s\n' "$estado" | sed -nE "s/^$1=\"?([^\"]*)\"?$/\1/p"; }
PROPIAS='^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SECRET_KEY|MAILPIT_URL)='
{
  echo "# Carril $CARRIL: lo escribe scripts/worktree/preparar.sh (lo de Supabase, de su stack; lo demás, de la principal)."
  echo "NEXT_PUBLIC_SUPABASE_URL=$(leer API_URL)"
  echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(leer PUBLISHABLE_KEY)"
  echo "SUPABASE_SECRET_KEY=$(leer SECRET_KEY)"
  echo "MAILPIT_URL=$E2E_MAILPIT_URL"
  if [ -f "$PRINCIPAL/.env.local" ]; then grep -vE "$PROPIAS" "$PRINCIPAL/.env.local" | grep -vE '^# Carril ' || true; fi
} >.env.local.nuevo
chmod 600 .env.local.nuevo
mv .env.local.nuevo .env.local
pnpm --silent env:check local >/dev/null || { pnpm --silent env:check local >&2; falta ".env.local incompleta (arriba, lo que falta)."; }
echo "✓ .env.local"

# 5) La base: con datos de demo si hay credenciales (en .env.demo, que Orca copia de la principal, o en el entorno).
if [ -f .env.demo ] || [ -n "${DEMO_DUENO_EMAIL:-}" ]; then
  bash scripts/demo/restaurar.sh --local
else
  pnpm db:reset >/dev/null 2>&1 || pnpm db:reset >/dev/null
  echo "✓ base reseteada (sin datos de demo: falta .env.demo)"
fi

# 6) El mapa de este árbol.
bash scripts/mapa.sh >/dev/null
echo "✓ mapa"
echo
echo "Listo. App: pnpm dev (http://localhost:$PUERTO_APP) · funciones: pnpm funciones · e2e: pnpm test:e2e <spec> (puerto $E2E_PORT)"
