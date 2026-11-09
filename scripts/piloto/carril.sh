#!/usr/bin/env bash
# El piloto de un carril (se hace `source` desde bucle.sh; no se corre solo). Con `PILOTO_CARRIL=<id>` el bucle ya no elige el paso por sí
# mismo: se lo pide al coordinador (`scripts/coordinador/coordinador.mjs siguiente <carril>`, que reparte los pasos de `docs/plan.yaml`
# cuando sus dependencias están integradas en main), trabaja cada paso en su rama `<carril>/<paso>` cortada de origin/main y lo publica
# por su propio PR (`publicar.sh`); el coordinador integra los PR verdes. Sin `PILOTO_CARRIL` nada de esto corre (el carril A de siempre).
#   carril_asignar   0 hay un paso asignado (en `.piloto/asignado.json`, con su rama ya sacada) · 10 esperar · 11 terminado · 1 error
# Variables: RAIZ, ESTADO, PILOTO_CARRIL, PILOTO_COORDINADOR (coordinador.mjs), PILOTO_ESPERA_S y la función `registro`.

modo_carril() { [ -n "${PILOTO_CARRIL:-}" ]; }

# Lo que corre el bucle por fuera no hereda el fd 8 (el candado de .piloto/bucle.lock): un `git gc --auto` desprendido de un fetch o un merge se
# quedaba con él y el bucle relanzado (copia_al_dia) no podía tomarlo.
coordinador() { node "${PILOTO_COORDINADOR:-$RAIZ/scripts/coordinador/coordinador.mjs}" "$@" 8>&-; }

carril_asignar() {
  local r accion paso rama actual
  # Antes de pedir el paso, la rama de ahora trae main: el coordinador y el plan se leen del árbol del carril, y uno atrasado no podía
  # pedir paso con el plan de main (el A, con un plan.yaml que el validador de antes rechazaba, 2026-11-07).
  actual=$(git symbolic-ref --short HEAD 2>/dev/null)
  if [ -n "$actual" ] && [ "$actual" != main ] && [ -z "$(git status --porcelain)" ] && git fetch --quiet origin main 8>&-; then
    traer_main "$actual" || return 1
  fi
  r=$(coordinador siguiente "$PILOTO_CARRIL" 2>"$ESTADO/coordinador.err") || {
    registro "el coordinador falló: $(tail -n 1 "$ESTADO/coordinador.err")"
    return 1
  }
  accion=$(jq -r '.accion // empty' <<<"$r" 2>/dev/null)
  case "$accion" in
    esperar) ESPERA_MOTIVO=$(jq -r '.motivo // empty' <<<"$r" 2>/dev/null); return 10 ;;
    terminado) return 11 ;;
    paso) ;;
    *) registro "el coordinador respondió algo ilegible: ${r:0:200}"; return 1 ;;
  esac
  paso=$(jq -r .paso <<<"$r") rama=$(jq -r .rama <<<"$r")
  git fetch --quiet origin main 8>&- || return 1
  local retomar remoto=""
  retomar=$(jq -r '.retomar // false' <<<"$r")
  # La rama del PR puede haber avanzado sin este carril: la remendó otro carril, o es un arreglo prestado de otro (`b/4.26` en el C).
  [ "$retomar" = true ] && git fetch --quiet origin "$rama" 8>&- 2>/dev/null &&
    git show-ref --verify --quiet "refs/remotes/origin/$rama" && remoto="origin/$rama"
  if [ "$(git symbolic-ref --short HEAD 2>/dev/null)" != "$rama" ]; then
    # Un paso nuevo parte de lo último integrado; uno que se retoma (`retomar`) sigue en su rama si tiene commits propios, o en la de su
    # PR. Una rama local sin nada propio es una vieja (b/4.21 nació un día antes, 160 commits atrás de main): se rehace desde origin/main.
    if [ "$retomar" = true ] && git show-ref --verify --quiet "refs/heads/$rama" &&
      [ -n "$(git rev-list -n 1 "origin/main..$rama" 2>/dev/null)" ]; then
      git checkout --quiet "$rama" 8>&- || return 1
    elif [ -n "$remoto" ]; then
      git checkout --quiet -B "$rama" "$remoto" 8>&- || return 1
    else
      git checkout --quiet -B "$rama" origin/main 8>&- || return 1
    fi
  fi
  ALINEAR_CHOCA=0
  [ -n "$remoto" ] && { alinear_con_remoto "$rama" "$remoto" || return 1; }
  # Con la rama separada de su PR, traer main borraría la nota del choque: primero lo resuelve la sesión.
  [ "$ALINEAR_CHOCA" = 1 ] || traer_main "$rama" || return 1
  # Otro carril empezó con la rama de otro paso: lo de antes (CI rojos de esa rama, sus intentos de ci-fix) no es de éste. Un PR rojo
  # de un paso publicado lo devuelve el coordinador (`arreglar`), no ci-rojos.md.
  if [ "$(jq -r '.paso // empty' "$ESTADO/asignado-anterior.json" 2>/dev/null)" != "$paso" ]; then
    rm -f "$ESTADO/ci-rojos.md" "$ESTADO/ci-fix-intentos" "$ESTADO/ci-fix-head"
  fi
  printf '%s\n' "$r" >"$ESTADO/asignado.json"
  cp -f "$ESTADO/asignado.json" "$ESTADO/asignado-anterior.json"
  registro "carril $PILOTO_CARRIL: el coordinador asignó $paso en $rama."
  remendar_sin_sesion "$paso" "$rama" "$(jq -r '.arreglar // empty' <<<"$r")" "$remoto" && return 12
  return 0
}

