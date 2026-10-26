#!/usr/bin/env bash
# Hook PreToolUse sobre Write, Edit y NotebookEdit del planificador: sólo deja escribir bajo `.piloto/planes/` de la raíz del repo de
# la sesión (la que da `cwd` en la entrada, no `${CLAUDE_PROJECT_DIR}`, que no sigue a un worktree). Compara rutas reales
# (`realpath -m`): `..` y los enlaces simbólicos no lo engañan. Se prueba en `scripts/guardas/escribir-solo-en-piloto.test.ts`.
set -uo pipefail

ENTRADA=$(cat)
RUTA=$(printf '%s' "$ENTRADA" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)
CWD=$(printf '%s' "$ENTRADA" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$CWD" ] && CWD="$PWD"

rechazar() {
  printf 'escribir-solo-en-piloto: %s\nEl planificador sólo escribe su plan en .piloto/planes/<paso>.md.\n' "$1" >&2
  exit 2
}

[ -z "$RUTA" ] && rechazar "la herramienta no trae una ruta."
RAIZ=$(git -C "$CWD" rev-parse --show-toplevel 2>/dev/null || printf '%s' "$CWD")
RAIZ=$(realpath -m -- "$RAIZ")
case "$RUTA" in
  /*) ;;
  *) RUTA="$CWD/$RUTA" ;;
esac
REAL=$(realpath -m -- "$RUTA")
case "$REAL" in
  "$RAIZ/.piloto/planes/"*) exit 0 ;;
esac
rechazar "«$REAL» queda fuera de $RAIZ/.piloto/planes/."
