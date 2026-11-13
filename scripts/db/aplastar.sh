#!/usr/bin/env bash
# Aplasta todas las migraciones en una sola base y comprueba que deja exactamente la misma base (`.claude/rules/migraciones.md` ›
# «Aplastar»). Sólo contra el Supabase LOCAL, con su pila arriba y el árbol de `supabase/migrations` limpio. Se corre con el candado:
#
#   pnpm db:aplastar
#
# 1. Resetea la base sin semilla con las migraciones de hoy y saca su huella (scripts/db/huella-de-la-base.sh).
# 2. Arma la base nueva, `<versión de la última>_base.sql`: los privilegios por defecto apagados, el volcado de `supabase db dump
#    --local`, lo que el volcado no lleva porque vive en esquemas de Supabase (los triggers de auth.users y las policies de
#    storage.objects) y los datos que ponían las migraciones (buckets, catálogo, secretos de Vault al azar, jobs).
# 3. Aparta las migraciones viejas, resetea con la base nueva sola y vuelve a sacar la huella: si no es idéntica, restaura todo y sale
#    con 1 mostrando la diferencia. Si lo es, borra las viejas y fija el sha256 de la base en scripts/guardas/orden-de-migraciones.test.ts.
#
# La base lleva la versión de la última migración que reemplaza: una base remota que ya las tenía todas no la vuelve a correr; sólo
# hay que marcar las viejas como revertidas en su historial (lo hace scripts/demo/alinear-historial.sh en la demo; en producción,
# docs/DESPLIEGUE.md › «Tras aplastar»).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# shellcheck source=../lib/carril.sh
source scripts/lib/carril.sh
CONTENEDOR="supabase_db_${SUPABASE_PROJECT_ID:-importadora}"
MIGRACIONES=supabase/migrations
GUARDA=scripts/guardas/orden-de-migraciones.test.ts
TRABAJO=$(mktemp -d "${TMPDIR:-/tmp}/aplastar-XXXXXX")
falta() { echo "✗ $1" >&2; exit 64; }

[ -z "$(git status --porcelain -- "$MIGRACIONES")" ] || falta "supabase/migrations tiene cambios sin commitear: commitéalos antes."
docker inspect "$CONTENEDOR" >/dev/null 2>&1 || falta "la pila local no está arriba (pnpm exec supabase start)."
mapfile -t VIEJAS < <(find "$MIGRACIONES" -maxdepth 1 -name '*.sql' -printf '%f\n' | LC_ALL=C sort)
[ "${#VIEJAS[@]}" -ge 2 ] || falta "hay una sola migración: nada que aplastar."
ULTIMA="${VIEJAS[-1]}"
VERSION="${ULTIMA%%_*}"
BASE="${VERSION}_base.sql"
sb() { pnpm exec supabase "$@" 2> >(grep -v -i -E 'new version|recommend updating|^We recommend' >&2); }
# Con el `search_path` vacío: así las expresiones del catálogo (policies, triggers) salen con cada nombre calificado por su esquema.
consulta() { docker exec -e PGOPTIONS='-c search_path=' "$CONTENEDOR" psql -U supabase_admin -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c "$1"; }

echo "· 1/3 la base con las ${#VIEJAS[@]} migraciones de hoy (sin semilla) y su huella"
sb db reset --no-seed >"$TRABAJO/reset-antes.log" 2>&1 || { tail -n 30 "$TRABAJO/reset-antes.log" >&2; falta "el reset con las migraciones de hoy falló."; }
bash scripts/db/huella-de-la-base.sh "$TRABAJO/antes" >/dev/null

