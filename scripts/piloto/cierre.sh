#!/usr/bin/env bash
# El cierre de un paso «listo» (se hace `source` desde bucle.sh). El modelo nunca publica: el paso deja commits, sin push, y es el bucle,
# en bash y fuera de toda sesión, el que comprueba, verifica y empuja, en este orden:
#
#   a) el árbol está limpio (un paso sin commits ni cambios se cierra sin más) y cada commit de `ultimo.json` existe en `HEAD de arranque..HEAD` (y no hay otros sin listar);
#   c) compuerta «guardas» si el rango toca las guardas (`scripts/piloto/`, `scripts/guardas/`, `scripts/candado.sh`, `.claude/settings*.json`,
#      `.claude/hooks/`, `.claude/agents/`, `.claude/skills/piloto*`, `lefthook.yml`, `.github/workflows/` o las líneas de los scripts
#      `db:*` y `test:e2e*` de package.json). Aprobada, sigue: la copia del bucle sale de origin/main (copiar-bin.sh), así que lo que el
#      paso cambió en `scripts/piloto/` rige cuando se integre, y el bucle se relanza solo con esa versión (bucle.sh › copia_al_dia);
#   b) `verificar.sh` DE LA COPIA (lint, typecheck, test, mapa, db:probar, e2e dirigidos): no le cree al «listo» del modelo;
#   d) recién entonces `publicar.sh` DE LA COPIA.
#
# Cualquier falla en a), b) o d) es un aviso: la persona dice «parado» o «reintentar» (reintentar repite el cierre en la vuelta
# siguiente: `en-curso.json` queda en estado «listo»). Se prueba en `bucle.test.ts`. Variables: ESTADO, BIN, RAIZ y `registro`.

GUARDAS='^(scripts/piloto/|scripts/guardas/|scripts/candado\.sh$|\.claude/settings[^/]*\.json$|\.claude/hooks/|\.claude/agents/|\.claude/skills/piloto|lefthook\.yml$|\.github/workflows/)'
SOLO_REINTENTO=('parado — no sigue (recomendado)' 'reintentar — vuelve a verificar y publicar')

# Los commits propios del paso: los de `desde..HEAD` que no son mezclas ni están ya en origin/main. Traer main a la rama (el bucle lo hace al
# retomar un paso partido o tras esperar a main) dejaba el rango con 54 o 165 commits ajenos y el cierre no coincidía (5 al 7-11-2026).
rango_propio() { # <desde>
  if git rev-parse --verify --quiet origin/main >/dev/null; then
    git rev-list --no-merges "$1..HEAD" --not origin/main
  else
    git rev-list --no-merges "$1..HEAD"
  fi
}

ultimo_valido() {
  jq -e '
    type == "object" and (.paso | type == "string") and (.resultado | IN("listo", "compuerta", "falla"))
    and (.resumen | type == "string") and (.commits | type == "array") and (.e2e_dirigidos | type == "array")
    and (if .resultado == "compuerta"
         then (.compuerta | type == "object" and (.tipo | type == "string")
               and (if .tipo == "producto"
                    then (.preguntas | type == "array" and length >= 1 and length <= 12
                          and all(.[]; type == "object" and (.id | type == "string" and length >= 1 and length <= 12)
                                  and (.pregunta | type == "string")
                                  and (.opciones | type == "array" and length >= 2 and length <= 4))
                          and (map(.id) | unique | length) == length)
                    elif .tipo == "espera" then (.pedido | type == "string" and length > 0)
                    else (.pregunta | type == "string") and (.opciones | type == "array" and length >= 2) end))
         else true end)' "$ESTADO/ultimo.json" >/dev/null 2>&1
}

# Los archivos que los commits propios del paso tocan y son guardas, y las líneas db:* y test:e2e* de package.json que cambiaron. Lo que vino
# de main ya pasó su compuerta y su CI: no se vuelve a preguntar (antes un merge de main con el PR 44 pedía «guardas» y re-arrancar).
guardas_tocadas() {
  local propios=()
  mapfile -t propios < <(rango_propio "$1")
  [ "${#propios[@]}" -gt 0 ] || return 0
  git show --name-only --format= "${propios[@]}" | sort -u | grep -E "$GUARDAS"
  git show -U0 --format= "${propios[@]}" -- package.json | grep -E '^[+-][[:space:]]*"(db:|test:e2e)[^"]*"[[:space:]]*:' | sed 's/^/package.json: /' | sort -u
  return 0
}

