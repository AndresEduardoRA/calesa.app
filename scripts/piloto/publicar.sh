#!/usr/bin/env bash
# Lo único que hace `git push` en el piloto, y sólo lo corre el bucle, nunca una sesión: con PILOTO=1 `bloquear-peligrosos.sh` le
# niega a una sesión todo push (el hook no ve al bucle, que no es una sesión). Nunca un PR.
#
#   publicar.sh <paso> <HEAD de arranque>
#
# Se niega (exit 1, el motivo por stderr) si: la rama no es main; el árbol no está limpio; `origin/main` tiene algo que HEAD no tiene
# (divergencia); el CI del push anterior está rojo (si sigue corriendo, lo espera con `gh run watch`); o el rango agrega SQL de
# seguridad (policy, RLS, `security definer`, `grant`, `revoke`, Vault) sin `<común>/piloto/aprobado-<paso>`, que escribe el bucle
# cuando la persona aprueba la compuerta. Después, `git push origin main`. Se prueba en `publicar.test.ts`.
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

[ "$(git symbolic-ref --quiet --short HEAD)" = main ] || negar "sólo se publica desde la rama main."
[ -z "$(git status --porcelain)" ] || negar "el árbol no está limpio."

git fetch --quiet origin main || negar "git fetch origin main falló."
git merge-base --is-ancestor origin/main HEAD || negar "origin/main tiene commits que HEAD no tiene (divergencia): se rebasa a mano."

# El CI del push anterior: si sigue corriendo se espera; si terminó mal, no se empuja encima.
ULTIMO_CI=$(gh run list --branch main --limit 1 --json databaseId,status,conclusion 2>/dev/null || echo '[]')
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

git push origin main
