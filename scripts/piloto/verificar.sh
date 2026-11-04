#!/usr/bin/env bash
# La verificación del bucle, después de un paso «listo» (el modelo no verifica por él: este script no le cree al «listo»).
#
#   verificar.sh <HEAD de arranque> <ultimo.json>
#
# Lo mínimo y local: `pnpm typecheck` y `mapa.sh --check`, y sale sin repetir nada si la huella del árbol (HEAD + diff + no rastreados) es
# la de una verificación verde (`huella.sh --igual`: el hook Stop la deja al cerrar el paso). Lint, la suite, `db:probar` y los e2e
# NO se repiten aquí: los corre el CI de la rama, que es la autoridad (`ci.sh`: un rojo se anota y se arregla después; el cierre de
# fase exige verde). Antes (hasta el 4.15) esto corría lint, typecheck, test, mapa, db:probar y los e2e dirigidos en escritorio y móvil,
# ≈ 11 min por paso medidos en el 4.14-3c, y el CI los volvía a correr. Si todo pasó deja la huella verde. Sale con 1 y dice qué falló;
# un rojo termina con la cola de su salida y, en la última línea, «verificar: <nombre> falló: <causa>» (con ella arma el aviso
# `cierre.sh`). Cada salida queda en `.piloto/salidas/<paso>/verificar-<nombre>.log`. Se prueba en `verificar.test.ts`.
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1

DESDE="${1:-}"
ULTIMO="${2:-}"
[ -n "$DESDE" ] || { echo "verificar: falta el HEAD de arranque." >&2; exit 1; }
jq -e 'type == "object"' "$ULTIMO" >/dev/null 2>&1 || { echo "verificar: $ULTIMO no es un ultimo.json legible." >&2; exit 1; }

PASO=$(jq -r '.paso // "sin-paso"' "$ULTIMO")
SALIDAS="$ESTADO/salidas/${PASO//[^A-Za-z0-9._-]/_}"
mkdir -p "$SALIDAS"

# Por qué cayó, en una línea del log: la primera «Error:»; si no hay, la primera con ✘, FAIL o error; si tampoco, el log. Sin colores ni
# sangría, cortada en 200 caracteres (por caracteres y no bytes: `LC_ALL` local).
causa() {
  local log="$1" linea LC_ALL=C.UTF-8
  # grep lee por sustitución de proceso: con `pipefail`, un `sed | grep -m1` que corta temprano daría el SIGPIPE de sed como falla.
  linea=$(grep -m1 -F 'Error:' < <(sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g' "$log")) ||
    linea=$(grep -m1 -E '✘|FAIL|error' < <(sed -E 's/\x1b\[[0-9;]*[A-Za-z]//g' "$log")) ||
    linea="ver $log"
  linea="${linea#"${linea%%[![:space:]]*}"}"
  printf '%s' "${linea:0:200}"
}

correr() {
  local nombre="$1" log
  shift
  log="$SALIDAS/verificar-$nombre.log"
  echo "verificar: $nombre…" >&2
  if ! "$@" >"$log" 2>&1; then
    echo "verificar: $nombre falló (salida completa: $log):" >&2
    tail -n 30 "$log" >&2
    echo "verificar: $nombre falló: $(causa "$log")" >&2
    exit 1
  fi
}

if bash "$BIN/huella.sh" --igual; then
  echo "verificar: el árbol ya está verificado (huella verde): no se repite nada." >&2
  exit 0
fi

correr typecheck pnpm typecheck
correr mapa bash scripts/mapa.sh --check

bash "$BIN/huella.sh" --escribir
echo "verificar: todo en verde." >&2
