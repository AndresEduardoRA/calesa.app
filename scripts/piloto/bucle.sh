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
# PILOTO_TOPE_USD_PASO (200: el paso ENTERO, con sus retomas y reintentos; era 60 hasta el 4.15), PILOTO_TOPE_USD_MIN (5: con menos, el paso no se lanza),
# PILOTO_DORMIR (sleep), PILOTO_POLL (5 s entre lecturas de la decisión), PILOTO_ESPERA_MAX (sin tope).
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
# shellcheck source=compuerta.sh
source "$BIN/compuerta.sh"
# shellcheck source=reparar.sh
source "$BIN/reparar.sh"
# shellcheck source=carril.sh
source "$BIN/carril.sh"
# shellcheck source=cierre.sh
source "$BIN/cierre.sh"
# shellcheck source=gasto.sh
source "$BIN/gasto.sh"
# shellcheck source=ci.sh
source "$BIN/ci.sh"
# shellcheck source=corrido.sh
source "$BIN/corrido.sh"
cd "$RAIZ" || exit 1

HASTA="" EN_SECO=0 NOTA="" UNA_VUELTA=0
ARGS_BUCLE=("$@")
while [ "$#" -gt 0 ]; do
  case "$1" in
    --hasta) HASTA="${2:-}"; shift 2 ;;
    --en-seco) EN_SECO=1; shift ;;
    --nota) NOTA="${2:-}"; shift 2 ;;
    --una-vuelta) UNA_VUELTA=1; shift ;;
    *) echo "uso: bucle.sh [--hasta <paso>] [--en-seco [--nota <archivo>]] [--una-vuelta]" >&2; exit 64 ;;
  esac
done
DISCO_MAX="${PILOTO_DISCO_MAX:-90}" TOPE_RUTEO="${PILOTO_TOPE_USD_RUTEO:-0.5}" TOPE_PASO="${PILOTO_TOPE_USD_PASO:-200}"
TOPE_MIN="${PILOTO_TOPE_USD_MIN:-5}"
DORMIR="${PILOTO_DORMIR:-sleep}" POLL="${PILOTO_POLL:-5}"
# El CI ya no frena (ci.sh): los rojos se anotan, y se arreglan con un paso «ci-fix» sin ruteo cuando se juntan CI_ARREGLAR_DESDE (3) o en la
# puerta de fase. CI_FIX_MAX intentos (2) por racha de rojos; CI_ESPERA_MAX s (5400) esperando un CI en curso en la puerta de fase.
CI_ARREGLAR_DESDE="${PILOTO_CI_ARREGLAR_DESDE:-3}" CI_FIX_MAX="${PILOTO_CI_FIX_MAX:-2}"
CI_ESPERA_MAX="${PILOTO_CI_ESPERA_MAX:-5400}" CI_POLL="${PILOTO_CI_POLL:-60}"
# La espera a main (compuerta «espera»): cada ESPERA_MAIN_POLL s (120) mira origin/main, hasta ESPERA_MAIN_MAX s (21600: 6 h).
ESPERA_MAIN_POLL="${PILOTO_ESPERA_MAIN_POLL:-120}" ESPERA_MAIN_MAX="${PILOTO_ESPERA_MAIN_MAX:-21600}"
ESPERA_MAIN_VECES="${PILOTO_ESPERA_MAIN_VECES:-3}"
CLAUDE=$(claude_bin)
[ -n "$CLAUDE" ] || { echo "bucle: no encuentro el binario de claude (CLAUDE_BIN)." >&2; exit 1; }

mkdir -p "$ESTADO/llamadas" "$ESTADO/sesiones" "$ESTADO/planes" "$ESTADO/informes" "$ESTADO/salidas" "$COMUN"
exec 8>"$ESTADO/bucle.lock"
# Relanzado por copia_al_dia, espera un poco a que se suelte el candado del bucle de antes; si no, ya corre otro y sale.
if [ -n "${PILOTO_RELANZADO:-}" ]; then
  flock -w 30 8 || { echo "bucle: el candado de $ESTADO/bucle.lock no se soltó en 30 s tras relanzarme." >&2; exit 1; }
else
  flock -n 8 || { echo "bucle: ya corre otro bucle (flock sobre $ESTADO/bucle.lock)." >&2; exit 1; }
fi

# La carpeta de la copia con la que corre este bucle: copiar-bin.sh no borra una copia vieja que un bucle vivo todavía usa.
printf '%s\n' "$BIN" >"$ESTADO/bin-en-uso" 2>/dev/null

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

