#!/usr/bin/env bash
# Lo que comparten las piezas del piloto (se hace `source`, no se corre). Define dónde vive cada cosa:
#
#   RAIZ    la raíz del árbol de trabajo (PILOTO_RAIZ, si no `git rev-parse --show-toplevel`)
#   COMUN   <carpeta común de git>/piloto: lo que autoriza (compuerta.md, decision.md, aprobado-<paso>) y la copia de las piezas
#           (bin/); común a todos los worktrees y fuera del árbol. Sólo la escribe bash: el bucle y el hook que anota la decisión
#           (PILOTO_COMUN para las pruebas)
#   ESTADO  RAIZ/.piloto: lo que escriben el bucle y las sesiones (PILOTO_DIR para las pruebas)
#   BIN     la carpeta de esta pieza (la copia de <común>/piloto/bin/ cuando corre el bucle)

RAIZ="${PILOTO_RAIZ:-$(git rev-parse --show-toplevel 2>/dev/null)}"
COMUN="${PILOTO_COMUN:-$(git -C "${RAIZ:-.}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/piloto}"
ESTADO="${PILOTO_DIR:-$RAIZ/.piloto}"
BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ahora_lapaz() { TZ=America/La_Paz date +%Y-%m-%dT%H:%M:%S%:z; }

# El binario de Claude Code: CLAUDE_BIN, si no `claude` del PATH, si no el más nuevo de la extensión de VS Code.
claude_bin() {
  if [ -n "${CLAUDE_BIN:-}" ]; then
    printf '%s' "$CLAUDE_BIN"
  elif command -v claude >/dev/null 2>&1; then
    command -v claude
  else
    # shellcheck disable=SC2012
    ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | sort -V | tail -n 1
  fi
}

# El contenido de un archivo si es JSON, si no `null`: para armar un JSON mayor con `jq --argjson`.
json_o_null() {
  if [ -s "$1" ] && jq -e . "$1" >/dev/null 2>&1; then jq -c . "$1"; else printf 'null'; fi
}
