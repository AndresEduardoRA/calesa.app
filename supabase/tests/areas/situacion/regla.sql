-- La situación real de un vehículo (`vehiculos.situacion`): la regla de `_vehiculo_situacion()` aplicada por `trg_0_situacion`, los cambios de
-- `es_subasta` (`trg_fase_situacion`), el job `situacion-al-cerrar` y las anclas de la limpieza. No depende de otro archivo
-- (`SOLO=areas/situacion/regla.sql`). Cada bloque abre su transacción y la revierte. `now()` no se mueve dentro de una transacción: lo que debe
-- quedar en el pasado se escribe con `session_replication_role = replica`.
--
-- Qué asegura:
--   S1. Dentro del tramo de subasta: abierta con el cierre futuro (o sin cierre) → en_subasta; abierta con el cierre pasado, terminada y vendida →
--       sin_resolver; ganada → fase; no_ganada → no_ganada.
--   S2. Fuera del tramo → fase: una fase que no es la subasta, un origen manual, sin fase en un origen sin fase de subasta; sin fase en un origen con
--       fase de subasta (aunque esté jubilada) sí es el tramo.
--   S3. Vuelta a subasta: una no ganada que se refresca con una subasta viva limpia el resultado y queda en_subasta; ese update mueve la versión y
--       audita, como editar el cierre en la ficha; fuera del tramo el resultado se conserva. Resolver sin tocar la subasta no mueve la versión ni audita.
--   S4. Marcar o desmarcar es_subasta, crear una fase así o borrar la única recalcula (también la papelera) sin mover la versión ni auditar.
--   S5. Mover de fase recalcula; una no ganada movida fuera del tramo vuelve a ser su fase (y conserva el resultado).
--   S6. El job pasa las en_subasta con el cierre vencido a sin_resolver, respeta su tope de 500 y salta las tomadas; está programado.
--   S7. `_limpieza_ancla` da sin_resolver y ganada; una no_ganada en la inicial sigue sin ancla.
--   S8. `_vehiculo_situacion`, el job y los triggers no los ejecuta `authenticated` ni PUBLIC.

-- Un origen de subasta con «Subasta» (inicial, la subasta) → «Comprado»; o manual con «Inicio».
create or replace function pg_temp.sit_origen(p_tipo text default 'subasta') returns uuid language plpgsql as $f$
declare o uuid; fl uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('sit_' || s, 'sit origen ' || s, p_tipo::public.tipo_origen) returning id into o;
  fl := (select id from public.flujos where origen_id = o);
  if p_tipo = 'subasta' then
    insert into public.fases (flujo_id, nombre, orden, es_inicial, es_subasta) values (fl, 'Subasta', 10, true, true);
    insert into public.fases (flujo_id, nombre, orden) values (fl, 'Comprado', 20);
  else
    insert into public.fases (flujo_id, nombre, orden, es_inicial) values (fl, 'Inicio', 10, true);
  end if;
  return o;
end $f$;

create or replace function pg_temp.sit_fase(p_origen uuid, p_nombre text) returns uuid language sql as $f$
  select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = p_origen and f.nombre = p_nombre;
$f$;

create or replace function pg_temp.sit_vehiculo(p_origen uuid, p_fase uuid, p_estado text, p_fin timestamptz, p_resultado text default null)
returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, estado_subasta, subasta_fin_en, subasta_resultado, subasta_resuelta_en)
  values (p_origen, 'sit vehículo', p_fase, p_estado::public.estado_subasta, p_fin, p_resultado, case when p_resultado is not null then now() end)
  returning id;
$f$;

create or replace function pg_temp.sit_de(p_v uuid) returns text language sql as $f$
  select situacion from public.vehiculos where id = p_v;
$f$;

create or replace function pg_temp.sit_es(p_que text, p_v uuid, p_esperada text) returns void language plpgsql as $f$
declare v_dio text := pg_temp.sit_de(p_v);
begin
  if v_dio is distinct from p_esperada then raise exception '%: debía ser % y es %', p_que, p_esperada, v_dio; end if;
end $f$;

-- Deja la versión del vehículo en el pasado, sin disparar triggers.
create or replace function pg_temp.sit_version_vieja(p_v uuid) returns void language plpgsql as $f$
begin
  set local session_replication_role = replica;
  update public.vehiculos set actualizado_en = '2020-01-01T00:00:00Z' where id = p_v;
  set local session_replication_role = origin;
