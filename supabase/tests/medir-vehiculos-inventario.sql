-- Medición del costo de `vehiculos_inventario()` (paso 4.16-2a, cierra 4-23) con 50.000 y con 250.000 vehículos vivos: `pnpm db:medir:volumen`, contra el Supabase LOCAL
-- con la siembra de volumen (la dueña y los 50.000 leads «Volumen» de `sembrar.sql`). Todo en una transacción que se revierte. La forma del plan, en `-forma.sql`; la
-- guarda, en `-guarda.sql`; el costo fijo de cada llamada (4-77), en `-costo-fijo.sql`.
--
-- Qué se mide: la función como `authenticated`, con el plan normal (el texto se arma y se planea en cada llamada: sin plan genérico), `n = max_vehiculos + 1`, 7 llamadas por
-- caso y la mediana de las 5 últimas; lo leído de `vehiculos` por relación (el heap y cada índice: `pg_stat_get_xact_blocks_fetched`, el promedio de las 5), los recorridos
-- enteros del heap y las llamadas a funciones (`pg_stat_xact_user_functions`, la última). Los casos de C8 (página 1, profunda y «Anterior» desde la profunda):
--   - Pía («propios», 5.000 propios en A, sin cartera; profunda: su fila 2.000), también con búsqueda, fase, un atributo sin coincidencias y 500 alternativas (nota);
--   - la «chica» («propios», 3 propios, lo más viejo de A); Beto («propios», cartera de 50.000: la ruta `origen`); Vera («propios», cartera de 5.000 —los «Volumen» 5.001–
--     10.000—, 1.000 vehículos en B sobre ellos, de la dueña, entreverados con el relleno), también con un atributo; la dueña (nota); Pía y Beto con la condición por
--     defecto (sin las no ganadas).
-- Asserta, con los dos volúmenes:
--   - el tiempo: ≤ 10 ms; Pía con el atributo sin coincidencias ≤ 20; Vera ≤ 40;
--   - los índices de `vehiculos` con bloques, por persona (ningún otro): Pía y la chica `creador` (≤ 12 y ≤ 6 por página) y `pkey`; Beto `origen_listado` (≤ 20) y `pkey`;
--     Vera `lead_id`, `creador` y `pkey`;
--   - que no crece con N: los bloques de `vehiculos` (el heap y cada índice, `pg_stat_get_xact_blocks_fetched`) con 250.000 ≤ 1,2 × los de 50.000 + 20 (Vera, + |cartera| · d, con d
--     los niveles que ganó `vehiculos_lead_id_idx`; d > 1 cae); ningún recorrido entero de `vehiculos`. El tiempo NO se compara entre los dos volúmenes (4-82: «2.6 → 8.5 ms» con un
--     autovacuum activo y +568 MB de WAL confundió el ruido de una máquina compartida con crecimiento): va como dato (`detalle|crecimiento`) y lo acotan los topes absolutos de arriba;
--   - las llamadas: `mis_leads` 1 con `propios` y 0 con `origen`; `leads_cartera_corta` ≤ 1 (0 la dueña); `alcance_de` 0; `origenes_con_alcance` ≤ 10 e iguales con los dos
--     volúmenes; `en_cartera` 0 para Pía y la chica, ≤ 1.000 + 2 · n para Vera, y para Beto ≤ las filas que lee su ruta + p, con p las filas de la página con portada (sin
--     relectura en R1 y R2: la lateral de antes daba filas + n).
-- Nota (sin tope): «contra hoy», la página 1 de cada persona con la consulta de `buscarVehiculos()` por PostgREST sobre la tabla (con `limpieza_el` y la portada).
-- Con `-v contra_hoy=1` (el rojo del 4.16-2a) mide «lo de hoy» en lugar de la función, para la chica y Pía, con los mismos topes: tiene que caer.
-- Salidas: `medicion|…|número` y `nota|…|` por el runner (`scripts/medir-listado.mjs`); `detalle|…` con los bloques por relación y las llamadas, sólo en la salida de psql.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
\if :{?contra_hoy}
\else
\set contra_hoy 0
\endif
vacuum public.vehiculos, public.leads_asesores;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.pagina', (:max_vehiculos + 1)::text, true), set_config('medir.contra_hoy', :'contra_hoy', true) \g /dev/null
do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)'; end if;
  if (select count(*) from public.leads where nombre like 'Volumen %' and eliminado_en is null) < 40000 then raise exception 'faltan los 50.000 leads «Volumen» de la siembra'; end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then raise exception 'la base ya trae demasiados vehículos vivos: la medición llega a 50.000 y 250.000 (pnpm db:reset)'; end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el inventario: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres (el de medir-vehiculos-lectura.sql más Vera)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('pia', '00000000-0000-0000-0000-0000000000f1'),
  ('beto', '00000000-0000-0000-0000-0000000000f2'), ('chica', '00000000-0000-0000-0000-0000000000f3'), ('vera', '00000000-0000-0000-0000-0000000000f4');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'medir-veh-pia@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f2', 'medir-veh-beto@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f3', 'medir-veh-chica@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f4', 'medir-veh-vera@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir vehículos ' || id, invitacion_aceptada_en = now() where id in (select id from _p where clave <> 'duena');
