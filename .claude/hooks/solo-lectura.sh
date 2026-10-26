#!/usr/bin/env bash
# Hook PreToolUse sobre Bash del auditor y del planificador (agentes que no cambian nada): admite por segmento una lista corta de
# comandos de lectura y rechaza todo lo demás con exit 2 (el motivo, por stderr). Se prueba en `scripts/guardas/solo-lectura.test.ts`.
#
# Un comando se parte en segmentos (`|`, `||`, `&&`, `;`, `&`, saltos de línea) y en palabras, respetando las comillas (`grep -E
# "a|b"` es un segmento). Se rechaza el comando entero si cualquier segmento no es de lectura, si hay una redirección que no sea a
# /dev/null o entre descriptores (`2>/dev/null`, `2>&1`), una entrada (`<`, `<<`, `<(`), una sustitución (`$(…`, comillas
# invertidas) o un archivo de entorno con secretos (`.env`, `.env.local`; `.env.example` sí).
#
# Admitidos: git log|show|diff|status|rev-parse|ls-files|cat-file|blame|grep|for-each-ref y branch --list, wc, ls, cat, head, tail,
# grep, rg, jq, stat, df, du, file, sort, uniq, cut, tr, diff, cmp, find (sin -exec/-delete/-fprint), sed -n '<n>p', gh run
# list|view y node scripts/piloto/{nivel,cuenta-e2e,saltadas}.mjs. Con sus salvedades: sin sort -o, sin tail -f, sin rg --pre, sin
# git --output, sin `git -c`, y uniq con un solo archivo (con dos escribe el segundo).
set -uo pipefail

ENTRADA=$(cat)
CMD=$(printf '%s' "$ENTRADA" | jq -r '.tool_input.command // empty' 2>/dev/null) || {
  echo "solo-lectura: la entrada del hook no es JSON; ante la duda, no se ejecuta." >&2
  exit 2
}
[ -z "$CMD" ] && exit 0

rechazar() {
  printf 'solo-lectura: %s\nEste agente sólo lee (git log|show|diff|status, ls, cat, grep, rg, jq, wc, find sin -exec, sed -n…); no escribe ni ejecuta nada más.\n' "$1" >&2
  exit 2
}

case "$CMD" in
  *'$('* | *'`'*) rechazar "sustitución de comandos (\$( o comillas invertidas)." ;;
esac

SEP=$'\037'
# Partir en segmentos y palabras (una línea por segmento, palabras separadas por \037). Una redirección sin comillas deja \002
# (`>`) o \003 (`<`) dentro de su palabra, para validarla después.
TOKENIZAR='
BEGIN { SEP = "\037"; RS = "\001" }
function flush() { if (has && tok != "") line = line (line == "" ? "" : SEP) tok; tok = ""; has = 0 }
function fin() { flush(); if (line != "") print line; line = "" }
{
  s = $0; n = length(s); tok = ""; has = 0; q = ""; line = ""
  for (i = 1; i <= n; i++) {
    c = substr(s, i, 1)
    if (q == "\047") { if (c == "\047") q = ""; else tok = tok c; has = 1; continue }
    if (q == "\"") {
      if (c == "\\" && i < n) { i++; tok = tok substr(s, i, 1) } else if (c == "\"") q = ""; else tok = tok c
      has = 1; continue
    }
    if (c == "\047" || c == "\"") { q = c; has = 1; continue }
    if (c == "\\") { if (i < n) { i++; tok = tok substr(s, i, 1); has = 1 }; continue }
    if (c == " " || c == "\t") { flush(); continue }
    if (c == "\n" || c == ";") { fin(); continue }
    if (c == "|") { fin(); if (substr(s, i + 1, 1) == "|") i++; continue }
    if (c == "&") {
      nx = substr(s, i + 1, 1); pv = substr(s, i - 1, 1)
      if (nx == "&") { fin(); i++; continue }
      if (nx == ">" || pv == ">") { tok = tok c; has = 1; continue }
      fin(); continue
    }
    if (c == ">") { tok = tok "\002"; has = 1; continue }
    if (c == "<") { tok = tok "\003"; has = 1; continue }
    tok = tok c; has = 1
  }
  fin()
}'

# Una redirección admitida: sólo a /dev/null o entre descriptores.
redireccion_admitida() {
  case "${1//$'\002'/>}" in
    '2>/dev/null' | '>/dev/null' | '1>/dev/null' | '&>/dev/null' | '2>&1' | '1>&2' | '>&2') return 0 ;;
  esac
  return 1
}

es_secreto() {
  case "$1" in
    *.env.example) return 1 ;;
    .env | */.env | .env.* | */.env.*) return 0 ;;
  esac
  return 1
}

# Los argumentos (A) que no son opciones.
posicionales() {
  local t n=0
  for t in "${A[@]}"; do
    case "$t" in -*) ;; *) n=$((n + 1)) ;; esac
  done
  printf '%s' "$n"
}

