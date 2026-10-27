#!/usr/bin/env bash
# Una línea por llamada a `.piloto/consumo.csv` (el registro de gasto del piloto). Se prueba en `consumo.test.ts`.
#
#   consumo.sh llamada   <llamada> <paso> <modelo> <effort> <resultado> <salida.json> [segundos]   una llamada `claude -p --output-format json`
#   consumo.sh transcript <llamada> <paso> <modelo> <effort> <resultado> <transcript.jsonl>   la sesión de decidir (interactiva)
#
# Las columnas: fecha,llamada,paso,modelo,effort,session_id,tokens_entrada,tokens_salida,tokens_cache_lectura,
# tokens_cache_escritura,tokens,total_cost_usd,duracion_s,resultado,usd_por_modelo.
# Los tokens son la suma de `modelUsage` (incluye a los subagentes; `usage` no) y `usd_por_modelo` sus `costUSD`, modelo=usd separados
# por «;». Con `--resume` el JSON acumula toda la sesión: se resta lo que `.piloto/sesiones/<session_id>.json` dice que ya llevaba
# (también modelo por modelo), y ahí quedan los totales nuevos. `segundos` es el reloj del bucle alrededor de la llamada: el
# `duration_ms` del JSON es el del último turno (en el 4.13-3b dio 192 s por 50,6 min); sin él, se usa ése. El JSON entero queda en
# `.piloto/llamadas/<fecha>-<llamada>.json`. El transcript no trae dólares ni duración: esas columnas van vacías, y cada mensaje
# cuenta una vez (el transcript lo repite por cada bloque con el mismo `message.id`: +9 % en el 4.13-3b).
# Un fallo de consumo nunca tumba al bucle: avisa por stderr y sale con 0.
set -uo pipefail

ESTADO="${PILOTO_DIR:-.piloto}"
MODO="${1:-}" LLAMADA="${2:-}" PASO="${3:-}" MODELO="${4:-}" EFFORT="${5:-}" RESULTADO="${6:-}" FUENTE="${7:-}" SEGUNDOS="${8:-}"
CABECERA_VIEJA='fecha,llamada,paso,modelo,effort,session_id,tokens_entrada,tokens_salida,tokens_cache_lectura,tokens_cache_escritura,tokens,total_cost_usd,duracion_s,resultado'
CABECERA="$CABECERA_VIEJA,usd_por_modelo"

aviso() {
  echo "consumo: $1" >&2
  exit 0
}

[ -s "$FUENTE" ] || aviso "no hay $FUENTE: no se anota esta llamada."
mkdir -p "$ESTADO/llamadas" "$ESTADO/sesiones" || aviso "no se pudo crear $ESTADO."
FECHA=$(TZ=America/La_Paz date +%Y-%m-%dT%H:%M:%S%:z)
SELLO=$(TZ=America/La_Paz date +%Y%m%dT%H%M%S)

