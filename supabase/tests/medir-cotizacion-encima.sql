-- Medición de `cotizacion_encima()` con 50.000 y con 250.000 cotizaciones (paso 4.15-2): `pnpm db:medir`, contra el Supabase LOCAL. Todo en una transacción que se revierte.
-- Arma su terreno (una dueña y una asesora «propios», sus leads y un vehículo, sobre la fórmula sembrada de `subasta_usa`) y las filas de relleno de
-- `medir-cotizacion-hoja-guardada.sql`, sin triggers. Cada corrida cotiza encima de una anterior distinta (una versión nueva viva por anterior, P3): 8 por caso y fase,
-- escritas como postgres con lo que `medir-cotizacion-guardar.sql` tipea (los dos overrides sin los que la fórmula del seed no calcula el total).
--
-- Qué se mide: la llamada entera como `authenticated`, con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas. Cada corrida escribe de verdad (la
-- cotización nueva, su auditoría y `cotizado_en`). Asserta, con los dos volúmenes:
--   - el presupuesto en ms y en buffers, el de `cotizacion_crear` (≤ 20 ms y 1.500 buffers; lo medido, con su fecha, en «Lo medido»);
--   - que no crece con N: con 250.000 el tiempo es a lo sumo `greatest(1,5 × el de 50.000, el de 50.000 + 3 ms)` y los buffers a lo sumo 1,2 × los de 50.000 + 20;
--   - que no recorre `cotizaciones` (la anterior por su clave, la versión nueva viva por `cotizaciones_encima_unica`);
--   - la guarda: una copia que busca la versión nueva viva por una expresión sin índice recorre `cotizaciones` y rompe esos presupuestos.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null

