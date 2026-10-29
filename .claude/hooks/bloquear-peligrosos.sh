#!/usr/bin/env bash
# Hook PreToolUse sobre Bash: bloquea lo que ninguna sesión de IA debería correr sola (exit 2 y el motivo por stderr,
# que es lo que Claude recibe). Lee la entrada con jq (`tool_input.command`, `cwd`). Se prueba en `bloquear-peligrosos.test.ts`.
#
#   Siempre:          lo irreversible (reset --hard, clean, checkout --, branch -D…), publicar en main (push a main, `gh pr merge`:
#                     lo integra la persona; una sesión empuja sólo su rama, sin forzar), lo remoto (supabase --linked salvo leer,
#                     config push, gh api …/dispatches, vercel), cambiar dependencias y saltarse el candado de la base (`scripts/candado.sh`).
#   Sólo PILOTO=1:    todo `git push` (lo publica el bucle, que no es una sesión), `gh` que escribe y `claude`.
#
# Un comando se parte en segmentos (`&&`, `||`, `;`, `|`, `$(`, comillas invertidas, saltos de línea) y de cada uno se
# descartan los envoltorios (`VAR=x`, `sudo`, `npx`, `pnpm exec`, `bash -c`, `scripts/candado.sh <nombre> --`) hasta el comando
# de verdad. No entiende comillas: el texto de un mensaje que nombre una de estas órdenes también se bloquea (mejor sobrar que faltar).
set -uo pipefail

ENTRADA=$(cat)
CMD=$(printf '%s' "$ENTRADA" | jq -r '.tool_input.command // empty' 2>/dev/null)
CWD=$(printf '%s' "$ENTRADA" | jq -r '.cwd // empty' 2>/dev/null)
[ -z "$CMD" ] && exit 0
[ -z "$CWD" ] && CWD="$PWD"
PILOTO="${PILOTO:-}"

bloquear() {
  printf '%s\n' "$1" >&2
  exit 2
}

# --- Sobre el comando entero (lo de siempre) ---
case "$CMD" in
  *"--no-verify"*) bloquear "Nunca git commit --no-verify: si un hook falla, el problema es el código." ;;
  *"supabase db push"*) bloquear "supabase db push contra el proyecto remoto lo corre una persona, con --dry-run primero." ;;
  *"supabase db reset --linked"*) bloquear "db reset --linked borra la base remota." ;;
  *"rm -rf /"* | *"rm -rf ~"* | *"rm -rf .."*) bloquear "rm -rf fuera del proyecto." ;;
  *"npm i -g"* | *"npm install -g"* | *"pnpm add -g"*) bloquear "Nada global: contamina la máquina del usuario." ;;
  *"SUPABASE_SECRET_KEY"* | *"sb_secret_"*) bloquear "No imprimas ni manipules la secret key desde Bash." ;;
  *"@next/codemod"*) bloquear "Un codemod de Next reescribe el código y las dependencias: lo decide una persona." ;;
esac