with r as (insert into public.roles (clave, nombre) values ('medir_veh_propios', 'Medir vehículos propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'vehiculos.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, (select id from r), true from _p p where p.clave <> 'duena';
create temp table _o (clave text primary key, id uuid not null);
insert into _o select case clave when 'subasta_usa' then 'a' else 'b' end, id from public.origenes where clave in ('subasta_usa', 'oficina');
create temp table _cartera (i int primary key, lead uuid not null);
insert into _cartera select row_number() over (order by id), id from public.leads where nombre like 'Volumen %' and eliminado_en is null;
grant select on _p, _o to authenticated;
set local session_replication_role = replica;
-- Beto: compartido en todos los «Volumen» (la cartera larga: ruta `origen`). Vera: en los i 5.001–10.000 (5.000, el tope de la cartera corta: ruta `propios`).
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, desde, lead_creado_en, lead_reciente_en)
select c.lead, p.id, 'compartido', '00000000-0000-0000-0000-0000000000d1', now(), l.creado_en, coalesce(l.ultimo_seguimiento_en, l.creado_en)
  from _cartera c join public.leads l on l.id = c.lead join _p p on p.clave = 'beto' or (p.clave = 'vera' and c.i between 5001 and 10000);
-- Pía: 5.000 propios, lo más nuevo de A. Beto: 5.000 de su cartera (de la dueña), lo más nuevo de B. La chica: 3 propios, lo más viejo de A. Vera: 1.000 en B, uno por lead
-- (i 5.001–6.000), de la dueña, entreverados con el relleno.
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
select (select id from _o where clave = 'a'), ('Medir veh Pía ' || g)::text, '00000000-0000-0000-0000-0000000000f1'::uuid, null::uuid, now() + g * interval '1 second', now() from generate_series(1, 5000) g
union all select (select id from _o where clave = 'b'), 'Medir veh Beto ' || g, '00000000-0000-0000-0000-0000000000d1'::uuid, (select lead from _cartera where i = g), now() + g * interval '1 second', now()
  from generate_series(1, 5000) g
union all select (select id from _o where clave = 'a'), 'Medir veh chica ' || g, '00000000-0000-0000-0000-0000000000f3'::uuid, null::uuid, timestamptz '2000-01-01 00:00:00+00' + g * interval '1 second', now()
  from generate_series(1, 3) g
union all select (select id from _o where clave = 'b'), 'Medir veh Vera ' || g, '00000000-0000-0000-0000-0000000000d1'::uuid, (select lead from _cartera where i = 5000 + g),
       timestamptz '2020-01-01 00:00:00+00' + g * interval '400 seconds' + interval '5 seconds', now() from generate_series(1, 1000) g;
-- Lo que piden los casos: un quinto de lo de Pía en una fase; el atributo `km` en lo de Vera (la mitad ≥ 500).
create temp table _fase as select id from public.fases order by id limit 1;
-- Con los triggers apagados, `fase_desde` va a mano (check vehiculos_fase_desde_coherente: existe si y sólo si hay fase).
update public.vehiculos set fase_id = (select id from _fase), fase_desde = creado_en where titulo like 'Medir veh Pía %' and (substring(titulo from 'Pía (\d+)$'))::int % 5 = 0;
update public.vehiculos set atributos = jsonb_build_object('km', (substring(titulo from 'Vera (\d+)$'))::int) where titulo like 'Medir veh Vera %';
set local session_replication_role = origin;
grant select on _fase to authenticated;

-- El relleno: sin lead, de la dueña, mitad en A y mitad en B, entre los bloques nuevos y la chica.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
  select (select id from _o where clave = case when g % 2 = 0 then 'a' else 'b' end), 'Medir veh relleno ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

-- Los cursores profundos: Pía y Beto, la fila 2.000 de su bloque; la chica, su más nuevo; Vera, su 500.º.
create temp table _cur (quien text primary key, ts timestamptz not null, id uuid not null);
insert into _cur select q, v.creado_en, v.id from (values ('pia', 'Pía', 1999), ('beto', 'Beto', 1999), ('chica', 'chica', 0), ('vera', 'Vera', 499)) x (q, t, k)
  cross join lateral (select creado_en, id from public.vehiculos where titulo like 'Medir veh ' || x.t || ' %' order by creado_en desc, id desc offset x.k limit 1) v;
create temp table _rel as select c.oid, c.relname::text as nombre from pg_class c where c.oid = 'public.vehiculos'::regclass
  union all select i.indexrelid, i.indexrelid::regclass::text from pg_index i where i.indrelid = 'public.vehiculos'::regclass;
create temp table _caso (caso text primary key, quien text, origen text, cursor text, filtros jsonb, ruta text);
insert into _caso values
  ('pia · página 1', 'pia', 'a', 'primera', '[]', 'propios'), ('pia · profunda', 'pia', 'a', 'siguiente', '[]', 'propios'),
  ('pia · anterior', 'pia', 'a', 'anterior', '[]', 'propios'), ('pia · búsqueda', 'pia', 'a', 'primera', '[{"tipo":"busqueda","texto":"Pía 4"}]', 'propios'),
  ('pia · fase', 'pia', 'a', 'primera', jsonb_build_array(jsonb_build_object('tipo', 'columna_en', 'columna', 'fase_id', 'valores', jsonb_build_array((select id from _fase)), 'incluirNulo', false)), 'propios'),
  ('pia · atributo sin coincidencias', 'pia', 'a', 'primera', '[{"tipo":"atributos_contienen","alternativas":[{"zz_nadie":"x"}]}]', 'propios'),
  ('pia · 500 alternativas', 'pia', 'a', 'primera', jsonb_build_array(jsonb_build_object('tipo', 'atributos_contienen', 'alternativas',
     (select jsonb_agg(jsonb_build_object('zz_nadie', 'x' || g)) from generate_series(1, 500) g))), 'propios'),
  ('chica · página 1', 'chica', 'a', 'primera', '[]', 'propios'), ('chica · profunda', 'chica', 'a', 'siguiente', '[]', 'propios'),
  ('chica · anterior', 'chica', 'a', 'anterior', '[]', 'propios'),
  ('beto · página 1', 'beto', 'b', 'primera', '[]', 'origen'), ('beto · profunda', 'beto', 'b', 'siguiente', '[]', 'origen'),
  ('beto · anterior', 'beto', 'b', 'anterior', '[]', 'origen'),
  ('vera · página 1', 'vera', 'b', 'primera', '[]', 'propios'), ('vera · profunda', 'vera', 'b', 'siguiente', '[]', 'propios'),
  ('vera · anterior', 'vera', 'b', 'anterior', '[]', 'propios'),
  ('vera · atributo', 'vera', 'b', 'primera', '[{"tipo":"atributo_rango_numero","clave":"km","min":500,"max":null}]', 'propios'),
  ('duena · página 1', 'duena', 'a', 'primera', '[]', 'origen'),
  -- La condición que manda cada página por defecto (CONDICION_POR_DEFECTO de src/modules/vehiculos/entities/situacion.ts): sin las no ganadas, por la misma ruta.
  ('pia · por defecto', 'pia', 'a', 'primera', '[{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]', 'propios'),
  ('beto · por defecto', 'beto', 'b', 'primera', '[{"tipo":"situacion_fuera_de","valores":["no_ganada"]}]', 'origen');
-- Contra lo de hoy sólo van la chica y Pía, sin filtros (PostgREST sobre la tabla no tiene rutas).
delete from _caso where current_setting('medir.contra_hoy') = '1' and not (quien in ('pia', 'chica') and filtros = '[]');
grant select on _cur, _rel, _caso to authenticated;
create temp table _med (fase text, caso text, ms numeric, bloques jsonb, llamadas jsonb, seq bigint, filas bigint, portadas int);
create temp table _hoy (fase text, quien text, ms numeric, bloques numeric);
create temp table _d (fase text, d bigint);
grant all on _med, _hoy, _d to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición (corren como authenticated)
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- «Lo de hoy»: la consulta de `buscarVehiculos()` como la arma PostgREST (la tabla con la RLS, `limpieza_el` calculada, la portada embebida y el cursor de `aplicarCursor`).
create function pg_temp.hoy(p_o uuid, p_ts timestamptz, p_id uuid, p_atras boolean) returns text language sql as $$
  select format('WITH pgrst_source AS (SELECT %s, "public"."limpieza_el"("vehiculos") AS "limpieza_el", COALESCE("i"."i", ''[]'') AS "vehiculos_imagenes" '
    || 'FROM "public"."vehiculos" LEFT JOIN LATERAL (SELECT json_agg("x")::jsonb AS "i" FROM (SELECT "vehiculos_imagenes_1"."ruta_miniatura" FROM "public"."vehiculos_imagenes" '
    || 'AS "vehiculos_imagenes_1" WHERE "vehiculos_imagenes_1"."vehiculo_id" = "vehiculos"."id" AND "vehiculos_imagenes_1"."es_portada" = true) "x") "i" ON TRUE '
    || 'WHERE "vehiculos"."origen_id" = %L%s ORDER BY "vehiculos"."creado_en" %s, "vehiculos"."id" %s LIMIT %s OFFSET 0) SELECT null::bigint AS total_result_set, '
    || 'pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), ''[]'') AS body FROM (SELECT * FROM pgrst_source) _postgrest_t',
    (select string_agg(format('"vehiculos".%I', c), ', ') from unnest(string_to_array('id,numero,origen_id,titulo,marca,modelo,anio,vin,lote,plataforma,url_origen,precio,'
      || 'precio_negociable,acepta_permuta,placado,kilometraje,categoria_id,fase_id,atributos,lead_id,publicado_web,destacado_web,precio_web,precio_web_hasta,precio_web_nota,'
      || 'creado_por,creado_en,actualizado_en', ',')) c),
    p_o, case when p_ts is null then '' when p_atras then format(' AND "vehiculos"."creado_en" >= %1$L AND ("vehiculos"."creado_en" > %1$L OR "vehiculos"."id" > %2$L)', p_ts, p_id)
      else format(' AND "vehiculos"."creado_en" <= %1$L AND ("vehiculos"."creado_en" < %1$L OR "vehiculos"."id" < %2$L)', p_ts, p_id) end,
    case when p_atras then 'ASC' else 'DESC' end, case when p_atras then 'ASC' else 'DESC' end, current_setting('medir.pagina'))
$$;

-- Una consulta, 7 veces (las 2 primeras calientan): la mediana de ms, el promedio de lo leído por relación, los recorridos enteros y las llamadas de la última.
create function pg_temp.medir(p_sql text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; i int; b0 jsonb; b1 jsonb; l0 jsonb; l1 jsonb; s0 bigint; v_seq bigint := 0; v_suma jsonb := '{}'; v_llam jsonb; k text; v_calientes int := 0;
  v_heap constant oid := 'public.vehiculos'::regclass;
begin
  for i in 1 .. p_corridas loop
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l0 from pg_stat_xact_user_functions where schemaname = 'public';
    s0 := pg_stat_get_xact_numscans(v_heap);
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
    select coalesce(jsonb_object_agg(funcname, calls), '{}') into l1 from pg_stat_xact_user_functions where schemaname = 'public';
    v_seq := v_seq + pg_stat_get_xact_numscans(v_heap) - s0;
    continue when i <= least(2, p_corridas - 1);
    v_calientes := v_calientes + 1;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
    select coalesce(jsonb_object_agg(x, coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0)), '{}') into v_llam
      from jsonb_object_keys(l1) x where coalesce((l1 ->> x)::bigint, 0) - coalesce((l0 ->> x)::bigint, 0) > 0 and x not like '\_limpieza%' and x <> 'limpieza_el';
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    'bloques', (select coalesce(jsonb_object_agg(key, round(value::numeric / v_calientes, 1)), '{}') from jsonb_each_text(v_suma) where value::numeric > 0),
    'seq', v_seq, 'llamadas', v_llam, 'filas', (v_plan -> 0 -> 'Plan' ->> 'Actual Rows')::bigint);
