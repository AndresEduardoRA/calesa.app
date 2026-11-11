-- Revalidar la web pública (paso 8.06): la cola `interno.web_revalidar_pendiente`, los triggers `web_revalidar`, el job
-- `web_revalidar_correr()`, la dirección que valida `integracion_guardar` y el conteo de los vehículos que cambian al encender.
-- No depende de otro archivo (`SOLO=areas/web/revalidar.sql`). Cada bloque que escribe abre su transacción, empieza con la cola y los
-- pedidos vacíos, y la revierte. pg_net es el doble de `net.pedidos` (`scripts/probar-schema.mjs`): nunca sale un POST real.
--
-- Qué asegura:
--   R1. Dos cambios de FAQs en una transacción dejan una fila `faqs` propia, aunque otra transacción ya anotó `faqs`; las repetidas se compactan sin enviar.
--   R2. Cada tabla anota su etiqueta; `cola_web_asesores` sólo por `orden`, no por `disponible`.
--   R3. Publicar un vehículo y cambiarle la fase anota `vehiculos`.
--   R4. Apagada, sin dirección, con `http://` de loopback o sin secreto: no hay pedido y lo pendiente sigue.
--   R5. Con todo: un pedido con el cuerpo exacto y el secreto sólo en la cabecera; la cola queda vacía y la 2.ª corrida no pide.
--   R6. El job está programado sin dirección ni secreto en su comando.
--   R7. Ningún rol de la app corre el job, el trigger, ni ve la cola; R7b: ningún índice único sobre `etiqueta`.
--   R8. `integracion_guardar` valida `revalidar_url` (hint), guarda sólo esa clave y deja apibara igual; permiso y versión.
--   R9. `web_publica_vehiculos_que_cambian()` cuenta los que cumplen las otras cuatro condiciones, acotado a 51; permiso.

create or replace function pg_temp.wr_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wr_' || substr(v_id::text, 1, 8), 'WR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.wr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

-- Las etiquetas pendientes, sin repetir y ordenadas.
create or replace function pg_temp.wr_pendientes() returns text[] language sql as $f$
  select coalesce(array_agg(distinct etiqueta order by etiqueta), '{}') from interno.web_revalidar_pendiente
$f$;

-- La llamada a integracion_guardar('web_publica', …) con la versión vigente, como texto para wr_corre.
create or replace function pg_temp.wr_guardar(p_config jsonb) returns text language sql as $f$
  select format('select to_jsonb(public.integracion_guardar(%L, %L::timestamptz, null, %L::jsonb))',
    'web_publica', (select actualizado_en from public.integraciones where clave = 'web_publica'), p_config)
$f$;

