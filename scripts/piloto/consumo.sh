#!/usr/bin/env bash
# Una línea por llamada a `.piloto/consumo.csv` (el registro de gasto del piloto). Se prueba en `consumo.test.ts`.
#
#   consumo.sh llamada   <llamada> <paso> <modelo> <effort> <resultado> <salida.json>   una llamada `claude -p --output-format json`
#   consumo.sh transcript <llamada> <paso> <modelo> <effort> <resultado> <transcript.jsonl>   la sesión de decidir (interactiva)
#
# Las columnas: fecha,llamada,paso,modelo,effort,session_id,tokens_entrada,tokens_salida,tokens_cache_lectura,
# tokens_cache_escritura,tokens,total_cost_usd,duracion_s,resultado.
# Los tokens son la suma de `modelUsage` (incluye a los subagentes; `usage` no). Con `--resume` el JSON acumula toda la sesión: se
# resta lo que `.piloto/sesiones/<session_id>.json` dice que ya llevaba, y ahí quedan los totales nuevos. El JSON entero queda en
# `.piloto/llamadas/<fecha>-<llamada>.json`. El transcript no trae dólares ni duración: esas columnas van vacías.
# Un fallo de consumo nunca tumba al bucle: avisa por stderr y sale con 0.
set -uo pipefail

ESTADO="${PILOTO_DIR:-.piloto}"
MODO="${1:-}" LLAMADA="${2:-}" PASO="${3:-}" MODELO="${4:-}" EFFORT="${5:-}" RESULTADO="${6:-}" FUENTE="${7:-}"
CABECERA='fecha,llamada,paso,modelo,effort,session_id,tokens_entrada,tokens_salida,tokens_cache_lectura,tokens_cache_escritura,tokens,total_cost_usd,duracion_s,resultado'

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
      entrada: ([.modelUsage[]? | .inputTokens // 0] | add // 0),
      salida: ([.modelUsage[]? | .outputTokens // 0] | add // 0),
      cache_lectura: ([.modelUsage[]? | .cacheReadInputTokens // 0] | add // 0),
      cache_escritura: ([.modelUsage[]? | .cacheCreationInputTokens // 0] | add // 0)
    }' "$FUENTE") || aviso "no se pudo leer $FUENTE."
    cp "$FUENTE" "$ESTADO/llamadas/$SELLO-$LLAMADA.json" 2>/dev/null
    ;;
  transcript)
    TOTALES=$(jq -nRc --arg sid "$(basename "$FUENTE" .jsonl)" '
      [inputs | fromjson? | select(type == "object" and .type == "assistant") | .message.usage // empty] as $u
      | { sid: $sid, usd: null, ms: null,
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
  --arg effort "$EFFORT" --arg resultado "$RESULTADO" '
  def resta(k): [($t[k] // 0) - ($a[k] // 0), 0] | max;
  (resta("entrada")) as $e | (resta("salida")) as $s | (resta("cache_lectura")) as $cl | (resta("cache_escritura")) as $ce
  | ($t.usd | if . == null then "" else ([. - ($a.usd // 0), 0] | max | . * 10000 | round / 10000) end) as $usd
  | ($t.ms | if . == null then "" else (. / 1000 | round) end) as $dur
  | [$fecha, $llamada, $paso, $modelo, $effort, $t.sid, $e, $s, $cl, $ce, ($e + $s + $cl + $ce), $usd, $dur, $resultado]
  | map(tostring) | join(",")') || aviso "no se pudo armar la línea."

[ -s "$ESTADO/consumo.csv" ] || echo "$CABECERA" >"$ESTADO/consumo.csv"
echo "$FILA" >>"$ESTADO/consumo.csv"

# Los totales de la sesión para la próxima resta (sólo con JSON: el transcript no se retoma).
if [ "$MODO" = llamada ] && [ -n "$SID" ]; then
  jq -c '{ entrada, salida, cache_lectura, cache_escritura, usd }' <<<"$TOTALES" >"$ESTADO/sesiones/$SID.json"
fi
exit 0
