#!/usr/bin/env bash
# Hook PreToolUse sobre Write, Edit, NotebookEdit y Bash (en settings: corre también dentro de los subagentes) que guarda lo que
# autoriza el piloto. Con `PILOTO_SESION=paso|ruteo` una sesión que trabaja no escribe en `<común>/piloto/**` (la compuerta, la
# decisión, los `aprobado-<paso>` y la copia del bucle) ni en `.piloto/decision.md` (por ruta real), y ningún Bash las nombra: la
# ruta absoluta de la carpeta común, `.git/piloto`, `git-common-dir`, `piloto/decision`, `piloto/aprobado`, `piloto/compuerta`,
# `.piloto/decision.md`. Sin esa variable (una sesión de la persona) o con `decidir` (la que anota, por su hook) no hace nada.
# La carpeta común la calcula `git` desde el cwd de la entrada, no una variable que la sesión pudiera tocar; de un worktree da la
# del repo principal. Se prueba en `scripts/guardas/guardar-autorizaciones.test.ts`.
set -uo pipefail

case "${PILOTO_SESION:-}" in
  paso | ruteo) ;;
  *) exit 0 ;;
esac

ENTRADA=$(cat)
jq -e 'type == "object"' <<<"$ENTRADA" >/dev/null 2>&1 || exit 0
HERRAMIENTA=$(jq -r '.tool_name // ""' <<<"$ENTRADA")
CWD=$(jq -r '.cwd // empty' <<<"$ENTRADA")
[ -z "$CWD" ] && CWD="$PWD"

COMUN=$(git -C "$CWD" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
[ -n "$COMUN" ] && COMUN=$(realpath -m -- "$COMUN/piloto")

bloquear() {
  printf 'guardar-autorizaciones: %s\nLo que autoriza el piloto (compuerta, decisión, aprobados) lo escribe sólo el bucle; una sesión que trabaja no lo toca.\n' "$1" >&2
  exit 2
}

case "$HERRAMIENTA" in
  Write | Edit | NotebookEdit)
    RUTA=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$ENTRADA")
    [ -n "$RUTA" ] || exit 0
    case "$RUTA" in /*) ;; *) RUTA="$CWD/$RUTA" ;; esac
    REAL=$(realpath -m -- "$RUTA")
    case "$REAL" in
      */.piloto/decision.md) bloquear "no se escribe $REAL." ;;
    esac
    if [ -n "$COMUN" ]; then
      case "$REAL" in "$COMUN" | "$COMUN"/*) bloquear "no se escribe bajo $COMUN." ;; esac
    fi
    ;;
  Bash)
    CMD=$(jq -r '.tool_input.command // empty' <<<"$ENTRADA")
    for nombre in ${COMUN:+"$COMUN"} '.git/piloto' 'git-common-dir' 'piloto/decision' 'piloto/aprobado' 'piloto/compuerta' '.piloto/decision.md'; do
      [[ "$CMD" == *"$nombre"* ]] && bloquear "el comando nombra «$nombre»."
    done
    ;;
esac
exit 0
