#!/usr/bin/env bash
# Instala en la máquina dedicada los servicios `systemd --user` que mantienen el piloto 24/7: uno por carril (arrancar.sh --carril <id>:
# retoma un paso a medias con --resume tras un reinicio) y un timer de respaldo cada 6 horas. Escribe unidades en ~/.config/systemd/user/;
# con `--en-seco` sólo las imprime. Hace falta `loginctl enable-linger $USER` (verificar-entorno.sh lo comprueba).
#   bash scripts/maquina/instalar-servicios.sh [--en-seco] [carril…]    (sin carriles: a b c)
set -euo pipefail
RAIZ=$(git rev-parse --show-toplevel)
source "$(dirname "${BASH_SOURCE[0]}")/../piloto/carriles-dir.sh"
EN_SECO=0
CARRILES=()
for a in "$@"; do
  case "$a" in --en-seco) EN_SECO=1 ;; *) CARRILES+=("$a") ;; esac
done
[ "${#CARRILES[@]}" -gt 0 ] || CARRILES=(a b c)
DIR="${UNIDADES:-$HOME/.config/systemd/user}"
escribir() { # <nombre> <texto>
  if [ "$EN_SECO" = 1 ]; then printf '# %s\n%s\n' "$1" "$2"; else mkdir -p "$DIR"; printf '%s\n' "$2" >"$DIR/$1"; fi
}
for c in "${CARRILES[@]}"; do
  # Un carril ≠ a vive en su worktree (abrir-carriles.sh); el a, en la principal.
  arbol="$RAIZ"
  [ "$c" = a ] || arbol="$CARRILES_DIR/$c"
  escribir "piloto-$c.service" "[Unit]
Description=Piloto de importadora, carril $c
After=network-online.target docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$arbol
ExecStart=/usr/bin/env bash scripts/piloto/arrancar.sh --carril $c
ExecStop=/usr/bin/env bash scripts/piloto/parar.sh
Environment=PATH=$PATH

[Install]
WantedBy=default.target"
done
escribir "piloto-respaldo.service" "[Unit]
Description=Respaldo del estado del piloto

[Service]
Type=oneshot
WorkingDirectory=$RAIZ
ExecStart=/usr/bin/env bash scripts/maquina/respaldar.sh"
escribir "piloto-respaldo.timer" "[Unit]
Description=Respaldo del piloto cada 6 horas

[Timer]
OnCalendar=*-*-* 00/6:00:00
Persistent=true

[Install]
WantedBy=timers.target"
[ "$EN_SECO" = 1 ] && exit 0
systemctl --user daemon-reload
for c in "${CARRILES[@]}"; do systemctl --user enable --now "piloto-$c.service"; done
systemctl --user enable --now piloto-respaldo.timer
echo "instalar-servicios: carriles ${CARRILES[*]} y respaldo activos. Estado: systemctl --user status 'piloto-*'"
