#!/usr/bin/env bash
# Hook PostToolUse (anillo 1): lintea SÓLO el archivo tocado y le devuelve el error a Claude.
# Nunca tsc acá (eso es el anillo 2). Exit 2 hace que Claude corrija, y lo que Claude recibe es
# stderr: el detalle de qué regla falló y en qué línea va por ahí, no en un JSON por stdout.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}"
ENTRADA=$(cat)
ARCHIVO=$(printf '%s' "$ENTRADA" | sed -nE 's/.*"file_path" *: *"([^"]+)".*/\1/p' | head -n1)
[ -z "$ARCHIVO" ] && exit 0
[ -f "$ARCHIVO" ] || exit 0

# Sólo se lintea lo de este repo. Un archivo de afuera (el plan, el scratchpad, otro proyecto) no
# tiene nuestra configuración de ESLint: fallaría sin haber hecho nada mal, y `--fix` no tiene
# por qué reescribirlo. Se comparan rutas reales, para que un enlace simbólico no engañe.
RAIZ=$(pwd -P)
REAL="$(cd "$(dirname "$ARCHIVO")" 2>/dev/null && pwd -P)/$(basename "$ARCHIVO")"
case "$REAL" in
  "$RAIZ"/*) ARCHIVO="$REAL" ;;
  *) exit 0 ;;
esac

case "$ARCHIVO" in
  *.ts|*.tsx|*.mts|*.mjs)
    # --no-warn-ignored: un archivo ignorado a propósito (tipos generados, probar-schema.mjs) no es un fallo.
    salida=$(npx eslint --max-warnings 0 --no-warn-ignored --fix "$ARCHIVO" 2>&1)
    if [ $? -ne 0 ]; then
      echo "ESLint falló en $ARCHIVO. Corregilo antes de seguir:" >&2
      printf '%s\n' "$salida" | tail -n 30 >&2
      exit 2
    fi
    ;;
  *.sql)
    # Las migraciones no llevan auth.uid() suelto ni funciones definer sin search_path.
    if grep -nE 'using *\( *auth\.uid\(\)|= *auth\.uid\(\)' "$ARCHIVO" | grep -v 'select auth.uid()' >/dev/null; then
      echo "En $ARCHIVO hay auth.uid() sin envolver: usa (select auth.uid()) dentro de las policies." >&2
      grep -nE 'using *\( *auth\.uid\(\)|= *auth\.uid\(\)' "$ARCHIVO" | grep -v 'select auth.uid()' | head -n 10 >&2
      exit 2
    fi
    if grep -n 'security definer' "$ARCHIVO" >/dev/null && ! grep -n "set search_path = ''" "$ARCHIVO" >/dev/null; then
      echo "En $ARCHIVO hay security definer sin set search_path = ''." >&2
      exit 2
    fi
    ;;
esac
exit 0
