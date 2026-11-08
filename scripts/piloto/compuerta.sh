#!/usr/bin/env bash
# Las compuertas del bucle (se hace `source` desde bucle.sh; no se corre solo). Una compuerta es lo único que el bucle le pregunta a la
# persona: escribe `<común>/piloto/compuerta.md` (con un id nuevo), abre la sesión corta de decidir (`decidir.sh abrir`, que deja la copia
# de lectura en `.piloto/`) y espera. Sólo acepta `decision.md` si: su id es el de la compuerta vigente, es posterior a `compuerta.md` y
# ningún paso vivía cuando apareció (`en-curso.json` y `pgrep`); si no, la borra y sigue esperando. Con la decisión aceptada cierra la
# sesión de decidir y, con `datos` aprobada, escribe `aprobado-<paso>`. Nada sigue sin respuesta. Se prueba en `bucle.test.ts`.
#
# Variables que espera: COMUN, ESTADO, BIN, POLL (segundos entre lecturas), EN_SECO y la función `registro`. PREGUNTAS (JSON, opcional):
# las de una compuerta «producto», una por decisión; compuerta.md las lleva con cuántas tandas de 4 son (CAL-1).
# Resultado de `compuerta`: 0 sigue, 1 reintentar, 2 seguir ignorando el aviso, 3 parar. La decisión queda en DECISION_OPCION y DECISION_TEXTO.

PATRON_PASO_VIVO="${PILOTO_PGREP_PATRON:--p /piloto }"
sanear() { printf '%s' "${1//[^A-Za-z0-9._-]/_}"; }

# Las opciones de la compuerta, como líneas «etiqueta — descripción» (la recomendada primero), según su tipo.
opciones_de() {
  case "$1" in
    parada) printf '%s\n' 'parado — no sigue (recomendado)' 'reintentar — vuelve a intentar esta vuelta' 'sigo — ignora este aviso una vez' ;;
    guardas) printf '%s\n' 'aprobar — el cambio a las guardas es legítimo' 'parar — no se verifica ni se publica' ;;
    datos) printf '%s\n' 'aprobar — el plan de datos o seguridad está bien' 'cambiar — escribe qué cambiar en «Other»' 'parar — no sigue' ;;
    *) printf '%s\n' 'seguir con la recomendación — el paso continúa' 'parar — no sigue' ;;
  esac
}

# La clave de lo que la persona respondió (el primer término de la opción, sin mayúsculas ni comillas).
clave_de() {
  local op="${1,,}"
  op="${op#[\"«\']}"
  case "$op" in
    aprobar* | aprobado* | "sí"* | si | "si "* | seguir* | continuar*) echo aprobar ;;
    parar* | parado* | no | "no "* | detener*) echo parar ;;
    reintentar*) echo reintentar ;;
    sigo* | ignorar*) echo sigo ;;
    cambiar*) echo cambiar ;;
    *) echo libre ;;
  esac
}

# escribir_compuerta <tipo> <paso> <motivo> <pregunta> [opciones…] (sin opciones, las de su tipo); CONTEXTO (arreglo) = rutas.
# Con PREGUNTAS no hay opciones generales: cada decisión trae las suyas.
escribir_compuerta() {
  local tipo="$1" paso="$2" motivo="$3" pregunta="$4"
  shift 4
  local opciones=("$@") o
  [ "${#opciones[@]}" -gt 0 ] || [ -n "${PREGUNTAS:-}" ] || mapfile -t opciones < <(opciones_de "$tipo")
  mkdir -p "$COMUN" "$ESTADO"
  rm -f "${DECISION_MD:-$COMUN/decision.md}"
  COMPUERTA_ID="g-$(date +%s)-$RANDOM"
  {
    echo "id: $COMPUERTA_ID"
    echo "creada: $(date +%s)"
    echo "tipo: $tipo"
    echo "paso: $paso"
    echo "carril: ${PILOTO_CARRIL:-a}"
    echo "motivo: ${motivo//$'\n'/ }"
    echo "pregunta: ${pregunta//$'\n'/ }"
    echo "opciones:"
    for o in "${opciones[@]:-}"; do [ -n "$o" ] && echo "- $o"; done
    echo "contexto:"
    for o in "${CONTEXTO[@]:-}"; do [ -n "$o" ] && echo "- $o"; done
    if [ -n "${PREGUNTAS:-}" ]; then
      jq -r 'def una_linea: gsub("\n"; " ");
        "preguntas: \(length)", "tandas: \((length + 3) / 4 | floor)",
        (.[] | "- \(.id): \(.pregunta | una_linea)", (.opciones[] | "  - \(.etiqueta | una_linea) — \(.descripcion | una_linea)"))' <<<"$PREGUNTAS"
    fi
  } >"${COMPUERTA_MD:-$COMUN/compuerta.md}.tmp"
  mv -f "${COMPUERTA_MD:-$COMUN/compuerta.md}.tmp" "${COMPUERTA_MD:-$COMUN/compuerta.md}"
}

