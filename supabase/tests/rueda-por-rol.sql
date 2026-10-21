-- @test rueda por rol: las personas, los roles y la cola
-- La rueda de turnos de la web por rol (`web.cola.participar`, migración 20261019003800). Elegible = `habilitado` y el permiso por algún rol, con la cuenta
-- activa y sin bloqueo, evaluado al repartir. Este archivo corre al final: deja la cola con su propio terreno (nadie más habilitado, sin solicitudes).
--   c1  rol SIN el permiso, habilitada                    → no recibe
--   c2  rol CON el permiso, NO habilitada                 → no recibe
--   c3  dos roles (uno con, uno sin), habilitada          → entra (unión)
--   c4  ningún rol, habilitada                            → no recibe
--   c5  rol con el permiso, habilitada, baja en curso     → no recibe
--   c6  rol con el permiso, habilitada, bloqueada         → no recibe
--   c7  rol con el permiso, habilitada, cuenta sana       → recibe
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000007c1', 'rueda-c1@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000007c2', 'rueda-c2@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000007c3', 'rueda-c3@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000007c4', 'rueda-c4@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000007c5', 'rueda-c5@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000007c6', 'rueda-c6@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000007c7', 'rueda-c7@ejemplo.com', '{"invitado": true}');
update public.leads_campos set requerido = false where requerido;

insert into public.roles (clave, nombre, orden) values ('rueda_sin', 'Rueda sin', 91), ('rueda_con', 'Rueda con', 92);
-- Los dos roles venden igual (leads.*); sólo uno recibe turnos.
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, x.clave, x.alcance::public.alcance_permiso
  from public.roles r cross join (values ('leads.ver', 'propios'), ('leads.crear', 'todos'), ('leads.editar', 'propios')) x (clave, alcance)
 where r.clave in ('rueda_sin', 'rueda_con');
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, 'web.cola.participar', 'todos' from public.roles r where r.clave = 'rueda_con';

insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select u.id, r.id, true
  from (values ('00000000-0000-0000-0000-0000000007c1'::uuid, 'rueda_sin'), ('00000000-0000-0000-0000-0000000007c2', 'rueda_con'),
               ('00000000-0000-0000-0000-0000000007c3', 'rueda_sin'), ('00000000-0000-0000-0000-0000000007c5', 'rueda_con'),
               ('00000000-0000-0000-0000-0000000007c6', 'rueda_con'), ('00000000-0000-0000-0000-0000000007c7', 'rueda_con')) u (id, rol)
  join public.roles r on r.clave = u.rol;
insert into public.usuarios_roles (usuario_id, rol_id) select '00000000-0000-0000-0000-0000000007c3', id from public.roles where clave = 'rueda_con';

-- El terreno de la cola: sólo ellos, todos con WhatsApp; nada abierto de antes. c5 está en baja en curso y c6 bloqueada, las dos habilitadas.
delete from public.solicitudes_contacto_web;
update public.cola_web_asesores set habilitado = false, disponible = true;
update public.perfiles set whatsapp_web = '+591710000' || ascii(right(id::text, 1)), nombre = 'Rueda ' || right(id::text, 2)
 where id::text like '00000000-0000-0000-0000-0000000007c%';
update public.cola_web_asesores set habilitado = true
 where usuario_id in (select id from public.perfiles where id::text like '00000000-0000-0000-0000-0000000007c%' and id::text <> '00000000-0000-0000-0000-0000000007c2');
update public.perfiles set activo = false, baja_en = now() where id = '00000000-0000-0000-0000-0000000007c5';
insert into public.equipo_bajas (usuario_id) values ('00000000-0000-0000-0000-0000000007c5');
update public.perfiles set bloqueado = true, bloqueado_en = now() where id = '00000000-0000-0000-0000-0000000007c6';
update public.ajustes_web set cola_activa = true, ttl_contacto_minutos = 30, dias_pegajoso = 30, max_abiertas_default = 3, max_intentos = 3 where id = 1;

