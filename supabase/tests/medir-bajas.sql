-- La baja de una persona con 200.000 leads (cierre 1 de la Fase 3), con transacciones de verdad: `pnpm db:medir:volumen`.
-- Antes: una sentencia que revocaba todo y reescribía la fila de cada lead, 17,9 s con 200.000 (6,7 s con 80.000), que
-- `authenticated` corta a los 8 s. Ahora la llamada hace el primer lote de 5.000 y el job (`equipo-bajas`, cada minuto) el
-- resto, cortando cada corrida pasados 1,5 s.
--
-- No va en una transacción que se revierte, como las otras mediciones: dentro de una sola transacción nada de lo revocado
-- se puede descartar entre lotes y cada lote recorre lo hecho por los anteriores (6 s un lote). Así que confirma como lo
-- haría la base viva: la persona y sus leads, la llamada, y cada corrida del job; y al final borra lo que creó (también al
-- empezar, por si una corrida anterior se cortó). Asserta el tiempo de la llamada como `authenticated`, el de cada corrida,
-- que la baja termine y que todo quede igual a su fuente.
\set ON_ERROR_STOP 1

-- El job de verdad (`equipo-bajas`, cada minuto) se pausa mientras se mide: si no, la corrida de pg_cron de ese minuto hace
-- parte de la misma baja en paralelo con las de abajo (medido en el paso 4.04: 10, 11 y una vez 25 corridas para la misma
-- baja). Se reactiva al final; si la medición se corta, queda pausado hasta la próxima medición o `pnpm db:reset`.
select cron.alter_job(jobid, active := false) from cron.job where jobname = 'equipo-bajas' \g /dev/null

-- Lo que haya dejado una corrida cortada.
create or replace function pg_temp.borrar_lo_medido() returns void language plpgsql as $$
begin
  delete from public.leads_asesores where usuario_id = '00000000-0000-0000-0000-0000000000e9';
  set local session_replication_role = replica;
  delete from public.leads where nombre like 'Medir baja %';
  set local session_replication_role = origin;
  delete from public.equipo_bajas where usuario_id = '00000000-0000-0000-0000-0000000000e9';
  delete from public.actividad where registro_id = '00000000-0000-0000-0000-0000000000e9';
  delete from auth.users where id = '00000000-0000-0000-0000-0000000000e9';
end $$;
select pg_temp.borrar_lo_medido();

-- La persona y sus 200.000 leads, por conjunto (como la siembra).
begin;
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000e9', 'medir-baja@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select '00000000-0000-0000-0000-0000000000e9', id, true from public.roles where clave = 'asesor';
set local session_replication_role = replica;
insert into public.leads (id, nombre, telefono_principal, creado_por, creado_en, actualizado_en, cartera, tipo_lead_id)
select gen_random_uuid(), 'Medir baja ' || g, (690000000 + g)::text, '00000000-0000-0000-0000-0000000000e9',
       now() - make_interval(secs => g), now() - make_interval(secs => g), array['00000000-0000-0000-0000-0000000000e9']::uuid[],
       (select id from public.tipos_lead where clave = 'prospecto')
  from generate_series(1, 200000) g;
-- Sin triggers tampoco llega `lead_creado_en` (5a-fix-1a): se copia del lead a mano.
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, desde, lead_creado_en)
select id, '00000000-0000-0000-0000-0000000000e9', 'dueno', now(), creado_en from public.leads where nombre like 'Medir baja %';
commit;
vacuum analyze public.leads, public.leads_asesores;
-- Lo que dejó la medición anterior (`medir-jobs.sql` revierte 100.000 filas) dispara el autovacuum de estas tablas: medir
-- mientras corre da ruido (una corrida de 5 s contra 1,7–2,1 s). Se espera a que no haya ninguno en curso.
do $$
begin
  for i in 1..240 loop
    exit when not exists (select 1 from pg_stat_progress_vacuum p join pg_class c on c.oid = p.relid
                           where c.relname in ('leads', 'leads_asesores', 'oportunidades', 'equipo_bajas', 'actividad'));
    perform pg_sleep(0.5);
  end loop;
end $$;

