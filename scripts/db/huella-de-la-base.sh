#!/usr/bin/env bash
# La huella de la base local: todo lo que un reset deja y que dos juegos de migraciones tienen que dejar igual. La usa
# scripts/db/aplastar.sh para comprobar que la base aplastada es la misma que dejaban las migraciones que reemplaza.
#
#   bash scripts/db/huella-de-la-base.sh <carpeta>
#
# Escribe en <carpeta>: esquema.sql (`pg_dump --schema-only` de TODA la base menos el historial de migraciones: tablas, funciones,
# policies, triggers y ACL de todos los esquemas, también los de Supabase), datos.sql (las filas de `public` y `web`, ordenadas),
# cron.txt (los jobs), buckets.txt, vault.txt (los nombres de los secretos: su valor es al azar en cada reset) y realtime.txt.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# shellcheck source=../lib/carril.sh
source scripts/lib/carril.sh
DESTINO="${1:?falta la carpeta de destino}"
CONTENEDOR="supabase_db_${SUPABASE_PROJECT_ID:-importadora}"
mkdir -p "$DESTINO"

volcar() { docker exec "$CONTENEDOR" pg_dump -U supabase_admin -d postgres "$@"; }
consulta() { docker exec "$CONTENEDOR" psql -U supabase_admin -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c "$1"; }

# `\restrict` y `\unrestrict` llevan una clave al azar en cada volcado: fuera. El aviso de las FK circulares es del volcado de datos.
volcar --schema-only -N supabase_migrations | grep -vE '^\\(un)?restrict ' >"$DESTINO/esquema.sql"
volcar --data-only --inserts -n public -n web 2>/dev/null |
  grep -vE '^(--|SET |SELECT pg_catalog\.set_config|\\(un)?restrict |$)' | LC_ALL=C sort >"$DESTINO/datos.sql"
consulta "select jobname, schedule, command from cron.job order by 1" >"$DESTINO/cron.txt"
consulta "select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by 1" >"$DESTINO/buckets.txt"
consulta "select name, description from vault.secrets order by 1" >"$DESTINO/vault.txt"
consulta "select pubname, schemaname, tablename from pg_publication_tables order by 1, 2, 3" >"$DESTINO/realtime.txt"
wc -l "$DESTINO"/* | sed 's/^/  /'
