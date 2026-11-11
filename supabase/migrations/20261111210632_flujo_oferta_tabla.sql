-- La oferta de transporte admite filas (paso 5.10-2). La tabla nació con una PK sobre las cuatro columnas y los checks
-- «puerto o naviera, nunca los dos»: ninguna fila cumplía las dos cosas. Sin PK (nadie apunta a sus filas y el reemplazo es por
-- flujo; el aviso INFO no_primary_key es esperado): la unicidad la dan dos índices parciales, y un btree por flujo repone el que
-- la PK les daba a la FK y al `delete … where flujo_id` del reemplazo.

alter table public.flujos_transporte_oferta drop constraint flujos_transporte_oferta_pkey;
alter table public.flujos_transporte_oferta alter column puerto_id drop not null;
alter table public.flujos_transporte_oferta alter column naviera_id drop not null;

create unique index flujos_transporte_oferta_puerto_key
  on public.flujos_transporte_oferta (flujo_id, tipo, puerto_id) where puerto_id is not null;
create unique index flujos_transporte_oferta_naviera_key
  on public.flujos_transporte_oferta (flujo_id, naviera_id) where naviera_id is not null;
create index flujos_transporte_oferta_flujo_id_idx on public.flujos_transporte_oferta (flujo_id);