revisar_git() {
  local i=0 t sub=""
  while [ "$i" -lt "${#A[@]}" ]; do
    t="${A[$i]}"
    case "$t" in
      --no-pager) i=$((i + 1)) ;;
      -C) i=$((i + 2)) ;;
      -*) rechazar "git $t: opciones globales de git no admitidas." ;;
      *) sub="$t"; i=$((i + 1)); break ;;
    esac
  done
  local R=("${A[@]:$i}")
  for t in "${R[@]}"; do
    case "$t" in --output | --output=* | -O* | --open-files-in-pager*) rechazar "git $sub $t escribe o abre un editor." ;; esac
  done
  case "$sub" in
    log | show | diff | status | rev-parse | ls-files | cat-file | blame | grep | for-each-ref) ;;
    branch)
      local lista=0 posicional=0
      for t in "${R[@]}"; do
        case "$t" in
          --list | -l) lista=1 ;;
          -a | -r | -v | -vv | --all | --remotes | --show-current | --verbose) ;;
          -*) rechazar "git branch $t cambia ramas: sólo se admite git branch --list." ;;
          *) posicional=1 ;;
        esac
      done
      [ "$posicional" = 1 ] && [ "$lista" = 0 ] && rechazar "git branch <nombre> crea una rama."
      ;;
    *) rechazar "git $sub no es de lectura (se admite log, show, diff, status, rev-parse, ls-files, cat-file, blame, grep, for-each-ref y branch --list)." ;;
  esac
}

revisar_sed() {
  local n="${#A[@]}" script
  [ "$n" -ge 2 ] && [ "${A[0]}" = -n ] || rechazar "sed sólo como sed -n '<n>p' <archivo>."
  script="${A[1]}"
  [[ "$script" =~ ^([0-9]+|\$)(,([0-9]+|\$))?p$ ]] || [[ "$script" =~ ^/[^/]+/p$ ]] ||
    rechazar "sed -n con «$script»: sólo líneas (<n>p, <a>,<b>p) o /patrón/p."
}

revisar_segmento() {
  local T=() t
  IFS="$SEP" read -ra T <<<"$1"
  [ "${#T[@]}" -eq 0 ] && return 0
  local P=() i=0
  while [ "$i" -lt "${#T[@]}" ]; do
    t="${T[$i]}"
    i=$((i + 1))
    if [[ "$t" == *$'\002'* || "$t" == *$'\003'* ]]; then
      # `> /dev/null` con espacio: la redirección y su destino son dos palabras.
      if [[ "$t" == *$'\002' && "${T[$i]:-}" == /dev/null ]]; then
        i=$((i + 1))
        continue
      fi
      redireccion_admitida "$t" || rechazar "redirección «${t//$'\002'/>}»: sólo a /dev/null o entre descriptores."
    else
      P+=("$t")
    fi
  done
  [ "${#P[@]}" -eq 0 ] && return 0
  for t in "${P[@]}"; do
    es_secreto "$t" && rechazar "$t guarda secretos: no se lee."
  done
  local cmd="${P[0]}"
  A=("${P[@]:1}")
  case "$cmd" in
    git) revisar_git ;;
    wc | ls | cat | head | grep | jq | stat | df | du | cut | tr | diff | cmp) ;;
    tail)
      for t in "${A[@]}"; do
        case "$t" in -*[fF]*) rechazar "tail $t se queda esperando." ;; esac
      done ;;
    rg)
      for t in "${A[@]}"; do
        case "$t" in --pre | --pre=*) rechazar "rg --pre ejecuta un comando." ;; esac
      done ;;
    file)
      for t in "${A[@]}"; do case "$t" in -C | --compile) rechazar "file -C escribe." ;; esac; done ;;
    sort)
      for t in "${A[@]}"; do
        case "$t" in -o* | --output* | -[a-zA-Z]*o*) rechazar "sort $t escribe un archivo." ;; esac
      done ;;
    uniq) [ "$(posicionales)" -le 1 ] || rechazar "uniq con dos archivos escribe el segundo." ;;
    find)
      for t in "${A[@]}"; do
        case "$t" in -exec | -execdir | -ok | -okdir | -delete | -fprint | -fprint0 | -fprintf | -fls)
          rechazar "find $t ejecuta o escribe." ;; esac
      done ;;
    sed) revisar_sed ;;
    gh)
      [ "${A[0]:-}" = run ] && { [ "${A[1]:-}" = list ] || [ "${A[1]:-}" = view ]; } ||
        rechazar "gh sólo como gh run list|view." ;;
    node)
      [[ "${A[0]:-}" =~ ^scripts/piloto/(nivel|cuenta-e2e|saltadas)\.mjs$ ]] ||
        rechazar "node sólo corre scripts/piloto/nivel.mjs, cuenta-e2e.mjs y saltadas.mjs." ;;
    *) rechazar "«$cmd» no está en la lista de lectura." ;;
  esac
}

A=()
while IFS= read -r segmento; do
  revisar_segmento "$segmento"
done < <(printf '%s' "$CMD" | awk "$TOKENIZAR")
exit 0