-- @test revalidar: dos cambios de FAQs dejan una fila; las repetidas de otras transacciones se compactan sin enviar (R1)
begin;
delete from interno.web_revalidar_pendiente;
delete from net.pedidos;
update public.integraciones set activa = false where clave = 'web_publica';
delete from interno.web_revalidar_pendiente;
do $$
declare v_pedido timestamptz;
begin
  -- Una fila de faqs que dejó otra transacción, ya confirmada: la propia no se apoya en ella (el job podría consumirla antes de su commit).
  insert into interno.web_revalidar_pendiente (etiqueta, transaccion) values ('faqs', '1'::xid8);
  insert into public.web_faqs (pregunta, respuesta) values ('¿R1?', 'Sí.');
  select pedido_en into v_pedido from interno.web_revalidar_pendiente where etiqueta = 'faqs' and transaccion = pg_current_xact_id();
  update public.web_faqs set respuesta = 'Sí, de nuevo.' where pregunta = '¿R1?';
  if (select count(*) from interno.web_revalidar_pendiente where etiqueta = 'faqs' and transaccion = pg_current_xact_id()) <> 1 then
    raise exception 'dos cambios de FAQs en una transacción dejaron % filas propias (debía una, aunque otra transacción ya anotó faqs)',
      (select count(*) from interno.web_revalidar_pendiente where etiqueta = 'faqs' and transaccion = pg_current_xact_id());
  end if;
  if (select count(*) from interno.web_revalidar_pendiente where etiqueta = 'faqs') <> 2 then
    raise exception 'debían quedar la fila ajena y la propia de faqs, y quedaron %', (select count(*) from interno.web_revalidar_pendiente where etiqueta = 'faqs');
  end if;
  if (select pedido_en from interno.web_revalidar_pendiente where etiqueta = 'faqs' and transaccion = pg_current_xact_id()) is distinct from v_pedido then
    raise exception 'el segundo cambio movió pedido_en';
  end if;
  -- Otra transacción más que anotó faqs (simulada).
  insert into interno.web_revalidar_pendiente (etiqueta, transaccion) values ('faqs', '2'::xid8);
  if public.web_revalidar_correr() is not null then
    raise exception 'apagada, el job devolvió un pedido';
  end if;
  if (select count(*) from interno.web_revalidar_pendiente where etiqueta = 'faqs') <> 1 then
    raise exception 'la compactación dejó % filas faqs (debía dejar una)', (select count(*) from interno.web_revalidar_pendiente where etiqueta = 'faqs');
  end if;
  if pg_temp.wr_pendientes() <> array['faqs'] then
    raise exception 'la compactación cambió lo pendiente: %', pg_temp.wr_pendientes();
  end if;
  if exists (select 1 from net.pedidos) then
    raise exception 'apagada, el job mandó un pedido';
  end if;
end $$;
rollback;

-- @test revalidar: cada tabla anota su etiqueta, y la cola de asesores sólo por el orden (R2)
begin;
delete from interno.web_revalidar_pendiente;
do $$
declare
  t record;
  v_tablas jsonb := '[
    ["web_guias", "id", "guias"], ["web_categorias_guias", "id", "guias"], ["web_faqs", "id", "faqs"],
    ["web_testimonios", "id", "testimonios"], ["ajustes_web", "id", "ajustes"], ["ajustes_empresa", "id", "ajustes"],
    ["perfiles", "id", "asesores"], ["cola_web_asesores", "orden", "asesores"], ["vehiculos", "id", "vehiculos"],
    ["vehiculos_imagenes", "id", "vehiculos"], ["fases", "id", "vehiculos"], ["origenes", "id", "vehiculos"],
    ["origenes_campos", "id", "vehiculos"], ["categorias", "id", "vehiculos"], ["integraciones", "clave", "vehiculos"]
  ]';
begin
  for t in select e ->> 0 as tabla, e ->> 1 as columna, e ->> 2 as etiqueta from jsonb_array_elements(v_tablas) e loop
    delete from interno.web_revalidar_pendiente;
    execute format('update public.%I set %I = %I where false', t.tabla, t.columna, t.columna);
    if pg_temp.wr_pendientes() <> array[t.etiqueta] then
      raise exception 'un update de % anotó % (debía anotar %)', t.tabla, pg_temp.wr_pendientes(), t.etiqueta;
    end if;
  end loop;
  delete from interno.web_revalidar_pendiente;
  update public.cola_web_asesores set disponible = disponible where false;
  update public.cola_web_asesores set ultima_asignacion_en = ultima_asignacion_en, asignadas_total = asignadas_total where false;
  if pg_temp.wr_pendientes() <> '{}' then
    raise exception 'cambiar la disponibilidad de un asesor anotó %', pg_temp.wr_pendientes();
  end if;
  if (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where g.tgname = 'web_revalidar' and n.nspname = 'public') <> jsonb_array_length(v_tablas) then
    raise exception 'hay triggers web_revalidar que esta prueba no mira';
  end if;
end $$;
rollback;

