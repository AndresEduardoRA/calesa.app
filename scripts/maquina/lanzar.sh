#!/usr/bin/env bash
# Revisa que todo esté listo para correr el plan de corrido y, con `--ya`, lo lanza. Sin `--ya` no cambia nada: sólo dice qué hay.
#
#   bash scripts/maquina/lanzar.sh            revisa (sale con 1 si algo obligatorio falta)
#   bash scripts/maquina/lanzar.sh --ya       revisa y, si no falta nada, quita `.piloto/PARAR` de cada carril y arranca sus bucles
#   bash scripts/maquina/lanzar.sh --parar    pone `.piloto/PARAR` en cada carril (los bucles paran entre pasos; nada arranca tras un reinicio)
#
# Los carriles son los worktrees del repo que tienen `.env.carril` (scripts/worktree/preparar.sh): su letra sale de SUPABASE_PROJECT_ID.
# Qué revisa: la cuenta de GitHub del piloto (`PILOTO_GH_USUARIO` de piloto.config) con sesión, guardada fuera del llavero y con permiso de
# escritura; `claude`; el plan de origin/main válido y con pasos por hacer; el CI de main; cada carril con su árbol limpio, sin un paso a
# medias, su pila de Supabase arriba y su servicio instalado; disco y memoria. Lo que es un aviso (·) no impide lanzar.
set -uo pipefail
RAIZ=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "✗ no es un repo de git."; exit 1; }
cd "$RAIZ" || exit 1
# shellcheck source=../../piloto.config
[ -f piloto.config ] && { set -a; source piloto.config; set +a; }
MODO="${1:-revisar}"
MALOS=0
ok() { echo "✓ $1"; }
mal() { echo "✗ $1"; MALOS=$((MALOS + 1)); }
aviso() { echo "· $1"; }

# Los carriles: «letra ruta» por línea.
carriles() {
  local dir id
  git worktree list --porcelain | sed -n 's/^worktree //p' | while IFS= read -r dir; do
    [ -f "$dir/.env.carril" ] || continue
    id=$(sed -n 's/^SUPABASE_PROJECT_ID=.*-\([a-z][a-z0-9]*\)$/\1/p' "$dir/.env.carril" | head -n 1)
    [ -n "$id" ] && echo "$id $dir"
  done | sort
}
mapfile -t CARRILES < <(carriles)

