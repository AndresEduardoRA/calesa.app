-- Medición de los jobs con 100.000 filas por purgar (`pnpm db:medir:volumen`, contra el Supabase LOCAL), 9e.
--
-- Todo en una transacción que se revierte. Cada job corre como lo corre pg_cron o la edge function:
-- con los derechos de la base. Se informa el tiempo de la corrida y cuántas filas tocó. El terreno:
--   apibara-consultas-purgar        100.000 consultas de hace más de 48 h
--   importaciones-vinculos-purgar   100.000 vínculos de 200 importaciones de hace más de 7 días
--   papelera-purgar                 100.000 leads vencidos en 500 lotes de 200
--   papelera-purgar (cotizaciones)  100.000 cotizaciones vencidas en 500 lotes de 200, con una revisión y un adjunto cada una (4.24-1b)
--   limpieza-automatica             100.000 vehículos importados de una subasta terminada, sin comprador
--   storage-gc                      100.000 objetos en el bucket `vehiculos` sin fila, y 100.000 en la cola
--   situacion-al-cerrar             2.000 vehículos en subasta (1.000 con el cierre vencido) entre los 100.000 de la limpieza
-- Cada job tiene su presupuesto de tiempo por corrida (el último argumento): si lo pasa, la medición falla.
-- Un job con tope por corrida deja lo que no entra para la siguiente: papelera-purgar purga a lo sumo 50 lotes
-- por corrida (10.000 leads), la limpieza mueve 200 y revisa 1.000 más, storage-gc encola 2.000 por pasada.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'duena-jobs@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000e1', id from public.roles where clave = 'dueno' on conflict do nothing;

create function pg_temp.cronometro(p_nombre text, p_sql text, p_max_ms numeric default null) returns void language plpgsql as $$
declare v_ini timestamptz; v_ms numeric; v_resultado text;
begin
  v_ini := clock_timestamp();
  execute p_sql into v_resultado;
  v_ms := extract(epoch from clock_timestamp() - v_ini) * 1000;
  raise notice 'medicion|%|%', p_nombre, round(v_ms, 0);
  raise notice 'plan|%|resultado=%', p_nombre, v_resultado;
  if p_max_ms is not null and v_ms > p_max_ms then
    raise exception '%: tarda % ms, el presupuesto es % ms', p_nombre, round(v_ms, 0), p_max_ms;
  end if;
end $$;

set local session_replication_role = replica;

-- apibara-consultas-purgar
insert into public.apibara_consultas (origen_id, creado_por, raw, creado_en)
select (select id from public.origenes order by orden limit 1), '00000000-0000-0000-0000-0000000000e1',
       jsonb_build_object('n', g), now() - interval '3 days' - make_interval(secs => g)
  from generate_series(1, 100000) g;

-- importaciones-vinculos-purgar
insert into public.importaciones (id, usuario_id, entidad, estado, filas_total, filas_ok, terminada_en, creado_en)
select ('00000000-0000-0000-0000-00000000' || lpad(g::text, 4, '0'))::uuid, '00000000-0000-0000-0000-0000000000e1', 'leads', 'terminada', 500, 500,
       now() - interval '10 days', now() - interval '10 days'
  from generate_series(1, 200) g;
insert into public.importaciones_leads (importacion_id, lead_id, fila, creado_en)
select ('00000000-0000-0000-0000-00000000' || lpad((1 + g % 200)::text, 4, '0'))::uuid, gen_random_uuid(), 1 + g / 200, now() - interval '10 days'
  from generate_series(1, 100000) g;

-- papelera-purgar: 500 lotes de 200 leads, de hace más de `papelera_dias`
create temporary table jobs_lotes on commit drop as
  select k, gen_random_uuid() as id from generate_series(1, 500) k;
insert into public.lotes_papelera (id, tipo, creado_por, creado_en, resumen, actualizado_en)
select id, 'leads', '00000000-0000-0000-0000-0000000000e1', now() - interval '400 days' - make_interval(mins => k),
       jsonb_build_object('cantidad', 200, 'restaurados', 0, 'purgados', 0), now() - interval '400 days'
  from jobs_lotes;
