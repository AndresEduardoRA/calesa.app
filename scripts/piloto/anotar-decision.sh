#!/usr/bin/env bash
# Hook PostToolUse sobre `AskUserQuestion` de la sesión de decidir (`decidir.settings.json`). La sesión de decidir no escribe nada:
# escribir en `.git/` preguntaría por permiso en el celular, y ninguna regla allow lo aprueba. La respuesta de la persona la anota
# este hook, que es bash y no el modelo: `<común>/piloto/decision.md`, con el `id` de la compuerta vigente, la opción, las notas y
# «me respondió: «…»» literal. El bucle sólo la acepta si su id es el de la compuerta, si es posterior a `compuerta.md` y si ningún
# paso estaba vivo. Corre sólo con `PILOTO_SESION=decidir`. Se prueba en `anotar-decision.test.ts`.
#
# La doc no detalla `tool_response` de `AskUserQuestion`: se prueba `answers` (pregunta → respuesta), un texto y `content`; si nada
# trae la respuesta se busca el `tool_result` de esa llamada en el transcript, que escribe Claude Code. `decidir.sh --prueba` confirma
# cuál es en la práctica. Nunca tumba la sesión: ante cualquier duda sale con 0 sin escribir (el bucle seguirá esperando).
set -uo pipefail

[ "${PILOTO_SESION:-}" = decidir ] || exit 0
ENTRADA=$(cat)
jq -e 'type == "object"' <<<"$ENTRADA" >/dev/null 2>&1 || exit 0
[ "$(jq -r '.tool_name // ""' <<<"$ENTRADA")" = AskUserQuestion ] || exit 0

COMUN="${PILOTO_COMUN:-}"
[ -n "$COMUN" ] && [ -f "$COMUN/compuerta.md" ] || exit 0
ID=$(sed -n 's/^id: *//p' "$COMUN/compuerta.md" | head -n 1)
[ -n "$ID" ] || exit 0

RESPUESTA=$(jq -r '
  (.tool_response // null) as $r
  | if ($r | type) == "object" and ($r.answers | type) == "object" and ($r.answers | length) > 0 then
      ($r.answers | to_entries | map(.value | tostring) | join(" | "))
    elif ($r | type) == "string" then $r
    elif ($r | type) == "object" and ($r.content | type) == "array" then ($r.content | map(.text // "") | join(" "))
    elif ($r | type) == "object" and ($r.content | type) == "string" then $r.content
    else "" end' <<<"$ENTRADA" 2>/dev/null)

# El respaldo: el transcript de la sesión (lo escribe Claude Code).
if [ -z "$RESPUESTA" ]; then
  TRANSCRIPT=$(jq -r '.transcript_path // empty' <<<"$ENTRADA")
  USO=$(jq -r '.tool_use_id // empty' <<<"$ENTRADA")
  if [ -n "$TRANSCRIPT" ] && [ -n "$USO" ] && [ -r "$TRANSCRIPT" ]; then
    RESPUESTA=$(jq -nRr --arg id "$USO" '
      [inputs | fromjson? | select(type == "object") | .message.content? | arrays | .[]
       | select(.type == "tool_result" and .tool_use_id == $id)
       | (.content | if type == "array" then map(.text // "") | join(" ") else tostring end)] | last // ""' "$TRANSCRIPT" 2>/dev/null)
  fi
fi
[ -n "$RESPUESTA" ] || exit 0

NOTAS=$(jq -r '[(.tool_response | objects | .annotations // {}) | to_entries[]? | .value.notes? // empty] | join(" | ")' <<<"$ENTRADA" 2>/dev/null)
UNA_LINEA=${RESPUESTA//$'\n'/ }

TMP=$(mktemp "$COMUN/decision.XXXXXX") || exit 0
{
  echo "id: $ID"
  echo "opcion: $UNA_LINEA"
  echo "notas: $NOTAS"
  echo "creada: $(date +%s)"
  echo "me respondió: «$UNA_LINEA»"
} >"$TMP"
mv -f "$TMP" "$COMUN/decision.md"
exit 0
