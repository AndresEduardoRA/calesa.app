-- La oferta de transporte no se escribe directo (paso 5.10-2): sólo por `flujo_oferta_guardar()`, que pasa por la versión del flujo, la
-- regla «transporte» y el reemplazo todo o nada. Quedan el `select` y la policy de leer; `service_role` conserva todo.

drop policy if exists "flujos_transporte_oferta: crear" on public.flujos_transporte_oferta;
drop policy if exists "flujos_transporte_oferta: borrar" on public.flujos_transporte_oferta;

revoke insert, update, delete on public.flujos_transporte_oferta from authenticated;

comment on table public.flujos_transporte_oferta is
  'Qué puertos y navieras ofrecen los selectores de un flujo. Lista vacía = todo. Filtra lo ofrecido, nunca invalida lo guardado. Se escribe '
  'sólo por flujo_oferta_guardar() (reemplazo todo o nada, con la regla transporte encendida); se lee con flujo_oferta().';
