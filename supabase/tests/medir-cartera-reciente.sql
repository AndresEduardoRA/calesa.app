-- Medición de «míos» del panel del cliente por lo más reciente (paso 4.14-3a): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen (62.000 leads, con los
-- 50.000 «Volumen»; se repite a mano con `pnpm db:sembrar-volumen -- --leads 200000`, 212.000). Todo en una transacción que se revierte.
--
-- Qué se mide: la lectura que escribirá el 4.14-3b por PostgREST, de `leads_cartera_vista`: `select id, numero_visible, nombre, tipo_lead_id, reciente_en … order by reciente_en
-- desc, id desc limit TAMANO_DE_VER_MAS + 1`, como `authenticated`, con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas. Quién: la dueña (~20.000 en
-- su cartera, con seguimientos), Ana (~2.400, con seguimientos y compartidos), Berta (~7.000, sin seguimientos: lo reciente es el alta) y una «chica» con 3 leads creada aquí.
-- Lecturas: la página 1, una profunda por cursor (la fila 5.000 de la dueña, la 1.000 de Ana, la 1.000 de Berta) y la página 1 de la clase cliente (~15 %).
--
-- Asserta: `leads_asesores_reciente_idx`, sin `Seq Scan` de `leads` ni de `leads_asesores`, sin `Sort`; ≤ 30 ms, ≤ 3.000 filas descartadas y ≤ 1.500 buffers por página (la clase cliente, ≤ 2.500: camina ~7 leads por cada uno que muestra);
-- con el volumen mayor, el tiempo a lo sumo `greatest(1,5 × t, t + 3 ms)` del menor lo compara el informe. La clase ausente (la dueña con 0 % de la clase cliente: la pestaña filtra
-- `tipo_lead_id`, que no está en el índice, y recorre su cartera entera) tiene su tope aparte: ≤ 400 ms con 212.000 leads (80.000 en su cartera; 66 ms con 62.000), un límite declarado en docs/RENDIMIENTO.md. La guarda: sin el índice la página 1 de la dueña ordena o recorre y el assert cae.
-- C9: `seguimiento_crear` sobre un lead de la dueña compartido con Ana, ×7, con `trg_leads_reciente_seguir` encendido y apagado: la diferencia de la mediana ≤ 0,5 ms y ≤ 250 buffers (se midieron 0,1 ms y 144/147).
-- El relleno de la migración con el volumen de la base, sin assert de tiempo salvo ≤ 60 s con el trigger de la cartera apagado: se informan los dos tiempos (apagado y encendido).
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.leads, public.leads_asesores;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:ver_mas + 1)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir «míos» por lo más reciente: %|', current_setting('medir.carga');
end $$;

create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1'),
  ('berta', '00000000-0000-0000-0000-0000000000b1'), ('chica', '00000000-0000-0000-0000-0000000000f7');
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000f7', 'medir-reciente-chica@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir reciente chica', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000f7';
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000f7', id, true from public.roles where clave = 'asesor';
-- La chica: tres leads suyos (con los triggers: el alta pone su cartera y lo reciente). Mismo origen y tipo que el resto.
insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
select 'Medir reciente chica ' || g, (79990000 + g)::text, '00000000-0000-0000-0000-0000000000f7', (select id from public.origenes_lead order by orden, id limit 1), '{}' from generate_series(1, 3) g;
do $$ begin
  if (select count(*) from public.leads_asesores where usuario_id in (select id from _p) and revocado_en is null) < 3 + 20000 then
    raise exception 'esperaba las carteras de la siembra de volumen de la dueña y de la chica';
  end if;
end $$;
grant select on _p to authenticated;

-- El cursor profundo de cada persona: la fila `k` de su cartera por `lead_reciente_en desc, lead_id desc`.
create temp table _cur (quien text primary key, ts timestamptz not null, id uuid not null);
insert into _cur select q.quien, x.lead_reciente_en, x.lead_id
  from (values ('duena', 4999), ('ana', 999), ('berta', 999)) q (quien, k)
 cross join lateral (select la.lead_reciente_en, la.lead_id from public.leads_asesores la where la.usuario_id = (select id from _p where clave = q.quien) and la.revocado_en is null
                      order by la.lead_reciente_en desc, la.lead_id desc offset q.k limit 1) x;
