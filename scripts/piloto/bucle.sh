#!/usr/bin/env bash
# El piloto: avanza docs/PLAN.md UN paso por sesión nueva de `claude -p`, sin modelo en el medio. Sólo le pregunta a la persona en las
# compuertas, al celular, por una sesión corta (`decidir.sh`). Se prueba en `bucle.test.ts` con un `claude` falso. Cómo se usa, qué
# vigila y qué no confirma la doc: `docs/PILOTO.md`.
#
#   bucle.sh [--hasta <paso>] [--en-seco [--nota <archivo>]] [--una-vuelta]
#
# No se corre desde el árbol: `arrancar.sh` copia `scripts/piloto/` a `<común>/piloto/bin/` con su `bin.sha256` y lanza ESA copia, que
# llama siempre a las piezas de la copia (verificar, publicar, decidir, hechos, consumo, nivel…), nunca a las de `scripts/piloto/`: un
# paso no puede cambiar el código con que se lo verifica y publica. Cada vuelta, en orden:
#   0 la copia coincide con bin.sha256 · 1 hechos (sin modelo) · 2 paradas deterministas (PARAR, rama, árbol, disco, CI) · 3 ruteo
#   (sólo lee; sonnet, esfuerzo bajo) · 4 las compuertas que no se le dejan al modelo y el paso a medias · 5 el paso (una sesión nueva,
#   o `--resume`) · 6 su resultado: listo (el cierre de `cierre.sh`), compuerta o falla · 7 el límite de uso · 8 el consumo.
# Un solo bucle a la vez (flock sobre `.piloto/bucle.lock`). Variables: CLAUDE_BIN, PILOTO_DISCO_MAX (90), PILOTO_TOPE_USD_RUTEO (0,5),
# PILOTO_TOPE_USD_PASO (60: el paso ENTERO, con sus retomas y reintentos), PILOTO_TOPE_USD_MIN (5: con menos, el paso no se lanza),
# PILOTO_DORMIR (sleep), PILOTO_POLL (5 s entre lecturas de la decisión), PILOTO_ESPERA_MAX (sin tope).
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
# shellcheck source=compuerta.sh
source "$BIN/compuerta.sh"
# shellcheck source=cierre.sh
source "$BIN/cierre.sh"
# shellcheck source=gasto.sh
source "$BIN/gasto.sh"
cd "$RAIZ" || exit 1

HASTA="" EN_SECO=0 NOTA="" UNA_VUELTA=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --hasta) HASTA="${2:-}"; shift 2 ;;
    --en-seco) EN_SECO=1; shift ;;
    --nota) NOTA="${2:-}"; shift 2 ;;
    --una-vuelta) UNA_VUELTA=1; shift ;;
    *) echo "uso: bucle.sh [--hasta <paso>] [--en-seco [--nota <archivo>]] [--una-vuelta]" >&2; exit 64 ;;
  esac
done
DISCO_MAX="${PILOTO_DISCO_MAX:-90}" TOPE_RUTEO="${PILOTO_TOPE_USD_RUTEO:-0.5}" TOPE_PASO="${PILOTO_TOPE_USD_PASO:-60}"
TOPE_MIN="${PILOTO_TOPE_USD_MIN:-5}"
DORMIR="${PILOTO_DORMIR:-sleep}" POLL="${PILOTO_POLL:-5}"
CLAUDE=$(claude_bin)
[ -n "$CLAUDE" ] || { echo "bucle: no encuentro el binario de claude (CLAUDE_BIN)." >&2; exit 1; }

mkdir -p "$ESTADO/llamadas" "$ESTADO/sesiones" "$ESTADO/planes" "$ESTADO/informes" "$ESTADO/salidas" "$COMUN"
exec 8>"$ESTADO/bucle.lock"
flock -n 8 || { echo "bucle: ya corre otro bucle (flock sobre $ESTADO/bucle.lock)." >&2; exit 1; }

