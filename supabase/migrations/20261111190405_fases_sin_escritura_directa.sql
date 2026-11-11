-- La configuración de un flujo no se escribe directo (paso 5.01-1): las fases se crean y guardan por `fase_crear()` y `fase_guardar()`, que
-- pasan por la versión del flujo; el flujo sólo lo cambian las RPC `security definer` (`origen_guardar`, `_flujo_tocar`). Quedan el `select`
-- y las policies de leer; `service_role` conserva todo. `fase_eliminar()` (definer) sigue hasta que el 5.01-2 la reemplace con versión.

drop policy if exists "fases: crear" on public.fases;
drop policy if exists "fases: editar" on public.fases;
drop policy if exists "flujos: editar" on public.flujos;

revoke insert, update on public.fases from authenticated;
revoke update on public.flujos from authenticated;
