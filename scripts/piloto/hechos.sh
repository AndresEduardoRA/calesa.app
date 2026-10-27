#!/usr/bin/env bash
# Los hechos de cada vuelta del bucle, sin modelo: un JSON por stdout (el bucle lo guarda en `.piloto/hechos.json`). El ruteo y el
# paso leen de aquí lo que necesitaría un comando: el ruteo no tiene Bash. Se prueba en `hechos.test.ts`.
#
# hora (La Paz), rama, head, origin_main, arbol_limpio, disco_pct, candado {libre, dueno}, ci (el último de main, o null),
# e2e (`cuenta-e2e.mjs` sobre docs/BITACORA.md), bytes_estado, ultimo (.piloto/ultimo.json), en_curso (.piloto/en-curso.json),
# fallas_seguidas, nota (la del ensayo en seco) y decision (el texto de la decisión vigente: la del `decision.md` cuyo id es el de la
# `compuerta.md` actual, hasta 8.000 B: la de «producto» trae una línea por decisión; el paso la lee de aquí porque no puede abrir esos
# archivos).
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1

HORA=$(ahora_lapaz)
RAMA=$(git symbolic-ref --quiet --short HEAD || echo "")
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
ORIGIN=$(git rev-parse --verify --quiet origin/main 2>/dev/null || echo "")
[ -z "$(git status --porcelain 2>/dev/null)" ] && LIMPIO=true || LIMPIO=false
DISCO=$(df --output=pcent / 2>/dev/null | tail -n 1 | tr -dc '0-9')

# El candado de la base: libre si se puede tomar un instante; si no, lo que dice su registro.
DIR_CANDADO="${CANDADO_DIR:-$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)}"
LIBRE=true
DUENO=""
if [ -e "$DIR_CANDADO/candado-base.lock" ] && ! flock -n "$DIR_CANDADO/candado-base.lock" true 2>/dev/null; then
  LIBRE=false
  DUENO=$(tr '\n' ';' <"$DIR_CANDADO/candado-base.info" 2>/dev/null)
fi

# El último CI de main: null si `gh` no responde (sin red, sin sesión).
CI=$(timeout 20 gh run list --branch main --limit 1 --json databaseId,status,conclusion,headSha,displayTitle 2>/dev/null | jq -c '.[0] // null' 2>/dev/null)
[ -n "$CI" ] || CI=null

E2E=$(node "$BIN/cuenta-e2e.mjs" docs/BITACORA.md 2>/dev/null)
jq -e . >/dev/null 2>&1 <<<"$E2E" || E2E=null
BYTES_ESTADO=$(wc -c <docs/ESTADO.md 2>/dev/null | tr -d ' ')

FALLAS=$(cat "$ESTADO/fallas" 2>/dev/null)
NOTA=""
[ -s "$ESTADO/nota-en-seco.md" ] && NOTA=$(head -c 6000 "$ESTADO/nota-en-seco.md")

# La decisión vigente: sólo si es de la compuerta de ahora.
DECISION=""
if [ -s "$COMUN/compuerta.md" ] && [ -s "$COMUN/decision.md" ]; then
  ID_C=$(sed -n 's/^id: *//p' "$COMUN/compuerta.md" | head -n 1)
  ID_D=$(sed -n 's/^id: *//p' "$COMUN/decision.md" | head -n 1)
  [ -n "$ID_C" ] && [ "$ID_C" = "$ID_D" ] && DECISION=$(head -c 8000 "$COMUN/decision.md")
fi

jq -n \
  --arg hora "$HORA" --arg rama "$RAMA" --arg head "$HEAD_SHA" --arg origin "$ORIGIN" \
  --argjson limpio "$LIMPIO" --arg disco "$DISCO" --argjson libre "$LIBRE" --arg dueno "$DUENO" \
  --argjson ci "$CI" --argjson e2e "$E2E" --arg bytes "${BYTES_ESTADO:-0}" \
  --argjson ultimo "$(json_o_null "$ESTADO/ultimo.json")" --argjson en_curso "$(json_o_null "$ESTADO/en-curso.json")" \
  --arg fallas "${FALLAS:-0}" --arg nota "$NOTA" --arg decision "$DECISION" '{
    hora: $hora,
    rama: $rama,
    head: $head,
    origin_main: (if $origin == "" then null else $origin end),
    arbol_limpio: $limpio,
    disco_pct: (if $disco == "" then null else ($disco | tonumber) end),
    candado: { libre: $libre, dueno: (if $dueno == "" then null else $dueno end) },
    ci: $ci,
    e2e: $e2e,
    bytes_estado: ($bytes | tonumber? // null),
    ultimo: $ultimo,
    en_curso: $en_curso,
    fallas_seguidas: ($fallas | tonumber? // 0),
    nota: (if $nota == "" then null else $nota end),
    decision: (if $decision == "" then null else $decision end)
  }'
