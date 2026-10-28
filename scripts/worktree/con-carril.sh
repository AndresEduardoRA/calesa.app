#!/usr/bin/env bash
# Corre la app o la CLI de Supabase con el stack de ESTE worktree: exporta su `.env.carril` (scripts/lib/carril.sh) y, para la app,
# PORT = PUERTO_APP. En la principal no cambia nada. Sólo lo que el stack necesita y no pasa por el candado (el resto de `supabase`
# va por `pnpm db:*`, que ya carga el carril):
#
#   bash scripts/worktree/con-carril.sh next dev …              (pnpm dev)
#   bash scripts/worktree/con-carril.sh supabase functions serve (pnpm funciones)
#   bash scripts/worktree/con-carril.sh supabase start|stop|status …
set -euo pipefail
# shellcheck source=../lib/carril.sh
source "$(dirname "${BASH_SOURCE[0]}")/../lib/carril.sh"

case "${1:-} ${2:-} ${3:-}" in
  "next dev "*) export PORT="${PORT:-${PUERTO_APP:-3000}}" ;;
  "supabase functions serve" | "supabase start "* | "supabase stop "* | "supabase status "*) ;;
  *)
    echo "con-carril: «$*» no es next dev, supabase functions serve, start, stop ni status." >&2
    exit 64
    ;;
esac
exec "$@"
