#!/usr/bin/env bash
# Abre un worktree por carril de plan.yaml (hasta CARRILES_MAX), cada uno con su stack (scripts/worktree/preparar.sh), y anota el
# proyecto en ~/.config/kit/proyectos.txt para que la cuota se cuente entre todos los proyectos. Se corre en la principal.
#
#   bash scripts/coordinador/abrir-carriles.sh [<carril>…]     (sin carriles: los primeros CARRILES_MAX con pasos sin integrar)
#
# Los worktrees quedan en <carpeta del repo>.carriles/<carril>, en la rama <carril>/base desde origin/main. El piloto de cada carril
# crea después una rama por paso (<carril>/<paso>). Idempotente: un carril que ya tiene worktree sólo se vuelve a preparar.
set -euo pipefail
RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ"
falta() { echo "✗ $1" >&2; exit 64; }
[ "$(git rev-parse --path-format=absolute --git-dir)" = "$(git rev-parse --path-format=absolute --git-common-dir)" ] ||
  falta "esto es el worktree de un carril: abrir-carriles.sh va en la principal."
# shellcheck source=../../piloto.config
source piloto.config
node scripts/coordinador/coordinador.mjs validar >/dev/null || { node scripts/coordinador/coordinador.mjs validar; exit 1; }

mapfile -t PEDIDOS < <(printf '%s\n' "$@")
if [ "$#" -eq 0 ]; then
  # Los carriles que todavía tienen trabajo, en el orden de plan.yaml.
  mapfile -t PEDIDOS < <(node --input-type=module -e "
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { leerPlan, estadoInicial } from './scripts/coordinador/plan.mjs'
const plan = leerPlan(readFileSync(process.env.COORD_PLAN || 'docs/plan.yaml', 'utf8'))
const comun = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim()
const f = join(comun, 'coordinador/estado.json')
const estado = estadoInicial(plan, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { pasos: {} })
for (const c of plan.carriles)
  if (plan.pasos.some((p) => p.carril === c.id && estado.pasos[p.id].estado !== 'integrado')) console.log(c.id)
" | head -n "$CARRILES_MAX")
fi
[ "${#PEDIDOS[@]}" -gt 0 ] && [ -n "${PEDIDOS[0]}" ] || { echo "· no hay carriles con trabajo pendiente."; exit 0; }

# La RAM: cada stack ≈ 0,85 GB y cada e2e otro tanto (medido en importadora). Se avisa, no se impide.
libre_gb=$(awk '/MemAvailable/ { printf "%d", $2 / 1048576 }' /proc/meminfo 2>/dev/null || echo 0)
necesita=$(( ${#PEDIDOS[@]} * 2 ))
[ "$libre_gb" -ge "$necesita" ] || echo "⚠ hay ${libre_gb} GB libres y ${#PEDIDOS[@]} carriles piden ≈ ${necesita} GB con su e2e: baja CARRILES_MAX si se traba."

BASE="origin/main"
git fetch --quiet origin main 2>/dev/null || BASE="main"
DESTINO="$(dirname "$RAIZ")/$(basename "$RAIZ").carriles"
mkdir -p "$DESTINO"
for carril in "${PEDIDOS[@]}"; do
  dir="$DESTINO/$carril"
  if [ ! -d "$dir" ]; then
    git worktree add --quiet -B "$carril/base" "$dir" "$BASE"
    # Lo ignorado por git que el carril necesita (la lista de .worktreeinclude: sólo rutas literales).
    if [ -f .worktreeinclude ]; then
      grep -vE '^\s*(#|$)' .worktreeinclude | while IFS= read -r ruta; do
        [ -e "$ruta" ] && { mkdir -p "$dir/$(dirname "$ruta")"; cp -p "$ruta" "$dir/$ruta"; }
      done
    fi
    echo "✓ worktree $dir ($carril/base desde $BASE)"
  fi
  (cd "$dir" && bash scripts/worktree/preparar.sh "$carril")
done

mkdir -p "$HOME/.config/kit"
touch "$HOME/.config/kit/proyectos.txt"
grep -qxF "$RAIZ" "$HOME/.config/kit/proyectos.txt" || echo "$RAIZ" >>"$HOME/.config/kit/proyectos.txt"
echo
echo "Carriles listos: ${PEDIDOS[*]}. Tablero: node scripts/coordinador/coordinador.mjs tablero"
