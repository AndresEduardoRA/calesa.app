-- Medición de «Cierre subasta» del panel del vehículo con 50.000 y con 250.000 vehículos vivos (paso 4.14-1): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de
-- volumen (la dueña y los 50.000 leads «Volumen» de `sembrar.sql`). Todo en una transacción que se revierte. La forma y las personas son las de `medir-vehiculos-lectura.sql`.
--
-- Qué se mide: la lectura que escribirá el 4.14-2 por PostgREST: las subastas vivas (abiertas o en vivo) de un origen con cierre desde ahora menos 24 h (P5), la más próxima
-- primero, `n + 1` filas (`TAMANO_DE_VER_MAS` + 1) por `cierre_subasta_en, id` (la columna generada: PostgREST no ordena por una expresión), la primera y una profunda por cursor
-- (`aplicarCursor` ascendente sobre `cierre_subasta_en`), como `authenticated`, con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas. Quién: la dueña
-- («todos») y Pía («propios», sobre lo que creó) en A (`subasta_usa`), y Beto («propios», compartido en los 50.000 leads «Volumen») en B (`oficina`), sobre 5.000 vehículos de su
-- cartera que creó la dueña. Sus bloques cierran en 2 h: son lo más próximo de su origen. El relleno de la dueña, por `g % 4`: 2, abiertas o en vivo que cierran en 30 días; 3,
-- terminadas o vendidas que «cerraron» hace 12 h, antes que todo lo vivo (su `cierre_subasta_en` es nulo: sin el `case` entrarían al principio de cada página); lo demás, sin
-- subasta. La «chica» (3, que cierran en 100 días: recorre todo lo vivo de A) se mide sin assert (4-23).
--
-- Asserta, con los dos volúmenes: `vehiculos_cierre_subasta_idx`, sin `Seq Scan` de `vehiculos`, sin `Sort` y sin descartar filas que crezcan con N; ≤ 10 ms y ≤ 300 buffers por página
-- (Beto ≤ 1.000); `en_cartera()` a lo sumo una vez por fila sólo en Beto, ninguna llamada a `mis_leads()` ni a `alcance_de()`; que no crece con N (con 250.000, el tiempo a lo sumo
-- `greatest(1,5 × t, t + 3 ms)` y los buffers 1,2 × + 20). La guarda: con el índice que decía la fila del PLAN, `(origen_id, estado_subasta, subasta_en)`, la página no lo puede usar y rompe los asserts.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos, public.leads_asesores;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:ver_mas + 1)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.leads where nombre like 'Volumen %' and eliminado_en is null) < 40000 then
    raise exception 'esperaba los 50.000 leads «Volumen» de la siembra y hay %', (select count(*) from public.leads where nombre like 'Volumen %' and eliminado_en is null);
  end if;
  if (select count(*) from public.vehiculos where eliminado_en is null) > 20000 then
    raise exception 'la base ya trae % vehículos vivos: la medición cuenta con llegar a 50.000 y 250.000 (pnpm db:reset)', (select count(*) from public.vehiculos where eliminado_en is null);
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir «Cierre subasta»: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres (las personas con los triggers encendidos: el de `auth.users` crea el perfil)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('pia', '00000000-0000-0000-0000-0000000000f4'),
  ('beto', '00000000-0000-0000-0000-0000000000f5'), ('chica', '00000000-0000-0000-0000-0000000000f6');
