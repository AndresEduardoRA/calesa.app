#!/usr/bin/env bash
# El piloto de corrido (se hace `source` desde bucle.sh; no se corre solo): lo que hace que nada deje un carril parado esperando a una
# persona que no va a venir (docs/PILOTO.md › «De corrido», 2026-11-09). El límite de uso y la red caída se esperan y se retoma; un paso
# que no cierra se aparca y el carril toma otro; lo del entorno se espera y se reintenta. Se prueba en `bucle-de-corrido.test.ts`,
# `bucle-limite.test.ts` y `bucle-decision.test.ts`.
#
# Variables que espera: COMUN, ESTADO, DORMIR y las funciones `registro`, `coordinador`, `modo_carril`, `auto_nombra`, `sanear`,
# `dormir_atento` y `ahora_lapaz`.

# El texto documentado del límite de uso: «You've hit your session limit · resets 3:45pm». Imprime los segundos que hay que dormir
# (hasta esa hora de La Paz y 5 minutos más; 60 minutos si la hora no se lee). Cómo sale en `-p` no está documentado: se mira el JSON y stderr.
# El límite semanal trae día («resets Nov 12, 3pm», «resets Nov 12 at 3:45pm»): primero se lee todo lo que sigue a «resets» como una fecha;
# si no lo es, sólo la hora. Nunca más de 7 días.
segundos_de_limite() {
  local texto hora objetivo ahora entera
  texto="$(jq -r '(.result // "") + " " + (.error // "")' "$1" 2>/dev/null) $(cat "$2" 2>/dev/null)"
  # «session limit», «weekly limit» y «5-hour limit» (el texto real del 31-oct-2026): entre «your» y «limit» cabe una palabra con cifras y
  # guion. La señal estructurada (429 + usage_limit_reached) vale aunque el texto cambie.
  if ! [[ "$texto" =~ hit\ your\ [A-Za-z0-9\ -]{0,30}limit ]] &&
    ! jq -e '.api_error == "usage_limit_reached"' "$1" >/dev/null 2>&1; then
    return 1
  fi
  ahora=$(date +%s) objetivo=""
  if [[ "$texto" =~ resets\ +(at\ +)?([A-Za-z0-9:,\ ]{1,40}) ]]; then
    entera="${BASH_REMATCH[2]// at / }"
    [[ "$entera" =~ [0-9] ]] && objetivo=$(TZ=America/La_Paz date -d "${entera//,/ }" +%s 2>/dev/null) || objetivo=""
  fi
  if [ -z "$objetivo" ] && [[ "$texto" =~ resets\ ([0-9]{1,2}(:[0-9]{2})?\ ?[apAP][mM]) ]]; then
    hora="${BASH_REMATCH[1]}"
    objetivo=$(TZ=America/La_Paz date -d "$hora" +%s 2>/dev/null) || objetivo=""
  fi
  if [ -z "$objetivo" ]; then echo 3600; return 0; fi
  [ "$objetivo" -gt "$ahora" ] || objetivo=$((objetivo + 86400))
  if [ "$objetivo" -le "$ahora" ] || [ $((objetivo - ahora)) -gt 604800 ]; then echo 3600; return 0; fi
  echo $((objetivo - ahora + 300))
}

# El límite es de la cuenta, no del carril: el que lo ve anota hasta cuándo en `<común>/piloto/limite-hasta` y los demás duermen hasta
# entonces sin gastar una llamada para enterarse (`respetar_limite`, antes de cada ruteo y de cada paso). Dormir no es una falla ni un aviso:
# con el proyecto corriendo sin nadie, un carril que topa el límite semanal duerme lo que haga falta y retoma (antes, el segundo límite
# seguido era una parada). `PILOTO_LIMITE_VECES` (0: sin tope) vuelve a ponerle un máximo de siestas por paso.
LIMITE_DORMIDO=""
anotar_limite() { # <segundos>
  # Lo que anota este carril lo duerme él mismo a continuación: `respetar_limite` no lo vuelve a dormir.
  LIMITE_DORMIDO=$(($(date +%s) + $1))
  echo "$LIMITE_DORMIDO" >"$COMUN/limite-hasta.tmp" 2>/dev/null && mv -f "$COMUN/limite-hasta.tmp" "$COMUN/limite-hasta" 2>/dev/null
  return 0
}
respetar_limite() {
  local hasta ahora
  hasta=$(cat "$COMUN/limite-hasta" 2>/dev/null) || return 0
  [[ "$hasta" =~ ^[0-9]+$ ]] && [ "$hasta" != "$LIMITE_DORMIDO" ] || return 0
  ahora=$(date +%s)
  [ "$hasta" -gt "$ahora" ] || return 0
  registro "límite de uso de la cuenta (lo anotó otro carril): duermo $((hasta - ahora)) s."
  LIMITE_DORMIDO="$hasta"
  $DORMIR "$((hasta - ahora))"
}