do $$ begin
  if (select count(*) from _cur) <> 3 then raise exception 'las carteras de la dueña, Ana y Berta no llegan a la fila de su cursor profundo'; end if;
end $$;
grant select on _cur to authenticated;
create temp table _clase (id uuid primary key);
insert into _clase select id from public.tipos_lead where clase = 'cliente';
grant select on _clase to authenticated;

create function pg_temp.medir(p_ejecutar text, p_corridas int default 7) returns jsonb language plpgsql as $$
declare v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int; v_texto text;
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
    'seq', exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "(leads|leads_asesores)"', 'g')),
    'sort', v_texto ~ '"Node Type": "(Incremental )?Sort"',
    'descartadas', coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
end $$;

create temp table _med (fase text, ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, sort boolean, descartadas numeric);
grant all on _med to authenticated;

-- La lectura del 3b: las columnas que dibuja el panel, `order by reciente_en desc, id desc`; con cursor `reciente_en <= $2 and (reciente_en < $2 or id < $3)`; con clase, `tipo_lead_id = any ($1)`.
create function pg_temp.preparar() returns void language plpgsql as $$
declare v_cols constant text := 'id, numero_visible, nombre, tipo_lead_id, reciente_en'; v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare r_pagina as select ' || v_cols || ' from public.leads_cartera_vista order by reciente_en desc, id desc limit ' || v_n;
  execute 'prepare r_cursor(timestamptz, uuid) as select ' || v_cols || ' from public.leads_cartera_vista where reciente_en <= $1 and (reciente_en < $1 or id < $2) order by reciente_en desc, id desc limit ' || v_n;
  execute 'prepare r_clase(uuid[]) as select ' || v_cols || ' from public.leads_cartera_vista where tipo_lead_id = any ($1) order by reciente_en desc, id desc limit ' || v_n;
end $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.guardar(p_fase text, p_ruta text, p_quien text, p_consulta text, p_corridas int default 7) returns void language plpgsql as $$
declare v_m jsonb := pg_temp.medir(p_consulta, p_corridas);
begin
  insert into _med values (p_fase, p_ruta, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'sort')::boolean, (v_m ->> 'descartadas')::numeric);
end $$;

create function pg_temp.ruta(p_fase text, p_quien text) returns void language plpgsql as $$
declare c record; v_clase text := format('execute r_clase(%L)', (select array_agg(id) from _clase));
begin
  perform pg_temp.como(p_quien);
  perform pg_temp.guardar(p_fase, 'página 1', p_quien, 'execute r_pagina', case p_quien when 'chica' then 3 else 7 end);
  if p_quien <> 'chica' then
    select * into c from _cur where quien = p_quien;
    perform pg_temp.guardar(p_fase, 'profunda', p_quien, format('execute r_cursor(%L, %L)', c.ts, c.id));
    if p_quien <> 'berta' then perform pg_temp.guardar(p_fase, 'clase cliente', p_quien, v_clase); end if;
  end if;
end $$;

create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
begin
  perform pg_temp.ruta(p_fase, 'duena'); perform pg_temp.ruta(p_fase, 'ana'); perform pg_temp.ruta(p_fase, 'berta'); perform pg_temp.ruta(p_fase, 'chica');
end $$;

create function pg_temp.fallas(p_fase text, p_indice text) returns text language plpgsql as $$
declare r record; v_fallas text := ''; c_ms constant numeric := 30; c_buf constant bigint := 1500; c_buf_clase constant bigint := 2500; c_desc constant numeric := 3000; v_tope_buf bigint;
begin
  for r in select * from _med where fase = p_fase and quien <> 'chica' order by quien, ruta loop
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.ruta, r.quien, round(r.ms, 1), c_ms); end if;
    -- El tope va a una variable: un `if` de plpgsql termina en el primer `then`, también en el de un `case`.
    v_tope_buf := case r.ruta when 'clase cliente' then c_buf_clase else c_buf end;
    if r.buffers > v_tope_buf then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s buffers, el presupuesto es %s', r.fase, r.ruta, r.quien, r.buffers, v_tope_buf); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre leads o leads_asesores entera', r.fase, r.ruta, r.quien); end if;
    if r.sort then v_fallas := v_fallas || format(E'\n  %s · %s · %s ordena (Sort)', r.fase, r.ruta, r.quien); end if;
    if not r.indices ? p_indice then v_fallas := v_fallas || format(E'\n  %s · %s · %s no camina %s: %s', r.fase, r.ruta, r.quien, p_indice, r.indices); end if;
    if r.descartadas > c_desc then v_fallas := v_fallas || format(E'\n  %s · %s · %s descarta %s filas', r.fase, r.ruta, r.quien, r.descartadas); end if;
  end loop;
  return v_fallas;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las lecturas con el volumen que tiene la base
