#!/usr/bin/env bash
# Un job con `url_proyecto` llega de verdad a `storage-gc` y vuelve con 200: lo que `jobs.sql` (PGlite, sin red) no puede probar.
# Contra la base local, después de un reset (el seed pone `url_proyecto` = el gateway visto desde la base) y con las funciones servidas
# (`pnpm funciones` en otra terminal). Corre el comando del job tal cual está en `cron.job`, espera la respuesta de
# pg_net y comprueba el 200 y que la función canjeó el pase (`cola_gc_pases.usado_en`).
#
#   bash scripts/candado.sh jobs -- bash supabase/tests/jobs-de-verdad.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# El stack de este worktree: la principal o un carril (scripts/lib/stack-local.mjs).
read -r C API < <(node --input-type=module -e "import { stackLocal } from './scripts/lib/stack-local.mjs'
const s = stackLocal(); console.log(s.contenedorDb, s.puertoApi)")
q() { docker exec -i "$C" psql -U postgres -d postgres -XAt -v ON_ERROR_STOP=1 -c "$1"; }

estado=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "http://127.0.0.1:${API}/functions/v1/storage-gc" || true)
if [ "$estado" = 000 ] || [ "$estado" = 404 ] || [ "${estado:0:1}" = 5 ]; then
  echo "✗ storage-gc no está servida (OPTIONS dio $estado): corre \`pnpm funciones\` en otra terminal." >&2
  exit 1
fi
[ -n "$(q "select 1 from vault.secrets where name = 'url_proyecto'")" ] || { echo "✗ falta url_proyecto en Vault (¿se corrió el seed?)" >&2; exit 1; }

comando=$(q "select command from cron.job where jobname = 'storage-gc'")
[ "$comando" = 'select public.storage_gc_correr()' ] || { echo "✗ el job storage-gc no es el de Vault: «$comando»" >&2; exit 1; }
pedido=$(q "$comando")
pase=$(q "select pase from public.cola_gc_pases order by creado_en desc limit 1")
echo "pedido $pedido, pase $pase"

for _ in $(seq 1 60); do
  codigo=$(q "select coalesce(status_code::text, 'error: ' || coalesce(error_msg, '?')) from net._http_response where id = $pedido")
  [ -n "$codigo" ] && break
  sleep 1
done
usado=$(q "select usado_en is not null from public.cola_gc_pases where pase = '$pase'")
echo "respuesta: ${codigo:-sin respuesta en 60 s} · pase usado: $usado"
[ "$codigo" = 200 ] && [ "$usado" = t ] && { echo "✓ el job llegó a storage-gc, volvió con 200 y la función canjeó el pase"; exit 0; }
echo "✗ el job no llegó bien a storage-gc" >&2
exit 1
