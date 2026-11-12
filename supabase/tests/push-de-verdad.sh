#!/usr/bin/env bash
# Un aviso de verdad llega a la función `push` y la función canjea su pase: lo que `areas/push/disparo.sql` (PGlite, sin red) no puede probar.
# Recorre aviso → `trg_notificaciones_push` → pase → pg_net → gateway → función → `push_abrir`. Sin claves VAPID la función responde 200
# `sin_claves` y no envía: un endpoint simulado no puede recibir el push porque la base y la función sólo aceptan servicios de push reales
# (a propósito: la función no es un proxy abierto). La última milla (firma, cifrado y envío) la cubre `supabase/tests/push-contrato.test.ts`.
# Contra la base local, después de un reset (el seed pone `url_proyecto` = el gateway visto desde la base) y con las funciones servidas
# (`pnpm funciones` en otra terminal). Siembra una persona de prueba, la borra al salir y devuelve `push_web` como estaba.
#
#   bash scripts/candado.sh push -- bash supabase/tests/push-de-verdad.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# El stack de este worktree: la principal o un carril (scripts/lib/stack-local.mjs).
read -r C API < <(node --input-type=module -e "import { stackLocal } from './scripts/lib/stack-local.mjs'
const s = stackLocal(); console.log(s.contenedorDb, s.puertoApi)")
q() { docker exec -i "$C" psql -U postgres -d postgres -XAt -v ON_ERROR_STOP=1 -c "$1"; }

# Con claves, la función mandaría un pedido real a un servicio de push con un endpoint inventado.
if [ -f supabase/functions/.env ] && grep -q '^VAPID_PRIVATE_KEY=.' supabase/functions/.env; then
  echo "✗ supabase/functions/.env trae claves VAPID: esta prueba corre sin ellas (no manda nada afuera)." >&2
  exit 1
fi
estado=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "http://127.0.0.1:${API}/functions/v1/push" || true)
if [ "$estado" = 000 ] || [ "$estado" = 404 ] || [ "${estado:0:1}" = 5 ]; then
  echo "✗ push no está servida (OPTIONS dio $estado): corre \`pnpm funciones\` en otra terminal." >&2
  exit 1
fi
[ -n "$(q "select 1 from vault.secrets where name = 'url_proyecto'")" ] || { echo "✗ falta url_proyecto en Vault (¿se corrió el seed?)" >&2; exit 1; }

persona=$(q "select gen_random_uuid()")
# Con la base recién reseteada no hay nadie: la primera cuenta nace dueña y una invitada sin aceptar no puede serlo (rbac_guardian).
duena=''
if [ "$(q "select count(*) from public.perfiles")" = 0 ]; then
  duena=$(q "select gen_random_uuid()")
fi
activa=$(q "select activa from public.integraciones where clave = 'push_web'")
[ -n "$activa" ] || { echo "✗ no está la integración push_web" >&2; exit 1; }
limpiar() {
  q "begin;
     delete from public.notificaciones where usuario_id = '$persona';
     delete from public.suscripciones_push where usuario_id = '$persona';
     delete from auth.users where id = '$persona';
     ${duena:+delete from auth.users where id = '$duena';}
     update public.integraciones set activa = '$activa'::boolean where clave = 'push_web';
     commit;" > /dev/null
}
trap limpiar EXIT
antes=$(q "select coalesce(max(id), 0) from net._http_response")
# La dueña en su propia transacción: el permiso de registro se mira al confirmar y, con otra cuenta al lado, ya no sería la primera.
[ -z "$duena" ] || q "insert into auth.users (id, email) values ('$duena', 'push-de-verdad-$duena@ejemplo.com')" > /dev/null

# Una sola transacción que se confirma: pg_net manda el pedido recién tras el commit.
q "begin;
   update public.integraciones set activa = true where clave = 'push_web';
   insert into auth.users (id, email, raw_app_meta_data) values ('$persona', 'push-de-verdad-$persona@ejemplo.com', '{\"invitado\": true}');
   insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '$persona', id, true from public.roles where clave = 'asesor';
   insert into public.suscripciones_push (usuario_id, endpoint, claves)
     values ('$persona', 'https://fcm.googleapis.com/fcm/send/push-de-verdad-$persona', '{\"p256dh\": \"x\", \"auth\": \"y\"}');
   select public.notificar('$persona', 'tarea_asignada', 'Te asignaron una tarea', 'push de verdad', 'tarea', gen_random_uuid(), '/agenda', true);
   commit;" > /dev/null
noti=$(q "select id from public.notificaciones where usuario_id = '$persona'")
[ -n "$noti" ] || { echo "✗ la notificación no entró (¿la puerta la descartó?)" >&2; exit 1; }
pases=$(q "select count(*) from public.push_pases where notificacion_id = $noti")
echo "notificación $noti, pases $pases"
[ "$pases" = 1 ] || { echo "✗ se esperaba un pase y hay $pases: el disparo no corrió" >&2; exit 1; }

usado=f; respuesta=''
for _ in $(seq 1 60); do
  usado=$(q "select usado_en is not null from public.push_pases where notificacion_id = $noti")
  respuesta=$(q "select status_code || ' ' || coalesce(content, '') from net._http_response
                  where id > $antes and content like '%sin_claves%' order by id desc limit 1")
  [ "$usado" = t ] && [ -n "$respuesta" ] && break
  sleep 1
done
echo "respuesta: ${respuesta:-sin respuesta en 60 s} · pase usado: $usado"
if [ "$usado" = t ] && [ "${respuesta%% *}" = 200 ]; then
  echo "✓ el aviso llegó a la función push, que canjeó el pase; sin claves VAPID no envía (la última milla la cubre push-contrato.test.ts)"
  exit 0
fi
[ "$usado" = t ] || echo "✗ la función no canjeó el pase" >&2
[ -n "$respuesta" ] || echo "✗ no volvió la respuesta sin_claves de la función: $(q "select coalesce(status_code::text, 'error: ' || coalesce(error_msg, '?')) from net._http_response where id > $antes order by id desc limit 1")" >&2
exit 1
