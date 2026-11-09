#!/usr/bin/env bash
# El piloto de corrido (se hace `source` desde bucle.sh; no se corre solo): lo que hace que nada deje un carril parado esperando a una
# persona que no va a venir (docs/PILOTO.md › «De corrido», 2026-11-09). El límite de uso y la red caída se esperan y se retoma; un paso
# que no cierra se aparca y el carril toma otro; lo del entorno se espera y se reintenta. Se prueba en `bucle-de-corrido.test.ts`,
# `bucle-limite.test.ts` y `bucle-decision.test.ts`.
#
# Variables que espera: COMUN, ESTADO, DORMIR y las funciones `registro`, `coordinador`, `modo_carril`, `auto_nombra`, `sanear`,
# `dormir_atento` y `ahora_lapaz`.

# Una siesta larga que se puede cortar: de a 30 s y mirando PARAR (dormir_atento). Con un `sleep` de mentira (PILOTO_DORMIR, las
# pruebas) es una sola llamada, para que quede anotado cuánto se quiso dormir.
dormir_largo() { # <segundos>
  if [ "${DORMIR:-sleep}" = sleep ]; then dormir_atento "$1"; else $DORMIR "$1"; fi
}

# ¿La llamada terminó en error? Sin un JSON legible (el proceso murió) también. El texto de una sesión que terminó bien puede nombrar
# un límite o un error de red (un plan, la salida de una prueba) sin que haya pasado ninguno: sólo se mira lo que falló.
llamada_con_error() { # <salida.json>
  jq -e . "$1" >/dev/null 2>&1 || return 0
  jq -e '.is_error == true or ((.api_error // "") != "") or ((.subtype // "") | startswith("error"))' "$1" >/dev/null 2>&1
}

# El texto documentado del límite de uso: «You've hit your session limit · resets 3:45pm». Imprime los segundos que hay que dormir
# (hasta esa hora de La Paz y 5 minutos más; 60 minutos si la hora no se lee). Cómo sale en `-p` no está documentado: se mira el JSON y stderr.
# El límite semanal trae día («resets Nov 12, 3pm», «resets Nov 12 at 3:45pm»): primero se lee todo lo que sigue a «resets» como una fecha;
# si no lo es, sólo la hora. Nunca más de 7 días.
segundos_de_limite() {
  local texto hora objetivo ahora entera
  llamada_con_error "$1" || return 1
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
  dormir_largo "$((hasta - ahora))"
}

# Un corte de red, un error del servidor o la sesión de Claude vencida no son una falla del paso (el 8-11 el C falló dos veces en tres
# minutos con «Can't reach the API server (EAI_AGAIN)» y quedó 2,6 h en una compuerta): se espera y se retoma. 300 s la primera, el doble
# cada vez, hasta 1800; hasta PILOTO_RED_VECES seguidas (24: unas 11 h), y después es una falla como cualquiera. Sólo se mira una llamada
# que terminó en error, y de su texto sólo el principio: la salida de una prueba que nombra «fetch failed» no es un corte de red.
segundos_de_red() { # <salida.json> <stderr> <vez>
  local texto s
  llamada_con_error "$1" || return 1
  if jq -e . "$1" >/dev/null 2>&1; then
    texto=$(jq -r '((.result // "") | tostring | .[0:400]) + " " + ((.error // "") | tostring | .[0:200])' "$1" 2>/dev/null)
  else
    texto=$(tail -c 2000 "$2" 2>/dev/null)
  fi
  [[ "$texto" =~ (Can.t\ reach\ the\ API|EAI_AGAIN|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|socket\ hang\ up|fetch\ failed|[Oo]verloaded|Internal\ server\ error|Service\ Unavailable|Bad\ Gateway|Gateway\ Timeout|Please\ run\ /login|Invalid\ API\ key|OAuth\ token\ has\ expired|authentication_error|[Cc]redit\ balance) ]] ||
    jq -e '(.api_error_status // 0) | tonumber? // 0 | . >= 500' "$1" >/dev/null 2>&1 || return 1
  s=$((300 * (1 << ($3 > 3 ? 3 : $3 - 1))))
  [ "$s" -gt 1800 ] && s=1800
  echo "$s"
}

