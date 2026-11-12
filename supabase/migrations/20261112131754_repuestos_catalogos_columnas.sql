-- Un valor de catálogo de repuestos no cambia de catálogo ni de id (paso 8.10-1, C5; H1 de 8.08-2). El UPDATE pasa de tabla a columnas: sólo lo
-- que la app escribe (`nombre`, `activo`, `orden`). La policy de UPDATE (repuestos.configurar) no cambia.

revoke update on public.repuestos_catalogos from authenticated;
grant update (nombre, activo, orden) on public.repuestos_catalogos to authenticated;