registro() {
  local linea
  linea="$(ahora_lapaz) $*"
  echo "$linea"
  echo "- $linea" >>"$ESTADO/registro.md"
}
consumo() { PILOTO_DIR="$ESTADO" bash "$BIN/consumo.sh" llamada "$@"; }
hecho() { jq -r "$1" "$ESTADO/hechos.json" 2>/dev/null; }

# 0. La copia con la que corre el bucle: lo que dice bin.sha256, y nada de más.
verificar_copia() {
  [ -s "$BIN/bin.sha256" ] || return 1
  (cd "$BIN" && sha256sum -c --quiet bin.sha256 >/dev/null 2>&1) || return 1
  [ "$(awk '{print $2}' "$BIN/bin.sha256" | sed 's/^\*//' | sort)" = "$(cd "$BIN" && find . -mindepth 1 ! -name bin.sha256 -printf '%P\n' | sort)" ]
}

# El texto documentado del límite de uso: «You've hit your session limit · resets 3:45pm». Imprime los segundos que hay que dormir
# (hasta esa hora de La Paz y 5 minutos más; 60 minutos si la hora no se lee). Cómo sale en `-p` no está documentado: se mira el JSON y stderr.
segundos_de_limite() {
  local texto hora objetivo ahora
  texto="$(jq -r '(.result // "") + " " + (.error // "")' "$1" 2>/dev/null) $(cat "$2" 2>/dev/null)"
  [[ "$texto" =~ hit\ your[A-Za-z\ ]*limit ]] || return 1
  if [[ "$texto" =~ resets\ ([0-9]{1,2}(:[0-9]{2})?\ ?[apAP][mM]) ]]; then
    hora="${BASH_REMATCH[1]}"
    ahora=$(date +%s)
    objetivo=$(TZ=America/La_Paz date -d "$hora" +%s 2>/dev/null) || objetivo=$((ahora - 1))
    [ "$objetivo" -gt "$ahora" ] || objetivo=$((objetivo + 86400))
    echo $((objetivo - ahora + 300))
  else
    echo 3600
  fi
}

# 3. El ruteo: sólo lee, por construcción (sin Bash ni Edit). Un resultado válido o un segundo intento; si no, aviso.
ruteo_valido() {
  jq -e '.structured_output | type == "object" and (.paso | type == "string") and (.modelo | IN("sonnet", "opus"))
    and (.effort | IN("low", "medium", "high", "xhigh")) and (.sesion.tipo | IN("nueva", "continuar"))
    and (.compuerta.tipo | IN("ninguna", "datos", "dependencia", "hito", "fase", "producto", "atasco", "afuera"))' "$1" >/dev/null 2>&1
}
rutear() {
  local salida="$ESTADO/llamadas/ruteo-ultimo.json" intento espera inicio
  for intento in 1 2; do
    inicio=$SECONDS
    PILOTO=1 PILOTO_SESION=ruteo "$CLAUDE" -p "/piloto-ruteo" --model sonnet --effort low --tools "Read,Grep,Glob" \
      --disallowedTools "mcp__*" --permission-mode dontAsk --permission-prompts none --max-turns 25 \
      --max-budget-usd "$TOPE_RUTEO" --output-format json --json-schema "$(cat "$BIN/ruteo.schema.json")" \
      >"$salida" 2>"$ESTADO/llamadas/ruteo.err" 8>&-
    consumo ruteo "-" sonnet low "$(ruteo_valido "$salida" && echo listo || echo falla)" "$salida" "$((SECONDS - inicio))"
    if ruteo_valido "$salida"; then
      jq -c .structured_output "$salida" >"$ESTADO/ruteo.json"
      return 0
    fi
    if espera=$(segundos_de_limite "$salida" "$ESTADO/llamadas/ruteo.err"); then
      registro "límite de uso en el ruteo: duermo $espera s."
      $DORMIR "$espera"
    fi
  done
  return 1
}

