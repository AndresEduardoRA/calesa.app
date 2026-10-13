# vehiculos

Inventario de vehículos por origen con atributos dinámicos, hasta 24 fotos optimizadas, interesados y vínculo a lead, vitrina web, papelera por lotes e importación desde Copart/IAAI vía apibara.

## Entra y sale

- Entra: alta manual o por link/lote (`supabase/functions/apibara`), edición en drawer por layout, fotos desde el navegador, filtros en URL.
- Sale: `getVehiculo()`, `buscarVehiculos(filtros, cursor)`, `<TarjetaVehiculo>`, `<SelectorVehiculo>`, `vincularLead()`. Lo consumen `cotizaciones`, `logistica`, `repuestos`, `agenda`, `chat`, `web`, `buscador`, `tablero`, `datos`.
- Depende de: `origenes` (layout), `flujos` (fase inicial y transiciones).

## Archivos clave

- `entities/vehiculo.ts` — tipo + schema Zod derivado del layout; `entities/filtros.ts` — esquema declarativo para `FilterShell` desde `origenes_campos.filtrable`.
- `infra/apibara.ts` — adaptador del proveedor (`GET /vehicles/urltodetails?url=` o `/vehicles/{lote}`, header `X-API-Key`); mapeo por `clave_apibara`.
- `infra/imagenes.ts` — compresión WebP ≤ 1600 px en el navegador, nombre por hash, commit diferido.
- `features/listado/`, `features/ficha/`, `features/alta/`, `features/fotos/`, `features/papelera/`, `features/vitrina/`.

## Tablas

`vehiculos`, `vehiculos_imagenes`, `vehiculos_interesados`, `vehiculos_vinculos`, `cola_gc_storage`, `lotes_papelera` (compartida con leads y cotizaciones).
RPC: `vehiculo_crear`, `vehiculo_guardar`, `vehiculo_vitrina`, `papelera_enviar/listar/restaurar/purgar`. `vehiculos` es de sólo lectura para la app (`supabase/migrations/20261013000200_vehiculos_escritura.sql`).

## No se rompe

- La ficha se escribe sólo por RPC: `vehiculo_crear(p_id, p_origen, p_datos)` y `vehiculo_guardar(p_vehiculo, p_actualizado_en_esperado, p_datos)`. Aceptan una lista cerrada de claves (las columnas comunes y `atributos`); `fase_id`, `publicado_web`, `lead_id` o `creado_por` se rechazan. No hay `.insert()` ni `.update()` sobre `vehiculos`.
- `fase_id` lo escribe `cambiar_fase` y, **sólo al nacer**, `vehiculo_crear`: el vehículo entra a la fase inicial cuando el flujo tiene exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes y sin roles que excluyan a quien crea. Si no, nace sin fase («Sin fase») y lo ubica quien mueve.
- Toda edición manda la versión (`actualizado_en`); otra versión es `PT409` con «<quién> cambió este vehículo hace <cuánto>» (el quién sale de `actividad`). Guardar lo que ya está guardado no es conflicto. Cualquier escritura sobre la fila (mover de fase, vitrina) mueve la versión.
- En `atributos` nunca se guarda un nulo: vaciar quita la clave. Lo de un campo desactivado se conserva y no se escribe.
- Vitrina = `publicado_web` **y** `fases.publica_web` **y** integración web activa; se escribe por RPC con permiso `vehiculos.vitrina` del origen.
- Máximo 24 imágenes (trigger `vehiculo_imagenes_tope`), una portada; borrar pasa por `storage_refcount` y `cola_gc_storage`.
- Papelera: 30 días, restaurar por lote, purga por cron; las policies RESTRICTIVE esconden lo que está en papelera.

## Ojo

- apibara no distingue plataforma para un lote suelto: con URL se usa `urltodetails`. 429 = cuota del mes agotada (no reintentar); 5xx sí, con tope.
- El scrape trae identidad del vehículo (VIN, año, daño, fotos, fecha de subasta), nunca números de la cotización.
- Un VIN repetido **bloquea**: es único entre todos los vehículos vivos, no por origen (`vehiculos_vin_unico`), así que puede chocar con uno que la persona no ve. El lote es único por origen y plataforma; la RPC lo frena también sin plataforma.
- El `id` del alta lo genera el navegador al abrir el formulario: reintentar tras perder la respuesta devuelve el mismo vehículo.
