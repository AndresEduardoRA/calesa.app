#!/usr/bin/env bash
# La sesión corta de decidir: abre `claude --remote-control` en tmux para que la persona responda desde el celular. Sólo la abre y la
# cierra: la compuerta (`<común>/piloto/compuerta.md`, con un id nuevo) la escribe el bucle, y la decisión la anota el hook
# `anotar-decision.sh` (esa sesión no escribe nada). Se prueba en `decidir.test.ts`.
#
#   decidir.sh abrir     lee compuerta.md, deja su copia de lectura en `.piloto/` (la que lee la skill) y abre la sesión
#                        (`piloto-decidir`); no espera la respuesta
#   decidir.sh cerrar    anota el consumo de la sesión (tokens del transcript), la cierra y borra la copia de lectura
#   decidir.sh --prueba  una compuerta de mentira, para que la persona pruebe el push, la pregunta y el hook la primera vez
#
# La sesión: sonnet, esfuerzo bajo, sólo `Read` y `AskUserQuestion`, con `decidir.settings.json` de la copia (el hook). Con
# `PILOTO_SESION=decidir` los hooks de guarda no la tocan. «Push when actions required» de `/config` hace que la pregunta llegue.
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"

SESION_TMUX="${PILOTO_TMUX_DECIDIR:-piloto-decidir}"
campo() { sed -n "s/^$1: *//p" "$COMUN/compuerta.md" | head -n 1; }

abrir() {
  [ -s "$COMUN/compuerta.md" ] || { echo "decidir: no hay compuerta.md en $COMUN." >&2; exit 1; }
  local tipo paso uuid claude
  tipo=$(campo tipo)
  paso=$(campo paso)
  claude=$(claude_bin)
  [ -n "$claude" ] || { echo "decidir: no encuentro el binario de claude (CLAUDE_BIN)." >&2; exit 1; }
  uuid=$(cat /proc/sys/kernel/random/uuid)
  mkdir -p "$ESTADO"
  echo "$uuid" >"$ESTADO/decidir-sesion"
  # La skill lee la copia de `.piloto/` (no puede abrir `.git/`): se hace aquí, donde se abre la sesión, para que valga con cualquier
  # escritor de la compuerta (el bucle o `--prueba`). Sin la copia la sesión contestaba «No hay una compuerta abierta.».
  cp -f "$COMUN/compuerta.md" "$ESTADO/compuerta.md"
  tmux kill-session -t "$SESION_TMUX" 2>/dev/null
  # El nombre lleva el tipo y el paso (sin comillas): es lo que la persona ve en la lista de sesiones del celular.
  local nombre="piloto · ${tipo//[\'\"]/} ${paso//[\'\"]/}"
  tmux new-session -d -s "$SESION_TMUX" -c "$RAIZ" \
    "env PILOTO=1 PILOTO_SESION=decidir PILOTO_COMUN='$COMUN' PILOTO_BIN='$BIN' PILOTO_DIR='$ESTADO' '$claude' --remote-control '$nombre' --session-id '$uuid' --model sonnet --effort low --tools 'Read,AskUserQuestion' --settings '$BIN/decidir.settings.json' '/piloto-decidir'"
}

cerrar() {
  local uuid transcript
  uuid=$(cat "$ESTADO/decidir-sesion" 2>/dev/null)
  if [ -n "$uuid" ]; then
    transcript=$(ls -t "$HOME"/.claude/projects/*/"$uuid".jsonl 2>/dev/null | head -n 1)
    [ -n "$transcript" ] && PILOTO_DIR="$ESTADO" bash "$BIN/consumo.sh" transcript decidir "$(campo tipo) $(campo paso)" sonnet low listo "$transcript"
  fi
  tmux kill-session -t "$SESION_TMUX" 2>/dev/null
  rm -f "$ESTADO/compuerta.md"
  return 0
}

prueba() {
  mkdir -p "$COMUN"
  local id="prueba-$(date +%s)"
  cat >"$COMUN/compuerta.md" <<EOF
id: $id
creada: $(date +%s)
tipo: prueba
paso: decidir --prueba
motivo: prueba del circuito del celular: el push, la pregunta y el hook que anota la decisión
pregunta: ¿Llegó esta pregunta al celular? Responde cualquier opción (o escribe algo en «Other»).
opciones:
- si llegó — la respuesta debería quedar en decision.md con «me respondió»
- no llegó — igual se cierra la sesión
contexto:
EOF
  rm -f "$COMUN/decision.md"
  abrir || exit 1
  echo "decidir: sesión «$SESION_TMUX» abierta; responde desde el celular (Remote Control). Espero hasta 10 minutos." >&2
  local i
  for i in $(seq 1 120); do
    if [ -s "$COMUN/decision.md" ] && [ "$(sed -n 's/^id: *//p' "$COMUN/decision.md" | head -n 1)" = "$id" ]; then
      echo "decidir: llegó la decisión:" >&2
      cat "$COMUN/decision.md"
      cerrar
      return 0
    fi
    sleep 5
  done
  echo "decidir: no llegó ninguna decisión; se cierra la sesión." >&2
  cerrar
  exit 1
}

case "${1:-}" in
  abrir) abrir ;;
  cerrar) cerrar ;;
  --prueba) prueba ;;
  *) echo "uso: decidir.sh abrir | cerrar | --prueba" >&2; exit 64 ;;
esac