echo "· 2/3 la base nueva: $BASE"
{
  cat <<CABECERA
-- La base: el esquema y los datos de catálogo de las ${#VIEJAS[@]} migraciones anteriores (hasta ${ULTIMA}), aplastadas el
-- $(TZ=America/La_Paz date +%F) con \`pnpm db:aplastar\` (scripts/db/aplastar.sh), que comprobó que deja la misma base. **No se edita**:
-- todo cambio es una migración nueva (\`supabase migration new\`), y una guarda de \`pnpm test\` fija el sha256 de este archivo
-- (scripts/guardas/orden-de-migraciones.test.ts). Las migraciones que reemplaza están en git, en el commit anterior al que las aplastó.
--
-- 1. Los privilegios por defecto se apagan mientras se crean los objetos. El volcado escribe cada grant que hace falta, pero contra
--    los privilegios por omisión de Postgres y no contra los de Supabase: sin esto, anon y authenticated recibirían todo sobre cada
--    tabla, secuencia y función nueva (también las columnas ocultas de leads y cotizaciones). El volcado los repone al final.
-- 2. El volcado de \`supabase db dump --local\` sobre la base con esas migraciones.
-- 3. Lo que el volcado no lleva porque vive en esquemas de Supabase: los triggers de auth.users y las policies de storage.objects.
-- 4. Los datos que ponían las migraciones: los buckets, el catálogo (tal cual quedaba, sin disparar triggers), los secretos de Vault
--    que nacen al azar y los jobs de pg_cron.

-- 1. Privilegios por defecto, apagados (los repone el final del volcado)
CABECERA
  consulta "select format('alter default privileges for role postgres in schema %I revoke all on %s from anon, authenticated, service_role;', n.nspname, o.objeto)
              from (select distinct defaclnamespace from pg_default_acl where defaclrole = 'postgres'::regrole and defaclnamespace <> 0) d
              join pg_namespace n on n.oid = d.defaclnamespace
              cross join (values ('tables'), ('sequences'), ('functions')) o(objeto)
             where n.nspname in ('public', 'web')
             order by 1"
  printf '\n-- 2. El volcado\n'
  sb db dump --local
  printf '\n-- 3. Lo que el volcado no lleva: triggers de auth.users y policies de storage.objects\n'
  consulta "select format('create policy %I on storage.objects as %s for %s to %s%s%s;', policyname, lower(permissive), lower(cmd),
                          array_to_string(roles, ', '),
                          case when qual is not null then E'\n  using (' || qual || ')' else '' end,
                          case when with_check is not null then E'\n  with check (' || with_check || ')' else '' end)
              from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname"
  consulta "select pg_get_triggerdef(t.oid) || ';'
              from pg_trigger t join pg_proc p on p.oid = t.tgfoid join pg_namespace n on n.oid = p.pronamespace
             where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal and n.nspname = 'public' order by t.tgname"
  printf '\n-- 4. Datos\n-- Los buckets\n'
  # Un solo insert con una fila por línea: así lo lee el inventario del despliegue (scripts/despliegue/extraer.ts).
  echo 'insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values'
  consulta "select string_agg(format('  (%L, %L, %s, %s, %L)', id, name, case when public then 'true' else 'false' end, coalesce(file_size_limit::text, 'null'), allowed_mime_types), E',\n' order by id)
              from storage.buckets"
  echo 'on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;'
  printf '\n-- El catálogo que ponían las migraciones, tal cual quedaba\nset session_replication_role = replica;\n'
  docker exec "$CONTENEDOR" pg_dump -U supabase_admin -d postgres --data-only --column-inserts -n public -n web 2>/dev/null |
    grep -vE '^(--|SET |SELECT pg_catalog\.set_config|\\(un)?restrict |$)'
  printf 'set session_replication_role = origin;\n'
  printf '\n-- Los secretos de Vault que nacen al azar (32 bytes, una sola vez)\n'
  consulta "select format(E'do \$\$\nbegin\n  if not exists (select 1 from vault.secrets s where s.name = %L) then\n    perform vault.create_secret(new_secret => encode(extensions.gen_random_bytes(32), ''hex''), new_name => %L,\n                                new_description => %L);\n  end if;\nend \$\$;', name, name, description)
              from vault.secrets order by name"
  printf '\n-- Los jobs\n'
  consulta "select format('select cron.schedule(%L, %L, %L);', jobname, schedule, command) from cron.job order by jobid"
} >"$TRABAJO/$BASE"

echo "· 3/3 la base nueva sola, su huella y la comparación"
mkdir "$TRABAJO/viejas"
restaurar() {
  rm -f "$MIGRACIONES/$BASE"
  mv "$TRABAJO/viejas"/*.sql "$MIGRACIONES/" 2>/dev/null || true
}
mv "$MIGRACIONES"/*.sql "$TRABAJO/viejas/"
cp "$TRABAJO/$BASE" "$MIGRACIONES/$BASE"
if ! sb db reset --no-seed >"$TRABAJO/reset.log" 2>&1; then
  restaurar
  tail -n 30 "$TRABAJO/reset.log" >&2
  falta "la base nueva no aplica (queda en $TRABAJO/$BASE; las migraciones volvieron a su lugar)."
fi
bash scripts/db/huella-de-la-base.sh "$TRABAJO/despues" >/dev/null
if ! diff -r "$TRABAJO/antes" "$TRABAJO/despues" >"$TRABAJO/diferencia.txt"; then
  restaurar
  head -n 60 "$TRABAJO/diferencia.txt" >&2
  falta "la base nueva NO deja la misma base ($(wc -l <"$TRABAJO/diferencia.txt") líneas distintas: $TRABAJO/diferencia.txt). Las migraciones volvieron a su lugar."
fi

SHA=$(sha256sum "$MIGRACIONES/$BASE" | cut -d' ' -f1)
sed -i -E "s/^const BASE = '[^']+'$/const BASE = '$BASE'/; s/^const SHA256_DE_LA_BASE = '[0-9a-f]+'$/const SHA256_DE_LA_BASE = '$SHA'/" "$GUARDA"
echo "✓ ${#VIEJAS[@]} migraciones → $MIGRACIONES/$BASE ($(wc -l <"$MIGRACIONES/$BASE") líneas), huella idéntica; sha256 fijado en $GUARDA."
echo "  Sigue: pnpm db:reset && pnpm db:types && pnpm db:probar, y las rutas de migraciones viejas que citen las pruebas (git grep '${VIEJAS[0]%%_*}')."
echo "  Las viejas quedaron en $TRABAJO/viejas (también en git)."
