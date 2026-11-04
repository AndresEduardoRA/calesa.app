#!/usr/bin/env bash
# El CI de la rama, sin bloquear el avance (se hace `source` desde publicar.sh y bucle.sh; no se corre solo).
#
# El piloto no espera al CI ni se detiene por uno rojo: publica y sigue con el paso siguiente. Cada CI rojo se anota en
# `.piloto/ci-rojos.md` (una línea por corrida, con su commit y los jobs que cayeron) y el ruteo lo ve en `hechos.json` › `ci_rojos`.
# Un CI verde más nuevo borra la lista: lo que fallaba ya no falla. Sólo hay dos casos que sí frenan, porque contaminan lo que se
# construye encima: un job de la base en rojo (RLS, grants, advisors) y que se acumulen `PILOTO_TOPE_CI_ROJOS` corridas rojas sin
# arreglar (5 por omisión). Una corrida cancelada (el push siguiente la reemplaza: `cancel-in-progress`) no dice nada.
#
#   ci_resolver <rama>   0 sigue; 1 frena y deja el motivo en CI_MOTIVO. Deja CI_ESTADO: sin|corriendo|cancelado|verde|rojo|rojo-base
#
# Variables que espera: ESTADO y `ahora_lapaz` (comun.sh).

CI_ROJOS="$ESTADO/ci-rojos.md"
TOPE_ROJOS="${PILOTO_TOPE_CI_ROJOS:-5}"

ci_leer() { # <rama>
  local json estado conclusion jobs
  CI_ID="" CI_SHA="" CI_FALLO="" CI_ESTADO=sin
  json=$(timeout 30 gh run list --branch "$1" --limit 1 --json databaseId,status,conclusion,headSha 2>/dev/null) || json='[]'
  CI_ID=$(jq -r '.[0].databaseId // empty' <<<"$json" 2>/dev/null)
  [ -n "$CI_ID" ] || return 0
  CI_SHA=$(jq -r '.[0].headSha // ""' <<<"$json" 2>/dev/null)
  estado=$(jq -r '.[0].status // ""' <<<"$json" 2>/dev/null)
  conclusion=$(jq -r '.[0].conclusion // ""' <<<"$json" 2>/dev/null)
  if [ "$estado" != completed ]; then CI_ESTADO=corriendo; return 0; fi
  case "$conclusion" in
    success | skipped | neutral) CI_ESTADO=verde ;;
    cancelled) CI_ESTADO=cancelado ;;
    *)
      CI_ESTADO=rojo
      jobs=$(timeout 30 gh run view "$CI_ID" --json jobs 2>/dev/null) || jobs='{"jobs":[]}'
      CI_FALLO=$(jq -r '[.jobs[]? | select(.conclusion | IN("failure", "timed_out")) | .name] | join("; ")' <<<"$jobs" 2>/dev/null)
      if jq -e 'any(.jobs[]?; (.conclusion | IN("failure", "timed_out")) and (.name | startswith("Base")))' <<<"$jobs" >/dev/null 2>&1; then
        CI_ESTADO=rojo-base
      fi
      ;;
  esac
}

ci_rojos_n() {
  local n
  n=$(grep -c '^- ' "$CI_ROJOS" 2>/dev/null) || n=0
  echo "$n"
}

ci_anotar_rojo() {
  if [ -f "$CI_ROJOS" ] && grep -q " run $CI_ID " "$CI_ROJOS"; then return 0; fi
  mkdir -p "$ESTADO"
  echo "- $(ahora_lapaz) run $CI_ID (${CI_SHA:0:8}): ${CI_FALLO:-sin detalle de jobs}" >>"$CI_ROJOS"
}

ci_resolver() { # <rama>
  CI_MOTIVO=""
  ci_leer "$1"
  case "$CI_ESTADO" in
    verde) rm -f "$CI_ROJOS" "$ESTADO/ci-fix-intentos" ;;
    rojo-base)
      ci_anotar_rojo
      CI_MOTIVO="el CI $CI_ID tiene la base en rojo ($CI_FALLO): RLS, grants o advisors no se arrastran a los pasos siguientes"
      return 1
      ;;
    rojo)
      ci_anotar_rojo
      if [ "$(ci_rojos_n)" -ge "$TOPE_ROJOS" ]; then
        CI_MOTIVO="hay $(ci_rojos_n) corridas de CI rojas sin arreglar (tope $TOPE_ROJOS): ver $CI_ROJOS"
        return 1
      fi
      ;;
  esac
  return 0
}