# guardar_arbol <etiqueta> <archivo base>: deja el árbol limpio sin perder lo que había, y dice dónde quedó en GUARDADO. Un merge a
# medias se aborta (un stash no entra con archivos sin unir: `needs merge`, y el carril quedaba con el árbol sucio y sin paso, dormido
# para siempre). Lo normal es un stash con nombre; si no entra, un diff y un tar de lo sin rastrear junto a la nota, y el árbol se
# devuelve a HEAD. 1 si no pudo dejarlo limpio.
GUARDADO=""
guardar_arbol() { # <etiqueta> <archivo base>
  local etiqueta="$1" base="$2" stash
  GUARDADO=""
  git rev-parse --quiet --verify MERGE_HEAD >/dev/null 2>&1 && git merge --abort >/dev/null 2>&1 8>&-
  [ -z "$(git status --porcelain 2>/dev/null)" ] && return 0
  stash="piloto: $etiqueta aparcado $(ahora_lapaz)"
  if git stash push --quiet --include-untracked -m "$stash" >/dev/null 2>&1 8>&- && [ -z "$(git status --porcelain 2>/dev/null)" ]; then
    GUARDADO="el stash «$stash» (\`git stash list\`; míralo con \`git stash show -p\` y aplícalo sólo si sirve)"
    return 0
  fi
  git diff HEAD >"$base.diff" 2>/dev/null
  git ls-files --others --exclude-standard -z 2>/dev/null | tar --null -T - -czf "$base.sin-rastrear.tgz" 2>/dev/null
  git reset --quiet --hard HEAD >/dev/null 2>&1 8>&-
  git clean -fdq >/dev/null 2>&1 8>&-
  GUARDADO="\`$base.diff\` (lo rastreado, contra HEAD) y \`$base.sin-rastrear.tgz\` (los archivos nuevos): el stash no entró"
  [ -z "$(git status --porcelain 2>/dev/null)" ]
}

