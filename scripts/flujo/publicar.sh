#!/usr/bin/env bash
# Publica la rama actual como un PR que GitHub integra solo cuando el CI queda en verde (docs/FLUJO.md), y espera a verlo integrado.
#
#   bash scripts/flujo/publicar.sh [--titulo '<tipo(scope): descripción>'] [--cuerpo <archivo.md>] [--sin-esperar]
#
# 1. Comprueba: una rama que no es main, el árbol limpio y commits propios sobre origin/main.
# 2. El título del PR es el mensaje del commit que queda en main (squash): un commit convencional. Sin `--titulo` vale el asunto del
#    único commit de la rama; con más de uno hay que darlo. Lo valida commitlint, igual que el CI.
# 3. Empuja la rama (nunca fuerza), abre el PR (o le actualiza el título) y le enciende el auto-merge con squash.
#    Si esta misma punta ya se integró en un PR (se vuelve a correr tras un corte), no abre otro: lo dice y sale con 0.
# 4. Espera (hasta ESPERA_MAX s, 5400) al check «Listo · todo en verde»: integrado → vuelve a main al día (en un worktree, a
#    origin/main suelto: main es de la principal) y borra las ramas ya integradas; rojo → dice qué job cayó y sale con 1 (se arregla, se commitea y se vuelve a correr). `--sin-esperar` sale tras el 3.
# Sale con 64 si no hay qué publicar o falta algo; con 1 si el CI cayó; con 75 si se agotó la espera (el PR sigue su curso solo).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
falta() { echo "✗ $1" >&2; exit 64; }

TITULO=""
CUERPO=""
ESPERAR=1
while [ "$#" -gt 0 ]; do
  case "$1" in
    --titulo) TITULO="${2:-}"; shift 2 ;;
    --cuerpo) CUERPO="${2:-}"; shift 2 ;;
    --sin-esperar) ESPERAR=0; shift ;;
    *) falta "opción desconocida: $1" ;;
  esac
done

RAMA=$(git symbolic-ref --quiet --short HEAD) || falta "HEAD suelto: publica desde una rama."
[ "$RAMA" != main ] || falta "estás en main: crea una rama (git switch -c <tipo>/<tema>) y commitea ahí."
[ -z "$(git status --porcelain)" ] || falta "hay cambios sin commitear: commitéalos o apártalos antes."
git fetch --quiet origin main
PROPIOS=$(git rev-list --count --no-merges origin/main..HEAD)
[ "$PROPIOS" -gt 0 ] || falta "la rama no tiene commits propios sobre origin/main."
if [ -z "$TITULO" ]; then
  [ "$PROPIOS" = 1 ] || falta "la rama tiene $PROPIOS commits: pasa --titulo '<tipo(scope): descripción>' (el commit que queda en main)."
  TITULO=$(git log --no-merges --format=%s -1 origin/main..HEAD)
fi
printf '%s\n' "$TITULO" | pnpm exec commitlint >/dev/null 2>&1 ||
  falta "el título «$TITULO» no es un commit convencional (commitlint.config.mjs: tipo(scope): descripción en minúscula, ≤ 72)."
[ -z "$CUERPO" ] || [ -f "$CUERPO" ] || falta "no existe el archivo del cuerpo: $CUERPO"

# La cuenta de GitHub es la dueña del repo, aunque la activa de la máquina sea otra.
DUENO=$(git remote get-url origin | sed -nE 's#.*github\.com[:/]([^/]+)/.*#\1#p')
if [ -z "${GH_TOKEN:-}" ] && [ -n "$DUENO" ] && TOKEN=$(gh auth token --user "$DUENO" 2>/dev/null) && [ -n "$TOKEN" ]; then
  export GH_TOKEN="$TOKEN"
fi

