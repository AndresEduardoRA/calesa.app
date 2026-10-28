# shellcheck shell=bash
# Se carga con `source`: exporta las variables de `.env.carril` de este worktree (lo escribe scripts/worktree/preparar.sh en un carril
# de Orca: el project_id y los puertos de su stack de Supabase, de la app y del e2e). Una variable que ya viene en el entorno manda.
# En la principal no hay `.env.carril` y no hace nada: queda lo de `supabase/config.toml`. Lo mismo en JS: scripts/lib/stack-local.mjs.
cargar_carril() {
  local raiz archivo linea clave valor
  raiz=$(git rev-parse --show-toplevel 2>/dev/null) || raiz=$PWD
  archivo="$raiz/.env.carril"
  [ -f "$archivo" ] || return 0
  while IFS= read -r linea || [ -n "$linea" ]; do
    [[ "$linea" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]] || continue
    clave=${BASH_REMATCH[1]}
    valor=${BASH_REMATCH[2]}
    [ -n "${!clave+x}" ] || export "$clave=$valor"
  done <"$archivo"
}
cargar_carril

# El candado de la base de ESTE stack (scripts/candado.sh), sin `.lock` ni `.info`: uno por puerto de la base, así cada carril tiene
# el suyo y dos carriles corren un e2e a la vez. La principal usa el 54622 de config.toml.
ruta_del_candado() {
  echo "$1/candado-base-${SUPABASE_DB_PORT:-54622}"
}