paso_vivo() {
  local pid
  pid=$(jq -r '.pid // empty' "$ESTADO/en-curso.json" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && return 0
  # `pgrep -f` sólo se excluye a sí mismo: el `pgrep` de otro bucle a la vez lleva el patrón en su línea y pasaba por un paso vivo
  # (rechazaba una decisión buena, 1 de cada 8 corridas de `pnpm test`). Se listan las líneas y se descartan las de otro `pgrep`.
  # Y sólo cuentan los de ESTE repo: el bucle de otro proyecto de la misma máquina (`calesa-web`) también corre `claude -p /piloto …`, y su
  # paso rechazó una decisión buena (2026-10-31, «apareció con un paso vivo»). Un paso vive en la raíz de su repo: se compara su `cwd`.
  local raiz otro
  raiz=$(cd -P "${RAIZ:-$(dirname "$ESTADO")}" 2>/dev/null && pwd -P) || return 1
  while read -r pid; do
    otro=$(readlink "/proc/$pid/cwd" 2>/dev/null) || continue
    [ "$otro" = "$raiz" ] && return 0
  done < <(pgrep -af -- "$PATRON_PASO_VIVO" 2>/dev/null | awk '$2 != "pgrep" { print $1 }')
  return 1
}

rechazar_decision() {
  registro "decisión rechazada: $1; se borra y se sigue esperando."
  rm -f "$COMUN/decision.md"
  return 1
}

decision_valida() {
  [ -s "$COMUN/decision.md" ] || return 1
  [ "$(sed -n 's/^id: *//p' "$COMUN/decision.md" | head -n 1)" = "$COMPUERTA_ID" ] || { rechazar_decision "el id es de otra compuerta"; return 1; }
  [ "$COMUN/decision.md" -nt "$COMUN/compuerta.md" ] || { rechazar_decision "es anterior a la compuerta"; return 1; }
  if paso_vivo; then rechazar_decision "apareció con un paso vivo"; return 1; fi
  return 0
}

esperar_decision() {
  local inicio=$SECONDS
  until decision_valida; do
    [ -f "$ESTADO/PARAR" ] && { registro "PARAR mientras se esperaba una decisión."; "$BIN/decidir.sh" cerrar 8>&- 9>&-; exit 0; }
    if [ "${PILOTO_ESPERA_MAX:-0}" -gt 0 ] && [ $((SECONDS - inicio)) -ge "$PILOTO_ESPERA_MAX" ]; then
      registro "nadie respondió en ${PILOTO_ESPERA_MAX} s."
      "$BIN/decidir.sh" cerrar 8>&- 9>&-
      exit 3
    fi
    sleep "$POLL"
  done
  DECISION_OPCION=$(sed -n 's/^opcion: *//p' "$COMUN/decision.md" | head -n 1)
  DECISION_TEXTO=$(sed -n 's/^me respondió: *//p' "$COMUN/decision.md" | head -n 1)
}

# Una compuerta se contesta sola con la recomendada (la primera opción), sin abrir la sesión de decidir: el piloto no espera a la persona
# por algo que el plan ya dejó recomendado. Cada respuesta queda en `.piloto/decisiones-automaticas.md` (qué, opciones y la elegida; en
# «guardas», la ruta del diff guardado en `.piloto/guardas/<paso>.diff`) para que la persona lo revise cuando quiera; si no está de
# acuerdo, lo dice y el paso siguiente lo corrige. `PILOTO_AUTO` lista los tipos que se contestan solos (por omisión «producto,datos,
# guardas,atasco»; vacío los apaga; la persona decidió el 2026-11-04 que pasen todas por la recomendada). Nunca `parada` (que se reintenta,
# no se contesta: parada_sola), `dependencia` ni `afuera`: son avisos de algo que el piloto no puede juzgar.
# `atasco`, una vez por paso (la persona, 2026-11-07: el C la esperó 1 h 15 min en el 4.25): la recomendada puede ser otra ronda, y sin
# tope serían rondas sin fin pagando sesiones; la segunda del mismo paso va a la persona. La cuenta, en `.piloto/atascos-solos/<paso>`.
# **Sin compuertas (la persona, 2026-11-08: «ya no quiero compuertas, todo decídelo tú en automático»):** `todo`, lo de omisión, contesta
# también `parada`, `dependencia` y `afuera`, y hasta tres `atasco` por paso. Una parada, una dependencia o una afuera se contestan con la
# primera opción que no para (eleccion_que_sigue); tras PILOTO_PARADAS_AUTO_MAX (3) del mismo motivo, con la que para: lo que repetir no
# arregla para ese carril, y queda dicho en decisiones-automaticas.md.
auto_nombra() { # <tipo>
  [[ ",${PILOTO_AUTO-todo}," == *",$1,"* || ",${PILOTO_AUTO-todo}," == *",todo,"* ]]
}
auto_contesta() { # <tipo> <paso>
  [ "${EN_SECO:-0}" != 1 ] || return 1
  # «espera» no es una pregunta: el bucle ya esperó a main y lo trajo (bucle.sh › esperar_main); sólo le deja la respuesta al paso.
  [ "$1" = espera ] && return 0
  auto_nombra "$1" || return 1
  local atascos
  case "$1" in
    producto) [ -n "${PREGUNTAS:-}" ] ;;
    datos | guardas) [ -z "${PREGUNTAS:-}" ] ;;
    atasco)
      atascos=$(cat "$ESTADO/atascos-solos/$(sanear "$2")" 2>/dev/null | wc -l)
      [ -z "${PREGUNTAS:-}" ] && { [ "$atascos" -eq 0 ] || { auto_nombra todo && [ "$atascos" -lt 3 ]; }; } ;;
    parada | dependencia | afuera) [ -z "${PREGUNTAS:-}" ] && auto_nombra todo ;;
    *) return 1 ;;
  esac
}
# eleccion_que_sigue <tipo> [opciones…]: la primera opción que no para («sigo» antes que «reintentar»); agotadas las del mismo motivo
# (`.piloto/paradas-auto/`), la que para.
eleccion_que_sigue() {
  local tipo="$1" op ops=() clave n archivo
  shift
  if [ "$#" -gt 0 ]; then ops=("$@"); else mapfile -t ops < <(opciones_de "$tipo"); fi
  clave=$(printf '%s %s' "$tipo" "${MOTIVO_COMPUERTA:-}" | tr -d '0-9' | sha256sum | cut -c1-16)
  archivo="$ESTADO/paradas-auto/$clave"
  mkdir -p "$ESTADO/paradas-auto"
  n=$(cat "$archivo" 2>/dev/null | wc -l)
  if [ "$n" -lt "${PILOTO_PARADAS_AUTO_MAX:-3}" ]; then
    ahora_lapaz >>"$archivo"
    for op in "${ops[@]}"; do [ "$(clave_de "$op")" = sigo ] && { echo "$op"; return 0; }; done
    for op in "${ops[@]}"; do [ "$(clave_de "$op")" = reintentar ] && { echo "$op"; return 0; }; done
    for op in "${ops[@]}"; do [ "$(clave_de "$op")" != parar ] && { echo "$op"; return 0; }; done
  fi
  for op in "${ops[@]}"; do [ "$(clave_de "$op")" = parar ] && { echo "$op"; return 0; }; done
  echo "${ops[0]}"
}
contestar_solo() { # <tipo> <paso> [opciones…]
  local tipo="$1" paso="$2" elegidas tmp primera
  shift 2
  tmp=$(mktemp "$(dirname "${DECISION_MD:-$COMUN/decision.md}")/decision.XXXXXX") || return 1
  if [ -n "${PREGUNTAS:-}" ]; then
    elegidas=$(jq -r '[.[] | "\(.id): \(.opciones[0].etiqueta) (Recommended)"] | join("; ")' <<<"$PREGUNTAS")
    jq -r --arg id "$COMPUERTA_ID" --arg creada "$(date +%s)" '
      "id: \($id)",
      "opcion: \([.[] | "\(.id): \(.opciones[0].etiqueta) (Recommended)"] | join(" · "))",
      "notas: ",
      "creada: \($creada)",
      "respuestas:",
      (.[] | "- \(.id): \(.opciones[0].etiqueta) (Recommended)"),
      "me respondió: «\([.[] | "\(.id): \(.opciones[0].etiqueta) (Recommended)"] | join("; "))»"' <<<"$PREGUNTAS" >"$tmp" || { rm -f "$tmp"; return 1; }
  else
    case "$tipo" in
      parada | dependencia | afuera) primera=$(eleccion_que_sigue "$tipo" "$@") ;;
      *) primera="${1:-$(opciones_de "$tipo" | head -n 1)}" ;;
    esac
    elegidas="${primera%% — *}"
    { echo "id: $COMPUERTA_ID"; echo "opcion: $elegidas"; echo "notas: "; echo "creada: $(date +%s)"; echo "me respondió: «$elegidas»"; } >"$tmp"
  fi
  mv -f "$tmp" "${DECISION_MD:-$COMUN/decision.md}"
  if [ "$tipo" = atasco ]; then
    mkdir -p "$ESTADO/atascos-solos" && ahora_lapaz >>"$ESTADO/atascos-solos/$(sanear "$paso")"
  fi
  {
    echo "## $(ahora_lapaz) · $paso · compuerta $tipo (contestada sola)"
    if [ -n "${PREGUNTAS:-}" ]; then
      jq -r '.[] | "- \(.id) — \(.pregunta | gsub("\n"; " "))", (.opciones | to_entries[] | "    \(if .key == 0 then "→" else " " end) \(.value.etiqueta) — \(.value.descripcion | gsub("\n"; " "))")' <<<"$PREGUNTAS"
    else
      echo "- ${MOTIVO_COMPUERTA:-$tipo}"
      echo "    → $elegidas"
      [ -n "${GUARDAS_DIFF:-}" ] && echo "    diff guardado: $GUARDAS_DIFF"
    fi
    echo
  } >>"$ESTADO/decisiones-automaticas.md"
  case "$tipo" in
    parada | dependencia | afuera) registro "compuerta $tipo ($paso) contestada sola, sin compuertas: $elegidas" ;;
    *) registro "compuerta $tipo ($paso) contestada sola con la recomendada: $elegidas" ;;
  esac
}

