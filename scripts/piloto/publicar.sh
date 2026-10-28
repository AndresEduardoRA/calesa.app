#!/usr/bin/env bash
# Lo único que hace `git push` en el piloto, y sólo lo corre el bucle, nunca una sesión: con PILOTO=1 `bloquear-peligrosos.sh` le
# niega a una sesión todo push (el hook no ve al bucle, que no es una sesión). El piloto es el carril A: publica su rama (`a/…`) y su
# PR contra main; nunca empuja main ni integra: el PR lo integra la persona.
#
#   publicar.sh <paso> <HEAD de arranque>
#
# Se niega (exit 1, el motivo por stderr) si: la rama no es `a/…`; el árbol no está limpio; `origin/<rama>` tiene algo que HEAD no
# tiene (nunca se fuerza); el CI del push anterior de la rama está rojo (si sigue corriendo, lo espera con `gh run watch`); o el rango
# agrega SQL de seguridad (policy, RLS, `security definer`, `grant`, `revoke`, Vault) sin `<común>/piloto/aprobado-<paso>`, que
# escribe el bucle cuando la persona aprueba la compuerta. Después, `git push -u origin <rama>` y, si la rama no tiene un PR abierto,
# `gh pr create` contra main; si lo tiene, un comentario con el paso. Se prueba en `publicar.test.ts`.
set -uo pipefail
# shellcheck source=comun.sh
source "$(dirname "${BASH_SOURCE[0]}")/comun.sh"
cd "$RAIZ" || exit 1

PASO="${1:-}"
DESDE="${2:-}"
[ -n "$PASO" ] && [ -n "$DESDE" ] || { echo "publicar: faltan el paso y el HEAD de arranque." >&2; exit 1; }

negar() {
  echo "publicar: $1" >&2
  exit 1
}

RAMA=$(git symbolic-ref --quiet --short HEAD)
case "$RAMA" in
  a/?*) ;;
  *) negar "el piloto publica sólo la rama del carril A (a/…), nunca main: se está en «${RAMA:-HEAD suelto}»." ;;
esac
[ -z "$(git status --porcelain)" ] || negar "el árbol no está limpio."

# Sin forzar nunca: lo que ya está en origin/<rama> tiene que estar en HEAD.
if git ls-remote --exit-code --heads origin "$RAMA" >/dev/null 2>&1; then
  git fetch --quiet origin "$RAMA" || negar "git fetch origin $RAMA falló."
  git merge-base --is-ancestor FETCH_HEAD HEAD ||
    negar "origin/$RAMA tiene commits que HEAD no tiene (divergencia): se integra a mano, nunca se fuerza."
fi

# El CI del push anterior de la rama: si sigue corriendo se espera; si terminó mal, no se empuja encima.
ULTIMO_CI=$(gh run list --branch "$RAMA" --limit 1 --json databaseId,status,conclusion 2>/dev/null || echo '[]')
ID=$(jq -r '.[0].databaseId // empty' <<<"$ULTIMO_CI")
if [ -n "$ID" ]; then
  ESTADO_CI=$(jq -r '.[0].status' <<<"$ULTIMO_CI")
  if [ "$ESTADO_CI" != completed ]; then
    echo "publicar: el CI $ID sigue corriendo; se espera." >&2
    gh run watch "$ID" --exit-status >/dev/null 2>&1 || negar "el CI $ID del push anterior terminó en rojo."
  else
    case "$(jq -r '.[0].conclusion' <<<"$ULTIMO_CI")" in
      success | skipped | neutral) ;;
      *) negar "el CI $ID del push anterior está rojo ($(jq -r '.[0].conclusion' <<<"$ULTIMO_CI"))." ;;
    esac
  fi
fi

# SQL de seguridad en lo que este rango agregó (líneas `+` de supabase/**/*.sql).
SEGURIDAD='(create|alter|drop)[[:space:]]+policy|enable[[:space:]]+row[[:space:]]+level[[:space:]]+security|security[[:space:]]+definer|\bgrant\b|\brevoke\b|\bvault\b'
if git diff -U0 "$DESDE..HEAD" -- 'supabase/*.sql' | grep -E '^\+' | grep -vE '^\+\+\+' | grep -qiE "$SEGURIDAD"; then
  [ -f "$COMUN/aprobado-${PASO//[^A-Za-z0-9._-]/_}" ] ||
    negar "el rango agrega SQL de seguridad (policy, RLS, security definer, grant/revoke, Vault) sin la aprobación de la persona: falta aprobado-$PASO."
fi

git push --quiet -u origin "$RAMA" || negar "git push origin $RAMA falló."

# El PR de la rama: se abre una vez; cada paso publicado deja un comentario. Nunca un merge.
PR=$(gh pr list --head "$RAMA" --state open --json number 2>/dev/null | jq -r '.[0].number // empty' 2>/dev/null)
CORTO=$(git rev-parse --short HEAD)
if [ -z "$PR" ]; then
  gh pr create --base main --head "$RAMA" --title "Carril A: $RAMA" --body "Los pasos del piloto (carril A), uno por commit de docs al final de cada uno. Cada paso lo verificó el bucle antes de publicarlo (lint, typecheck, test, \`db:probar\` si toca \`supabase/\` y los e2e dirigidos). Lo integra la persona; el piloto nunca hace merge.

Primer paso publicado: $PASO ($CORTO)." >/dev/null || negar "se empujó $RAMA, pero gh pr create falló: el PR se abre a mano o en la vuelta siguiente."
else
  gh pr comment "$PR" --body "Paso $PASO publicado ($CORTO)." >/dev/null || negar "se empujó $RAMA, pero no se pudo comentar el PR #$PR."
fi
echo "publicar: $PASO en $RAMA ($CORTO), PR ${PR:-nuevo}."
