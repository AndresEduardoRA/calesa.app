-- Medición de la lectura de cotizaciones con 50.000 y con 250.000 filas (paso 4.10, prompt 1): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de
-- volumen (la dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: ninguna cotización queda.
--
-- Qué se mide: la ruta que usará el listado de `/cotizaciones` (4.16): una página de `n + 1` filas (el mayor de `TAMANOS_DE_PAGINA`, más una para saber si hay otra) ordenada por
-- `creado_en desc, id desc`, la primera y una profunda por cursor `(creado_en, id) <`, con las columnas que se leen (las que el 4.10 deja legibles: el snapshot no). Dos rutas:
--   - «Todas», de la dueña («todos»): `cotizaciones_listado_idx`;
--   - «Mías», de Ana (5.000 propias, con 1.000 de otras personas sobre leads de su cartera) y de la «chica» (3): `cotizaciones_creador_idx`.
-- Como `authenticated`, con el plan genérico (lo que arma plpgsql tras unas llamadas: los valores del cursor entran como parámetros), `EXPLAIN (ANALYZE, BUFFERS)` ×7 y la mediana de las
-- 5 últimas, y la carga de la máquina (`/proc/loadavg`) anotada. La policy de lectura corre por fila: lo que se asserta es que su costo no depende de cuántas cotizaciones hay ni de
-- cuántos leads tiene quien mira.
--
-- Asserta, con los dos volúmenes:
--   - el plan: el índice que sostiene la ruta, sin `Seq Scan` de `cotizaciones` y sin descartar filas que crezcan con N;
--   - el presupuesto de una página: ≤ 10 ms y ≤ 300 buffers (medido: 0,5 a 0,7 ms y 102 a 153 buffers; los topes dejan una vuelta de margen para una máquina ocupada);
--   - que no crece con N: con 250.000 el tiempo es a lo sumo `greatest(1,5 × el de 50.000, el de 50.000 + 3 ms)` y los buffers a lo sumo 1,2 × los de 50.000 + 20;
--   - que la policy no pregunta por fila lo que ya sabe: ninguna llamada a `alcance_de()`, a `mis_leads()` ni a `en_cartera()` en esas páginas (Mías: ser la creadora ya
--     decide), y `origenes_con_alcance()` a lo sumo dos veces (los dos InitPlan);
--   - la guarda: la policy de antes (`lead_id in (select mis_leads())` y `alcance_de()` por fila) con los mismos datos llama a `alcance_de()` por fila (101 y 202 veces por página) y no
--     pasa esta prueba. Su costo en ms con los datos de arriba es de 3 a 6 ms: lo que crecía con la cartera de quien mira era el arreglo de `mis_leads()`, que sólo se arma en lo ajeno.
-- No se asserta «todas las que veo» de quien ve «propios» (Ana, la «chica»): recorre el índice global descartando lo ajeno y crece con N. Se mide y se anota (`docs/PLAN.md`, 4-14).
-- Cada línea `medicion|…|número` sale por el runner (`scripts/medir-listado.mjs`); las `nota|…`, también.
-- Las corridas anteriores de esta medición se revierten, pero sus 300.000 tuplas muertas quedan en el heap y en los índices hasta que alguien las limpie, con las mismas fechas que
-- las de ahora: la página 1 (las más nuevas) tendría que saltar las muertas de las corridas de antes (102 buffers la primera vez, 1.873 la segunda). Se limpian antes de medir y,
-- para no ensuciar la medición que sigue, después. VACUUM no corre dentro de una transacción: va fuera del begin.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones;
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:max_selector + 1)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if (select count(*) from public.cotizaciones) > 0 then
    raise exception 'la base ya trae cotizaciones: la medición cuenta con 50.000 y 250.000 propias (pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir la lectura de cotizaciones: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres: la «chica» (una asesora con 3 cotizaciones) y los tres orígenes de la semilla con su fórmula publicada
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1'), ('berta', '00000000-0000-0000-0000-0000000000b1'),
  ('carlos', '00000000-0000-0000-0000-0000000000b2'), ('diana', '00000000-0000-0000-0000-0000000000b3'), ('elias', '00000000-0000-0000-0000-0000000000b4'),
  ('chica', '00000000-0000-0000-0000-0000000000c9');
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c9', 'medir-cot-chica@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Chica cotizaciones', invitacion_aceptada_en = now() where id = '00000000-0000-0000-0000-0000000000c9';
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-0000000000c9', id, true from public.roles where clave = 'asesor' on conflict do nothing;
create temp table _o (i int primary key, origen uuid not null, formula uuid not null);
insert into _o select row_number() over (order by o.clave), o.id, f.id from public.origenes o join public.formulas f on f.origen_id = o.id and f.estado = 'publicada'
  where o.clave in ('subasta_usa', 'planilla_usa', 'oficina');
