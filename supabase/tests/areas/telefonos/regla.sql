-- Teléfonos extra: la regla «los teléfonos extra cuentan como el principal» (`ajustes_leads.telefonos_extra_como_principal`). Apagada (el defecto) un
-- extra puede repetirse y sólo avisa; encendida es único entre leads vivos y se valida en la base: alta, adoptar del limbo, cambiar el principal,
-- verificar y agregar. Lo que ya se repite antes de encender queda y se puede rotular y quitar. No depende de otro archivo
-- (`SOLO=areas/telefonos/regla.sql`); cada bloque arma su terreno y lo revierte.

-- Ayudantes (prefijo tel_): personas con rol propio, correr un SQL como una persona y armar leads. La primera cuenta nace dueña: se
-- crea primero la dueña (tel_duena) y las demás se arman con roles de a una concesión.
create or replace function pg_temp.tel_persona(p_conc text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'TEL ' || substr(v_id::text, 1, 6), invitacion_aceptada_en = now() where id = v_id;
  delete from public.usuarios_roles where usuario_id = v_id;
  insert into public.roles (clave, nombre) values ('tel_' || substr(v_id::text, 1, 8), 'TEL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_conc loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, split_part(c, ':', 1), split_part(c, ':', 2)::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- La dueña (primera cuenta) y un asesor con ver, crear, editar y editar teléfonos extra de su cartera.
create or replace function pg_temp.tel_duena() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;
create or replace function pg_temp.tel_asesor() returns uuid language sql as $f$
  select pg_temp.tel_persona(array['leads.ver:propios', 'leads.crear:todos', 'leads.editar:propios', 'leads.telefonos_extra.editar:propios'])
$f$;

-- Un SQL como esa persona: su jsonb, o {error, mensaje, hint} si falla.
create or replace function pg_temp.tel_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Un lead de esa persona con ese principal (devuelve su id).
create or replace function pg_temp.tel_lead(p_quien uuid, p_tel text) returns uuid language plpgsql as $f$
declare v uuid := gen_random_uuid(); r jsonb;
begin
  r := pg_temp.tel_corre(p_quien, format('select public.crear_lead(%L, %L::jsonb)', v, jsonb_build_object(
    'nombre', 'TEL ' || p_tel, 'telefono_principal', p_tel, 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' is distinct from 'creado' then raise exception 'tel_lead(%): %', p_tel, r; end if;
  return v;
end $f$;

-- Agrega un extra como esa persona y devuelve la respuesta.
create or replace function pg_temp.tel_extra(p_quien uuid, p_lead uuid, p_tel text) returns jsonb language sql as $f$
  select pg_temp.tel_corre(p_quien, format('select public.lead_telefono_guardar(%L, gen_random_uuid(), %L, %L, null)', p_lead, '', p_tel))
$f$;

create or replace function pg_temp.tel_regla(p_maximo int, p_como boolean) returns void language sql as $f$
  update public.ajustes_leads set telefonos_extra_maximo = p_maximo, telefonos_extra_como_principal = p_como where id = 1
$f$;

create or replace function pg_temp.tel_n_extras(p_lead uuid) returns bigint language sql as $f$
  select count(*) from public.leads_telefonos where lead_id = p_lead
$f$;

-- @test telefonos: regla apagada, un extra se repite entre leads y sólo avisa (como hoy)
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); b uuid := pg_temp.tel_asesor(); la uuid; lb uuid; lc uuid; r jsonb; v jsonb;
begin
  la := pg_temp.tel_lead(a, '71110001');
  lb := pg_temp.tel_lead(b, '71110002');
  if (select telefonos_extra_como_principal from public.ajustes_leads where id = 1) is not false then raise exception 'no nace apagada'; end if;
  r := pg_temp.tel_extra(a, la, '71110002');
  if r ->> 'resultado' <> 'agregado' then raise exception 'sin la regla debía agregar el principal de otro lead: %', r; end if;
  r := pg_temp.tel_extra(b, lb, '71110003');
  r := pg_temp.tel_extra(a, la, '71110003');
  if r ->> 'resultado' <> 'agregado' or pg_temp.tel_n_extras(la) <> 2 or pg_temp.tel_n_extras(lb) <> 1 then raise exception 'el mismo extra en dos leads: %', r; end if;
  -- Avisa sin bloquear: el principal de otro lead (como principal) y el extra de otro (como extra).
  v := pg_temp.tel_corre(b, format('select public.verificar_telefono_extra(%L, %L, %L)', lb, '', '71110001'));
  -- B no ve el lead de B (propios): el aviso nombra a la persona que lo tiene.
  if v ->> 'estado' <> 'libre' or v #>> '{alterno,estado}' <> 'de_otro' or v #>> '{alterno,como}' <> 'principal' or v #>> '{alterno,dueno}' is null then
    raise exception 'verificar un principal ajeno sin la regla: %', v;
  end if;
  lc := pg_temp.tel_lead(b, '71110004');
  v := pg_temp.tel_corre(b, format('select public.verificar_telefono_extra(%L, %L, %L)', lc, '', '71110003'));
  if v ->> 'estado' <> 'libre' or v #>> '{alterno,como}' <> 'extra' or v #>> '{alterno,estado}' <> 'existe' then raise exception 'verificar un extra ajeno sin la regla: %', v; end if;
  v := pg_temp.tel_corre(a, format('select public.verificar_telefono_extra(%L, %L, %L)', la, '', '71110099'));
  if v <> '{"estado": "libre"}'::jsonb then raise exception 'un número libre: %', v; end if;
  v := pg_temp.tel_corre(a, format('select public.verificar_telefono_extra(%L, %L, %L)', la, '', '71110001'));
  if v ->> 'estado' <> 'mismo' then raise exception 'el principal del propio lead: %', v; end if;
  v := pg_temp.tel_corre(a, format('select public.verificar_telefono_extra(%L, %L, %L)', la, '', '71110003'));
  if v ->> 'estado' <> 'libre' or (v ->> 'es_extra')::boolean is not true then raise exception 'un extra del propio lead: %', v; end if;
  -- El alta con un número que es extra de otro avisa y crea (alterno), y alta y cambio del principal no se enteran de la regla.
  r := pg_temp.tel_corre(b, format('select public.crear_lead(%L, %L::jsonb)', gen_random_uuid(), jsonb_build_object(
    'nombre', 'Con alterno', 'telefono_principal', '71110003', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' <> 'creado' then raise exception 'sin la regla, el alta con un extra ajeno debía crear: %', r; end if;
end $$;
rollback;

-- @test telefonos: regla encendida, agregar el principal o el extra de otro lead da existe/de_otro sin escribir
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); b uuid := pg_temp.tel_asesor(); la uuid; lb uuid; r jsonb; v jsonb;
begin
  la := pg_temp.tel_lead(a, '71120001');
  lb := pg_temp.tel_lead(b, '71120002');
  perform pg_temp.tel_extra(b, lb, '71120003');
  perform pg_temp.tel_regla(6, true);
  -- A ve a B (propios: no): de_otro con el nombre de la persona, y no escribe.
  r := pg_temp.tel_extra(a, la, '71120002');
  if r ->> 'resultado' <> 'de_otro' or r #>> '{verificacion,dueno}' is null or r #>> '{verificacion,como}' is not null then raise exception 'principal ajeno con la regla: %', r; end if;
  r := pg_temp.tel_extra(a, la, '71120003');
  if r ->> 'resultado' <> 'de_otro' or r #>> '{verificacion,como}' <> 'extra' then raise exception 'extra ajeno con la regla: %', r; end if;
  if pg_temp.tel_n_extras(la) <> 0 then raise exception 'escribió pese al choque'; end if;
  -- Verificar al tipear dice lo mismo que guardar.
  v := pg_temp.tel_corre(a, format('select public.verificar_telefono_extra(%L, %L, %L)', la, '', '71120003'));
  if v ->> 'estado' <> 'de_otro' or v ->> 'como' <> 'extra' then raise exception 'verificar un extra ajeno con la regla: %', v; end if;
  v := pg_temp.tel_corre(a, format('select public.verificar_telefono_extra(%L, %L, %L)', la, '', '71120002'));
  if v ->> 'estado' <> 'de_otro' then raise exception 'verificar el principal ajeno con la regla: %', v; end if;
  -- Uno libre y uno propio entran.
  r := pg_temp.tel_extra(a, la, '71120077');
  if r ->> 'resultado' <> 'agregado' then raise exception 'un libre debía entrar: %', r; end if;
end $$;
rollback;

-- @test telefonos: con la regla, el alta, cambiar el principal y verificar encuentran al lead que tiene el número como extra
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); v_ve uuid := pg_temp.tel_persona(array['leads.ver:todos', 'leads.crear:todos', 'leads.editar:propios']);
        la uuid; lb uuid; r jsonb; v jsonb;
begin
  la := pg_temp.tel_lead(a, '71130001');
  lb := pg_temp.tel_lead(a, '71130002');
  perform pg_temp.tel_extra(a, lb, '71130003');
  perform pg_temp.tel_regla(6, true);
  -- Quien ve todos recibe «existe» con el lead (y «como: extra»).
  v := pg_temp.tel_corre(v_ve, format('select public.verificar_telefono(%L, %L)', '', '71130003'));
  if v ->> 'estado' <> 'existe' or v ->> 'lead_id' <> lb::text or v ->> 'como' <> 'extra' then raise exception 'verificar_telefono con la regla: %', v; end if;
  -- El alta con ese número: existe, y no crea.
  r := pg_temp.tel_corre(v_ve, format('select public.crear_lead(%L, %L::jsonb)', gen_random_uuid(), jsonb_build_object(
    'nombre', 'Repetido', 'telefono_principal', '71130003', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' <> 'existe' or r #>> '{verificacion,lead_id}' <> lb::text then raise exception 'el alta con un extra: %', r; end if;
  if exists (select 1 from public.leads where nombre = 'Repetido') then raise exception 'el alta creó el lead'; end if;
  -- Cambiar el principal de A a un extra ajeno: existe; a uno de sí misma, el cambio entra.
  r := pg_temp.tel_corre(a, format('select public.cambiar_telefono_lead(%L, (select actualizado_en from public.leads where id = %L), %L, %L)', la, la, '', '71130003'));
  if r ->> 'resultado' <> 'existe' then raise exception 'cambiar a un extra ajeno: %', r; end if;
  r := pg_temp.tel_corre(a, format('select public.cambiar_telefono_lead(%L, (select actualizado_en from public.leads where id = %L), %L, %L)', la, la, '', '71130099'));
  if r ->> 'resultado' <> 'cambiado' then raise exception 'cambiar a uno libre: %', r; end if;
  -- Apagada de nuevo, el alta con un extra ajeno entra (avisa).
  perform pg_temp.tel_regla(6, false);
  r := pg_temp.tel_corre(v_ve, format('select public.crear_lead(%L, %L::jsonb)', gen_random_uuid(), jsonb_build_object(
    'nombre', 'Repetido', 'telefono_principal', '71130003', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' <> 'creado' then raise exception 'apagada, el alta debía crear: %', r; end if;
end $$;
rollback;

-- @test telefonos: con la regla, adoptar del limbo encuentra al lead por su extra
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); b uuid := pg_temp.tel_asesor(); la uuid; r jsonb; v jsonb;
begin
  la := pg_temp.tel_lead(a, '71140001');
  perform pg_temp.tel_extra(a, la, '71140002');
  perform pg_temp.tel_regla(6, true);
  update public.leads_asesores set revocado_en = now() where lead_id = la;
  -- Sin adoptar: limbo. Adoptando: toma ESE lead (el del extra), no crea otro.
  r := pg_temp.tel_corre(b, format('select public.crear_lead(%L, %L::jsonb)', gen_random_uuid(), jsonb_build_object(
    'nombre', 'Adopta', 'telefono_principal', '71140002', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' <> 'limbo' or r #>> '{verificacion,como}' <> 'extra' then raise exception 'sin adoptar: %', r; end if;
  r := pg_temp.tel_corre(b, format('select public.crear_lead(%L, %L::jsonb)', gen_random_uuid(), jsonb_build_object(
    'nombre', 'Adopta', 'telefono_principal', '71140002', 'adoptar', true, 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' <> 'adoptado' or r ->> 'id' <> la::text then raise exception 'adoptar por un extra debía tomar el lead del extra: %', r; end if;
  if exists (select 1 from public.leads where nombre = 'Adopta') then raise exception 'adoptar creó otro lead'; end if;
  -- Un extra no puede agregarse a un lead cuyo número es el de un lead en limbo.
  update public.leads_asesores set revocado_en = now() where lead_id = la and usuario_id = b;
  r := pg_temp.tel_extra(a, pg_temp.tel_lead(a, '71140003'), '71140002');
  if r ->> 'resultado' <> 'limbo' then raise exception 'agregar el número de un lead en limbo: %', r; end if;
end $$;
rollback;

-- @test telefonos: los duplicados de antes de encender la regla quedan, se rotulan y se quitan; encender no rompe nada
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); b uuid := pg_temp.tel_asesor(); la uuid; lb uuid; r jsonb; v_id uuid;
begin
  la := pg_temp.tel_lead(a, '71150001');
  lb := pg_temp.tel_lead(b, '71150002');
  perform pg_temp.tel_extra(a, la, '71150002');
  perform pg_temp.tel_extra(a, la, '71150009');
  perform pg_temp.tel_extra(b, lb, '71150009');
  perform pg_temp.tel_regla(6, true);
  select t.id into v_id from public.leads_telefonos t where t.lead_id = la and t.telefono = '59171150002';
  r := pg_temp.tel_corre(a, format('select public.lead_telefono_guardar(%L, %L, %L, %L, %L)', la, v_id, '', '71150002', 'Casa'));
  if r ->> 'resultado' <> 'rotulado' then raise exception 'rotular un duplicado anterior: %', r; end if;
  r := pg_temp.tel_corre(a, format('select public.lead_telefono_quitar(%L, %L)', la, v_id));
  if r ->> 'resultado' <> 'quitado' then raise exception 'quitar un duplicado anterior: %', r; end if;
  -- Volver a agregarlo ya choca con la regla.
  r := pg_temp.tel_corre(a, format('select public.lead_telefono_guardar(%L, %L, %L, %L, null)', la, gen_random_uuid(), '', '71150002'));
  if r ->> 'resultado' <> 'de_otro' then raise exception 'reagregar con la regla: %', r; end if;
  -- Con duplicados, la verificación es determinista (ni cae ni da más de una respuesta).
  r := pg_temp.tel_corre(a, format('select public.verificar_telefono_extra(%L, %L, %L)', la, '', '71150009'));
  if r ->> 'estado' <> 'libre' or (r ->> 'es_extra')::boolean is not true then raise exception 'el extra propio duplicado: %', r; end if;
end $$;
rollback;

-- @test telefonos: restaurar de la papelera respeta la regla sólo para el principal
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); la uuid; lb uuid; v_lote uuid := gen_random_uuid(); r jsonb; v_ver timestamptz; m text;
begin
  la := pg_temp.tel_lead(a, '71160001');
  r := pg_temp.tel_corre(a, format('select public.leads_papelera_enviar(%L, %L)', v_lote, array[la]));
  -- Otro lead toma ese número como extra (regla apagada: entra) y se enciende.
  lb := pg_temp.tel_lead(a, '71160002');
  perform pg_temp.tel_extra(a, lb, '71160001');
  perform pg_temp.tel_regla(6, true);
  m := public._lead_motivo_de_restaurar((select l from public.leads l where l.id = la));
  if m is null then raise exception 'restaurar con el principal tomado como extra debía quedar con su motivo'; end if;
  -- Apagada, vuelve sin motivo.
  perform pg_temp.tel_regla(6, false);
  m := public._lead_motivo_de_restaurar((select l from public.leads l where l.id = la));
  if m is not null then raise exception 'apagada, restaurar no debía tener motivo: %', m; end if;
end $$;
rollback;
