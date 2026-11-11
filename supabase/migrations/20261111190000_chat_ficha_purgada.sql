-- Una ficha cuya referencia se purgó no frena la purga (paso 7.08-2, fix tras el informe).
--
-- Las FK de ficha `vehiculo_id`, `lead_id` y `cotizacion_id` son `on delete set null` (base) y las papeleras borran de verdad leads, vehículos y
-- cotizaciones (`papelera_purgar_lote`, `cotizaciones_papelera_purgar`). Con `mensajes_check` exigiendo la FK de su tipo, purgar algo que una
-- ficha nombra daba `check_violation` y frenaba el lote. Ahora una ficha de vehículo, lead o cotización puede quedar sin su referencia (la
-- pantalla muestra «ya no existe», como el placeholder de quien no la ve). `mensaje_enviar` la sigue poniendo siempre. Tarea y evento no cambian:
-- sus FK son `restrict`.

alter table public.mensajes drop constraint mensajes_check;
alter table public.mensajes add constraint mensajes_check check (
     (tipo = 'texto' and (cuerpo is not null or eliminado_en is not null))
  or (tipo = 'evento' and evento_id is not null)
  or (tipo = 'tarea' and tarea_id is not null)
  or tipo in ('vehiculo', 'lead', 'cotizacion')
);