# 2. Las paradas deterministas. Cada una avisa; «sigo» la ignora una vez, «reintentar» repite la vuelta.
chequeo() {
  local clave="$1" motivo="$2" rc
  if [ -f "$ESTADO/ignorar-$clave" ]; then rm -f "$ESTADO/ignorar-$clave"; return 0; fi
  parada "$motivo"
  rc=$?
  [ "$rc" = 2 ] && touch "$ESTADO/ignorar-$clave"
  [ "$rc" = 1 ] && return 1
  return 0
}
paradas_deterministas() {
  [ -f "$ESTADO/PARAR" ] && { registro "PARAR: el bucle se detiene entre pasos."; exit 0; }
  local disco
  # El piloto es el carril A: trabaja en su rama `a/…` y publica por PR (publicar.sh), nunca en main.
  case "$(hecho .rama)" in
    a/?*) ;;
    *) chequeo rama "la rama es «$(hecho .rama)», no la del carril A (a/…)" || return 1 ;;
  esac
  if [ "$(hecho .arbol_limpio)" != true ] && [ ! -f "$ESTADO/en-curso.json" ]; then
    chequeo arbol "el árbol está sucio y no hay un paso en curso" || return 1
  fi
  disco=$(hecho .disco_pct)
  if [ -n "$disco" ] && [ "$disco" != null ] && [ "$disco" -gt "$DISCO_MAX" ]; then
    chequeo disco "el disco está al ${disco} % (tope ${DISCO_MAX} %: libera espacio o arranca con PILOTO_DISCO_MAX)" || return 1
  fi
  case "$(hecho '(.ci // {}) | select(.status == "completed") | .conclusion // ""')" in
    failure | cancelled | timed_out) chequeo ci "el último CI de la rama está en rojo" || return 1 ;;
  esac
  return 0
}