# 0'. La copia al día con main (copiar-bin.sh): si se integró un cambio de `scripts/piloto/`, entre pasos se rehace la copia y el bucle se
# relanza con ella (`exec`, mismo carril y mismas opciones; el estado vive en disco). Antes había que re-arrancar cada carril a mano o
# con un vigilante fuera del repo (≈ 4 h 30 del 5 al 7-11-2026). Con un paso vivo no se toca nada.
copia_al_dia() {
  [ "$EN_SECO" = 1 ] && return 0
  [ "${PILOTO_RECARGAR:-1}" = 0 ] && return 0
  en_curso_vivo && return 0
  git remote get-url origin >/dev/null 2>&1 || return 0
  timeout 60 git fetch -q origin main 2>/dev/null 8>&-
  bash "$BIN/copiar-bin.sh" --si-cambio >>"$ESTADO/copiar-bin.log" 2>&1 8>&-
  local rc=$?
  # La copia es común: si otro carril ya la puso al día (bin.origen ya es el de main), copiar-bin no copia y este bucle seguía con SU carpeta
  # vieja. Manda la carpeta que corre contra la vigente (`bin`), no quién copió: el C corrió la copia de las 04:06 hasta las 10:22 del 8-11,
  # sin «sin compuertas» ni empujar el merge que resolvía su choque.
  [ "$rc" = 10 ] || [ "$(readlink -f "$COMUN/bin" 2>/dev/null)" != "$(readlink -f "$BIN")" ] || return 0
  registro "los scripts del piloto cambiaron en main: me relanzo con la copia nueva ($(cut -c1-8 "$COMUN/bin.origen" 2>/dev/null))."
  exec 8>&-
  PILOTO_RELANZADO=1 exec bash "$COMUN/bin/bucle.sh" "${ARGS_BUCLE[@]+"${ARGS_BUCLE[@]}"}"
}