insert into auth.users (id, email, raw_app_meta_data) select id, 'medir-panel-' || clave || '@ejemplo.com', '{"invitado": true}' from _p where clave <> 'duena';
update public.perfiles set nombre = 'Medir panel ' || id, invitacion_aceptada_en = now() where id in (select id from _p where clave <> 'duena');
with r as (insert into public.roles (clave, nombre) values ('medir_panel_propios', 'Medir panel propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'vehiculos.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, (select id from r), true from _p p where p.clave <> 'duena';
create temp table _o (clave text primary key, id uuid not null);
insert into _o select case clave when 'subasta_usa' then 'a' else 'b' end, id from public.origenes where clave in ('subasta_usa', 'oficina');
create temp table _cartera (i int primary key, lead uuid not null);
insert into _cartera select row_number() over (order by id), id from public.leads where nombre like 'Volumen %' and eliminado_en is null;
do $$ begin
  if (select count(*) from _o) <> 2 then raise exception 'esperaba los orígenes subasta_usa y oficina de la semilla'; end if;
  if (select count(*) from public.perfiles where id in (select id from _p) and activo) <> 4 then raise exception 'las personas de la medición no tienen perfil activo'; end if;
end $$;
grant select on _p, _o to authenticated;

-- Sin triggers de aquí en más (`numero` es una identidad y se llena igual; la columna generada se calcula igual). Pía: 5.000 propios en A; Beto: 5.000 de su cartera en B (los
-- creó la dueña); los dos bloques, abiertos o en vivo (alternando) con cierre en 2 h, lo más próximo de su origen. La chica: 3 propios en A que cierran en 100 días.
set local session_replication_role = replica;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, desde, lead_creado_en)
select c.lead, '00000000-0000-0000-0000-0000000000f5', 'compartido', '00000000-0000-0000-0000-0000000000d1', now(), l.creado_en from _cartera c join public.leads l on l.id = c.lead;
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, estado_subasta, subasta_en, subasta_fin_en)
select (select id from _o where clave = 'a'), 'Medir panel Pía ' || g, '00000000-0000-0000-0000-0000000000f4', null, now(), now(),
       (array['abierta', 'en_vivo'])[1 + g % 2]::public.estado_subasta, now() - interval '1 day', now() + interval '2 hours' + g * interval '1 millisecond'
  from generate_series(1, 5000) g;
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, estado_subasta, subasta_en, subasta_fin_en)
select (select id from _o where clave = 'b'), 'Medir panel Beto ' || g, '00000000-0000-0000-0000-0000000000d1', (select lead from _cartera where i = g), now(), now(),
       (array['abierta', 'en_vivo'])[1 + g % 2]::public.estado_subasta, now() - interval '1 day', now() + interval '2 hours' + g * interval '1 millisecond'
  from generate_series(1, 5000) g;
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, estado_subasta, subasta_en)
select (select id from _o where clave = 'a'), 'Medir panel chica ' || g, '00000000-0000-0000-0000-0000000000f6', null, now(), now(), 'abierta', now() + interval '100 days' + g * interval '1 second'
  from generate_series(1, 3) g;
set local session_replication_role = origin;
-- El cursor profundo de cada ruta: la fila 4.000 de su origen por `cierre_subasta_en, id` desde el margen, dentro de su bloque; la dueña camina lo mismo que Pía.
create temp table _cur (quien text primary key, origen uuid not null, ts timestamptz not null, id uuid not null);
insert into _cur select q.quien, v.origen_id, v.cierre_subasta_en, v.id
  from (values ('duena', 'a'), ('pia', 'a'), ('beto', 'b')) q (quien, origen)
 cross join lateral (select x.origen_id, x.cierre_subasta_en, x.id from public.vehiculos x where x.origen_id = (select id from _o where clave = q.origen) and x.eliminado_en is null
                      and x.cierre_subasta_en >= now() - interval '24 hours' order by x.cierre_subasta_en, x.id offset 4000 limit 1) v;
do $$ begin
  if (select count(*) from _cur c join public.vehiculos v on v.id = c.id where (c.quien = 'beto') = (v.titulo like 'Medir panel Beto %') and (c.quien <> 'beto') = (v.titulo like 'Medir panel Pía %')) <> 3 then
    raise exception 'los cursores profundos no caen en los bloques de Pía y de Beto';
  end if;
end $$;
grant select on _cur to authenticated;

-- El relleno: vehículos sin lead de la dueña, repartidos entre A y B; por `g % 4`, vivas lejanas (2) y terminadas o vendidas de hace 12 h (3). Las filas g ∈ [desde, hasta].
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en, estado_subasta, subasta_en, subasta_fin_en)
  select case when (g / 4) % 2 = 0 then (select id from _o where clave = 'a') else (select id from _o where clave = 'b') end,
         'Medir panel relleno ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds',
         case g % 8 when 2 then 'abierta' when 6 then 'en_vivo' when 3 then 'terminada' when 7 then 'vendida' end::public.estado_subasta,
         case when g % 4 in (2, 3) then now() - interval '2 days' end,
         case when g % 4 = 2 then now() + interval '30 days' + g * interval '1 second' when g % 4 = 3 then now() - interval '12 hours' end
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.medir(p_ejecutar text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int; v_texto text;
begin
  for i in 1 .. p_corridas loop
    execute 'explain (analyze, buffers, format json) ' || p_ejecutar into v_plan;
    continue when i <= least(2, p_corridas - 1);
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  v_texto := v_plan::text;
  return jsonb_build_object(
    'ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    'buffers', (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    'indices', coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    'seq', exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "vehiculos"', 'g')),
    'sort', v_texto ~ '"Node Type": "(Incremental )?Sort"',
    'descartadas', coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
end $$;