insert into public.leads (nombre, telefono_principal, creado_por, creado_en, eliminado_en, eliminado_por, lote_papelera_id, tipo_lead_id)
select 'Job borrado ' || (lo.k * 1000 + j), (70000000 + lo.k * 1000 + j)::text, '00000000-0000-0000-0000-0000000000e1',
       now() - interval '401 days', now() - interval '400 days', '00000000-0000-0000-0000-0000000000e1', lo.id,
       (select id from public.tipos_lead where clave = 'prospecto')
  from jobs_lotes lo cross join generate_series(1, 200) j;

-- limpieza-automatica: 100.000 vehículos importados, de una subasta terminada hace meses
insert into public.vehiculos (origen_id, titulo, vin, lote, plataforma, creado_por, creado_en, estado_subasta, subasta_en, subasta_fin_en,
                              apibara_sync_en, importado_apibara)
select (select id from public.origenes where tipo = 'subasta' order by orden limit 1), 'Job ' || g,
       'J' || lpad(g::text, 16, '0'), 'JL' || g, 'copart', '00000000-0000-0000-0000-0000000000e1',
       now() - interval '300 days', 'terminada', now() - make_interval(days => 100 + g % 200), now() - make_interval(days => 100 + g % 200),
       now() - make_interval(days => 100 + g % 200), true
  from generate_series(1, 100000) g;
update public.ajustes_empresa set limpieza_automatica = true where id = 1;

-- storage-gc: objetos del bucket `vehiculos` que ninguna fila nombra, y la cola
insert into storage.objects (bucket_id, name, owner, created_at, updated_at, metadata)
select 'vehiculos', 'job-' || (g / 24) || '/' || g || '.webp', null, now() - interval '10 days', now() - interval '10 days', '{}'::jsonb
  from generate_series(1, 100000) g;
insert into public.cola_gc_storage (bucket, ruta, encolado_en)
select 'vehiculos', 'cola-' || (g / 24) || '/' || g || '.webp', now() - interval '10 days' - make_interval(secs => g)
  from generate_series(1, 100000) g;

set local session_replication_role = origin;
analyze public.apibara_consultas;
analyze public.importaciones;
analyze public.importaciones_leads;
analyze public.lotes_papelera;
analyze public.leads;
analyze public.vehiculos;
analyze public.cola_gc_storage;
analyze storage.objects;