# 3. El ruteo: sólo lee, por construcción (sin Bash ni Edit). Un resultado válido o un segundo intento; si no, aviso.
ruteo_valido() {
  jq -e '.structured_output | type == "object" and (.paso | type == "string") and (.modelo | IN("sonnet", "opus"))
    and (.effort | IN("low", "medium", "high", "xhigh")) and (.sesion.tipo | IN("nueva", "continuar"))
    and (.compuerta.tipo | IN("ninguna", "datos", "dependencia", "hito", "fase", "producto", "atasco", "afuera"))' "$1" >/dev/null 2>&1
}
rutear() {
  local salida="$ESTADO/llamadas/ruteo-ultimo.json" intento=0 espera inicio red=0
  while [ "$intento" -lt 2 ]; do
    respetar_limite
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
    # Ni el límite ni un corte de red gastan un intento: se duerme y se vuelve a rutear.
    if espera=$(segundos_de_limite "$salida" "$ESTADO/llamadas/ruteo.err"); then
      registro "límite de uso en el ruteo: duermo $espera s."
      anotar_limite "$espera"
      dormir_largo "$espera"
      continue
    fi
    if [ "$red" -lt "${PILOTO_RED_VECES:-24}" ] && espera=$(segundos_de_red "$salida" "$ESTADO/llamadas/ruteo.err" "$((red + 1))"); then
      red=$((red + 1))
      registro "sin red, error del servidor o sesión vencida en el ruteo (vez $red): espero $espera s."
      dormir_largo "$espera"
      continue
    fi
    intento=$((intento + 1))
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
    a/?*) modo_carril || true ;;
    "${PILOTO_CARRIL:-/}"/?*) ;;
    # Un arreglo prestado trabaja en la rama del PR de otro carril (la que asignó el coordinador).
    "$(modo_carril && jq -r '.rama // "/"' "$ESTADO/asignado.json" 2>/dev/null || echo /)") ;;
    *)
      # Con carril, sin un paso en curso y con el árbol limpio, la rama la saca carril_asignar: un worktree que quedó en main (el
      # coordinador integraba con --delete-branch y pasaba a main el árbol del A, 2026-11-08) no es motivo de parar.
      if ! { modo_carril && [ ! -f "$ESTADO/en-curso.json" ] && [ "$(hecho .arbol_limpio)" = true ]; }; then
        chequeo rama "la rama es «$(hecho .rama)», no la del carril ${PILOTO_CARRIL:-A} (${PILOTO_CARRIL:-a}/…)" || return 1
      fi
      ;;
  esac
  if [ "$(hecho .arbol_limpio)" != true ] && [ ! -f "$ESTADO/en-curso.json" ]; then
    chequeo arbol "el árbol está sucio y no hay un paso en curso" || return 1
  fi
  disco=$(hecho .disco_pct)
  if [ -n "$disco" ] && [ "$disco" != null ] && [ "$disco" -gt "$DISCO_MAX" ]; then
    reparar_disco "$DISCO_MAX" || chequeo disco "el disco está al ${disco} % (tope ${DISCO_MAX} %: libera espacio o arranca con PILOTO_DISCO_MAX)" || return 1
  fi
  # Un CI rojo no frena: se anota en .piloto/ci-rojos.md y el ruteo lo ve (ci.sh). Frena la base en rojo y la acumulación.
  ci_resolver "$(hecho .rama)" || chequeo ci "$CI_MOTIVO" || return 1
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
# Un id que es un paso propio del plan del coordinador (`  - id: '4.20-4a'`), no una parte de otro.
es_paso_del_plan() {
  grep -qE "^  - id: ['\"]?$(sed 's/[.[\*^$]/\\&/g' <<<"$1")['\"]?[[:space:]]*$" "${COORD_PLAN:-$RAIZ/docs/plan.yaml}" 2>/dev/null
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
  local paso="$1" modo="$2" sid="$3" prompt="$4" modelo="$5" effort="$6" rc espera limite=0 reintento=0 resultado inicio dur red=0
  shift 6
  while :; do
    le_queda || return 3
    respetar_limite
    inicio=$SECONDS
    lanzar_paso "$modo" "$sid" "$prompt" "$modelo" "$effort" "$@"
    rc=$?
    dur=$((SECONDS - inicio))
    anotar_gasto "$SALIDA_PASO"
    if espera=$(segundos_de_limite "$SALIDA_PASO" "$ESTADO/llamadas/paso.err"); then
      consumo paso "$paso" "$modelo" "$effort" limite "$SALIDA_PASO" "$dur"
      limite=$((limite + 1))
      if [ "${PILOTO_LIMITE_VECES:-0}" -gt 0 ] && [ "$limite" -gt "$PILOTO_LIMITE_VECES" ]; then
        registro "el límite de uso volvió $limite veces en $paso: aviso."
        return 2
      fi
      registro "límite de uso en $paso (vez $limite): duermo $espera s y retomo con --resume."
      anotar_limite "$espera"
      dormir_largo "$espera"
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
    if [ "$red" -lt "${PILOTO_RED_VECES:-24}" ] && espera=$(segundos_de_red "$SALIDA_PASO" "$ESTADO/llamadas/paso.err" "$((red + 1))"); then
      red=$((red + 1))
      consumo paso "$paso" "$modelo" "$effort" sin-red "$SALIDA_PASO" "$dur"
      registro "sin red, error del servidor o sesión vencida en $paso (vez $red): espero $espera s y retomo con --resume."
      dormir_largo "$espera"
      # Una sesión que no llegó a existir (cayó antes del primer turno) no se puede retomar: la misma llamada otra vez.
      if [ "$modo" = nueva ] && ! ls "$HOME"/.claude/projects/*/"$sid".jsonl >/dev/null 2>&1; then continue; fi
      modo=resume prompt="/piloto $paso continuar"
      continue
    fi
    consumo paso "$paso" "$modelo" "$effort" fallo-proceso "$SALIDA_PASO" "$dur"
    if [ "$reintento" = 1 ]; then return 1; fi
    reintento=1
    registro "el paso $paso falló (rc=$rc o sin ultimo.json válido): un reintento con --resume $sid."
    modo=resume prompt="/piloto $paso continuar"
  done
}

# Una compuerta que espera algo de main: la «espera» (con su `pedido`) o una «afuera» de antes que lo dice con palabras (las del C en el
# 4.24-3: «sigue sin estar en main», «no está en main»).
espera_a_main() {
  jq -e '.compuerta.tipo == "espera" or (.compuerta.tipo == "afuera" and ((.compuerta.motivo // "") + " " + (.compuerta.pregunta // "") |
    test("(no est[áa]|sin estar|no lleg[óo]|no ha llegado|falta que llegue)[^.]{0,40}(en|a) (origin/)?main"; "i")))' "$ESTADO/ultimo.json" >/dev/null 2>&1
}

# esperar_main <paso>: el paso necesita algo que otro carril integra en main. No es de la persona: con carril, el pedido va al coordinador
# (el carril dueño lo toma como su próximo paso, `pedido-<n>`); el bucle mira origin/main cada ESPERA_MAIN_POLL s hasta que cambie y traiga
# los `archivos` que el paso nombró, lo trae a la rama (el árbol puede tener trabajo sin commitear: git se niega si lo pisaría) y contesta
# la compuerta sola: el paso se retoma con «main ya trae …» en hechos › decision. Antes, cada espera era una compuerta al celular y un
# relanzamiento a mano (B y C, 11 veces del 6 al 7-11). Pasado ESPERA_MAIN_MAX, es una parada.
esperar_main() { # <paso>
  local paso="$1" pedido pedido_id="" inicio=$SECONDS antes ahora f cambio veces archivos=() blobs=() i
  pedido=$(jq -r '.compuerta.pedido // .compuerta.motivo // ""' "$ESTADO/ultimo.json")
  mapfile -t archivos < <(jq -r '.compuerta.archivos[]? // empty' "$ESTADO/ultimo.json")
  jq -c '.estado = "espera"' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" && mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
  # Cada espera retoma el paso (un --resume pagado) y el paso puede volver a pedir otra: hasta ESPERA_MAIN_VECES por paso, después la persona.
  mkdir -p "$ESTADO/paradas-solas"
  veces=$(($(cat "$ESTADO/paradas-solas/espera-$(sanear "$paso")" 2>/dev/null || echo 0) + 1))
  echo "$veces" >"$ESTADO/paradas-solas/espera-$(sanear "$paso")"
  if [ "$veces" -gt "$ESPERA_MAIN_VECES" ]; then
    PARADA_HUMANA=1 parada "el paso $paso pidió esperar a main $veces veces y sigue sin lo que necesita: ${pedido:0:200}" "$paso"
    return 0
  fi
  if modo_carril && [ "$(jq -r .compuerta.tipo "$ESTADO/ultimo.json")" = espera ]; then
    if coordinador pedir "$PILOTO_CARRIL" "$paso" "$pedido" "${archivos[@]}" >"$ESTADO/pedido.json" 2>"$ESTADO/coordinador.err"; then
      pedido_id=$(jq -r '.id // empty' "$ESTADO/pedido.json")
      registro "pedido $pedido_id al carril $(jq -r '.para // "?"' "$ESTADO/pedido.json") ($paso): ${pedido:0:200}"
    elif grep -q 'ciclo:' "$ESTADO/coordinador.err"; then
      PARADA_HUMANA=1 parada "$(sed -n 's/.*\(ciclo: .*\)/\1/p' "$ESTADO/coordinador.err" | head -n 1) ($paso: ${pedido:0:150})" "$paso"
      return 0
    else
      registro "el coordinador no anotó el pedido de $paso: $(tail -n 1 "$ESTADO/coordinador.err")"
    fi
  fi
  timeout 60 git fetch -q origin main 2>/dev/null 8>&-
  antes=$(git rev-parse --verify --quiet origin/main)
  # Lo que cada archivo pedido es hoy en main (vacío si no existe): se despierta cuando TODOS cambiaron (se crearon o se editaron), o
  # cuando el dueño cerró el pedido (hecho o sin cambios). Sin archivos (una «afuera» de antes), con el primer cambio de main.
  for f in "${archivos[@]}"; do blobs+=("$(git rev-parse --verify --quiet "origin/main:$f" 2>/dev/null)"); done
  registro "$paso espera a main (desde ${antes:0:8}, vez $veces de $ESPERA_MAIN_VECES): ${pedido:0:300}"
  while :; do
    [ -f "$ESTADO/PARAR" ] && { registro "PARAR mientras $paso esperaba a main."; exit 0; }
    if [ $((SECONDS - inicio)) -ge "$ESPERA_MAIN_MAX" ]; then
      PARADA_HUMANA=1 parada "el paso $paso espera algo de main hace $(((SECONDS - inicio) / 60)) min y no llegó: ${pedido:0:200}" "$paso"
      return 0
    fi
    $DORMIR "$ESPERA_MAIN_POLL"
    timeout 60 git fetch -q origin main 2>/dev/null 8>&-
    ahora=$(git rev-parse --verify --quiet origin/main)
    if [ -n "$pedido_id" ] && [ "$(coordinador pedido "$pedido_id" 2>/dev/null | jq -r '.estado // empty')" = integrado ]; then break; fi
    [ -n "$ahora" ] && [ "$ahora" != "$antes" ] || continue
    [ "${#archivos[@]}" -eq 0 ] && break
    cambio=1
    for i in "${!archivos[@]}"; do
      [ "$(git rev-parse --verify --quiet "origin/main:${archivos[$i]}" 2>/dev/null)" != "${blobs[$i]}" ] || { cambio=0; break; }
    done
    [ "$cambio" = 1 ] && break
  done
  ahora=$(git rev-parse --verify --quiet origin/main)
  if ! git merge-base --is-ancestor origin/main HEAD && ! git merge --quiet --no-edit origin/main >"$ESTADO/traer-main.log" 2>&1 8>&-; then
    git merge --abort >/dev/null 2>&1
    PARADA_HUMANA=1 parada "main ya trae lo que esperaba $paso, pero no pude traerlo a la rama: $(grep -m1 -iE 'error|conflict' "$ESTADO/traer-main.log" | head -c 200)" "$paso"
    return 0
  fi
  # La etiqueta es lo que el paso lee en hechos › decision (contestar_solo guarda lo de antes de « — »).
  compuerta espera "$paso" "main cambió (${ahora:0:8}): ${pedido:0:200}" "¿Sigue $paso?" \
    "seguir: main ya trae ${ahora:0:8} y está en tu rama; mira si llegó lo que pediste («${pedido:0:120}») y, si no, pide otra «espera» — el paso sigue"
  registro "$paso: main trajo ${ahora:0:8}; lo traje a la rama y retomo el paso."
  return 0
}

# 6. La compuerta que pidió el paso (de ultimo.json).
compuerta_del_paso() { # <paso>
  local paso="$1" opciones=() rc
  if espera_a_main; then esperar_main "$paso"; return 0; fi
  mapfile -t opciones < <(jq -r '.compuerta.opciones[]? | "\(.etiqueta) — \(.descripcion)"' "$ESTADO/ultimo.json")
  mapfile -t CONTEXTO < <(jq -r '.compuerta.contexto[]? // empty' "$ESTADO/ultimo.json")
  PREGUNTAS=$(jq -c '.compuerta.preguntas // empty | select(length > 0)' "$ESTADO/ultimo.json")
  jq -c '.estado = "compuerta"' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" && mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
  compuerta "$(jq -r .compuerta.tipo "$ESTADO/ultimo.json")" "$paso" \
    "$(jq -r '.compuerta.motivo // ""' "$ESTADO/ultimo.json") (el paso lleva $(dinero "$(gastado)") de $(dinero "$(tope_del_paso)") USD)" \
    "$(jq -r '.compuerta.pregunta // .compuerta.motivo // ""' "$ESTADO/ultimo.json")" "${opciones[@]}"
  rc=$?
  PREGUNTAS=""
  [ "$rc" = 3 ] && parar_o_aparcar "$paso" "compuerta $(jq -r .compuerta.tipo "$ESTADO/ultimo.json") sin salida: $(jq -r '.compuerta.motivo // .compuerta.pregunta // ""' "$ESTADO/ultimo.json" | head -c 300)"
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

# El paso «ci-fix»: arreglar los CI rojos anotados. No sale del PLAN, así que no pasa por el ruteo: se escribe su ruteo.json y el resto de la
# vuelta (sesión nueva, tope, cierre con verificar y publicar) es el de cualquier paso. Cuenta el intento; un CI verde lo reinicia (ci.sh).
ruteo_ci_fix() {
  local n
  n=$(cat "$ESTADO/ci-fix-intentos" 2>/dev/null || echo 0)
  echo $((n + 1)) >"$ESTADO/ci-fix-intentos"
  registro "paso ci-fix ($((n + 1)) de $CI_FIX_MAX): $(ci_rojos_n) CI rojos sin arreglar."
  jq -nc '{paso: "ci-fix", titulo: "Arreglar los CI rojos anotados", modelo: "opus", effort: "high",
    sesion: {tipo: "nueva", session_id: null}, nivel: {nivel: 1, disparadores: [], cuenta_e2e: 0, completo: false},
    compuerta: {tipo: "ninguna", motivo: ""}, particion: "", por_que: "hay CI rojos sin arreglar (.piloto/ci-rojos.md)"}' >"$ESTADO/ruteo.json"
}
# Tras un ci-fix, el siguiente espera a un CI que ya incluya ese arreglo (`ci-fix-head`): el 7-11 el A corrió el 2 de 2 antes de que corriera
# el CI del primero, y gastó el último intento en algo ya arreglado.
# Un pedido de otro carril (coordinador.mjs › pedir): tampoco sale del PLAN; su ruteo lo escribe el bucle. Es un arreglo chico en lo que este
# carril posee (un registro, una prueba, un archivo de src/app), con su test; sonnet alcanza, salvo que toque datos (la sesión lo dice).
ruteo_pedido() {
  jq -c '{paso: .paso, titulo: ("Pedido de " + .pedido.de + " (" + .pedido.paso + ")"), modelo: "sonnet", effort: "high",
    sesion: {tipo: "nueva", session_id: null}, nivel: {nivel: 1, disparadores: [], cuenta_e2e: 0, completo: false},
    compuerta: {tipo: "ninguna", motivo: ""}, particion: "", por_que: ("pedido del carril " + .pedido.de + ": " + .pedido.texto)}' \
    "$ESTADO/asignado.json" >"$ESTADO/ruteo.json"
}
ci_acumulado() {
  [ "$(ci_rojos_n)" -ge "$CI_ARREGLAR_DESDE" ] && [ "$(cat "$ESTADO/ci-fix-intentos" 2>/dev/null || echo 0)" -lt "$CI_FIX_MAX" ] || return 1
  [ -f "$ESTADO/ci-fix-head" ] || return 0
  [ -n "${CI_SHA:-}" ] && [ "${CI_ESTADO:-}" != corriendo ] && git merge-base --is-ancestor "$(cat "$ESTADO/ci-fix-head")" "$CI_SHA" 2>/dev/null
}
anotar_ci_fix() { [ "$1" = ci-fix ] && git rev-parse HEAD >"$ESTADO/ci-fix-head"; return 0; }

# La puerta de fase (abrir una fase, o los pasos 4.18 y 4.28): el CI de la rama tiene que estar en verde, sin rojos anotados. Un CI en
# curso se espera; uno rojo se manda a arreglar (paso ci-fix, hasta CI_FIX_MAX veces) y la puerta se vuelve a mirar. Ya no la decide la
# persona: la decide el CI. Devuelve 0 si pasa, 1 si hay que volver a rutear (va un ci-fix o la persona dijo «reintentar»).
puerta_de_fase() { # <paso>
  local paso="$1" inicio=$SECONDS n rc rama_ci modo=""
  # Con carriles, lo que tiene que andar es main, donde se integra todo; la rama del paso es nueva y no tiene CI (el 4.18 paró por «sin»).
  # Y de main se mira el último veredicto del workflow `ci`, sin esperar a la corrida que la integración siguiente va a cancelar (ci.sh).
  rama_ci=$(hecho .rama)
  modo_carril && rama_ci=main modo=veredicto
  while :; do
    ci_resolver "$rama_ci" $modo || { parada "$CI_MOTIVO" "$paso"; rc=$?; [ "$rc" = 2 ] && return 0; return 1; }
    # Con carriles, un rojo de main se vuelve a correr una vez (sólo lo que cayó) antes de gastar una sesión en él: los rojos de main del
    # 11 y 12-11-2026 con un job caído a la vista fueron del runner (apt, y Docker Hub con «toomanyrequests»). Y el de la base
    # (`rojo-base`) no entraba en ningún caso de abajo: terminaba en «no encuentra un CI completo» en vez de ir al ci-fix.
    if [ -n "$modo" ] && [[ "$CI_ESTADO" == rojo* ]] && [ ! -f "$ESTADO/puertas/rerun-$CI_ID" ] &&
      timeout 60 gh run rerun "$CI_ID" --failed >/dev/null 2>&1; then
      mkdir -p "$ESTADO/puertas" && touch "$ESTADO/puertas/rerun-$CI_ID"
      registro "puerta de fase ($paso): el CI $CI_ID de $rama_ci está en rojo ($CI_FALLO): vuelvo a correr lo que cayó, una vez."
      CI_ESTADO=corriendo
    fi
    [ -n "$modo" ] && [ "$CI_ESTADO" = rojo-base ] && CI_ESTADO=rojo
    case "$CI_ESTADO" in
      verde)
        registro "puerta de fase ($paso): el CI $CI_ID está en verde."
        return 0 ;;
      corriendo)
        if [ $((SECONDS - inicio)) -ge "$CI_ESPERA_MAX" ]; then
          parada "el CI $CI_ID sigue corriendo tras ${CI_ESPERA_MAX} s: la puerta de fase de $paso espera un verde" "$paso"
          rc=$?; [ "$rc" = 2 ] && return 0
          return 1
        fi
        $DORMIR "$CI_POLL" ;;
      rojo)
        n=$(cat "$ESTADO/ci-fix-intentos" 2>/dev/null || echo 0)
        if [ "$n" -ge "$CI_FIX_MAX" ]; then
          parada "la puerta de fase de $paso: el CI $CI_ID sigue en rojo tras $n intentos de arreglarlo ($CI_FALLO)" "$paso"
          rc=$?; [ "$rc" = 2 ] && return 0
          return 1
        fi
        registro "puerta de fase ($paso): el CI $CI_ID de $rama_ci está en rojo ($CI_FALLO): se arregla antes de seguir."
        touch "$ESTADO/forzar-ci-fix"
        return 1 ;;
      *)
        parada "la puerta de fase de $paso no encuentra un CI completo de la rama ($CI_ESTADO): ¿sigo?" "$paso"
        rc=$?; [ "$rc" = 2 ] && return 0
        return 1 ;;
    esac
  done
}

# La puerta que pide el plan para el paso asignado, si todavía no se pasó.
puerta_del_plan() {
  modo_carril && jq -e '.puerta == true' "$ESTADO/asignado.json" >/dev/null 2>&1 &&
    [ ! -f "$ESTADO/puertas/$(sanear "$(jq -r .paso "$ESTADO/asignado.json")")" ]
}
puerta_pasada() {
  modo_carril && jq -e '.puerta == true' "$ESTADO/asignado.json" >/dev/null 2>&1 || return 0
  mkdir -p "$ESTADO/puertas" && touch "$ESTADO/puertas/$(sanear "$(jq -r .paso "$ESTADO/asignado.json")")"
}

# `hechos.json` lo lee el ruteo: se regenera al empezar la vuelta y otra vez tras asignar el paso de un carril (`carril_asignar` escribe
# `asignado.json` después de los primeros hechos, y sin esto el ruteo veía `asignado: null` y elegía por ESTADO: 4.20-2 y 4.17-5b en vez de 4.21 y 4.24).
regenerar_hechos() {
  bash "$BIN/hechos.sh" >"$ESTADO/hechos.json.tmp" 2>"$ESTADO/hechos.err" && mv -f "$ESTADO/hechos.json.tmp" "$ESTADO/hechos.json" ||
    { parada "hechos.sh falló: $(tail -n 2 "$ESTADO/hechos.err" | tr '\n' ' ')"; return 1; }
}

# Una vuelta. Devuelve 0 cuando hay que volver a rutear; los avisos que paran salen del bucle desde `parada`.
vuelta() {
  local paso modelo effort modo sid prompt desde banderas=() tipo_ruteo
  copia_al_dia
  verificar_copia || { parada "la copia de los scripts del piloto no coincide con bin.sha256 (alterada o con archivos de más)"; return 0; }
  regenerar_hechos || return 0
  paradas_deterministas || return 0

  # Un cierre pendiente (el paso quedó «listo» y no se verificó o publicó): sin modelo.
  if [ "$(jq -r '.estado // empty' "$ESTADO/en-curso.json" 2>/dev/null)" = listo ]; then
    paso=$(jq -r .paso "$ESTADO/en-curso.json")
    cerrar_listo "$paso" "$(jq -r .head_arranque "$ESTADO/en-curso.json")" "$(jq -r '.guardas_aprobadas // false' "$ESTADO/en-curso.json")"
    [ -f "$ESTADO/en-curso.json" ] || anotar_ci_fix "$paso"
    [ -n "$HASTA" ] && [ "$paso" = "$HASTA" ] && [ ! -f "$ESTADO/en-curso.json" ] && { registro "llegamos a $HASTA."; exit 0; }
    return 0
  fi

  # Con carril: el coordinador da el paso (y su rama) antes del ruteo; sin paso libre, el carril espera.
  if modo_carril && [ ! -f "$ESTADO/en-curso.json" ] && [ ! -f "$ESTADO/forzar-ci-fix" ]; then
    carril_asignar
    case "$?" in
      0) rm -f "$ESTADO/esperando"; regenerar_hechos || return 0 ;;
      12) return 0 ;; # remendado y publicado sin sesión (carril.sh › remendar_sin_sesion): otra vuelta, sin esperar
      10)
        # Una línea cuando cambia el motivo, no una cada vuelta: un carril que espera días llenaba el registro (662 líneas el 7 y 8-11) y
        # no decía por qué esperaba. La hora de la última mirada es la fecha de `.piloto/esperando`.
        if [ "$(cat "$ESTADO/esperando" 2>/dev/null)" != "${ESPERA_MOTIVO:-}" ] || [ ! -f "$ESTADO/esperando" ]; then
          registro "carril $PILOTO_CARRIL: sin paso libre (${ESPERA_MOTIVO:-el coordinador no dijo por qué}); miro cada ${PILOTO_ESPERA_S:-120} s."
        fi
        printf '%s' "${ESPERA_MOTIVO:-}" >"$ESTADO/esperando"
        $DORMIR "${PILOTO_ESPERA_S:-120}"
        return 0
        ;;
      11) registro "carril $PILOTO_CARRIL: el coordinador no tiene más pasos para este carril."; exit 0 ;;
      *) parada "el coordinador no pudo asignar un paso al carril $PILOTO_CARRIL: $(tail -n 1 "$ESTADO/coordinador.err" 2>/dev/null)"; return 0 ;;
    esac
  fi

  if [ -f "$ESTADO/forzar-ci-fix" ] || { [ ! -f "$ESTADO/en-curso.json" ] && ci_acumulado; }; then
    rm -f "$ESTADO/forzar-ci-fix"
    ruteo_ci_fix
  elif jq -e '.pedido | type == "object"' "$ESTADO/asignado.json" >/dev/null 2>&1; then
    ruteo_pedido
  else
    rutear || { parada "el ruteo no devolvió un resultado válido"; return 0; }
  fi
  paso=$(jq -r .paso "$ESTADO/ruteo.json") modelo=$(jq -r .modelo "$ESTADO/ruteo.json") effort=$(jq -r .effort "$ESTADO/ruteo.json")
  # El coordinador asigna el paso entero (4.20) y el ruteo puede elegir una de sus partes (4.20-2c): vale `<asignado>` o `<asignado>-…`,
  # salvo que ese id sea OTRO paso del plan (4.20-4a es del carril A). Si el ruteo elige otra cosa (o «ninguno»), manda el coordinador:
  # el paso es el asignado y la sesión elige su parte. Antes era una parada a la persona (5 veces al arrancar los carriles, ≈ 2 h).
  local asignado_id=""
  [ -f "$ESTADO/asignado.json" ] && asignado_id=$(jq -r .paso "$ESTADO/asignado.json")
  if modo_carril && [ -n "$asignado_id" ] && [ "$paso" != ci-fix ] &&
    { [ "$paso" = ninguno ] || { [ "$paso" != "$asignado_id" ] && { [[ "$paso" != "$asignado_id"-* ]] || es_paso_del_plan "$paso"; }; }; }; then
    registro "el ruteo eligió $paso, pero el coordinador asignó $asignado_id al carril $PILOTO_CARRIL: sigo con $asignado_id."
    jq -c --arg p "$asignado_id" '.paso = $p | .sesion = {tipo: "nueva", session_id: null}' "$ESTADO/ruteo.json" >"$ESTADO/ruteo.json.tmp" &&
      mv -f "$ESTADO/ruteo.json.tmp" "$ESTADO/ruteo.json"
    paso="$asignado_id"
  fi
  [ "$paso" = ninguno ] && { registro "PLAN: el ruteo no ve ningún paso por avanzar."; exit 0; }
  tipo_ruteo=$(jq -r .compuerta.tipo "$ESTADO/ruteo.json")

  # Una compuerta que ve el ruteo (dependencia, hito, producto, atasco, afuera): se pregunta antes de gastar el paso y antes de anotar nada en en-curso.json (el paso no empezó). Una sola vez por paso y tipo.
  if [[ "$tipo_ruteo" =~ ^(dependencia|hito|producto|atasco|afuera)$ ]] && [ "$(cat "$ESTADO/ruteo-compuerta" 2>/dev/null)" != "$paso:$tipo_ruteo" ]; then
    echo "$paso:$tipo_ruteo" >"$ESTADO/ruteo-compuerta"
    compuerta "$tipo_ruteo" "$paso" "$(jq -r .compuerta.motivo "$ESTADO/ruteo.json")" "$(jq -r .compuerta.motivo "$ESTADO/ruteo.json")"
    if [ "$?" = 3 ]; then
      # Sin compuertas, el ruteo no para a nadie por algo que sólo supone: el paso corre y, si de verdad no puede, lo dirá él.
      if modo_carril && auto_nombra todo; then registro "el ruteo pedía parar en $paso ($tipo_ruteo); sin compuertas, el paso corre igual."
      else registro "parado por la persona en la compuerta de $paso."; exit 0; fi
    fi
    return 0
  fi

  # Un paso de Nivel 2 (o con el completo de la cuenta) corre `pnpm test:e2e:completo`, que exige las funciones edge, y el bucle no
  # las levanta (un proceso largo con contenedores, compartido entre worktrees, que carga el entorno de las funciones). Se avisa antes
  # de gastar el paso, no a mitad. Antes de anotar en-curso.json: si la persona para, no queda un paso que nunca empezó.
  if jq -e '.nivel.completo == true or (.nivel.nivel // 1) >= 2' "$ESTADO/ruteo.json" >/dev/null 2>&1; then
    local faltan
    faltan=$(hecho 'if (.funciones | type) == "object" then [.funciones | to_entries[] | select(.value != true) | .key] | join(", ") else "no se pudo mirar" end')
    if [ -n "$faltan" ] && reparar_funciones; then faltan=; fi
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
    # La puerta de fase (4.18, 4.28, abrir una fase): la decide el CI en verde, no la persona. Sólo al entrar (el paso entero o su
    # primera parte, 4.18-1 o 4.18-1a): las partes siguientes esperaban el CI de la parte anterior del mismo carril, 25–35 min
    # cada una (4.18-2, 2026-11-06), y un rojo suyo ya lo anota ci.sh y lo arregla un ci-fix.
    # Con carriles la puerta la dice el plan (`puerta: true` en docs/plan.yaml: el primer paso de una fase que construye sobre la
    # anterior, y su cierre), no el número del paso: una vez por paso (`.piloto/puertas/`), aunque se parta o se retome.
    if [[ "$paso" =~ ^4\.(18|28)(-1[a-z]?)?$ ]] || [ "$tipo_ruteo" = fase ] || puerta_del_plan; then
      puerta_de_fase "$paso" || return 0
      puerta_pasada
    fi
    modo=nueva sid=$(cat /proc/sys/kernel/random/uuid) desde=$(git rev-parse HEAD) prompt="/piloto $paso"
    if [ "$(jq -r .sesion.tipo "$ESTADO/ruteo.json")" = continuar ] && [ "$(jq -r '.sesion.session_id // ""' "$ESTADO/ruteo.json")" != "" ]; then
      modo=resume sid=$(jq -r .sesion.session_id "$ESTADO/ruteo.json") prompt="/piloto $paso continuar"
    fi
    anotar_en_curso "$paso" "$sid" "$desde" "$modelo" "$effort"
  fi

  # Los pasos de datos y seguridad corren hasta el plan: la compuerta de datos se decide con el plan en la mano.
  # Sin compuertas (PILOTO_AUTO con «datos» o «todo») nadie mira ese plan: parar en él era una retoma pagada para que el bucle se
  # contestara solo; el SQL de seguridad se aprueba al publicar (cierre.sh › aprobar_seguridad_solo).
  if { [[ "$paso" =~ ^4\.(15|24|25|26|27)(-|$) ]] || [ "$tipo_ruteo" = datos ]; } && [ ! -f "$COMUN/aprobado-$(sanear "$paso")" ] &&
    ! auto_nombra datos; then
    prompt="$prompt --hasta-plan"
  fi

  SALIDA_PASO="$ESTADO/llamadas/paso-ultimo.json"
  registro "paso $paso ($modelo, $effort, $modo ${sid:0:8})."
  correr_paso "$paso" "$modo" "$sid" "$prompt" "$modelo" "$effort" "${banderas[@]}"
  case "$?" in
    1) fallas; PARADA_HUMANA=1 parada "el paso $paso falló dos veces (el proceso o sin ultimo.json válido); su transcript queda en .piloto/llamadas/" "$paso"; return 0 ;;
    2) parada "el límite de uso volvió tras dormir en $paso" "$paso"; return 0 ;;
    3) parada_tope "$paso"; return 0 ;;
  esac
  case "$(jq -r .resultado "$ESTADO/ultimo.json")" in
    listo)
      registro "$paso listo: $(jq -r .resumen "$ESTADO/ultimo.json" | head -c 300)"
      cerrar_listo "$paso" "$desde" false
      [ -f "$ESTADO/en-curso.json" ] || anotar_ci_fix "$paso"
      [ -n "$HASTA" ] && [ "$paso" = "$HASTA" ] && [ ! -f "$ESTADO/en-curso.json" ] && { registro "llegamos a $HASTA."; exit 0; }
      ;;
    compuerta) compuerta_del_paso "$paso" ;;
    falla)
      fallas
      PARADA_HUMANA=1 parada "el paso $paso terminó en falla: $(jq -r .resumen "$ESTADO/ultimo.json" | head -c 300)" "$paso"
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
  [ "$(cat "$ESTADO/fallas" 2>/dev/null || echo 0)" -ge 3 ] && { PARADA_HUMANA=1 parada "tres fallas seguidas"; echo 0 >"$ESTADO/fallas"; }
done
