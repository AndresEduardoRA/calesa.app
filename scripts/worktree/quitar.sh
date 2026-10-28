#!/usr/bin/env bash
# Baja el stack de Supabase de un carril y borra su base (`supabase stop --no-backup`), para soltar la RAM y el disco antes de que Orca
# borre el worktree. Se corre en el worktree del carril; en la principal no hace nada. Lo inverso de scripts/worktree/preparar.sh.
#
#   bash scripts/worktree/quitar.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[ -f .env.carril ] || { echo "· sin .env.carril: no es un carril, no hay nada que quitar." >&2; exit 0; }
# shellcheck source=../lib/carril.sh
source scripts/lib/carril.sh
pnpm exec supabase stop --no-backup >/dev/null 2>&1 || true
quedan=$(docker ps -a --filter "name=_${SUPABASE_PROJECT_ID}\$" --format '{{.Names}}' | wc -l)
[ "$quedan" = 0 ] || { echo "✗ quedan $quedan contenedores de $SUPABASE_PROJECT_ID (docker ps -a)." >&2; exit 1; }
rm -f .env.carril
echo "✓ stack $SUPABASE_PROJECT_ID abajo y sin volúmenes; .env.carril borrado."