-- Ayudantes: un visitante anónimo pide un asesor; quién tiene su solicitud más nueva; el reloj de una solicitud.
create or replace function pg_temp.pedir(p_token text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  set local role anon;
  r := web.solicitar_asesor(p_token, 'boton_general');
  reset role;
  return r;
exception when others then
  reset role;
  raise;
end $$;
create or replace function pg_temp.quien(p_token text) returns uuid language sql as $$
  select usuario_id from public.solicitudes_contacto_web where token_visitante = p_token order by creado_en desc, id limit 1;
$$;
create or replace function pg_temp.c(n int) returns uuid language sql as $$ select ('00000000-0000-0000-0000-0000000007c' || n)::uuid; $$;

-- @test rueda por rol: puede_estar_en_la_rueda() — el rol, la unión, la cuenta y la baja
create or replace function pg_temp.verifica_rueda() returns void language plpgsql as $$
begin
  if public.puede_estar_en_la_rueda(pg_temp.c(1)) then raise exception 'el rol sin el permiso entró'; end if;
  if not public.puede_estar_en_la_rueda(pg_temp.c(2)) then raise exception 'el rol con el permiso no entró'; end if;
  if not public.puede_estar_en_la_rueda(pg_temp.c(3)) then raise exception 'dos roles, uno con el permiso: es la unión, debía entrar'; end if;
  if public.puede_estar_en_la_rueda(pg_temp.c(4)) then raise exception 'sin ningún rol entró'; end if;
  if public.puede_estar_en_la_rueda(pg_temp.c(5)) then raise exception 'una baja en curso entró'; end if;
  if public.puede_estar_en_la_rueda(pg_temp.c(6)) then raise exception 'una cuenta bloqueada entró'; end if;
  if not public.puede_estar_en_la_rueda(pg_temp.c(7)) then raise exception 'la cuenta sana con el permiso no entró'; end if;
  if public.puede_estar_en_la_rueda(null) or public.puede_estar_en_la_rueda(gen_random_uuid()) then raise exception 'alguien que no existe entró'; end if;
  if not public.puede_estar_en_la_rueda('00000000-0000-0000-0000-000000000001') then raise exception 'el dueño tiene todos los permisos: debía entrar'; end if;
end $$;
select pg_temp.verifica_rueda();
do $$ begin
  if has_function_privilege('anon', 'public.puede_estar_en_la_rueda(uuid)', 'execute') then raise exception 'anon puede preguntar quién está en la rueda'; end if;
  if not has_function_privilege('authenticated', 'public.puede_estar_en_la_rueda(uuid)', 'execute') then raise exception 'la vista estado_cola_web (invocador) la necesita'; end if;
  if not exists (select 1 from public.permisos where clave = 'web.cola.participar' and modulo = 'web' and not por_origen and not con_alcance
                   and aplicado_en like 'puede_estar_en_la_rueda%') then raise exception 'el permiso no está en el catálogo con su punto de enforcement'; end if;
  -- La migración lo concede al dueño y al asesor de la semilla.
  if (select count(*) from public.roles_permisos rp join public.roles r on r.id = rp.rol_id where rp.permiso_clave = 'web.cola.participar' and r.clave in ('dueno', 'asesor')) <> 2 then
    raise exception 'el dueño y el asesor deben tenerlo'; end if;
  if exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id where rp.permiso_clave = 'web.cola.participar' and r.clave in ('logistica', 'repuestos')) then
    raise exception 'logística y repuestos no recibían turnos: no deben haberlo recibido'; end if;
end $$;