# a) Cada commit de ultimo.json está en el rango, y el rango no tiene otros.
commits_coinciden() {
  local desde="$1" c completo
  local en_rango=() declarados=()
  mapfile -t en_rango < <(rango_propio "$desde")
  mapfile -t declarados < <(jq -r '.commits[]' "$ESTADO/ultimo.json")
  [ "${#en_rango[@]}" -gt 0 ] || { echo "listo sin commits en $desde..HEAD"; return 1; }
  [ "${#declarados[@]}" -eq "${#en_rango[@]}" ] || { echo "ultimo.json lista ${#declarados[@]} commits y el rango tiene ${#en_rango[@]}"; return 1; }
  for c in "${declarados[@]}"; do
    completo=$(git rev-parse --verify --quiet "$c^{commit}") || { echo "el commit $c no existe"; return 1; }
    printf '%s\n' "${en_rango[@]}" | grep -qx "$completo" || { echo "el commit $c no está en $desde..HEAD"; return 1; }
  done
  [ "$(printf '%s\n' "${declarados[@]}" | sort -u | wc -l)" -eq "${#declarados[@]}" ] || { echo "ultimo.json repite un commit"; return 1; }
  return 0
}

marcar_en_curso() {
  local campo="$1" valor="$2"
  jq -c --arg c "$campo" --argjson v "$valor" '.[$c] = $v' "$ESTADO/en-curso.json" >"$ESTADO/en-curso.json.tmp" && mv -f "$ESTADO/en-curso.json.tmp" "$ESTADO/en-curso.json"
}

# El cierre ya no depende del modelo ni de su sesión: se anota que está en «listo» por si hay que re-arrancar.
cerrar_listo() {
  local paso="$1" desde="$2" aprobadas="${3:-false}" motivo guardas
  marcar_en_curso estado '"listo"'

  # a)
  if ! [ -z "$(git status --porcelain)" ]; then
    PARADA_HUMANA=1 parada "el árbol no quedó limpio tras «listo» ($paso)" "$paso" "${SOLO_REINTENTO[@]}"
    return 0
  fi
  # Un paso que no cambió nada (un arreglo de CI que ya estaba hecho, una decisión sin código): ultimo.json no lista commits y el rango
  # está vacío. No hay nada que verificar ni publicar: se cierra sin avisar. Con commits en el rango que ultimo.json no lista, sigue el aviso.
  if [ -z "$(rango_propio "$desde")" ] && [ "$(jq '.commits | length' "$ESTADO/ultimo.json")" -eq 0 ]; then
    registro "$paso listo sin cambios: no hay commits que verificar ni publicar."
    rm -f "$ESTADO/en-curso.json"
    echo 0 >"$ESTADO/fallas"
    return 0
  fi
  if ! motivo=$(commits_coinciden "$desde"); then
    if ! { reparar_commits "$desde" && motivo=$(commits_coinciden "$desde"); }; then
      parada "los commits de ultimo.json no coinciden con el repo: $motivo" "$paso" "${SOLO_REINTENTO[@]}"
      return 0
    fi
  fi

  # c)
  if [ "$aprobadas" != true ]; then
    guardas=$(guardas_tocadas "$desde")
    if [ -n "$guardas" ]; then
      mapfile -t CONTEXTO < <(printf '%s\n' "$guardas" | head -n 20 | sed 's/^package.json: .*/package.json/' | sort -u)
      # El diff completo de lo que tocó, guardado: si la compuerta se contesta sola, la persona lo revisa después.
      GUARDAS_DIFF="$ESTADO/guardas/$(sanear "$paso").diff"
      mkdir -p "$ESTADO/guardas"
      # shellcheck disable=SC2046
      git diff "$desde" HEAD -- $(printf '%s\n' "$guardas" | sed 's/:.*//' | sort -u | tr '\n' ' ') >"$GUARDAS_DIFF" 2>/dev/null
      compuerta guardas "$paso" "el paso tocó las guardas: $(printf '%s' "$guardas" | head -n 8 | tr '\n' ' ')" \
        "El paso $paso cambió archivos que protegen al piloto (hooks, settings, scripts del piloto, lefthook, CI, db:* o test:e2e*). ¿Apruebas el cambio?" ||
        { registro "guardas de $paso no aprobadas: no se verifica ni se publica."; exit 0; }
      marcar_en_curso guardas_aprobadas true
    fi
  fi

  # b) La última línea de verificar es su causa («verificar: <nombre> falló: …»); las de antes son la cola del log y su pie.
  if ! bash "$BIN/verificar.sh" "$desde" "$ESTADO/ultimo.json" 2>"$ESTADO/verificar.err"; then
    parada "la verificación del bucle falló en $paso: $(tail -n 1 "$ESTADO/verificar.err" | tr '\n' ' ')" "$paso" "${SOLO_REINTENTO[@]}"
    return 0
  fi

  # d)
  if ! bash "$BIN/publicar.sh" "$paso" "$desde" 2>"$ESTADO/publicar.err"; then
    parada "no se pudo publicar $paso: $(tail -n 3 "$ESTADO/publicar.err" | tr '\n' ' ')" "$paso" "${SOLO_REINTENTO[@]}"
    return 0
  fi
  registro "publicado $paso ($(git rev-parse --short HEAD))."
  rm -f "$ESTADO/en-curso.json"
  echo 0 >"$ESTADO/fallas"
  return 0
}
