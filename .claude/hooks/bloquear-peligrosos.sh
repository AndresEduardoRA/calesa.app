#!/usr/bin/env bash
# Hook PreToolUse sobre Bash: bloquea lo que ninguna sesión de IA debería correr sola.
set -uo pipefail
ENTRADA=$(cat)
CMD=$(printf '%s' "$ENTRADA" | sed -nE 's/.*"command" *: *"((\\.|[^"\\])*)".*/\1/p' | head -n1)
[ -z "$CMD" ] && exit 0

bloquear() {
  printf '{"decision":"block","reason":"%s"}\n' "$1"
  exit 2
}

case "$CMD" in
  *"--no-verify"*|*"git commit -n "*)            bloquear "Nunca git commit --no-verify: si un hook falla, el problema es el código." ;;
  *"push --force"*|*"push -f"*)                   bloquear "Nunca push forzado." ;;
  *"supabase db push"*)                           bloquear "supabase db push contra el proyecto remoto lo corre una persona, con --dry-run primero." ;;
  *"supabase db reset --linked"*)                 bloquear "db reset --linked borra la base remota." ;;
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf .."*)        bloquear "rm -rf fuera del proyecto." ;;
  *"npm i -g"*|*"npm install -g"*|*"pnpm add -g"*) bloquear "Nada global: contamina la máquina del usuario." ;;
  *"SUPABASE_SECRET_KEY"*|*"sb_secret_"*)         bloquear "No imprimas ni manipules la secret key desde Bash." ;;
esac
exit 0