end $$;

-- Un caso: la función (o lo de hoy con `contra_hoy`), con el cursor de la persona; p, las filas de la página con portada.
create function pg_temp.uno(p_fase text, c _caso) returns void language plpgsql as $$
declare v_o uuid := (select id from _o where clave = c.origen); v_cur _cur; v_q text; m jsonb; v_p int := 0;
begin
  perform pg_temp.como(c.quien);
  select * into v_cur from _cur where quien = c.quien and c.cursor <> 'primera';
  if current_setting('medir.contra_hoy') = '1' then
    v_q := pg_temp.hoy(v_o, v_cur.ts, v_cur.id, c.cursor = 'anterior');
  else
    v_q := format('select * from public.vehiculos_inventario(%L, %s, %L, %L, %L, %L)', v_o, current_setting('medir.pagina')::int - 1, c.filtros, v_cur.ts, v_cur.id, c.cursor = 'anterior');
    execute format('select count(*) filter (where portada_ruta is not null) from (%s) x', v_q) into v_p;
  end if;
  m := pg_temp.medir(v_q);
  insert into _med values (p_fase, c.caso, (m ->> 'ms')::numeric, m -> 'bloques', m -> 'llamadas', (m ->> 'seq')::bigint, (m ->> 'filas')::bigint, v_p);