-- @test revalidar: publicar un vehículo y cambiarle la fase anota vehiculos (R3)
begin;
do $$
declare v_fase uuid; v_otra uuid; v_origen uuid; v_vehiculo uuid; v_autor uuid := pg_temp.wr_persona(array[]::text[]);
begin
  select f.id, fl.origen_id into v_fase, v_origen from public.fases f join public.flujos fl on fl.id = f.flujo_id
  where f.publica_web and f.activa and fl.origen_id is not null order by f.orden limit 1;
  select f.id into v_otra from public.fases f join public.flujos fl on fl.id = f.flujo_id
  where fl.origen_id = v_origen and f.id <> v_fase order by f.orden limit 1;
  if v_fase is null or v_otra is null then raise exception 'falta un origen con dos fases y una pública en la semilla'; end if;
  insert into public.vehiculos (origen_id, titulo, creado_por) values (v_origen, 'R3', v_autor) returning id into v_vehiculo;
  update public.vehiculos set fase_id = v_fase, publicado_web = true where id = v_vehiculo;
  delete from interno.web_revalidar_pendiente;
  update public.vehiculos set fase_id = v_otra where id = v_vehiculo;
  if pg_temp.wr_pendientes() <> array['vehiculos'] then
    raise exception 'cambiar la fase de un vehículo publicado anotó %', pg_temp.wr_pendientes();
  end if;
end $$;
rollback;

-- @test revalidar: apagada, sin dirección, con http de loopback o sin secreto, no pide nada y no pierde lo pendiente (R4)
begin;
delete from vault.secrets where name = 'integracion:web_publica';
update public.integraciones set activa = false, config = '{"revalidar_url": "https://sitio.ejemplo/api/revalidar"}' where clave = 'web_publica';
delete from interno.web_revalidar_pendiente;
delete from net.pedidos;
insert into public.web_faqs (pregunta, respuesta) values ('¿R4?', 'Sí.');
update public.web_testimonios set id = id where false;
do $$
declare
  v_caso record;
begin
  perform vault.create_secret('secreto-r4-12345', 'integracion:web_publica', 'prueba');
  for v_caso in select * from (values
    ('apagada', false, '{"revalidar_url": "https://sitio.ejemplo/api/revalidar"}'::jsonb, true),
    ('sin dirección', true, '{"revalidar_url": null}'::jsonb, true),
    ('dirección vacía', true, '{"revalidar_url": "  "}'::jsonb, true),
    ('http de loopback', true, '{"revalidar_url": "http://127.0.0.1:9/x"}'::jsonb, true),
    ('sin secreto', true, '{"revalidar_url": "https://sitio.ejemplo/api/revalidar"}'::jsonb, false)
  ) as c (nombre, activa, config, con_secreto) loop
    update public.integraciones set activa = v_caso.activa, config = v_caso.config where clave = 'web_publica';
    if not v_caso.con_secreto then
      delete from vault.secrets where name = 'integracion:web_publica';
    end if;
    if public.web_revalidar_correr() is not null then
      raise exception '%: el job devolvió un pedido', v_caso.nombre;
    end if;
    if exists (select 1 from net.pedidos) then
      raise exception '%: el job mandó un pedido', v_caso.nombre;
    end if;
    if pg_temp.wr_pendientes() <> array['faqs', 'testimonios', 'vehiculos'] then
      raise exception '%: lo pendiente cambió a %', v_caso.nombre, pg_temp.wr_pendientes();
    end if;
  end loop;
end $$;
rollback;

