#!/usr/bin/env bash
# El CI de la rama, sin bloquear el avance (se hace `source` desde publicar.sh y bucle.sh; no se corre solo).
#
# El piloto no espera al CI ni se detiene por uno rojo: publica y sigue con el paso siguiente. Cada CI rojo se anota en
# `.piloto/ci-rojos.md` (una línea por corrida, con su commit y los jobs que cayeron) y el ruteo lo ve en `hechos.json` › `ci_rojos`.
# Un CI verde más nuevo borra la lista: lo que fallaba ya no falla. Sólo hay dos casos que sí frenan, porque contaminan lo que se
# construye encima: un job de la base en rojo (RLS, grants, advisors) y que se acumulen `PILOTO_TOPE_CI_ROJOS` corridas rojas sin
# arreglar (5 por omisión); con carriles (`PILOTO_CARRIL`) ninguno de los dos frena. Una corrida cancelada (el push siguiente la reemplaza: `cancel-in-progress`) no dice nada.
#
#   ci_resolver <rama>   0 sigue; 1 frena y deja el motivo en CI_MOTIVO. Deja CI_ESTADO: sin|corriendo|cancelado|verde|rojo|rojo-base
#   ci_resolver <rama> veredicto   lo mismo, mirando el último veredicto del workflow `ci` (`ci_veredicto`): la puerta de fase con carriles
#
# Variables que espera: ESTADO y `ahora_lapaz` (comun.sh).

CI_ROJOS="$ESTADO/ci-rojos.md"
TOPE_ROJOS="${PILOTO_TOPE_CI_ROJOS:-5}"

ci_leer() { # <rama>
  local json estado conclusion jobs
  CI_ID="" CI_SHA="" CI_FALLO="" CI_ESTADO=sin
  # La última corrida que dice algo: una cancelada (la reemplazó el push siguiente, `cancel-in-progress`; en main, 19 de 50 el 3 al 7-11)
  # no cuenta si hay otra detrás. Si todas las que hay están canceladas, vale la primera (CI_ESTADO=cancelado).
  json=$(timeout 30 gh run list --branch "$1" --limit 5 --json databaseId,status,conclusion,headSha 2>/dev/null) || json='[]'
  json=$(jq -c '(map(select(.conclusion != "cancelled")) + .) | .[0:1]' <<<"$json" 2>/dev/null) || json='[]'
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

# El último VEREDICTO del workflow `ci` en la rama, no su última corrida: lo que mira la puerta de fase con carriles. En main cada
# integración cancela la corrida anterior (42 de 79 el 11 y 12-11-2026), así que «la última» casi siempre corre o está cancelada, y la
# lista mezclaba `demo` (38 s, no prueba nada): el 6.14 esperó 24 min con main sano y pasó por una corrida de `demo`. Una corrida con
# veredicto (terminada, ni cancelada ni saltada) dice cómo está main: verde, la puerta abre sin esperar a la que corre; roja, se espera
# a la más nueva que esté corriendo, si la hay. La que la puerta volvió a correr (`puertas/rerun-<id>`; `gh run list` no da el número
# de intento) sigue siendo la del rojo mientras corre: se espera a ella, no vale el verde de antes.
# Deja CI_ESTADO (sin|corriendo|cancelado|verde|rojo|rojo-base), CI_ID, CI_SHA y CI_FALLO. PILOTO_CI_WORKFLOW (ci).
ci_veredicto() { # <rama>
  local json fila jobs otra_vez
  CI_ID="" CI_SHA="" CI_FALLO="" CI_ESTADO=sin
  json=$(timeout 30 gh run list --workflow "${PILOTO_CI_WORKFLOW:-ci}" --branch "$1" --limit 20 \
    --json databaseId,status,conclusion,headSha 2>/dev/null) || json='[]'
  otra_vez=$(cd "$ESTADO/puertas" 2>/dev/null && ls 2>/dev/null | sed -n 's/^rerun-//p' | jq -Rsc 'split("\n") | map(select(. != ""))')
  fila=$(jq -c --argjson otra "${otra_vez:-[]}" '
    def veredicto: .status == "completed" and (.conclusion | IN("cancelled", "skipped") | not);
    def otra_vez: .status != "completed" and ((.databaseId | tostring) as $id | $otra | index($id) != null);
    (map(veredicto or otra_vez) | index(true)) as $i
    | if length == 0 then {estado: "sin"}
      elif $i == null then
        (map(select(.status != "completed")) | .[0]) as $c
        | if $c then $c + {estado: "corriendo"} else .[0] + {estado: "cancelado"} end
      elif (.[$i] | otra_vez) then .[$i] + {estado: "corriendo"}
      elif (.[$i].conclusion | IN("success", "neutral")) then .[$i] + {estado: "verde"}
      else
        (.[0:$i] | map(select(.status != "completed")) | .[0]) as $c
        | if $c then $c + {estado: "corriendo"} else .[$i] + {estado: "rojo"} end
      end' <<<"$json" 2>/dev/null) || fila='{"estado":"sin"}'
  CI_ESTADO=$(jq -r '.estado // "sin"' <<<"$fila" 2>/dev/null)
  CI_ID=$(jq -r '.databaseId // empty' <<<"$fila" 2>/dev/null)
  CI_SHA=$(jq -r '.headSha // ""' <<<"$fila" 2>/dev/null)
  [ "$CI_ESTADO" = rojo ] || return 0
  jobs=$(timeout 30 gh run view "$CI_ID" --json jobs 2>/dev/null) || jobs='{"jobs":[]}'
  CI_FALLO=$(jq -r '[.jobs[]? | select(.conclusion | IN("failure", "timed_out")) | .name] | join("; ")' <<<"$jobs" 2>/dev/null)
  if jq -e 'any(.jobs[]?; (.conclusion | IN("failure", "timed_out")) and (.name | startswith("Base")))' <<<"$jobs" >/dev/null 2>&1; then
    CI_ESTADO=rojo-base
  fi
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

ci_resolver() { # <rama> [veredicto]
  CI_MOTIVO=""
  if [ "${2:-}" = veredicto ]; then ci_veredicto "$1"; else ci_leer "$1"; fi
  case "$CI_ESTADO" in
    verde) rm -f "$CI_ROJOS" "$ESTADO/ci-fix-intentos" "$ESTADO/ci-fix-head" ;;
    rojo-base)
      ci_anotar_rojo
      # Con carriles no frena: cada paso sale de origin/main en su rama y el coordinador no integra un PR con el CI en rojo, así que
      # nada se arrastra. Frenar era un candado sin llave: sin empujar no corre otro CI, y el rojo viejo no se iba nunca (el 11-11-2026 el
      # B estuvo 3 h y el A 70 min sin publicar por una prueba inestable de main que ya estaba arreglada, con el PR además en conflicto,
      # donde GitHub ni siquiera corre el CI).
      [ -n "${PILOTO_CARRIL:-}" ] && return 0
      CI_MOTIVO="el CI $CI_ID tiene la base en rojo ($CI_FALLO): RLS, grants o advisors no se arrastran a los pasos siguientes"
      return 1
      ;;
    rojo)
      ci_anotar_rojo
      [ -n "${PILOTO_CARRIL:-}" ] && return 0 # lo mismo: el rojo de un PR lo devuelve el coordinador (`arreglar`), no esta cuenta
      if [ "$(ci_rojos_n)" -ge "$TOPE_ROJOS" ]; then
        CI_MOTIVO="hay $(ci_rojos_n) corridas de CI rojas sin arreglar (tope $TOPE_ROJOS): ver $CI_ROJOS"
        return 1
      fi
      ;;
  esac
  return 0
}