-- Cuántas veces llama a cada función UNA ejecución de la consulta (`track_functions = 'all'` se pone antes de cambiar de rol).
create function pg_temp.llamadas(p_ejecutar text) returns jsonb language plpgsql as $$
declare v_antes jsonb; v_despues jsonb;
begin
  select coalesce(jsonb_object_agg(funcname, calls), '{}') into v_antes from pg_stat_xact_user_functions where schemaname = 'public';
  execute p_ejecutar;
  select coalesce(jsonb_object_agg(funcname, calls), '{}') into v_despues from pg_stat_xact_user_functions where schemaname = 'public';
  return (select coalesce(jsonb_object_agg(k, coalesce((v_despues ->> k)::bigint, 0) - coalesce((v_antes ->> k)::bigint, 0)), '{}')
            from (select jsonb_object_keys(v_despues) k) x where coalesce((v_despues ->> k)::bigint, 0) - coalesce((v_antes ->> k)::bigint, 0) > 0);
end $$;

create temp table _med (fase text, ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, sort boolean, descartadas numeric, llamadas jsonb);
grant all on _med to authenticated;

-- La lectura del panel (`vehiculos_cierre_subasta_idx`): `$2` es ahora menos el margen de P5; `>=` es estricto, así que implica que la columna no es nula (el predicado del índice).
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, fase_id, atributos, lead_id, creado_por, creado_en, actualizado_en, estado_subasta, subasta_en, subasta_fin_en, cierre_subasta_en';
  v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare c_pagina(uuid, timestamptz) as select ' || v_cols || ' from public.vehiculos where origen_id = $1 and cierre_subasta_en >= $2 order by cierre_subasta_en, id limit ' || v_n;
  execute 'prepare c_cursor(uuid, timestamptz, timestamptz, uuid) as select ' || v_cols || ' from public.vehiculos where origen_id = $1 and cierre_subasta_en >= $2'
    || ' and cierre_subasta_en >= $3 and (cierre_subasta_en > $3 or id > $4) order by cierre_subasta_en, id limit ' || v_n;
end $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- Una persona: la página 1 de su origen y una profunda por cursor (la chica, sólo la página 1 de A: recorre todo lo vivo).
create function pg_temp.ruta(p_fase text, p_quien text) returns void language plpgsql as $$
declare c record; v_q text; v_m jsonb; v_origen uuid := (select id from _o where clave = case p_quien when 'beto' then 'b' else 'a' end); v_desde timestamptz := now() - interval '24 hours';
begin
  perform pg_temp.como(p_quien);
  select * into c from _cur where quien = p_quien;
  foreach v_q in array case when p_quien = 'chica' then array[format('execute c_pagina(%L, %L)', v_origen, v_desde)]
                          else array[format('execute c_pagina(%L, %L)', v_origen, v_desde), format('execute c_cursor(%L, %L, %L, %L)', c.origen, v_desde, c.ts, c.id)] end loop
    v_m := pg_temp.medir(v_q, case p_quien when 'chica' then 3 else 7 end);
    insert into _med values (p_fase, case when v_q like 'execute c_pagina%' then 'página 1' else 'profunda' end, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint,
      v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'sort')::boolean, (v_m ->> 'descartadas')::numeric, pg_temp.llamadas(v_q));
  end loop;
end $$;

create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
begin
  perform pg_temp.ruta(p_fase, 'duena');
  perform pg_temp.ruta(p_fase, 'pia');
  perform pg_temp.ruta(p_fase, 'beto');
  if p_fase <> 'fila' then perform pg_temp.ruta(p_fase, 'chica'); end if;
end $$;

-- Lo que se asserta de una fase: el índice, el plan, el presupuesto y las llamadas (la chica sólo las llamadas).
create function pg_temp.fallas(p_fase text, p_indice text) returns text language plpgsql as $$
declare r record; v_fallas text := ''; v_tope_buf bigint; c_pagina constant int := current_setting('medir.pagina')::int;
  c_ms constant numeric := 10; c_buf constant bigint := 300; c_buf_beto constant bigint := 1000;