end $f$;

create or replace function pg_temp.sit_sin_version_ni_auditoria(p_que text, p_v uuid) returns void language plpgsql as $f$
begin
  if (select actualizado_en from public.vehiculos where id = p_v) <> '2020-01-01T00:00:00Z' then
    raise exception '%: movió la versión', p_que;
  end if;
  if exists (select 1 from public.actividad where tabla = 'vehiculos' and registro_id = p_v::text and accion = 'vehiculos.update') then
    raise exception '%: auditó vehiculos.update', p_que;
  end if;
end $f$;

-- @test situacion: dentro del tramo, subasta viva, cerrada, ganada y no ganada (S1)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); s uuid; futuro timestamptz := now() + interval '3 days'; pasado timestamptz := now() - interval '3 days';
begin
  s := pg_temp.sit_fase(o, 'Subasta');
  perform pg_temp.sit_es('S1 abierta futura', pg_temp.sit_vehiculo(o, s, 'abierta', futuro), 'en_subasta');
  perform pg_temp.sit_es('S1 en vivo futura', pg_temp.sit_vehiculo(o, s, 'en_vivo', futuro), 'en_subasta');
  perform pg_temp.sit_es('S1 abierta sin cierre', pg_temp.sit_vehiculo(o, s, 'abierta', null), 'en_subasta');
  perform pg_temp.sit_es('S1 abierta con el cierre pasado', pg_temp.sit_vehiculo(o, s, 'abierta', pasado), 'sin_resolver');
  perform pg_temp.sit_es('S1 terminada', pg_temp.sit_vehiculo(o, s, 'terminada', pasado), 'sin_resolver');
  perform pg_temp.sit_es('S1 vendida', pg_temp.sit_vehiculo(o, s, 'vendida', null), 'sin_resolver');
  perform pg_temp.sit_es('S1 sin subasta', pg_temp.sit_vehiculo(o, s, null, null), 'fase');
  perform pg_temp.sit_es('S1 ganada', pg_temp.sit_vehiculo(o, s, 'terminada', pasado, 'ganada'), 'fase');
  perform pg_temp.sit_es('S1 no ganada', pg_temp.sit_vehiculo(o, s, 'vendida', pasado, 'no_ganada'), 'no_ganada');
  -- El cierre es subasta_fin_en y, sin él, subasta_en.
  insert into public.vehiculos (origen_id, titulo, fase_id, estado_subasta, subasta_en) values (o, 'sit', s, 'abierta', pasado) returning id into s;
  perform pg_temp.sit_es('S1 cierre por subasta_en', s, 'sin_resolver');
end $$;
rollback;

-- @test situacion: fuera del tramo es su fase; sin fase cuenta el flujo del origen, aun con la fase de subasta jubilada (S2)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); man uuid := pg_temp.sit_origen('manual'); pasado timestamptz := now() - interval '3 days'; v uuid;
  sin_marca uuid;