if [ "$MODO" = --parar ]; then
  for linea in "${CARRILES[@]}"; do
    dir=${linea#* }
    mkdir -p "$dir/.piloto"
    echo "parado con lanzar.sh --parar ($(TZ=America/La_Paz date +%FT%T))" >"$dir/.piloto/PARAR"
    echo "· carril ${linea%% *}: PARAR puesto (para entre pasos)."
  done
  exit 0
fi

echo "== La cuenta de GitHub y Claude"
USUARIO="${PILOTO_GH_USUARIO:-}"
if [ -z "$USUARIO" ]; then
  aviso "piloto.config no fija PILOTO_GH_USUARIO: el piloto usará la cuenta activa de gh ($(gh api user --jq .login 2>/dev/null || echo ninguna))."
elif TOKEN=$(gh auth token --user "$USUARIO" 2>/dev/null) && [ -n "$TOKEN" ]; then
  export GH_TOKEN="$TOKEN"
  unset TOKEN
  ok "gh tiene sesión de $USUARIO (la activa de la máquina es $(env -u GH_TOKEN gh api user --jq .login 2>/dev/null || echo otra); no se toca)"
  REPO=$(git remote get-url origin 2>/dev/null | sed -E 's#^(https://github.com/|git@github.com:)##; s#\.git$##')
  [ "$(gh api "repos/$REPO" --jq .permissions.push 2>/dev/null)" = true ] && ok "$USUARIO puede escribir en $REPO" ||
    mal "$USUARIO no puede escribir en $REPO (o gh no responde): sin eso no hay push, PR ni integración"
  # Fuera del llavero del escritorio: si no, tras un reinicio y antes de iniciar sesión gráfica gh no lo puede leer.
  if awk -v u="$USUARIO:" '$1 == u { f = 1; next } f && /oauth_token:/ { ok = 1 } f && /^        [^ ]/ && !/oauth_token/ { f = 0 } END { exit !ok }' "$HOME/.config/gh/hosts.yml" 2>/dev/null; then
    ok "el token de $USUARIO está en hosts.yml (se lee sin la sesión del escritorio)"
  else
    aviso "el token de $USUARIO está en el llavero: tras un reinicio, hasta iniciar sesión gráfica, gh fallará (gh auth login --insecure-storage)"
  fi
else
  mal "gh no tiene sesión de $USUARIO (PILOTO_GH_USUARIO): gh auth login --insecure-storage con esa cuenta"
fi
claude --version >/dev/null 2>&1 && ok "claude responde ($(claude --version 2>/dev/null | head -n 1))" || mal "claude no responde"

echo "== El plan y main"
timeout 60 git fetch -q origin main 2>/dev/null || aviso "git fetch origin main falló: miro el origin/main que hay"
if git show origin/main:docs/plan.yaml >/dev/null 2>&1; then
  TMP=$(mktemp)
  git show origin/main:docs/plan.yaml >"$TMP"
  if COORD_PLAN="$TMP" node scripts/coordinador/coordinador.mjs validar >/dev/null 2>"$TMP.err"; then
    ok "el plan de origin/main es válido"
  else
    mal "el plan de origin/main no es válido: $(head -n 1 "$TMP.err")"
  fi
  rm -f "$TMP" "$TMP.err"
  TABLERO=$(node scripts/coordinador/coordinador.mjs tablero 2>/dev/null | sed -n 3p)
  HECHOS=$(sed -n 's/^\([0-9]*\) de \([0-9]*\) pasos.*/\1/p' <<<"$TABLERO")
  TOTAL=$(sed -n 's/^\([0-9]*\) de \([0-9]*\) pasos.*/\2/p' <<<"$TABLERO")
  if [ -n "$TOTAL" ] && [ "$HECHOS" -lt "$TOTAL" ]; then ok "pasos por hacer: $((TOTAL - HECHOS)) de $TOTAL"
  else mal "el plan no tiene pasos por hacer (${TABLERO:-sin tablero}): no hay nada que lanzar"; fi
else
  mal "origin/main no tiene docs/plan.yaml"
fi
CI=$(gh run list --branch main --limit 5 --json status,conclusion,databaseId 2>/dev/null |
  jq -r '(map(select(.conclusion != "cancelled")) + .) | .[0] | "\(.status) \(.conclusion // "-") \(.databaseId)"' 2>/dev/null)
case "$CI" in
  "completed success "*) ok "el último CI de main está en verde (${CI##* })" ;;
  "completed "*) aviso "el último CI de main terminó «$(cut -d' ' -f2 <<<"$CI")» (${CI##* }): el primer paso con puerta mandará arreglarlo" ;;
  "") aviso "no pude leer el CI de main" ;;
  *) aviso "el CI de main sigue corriendo (${CI##* })" ;;
esac
[ "$(git rev-parse HEAD 2>/dev/null)" = "$(git rev-parse origin/main 2>/dev/null)" ] ||
  aviso "este árbol ($(git symbolic-ref --short HEAD 2>/dev/null)) no está en origin/main: los carriles corren lo integrado, no lo de aquí"