-- La vista previa y la llamada, como la dueña de volumen y con el corte de 8 s de `authenticated`.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', false) \g /dev/null
set statement_timeout = '8s';
set role authenticated;
do $$
declare t0 timestamptz; r jsonb; v_ms numeric;
begin
  t0 := clock_timestamp();
  r := public.equipo_vista_previa_baja('00000000-0000-0000-0000-0000000000e9');
  v_ms := extract(epoch from clock_timestamp() - t0) * 1000;
  raise notice 'medicion|baja de 200.000: la vista previa (hasta 1.001) [duena]|%', round(v_ms, 1);
  if (r ->> 'leads_al_limbo')::int <> 1001 then raise exception 'la vista previa contó %', r; end if;
  if v_ms > 300 then raise exception 'baja de 200.000: la vista previa tarda % ms, el presupuesto es 300 ms', round(v_ms, 1); end if;
  t0 := clock_timestamp();
  r := public.equipo_dar_de_baja('00000000-0000-0000-0000-0000000000e9');
  v_ms := extract(epoch from clock_timestamp() - t0) * 1000;
  raise notice 'medicion|baja de 200.000: la llamada (primer lote) [duena]|%', round(v_ms, 1);
  if (r ->> 'terminada')::boolean then raise exception 'la baja de 200.000 no debería terminar en la llamada: %', r; end if;
  -- 0,4–0,6 s casi siempre; justo después de cargar los 200.000, a veces ~3 s (las primeras escrituras sobre páginas recién
  -- cargadas pagan su imagen completa en el WAL). El presupuesto es la mitad del corte de 8 s de `authenticated`.
  if v_ms > 4000 then raise exception 'baja de 200.000: la llamada tarda % ms, el presupuesto es 4000 ms', round(v_ms, 1); end if;
end $$;
reset role;
reset statement_timeout;

-- El job, una corrida por transacción (como pg_cron), hasta terminar.
do $$
declare t0 timestamptz; r jsonb; v_ms numeric; v_max numeric := 0; v_corridas int := 0; v_total numeric := 0;
        v_lotes int := 0; v_terminada boolean;
begin
  loop
    t0 := clock_timestamp();
    r := public.equipo_bajas_continuar();
    commit;
    v_ms := extract(epoch from clock_timestamp() - t0) * 1000;
    v_max := greatest(v_max, v_ms); v_total := v_total + v_ms; v_corridas := v_corridas + 1;
    v_lotes := v_lotes + (r ->> 'lotes')::int;
    select terminada_en is not null into v_terminada from public.equipo_bajas where usuario_id = '00000000-0000-0000-0000-0000000000e9';
    exit when v_terminada or v_corridas > 60;
  end loop;
  raise notice 'medicion|baja de 200.000: la corrida más larga del job [postgres]|%', round(v_max, 1);
  raise notice 'medicion|baja de 200.000: el job entero, % corridas y % lotes [postgres]|%', v_corridas, v_lotes, round(v_total, 1);
  if not v_terminada then raise exception 'la baja de 200.000 no terminó en % corridas', v_corridas; end if;
  -- 1,7–2,4 s casi siempre (corta a los 1,5 s más un lote); con la máquina ocupada se vieron 3,5 y 4,3 s.
  if v_max > 6000 then raise exception 'baja de 200.000: una corrida del job tarda % ms, el presupuesto es 6000 ms', round(v_max, 1); end if;
end $$;

do $$
declare b public.equipo_bajas;
begin
  select * into b from public.equipo_bajas where usuario_id = '00000000-0000-0000-0000-0000000000e9';
  if b.leads_al_limbo <> 200000 then raise exception 'baja de 200.000: contó % al limbo', b.leads_al_limbo; end if;
  if exists (select 1 from public.leads_asesores where usuario_id = b.usuario_id and revocado_en is null) then
    raise exception 'baja de 200.000: quedaron filas vigentes';
  end if;
  if exists (select 1 from public.leads l where l.nombre like 'Medir baja %' and l.cartera is distinct from public._lead_cartera_calcular(l.id)) then
    raise exception 'baja de 200.000: una cartera no coincide con su fuente';
  end if;
end $$;

select pg_temp.borrar_lo_medido();
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'equipo-bajas' \g /dev/null
