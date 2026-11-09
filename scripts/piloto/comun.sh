#!/usr/bin/env bash
# Lo que comparten las piezas del piloto (se hace `source`, no se corre). Define dónde vive cada cosa:
#
#   RAIZ    la raíz del árbol de trabajo (PILOTO_RAIZ, si no `git rev-parse --show-toplevel`)
#   COMUN   <carpeta común de git>/piloto: lo que autoriza (compuerta.md, decision.md, aprobado-<paso>) y la copia de las piezas
#           (bin/); común a todos los worktrees y fuera del árbol. Sólo la escribe bash: el bucle y el hook que anota la decisión
#           (PILOTO_COMUN para las pruebas)
#   ESTADO  RAIZ/.piloto: lo que escriben el bucle y las sesiones (PILOTO_DIR para las pruebas)
#   BIN     la carpeta de esta pieza (la copia vigente a la que apunta <común>/piloto/bin cuando corre el bucle)

RAIZ="${PILOTO_RAIZ:-$(git rev-parse --show-toplevel 2>/dev/null)}"
COMUN="${PILOTO_COMUN:-$(git -C "${RAIZ:-.}" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/piloto}"
ESTADO="${PILOTO_DIR:-$RAIZ/.piloto}"
# Resuelto (`pwd -P`): `bin` es un enlace a la copia vigente, y un bucle que corre sigue con la suya aunque otro carril la cambie (copiar-bin.sh).
BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

# La configuración del proyecto (`piloto.config`, versionada, sin secretos), exportada: la leen también el coordinador y `gh`, que son
# otros procesos. Lo que ya viene del entorno manda (el archivo usa `${X:-…}` donde importa; las pruebas fijan lo suyo).
# Se lee la de `origin/main`, como la copia de las piezas: el árbol de un carril puede estar en una rama de antes (los tres arrancan
# la Fase 5 desde ramas de la 4, sin `PILOTO_GH_USUARIO`), y el bucle la carga una sola vez, al nacer. Sin `origin/main`, la del árbol.
if [ -z "${PILOTO_CONFIG_LEIDA:-}" ]; then
  _config=$(git -C "${RAIZ:-.}" show origin/main:piloto.config 2>/dev/null) || _config=""
  [ -n "$_config" ] || { [ -f "$RAIZ/piloto.config" ] && _config=$(cat "$RAIZ/piloto.config"); }
  if [ -n "$_config" ]; then
    # Lo que ya viene del entorno manda, también sobre una línea del archivo que asigne sin `${X:-…}`: se guarda y se repone.
    _antes=$(grep -oE '^[A-Z_][A-Z0-9_]*=' <<<"$_config" | tr -d '=' | sort -u | while IFS= read -r _n; do
      [ -n "${!_n+x}" ] && printf '%s=%q\n' "$_n" "${!_n}"
    done)
    set -a
    # shellcheck disable=SC1090
    source /dev/stdin <<<"$_config"
    [ -n "$_antes" ] && eval "$_antes"
    set +a
    export PILOTO_CONFIG_LEIDA=1
  fi
  unset _config _antes _n
fi

# La cuenta de GitHub del piloto (`PILOTO_GH_USUARIO`): `gh` y `git push` usan la cuenta ACTIVA de la máquina, y es una sola para todos los
# proyectos. El 2026-11-09 la persona entró con otra cuenta para otro trabajo y la activa pasó a ser una sin permiso de escritura aquí:
# el primer push o merge del piloto habría fallado en los tres carriles. Con la variable, cada pieza pide el token de ESA cuenta
# (`gh auth token --user`, que no lo imprime) y lo pasa por `GH_TOKEN`, que `gh` y su ayudante de credenciales de git respetan; la cuenta
# activa de la máquina no se toca. Sin la variable, o si esa cuenta no tiene sesión, queda como estaba (y `verificar-entorno.sh` lo dice).
if [ -z "${GH_TOKEN:-}" ] && [ -n "${PILOTO_GH_USUARIO:-}" ] && command -v gh >/dev/null 2>&1; then
  _t=$(gh auth token --user "$PILOTO_GH_USUARIO" 2>/dev/null) && [ -n "$_t" ] && export GH_TOKEN="$_t"
  unset _t
fi

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
