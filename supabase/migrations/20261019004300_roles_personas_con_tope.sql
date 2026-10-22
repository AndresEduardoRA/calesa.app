-- Roles cuenta las personas de cada rol hasta 1.001, no todas (5a-27, `docs/PLAN.md`).
--
-- La matriz de Roles leía `usuarios_roles(count)` por PostgREST: un `count(*)` exacto por rol, que crece con el equipo (un rol con 100.000
-- personas: 100.001 filas contadas y 1.026 buffers), y sin índice por `rol_id` (la llave es `(usuario_id, rol_id)`). Un número que se muestra
-- sale de `limit n + 1` (`.claude/rules/escala.md`): `roles_personas()` cuenta sobre un subselect con `limit 1001` por rol (1.001 =
-- `TOPE_DEL_CONTEO` + 1, como `equipo_vista_previa_baja`), por `usuarios_roles_rol_idx`, y la app escribe «más de 1.000 personas» con
-- `conteoEnFrase()`. Para eliminar un rol basta saber si tiene a alguien; la base lo vuelve a decidir (`rbac_eliminar_rol`).
--
-- `security invoker`: lee `usuarios_roles` con su RLS (la lee toda cuenta activa, como antes el embed). No otorga nada ni cambia quién ve qué.
-- Lo mide y lo asserta `supabase/tests/medir-equipo.sql` (un rol con 100.000 personas).

-- La FK `usuarios_roles.rol_id` no tenía índice (regla: índice en toda FK); el conteo por rol camina este.
create index if not exists usuarios_roles_rol_idx on public.usuarios_roles (rol_id);

-- Cuántas personas tiene cada rol, hasta 1.001 (más de 1.000 se escribe «más de 1.000»). Una fila por rol (decenas: `roles` es un catálogo).
-- La consulta de cada rol lleva el id como LITERAL (como `_equipo_lista_sql`, `…004100`): con el plan genérico de un subselect por rol el
-- planificador estima `personas / roles` por rol (50.000 con dos roles y 100.000 personas), elige recorrer la tabla y, para un rol de una sola
-- persona, la camina entera (7.492 buffers medidos). Con el literal mira las estadísticas de ese rol: un rol chico va por `usuarios_roles_rol_idx`
-- y uno que tiene casi a todos recorre hasta juntar 1.001 (unas pocas páginas).
create or replace function public.roles_personas()
returns table (rol_id uuid, personas int)
language plpgsql stable security invoker set search_path = '' as $$
declare
  r record;
begin
  for r in select ro.id from public.roles ro loop
    rol_id := r.id;
    execute format('select count(*)::int from (select 1 from public.usuarios_roles ur where ur.rol_id = %L limit 1001) x', r.id)  -- index: usuarios_roles_rol_idx
      into personas;
    return next;
  end loop;
end;
$$;
revoke all on function public.roles_personas() from public, anon;
grant execute on function public.roles_personas() to authenticated;