# Una compuerta humana a la vez en toda la máquina: `compuerta.md` y `decision.md` comunes son los de la sesión de decidir, así que con
# varios carriles la segunda humana espera a que la primera sea respondida. El candado (fd 9) se suelta al volver; un `exit` lo suelta con
# el proceso. Las que se contestan solas no pasan por el celular: escriben `compuerta-sola.md` y `decision-sola.md` en el carril y no esperan
# el candado (si no, una humana sin contestar frenaba a todos los carriles: 1 a 1,5 h el 2026-11-06).
compuerta() {
  local rc COMPUERTA_MD DECISION_MD
  mkdir -p "$COMUN" "$ESTADO"
  if auto_contesta "$1" "$2"; then
    COMPUERTA_MD="$ESTADO/compuerta-sola.md" DECISION_MD="$ESTADO/decision-sola.md"
    _compuerta "$@"
    return $?
  fi
  COMPUERTA_MD="$COMUN/compuerta.md" DECISION_MD="$COMUN/decision.md"
  exec 9>"$COMUN/compuerta.lock"
  flock 9
  _compuerta "$@"
  rc=$?
  flock -u 9
  exec 9>&-
  return "$rc"
}

# compuerta <tipo> <paso> <motivo> <pregunta> [opciones…]
_compuerta() {
  local tipo="$1" paso="$2" clave
  escribir_compuerta "$@"
  if auto_contesta "$tipo" "$paso"; then
    MOTIVO_COMPUERTA="$3" contestar_solo "$tipo" "$paso" "${@:5}" || return 3
    DECISION_OPCION=$(sed -n 's/^opcion: *//p' "$DECISION_MD" | head -n 1)
    DECISION_TEXTO=$(sed -n 's/^me respondió: *//p' "$DECISION_MD" | head -n 1)
  else
    registro "compuerta $tipo ($paso): $3"
    "$BIN/decidir.sh" abrir 8>&- 9>&- || { registro "no se pudo abrir la sesión de decidir."; exit 3; }
    esperar_decision
    "$BIN/decidir.sh" cerrar 8>&- 9>&-
    registro "me respondió: $DECISION_TEXTO"
  fi
  clave=$(clave_de "$DECISION_OPCION")
  case "$clave" in
    parar) return 3 ;;
  esac
  # Varias decisiones: «parar» (o «parado», «detener») en cualquiera para. «no …» no: «no partir» es una respuesta.
  if [ -n "${PREGUNTAS:-}" ] && sed -n 's/^- [^:]*: *//p' "${DECISION_MD:-$COMUN/decision.md}" | sed -E 's/^(«|"|'"'"')//' |
    grep -qiE '^(parar|parado|detener)'; then
    return 3
  fi
  case "$tipo" in
    parada)
      case "$clave" in reintentar) return 1 ;; sigo) return 2 ;; *) return 3 ;; esac ;;
    guardas)
      [ "$clave" = aprobar ] && return 0
      return 3 ;;
    datos)
      [ "$clave" = aprobar ] && echo "aprobado $(ahora_lapaz)" >"$COMUN/aprobado-$(sanear "$paso")"
      return 0 ;;
  esac
  return 0
}

