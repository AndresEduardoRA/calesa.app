#!/usr/bin/env bash
# Hook Stop (anillo 2): antes de que Claude dé por terminada una tarea, verifica lo que corresponde al estado del árbol. Si algo falla,
# exit 2 devuelve el error a Claude y sigue trabajando. Tope: al tercer intento seguido deja pasar y avisa, para que decida un humano.
# Medido en el worktree del piloto (mediana de 3): la verificación de siempre —mapa, typecheck, lint, test, mapa— tarda ≈ 160 s; lo barato,
# ≈ 17–27 s (`docs/PILOTO.md`). Se prueba en `scripts/guardas/verificar-al-terminar.test.ts`.
#
#   Sale sin verificar:  la sesión no edita (PILOTO_SESION = ruteo|decidir|control|en-seco: si no, cada ruteo pagaría ≈ 90 s y, con el árbol
#                        rojo de un paso fallido, el Stop bloquearía a un Sonnet que no puede arreglar nada); queda trabajo en segundo
#                        plano (`background_tasks` no vacío: un `-p` sigue abierto en el mismo árbol); o la huella del árbol (HEAD + diff +
#                        no rastreados) es la de la última verificación verde (`scripts/piloto/huella.sh`).
#   Árbol sucio:         (un turno a mitad de paso) typecheck + eslint --cache de los cambiados + vitest related + scripts/guardas + mapa.
#   Árbol limpio:        (un paso cerrado) la suite completa, una vez; si pasa, deja la huella verde para no repetirla.
# Lee `cwd` de la entrada y no `${CLAUDE_PROJECT_DIR}`, que no sigue a un worktree.
set -uo pipefail
ENTRADA=$(cat)
CWD=$(printf '%s' "$ENTRADA" | jq -r '.cwd // empty' 2>/dev/null)
cd "${CWD:-${CLAUDE_PROJECT_DIR:-.}}" || exit 0
RAIZ=$(git rev-parse --show-toplevel 2>/dev/null) && cd "$RAIZ" || exit 0
CONTADOR=".claude/.intentos-stop" # en .gitignore

case "${PILOTO_SESION:-}" in
  ruteo | decidir | control | en-seco) rm -f "$CONTADOR"; exit 0 ;;
esac
if printf '%s' "$ENTRADA" | jq -e '(.background_tasks // []) | length > 0' >/dev/null 2>&1; then
  exit 0
fi
if [ -f scripts/piloto/huella.sh ] && bash scripts/piloto/huella.sh --igual; then
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

barata() {
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

completa() {
  bash scripts/mapa.sh >/dev/null 2>&1 || true
  pnpm typecheck && pnpm lint && pnpm test && bash scripts/mapa.sh --check
}

if [ -n "$(git status --porcelain)" ]; then
  salida=$(barata 2>&1)
  verde=$?
  modo=barata
else
  salida=$(completa 2>&1)
  verde=$?
  modo=completa
fi

if [ "$verde" -eq 0 ]; then
  rm -f "$CONTADOR"
  # Sólo la verificación completa vale como «ya verificado»: lo barato no prueba el resto del repo.
  [ "$modo" = completa ] && [ -f scripts/piloto/huella.sh ] && bash scripts/piloto/huella.sh --escribir
  exit 0
fi

if [ "$n" -ge 3 ]; then
  rm -f "$CONTADOR"
  printf '{"systemMessage": "Las verificaciones siguen fallando tras 2 intentos de corrección. Revisa la salida de typecheck/lint/test antes de seguir."}\n'
  exit 0
fi

echo "La tarea no está terminada: estas verificaciones fallan ($modo). Corrígelas antes de parar." >&2
echo "$salida" | tail -n 40 >&2
# `pnpm test` guarda sola su salida completa y su JSON (vitest.config.mts): se dice dónde, para no depender de estas 40 líneas.
ultima=$(ls -dt test-salidas/20*/ 2>/dev/null | head -n 1)
[ -n "$ultima" ] && echo "Salida completa de la última corrida de pnpm test: ${ultima}salida.txt (y resultado.json)." >&2
exit 2