# remendar_sin_sesion <paso> <rama> <arreglar> <origin/rama o vacío>: un PR devuelto que traer_main ya dejó listo se publica sin gastar una
# sesión: en conflicto, si main entró sin choques de código; en rojo, sólo si se renumeraron migraciones (la guarda de orden; otro rojo
# es un arreglo de verdad). 0 si se publicó. El 2026-11-08, 19 conflictos y la migración del 4.22 costaron una sesión y un CI cada uno.
remendar_sin_sesion() {
  local paso="$1" rama="$2" arreglar="$3" remoto="$4"
  [ -n "$arreglar" ] && [ -n "$remoto" ] && [ ! -f "$ESTADO/conflicto-con-main.md" ] && [ "${UNION_DUDOSA:-0}" = 0 ] || return 1
  [ "$(git rev-parse HEAD)" != "$(git rev-parse "$remoto")" ] || return 1
  case "$arreglar" in
    "conflicto con main") ;;
    # Renumeradas ahora o en una vuelta anterior sin publicar (traer_main corre también antes de pedir el paso): renombres sin publicar.
    "CI en rojo" | "migración anterior a la última de main")
      [ "${RENUMERADAS:-0}" = 1 ] ||
        [ -n "$(git diff --name-only -M --diff-filter=R "$remoto" HEAD -- supabase/migrations/)" ] || return 1
      ;;
    *) return 1 ;;
  esac
  # El rango para la regla del SQL de seguridad es vacío: lo que entró es main (ya integrado) y una migración renombrada sin cambios.
  if PILOTO_PARCIAL=false bash "$(dirname "${BASH_SOURCE[0]}")/publicar.sh" "$paso" "$(git rev-parse HEAD)" \
    >"$ESTADO/remendar.log" 2>&1 8>&-; then
    registro "carril ${PILOTO_CARRIL:-}: $paso remendado sin sesión ($arreglar): traje main y lo publiqué en $rama."
    return 0
  fi
  registro "carril ${PILOTO_CARRIL:-}: no pude publicar el remiendo de $paso ($(tail -n 1 "$ESTADO/remendar.log")); sigue la sesión."
  return 1
}