-- @test rueda por rol: el reparto sólo llega a quien puede (rol sin el permiso, sin habilitar, sin rol, baja, bloqueo)
do $$
declare r jsonb; i int;
begin
  -- Cinco visitantes seguidos: sólo c7 puede (c3 también, por su segundo rol, pero c2 no está habilitada). Con c3 y c7 el reparto alterna; nunca c1, c2, c4, c5 ni c6.
  for i in 1..4 loop
    r := pg_temp.pedir('rueda-reparto-' || i || '-tokentoken');
    if (r ->> 'es_respaldo')::boolean then raise exception 'hay dos elegibles y dio el respaldo: %', r; end if;
    if pg_temp.quien('rueda-reparto-' || i || '-tokentoken') not in (pg_temp.c(3), pg_temp.c(7)) then
      raise exception 'el turno % cayó en alguien que no puede estar en la rueda: %', i, pg_temp.quien('rueda-reparto-' || i || '-tokentoken'); end if;
  end loop;
  if exists (select 1 from public.solicitudes_contacto_web where usuario_id in (pg_temp.c(1), pg_temp.c(2), pg_temp.c(4), pg_temp.c(5), pg_temp.c(6))) then
    raise exception 'alguien fuera de la rueda recibió un turno'; end if;
  if not exists (select 1 from public.solicitudes_contacto_web where usuario_id = pg_temp.c(3)) or not exists (select 1 from public.solicitudes_contacto_web where usuario_id = pg_temp.c(7)) then
    raise exception 'la unión: c3 (dos roles) debía recibir también'; end if;
end $$;

-- @test rueda por rol: quitar el permiso saca al instante sin tocar `habilitado`, y devolverlo reincorpora; no hay elegible → respaldo
do $$
declare r jsonb; v_rol uuid := (select id from public.roles where clave = 'rueda_con');
begin
  delete from public.solicitudes_contacto_web;
  -- c7 es la única con rueda_con y habilitada que queda si c3 se apaga.
  update public.cola_web_asesores set habilitado = false where usuario_id = pg_temp.c(3);
  r := pg_temp.pedir('rueda-instante-1-tokentoken');
  if pg_temp.quien('rueda-instante-1-tokentoken') <> pg_temp.c(7) then raise exception 'debía ser c7: %', r; end if;
  -- Se le quita el permiso al rol: c7 queda habilitada pero fuera, y la siguiente visitante ya no la recibe.
  delete from public.roles_permisos where rol_id = v_rol and permiso_clave = 'web.cola.participar';
  if not (select habilitado from public.cola_web_asesores where usuario_id = pg_temp.c(7)) then raise exception 'quitar el permiso no debe tocar habilitado'; end if;
  r := pg_temp.pedir('rueda-instante-2-tokentoken');
  if (r ->> 'es_respaldo')::boolean is not true then raise exception 'sin elegibles debía dar el respaldo: %', r; end if;
  if (select estado from public.solicitudes_contacto_web where token_visitante = 'rueda-instante-2-tokentoken') <> 'sin_asignar' then raise exception 'debía quedar sin_asignar'; end if;
  -- Se lo devuelven: vuelve como estaba, sin que nadie la habilite otra vez.
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'web.cola.participar', 'todos');
  r := pg_temp.pedir('rueda-instante-3-tokentoken');
  if pg_temp.quien('rueda-instante-3-tokentoken') <> pg_temp.c(7) then raise exception 'devolver el permiso debía reincorporarla: %', r; end if;
  update public.cola_web_asesores set habilitado = true where usuario_id = pg_temp.c(3);
end $$;

