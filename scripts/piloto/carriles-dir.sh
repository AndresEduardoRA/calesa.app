#!/usr/bin/env bash
# Dónde viven los worktrees de los carriles ≠ a (se hace `source`, necesita RAIZ). Define CARRILES_DIR:
#   1. la variable CARRILES_DIR, si viene puesta;
#   2. si no, la primera línea de <carpeta común de git>/piloto/carriles-dir (local de la máquina, fuera del árbol y sin versionar);
#   3. si no, <RAIZ>.carriles (lo de siempre).
# Sirve para poner los carriles en otro disco: `echo /mnt/orca-carriles > "$(git rev-parse --git-common-dir)/piloto/carriles-dir"`.
if [ -z "${CARRILES_DIR:-}" ]; then
  _arch="$(git -C "$RAIZ" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)/piloto/carriles-dir"
  [ -r "$_arch" ] && CARRILES_DIR="$(head -n 1 "$_arch")"
fi
CARRILES_DIR="${CARRILES_DIR:-$RAIZ.carriles}"
