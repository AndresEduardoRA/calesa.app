-- Medición de los jobs con 100.000 filas por purgar (`pnpm db:medir:volumen`, contra el Supabase LOCAL), 9e.
--
-- Todo en una transacción que se revierte. Cada job corre como lo corre pg_cron o la edge function:
-- con los derechos de la base. Se informa el tiempo de la corrida y cuántas filas tocó. El terreno:
--   apibara-consultas-purgar        100.000 consultas de hace más de 48 h
--   importaciones-vinculos-purgar   100.000 vínculos de 200 importaciones de hace más de 7 días
--   papelera-purgar                 100.000 leads vencidos en 500 lotes de 200
--   limpieza-automatica             100.000 vehículos importados de una subasta terminada, sin comprador
--   storage-gc                      100.000 objetos en el bucket `vehiculos` sin fila, y 100.000 en la cola
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
insert into public.leads (nombre, telefono_principal, creado_por, creado_en, eliminado_en, eliminado_por, lote_papelera_id)
select 'Job borrado ' || (lo.k * 1000 + j), (70000000 + lo.k * 1000 + j)::text, '00000000-0000-0000-0000-0000000000e1',
       now() - interval '401 days', now() - interval '400 days', '00000000-0000-0000-0000-0000000000e1', lo.id
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
update public.cola_gc_barrido
   set ultimo_nombre = (select o.name from storage.objects o where o.bucket_id = 'vehiculos' order by o.name desc limit 1 offset 15000)
 where bucket = 'vehiculos';
select pg_temp.cronometro('job: storage-gc, una pasada cerca del final del bucket (10.000 examinados)', $q$select public.storage_gc_encolar_huerfanos('vehiculos', interval '1 day')::text$q$, 1000);

rollback;
