#!/usr/bin/env bash
# ¿Esta máquina puede correr el piloto 24/7 con carriles? Revisa lo que hace falta y dice qué falta; no instala nada. Sale con 1 si algo
# obligatorio falta. Se corre en la máquina dedicada antes de `instalar-servicios.sh`:  bash scripts/maquina/verificar-entorno.sh [carriles]
#   carriles  cuántos carriles correrán (por omisión CARRILES_MAX de piloto.config, o 3): pide ≈ 6,5 GB de RAM y 8 GB de disco cada uno.
set -uo pipefail
RAIZ=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "✗ no es un repo de git."; exit 1; }
cd "$RAIZ" || exit 1
[ -f piloto.config ] && source piloto.config
CARRILES="${1:-${CARRILES_MAX:-3}}"
MALOS=0
ok() { echo "✓ $1"; }
mal() { echo "✗ $1"; MALOS=$((MALOS + 1)); }
aviso() { echo "· $1"; }

for p in git jq flock tmux node pnpm docker gh claude curl; do
  command -v "$p" >/dev/null 2>&1 && ok "$p" || mal "falta $p en el PATH"
done
[ -f .nvmrc ] && aviso "Node pedido: $(cat .nvmrc); instalado: $(node -v 2>/dev/null || echo ninguno)"
docker info >/dev/null 2>&1 && ok "docker responde (sin sudo)" || mal "docker no responde: el usuario debe estar en el grupo docker"
gh auth status >/dev/null 2>&1 && ok "gh autenticado" || mal "gh no está autenticado (gh auth login): sin él no hay PR ni CI"
claude --version >/dev/null 2>&1 && ok "claude responde" || mal "claude no responde (¿sesión iniciada con la cuenta del plan?)"
git config user.email >/dev/null 2>&1 && ok "git user.email" || mal "falta git config user.name y user.email"
git remote get-url origin >/dev/null 2>&1 && ok "origin" || mal "no hay remote origin"

ram_gb=$(awk '/MemTotal/ { printf "%d", $2 / 1048576 }' /proc/meminfo 2>/dev/null || echo 0)
necesita=$((CARRILES * 7 + 4))
[ "$ram_gb" -ge "$necesita" ] && ok "RAM ${ram_gb} GB (pide ${necesita} para ${CARRILES} carriles)" || mal "RAM ${ram_gb} GB; ${CARRILES} carriles piden ≈ ${necesita} GB"
cpus=$(nproc 2>/dev/null || echo 1)
[ "$cpus" -ge $((CARRILES * 2)) ] && ok "CPU ${cpus}" || aviso "CPU ${cpus}: con ${CARRILES} carriles el e2e irá lento (recomendado ≥ $((CARRILES * 2)))"
libre_gb=$(df --output=avail -BG "$RAIZ" 2>/dev/null | tail -n 1 | tr -dc '0-9')
disco_necesario=$((CARRILES * 8 + 40))
[ "${libre_gb:-0}" -ge "$disco_necesario" ] && ok "disco libre ${libre_gb} GB" || mal "disco libre ${libre_gb:-?} GB; piden ≈ ${disco_necesario} GB"

loginctl show-user "${USER:-}" -p Linger 2>/dev/null | grep -q 'Linger=yes' && ok "linger activo (los servicios sobreviven al cierre de sesión)" ||
  mal "sin linger: corre «sudo loginctl enable-linger ${USER:-tu_usuario}» para que el piloto arranque solo tras un reinicio"
[ -f .env.local ] && ok ".env.local" || aviso "no hay .env.local (los secretos se copian por un canal seguro; nunca por git)"
[ "$MALOS" -eq 0 ] && { echo; echo "Lista: la máquina puede correr el piloto."; exit 0; }
echo; echo "$MALOS cosa(s) por arreglar."; exit 1