-- @test rueda por rol: el turno abierto de quien pierde el permiso — el reloj no se reinicia, vence a su hora, se reasigna a quien puede, y «Contacté» sigue andando
do $$
declare r jsonb; v_rol uuid := (select id from public.roles where clave = 'rueda_con'); v_s uuid; v_vence timestamptz; v_nueva uuid;
begin
  delete from public.solicitudes_contacto_web;
  -- Sólo c7 está en la rueda para que el turno sea suyo: c3 se apaga.
  update public.cola_web_asesores set habilitado = false where usuario_id = pg_temp.c(3);
  perform pg_temp.pedir('rueda-vuelo-tokentoken-1');
  select id into v_s from public.solicitudes_contacto_web where token_visitante = 'rueda-vuelo-tokentoken-1';
  if (select usuario_id from public.solicitudes_contacto_web where id = v_s) <> pg_temp.c(7) then raise exception 'el turno debía ser de c7'; end if;
  -- CONTROL: con el permiso, volver a pedir reinicia el reloj.
  update public.solicitudes_contacto_web set vence_en = now() + interval '5 minutes' where id = v_s;
  perform pg_temp.pedir('rueda-vuelo-tokentoken-1');
  if (select vence_en from public.solicitudes_contacto_web where id = v_s) < now() + interval '20 minutes' then raise exception 'con el permiso el reloj debía reiniciarse (control)'; end if;
  -- Pierde el permiso con el turno en vuelo.
  delete from public.roles_permisos where rol_id = v_rol and permiso_clave = 'web.cola.participar';
  update public.solicitudes_contacto_web set vence_en = now() + interval '5 minutes' where id = v_s;
  select vence_en into v_vence from public.solicitudes_contacto_web where id = v_s;
  r := pg_temp.pedir('rueda-vuelo-tokentoken-1');
  if (r ->> 'es_respaldo')::boolean then raise exception 'la visitante sigue con su turno abierto: %', r; end if;
  if (select vence_en from public.solicitudes_contacto_web where id = v_s) <> v_vence then raise exception 'sin el permiso, volver a pedir no debe reiniciar el reloj'; end if;
  if (select estado from public.solicitudes_contacto_web where id = v_s) <> 'asignada' then raise exception 'el turno sigue asignado hasta su cierre'; end if;
  -- c3 vuelve a la rueda por su segundo rol sin perder el primero? No: rueda_con ya no tiene el permiso. Se le da a un rol nuevo para que haya a quién reasignar.
  insert into public.roles (clave, nombre, orden) values ('rueda_otro', 'Rueda otro', 93);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) select id, 'web.cola.participar', 'todos' from public.roles where clave = 'rueda_otro';
  insert into public.usuarios_roles (usuario_id, rol_id) select pg_temp.c(3), id from public.roles where clave = 'rueda_otro';
  update public.cola_web_asesores set habilitado = true where usuario_id = pg_temp.c(3);
  -- Vence: la próxima solicitud de cualquiera la reasigna, y no a c7.
  update public.solicitudes_contacto_web set vence_en = now() - interval '1 minute' where id = v_s;
  perform pg_temp.pedir('rueda-vuelo-tokentoken-2');
  if (select estado from public.solicitudes_contacto_web where id = v_s) <> 'vencida' then raise exception 'debía vencer'; end if;
  select usuario_id into v_nueva from public.solicitudes_contacto_web where solicitud_previa_id = v_s;
  if v_nueva is distinct from pg_temp.c(3) then raise exception 'la reasignación debía ir a c3 (la que puede), fue a %', v_nueva; end if;
  -- «Contacté»: quien perdió el permiso todavía puede cerrar el turno que tenía.
  perform set_config('request.jwt.claim.sub', pg_temp.c(7)::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.web_confirmar_contacto(v_s);
  reset role;
  if (select estado from public.solicitudes_contacto_web where id = v_s) <> 'contactada' then raise exception 'no pudo confirmar el contacto de su turno'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test rueda por rol: el pegajoso no vuelve a quien perdió el permiso (y sí a quien lo conserva)
do $$
declare r jsonb; v_rol uuid := (select id from public.roles where clave = 'rueda_con'); v_otro uuid := (select id from public.roles where clave = 'rueda_otro');
begin
  delete from public.solicitudes_contacto_web;
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'web.cola.participar', 'todos');
  -- c3 y c7 con permiso; c7 atendió a esta visitante y la dejó contactada.
  update public.cola_web_asesores set habilitado = false where usuario_id = pg_temp.c(3);
  perform pg_temp.pedir('rueda-pegajoso-tokentoken');
  update public.solicitudes_contacto_web set estado = 'contactada', contactada_en = now() where token_visitante = 'rueda-pegajoso-tokentoken';
  update public.cola_web_asesores set habilitado = true where usuario_id = pg_temp.c(3);
  r := pg_temp.pedir('rueda-pegajoso-tokentoken');
  if pg_temp.quien('rueda-pegajoso-tokentoken') <> pg_temp.c(7) then raise exception 'CONTROL: con el permiso el pegajoso la devuelve a c7'; end if;
  -- c7 pierde el permiso (rueda_con); c3 sigue por rueda_otro.
  delete from public.roles_permisos where rol_id = v_rol and permiso_clave = 'web.cola.participar';
  delete from public.solicitudes_contacto_web where token_visitante = 'rueda-pegajoso-tokentoken' and estado = 'asignada';
  r := pg_temp.pedir('rueda-pegajoso-tokentoken');
  if (select usuario_id from public.solicitudes_contacto_web where token_visitante = 'rueda-pegajoso-tokentoken' and estado = 'asignada') is distinct from pg_temp.c(3) then
    raise exception 'el pegajoso devolvió a quien ya no puede: %', r; end if;
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'web.cola.participar', 'todos');
end $$;