-- Una fila de verdad pesa: el snapshot de una cotización (60 nodos de valores y 30 de fuentes) se guarda comprimido y fuera de línea, y es lo que un listado NO lee.
create temp table _snap as select (select jsonb_object_agg('nodo_' || i, round((i * 1.37)::numeric, 2)) from generate_series(1, 60) i) as valores,
                                  (select jsonb_object_agg('nodo_' || i, 'input') from generate_series(1, 30) i) as fuentes;
create temp table _leads_de_ana (i int primary key, lead uuid not null);
insert into _leads_de_ana select row_number() over (), lead_id from (select la.lead_id from public.leads_asesores la
  where la.usuario_id = '00000000-0000-0000-0000-0000000000a1' and la.revocado_en is null limit 1000) x;
do $$ begin
  if (select count(*) from _o) <> 3 then raise exception 'esperaba los tres orígenes de la semilla con su fórmula publicada y hay %', (select count(*) from _o); end if;
  if (select count(*) from _leads_de_ana) < 1000 then raise exception 'Ana debía tener al menos 1.000 leads en su cartera y tiene %', (select count(*) from _leads_de_ana); end if;
end $$;
grant select on _p, _o to authenticated;

-- Las filas g ∈ [desde, hasta], más nuevas cuanto mayor es g. Ana (5.000 propias, 3.000 de ellas con la MISMA fecha: lo que deja una importación, y lo que obliga a que `id` sea parte del
-- índice y del cursor) y las 1.000 de otras personas sobre leads de su cartera están en las primeras 50.000;
-- la «chica» tiene 3; las demás son de la dueña y de cuatro asesores, la mayoría sin lead. Sin triggers (cada fila auditaría y numeraría): las FK no se mira, los ids son los de arriba.
create function pg_temp.rellenar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, valores, fuentes, tipos_cambio, totales, total_base, titulo, creado_en, actualizado_en)
  select o.origen,
         case when g <= 50000 and g % 10 = 1 then (select id from _p where clave = 'ana')
              when g in (10001, 20001, 30001) then (select id from _p where clave = 'chica')
              when g <= 50000 and g % 50 = 2 then (select id from _p where clave = 'berta')
              else (select id from _p where clave = (array['duena', 'berta', 'carlos', 'diana', 'elias'])[1 + g % 5]) end,
         o.formula,
         case when g <= 50000 and g % 50 = 2 then (select lead from _leads_de_ana where i = 1 + (g / 50) % 1000) end,
         s.valores, s.fuentes, '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5,
         case when g <= 50000 and (g % 10 = 1 or g in (10001, 20001, 30001)) then 'Cotización ' || g end,
         case when g between 2000 and 32000 and g % 10 = 1 then timestamptz '2026-01-01 00:00:00+00'      -- 3.000 de Ana con la misma fecha (una importación): el cursor cae dentro
              else timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds' end,
         case when g between 2000 and 32000 and g % 10 = 1 then timestamptz '2026-01-01 00:00:00+00'
              else timestamptz '2026-01-01 00:00:00+00' + g * interval '10 seconds' end
    from generate_series(p_desde, p_hasta) g
    join _o o on o.i = 1 + g % 3
   cross join _snap s;
  set local session_replication_role = origin;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
