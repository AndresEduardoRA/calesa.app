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
RPC: `vehiculo_vitrina`, `papelera_enviar/listar/restaurar/purgar`.

## No se rompe

- `fase_id` sólo lo escribe `cambiar_fase` (módulo `flujos`): nunca `.update({ fase_id })`.
- Vitrina = `publicado_web` **y** `fases.publica_web` **y** integración web activa; se escribe por RPC con permiso `vehiculos.vitrina` del origen.
- Máximo 24 imágenes (trigger `vehiculo_imagenes_tope`), una portada; borrar pasa por `storage_refcount` y `cola_gc_storage`.
- Papelera: 30 días, restaurar por lote, purga por cron; las policies RESTRICTIVE esconden lo que está en papelera.

## Ojo

- apibara no distingue plataforma para un lote suelto: con URL se usa `urltodetails`. 429 = cuota del mes agotada (no reintentar); 5xx sí, con tope.
- El scrape trae identidad del vehículo (VIN, año, daño, fotos, fecha de subasta), nunca números de la cotización.
- Un VIN repetido avisa, no bloquea: el usuario decide con el existente a la vista.
