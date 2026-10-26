-- Medición de la lectura de vehículos con 50.000 y con 250.000 vivos (paso 4.11): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen (la dueña
-- y los 50.000 leads «Volumen» de `sembrar.sql`). Todo en una transacción que se revierte: ningún vehículo ni ninguna cartera quedan.
--
-- Qué se mide: una página del inventario de un origen (`buscarVehiculos()`): `n + 1` filas (el máximo de la lista, más una para saber si hay otra) ordenadas por
-- `creado_en desc, id desc`, la primera y una profunda por cursor con la forma de la app (`aplicarCursor`: `creado_en <= X and (creado_en < X or id < Y)`), con las columnas
-- de la tabla que lee el inventario. Sin la portada embebida ni `limpieza_el`: lo que cambia en el 4.11 es la policy, y esas dos ya las mide `medir-escala.sql`.
-- Como `authenticated`, con el plan genérico, `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las 5 últimas, y la carga de la máquina (`/proc/loadavg`) anotada. Quién:
--   - la dueña («todos»), en el origen A (`subasta_usa`);
--   - Pía («propios»), en A, sobre lo que creó: sus 5.000 son lo más nuevo de A, así que la página no toca nada ajeno;
--   - Beto («propios», compartido en los 50.000 leads «Volumen»: una cartera grande), en el origen B (`oficina`), sobre 5.000 vehículos de su cartera que creó la dueña:
--     lo más nuevo de B. Es el único caso donde la policy vieja y la nueva difieren: la vieja (`lead_id in (select mis_leads())`) arma el hash de TODA la cartera la primera
--     vez que llega a esa rama (lo propio corta antes: con la dueña y con Pía la vieja nunca llama a `mis_leads`), y la nueva pregunta por fila con `en_cartera()`;
--   - `puede_vehiculo(v, 'vehiculos.ver')` de Beto sobre un vehículo de su cartera (la usan las RPC y las policies de las tablas hijas).
-- Los bloques de Pía y de Beto llevan un `creado_en` futuro: es la forma de que sean lo más nuevo de su origen con la siembra adentro.
--
-- Asserta, con los dos volúmenes:
--   - el plan: `vehiculos_origen_listado_idx`, sin `Seq Scan` de `vehiculos` y sin descartar filas que crezcan con N;
--   - la dueña y Pía: ≤ 10 ms y ≤ 300 buffers por página, y ninguna llamada a `en_cartera()`, `alcance_de()` ni `mis_leads()` (`origenes_con_alcance()` a lo sumo
--     dos: los dos InitPlan);
--   - Beto: ≤ 10 ms y ≤ `c_buf_beto` buffers (cada vehículo de su cartera paga un sondeo de `leads_asesores_usuario_vigente_idx`), `en_cartera()` a lo sumo una vez por fila
--     de la página y ninguna llamada a `mis_leads()` ni `alcance_de()`;
--   - `puede_vehiculo()` de Beto: una llamada a `alcance_de()` (el argumento de un `case`: comparado dos veces, o en un lateral que Postgres aplana, corre dos), una a `en_cartera()`, ninguna a
--     `mis_leads()`, ≤ 5 ms;
--   - que no crece con N: con 250.000 el tiempo es a lo sumo `greatest(1,5 × el de 50.000, el de 50.000 + 3 ms)` y los buffers a lo sumo 1,2 × los de 50.000 + 20;
--   - la guarda: con la policy y la función de antes puestas en su lugar, la página de Beto llama a `mis_leads()` y la función también: tienen que romper estos asserts.
-- La «chica» («propios», 3 vehículos, los más viejos de A, sin cartera) recorre todo A hasta llenar la página: se mide sin assert de tiempo con la policy nueva y con la
-- vieja (crece con N: `docs/PLAN.md`, 4-23). Sí se asserta que no llama a `en_cartera()`: un vehículo sin lead no pregunta (`lead_id is not null`).
-- Cada línea `medicion|…|número` sale por el runner (`scripts/medir-listado.mjs`); las `nota|…`, también.
-- Las corridas anteriores se revierten, pero sus tuplas muertas (250.000 vehículos y 50.000 filas de cartera) quedan en el heap y en los índices hasta que alguien las limpie, y
-- `medir-bajas.sql` trabaja `leads_asesores`: se limpian antes de medir y después. VACUUM no corre dentro de una transacción: va fuera del begin. En el runner va antes
-- de `medir-cotizaciones-lectura.sql` (páginas en memoria, presupuestos de 10 ms) y no justo antes de `medir-bajas.sql`, que mide el tiempo de su job y cae cuando un
-- checkpoint de lo que escribieron las mediciones de antes le toca la ventana (5a-42: 26,4 s con esta medición antes y 27,8 s con ella después, contra 15,6 s sola, siempre
-- con los mismos 40 lotes). `checkpoint` no se puede: `postgres` no tiene `pg_checkpoint` en Supabase.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.vehiculos, public.leads_asesores;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:max_vehiculos + 1)::text, true) \g /dev/null

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
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la lectura de vehículos: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres. Las personas con los triggers encendidos (el de `auth.users` crea el perfil, y sin perfil no hay permisos).
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('pia', '00000000-0000-0000-0000-0000000000f1'),
  ('beto', '00000000-0000-0000-0000-0000000000f2'), ('chica', '00000000-0000-0000-0000-0000000000f3');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'medir-veh-pia@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f2', 'medir-veh-beto@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000f3', 'medir-veh-chica@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Medir vehículos ' || id, invitacion_aceptada_en = now() where id in (select id from _p where clave <> 'duena');
-- Un rol propio: el `asesor` de la semilla ve vehículos con «todos» (`seed.sql`), y aquí se mide «propios».
with r as (insert into public.roles (clave, nombre) values ('medir_veh_propios', 'Medir vehículos propios') returning id),
     c as (insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select id, 'vehiculos.ver', null, 'propios' from r returning rol_id)
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select p.id, (select id from r), true from _p p where p.clave <> 'duena';
create temp table _o (clave text primary key, id uuid not null);
insert into _o select case clave when 'subasta_usa' then 'a' else 'b' end, id from public.origenes where clave in ('subasta_usa', 'oficina');
-- La cartera de Beto: compartido en cada lead «Volumen» vivo.
create temp table _cartera (i int primary key, lead uuid not null);
insert into _cartera select row_number() over (order by id), id from public.leads where nombre like 'Volumen %' and eliminado_en is null;
do $$ begin
  if (select count(*) from _o) <> 2 then raise exception 'esperaba los orígenes subasta_usa y oficina de la semilla'; end if;
  if (select count(*) from public.perfiles where id in (select id from _p) and activo) <> 4 then raise exception 'las personas de la medición no tienen perfil activo'; end if;
end $$;
grant select on _p, _o to authenticated;

-- Sin triggers de aquí en más (cada fila auditaría, validaría atributos y armaría su historial de vínculo); `numero` es una identidad y se llena igual.
set local session_replication_role = replica;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, desde, lead_creado_en)
select c.lead, '00000000-0000-0000-0000-0000000000f2', 'compartido', '00000000-0000-0000-0000-0000000000d1', now(), l.creado_en
  from _cartera c join public.leads l on l.id = c.lead;
-- Pía: 5.000 propios, lo más nuevo de A. Beto: 5.000 de su cartera (uno por lead, los creó la dueña), lo más nuevo de B. La chica: 3 propios, lo más viejo de A.
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
select (select id from _o where clave = 'a'), 'Medir veh Pía ' || g, '00000000-0000-0000-0000-0000000000f1', null, now() + g * interval '1 second', now()
  from generate_series(1, 5000) g;
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
select (select id from _o where clave = 'b'), 'Medir veh Beto ' || g, '00000000-0000-0000-0000-0000000000d1', (select lead from _cartera where i = g), now() + g * interval '1 second', now()
  from generate_series(1, 5000) g;
insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
select (select id from _o where clave = 'a'), 'Medir veh chica ' || g, '00000000-0000-0000-0000-0000000000f3', null, timestamptz '2000-01-01 00:00:00+00' + g * interval '1 second', now()
  from generate_series(1, 3) g;
set local session_replication_role = origin;
-- El cursor profundo de cada ruta: la fila 2.000 de su origen, dentro de su bloque (los bloques son lo más nuevo, así que el relleno no lo mueve); la dueña camina lo mismo que Pía.
-- Y el vehículo de Beto para `puede_vehiculo()`. Como postgres, una vez.
create temp table _cur (quien text primary key, origen uuid not null, ts timestamptz not null, id uuid not null);
insert into _cur select q.quien, v.origen_id, v.creado_en, v.id
  from (values ('duena', 'a'), ('pia', 'a'), ('beto', 'b'), ('chica', 'a')) q (quien, origen)
 cross join lateral (select x.origen_id, x.creado_en, x.id from public.vehiculos x where x.origen_id = (select id from _o where clave = q.origen) and x.eliminado_en is null
                      order by x.creado_en desc, x.id desc offset 2000 limit 1) v;
create temp table _veh_beto as select id from public.vehiculos where titulo = 'Medir veh Beto 2500';
do $$ begin
  if (select count(*) from _cur c join public.vehiculos v on v.id = c.id where (c.quien = 'beto') = (v.titulo like 'Medir veh Beto %') and (c.quien <> 'beto') = (v.titulo like 'Medir veh Pía %')) <> 4 then
    raise exception 'los cursores profundos no caen en los bloques de Pía y de Beto';
  end if;
end $$;
grant select on _cur, _veh_beto to authenticated;

-- El relleno: vehículos sin lead de la dueña, la mitad en A y la mitad en B, entre los bloques de arriba y la chica. Las filas g ∈ [desde, hasta].
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, creado_en, actualizado_en)
  select case when g % 2 = 0 then (select id from _o where clave = 'a') else (select id from _o where clave = 'b') end,
         'Medir veh relleno ' || g, '00000000-0000-0000-0000-0000000000d1', null,
         timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds', timestamptz '2020-01-01 00:00:00+00' + g * interval '10 seconds'
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Una consulta: `p_corridas` corridas de EXPLAIN (7 salvo la chica, que recorre todo A), la mediana de ms y de buffers de las últimas (sin las dos primeras), los índices que usó,
-- si recorrió `vehiculos` entera y cuántas filas descartó.
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
    'descartadas', coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
end $$;

-- Cuántas veces llama a cada función UNA ejecución de la consulta (el delta de `pg_stat_xact_user_functions`; `track_functions = 'all'` se pone antes de cambiar de rol).
create function pg_temp.llamadas(p_ejecutar text) returns jsonb language plpgsql as $$
declare
  v_antes jsonb; v_despues jsonb;
begin
  select coalesce(jsonb_object_agg(funcname, calls), '{}') into v_antes from pg_stat_xact_user_functions where schemaname = 'public';
  execute p_ejecutar;
  select coalesce(jsonb_object_agg(funcname, calls), '{}') into v_despues from pg_stat_xact_user_functions where schemaname = 'public';
  return (select coalesce(jsonb_object_agg(k, coalesce((v_despues ->> k)::bigint, 0) - coalesce((v_antes ->> k)::bigint, 0)), '{}')
            from (select jsonb_object_keys(v_despues) k) x
           where coalesce((v_despues ->> k)::bigint, 0) - coalesce((v_antes ->> k)::bigint, 0) > 0);
end $$;

create temp table _med (fase text, ruta text, quien text, ms numeric, buffers bigint, indices jsonb, seq boolean, descartadas numeric, llamadas jsonb);
grant all on _med to authenticated;

-- Las dos consultas del inventario, como authenticated: las columnas de la tabla que lee `buscarVehiculos()` (`COLUMNAS_DE_VEHICULO` sin la portada ni `limpieza_el`).
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, origen_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen, precio, precio_negociable, acepta_permuta, placado, '
    || 'kilometraje, categoria_id, fase_id, atributos, lead_id, publicado_web, destacado_web, precio_web, precio_web_hasta, precio_web_nota, creado_por, creado_en, actualizado_en';
  v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare v_pagina(uuid) as select ' || v_cols || ' from public.vehiculos where origen_id = $1 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare v_cursor(uuid, timestamptz, uuid) as select ' || v_cols || ' from public.vehiculos where origen_id = $1 and creado_en <= $2 and (creado_en < $2 or id < $3)'
    || ' order by creado_en desc, id desc limit ' || v_n;
end $$;

create function pg_temp.como(p_quien text) returns uuid language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  return v_id;
end $$;

-- Una persona: la página 1 de su origen y una profunda por cursor (la chica, sólo la página 1: recorre todo A); o `puede_vehiculo()` de Beto. Apunta lo medido en `_med`.
create function pg_temp.ruta(p_fase text, p_quien text) returns void language plpgsql as $$
declare
  c record; v_q text; v_m jsonb; v_corridas int := case p_quien when 'chica' then 3 else 7 end;
begin
  perform pg_temp.como(p_quien);
  select * into c from _cur where quien = p_quien;
  foreach v_q in array case when p_quien = 'chica' then array[format('execute v_pagina(%L)', c.origen)]
                          else array[format('execute v_pagina(%L)', c.origen), format('execute v_cursor(%L, %L, %L)', c.origen, c.ts, c.id)] end loop
    v_m := pg_temp.medir(v_q, v_corridas);
    insert into _med values (p_fase, case when v_q like 'execute v_pagina%' then 'página 1' else 'profunda' end, p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint,
      v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'descartadas')::numeric, pg_temp.llamadas(v_q));
  end loop;
end $$;

create function pg_temp.puede_de_beto(p_fase text) returns void language plpgsql as $$
declare v_q text := format('select public.puede_vehiculo(%L, %L)', (select id from _veh_beto), 'vehiculos.ver'); v_m jsonb;
begin
  perform pg_temp.como('beto');
  v_m := pg_temp.medir(v_q);
  insert into _med values (p_fase, 'puede_vehiculo', 'beto', (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, '[]', false, 0, pg_temp.llamadas(v_q));
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 vehículos vivos
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
select pg_temp.ruta('50.000', 'duena');
select pg_temp.ruta('50.000', 'pia');
select pg_temp.ruta('50.000', 'beto');
select pg_temp.puede_de_beto('50.000');
select pg_temp.ruta('50.000', 'chica');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 2: 250.000 vehículos vivos (200.000 más de relleno)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1000001, 1200000);
analyze public.vehiculos;
do $$ begin
  if (select count(*) from public.vehiculos where eliminado_en is null) <> 250000 then raise exception 'esperaba 250.000 vehículos vivos y hay %', (select count(*) from public.vehiculos where eliminado_en is null); end if;
end $$;
set local role authenticated;
select pg_temp.ruta('250.000', 'duena');
select pg_temp.ruta('250.000', 'pia');
select pg_temp.ruta('250.000', 'beto');
select pg_temp.puede_de_beto('250.000');
select pg_temp.ruta('250.000', 'chica');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.fallas(p_fase text default null) returns text language plpgsql as $$
declare
  r record; v_fallas text := ''; v_tope_buf bigint;
  c_ms constant numeric := 10;           -- ms por página (todos) y presupuesto de las de cotizaciones
  c_buf constant bigint := 300;          -- buffers por página de la dueña y de Pía
  c_buf_beto constant bigint := 1000;    -- buffers por página de Beto: una página de su cartera paga un sondeo por fila
  c_ms_puede constant numeric := 5;      -- ms de un puede_vehiculo()
  c_pagina constant int := current_setting('medir.pagina')::int;
begin
  for r in select * from _med where p_fase is null or fase = p_fase order by fase, quien, ruta loop
    if r.quien = 'chica' then
      if r.llamadas ? 'en_cartera' then v_fallas := v_fallas || format(E'\n  %s · chica: llama a en_cartera en vehículos sin lead (%s)', r.fase, r.llamadas); end if;
      continue;
    end if;
    if r.llamadas ? 'mis_leads' then v_fallas := v_fallas || format(E'\n  %s · %s · %s arma el arreglo de la cartera: %s', r.fase, r.ruta, r.quien, r.llamadas); end if;
    if r.ruta = 'puede_vehiculo' then
      if r.ms > c_ms_puede then v_fallas := v_fallas || format(E'\n  %s · puede_vehiculo de Beto: %s ms, el presupuesto es %s', r.fase, round(r.ms, 2), c_ms_puede); end if;
      if coalesce((r.llamadas ->> 'alcance_de')::int, 0) <> 1 or coalesce((r.llamadas ->> 'en_cartera')::int, 0) <> 1 then
        v_fallas := v_fallas || format(E'\n  %s · puede_vehiculo de Beto: alcance_de y en_cartera una vez cada una, y llama %s', r.fase, r.llamadas);
      end if;
      continue;
    end if;
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.ruta, r.quien, round(r.ms, 1), c_ms); end if;
    -- El tope va a una variable: un `if` de plpgsql termina en el primer `then`, también en el de un `case`.
    v_tope_buf := case r.quien when 'beto' then c_buf_beto else c_buf end;
    if r.buffers > v_tope_buf then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s buffers, el presupuesto es %s', r.fase, r.ruta, r.quien, r.buffers, v_tope_buf);
    end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre vehiculos entera', r.fase, r.ruta, r.quien); end if;
    if not r.indices ? 'vehiculos_origen_listado_idx' then v_fallas := v_fallas || format(E'\n  %s · %s · %s no camina vehiculos_origen_listado_idx: %s', r.fase, r.ruta, r.quien, r.indices); end if;
    if r.descartadas > 500 then v_fallas := v_fallas || format(E'\n  %s · %s · %s descarta %s filas', r.fase, r.ruta, r.quien, r.descartadas); end if;
    if r.llamadas ? 'alcance_de' then v_fallas := v_fallas || format(E'\n  %s · %s · %s llama a alcance_de por fila: %s', r.fase, r.ruta, r.quien, r.llamadas); end if;
    if r.quien = 'beto' then
      if coalesce((r.llamadas ->> 'en_cartera')::int, 0) > c_pagina then v_fallas := v_fallas || format(E'\n  %s · %s · Beto llama a en_cartera más de una vez por fila: %s', r.fase, r.ruta, r.llamadas); end if;
    elsif r.llamadas ? 'en_cartera' then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s pregunta por la cartera lo que ya sabe: %s', r.fase, r.ruta, r.quien, r.llamadas);
    end if;
    if coalesce((r.llamadas ->> 'origenes_con_alcance')::int, 0) > 2 then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s calcula los orígenes más de dos veces: %s', r.fase, r.ruta, r.quien, r.llamadas);
    end if;
  end loop;
  return v_fallas;
end $$;

do $$
declare r record; v_chico record; v_fallas text := pg_temp.fallas();
begin
  for r in select * from _med order by fase, quien, ruta loop
    raise notice 'medicion|% · % · % (ms%)|%', r.fase, r.ruta, r.quien, case r.quien when 'chica' then ', sin assert, 4-23' else '' end, round(r.ms, 2);
    raise notice 'medicion|% · % · % (buffers%)|%', r.fase, r.ruta, r.quien, case r.quien when 'chica' then ', sin assert, 4-23' else '' end, r.buffers;
    raise notice 'medicion|% · % · % (llamadas a en_cartera)|%', r.fase, r.ruta, r.quien, coalesce((r.llamadas ->> 'en_cartera')::int, 0);
  end loop;
  -- No crece con N (la chica no: recorre todo A, 4-23).
  for v_chico in select a.ruta, a.quien, a.ms as ms_chico, a.buffers as buf_chico, b.ms as ms_grande, b.buffers as buf_grande
                   from _med a join _med b on b.ruta = a.ruta and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' where a.quien <> 'chica' loop
    raise notice 'medicion|% · % · razón de ms con 250.000 sobre 50.000 (veces)|%', v_chico.ruta, v_chico.quien, round(v_chico.ms_grande / nullif(v_chico.ms_chico, 0), 2);
    if v_chico.ms_grande > greatest(1.5 * v_chico.ms_chico, v_chico.ms_chico + 3) then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms con 50.000 y %s con 250.000', v_chico.ruta, v_chico.quien, round(v_chico.ms_chico, 1), round(v_chico.ms_grande, 1));
    end if;
    if v_chico.buf_grande > 1.2 * v_chico.buf_chico + 20 then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s buffers con 50.000 y %s con 250.000', v_chico.ruta, v_chico.quien, v_chico.buf_chico, v_chico.buf_grande);
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'La lectura de vehículos rompe su presupuesto:%', v_fallas; end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La guarda: la policy y la función de antes (copias de `…20261013000100` y `…20261011000200`), con los mismos datos, rompen esos asserts en Beto. La dueña y Pía no
-- llegan a la rama de la cartera: con la vieja cuestan lo mismo (se mide y se anota). La chica, con la vieja, se anota para comparar.
-- ---------------------------------------------------------------------------------------------------------------------------------
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
create or replace function public.puede_vehiculo(p_vehiculo uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $f$
  select exists (
    select 1 from public.vehiculos v
    where v.id = p_vehiculo and v.eliminado_en is null
      and (public.alcance_de(p_clave, v.origen_id) = 'todos'
        or (public.alcance_de(p_clave, v.origen_id) = 'propios' and (v.creado_por = (select auth.uid()) or v.lead_id in (select public.mis_leads()))))
  );
$f$;
delete from _med;
set local role authenticated;
deallocate all;
select pg_temp.preparar();
select pg_temp.ruta('vieja', 'duena');
select pg_temp.ruta('vieja', 'pia');
select pg_temp.ruta('vieja', 'beto');
select pg_temp.puede_de_beto('vieja');
select pg_temp.ruta('vieja', 'chica');
reset role;
do $$
declare r record; v_beto text := pg_temp.fallas('vieja');
begin
  for r in select * from _med order by quien, ruta loop
    raise notice 'medicion|Guarda, lo de antes, 250.000 · % · % (ms)|%', r.ruta, r.quien, round(r.ms, 2);
    raise notice 'medicion|Guarda, lo de antes, 250.000 · % · % (buffers)|%', r.ruta, r.quien, r.buffers;
    raise notice 'medicion|Guarda, lo de antes, 250.000 · % · % (llamadas a mis_leads)|%', r.ruta, r.quien, coalesce((r.llamadas ->> 'mis_leads')::int, 0);
  end loop;
  -- Tiene que caer en la página de Beto (la policy) y en su puede_vehiculo (la función): así se sabe que los asserts distinguen lo viejo de lo nuevo.
  if v_beto !~ 'página 1 · beto' or v_beto !~ 'puede_vehiculo de Beto' then
    raise exception 'la guarda no muerde: lo de antes cumple los asserts de Beto (fallas de lo viejo:%)', coalesce(nullif(v_beto, ''), ' ninguna');
  end if;
end $$;
rollback;
vacuum public.vehiculos, public.leads_asesores;
