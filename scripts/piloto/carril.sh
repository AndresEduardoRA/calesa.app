#!/usr/bin/env bash
# El piloto de un carril (se hace `source` desde bucle.sh; no se corre solo). Con `PILOTO_CARRIL=<id>` el bucle ya no elige el paso por sí
# mismo: se lo pide al coordinador (`scripts/coordinador/coordinador.mjs siguiente <carril>`, que reparte los pasos de `docs/plan.yaml`
# cuando sus dependencias están integradas en main), trabaja cada paso en su rama `<carril>/<paso>` cortada de origin/main y lo publica
# por su propio PR (`publicar.sh`); el coordinador integra los PR verdes. Sin `PILOTO_CARRIL` nada de esto corre (el carril A de siempre).
#   carril_asignar   0 hay un paso asignado (en `.piloto/asignado.json`, con su rama ya sacada) · 10 esperar · 11 terminado · 1 error
# Variables: RAIZ, ESTADO, PILOTO_CARRIL, PILOTO_COORDINADOR (coordinador.mjs), PILOTO_ESPERA_S y la función `registro`.

modo_carril() { [ -n "${PILOTO_CARRIL:-}" ]; }

coordinador() { node "${PILOTO_COORDINADOR:-$RAIZ/scripts/coordinador/coordinador.mjs}" "$@"; }

carril_asignar() {
  local r accion paso rama
  r=$(coordinador siguiente "$PILOTO_CARRIL" 2>"$ESTADO/coordinador.err") || {
    registro "el coordinador falló: $(tail -n 1 "$ESTADO/coordinador.err")"
    return 1
  }
  accion=$(jq -r '.accion // empty' <<<"$r" 2>/dev/null)
  case "$accion" in
    esperar) return 10 ;;
    terminado) return 11 ;;
    paso) ;;
    *) registro "el coordinador respondió algo ilegible: ${r:0:200}"; return 1 ;;
  esac
  paso=$(jq -r .paso <<<"$r") rama=$(jq -r .rama <<<"$r")
  if [ "$(git symbolic-ref --short HEAD 2>/dev/null)" != "$rama" ]; then
    # Un paso nuevo parte de lo último integrado; uno que se retoma (`retomar`) sigue en su rama, que ya existe.
    if [ "$(jq -r '.retomar // false' <<<"$r")" = true ] && git show-ref --verify --quiet "refs/heads/$rama"; then
      git checkout --quiet "$rama" || return 1
    else
      git fetch --quiet origin main || return 1
      git checkout --quiet -B "$rama" origin/main || return 1
    fi
  fi
  printf '%s\n' "$r" >"$ESTADO/asignado.json"
  registro "carril $PILOTO_CARRIL: el coordinador asignó $paso en $rama."
  return 0
}

# carril_publicado <paso> <pr> [parcial]: el PR del paso quedó abierto; el paso deja de estar asignado. Con `parcial` en true (el paso se
# partió y este PR trae sólo una parte: `ultimo.json` › `parcial`), el paso sigue asignado y el carril retoma su rama en la vuelta
# siguiente: integrar ese PR no lo da por terminado (el 4.20 y el 4.24 se marcaban integrados con su primera parte, 2026-11-06).
carril_publicado() {
  if [ "${3:-false}" = true ]; then
    registro "carril ${PILOTO_CARRIL:-}: $1 publicado en parte (#$2): sigue asignado."
    rm -f "$ESTADO/asignado.json"
    return 0
  fi
  coordinador publicado "$1" "$2" >/dev/null 2>"$ESTADO/coordinador.err" || registro "el coordinador no anotó $1 como publicado: $(tail -n 1 "$ESTADO/coordinador.err")"
  rm -f "$ESTADO/asignado.json"
}
