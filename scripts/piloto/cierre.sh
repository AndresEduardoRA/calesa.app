#!/usr/bin/env bash
# El cierre de un paso «listo» (se hace `source` desde bucle.sh). El modelo nunca publica: el paso deja commits, sin push, y es el bucle,
# en bash y fuera de toda sesión, el que comprueba, verifica y empuja, en este orden:
#
#   a) el árbol está limpio y cada commit de `ultimo.json` existe en `HEAD de arranque..HEAD` (y no hay otros sin listar);
#   c) compuerta «guardas» si el rango toca las guardas (`scripts/piloto/`, `scripts/guardas/`, `scripts/candado.sh`, `.claude/settings*.json`,
#      `.claude/hooks/`, `.claude/agents/`, `.claude/skills/piloto*`, `lefthook.yml`, `.github/workflows/` o las líneas de los scripts
#      `db:*` y `test:e2e*` de package.json). Aprobada y con `scripts/piloto/` en el rango, la vuelta termina sin verificar ni publicar y
#      pide re-arrancar (`arrancar.sh` vuelve a copiar; la vuelta siguiente verifica y publica con la copia nueva);
#   b) `verificar.sh` DE LA COPIA (lint, typecheck, test, mapa, db:probar, e2e dirigidos): no le cree al «listo» del modelo;
#   d) recién entonces `publicar.sh` DE LA COPIA.
#
# Cualquier falla en a), b) o d) es un aviso: la persona dice «parado» o «reintentar» (reintentar repite el cierre en la vuelta
# siguiente: `en-curso.json` queda en estado «listo»). Se prueba en `bucle.test.ts`. Variables: ESTADO, BIN, RAIZ y `registro`.

GUARDAS='^(scripts/piloto/|scripts/guardas/|scripts/candado\.sh$|\.claude/settings[^/]*\.json$|\.claude/hooks/|\.claude/agents/|\.claude/skills/piloto|lefthook\.yml$|\.github/workflows/)'
SOLO_REINTENTO=('parado — no sigue (recomendado)' 'reintentar — vuelve a verificar y publicar')

ultimo_valido() {
  jq -e '
    type == "object" and (.paso | type == "string") and (.resultado | IN("listo", "compuerta", "falla"))
    and (.resumen | type == "string") and (.commits | type == "array") and (.e2e_dirigidos | type == "array")
    and (if .resultado == "compuerta"
         then (.compuerta | type == "object" and (.tipo | type == "string") and (.pregunta | type == "string")
               and (.opciones | type == "array" and length >= 2))
         else true end)' "$ESTADO/ultimo.json" >/dev/null 2>&1
}

# Los archivos del rango que son guardas, y las líneas db:* y test:e2e* de package.json que cambiaron.
guardas_tocadas() {
  git diff --name-only "$1..HEAD" | grep -E "$GUARDAS"
  git diff -U0 "$1..HEAD" -- package.json | grep -E '^[+-][[:space:]]*"(db:|test:e2e)[^"]*"[[:space:]]*:' | sed 's/^/package.json: /'
  return 0
}

# a) Cada commit de ultimo.json está en el rango, y el rango no tiene otros.
commits_coinciden() {
  local desde="$1" c completo
  local en_rango=() declarados=()
  mapfile -t en_rango < <(git rev-list "$desde..HEAD")
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
    parada "el árbol no quedó limpio tras «listo» ($paso)" "$paso" "${SOLO_REINTENTO[@]}"
    return 0
  fi
  if ! motivo=$(commits_coinciden "$desde"); then
    parada "los commits de ultimo.json no coinciden con el repo: $motivo" "$paso" "${SOLO_REINTENTO[@]}"
    return 0
  fi

  # c)
  if [ "$aprobadas" != true ]; then
    guardas=$(guardas_tocadas "$desde")
    if [ -n "$guardas" ]; then
      mapfile -t CONTEXTO < <(printf '%s\n' "$guardas" | head -n 20 | sed 's/^package.json: .*/package.json/' | sort -u)
      compuerta guardas "$paso" "el paso tocó las guardas: $(printf '%s' "$guardas" | head -n 8 | tr '\n' ' ')" \
        "El paso $paso cambió archivos que protegen al piloto (hooks, settings, scripts del piloto, lefthook, CI, db:* o test:e2e*). ¿Apruebas el cambio?" ||
        { registro "guardas de $paso no aprobadas: no se verifica ni se publica."; exit 0; }
      marcar_en_curso guardas_aprobadas true
      if printf '%s\n' "$guardas" | grep -q '^scripts/piloto/'; then
        compuerta parada "$paso" "los scripts del piloto cambiaron: re-arranca con «bash scripts/piloto/arrancar.sh» (copia la versión nueva)" \
          "El bucle corre una copia de scripts/piloto/. Para verificar y publicar $paso con la copia nueva, re-arranca; la vuelta siguiente lo hace." 'parado — entendido, re-arranco (recomendado)' 'parado — no apruebo el cambio'
        registro "re-arrancar: $paso queda en «listo», sin verificar ni publicar."
        exit 0
      fi
    fi
  fi

  # b)
  if ! bash "$BIN/verificar.sh" "$desde" "$ESTADO/ultimo.json" 2>"$ESTADO/verificar.err"; then
    parada "la verificación del bucle falló en $paso: $(tail -n 3 "$ESTADO/verificar.err" | tr '\n' ' ')" "$paso" "${SOLO_REINTENTO[@]}"
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
