#!/usr/bin/env bash
# Los hechos de cada vuelta del bucle, sin modelo: un JSON por stdout (el bucle lo guarda en `.piloto/hechos.json`). El ruteo y el
# paso leen de aquí lo que necesitaría un comando: el ruteo no tiene Bash. Se prueba en `hechos.test.ts`.
#
# hora (La Paz), rama, head, origin_main, arbol_limpio, disco_pct, candado {libre, dueno}, ci (el último de main, o null),
# e2e (`cuenta-e2e.mjs` sobre docs/BITACORA.md), bytes_estado, ultimo (.piloto/ultimo.json), en_curso (.piloto/en-curso.json),
# fallas_seguidas, nota (la del ensayo en seco), funciones (las edge que exige el e2e completo: servida o no) y decision (el texto de la decisión vigente: la del `decision.md` cuyo id es el de la
# `compuerta.md` actual, hasta 8.000 B: la de «producto» trae una línea por decisión; el paso la lee de aquí porque no puede abrir esos
# archivos).
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1
# El stack de este worktree: la principal o el carril A, cuyo `.env.carril` trae PILOTO_SUPABASE_URL y el puerto de la base (lo carga
# scripts/lib/carril.sh, del árbol: la copia de las piezas en bin/ no lo lleva).
# shellcheck source=../lib/carril.sh
[ -f "$RAIZ/scripts/lib/carril.sh" ] && source "$RAIZ/scripts/lib/carril.sh"

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
CANDADO="$DIR_CANDADO/candado-base-${SUPABASE_DB_PORT:-54622}" # el nombre de ruta_del_candado (scripts/lib/carril.sh)
if [ -e "$CANDADO.lock" ] && ! flock -n "$CANDADO.lock" true 2>/dev/null; then
  LIBRE=false
  DUENO=$(tr '\n' ';' <"$CANDADO.info" 2>/dev/null)
fi

# El último CI de main: null si `gh` no responde (sin red, sin sesión).
CI=$(timeout 20 gh run list --branch main --limit 1 --json databaseId,status,conclusion,headSha,displayTitle 2>/dev/null | jq -c '.[0] // null' 2>/dev/null)
[ -n "$CI" ] || CI=null

E2E=$(node "$BIN/cuenta-e2e.mjs" docs/BITACORA.md 2>/dev/null)
jq -e . >/dev/null 2>&1 <<<"$E2E" || E2E=null
BYTES_ESTADO=$(wc -c <docs/ESTADO.md 2>/dev/null | tr -d ' ')

# Las funciones edge que exige `pnpm test:e2e:completo` (el Nivel 2): el bucle no las levanta, así que mira si están servidas antes de
# un paso que las pide. La regla de `e2e/soporte/guardia.ts`: `OPTIONS` (no ejecuta nada ni llama a apibara), servida si responde y no
# es 404 ni ≥ 500; dos intentos de 2 s. La API del stack local está en el 54621 (PILOTO_SUPABASE_URL, de `.env.carril`, en un carril).
URL_SUPABASE="${PILOTO_SUPABASE_URL:-http://127.0.0.1:54621}"
servida() {
  local codigo intento
  for intento in 1 2; do
    codigo=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS --max-time 2 "$URL_SUPABASE/functions/v1/$1" 2>/dev/null)
    [[ "$codigo" =~ ^[1-4][0-9][0-9]$ ]] && [ "$codigo" != 404 ] && return 0
  done
  return 1
}
FUNCIONES='{}'
for funcion in apibara storage-gc avatares-miniaturas; do
  servida "$funcion" && valor=true || valor=false
  FUNCIONES=$(jq -c --arg f "$funcion" --argjson v "$valor" '.[$f] = $v' <<<"$FUNCIONES")
done

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
  --arg fallas "${FALLAS:-0}" --arg nota "$NOTA" --arg decision "$DECISION" --argjson funciones "$FUNCIONES" '{
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
    funciones: $funciones,
    decision: (if $decision == "" then null else $decision end)
  }'
