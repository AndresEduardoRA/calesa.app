#!/usr/bin/env bash
# Hook PostToolUse sobre `AskUserQuestion` de la sesión de decidir (`decidir.settings.json`). La sesión de decidir no escribe nada:
# escribir en `.git/` preguntaría por permiso en el celular, y ninguna regla allow lo aprueba. La respuesta de la persona la anota
# este hook, que es bash y no el modelo: `<común>/piloto/decision.md`, con el `id` de la compuerta vigente, la opción, las notas y
# «me respondió: «…»» literal. El bucle sólo la acepta si su id es el de la compuerta, si es posterior a `compuerta.md` y si ningún
# paso estaba vivo. Corre sólo con `PILOTO_SESION=decidir`. Se prueba en `anotar-decision.test.ts`.
#
# La doc no detalla `tool_response` de `AskUserQuestion`: se prueba `answers` (pregunta → respuesta), un texto y `content`; si nada
# trae la respuesta se busca el `tool_result` de esa llamada en el transcript, que escribe Claude Code. `decidir.sh --prueba` confirma
# cuál es en la práctica. Nunca tumba la sesión: ante cualquier duda sale con 0 sin escribir (el bucle seguirá esperando). Con varias
# preguntas (abajo), la decisión se escribe entera o no se escribe.
set -uo pipefail

[ "${PILOTO_SESION:-}" = decidir ] || exit 0
ENTRADA=$(cat)
jq -e 'type == "object"' <<<"$ENTRADA" >/dev/null 2>&1 || exit 0
[ "$(jq -r '.tool_name // ""' <<<"$ENTRADA")" = AskUserQuestion ] || exit 0

COMUN="${PILOTO_COMUN:-}"
[ -n "$COMUN" ] && [ -f "$COMUN/compuerta.md" ] || exit 0
ID=$(sed -n 's/^id: *//p' "$COMUN/compuerta.md" | head -n 1)
[ -n "$ID" ] || exit 0

# Una compuerta con varias preguntas (la de «producto»: `preguntas: N` en compuerta.md, una por decisión, hechas en tandas de hasta 4):
# cada tanda se anota en `decision-parcial-<id>.json` (la respuesta y las notas por `id`: el `header` de la pregunta o, si no, el texto
# de la pregunta), y `decision.md` se escribe recién cuando están todas, con una línea `- <id>: <respuesta>` por decisión, en el orden
# de la compuerta. Una respuesta sin `answers` se busca en el texto («"pregunta"="respuesta"») o en el transcript.
if grep -q '^preguntas: *[0-9]' "$COMUN/compuerta.md"; then
  ESPERADAS=$(sed -n '/^preguntas:/,$p' "$COMUN/compuerta.md" | sed -n 's/^- \([^:]*\): \(.*\)$/\1\t\2/p' |
    jq -Rnc '[inputs | split("\t") | {id: .[0], pregunta: (.[1:] | join("\t"))}]') || exit 0
  TEXTO=$(jq -r '(.tool_response // null) | if type == "string" then .
    elif type == "object" and (.content | type) == "array" then (.content | map(.text // "") | join(" "))
    elif type == "object" and (.content | type) == "string" then .content else "" end' <<<"$ENTRADA" 2>/dev/null)
  if [ -z "$TEXTO" ] && ! jq -e '.tool_response.answers | type == "object"' <<<"$ENTRADA" >/dev/null 2>&1; then
    TRANSCRIPT=$(jq -r '.transcript_path // empty' <<<"$ENTRADA")
    USO=$(jq -r '.tool_use_id // empty' <<<"$ENTRADA")
    if [ -n "$TRANSCRIPT" ] && [ -n "$USO" ] && [ -r "$TRANSCRIPT" ]; then
      TEXTO=$(jq -nRr --arg id "$USO" '
        [inputs | fromjson? | select(type == "object") | .message.content? | arrays | .[]
         | select(.type == "tool_result" and .tool_use_id == $id)
         | (.content | if type == "array" then map(.text // "") | join(" ") else tostring end)] | last // ""' "$TRANSCRIPT" 2>/dev/null)
    fi
  fi
  PARCIAL="$COMUN/decision-parcial-$ID.json"
  PREVIO=$(jq -c 'objects' "$PARCIAL" 2>/dev/null)
  [ -n "$PREVIO" ] || PREVIO='{}'
  NUEVO=$(jq -c --argjson previo "$PREVIO" --argjson esperadas "$ESPERADAS" --arg texto "$TEXTO" '
    (.tool_response | if type == "object" and (.answers | type) == "object" then .answers else {} end) as $ans
    | ([$texto | scan("\"([^\"]+)\"=\"([^\"]*)\"")] | map({key: .[0], value: .[1]}) | from_entries) as $ans_texto
    | (.tool_response | if type == "object" and (.annotations | type) == "object" then .annotations else {} end) as $notas
    | reduce (.tool_input.questions // [])[] as $q ($previo;
        ((first($esperadas[] | select(.id == $q.header) | .id) // first($esperadas[] | select(.pregunta == $q.question) | .id)) // null) as $id
        | ($ans[$q.question] // $ans_texto[$q.question]) as $r
        | if $id == null or $r == null then . else .[$id] = {r: ($r | tostring | gsub("\n"; " ")), n: ($notas[$q.question].notes // "" | tostring | gsub("\n"; " "))} end)' <<<"$ENTRADA" 2>/dev/null) || exit 0
  [ -n "$NUEVO" ] || exit 0
  if ! jq -e --argjson esperadas "$ESPERADAS" '[$esperadas[].id] - keys == []' <<<"$NUEVO" >/dev/null 2>&1; then
    TMP=$(mktemp "$COMUN/decision-parcial.XXXXXX") || exit 0
    echo "$NUEVO" >"$TMP" && mv -f "$TMP" "$PARCIAL"
    exit 0
  fi
  TMP=$(mktemp "$COMUN/decision.XXXXXX") || exit 0
  jq -r --argjson esperadas "$ESPERADAS" --arg id "$ID" --arg creada "$(date +%s)" '
    . as $r | [$esperadas[].id] as $ids
    | "id: \($id)",
      "opcion: \($ids | map("\(.): \($r[.].r)") | join(" · "))",
      "notas: \($ids | map(select($r[.].n != "")) | map("\(.): \($r[.].n)") | join(" | "))",
      "creada: \($creada)",
      "respuestas:",
      ($ids[] | "- \(.): \($r[.].r)"),
      "me respondió: «\($ids | map("\(.): \($r[.].r)") | join("; "))»"' <<<"$NUEVO" >"$TMP" || { rm -f "$TMP"; exit 0; }
  mv -f "$TMP" "$COMUN/decision.md"
  rm -f "$PARCIAL"
  exit 0
fi

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
