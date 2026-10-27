#!/usr/bin/env bash
# La verificación del bucle, después de un paso «listo» (el modelo no verifica por él: este script no le cree al «listo»).
#
#   verificar.sh <HEAD de arranque> <ultimo.json>
#
# En orden y parando en el primer rojo: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `mapa.sh --check`, `pnpm db:probar` si el rango
# `<HEAD de arranque>..HEAD` toca `supabase/`, y los e2e dirigidos que lista `ultimo.json` (`pnpm test:e2e <specs…>`, que toma el
# candado de la base) en escritorio y, sólo si `nivel.mjs` dice que el rango toca interfaz, también en móvil. Los e2e corren con
# `E2E_SIN_FUNCIONES=1`: el bucle no levanta las funciones edge, y un spec que llama a una de verdad falla solo sin ella. El Nivel 2
# y el 3 no los repite: el auditor ya leyó su salida. Si todo pasó deja la huella verde (`huella.sh --escribir`) para que el hook Stop
# no repita la suite. Sale con 1 y dice qué falló; sin la base libre, o sin una función que un spec llama, es un rojo, no un verde.
# Cada salida queda en `.piloto/salidas/<paso>/verificar-<nombre>.log`. Se prueba en `verificar.test.ts`.
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

correr() {
  local nombre="$1"
  shift
  echo "verificar: $nombre…" >&2
  if ! "$@" >"$SALIDAS/verificar-$nombre.log" 2>&1; then
    echo "verificar: $nombre falló (salida completa: $SALIDAS/verificar-$nombre.log):" >&2
    tail -n 30 "$SALIDAS/verificar-$nombre.log" >&2
    exit 1
  fi
}

correr lint pnpm lint
correr typecheck pnpm typecheck
correr test pnpm test
correr mapa bash scripts/mapa.sh --check

if git diff --name-only "$DESDE..HEAD" | grep -q '^supabase/'; then
  correr db-probar pnpm db:probar
fi

mapfile -t SPECS < <(jq -r '.e2e_dirigidos[]? // empty' "$ULTIMO")
if [ "${#SPECS[@]}" -gt 0 ]; then
  INTERFAZ=$(node "$BIN/nivel.mjs" --rango "$DESDE..HEAD" | jq -r '.toca_interfaz') || {
    echo "verificar: nivel.mjs no pudo leer el rango." >&2
    exit 1
  }
  PROYECTOS=(--project=escritorio)
  [ "$INTERFAZ" = true ] && PROYECTOS+=(--project=movil)
  # La guardia de `e2e/global-setup.ts` exige las tres funciones para cualquier spec; un spec que llama a una falla solo sin ella.
  correr e2e env E2E_SIN_FUNCIONES=1 pnpm test:e2e "${SPECS[@]}" "${PROYECTOS[@]}"
fi

bash "$BIN/huella.sh" --escribir
echo "verificar: todo en verde." >&2
