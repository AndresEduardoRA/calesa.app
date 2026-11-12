#!/usr/bin/env bash
# El rastro de la base cuando cae el e2e (9-11): el log del contenedor y las estadísticas de Postgres, en una carpeta que el CI sube
# con el artefacto del rojo (`e2e-fallos/`). Un rojo por lentitud (un timeout de 15 s en una consulta que mide 80 ms a solas) se
# reconstruía a ciegas: `pg_stat_statements` no guarda lo que falla y el log de la base se iba con el runner.
#
#   bash scripts/ci/volcar-base.sh <carpeta>
#
# Deja en la carpeta cinco archivos: base-docker.log, pg_stat_statements.txt, pg_stat_user_tables-leads.txt, pg_stat_checkpointer.txt
# y cron-job_run_details.txt. Cada volcado es independiente: si uno falla (la extensión no está, la tabla no existe), lo dice en su
# archivo y los demás siguen; nunca sale con error. Sin contenedor de base escribe «no hay base» en cada uno y sale 0.
# El contenedor: CONTENEDOR_DB si está puesto; si no, el del stack de este árbol (SUPABASE_PROJECT_ID o `.env.carril`); si no, el primero
# de `docker ps` que empiece por `supabase_db_`. No imprime variables de entorno ni claves: los textos de `pg_stat_statements` vienen
# normalizados (sin literales).
set -u

CARPETA="${1:-}"
[ -n "$CARPETA" ] || {
  echo "uso: bash scripts/ci/volcar-base.sh <carpeta>" >&2
  exit 64
}
mkdir -p "$CARPETA" || exit 0

ARCHIVOS=(base-docker.log pg_stat_statements.txt pg_stat_user_tables-leads.txt pg_stat_checkpointer.txt cron-job_run_details.txt)

contenedor() {
  if [ -n "${CONTENEDOR_DB:-}" ]; then
    echo "$CONTENEDOR_DB"
    return
  fi
  local proyecto="${SUPABASE_PROJECT_ID:-}"
  if [ -z "$proyecto" ] && [ -f .env.carril ]; then
    proyecto="$(sed -n 's/^SUPABASE_PROJECT_ID=//p' .env.carril | head -n 1)"
  fi
  if [ -n "$proyecto" ]; then
    echo "supabase_db_$proyecto"
    return
  fi
  docker ps --format '{{.Names}}' 2>/dev/null | grep '^supabase_db_' | head -n 1
}

DB="$(contenedor)"
if [ -z "$DB" ] || ! docker inspect "$DB" >/dev/null 2>&1; then
  for archivo in "${ARCHIVOS[@]}"; do
    echo "no hay base" > "$CARPETA/$archivo"
  done
  exit 0
fi

# Una consulta como `postgres`, con encabezados y alineada; el error (si lo hay) queda en el archivo, no corta.
consulta() {
  local salida="$1" sql="$2"
  {
    echo "-- $(date -u +%FT%TZ) · $DB"
    docker exec -i "$DB" psql -U postgres -X -P pager=off -v ON_ERROR_STOP=1 -c "$sql" 2>&1 || echo "no disponible: la consulta falló (arriba, el motivo)"
  } > "$CARPETA/$salida"
}

docker logs --since 30m "$DB" > "$CARPETA/base-docker.log" 2>&1 || echo "no disponible: docker logs falló" >> "$CARPETA/base-docker.log"

consulta pg_stat_statements.txt "select left(query, 200) as query, calls, round(max_exec_time::numeric, 1) as max_ms, round(mean_exec_time::numeric, 1) as mean_ms, rows from extensions.pg_stat_statements order by max_exec_time desc limit 30"

consulta pg_stat_user_tables-leads.txt "select relname, n_live_tup, n_dead_tup, last_autovacuum, last_autoanalyze, autovacuum_count, autoanalyze_count from pg_stat_user_tables where relname in ('leads', 'leads_asesores') order by relname"

consulta pg_stat_checkpointer.txt "select * from pg_stat_checkpointer"

consulta cron-job_run_details.txt "select jobid, status, start_time, end_time, left(return_message, 200) as return_message from cron.job_run_details where start_time > now() - interval '15 minutes' order by start_time"

exit 0