en_curso_vivo() {
  local pid
  pid=$(jq -r '.pid // empty' "$ESTADO/en-curso.json" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}
anotar_en_curso() { # <paso> <session_id> <head> <modelo> <effort>
  jq -nc --arg paso "$1" --arg sid "$2" --arg head "$3" --arg modelo "$4" --arg effort "$5" --arg hora "$(ahora_lapaz)" \
    '{paso: $paso, session_id: $sid, pid: null, head_arranque: $head, hora: $hora, modelo: $modelo, effort: $effort, estado: "corriendo", guardas_aprobadas: false}' \
    >"$ESTADO/en-curso.json"
}
fallas() { echo "$(($(cat "$ESTADO/fallas" 2>/dev/null || echo 0) + 1))" >"$ESTADO/fallas"; }

# 5. Lanza el paso y espera. Salida: $SALIDA_PASO; el pid queda en en-curso.json para saber si el paso sigue vivo.
lanzar_paso() { # <modo: nueva|resume> <session_id> <prompt> <modelo> <effort> [banderas…]
  local modo="$1" sid="$2" prompt="$3" modelo="$4" effort="$5" sesion=(--session-id "$sid") rc
  shift 5
  [ "$modo" = resume ] && sesion=(--resume "$sid")
  mv -f "$ESTADO/ultimo.json" "$ESTADO/ultimo-anterior.json" 2>/dev/null
  PILOTO=1 PILOTO_SESION=paso "$CLAUDE" -p "$prompt" --model "$modelo" --effort "$effort" --permission-mode auto \
    --permission-prompts none --disallowedTools "mcp__*" --max-budget-usd "$(restante)" --output-format json "${sesion[@]}" "$@" \
    >"$SALIDA_PASO" 2>"$ESTADO/llamadas/paso.err" 8>&- &
  jq -c --argjson pid "$!" '.pid = $pid | .estado = "corriendo"' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" && mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
  wait "$!"
  rc=$?
  jq -c '.pid = null' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" && mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
  return "$rc"
}

# Corre el paso con sus reintentos: el del límite de uso (duerme y retoma, una vez) y el del fallo del proceso (retoma con el mismo
# session_id, una vez). Deja el resultado en $SALIDA_PASO y en ultimo.json; devuelve 1 si no hubo un ultimo.json válido y 3 si el
# paso llegó a su tope (o le queda menos de PILOTO_TOPE_USD_MIN): eso no es un fallo, no se reintenta.
correr_paso() { # <paso> <modo> <session_id> <prompt> <modelo> <effort> [banderas…]
  local paso="$1" modo="$2" sid="$3" prompt="$4" modelo="$5" effort="$6" rc espera limite=0 reintento=0 resultado inicio dur
  shift 6
  while :; do
    le_queda || return 3
    inicio=$SECONDS
    lanzar_paso "$modo" "$sid" "$prompt" "$modelo" "$effort" "$@"
    rc=$?
    dur=$((SECONDS - inicio))
    anotar_gasto "$SALIDA_PASO"
    if espera=$(segundos_de_limite "$SALIDA_PASO" "$ESTADO/llamadas/paso.err"); then
      consumo paso "$paso" "$modelo" "$effort" limite "$SALIDA_PASO" "$dur"
      if [ "$limite" = 1 ]; then registro "el límite de uso volvió tras dormir: aviso."; return 2; fi
      limite=1
      registro "límite de uso en $paso: duermo $espera s y retomo con --resume."
      $DORMIR "$espera"
      modo=resume prompt="/piloto $paso continuar"
      continue
    fi
    if jq -e '.subtype == "error_max_budget_usd"' "$SALIDA_PASO" >/dev/null 2>&1; then
      consumo paso "$paso" "$modelo" "$effort" tope "$SALIDA_PASO" "$dur"
      return 3
    fi
    if [ "$rc" = 0 ] && ultimo_valido && [ "$(jq -r .paso "$ESTADO/ultimo.json")" = "$paso" ]; then
      resultado=$(jq -r .resultado "$ESTADO/ultimo.json")
      consumo paso "$paso" "$modelo" "$effort" "$resultado" "$SALIDA_PASO" "$dur"
      return 0
    fi
    consumo paso "$paso" "$modelo" "$effort" fallo-proceso "$SALIDA_PASO" "$dur"
    if [ "$reintento" = 1 ]; then return 1; fi
    reintento=1
    registro "el paso $paso falló (rc=$rc o sin ultimo.json válido): un reintento con --resume $sid."
    modo=resume prompt="/piloto $paso continuar"
  done
}

# 6. La compuerta que pidió el paso (de ultimo.json).
compuerta_del_paso() { # <paso>
  local paso="$1" opciones=() rc
  mapfile -t opciones < <(jq -r '.compuerta.opciones[]? | "\(.etiqueta) — \(.descripcion)"' "$ESTADO/ultimo.json")
  mapfile -t CONTEXTO < <(jq -r '.compuerta.contexto[]? // empty' "$ESTADO/ultimo.json")
  PREGUNTAS=$(jq -c '.compuerta.preguntas // empty | select(length > 0)' "$ESTADO/ultimo.json")
  jq -c '.estado = "compuerta"' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" && mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
  compuerta "$(jq -r .compuerta.tipo "$ESTADO/ultimo.json")" "$paso" \
    "$(jq -r '.compuerta.motivo // ""' "$ESTADO/ultimo.json") (el paso lleva $(dinero "$(gastado)") de $(dinero "$(tope_del_paso)") USD)" \
    "$(jq -r '.compuerta.pregunta // .compuerta.motivo // ""' "$ESTADO/ultimo.json")" "${opciones[@]}"
  rc=$?
  PREGUNTAS=""
  [ "$rc" = 3 ] && { registro "parado por la persona en la compuerta de $paso."; exit 0; }
  return 0
}

# El ensayo en seco: un ruteo real y el paso sólo con lo que lee y lo que escribe en .piloto/ (por permisos, no por obediencia).
paso_en_seco() { # <paso> <modelo> <effort>
  local paso="$1" modelo="$2" effort="$3" sid
  sid=$(cat /proc/sys/kernel/random/uuid)
  PILOTO=1 PILOTO_SESION=paso "$CLAUDE" -p "/piloto $paso --en-seco" --model "$modelo" --effort "$effort" --permission-mode dontAsk \
    --permission-prompts none --disallowedTools "mcp__*" --max-budget-usd "$TOPE_PASO" --output-format json --session-id "$sid" \
    --allowedTools "Read" "Grep" "Glob" "Agent" "Bash(git log*)" "Bash(git show*)" "Bash(git diff*)" "Bash(git status*)" \
    "Bash(git rev-parse*)" "Bash(git ls-files*)" "Bash(git grep*)" "Bash(wc *)" "Bash(ls*)" "Bash(cat *)" "Bash(grep *)" "Bash(rg *)" \
    "Bash(jq *)" "Bash(find *)" "Bash(node scripts/piloto/*)" "Bash(touch .piloto/sonda)" "Write(.piloto/**)" "Edit(.piloto/**)" \
    >"$ESTADO/llamadas/paso-en-seco.json" 2>"$ESTADO/llamadas/paso.err" 8>&-
  consumo paso-en-seco "$paso" "$modelo" "$effort" en-seco "$ESTADO/llamadas/paso-en-seco.json"
  echo "--- el paso en seco (/piloto $paso --en-seco) ---"
  jq -r '.result // empty' "$ESTADO/llamadas/paso-en-seco.json"
  [ -s "$ESTADO/planes/$paso.md" ] && { echo "--- el plan ($ESTADO/planes/$paso.md) ---"; cat "$ESTADO/planes/$paso.md"; }
  echo "--- el consumo (con el desglose por modelo de modelUsage) ---"
  tail -n 2 "$ESTADO/consumo.csv"
  jq '.modelUsage' "$ESTADO/llamadas/paso-en-seco.json"
}

# Una vuelta. Devuelve 0 cuando hay que volver a rutear; los avisos que paran salen del bucle desde `parada`.
vuelta() {
  local paso modelo effort modo sid prompt desde banderas=() tipo_ruteo abre
  verificar_copia || { parada "la copia de los scripts del piloto no coincide con bin.sha256 (alterada o con archivos de más)"; return 0; }
  bash "$BIN/hechos.sh" >"$ESTADO/hechos.json.tmp" 2>"$ESTADO/hechos.err" && mv -f "$ESTADO/hechos.json.tmp" "$ESTADO/hechos.json" ||
    { parada "hechos.sh falló: $(tail -n 2 "$ESTADO/hechos.err" | tr '\n' ' ')"; return 0; }
  paradas_deterministas || return 0

  # Un cierre pendiente (el paso quedó «listo» y no se verificó o publicó): sin modelo.
  if [ "$(jq -r '.estado // empty' "$ESTADO/en-curso.json" 2>/dev/null)" = listo ]; then
    paso=$(jq -r .paso "$ESTADO/en-curso.json")
    cerrar_listo "$paso" "$(jq -r .head_arranque "$ESTADO/en-curso.json")" "$(jq -r '.guardas_aprobadas // false' "$ESTADO/en-curso.json")"
    [ -n "$HASTA" ] && [ "$paso" = "$HASTA" ] && [ ! -f "$ESTADO/en-curso.json" ] && { registro "llegamos a $HASTA."; exit 0; }
    return 0
  fi

  rutear || { parada "el ruteo no devolvió un resultado válido"; return 0; }
  paso=$(jq -r .paso "$ESTADO/ruteo.json") modelo=$(jq -r .modelo "$ESTADO/ruteo.json") effort=$(jq -r .effort "$ESTADO/ruteo.json")
  [ "$paso" = ninguno ] && { registro "PLAN: el ruteo no ve ningún paso por avanzar."; exit 0; }
  tipo_ruteo=$(jq -r .compuerta.tipo "$ESTADO/ruteo.json")

  # Una compuerta que ve el ruteo (dependencia, hito, producto, atasco, afuera): se pregunta antes de gastar el paso y antes de anotar nada en en-curso.json (el paso no empezó). Una sola vez por paso y tipo.
  if [[ "$tipo_ruteo" =~ ^(dependencia|hito|producto|atasco|afuera)$ ]] && [ "$(cat "$ESTADO/ruteo-compuerta" 2>/dev/null)" != "$paso:$tipo_ruteo" ]; then
    echo "$paso:$tipo_ruteo" >"$ESTADO/ruteo-compuerta"
    compuerta "$tipo_ruteo" "$paso" "$(jq -r .compuerta.motivo "$ESTADO/ruteo.json")" "$(jq -r .compuerta.motivo "$ESTADO/ruteo.json")"
    [ "$?" = 3 ] && { registro "parado por la persona en la compuerta de $paso."; exit 0; }
    return 0
  fi

  # Un paso de Nivel 2 (o con el completo de la cuenta) corre `pnpm test:e2e:completo`, que exige las funciones edge, y el bucle no
  # las levanta (un proceso largo con contenedores, compartido entre worktrees, que carga el entorno de las funciones). Se avisa antes
  # de gastar el paso, no a mitad. Antes de anotar en-curso.json: si la persona para, no queda un paso que nunca empezó.
  if jq -e '.nivel.completo == true or (.nivel.nivel // 1) >= 2' "$ESTADO/ruteo.json" >/dev/null 2>&1; then
    local faltan
    faltan=$(hecho 'if (.funciones | type) == "object" then [.funciones | to_entries[] | select(.value != true) | .key] | join(", ") else "no se pudo mirar" end')
    if [ -n "$faltan" ]; then
      parada "el paso $paso corre el e2e completo (Nivel 2) y faltan las funciones edge ($faltan): corre «pnpm funciones» en otra terminal" \
        "$paso" 'parado — no sigue (recomendado)' 'reintentar — vuelve a mirar las funciones' 'sigo — corre el paso igual'
      [ "$?" = 1 ] && return 0
    fi
  fi

  if [ -f "$ESTADO/en-curso.json" ]; then
    # [cambio 3] Un paso a medias: se retoma con --resume de SU sesión, diga lo que diga el ruteo; nunca una sesión nueva sobre un árbol a medias.
    en_curso_vivo && { parada "el paso $(jq -r .paso "$ESTADO/en-curso.json") sigue vivo (pid $(jq -r .pid "$ESTADO/en-curso.json"))" ""; return 0; }
    paso=$(jq -r .paso "$ESTADO/en-curso.json") sid=$(jq -r .session_id "$ESTADO/en-curso.json") desde=$(jq -r .head_arranque "$ESTADO/en-curso.json")
    modelo=$(jq -r '.modelo // empty' "$ESTADO/en-curso.json") effort=$(jq -r '.effort // empty' "$ESTADO/en-curso.json")
    modo=resume prompt="/piloto $paso continuar"
    [ -n "$modelo" ] || modelo=$(jq -r .modelo "$ESTADO/ruteo.json")
    [ -n "$effort" ] || effort=$(jq -r .effort "$ESTADO/ruteo.json")
  else
    # Las compuertas que el bucle no deja al modelo: 4.18 y 4.28, y abrir una fase.
    if [[ "$paso" =~ ^4\.(18|28)(-|$) ]] || [ "$tipo_ruteo" = fase ]; then
      abre=""
      [ "$tipo_ruteo" = fase ] && abre="abre una fase y "
      parada "el paso $paso ${abre}es una compuerta del bucle: lo decide la persona" "$paso" \
        'parado — no sigue (recomendado)' 'reintentar — vuelve a rutear' 'sigo — corre el paso'
      [ "$?" = 1 ] && return 0
    fi
    modo=nueva sid=$(cat /proc/sys/kernel/random/uuid) desde=$(git rev-parse HEAD) prompt="/piloto $paso"
    if [ "$(jq -r .sesion.tipo "$ESTADO/ruteo.json")" = continuar ] && [ "$(jq -r '.sesion.session_id // ""' "$ESTADO/ruteo.json")" != "" ]; then
      modo=resume sid=$(jq -r .sesion.session_id "$ESTADO/ruteo.json") prompt="/piloto $paso continuar"
    fi
    anotar_en_curso "$paso" "$sid" "$desde" "$modelo" "$effort"
  fi

  # Los pasos de datos y seguridad corren hasta el plan: la compuerta de datos se decide con el plan en la mano.
  if { [[ "$paso" =~ ^4\.(15|24|25|26|27)(-|$) ]] || [ "$tipo_ruteo" = datos ]; } && [ ! -f "$COMUN/aprobado-$(sanear "$paso")" ]; then
    prompt="$prompt --hasta-plan"
  fi

  SALIDA_PASO="$ESTADO/llamadas/paso-ultimo.json"
  registro "paso $paso ($modelo, $effort, $modo ${sid:0:8})."
  correr_paso "$paso" "$modo" "$sid" "$prompt" "$modelo" "$effort" "${banderas[@]}"
  case "$?" in
    1) fallas; parada "el paso $paso falló dos veces (el proceso o sin ultimo.json válido); su transcript queda en .piloto/llamadas/" "$paso"; return 0 ;;
    2) parada "el límite de uso volvió tras dormir en $paso" "$paso"; return 0 ;;
    3) parada_tope "$paso"; return 0 ;;
  esac
  case "$(jq -r .resultado "$ESTADO/ultimo.json")" in
    listo)
      registro "$paso listo: $(jq -r .resumen "$ESTADO/ultimo.json" | head -c 300)"
      cerrar_listo "$paso" "$desde" false
      [ -n "$HASTA" ] && [ "$paso" = "$HASTA" ] && [ ! -f "$ESTADO/en-curso.json" ] && { registro "llegamos a $HASTA."; exit 0; }
      ;;
    compuerta) compuerta_del_paso "$paso" ;;
    falla)
      fallas
      parada "el paso $paso terminó en falla: $(jq -r .resumen "$ESTADO/ultimo.json" | head -c 300)" "$paso"
      ;;
  esac
  return 0
}

