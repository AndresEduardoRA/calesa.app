-- El cierre de una subasta viva (paso 4.14-1): `vehiculos.cierre_subasta_en`, la que ordena «Cierre subasta» en el panel del vehículo. Es una columna generada: el fin de una
-- temporizada (`subasta_fin_en`) y, si no lo hay, la fecha de la subasta (`subasta_en`), como ordena la limpieza (P7); sólo si la subasta está abierta o en vivo, y nula en lo
-- demás (P5: una terminada o una vendida no tiene cierre). Va en una columna y no en un índice de expresión porque el panel lee por PostgREST, que no ordena ni filtra por una
-- expresión y manda el estado como parámetro (un `estado_subasta in (…)` en el predicado de un índice parcial no se probaría). Postgres la recalcula en cada escritura (importar,
-- refrescar, editar); nadie la escribe, y la ve quien ve el vehículo, como las columnas de las que sale. Es la primera columna generada de la base: reescribe `vehiculos` una vez.

alter table public.vehiculos add column cierre_subasta_en timestamptz
  generated always as (case when estado_subasta in ('abierta', 'en_vivo') then coalesce(subasta_fin_en, subasta_en) end) stored;

comment on column public.vehiculos.cierre_subasta_en is
  'Cuándo cierra la subasta viva (abierta o en vivo): subasta_fin_en y, si no hay, subasta_en; nula si no está viva o no tiene fecha. Generada: nadie la escribe.';