-- ---------------------------------------------------------------------------------------------------------------------------------
analyze public.leads;
analyze public.leads_asesores;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.fase('volumen');
reset role;

-- La clase ausente: la dueña sin ningún lead de la clase cliente (sus leads de esa clase pasan a prospecto, con replica): la pestaña recorre su cartera entera.
set local session_replication_role = replica;
update public.leads set tipo_lead_id = (select id from public.tipos_lead where clave = 'prospecto')
 where creado_por = '00000000-0000-0000-0000-0000000000d1' and tipo_lead_id in (select id from _clase);
set local session_replication_role = origin;
analyze public.leads;
set local role authenticated;
select pg_temp.como('duena');
select pg_temp.guardar('ausente', 'clase ausente', 'duena', format('execute r_clase(%L)', (select array_agg(id) from _clase)), 5);
reset role;

do $$
declare r record; v_fallas text := pg_temp.fallas('volumen', 'leads_asesores_reciente_idx');
begin
  for r in select * from _med order by fase, quien, ruta loop
    raise notice 'medicion|Míos por lo reciente, % · % · % (ms%)|%', r.fase, r.ruta, r.quien, case r.quien when 'chica' then ', sin assert' else '' end, round(r.ms, 2);
    raise notice 'medicion|Míos por lo reciente, % · % · % (buffers%)|%', r.fase, r.ruta, r.quien, case r.quien when 'chica' then ', sin assert' else '' end, r.buffers;
  end loop;
  select * into r from _med where fase = 'ausente';
  if r.ms > 400 then v_fallas := v_fallas || format(E'\n  clase ausente · duena: %s ms, el tope es 400', round(r.ms, 1)); end if;
  if r.sort then v_fallas := v_fallas || E'\n  clase ausente · duena ordena (Sort)'; end if;
  if not r.indices ? 'leads_asesores_reciente_idx' then v_fallas := v_fallas || format(E'\n  clase ausente · duena no camina el índice: %s', r.indices); end if;
  if v_fallas <> '' then raise exception '«Míos» por lo reciente rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: sin el índice, la página 1 de la dueña ordena o recorre la cartera, y el assert cae.
drop index public.leads_asesores_reciente_idx;
analyze public.leads_asesores;
set local role authenticated;
select pg_temp.como('duena');
select pg_temp.guardar('sin índice', 'página 1', 'duena', 'execute r_pagina', 3);
reset role;
do $$
declare r record;
begin
  select * into r from _med where fase = 'sin índice';
  raise notice 'medicion|Guarda, sin el índice · página 1 · duena (ms)|%', round(r.ms, 2);
  if not (r.sort or r.seq or not r.indices ? 'leads_asesores_reciente_idx') then raise exception 'la guarda no muerde: sin el índice la página 1 de la dueña lo cumple todo'; end if;
end $$;
rollback;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- C9: escribir un seguimiento reescribe la cartera de su lead (trigger encendido) frente a no hacerlo (apagado)
-- ---------------------------------------------------------------------------------------------------------------------------------
begin;
create temp table _c9 (fase text, ms numeric, buffers bigint);
grant all on _c9 to authenticated;
create temp table _l (id uuid);
insert into _l select la.lead_id from public.leads_asesores la where la.usuario_id = '00000000-0000-0000-0000-0000000000a1' and la.tipo_acceso = 'compartido'
   and la.compartido_por = '00000000-0000-0000-0000-0000000000d1' and la.revocado_en is null limit 1;