-- @test revalidar: con todo, un pedido con el cuerpo exacto y el secreto sólo en la cabecera; vacía la cola (R5)
begin;
delete from vault.secrets where name = 'integracion:web_publica';
select vault.create_secret('secreto-r5-abcdefgh', 'integracion:web_publica', 'prueba');
update public.integraciones set activa = true, config = '{"revalidar_url": "https://sitio.ejemplo/api/revalidar"}' where clave = 'web_publica';
delete from interno.web_revalidar_pendiente;
delete from net.pedidos;
insert into public.web_faqs (pregunta, respuesta) values ('¿R5?', 'Sí.');
update public.vehiculos set id = id where false;
do $$
declare v_id bigint; p record;
begin
  v_id := public.web_revalidar_correr();
  if v_id is null then raise exception 'con todo, el job no devolvió un pedido'; end if;
  if (select count(*) from net.pedidos) <> 1 then raise exception 'el job mandó % pedidos (debía uno)', (select count(*) from net.pedidos); end if;
  select * into p from net.pedidos where id = v_id;
  if p.url is distinct from 'https://sitio.ejemplo/api/revalidar' then raise exception 'el pedido fue a %', p.url; end if;
  if p.body is distinct from '{"etiquetas": ["faqs", "vehiculos"]}'::jsonb then raise exception 'el cuerpo fue %', p.body; end if;
  if p.headers ->> 'Authorization' is distinct from 'Bearer secreto-r5-abcdefgh' then raise exception 'la cabecera no lleva el secreto'; end if;
  if p.headers ->> 'Content-Type' is distinct from 'application/json' then raise exception 'falta Content-Type: %', p.headers; end if;
  if p.body::text like '%secreto-r5%' or p.url like '%secreto-r5%' then raise exception 'el secreto viajó fuera de la cabecera'; end if;
  if exists (select 1 from interno.web_revalidar_pendiente) then raise exception 'la cola no quedó vacía tras enviar'; end if;
  if public.web_revalidar_correr() is not null or (select count(*) from net.pedidos) <> 1 then
    raise exception 'la segunda corrida, sin pendientes, pidió otra vez';
  end if;
end $$;
rollback;

-- @test revalidar: el job está programado sin dirección ni secreto en su comando (R6)
begin;
delete from vault.secrets where name = 'integracion:web_publica';
select vault.create_secret('secreto-r6-abcdefgh', 'integracion:web_publica', 'prueba');
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'web-revalidar' and schedule = '* * * * *' and command = 'select public.web_revalidar_correr()') then
    raise exception 'falta el job web-revalidar cada minuto con su comando exacto';
  end if;
  -- Otro archivo (humo.sql) puede reprogramar storage-gc con una dirección a mano: aquí sólo se mira el secreto en todos y la dirección en el propio.
  if exists (select 1 from cron.job where command like '%secreto-r6%')
     or exists (select 1 from cron.job where jobname = 'web-revalidar' and command ~* 'revalidar_url|https?://|integracion_secreto') then
    raise exception 'un job lleva el secreto, o web-revalidar una dirección, en su comando';
  end if;
end $$;
rollback;

-- @test revalidar: ningún rol de la app corre el job ni ve la cola; ningún índice único sobre la etiqueta (R7, R7b)
begin;
do $$
declare v_gestor uuid := pg_temp.wr_persona(array['empresa.ajustes.gestionar']); r jsonb;
begin
  if has_function_privilege('authenticated', 'public.web_revalidar_correr()', 'execute')
     or has_function_privilege('anon', 'public.web_revalidar_correr()', 'execute')
     or has_function_privilege('authenticated', 'public._web_revalidar_anotar()', 'execute')
     or has_function_privilege('anon', 'public._web_revalidar_anotar()', 'execute') then
    raise exception 'un rol de la app puede correr el job o el trigger de revalidar';
  end if;
  if not has_function_privilege('service_role', 'public.web_revalidar_correr()', 'execute') then
    raise exception 'service_role no puede correr el job';
  end if;
  if has_schema_privilege('authenticated', 'interno', 'usage') or has_schema_privilege('anon', 'interno', 'usage')
     or has_table_privilege('authenticated', 'interno.web_revalidar_pendiente', 'select')
     or has_table_privilege('authenticated', 'interno.web_revalidar_pendiente', 'insert')
     or has_table_privilege('anon', 'interno.web_revalidar_pendiente', 'select') then
    raise exception 'un rol de la app ve o escribe la cola de revalidación';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'interno.web_revalidar_pendiente'::regclass) then
    raise exception 'la cola de revalidación no tiene RLS';
  end if;
  r := pg_temp.wr_corre(v_gestor, 'select to_jsonb(public.web_revalidar_correr())');
  if r ->> 'error' is distinct from '42501' then
    raise exception 'quien gestiona la empresa corrió el job: %', r;
  end if;
  -- Un índice único sobre etiqueta haría esperar a cada escritor el commit del anterior (on conflict especulativo).
  if exists (
    select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
    where i.indrelid = 'interno.web_revalidar_pendiente'::regclass and i.indisunique and a.attname = 'etiqueta'
  ) then
    raise exception 'la cola tiene un índice único sobre etiqueta';
  end if;