begin
  perform pg_temp.sit_es('S2 fase que no es la subasta', pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Comprado'), 'terminada', pasado), 'fase');
  perform pg_temp.sit_es('S2 origen manual', pg_temp.sit_vehiculo(man, pg_temp.sit_fase(man, 'Inicio'), 'terminada', pasado), 'fase');
  perform pg_temp.sit_es('S2 manual sin fase', pg_temp.sit_vehiculo(man, null, 'terminada', pasado), 'fase');
  v := pg_temp.sit_vehiculo(o, null, 'terminada', pasado);
  perform pg_temp.sit_es('S2 sin fase con fase de subasta', v, 'sin_resolver');
  update public.fases set activa = false, es_inicial = false where id = pg_temp.sit_fase(o, 'Subasta');
  perform pg_temp.sit_es('S2 sin fase con la subasta jubilada', pg_temp.sit_vehiculo(o, null, 'vendida', null), 'sin_resolver');
  -- Un origen de subasta sin ninguna fase marcada nunca da sin_resolver.
  sin_marca := pg_temp.sit_origen();
  update public.fases set es_subasta = false where id = pg_temp.sit_fase(sin_marca, 'Subasta');
  perform pg_temp.sit_es('S2 sin fase de subasta', pg_temp.sit_vehiculo(sin_marca, pg_temp.sit_fase(sin_marca, 'Subasta'), 'terminada', pasado), 'fase');
  perform pg_temp.sit_es('S2 sin fase y sin fase de subasta', pg_temp.sit_vehiculo(sin_marca, null, 'terminada', pasado), 'fase');
end $$;
rollback;

-- @test situacion: vuelta a subasta limpia el resultado, mueve la versión y audita; resolver solo, no (S3)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); v uuid; yo uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (yo, yo || '@ejemplo.com', '{"invitado": true}');
  v := pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Subasta'), 'terminada', now() - interval '3 days');
  perform pg_temp.sit_es('S3 de partida', v, 'sin_resolver');
  -- Resolver (lo que hacen las RPC): sin versión ni auditoría.
  perform pg_temp.sit_version_vieja(v);
  update public.vehiculos set subasta_resultado = 'no_ganada', subasta_resuelta_por = yo, subasta_resuelta_en = now() where id = v;
  perform pg_temp.sit_es('S3 no ganada', v, 'no_ganada');
  perform pg_temp.sit_sin_version_ni_auditoria('S3 resolver', v);
  -- El refresco trae una subasta nueva y viva.
  update public.vehiculos set estado_subasta = 'abierta', subasta_fin_en = now() + interval '5 days', apibara_sync_en = now() where id = v;
  perform pg_temp.sit_es('S3 vuelta a subasta', v, 'en_subasta');
  if exists (select 1 from public.vehiculos where id = v and (subasta_resultado is not null or subasta_resuelta_por is not null or subasta_resuelta_en is not null)) then
    raise exception 'S3: la vuelta a subasta no limpió el resultado';
  end if;
  if (select actualizado_en from public.vehiculos where id = v) = '2020-01-01T00:00:00Z' then
    raise exception 'S3: el refresco no movió la versión';
  end if;
  if not exists (select 1 from public.actividad where tabla = 'vehiculos' and registro_id = v::text and accion = 'vehiculos.update'
                 and antes ->> 'subasta_resultado' = 'no_ganada' and despues -> 'subasta_resultado' = 'null'::jsonb
                 and despues ->> 'situacion' = 'en_subasta') then
    raise exception 'S3: el refresco no auditó la vuelta a subasta';
  end if;
  -- Editar el cierre en la ficha (vehiculo_guardar, sin apibara_sync_en) también es la subasta: mueve la versión y audita.
  v := pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Subasta'), 'abierta', now() + interval '1 day');
  perform pg_temp.sit_version_vieja(v);
  update public.vehiculos set subasta_fin_en = now() - interval '1 hour' where id = v;
  perform pg_temp.sit_es('S3 editar el cierre', v, 'sin_resolver');
  if (select actualizado_en from public.vehiculos where id = v) = '2020-01-01T00:00:00Z' then
    raise exception 'S3: editar el cierre no movió la versión';
  end if;
  if not exists (select 1 from public.actividad where tabla = 'vehiculos' and registro_id = v::text and accion = 'vehiculos.update'
                 and despues ->> 'situacion' = 'sin_resolver') then
    raise exception 'S3: editar el cierre no se auditó';
  end if;
  -- Fuera del tramo, el resultado se conserva aunque la subasta vuelva a estar viva (una ganada que ya pasó a «Comprado» y se relistó).
  v := pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Comprado'), 'terminada', now() - interval '3 days', 'ganada');
  update public.vehiculos set estado_subasta = 'abierta', subasta_fin_en = now() + interval '5 days', apibara_sync_en = now() where id = v;
  if (select subasta_resultado from public.vehiculos where id = v) is distinct from 'ganada' then
    raise exception 'S3: fuera del tramo, la vuelta a subasta borró el resultado';
  end if;
  -- Un update que no toca la subasta tampoco toca un resultado vigente de una subasta cerrada.
  v := pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Subasta'), 'abierta', now() - interval '1 day', 'no_ganada');
  update public.vehiculos set fase_id = pg_temp.sit_fase(o, 'Subasta') where id = v;
  perform pg_temp.sit_es('S3 cerrada conserva el resultado', v, 'no_ganada');
end $$;
rollback;

-- @test situacion: cambiar es_subasta recalcula sin mover la versión ni auditar, también la papelera y al borrar la fase (S4)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); s uuid; c uuid; en_s uuid; sin_f uuid; borrado uuid; en_c uuid; pasado timestamptz := now() - interval '3 days';
  nueva uuid; fl uuid;
