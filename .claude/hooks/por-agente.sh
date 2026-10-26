#!/usr/bin/env bash
# Hook PreToolUse sobre Write, Edit, NotebookEdit y Bash (en settings: corre también dentro de los subagentes): hace valer la sola lectura
# del auditor y del planificador sin depender de que la carpeta esté confiada. Los hooks del frontmatter de un agente (`auditor.md`,
# `planificador.md`) sólo corren con la carpeta confiada, y `claude -p` en una carpeta sin confiar no los aplica: la sonda del ensayo en
# seco mostró al auditor corriendo `touch .piloto/sonda`. Los hooks de settings sí corren y su entrada trae `agent_type`.
#   auditor, planificador  Bash → solo-lectura.sh · Write/Edit/NotebookEdit → el auditor nunca; el planificador por escribir-solo-en-piloto.sh
#   cualquier otro agente, o la sesión principal (sin agent_type)  → no se toca
# Se prueba en `scripts/guardas/por-agente.test.ts`. Los hooks del frontmatter se dejan: cuando la carpeta sí está confiada, son una
# segunda vuelta de la misma guarda.
set -uo pipefail

ENTRADA=$(cat)
AGENTE=$(printf '%s' "$ENTRADA" | jq -r '.agent_type // empty' 2>/dev/null)
case "$AGENTE" in
  auditor | planificador) ;;
  *) exit 0 ;;
esac
HERRAMIENTA=$(printf '%s' "$ENTRADA" | jq -r '.tool_name // empty' 2>/dev/null)
HOOKS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$HERRAMIENTA" in
  Bash)
    printf '%s' "$ENTRADA" | bash "$HOOKS/solo-lectura.sh"
    exit $?
    ;;
  Write | Edit | NotebookEdit)
    if [ "$AGENTE" = auditor ]; then
      printf 'por-agente: el auditor no escribe: lee y dictamina.\n' >&2
      exit 2
    fi
    printf '%s' "$ENTRADA" | bash "$HOOKS/escribir-solo-en-piloto.sh"
    exit $?
    ;;
esac
exit 0
