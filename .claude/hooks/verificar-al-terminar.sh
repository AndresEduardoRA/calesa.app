#!/usr/bin/env bash
# Hook Stop (anillo 2): antes de que Claude dé por terminada una tarea, regenera el mapa y verifica
# typecheck + lint + tests + mapa. Si algo falla, exit 2 devuelve el error a Claude y sigue
# trabajando. Tope: al tercer intento seguido deja pasar y avisa, para que decida un humano.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}"
ENTRADA=$(cat)
CONTADOR=".claude/.intentos-stop"   # en .gitignore

if echo "$ENTRADA" | grep -qE '"stop_hook_active" *: *true'; then
  n=$(( $(cat "$CONTADOR" 2>/dev/null || echo 0) + 1 ))
else
  n=1
fi
echo "$n" > "$CONTADOR"

bash scripts/mapa.sh > /dev/null 2>&1 || true

salida=$( { pnpm typecheck && pnpm lint && pnpm test && bash scripts/mapa.sh --check; } 2>&1 )
if [ $? -eq 0 ]; then
  rm -f "$CONTADOR"
  exit 0
fi

if [ "$n" -ge 3 ]; then
  rm -f "$CONTADOR"
  printf '{"systemMessage": "Las verificaciones siguen fallando tras 2 intentos de corrección. Revisa la salida de typecheck/lint/test antes de seguir."}\n'
  exit 0
fi

echo "La tarea no está terminada: estas verificaciones fallan. Corrígelas antes de parar." >&2
echo "$salida" | tail -n 40 >&2
# `pnpm test` guarda sola su salida completa y su JSON (vitest.config.mts): se dice dónde, para no depender de estas 40 líneas.
ultima=$(ls -dt test-salidas/20*/ 2>/dev/null | head -n 1)
[ -n "$ultima" ] && echo "Salida completa de la última corrida de pnpm test: ${ultima}salida.txt (y resultado.json)." >&2
exit 2
