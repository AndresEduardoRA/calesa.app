-- El costo fijo de cada llamada a `vehiculos_inventario()` (paso 4.16-2a, el número de 4-77): las `origenes_con_alcance()` que hace antes de elegir la ruta no dependen de
-- cuántos vehículos hay, sino de cuántos permisos tiene quien mira (`mis_permisos()` junta `usuarios_roles`, `roles_permisos` y `perfiles`). Sin volumen: corre igual sobre
-- la semilla y en `pnpm db:medir:volumen`, tras la guarda. Todo en una transacción que se revierte.
--
-- Dos personas sin vehículos: el «chico» (un rol con una sola concesión, `vehiculos.ver` «propios») y el «grande» (un rol con una concesión por cada clave de `permisos`:
-- una por origen si es por origen, una sin origen si no; contadas). De cada una, como `authenticated`, 7 corridas de
-- `EXPLAIN (ANALYZE, BUFFERS) select public.origenes_con_alcance('vehiculos.ver', 'todos')` y la mediana de las 5 últimas: ms y buffers, lo leído por relación de
-- `perfiles`, `usuarios_roles` y `roles_permisos` (el heap y sus índices, `pg_stat_get_xact_blocks_fetched`, el promedio de las 5) y las filas de `mis_permisos()`.
-- Sólo cae si el grande no tiene más filas de `mis_permisos()` que el chico (la medición no mediría lo que 4-77 pide); lo demás es nota, sin tope (arreglarlo pide `datos`).
-- Salidas: `medicion|4-77 · <rol> · …|número` y `nota|4-77 · <rol> · …|` por el runner (`scripts/medir-listado.mjs`).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.perfiles, public.usuarios_roles, public.roles_permisos;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
do $$ begin
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el costo fijo del inventario (4-77): %|', current_setting('medir.carga');
end $$;

-- Las personas, como postgres, con los triggers encendidos (el de `auth.users` crea el perfil).
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('chico', '00000000-0000-0000-0000-0000000004c1'), ('grande', '00000000-0000-0000-0000-0000000004c2');
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000004c1', 'medir-477-chico@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000004c2', 'medir-477-grande@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir 4-77 ' || id, invitacion_aceptada_en = now() where id in (select id from _p);
insert into public.roles (clave, nombre) values ('medir_477_chico', 'Medir 4-77 chico'), ('medir_477_grande', 'Medir 4-77 grande');
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select (select id from public.roles where clave = 'medir_477_chico'), 'vehiculos.ver', null::uuid, 'propios'::public.alcance_permiso
union all
select (select id from public.roles where clave = 'medir_477_grande'), p.clave, o.id, 'todos'::public.alcance_permiso
  from public.permisos p left join public.origenes o on p.por_origen;
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select p.id, r.id, true from _p p join public.roles r on r.clave = 'medir_477_' || p.clave;
do $$ begin
  if (select count(*) from public.perfiles where id in (select id from _p) and activo and not bloqueado) <> 2 then raise exception 'las personas de la medición no tienen perfil activo'; end if;
end $$;
grant select on _p to authenticated;

-- Las relaciones de `mis_permisos()`: cada tabla con sus índices, sumados por tabla.
create temp table _rel as select t.relname::text as tabla, c.oid from pg_class t join lateral (select t.oid union all select indexrelid from pg_index where indrelid = t.oid) c (oid) on true
 where t.oid in ('public.perfiles'::regclass, 'public.usuarios_roles'::regclass, 'public.roles_permisos'::regclass);
create temp table _med (clave text primary key, ms numeric, buffers bigint, bloques jsonb, filas bigint, concesiones bigint);
grant select on _rel to authenticated;
grant all on _med to authenticated;

create function pg_temp.medir(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien); v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; b0 jsonb; b1 jsonb; v_suma jsonb := '{}'; k text; i int;
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  for i in 1 .. 7 loop
    select jsonb_object_agg(tabla, s) into b0 from (select tabla, sum(pg_stat_get_xact_blocks_fetched(oid)) s from _rel group by tabla) x;
    execute 'explain (analyze, buffers, format json) select public.origenes_con_alcance(''vehiculos.ver'', ''todos'')' into v_plan;
    select jsonb_object_agg(tabla, s) into b1 from (select tabla, sum(pg_stat_get_xact_blocks_fetched(oid)) s from _rel group by tabla) x;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_buf := v_buf || (coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0));
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
  end loop;
  insert into _med values (p_quien, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    (select jsonb_object_agg(key, round(value::numeric / 5, 1)) from jsonb_each_text(v_suma)), (select count(*) from public.mis_permisos()),
    (select count(*) from public.roles_permisos rp join public.roles r on r.id = rp.rol_id where r.clave = 'medir_477_' || p_quien));
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local track_functions = 'all';
set local role authenticated;
select pg_temp.medir('chico') \g /dev/null
select pg_temp.medir('grande') \g /dev/null
reset role;

do $$
declare r record; t text;
begin
  for r in select * from _med order by clave loop
    raise notice 'medicion|4-77 · % · origenes_con_alcance() (ms)|%', r.clave, round(r.ms, 3);
    raise notice 'medicion|4-77 · % · buffers del EXPLAIN|%', r.clave, r.buffers;
    raise notice 'medicion|4-77 · % · filas de mis_permisos()|%', r.clave, r.filas;
    foreach t in array array['perfiles', 'usuarios_roles', 'roles_permisos'] loop
      raise notice 'medicion|4-77 · % · bloques de % (con sus índices)|%', r.clave, t, coalesce((r.bloques ->> t)::numeric, 0);
    end loop;
    raise notice 'nota|4-77 · % · % concesiones: % filas de mis_permisos(), % buffers, % ms; bloques %|', r.clave, r.concesiones, r.filas, r.buffers, round(r.ms, 3), r.bloques;
  end loop;
  if (select filas from _med where clave = 'grande') <= (select filas from _med where clave = 'chico') then
    raise exception 'el costo fijo no mide lo de 4-77: el grande no tiene más filas de mis_permisos() que el chico (% y %)',
      (select filas from _med where clave = 'grande'), (select filas from _med where clave = 'chico');
  end if;
end $$;
rollback;
vacuum public.perfiles, public.usuarios_roles, public.roles_permisos;
