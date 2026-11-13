#!/usr/bin/env bash
# Reparaciones mecánicas (se hace `source` desde bucle.sh y cierre.sh; no se corre solo). Antes de avisar a la persona de una parada que
# sólo es de entorno, el bucle intenta arreglarla UNA vez y lo anota en el registro; si no queda arreglada, avisa como siempre.
#   reparar_disco       libera cachés de Docker y npm (lo que se regenera solo) y vuelve a medir el disco.
#   reparar_funciones   levanta `pnpm funciones` en la sesión de tmux `piloto-funciones` y espera a que estén servidas.
#   reparar_commits     ultimo.json declara de menos (o nada): si todo lo declarado está en el rango, lo completa con el rango entero.
# `PILOTO_REPARAR=0` las apaga (el arnés de pruebas). Los comandos se pueden cambiar con PILOTO_CMD_LIMPIAR y PILOTO_CMD_FUNCIONES.
# Variables que espera: ESTADO, RAIZ, BIN y la función `registro`.

reparar_activo() { [ "${PILOTO_REPARAR:-1}" != 0 ] && [ "${EN_SECO:-0}" != 1 ]; }

disco_ahora() { df --output=pcent "${RAIZ:-/}" 2>/dev/null | tail -n 1 | tr -dc '0-9'; }

# reparar_disco <tope>: 0 si el disco quedó en o bajo el tope.
reparar_disco() {
  local tope="$1" antes despues
  reparar_activo || return 1
  antes=$(disco_ahora)
  registro "reparando solo: el disco está al ${antes} % (tope ${tope} %): libero cachés de Docker y npm."
  if [ -n "${PILOTO_CMD_LIMPIAR:-}" ]; then
    bash -c "$PILOTO_CMD_LIMPIAR" >/dev/null 2>&1 8>&-
  else
    { docker builder prune -f; docker image prune -f; npm cache clean --force; } >/dev/null 2>&1 8>&-
  fi
  despues=$(disco_ahora)
  registro "disco: ${antes} % → ${despues} %."
  [ -n "$despues" ] && [ "$despues" -le "$tope" ]
}

# reparar_funciones: 0 si las funciones edge quedaron servidas (según hechos.sh).
reparar_funciones() {
  local i faltan
  reparar_activo || return 1
  # Una sesión por carril: cada uno sirve las de su stack, y con un nombre común un carril mataba las de otro.
  local sesion="piloto-funciones${PILOTO_CARRIL:+-$PILOTO_CARRIL}"
  registro "reparando solo: levanto las funciones edge (sesión tmux $sesion)."
  if [ -n "${PILOTO_CMD_FUNCIONES:-}" ]; then
    bash -c "$PILOTO_CMD_FUNCIONES" >/dev/null 2>&1 8>&-
  else
    tmux kill-session -t "$sesion" 2>/dev/null
    tmux new-session -d -s "$sesion" -c "$RAIZ" 'pnpm funciones' 8>&- || return 1
  fi
  for i in $(seq 1 "${PILOTO_ESPERA_FUNCIONES:-60}"); do
    faltan=$(bash "$BIN/hechos.sh" 2>/dev/null 8>&- | jq -r 'if (.funciones | type) == "object" then [.funciones | to_entries[] | select(.value != true) | .key] | join(", ") else "no se pudo mirar" end' 2>/dev/null)
    [ -z "$faltan" ] && { registro "funciones edge servidas."; return 0; }
    sleep "${PILOTO_POLL_FUNCIONES:-3}"
  done
  registro "las funciones edge no quedaron servidas: $faltan."
  return 1
}

# reparar_commits <desde>: ultimo.json declara una parte de los commits del rango (un arreglo de CI, un commit de otra sesión). Si todos los
# declarados existen y están en el rango, se completa con el rango entero (con respaldo en ultimo.json.antes-de-completar).
reparar_commits() {
  local desde="$1" c completo en_rango=() declarados=()
  reparar_activo || return 1
  # Sólo los commits propios del paso (cierre.sh › rango_propio): lo que vino de main al traerlo no se le atribuye al paso.
  mapfile -t en_rango < <(rango_propio "$desde" | while read -r c; do git rev-parse --short=8 "$c"; done)
  mapfile -t declarados < <(jq -r '.commits[]' "$ESTADO/ultimo.json" 2>/dev/null)
  # Cero declarados también se completa: el 8.13 del 12-11 hizo su commit, la sesión siguió (otra vuelta, la misma rama) y el cierre dijo
  # «sin commits propios en esta sesión»; el carril quedó reintentando 30 min por vuelta. El rango sale de head_arranque: es del paso.
  [ "${#declarados[@]}" -lt "${#en_rango[@]}" ] || return 1
  for c in "${declarados[@]}"; do
    completo=$(git rev-parse --verify --quiet --short=8 "$c^{commit}") || return 1
    printf '%s\n' "${en_rango[@]}" | grep -qx "$completo" || return 1
  done
  cp "$ESTADO/ultimo.json" "$ESTADO/ultimo.json.antes-de-completar"
  jq -c --argjson c "$(printf '%s\n' "${en_rango[@]}" | tac | jq -R . | jq -sc .)" '.commits = $c' "$ESTADO/ultimo.json.antes-de-completar" >"$ESTADO/ultimo.json.tmp" &&
    mv -f "$ESTADO/ultimo.json.tmp" "$ESTADO/ultimo.json" || return 1
  registro "reparando solo: ultimo.json declaraba ${#declarados[@]} commits y el rango tiene ${#en_rango[@]}; lo completé."
}
