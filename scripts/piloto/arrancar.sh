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
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1

falta() { echo "arrancar: $1" >&2; exit 1; }
for programa in git jq flock tmux node; do command -v "$programa" >/dev/null || falta "falta $programa en el PATH."; done
CLAUDE=$(claude_bin)
[ -n "$CLAUDE" ] || falta "no encuentro el binario de claude (CLAUDE_BIN, o la extensión de VS Code)."
gh auth status >/dev/null 2>&1 || echo "arrancar: AVISO: gh no está autenticado; el CI no se podrá mirar." >&2
[ -d "$(dirname "$COMUN")" ] || falta "no hay carpeta común de git."

# 1. La copia.
NUEVA="$COMUN/bin.nueva"
mkdir -p "$COMUN"
rm -rf "$NUEVA"
mkdir -p "$NUEVA"
find scripts/piloto -maxdepth 1 -type f \( -name '*.sh' -o -name '*.mjs' -o -name '*.json' \) -exec cp {} "$NUEVA"/ \;
(cd "$NUEVA" && sha256sum -- * >bin.sha256 2>/dev/null; grep -v ' bin.sha256$' bin.sha256 >bin.tmp && mv bin.tmp bin.sha256)
chmod a-w "$NUEVA"/*
chmod -R u+w "$COMUN/bin" 2>/dev/null
rm -rf "$COMUN/bin"
mv "$NUEVA" "$COMUN/bin"
echo "arrancar: copia en $COMUN/bin ($(wc -l <"$COMUN/bin/bin.sha256") archivos, sha256 anotado)."

# 2. El bucle.
if [[ " $* " == *" --en-seco "* ]]; then
  exec bash "$COMUN/bin/bucle.sh" "$@"
fi
tmux has-session -t piloto-bucle 2>/dev/null && falta "ya hay una sesión de tmux «piloto-bucle»: tmux attach -t piloto-bucle (o bash scripts/piloto/parar.sh)."
tmux new-session -d -s piloto-bucle -c "$RAIZ" "bash '$COMUN/bin/bucle.sh' $* 2>&1 | tee -a '$ESTADO/bucle.log'; echo; echo 'El bucle terminó (¿PARAR, una compuerta o un error?). Enter para cerrar.'; read -r"
if ! tmux has-session -t piloto-control 2>/dev/null; then
  tmux new-session -d -s piloto-control -c "$RAIZ" \
    "env PILOTO_SESION=control '$CLAUDE' --remote-control 'piloto · control' --model sonnet --effort low --tools 'Read,Bash' --allowedTools 'Read' 'Bash(touch .piloto/PARAR)' 'Bash(bash scripts/piloto/parar.sh*)' 'Bash(cat .piloto/*)' 'Bash(tail *)' '/piloto-control'"
fi
echo "arrancar: bucle en «tmux attach -t piloto-bucle»; control en «piloto-control» (Remote Control)."