# alinear_con_remoto <rama> <origin/rama>: la rama local trae lo que su PR tiene y ella no (si no, publicar se negaría por divergencia).
# Detrás: avanza; desviada: merge; un choque se aborta y queda para la sesión, como uno con main.
alinear_con_remoto() {
  local rama="$1" remoto="$2"
  ALINEAR_CHOCA=0
  git merge-base --is-ancestor "$remoto" HEAD && return 0
  if git merge-base --is-ancestor HEAD "$remoto"; then
    git merge --quiet --ff-only "$remoto" 8>&- >/dev/null 2>&1 || return 1
    registro "carril ${PILOTO_CARRIL:-}: $rama avanzó hasta $remoto ($(git rev-parse --short HEAD))."
    return 0
  fi
  if git merge --quiet --no-edit "$remoto" >"$ESTADO/traer-main.log" 2>&1 8>&-; then
    registro "carril ${PILOTO_CARRIL:-}: uní $remoto a $rama."
    return 0
  fi
  git merge --abort >/dev/null 2>&1
  ALINEAR_CHOCA=1
  {
    echo "# La rama $rama se separó de $remoto"
    echo
    echo "Antes que nada: \`git merge $remoto\`, resuelve los choques (lo de las dos ramas es del mismo paso) y sigue."
  } >"$ESTADO/conflicto-con-main.md"
  registro "carril ${PILOTO_CARRIL:-}: $rama choca con $remoto; lo resuelve la sesión (.piloto/conflicto-con-main.md)."
  return 0
}

# traer_main <rama>: la rama del carril al día con origin/main antes de empezar una parte (nunca a mitad de un paso: lo llama
# carril_asignar, sin en-curso.json, con el árbol limpio). Así cada parte corre con las skills, los agentes y las guardas de main (el
# 2026-11-07 las tres ramas iban sin el PR 49 y el planificador seguía en opus) y el PR no queda en conflicto. Sin commits propios, la
# rama pasa a ser origin/main; con commits, `git merge` (nunca rebase con push forzado: docs/ORCA.md). Un choque sólo en `docs/*.md` se
# resuelve uniendo las dos versiones; uno en código se aborta y queda en `.piloto/conflicto-con-main.md`, que la sesión del paso resuelve
# antes que nada (skill piloto, «Orientarte»). Antes se abortaba y nadie lo resolvía: el PR 69 (4.19-3b) quedó en conflicto por dos
# líneas de docs/RENDIMIENTO.md, y el coordinador no devuelve las partes.
#
# Después, si main quedó sin choques, `renumerar_migraciones` (RENUMERADAS=1 si renumeró).
traer_main() {
  RENUMERADAS=0 UNION_DUDOSA=0 REGENERAR_TIPOS=0
  traer_main_merge "$@" || return 1
  [ -f "$ESTADO/conflicto-con-main.md" ] || renumerar_migraciones
  [ "$REGENERAR_TIPOS" = 1 ] && [ ! -f "$ESTADO/conflicto-con-main.md" ] && regenerar_tipos
  return 0
}

