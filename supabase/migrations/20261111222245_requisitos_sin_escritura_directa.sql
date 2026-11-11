-- Los requisitos de fase no se escriben directo (paso 5.07-1): se crean, guardan, mueven y eliminan por `requisito_crear()`,
-- `requisito_guardar()`, `requisito_mover()` y `requisito_eliminar()`, que pasan por la versión del flujo. Quedan el `select` y la policy
-- «leer»; `service_role` conserva todo.

drop policy if exists "fases_requisitos: crear" on public.fases_requisitos;
drop policy if exists "fases_requisitos: editar" on public.fases_requisitos;
drop policy if exists "fases_requisitos: borrar" on public.fases_requisitos;

revoke insert, update, delete, truncate, references, trigger on public.fases_requisitos from authenticated;
