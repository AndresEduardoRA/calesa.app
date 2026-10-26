#!/usr/bin/env bash
# Las compuertas del bucle (se hace `source` desde bucle.sh; no se corre solo). Una compuerta es lo único que el bucle le pregunta a la
# persona: escribe `<común>/piloto/compuerta.md` (con un id nuevo) y su copia de lectura en `.piloto/`, abre la sesión corta de decidir
# (`decidir.sh abrir`) y espera. Sólo acepta `decision.md` si: su id es el de la compuerta vigente, es posterior a `compuerta.md` y
# ningún paso vivía cuando apareció (`en-curso.json` y `pgrep`); si no, la borra y sigue esperando. Con la decisión aceptada cierra la
# sesión de decidir y, con `datos` aprobada, escribe `aprobado-<paso>`. Nada sigue sin respuesta. Se prueba en `bucle.test.ts`.
#
# Variables que espera: COMUN, ESTADO, BIN, POLL (segundos entre lecturas), EN_SECO y la función `registro`.
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

# escribir_compuerta <tipo> <paso> <motivo> <pregunta> [opciones…] (sin opciones, las de su tipo); CONTEXTO (arreglo) = rutas
escribir_compuerta() {
  local tipo="$1" paso="$2" motivo="$3" pregunta="$4"
  shift 4
  local opciones=("$@") o
  [ "${#opciones[@]}" -gt 0 ] || mapfile -t opciones < <(opciones_de "$tipo")
  mkdir -p "$COMUN" "$ESTADO"
  rm -f "$COMUN/decision.md"
  COMPUERTA_ID="g-$(date +%s)-$RANDOM"
  {
    echo "id: $COMPUERTA_ID"
    echo "creada: $(date +%s)"
    echo "tipo: $tipo"
    echo "paso: $paso"
    echo "motivo: ${motivo//$'\n'/ }"
    echo "pregunta: ${pregunta//$'\n'/ }"
    echo "opciones:"
    for o in "${opciones[@]}"; do echo "- $o"; done
    echo "contexto:"
    for o in "${CONTEXTO[@]:-}"; do [ -n "$o" ] && echo "- $o"; done
  } >"$COMUN/compuerta.md.tmp"
  mv -f "$COMUN/compuerta.md.tmp" "$COMUN/compuerta.md"
  cp -f "$COMUN/compuerta.md" "$ESTADO/compuerta.md"
}

paso_vivo() {
  local pid
  pid=$(jq -r '.pid // empty' "$ESTADO/en-curso.json" 2>/dev/null)
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && return 0
  pgrep -f -- "$PATRON_PASO_VIVO" >/dev/null 2>&1
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
    [ -f "$ESTADO/PARAR" ] && { registro "PARAR mientras se esperaba una decisión."; "$BIN/decidir.sh" cerrar 8>&-; exit 0; }
    if [ "${PILOTO_ESPERA_MAX:-0}" -gt 0 ] && [ $((SECONDS - inicio)) -ge "$PILOTO_ESPERA_MAX" ]; then
      registro "nadie respondió en ${PILOTO_ESPERA_MAX} s."
      "$BIN/decidir.sh" cerrar 8>&-
      exit 3
    fi
    sleep "$POLL"
  done
  DECISION_OPCION=$(sed -n 's/^opcion: *//p' "$COMUN/decision.md" | head -n 1)
  DECISION_TEXTO=$(sed -n 's/^me respondió: *//p' "$COMUN/decision.md" | head -n 1)
}

# compuerta <tipo> <paso> <motivo> <pregunta> [opciones…]
compuerta() {
  local tipo="$1" paso="$2" clave
  escribir_compuerta "$@"
  registro "compuerta $tipo ($paso): $3"
  "$BIN/decidir.sh" abrir 8>&- || { registro "no se pudo abrir la sesión de decidir."; exit 3; }
  esperar_decision
  "$BIN/decidir.sh" cerrar 8>&-
  clave=$(clave_de "$DECISION_OPCION")
  registro "me respondió: $DECISION_TEXTO"
  case "$clave" in
    parar) return 3 ;;
  esac
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

# parada <motivo> [paso] [opciones…]: un aviso. Toda parada llega al celular; en el ensayo en seco sólo se dice (y sigue).
# Devuelve 1 (reintentar) o 2 (sigo); «parado» sale del bucle.
parada() {
  local motivo="$1" paso="${2:-}" rc
  shift $(($# > 2 ? 2 : $#))
  if [ "${EN_SECO:-0}" = 1 ]; then
    echo "AVISO (ensayo en seco, sigo): $motivo"
    registro "aviso en seco: $motivo"
    return 2
  fi
  compuerta parada "$paso" "$motivo" "Paró por $motivo: ¿sigo, reintento o lo dejo parado?" "$@"
  rc=$?
  case "$rc" in
    1 | 2) return "$rc" ;;
  esac
  registro "parado por la persona: $motivo"
  exit 0
}
