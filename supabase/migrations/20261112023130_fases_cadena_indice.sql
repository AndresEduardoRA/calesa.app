-- La cadena de logística por índice (paso 6.02-2, C1). Una columna de la cadena es una fase de un origen ordenada por desde cuándo está ahí
-- (`fase_desde`, lo más viejo arriba) y paginada por cursor `(fase_desde, id)`: `logistica_cadena` y `logistica_cadena_columna` la leen de este índice
-- sin ordenar. «Sin fase» (`fase_id is null`) sale del mismo índice, por `id`. Reemplaza a `vehiculos_origen_fase_idx (origen_id, fase_id)`, que es su
-- prefijo con el mismo predicado y nadie nombra: dos índices sobre el mismo prefijo encarecen cada escritura de `vehiculos`.

create index vehiculos_cadena_idx on public.vehiculos (origen_id, fase_id, fase_desde, id) where eliminado_en is null;

drop index public.vehiculos_origen_fase_idx;

comment on index public.vehiculos_cadena_idx is
  'La cadena de logística (6.02-2): una columna = (origen_id, fase_id) ordenada por (fase_desde, id); «Sin fase» = fase_id nulo, por id.';
