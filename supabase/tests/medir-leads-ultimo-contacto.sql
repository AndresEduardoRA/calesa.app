-- El último seguimiento y el próximo recordatorio en el listado de leads: `pnpm db:medir:volumen`, contra el Supabase LOCAL con la siembra de volumen (62.000 leads, 200.000 seguimientos,
-- 20.000 recordatorios). Todo en una transacción que se revierte.
--
-- Qué se mide: la página del listado como la pide la app (`buscarLeads`: columnas fijas de `leads_vista` —«todos»— o de `leads_cartera_vista` —«míos»—, `order by creado_en desc, id desc limit
-- MAXIMO_DE_PAGINA_DE_LEADS + 1`), como authenticated, con el plan genérico y `EXPLAIN (ANALYZE, BUFFERS)` ×7 (mediana de las 5 últimas), SIN las tres columnas nuevas (la consulta de antes) y CON
-- ellas (`ultimo_seguimiento_en`, `ultimo_seguimiento_visible`, `proximo_recordatorio`); la dueña y Ana, «todos» y «míos». Además, los bytes de la respuesta (el JSON de las filas) antes y después.
-- Después, el peor caso: los 101 leads de la página de la dueña con 40 seguimientos cada uno (públicos y privados de otras personas, los privados los más nuevos) y un recordatorio pendiente de
-- cada una de las tres: lo que cuesta una página no debe crecer con los seguimientos que tiene cada lead.
--
-- Asserta: las tres lecturas nuevas van por `seguimientos_lead_fecha_idx` y `recordatorios_lead_pendientes_idx`, sin `Seq Scan` de `seguimientos` ni de `recordatorios`;
-- lo que suma la página en buffers es a lo sumo `BUFFERS_POR_FILA` por fila, igual con 40 seguimientos por lead que con los de la siembra (±25 %); ≤ 150 ms; y la respuesta crece a lo sumo
-- `BYTES_POR_FILA` por fila.
\set ON_ERROR_STOP 1
\set carga `cat /proc/loadavg`
begin;
select set_config('medir.carga', :'carga', true) \g /dev/null
select set_config('medir.pagina', (:max_leads + 1)::text, true) \g /dev/null

do $$ begin
  if not exists (select 1 from public.perfiles where id = '00000000-0000-0000-0000-0000000000d1') then
    raise exception 'falta la dueña de la siembra de volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset)';
  end if;
  raise notice 'nota|Carga (/proc/loadavg) al empezar a medir el último contacto del listado: %|', current_setting('medir.carga');
end $$;

create temp table _p (clave text primary key, id uuid not null);
insert into _p values ('duena', '00000000-0000-0000-0000-0000000000d1'), ('ana', '00000000-0000-0000-0000-0000000000a1'), ('berta', '00000000-0000-0000-0000-0000000000b1');
grant select on _p to authenticated;
create temp table _med (fase text, ruta text, quien text, columnas text, ms numeric, buffers bigint, indices jsonb, seq boolean, bytes bigint);
grant all on _med to authenticated;

-- Las columnas fijas del listado (`columnasDeLaConsulta()` sin campos de tabla) y las tres nuevas.
create function pg_temp.columnas(p_nuevas boolean) returns text language sql as $$
  select 'id, numero, numero_propio, numero_propio_creador, nombre, telefono_principal, en_cartera, dueno_id, tipo_lead_id, origen_lead_id, creado_en, es_favorito, esta_tachado, etiquetas'
      || case when p_nuevas then ', ultimo_seguimiento_en, ultimo_seguimiento_visible, proximo_recordatorio' else '' end $$;

create function pg_temp.consulta(p_vista text, p_nuevas boolean) returns text language sql as $$
  select format('select %s from public.%I order by creado_en desc, id desc limit %s', pg_temp.columnas(p_nuevas), p_vista, current_setting('medir.pagina')) $$;