do $$ begin
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 50.000 y 250.000 propias (pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir cotizacion_encima: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000eb'), ('asesora', '00000000-0000-0000-0000-0000000000ec');
insert into auth.users (id, email, raw_app_meta_data) select id, 'medir-encima-' || clave || '@ejemplo.com', '{"invitado": true}' from _p;
update public.perfiles set nombre = 'Medir encima', invitacion_aceptada_en = now() where id in (select id from _p);
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, r.id, true from _p p join public.roles r on r.clave = case p.clave when 'duena' then 'dueno' else 'asesor' end on conflict do nothing;
create temp table _o as select o.id as origen, f.id as formula from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada' where o.clave = 'subasta_usa';
do $$ begin
  if (select count(*) from _o) <> 1 then raise exception 'esperaba el origen sembrado subasta_usa con su fórmula publicada'; end if;
end $$;
-- Un lead por persona (el de la asesora, en su cartera: lo creó ella) y un vehículo.
create temp table _x (clave text primary key, id uuid not null);
with l as (
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'Medir encima ' || p.clave, case p.clave when 'duena' then '78400001' else '78400002' end, p.id, (select id from public.origenes_lead where clave = 'web'), '{}' from _p p returning id, creado_por)
insert into _x select 'lead_' || p.clave, l.id from l join _p p on p.id = l.creado_por;
with v as (insert into public.vehiculos (origen_id, titulo, anio, atributos) select origen, 'Medir encima', 2025, '{"tipo_vehiculo": "autos"}' from _o returning id)
insert into _x select 'vehiculo', id from v;
create temp table _snap as select (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
                                  (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join _o on f.id = _o.formula;
grant select on _p, _x, _o to authenticated;

-- Las filas de relleno (de la dueña y de la asesora), sin triggers.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen, case when g % 10 = 1 then (select id from _p where clave = 'asesora') else (select id from _p where clave = 'duena') end,
         o.formula, s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Relleno ' || g,
         timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g cross join _o o cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- Las anteriores de una fase: 8 por persona (la dueña con su lead; la asesora con el suyo), con el snapshot de relleno y los dos overrides.
create temp table _a (fase text, caso text, n int, id uuid not null, primary key (fase, caso, n));
grant all on _a to authenticated;
create function pg_temp.anteriores(p_fase text) returns void language plpgsql as $$
declare v_caso text; i int; v_id uuid;
begin
  foreach v_caso in array array['duena', 'asesora', 'mala'] loop
    for i in 1 .. 8 loop
      insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
      select o.origen, (select id from _x where clave = case v_caso when 'asesora' then 'lead_asesora' else 'lead_duena' end), (select id from _x where clave = 'vehiculo'),
             (select id from _p where clave = case v_caso when 'asesora' then 'asesora' else 'duena' end), o.formula,
             s.valores || '{"transporte_bolivia": 0, "nacionalizacion": 1201}', s.fuentes || '{"transporte_bolivia": "override", "nacionalizacion": "override"}',
             '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Anterior ' || v_caso || ' ' || i
        from _o o cross join _snap s returning id into v_id;
      insert into _a values (p_fase, v_caso, i, v_id);
    end loop;
  end loop;
end $$;

create function pg_temp.como(p_clave text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_clave);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.sql_de(p_fase text, p_caso text, p_n int) returns text language sql as $$
  select format('select %s(gen_random_uuid(), %L)', case p_caso when 'mala' then 'pg_temp.encima_mala' else 'public.cotizacion_encima' end,
                (select id from _a where fase = p_fase and caso = p_caso and n = p_n))
$$;

-- 7 corridas (cada una sobre su anterior): la mediana de ms y de buffers de las 5 últimas. La 8.ª, fuera del EXPLAIN, cuenta los recorridos de `cotizaciones`.
create temp table _med (fase text, caso text, ms numeric, buffers bigint, seq bigint);
grant all on _med to authenticated;
create function pg_temp.fase(p_fase text, p_con_mala boolean default false) returns void language plpgsql as $$
declare v_caso text; v_plan jsonb; v_ms numeric[]; v_buf bigint[]; i int; v_seq bigint; v_x text;
begin
  foreach v_caso in array case when p_con_mala then array['duena', 'asesora', 'mala'] else array['duena', 'asesora'] end loop
    perform pg_temp.como(case v_caso when 'asesora' then 'asesora' else 'duena' end);
    v_ms := '{}'; v_buf := '{}';
    for i in 1 .. 7 loop
      execute 'explain (analyze, buffers, format json) ' || pg_temp.sql_de(p_fase, v_caso, i) into v_plan;
      continue when i <= 2;
      v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
      v_buf := v_buf || (coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0));
    end loop;
    select coalesce(sum(seq_scan), 0) into v_seq from pg_stat_xact_user_tables where relname = 'cotizaciones';
    execute pg_temp.sql_de(p_fase, v_caso, 8) into v_x;
    v_seq := (select coalesce(sum(seq_scan), 0) from pg_stat_xact_user_tables where relname = 'cotizaciones') - v_seq;
    insert into _med values (p_fase, v_caso, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                             (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b), v_seq);
  end loop;
end $$;

-- La copia mala: la función de verdad, con la versión nueva viva buscada por `cotizacion_padre_id::text` (sin índice): recorre `cotizaciones`.
do $$
declare v_def text := pg_get_functiondef('public.cotizacion_encima(uuid, uuid)'::regprocedure);
begin
  if position('where x.cotizacion_padre_id = p_anterior and' in v_def) = 0 then raise exception 'la copia mala: no está la búsqueda de la versión nueva'; end if;
  execute replace(replace(v_def, 'FUNCTION public.cotizacion_encima(', 'FUNCTION pg_temp.encima_mala('),
                  'where x.cotizacion_padre_id = p_anterior and', 'where x.cotizacion_padre_id::text = p_anterior::text and');
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones; fase 2: 250.000
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 49976);
select pg_temp.anteriores('50.000');
analyze public.cotizaciones;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('50.000');
reset role;

select pg_temp.rellenar(50001, 249976);
select pg_temp.anteriores('250.000');
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
  c_ms constant numeric := 20;            -- ms por llamada, el de cotizacion_crear (medido el 2026-11-04: 8,0 a 8,4)
  c_buf constant bigint := 1500;          -- buffers por llamada, el de cotizacion_crear (medido el 2026-11-04: 284 a 292)
  r record; g record; v_fallas text := '';
begin
  for r in select * from _med order by fase, caso loop
    raise notice 'medicion|cotizacion_encima, %, % (ms)|%', r.fase, r.caso, round(r.ms, 2);
    raise notice 'medicion|cotizacion_encima, %, % (buffers)|%', r.fase, r.caso, r.buffers;
    raise notice 'medicion|cotizacion_encima, %, % (recorridos de cotizaciones)|%', r.fase, r.caso, r.seq;
  end loop;
  for r in select * from _med where caso <> 'mala' loop
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s, %s: %s ms (tope %s)', r.fase, r.caso, round(r.ms, 2), c_ms); end if;
    if r.buffers > c_buf then v_fallas := v_fallas || format(E'\n  %s, %s: %s buffers (tope %s)', r.fase, r.caso, r.buffers, c_buf); end if;
    if r.seq <> 0 then v_fallas := v_fallas || format(E'\n  %s, %s: recorre cotizaciones %s veces', r.fase, r.caso, r.seq); end if;
  end loop;
  for g in select m2.caso, m1.ms as ms_50, m2.ms as ms_250, m1.buffers as b_50, m2.buffers as b_250
             from _med m1 join _med m2 on m2.caso = m1.caso and m2.fase = '250.000' where m1.fase = '50.000' loop
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s: %s ms con 250.000 contra %s con 50.000', g.caso, round(g.ms_250, 2), round(g.ms_50, 2)); end if;
    if g.b_250 > 1.2 * g.b_50 + 20 then v_fallas := v_fallas || format(E'\n  %s: %s buffers con 250.000 contra %s con 50.000', g.caso, g.b_250, g.b_50); end if;
  end loop;
  if v_fallas <> '' then raise exception 'cotizacion_encima rompe su presupuesto:%', v_fallas; end if;
  select * into r from _med where caso = 'mala';
  raise notice 'medicion|Guarda, la versión nueva buscada sin índice, 250.000 (ms)|%', round(r.ms, 2);
  if r.ms <= c_ms and r.buffers <= c_buf and r.seq = 0 then raise exception 'la guarda no muerde: la copia sin índice cumple el presupuesto (% ms, % buffers, % recorridos)', r.ms, r.buffers, r.seq; end if;
end $$;
rollback;
vacuum public.cotizaciones;