end $$;

-- d: los bloques de `vehiculos_lead_id_idx` en la sonda de un lead de Vera.
create function pg_temp.sonda_lead(p_fase text) returns void language plpgsql as $$
declare v_lead uuid := (select lead from _cartera where i = 5500); v_b0 bigint; v_id uuid; v_ix constant oid := to_regclass('public.vehiculos_lead_id_idx');
begin
  select x.id into v_id from public.vehiculos x where x.lead_id = v_lead limit 1;
  v_b0 := pg_stat_get_xact_blocks_fetched(v_ix);
  select x.id into v_id from public.vehiculos x where x.lead_id = v_lead limit 1;
  insert into _d values (p_fase, pg_stat_get_xact_blocks_fetched(v_ix) - v_b0);
end $$;

create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
declare c _caso; q text; m jsonb;
begin
  perform pg_temp.sonda_lead(p_fase);
  set local role authenticated;
  for c in select * from _caso order by caso loop
    perform pg_temp.uno(p_fase, c);
  end loop;
  -- Contra hoy (nota): la página 1 de cada persona por PostgREST sobre la tabla.
  foreach q in array case when current_setting('medir.contra_hoy') = '1' then '{}'::text[] else array['pia', 'chica', 'beto', 'vera', 'duena'] end loop
    perform pg_temp.como(q);
    m := pg_temp.medir(pg_temp.hoy((select id from _o where clave = case when q in ('beto', 'vera') then 'b' else 'a' end), null, null, false));
    insert into _hoy values (p_fase, q, (m ->> 'ms')::numeric, (select sum(value::numeric) from jsonb_each_text(m -> 'bloques')));
  end loop;
  reset role;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

