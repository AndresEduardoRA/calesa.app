-- Lectura de vehículos: la policy pasa a ser de InitPlan y el listado gana su índice. Escrito a mano.
--
-- La policy de `…000200_rls_y_grants.sql` llamaba `(select alcance_de('vehiculos.ver', origen_id))`.
-- Envuelta en `(select …)` parece un InitPlan, pero nombra una columna de la fila: Postgres la
-- corre como SubPlan **por fila** (dos veces), y cada corrida vuelve a leer `mis_permisos()`.
-- Acá los orígenes permitidos se calculan una vez por sentencia y la fila sólo se compara con ellos.

-- En qué orígenes vale un permiso con, al menos, ese alcance. Con 'todos' devuelve los orígenes
-- donde alguna concesión lo da para todo; con 'propios', donde hay cualquier concesión (para lo
-- propio o para todo). Una concesión sin origen vale en todos, también en los inactivos: sus
-- vehículos se siguen viendo. Misma semántica que `alcance_de()`, de a muchos.
create or replace function public.origenes_con_alcance(p_clave text, p_minimo public.alcance_permiso)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(o.id), '{}'::uuid[])
  from public.origenes o
  where exists (
    select 1 from public.mis_permisos() m
    where m.clave = p_clave
      and (m.origen_id is null or m.origen_id = o.id)
      and (p_minimo = 'propios' or m.alcance = 'todos')
  );
$$;
revoke all on function public.origenes_con_alcance(text, public.alcance_permiso) from public, anon;
grant execute on function public.origenes_con_alcance(text, public.alcance_permiso) to authenticated;

-- Las dos subconsultas no nombran la fila: son InitPlan, una evaluación por sentencia. Sigue
-- escrita inline sobre las columnas (una función STABLE no ve la fila recién insertada).
drop policy "vehiculos: leer" on public.vehiculos;
create policy "vehiculos: leer" on public.vehiculos for select to authenticated using (
  eliminado_en is null
  and (
    origen_id = any ((select public.origenes_con_alcance('vehiculos.ver', 'todos'))::uuid[])
    or (
      origen_id = any ((select public.origenes_con_alcance('vehiculos.ver', 'propios'))::uuid[])
      and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads()))
    )
  )
);

-- El listado siempre es de un origen, de lo más nuevo a lo más viejo, paginado por keyset
-- `(creado_en, id)`. Bajo RLS los filtros sobre `atributos` no usan el GIN (`@>` no es leakproof y
-- no se evalúa antes que la policy): este índice es el que deja caminar el origen en orden y cortar.
create index if not exists vehiculos_origen_listado_idx
  on public.vehiculos (origen_id, creado_en desc, id desc) where eliminado_en is null;

-- El comentario de `…000100_rbac.sql` decía «todos los activos»: no filtra por `activo`, y es lo
-- que hace falta (un origen desactivado conserva sus vehículos a la vista).
comment on function public.origenes_con_permiso(text) is
  'Orígenes sobre los que la persona tiene un permiso, también los inactivos. Una concesión sin origen vale en todos.';
