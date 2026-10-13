# Edge functions

Trabajo que no debe vivir en una Server Action que el usuario espera. Cada una se construye en la
fase que la necesita (`docs/PLAN.md`); hasta entonces sólo existe este contrato. Deno, `supabase
functions new <nombre>`, secretos con `supabase secrets set`, nunca en el código.

| Función        | Fase        | La dispara                                                               | Hace                                                                                                                                                                                                                                                                                                                  | Secretos                                                          |
| -------------- | ----------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apibara`      | 2           | Server Action de `vehiculos` (alta por link/lote)                        | `GET https://apibara.tech/api/v1/vehicle-auction/vehicles/urltodetails?url=` (o `/vehicles/{lote}`), header `X-API-Key`; normaliza al shape `{plataforma, lote, vin, titulo, anio, marca, modelo, subasta{estado, en}, precios, ubicacion, condicion, odometro, specs, documento_venta, media[]}`; devuelve `kind: ok | not_found                                                         | unauthorized | quota_exceeded | bad_request | provider_error` por status (404/401/429/400/5xx). Sin reintentos en 429. | la clave de apibara, leída de Vault con `integracion_secreto('apibara')` |
| `push`         | 7           | Database Webhook en `notificaciones` (INSERT) con header `x-push-secret` | Lee `suscripciones_push` del destinatario con el cliente admin y envía con `web-push`; borra suscripciones 404/410.                                                                                                                                                                                                   | `VAPID_PRIVATE_KEY`, `PUSH_WEBHOOK_SECRET`                        |
| `storage-gc`   | 2 (parte 4) | `pg_cron` cada hora, por `pg_net`                                        | `rpc('storage_gc_reclamar', { p_max })` → borra por la API de Storage lo que le devolvieron, agrupado por bucket → `rpc('storage_gc_confirmar', { p_bucket, p_rutas })` con lo que se borró. Nunca recuenta ni decide por su cuenta: reclamar ya lo hizo, con el candado del objeto tomado.                           | `STORAGE_GC_SECRET` (header que manda el cron, guardado en Vault) |
| `importar-csv` | 9           | Server Action de `datos` tras subir el archivo al bucket `importaciones` | Parsea, valida por fila contra la plantilla, llama `crear_lead` (misma regla de limbo/duplicados) o inserta vehículos; escribe el informe en `importaciones`.                                                                                                                                                         | ninguno                                                           |

## `storage-gc`: lo que ya existe y lo que falta

El protocolo vive en SQL y está probado en humo (`supabase/migrations/20261013000400_storage_gc.sql`):

- **Reclamar** (`storage_gc_reclamar`): encola los huérfanos del bucket `vehiculos` (objetos sin
  fila, con más de 24 h) y, de lo que lleva más de 24 h en la cola, recuenta con
  `storage_refcount` teniendo tomado el candado del objeto. Con referencias, lo saca de la cola;
  sin ellas, lo marca `reclamado_en` y lo devuelve. Un reclamo sin confirmar se vuelve a ofrecer
  pasada una hora.
- **Confirmar** (`storage_gc_confirmar`): saca de la cola lo reclamado que ya se borró.
- **Rescatar** (`storage_gc_rescatar`): lo llama el trigger de toda fila que nace referenciando
  un objeto. Toma el mismo candado: si el objeto está reclamado, la fila no nace.

Falta la función (un bucle sobre esas dos RPC) y su job. No se construyó en la parte 3 porque no
había cómo verificarla: no existe el proyecto en la nube, `pg_cron` y `pg_net` no están
habilitados, y Deno no entra en lint, typecheck ni e2e. Hasta entonces **nada se borra de
Storage**: cada foto eliminada deja ~0,35 MB. Al construirla: habilitar `pg_cron` y `pg_net`,
guardar el secreto en Vault, programar el job en una migración y sumar su fila a ESTADO.

Reglas: una función = un `index.ts` + `deno.json`; CORS sólo si la llama el navegador (ninguna de
estas); errores como valores `{ ok, error }` en JSON; logs sin datos personales.
