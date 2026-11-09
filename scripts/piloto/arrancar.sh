#!/usr/bin/env bash
# Arranca (o re-arranca) el piloto. Lo corre la persona, desde el árbol:  bash scripts/piloto/arrancar.sh [opciones del bucle]
#
# 1. Copia las piezas de `scripts/piloto/` (`*.sh`, `*.mjs`, `*.json`; ninguna prueba ni su arnés) a `<carpeta común de git>/piloto/bin/`, anota un sha256 por archivo en `bin.sha256` y deja
#    la copia de sólo lectura. Es lo único que escribe esa copia, y es la que corre el bucle: un paso no puede cambiar el código con
#    que se lo verifica y publica. Tras una compuerta «guardas» sobre `scripts/piloto/` hay que volver a correr esto.
# 2. Lanza `<común>/piloto/bin/bucle.sh` en una sesión de tmux (`piloto-bucle`), y una sesión ociosa de control (`piloto-control`, con
#    Remote Control: desde el celular «¿cómo va?», «para», «para ya»; sin turnos no gasta).
# Con `--en-seco [--nota <archivo>]` el bucle corre en primer plano, un ruteo real y el paso sin ejecutar nada (ver docs/PILOTO.md).
# Retomar tras un reinicio: correr esto de nuevo; un paso a medias se retoma con `--resume`.
# Con `--si-caido` (el vigía de systemd, scripts/maquina/instalar-servicios.sh) sólo arranca si el bucle del carril no corre (nadie tiene
# `.piloto/bucle.lock`) y no se paró a propósito (PARAR, «parado» de la persona, el carril terminó o llegó a `--hasta`): un bucle que se cayó,
# un tmux que se cerró o un reinicio ya no dejan el carril quieto hasta que alguien lo note. Una sesión de tmux con el bucle ya terminado se cierra.
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1

falta() { echo "arrancar: $1" >&2; exit 1; }
# `--carril <id>`: este árbol es el de un carril de docs/plan.yaml; el bucle le pide sus pasos al coordinador (carril.sh). La sesión de tmux
# pasa a llamarse `piloto-bucle-<id>` y se lanza (una vez) el coordinador, `piloto-coordinador`, que integra los PR verdes.
CARRIL=""
SI_CAIDO=0
ARGS=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --carril) CARRIL="${2:-}"; [ -n "$CARRIL" ] || falta "--carril pide el id del carril."; shift 2 ;;
    --si-caido) SI_CAIDO=1; shift ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
set -- "${ARGS[@]+"${ARGS[@]}"}"
SESION="piloto-bucle${CARRIL:+-$CARRIL}"
# El coordinador, uno por máquina: corre mientras tiene `<común>/coordinador/sincronizar.lock`. Si nadie lo tiene, se cierra la sesión de
# tmux que haya quedado (su panel espera un Enter y `has-session` la daba por viva) y se lanza de nuevo. Su registro es uno, común y con
# fecha (`<común>/coordinador/coordinador.log`); antes quedaba repartido en el `.piloto/` del carril que lo hubiera lanzado.
asegurar_coordinador() {
  [ -n "$CARRIL" ] && [ -f "$RAIZ/scripts/coordinador/sincronizar.sh" ] || return 0
  local dir
  dir="$(dirname "$COMUN")/coordinador"
  mkdir -p "$dir"
  [ -f "$dir/PARAR" ] && return 0
  flock -n "$dir/sincronizar.lock" true 2>/dev/null || return 0
  tmux kill-session -t piloto-coordinador 2>/dev/null
  tmux new-session -d -s piloto-coordinador -c "$RAIZ" "bash scripts/coordinador/sincronizar.sh 2>&1 | tee -a '$dir/coordinador.log'; echo; echo 'El coordinador terminó. Enter para cerrar.'; read -r"
}
if [ "$SI_CAIDO" = 1 ]; then
  [ -f "$ESTADO/PARAR" ] && exit 0
  mkdir -p "$ESTADO"
  # Con el bucle vivo, el vigía sólo mira que el coordinador también lo esté.
  flock -n "$ESTADO/bucle.lock" true 2>/dev/null || { asegurar_coordinador; exit 0; }
  case "$(tail -n 1 "$ESTADO/registro.md" 2>/dev/null)" in
    *"parado por la persona"* | *"parado (decisión automática"* | *"PARAR"* | *"no tiene más pasos"* | *"llegamos a "* | *"no ve ningún paso por avanzar"*) exit 0 ;;
  esac
  echo "arrancar: el bucle de ${CARRIL:-este árbol} no corría y nadie lo paró: lo levanto." >&2
  echo "- $(ahora_lapaz) vigía: el bucle no corría y nadie lo paró: lo levanto." >>"$ESTADO/registro.md"
  tmux kill-session -t "$SESION" 2>/dev/null
