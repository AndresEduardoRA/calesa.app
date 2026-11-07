#!/usr/bin/env bash
# El coordinador en marcha, uno por proyecto (lo lanza scripts/piloto/arrancar.sh en tmux `<proyecto>-coordinador`): cada
# COORD_INTERVALO segundos (180) mira los PR publicados (integra los verdes y ámbar con el CI en verde, marca los que se integraron y
# devuelve a su carril los que quedaron en rojo o en conflicto) y reescribe el tablero. Termina cuando todos los pasos están integrados.
set -uo pipefail
RAIZ=$(git rev-parse --show-toplevel)
cd "$RAIZ" || exit 1
# Exportado (set -a): lo lee coordinador.mjs, que es otro proceso. Sin exportar, COORD_MERGE_AUTO de piloto.config no le llegaba nunca y el
# coordinador seguía con verde,ambar aunque la persona decidiera integrar también lo rojo (#54, 2026-11-07).
if [ -f piloto.config ]; then set -a; source piloto.config; set +a; fi
INTERVALO="${COORD_INTERVALO:-180}"
COMUN=$(git rev-parse --path-format=absolute --git-common-dir)/coordinador
mkdir -p "$COMUN"
echo "$(TZ=America/La_Paz date +%FT%T) coordinador en marcha (cada $INTERVALO s; tablero en $COMUN/TABLERO.md)."
while :; do
  [ -f "$COMUN/PARAR" ] && { echo "coordinador: PARAR."; exit 0; }
  node scripts/coordinador/coordinador.mjs sincronizar 2>&1 | sed "s/^/$(TZ=America/La_Paz date +%T) /"
  tablero=$(node scripts/coordinador/coordinador.mjs tablero 2>/dev/null)
  if grep -qE '^([0-9]+) de \1 pasos integrados' <<<"$(sed -n 3p <<<"$tablero")"; then
    echo "coordinador: todos los pasos están integrados. Fin."
    exit 0
  fi
  sleep "$INTERVALO"
done
