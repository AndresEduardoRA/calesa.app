#!/usr/bin/env bash
# Resetea la demo (el proyecto de Supabase enlazado) con las migraciones del árbol, y comprueba que quedó como el repo:
#   1. respalda el esquema y los datos en respaldos/<fecha>/ (ignorado por git, permisos 600);
#   2. `supabase db reset --linked` (las migraciones y el seed);
#   3. pone `url_proyecto` en Vault (la usan los jobs que llaman a una función edge);
#   4. comprueba: `migration list` alineado, `db diff --linked` vacío, los jobs en `cron.job` y la colación de la base.
#
#   bash scripts/demo/resetear.sh [--sin-respaldo]
#
# La demo no tiene datos reales y se puede resetear; las guardas de las sesiones sólo dejan pasar lecturas remotas
# sueltas, así que esto lo corre la persona o una sesión que se lo avisó antes (docs/PREPARACION.md). Lee `.env.demo` si existe:
# `DEMO_SUPABASE_URL` (si no, https://<ref>.supabase.co). Ningún valor secreto pasa por aquí ni se imprime.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }

REF=$(cat supabase/.temp/project-ref 2>/dev/null || true)
[ -n "$REF" ] || { echo "✗ no hay proyecto enlazado: \`supabase link\` lo hace la persona." >&2; exit 64; }
if [ -f .env.demo ]; then set -a; . ./.env.demo; set +a; fi
URL="${DEMO_SUPABASE_URL:-https://${REF}.supabase.co}"
URL="${URL%/}"
[[ "$URL" =~ ^https://[a-z0-9.-]+$ ]] || { echo "✗ DEMO_SUPABASE_URL no es una URL https sin ruta: «$URL»" >&2; exit 64; }
echo "demo: $REF ($URL)"

# 1. Respaldo
if [ "${1:-}" != --sin-respaldo ]; then
  DIR="respaldos/$(TZ=America/La_Paz date +%F_%H%M%S)"
  mkdir -p "$DIR" && chmod 700 respaldos "$DIR"
  sb db dump --linked -f "$DIR/esquema.sql" >/dev/null
  sb db dump --linked --data-only --use-copy -f "$DIR/datos.sql" >/dev/null
  chmod 600 "$DIR"/*
  echo "✓ respaldo en $DIR ($(du -sh "$DIR" | cut -f1))"
fi

# 2. Reset
sb db reset --linked --yes
echo "✓ reset con $(find supabase/migrations -name '*.sql' | wc -l | tr -d ' ') migraciones y el seed"

# 3. La URL del proyecto en Vault
SQL=$(mktemp)
trap 'rm -f "$SQL"' EXIT
cat > "$SQL" <<SQL
do \$\$
declare v_id uuid;
begin
  select s.id into v_id from vault.secrets s where s.name = 'url_proyecto';
  if v_id is null then
    perform vault.create_secret('$URL', 'url_proyecto', 'URL del proyecto para los jobs que llaman a funciones edge');
  else
    perform vault.update_secret(v_id, '$URL');
  end if;
end \$\$;
SQL
sb db query --linked -f "$SQL" >/dev/null
echo "✓ url_proyecto en Vault"

# 4. Comprobaciones
fallo=0
desalineadas=$(sb migration list --linked --output-format json | jq -r '.migrations[] | select(.local != .remote) | "\(.local) ≠ \(.remote)"')
if [ -z "$desalineadas" ]; then echo "✓ migration list: alineado"; else echo "✗ migration list desalineado:"; echo "$desalineadas"; fallo=1; fi
diff_salida=$(bash scripts/candado.sh db:diff -- pnpm exec supabase db diff --linked 2>&1 | grep -v -i -E 'new version|recommend' || true)
if printf '%s' "$diff_salida" | grep -q -i 'no schema changes found'; then echo "✓ db diff --linked: vacío"
else echo "✗ db diff --linked no está vacío:"; printf '%s\n' "$diff_salida" | tail -20; fallo=1; fi
jobs=$(sb db query --linked --output-format json "select jobname from cron.job order by 1" | jq -r '.. | .jobname? // empty' | paste -sd ' ')
esperados=$(grep -hoE "cron\.schedule\('[a-z-]+'" supabase/migrations/*.sql | sed -E "s/.*'([a-z-]+)'/\1/" | sort -u | paste -sd ' ')
if [ "$jobs" = "$esperados" ]; then echo "✓ cron.job: $jobs"; else echo "✗ cron.job tiene «$jobs» y las migraciones programan «$esperados»"; fallo=1; fi
colacion=$(sb db query --linked --output-format json "select datcollate, datctype, datlocprovider::text as proveedor, coalesce(datlocale, '') as locale from pg_database where datname = current_database()" | jq -c '..|objects|select(has("datcollate"))' | head -1)
echo "· colación de la demo: $colacion (local: $(docker exec "supabase_db_$(sed -nE 's/^project_id *= *"([^"]+)".*/\1/p' supabase/config.toml)" psql -U postgres -d postgres -XAt -c "select json_build_object('datcollate', datcollate, 'datctype', datctype, 'proveedor', datlocprovider::text, 'locale', coalesce(datlocale, ''))::text from pg_database where datname = current_database()" 2>/dev/null || echo '?'))"
exit $fallo