fi
for programa in git jq flock tmux node; do command -v "$programa" >/dev/null || falta "falta $programa en el PATH."; done
CLAUDE=$(claude_bin)
[ -n "$CLAUDE" ] || falta "no encuentro el binario de claude (CLAUDE_BIN, o la extensión de VS Code)."
gh auth status >/dev/null 2>&1 || echo "arrancar: AVISO: gh no está autenticado; el CI no se podrá mirar." >&2
[ -d "$(dirname "$COMUN")" ] || falta "no hay carpeta común de git."

# 1. La copia, de origin/main (copiar-bin.sh): la de un carril que va atrás de main ya no pisa la de los otros. Si la que hay ya es la de
# main y está entera, se usa ésa: una carpeta nueva en cada arranque hacía relanzarse a los otros carriles («los scripts cambiaron en
# main») sin que nada hubiera cambiado.
git remote get-url origin >/dev/null 2>&1 && { timeout 60 git fetch -q origin main 2>/dev/null || echo "arrancar: AVISO: git fetch falló; copio el origin/main que hay." >&2; }
if [ "${PILOTO_COPIA_DESDE:-}" != arbol ] && git rev-parse --verify --quiet "origin/main:scripts/piloto" >/dev/null 2>&1 &&
  [ -s "$COMUN/bin/bin.sha256" ] && (cd "$COMUN/bin" && sha256sum -c --quiet bin.sha256 >/dev/null 2>&1); then
  bash scripts/piloto/copiar-bin.sh --si-cambio
  case "$?" in 0 | 10) ;; *) falta "no pude poner al día la copia de los scripts del piloto." ;; esac
else
  bash scripts/piloto/copiar-bin.sh || falta "no pude hacer la copia de los scripts del piloto."
fi

# Lo que quedó de una compuerta humana de antes (un bucle que se relanzó sin respuesta no la cierra): sin bucle, no espera a nadie.
if flock -n "$ESTADO/bucle.lock" true 2>/dev/null; then
  rm -f "$ESTADO/compuerta.md" "$ESTADO/decidir-sesion"
  if [ -f "$COMUN/compuerta.md" ] && [ "$(sed -n 's/^carril: *//p' "$COMUN/compuerta.md" | head -n 1)" = "${CARRIL:-a}" ] &&
    flock -n "$COMUN/compuerta.lock" true 2>/dev/null; then
    mv -f "$COMUN/compuerta.md" "$COMUN/compuerta.md.vieja-$(date +%s)"
  fi
fi

# 2. El bucle.
if [[ " $* " == *" --en-seco "* ]]; then
  exec bash "$COMUN/bin/bucle.sh" "$@"
fi
tmux has-session -t "$SESION" 2>/dev/null && falta "ya hay una sesión de tmux «$SESION»: tmux attach -t $SESION (o bash scripts/piloto/parar.sh)."
tmux new-session -d -s "$SESION" -c "$RAIZ" "${CARRIL:+PILOTO_CARRIL='$CARRIL' }bash '$COMUN/bin/bucle.sh' $* 2>&1 | tee -a '$ESTADO/bucle.log'; echo; echo 'El bucle terminó (¿PARAR, una compuerta o un error?). Enter para cerrar.'; read -r"
if ! tmux has-session -t piloto-control 2>/dev/null; then
  tmux new-session -d -s piloto-control -c "$RAIZ" \
    "env PILOTO_SESION=control ENABLE_CLAUDEAI_MCP_SERVERS=false '$CLAUDE' --remote-control 'piloto · control' --model sonnet --effort low --tools 'Read,Bash' --disallowedTools 'mcp__*' --no-chrome --allowedTools 'Read' 'Bash(touch .piloto/PARAR)' 'Bash(bash scripts/piloto/parar.sh*)' 'Bash(cat .piloto/*)' 'Bash(tail *)' '/piloto-control'"
fi
asegurar_coordinador
# Sin carril: el vigilante abre solo los carriles b y c cuando 4.15-4 llegó a origin/main y hay disco y RAM (auto-carriles.sh).
if [ -z "$CARRIL" ] && ! tmux has-session -t piloto-auto-carriles 2>/dev/null && [ -f "$COMUN/bin/auto-carriles.sh" ]; then
  tmux new-session -d -s piloto-auto-carriles -c "$RAIZ" "bash '$COMUN/bin/auto-carriles.sh' 2>&1 | tee -a '$ESTADO/auto-carriles.log'; echo; echo 'El vigilante terminó.'; sleep 86400"
fi
echo "arrancar: bucle en «tmux attach -t $SESION»; control en «piloto-control» (Remote Control)."