# Lo generado no se une a mano. `src/shared/types/database.types.ts` lo escribe `pnpm db:types` y cada paso con migración lo regenera:
# con tres carriles creando tablas y RPC a la vez (33 pasos con migración en las fases 5 a 9), dos ramas chocan ahí aunque sus migraciones
# no se toquen, y cada choque era una sesión. En el merge se toma el de main (unir_docs) y, con las migraciones de las dos ya juntas, se
# regenera contra la base del carril: PILOTO_CMD_TIPOS (por omisión `pnpm db:reset` y `pnpm db:types`, con el candado de su pila; aquí no
# hay un paso en curso). Si no sale (la base no levanta, el commit no pasa sus hooks), queda para la sesión: no se publica sin ella.
ARCHIVO_DE_TIPOS=src/shared/types/database.types.ts
regenerar_tipos() {
  local cmd="${PILOTO_CMD_TIPOS:-CANDADO_ESPERA=900 pnpm db:reset && CANDADO_ESPERA=900 pnpm db:types}"
  if ! timeout "${PILOTO_TIPOS_MAX:-2400}" bash -c "$cmd" >>"$ESTADO/traer-main.log" 2>&1 8>&-; then
    git restore --quiet --worktree -- "$ARCHIVO_DE_TIPOS" 2>/dev/null
    UNION_DUDOSA=1
    tipos_para_la_sesion
    registro "carril ${PILOTO_CARRIL:-}: no pude regenerar los tipos de la base tras traer main; lo hace la sesión (pnpm db:reset y db:types)."
    return 0
  fi
  if [ -z "$(git status --porcelain -- "$ARCHIVO_DE_TIPOS")" ]; then
    registro "carril ${PILOTO_CARRIL:-}: regeneré los tipos de la base tras traer main: quedaron como los de main."
    return 0
  fi
  if git add -- "$ARCHIVO_DE_TIPOS" && git commit --quiet -m "chore(db): regenerar los tipos tras traer main" >>"$ESTADO/traer-main.log" 2>&1 8>&-; then
    registro "carril ${PILOTO_CARRIL:-}: regeneré los tipos de la base tras traer main (chocaban en $ARCHIVO_DE_TIPOS)."
  else
    git restore --quiet --staged --worktree -- "$ARCHIVO_DE_TIPOS" 2>/dev/null
    UNION_DUDOSA=1
    tipos_para_la_sesion
    registro "carril ${PILOTO_CARRIL:-}: regeneré los tipos pero el commit no pasó sus hooks; lo hace la sesión."
  fi
  return 0
}
# Lo que el bucle no pudo, dicho donde la sesión del paso lo lee antes que nada (skill piloto, «Orientarte»): main ya está unido, pero
# el archivo de tipos quedó como el de main, sin lo de esta rama. Sin la nota, el paso seguía y publicaba con tipos viejos.
tipos_para_la_sesion() {
  {
    echo "# Falta regenerar los tipos de la base"
    echo
    echo "\`origin/main\` ya está unido a tu rama, pero las dos tocaban \`$ARCHIVO_DE_TIPOS\` (generado) y quedó el de main. Antes que"
    echo "nada: \`pnpm db:reset\` y \`pnpm db:types\` (con el candado), revisa que el diff sólo sume lo de tus migraciones y commitea"
    echo "\`chore(db): regenerar los tipos tras traer main\`. Ese commit sí va en \`commits\` de ultimo.json."
  } >"$ESTADO/conflicto-con-main.md"
}