# aparcar_paso <paso> <motivo>: el carril no logra cerrar el paso y nadie va a contestar. En vez de parar el carril (y con él todo lo que
# podía seguir), el paso queda aparcado en el coordinador con su motivo y el carril pide otro. Lo que había sin commitear se guarda
# (guardar_arbol); la nota de `.piloto/aparcados/<paso>.md` es lo primero que lee la sesión que lo reintente (skill piloto, «Orientarte»).
# Un pedido de otro carril se cierra con el motivo (el que esperaba se retoma y decide); un ci-fix se suelta sin tocar el paso asignado.
#
# El disyuntor: PILOTO_APARCADOS_SEGUIDOS (3) pasos aparcados sin publicar ninguno entre medio no son tres pasos difíciles: es algo
# común a todos (la sesión de Claude vencida, la base, el disco). Aparcar el cuarto, y el quinto, vaciaría el plan y gastaría los
# reintentos de cada paso. Desde ahí no se aparca: se espera (media hora, y el doble cada vez hasta cuatro horas) y se reintenta el mismo.
aparcar_paso() { # <paso> <motivo>
  local paso="$1" motivo="$2" del_plan sid seguidos tope base i ok=0 espera larga="${PILOTO_PARADA_LARGA:-1800}"
  mkdir -p "$ESTADO/aparcados"
  if [ "$paso" = ci-fix ]; then
    guardar_arbol ci-fix "$ESTADO/aparcados/ci-fix" ||
      registro "ci-fix: no pude dejar el árbol limpio; lo que había quedó en $ESTADO/aparcados/ci-fix.diff."
    rm -f "$ESTADO/en-curso.json" "$ESTADO/forzar-ci-fix" "$ESTADO/agotado-ci-fix"
    rm -rf "$ESTADO/paradas-solas" "$ESTADO/paradas-auto"
    echo 0 >"$ESTADO/fallas"
    registro "ci-fix sin salida, se suelta: ${motivo:0:300}"
    return 0
  fi
  del_plan=$(jq -r '.paso // empty' "$ESTADO/asignado.json" 2>/dev/null)
  del_plan=${del_plan:-$paso}
  base="$ESTADO/aparcados/$(sanear "$del_plan")"
  seguidos=$(cat "$ESTADO/aparcados-seguidos" 2>/dev/null || echo 0)
  tope="${PILOTO_APARCADOS_SEGUIDOS:-3}"
  if [ "$seguidos" -ge "$tope" ]; then
    espera=$((larga * (1 << (seguidos - tope > 3 ? 3 : seguidos - tope))))
    echo $((seguidos + 1)) >"$ESTADO/aparcados-seguidos"
    rm -rf "$ESTADO/paradas-solas" "$ESTADO/paradas-auto"
    registro "DISYUNTOR: $seguidos pasos aparcados seguidos sin publicar ninguno: no es de $del_plan, es de todos (¿la sesión de claude, la base, el disco?). No lo aparco: espero $espera s y lo reintento. Motivo: ${motivo:0:200}"
    dormir_atento "$espera"
    return 0
  fi
  if ! guardar_arbol "$paso" "$base"; then
    registro "no pude dejar el árbol limpio para aparcar $del_plan (lo que había quedó en $base.diff): espero $larga s y vuelvo a intentar."
    dormir_atento "$larga"
    return 0
  fi
  sid=$(jq -r '.session_id // empty' "$ESTADO/en-curso.json" 2>/dev/null)
  {
    echo "# $del_plan quedó aparcado ($(ahora_lapaz))"
    echo
    echo "Motivo, literal: $motivo"
    echo
    echo "- Rama: \`$(git symbolic-ref --quiet --short HEAD)\` en \`$(git rev-parse --short HEAD 2>/dev/null)\`; lo publicado de partes anteriores está en main o en su PR."
    [ -n "$sid" ] && echo "- La sesión que lo dejó: \`$sid\` (plan en \`.piloto/planes/\`, informe en \`.piloto/informes/\`, salidas en \`.piloto/salidas/\`)."
    [ -n "$GUARDADO" ] && echo "- Había trabajo sin commitear: está en $GUARDADO."
    echo
    echo "Al reintentarlo: no repitas lo que falló igual. Lee el motivo, mira qué quedó hecho en la rama y achica el paso si hace falta"
    echo "(una parte que cierre con \`parcial: true\` vale más que el paso entero otra vez sin cerrar)."
  } >"$base.md"
  # El coordinador tiene que saberlo antes de soltar el paso aquí: si no lo anota, lo volvería a dar al instante, sin enfriarlo y sin
  # contar la vez. Su candado puede estar tomado un rato (sincronizar habla con GitHub): se insiste.
  for i in $(seq 1 "${PILOTO_APARCAR_INTENTOS:-20}"); do
    if [[ "$del_plan" =~ ^pedido-[0-9]+$ ]]; then
      coordinador cerrar-pedido "$del_plan" "no se pudo: ${motivo:0:300}" >/dev/null 2>"$ESTADO/coordinador.err" && ok=1
    else
      coordinador aparcar "$del_plan" "${motivo:0:480}" >/dev/null 2>"$ESTADO/coordinador.err" && ok=1
    fi
    [ "$ok" = 1 ] && break
    # Ya no está asignado (lo integró otro, o alguien lo liberó): no hay nada que aparcar, se suelta.
    grep -qE 'no puede pasar de (pendiente|integrado|publicado|aparcado)|no está en el plan|no hay un pedido' "$ESTADO/coordinador.err" 2>/dev/null && { ok=2; break; }
    dormir_atento 30
  done
  if [ "$ok" = 0 ]; then
    registro "el coordinador no anotó $del_plan como aparcado ($(tail -n 1 "$ESTADO/coordinador.err" 2>/dev/null | cut -c1-200)): no lo suelto; espero $larga s."
    dormir_atento "$larga"
    return 0
  fi
  [ -f "$ESTADO/en-curso.json" ] && mv -f "$ESTADO/en-curso.json" "$base.en-curso.json"
  rm -f "$ESTADO/asignado.json" "$ESTADO/forzar-ci-fix" "$ESTADO/esperando" "$ESTADO/agotado-$(sanear "$paso")"
  rm -rf "$ESTADO/paradas-solas" "$ESTADO/paradas-auto"
  echo 0 >"$ESTADO/fallas"
  if [[ "$del_plan" =~ ^pedido-[0-9]+$ ]]; then
    registro "$del_plan no se pudo hacer y se cerró sin cambios: ${motivo:0:300}"
  elif [ "$ok" = 2 ]; then
    registro "$del_plan ya no estaba asignado en el coordinador: lo suelto sin aparcar. Motivo que traía: ${motivo:0:200}"
  else
    echo $((seguidos + 1)) >"$ESTADO/aparcados-seguidos"
    registro "APARCADO $del_plan: ${motivo:0:300} — el carril sigue con otro paso; se reintenta más tarde (.piloto/aparcados/$(sanear "$del_plan").md)."
  fi
}