# Un corte de red o un error del servidor no es una falla del paso (el 8-11 el C falló dos veces en tres minutos con «Can't reach the API
# server (EAI_AGAIN)» y quedó 2,6 h en una compuerta): se espera y se retoma, sin tope de veces. 300 s la primera, el doble cada vez, hasta 1800.
segundos_de_red() { # <salida.json> <stderr> <vez>
  local texto
  texto="$(jq -r '(.result // "") + " " + (.error // "") + " " + ((.api_error_status // "") | tostring)' "$1" 2>/dev/null) $(tail -c 2000 "$2" 2>/dev/null)"
  [[ "$texto" =~ (Can.t\ reach\ the\ API|EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|socket\ hang\ up|fetch\ failed|[Oo]verloaded|Internal\ server\ error|Service\ Unavailable|Bad\ Gateway|Gateway\ Timeout) ]] ||
    jq -e '(.api_error_status // 0) | tonumber? // 0 | . >= 500' "$1" >/dev/null 2>&1 || return 1
  local s=$((300 * (1 << ($3 > 3 ? 3 : $3 - 1))))
  [ "$s" -gt 1800 ] && s=1800
  echo "$s"
}

# aparcar_paso <paso> <motivo>: el carril no logra cerrar el paso y nadie va a contestar. En vez de parar el carril (y con él todo lo que
# podía seguir), el paso queda aparcado en el coordinador con su motivo y el carril pide otro. Lo que había sin commitear se guarda en un
# stash con nombre; la nota de `.piloto/aparcados/<paso>.md` es lo primero que lee la sesión que lo reintente (skill piloto, «Orientarte»).
# Un pedido de otro carril se cierra con el motivo (el que esperaba se retoma y decide); un ci-fix se suelta.
aparcar_paso() { # <paso> <motivo>
  local paso="$1" motivo="$2" del_plan stash="" sid
  del_plan=$(jq -r '.paso // empty' "$ESTADO/asignado.json" 2>/dev/null)
  del_plan=${del_plan:-$paso}
  sid=$(jq -r '.session_id // empty' "$ESTADO/en-curso.json" 2>/dev/null)
  mkdir -p "$ESTADO/aparcados"
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    stash="piloto: $paso aparcado $(ahora_lapaz)"
    git stash push --quiet --include-untracked -m "$stash" >/dev/null 2>&1 8>&- || stash=""
  fi
  {
    echo "# $del_plan quedó aparcado ($(ahora_lapaz))"
    echo
    echo "Motivo, literal: $motivo"
    echo
    echo "- Rama: \`$(git symbolic-ref --quiet --short HEAD)\` en \`$(git rev-parse --short HEAD 2>/dev/null)\`; lo publicado de partes anteriores está en main o en su PR."
    [ -n "$sid" ] && echo "- La sesión que lo dejó: \`$sid\` (plan en \`.piloto/planes/\`, informe en \`.piloto/informes/\`, salidas en \`.piloto/salidas/\`)."
    [ -n "$stash" ] && echo "- Había trabajo sin commitear: está en el stash «$stash» (\`git stash list\`; míralo con \`git stash show -p\` y aplícalo sólo si sirve)."
    echo
    echo "Al reintentarlo: no repitas lo que falló igual. Lee el motivo, mira qué quedó hecho en la rama y achica el paso si hace falta"
    echo "(una parte que cierre con \`parcial: true\` vale más que el paso entero otra vez sin cerrar)."
  } >"$ESTADO/aparcados/$(sanear "$del_plan").md"
  [ -f "$ESTADO/en-curso.json" ] && mv -f "$ESTADO/en-curso.json" "$ESTADO/aparcados/$(sanear "$del_plan").en-curso.json"
  rm -f "$ESTADO/asignado.json" "$ESTADO/forzar-ci-fix" "$ESTADO/esperando" "$ESTADO/agotado-$(sanear "$paso")"
  rm -rf "$ESTADO/paradas-solas" "$ESTADO/paradas-auto"
  echo 0 >"$ESTADO/fallas"
  if [[ "$del_plan" =~ ^pedido-[0-9]+$ ]]; then
    coordinador cerrar-pedido "$del_plan" "no se pudo: ${motivo:0:300}" >/dev/null 2>"$ESTADO/coordinador.err" ||
      registro "el coordinador no cerró $del_plan: $(tail -n 1 "$ESTADO/coordinador.err")"
    registro "$del_plan no se pudo hacer y se cerró sin cambios: ${motivo:0:300}"
  elif [ "$paso" = ci-fix ]; then
    registro "ci-fix sin salida, se suelta: ${motivo:0:300}"
  else
    coordinador aparcar "$del_plan" "${motivo:0:480}" >/dev/null 2>"$ESTADO/coordinador.err" ||
      registro "el coordinador no aparcó $del_plan: $(tail -n 1 "$ESTADO/coordinador.err")"
    registro "APARCADO $del_plan: ${motivo:0:300} — el carril sigue con otro paso; se reintenta más tarde (.piloto/aparcados/$(sanear "$del_plan").md)."
  fi
}

