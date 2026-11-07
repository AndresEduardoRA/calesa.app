#!/usr/bin/env bash
# Abre solo los carriles en paralelo cuando se puede. Lo lanza arrancar.sh (sesión `piloto-auto-carriles`) en el árbol principal.
#   auto-carriles.sh          vigila cada AUTO_CARRILES_CADA_S segundos y no termina hasta que todos los carriles corren
#   auto-carriles.sh --una    una sola revisión (sin dormir); con AUTO_EN_SECO=1 sólo dice qué haría
# Un carril nuevo se abre si: (1) origin/main ya trae las áreas de 4.15-4 (AUTO_LISTO: archivos que deben existir allí), (2) hay disco
# (AUTO_DISCO_GB libres por carril, además de lo que ya ocupan) y RAM (AUTO_RAM_GB), (3) no se pasa de CARRILES_MAX, y (4) la
# persona no puso `.piloto/PARAR`. El carril `a` es el piloto principal; aquí se abren los demás en el orden de docs/plan.yaml.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1
source "$BIN/carriles-dir.sh"
MAX_PEDIDO="${CARRILES_MAX:-}"
[ -f piloto.config ] && source piloto.config
CARRILES_MAX="${MAX_PEDIDO:-${CARRILES_MAX:-3}}"
AUTO_LISTO="${AUTO_LISTO:-src/modules/cotizaciones/pantallas/formula.ts src/modules/cotizaciones/pantallas/papelera.ts}"
AUTO_DISCO_GB="${AUTO_DISCO_GB:-22}"
AUTO_RAM_GB="${AUTO_RAM_GB:-6}"
AUTO_CARRILES_CADA_S="${AUTO_CARRILES_CADA_S:-600}"
AUTO_CMD_ABRIR="${AUTO_CMD_ABRIR:-bash scripts/coordinador/abrir-carriles.sh}"
log() { echo "$(date -Iseconds) auto-carriles: $*" | tee -a "$ESTADO/bucle.log"; }

# Los carriles con trabajo en plan.yaml, sin el principal (el primero).
otros() {
  node --input-type=module -e "
import { readFileSync } from 'node:fs'
import { leerPlan } from './scripts/coordinador/plan.mjs'
for (const c of leerPlan(readFileSync('docs/plan.yaml', 'utf8')).carriles) console.log(c.id)" 2>/dev/null | tail -n +2
}
listo() {
  git fetch --quiet origin main 2>/dev/null || return 1
  local f; for f in $AUTO_LISTO; do git cat-file -e "origin/main:$f" 2>/dev/null || return 1; done
}
disco_libre_gb() { mkdir -p "$CARRILES_DIR" 2>/dev/null; df --output=avail -BG "$CARRILES_DIR" | tail -1 | tr -dc 0-9; }
ram_libre_gb() { awk '/MemAvailable/ { printf "%d", $2 / 1048576 }' /proc/meminfo; }
corre() { tmux has-session -t "piloto-bucle-$1" 2>/dev/null; }

revisar() {
  [ -e "$ESTADO/PARAR" ] && { echo "parado"; return 1; }
  local abiertos=1 c pendientes=()   # 1 = el principal
  for c in $(otros); do
    if corre "$c"; then abiertos=$((abiertos + 1)); else pendientes+=("$c"); fi
  done
  [ "${#pendientes[@]}" -eq 0 ] && { echo "todos"; return 0; }
  [ "$abiertos" -ge "$CARRILES_MAX" ] && { echo "tope"; return 1; }
  listo || { echo "esperando 4.15-4 en origin/main"; return 1; }
  [ "$(disco_libre_gb)" -ge "$AUTO_DISCO_GB" ] || { echo "disco: $(disco_libre_gb) GB libres, piden $AUTO_DISCO_GB"; return 1; }
  [ "$(ram_libre_gb)" -ge "$AUTO_RAM_GB" ] || { echo "RAM: $(ram_libre_gb) GB libres, piden $AUTO_RAM_GB"; return 1; }
  local c=${pendientes[0]}
  if [ -n "${AUTO_EN_SECO:-}" ]; then echo "abriría $c"; return 1; fi
  log "abro el carril $c"
  # abrir-carriles.sh va en la principal; el piloto del A corre en su worktree (no podía abrir el b: 2026-11-05).
  (cd "$(git rev-parse --path-format=absolute --git-common-dir)/.." && $AUTO_CMD_ABRIR "$c") >>"$ESTADO/bucle.log" 2>&1 || { log "no pude abrir el carril $c"; return 1; }
  local dir="$CARRILES_DIR/$c"
  (cd "$dir" && bash scripts/piloto/arrancar.sh --carril "$c") >>"$ESTADO/bucle.log" 2>&1 || { log "no pude arrancar el carril $c"; return 1; }
  echo "abierto $c"; return 1   # 1: vuelve a revisar por si cabe otro
}

if [ "${1:-}" = --una ]; then revisar; exit 0; fi
while :; do
  r=$(revisar) && [ "$r" = todos ] && { log "todos los carriles corren."; exit 0; }
  sleep "$AUTO_CARRILES_CADA_S"
done
