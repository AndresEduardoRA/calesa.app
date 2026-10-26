#!/usr/bin/env bash
# La huella del árbol: HEAD + el diff contra HEAD + lo no rastreado (nombre y contenido). Dos árboles con la misma huella tienen lo
# mismo; `.claude/.verificado-stop` guarda la de la última verificación verde para que el hook Stop no repita lo que ya pasó.
#
#   huella.sh              imprime la huella
#   huella.sh --escribir   la escribe en .claude/.verificado-stop (la deja `verificar.sh`)
#   huella.sh --igual      sale con 0 si coincide con la guardada
set -uo pipefail
cd "${PILOTO_RAIZ:-$(git rev-parse --show-toplevel)}" || exit 1
ARCHIVO=".claude/.verificado-stop"

huella() {
  {
    git rev-parse HEAD
    git diff HEAD
    git ls-files --others --exclude-standard -z | sort -z | xargs -0 -r sha256sum
  } 2>/dev/null | sha256sum | cut -d' ' -f1
}

case "${1:-}" in
  --escribir)
    mkdir -p .claude
    huella >"$ARCHIVO"
    ;;
  --igual)
    [ -s "$ARCHIVO" ] && [ "$(cat "$ARCHIVO")" = "$(huella)" ]
    ;;
  *) huella ;;
esac