begin
  s := pg_temp.sit_fase(o, 'Subasta'); c := pg_temp.sit_fase(o, 'Comprado'); fl := (select id from public.flujos where origen_id = o);
  en_s := pg_temp.sit_vehiculo(o, s, 'terminada', pasado);
  sin_f := pg_temp.sit_vehiculo(o, null, 'terminada', pasado);
  borrado := pg_temp.sit_vehiculo(o, null, 'vendida', null);
  en_c := pg_temp.sit_vehiculo(o, c, 'terminada', pasado);
  set local session_replication_role = replica;
  update public.vehiculos set eliminado_en = now() where id = borrado;
  set local session_replication_role = origin;
  perform pg_temp.sit_version_vieja(en_s); perform pg_temp.sit_version_vieja(sin_f); perform pg_temp.sit_version_vieja(borrado);
  perform pg_temp.sit_version_vieja(en_c);
  update public.fases set es_subasta = false where id = s;
  perform pg_temp.sit_es('S4 desmarcar en la fase', en_s, 'fase');
  perform pg_temp.sit_es('S4 desmarcar sin fase', sin_f, 'fase');
  perform pg_temp.sit_es('S4 desmarcar en la papelera', borrado, 'fase');
  update public.fases set es_subasta = true where id = c;
  perform pg_temp.sit_es('S4 marcar otra', en_c, 'sin_resolver');
  perform pg_temp.sit_es('S4 marcar otra, sin fase', sin_f, 'sin_resolver');
  perform pg_temp.sit_es('S4 la vieja no', en_s, 'fase');
  perform pg_temp.sit_sin_version_ni_auditoria('S4 en la fase', en_s);
  perform pg_temp.sit_sin_version_ni_auditoria('S4 sin fase', sin_f);
  perform pg_temp.sit_sin_version_ni_auditoria('S4 papelera', borrado);
  perform pg_temp.sit_sin_version_ni_auditoria('S4 en la otra', en_c);
  -- Borrar la única fase de subasta (sin vehículos en ella) devuelve los «sin fase» a fase; crear una así los vuelve a sin_resolver.
  update public.vehiculos set fase_id = s where id = en_c;
  update public.fases set es_subasta = false where id = c;
  delete from public.fases where id = c;
  perform pg_temp.sit_es('S4 sin fase sin ninguna fase de subasta', sin_f, 'fase');
  insert into public.fases (flujo_id, nombre, orden, es_subasta) values (fl, 'Otra subasta', 30, true) returning id into nueva;
  perform pg_temp.sit_es('S4 crear una fase de subasta', sin_f, 'sin_resolver');
  delete from public.fases where id = nueva;
  perform pg_temp.sit_es('S4 borrar la única fase de subasta', sin_f, 'fase');
end $$;
rollback;

-- @test situacion: mover de fase recalcula (S5)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); v uuid;
begin
  v := pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Subasta'), 'terminada', now() - interval '3 days');
  perform pg_temp.sit_es('S5 en la subasta', v, 'sin_resolver');
  update public.vehiculos set fase_id = pg_temp.sit_fase(o, 'Comprado') where id = v;
  perform pg_temp.sit_es('S5 movida', v, 'fase');
  update public.vehiculos set fase_id = pg_temp.sit_fase(o, 'Subasta') where id = v;
  perform pg_temp.sit_es('S5 de vuelta', v, 'sin_resolver');
  -- Una no ganada movida a una fase real vuelve a contar (su fase); el resultado queda guardado y de vuelta en la subasta es no ganada otra vez.
  v := pg_temp.sit_vehiculo(o, pg_temp.sit_fase(o, 'Subasta'), 'terminada', now() - interval '3 days', 'no_ganada');
  perform pg_temp.sit_es('S5 no ganada', v, 'no_ganada');
  update public.vehiculos set fase_id = pg_temp.sit_fase(o, 'Comprado') where id = v;
  perform pg_temp.sit_es('S5 no ganada movida', v, 'fase');
  if (select subasta_resultado from public.vehiculos where id = v) is distinct from 'no_ganada' then raise exception 'S5: mover borró el resultado'; end if;
  update public.vehiculos set fase_id = pg_temp.sit_fase(o, 'Subasta') where id = v;
  perform pg_temp.sit_es('S5 no ganada de vuelta', v, 'no_ganada');
end $$;
rollback;

