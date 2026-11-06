-- Medición del salto a una fecha de las revisiones de una cotización, con 5.000 revisiones en la cotización (paso 4.17-5a, 4-75): `pnpm db:medir:volumen`, contra el Supabase LOCAL
-- con la siembra de volumen (la dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: ninguna cotización ni revisión queda.
--
-- Qué se mide: `cotizacion_revisiones(…, p_hasta)` (definidora, con la guarda primero) como la dueña y como Ana, con el plan genérico (`plan_cache_mode = force_generic_plan`), de a `:ver_mas`
-- (TAMANO_DE_VER_MAS): el ancla, la más nueva de ESA cotización con `creado_en < p_hasta`, por `cotizaciones_revisiones_cotizacion_creado_idx`, y la página por id desde ella, por
-- `cotizaciones_revisiones_cotizacion_idx`. Las cotizaciones: una de la dueña y una de Ana con 5.000 revisiones cada una (el diff con todos los nodos de la fórmula de `subasta_usa`, de y a:
-- el peor caso), una de la dueña con 500 (la misma forma) y otra de fondo con 5.000 intercaladas en el tiempo (media hora de diferencia: sus ids son mayores y sus horas caen entre las otras).
-- La i-ésima revisión está a T0 + i minutos, con el id creciente. Los saltos salen del minuto, nunca de un `offset`: a una profundidad d (las d más nuevas quedan fuera) de `:ver_mas`, de la
-- mitad y de N − 2 × `:ver_mas` (la última con página entera), y en la de 500, el de la mitad.
--
-- Asserta:
--   - A1, por relación (`pg_stat_get_xact_blocks_fetched`, el promedio de las 5 calientes): el índice del salto y el de la página con bloques, `cotizaciones_revisiones_usuario_id_idx` con cero;
--     lo leído del heap y de los dos índices en el salto más hondo es a lo sumo 1,2 × lo del menos hondo + 20;
--   - A2, ≤ 12 ms por llamada (el presupuesto de una página de revisiones, `medir-cotizaciones-lectura.sql`);
--   - A3, `_nodos_visibles()`, `puede_cotizacion()` y `alcance_de()` una vez por llamada, y ninguna a `mis_leads()`;
--   - A4, la página trae `:ver_mas` filas y la primera tiene el `creado_en` del último antes de `p_hasta`;
--   - A5, no crece con N: lo leído del heap y de los dos índices en el salto de la mitad de la de 5.000 es a lo sumo 1,2 × lo del salto de la mitad de la de 500 + 20.
-- La guarda: con `cotizaciones_revisiones_cotizacion_creado_idx` quitado y `analyze`, el ancla recorre las revisiones de la cotización a cualquier profundidad: la cota relativa de A1 pasa,
-- pero A5 («crece con N») cae. Si no cayera esa línea, «la guarda no muerde».
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
vacuum public.cotizaciones_revisiones;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.n', :ver_mas::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el salto a una fecha de las revisiones: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _snap as select f.id as formula, o.id as origen,
       (select jsonb_object_agg(n ->> 'id', round((n_ord * 13.37)::numeric, 2)) from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, n_ord)) as valores,
       (select jsonb_object_agg(n ->> 'id', 'input') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tipo' in ('input', 'constante', 'tipo_cambio')) as fuentes
  from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.estado = 'publicada';
do $$ begin
  if (select count(*) from _snap) <> 1 then raise exception 'esperaba la fórmula publicada de subasta_usa y hay %', (select count(*) from _snap); end if;
end $$;
create temp table _c (clave text primary key, id uuid not null, n int not null);
do $$
declare v record; v_id uuid; k text;
begin
  select * into v from _snap;
  foreach k in array array['duena', 'ana', 'chica', 'fondo'] loop
    insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
    values (v.origen, case k when 'ana' then '00000000-0000-0000-0000-0000000000a1'::uuid else '00000000-0000-0000-0000-0000000000d1'::uuid end, v.formula, v.valores, v.fuentes,
            '{"oficial": 6.96, "paralelo": 12.4}', '{"usd": 1234.5}', 1234.5, 'Medir revisiones ' || k) returning id into v_id;
    insert into _c values (k, v_id, case k when 'chica' then 500 else 5000 end);
  end loop;
end $$;
-- Las revisiones, sin triggers (cada una auditaría y sellaría la versión): la i-ésima a T0 + i minutos (+ p_desfase segundos), con el id creciente.
create function pg_temp.sembrar(p_clave text, p_usuario uuid, p_desfase int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, creado_en)
  select c.id, p_usuario,
         jsonb_build_object('valores', jsonb_build_object('de', s.valores, 'a', jsonb_set(s.valores, '{remate}', to_jsonb(g))), 'notas', jsonb_build_object('de', null, 'a', 'nota ' || g)),
         timestamptz '2026-01-01 00:00:00+00' + g * interval '1 minute' + p_desfase * interval '1 second'
    from _c c cross join _snap s cross join generate_series(1, c.n) g where c.clave = p_clave order by g;
  set local session_replication_role = origin;
end $$;
select pg_temp.sembrar('duena', '00000000-0000-0000-0000-0000000000d1', 0);
select pg_temp.sembrar('ana', '00000000-0000-0000-0000-0000000000a1', 0);
select pg_temp.sembrar('chica', '00000000-0000-0000-0000-0000000000d1', 0);
select pg_temp.sembrar('fondo', '00000000-0000-0000-0000-0000000000d1', 1800);
-- Y el fondo de verdad: una revisión de cada una de 20.000 cotizaciones de la siembra (sus ids quedan entre las de las de arriba), para que el plan genérico estime filas por cotización como
-- en producción (muchas cotizaciones con pocas revisiones) y no como con cuatro cotizaciones de miles: con cuatro, la clave primaria y su filtro parecen más baratos que `cotizaciones_revisiones_cotizacion_idx`.
set local session_replication_role = replica;
insert into public.cotizaciones_revisiones (cotizacion_id, usuario_id, diff, creado_en)
select c.id, c.creado_por, jsonb_build_object('notas', jsonb_build_object('de', null, 'a', 'fondo')), timestamptz '2026-01-01 00:00:00+00' + (row_number() over (order by c.id)) * interval '17 seconds'
  from (select id, creado_por from public.cotizaciones where id not in (select id from _c) order by id limit 20000) c;
set local session_replication_role = origin;
analyze public.cotizaciones_revisiones;
do $$ begin
  if (select count(*) from public.cotizaciones_revisiones r join _c c on c.id = r.cotizacion_id) <> 15500 then raise exception 'esperaba 15.500 revisiones propias'; end if;
end $$;
-- Las relaciones de `cotizaciones_revisiones`: el heap, su TOAST y cada índice.
create temp table _rel as
select c.oid, case when c.oid = 'public.cotizaciones_revisiones'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.cotizaciones_revisiones'::regclass or c.oid in (select indexrelid from pg_index where indrelid = 'public.cotizaciones_revisiones'::regclass)
union all select t.reltoastrelid, 'toast' from pg_class t where t.oid = 'public.cotizaciones_revisiones'::regclass and t.reltoastrelid <> 0;
grant select on _rel, _p, _c to authenticated;
create temp table _med (fase text, quien text, cot text, d int, ms numeric, bloques jsonb, total numeric, llamadas jsonb, filas int, primera timestamptz, esperada timestamptz);
grant all on _med to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;
create function pg_temp.una(p_sql text) returns jsonb language plpgsql as $$
declare r jsonb; begin execute p_sql into r; return r; end $$;

-- Una consulta, 7 veces (las 2 primeras calientan): la mediana de ms de las calientes y el promedio de bloques leídos por relación de `cotizaciones_revisiones`.
create function pg_temp.medir(p_sql text) returns jsonb language plpgsql as $$
declare v_plan jsonb; v_ms numeric[] := '{}'; i int; b0 jsonb; b1 jsonb; v_suma jsonb := '{}'; k text;
begin
  for i in 1 .. 7 loop
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b0 from _rel r;
    execute 'explain (analyze, format json) ' || p_sql into v_plan;
    select jsonb_object_agg(r.nombre, pg_stat_get_xact_blocks_fetched(r.oid)) into b1 from _rel r;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    for k in select jsonb_object_keys(b1) loop
      v_suma := v_suma || jsonb_build_object(k, coalesce((v_suma ->> k)::numeric, 0) + (b1 ->> k)::numeric - (b0 ->> k)::numeric);
    end loop;
  end loop;
  return jsonb_build_object('ms', (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
                            'bloques', (select jsonb_object_agg(key, round(value::numeric / 5, 1)) from jsonb_each_text(v_suma)));
end $$;
-- Cuántas veces llama a cada función UNA ejecución (el delta de `pg_stat_xact_user_functions`).
create function pg_temp.llamadas(p_ejecutar text) returns jsonb language plpgsql as $$
declare v_antes jsonb; v_despues jsonb;
begin
  select coalesce(jsonb_object_agg(funcname, calls), '{}') into v_antes from pg_stat_xact_user_functions where schemaname = 'public';
  execute p_ejecutar;
  select coalesce(jsonb_object_agg(funcname, calls), '{}') into v_despues from pg_stat_xact_user_functions where schemaname = 'public';
  return (select coalesce(jsonb_object_agg(k, coalesce((v_despues ->> k)::bigint, 0) - coalesce((v_antes ->> k)::bigint, 0)), '{}')
            from (select jsonb_object_keys(v_despues) k) x
           where coalesce((v_despues ->> k)::bigint, 0) - coalesce((v_antes ->> k)::bigint, 0) > 0);
end $$;

-- Un salto: la cotización `p_cot`, como `p_quien`, con las `p_d` más nuevas fuera (el ancla es la (N − p_d)-ésima, a T0 + (N − p_d) minutos; p_hasta, medio minuto después).
create function pg_temp.salto(p_fase text, p_quien text, p_cot text, p_d int) returns void language plpgsql as $$
declare
  v_c record; v_k int; v_hasta timestamptz; v_sql text; v_m jsonb; v_r jsonb;
begin
  perform pg_temp.como(p_quien);
  select * into v_c from _c where clave = p_cot;
  v_k := v_c.n - p_d;
  v_hasta := timestamptz '2026-01-01 00:00:00+00' + v_k * interval '1 minute' + interval '30 seconds';
  v_sql := format('select public.cotizacion_revisiones(%L, null, %s, %L)', v_c.id, current_setting('medir.n'), v_hasta);
  v_m := pg_temp.medir(v_sql);
  v_r := pg_temp.una(v_sql);
  insert into _med select p_fase, p_quien, p_cot, p_d, (v_m ->> 'ms')::numeric, v_m -> 'bloques', (select sum(value::numeric) filter (where key in ('heap', 'toast') or key like 'cotizaciones_revisiones_cotizacion%') from jsonb_each_text(v_m -> 'bloques')),
                          pg_temp.llamadas(v_sql), jsonb_array_length(v_r -> 'revisiones'), ((v_r -> 'revisiones' -> 0) ->> 'creado_en')::timestamptz,
                          timestamptz '2026-01-01 00:00:00+00' + v_k * interval '1 minute';
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- Los asserts de una fase; devuelven las fallas como texto (vacío si cumple).
create function pg_temp.fallas(p_fase text) returns text language plpgsql as $$
declare
  r record; v_f text := ''; v_n int := current_setting('medir.n')::int; v_ix text; v_prim numeric; v_hondo numeric; v_otro text; v_m5000 numeric; v_m500 numeric; v_otros text;
begin
  for r in select * from _med where fase = p_fase order by quien, cot, d loop
    -- A1: el índice del salto y el de la página con bloques; el de `usuario_id`, cero.
    foreach v_ix in array array['cotizaciones_revisiones_cotizacion_creado_idx', 'cotizaciones_revisiones_cotizacion_idx'] loop
      if not (r.bloques ? v_ix) then v_f := v_f || format(E'\n  %s · %s · d=%s: no existe el índice %s (o no se leyó)', r.quien, r.cot, r.d, v_ix);
      elsif (r.bloques ->> v_ix)::numeric = 0 then v_f := v_f || format(E'\n  %s · %s · d=%s: %s sin bloques', r.quien, r.cot, r.d, v_ix);
      end if;
    end loop;
    if coalesce((r.bloques ->> 'cotizaciones_revisiones_usuario_id_idx')::numeric, 0) > 0 then
      v_f := v_f || format(E'\n  %s · %s · d=%s: leyó cotizaciones_revisiones_usuario_id_idx (%s bloques)', r.quien, r.cot, r.d, r.bloques ->> 'cotizaciones_revisiones_usuario_id_idx');
    end if;
    -- A2: el presupuesto de una página de revisiones.
    if r.ms > 12 then v_f := v_f || format(E'\n  %s · %s · d=%s: %s ms, el presupuesto de una página de revisiones es 12', r.quien, r.cot, r.d, round(r.ms, 1)); end if;
    -- A3: lo caro, una vez.
    if coalesce((r.llamadas ->> '_nodos_visibles')::int, 0) <> 1 then v_f := v_f || format(E'\n  %s · %s · d=%s llama a _nodos_visibles %s veces: %s', r.quien, r.cot, r.d, coalesce(r.llamadas ->> '_nodos_visibles', '0'), r.llamadas); end if;
    if r.llamadas ? 'mis_leads' or coalesce((r.llamadas ->> 'puede_cotizacion')::int, 0) <> 1 then v_f := v_f || format(E'\n  %s · %s · d=%s pregunta mal por el permiso: %s', r.quien, r.cot, r.d, r.llamadas); end if;
    if coalesce((r.llamadas ->> 'alcance_de')::int, 0) <> 1 then v_f := v_f || format(E'\n  %s · %s · d=%s pide alcance_de %s veces (debe ser 1): %s', r.quien, r.cot, r.d, coalesce(r.llamadas ->> 'alcance_de', '0'), r.llamadas); end if;
    -- A4: la página trae `n` filas y empieza en el último antes de p_hasta.
    if r.filas <> v_n or r.primera is distinct from r.esperada then
      v_f := v_f || format(E'\n  %s · %s · d=%s: %s filas, empieza en %s (esperaba %s y %s)', r.quien, r.cot, r.d, r.filas, r.primera, v_n, r.esperada);
    end if;
  end loop;
  -- A1: no crece con la profundidad (el salto más hondo contra el menos hondo, de cada cotización de 5.000).
  for r in select quien, cot from _med where fase = p_fase and cot <> 'chica' group by quien, cot order by quien loop
    select total into v_prim from _med where fase = p_fase and quien = r.quien and cot = r.cot order by d limit 1;
    select total into v_hondo from _med where fase = p_fase and quien = r.quien and cot = r.cot order by d desc limit 1;
    if v_hondo > 1.2 * v_prim + 20 then v_f := v_f || format(E'\n  crece con la profundidad (%s · %s): %s bloques en el salto menos hondo y %s en el más hondo', r.quien, r.cot, v_prim, v_hondo); end if;
  end loop;
  -- A5: no crece con N (el salto de la mitad de la de 5.000 contra el de la mitad de la de 500).
  select total into v_m5000 from _med where fase = p_fase and quien = 'duena' and cot = 'duena' and d = 2500;
  select total into v_m500 from _med where fase = p_fase and quien = 'duena' and cot = 'chica' and d = 250;
  if v_m5000 > 1.2 * v_m500 + 20 then v_f := v_f || format(E'\n  crece con N: %s bloques en el salto de la mitad con 5.000 y %s con 500', v_m5000, v_m500); end if;
  return v_f;
end $$;
grant execute on function pg_temp.fallas(text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Medir y asertar
-- ---------------------------------------------------------------------------------------------------------------------------------
set local track_functions = 'all';
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.salto('hoy', q, c, d)
  from (values ('duena', 'duena'), ('ana', 'ana')) t (q, c)
 cross join (select unnest(array[current_setting('medir.n')::int, 2500, 5000 - 2 * current_setting('medir.n')::int]) as d) p;
select pg_temp.salto('hoy', 'duena', 'chica', 250);
reset role;
do $$
declare r record; v_fallas text := pg_temp.fallas('hoy');
begin
  for r in select * from _med where fase = 'hoy' order by quien, cot, d loop
    raise notice 'medicion|Salto a una fecha · % · % · d=% (ms)|%', r.quien, r.cot, r.d, round(r.ms, 2);
    raise notice 'medicion|Salto a una fecha · % · % · d=% (bloques de revisiones)|%', r.quien, r.cot, r.d, round(r.total, 1);
    raise notice 'nota|Bloques por relación · % · % · d=%: %|', r.quien, r.cot, r.d, r.bloques;
  end loop;
  if v_fallas <> '' then raise exception 'El salto a una fecha de las revisiones rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: sin el índice del salto, A5 («crece con N») tiene que caer; la línea de A1 que dice que el índice no existe no cuenta.
drop index public.cotizaciones_revisiones_cotizacion_creado_idx;
analyze public.cotizaciones_revisiones;
delete from _rel where nombre = 'cotizaciones_revisiones_cotizacion_creado_idx';
set local role authenticated;
select pg_temp.salto('sin', 'duena', 'duena', 2500);
select pg_temp.salto('sin', 'duena', 'chica', 250);
reset role;
do $$
declare v_sin text := pg_temp.fallas('sin');
begin
  if v_sin !~ 'crece con N' then raise exception 'la guarda no muerde: sin el índice del salto el contraste con N cumple (fallas:%)', coalesce(nullif(v_sin, ''), ' ninguna'); end if;
  raise notice 'nota|guarda: cae (sin el índice del salto: %)|', replace(substring(v_sin from 'crece con N[^\n]*'), '|', '/');
end $$;
rollback;
vacuum public.cotizaciones_revisiones;
