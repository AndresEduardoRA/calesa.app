#!/usr/bin/env bash
# Respaldo del estado del piloto, que no está en git: `.piloto/` de la principal y de cada carril, la carpeta común (`.git/piloto/`:
# compuerta, decisiones, copia del bucle) y el estado del coordinador (`.git/coordinador/`). Un .tar.gz con fecha en RESPALDOS
# (por omisión ~/respaldos-piloto); se guardan los últimos RESPALDOS_N (14). Idempotente; pensado para un timer de systemd (ver
# `instalar-servicios.sh`). Un respaldo no copia secretos: `.env.local` y `.env.carril` se excluyen.
#   bash scripts/maquina/respaldar.sh
set -euo pipefail
RAIZ=$(git rev-parse --show-toplevel)
COMUN=$(git -C "$RAIZ" rev-parse --path-format=absolute --git-common-dir)
DESTINO="${RESPALDOS:-$HOME/respaldos-piloto}"
MANTENER="${RESPALDOS_N:-14}"
mkdir -p "$DESTINO"
SALIDA="$DESTINO/piloto-$(TZ=America/La_Paz date +%Y%m%d-%H%M%S).tar.gz"
mapfile -t CARPETAS < <(
  for d in "$RAIZ/.piloto" "$RAIZ".carriles/*/.piloto "$COMUN/piloto" "$COMUN/coordinador"; do
    [ -d "$d" ] && printf '%s\n' "$d"
  done
)
[ "${#CARPETAS[@]}" -gt 0 ] || { echo "respaldar: no hay estado del piloto que guardar."; exit 0; }
tar -czf "$SALIDA" --exclude='.env.local' --exclude='.env.carril' --exclude='*/llamadas/*.json' --exclude='*/bin/*' -P "${CARPETAS[@]}" 2>/dev/null || [ -s "$SALIDA" ]
# shellcheck disable=SC2012
ls -1t "$DESTINO"/piloto-*.tar.gz 2>/dev/null | tail -n +"$((MANTENER + 1))" | xargs -r rm -f
echo "respaldar: $SALIDA ($(du -h "$SALIDA" | cut -f1))."
