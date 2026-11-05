-- Los índices de las tres listas del panel del vehículo (paso 4.14-1), medidos con volumen en `medir-panel-ultima-cotizacion.sql`, `medir-panel-cierre-subasta.sql` y
-- `medir-historial-del-vehiculo.sql`:
--   - «Últ. cotización»: los cotizados de un origen, el más reciente primero. `id desc` y no `id`: el orden de la página es `cotizado_en desc, id desc`, y un índice
--     `(desc, asc)` no lo sirve. Parcial: un vehículo nunca cotizado no está en la lista (P4).
--   - «Cierre subasta»: las subastas vivas de un origen, la más próxima primero, sobre la columna generada `cierre_subasta_en` (nula en lo que no está vivo: el índice sólo guarda lo
--     vivo y no descarta nada). No el `(origen_id, estado_subasta, subasta_en)`: con dos estados, la página ordena.
--   - El historial de un vehículo y «Cotizado (n)» (su primera página con `limit n + 1`): reemplaza a `cotizaciones_vehiculo_idx`, sólo `(vehiculo_id)`, con el mismo prefijo y el
--     mismo predicado (sirve lo que lo usaba, `cotizacion_marcar_final`, y la FK). El `on delete set null` de la FK sigue sin un índice que lo sirva para las de la papelera (4-51).

create index vehiculos_cotizado_idx on public.vehiculos (origen_id, cotizado_en desc, id desc) where eliminado_en is null and cotizado_en is not null;

create index vehiculos_cierre_subasta_idx on public.vehiculos (origen_id, cierre_subasta_en, id) where eliminado_en is null and cierre_subasta_en is not null;

create index cotizaciones_vehiculo_creado_idx on public.cotizaciones (vehiculo_id, creado_en desc, id desc) where eliminado_en is null;
drop index public.cotizaciones_vehiculo_idx;
