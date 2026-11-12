-- Las notas vivas de un vehículo, de la más nueva a la más vieja (paso 6.02-3, C1). Lo usa la lista de notas del panel de una unidad (6.04), por cursor
-- `(creado_en, id)`. `notas_vehiculo_id_idx` se queda: es entero y cubre la clave foránea también para las notas borradas (la cascada de un vehículo).
create index notas_vehiculo_vivas_idx on public.notas (vehiculo_id, creado_en desc, id desc) where eliminado_en is null;

comment on index public.notas_vehiculo_vivas_idx is
  'Las notas vivas de un vehículo por (creado_en desc, id desc): la lista del panel de una unidad con cursor (6.04). La FK la cubre notas_vehiculo_id_idx.';