-- @test rueda por rol: la lista de la rueda (estado_cola_web) no muestra a quien no puede, y la persona sin el permiso conserva todo su leads.*
do $$
declare v_lead uuid := gen_random_uuid(); v_op uuid := gen_random_uuid(); r jsonb; n int;
begin
  -- Quién figura: habilitadas con el permiso y la cuenta sana. c1 (rol sin permiso), c4 (sin rol), c5 (baja) y c6 (bloqueada) no.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  if not exists (select 1 from public.estado_cola_web where usuario_id = pg_temp.c(7)) or not exists (select 1 from public.estado_cola_web where usuario_id = pg_temp.c(3)) then
    reset role; raise exception 'quien puede debía figurar en la lista'; end if;
  if exists (select 1 from public.estado_cola_web where usuario_id in (pg_temp.c(1), pg_temp.c(4), pg_temp.c(5), pg_temp.c(6))) then
    reset role; raise exception 'quien no puede figura en la lista de la rueda'; end if;
  reset role;

  -- c1 no está en la rueda y vende igual: crea, ve y edita su lead, y abre una oportunidad.
  perform set_config('request.jwt.claim.sub', pg_temp.c(1)::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', pg_temp.c(1), 'role', 'authenticated')::text, true);
  set local role authenticated;
  if not public.tiene_permiso('leads.crear') or not public.tiene_permiso('leads.ver') or not public.tiene_permiso('leads.editar') then reset role; raise exception 'c1 perdió su leads.*'; end if;
  if public.tiene_permiso('web.cola.participar') then reset role; raise exception 'c1 no debía tener el permiso de la rueda'; end if;
  r := public.crear_lead(v_lead, format('{"nombre": "Lead de c1", "telefono_principal": "70990001", "origen_lead_id": %s}',
         to_json((select id from public.origenes_lead where clave = 'web')))::jsonb, null);
  if not exists (select 1 from public.leads_vista where id = v_lead) then reset role; raise exception 'c1 no ve el lead que creó'; end if;
  perform public.lead_guardar(v_lead, (select actualizado_en from public.leads where id = v_lead), '{"nombre": "Lead de c1 editado"}');
  perform public.oportunidad_crear(v_op, v_lead, '{"titulo": "Venta de c1"}');
  select count(*) into n from public.leads_vista where nombre = 'Lead de c1 editado';
  reset role;
  if n <> 1 then raise exception 'c1 debía ver su lead editado'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test rueda por rol: la mutación — si la función deja entrar a quien no debe, la prueba cae; y todo camino que reparte la nombra
do $$
declare v_def text := pg_get_functiondef('public.puede_estar_en_la_rueda(uuid)'::regprocedure); v_mut text; v_cae int := 0; v_pidio jsonb;
begin
  -- Tres mutaciones: «todos entran», «ignora el permiso» e «ignora la cuenta». Cada una debe hacer caer al verificador.
  foreach v_mut in array array[
    'select true',
    $m$select exists (select 1 from public.perfiles p where p.id = p_usuario and p.activo and not p.bloqueado)$m$,
    $m$select exists (select 1 from public.usuarios_roles ur join public.roles_permisos rp on rp.rol_id = ur.rol_id and rp.permiso_clave = 'web.cola.participar' where ur.usuario_id = p_usuario)$m$] loop
    execute format('create or replace function public.puede_estar_en_la_rueda(p_usuario uuid) returns boolean language sql stable security definer set search_path = '''' as %L', v_mut);
    begin
      perform pg_temp.verifica_rueda();
    exception when others then
      v_cae := v_cae + 1;
    end;
  end loop;
  -- La mutación «todos entran», vista desde el reparto: con ella, c1 (sin el permiso) recibiría el turno en vez de dar el respaldo.
  delete from public.solicitudes_contacto_web;
  update public.cola_web_asesores set habilitado = (usuario_id = pg_temp.c(1)) where usuario_id::text like '00000000-0000-0000-0000-0000000007c%';
  execute format('create or replace function public.puede_estar_en_la_rueda(p_usuario uuid) returns boolean language sql stable security definer set search_path = '''' as %L', 'select true');
  v_pidio := pg_temp.pedir('rueda-mutacion-tokentoken');
  if (v_pidio ->> 'es_respaldo')::boolean then raise exception 'la mutación no cambió el reparto: la prueba de abajo no muerde'; end if;
  execute v_def;
  if v_cae <> 3 then raise exception 'las mutaciones debían hacer caer al verificador 3 veces y cayó %', v_cae; end if;
  -- Restaurada: la función vuelve a decidir y la misma visitante ya no cae en c1.
  perform pg_temp.verifica_rueda();
  delete from public.solicitudes_contacto_web;
  v_pidio := pg_temp.pedir('rueda-mutacion-tokentoken');
  if (v_pidio ->> 'es_respaldo')::boolean is not true then raise exception 'restaurada, c1 (sin el permiso) no debía recibir: %', v_pidio; end if;
end $$;

-- @test rueda por rol: la guarda estructural — quien reparte (inserta una solicitud y lee la cola) llama a puede_estar_en_la_rueda, y los tres caminos de solicitar_asesor la nombran
do $$
declare r record; v_src text := (select prosrc from pg_proc where oid = 'web.solicitar_asesor(text,text,text,uuid,text,jsonb)'::regprocedure);
begin
  for r in
    select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'web') and p.prokind = 'f'
       and p.prosrc ~* 'cola_web_asesores' and p.prosrc ~* 'insert\s+into\s+public\.solicitudes_contacto_web' and p.prosrc !~ 'puede_estar_en_la_rueda'
  loop
    raise exception '%.% reparte turnos sin preguntar por puede_estar_en_la_rueda()', r.nspname, r.proname;
  end loop;
  -- Pasos 3 (la abierta), 4 (el pegajoso) y 5 (la rueda).
  if (length(v_src) - length(replace(v_src, 'puede_estar_en_la_rueda', ''))) / length('puede_estar_en_la_rueda') < 3 then
    raise exception 'solicitar_asesor debía nombrarla en la abierta, el pegajoso y la rueda'; end if;
  if (select pg_get_viewdef('public.estado_cola_web'::regclass)) !~ 'puede_estar_en_la_rueda' then raise exception 'estado_cola_web no filtra por la regla'; end if;
  -- El contacto directo por handle no es la rueda: lo gobierna publico_web (decisión de 2026-10-21), así que su camino no la nombra.
  -- (Si algún día lo hace, esa decisión cambió y esta línea debe cambiar con ella.)
  if position('es_directa' in v_src) = 0 then raise exception 'solicitar_asesor perdió el camino directo'; end if;
end $$;