# La rama de una carpeta ($1 vacío = el cwd de la sesión; relativa = contra el cwd). Vacío si no hay rama (HEAD suelto).
rama_de() {
  local d="${1:-}"
  case "$d" in
    '') d="$CWD" ;;
    /*) ;;
    *) d="$CWD/$d" ;;
  esac
  git -C "$d" symbolic-ref --quiet --short HEAD 2>/dev/null
}

# Hay un argumento que no es una opción ni el valor de una (`--filter web`, `--dir x`): un paquete.
hay_posicional() {
  local t saltar=0
  for t in "$@"; do
    if [ "$saltar" = 1 ]; then saltar=0; continue; fi
    case "$t" in
      --filter | -F | --dir | -C | --prefix | --registry | --store-dir | --reporter | --loglevel) saltar=1 ;;
      -*) ;;
      *) return 0 ;;
    esac
  done
  return 1
}

# Una sesión empuja sólo la rama en la que está (la de su carril o su PR), sin forzar ni borrar, y nunca main: main lo integra la
# persona al aprobar el PR. `cd x && git push` cambiaría de rama sin que el hook lo vea: se rechaza.
revisar_push() {
  local dir="$1"
  shift
  local pos=() t rama
  [ "$PILOTO" = 1 ] && bloquear "Con PILOTO=1 ninguna sesión hace git push: publica el bucle, después de verificar por su cuenta."
  for t in "$@"; do
    case "$t" in
      --all | --mirror | --tags | --delete | -d | --prune | -f | --force* | --no-verify)
        bloquear "git push $t: sólo se empuja la rama propia, sin forzar, sin borrar y sin etiquetas." ;;
      -*) ;;
      *) pos+=("$t") ;;
    esac
  done
  if printf '%s' "$CMD" | grep -qE '(^|[[:space:];&|])cd[[:space:]]'; then
    bloquear "git push junto a un cd: el hook no ve en qué rama queda. Usa git -C <carpeta> push."
  fi
  rama=$(rama_de "$dir")
  case "$rama" in
    '') bloquear "git push sin una rama (HEAD suelto o fuera de un repo): no se sabe qué se publica." ;;
    main) bloquear "git push desde main: main lo integra la persona al aprobar el PR. Trabaja en tu rama y empújala." ;;
  esac
  case "${#pos[@]}" in
    0 | 1) ;;
    2)
      [ "${pos[1]}" = HEAD ] || [ "${pos[1]}" = "$rama" ] ||
        bloquear "git push sólo de la rama actual («$rama»; sin ':', 'refs/', '+' ni otra rama): se pidió «${pos[1]}»."
      ;;
    *) bloquear "git push con más de un refspec: sólo origin <tu rama>." ;;
  esac
}

revisar_git() {
  local dir="" sub="" i=0 t n
  while [ "$i" -lt "${#A[@]}" ]; do
    t="${A[$i]}"
    case "$t" in
      -C) dir="${A[$((i + 1))]:-}"; i=$((i + 2)) ;;
      -c | --git-dir | --work-tree | --namespace | --exec-path) i=$((i + 2)) ;;
      -*) i=$((i + 1)) ;;
      *) sub="$t"; i=$((i + 1)); break ;;
    esac
  done
  local R=("${A[@]:$i}")
  case "$sub" in
    commit)
      for t in "${R[@]}"; do
        [ "$t" = -n ] && bloquear "Nunca git commit -n (--no-verify): si un hook falla, el problema es el código."
      done ;;
    reset)
      for t in "${R[@]}"; do
        [ "$t" = --hard ] && bloquear "git reset --hard descarta trabajo sin commitear: se hace un respaldo y se restaura con cp."
      done ;;
    clean) bloquear "git clean borra lo no rastreado sin pasar por la papelera." ;;
    checkout)
      for t in "${R[@]}"; do
        case "$t" in
          -- | -f | --force | .*) bloquear "git checkout $t descarta cambios: se respalda y se restaura con cp." ;;
        esac
      done ;;
    restore)
      local staged=0 worktree=0
      for t in "${R[@]}"; do
        case "$t" in --staged | -S) staged=1 ;; --worktree | -W) worktree=1 ;; esac
      done
      { [ "$staged" = 1 ] && [ "$worktree" = 0 ]; } || bloquear "git restore descarta cambios del árbol (sólo vale --staged)." ;;
    switch)
      for t in "${R[@]}"; do
        case "$t" in -f | --force | --discard-changes) bloquear "git switch $t descarta cambios." ;; esac
      done ;;
    branch)
      local borrar=0 forzar=0
      for t in "${R[@]}"; do
        case "$t" in
          -D) bloquear "git branch -D borra una rama sin comprobar que esté integrada." ;;
          --delete) borrar=1 ;;
          --force) forzar=1 ;;
          -[a-zA-Z]*)
            case "$t" in *D*) bloquear "git branch -D borra una rama sin comprobar que esté integrada." ;; esac
            case "$t" in *d*) borrar=1 ;; esac
            case "$t" in *f*) forzar=1 ;; esac ;;
        esac
      done
      [ "$borrar" = 1 ] && [ "$forzar" = 1 ] && bloquear "git branch --delete --force borra una rama sin comprobar que esté integrada." ;;
    stash)
      n="${R[0]:-}"
      case "$n" in drop | clear) bloquear "git stash $n borra lo guardado, que puede ser de otra sesión." ;; esac ;;
    push) revisar_push "$dir" "${R[@]}" ;;
  esac
}

revisar_gh() {
  local sub="${A[0]:-}" sub2="${A[1]:-}" t
  case "$sub $sub2" in
    "workflow run") bloquear "gh workflow run gasta minutos de CI y lo dispara una persona." ;;
  esac
  if [ "$sub" = api ] && printf '%s' "$ARGS" | grep -qE '/dispatches'; then
    bloquear "gh api …/dispatches dispara un flujo de trabajo: lo hace una persona."
  fi
  if [ "$sub $sub2" = "pr merge" ] || { [ "$sub" = api ] && printf '%s' "$ARGS" | grep -qE '/pulls/[0-9]+/merge'; }; then
    bloquear "gh pr merge integra en main: lo hace la persona al revisar el PR."
  fi
  [ "$PILOTO" = 1 ] || return 0
  case "$sub $sub2" in
    "pr create" | "pr merge" | "repo edit" | "run rerun" | "run cancel")
      bloquear "Con PILOTO=1, gh $sub $sub2 es de afuera: no hay PR ni cambios en el repo remoto desde una sesión." ;;
  esac
  case "$sub" in
    secret | variable | release) bloquear "Con PILOTO=1, gh $sub escribe afuera del repo local." ;;
    api)
      for t in "${A[@]:1}"; do
        case "$t" in
          -f | -F | --field | --raw-field | --input | -f* | -F* | --field=* | --raw-field=* | --input=*)
            bloquear "Con PILOTO=1, gh api que escribe (campos o cuerpo) es de afuera." ;;
          -X | --method | -X* | --method=*)
            printf '%s' "$ARGS" | grep -qiE '(-X ?|--method[ =])(GET|get)( |$)' || bloquear "Con PILOTO=1, gh api con un método que escribe es de afuera." ;;
        esac
      done ;;
  esac
}

revisar_supabase() {
  local sub="${A[0]:-}" sub2="${A[1]:-}"
  case "$ARGS" in
    *" --linked"* | *" --project-ref"*)
      # Sólo lectura del proyecto remoto (docs/PREPARACION.md, etapa 0): volcar, listar migraciones, comparar e inspeccionar.
      # Lo que cambia la demo pasa por scripts/demo/*.sh, que corre una persona o la sesión con su aviso.
      case "$sub $sub2" in
        "db dump" | "migration list" | "db diff") ;;
        inspect\ *) ;;
        *) bloquear "supabase con --linked o --project-ref toca el proyecto remoto: lo hace una persona (sólo se leen db dump, migration list, db diff e inspect)." ;;
      esac ;;
  esac
  case "$ARGS" in
    *"functions deploy"*) bloquear "supabase functions deploy publica en el proyecto remoto: lo hace una persona." ;;
    *"config push"*) bloquear "supabase config push cambia la configuración del proyecto remoto: va por scripts/demo/restaurar.sh." ;;
  esac
  case "$sub" in link | secrets) bloquear "supabase $sub toca el proyecto remoto: lo hace una persona." ;; esac
  [ "$CON_CANDADO" = 1 ] && return 0
  case "$sub $sub2" in
    "db reset" | "db lint" | "db diff" | "gen types")
      bloquear "supabase $sub $sub2 usa la base local, que es de una a la vez: pasa por el candado (pnpm db:reset | db:lint | db:diff | db:types)." ;;
  esac
}

revisar_pnpm() {
  local sub="${A[0]:-}"
  case "$sub" in
    add* | up | update | upgrade | up*) bloquear "pnpm $sub cambia dependencias: se verifican y las decide una persona." ;;
    remove | rm | uninstall | un) bloquear "pnpm $sub cambia dependencias: lo decide una persona." ;;
    i | install)
      hay_posicional "${A[@]:1}" && bloquear "pnpm $sub <paquete> cambia dependencias: lo decide una persona." ;;
    next) [ "${A[1]:-}" = upgrade ] && bloquear "next upgrade lo decide una persona." ;;
  esac
}

revisar_segmento() {
  local W=() t
  # Sin comillas: `bash -c 'git clean -fd'` y `git commit -m "x"` se leen igual que sin ellas.
  read -ra W <<<"${1//[\"\']/}"
  # Una redirección (`> f`, `2>/dev/null`, `>> f`, `< f`) no es un argumento: se descarta con su archivo.
  local L=("${W[@]}") saltar=0
  W=()
  for t in "${L[@]}"; do
    if [ "$saltar" = 1 ]; then saltar=0; continue; fi
    if [[ "$t" =~ ^[0-9]*(\>\>?|\<)$ ]]; then saltar=1; continue; fi
    [[ "$t" =~ ^[0-9]*(\>\>?|\<). ]] && continue
    W+=("$t")
  done
  CON_CANDADO=0
  while :; do
    [ "${#W[@]}" -eq 0 ] && return 0
    case "${W[0]}" in
      '') W=("${W[@]:1}") ;;
      [A-Za-z_]*=*) W=("${W[@]:1}") ;;
      sudo | env | command | nohup | time | exec | xargs) W=("${W[@]:1}") ;;
      npx | bunx)
        W=("${W[@]:1}")
        while [ "${#W[@]}" -gt 0 ] && [[ "${W[0]}" == -* ]]; do W=("${W[@]:1}"); done ;;
      pnpm | npm)
        case "${W[1]:-}" in
          exec | dlx | x)
            W=("${W[@]:2}")
            while [ "${#W[@]}" -gt 0 ] && [[ "${W[0]}" == -* ]]; do W=("${W[@]:1}"); done ;;
          playwright | supabase | vercel | next | ncu) W=("${W[@]:1}") ;;
          *) break ;;
        esac ;;
      *candado.sh)
        CON_CANDADO=1
        t=1
        while [ "$t" -lt "${#W[@]}" ] && [ "${W[$t]}" != -- ]; do t=$((t + 1)); done
        W=("${W[@]:$((t + 1))}") ;;
      bash | sh | zsh)
        if [[ "${W[1]:-}" == -*c* ]]; then
          W=("${W[@]:2}")
        elif [[ "${W[1]:-}" == *candado.sh ]]; then
          W=("${W[@]:1}")
        else
          break
        fi ;;
      *) break ;;
    esac
  done
  local cmd="${W[0]##*/}"
  A=("${W[@]:1}")
  ARGS=" ${A[*]:-} "
  case "$cmd" in
    git) revisar_git ;;
    gh) revisar_gh ;;
    supabase) revisar_supabase ;;
    pnpm) revisar_pnpm ;;
    npm | yarn)
      case "${A[0]:-}" in
        add) bloquear "$cmd add cambia dependencias: lo decide una persona." ;;
        i | install) hay_posicional "${A[@]:1}" && bloquear "$cmd ${A[0]} <paquete> cambia dependencias: lo decide una persona." ;;
      esac ;;
    vercel) bloquear "vercel despliega o cambia el proyecto remoto: lo hace una persona." ;;
    ncu)
      for t in "${A[@]}"; do
        case "$t" in -u | --upgrade) bloquear "ncu -u reescribe las versiones de package.json: lo decide una persona." ;; esac
      done ;;
    next) [ "${A[0]:-}" = upgrade ] && bloquear "next upgrade lo decide una persona." ;;
    playwright)
      if [ "${A[0]:-}" = test ] && [ "$CON_CANDADO" = 0 ] && [[ "$ARGS" != *" --list "* ]]; then
        bloquear "playwright test usa la base local, que es de una a la vez: pasa por el candado (pnpm test:e2e | test:e2e:completo)."
      fi ;;
    node)
      if [ "$CON_CANDADO" = 0 ] && printf '%s' "${A[0]:-}" | grep -qE '(^|/)scripts/(e2e-completo|carreras|medir-listado|sembrar-volumen)\.mjs$'; then
        bloquear "${A[0]} usa la base local, que es de una a la vez: corre por su script de pnpm (candado) o por scripts/candado.sh."
      fi ;;
    claude) [ "$PILOTO" = 1 ] && bloquear "Con PILOTO=1 una sesión no lanza otra: la lanza el bucle." ;;
    tmux) [ "$PILOTO" = 1 ] && [[ "$ARGS" == *claude* ]] && bloquear "Con PILOTO=1 una sesión no lanza otra (ni dentro de tmux): la lanza el bucle." ;;
  esac
  return 0
}

A=()
ARGS=""
CON_CANDADO=0
# `2>&1` y `&>` llevan un `&` que no separa comandos: se reducen antes de partir.
SEGMENTOS=$(printf '%s' "$CMD" | sed -E 's/[0-9]*[<>]&[0-9-]*//g; s/&>>?/>/g' | sed -E 's/(&&|\|\||;|\||`|\$\(|\(|\)|&)/\n/g')
while IFS= read -r segmento; do
  revisar_segmento "$segmento"
done <<<"$SEGMENTOS"
exit 0
