-- Resolver una subasta sin resolver: `vehiculo_subasta_no_ganada()` («No la ganamos» y «Deshacer») y `vehiculo_subasta_ganada()` («La ganamos»: mueve con
-- `cambiar_fase` y anota). No depende de otro archivo (`SOLO=areas/situacion/resolver.sql`). Cada bloque abre su transacción y la revierte. Las dos
-- personas a la vez: `areas/situacion/carreras.mjs` (`pnpm db:carreras`).
--
-- Qué asegura:
--   R1. Privilegios: las dos RPC son definer con search_path vacío, sin anon ni PUBLIC y con authenticated; sus ayudantes, sólo service_role.
--   R2. Sin flujos.mover del origen: 42501 hint permiso; sin logistica.ver, en la papelera o inexistente: 42501 hint acceso.
--   R3. «No la ganamos»: marca no_ganada, no mueve la versión ni audita vehiculos.update, y deja una fila vehiculo.subasta_resuelta con antes y después
--       exactos. Repetir da PT409 conflicto («La marcaste…» propia, «<Nombre> la marcó…» ajena). «Deshacer» la devuelve a sin_resolver; deshacer lo que
--       no está no ganada da PT409. Resolver lo que está en_subasta o en su fase da PT409.
--   R4. «La ganamos»: mueve, escribe el historial y ganada, y deja unidad.fase_cambiada y vehiculo.subasta_resuelta; hacia una fase de subasta, 23514
--       transicion; con un requisito bloqueante que falta, 23514 requisitos sin cambiar nada; con la fase esperada vieja, PT409; si otra persona la marcó
--       no ganada antes, PT409 sin historial.