# sin_salida <paso> <motivo>: un aviso agotó sus reintentos y sus respuestas automáticas. Sin carriles (o sin «todo») el bucle para, como
# siempre (devuelve 1). Con carriles nadie lo va a mirar: lo que es de un paso se aparca; lo que es del entorno (GitHub caído, el disco, el
# coordinador, la rama) se espera PILOTO_PARADA_LARGA s (1800) y se vuelve a intentar, sin fin: una caída de dos horas ya no deja
# parado al carril hasta que alguien lo relance. Un aviso de un paso que puede ser del entorno (publicar, verificar) espera una vez antes
# de aparcar (PILOTO_AGOTADOS_MAX, 2); el que ya gastó una sesión sin cerrar (PARADA_HUMANA: tope, falla, dos fallos) se aparca de una; y
# el que ni siquiera pudo empezar (la puerta de fase con main en rojo) se aparca tras PILOTO_ESPERAS_SIN_EMPEZAR (6) esperas, para que el
# carril no se quede mirando esa puerta mientras tiene otros pasos.
sin_salida() { # <paso> <motivo>
  local paso="$1" motivo="$2" larga="${PILOTO_PARADA_LARGA:-1800}" n archivo
  modo_carril && auto_nombra todo || return 1
  rm -rf "$ESTADO/paradas-solas" "$ESTADO/paradas-auto"
  if [ -n "$paso" ]; then
    archivo="$ESTADO/agotado-$(sanear "$paso")"
    n=$(($(cat "$archivo" 2>/dev/null || echo 0) + 1))
    if [ -f "$ESTADO/en-curso.json" ]; then
      if [ "${PARADA_HUMANA:-0}" = 1 ] || [ "$n" -ge "${PILOTO_AGOTADOS_MAX:-2}" ]; then
        aparcar_paso "$paso" "$motivo"
        return 0
      fi
    elif [ -f "$ESTADO/asignado.json" ] && [ "$n" -ge "${PILOTO_ESPERAS_SIN_EMPEZAR:-6}" ]; then
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
  if modo_carril && auto_nombra todo && { [ -f "$ESTADO/en-curso.json" ] || [ -f "$ESTADO/asignado.json" ]; }; then
    aparcar_paso "$1" "$2"
    return 0
  fi
  if auto_nombra todo; then registro "parado (decisión automática: la compuerta de $1 no tiene una respuesta que deje seguir)."
  else registro "parado por la persona en la compuerta de $1."; fi
  exit 0
}
