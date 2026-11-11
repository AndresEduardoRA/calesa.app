-- Los eventos de la agenda (paso 7.06-1): estructura, escritura sólo por RPC, publicar, destinatarios, avisos, versión y quién lee.
-- No depende de otro archivo (`SOLO=areas/agenda/eventos.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E1. `eventos.cotizacion_id` con su FK (on delete set null) y su índice; la versión se mueve dos veces en una transacción.
--   E2. Nadie escribe `eventos` ni `eventos_destinatarios` directo: insert, update y delete como authenticated dan 42501.
--   E3. Crear: privado sin permisos; público y seleccionados con agenda.eventos.publicar; id repetido o ajeno; datos con su hint.
--   E4 (quién lee) está en `eventos-leer.sql`.
--   E5. Guardar: sólo el creador; publicar en todo guardar de algo publicado; PT409; los destinatarios mueven la versión; bloqueado no escribe.
--   E6 y E7 (destinatarios y avisos) están en `eventos-destinatarios.sql`.
--   E8. Vínculos (lead, vehículo, cotización) que quien escribe no ve: 42501 con su hint; un nulo explícito quita el vínculo.
--   E9. Eliminar: sólo el creador, publicar si es público, con versión.
--   E10. Catálogo: definer, search_path vacío, execute de authenticated; los ayudantes, no.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.ag_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de una base vacía queda dueña (con todos los permisos): se la lleva una aparte.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'ag-duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ag_' || substr(v_id::text, 1, 8), 'AG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.ag_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return coalesce(v, 'null'::jsonb);
end $f$;

-- Un evento armado como dueño de la tabla (terreno de la prueba).
create or replace function pg_temp.ag_evento(p_quien uuid, p_vis text default 'privado', p_dest uuid[] default '{}') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.eventos (titulo, inicia_en, visibilidad, creado_por)
  values ('AG evento', now() + interval '1 day', p_vis::public.visibilidad_evento, p_quien) returning id into v;
  foreach u in array p_dest loop insert into public.eventos_destinatarios (evento_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- @test agenda: eventos.cotizacion_id con FK on delete set null e índice; la versión se mueve dos veces en una transacción (E1)
begin;
do $$
declare yo uuid := pg_temp.ag_persona(); ev uuid; v1 timestamptz; v2 timestamptz; v3 timestamptz;
begin
  if not exists (select 1 from pg_constraint c
      where c.contype = 'f' and c.confdeltype = 'n' and c.conrelid = 'public.eventos'::regclass and c.confrelid = 'public.cotizaciones'::regclass
        and c.conkey = array[(select attnum from pg_attribute where attrelid = 'public.eventos'::regclass and attname = 'cotizacion_id')]) then
    raise exception 'falta la FK on delete set null de eventos.cotizacion_id';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'eventos_cotizacion_id_idx' and indexdef like '%(cotizacion_id)') then
    raise exception 'falta el índice de eventos.cotizacion_id';
  end if;
  ev := pg_temp.ag_evento(yo);
  select actualizado_en into v1 from public.eventos where id = ev;
  update public.eventos set titulo = 'AG uno' where id = ev returning actualizado_en into v2;
  update public.eventos set titulo = 'AG dos' where id = ev returning actualizado_en into v3;
  if not (v1 < v2 and v2 < v3) then raise exception 'la versión del evento no se movió dos veces en la transacción: % % %', v1, v2, v3; end if;
end $$;
rollback;

-- @test agenda: nadie escribe eventos ni eventos_destinatarios directo (E2)
begin;
do $$
declare yo uuid := pg_temp.ag_persona(array['agenda.eventos.publicar', 'agenda.ver_todo']); ev uuid; r jsonb; s text;
begin
  ev := pg_temp.ag_evento(yo, 'seleccionados', array[pg_temp.ag_persona()]);
  foreach s in array array[
    format('insert into public.eventos (titulo, inicia_en, creado_por) values (%L, now(), %L)', 'x', yo),
    format('update public.eventos set titulo = %L where id = %L', 'x', ev),
    format('delete from public.eventos where id = %L', ev),
    format('insert into public.eventos_destinatarios (evento_id, usuario_id) values (%L, %L)', ev, yo),
    format('delete from public.eventos_destinatarios where evento_id = %L', ev)
  ] loop
    r := pg_temp.ag_corre(yo, s);
    if r ->> 'error' is distinct from '42501' then raise exception 'una escritura directa no dio 42501 (%): %', s, r; end if;
  end loop;
  if has_table_privilege('authenticated', 'public.eventos', 'INSERT, UPDATE, DELETE')
     or has_table_privilege('authenticated', 'public.eventos_destinatarios', 'INSERT, UPDATE, DELETE') then
    raise exception 'authenticated conserva un privilegio de escritura en eventos o eventos_destinatarios';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename in ('eventos', 'eventos_destinatarios') and cmd <> 'SELECT') then
    raise exception 'queda una policy de escritura en eventos o eventos_destinatarios';
  end if;
end $$;
rollback;

-- Llama a una RPC de eventos como esa persona: 'crear' (id, datos, destinatarios), 'guardar' (evento, versión, datos, destinatarios), 'eliminar' (evento, versión).
create or replace function pg_temp.ag_crear(p_quien uuid, p_id uuid, p_datos jsonb, p_dest uuid[] default '{}') returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.evento_crear(%L, %L, %L)', p_id, p_datos, p_dest));
$f$;
create or replace function pg_temp.ag_guardar(p_quien uuid, p_ev uuid, p_v timestamptz, p_datos jsonb, p_dest uuid[] default null) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.evento_guardar(%L, %L, %L, %L)', p_ev, p_v, p_datos, p_dest));
$f$;
create or replace function pg_temp.ag_eliminar(p_quien uuid, p_ev uuid, p_v timestamptz) returns jsonb language sql as $f$
  select pg_temp.ag_corre(p_quien, format('select public.evento_eliminar(%L, %L)', p_ev, p_v));
$f$;
-- Datos mínimos de un evento con esta visibilidad.
create or replace function pg_temp.ag_datos(p_vis text default 'privado') returns jsonb language sql as $f$
  select jsonb_build_object('titulo', 'Reunión AG', 'inicia_en', now() + interval '2 days', 'visibilidad', p_vis);
$f$;
-- Quita un permiso del rol propio de esa persona.
create or replace function pg_temp.ag_quitar(p_quien uuid, p_clave text) returns void language sql as $f$
  delete from public.roles_permisos where permiso_clave = p_clave and rol_id in (select rol_id from public.usuarios_roles where usuario_id = p_quien);
$f$;

-- @test agenda: crear un evento; publicar (público o seleccionados) exige agenda.eventos.publicar; el mismo id es repetido y un id ajeno da 22023 (E3)
begin;
do $$
declare
  sin uuid := pg_temp.ag_persona(); pub uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']); d uuid := pg_temp.ag_persona();
  id1 uuid := gen_random_uuid(); r jsonb;
begin
  r := pg_temp.ag_crear(sin, id1, pg_temp.ag_datos());
  if r ->> 'resultado' is distinct from 'creado' or r ->> 'id' is distinct from id1::text or not r ? 'actualizado_en' then raise exception 'privado sin permisos no se creó: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'id', 'resultado'] then raise exception 'la respuesta trae más que resultado, id y versión: %', r; end if;
  r := pg_temp.ag_crear(sin, id1, pg_temp.ag_datos());
  if r ->> 'resultado' is distinct from 'repetido' then raise exception 'el mismo id no dio repetido: %', r; end if;
  r := pg_temp.ag_crear(pub, id1, pg_temp.ag_datos());
  if r ->> 'error' is distinct from '22023' then raise exception 'un id ajeno no dio 22023: %', r; end if;
  r := pg_temp.ag_crear(sin, gen_random_uuid(), pg_temp.ag_datos('publico'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.eventos.publicar%' then raise exception 'público sin publicar no dio 42501: %', r; end if;
  r := pg_temp.ag_crear(sin, gen_random_uuid(), pg_temp.ag_datos('seleccionados'), array[d]);
  if r ->> 'error' is distinct from '42501' then raise exception 'seleccionados sin publicar no dio 42501: %', r; end if;
  r := pg_temp.ag_crear(pub, gen_random_uuid(), pg_temp.ag_datos('publico'));
  if r ->> 'resultado' is distinct from 'creado' then raise exception 'público con publicar no se creó: %', r; end if;
  r := pg_temp.ag_crear(pub, gen_random_uuid(), pg_temp.ag_datos('seleccionados'), array[d]);
  if r ->> 'resultado' is distinct from 'creado' then raise exception 'seleccionados con publicar no se creó: %', r; end if;
  r := pg_temp.ag_crear(sin, gen_random_uuid(), pg_temp.ag_datos() || '{"color": "rojo"}');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'color' then raise exception 'una clave desconocida no dio 22023 con su hint: %', r; end if;
  r := pg_temp.ag_crear(sin, gen_random_uuid(), pg_temp.ag_datos() - 'inicia_en');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'inicia_en' then raise exception 'sin inicia_en no dio 22023 con su hint: %', r; end if;
  r := pg_temp.ag_crear(sin, gen_random_uuid(), pg_temp.ag_datos() || jsonb_build_object('termina_en', now()));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'termina_en' then raise exception 'terminar antes de empezar no dio 22023 con su hint: %', r; end if;
  r := pg_temp.ag_crear(sin, gen_random_uuid(), pg_temp.ag_datos() || '{"titulo": "  "}');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'titulo' then raise exception 'un título vacío no dio 22023 con su hint: %', r; end if;
end $$;
rollback;

-- @test agenda: guardar: sólo el creador; publicar también al editar; PT409 con la versión vieja; los destinatarios mueven la versión; bloqueado no escribe (E5)
begin;
do $$
declare
  pub uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']); sin uuid := pg_temp.ag_persona(); vt uuid := pg_temp.ag_persona(array['agenda.ver_todo']);
  d1 uuid := pg_temp.ag_persona(); d2 uuid := pg_temp.ag_persona(); quita uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']);
  e uuid := gen_random_uuid(); p uuid := gen_random_uuid(); s uuid := gen_random_uuid(); q uuid := gen_random_uuid();
  v0 timestamptz; v1 timestamptz; r jsonb;
begin
  -- Un privado de quien no publica: el creador lo edita; ver_todo lo ve y no lo edita; un tercero ni lo encuentra.
  v0 := (pg_temp.ag_crear(sin, p, pg_temp.ag_datos()) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.ag_guardar(vt, p, v0, '{"titulo": "Otro"}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Sólo quien creó el evento puede cambiarlo.' then raise exception 'ver_todo editó un evento ajeno: %', r; end if;
  r := pg_temp.ag_guardar(pub, p, v0, '{"titulo": "Otro"}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No encontramos este evento.' then raise exception 'un tercero no recibió «no encontramos»: %', r; end if;
  r := pg_temp.ag_guardar(sin, p, v0, '{"visibilidad": "publico"}');
  if r ->> 'error' is distinct from '42501' then raise exception 'pasar a público sin publicar no dio 42501: %', r; end if;
  r := pg_temp.ag_guardar(sin, p, v0, '{"titulo": "Reunión AG"}');
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'guardar lo mismo no dio sin_cambios: %', r; end if;
  r := pg_temp.ag_guardar(sin, p, v0, '{"titulo": "Uno"}');
  v1 := (r ->> 'actualizado_en')::timestamptz;
  if r ->> 'resultado' is distinct from 'guardado' or v1 <= v0 then raise exception 'el creador no guardó o la versión no se movió: %', r; end if;
  r := pg_temp.ag_guardar(sin, p, v0, '{"titulo": "Dos"}');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.ag_guardar(sin, p, null, '{"titulo": "Dos"}');
  if r ->> 'error' is null then raise exception 'guardar sin versión no falló: %', r; end if;

  -- Un público de quien pierde «publicar»: ya no lo edita, ni siquiera el título; tampoco lo vuelve privado.
  v0 := (pg_temp.ag_crear(quita, q, pg_temp.ag_datos('publico')) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.ag_quitar(quita, 'agenda.eventos.publicar');
  r := pg_temp.ag_guardar(quita, q, v0, '{"titulo": "Cambio"}');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.eventos.publicar%' then raise exception 'sin publicar editó el título de un público: %', r; end if;
  r := pg_temp.ag_guardar(quita, q, v0, '{"visibilidad": "privado"}');
  if r ->> 'error' is distinct from '42501' then raise exception 'sin publicar volvió privado un público: %', r; end if;

  -- Seleccionados: cambiar sólo los destinatarios mueve la versión.
  v0 := (pg_temp.ag_crear(pub, s, pg_temp.ag_datos('seleccionados'), array[d1]) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.ag_guardar(pub, s, v0, '{}', array[d2]);
  if r ->> 'resultado' is distinct from 'guardado' or (r ->> 'actualizado_en')::timestamptz <= v0 then raise exception 'cambiar sólo destinatarios no movió la versión: %', r; end if;
  r := pg_temp.ag_guardar(pub, s, v0, '{}', array[d1]);
  if r ->> 'error' is distinct from 'PT409' then raise exception 'los destinatarios con la versión vieja no dieron PT409: %', r; end if;

  -- Bloqueado: no escribe aunque su sesión siga viva.
  v0 := (pg_temp.ag_crear(pub, e, pg_temp.ag_datos()) ->> 'actualizado_en')::timestamptz;
  update public.perfiles set bloqueado = true where id = pub;
  r := pg_temp.ag_guardar(pub, e, v0, '{"titulo": "Bloqueado"}');
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada guardó un evento: %', r; end if;
  r := pg_temp.ag_eliminar(pub, e, v0);
  if r ->> 'error' is distinct from '42501' then raise exception 'una persona bloqueada eliminó un evento: %', r; end if;
end $$;
rollback;

-- @test agenda: vínculos: un lead, un vehículo o una cotización que quien escribe no ve dan 42501 con su hint; uno que ve, se guarda (E8)
begin;
do $$
declare
  yo uuid := pg_temp.ag_persona(array['vehiculos.ver']); nadie uuid := pg_temp.ag_persona(); o uuid; veh uuid; v0 timestamptz; ev uuid := gen_random_uuid(); r jsonb;
begin
  insert into public.origenes (clave, nombre) values ('ag_' || substr(gen_random_uuid()::text, 1, 8), 'AG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'AG vehículo', 'toyota') returning id into veh;
  r := pg_temp.ag_crear(nadie, gen_random_uuid(), pg_temp.ag_datos() || jsonb_build_object('cotizacion_id', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'cotizacion_id' then raise exception 'una cotización que no ve no dio 42501: %', r; end if;
  r := pg_temp.ag_crear(nadie, gen_random_uuid(), pg_temp.ag_datos() || jsonb_build_object('vehiculo_id', veh));
  if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'vehiculo_id' then raise exception 'un vehículo que no ve no dio 42501: %', r; end if;
  r := pg_temp.ag_crear(nadie, gen_random_uuid(), pg_temp.ag_datos() || jsonb_build_object('lead_id', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'lead_id' then raise exception 'un lead que no ve no dio 42501: %', r; end if;
  r := pg_temp.ag_crear(yo, ev, pg_temp.ag_datos() || jsonb_build_object('vehiculo_id', veh));
  if r ->> 'resultado' is distinct from 'creado' or (select vehiculo_id from public.eventos where id = ev) is distinct from veh then raise exception 'un vehículo que ve no se guardó: %', r; end if;
  v0 := (r ->> 'actualizado_en')::timestamptz;
  r := pg_temp.ag_guardar(yo, ev, v0, jsonb_build_object('cotizacion_id', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'hint' is distinct from 'cotizacion_id' then raise exception 'guardar una cotización que no ve no dio 42501: %', r; end if;
  r := pg_temp.ag_guardar(yo, ev, v0, '{"vehiculo_id": null}');
  if r ->> 'resultado' is distinct from 'guardado' or (select vehiculo_id from public.eventos where id = ev) is not null then raise exception 'un nulo explícito no quitó el vehículo: %', r; end if;
end $$;
rollback;

-- @test agenda: eliminar: sólo el creador, publicar si es público, con versión; eliminado no lo lee nadie (E9)
begin;
do $$
declare
  pub uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']); quita uuid := pg_temp.ag_persona(array['agenda.eventos.publicar']); d uuid := pg_temp.ag_persona();
  s uuid := gen_random_uuid(); q uuid := gen_random_uuid(); v0 timestamptz; v1 timestamptz; r jsonb;
begin
  v0 := (pg_temp.ag_crear(pub, s, pg_temp.ag_datos('seleccionados'), array[d]) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.ag_eliminar(d, s, v0);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Sólo quien creó el evento puede cambiarlo.' then raise exception 'el destinatario eliminó el evento: %', r; end if;
  v1 := (pg_temp.ag_guardar(pub, s, v0, '{"titulo": "Nuevo"}') ->> 'actualizado_en')::timestamptz;
  r := pg_temp.ag_eliminar(pub, s, v0);
  if r ->> 'error' is distinct from 'PT409' then raise exception 'eliminar con la versión vieja no dio PT409: %', r; end if;
  r := pg_temp.ag_eliminar(pub, s, v1);
  if r ->> 'resultado' is distinct from 'eliminado' then raise exception 'el creador no eliminó: %', r; end if;
  r := pg_temp.ag_corre(d, format('select to_jsonb((select count(*) from public.eventos where id = %L) + (select count(*) from public.eventos_destinatarios where evento_id = %L))', s, s));
  if r <> '0'::jsonb then raise exception 'el destinatario sigue leyendo un evento eliminado: %', r; end if;
  r := pg_temp.ag_eliminar(pub, s, v1);
  if r ->> 'error' is distinct from '42501' then raise exception 'eliminar dos veces no dio 42501: %', r; end if;

  v0 := (pg_temp.ag_crear(quita, q, pg_temp.ag_datos('publico')) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.ag_quitar(quita, 'agenda.eventos.publicar');
  r := pg_temp.ag_eliminar(quita, q, v0);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%agenda.eventos.publicar%' then raise exception 'sin publicar eliminó un público: %', r; end if;
end $$;
rollback;

-- @test agenda: las RPC de eventos son definer con search_path vacío, de authenticated y no de anon ni PUBLIC; los ayudantes no son de authenticated (E10)
begin;
do $$
declare r record; n int := 0;
begin
  for r in select f.oid, f.proname, f.prosecdef, f.proconfig from pg_proc f join pg_namespace s on s.oid = f.pronamespace
            where s.nspname = 'public' and f.proname in ('evento_crear', 'evento_guardar', 'evento_eliminar') loop
    n := n + 1;
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', r.proname; end if;
    if not has_function_privilege('authenticated', r.oid, 'execute') or has_function_privilege('anon', r.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
  end loop;
  if n <> 3 then raise exception 'se esperaban 3 RPC de eventos (sin sobrecargas) y hay %', n; end if;
  for r in select f.oid, f.proname, f.proconfig from pg_proc f join pg_namespace s on s.oid = f.pronamespace
            where s.nspname = 'public' and (f.proname like '\_agenda\_%' or f.proname = 'agenda_version')
              -- `_agenda_soy_destinatario` la evalúa la policy `eventos: leer` como invocador: es de authenticated (7.06-2, E11 la cubre).
              and f.oid <> 'public._agenda_soy_destinatario(uuid)'::regprocedure loop
    if has_function_privilege('authenticated', r.oid, 'execute') or has_function_privilege('anon', r.oid, 'execute') then
      raise exception 'authenticated o anon pueden ejecutar el ayudante %', r.proname; end if;
    if r.proconfig is distinct from array['search_path=""'] then raise exception 'el ayudante % no tiene el search_path vacío', r.proname; end if;
  end loop;
end $$;
rollback;