-- Una consulta preparada: 7 corridas de EXPLAIN EXECUTE, la mediana de ms y de buffers de las 5 últimas, los índices que usó, si recorrió `cotizaciones` entera y
-- cuántas filas descartó.
create function pg_temp.medir(p_ejecutar text) returns jsonb language plpgsql as $$
declare
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_clave text; v_b bigint; i int; v_texto text;
begin
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || p_ejecutar into v_plan;
    continue when i <= 2;
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
    'seq', exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "cotizaciones"', 'g')),
    'descartadas', coalesce((select sum(m[1]::numeric) from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
end $$;

-- Cuántas veces llama a cada función UNA ejecución de la consulta (el delta de `pg_stat_xact_user_functions`; `track_functions = 'all'` se pone antes de cambiar de rol).
create function pg_temp.llamadas(p_ejecutar text) returns jsonb language plpgsql as $$
declare
  v_antes jsonb; v_despues jsonb; r record; v_n bigint;
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

-- Prepara las cuatro consultas del listado como authenticated: sin el snapshot (select de las columnas legibles).
create function pg_temp.preparar() returns void language plpgsql as $$
declare
  v_cols constant text := 'id, numero, origen_id, lead_id, vehiculo_id, creado_por, clase, estado, titulo, total_base, moneda_mostrar, creado_en';
  v_n constant text := current_setting('medir.pagina');
begin
  execute 'prepare c_todas as select ' || v_cols || ' from public.cotizaciones order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare c_todas_cursor(timestamptz, uuid) as select ' || v_cols || ' from public.cotizaciones where (creado_en, id) < ($1, $2) order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare c_mias(uuid) as select ' || v_cols || ' from public.cotizaciones where creado_por = $1 order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare c_mias_cursor(uuid, timestamptz, uuid) as select ' || v_cols || ' from public.cotizaciones where creado_por = $1 and (creado_en, id) < ($2, $3) order by creado_en desc, id desc limit ' || v_n;
  execute 'prepare c_ver_todas(uuid) as select ' || v_cols || ' from public.cotizaciones order by creado_en desc, id desc limit ' || v_n;
end $$;

-- Una persona, una ruta y su cursor profundo (la fila 2.000 de esa ruta, vista por esa persona); apunta lo medido en `_med`.
create function pg_temp.ruta(p_fase text, p_ruta text, p_quien text, p_profundidad int default 2000) returns void language plpgsql as $$
declare
  v_id uuid := (select id from _p where clave = p_quien);
  v_ts timestamptz; v_cur uuid; v_args text; v_args2 text; v_m jsonb; v_llamadas jsonb;
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  if p_ruta = 'todas' then
    select creado_en, id into v_ts, v_cur from public.cotizaciones order by creado_en desc, id desc offset p_profundidad limit 1;
    v_args := 'c_todas'; v_args2 := format('c_todas_cursor(%L, %L)', v_ts, v_cur);
  else
    -- El cursor de Ana cae en medio del grupo de 3.000 con la misma fecha (la fila 2.500 de sus 5.000; las 1.800 más nuevas tienen fecha propia); el de la «chica», en su segunda fila.
    select creado_en, id into v_ts, v_cur from public.cotizaciones where creado_por = v_id order by creado_en desc, id desc offset case when p_quien = 'ana' then 2500 else 1 end limit 1;
    v_args := format('c_mias(%L)', v_id); v_args2 := format('c_mias_cursor(%L, %L, %L)', v_id, v_ts, v_cur);
  end if;
  v_m := pg_temp.medir('execute ' || v_args);
  v_llamadas := pg_temp.llamadas('execute ' || v_args);
  insert into _med values (p_fase, p_ruta || ' · página 1', p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'descartadas')::numeric, v_llamadas);
  v_m := pg_temp.medir('execute ' || v_args2);
  v_llamadas := pg_temp.llamadas('execute ' || v_args2);
  insert into _med values (p_fase, p_ruta || ' · profunda', p_quien, (v_m ->> 'ms')::numeric, (v_m ->> 'buffers')::bigint, v_m -> 'indices', (v_m ->> 'seq')::boolean, (v_m ->> 'descartadas')::numeric, v_llamadas);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 1: 50.000 cotizaciones
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(1, 50000);
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 50000 then raise exception 'esperaba 50.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
  if (select count(*) from public.cotizaciones where creado_por = '00000000-0000-0000-0000-0000000000a1') <> 5000 then raise exception 'Ana debía tener 5.000 propias'; end if;
end $$;
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.preparar();
select pg_temp.ruta('50.000', 'todas', 'duena');
select pg_temp.ruta('50.000', 'mias', 'ana');
select pg_temp.ruta('50.000', 'mias', 'chica');
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Fase 2: 250.000 cotizaciones (200.000 más nuevas, de la dueña y de cuatro asesores)
-- ---------------------------------------------------------------------------------------------------------------------------------
select pg_temp.rellenar(50001, 250000);
analyze public.cotizaciones;
do $$ begin
  if (select count(*) from public.cotizaciones) <> 250000 then raise exception 'esperaba 250.000 cotizaciones y hay %', (select count(*) from public.cotizaciones); end if;
end $$;
set local role authenticated;
select pg_temp.ruta('250.000', 'todas', 'duena');
select pg_temp.ruta('250.000', 'mias', 'ana');
select pg_temp.ruta('250.000', 'mias', 'chica');
reset role;

-- «Todas las que veo» de quien ve «propios»: se mide y se anota, sin assert (4-14).
set local role authenticated;
do $$
declare
  v_id uuid; v_m jsonb; v_q text; v_quien text; v_fase text;
begin
  foreach v_quien in array array['ana', 'chica'] loop
    v_id := (select id from _p where clave = v_quien);
    perform set_config('request.jwt.claim.sub', v_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
    v_m := pg_temp.medir('execute c_ver_todas(' || quote_literal(v_id) || ')');
    raise notice 'medicion|Todas las que veo (sin assert, 4-14), %, página 1, 250.000 (ms)|%', v_quien, round((v_m ->> 'ms')::numeric, 2);
    raise notice 'medicion|Todas las que veo (sin assert, 4-14), %, página 1, 250.000 (buffers)|%', v_quien, v_m ->> 'buffers';
  end loop;
end $$;
reset role;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Lo que se asserta
-- ---------------------------------------------------------------------------------------------------------------------------------
do $$
declare
  r record; v_chico record; v_fallas text := '';
  v_indice constant jsonb := '{"todas": "cotizaciones_listado_idx", "mias": "cotizaciones_creador_idx"}';
begin
  for r in select * from _med order by fase, ruta, quien loop
    raise notice 'medicion|% · % · % (ms)|%', r.fase, r.ruta, r.quien, round(r.ms, 2);
    raise notice 'medicion|% · % · % (buffers)|%', r.fase, r.ruta, r.quien, r.buffers;
    if r.ms > 10 then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es 10', r.fase, r.ruta, r.quien, round(r.ms, 1)); end if;
    if r.buffers > 300 then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s buffers, el presupuesto es 300', r.fase, r.ruta, r.quien, r.buffers); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre cotizaciones entera', r.fase, r.ruta, r.quien); end if;
    if not r.indices ? (v_indice ->> split_part(r.ruta, ' ', 1)) then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s no usa %s: %s', r.fase, r.ruta, r.quien, v_indice ->> split_part(r.ruta, ' ', 1), r.indices);
    end if;
    if r.descartadas > 500 then v_fallas := v_fallas || format(E'\n  %s · %s · %s descarta %s filas', r.fase, r.ruta, r.quien, r.descartadas); end if;
    if r.llamadas ? 'alcance_de' or r.llamadas ? 'mis_leads' or r.llamadas ? 'en_cartera' then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s pregunta por fila lo que ya sabe: %s', r.fase, r.ruta, r.quien, r.llamadas);
    end if;
    if coalesce((r.llamadas ->> 'origenes_con_alcance')::int, 0) > 2 then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s calcula los orígenes más de dos veces: %s', r.fase, r.ruta, r.quien, r.llamadas);
    end if;
  end loop;
  -- No crece con N.
  for v_chico in select a.ruta, a.quien, a.ms as ms_chico, a.buffers as buf_chico, b.ms as ms_grande, b.buffers as buf_grande
                   from _med a join _med b on b.ruta = a.ruta and b.quien = a.quien and a.fase = '50.000' and b.fase = '250.000' loop
    raise notice 'medicion|% · % · razón de ms con 250.000 sobre 50.000 (veces)|%', v_chico.ruta, v_chico.quien, round(v_chico.ms_grande / nullif(v_chico.ms_chico, 0), 2);
    if v_chico.ms_grande > greatest(1.5 * v_chico.ms_chico, v_chico.ms_chico + 3) then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s ms con 50.000 y %s con 250.000', v_chico.ruta, v_chico.quien, round(v_chico.ms_chico, 1), round(v_chico.ms_grande, 1));
    end if;
    if v_chico.buf_grande > 1.2 * v_chico.buf_chico + 20 then
      v_fallas := v_fallas || format(E'\n  %s · %s crece con N: %s buffers con 50.000 y %s con 250.000', v_chico.ruta, v_chico.quien, v_chico.buf_chico, v_chico.buf_grande);
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'La lectura de cotizaciones rompe su presupuesto:%', v_fallas; end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- La guarda: la policy de antes, con los mismos datos, rompe esos presupuestos
-- ---------------------------------------------------------------------------------------------------------------------------------
drop policy "cotizaciones: leer" on public.cotizaciones;
create policy "cotizaciones: leer" on public.cotizaciones for select to authenticated using (
  eliminado_en is null and ((select public.alcance_de('cotizaciones.ver', origen_id)) = 'todos'
    or ((select public.alcance_de('cotizaciones.ver', origen_id)) = 'propios' and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads())))));