create function pg_temp.como(p_quien text) returns void language plpgsql as $$
declare v_id uuid := (select id from _p where clave = p_quien);
begin
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.medir(p_fase text, p_ruta text, p_quien text, p_nuevas boolean) returns void language plpgsql as $$
declare v_vista text := case p_ruta when 'míos' then 'leads_cartera_vista' else 'leads_vista' end; v_sql text := pg_temp.consulta(v_vista, p_nuevas);
  v_plan jsonb; v_ms numeric[] := '{}'; v_buf bigint[] := '{}'; v_b bigint; v_clave text; v_texto text; v_bytes bigint; i int;
begin
  perform pg_temp.como(p_quien);
  for i in 1 .. 7 loop
    execute 'explain (analyze, buffers, format json) ' || v_sql into v_plan;
    continue when i <= 2;
    v_ms := v_ms || (v_plan -> 0 ->> 'Execution Time')::numeric;
    v_b := 0;
    foreach v_clave in array array['Shared Hit Blocks', 'Shared Read Blocks'] loop
      v_b := v_b + coalesce((v_plan -> 0 -> 'Plan' ->> v_clave)::bigint, 0);
    end loop;
    v_buf := v_buf || v_b;
  end loop;
  v_texto := v_plan::text;
  execute format('select coalesce(sum(octet_length(to_jsonb(x)::text)), 0) from (%s) x', v_sql) into v_bytes;
  insert into _med values (p_fase, p_ruta, p_quien, case when p_nuevas then 'con' else 'sin' end,
    (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m),
    (select percentile_disc(0.5) within group (order by b) from unnest(v_buf) b),
    coalesce((select jsonb_agg(distinct m[1]) from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m), '[]'::jsonb),
    exists (select 1 from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "(seguimientos|recordatorios)"', 'g')), v_bytes);
end $$;

create function pg_temp.fase(p_fase text) returns void language plpgsql as $$
declare q text; r text;
begin
  foreach q in array array['duena', 'ana'] loop
    foreach r in array array['todos', 'míos'] loop
      perform pg_temp.medir(p_fase, r, q, false);
      perform pg_temp.medir(p_fase, r, q, true);
    end loop;
  end loop;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

analyze public.leads; analyze public.seguimientos; analyze public.recordatorios;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('siembra');
reset role;

-- El peor caso: los leads de la página de la dueña («todos» y «míos», que coinciden en lo más nuevo que ella tiene) con 40 seguimientos cada uno y un recordatorio de cada persona.
create temp table _pagina as
  select id from public.leads where eliminado_en is null and cartera <> '{}' order by creado_en desc, id desc limit (select current_setting('medir.pagina')::int);
set local session_replication_role = replica;
insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, visibilidad, ocurrido_en, creado_en, actualizado_en)
select p.id, (select id from _p where clave = case g % 3 when 0 then 'duena' when 1 then 'ana' else 'berta' end),
       (select id from public.tipos_seguimiento where activo order by orden limit 1), 'Medir último contacto ' || g,
       case when g % 4 = 0 then 'publico'::public.visibilidad_seguimiento else 'privado'::public.visibilidad_seguimiento end,
       now() - g * interval '1 hour', now(), now()
  from _pagina p cross join generate_series(1, 40) g;
update public.leads l set ultimo_seguimiento_en = (select max(s.ocurrido_en) from public.seguimientos s where s.lead_id = l.id and s.eliminado_en is null) where l.id in (select id from _pagina);
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
select (select id from _p where clave = q.clave), p.id, 'Medir recordatorio', now() + g * interval '1 day'
  from _pagina p cross join (values ('duena'), ('ana'), ('berta')) q (clave) cross join generate_series(1, 5) g;
set local session_replication_role = origin;
analyze public.seguimientos; analyze public.recordatorios;
set local plan_cache_mode = force_generic_plan;
set local role authenticated;
select pg_temp.fase('con 40 por lead');
reset role;

do $$
declare r record; c record; v_fallas text := ''; c_ms constant numeric := 150; c_buf_fila constant numeric := 40; c_bytes_fila constant numeric := 400; n constant int := current_setting('medir.pagina')::int;
  v_delta numeric; v_delta_cargado numeric;
begin
  for r in select * from _med order by fase, quien, ruta, columnas loop
    raise notice 'medicion|Último contacto, % · % · % · % las columnas (ms)|%', r.fase, r.ruta, r.quien, r.columnas, round(r.ms, 2);
    raise notice 'medicion|Último contacto, % · % · % · % las columnas (buffers)|%', r.fase, r.ruta, r.quien, r.columnas, r.buffers;
    raise notice 'medicion|Último contacto, % · % · % · % las columnas (bytes de la respuesta)|%', r.fase, r.ruta, r.quien, r.columnas, r.bytes;
  end loop;
  for r in select * from _med where columnas = 'con' loop
    if r.ms > c_ms then v_fallas := v_fallas || format(E'\n  %s · %s · %s: %s ms, el presupuesto es %s', r.fase, r.ruta, r.quien, round(r.ms, 1), c_ms); end if;
    if r.seq then v_fallas := v_fallas || format(E'\n  %s · %s · %s recorre seguimientos o recordatorios entera', r.fase, r.ruta, r.quien); end if;
    if not (r.indices ? 'seguimientos_lead_fecha_idx' and r.indices ? 'recordatorios_lead_pendientes_idx') then
      v_fallas := v_fallas || format(E'\n  %s · %s · %s no camina los dos índices: %s', r.fase, r.ruta, r.quien, r.indices);
    end if;
    select * into c from _med where fase = r.fase and ruta = r.ruta and quien = r.quien and columnas = 'sin';
    v_delta := r.buffers - c.buffers;
    if v_delta > c_buf_fila * n then v_fallas := v_fallas || format(E'\n  %s · %s · %s suma %s buffers a la página (%s por fila), el presupuesto es %s por fila', r.fase, r.ruta, r.quien, v_delta, round(v_delta / n, 1), c_buf_fila); end if;
    if (r.bytes - c.bytes) > c_bytes_fila * n then v_fallas := v_fallas || format(E'\n  %s · %s · %s suma %s bytes a la respuesta, el presupuesto es %s por fila', r.fase, r.ruta, r.quien, r.bytes - c.bytes, c_bytes_fila); end if;
    raise notice 'medicion|Último contacto, % · % · % · lo que suman las columnas (buffers por fila)|%', r.fase, r.ruta, r.quien, round(v_delta / n, 1);
  end loop;
  -- No crece con los seguimientos de cada lead: la dueña «todos» con 40 por lead suma a lo sumo un 25 % más de buffers por fila que con la siembra.
  select (a.buffers - b.buffers)::numeric / n into v_delta from _med a join _med b on (a.fase, a.ruta, a.quien) = (b.fase, b.ruta, b.quien) and a.columnas = 'con' and b.columnas = 'sin'
   where a.fase = 'siembra' and a.ruta = 'todos' and a.quien = 'duena';
  select (a.buffers - b.buffers)::numeric / n into v_delta_cargado from _med a join _med b on (a.fase, a.ruta, a.quien) = (b.fase, b.ruta, b.quien) and a.columnas = 'con' and b.columnas = 'sin'
   where a.fase = 'con 40 por lead' and a.ruta = 'todos' and a.quien = 'duena';
  if v_delta_cargado > greatest(v_delta * 1.25, v_delta + 3) then
    v_fallas := v_fallas || format(E'\n  con 40 seguimientos por lead la página suma %s buffers por fila y con la siembra %s: crece con los seguimientos', round(v_delta_cargado, 1), round(v_delta, 1));
  end if;
  if v_fallas <> '' then raise exception 'El último contacto del listado rompe su presupuesto:%', v_fallas; end if;
end $$;

-- La guarda: sin el índice por fecha, la lectura recorre los seguimientos del lead y el assert cae.
drop index public.seguimientos_lead_fecha_idx;
analyze public.seguimientos;
set local role authenticated;
select pg_temp.medir('sin índice', 'todos', 'duena', true);
reset role;
do $$
declare r record;
begin
  select * into r from _med where fase = 'sin índice';
  raise notice 'medicion|Guarda, sin el índice por fecha · todos · duena (ms)|%', round(r.ms, 2);
  if r.indices ? 'seguimientos_lead_fecha_idx' then raise exception 'la guarda no muerde: sin el índice la lectura lo sigue usando'; end if;
end $$;
rollback;
