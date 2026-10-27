#!/usr/bin/env bash
# El gasto del paso entero (se hace `source` desde bucle.sh; no se corre solo). `--max-budget-usd` vale por invocación y una retoma
# empieza de cero, así que el bucle lleva en `en-curso.json` lo gastado (`usd`: el `total_cost_usd` del último JSON, que es acumulado
# de la sesión) y pasa a cada llamada lo que queda de PILOTO_TOPE_USD_PASO más `tope_extra` (el 50 % que la persona puede sumar una
# sola vez en la parada del tope). En el 4.13-3b, con topes por llamada y un reintento cada una, el peor caso era 200 USD; el paso
# costó 43,55 (`docs/DECISIONES.md`, «CAL-1»). Se prueba en `bucle-topes.test.ts`.
#
# Variables que espera: ESTADO, TOPE_PASO, TOPE_MIN y las funciones `parada` y `registro`.

dinero() { LC_ALL=C awk -v n="$1" 'BEGIN { printf "%.2f", n }'; }
gastado() { jq -r '.usd // 0' "$ESTADO/en-curso.json" 2>/dev/null || echo 0; }
tope_del_paso() { LC_ALL=C awk -v t="$TOPE_PASO" -v e="$(jq -r '.tope_extra // 0' "$ESTADO/en-curso.json" 2>/dev/null || echo 0)" 'BEGIN { print t + e }'; }
restante() { LC_ALL=C awk -v t="$(tope_del_paso)" -v g="$(gastado)" 'BEGIN { printf "%.2f", t - g }'; }
le_queda() { LC_ALL=C awk -v r="$(restante)" -v m="$TOPE_MIN" 'BEGIN { exit !(r >= m) }'; }
anotar_gasto() { # <salida.json>
  local usd
  usd=$(jq -r '.total_cost_usd // empty | numbers' "$1" 2>/dev/null)
  [ -n "$usd" ] && [ -f "$ESTADO/en-curso.json" ] || return 0
  jq -c --argjson u "$usd" '.usd = ([(.usd // 0), $u] | max)' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" &&
    mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
}

# La parada del tope: «sigo» suma el 50 % del tope una sola vez; después sólo parado o reintentar (que vuelve a mirar el gasto).
parada_tope() { # <paso>
  local paso="$1" extra mas opciones=('parado — no sigue (recomendado)') rc
  extra=$(jq -r '.tope_extra // 0' "$ESTADO/en-curso.json" 2>/dev/null || echo 0)
  mas=$(dinero "$(LC_ALL=C awk -v t="$TOPE_PASO" 'BEGIN { print t * 0.5 }')")
  [ "$extra" = 0 ] && opciones+=("sigo — $mas USD más, una sola vez")
  opciones+=('reintentar — vuelve a mirar el gasto')
  parada "el paso $paso gastó $(dinero "$(gastado)") de $(dinero "$(tope_del_paso)") USD (el tope del paso entero)" "$paso" "${opciones[@]}"
  rc=$?
  if [ "$rc" = 2 ] && [ "$extra" = 0 ]; then
    jq -c --argjson m "$mas" '.tope_extra = $m' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" &&
      mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
    registro "el paso $paso sigue con $mas USD más (una sola vez)."
  fi
  return 0
}