-- Corre `p_sql` como `p_quien` (authenticated): `ok` o `sqlstate/hint/mensaje`.
create or replace function pg_temp.sr_corre(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_e text; v_h text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_e = returned_sqlstate, v_h = pg_exception_hint, v_m = message_text;
    reset role;
    return v_e || '/' || coalesce(v_h, '') || '/' || v_m;
  end;
  reset role;
  return 'ok';
end $f$;

create or replace function pg_temp.sr_no(p_quien uuid, p_v uuid, p_no boolean default true) returns text language sql as $f$
  select pg_temp.sr_corre(p_quien, format('select public.vehiculo_subasta_no_ganada(%L, %L)', p_v, p_no));
$f$;

create or replace function pg_temp.sr_si(p_quien uuid, p_v uuid, p_destino uuid, p_esperada uuid) returns text language sql as $f$
  select pg_temp.sr_corre(p_quien, format('select public.vehiculo_subasta_ganada(%L, %L, null, %L)', p_v, p_destino, p_esperada));
$f$;

create or replace function pg_temp.sr_es(p_que text, p_dio text, p_patron text) returns void language plpgsql as $f$
begin
  if p_dio is null or p_dio !~ p_patron then raise exception '%: debía ser ~«%» y fue «%»', p_que, p_patron, p_dio; end if;
end $f$;

-- Una persona con las claves dadas en el origen.
create or replace function pg_temp.sr_persona(p_origen uuid, p_claves text[], p_nombre text) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-sr@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre where id = v_id;
  insert into public.roles (clave, nombre) values ('sr_' || substr(v_id::text, 1, 8), 'sr ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) select v_rol, k, p_origen, 'todos' from unnest(p_claves) k;
  return v_id;
end $f$;

-- Un origen de subasta: «Subasta» (inicial, la subasta) → «Comprado» y → «Otra subasta» (también la subasta).
create or replace function pg_temp.sr_origen() returns uuid language plpgsql as $f$
declare o uuid; fl uuid; sub uuid; comp uuid; otra uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('sr_' || s, 'sr origen ' || s, 'subasta') returning id into o;
  fl := (select id from public.flujos where origen_id = o);
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_subasta) values (fl, 'Subasta', 10, true, true) returning id into sub;
  insert into public.fases (flujo_id, nombre, orden) values (fl, 'Comprado', 20) returning id into comp;
  insert into public.fases (flujo_id, nombre, orden, es_subasta) values (fl, 'Otra subasta', 30, true) returning id into otra;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (fl, sub, comp), (fl, sub, otra);
  return o;
end $f$;

create or replace function pg_temp.sr_fase(p_origen uuid, p_nombre text) returns uuid language sql as $f$
  select f.id from public.fases f join public.flujos fl on fl.id = f.flujo_id where fl.origen_id = p_origen and f.nombre = p_nombre;
$f$;

-- Un vehículo en «Subasta» con la subasta terminada (sin_resolver) y la versión en el pasado.
create or replace function pg_temp.sr_vehiculo(p_origen uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, estado_subasta, subasta_fin_en)
  values (p_origen, 'sr vehículo', pg_temp.sr_fase(p_origen, 'Subasta'), now() - interval '2 days', 'terminada', now() - interval '2 days') returning id into v;
  set local session_replication_role = replica;
  update public.vehiculos set actualizado_en = '2020-01-01T00:00:00Z' where id = v;
  set local session_replication_role = origin;
  return v;
end $f$;

-- @test situacion: privilegios de resolver (R1)
do $$
declare f text;
begin
  foreach f in array array['public.vehiculo_subasta_no_ganada(uuid, boolean)', 'public.vehiculo_subasta_ganada(uuid, uuid, text, uuid)',
    'public._subasta_conflicto(uuid)', 'public._subasta_puede_resolver(uuid)'] loop
    if not (select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid = f::regprocedure) then
      raise exception 'R1: % no es definer con search_path vacío', f;
    end if;
    if has_function_privilege('anon', f, 'execute') then raise exception 'R1: anon ejecuta %', f; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               where p.oid = f::regprocedure and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'R1: PUBLIC ejecuta %', f;
    end if;
    if has_function_privilege('authenticated', f, 'execute') is distinct from (f not like 'public.\_%') then
      raise exception 'R1: authenticated y % no van como deben', f;
    end if;
  end loop;
end $$;

-- @test situacion: sin permiso o sin acceso, 42501 con su hint (R2)
begin;
do $$
declare o uuid := pg_temp.sr_origen(); v uuid; borrado uuid;
  sin_mover uuid; sin_ver uuid;
begin
  sin_mover := pg_temp.sr_persona(o, array['logistica.ver', 'vehiculos.ver'], 'Sin Mover');
  sin_ver := pg_temp.sr_persona(o, array['flujos.mover', 'vehiculos.ver'], 'Sin Ver');
  v := pg_temp.sr_vehiculo(o);
  borrado := pg_temp.sr_vehiculo(o);
  update public.vehiculos set eliminado_en = now() where id = borrado;
  perform pg_temp.sr_es('R2 sin flujos.mover', pg_temp.sr_no(sin_mover, v), '^42501/permiso/');
  perform pg_temp.sr_es('R2 sin flujos.mover, ganada', pg_temp.sr_si(sin_mover, v, pg_temp.sr_fase(o, 'Comprado'), pg_temp.sr_fase(o, 'Subasta')), '^42501/permiso/');
  perform pg_temp.sr_es('R2 sin logistica.ver', pg_temp.sr_no(sin_ver, v), '^42501/acceso/');
  perform pg_temp.sr_es('R2 en la papelera', pg_temp.sr_no(pg_temp.sr_persona(o, array['flujos.mover', 'logistica.ver', 'vehiculos.ver'], 'P'), borrado), '^42501/acceso/');
  perform pg_temp.sr_es('R2 inexistente', pg_temp.sr_no(sin_mover, gen_random_uuid()), '^42501/acceso/');
  perform pg_temp.sr_es('R2 sin decir', pg_temp.sr_corre(sin_mover, format('select public.vehiculo_subasta_no_ganada(%L, null)', v)), '^22023/p_no_ganada/');
  if (select situacion from public.vehiculos where id = v) <> 'sin_resolver' then raise exception 'R2: cambió algo'; end if;
end $$;
rollback;

-- @test situacion: «No la ganamos», repetir, «Deshacer» y lo que no está sin resolver (R3)
begin;
do $$
declare o uuid := pg_temp.sr_origen(); v uuid; viva uuid; movida uuid; ana uuid; beto uuid; r text; a record;
begin
  ana := pg_temp.sr_persona(o, array['flujos.mover', 'logistica.ver', 'vehiculos.ver'], 'Ana Resuelve');
  beto := pg_temp.sr_persona(o, array['flujos.mover.cualquiera', 'logistica.ver', 'vehiculos.ver'], 'Beto Resuelve');
  v := pg_temp.sr_vehiculo(o);
  perform pg_temp.sr_es('R3 no ganada', pg_temp.sr_no(ana, v), '^ok$');
  if (select (situacion, subasta_resultado, subasta_resuelta_por) is distinct from ('no_ganada', 'no_ganada', ana) from public.vehiculos where id = v) then
    raise exception 'R3: no quedó no ganada por Ana';
  end if;
  if (select actualizado_en from public.vehiculos where id = v) <> '2020-01-01T00:00:00Z' then raise exception 'R3: movió la versión'; end if;
  if exists (select 1 from public.actividad where registro_id = v::text and accion = 'vehiculos.update') then raise exception 'R3: auditó vehiculos.update'; end if;
  select count(*) as n, min(antes::text) as antes, min(despues::text) as despues, min(actor_id::text) as actor, min(tabla) as tabla into a
    from public.actividad where registro_id = v::text and accion = 'vehiculo.subasta_resuelta';
  if a.n <> 1 or a.antes::jsonb <> '{"resultado": null}' or a.despues::jsonb <> '{"resultado": "no_ganada"}' or a.actor <> ana::text or a.tabla <> 'vehiculos' then
    raise exception 'R3: la constancia es %', a;
  end if;
  -- Repetir: la misma persona y otra.
  perform pg_temp.sr_es('R3 repetir, propia', pg_temp.sr_no(ana, v), '^PT409/conflicto/La marcaste como no ganada hace un momento desde otra ventana\.$');
  perform pg_temp.sr_es('R3 repetir, ajena', pg_temp.sr_no(beto, v), '^PT409/conflicto/Ana Resuelve la marcó como no ganada hace un momento\.$');
  perform pg_temp.sr_es('R3 ganada sobre no ganada', pg_temp.sr_si(beto, v, pg_temp.sr_fase(o, 'Comprado'), pg_temp.sr_fase(o, 'Subasta')),
                        '^PT409/conflicto/Ana Resuelve la marcó como no ganada');
  -- Deshacer (otra persona puede).
  perform pg_temp.sr_es('R3 deshacer', pg_temp.sr_no(beto, v, false), '^ok$');
  if (select (situacion, subasta_resultado, subasta_resuelta_por, subasta_resuelta_en) is distinct from ('sin_resolver', null::text, null::uuid, null::timestamptz)
        from public.vehiculos where id = v) then
    raise exception 'R3: deshacer no la devolvió a sin_resolver';
  end if;
  if (select count(*) from public.actividad where registro_id = v::text and accion = 'vehiculo.subasta_resuelta'
        and antes = '{"resultado": "no_ganada"}' and despues = '{"resultado": null}') <> 1 then
    raise exception 'R3: deshacer no dejó constancia';
  end if;
  perform pg_temp.sr_es('R3 deshacer otra vez', pg_temp.sr_no(beto, v, false), '^PT409/conflicto/Sigue sin resolver');
  -- Lo que no está sin resolver.
  insert into public.vehiculos (origen_id, titulo, fase_id, estado_subasta, subasta_fin_en)
  values (o, 'sr viva', pg_temp.sr_fase(o, 'Subasta'), 'abierta', now() + interval '2 days') returning id into viva;
  perform pg_temp.sr_es('R3 en subasta', pg_temp.sr_no(ana, viva), '^PT409/conflicto/La subasta volvió a abrirse');
  insert into public.vehiculos (origen_id, titulo, fase_id, estado_subasta) values (o, 'sr movida', pg_temp.sr_fase(o, 'Comprado'), 'terminada') returning id into movida;
  perform pg_temp.sr_es('R3 en su fase', pg_temp.sr_no(ana, movida), '^PT409/conflicto/Ya no está sin resolver: está en «Comprado»\.$');
end $$;
rollback;

-- @test situacion: «La ganamos» mueve y anota, todo o nada (R4)
begin;
do $$
declare o uuid := pg_temp.sr_origen(); v uuid; ana uuid; beto uuid; sub uuid; comp uuid; t uuid; r text;
begin
  ana := pg_temp.sr_persona(o, array['flujos.mover', 'logistica.ver', 'vehiculos.ver'], 'Ana Gana');
  beto := pg_temp.sr_persona(o, array['flujos.mover', 'logistica.ver', 'vehiculos.ver'], 'Beto Pierde');
  sub := pg_temp.sr_fase(o, 'Subasta'); comp := pg_temp.sr_fase(o, 'Comprado');
  -- Hacia otra fase de subasta.
  v := pg_temp.sr_vehiculo(o);
  perform pg_temp.sr_es('R4 destino de subasta', pg_temp.sr_si(ana, v, pg_temp.sr_fase(o, 'Otra subasta'), sub), '^23514/transicion/Para marcarla como ganada');
  -- La fase esperada vieja.
  perform pg_temp.sr_es('R4 fase esperada vieja', pg_temp.sr_si(ana, v, comp, comp), '^PT409/conflicto/');
  -- Un requisito bloqueante que falta: no cambia nada.
  insert into public.tipos_documento (nombre) values ('SR tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id into t;
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante) values (comp, 'documento', t, true);
  perform pg_temp.sr_es('R4 requisito', pg_temp.sr_si(ana, v, comp, sub), '^23514/requisitos/');
  if (select (fase_id, subasta_resultado, situacion) is distinct from (sub, null::text, 'sin_resolver') from public.vehiculos where id = v)
     or exists (select 1 from public.historial_fases where vehiculo_id = v)
     or exists (select 1 from public.actividad where registro_id = v::text and accion in ('vehiculo.subasta_resuelta', 'unidad.fase_cambiada')) then
    raise exception 'R4: un rechazo de cambiar_fase dejó algo';
  end if;
  delete from public.fases_requisitos where fase_id = comp;
  -- Otra persona la marcó no ganada antes.
  perform pg_temp.sr_es('R4 Beto primero', pg_temp.sr_no(beto, v), '^ok$');
  perform pg_temp.sr_es('R4 Ana después', pg_temp.sr_si(ana, v, comp, sub), '^PT409/conflicto/Beto Pierde la marcó como no ganada');
  if exists (select 1 from public.historial_fases where vehiculo_id = v) then raise exception 'R4: quedó historial tras el PT409'; end if;
  perform pg_temp.sr_es('R4 deshacer', pg_temp.sr_no(beto, v, false), '^ok$');
  -- El camino feliz.
  perform pg_temp.sr_es('R4 ganada', pg_temp.sr_si(ana, v, comp, sub), '^ok$');
  if (select (fase_id, subasta_resultado, subasta_resuelta_por, situacion) is distinct from (comp, 'ganada', ana, 'fase') from public.vehiculos where id = v) then
    raise exception 'R4: no quedó en «Comprado» y ganada';
  end if;
  if (select count(*) from public.historial_fases where vehiculo_id = v and de_fase_id = sub and a_fase_id = comp and usuario_id = ana) <> 1 then
    raise exception 'R4: el historial no es el del movimiento';
  end if;
  if (select count(*) from public.actividad where registro_id = v::text and accion = 'unidad.fase_cambiada') <> 1
     or (select count(*) from public.actividad a where a.registro_id = v::text and a.accion = 'vehiculo.subasta_resuelta' and a.actor_id = ana
           and a.antes = '{"resultado": null}' and a.despues ->> 'resultado' = 'ganada'
           and (a.despues ->> 'historial')::bigint = (select h.id from public.historial_fases h where h.vehiculo_id = v)) <> 1 then
    raise exception 'R4: la actividad no son las dos filas esperadas';
  end if;
  perform pg_temp.sr_es('R4 repetir ganada', pg_temp.sr_si(beto, v, comp, comp), '^PT409/conflicto/Ana Gana la marcó como ganada');
end $$;
rollback;
