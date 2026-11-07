#!/usr/bin/env bash
# Lo único que hace `git push` en el piloto, y sólo lo corre el bucle, nunca una sesión: con PILOTO=1 `bloquear-peligrosos.sh` le
# niega a una sesión todo push (el hook no ve al bucle, que no es una sesión). El piloto es el carril A: publica su rama (`a/…`) y su
# PR contra main; nunca empuja main ni integra: el PR lo integra la persona.
#
#   publicar.sh <paso> <HEAD de arranque>
#
# Se niega (exit 1, el motivo por stderr) si: la rama no es `a/…`; el árbol no está limpio; `origin/<rama>` tiene algo que HEAD no
# tiene (nunca se fuerza); el CI del push anterior tiene la base en rojo o hay demasiados rojos sin arreglar (un rojo común no frena: `ci.sh`); o el rango
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
# La del carril va primero: con `PILOTO_CARRIL=a` la rama `a/4.19` es la suya (antes caía en `a/?*` y se negaba: 4.19, 2026-11-07).
case "$RAMA" in
  "${PILOTO_CARRIL:-/}"/?*) ;;
  a/?*) [ -z "${PILOTO_CARRIL:-}" ] || negar "el carril $PILOTO_CARRIL publica sólo ramas $PILOTO_CARRIL/…: se está en «$RAMA»." ;;
  *) negar "el piloto publica sólo la rama del carril A (a/…), nunca main: se está en «${RAMA:-HEAD suelto}»." ;;
esac
[ -z "$(git status --porcelain)" ] || negar "el árbol no está limpio."

# Sin forzar nunca: lo que ya está en origin/<rama> tiene que estar en HEAD.
if git ls-remote --exit-code --heads origin "$RAMA" >/dev/null 2>&1; then
  git fetch --quiet origin "$RAMA" || negar "git fetch origin $RAMA falló."
  git merge-base --is-ancestor FETCH_HEAD HEAD ||
    negar "origin/$RAMA tiene commits que HEAD no tiene (divergencia): se integra a mano, nunca se fuerza."
fi

# El CI del push anterior de la rama no se espera ni frena (`ci.sh`): un rojo se anota en `.piloto/ci-rojos.md` y se arregla después. Sólo
# frenan un job de la base en rojo y la acumulación de rojos sin arreglar.
# shellcheck source=ci.sh
source "$(dirname "${BASH_SOURCE[0]}")/ci.sh"
ci_resolver "$RAMA" || negar "$CI_MOTIVO."

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
if [ -z "$PR" ] && [ -n "${PILOTO_CARRIL:-}" ]; then
  # Un PR por paso (el coordinador integra los verdes): su rama es `<carril>/<paso>`.
  gh pr create --base main --head "$RAMA" --title "Paso $PASO (carril $PILOTO_CARRIL)" --body "El paso $PASO del carril $PILOTO_CARRIL, verificado por el bucle antes de publicar ($CORTO). Lo integra el coordinador cuando el CI esté en verde." >/dev/null ||
    negar "se empujó $RAMA, pero gh pr create falló."
  PR=$(gh pr list --head "$RAMA" --state open --json number 2>/dev/null | jq -r '.[0].number // empty' 2>/dev/null)
elif [ -z "$PR" ]; then
  gh pr create --base main --head "$RAMA" --title "Carril A: $RAMA" --body "Los pasos del piloto (carril A), uno por commit de docs al final de cada uno. Cada paso lo verificó el bucle antes de publicarlo (lint, typecheck, test, \`db:probar\` si toca \`supabase/\` y los e2e dirigidos). Lo integra la persona; el piloto nunca hace merge.

Primer paso publicado: $PASO ($CORTO)." >/dev/null || negar "se empujó $RAMA, pero gh pr create falló: el PR se abre a mano o en la vuelta siguiente."
else
  gh pr comment "$PR" --body "Paso $PASO publicado ($CORTO)." >/dev/null || negar "se empujó $RAMA, pero no se pudo comentar el PR #$PR."
fi
# Con carril, el coordinador anota el paso como publicado (con el número de su PR).
if [ -n "${PILOTO_CARRIL:-}" ]; then
  [ -n "$PR" ] || PR=$(gh pr list --head "$RAMA" --state open --json number 2>/dev/null | jq -r '.[0].number // empty' 2>/dev/null)
  registro() { echo "publicar: $*" >&2; }
  # shellcheck source=carril.sh
  source "$(dirname "${BASH_SOURCE[0]}")/carril.sh"
  PARCIAL=$(jq -r '.parcial // false' "$ESTADO/ultimo.json" 2>/dev/null || echo false)
  [ -n "$PR" ] && carril_publicado "$PASO" "$PR" "$PARCIAL"
fi
echo "publicar: $PASO en $RAMA ($CORTO), PR ${PR:-nuevo}."