end $$;
rollback;

-- @test revalidar: integracion_guardar valida la dirección, guarda sólo esa clave y deja apibara igual (R8)
begin;
do $$
declare
  v_gestor uuid := pg_temp.wr_persona(array['empresa.ajustes.gestionar']);
  v_nadie uuid := pg_temp.wr_persona(array[]::text[]);
  v_mala text;
  r jsonb;
begin
  foreach v_mala in array array['http://ejemplo.com/r', 'https://u:p@x.ejemplo/r', 'ftp://x.ejemplo', 'https://x.ejemplo/a b', 'javascript:alert(1)'] loop
    r := pg_temp.wr_corre(v_gestor, pg_temp.wr_guardar(jsonb_build_object('revalidar_url', v_mala)));
    if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'revalidar_url'
       or r ->> 'mensaje' is distinct from 'La dirección de revalidación tiene que empezar con https://.' then
      raise exception 'aceptó o rechazó mal la dirección %: %', v_mala, r;
    end if;
  end loop;
  r := pg_temp.wr_corre(v_gestor, pg_temp.wr_guardar(jsonb_build_object('revalidar_url', 'https://x.ejemplo/' || repeat('a', 2000))));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'revalidar_url' or r ->> 'mensaje' is distinct from 'La dirección es demasiado larga.' then
    raise exception 'aceptó una dirección de más de 2.000 caracteres: %', r;
  end if;
  r := pg_temp.wr_corre(v_gestor, pg_temp.wr_guardar('{"revalidar_url": "https://sitio.ejemplo/r", "otra": 1}'));
  if r ? 'error' then raise exception 'rechazó una dirección https: %', r; end if;
  if (select config from public.integraciones where clave = 'web_publica') is distinct from '{"revalidar_url": "https://sitio.ejemplo/r"}'::jsonb then
    raise exception 'guardó la config %', (select config from public.integraciones where clave = 'web_publica');
  end if;
  r := pg_temp.wr_corre(v_gestor, pg_temp.wr_guardar('{"revalidar_url": "http://127.0.0.1:4567/r"}'));
  if r ? 'error' then raise exception 'rechazó la dirección de loopback para Probar: %', r; end if;
  r := pg_temp.wr_corre(v_gestor, pg_temp.wr_guardar('{"revalidar_url": "http://localhost/r"}'));
  if r ? 'error' then raise exception 'rechazó localhost para Probar: %', r; end if;
  r := pg_temp.wr_corre(v_gestor, pg_temp.wr_guardar('{"revalidar_url": ""}'));
  if r ? 'error' or (select config from public.integraciones where clave = 'web_publica') is distinct from '{"revalidar_url": null}'::jsonb then
    raise exception 'una dirección vacía no guardó null: % / %', r, (select config from public.integraciones where clave = 'web_publica');
  end if;
  -- Encender sin dirección ni secreto se puede (la cola espera).
  r := pg_temp.wr_corre(v_gestor, format('select to_jsonb(public.integracion_guardar(%L, %L::timestamptz, true, null))',
    'web_publica', (select actualizado_en from public.integraciones where clave = 'web_publica')));
  if r ? 'error' or not (select activa from public.integraciones where clave = 'web_publica') then
    raise exception 'no dejó encender la web pública sin dirección: %', r;
  end if;
  -- apibara sigue igual.
  r := pg_temp.wr_corre(v_gestor, format('select to_jsonb(public.integracion_guardar(%L, %L::timestamptz, null, %L::jsonb))',
    'apibara', (select actualizado_en from public.integraciones where clave = 'apibara'), '{"endpoint": "https://atacante.example", "plataformas": ["copart"]}'));
  if r ->> 'mensaje' is distinct from 'La dirección de apibara tiene que empezar con https:// y ser de apibara.tech.' then
    raise exception 'apibara aceptó una dirección ajena: %', r;
  end if;
  r := pg_temp.wr_corre(v_nadie, pg_temp.wr_guardar('{"revalidar_url": "https://sitio.ejemplo/r"}'));
  if r ->> 'error' is distinct from '42501' then raise exception 'guardó sin empresa.ajustes.gestionar: %', r; end if;
  r := pg_temp.wr_corre(v_gestor, format('select to_jsonb(public.integracion_guardar(%L, %L::timestamptz, null, %L::jsonb))',
    'web_publica', (select actualizado_en from public.integraciones where clave = 'web_publica') - interval '1 second', '{"revalidar_url": "https://sitio.ejemplo/r"}'));
  if r ->> 'error' is distinct from 'PT409' then raise exception 'guardó con una versión vieja: %', r; end if;
  if has_function_privilege('anon', 'public.integracion_guardar(text, timestamptz, boolean, jsonb)', 'execute') then
    raise exception 'anon puede guardar una integración';
  end if;
