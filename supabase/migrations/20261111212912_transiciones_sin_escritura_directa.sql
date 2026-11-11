-- Las transiciones y quién mueve se escriben sólo por RPC con la versión del flujo (paso 5.05): `transicion_crear`, `transicion_guardar`,
-- `transicion_eliminar`, `fase_roles_poner` y `transicion_roles_poner`. Fuera las policies de escritura y los grants de escritura de
-- `authenticated`; quedan RLS, `select` y las policies de leer.

drop policy if exists "fases_roles: borrar" on public.fases_roles;
drop policy if exists "fases_roles: crear" on public.fases_roles;
drop policy if exists "fases_transiciones: borrar" on public.fases_transiciones;
drop policy if exists "fases_transiciones: crear" on public.fases_transiciones;
drop policy if exists "fases_transiciones: editar" on public.fases_transiciones;
drop policy if exists "fases_transiciones_roles: borrar" on public.fases_transiciones_roles;
drop policy if exists "fases_transiciones_roles: crear" on public.fases_transiciones_roles;

revoke insert, update, delete on public.fases_transiciones, public.fases_roles, public.fases_transiciones_roles from authenticated;

comment on table public.fases_roles is
  'Roles que pueden mover una unidad HASTA esta fase. Sin filas = cualquiera con flujos.mover del origen. Manda la lista de la transición si existe '
  '(fases_transiciones_roles). Se escribe sólo por fase_roles_poner().';
comment on table public.fases_transiciones is
  'Las transiciones permitidas entre dos fases de un flujo, con la acción (el texto del botón) y la nota obligatoria. Se escribe sólo por '
  'transicion_crear(), transicion_guardar() y transicion_eliminar().';
comment on table public.fases_transiciones_roles is
  'Roles que pueden mover una unidad por esta transición. Si tiene filas, manda sobre la lista de la fase destino (fases_roles); sin filas, '
  'manda la de la fase. Se escribe sólo por transicion_roles_poner().';
