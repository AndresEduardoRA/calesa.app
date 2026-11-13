#!/usr/bin/env bash
# Hook Stop (anillo 2): antes de que Claude dé por terminada una tarea, verifica lo barato que corresponde al estado del árbol. Si algo
# falla, exit 2 devuelve el error a Claude y sigue trabajando. Tope: al tercer intento seguido deja pasar y avisa, para que decida un
# humano. La suite entera, el lint de todo el repo y los e2e no corren aquí: son del hook del commit (lefthook) y del CI del PR, que es
# la autoridad (docs/FLUJO.md). Se prueba en `scripts/guardas/verificar-al-terminar.test.ts`.
#
#   Sale sin verificar:  queda trabajo en segundo plano (`background_tasks` no vacío); la sesión no escribió en este árbol
#                        (`sesion-edito.jq` lee su transcript); o la huella del árbol (HEAD + diff + no rastreados) es la de la última
#                        verificación verde (`scripts/huella.sh`).
#   Árbol sucio:         typecheck + eslint --cache de los cambiados + vitest related + scripts/guardas + mapa (≈ 17–27 s).
#   Árbol limpio:        typecheck + mapa (los commits ya pasaron por lefthook); si pasa, deja la huella verde para no repetirlo.
# Lee `cwd` de la entrada y no `${CLAUDE_PROJECT_DIR}`, que no sigue a un worktree.
set -uo pipefail
ENTRADA=$(cat)
CWD=$(printf '%s' "$ENTRADA" | jq -r '.cwd // empty' 2>/dev/null)
cd "${CWD:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0
RAIZ=$(git rev-parse --show-toplevel 2>/dev/null) && cd "$RAIZ" || exit 0
CONTADOR=".claude/.intentos-stop" # en .gitignore

if printf '%s' "$ENTRADA" | jq -e '(.background_tasks // []) | length > 0' >/dev/null 2>&1; then
  exit 0
fi
# Una sesión que no escribió en este árbol no tiene nada que verificar en él (el árbol sucio es de otra sesión).
# Sin transcript legible o con un jq que falla, se verifica: lo seguro es lo de antes.
TRANSCRIPT=$(printf '%s' "$ENTRADA" | jq -r '.transcript_path // empty' 2>/dev/null)
FILTRO="$(dirname "${BASH_SOURCE[0]}")/sesion-edito.jq"
if [ -n "$TRANSCRIPT" ] && [ -r "$TRANSCRIPT" ] && [ -f "$FILTRO" ]; then
  edito=$(jq -n -f "$FILTRO" --arg raiz "$(pwd -P)" <"$TRANSCRIPT" 2>/dev/null)
  if [ "$edito" = false ]; then rm -f "$CONTADOR"; exit 0; fi
fi
if [ -f scripts/huella.sh ] && bash scripts/huella.sh --igual; then
  rm -f "$CONTADOR"
  exit 0
fi

if printf '%s' "$ENTRADA" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  n=$(($(cat "$CONTADOR" 2>/dev/null || echo 0) + 1))
else
  n=1
fi
mkdir -p .claude
echo "$n" >"$CONTADOR"

# Los .ts/.tsx/.mts/.mjs que cambiaron (rastreados y nuevos) y siguen existiendo.
cambiados() {
  { git diff --name-only HEAD; git ls-files --others --exclude-standard; } 2>/dev/null |
    grep -E '\.(ts|tsx|mts|mjs)$' | sort -u | while read -r f; do [ -f "$f" ] && echo "$f"; done
}

sucio() {
  local archivos
  mapfile -t archivos < <(cambiados)
  bash scripts/mapa.sh >/dev/null 2>&1 || true
  pnpm typecheck || return 1
  if [ "${#archivos[@]}" -gt 0 ]; then
    npx eslint --cache --max-warnings 0 --no-warn-ignored "${archivos[@]}" || return 1
    npx vitest related --run "${archivos[@]}" || return 1
  fi
  npx vitest run scripts/guardas || return 1
  bash scripts/mapa.sh --check
}

limpio() {
  bash scripts/mapa.sh >/dev/null 2>&1 || true
  pnpm typecheck && bash scripts/mapa.sh --check
}

if [ -n "$(git status --porcelain)" ]; then
  salida=$(sucio 2>&1)
  verde=$?
  modo=sucio
else
  salida=$(limpio 2>&1)
  verde=$?
  modo=limpio
fi

if [ "$verde" -eq 0 ]; then
  rm -f "$CONTADOR"
  # Sólo el árbol limpio deja la huella: con cambios sin commitear, el Stop siguiente vuelve a mirar lo que cambie.
  [ "$modo" = limpio ] && [ -f scripts/huella.sh ] && bash scripts/huella.sh --escribir
  exit 0
fi

if [ "$n" -ge 3 ]; then
  rm -f "$CONTADOR"
  printf '{"systemMessage": "Las verificaciones siguen fallando tras 2 intentos de corrección. Revisa la salida de typecheck/lint/test antes de seguir."}\n'
  exit 0
fi

echo "La tarea no está terminada: estas verificaciones fallan (árbol $modo). Corrígelas antes de parar." >&2
echo "$salida" | tail -n 40 >&2
# `pnpm test` y `vitest` guardan solos su salida completa y su JSON (vitest.config.mts): se dice dónde, para no depender de estas 40 líneas.
ultima=$(ls -dt test-salidas/20*/ 2>/dev/null | head -n 1)
[ -n "$ultima" ] && echo "Salida completa de la última corrida de pruebas: ${ultima}salida.txt (y resultado.json)." >&2
exit 2