# renumerar_migraciones: las migraciones que la rama agrega llevan una versión posterior a la última de origin/main (lo exige la guarda de
# carriles, docs/ORCA.md › «Migraciones»). Si una quedó atrás (otro carril integró una más nueva), se renombran TODAS las de la rama, en su
# orden, a versiones nuevas: el mismo contenido, otra versión, y la versión vieja reemplazada en los archivos que la rama cambió. Es lo
# que la sesión hacía a mano con `supabase migration new` (el 4.22 volvió en rojo por eso, 2026-11-08). Un commit que no pasa sus hooks se
# deshace y queda para la sesión.
renumerar_migraciones() {
  local tope propias f v nuevo seg ahora pares=() par otros
  tope=$(git ls-tree --name-only origin/main supabase/migrations/ 2>/dev/null |
    sed -n 's#^supabase/migrations/\([0-9]\{14\}\)_.*\.sql$#\1#p' | sort | tail -n 1)
  [ -n "$tope" ] || return 0
  propias=$(git diff --name-only --diff-filter=A origin/main HEAD -- supabase/migrations/ | grep -E '/[0-9]{14}_[^/]*\.sql$' | sort)
  [ -n "$propias" ] || return 0
  [ "$(basename "$(head -n 1 <<<"$propias")" | cut -c1-14)" -le "$tope" ] || return 0
  seg=$(date -u -d "${tope:0:8} ${tope:8:2}:${tope:10:2}:${tope:12:2}" +%s) || return 0
  ahora=$(date -u +%s)
  [ "$ahora" -gt "$seg" ] && seg=$((ahora - 1))
  while IFS= read -r f; do
    v=$(basename "$f" | cut -c1-14)
    seg=$((seg + 1))
    nuevo=$(date -u -d "@$seg" +%Y%m%d%H%M%S)
    git mv "$f" "supabase/migrations/$nuevo${f#supabase/migrations/"$v"}" || { git reset --quiet --hard HEAD; return 0; }
    pares+=("$v:$nuevo")
  done <<<"$propias"
  otros=$(git diff --name-only origin/main -- . ':(exclude)supabase/migrations/')
  for par in "${pares[@]}"; do
    while IFS= read -r f; do
      [ -f "$f" ] && grep -q "${par%%:*}" "$f" && sed -i "s/${par%%:*}/${par##*:}/g" "$f" && git add -- "$f"
    done <<<"$otros"
  done
  bash scripts/mapa.sh >/dev/null 2>&1
  if git commit --quiet -m "fix(db): renumerar las migraciones que main dejó atrás" >>"$ESTADO/traer-main.log" 2>&1 8>&-; then
    RENUMERADAS=1
    registro "carril ${PILOTO_CARRIL:-}: renumeré las migraciones de la rama tras main (${pares[*]})."
  else
    git reset --quiet --hard HEAD
    registro "carril ${PILOTO_CARRIL:-}: no pude renumerar las migraciones (${pares[*]}): el commit no pasó sus hooks; lo hace la sesión."
  fi
  return 0
}

traer_main_merge() {
  local rama="$1" corto chocan
  git merge-base --is-ancestor origin/main HEAD 2>/dev/null && { rm -f "$ESTADO/conflicto-con-main.md"; return 0; }
  if [ -z "$(git rev-list -n 1 origin/main..HEAD)" ]; then
    git checkout --quiet -B "$rama" origin/main 8>&- || return 1
    rm -f "$ESTADO/conflicto-con-main.md"
    return 0
  fi
  corto=$(git rev-parse --short origin/main)
  if git merge --quiet --no-edit origin/main >"$ESTADO/traer-main.log" 2>&1 8>&-; then
    registro "carril ${PILOTO_CARRIL:-}: traje origin/main a $rama ($corto)."
    rm -f "$ESTADO/conflicto-con-main.md"
    return 0
  fi
  chocan=$(git diff --name-only --diff-filter=U | tr '\n' ' ')
  if [ -n "$chocan" ] && unir_docs && git commit --quiet --no-edit >>"$ESTADO/traer-main.log" 2>&1 8>&-; then
    registro "carril ${PILOTO_CARRIL:-}: traje origin/main a $rama ($corto); los choques en docs/ se unieron (${chocan% })."
    rm -f "$ESTADO/conflicto-con-main.md"
    return 0
  fi
  chocan=$(git diff --name-only --diff-filter=U | tr '\n' ' ')
  git merge --abort >/dev/null 2>&1
  {
    echo "# La rama $rama choca con origin/main ($corto)"
    echo
    echo "Antes que nada: \`git merge origin/main\`, resuelve estos choques (lo de main manda en lo que tu paso no cambió; en lo tuyo, junta las"
    echo "dos intenciones), commit de merge con el mensaje por omisión, y sigue con el paso. El merge no va en \`commits\` de ultimo.json."
    echo
    for f in $chocan; do echo "- \`$f\`"; done
  } >"$ESTADO/conflicto-con-main.md"
  registro "carril ${PILOTO_CARRIL:-}: no pude traer origin/main a $rama (choca: ${chocan% }); lo resuelve la sesión del paso al empezar (.piloto/conflicto-con-main.md)."
  return 0
}