# Un aviso se reintenta solo antes de llegar al celular, si `PILOTO_AUTO` nombra «parada» (por omisión sí). Reintentar no se salta nada: repite la
# vuelta, con sus paradas y verificaciones. El bucle duerme `PILOTO_PARADA_ESPERAS` (300 900 2700 s) y reintenta; agotados los intentos de ese
# mismo motivo (sin sus cifras), pregunta como siempre. Antes un aviso de noche dejaba el carril quieto hasta la mañana, o hasta un vigilante
# fuera del repo. Las cuentas van en `.piloto/paradas-solas/` y un paso publicado las borra (cierre.sh).
parada_sola() { # <motivo>
  [ "${EN_SECO:-0}" != 1 ] || return 1
  auto_nombra parada || return 1
  # Lo que repetir no arregla va directo a la persona: el tope de gasto, el árbol que el paso dejó sucio.
  [ "${PARADA_HUMANA:-0}" = 1 ] && return 1
  local clave n archivo esperas=()
  read -r -a esperas <<<"${PILOTO_PARADA_ESPERAS:-300 900 2700}"
  clave=$(printf '%s' "$1" | tr -d '0-9' | sha256sum | cut -c1-16)
  archivo="$ESTADO/paradas-solas/$clave"
  mkdir -p "$ESTADO/paradas-solas"
  n=$(cat "$archivo" 2>/dev/null | wc -l)
  [ "$n" -lt "${#esperas[@]}" ] || return 1
  echo "$(ahora_lapaz) $1" >>"$archivo"
  registro "aviso (reintento solo $((n + 1)) de ${#esperas[@]} en ${esperas[$n]} s): $1"
  dormir_atento "${esperas[$n]}"
  return 0
}
# dormir_atento <s>: duerme de a 30 s como mucho y sale del bucle si aparece PARAR.
dormir_atento() {
  local falta="$1" tramo
  while [ "$falta" -gt 0 ]; do
    [ -f "$ESTADO/PARAR" ] && { registro "PARAR mientras se esperaba un reintento."; exit 0; }
    tramo=$((falta < 30 ? falta : 30))
    ${DORMIR:-sleep} "$tramo"
    falta=$((falta - tramo))
  done
}

# parada <motivo> [paso] [opciones…]: un aviso. Primero se reintenta solo (parada_sola); después llega al celular. En el ensayo en seco sólo se
# dice (y sigue). Devuelve 1 (reintentar) o 2 (sigo); «parado» sale del bucle.
parada() {
  local motivo="$1" paso="${2:-}" rc
  shift $(($# > 2 ? 2 : $#))
  if [ "${EN_SECO:-0}" = 1 ]; then
    echo "AVISO (ensayo en seco, sigo): $motivo"
    registro "aviso en seco: $motivo"
    return 2
  fi
  parada_sola "$motivo" && return 1
  compuerta parada "$paso" "$motivo" "Paró por $motivo: ¿sigo, reintento o lo dejo parado?" "$@"
  rc=$?
  case "$rc" in
    1 | 2) return "$rc" ;;
  esac
  if auto_nombra todo; then registro "parado (decisión automática, ${PILOTO_PARADAS_AUTO_MAX:-3} veces el mismo aviso): $motivo"
  else registro "parado por la persona: $motivo"; fi
  exit 0
}