echo "== Los carriles"
[ "${#CARRILES[@]}" -gt 0 ] || mal "no hay ningún carril (un worktree con .env.carril): bash scripts/coordinador/abrir-carriles.sh"
for linea in "${CARRILES[@]}"; do
  c=${linea%% *} dir=${linea#* }
  malos_antes=$MALOS
  [ -z "$(git -C "$dir" status --porcelain 2>/dev/null)" ] || mal "carril $c: el árbol no está limpio ($dir)"
  [ ! -f "$dir/.piloto/en-curso.json" ] || aviso "carril $c: hay un paso a medias ($(jq -r .paso "$dir/.piloto/en-curso.json" 2>/dev/null)): se retoma con --resume"
  if flock -n "$dir/.piloto/bucle.lock" true 2>/dev/null; then :; else aviso "carril $c: su bucle ya corre"; fi
  docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^supabase_db_importadora-$c$" ||
    mal "carril $c: su pila de Supabase no está arriba (en $dir: bash scripts/worktree/preparar.sh $c)"
  [ -f "$dir/.env.local" ] || mal "carril $c: falta .env.local"
  [ -d "$dir/node_modules" ] || mal "carril $c: falta node_modules (pnpm install)"
  systemctl --user is-enabled "piloto-$c.service" >/dev/null 2>&1 && systemctl --user is-enabled "piloto-$c-vigia.timer" >/dev/null 2>&1 ||
    aviso "carril $c: sin servicio o sin vigía de systemd (bash scripts/maquina/instalar-servicios.sh): no se levantará solo tras un reinicio"
  [ "$MALOS" = "$malos_antes" ] && ok "carril $c listo ($dir, $(git -C "$dir" symbolic-ref --short HEAD 2>/dev/null))$([ -f "$dir/.piloto/PARAR" ] && echo ' — en PARAR')"
done

echo "== La máquina"
loginctl show-user "${USER:-}" -p Linger 2>/dev/null | grep -q 'Linger=yes' && ok "linger activo" || aviso "sin linger: tras un reinicio nada arranca hasta iniciar sesión"
disco=$(df --output=pcent / 2>/dev/null | tail -n 1 | tr -dc '0-9')
[ "${disco:-0}" -lt "${PILOTO_DISCO_MAX:-90}" ] && ok "disco al ${disco} % (el bucle para sobre ${PILOTO_DISCO_MAX:-90} %)" || mal "disco al ${disco} %"
ram=$(awk '/MemAvailable/ { printf "%d", $2 / 1048576 }' /proc/meminfo 2>/dev/null || echo 0)
[ "$ram" -ge $((${#CARRILES[@]} * 4)) ] && ok "memoria disponible: ${ram} GB" || aviso "memoria disponible: ${ram} GB (cada carril con su e2e usa ≈ 4–6)"

echo
if [ "$MALOS" -gt 0 ]; then echo "$MALOS cosa(s) por arreglar antes de lanzar."; exit 1; fi
if [ "$MODO" != --ya ]; then
  echo "Todo listo. Para lanzar: bash scripts/maquina/lanzar.sh --ya"
  exit 0
fi

echo "== Lanzar"
for linea in "${CARRILES[@]}"; do
  c=${linea%% *} dir=${linea#* }
  rm -f "$dir/.piloto/PARAR"
  flock -n "$dir/.piloto/bucle.lock" true 2>/dev/null || { echo "· carril $c: ya corría."; continue; }
  tmux kill-session -t "piloto-bucle-$c" 2>/dev/null
  # El árbol al día con main antes de arrancar: `arrancar.sh` y el coordinador corren los del árbol, y un carril que quedó en la rama de
  # su último paso arrancaría con los de entonces. Sólo con el árbol limpio y sin un paso a medias (ya se revisó arriba); si no se puede,
  # el bucle trae main igual al pedir su primer paso.
  if [ ! -f "$dir/.piloto/en-curso.json" ] && [ -z "$(git -C "$dir" status --porcelain 2>/dev/null)" ]; then
    git -C "$dir" checkout --quiet -B "$c/base" origin/main 2>/dev/null &&
      echo "· carril $c: árbol en origin/main ($(git -C "$dir" rev-parse --short HEAD))"
  fi
  # Por el servicio si está instalado (así el vigía y el arranque tras un reinicio son los mismos); si no, directo.
  if systemctl --user cat "piloto-$c.service" >/dev/null 2>&1; then
    systemctl --user restart "piloto-$c.service" && echo "✓ carril $c: lanzado (systemctl --user restart piloto-$c.service)"
  else
    (cd "$dir" && bash scripts/piloto/arrancar.sh --carril "$c") && echo "✓ carril $c: lanzado"
  fi
done
echo
echo "Para mirar: tmux attach -t piloto-bucle-<carril> · el tablero: node scripts/coordinador/coordinador.mjs tablero"
echo "Para parar entre pasos: bash scripts/maquina/lanzar.sh --parar"