set local track_functions = 'all';
select pg_temp.rellenar(1, 50000 - (select count(*)::int from public.vehiculos where eliminado_en is null));
analyze public.vehiculos; analyze public.leads_asesores;
select pg_temp.fase('50.000') \g /dev/null
select pg_temp.rellenar(1000001, 1200000);
analyze public.vehiculos;
select pg_temp.fase('250.000') \g /dev/null

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  r record; v_f text := ''; v_t numeric; v_mis int; v_corta int; v_pag constant int := current_setting('medir.pagina')::int; v_ok text[]; x text;
  v_d bigint := (select max(d) filter (where fase = '250.000') - max(d) filter (where fase = '50.000') from _d);
begin
  raise notice 'medicion|d: niveles que ganó vehiculos_lead_id_idx de 50.000 a 250.000 (bloques)|%', v_d;
  if v_d is null or v_d > 1 then v_f := v_f || format(E'\n  d = %s > 1 (o no se midió)', v_d); end if;
  for r in select m.*, c.quien, c.ruta, (select sum(value::numeric) from jsonb_each_text(m.bloques)) as total from _med m join _caso c using (caso) order by fase, caso loop
    raise notice 'medicion|% · % (ms)|%', r.fase, r.caso, round(r.ms, 2);
    raise notice 'medicion|% · % (bloques de vehiculos)|%', r.fase, r.caso, coalesce(r.total, 0);
    raise notice 'detalle|% · % · filas %, portadas %|bloques %, recorridos %, llamadas %', r.fase, r.caso, r.filas, r.portadas, r.bloques, r.seq, r.llamadas;
    if r.seq > 0 then v_f := v_f || format(E'\n  %s · %s recorre vehiculos entera (%s)', r.fase, r.caso, r.seq); end if;
    -- Las llamadas.
    v_mis := case r.ruta when 'propios' then 1 else 0 end;   -- (un `if` termina en el primer `then`: los `case` van aparte)
    v_corta := case r.quien when 'duena' then 0 else 1 end;
    if coalesce((r.llamadas ->> 'mis_leads')::int, 0) <> v_mis or r.llamadas ? 'alcance_de' or coalesce((r.llamadas ->> 'leads_cartera_corta')::int, 0) > v_corta
       or coalesce((r.llamadas ->> 'origenes_con_alcance')::int, 0) > 10 then
      v_f := v_f || format(E'\n  %s · %s: llamadas %s', r.fase, r.caso, r.llamadas);
    end if;
    v_t := case r.quien when 'beto' then r.filas + r.portadas when 'vera' then 1000 + 2 * v_pag else 0 end;
    if coalesce((r.llamadas ->> 'en_cartera')::int, 0) > v_t then v_f := v_f || format(E'\n  %s · %s: en_cartera %s (tope %s)', r.fase, r.caso, r.llamadas ->> 'en_cartera', v_t); end if;
    continue when r.caso in ('duena · página 1', 'pia · 500 alternativas');
    -- El tiempo y los índices.
    v_t := case when r.quien = 'vera' then 40 when r.caso = 'pia · atributo sin coincidencias' then 20 else 10 end;
    if r.ms > v_t then v_f := v_f || format(E'\n  %s · %s: %s ms (tope %s)', r.fase, r.caso, round(r.ms, 1), v_t); end if;
    v_ok := array['vehiculos', 'vehiculos_pkey'] || case r.quien when 'beto' then array['vehiculos_origen_listado_idx'] when 'vera' then array['vehiculos_lead_id_idx', 'vehiculos_creador_idx']
                                                   else array['vehiculos_creador_idx'] end;
    -- Un índice vacío (sólo su metapágina; en la siembra, `vitrina` y `cierre_subasta`) no cuenta: el planificador lo lee al planear cada llamada (un btree vacío no guarda su altura).
    for x in select k from jsonb_object_keys(r.bloques) k where not k = any (v_ok) and pg_relation_size(('public.' || k)::regclass) > current_setting('block_size')::int loop
      v_f := v_f || format(E'\n  %s · %s usa %s', r.fase, r.caso, x);
    end loop;
    v_t := case when r.caso in ('pia · página 1', 'pia · profunda', 'pia · anterior') then 12 when r.quien = 'chica' then 6 end;
    if coalesce((r.bloques ->> 'vehiculos_creador_idx')::numeric, 0) > v_t then v_f := v_f || format(E'\n  %s · %s: creador %s (tope %s)', r.fase, r.caso, r.bloques ->> 'vehiculos_creador_idx', v_t); end if;
    if r.quien = 'beto' and coalesce((r.bloques ->> 'vehiculos_origen_listado_idx')::numeric, 0) > 20 then
      v_f := v_f || format(E'\n  %s · %s: origen_listado %s (tope 20)', r.fase, r.caso, r.bloques ->> 'vehiculos_origen_listado_idx');
    end if;
  end loop;
  -- No crece con N.
  for r in select a.caso, a.ms ms0, b.ms ms1, (select coalesce(sum(value::numeric), 0) from jsonb_each_text(a.bloques)) b0, (select coalesce(sum(value::numeric), 0) from jsonb_each_text(b.bloques)) b1,
                  a.llamadas ->> 'origenes_con_alcance' o0, b.llamadas ->> 'origenes_con_alcance' o1
             from _med a join _med b on b.caso = a.caso and a.fase = '50.000' and b.fase = '250.000' where a.caso not in ('duena · página 1', 'pia · 500 alternativas') loop
    raise notice 'detalle|crecimiento · %|ms % → %, bloques % → %', r.caso, round(r.ms0, 2), round(r.ms1, 2), r.b0, r.b1;
    v_t := case when r.caso like 'vera%' then 5000 * greatest(coalesce(v_d, 0), 0) else 0 end;
    if r.b1 > 1.2 * r.b0 + 20 + v_t then
      v_f := v_f || format(E'\n  %s crece con N en bloques: %s → %s', r.caso, r.b0, r.b1);
    end if;
    if r.o0 is distinct from r.o1 then v_f := v_f || format(E'\n  %s: origenes_con_alcance %s → %s', r.caso, r.o0, r.o1); end if;
  end loop;
  for r in select a.quien, a.ms h0, b.ms h1, a.bloques hb0, b.bloques hb1, (select ms from _med m where m.fase = '50.000' and m.caso = a.quien || ' · página 1') n0,
                  (select ms from _med m where m.fase = '250.000' and m.caso = a.quien || ' · página 1') n1
             from _hoy a join _hoy b on b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' loop
    raise notice 'nota|contra hoy · % · 50.000: hoy % ms (% bloques) · nuevo % ms; 250.000: hoy % ms (% bloques) · nuevo % ms|', r.quien, round(r.h0, 2), r.hb0, round(r.n0, 2),
      round(r.h1, 2), r.hb1, round(r.n1, 2);
  end loop;
  raise notice 'nota|índices vacíos de vehiculos (su metapágina, leída al planear): %|', (select string_agg(nombre, ', ') from _rel
    where nombre <> 'vehiculos' and pg_relation_size(oid) <= current_setting('block_size')::int);
  if current_setting('medir.contra_hoy') <> '1' then
    raise notice 'nota|Beto: p (filas de su página con portada) = % en este terreno; en_cartera ≤ filas + p|', (select max(portadas) from _med where caso like 'beto%');
  end if;
  if v_f <> '' then raise exception 'El inventario (vehiculos_inventario%) rompe su presupuesto:%', case when current_setting('medir.contra_hoy') = '1' then ', contra lo de hoy' else '' end, v_f; end if;
end $$;
rollback;
vacuum public.vehiculos, public.leads_asesores;