# --- el programa ---
if [ "$EN_SECO" = 1 ]; then
  [ -n "$NOTA" ] && [ -s "$NOTA" ] && cp -f "$NOTA" "$ESTADO/nota-en-seco.md"
  verificar_copia || echo "AVISO (en seco): la copia no coincide con bin.sha256."
  bash "$BIN/hechos.sh" >"$ESTADO/hechos.json" || exit 1
  rutear || { echo "el ruteo no devolvió un resultado válido"; exit 1; }
  echo "--- el JSON del ruteo ---"
  jq . "$ESTADO/ruteo.json"
  disco=$(hecho .disco_pct)
  [ -n "$disco" ] && [ "$disco" != null ] && [ "$disco" -gt "$DISCO_MAX" ] && echo "AVISO (en seco, sigo): el disco está al ${disco} % (tope ${DISCO_MAX} %)."
  paso_en_seco "$(jq -r .paso "$ESTADO/ruteo.json")" "$(jq -r .modelo "$ESTADO/ruteo.json")" "$(jq -r .effort "$ESTADO/ruteo.json")"
  exit 0
fi

registro "bucle en marcha (copia $BIN, rama $(git symbolic-ref --short HEAD 2>/dev/null), hasta=${HASTA:-—})."
while :; do
  vuelta
  [ "$UNA_VUELTA" = 1 ] && exit 0
  [ "$(cat "$ESTADO/fallas" 2>/dev/null || echo 0)" -ge 3 ] && { parada "tres fallas seguidas"; echo 0 >"$ESTADO/fallas"; }
done