# sin_salida <paso> <motivo>: un aviso agotó sus reintentos y sus respuestas automáticas. Sin carriles (o sin «todo») el bucle para, como
# siempre (devuelve 1). Con carriles nadie lo va a mirar: lo que es de un paso se aparca; lo que es del entorno (GitHub caído, el disco, el
# coordinador, la rama) se espera PILOTO_PARADA_LARGA s (1800) y se vuelve a intentar, sin fin: una caída de dos horas ya no deja
# parado al carril hasta que alguien lo relance. Un aviso de un paso que puede ser del entorno (publicar, verificar) espera una vez antes
# de aparcar (PILOTO_AGOTADOS_MAX, 2); el que ya gastó una sesión sin cerrar (PARADA_HUMANA: tope, falla, dos fallos) se aparca de una.
sin_salida() { # <paso> <motivo>
  local paso="$1" motivo="$2" larga="${PILOTO_PARADA_LARGA:-1800}" n archivo
  modo_carril && auto_nombra todo || return 1
  rm -rf "$ESTADO/paradas-solas" "$ESTADO/paradas-auto"
  if [ -n "$paso" ] && [ -f "$ESTADO/en-curso.json" ]; then
    archivo="$ESTADO/agotado-$(sanear "$paso")"
    n=$(($(cat "$archivo" 2>/dev/null || echo 0) + 1))
    if [ "${PARADA_HUMANA:-0}" = 1 ] || [ "$n" -ge "${PILOTO_AGOTADOS_MAX:-2}" ]; then
      aparcar_paso "$paso" "$motivo"
      return 0
    fi
    echo "$n" >"$archivo"
  fi
  registro "sin salida por ahora (${motivo:0:300}): espero $larga s y vuelvo a intentar; el carril no para."
  dormir_atento "$larga"
  return 0
}
# Una compuerta que respondió «parar»: con la persona, el bucle para; sin compuertas, es el paso el que no puede seguir (lo recomienda él
# mismo, o agotó sus atascos) y se aparca.
parar_o_aparcar() { # <paso> <motivo>
  if modo_carril && auto_nombra todo && [ -f "$ESTADO/en-curso.json" ]; then
    aparcar_paso "$1" "$2"
    return 0
  fi
  registro "parado por la persona en la compuerta de $1."
  exit 0
}
