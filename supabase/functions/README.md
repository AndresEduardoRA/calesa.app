# Edge functions

Trabajo que no debe vivir en una Server Action que el usuario espera. Cada una se construye en la
fase que la necesita (`docs/PLAN.md`); hasta entonces sólo existe este contrato. Deno, `supabase
functions new <nombre>`, secretos con `supabase secrets set`, nunca en el código.

| Función        | Fase        | La dispara                                                               | Hace                                                                                                                                                                                                                                                                                                                                                                                  | Secretos                                              |
| -------------- | ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apibara`      | 2           | Server Action de `vehiculos` (alta por link/lote)                        | `GET https://apibara.tech/api/v1/vehicle-auction/vehicles/urltodetails?url=` (o `/vehicles/{lote}`), header `X-API-Key`; normaliza al shape `{plataforma, lote, vin, titulo, anio, marca, modelo, subasta{estado, en}, precios, ubicacion, condicion, odometro, specs, documento_venta, media[]}`; devuelve `kind: ok                                                                 | not_found                                             | unauthorized | quota_exceeded | bad_request | provider_error` por status (404/401/429/400/5xx). Sin reintentos en 429. | la clave de apibara, leída de Vault con `integracion_secreto('apibara')` |
| `push`         | 7           | Database Webhook en `notificaciones` (INSERT) con header `x-push-secret` | Lee `suscripciones_push` del destinatario con el cliente admin y envía con `web-push`; borra suscripciones 404/410.                                                                                                                                                                                                                                                                   | `VAPID_PRIVATE_KEY`, `PUSH_WEBHOOK_SECRET`            |
| `storage-gc`   | 2 (parte 4) | `pg_cron` cada hora → `storage_gc_disparar(url)` → `pg_net`              | Canjea el pase que trae el pedido (`storage_gc_abrir`); si vale: `rpc('storage_gc_reclamar', { p_max })` → borra por la API de Storage lo que le devolvieron, agrupado por bucket → `rpc('storage_gc_confirmar', { p_bucket, p_rutas })` con lo reclamado, si el borrado no dio error. Nunca recuenta ni decide por su cuenta: reclamar ya lo hizo, con el candado del objeto tomado. | ninguno propio: la service key que inyecta el runtime |
| `importar-csv` | 9           | Server Action de `datos` tras subir el archivo al bucket `importaciones` | Parsea, valida por fila contra la plantilla, llama `crear_lead` (misma regla de limbo/duplicados) o inserta vehículos; escribe el informe en `importaciones`.                                                                                                                                                                                                                         | ninguno                                               |

## `storage-gc`

El protocolo vive en SQL y está probado en humo (`supabase/migrations/20261013000400_storage_gc.sql`,
`…000900_papelera_purga.sql`, `…001000_storage_gc_funcion.sql`); la función sólo borra y confirma.

- **Reclamar** (`storage_gc_reclamar`): encola los huérfanos del bucket `vehiculos` (objetos sin
  fila, con más de 24 h) y, de lo que ya cumplió su espera en la cola, recuenta con
  `storage_refcount` teniendo tomado el candado del objeto. Con referencias, lo saca de la cola;
  sin ellas, lo marca `reclamado_en` y lo devuelve. Un reclamo sin confirmar se vuelve a ofrecer
  pasada una hora.
- **Confirmar** (`storage_gc_confirmar`): saca de la cola lo reclamado que ya se borró.
- **Rescatar** (`storage_gc_rescatar`): lo llama el trigger de toda fila que nace referenciando
  un objeto. Toma el mismo candado: si el objeto está reclamado, la fila no nace.
- **La espera:** 24 h para una foto eliminada (cubre el «Deshacer» y las subidas en curso); ninguna
  para lo de un vehículo purgado.

**Cómo se autentica.** Quien llama es la base, que no tiene dónde guardar un secreto de
infraestructura. `storage_gc_disparar(url)` crea un **pase** de un solo uso (`cola_gc_pases`, vale
10 minutos) y lo manda en el cuerpo; la función lo canjea con `storage_gc_abrir(pase)` usando la
service key que el runtime le inyecta (`SUPABASE_SERVICE_ROLE_KEY`), y sin un pase válido responde
401 sin tocar nada. Por eso lleva `verify_jwt = false` en `config.toml`. No hay secreto que cargar
ni que rotar, ni en Vault ni en `cron.job`.

**Si falla a medias.** Se cae entre reclamar y borrar: el reclamo vence a la hora y se vuelve a
ofrecer. Se cae entre borrar y confirmar: lo mismo, y borrar algo que ya no está no es un error.
Storage rechaza un bucket: no se confirma nada de ese bucket. Nunca se confirma algo que no se
reclamó, y nada se borra dos veces. `storage_gc_pendiente()` le dice a quien puede vaciar la
papelera cuánto lleva esperando lo que ya debía haberse borrado.

**Por despliegue (una vez):** `supabase functions deploy storage-gc` y, en el editor de SQL,
`select public.storage_gc_programar('https://<ref>.supabase.co/functions/v1/storage-gc');`. La
dirección no se puede saber desde una migración; el job (`17 * * * *`) queda con ella. La purga
automática de la papelera (`papelera-purgar`, 03:30) la programa la migración.

**En local:** `supabase start` sirve la función (si el contenedor `edge_runtime` quedó caído o se
cambió `config.toml`, `npx supabase stop && npx supabase start`). Desde la base se la alcanza en
`http://api.supabase.internal:8000/functions/v1/storage-gc`. Deno no entra en lint ni en
typecheck (`tsconfig` y ESLint excluyen `supabase/functions`): la cubre `e2e/vehiculos-papelera.spec.ts`,
que purga, la llama con un pase y comprueba que los objetos salieron de Storage.

Reglas: una función = un `index.ts` + `deno.json`; CORS sólo si la llama el navegador (ninguna de
estas); errores como valores `{ ok, error }` en JSON; logs sin datos personales.