-- @test situacion: el job pasa las vencidas a sin_resolver con su tope y está programado (S6)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); s uuid; v uuid; viva uuid; n integer;
begin
  s := pg_temp.sit_fase(o, 'Subasta');
  -- Nacen vivas y su cierre pasa sin que nadie las toque.
  insert into public.vehiculos (origen_id, titulo, fase_id, estado_subasta, subasta_fin_en)
  select o, 'sit job ' || g, s, 'abierta', now() + interval '1 day' from generate_series(1, 501) g;
  viva := pg_temp.sit_vehiculo(o, s, 'abierta', now() + interval '1 day');
  set local session_replication_role = replica;
  update public.vehiculos set subasta_fin_en = now() - interval '1 hour' where origen_id = o and id <> viva;
  set local session_replication_role = origin;
  if exists (select 1 from public.vehiculos where origen_id = o and situacion <> 'en_subasta') then
    raise exception 'S6: el terreno no quedó en_subasta';
  end if;
  n := public.vehiculos_situacion_al_cerrar();
  if n <> 500 then raise exception 'S6: la primera corrida recalculó % (tope 500)', n; end if;
  if (select count(*) from public.vehiculos where origen_id = o and situacion = 'sin_resolver') <> 500 then
    raise exception 'S6: no quedaron 500 sin_resolver';
  end if;
  n := public.vehiculos_situacion_al_cerrar();
  if n <> 1 then raise exception 'S6: la segunda corrida recalculó %', n; end if;
  perform pg_temp.sit_es('S6 la viva sigue', viva, 'en_subasta');
  if public.vehiculos_situacion_al_cerrar() <> 0 then raise exception 'S6: sin vencidas debía recalcular 0'; end if;
  if pg_get_functiondef('public.vehiculos_situacion_al_cerrar()'::regprocedure) !~ 'for no key update skip locked' then
    raise exception 'S6: el job no salta las filas tomadas';
  end if;
  if not exists (select 1 from cron.job where jobname = 'situacion-al-cerrar' and schedule = '*/10 * * * *'
                 and command = 'select public.vehiculos_situacion_al_cerrar()') then
    raise exception 'S6: falta el job situacion-al-cerrar';
  end if;
end $$;
rollback;

-- @test situacion: la limpieza no toca lo sin resolver ni lo ganado; una no ganada en la inicial sigue sin ancla (S7)
begin;
do $$
declare o uuid := pg_temp.sit_origen(); s uuid; pasado timestamptz := now() - interval '3 days'; r public.vehiculos; v uuid;
begin
  s := pg_temp.sit_fase(o, 'Subasta');
  v := pg_temp.sit_vehiculo(o, s, 'terminada', pasado);
  select * into r from public.vehiculos where id = v;
  if public._limpieza_ancla(r) is distinct from 'sin_resolver' then raise exception 'S7 sin resolver: %', public._limpieza_ancla(r); end if;
  v := pg_temp.sit_vehiculo(o, s, 'terminada', pasado, 'ganada');
  select * into r from public.vehiculos where id = v;
  if public._limpieza_ancla(r) is distinct from 'ganada' then raise exception 'S7 ganada: %', public._limpieza_ancla(r); end if;
  v := pg_temp.sit_vehiculo(o, s, 'terminada', pasado, 'no_ganada');
  select * into r from public.vehiculos where id = v;
  if public._limpieza_ancla(r) is not null then raise exception 'S7 no ganada: %', public._limpieza_ancla(r); end if;
end $$;
rollback;

-- @test situacion: ni authenticated ni PUBLIC ejecutan la regla, el job ni los triggers (S8)
do $$
declare f text;
begin
  foreach f in array array['public._vehiculo_situacion(uuid, uuid, public.estado_subasta, timestamp with time zone, text)', 'public._vehiculo_en_tramo(uuid, uuid)',
    'public.vehiculos_situacion_al_cerrar()', 'public.vehiculo_situacion_calcular()', 'public.fase_situacion_recalcular()'] loop
    if has_function_privilege('authenticated', f, 'execute') or has_function_privilege('anon', f, 'execute') then
      raise exception 'S8: authenticated o anon ejecuta %', f;
    end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               where p.oid = f::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'S8: PUBLIC ejecuta %', f;
    end if;
    if not (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = f::regprocedure) then
      raise exception 'S8: % no es definer con search_path vacío', f;
    end if;
  end loop;
end $$;