select pg_temp.cronometro('job: apibara-consultas-purgar, 100.000 filas', 'select public.apibara_consultas_purgar()::text', 6000);
select pg_temp.cronometro('job: importaciones-vinculos-purgar, 100.000 filas', 'select public.importaciones_vinculos_purgar()::text', 6000);
select pg_temp.cronometro('job: papelera-purgar, 100.000 leads en 500 lotes', 'select public.papelera_purgar_vencidos()::text', 25000);
select pg_temp.cronometro('job: limpieza-automatica, 100.000 candidatos', $q$select (public.limpieza_automatica_correr(now() + interval '12 hours') - 'saltados')::text$q$, 8000);
select pg_temp.cronometro('job: storage-gc, reclamar 100 de 100.000 en la cola', 'select count(*)::text from public.storage_gc_reclamar(100)', 4000);
select pg_temp.cronometro('job: storage-gc, encolar huérfanos de 100.000 objetos', $q$select public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day')::text$q$, 4000);
-- Con el cursor (cierre 1): cada pasada examina los 10.000 siguientes por nombre. Una al final del bucket cuesta lo mismo que
-- una al principio (antes, cada pasada recorría el bucket entero: 208 ms con 301.000 objetos ya encolados).
delete from public.cola_gc_barrido;
select pg_temp.cronometro('job: storage-gc, una pasada al principio del bucket (10.000 examinados)', $q$select public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day')::text$q$, 1000);
-- Cerca del final hay dos costos distintos: la primera vez la ventana son 10.000 huérfanos sin encolar (escribirlos en la cola
-- cuesta ~1 s, lo mismo que el paso de 100.000 de arriba, que también encola 10.000) y la segunda vez la misma ventana ya está
-- encolada, que es lo comparable con la del principio: examinar 10.000 sin escribir nada.
update public.cola_gc_barrido
   set ultimo_nombre = (select o.name from storage.objects o where o.bucket_id = 'vehiculos' order by o.name desc limit 1 offset 15000)
 where bucket = 'vehiculos';
select pg_temp.cronometro('job: storage-gc, una pasada cerca del final que encola 10.000', $q$select public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day')::text$q$, 4000);
update public.cola_gc_barrido
   set ultimo_nombre = (select o.name from storage.objects o where o.bucket_id = 'vehiculos' order by o.name desc limit 1 offset 15000)
 where bucket = 'vehiculos';
select pg_temp.cronometro('job: storage-gc, una pasada cerca del final del bucket (10.000 examinados)', $q$select public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day')::text$q$, 1000);

-- papelera-purgar con cotizaciones (4.24-1b): 500 lotes de 200 cotizaciones, cada una con una revisión y un adjunto de ruta propia, más viejos que los
-- 450 lotes de leads que quedan vencidos. 50 cotizaciones vivas con un adjunto cada una, y en cada uno de los 50 lotes más viejos (los que purga la corrida)
-- una cotización con otro adjunto que repite la ruta de una viva: el refcount no lo encola. Se mide la forma (la selección del job y el refcount por
-- `cotizaciones_adjuntos_ruta_idx`), el tiempo y lo que hizo, exacto.
set local session_replication_role = replica;
create temporary table jobs_cot on commit drop as
  select o.id as origen, gen_random_uuid() as formula from (select gen_random_uuid() as id) o;
insert into public.origenes (id, clave, nombre) select origen, 'jobs_cot', 'Jobs cotizaciones' from jobs_cot;
insert into public.formulas (id, origen_id, version, estado, definicion, params, diseno, visibilidad)
select formula, origen, 1, 'publicada',
       '{"nodos": [{"id": "visible", "tipo": "input", "etiqueta": "Visible", "bucket": "origen"}, {"id": "total", "tipo": "calculo", "op": "suma", "de": ["visible"], "etiqueta": "Total", "salida": "total", "bucket": "origen"}]}',
       '{}', '{}', '{"visible": {"ver": "todos", "editar": "todos"}, "total": {"ver": "todos", "editar": null}}'
  from jobs_cot;
create temporary table jobs_lotes_cot on commit drop as
  select k, gen_random_uuid() as id from generate_series(1, 500) k;
insert into public.lotes_papelera (id, tipo, creado_por, creado_en, resumen, actualizado_en)
select id, 'cotizaciones', '00000000-0000-0000-0000-0000000000e1', now() - interval '500 days' - make_interval(mins => k),
       jsonb_build_object('cantidad', 200, 'restaurados', 0, 'purgados', 0), now() - interval '500 days'
  from jobs_lotes_cot;
create temporary table jobs_cots on commit drop as
  select lo.k, j, gen_random_uuid() as id, lo.id as lote from jobs_lotes_cot lo cross join generate_series(1, 200) j;
create temporary table jobs_vivas on commit drop as
  select i, gen_random_uuid() as id from generate_series(1, 50) i;
insert into public.cotizaciones (id, origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, creado_en,
                                 eliminado_en, eliminado_por, lote_papelera_id)
select c.id, t.origen, '00000000-0000-0000-0000-0000000000e1', t.formula, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10,
       now() - interval '501 days', now() - interval '500 days', '00000000-0000-0000-0000-0000000000e1', c.lote
  from jobs_cots c cross join jobs_cot t;
insert into public.cotizaciones (id, origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
select v.id, t.origen, '00000000-0000-0000-0000-0000000000e1', t.formula, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10
  from jobs_vivas v cross join jobs_cot t;
insert into public.cotizaciones_revisiones (cotizacion_id, diff, creado_en) select id, '{}', now() - interval '501 days' from jobs_cots;
insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes) select id, id || '/1.pdf', '1.pdf', 'application/pdf', 10 from jobs_cots;
insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes) select id, id || '/a.pdf', 'a.pdf', 'application/pdf', 10 from jobs_vivas;
insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes)
select c.id, v.id || '/a.pdf', 'a.pdf', 'application/pdf', 10 from jobs_cots c join jobs_vivas v on v.i = c.k - 450 where c.k > 450 and c.j = 1;
set local session_replication_role = origin;
analyze public.cotizaciones;
analyze public.cotizaciones_revisiones;
analyze public.cotizaciones_adjuntos;
analyze public.lotes_papelera;

do $$
declare v_dias int := (select papelera_dias from public.ajustes_empresa where id = 1); v_plan jsonb; v_seq text;
begin
  -- El terreno es el que se dice: la cola sin nada de cotizaciones, y los 50 lotes vencidos más viejos son los k = 451…500.
  if exists (select 1 from public.cola_gc_storage where bucket = 'cotizaciones') then raise exception 'la cola ya tenía rutas de cotizaciones'; end if;
  if (select array_agg(id order by id) from (select l.id from public.lotes_papelera l
        where l.purgado_en is null and l.restaurado_en is null and l.creado_en < now() - make_interval(days => v_dias) order by l.creado_en limit 50) x)
     is distinct from (select array_agg(id order by id) from jobs_lotes_cot where k > 450) then
    raise exception 'los 50 lotes vencidos más viejos no son los de cotizaciones k = 451…500'; end if;

  -- (a) La forma, en el plan genérico: la selección del job sin recorrer lotes_papelera ni cotizaciones, y el refcount por su índice.
  set local plan_cache_mode = force_generic_plan;
  execute $q$prepare jobs_seleccion(int) as
    select l.id, l.tipo from public.lotes_papelera l
    where l.tipo in ('vehiculos', 'leads', 'cotizaciones') and l.purgado_en is null and l.restaurado_en is null
      and l.creado_en < now() - make_interval(days => $1)
      and ((l.tipo = 'vehiculos' and exists (select 1 from public.vehiculos v where v.lote_papelera_id = l.id and v.eliminado_en is not null))
        or (l.tipo = 'leads' and exists (select 1 from public.leads x where x.lote_papelera_id = l.id and x.eliminado_en is not null))
        or (l.tipo = 'cotizaciones' and (select true from public.cotizaciones c where c.lote_papelera_id = l.id and c.eliminado_en is not null limit 1)))
    order by l.creado_en
    limit 50$q$;
  execute format('explain (format json) execute jobs_seleccion(%s)', v_dias) into v_plan;
  raise notice 'plan|job: papelera-purgar, la selección|%', v_plan;
  select string_agg(r #>> '{}', ', ') into v_seq from jsonb_path_query(v_plan, 'lax $.** ? (@."Node Type" == "Seq Scan")."Relation Name"') r
   where r #>> '{}' in ('lotes_papelera', 'cotizaciones');
  if v_seq is not null then raise exception 'la selección del job recorre %: %', v_seq, v_plan; end if;
  execute $q$prepare jobs_refcount(text) as select count(*) from public.cotizaciones_adjuntos where ruta = $1$q$;
  execute 'explain (format json) execute jobs_refcount(''x/1.pdf'')' into v_plan;
  raise notice 'plan|job: papelera-purgar, el refcount de un adjunto|%', v_plan;
  if not jsonb_path_exists(v_plan, 'lax $.** ? (@."Index Name" == "cotizaciones_adjuntos_ruta_idx")') then raise exception 'el refcount no va por cotizaciones_adjuntos_ruta_idx: %', v_plan; end if;
  execute 'deallocate jobs_seleccion'; execute 'deallocate jobs_refcount';
  reset plan_cache_mode;
end $$;

-- (b) El tiempo de una corrida.
select pg_temp.cronometro('job: papelera-purgar, 100.000 cotizaciones en 500 lotes (revisiones y adjuntos)', 'select public.papelera_purgar_vencidos()::text', 25000);

-- (c) Lo que hizo, exacto: los 50 lotes más viejos purgados y cerrados, sin hijas; las vivas intactas; la cola con las 10.000 rutas propias y ninguna de una viva.
do $$
begin
  if (select count(*) from public.lotes_papelera l join jobs_lotes_cot j on j.id = l.id
       where j.k > 450 and l.purgado_en is not null and (l.resumen ->> 'purgados')::int = 200) <> 50 then raise exception 'no purgó y cerró los 50 lotes más viejos'; end if;
  if exists (select 1 from public.lotes_papelera l join jobs_lotes_cot j on j.id = l.id where j.k <= 450 and l.purgado_en is not null) then raise exception 'purgó un lote de más'; end if;
  if (select count(*) from public.cotizaciones c join jobs_cots j on j.id = c.id) <> 90000 then raise exception 'no quedan las 90.000 de los otros lotes'; end if;
  if (select count(*) from public.cotizaciones_revisiones r join jobs_cots j on j.id = r.cotizacion_id) <> 90000 then raise exception 'quedaron revisiones de las purgadas'; end if;
  if (select count(*) from public.cotizaciones_adjuntos a join jobs_cots j on j.id = a.cotizacion_id) <> 90000 then raise exception 'quedaron adjuntos de las purgadas'; end if;
  if (select count(*) from public.cotizaciones c join jobs_vivas v on v.id = c.id where c.eliminado_en is null) <> 50
     or (select count(*) from public.cotizaciones_adjuntos a join jobs_vivas v on v.id = a.cotizacion_id) <> 50 then raise exception 'las vivas o sus adjuntos cambiaron'; end if;
  if (select count(*) from public.cola_gc_storage where bucket = 'cotizaciones') <> 10000 then raise exception 'la cola no tiene exactamente 10.000 rutas de cotizaciones'; end if;
  if exists (select 1 from public.cola_gc_storage g join jobs_vivas v on g.ruta = v.id || '/a.pdf' where g.bucket = 'cotizaciones') then raise exception 'encoló la ruta de una viva'; end if;
  if (select count(*) from public.cola_gc_storage g join jobs_cots j on g.ruta = j.id || '/1.pdf' where g.bucket = 'cotizaciones' and j.k > 450) <> 10000 then raise exception 'la cola no son las rutas propias de las purgadas'; end if;
  raise notice 'plan|job: papelera-purgar con cotizaciones|purgadas 10.000 de los lotes k = 451…500, la cola con sus 10.000 rutas propias';
end $$;

-- situacion-al-cerrar: 2.000 vehículos en_subasta en un origen de subasta (1.000 con el cierre vencido) entre los 100.000 de arriba. La selección va por
-- vehiculos_situacion_idx con (origen_id, situacion) fijos, sin recorrer vehiculos; una corrida recalcula su tope de 500.
set local session_replication_role = replica;
insert into public.vehiculos (origen_id, titulo, creado_por, creado_en, estado_subasta, subasta_fin_en, situacion)
select (select id from public.origenes where tipo = 'subasta' order by orden limit 1), 'Job situación ' || g, '00000000-0000-0000-0000-0000000000e1',
       now() - interval '10 days', 'abierta', now() + case when g % 2 = 0 then interval '-1 hour' else interval '1 day' end, 'en_subasta'
  from generate_series(1, 2000) g;
set local session_replication_role = origin;
analyze public.vehiculos;
do $$
declare v_plan jsonb; v_seq text;
begin
  set local plan_cache_mode = force_generic_plan;
  execute $q$prepare jobs_situacion(uuid) as select v.id from public.vehiculos v
    where v.origen_id = $1 and v.situacion = 'en_subasta' and v.eliminado_en is null and coalesce(v.subasta_fin_en, v.subasta_en) <= now()
    limit 500 for no key update skip locked$q$;
  execute format('explain (format json) execute jobs_situacion(%L)', (select id from public.origenes where tipo = 'subasta' order by orden limit 1)) into v_plan;
  raise notice 'plan|job: situacion-al-cerrar, la selección|%', v_plan;
  if not jsonb_path_exists(v_plan, 'lax $.** ? (@."Index Name" == "vehiculos_situacion_idx")') then raise exception 'situacion-al-cerrar no va por vehiculos_situacion_idx: %', v_plan; end if;
  select string_agg(distinct x #>> '{}', ', ') into v_seq from jsonb_path_query(v_plan, 'lax $.** ? (@."Node Type" == "Seq Scan")."Relation Name"') x;
  if v_seq is not null then raise exception 'situacion-al-cerrar recorre %: %', v_seq, v_plan; end if;
  execute 'deallocate jobs_situacion';
  reset plan_cache_mode;
end $$;
select pg_temp.cronometro('job: situacion-al-cerrar, 500 de 1.000 vencidas entre 2.000 en subasta', 'select public.vehiculos_situacion_al_cerrar()::text', 2000);
do $$
begin
  if (select count(*) from public.vehiculos where titulo like 'Job situación %' and situacion = 'en_subasta') <> 1500 then
    raise exception 'situacion-al-cerrar no recalculó exactamente su tope de 500';
  end if;
end $$;

rollback;
