#!/usr/bin/env bash
# Cómo está el flujo ahora mismo, en pocas líneas (docs/FLUJO.md): la rama y el árbol, los PR abiertos con su CI, el último CI de
# `main` y el e2e completo de la noche. Para empezar una sesión sabiendo si hay algo rojo que va antes que lo pedido: nadie más mira
# la corrida de la noche. Sin red o sin `gh` dice sólo lo local y sale con 0: nunca frena.
#
#   bash scripts/flujo/estado.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 0

RAMA=$(git symbolic-ref --quiet --short HEAD || echo '(HEAD suelto)')
SUCIOS=$(git status --porcelain | wc -l | tr -d ' ')
echo "· rama $RAMA, $([ "$SUCIOS" = 0 ] && echo 'árbol limpio' || echo "$SUCIOS archivos sin commitear")"

command -v gh >/dev/null 2>&1 || { echo "· sin gh: no se mira GitHub."; exit 0; }
DUENO=$(git remote get-url origin 2>/dev/null | sed -nE 's#.*github\.com[:/]([^/]+)/.*#\1#p')
if [ -z "${GH_TOKEN:-}" ] && [ -n "$DUENO" ] && TOKEN=$(gh auth token --user "$DUENO" 2>/dev/null) && [ -n "$TOKEN" ]; then
  export GH_TOKEN="$TOKEN"
fi

# «✓», «✗» o «·» (en curso o sin correr) de una conclusión de GitHub.
marca() {
  case "$1" in
    success | SUCCESS) echo '✓' ;;
    failure | FAILURE | cancelled | CANCELLED | timed_out | TIMED_OUT) echo '✗' ;;
    *) echo '·' ;;
  esac
}

if PRS=$(timeout 20 gh pr list --state open --limit 20 --json number,title,headRefName,statusCheckRollup 2>/dev/null); then
  if [ "$(jq length <<<"$PRS")" = 0 ]; then
    echo "✓ sin PR abiertos"
  else
    jq -r '.[] | [(.number | tostring), .title, .headRefName,
                  ([.statusCheckRollup[]? | select(.__typename == "CheckRun" and (.name | startswith("Listo"))) | .conclusion] | last // "")] | @tsv' <<<"$PRS" |
      while IFS=$'\t' read -r numero titulo rama listo; do
        echo "$(marca "$listo") PR #$numero abierto ($rama): $titulo$([ "$(marca "$listo")" = '✗' ] && echo ' — CI en rojo: se arregla o se cierra antes que lo nuevo')"
      done
  fi
else
  echo "· GitHub no respondió: no se miran los PR ni el CI."
  exit 0
fi

# El último veredicto del workflow `ci` para un evento (push a main, schedule): una corrida terminada, no la que está en curso.
ultimo() {
  timeout 20 gh run list --workflow ci --branch main --event "$1" --status completed --limit 1 \
    --json conclusion,createdAt,databaseId,headSha 2>/dev/null |
    jq -r '.[0] // empty | [.conclusion, .createdAt, (.databaseId | tostring), .headSha[0:8]] | @tsv'
}
IFS=$'\t' read -r conclusion cuando id sha <<<"$(ultimo push)"
if [ -n "${conclusion:-}" ]; then
  echo "$(marca "$conclusion") CI de main ($sha, $cuando)$([ "$(marca "$conclusion")" = '✗' ] && echo " — rojo: gh run view $id --log-failed")"
fi
IFS=$'\t' read -r conclusion cuando id sha <<<"$(ultimo schedule)"
if [ -n "${conclusion:-}" ]; then
  echo "$(marca "$conclusion") e2e completo de la noche ($sha, $cuando)$([ "$(marca "$conclusion")" = '✗' ] && echo " — rojo: gh run view $id --log-failed; si cae dos noches seguidas, se arregla (.claude/rules/e2e.md)")"
fi
exit 0