case "$MODO" in
  llamada)
    jq -e 'type == "object"' "$FUENTE" >/dev/null 2>&1 || aviso "$FUENTE no es el JSON de una llamada: no se anota."
    TOTALES=$(jq -c '{
      sid: (.session_id // ""),
      usd: (.total_cost_usd // 0),
      ms: (.duration_ms // 0),
      por_modelo: (.modelUsage // {} | if type == "object" then map_values(.costUSD // 0) else {} end),
      entrada: ([.modelUsage[]? | .inputTokens // 0] | add // 0),
      salida: ([.modelUsage[]? | .outputTokens // 0] | add // 0),
      cache_lectura: ([.modelUsage[]? | .cacheReadInputTokens // 0] | add // 0),
      cache_escritura: ([.modelUsage[]? | .cacheCreationInputTokens // 0] | add // 0)
    }' "$FUENTE") || aviso "no se pudo leer $FUENTE."
    cp "$FUENTE" "$ESTADO/llamadas/$SELLO-$LLAMADA.json" 2>/dev/null
    ;;
  transcript)
    TOTALES=$(jq -nRc --arg sid "$(basename "$FUENTE" .jsonl)" '
      [inputs | fromjson? | select(type == "object" and .type == "assistant" and (.message.usage | type) == "object")] as $m
      | ([$m[] | select(.message.id == null)] + ([$m[] | select(.message.id != null)] | group_by(.message.id) | map(last))
         | map(.message.usage)) as $u
      | { sid: $sid, usd: null, ms: null, por_modelo: null,
          entrada: ($u | map(.input_tokens // 0) | add // 0),
          salida: ($u | map(.output_tokens // 0) | add // 0),
          cache_lectura: ($u | map(.cache_read_input_tokens // 0) | add // 0),
          cache_escritura: ($u | map(.cache_creation_input_tokens // 0) | add // 0) }' "$FUENTE") ||
      aviso "no se pudo leer el transcript $FUENTE."
    ;;
  *) aviso "modo «$MODO» desconocido (llamada | transcript)." ;;
esac

SID=$(jq -r '.sid' <<<"$TOTALES")
ANTERIOR='{}'
[ -n "$SID" ] && [ -s "$ESTADO/sesiones/$SID.json" ] && ANTERIOR=$(cat "$ESTADO/sesiones/$SID.json")

# Lo de esta llamada = los totales de ahora menos lo que la sesión ya llevaba (nunca negativo).
FILA=$(jq -nr --argjson t "$TOTALES" --argjson a "$ANTERIOR" \
  --arg fecha "$FECHA" --arg llamada "$LLAMADA" --arg paso "${PASO//,/ }" --arg modelo "$MODELO" \
  --arg effort "$EFFORT" --arg resultado "$RESULTADO" --arg segundos "$SEGUNDOS" '
  def resta(k): [($t[k] // 0) - ($a[k] // 0), 0] | max;
  (resta("entrada")) as $e | (resta("salida")) as $s | (resta("cache_lectura")) as $cl | (resta("cache_escritura")) as $ce
  | ($t.usd | if . == null then "" else ([. - ($a.usd // 0), 0] | max | . * 10000 | round / 10000) end) as $usd
  | (if $segundos != "" then $segundos else ($t.ms | if . == null then "" else (. / 1000 | round) end) end) as $dur
  | ($t.por_modelo | if . == null then "" else
      (to_entries | sort_by(.key)
       | map("\(.key)=\([.value - ($a.por_modelo[.key] // 0), 0] | max | . * 10000 | round / 10000)") | join(";")) end) as $pm
  | [$fecha, $llamada, $paso, $modelo, $effort, $t.sid, $e, $s, $cl, $ce, ($e + $s + $cl + $ce), $usd, $dur, $resultado, $pm]
  | map(tostring) | join(",")') || aviso "no se pudo armar la línea."

[ -s "$ESTADO/consumo.csv" ] || echo "$CABECERA" >"$ESTADO/consumo.csv"
# Un consumo.csv de antes de `usd_por_modelo`: gana la columna (vacía en sus líneas) sin perder ninguna.
if [ "$(head -n 1 "$ESTADO/consumo.csv")" = "$CABECERA_VIEJA" ]; then
  { echo "$CABECERA"; tail -n +2 "$ESTADO/consumo.csv" | sed 's/$/,/'; } >"$ESTADO/consumo.csv.tmp" && mv -f "$ESTADO/consumo.csv.tmp" "$ESTADO/consumo.csv"
fi
echo "$FILA" >>"$ESTADO/consumo.csv"

# Los totales de la sesión para la próxima resta (sólo con JSON: el transcript no se retoma).
if [ "$MODO" = llamada ] && [ -n "$SID" ]; then
  jq -c '{ entrada, salida, cache_lectura, cache_escritura, usd, por_modelo }' <<<"$TOTALES" >"$ESTADO/sesiones/$SID.json"
fi
exit 0
