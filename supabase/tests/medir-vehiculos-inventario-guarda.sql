-- La guarda de `medir-vehiculos-inventario.sql` (paso 4.16-2a, queda): «lo de hoy», la consulta de `buscarVehiculos()` por PostgREST sobre la tabla con la RLS, con
-- `limpieza_el` y la portada, para la «chica» («propios», 3 vehículos, lo más viejo de A, sin cartera), con 50.000 y con 250.000 vehículos vivos: recorre el origen entero
-- descartando lo ajeno, así que lo leído de `vehiculos` crece con N (4-23: de ≈ 1.744 a ≈ 6.647 buffers). Si no rompe la regla de crecimiento del costo (los bloques con
-- 250.000 ≤ 1,2 × los de 50.000 + 20), la medición de la función no prueba nada: «la guarda no muerde».
-- `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen; su terreno mínimo (la chica y el relleno), copiado. Todo en una transacción que se revierte.
-- Como `authenticated`, 7 corridas de `EXPLAIN (ANALYZE, BUFFERS)` y la mediana de las 5 últimas; lo leído por relación de `vehiculos` (`pg_stat_get_xact_blocks_fetched`).
-- Salidas: `medicion|…|número` y `nota|…|` por el runner (`scripts/medir-listado.mjs`).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_vehiculos + 1)::text, true) \g /dev/null
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)'; end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then raise exception 'la base ya trae demasiados vehículos vivos: la medición llega a 50.000 y 250.000 (pnpm db:reset)'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la guarda del inventario: %|', current_setting('medir.carga');
end $$;

-- El terreno, como postgres: la chica con «propios» y sus 3 vehículos, los más viejos de A.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000f3', 'medir-veh-chica@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir vehículos chica', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000f3';
with r as (insert into public.roles (clave, nombre) values ('medir_veh_propios', 'Medir vehículos propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'vehiculos.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000f3', id, true from r;
create temp table _o (clave text primary key, id uuid not null);
insert into _o select case clave when 'subasta_usa' then 'a' else 'b' end, id from public.origenes where clave in ('subasta_usa', 'oficina');
set local session_replication_role = replica;
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
select (select id from _o where clave = 'a'), 'Medir veh chica ' || g, '00000000-0000-0000-0000-0000000000f3', null, timestamptz '2000-01-01 00:00:00+00' + g * interval '1 second', now()
  from generate_series(1, 3) g;
set local session_replication_role = origin;
grant select on _o to authenticated;

-- El relleno: sin lead, de la dueña, mitad en A y mitad en B, más nuevo que la chica.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
  select (select id from _o where clave = case when g % 2 = 0 then 'a' else 'b' end), 'Medir veh relleno ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

create temp table _rel as select c.oid, c.relname::text as nombre from pg_class c where c.oid = 'public.vehiculos'::regclass
  union all select i.indexrelid, i.indexrelid::regclass::text from pg_index i where i.indrelid = 'public.vehiculos'::regclass;
create temp table _med (fase text primary key, ms numeric, buffers bigint, bloques jsonb, total numeric, filas bigint);
grant select on _rel to authenticated;
grant all on _med to authenticated;

-- «Lo de hoy», página 1: la consulta de `buscarVehiculos()` como la arma PostgREST (la de `medir-vehiculos-inventario.sql`, sin cursor).
create function pg_temp.hoy(p_o uuid) returns text language sql as $$
  select format('WITH pgrst_source AS (SELECT %s, "public"."limpieza_el"("vehiculos") AS "limpieza_el", COALESCE("i"."i", ''[]'') AS "vehiculos_imagenes" '
    || 'FROM "public"."vehiculos" LEFT JOIN LATERAL (SELECT json_agg("x")::jsonb AS "i" FROM (SELECT "vehiculos_imagenes_1"."ruta_miniatura" FROM "public"."vehiculos_imagenes" '
    || 'AS "vehiculos_imagenes_1" WHERE "vehiculos_imagenes_1"."vehiculo_id" = "vehiculos"."id" AND "vehiculos_imagenes_1"."es_portada" = true) "x") "i" ON TRUE '
    || 'WHERE "vehiculos"."origen_id" = %L ORDER BY "vehiculos"."creado_en" DESC, "vehiculos"."id" DESC LIMIT %s OFFSET 0) SELECT null::bigint AS total_result_set, '
    || 'pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), ''[]'') AS body FROM (SELECT * FROM pgrst_source) _postgrest_t',
    (select string_agg(format('"vehiculos".%I', c), ', ') from unnest(string_to_array('id,numero,origen_id,titulo,marca,modelo,anio,vin,lote,plataforma,url_origen,precio,'
      || 'precio_negociable,acepta_permuta,placado,kilometraje,categoria_id,fase_id,atributos,lead_id,publicado_web,destacado_web,precio_web,precio_web_hasta,precio_web_nota,'
      || 'creado_por,creado_en,actualizado_en', ',')) c),
    p_o, current_setting('medir.pagina'))
$$;

-- 7 corridas como la chica (las 2 primeras calientan): la mediana de ms y de buffers, el promedio de lo leído por relación y las filas de la página.
create function pg_temp.medir(p_fase text) returns void language plpgsql as $$
declare v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; b0 jsonb; b1 jsonb; v_suma jsonb := '{}'; k text; i int; v_sql text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000f3', 'role', 'authenticated')::text, true);
  v_sql := pg_temp.hoy((select id from _o where clave = 'a'));
  for i in 1 .. 7 loop
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
    execute 'explain (analyze, buffers, format json) ' || v_sql into v_plan;
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_buf := v_buf || (coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0));
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
  end loop;
  insert into _med select p_fase, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    x.b, (select sum(value::numeric) from jsonb_each_text(x.b)), (v_plan -> 0 -> 'Plan' ->> 'Actual Rows')::bigint
    from (select coalesce(jsonb_object_agg(key, round(value::numeric / 5, 1)), '{}') b from jsonb_each_text(v_suma) where value::numeric > 0) x;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local track_functions = 'all';
select pg_temp.rellenar(1, 50000 - (select count(*)::int from public.vehiculos where eliminado_en is null));
analyze public.vehiculos;
set local role authenticated;
select pg_temp.medir('50.000') \g /dev/null
reset role;
select pg_temp.rellenar(1000001, 1200000);
analyze public.vehiculos;
set local role authenticated;
select pg_temp.medir('250.000') \g /dev/null
reset role;

do $$
declare a _med := (select m from _med m where fase = '50.000'); b _med := (select m from _med m where fase = '250.000');
begin
  raise notice 'medicion|guarda · lo de hoy · chica · página 1 · 50.000 (ms)|%', round(a.ms, 2);
  raise notice 'medicion|guarda · lo de hoy · chica · página 1 · 250.000 (ms)|%', round(b.ms, 2);
  raise notice 'medicion|guarda · lo de hoy · chica · página 1 · 50.000 (bloques de vehiculos)|%', a.total;
  raise notice 'medicion|guarda · lo de hoy · chica · página 1 · 250.000 (bloques de vehiculos; tiene que pasar de 1,2 × los de 50.000 + 20)|%', b.total;
  raise notice 'nota|guarda · buffers del EXPLAIN: % con 50.000 y % con 250.000; por relación con 250.000: %; filas de la página: %|', a.buffers, b.buffers, b.bloques, b.filas;
  if a.total is null or b.total <= 1.2 * a.total + 20 then
    raise exception 'la guarda no muerde: lo de hoy de la chica no crece con N (% → % bloques de vehiculos)', a.total, b.total;
  end if;
end $$;
rollback;
vacuum public.vehiculos;