begin
  for r in select * from _med where fase = p_fase order by quien, ruta loop
    if r.quien = 'chica' then
      if r.llamadas ? 'en_cartera' then v_fallas := v_fallas || format(E'\n  %s · chica: llama a en_cartera en vehículos sin lead (%s)', r.fase, r.llamadas); end if;
      continue;
    end if;
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.ruta, r.quien, round(r.ms, 1), c_ms); end if;
    -- El tope va a una variable: un `if` de plpgsql termina en el primer `then`, también en el de un `case`.
    v_tope_buf := case r.quien when 'beto' then c_buf_beto else c_buf end;
    if r.buffers > v_tope_buf then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s buffers, el presupuesto es %s', r.fase, r.ruta, r.quien, r.buffers, v_tope_buf); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre vehiculos entera', r.fase, r.ruta, r.quien); end if;
    if r.sort then v_fallas := v_fallas || format(E'\n  %s · %s · %s ordena (Sort)', r.fase, r.ruta, r.quien); end if;
    if not r.indices ? p_indice then v_fallas := v_fallas || format(E'\n  %s · %s · %s no camina %s: %s', r.fase, r.ruta, r.quien, p_indice, r.indices); end if;
    if r.descartadas > 500 then v_fallas := v_fallas || format(E'\n  %s · %s · %s descarta %s filas', r.fase, r.ruta, r.quien, r.descartadas); end if;
    if r.llamadas ? 'alcance_de' or r.llamadas ? 'mis_leads' then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s', r.fase, r.ruta, r.quien, r.llamadas); end if;
    if r.quien = 'beto' then
      if coalesce((r.llamadas ->> 'en_cartera')::int, 0) > c_pagina then v_fallas := v_fallas || format(E'\n  %s · %s · Beto llama a en_cartera más de una vez por fila: %s', r.fase, r.ruta, r.llamadas); end if;
    elsif r.llamadas ? 'en_cartera' then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s pregunta por la cartera lo que ya sabe: %s', r.fase, r.ruta, r.quien, r.llamadas);
    end if;
  end loop;
  return v_fallas;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 vehículos vivos; fase 2: 250.000 (200.000 más de relleno)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000 - (select count(*)::int from public.vehiculos where eliminado_en is null));
analyze public.vehiculos;
analyze public.leads_asesores;
do $$ begin
  if (select count(*) from public.vehiculos where eliminado_en is null) <> 50000 then raise exception 'esperaba 50.000 vehículos vivos y hay %', (select count(*) from public.vehiculos where eliminado_en is null); end if;
end $$;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.fase('50.000');
reset role;

select pg_temp.rellenar(1000001, 1200000);
analyze public.vehiculos;
do $$ begin
  if (select count(*) from public.vehiculos where eliminado_en is null) <> 250000 then raise exception 'esperaba 250.000 vehículos vivos y hay %', (select count(*) from public.vehiculos where eliminado_en is null); end if;
end $$;
set local role authenticated;
select pg_temp.fase('250.000');
reset role;

do $$
declare r record; g record; v_fallas text := pg_temp.fallas('50.000', 'vehiculos_cierre_subasta_idx') || pg_temp.fallas('250.000', 'vehiculos_cierre_subasta_idx');
begin
  for r in select * from _med order by fase, quien, ruta loop
    raise notice 'medicion|Cierre subasta, % · % · % (ms%)|%', r.fase, r.ruta, r.quien, case r.quien when 'chica' then ', sin assert, 4-23' else '' end, round(r.ms, 2);
    raise notice 'medicion|Cierre subasta, % · % · % (buffers%)|%', r.fase, r.ruta, r.quien, case r.quien when 'chica' then ', sin assert, 4-23' else '' end, r.buffers;
  end loop;
  for g in select a.ruta, a.quien, a.ms as ms_50, b.ms as ms_250, a.buffers as b_50, b.buffers as b_250
             from _med a join _med b on b.ruta = a.ruta and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' where a.quien <> 'chica' loop
    if g.ms_250 > greatest(1.5 * g.ms_50, g.ms_50 + 3) then v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms y %s', g.ruta, g.quien, round(g.ms_50, 1), round(g.ms_250, 1)); end if;
    if g.b_250 > 1.2 * g.b_50 + 20 then v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s buffers y %s', g.ruta, g.quien, g.b_50, g.b_250); end if;
  end loop;
  if v_fallas <> '' then raise exception '«Cierre subasta» rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: el índice que decía la fila del PLAN, `(origen_id, estado_subasta, subasta_en)`, no sirve el orden por la columna generada: tiene que romper los asserts.
drop index public.vehiculos_cierre_subasta_idx;
create index vehiculos_cierre_fila_idx on public.vehiculos (origen_id, estado_subasta, subasta_en) where eliminado_en is null;
analyze public.vehiculos;
set local role authenticated;
deallocate all;
select pg_temp.preparar();
select pg_temp.fase('fila');
reset role;
do $$
declare v_fila text := pg_temp.fallas('fila', 'vehiculos_cierre_fila_idx'); r record;
begin
  for r in select * from _med where fase = 'fila' order by quien, ruta loop
    raise notice 'medicion|Guarda, el índice de la fila, 250.000 · % · % (ms)|%', r.ruta, r.quien, round(r.ms, 2);
  end loop;
  if v_fila !~ 'página 1 · duena' then raise exception 'la guarda no muerde: con el índice de la fila la página de la dueña cumple (fallas:%)', coalesce(nullif(v_fila, ''), ' ninguna'); end if;
end $$;
rollback;
vacuum public.vehiculos, public.leads_asesores;
