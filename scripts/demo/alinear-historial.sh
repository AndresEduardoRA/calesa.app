#!/usr/bin/env bash
# Tras aplastar las migraciones (`pnpm db:aplastar`), alinea el historial del proyecto ENLAZADO con el repo: marca como revertidas las
# versiones que el proyecto tiene y el repo ya no (las que la base aplastada reemplaza), sin tocar el esquema ni los datos. La base
# lleva la versión de la última que reemplaza, así que el proyecto ya la tiene por aplicada y `db push` no la vuelve a correr.
#
#   bash scripts/demo/alinear-historial.sh
#
# La corre `.github/workflows/demo.yml` antes de `db push` (y una persona en producción: docs/DESPLIEGUE.md › «Tras aplastar»).
# Sin versiones de más no hace nada. Si el proyecto NO tiene aplicada la versión de la base (le faltaba alguna de las aplastadas), no
# toca nada y sale con 1: ese proyecto se resetea (`scripts/demo/resetear.sh`) o se le aplican antes las migraciones que le faltan.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }

# «   20261028180656 | 20261028180656 | 2026-10-28 18:06:56»: la versión local y la remota, vacía la que falta.
LISTA=$(sb migration list --linked)
fila() { printf '%s\n' "$LISTA" | awk -F'|' 'NF >= 2 { l = $1; r = $2; gsub(/[^0-9]/, "", l); gsub(/[^0-9]/, "", r); if (l != "" || r != "") print l ":" r }'; }
mapfile -t DE_MAS < <(fila | awk -F: '$1 == "" && $2 != "" { print $2 }')
if [ "${#DE_MAS[@]}" -eq 0 ]; then
  echo "✓ el historial ya está alineado con el repo."
  exit 0
fi

BASE=$(find supabase/migrations -maxdepth 1 -name '*_base.sql' -printf '%f\n' | LC_ALL=C sort | head -n 1)
VERSION="${BASE%%_*}"
[ -n "$VERSION" ] || { echo "✗ no encuentro la base en supabase/migrations." >&2; exit 1; }
if ! fila | grep -qx "${VERSION}:${VERSION}"; then
  echo "✗ el proyecto tiene ${#DE_MAS[@]} versiones que el repo no tiene y NO tiene aplicada la de la base ($VERSION):" >&2
  echo "  le faltaba alguna de las migraciones aplastadas. No se toca nada: reséteala o aplícale antes lo que le falta." >&2
  exit 1
fi
for v in "${DE_MAS[@]}"; do
  if [ "$v" \> "$VERSION" ]; then
    echo "✗ el proyecto tiene la versión $v, posterior a la base ($VERSION), que el repo no tiene: no es de un aplastado." >&2
    exit 1
  fi
done
sb migration repair --linked --status reverted "${DE_MAS[@]}" >/dev/null
echo "✓ ${#DE_MAS[@]} versiones aplastadas marcadas como revertidas; la base ($VERSION) sigue aplicada."