set local role authenticated;
do $$
declare
  v_id uuid; v_m jsonb; v_l jsonb; v_quien text; v_mala text := '';
begin
  foreach v_quien in array array['duena', 'ana'] loop
    v_id := (select id from _p where clave = v_quien);
    perform set_config('request.jwt.claim.sub', v_id::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
    -- Se vuelve a preparar: el plan de antes de cambiar la policy ya no vale.
    deallocate all;
    perform pg_temp.preparar();
    v_m := pg_temp.medir(case v_quien when 'duena' then 'execute c_todas' else format('execute c_mias(%L)', v_id) end);
    v_l := pg_temp.llamadas(case v_quien when 'duena' then 'execute c_todas' else format('execute c_mias(%L)', v_id) end);
    raise notice 'medicion|Guarda, la policy de antes, 250.000, % (ms; tiene que pasar de 10 o llamar a alcance_de por fila)|%', v_quien, round((v_m ->> 'ms')::numeric, 2);
    raise notice 'medicion|Guarda, la policy de antes, 250.000, % (buffers)|%', v_quien, v_m ->> 'buffers';
    raise notice 'medicion|Guarda, la policy de antes, 250.000, % (llamadas a alcance_de por página)|%', v_quien, coalesce((v_l ->> 'alcance_de')::int, 0);
    if (v_m ->> 'ms')::numeric <= 10 and coalesce((v_l ->> 'alcance_de')::int, 0) = 0 and (v_m ->> 'buffers')::bigint <= 300 then
      v_mala := v_mala || v_quien || ' ';
    end if;
  end loop;
  if v_mala <> '' then raise exception 'la guarda no muerde: la policy de antes cumple el presupuesto para %', v_mala; end if;
end $$;
reset role;
rollback;
vacuum public.cotizaciones;
