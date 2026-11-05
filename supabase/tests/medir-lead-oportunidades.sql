-- Medición de las oportunidades de un lead por cursor con 1.000 en el lead y 20.000 de fondo (paso 4.17-1, 5a-12): `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de
-- volumen (la dueña y Ana de `sembrar.sql`). Todo en una transacción que se revierte: ninguna oportunidad ni lead queda.
--
-- Qué se mide: `lead_oportunidades()` (invocadora: la RLS decide) como Ana, con el plan genérico (`plan_cache_mode = force_generic_plan`), de a `:ver_mas` (TAMANO_DE_VER_MAS) sobre
-- un lead de su cartera con 1.000 oportunidades suyas (500 abiertas y 500 cerradas) y 1.000 de la dueña. Las páginas salen de 500 y de `:ver_mas`, nunca escritas a mano: la 1, una profunda
-- de las abiertas (⌈a / 2⌉, con a = ⌈500 / :ver_mas⌉), la última de las abiertas (a), la que sigue (a + 1: el paso de abiertas a cerradas) y una profunda de las cerradas (⌈1000 / :ver_mas⌉).
-- Por qué el fondo: el plan genérico estima las filas de `(lead_id, usuario_id)` por el promedio de la tabla, no por el lead. Con miles de leads de una o dos oportunidades estimaría menos de
-- una página y podría elegir `oportunidades_lead_id_idx` y ordenar; con unas 100 por lead (≈ 50 por persona y lead, 200 leads) estima más que `n + 1` y mide el plan de un lead con muchas
-- (como `medir-historial-del-vehiculo.sql`). Con `-v fondo_leads=50` se repite con 50 leads de unas 400 filas (la salida si el plan genérico prefiriera la FK).
--
-- Asserta:
--   - Assert 1, el plan de cada ruta (la consulta de la ruta, con el mismo texto que la función, en EXPLAIN): `Index Scan` por su índice parcial, con el estado literal, sin `Sort`, sin `Seq Scan` de
--     `oportunidades` y con `Rows Removed by Filter` ≤ 1;
--   - Assert 2, sobre la llamada real y por relación (`pg_stat_get_xact_blocks_fetched`, el promedio de las 5 calientes): en cada página sólo los parciales que esa ruta debe leer tienen bloques, y
--     `oportunidades_lead_id_idx`, `oportunidades_tablero_idx` y los demás índices tienen cero; lo leído de `oportunidades` y de sus índices en la última página es a lo sumo 1,2 × lo de la página 1 + 20;
--   - Assert 3, ≤ 15 ms por llamada; Assert 4, los bytes de la página 1 con 1.000 en el lead ≤ 1,05 × los de la página 1 con 21.
-- La guarda: con los dos parciales quitados el Assert 1 o el 2 cae («guarda: cae»); si no cayera, «la guarda no muerde».
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
\if :{?fondo_leads}
\else
\set fondo_leads 200
\endif
vacuum public.oportunidades;
begin;
select set_config('medir.carga', :'carga', true), set_config('medir.n', :ver_mas::text, true), set_config('medir.fondo', :fondo_leads::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') or not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000a1') then
    raise exception 'faltan la dueña y Ana de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  if transaction_timestamp() = statement_timestamp() then
    raise exception 'la medición tiene que correr dentro de su begin';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir las oportunidades de un lead: %|', current_setting('medir.carga');
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- El terreno, como postgres (sin triggers de oportunidades: fijan el estado y la hora)
-- ---------------------------------------------------------------------------------------------------------------------------------
create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1');
create temp table _l (clave text primary key, id uuid not null);
do $$
declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); u uuid; v_l uuid;
begin
  perform public._embudo_defecto_de('00000000-0000-0000-0000-0000000000d1'); perform public._embudo_defecto_de('00000000-0000-0000-0000-0000000000a1');
  -- El lead L (1.000 de Ana y 1.000 de la dueña) y L21 (21 de Ana), los dos en la cartera de Ana.
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('Medir lead oportunidades L', '69339001', '00000000-0000-0000-0000-0000000000a1', v_web, '{}'),
    ('Medir lead oportunidades L21', '69339002', '00000000-0000-0000-0000-0000000000a1', v_web, '{}');
  insert into _l select case nombre when 'Medir lead oportunidades L' then 'L' else 'L21' end, id from public.leads where nombre like 'Medir lead oportunidades L%';
end $$;
-- Las oportunidades de `p_quien` en `p_lead`, g ∈ 1..p_n: la mitad abiertas (las más viejas y las más nuevas se alternan por g) y el resto cerradas (ganada, perdida y cancelada), cada una con un
-- instante distinto y microsegundos.
create function pg_temp.sembrar(p_quien text, p_lead uuid, p_n int, p_desfase int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, estado, titulo, moneda, ultima_actividad_en)
  select p_lead, p.id, e.id, (select se.id from public.embudos_etapas se where se.embudo_id = e.id and se.es_inicial),
         case when g % 2 = 0 then 'abierta' when g % 6 = 1 then 'ganada' when g % 6 = 3 then 'perdida' else 'cancelada' end::public.estado_oportunidad,
         'Medir ' || g, 'USD', timestamptz '2026-01-01 00:00:00+00' + (g * 2 + p_desfase) * interval '1 minute 7 microseconds'
    from generate_series(1, p_n) g join _p p on p.clave = p_quien join public.embudos e on e.usuario_id = p.id and e.es_default;
  set local session_replication_role = origin;
end $$;
select pg_temp.sembrar('ana', (select id from _l where clave = 'L'), 1000, 0);
select pg_temp.sembrar('duena', (select id from _l where clave = 'L'), 1000, 1);
select pg_temp.sembrar('ana', (select id from _l where clave = 'L21'), 21, 0);
-- El fondo: 20.000 entre `:fondo_leads` leads de la siembra, mitad de Ana y mitad de la dueña, con la mitad abiertas.
do $$
declare r record; v_leads int := current_setting('medir.fondo')::int;
begin
  for r in select l.id, row_number() over (order by l.id) as k from public.leads l where l.nombre not like 'Medir lead oportunidades%' order by l.id limit v_leads loop
    perform pg_temp.sembrar('ana', r.id, 10000 / v_leads, r.k::int);
    perform pg_temp.sembrar('duena', r.id, 10000 / v_leads, r.k::int + 1);
  end loop;
end $$;
analyze public.oportunidades;
do $$
declare v_l uuid := (select id from _l where clave = 'L');
begin
  if (select count(*) from public.oportunidades where lead_id = v_l and usuario_id = '00000000-0000-0000-0000-0000000000a1' and estado = 'abierta') <> 500
     or (select count(*) from public.oportunidades where lead_id = v_l and usuario_id = '00000000-0000-0000-0000-0000000000a1' and estado <> 'abierta') <> 500 then
    raise exception 'el lead L debía tener 500 abiertas y 500 cerradas de Ana';
  end if;
  if (select count(*) from public.oportunidades where lead_id not in (select id from _l)) < 19000 then raise exception 'el fondo no llegó a 19.000'; end if;
end $$;
-- Las relaciones de `oportunidades`: el heap, su TOAST y cada índice.
create temp table _rel as
select c.oid, case when c.oid = 'public.oportunidades'::regclass then 'heap' else c.relname::text end as nombre from pg_class c
 where c.oid = 'public.oportunidades'::regclass or c.oid in (select indexrelid from pg_index where indrelid = 'public.oportunidades'::regclass)
union all select t.reltoastrelid, 'toast' from pg_class t where t.oid = 'public.oportunidades'::regclass and t.reltoastrelid <> 0;
grant select on _rel, _p, _l to authenticated;
create temp table _med (fase text, pagina int, ms numeric, bloques jsonb, total numeric, bytes int);
grant all on _med to authenticated;
create temp table _plan (fase text, ruta text, indices jsonb, sort boolean, seq boolean, descartadas numeric);
grant all on _plan to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Las funciones de medición. Corren como quien las llama (authenticated), con el plan genérico.
-- ---------------------------------------------------------------------------------------------------------------------------------
create function pg_temp.como(p_quien text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p where clave = p_quien)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p where clave = p_quien), 'role', 'authenticated')::text, true);
$$;

-- Una consulta, 7 veces (las 2 primeras calientan): la mediana de ms de las calientes y el promedio de bloques leídos por relación de `oportunidades`.
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

-- La llamada de la página que sigue a `p_cursor` (la última de la anterior, o nulo), como un texto.
create function pg_temp.llamada(p_lead uuid, p_cursor jsonb) returns text language sql as $$
  select format('select public.lead_oportunidades(%L, %L, %L, %L, %s)', p_lead,
    case when p_cursor is null then null else (p_cursor ->> 'estado') = 'abierta' end, p_cursor ->> 'ultima_actividad_en', p_cursor ->> 'id', current_setting('medir.n'));
$$;

-- Las páginas a medir de L (y la 1 de L21), de Ana: se camina de a `n` y se mide la llamada de cada página elegida.
create function pg_temp.paginas(p_fase text) returns void language plpgsql as $$
declare
  v_n int := current_setting('medir.n')::int; v_a int := ceil(500.0 / v_n); v_l uuid := (select id from _l where clave = 'L');
  v_ultima int := ceil(1000.0 / v_n); v_elegidas int[] := array[1, ceil(v_a / 2.0)::int, v_a, v_a + 1, v_ultima]; v_cursor jsonb; v_r jsonb; v_m jsonb; p int;
begin
  perform pg_temp.como('ana');
  for p in 1 .. v_ultima loop
    if p = any (v_elegidas) then
      v_m := pg_temp.medir(pg_temp.llamada(v_l, v_cursor));
      insert into _med select p_fase, p, (v_m ->> 'ms')::numeric, v_m -> 'bloques', (select sum(value::numeric) from jsonb_each_text(v_m -> 'bloques')),
                              length(pg_temp.una(pg_temp.llamada(v_l, v_cursor))::text);
    end if;
    v_r := pg_temp.una(pg_temp.llamada(v_l, v_cursor));
    v_cursor := v_r -> 'oportunidades' -> (jsonb_array_length(v_r -> 'oportunidades') - 1);
  end loop;
  v_m := pg_temp.medir(pg_temp.llamada((select id from _l where clave = 'L21'), null));
  insert into _med select p_fase, 0, (v_m ->> 'ms')::numeric, v_m -> 'bloques', (select sum(value::numeric) from jsonb_each_text(v_m -> 'bloques')),
                          length(pg_temp.una(pg_temp.llamada((select id from _l where clave = 'L21'), null))::text);
end $$;
create function pg_temp.una(p_sql text) returns jsonb language plpgsql as $$
declare r jsonb; begin execute p_sql into r; return r; end $$;

-- Los planes de las rutas: la consulta con el mismo texto que la función, como sentencia preparada (plan genérico), con la RLS de Ana.
create function pg_temp.planes(p_fase text) returns void language plpgsql as $$
declare
  v_l uuid := (select id from _l where clave = 'L'); v_ana uuid := (select id from _p where clave = 'ana'); v_n int := current_setting('medir.n')::int; v_plan jsonb; v_texto text; v_ruta text;
  v_c record;
begin
  perform pg_temp.como('ana');
  select (e ->> 'ultima_actividad_en')::timestamptz as en, (e ->> 'id')::uuid as id into v_c
    from jsonb_array_elements(pg_temp.una(format('select public.lead_oportunidades(%L, null, null, null, 100)', v_l)) -> 'oportunidades') with ordinality x (e, n) where n = 50;
  deallocate all;
  prepare r_a(uuid, uuid, int) as select o from public.oportunidades o where o.lead_id = $1 and o.usuario_id = $2 and o.eliminado_en is null and o.estado = 'abierta'
    order by o.ultima_actividad_en desc, o.id desc limit $3;
  prepare r_b(uuid, uuid, timestamptz, uuid, int) as select o from public.oportunidades o where o.lead_id = $1 and o.usuario_id = $2 and o.eliminado_en is null and o.estado = 'abierta'
    and (o.ultima_actividad_en, o.id) < ($3, $4) order by o.ultima_actividad_en desc, o.id desc limit $5;
  prepare r_k(uuid, uuid, int) as select o from public.oportunidades o where o.lead_id = $1 and o.usuario_id = $2 and o.eliminado_en is null and o.estado <> 'abierta'
    order by o.ultima_actividad_en desc, o.id desc limit $3;
  prepare r_c(uuid, uuid, timestamptz, uuid, int) as select o from public.oportunidades o where o.lead_id = $1 and o.usuario_id = $2 and o.eliminado_en is null and o.estado <> 'abierta'
    and (o.ultima_actividad_en, o.id) < ($3, $4) order by o.ultima_actividad_en desc, o.id desc limit $5;
  foreach v_ruta in array array['r_a', 'r_b', 'r_k', 'r_c'] loop
    for i in 1 .. 3 loop  -- las 5 primeras ejecuciones de una sentencia preparada son del plan propio; force_generic_plan lo evita desde la primera.
      v_texto := case v_ruta when 'r_a' then format('execute r_a(%L, %L, %s)', v_l, v_ana, v_n + 1) when 'r_k' then format('execute r_k(%L, %L, %s)', v_l, v_ana, v_n + 1)
                 else format('execute %s(%L, %L, %L, %L, %s)', v_ruta, v_l, v_ana, v_c.en, v_c.id, v_n + 1) end;
      execute 'explain (analyze, format json) ' || v_texto into v_plan;
    end loop;
    -- Una ruta que no devuelve sus n + 1 filas mide un plan vacío (le faltó la sesión de Ana, o el terreno): no vale.
    if (v_plan -> 0 -> 'Plan' ->> 'Actual Rows')::int <> v_n + 1 then raise exception 'la ruta % devolvió % filas y esperaba %', v_ruta, v_plan -> 0 -> 'Plan' ->> 'Actual Rows', v_n + 1; end if;
    insert into _plan values (p_fase, v_ruta, coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_plan::text, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
      v_plan::text ~ '"Node Type": "(Incremental )?Sort"', v_plan::text ~ '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "oportunidades"',
      coalesce((select sum(m[1]::numeric) from regexp_matches(v_plan::text, '"Rows Removed by Filter": (\d+)', 'g') m), 0));
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- Los asserts de una fase; devuelven las fallas como texto (vacío si cumple).
create function pg_temp.fallas(p_fase text) returns text language plpgsql as $$
declare
  r record; v_f text := ''; v_n int := current_setting('medir.n')::int; v_a int := ceil(500.0 / v_n); v_ultima int := ceil(1000.0 / v_n);
  v_esperados text[]; v_ix text; v_prim numeric; v_ult numeric; v_otro text; v_b1 int; v_b0 int;
  c_ruta constant jsonb := '{"r_a": "oportunidades_lead_abiertas_idx", "r_b": "oportunidades_lead_abiertas_idx", "r_k": "oportunidades_lead_cerradas_idx", "r_c": "oportunidades_lead_cerradas_idx"}';
begin
  -- Assert 1: cada ruta por su parcial.
  for r in select * from _plan where fase = p_fase order by ruta loop
    if not r.indices ? (c_ruta ->> r.ruta) then v_f := v_f || format(E'\n  ruta %s no camina %s: %s', r.ruta, c_ruta ->> r.ruta, r.indices); end if;
    if r.sort then v_f := v_f || format(E'\n  ruta %s ordena (Sort)', r.ruta); end if;
    if r.seq then v_f := v_f || format(E'\n  ruta %s recorre oportunidades entera', r.ruta); end if;
    if r.descartadas > 1 then v_f := v_f || format(E'\n  ruta %s descarta %s filas', r.ruta, r.descartadas); end if;
  end loop;
  -- Assert 2: por página, sólo los parciales que esa ruta debe leer tienen bloques.
  for r in select * from _med where fase = p_fase and pagina > 0 order by pagina loop
    -- La página p abre las abiertas si no hay cursor o el cursor es de una abierta (p ≤ a + 1) y las cerradas si el cursor es de una cerrada (p > a + 1) o las abiertas que quedan caben en la página.
    v_esperados := array[]::text[];
    if r.pagina <= v_a + 1 then v_esperados := array_append(v_esperados, 'oportunidades_lead_abiertas_idx'); end if;
    if r.pagina > v_a + 1 or 500 - (r.pagina - 1) * v_n <= v_n then v_esperados := array_append(v_esperados, 'oportunidades_lead_cerradas_idx'); end if;
    foreach v_ix in array array['oportunidades_lead_abiertas_idx', 'oportunidades_lead_cerradas_idx'] loop
      if not (r.bloques ? v_ix) then v_f := v_f || format(E'\n  página %s: no existe el índice %s (o no se leyó)', r.pagina, v_ix);
      elsif (v_ix = any (v_esperados)) <> ((r.bloques ->> v_ix)::numeric > 0) then
        v_f := v_f || format(E'\n  página %s: %s con %s bloques, esperaba %s', r.pagina, v_ix, r.bloques ->> v_ix, case when v_ix = any (v_esperados) then 'bloques' else 'ninguno' end);
      end if;
    end loop;
    for v_otro in select k from jsonb_object_keys(r.bloques) k where k like '%\_idx' and k not in ('oportunidades_lead_abiertas_idx', 'oportunidades_lead_cerradas_idx') loop
      if (r.bloques ->> v_otro)::numeric > 0 then v_f := v_f || format(E'\n  página %s: leyó %s (%s bloques)', r.pagina, v_otro, r.bloques ->> v_otro); end if;
    end loop;
    if r.ms > 15 then v_f := v_f || format(E'\n  página %s: %s ms, el tope es 15', r.pagina, round(r.ms, 1)); end if;
  end loop;
  select total into v_prim from _med where fase = p_fase and pagina = 1;
  select total into v_ult from _med where fase = p_fase and pagina = v_ultima;
  if v_ult > 1.2 * v_prim + 20 then v_f := v_f || format(E'\n  crece con la profundidad: %s bloques en la página 1 y %s en la %s', v_prim, v_ult, v_ultima); end if;
  select bytes into v_b1 from _med where fase = p_fase and pagina = 1; select bytes into v_b0 from _med where fase = p_fase and pagina = 0;
  if v_b1 > 1.05 * v_b0 then v_f := v_f || format(E'\n  bytes de la página 1: %s con 1.000 en el lead y %s con 21', v_b1, v_b0); end if;
  return v_f;
end $$;
grant execute on function pg_temp.fallas(text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Medir y asertar
-- ---------------------------------------------------------------------------------------------------------------------------------
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.planes('hoy');
select pg_temp.paginas('hoy');
reset role;
do $$
declare r record; v_fallas text := pg_temp.fallas('hoy');
begin
  for r in select * from _med where fase = 'hoy' order by pagina loop
    raise notice 'medicion|Oportunidades de un lead · página % (ms)|%', case when r.pagina = 0 then '1 de un lead con 21' else r.pagina::text end, round(r.ms, 2);
    raise notice 'medicion|Oportunidades de un lead · página % (bloques de oportunidades)|%', case when r.pagina = 0 then '1 de un lead con 21' else r.pagina::text end, round(r.total, 1);
  end loop;
  for r in select * from _plan where fase = 'hoy' order by ruta loop
    raise notice 'nota|Plan de la ruta %: % (descartadas %)|', r.ruta, r.indices, r.descartadas;
  end loop;
  if v_fallas <> '' then raise exception 'Las oportunidades de un lead rompen su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: sin los dos parciales, el Assert 1 o el 2 tienen que caer.
drop index public.oportunidades_lead_abiertas_idx;
drop index public.oportunidades_lead_cerradas_idx;
analyze public.oportunidades;
delete from _rel where nombre like 'oportunidades_lead_%';
set local role authenticated;
select pg_temp.planes('sin');
reset role;
do $$
declare v_sin text := pg_temp.fallas('sin');
begin
  if v_sin !~ 'no camina' then raise exception 'la guarda no muerde: sin los parciales las rutas cumplen (fallas:%)', coalesce(nullif(v_sin, ''), ' ninguna'); end if;
  raise notice 'nota|guarda: cae (sin los dos parciales: %)|', replace(split_part(trim(both E'\n' from v_sin), E'\n', 1), '|', '/');
end $$;
rollback;
vacuum public.oportunidades;
