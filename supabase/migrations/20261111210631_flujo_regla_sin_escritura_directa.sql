-- Las reglas de un flujo no se escriben directo (paso 5.10-1): sólo por `flujo_regla_cambiar()`, que pasa por la versión del flujo y el
-- catálogo del ámbito. Quedan el `select` y la policy de leer; `service_role` conserva todo; `origen_crear_flujo()` (definer) sigue.

drop policy if exists "flujos_reglas: crear" on public.flujos_reglas;
drop policy if exists "flujos_reglas: editar" on public.flujos_reglas;
drop policy if exists "flujos_reglas: borrar" on public.flujos_reglas;

revoke insert, update, delete on public.flujos_reglas from authenticated;

comment on table public.flujos_reglas is
  'Capacidades del flujo soportadas por el CÓDIGO y encendidas por DATO. Sin fila = apagada. Una regla apagada no se puede marcar en ninguna '
  'fase (trigger). Se escribe sólo por flujo_regla_cambiar(); apagar con uso (fases marcadas o, en esperas, requisitos de espera) → 23514.';