end $$;
rollback;

-- @test revalidar: el conteo de los vehículos que cambian al encender, acotado a 51 y con permiso (R9)
begin;
do $$
declare
  v_gestor uuid := pg_temp.wr_persona(array['empresa.ajustes.gestionar']);
  v_nadie uuid := pg_temp.wr_persona(array[]::text[]);
  v_fase uuid; v_otra uuid; v_origen uuid; v_antes int; r jsonb;
begin
  select f.id, fl.origen_id into v_fase, v_origen from public.fases f join public.flujos fl on fl.id = f.flujo_id
  where f.publica_web and f.activa and fl.origen_id is not null order by f.orden limit 1;
  select f.id into v_otra from public.fases f join public.flujos fl on fl.id = f.flujo_id
  where fl.origen_id = v_origen and not f.publica_web order by f.orden limit 1;
  if v_fase is null or v_otra is null then raise exception 'falta un origen con una fase pública y otra no en la semilla'; end if;
  update public.ajustes_web set origenes_visibles = array[v_origen] where id = 1;
  update public.integraciones set activa = false where clave = 'web_publica';
  v_antes := (pg_temp.wr_corre(v_gestor, 'select to_jsonb(public.web_publica_vehiculos_que_cambian())'))::int;
  insert into public.vehiculos (origen_id, titulo, creado_por) values (v_origen, 'R9 público', v_gestor), (v_origen, 'R9 en fase privada', v_gestor);
  update public.vehiculos set fase_id = v_fase, publicado_web = true where titulo = 'R9 público';
  update public.vehiculos set fase_id = v_otra, publicado_web = true where titulo = 'R9 en fase privada';
  r := pg_temp.wr_corre(v_gestor, 'select to_jsonb(public.web_publica_vehiculos_que_cambian())');
  if r::int <> least(v_antes + 1, 51) then
    raise exception 'contó % (antes %): el público suma uno y el de fase privada ninguno', r, v_antes;
  end if;
  insert into public.vehiculos (origen_id, titulo, creado_por) select v_origen, 'R9 tope ' || g, v_gestor from generate_series(1, 60) g;
  update public.vehiculos set fase_id = v_fase, publicado_web = true where titulo like 'R9 tope %';
  r := pg_temp.wr_corre(v_gestor, 'select to_jsonb(public.web_publica_vehiculos_que_cambian())');
  if r::int <> 51 then raise exception 'con más de 50, el conteo dio % (debía 51)', r; end if;
  r := pg_temp.wr_corre(v_nadie, 'select to_jsonb(public.web_publica_vehiculos_que_cambian())');
  if r ->> 'error' is distinct from '42501' then raise exception 'contó sin empresa.ajustes.gestionar: %', r; end if;
  if has_function_privilege('anon', 'public.web_publica_vehiculos_que_cambian()', 'execute') then
    raise exception 'anon puede contar los vehículos que cambian';
  end if;
end $$;
rollback;
