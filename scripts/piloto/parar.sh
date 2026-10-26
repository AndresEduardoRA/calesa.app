#!/usr/bin/env bash
# Para el piloto.
#   parar.sh        pone `.piloto/PARAR`: el bucle se detiene entre pasos (el paso en curso termina)
#   parar.sh --ya   además manda SIGINT al paso en curso (cierra su turno; documentado) y lo deja en `en-curso.json` para retomarlo
# Para quitar la parada: rm .piloto/PARAR y bash scripts/piloto/arrancar.sh.
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
mkdir -p "$ESTADO"
touch "$ESTADO/PARAR"
echo "parar: .piloto/PARAR puesto; el bucle se detiene entre pasos."
if [ "${1:-}" = --ya ]; then
  PID=$(jq -r '.pid // empty' "$ESTADO/en-curso.json" 2>/dev/null)
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    kill -INT "$PID" && echo "parar: SIGINT al paso en curso (pid $PID)."
  else
    echo "parar: no hay un paso vivo."
  fi
fi