# Integrado ya deja la rama como está: volver a main (o, en un worktree, a origin/main suelto, porque main es de la principal).
volver() {
  if [ "$(git rev-parse --path-format=absolute --git-dir)" = "$(git rev-parse --path-format=absolute --git-common-dir)" ]; then
    git switch --quiet main
    git pull --quiet --ff-only origin main
  else
    git fetch --quiet origin main
    git switch --quiet --detach origin/main
  fi
  node scripts/flujo/limpiar-ramas.mjs || true
}

# Esta misma punta ya se integró (se vuelve a correr tras un corte): no se abre otro PR con lo mismo.
YA=$(gh pr list --head "$RAMA" --state merged --json number,headRefOid \
  --jq "map(select(.headRefOid == \"$(git rev-parse HEAD)\")) | .[0].number // empty" 2>/dev/null || true)
if [ -n "$YA" ]; then
  echo "✓ PR #$YA ya integrado en main con esta misma punta: no hay nada que publicar."
  [ "$ESPERAR" = 1 ] && volver
  exit 0
fi

git push --quiet -u origin "$RAMA"
PR=$(gh pr view "$RAMA" --json number,state --jq 'select(.state == "OPEN") | .number' 2>/dev/null || true)
if [ -z "$PR" ]; then
  if [ -n "$CUERPO" ]; then
    gh pr create --base main --head "$RAMA" --title "$TITULO" --body-file "$CUERPO" >/dev/null
  else
    gh pr create --base main --head "$RAMA" --title "$TITULO" --body "$(git log --no-merges --reverse --format='- %s' origin/main..HEAD)" >/dev/null
  fi
  PR=$(gh pr view "$RAMA" --json number --jq .number)
  echo "✓ PR #$PR abierto: $TITULO"
else
  gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR" -f title="$TITULO" >/dev/null
  echo "✓ PR #$PR actualizado: $TITULO"
fi
gh pr merge "$PR" --auto --squash >/dev/null ||
  falta "no se pudo encender el auto-merge del PR #$PR (¿«Allow auto-merge» y la protección de main? docs/FLUJO.md › «GitHub»)."
echo "✓ auto-merge encendido: GitHub lo integra con «Listo · todo en verde»."
[ "$ESPERAR" = 1 ] || exit 0

LIMITE=$(($(date +%s) + ${ESPERA_MAX:-5400}))
while :; do
  ESTADO=$(gh pr view "$PR" --json state,mergeable,statusCheckRollup)
  case "$(jq -r .state <<<"$ESTADO")" in
    MERGED) break ;;
    CLOSED) echo "✗ el PR #$PR se cerró sin integrarse." >&2; exit 1 ;;
  esac
  if [ "$(jq -r .mergeable <<<"$ESTADO")" = CONFLICTING ]; then
    echo "✗ el PR #$PR choca con main: git merge origin/main, resuelve, commitea y vuelve a correr." >&2
    exit 1
  fi
  LISTO=$(jq -r '[.statusCheckRollup[] | select(.__typename == "CheckRun" and (.name | startswith("Listo"))) | .conclusion] | last // ""' <<<"$ESTADO")
  if [ "$LISTO" = FAILURE ] || [ "$LISTO" = CANCELLED ]; then
    echo "✗ el CI del PR #$PR cayó:" >&2
    jq -r '.statusCheckRollup[] | select(.__typename == "CheckRun" and (.conclusion == "FAILURE" or .conclusion == "CANCELLED") and (.name | startswith("Listo") | not)) | "  · " + .name + "  " + (.detailsUrl // "")' <<<"$ESTADO" >&2
    echo "  El detalle: gh run view <id> --log-failed. Arréglalo, commitea y vuelve a correr este guion." >&2
    exit 1
  fi
  if [ "$(date +%s)" -ge "$LIMITE" ]; then
    echo "· el PR #$PR sigue esperando al CI: se integra solo cuando termine en verde (gh pr view $PR)." >&2
    exit 75
  fi
  sleep "${ESPERA_PASO:-30}"
done

echo "✓ PR #$PR integrado en main."
volver