# unir_docs: en un merge a medias, cada choque de `docs/*.md` se resuelve con las líneas de los dos lados (git merge-file --union): son
# notas que los carriles agregan, y la sesión las ordena en su commit de docs. 0 si no queda ningún choque (también en código).
unir_docs() {
  local f quedan=0 tmp
  tmp=$(mktemp -d)
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      docs/*.md)
        git show ":2:$f" >"$tmp/nuestro" 2>/dev/null || { quedan=1; continue; }
        git show ":3:$f" >"$tmp/suyo" 2>/dev/null || { quedan=1; continue; }
        git show ":1:$f" >"$tmp/base" 2>/dev/null || : >"$tmp/base"
        # Dudosa si en algún choque los dos lados cambiaron líneas que ya existían (la unión las deja dos veces: las filas de
        # docs/UX.md en el 4.26); si sólo agregaron, la unión es la respuesta. Una dudosa no se publica sin sesión.
        # (merge-file sale con el número de choques: con pipefail, sin el `|| :` la tubería fallaba aunque awk acertara.)
        { git merge-file --diff3 -p "$tmp/nuestro" "$tmp/base" "$tmp/suyo" 2>/dev/null || :; } |
          awk '/^\|\|\|\|\|\|\|/{b=1;n=0;next} /^=======/{if(b&&n)d=1;b=0;next} b{n++} END{exit !d}' && UNION_DUDOSA=1
        git merge-file --union -p "$tmp/nuestro" "$tmp/base" "$tmp/suyo" >"$f" 2>/dev/null
        git add -- "$f" || quedan=1
        ;;
      "$ARCHIVO_DE_TIPOS")
        # Generado: el de main ahora, y se regenera con el merge hecho (regenerar_tipos).
        if git show ":3:$f" >"$f" 2>/dev/null && git add -- "$f"; then REGENERAR_TIPOS=1; else quedan=1; fi
        ;;
      *) quedan=1 ;;
    esac
  done < <(git diff --name-only --diff-filter=U)
  rm -rf "$tmp"
  return "$quedan"
}

# carril_publicado <paso> <pr> [parcial]: el PR del paso quedó abierto; el paso deja de estar asignado. Con `parcial` en true (el paso se
# partió y este PR trae sólo una parte: `ultimo.json` › `parcial`), el paso sigue asignado y el carril retoma su rama en la vuelta
# siguiente: integrar ese PR no lo da por terminado (el 4.20 y el 4.24 se marcaban integrados con su primera parte, 2026-11-06).
carril_publicado() {
  # El coordinador conoce el paso entero (4.24); el ruteo puede haber elegido una de sus partes (4.24-3): se anota el asignado. Sin esto,
  # la última parte de un paso partido no quedaba publicada nunca y su carril se quedaba sin paso (`no está en el plan`, 2026-11-06).
  local id="$1" asignado=""
  [ -f "$ESTADO/asignado.json" ] && asignado=$(jq -r '.paso // empty' "$ESTADO/asignado.json" 2>/dev/null)
  [ -n "$asignado" ] && [[ "$id" == "$asignado"-* ]] && id="$asignado"
  if [ "${3:-false}" = true ]; then
    # La parte va en `pr_parcial`: el coordinador la integra con su CI en verde aunque el paso siga asignado (antes lo hacía un script
    # fuera del repo, y sin él las partes se quedaban sin integrar).
    coordinador parcial "$id" "$2" >/dev/null 2>"$ESTADO/coordinador.err" ||
      registro "el coordinador no anotó la parte #$2 de $id: $(tail -n 1 "$ESTADO/coordinador.err")"
    registro "carril ${PILOTO_CARRIL:-}: $1 publicado en parte (#$2): sigue asignado."
    rm -f "$ESTADO/asignado.json"
    return 0
  fi
  coordinador publicado "$id" "$2" >/dev/null 2>"$ESTADO/coordinador.err" || registro "el coordinador no anotó $id como publicado: $(tail -n 1 "$ESTADO/coordinador.err")"
  rm -f "$ESTADO/asignado.json"
}
