-- Medición de `cotizacion_crear()` con 50.000 y con 250.000 cotizaciones (paso 4.10, prompt 2): `pnpm db:medir`, contra el Supabase LOCAL. Todo en una transacción que se revierte.
-- Arma su propio terreno (una dueña, una asesora «propios», sus leads y un vehículo, sobre la fórmula sembrada de `subasta_usa`) y las filas de relleno con la forma de las de
-- `medir-cotizaciones-lectura.sql` (que pide la siembra de volumen y no corre en `db:medir`), sin triggers ni auditoría.
--
-- Qué se mide: la llamada entera como `authenticated`, con el plan genérico (lo que arma plpgsql tras unas llamadas), `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas, con la
-- carga de la máquina (`/proc/loadavg`) anotada. Cuatro casos: una preventa con vehículo de la dueña, una preventa de la asesora («propios»: su lead sale de su cartera), la dueña cargando el
-- vehículo a mano (`vehiculo_crear` en la misma transacción) y el intento repetido (la vuelta temprana).
--
-- Asserta, con los dos volúmenes:
--   - el presupuesto de una llamada en ms Y en buffers (los topes salen de lo medido, con una vuelta de margen para una máquina ocupada; la tabla de abajo tiene las cifras);
--   - que no crece con N: con 250.000 el tiempo es a lo sumo `greatest(1,5 × el de 50.000, el de 50.000 + 3 ms)` y los buffers a lo sumo 1,2 × los de 50.000 + 20;
--   - que la llamada no recorre `cotizaciones`: ningún `Seq Scan` en `pg_stat_xact_user_tables` (se lee por su clave y por el índice de la final por vehículo);
--   - la guarda: una copia de la función que, además, recorre `cotizaciones` por una columna sin índice (lo que haría una búsqueda mal armada del intento o de la final) rompe esos presupuestos.
-- Las corridas anteriores de otras mediciones se revierten pero dejan tuplas muertas: se limpian antes de medir y después (VACUUM no corre dentro de una transacción: va fuera del begin).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null

do $$ begin
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 50.000 y 250.000 propias (pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir cotizacion_crear: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000e5'), ('asesora', '00000000-0000-0000-0000-0000000000e6');
insert into auth.users (id, email, raw_app_meta_data) select id, 'medir-crear-' || clave || '@ejemplo.com', '{"invitado": true}' from _p;
update public.perfiles set nombre = 'Medir crear', invitacion_aceptada_en = now() where id in (select id from _p);
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, r.id, true from _p p join public.roles r on r.clave = case p.clave when 'duena' then 'dueno' else 'asesor' end on conflict do nothing;
create temp table _o as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if;
end $$;
-- Los leads (el de la asesora, en su cartera), el vehículo (de los que casan con la tabla del transporte) y el id del intento repetido.
create temp table _x (clave text primary key, id uuid not null);
with l as (
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'Medir crear ' || p.clave, case p.clave when 'duena' then '78100001' else '78100002' end, p.id, (select id from public.origenes_lead where clave = 'web'), '{}' from _p p returning id, creado_por)
insert into _x select 'lead_' || p.clave, l.id from l join _p p on p.id = l.creado_por;
with v as (insert into public.vehiculos (origen_id, titulo, anio, atributos) select origen, 'Medir crear', 2025, '{"tipo_vehiculo": "autos"}' from _o returning id)
insert into _x select 'vehiculo', id from v;
insert into _x values ('repetido', gen_random_uuid());
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join _o on f.id = _o.formula;
grant select on _p, _x, _o to authenticated;
-- La hoja abierta de cada persona (4-27): la firma la base para quien llama y no se puede llamar como `authenticated`, así que se firma acá, una vez, como cada una. Sin esto la
-- llamada que se mide tendría que leer la hoja entera (`cotizacion_hoja()`), que se mide aparte.
create temp table _t (clave text primary key, abierta text not null);
do $$
declare p record;
begin
  for p in select clave, id from _p loop
    perform set_config('request.jwt.claim.sub', p.id::text, true);
    insert into _t values (p.clave, public._cotizacion_abierta_firmar((select origen from _o), (select formula from _o), now()));
  end loop;
end $$;
grant select on _t to authenticated;

-- Las filas de relleno (la dueña y la asesora, y tres más): g más nuevas cuanto mayor es g. Sin triggers (cada fila auditaría y numeraría).
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen,
         case when g % 10 = 1 then (select id from _p where clave = 'asesora') else (select id from _p where clave = 'duena') end,
         o.formula, s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Relleno ' || g,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g cross join _o o cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como authenticated, con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Una llamada en cada caso: la dueña y la asesora con su lead; los demás datos son los de `_x` y `_o`.
create function pg_temp.sql_de(p_caso text) returns text language plpgsql as $$
declare
  c_entradas constant text := '{"overrides": {"transporte_bolivia": 0, "nacionalizacion": 1201}}';
  v_o uuid := (select origen from _o); v_v uuid := (select id from _x where clave = 'vehiculo');
begin
  return case p_caso
    when 'preventa' then format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, %L::jsonb, %L, %L)', v_o, (select id from _x where clave = 'lead_duena'), c_entradas, (select abierta from _t where clave = 'duena'), v_v)
    when 'asesora' then format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, %L::jsonb, %L, %L)', v_o, (select id from _x where clave = 'lead_asesora'), c_entradas, (select abierta from _t where clave = 'asesora'), v_v)
    when 'a_mano' then format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, %L::jsonb, %L, null, jsonb_build_object(''id'', gen_random_uuid(), ''datos'', jsonb_build_object(''titulo'', ''Medir a mano'')))',
                              v_o, (select id from _x where clave = 'lead_duena'), c_entradas, (select abierta from _t where clave = 'duena'))
    when 'repetido' then format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L)', (select id from _x where clave = 'repetido'), v_o, (select id from _x where clave = 'lead_duena'), c_entradas, (select abierta from _t where clave = 'duena'), v_v)
    when 'mala' then format('select pg_temp.cotizacion_crear_mala(gen_random_uuid(), %L, %L, %L::jsonb, %L, %L)', v_o, (select id from _x where clave = 'lead_duena'), c_entradas, (select abierta from _t where clave = 'duena'), v_v)
  end;
end $$;

-- Una persona (los claims de la sesión: `set_config` sólo vale en esta transacción).
create function pg_temp.como(p_clave text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_clave);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- El peor caso (4.14-1): cada corrida reescribe la fila del vehículo (`cotizado_en`, su trigger). Con `now()` fijo en la transacción sólo la primera lo haría, así que antes de cada
-- corrida, fuera de lo medido, el vehículo vuelve a no estar cotizado (como postgres: authenticated no escribe `vehiculos`). `escrituras()`: las filas de `vehiculos` que lleva actualizadas la transacción.
create function pg_temp.sin_cotizar() returns void language sql security definer as $$
  update public.vehiculos set cotizado_en = null where id in (select id from _x where clave = 'vehiculo') and cotizado_en is not null
$$;
create function pg_temp.escrituras() returns bigint language sql as $$
  select coalesce(n_tup_upd, 0) from pg_stat_xact_user_tables where schemaname = 'public' and relname = 'vehiculos'
$$;

-- 7 corridas de EXPLAIN de la llamada: la mediana de ms y de buffers de las 5 últimas. Cada corrida reescribe `vehiculos` exactamente `p_escrituras` veces.
create function pg_temp.medir(p_sql text, p_escrituras int) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int; v_antes bigint; v_d bigint;
begin
  for i in 1 .. 7 loop
    perform pg_temp.sin_cotizar();
    v_antes := pg_temp.escrituras();
    execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
    v_d := pg_temp.escrituras() - v_antes;
    if v_d <> p_escrituras then raise exception 'la corrida % actualizó % filas de vehiculos y se esperaban %: %', i, v_d, p_escrituras, p_sql; end if;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b));
end $$;

-- Cuántos recorridos enteros de `cotizaciones` hace UNA llamada (el delta de `pg_stat_xact_user_tables`).
create function pg_temp.recorridos(p_sql text) returns bigint language plpgsql as $$
declare v_antes bigint; v_despues bigint; v_x text;
begin
  select coalesce(seq_scan, 0) into v_antes from pg_stat_xact_user_tables where relname = 'cotizaciones';
  execute p_sql into v_x;
  select coalesce(seq_scan, 0) into v_despues from pg_stat_xact_user_tables where relname = 'cotizaciones';
  return v_despues - v_antes;
end $$;

create temp table _med (fase text, caso text, ms numeric, buffers bigint, recorridos bigint);
grant all on _med to authenticated;

-- Una fase: los cuatro casos (y, si se pide, la guarda). El intento repetido necesita su cotización: se crea primero (esa llamada no se mide).
create function pg_temp.fase(p_fase text, p_con_mala boolean default false) returns void language plpgsql as $$
declare
  v_caso text; v_quien text; v_m jsonb; v_r bigint;
begin
  foreach v_caso in array array['preventa', 'asesora', 'a_mano', 'repetido'] loop
    v_quien := case v_caso when 'asesora' then 'asesora' else 'duena' end;
    perform pg_temp.como(v_quien);
    if v_caso = 'repetido' then
      execute pg_temp.sql_de('repetido');
    end if;
    -- Las que pagan la reescritura del vehículo: la preventa, la asesora y «a mano» (que además fija la fase de entrada del vehículo nuevo); el repetido vuelve antes.
    v_m := pg_temp.medir(pg_temp.sql_de(v_caso), case v_caso when 'repetido' then 0 when 'a_mano' then 2 else 1 end);
    v_r := pg_temp.recorridos(pg_temp.sql_de(v_caso));
    insert into _med values (p_fase, v_caso, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_r);
  end loop;
  if p_con_mala then
    perform pg_temp.como('duena');
    v_m := pg_temp.medir(pg_temp.sql_de('mala'), 1);
    v_r := pg_temp.recorridos(pg_temp.sql_de('mala'));
    insert into _med values (p_fase, 'mala', (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_r);
  end if;
end $$;

-- La copia mala: la función de verdad, más una búsqueda por una columna sin índice (`notas`) que recorre `cotizaciones` entera.
do $$
declare v_def text := pg_get_functiondef('public.cotizacion_crear(uuid, uuid, uuid, jsonb, text, uuid, jsonb, text, public.clase_cotizacion, boolean, boolean)'::regprocedure);
begin
  v_def := replace(v_def, 'FUNCTION public.cotizacion_crear(', 'FUNCTION pg_temp.cotizacion_crear_mala(');
  if position('perform pg_advisory_xact_lock(hashtextextended(''cotizacion_crear:'' || p_id::text, 0));' in v_def) = 0 then raise exception 'la copia mala: no está el candado del intento'; end if;
  v_def := replace(v_def, 'perform pg_advisory_xact_lock(hashtextextended(''cotizacion_crear:'' || p_id::text, 0));',
                   'perform pg_advisory_xact_lock(hashtextextended(''cotizacion_crear:'' || p_id::text, 0)); perform 1 from public.cotizaciones z where z.notas = ''no existe'' limit 1;');
  execute v_def;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 50000 then raise exception 'esperaba 50.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
end $$;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 2: 250.000 cotizaciones
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) < 250000 then raise exception 'esperaba al menos 250.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
end $$;
set local role authenticated;
select pg_temp.fase('250.000', true);
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo medido y sus presupuestos
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  c_ms constant numeric := 20;            -- ms por llamada (medido: 1,7 a 6,5; docs/RENDIMIENTO.md, «Paso 4.10 (2 de 3)»)
  c_buf constant bigint := 1500;          -- buffers por llamada (medido: 185 a 629)
  r record; g record; v_fallas text := '';
begin
  for r in select * from _med order by fase, caso loop
    raise notice 'medicion|cotizacion_crear, %, % (ms)|%', r.fase, r.caso, round(r.ms, 2);
    raise notice 'medicion|cotizacion_crear, %, % (buffers)|%', r.fase, r.caso, r.buffers;
    raise notice 'medicion|cotizacion_crear, %, % (recorridos de cotizaciones)|%', r.fase, r.caso, r.recorridos;
  end loop;
  for r in select * from _med where caso <> 'mala' loop
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s, %s: %s ms (tope %s)', r.fase, r.caso, round(r.ms, 2), c_ms); end if;
    if r.buffers > c_buf then v_fallas := v_fallas || format(E'\n  %s, %s: %s buffers (tope %s)', r.fase, r.caso, r.buffers, c_buf); end if;
    if r.recorridos <> 0 then v_fallas := v_fallas || format(E'\n  %s, %s: recorre cotizaciones %s veces', r.fase, r.caso, r.recorridos); end if;
  end loop;
  -- No crece con N.
  for g in select m2.caso, m1.ms as ms_50, m2.ms as ms_250, m1.buffers as b_50, m2.buffers as b_250
             from _med m1 join _med m2 on m2.caso = m1.caso and m2.fase = '250.000' where m1.fase = '50.000' loop
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s: %s ms con 250.000 contra %s con 50.000', g.caso, round(g.ms_250, 2), round(g.ms_50, 2)); end if;
    if g.b_250 > 1.2 * g.b_50 + 20 then v_fallas := v_fallas || format(E'\n  %s: %s buffers con 250.000 contra %s con 50.000', g.caso, g.b_250, g.b_50); end if;
  end loop;
  if v_fallas <> '' then raise exception 'cotizacion_crear rompe su presupuesto:%', v_fallas; end if;
  -- La guarda: la copia que recorre la tabla tiene que romper el presupuesto (el tiempo, los buffers o el recorrido de la tabla).
  select * into r from _med where caso = 'mala';
  raise notice 'medicion|Guarda, la copia que recorre cotizaciones, 250.000 (ms)|%', round(r.ms, 2);
  raise notice 'medicion|Guarda, la copia que recorre cotizaciones, 250.000 (recorridos de cotizaciones)|%', r.recorridos;
  if r.ms <= c_ms and r.buffers <= c_buf and r.recorridos = 0 then raise exception 'la guarda no muerde: la copia que recorre cotizaciones cumple el presupuesto (% ms, % buffers, % recorridos)', r.ms, r.buffers, r.recorridos; end if;
end $$;
rollback;
vacuum public.cotizaciones;
