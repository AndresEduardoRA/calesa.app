#!/usr/bin/env bash
# El turno de la base local y del servidor de e2e: lo que se corre con ellos es de una sola sesión a la vez, aunque haya varios
# worktrees (la base de Supabase, los puertos 546xx y `.next-e2e` son una sola). Se prueba en `scripts/candado.test.ts`.
#
#   bash scripts/candado.sh <nombre> -- <comando…>
#
# `flock -n` sobre `<carpeta común de git>/candado-base.lock` (común a todos los worktrees, fuera del árbol). Ocupado falla al
# instante con 75 y dice quién lo tiene (nombre, pid, carpeta, comando y hora, de `candado-base.info`). Variables:
#   CANDADO_ESPERA=<s>  espera hasta <s> segundos a que se libere (sin ella, falla al instante)
#   CANDADO_DIR=<dir>   dónde viven el candado y su registro (para las pruebas: nunca el candado real)
# Es reentrante: un comando que corre con el candado (`test:e2e:completo` llama a `db:reset`, `db:carreras` y `test:e2e`) lo
# vuelve a pedir y sigue, por `CANDADO_TOMADO`, que lleva la ruta del candado que se tomó. El comando corre sin el descriptor del
# candado: lo que deje vivo detrás no lo retiene. Uso mal hecho: 64.
set -uo pipefail

[ "$#" -ge 3 ] && [ "$2" = -- ] || {
  echo "uso: bash scripts/candado.sh <nombre> -- <comando…>" >&2
  exit 64
}
NOMBRE="$1"
shift 2

DIR="${CANDADO_DIR:-$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)}"
[ -n "$DIR" ] || {
  echo "candado: no hay carpeta de git ni CANDADO_DIR." >&2
  exit 64
}
mkdir -p "$DIR"
CANDADO="$DIR/candado-base.lock"
INFO="$DIR/candado-base.info"

# Ya lo tiene un ancestro de este comando: sigue.
if [ "${CANDADO_TOMADO:-}" = "$CANDADO" ]; then
  exec "$@"
fi

exec 9>"$CANDADO"
if [ -n "${CANDADO_ESPERA:-}" ]; then
  flock -w "$CANDADO_ESPERA" 9 || ocupado=1
else
  flock -n 9 || ocupado=1
fi

if [ "${ocupado:-0}" = 1 ]; then
  # El dueño escribe su registro justo después de tomarlo: se le da un momento.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -s "$INFO" ] && break
    sleep 0.1
  done
  {
    echo "candado: la base local y el e2e los tiene otra sesión; «$NOMBRE» no puede correr ahora."
    if [ -s "$INFO" ]; then
      sed -E 's/^/  /' "$INFO"
    else
      echo "  (sin registro del dueño)"
    fi
    echo "  Espera a que termine, o CANDADO_ESPERA=<segundos> para esperar."
  } >&2
  exit 75
fi

{
  echo "nombre: $NOMBRE"
  echo "pid $$"
  echo "carpeta: $PWD"
  echo "comando: $*"
  echo "desde $(date '+%Y-%m-%d %H:%M:%S')"
} >"$INFO"
trap 'rm -f "$INFO"' EXIT

export CANDADO_TOMADO="$CANDADO"
"$@" 9>&-
exit $?
