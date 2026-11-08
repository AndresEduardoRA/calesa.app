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
    esperar) return 10 ;;
    terminado) return 11 ;;
    paso) ;;
    *) registro "el coordinador respondió algo ilegible: ${r:0:200}"; return 1 ;;
  esac
  paso=$(jq -r .paso <<<"$r") rama=$(jq -r .rama <<<"$r")
  git fetch --quiet origin main 8>&- || return 1
  if [ "$(git symbolic-ref --short HEAD 2>/dev/null)" != "$rama" ]; then
    # Un paso nuevo parte de lo último integrado; uno que se retoma (`retomar`) sigue en su rama si tiene commits propios. Una rama local
    # sin nada propio es una vieja (b/4.21 nació un día antes, 160 commits atrás de main): se rehace desde origin/main.
    if [ "$(jq -r '.retomar // false' <<<"$r")" = true ] && git show-ref --verify --quiet "refs/heads/$rama" &&
      [ -n "$(git rev-list -n 1 "origin/main..$rama" 2>/dev/null)" ]; then
      git checkout --quiet "$rama" 8>&- || return 1
    else
      git checkout --quiet -B "$rama" origin/main 8>&- || return 1
    fi
  fi
  traer_main "$rama" || return 1
  # Otro carril empezó con la rama de otro paso: lo de antes (CI rojos de esa rama, sus intentos de ci-fix) no es de éste. Un PR rojo
  # de un paso publicado lo devuelve el coordinador (`arreglar`), no ci-rojos.md.
  if [ "$(jq -r '.paso // empty' "$ESTADO/asignado-anterior.json" 2>/dev/null)" != "$paso" ]; then
    rm -f "$ESTADO/ci-rojos.md" "$ESTADO/ci-fix-intentos" "$ESTADO/ci-fix-head"
  fi
  printf '%s\n' "$r" >"$ESTADO/asignado.json"
  cp -f "$ESTADO/asignado.json" "$ESTADO/asignado-anterior.json"
  registro "carril $PILOTO_CARRIL: el coordinador asignó $paso en $rama."
  return 0
}

# traer_main <rama>: la rama del carril al día con origin/main antes de empezar una parte (nunca a mitad de un paso: lo llama
# carril_asignar, sin en-curso.json, con el árbol limpio). Así cada parte corre con las skills, los agentes y las guardas de main (el
# 2026-11-07 las tres ramas iban sin el PR 49 y el planificador seguía en opus) y el PR no queda en conflicto. Sin commits propios, la
# rama pasa a ser origin/main; con commits, `git merge` (nunca rebase con push forzado: docs/ORCA.md). Un choque sólo en `docs/*.md` se
# resuelve uniendo las dos versiones; uno en código se aborta y queda en `.piloto/conflicto-con-main.md`, que la sesión del paso resuelve
# antes que nada (skill piloto, «Orientarte»). Antes se abortaba y nadie lo resolvía: el PR 69 (4.19-3b) quedó en conflicto por dos
# líneas de docs/RENDIMIENTO.md, y el coordinador no devuelve las partes.
traer_main() {
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
        git merge-file --union -p "$tmp/nuestro" "$tmp/base" "$tmp/suyo" >"$f" 2>/dev/null
        git add -- "$f" || quedan=1
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
