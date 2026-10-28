#!/usr/bin/env bash
# Deja la demo (o la base local) lista para entrar, de punta a punta e idempotente: corre las veces que haga falta.
#
#   bash scripts/demo/restaurar.sh            la demo: el proyecto de Supabase enlazado (lee .env.demo)
#   bash scripts/demo/restaurar.sh --local    la base local de este worktree (lee las credenciales de demo de .env.demo)
#
# La demo: 1) `scripts/demo/resetear.sh` (respaldo, reset con las migraciones y el seed, `url_proyecto` en Vault, comprobaciones);
# 2) despliega las funciones edge; 3) sube la configuración de Auth (`[remotes.demo]` de config.toml: Site URL, redirecciones, SMTP,
# plantillas y vencimiento de las invitaciones) si `.env.demo` trae el SMTP; 4) `scripts/demo/sembrar.mjs`: el dueño, un usuario por
# rol y los datos de ejemplo, por la API de admin de Auth y las RPC de la app (y la clave de apibara si viene).
# En local: reset, siembra y cómo entrar. Qué lleva `.env.demo`: docs/ENTORNOS.md. Ningún valor secreto se imprime.
# Las guardas de las sesiones sólo dejan pasar lecturas remotas sueltas: esto lo corre la persona, o una sesión que se lo avisó.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }
falta() { echo "✗ $1" >&2; exit 64; }

MODO=demo
[ "${1:-}" = --local ] && MODO=local

# Las credenciales de demo (el dueño y la clave de los usuarios de demo) salen de .env.demo; en local también pueden venir del entorno.
if [ -f .env.demo ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.demo
  set +a
elif [ "$MODO" = demo ]; then
  falta "no hay .env.demo: cópialo de docs/ENTORNOS.md › «.env.demo» y complétalo."
fi

if [ "$MODO" = local ]; then
  for v in DEMO_DUENO_EMAIL DEMO_DUENO_CLAVE DEMO_CLAVE_USUARIOS; do [ -n "${!v:-}" ] || falta "falta $v (en .env.demo o en el entorno)"; done
  pnpm db:reset >/dev/null 2>&1 || pnpm db:reset >/dev/null
  echo "✓ base local reseteada (migraciones y seed)"
  # Las claves de la base local, sin imprimirlas.
  estado=$(sb status -o env)
  leer() { printf '%s\n' "$estado" | sed -nE "s/^$1=\"?([^\"]*)\"?$/\1/p"; }
  SEMBRAR_URL=$(leer API_URL) SEMBRAR_CLAVE_PUBLICA=$(leer PUBLISHABLE_KEY) SEMBRAR_CLAVE_SECRETA=$(leer SECRET_KEY) \
    DUENO_EMAIL="$DEMO_DUENO_EMAIL" DUENO_CLAVE="$DEMO_DUENO_CLAVE" CLAVE_USUARIOS="$DEMO_CLAVE_USUARIOS" \
    APIBARA_CLAVE="${APIBARA_CLAVE:-}" SEMBRAR_URL_APP="http://localhost:${PUERTO_APP:-3000}" node scripts/demo/sembrar.mjs
  # El puerto de la app de este worktree lo deja scripts/worktree/preparar.sh en PUERTO_APP; la principal usa el 3000.
  exit 0
fi

# La demo: el entorno completo antes de tocar nada.
pnpm --silent env:check demo || falta "completa .env.demo (arriba, lo que falta)."

bash scripts/demo/resetear.sh

sb functions deploy --use-api >/dev/null
echo "✓ funciones edge desplegadas: $(find supabase/functions -mindepth 1 -maxdepth 1 -type d ! -name '_*' -printf '%f ' )"

if [ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_USUARIO:-}" ] && [ -n "${SMTP_CLAVE:-}" ] && [ -n "${EMAIL_REMITENTE:-}" ]; then
  export DEMO_REDIRECCION_SITIO="${DEMO_SITE_URL%/}/**"
  if [ -n "${DEMO_VERCEL_EQUIPO:-}" ]; then
    export DEMO_REDIRECCION_PREVIEWS="https://*-${DEMO_VERCEL_EQUIPO}.vercel.app/**"
  else
    export DEMO_REDIRECCION_PREVIEWS="$DEMO_REDIRECCION_SITIO"
  fi
  export EMAIL_REMITENTE_NOMBRE="${EMAIL_REMITENTE_NOMBRE:-Importadora}"
  sb config push --yes
  echo "✓ configuración de Auth subida (Site URL, redirecciones, SMTP, plantillas, 24 h para las invitaciones)"
else
  echo "· configuración de Auth NO subida: falta el SMTP en .env.demo (SMTP_HOST, SMTP_USUARIO, SMTP_CLAVE, EMAIL_REMITENTE)."
  echo "  Sin eso la demo usa el SMTP de prueba de Supabase y su Site URL anterior (docs/ENTORNOS.md › «Auth en la nube»)."
fi

SEMBRAR_URL="$DEMO_SUPABASE_URL" SEMBRAR_CLAVE_PUBLICA="$DEMO_CLAVE_PUBLICA" SEMBRAR_CLAVE_SECRETA="$DEMO_CLAVE_SECRETA" \
  DUENO_EMAIL="$DEMO_DUENO_EMAIL" DUENO_CLAVE="$DEMO_DUENO_CLAVE" CLAVE_USUARIOS="$DEMO_CLAVE_USUARIOS" \
  APIBARA_CLAVE="${APIBARA_CLAVE:-}" SEMBRAR_URL_APP="$DEMO_SITE_URL" node scripts/demo/sembrar.mjs