grant select on _l to authenticated;
-- Cada corrida anota un seguimiento más nuevo que el anterior (si no, lo reciente no se mueve y no hay nada que medir).
create function pg_temp.anotar(p_fase text, p_base int) returns void language plpgsql as $$
declare v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; i int; v_b bigint;
begin
  for i in 1 .. 7 loop
    execute format($q$explain (analyze, buffers, format json) select public.seguimiento_crear(gen_random_uuid(), %L, jsonb_build_object('tipo_id',
      (select id from public.tipos_seguimiento where activo order by orden limit 1), 'titulo', 'Medir', 'ocurrido_en', %L::timestamptz))$q$,
      (select id from _l), now() - interval '1 minute' + (p_base + i) * interval '1 second') into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::bigint, 0) + coalesce((v_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::bigint, 0);
    v_buf := v_buf || v_b;
  end loop;
  insert into _c9 values (p_fase, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b));
end $$;
grant execute on all functions in schema pg_temp to authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000d1', 'role', 'authenticated')::text, true);
alter table public.leads disable trigger trg_leads_reciente_seguir;
set local role authenticated;
select pg_temp.anotar('apagado', 0);
reset role;
alter table public.leads enable trigger trg_leads_reciente_seguir;
set local role authenticated;
select pg_temp.anotar('encendido', 20);
reset role;
do $$
declare a record; e record;
begin
  select * into a from _c9 where fase = 'apagado'; select * into e from _c9 where fase = 'encendido';
  raise notice 'medicion|C9, seguimiento_crear con el trigger apagado (ms)|%', round(a.ms, 2);
  raise notice 'medicion|C9, seguimiento_crear con el trigger encendido (ms)|%', round(e.ms, 2);
  raise notice 'medicion|C9, lo que cuesta el trigger (ms)|%', round(e.ms - a.ms, 2);
  raise notice 'medicion|C9, lo que cuesta el trigger (buffers)|%', e.buffers - a.buffers;
  if e.ms - a.ms > 0.5 then raise exception 'C9: el trigger cuesta % ms por seguimiento, el presupuesto es 0,5', round(e.ms - a.ms, 2); end if;
  if e.buffers - a.buffers > 250 then raise exception 'C9: el trigger cuesta % buffers por seguimiento, el presupuesto es 250', e.buffers - a.buffers; end if;
end $$;
rollback;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El relleno con el volumen de la base: toda la copia sucia, en subtransacciones que se deshacen. Con los triggers apagados salvo la guarda de la copia (el relleno de la migración
-- corre antes de crearla), el trigger de la cartera apagado (como la migración) y encendido (M11: recalcularía todas las carteras).
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare v_ms_apagado numeric; v_ms_encendido numeric; v_filas bigint; t0 timestamptz; n int;
begin
  select count(*) into v_filas from public.leads_asesores;
  begin
    set local session_replication_role = replica;
    update public.leads_asesores set lead_reciente_en = '2000-01-01';
    set local session_replication_role = origin;
    alter table public.leads_asesores disable trigger trg_leads_asesores_creado_en_guarda;
    alter table public.leads_asesores disable trigger trg_leads_asesores_cartera_cambio;
    t0 := clock_timestamp(); n := public._leads_asesores_reciente_rellenar(); v_ms_apagado := extract(epoch from clock_timestamp() - t0) * 1000;
    if n <> v_filas then raise exception 'el relleno cambió % filas y había % sucias', n, v_filas; end if;
    raise exception using errcode = 'P0004', message = 'deshacer';
  exception when sqlstate 'P0004' then null;
  end;
  begin
    set local session_replication_role = replica;
    update public.leads_asesores set lead_reciente_en = '2000-01-01';
    set local session_replication_role = origin;
    alter table public.leads_asesores disable trigger trg_leads_asesores_creado_en_guarda;
    t0 := clock_timestamp(); n := public._leads_asesores_reciente_rellenar(); v_ms_encendido := extract(epoch from clock_timestamp() - t0) * 1000;
    raise exception using errcode = 'P0004', message = 'deshacer';
  exception when sqlstate 'P0004' then null;
  end;
  raise notice 'medicion|Relleno de lead_reciente_en, % filas, trigger de la cartera apagado (ms)|%', v_filas, round(v_ms_apagado);
  raise notice 'medicion|Relleno de lead_reciente_en, % filas, trigger de la cartera encendido (ms, sin assert)|%', v_filas, round(v_ms_encendido);
  if v_ms_apagado > 60000 then raise exception 'el relleno tarda % s con el trigger apagado: el tope es 60 s', round(v_ms_apagado / 1000); end if;
end $$;
vacuum public.leads, public.leads_asesores;
