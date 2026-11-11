-- Los avisos de la cartera (paso 7.01-2): compartir avisa a quien recibe (`lead_compartido`) y transferir, al destino (`lead_transferido`), sólo
-- cuando algo cambió; ningún título ni cuerpo lleva el teléfono, el número ni el nombre del lead. No depende de otro archivo
-- (`SOLO=areas/notificaciones/avisos-de-cartera.sql`): cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. A (dueña) comparte con B: B tiene exactamente un `lead_compartido` (ruta, referencia, sin acción); A y C, ninguno; sin datos del lead.
--   A2. Compartir otra vez con B, o A consigo misma (`sin_cambios`), no suma.
--   A3. Quitarle el acceso a B y volver a compartir con el aviso sin accionar lo reemplaza; con el primero accionado, B tiene dos.
--   A4. A transfiere a B: B tiene exactamente un `lead_transferido`; A y C, ninguno; sin datos del lead. La supervisión transfiere de B a C:
--       C tiene uno; la supervisión y B no suman.
--   A5. Transferir al dueño actual (`sin_cambios`) no suma; la ida y vuelta A→B→A→B con el primero sin accionar deja uno abierto para B.
--   L1. `limpieza_avisar()`: un importado que se limpia en hoy + 3 y uno vencido pendiente dejan un `limpieza_pronto` cada uno a su creador, con
--       su marca; uno en hoy + 4, uno conservado y uno con lead, ninguno y sin marca.
--   L2. Una segunda corrida no suma; con el aviso accionado y borrado por su dueño, una tercera tampoco (manda la marca).
--   L3. Con el interruptor general apagado: `apagada`, sin avisos ni marcas.
--   L4. El job `limpieza-avisar` está en `cron.job`; ni `authenticated` ni `anon` ejecutan `limpieza_avisar()` ni leen `limpieza_avisos`.

create temp sequence ac_telefono start 79800000;

-- Una persona con su rol propio, con nombre y los permisos de la cartera en el alcance que se pida.
create or replace function pg_temp.ac_persona(p_alcance text default 'propios') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Persona ' || translate(substr(v_id::text, 1, 4), '0123456789', 'ghijklmnop') where id = v_id;
  insert into public.roles (clave, nombre) values ('ac_' || substr(v_id::text, 1, 8), 'AC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance)
  values (v_rol, 'leads.crear', p_alcance::public.alcance_permiso), (v_rol, 'leads.ver', p_alcance::public.alcance_permiso),
         (v_rol, 'leads.compartir', p_alcance::public.alcance_permiso), (v_rol, 'leads.transferir', p_alcance::public.alcance_permiso);
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado.
create or replace function pg_temp.ac_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return v;
end $f$;

-- Un lead de esa persona por la RPC del alta, con un nombre sin dígitos (para buscarlo en el texto del aviso).
create or replace function pg_temp.ac_lead(p_dueno uuid) returns uuid language plpgsql as $f$
declare v uuid := gen_random_uuid(); v_tel bigint := nextval('pg_temp.ac_telefono');
begin
  perform pg_temp.ac_como(p_dueno, format($s$select to_jsonb(public.crear_lead(%L::uuid, %L::jsonb, null, null))$s$, v,
    jsonb_build_object('nombre', 'Marcela Quiroga', 'telefono_principal', v_tel::text,
      'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if not exists (select 1 from public.leads_asesores where lead_id = v and usuario_id = p_dueno and revocado_en is null) then
    raise exception 'el lead no quedó en la cartera de su dueño';
  end if;
  return v;
end $f$;

create or replace function pg_temp.ac_compartir(p_quien uuid, p_lead uuid, p_con uuid) returns text language sql as $f$
  select pg_temp.ac_como(p_quien, format('select public.lead_compartir(%L::uuid, %L::uuid)', p_lead, p_con)) ->> 'resultado';
$f$;

create or replace function pg_temp.ac_transferir(p_quien uuid, p_lead uuid, p_a uuid) returns text language sql as $f$
  select pg_temp.ac_como(p_quien, format('select public.lead_transferir(%L::uuid, %L::uuid, %L::uuid)', p_lead, p_a,
    public._lead_dueno(p_lead))) ->> 'resultado';
$f$;

create or replace function pg_temp.ac_avisos(p_usuario uuid, p_tipo text, p_ref uuid) returns int language sql as $f$
  select count(*)::int from public.notificaciones where usuario_id = p_usuario and tipo = p_tipo and referencia_id = p_ref;
$f$;

-- Falla si el aviso nombra el teléfono, un número o el nombre del lead, o si no es el que se espera.
create or replace function pg_temp.ac_aviso_limpio(p_usuario uuid, p_tipo text, p_lead uuid) returns void language plpgsql as $f$
declare n public.notificaciones; l public.leads; v_texto text;
begin
  select * into strict n from public.notificaciones where usuario_id = p_usuario and tipo = p_tipo and referencia_id = p_lead;
  select * into strict l from public.leads where id = p_lead;
  if n.ruta is distinct from '/leads/' || p_lead or n.referencia_tipo is distinct from 'lead' or n.requiere_accion then
    raise exception 'aviso inesperado: %', to_jsonb(n);
  end if;
  v_texto := n.titulo || ' ' || coalesce(n.cuerpo, '');
  -- Sin dígitos: ni el teléfono, ni `numero_propio`, ni el número global (`leads.numero`); el nombre de la persona de prueba no los tiene.
  if position(l.nombre in v_texto) > 0 or v_texto ~ '\d' then
    raise exception 'el aviso nombra datos del lead: %', v_texto;
  end if;
end $f$;

-- @test avisos de cartera: compartir deja exactamente un lead_compartido a quien recibe, ninguno a otro y sin datos del lead (A1)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); b uuid := pg_temp.ac_persona(); c uuid := pg_temp.ac_persona(); l uuid;
begin
  l := pg_temp.ac_lead(a);
  if pg_temp.ac_compartir(a, l, b) <> 'compartido' then raise exception 'no compartió'; end if;
  if pg_temp.ac_avisos(b, 'lead_compartido', l) <> 1 then raise exception 'B tiene % avisos', pg_temp.ac_avisos(b, 'lead_compartido', l); end if;
  if pg_temp.ac_avisos(a, 'lead_compartido', l) + pg_temp.ac_avisos(c, 'lead_compartido', l) <> 0 then raise exception 'le avisó a otro'; end if;
  if (select count(*) from public.notificaciones where referencia_id = l) <> 1 then raise exception 'sobran avisos del lead'; end if;
  perform pg_temp.ac_aviso_limpio(b, 'lead_compartido', l);
end $$;
rollback;

-- @test avisos de cartera: compartir otra vez, o consigo misma, da sin_cambios y no suma (A2)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); b uuid := pg_temp.ac_persona(); l uuid;
begin
  l := pg_temp.ac_lead(a);
  perform pg_temp.ac_compartir(a, l, b);
  if pg_temp.ac_compartir(a, l, b) <> 'sin_cambios' then raise exception 'la segunda vez no dio sin_cambios'; end if;
  if pg_temp.ac_compartir(a, l, a) <> 'sin_cambios' then raise exception 'consigo misma no dio sin_cambios'; end if;
  if pg_temp.ac_avisos(b, 'lead_compartido', l) <> 1 then raise exception 'B tiene % avisos', pg_temp.ac_avisos(b, 'lead_compartido', l); end if;
  if pg_temp.ac_avisos(a, 'lead_compartido', l) <> 0 then raise exception 'A se avisó a sí misma'; end if;
end $$;
rollback;

-- @test avisos de cartera: volver a compartir reemplaza el aviso abierto; con el primero accionado quedan dos (A3)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); b uuid := pg_temp.ac_persona(); l uuid; v_primero bigint; v_segundo bigint;
begin
  l := pg_temp.ac_lead(a);
  perform pg_temp.ac_compartir(a, l, b);
  select id into strict v_primero from public.notificaciones where usuario_id = b and tipo = 'lead_compartido' and referencia_id = l;
  perform pg_temp.ac_como(a, format('select public.lead_revocar_acceso(%L::uuid, %L::uuid)', l, b));
  if pg_temp.ac_compartir(a, l, b) <> 'compartido' then raise exception 'no volvió a compartir'; end if;
  select id into strict v_segundo from public.notificaciones where usuario_id = b and tipo = 'lead_compartido' and referencia_id = l;
  if v_segundo = v_primero then raise exception 'el antispam se tragó el aviso nuevo'; end if;
  update public.notificaciones set accionada_en = now() where id = v_segundo;
  perform pg_temp.ac_como(a, format('select public.lead_revocar_acceso(%L::uuid, %L::uuid)', l, b));
  perform pg_temp.ac_compartir(a, l, b);
  if pg_temp.ac_avisos(b, 'lead_compartido', l) <> 2 then raise exception 'con el primero accionado B tiene %', pg_temp.ac_avisos(b, 'lead_compartido', l); end if;
  if (select count(*) from public.notificaciones where usuario_id = b and referencia_id = l and accionada_en is null) <> 1 then
    raise exception 'quedó más de un aviso abierto';
  end if;
end $$;
rollback;

-- @test avisos de cartera: transferir deja exactamente un lead_transferido al destino; la supervisión que transfiere no se avisa (A4)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); b uuid := pg_temp.ac_persona(); c uuid := pg_temp.ac_persona();
  s uuid := pg_temp.ac_persona('todos'); l uuid;
begin
  l := pg_temp.ac_lead(a);
  if pg_temp.ac_transferir(a, l, b) <> 'transferido' then raise exception 'no transfirió'; end if;
  if pg_temp.ac_avisos(b, 'lead_transferido', l) <> 1 then raise exception 'B tiene % avisos', pg_temp.ac_avisos(b, 'lead_transferido', l); end if;
  if pg_temp.ac_avisos(a, 'lead_transferido', l) + pg_temp.ac_avisos(c, 'lead_transferido', l) <> 0 then raise exception 'le avisó a otro'; end if;
  if (select count(*) from public.notificaciones where referencia_id = l) <> 1 then raise exception 'sobran avisos del lead'; end if;
  perform pg_temp.ac_aviso_limpio(b, 'lead_transferido', l);
  if pg_temp.ac_transferir(s, l, c) <> 'transferido' then raise exception 'la supervisión no transfirió'; end if;
  if pg_temp.ac_avisos(c, 'lead_transferido', l) <> 1 then raise exception 'C tiene % avisos', pg_temp.ac_avisos(c, 'lead_transferido', l); end if;
  if pg_temp.ac_avisos(s, 'lead_transferido', l) <> 0 or pg_temp.ac_avisos(b, 'lead_transferido', l) <> 1 then
    raise exception 'la supervisión o el saliente sumaron';
  end if;
end $$;
rollback;

-- @test avisos de cartera: transferir al dueño actual no suma; la ida y vuelta deja un solo aviso abierto al destino (A5)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); b uuid := pg_temp.ac_persona(); l uuid;
begin
  l := pg_temp.ac_lead(a);
  if pg_temp.ac_transferir(a, l, a) <> 'sin_cambios' then raise exception 'al dueño actual no dio sin_cambios'; end if;
  if (select count(*) from public.notificaciones where referencia_id = l) <> 0 then raise exception 'sin_cambios avisó'; end if;
  perform pg_temp.ac_transferir(a, l, b);
  perform pg_temp.ac_transferir(b, l, a);
  if pg_temp.ac_transferir(a, l, b) <> 'transferido' then raise exception 'la vuelta no transfirió'; end if;
  if pg_temp.ac_avisos(b, 'lead_transferido', l) <> 1 then raise exception 'B tiene % avisos', pg_temp.ac_avisos(b, 'lead_transferido', l); end if;
  if pg_temp.ac_avisos(a, 'lead_transferido', l) <> 1 then raise exception 'A tiene % avisos', pg_temp.ac_avisos(a, 'lead_transferido', l); end if;
end $$;
rollback;

-- Un origen de subasta.
create or replace function pg_temp.ac_origen() returns uuid language sql as $f$
  insert into public.origenes (clave, nombre, tipo)
  values ('ac_' || substr(gen_random_uuid()::text, 1, 8), 'AC origen ' || substr(gen_random_uuid()::text, 1, 8), 'subasta') returning id;
$f$;

-- Un importado de esa subasta, creado por esa persona, que terminó en ese momento.
create or replace function pg_temp.ac_importado(p_origen uuid, p_creador uuid, p_fin timestamptz, p_lead uuid default null) returns uuid
language sql as $f$
  insert into public.vehiculos (origen_id, titulo, marca, importado_apibara, estado_subasta, subasta_fin_en, creado_por, lead_id)
  values (p_origen, 'AC importado', 'toyota', true, 'terminada', p_fin, p_creador, p_lead) returning id;
$f$;

-- Un momento de hoy + n días a las 02:00 en la zona de la empresa (antes de las 03:00: vence ese mismo día).
create or replace function pg_temp.ac_dia(p_dias int) returns timestamptz language sql as $f$
  select (((now() at time zone e.zona_horaria)::date + p_dias) + time '02:00') at time zone e.zona_horaria
  from public.ajustes_empresa e where e.id = 1;
$f$;

create or replace function pg_temp.ac_fecha(p_v uuid) returns date language sql as $f$
  select public._limpieza_fecha(v, now(), public._limpieza_proxima(now())) from public.vehiculos v where v.id = p_v;
$f$;

create or replace function pg_temp.ac_hoy() returns date language sql as $f$
  select (now() at time zone e.zona_horaria)::date from public.ajustes_empresa e where e.id = 1;
$f$;

-- @test avisos de limpieza: hoy + 3 y un vencido avisan una vez a su creador; hoy + 4, un conservado y uno con lead no (L1)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); o uuid := pg_temp.ac_origen(); l uuid;
  v3 uuid; vv uuid; v4 uuid; vc uuid; vl uuid; r jsonb; n public.notificaciones;
begin
  update public.ajustes_empresa set limpieza_automatica = true, limpieza_dias_gracia = 7 where id = 1;
  l := pg_temp.ac_lead(a);
  v3 := pg_temp.ac_importado(o, a, pg_temp.ac_dia(3 - 7));
  vv := pg_temp.ac_importado(o, a, now() - interval '30 days');
  v4 := pg_temp.ac_importado(o, a, pg_temp.ac_dia(4 - 7));
  vc := pg_temp.ac_importado(o, a, pg_temp.ac_dia(3 - 7));
  insert into public.vehiculos_conservados (vehiculo_id, conservado_por) values (vc, a);
  vl := pg_temp.ac_importado(o, a, pg_temp.ac_dia(3 - 7), l);
  -- Precondición: la regla de la limpieza da lo que la prueba supone.
  if pg_temp.ac_fecha(v3) is distinct from pg_temp.ac_hoy() + 3 or pg_temp.ac_fecha(v4) is distinct from pg_temp.ac_hoy() + 4
     or pg_temp.ac_fecha(vv) > pg_temp.ac_hoy() + 1 or pg_temp.ac_fecha(vc) is not null or pg_temp.ac_fecha(vl) is not null then
    raise exception 'precondición: % % % % %', pg_temp.ac_fecha(v3), pg_temp.ac_fecha(v4), pg_temp.ac_fecha(vv), pg_temp.ac_fecha(vc), pg_temp.ac_fecha(vl);
  end if;
  r := public.limpieza_avisar(now(), array[o]);
  if r is distinct from '{"estado": "corrida", "avisados": 2, "pendientes": false}'::jsonb then raise exception 'respuesta: %', r; end if;
  if pg_temp.ac_avisos(a, 'limpieza_pronto', v3) <> 1 or pg_temp.ac_avisos(a, 'limpieza_pronto', vv) <> 1 then raise exception 'no avisó a los dos'; end if;
  if (select count(*) from public.notificaciones where referencia_id in (v4, vc, vl)) <> 0 then raise exception 'avisó a uno que no tocaba'; end if;
  if (select count(*) from public.notificaciones where tipo = 'limpieza_pronto' and usuario_id <> a and referencia_id in (v3, vv)) <> 0 then
    raise exception 'le avisó a otro';
  end if;
  select * into strict n from public.notificaciones where tipo = 'limpieza_pronto' and referencia_id = v3;
  if n.ruta is distinct from '/vehiculos/' || v3 or n.referencia_tipo is distinct from 'vehiculo' or not n.requiere_accion then
    raise exception 'aviso inesperado: %', to_jsonb(n);
  end if;
  if (select array_agg(vehiculo_id order by vehiculo_id) from public.limpieza_avisos where vehiculo_id in (v3, vv, v4, vc, vl))
     is distinct from (select array_agg(x order by x) from unnest(array[v3, vv]) x) then
    raise exception 'marcas: %', (select array_agg(vehiculo_id) from public.limpieza_avisos);
  end if;
  if (select fecha from public.limpieza_avisos where vehiculo_id = v3) is distinct from pg_temp.ac_hoy() + 3 then raise exception 'la marca no guardó la fecha'; end if;
end $$;
rollback;

-- @test avisos de limpieza: una segunda corrida no suma; con el aviso accionado y borrado, tampoco: manda la marca (L2)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); o uuid := pg_temp.ac_origen(); v uuid; r jsonb;
begin
  update public.ajustes_empresa set limpieza_automatica = true, limpieza_dias_gracia = 7 where id = 1;
  v := pg_temp.ac_importado(o, a, now() - interval '30 days');
  perform public.limpieza_avisar(now(), array[o]);
  r := public.limpieza_avisar(now(), array[o]);
  if (r ->> 'avisados')::int <> 0 or pg_temp.ac_avisos(a, 'limpieza_pronto', v) <> 1 then raise exception 'la segunda sumó: %', r; end if;
  update public.notificaciones set accionada_en = now() where tipo = 'limpieza_pronto' and referencia_id = v;
  delete from public.notificaciones where tipo = 'limpieza_pronto' and referencia_id = v;
  r := public.limpieza_avisar(now(), array[o]);
  if (r ->> 'avisados')::int <> 0 or pg_temp.ac_avisos(a, 'limpieza_pronto', v) <> 0 then raise exception 'volvió a avisar: %', r; end if;
end $$;
rollback;

-- @test avisos de limpieza: con el interruptor general apagado no avisa ni marca (L3)
begin;
do $$
declare a uuid := pg_temp.ac_persona(); o uuid := pg_temp.ac_origen(); v uuid; r jsonb;
begin
  update public.ajustes_empresa set limpieza_automatica = false where id = 1;
  v := pg_temp.ac_importado(o, a, now() - interval '30 days');
  r := public.limpieza_avisar(now(), array[o]);
  if r is distinct from '{"estado": "apagada"}'::jsonb then raise exception 'respuesta: %', r; end if;
  if pg_temp.ac_avisos(a, 'limpieza_pronto', v) <> 0 or exists (select 1 from public.limpieza_avisos where vehiculo_id = v) then
    raise exception 'apagada avisó o marcó';
  end if;
end $$;
rollback;

-- @test avisos de limpieza: el job limpieza-avisar está en cron.job; ni authenticated ni anon ejecutan la función ni leen las marcas (L4)
do $$
declare q text;
begin
  if not exists (select 1 from cron.job where jobname = 'limpieza-avisar' and schedule = '15 13 * * *'
                 and command = 'select public.limpieza_avisar()') then
    raise exception 'falta el job limpieza-avisar: %', (select to_jsonb(j) from cron.job j where jobname = 'limpieza-avisar');
  end if;
  foreach q in array array['authenticated', 'anon'] loop
    if has_function_privilege(q, 'public.limpieza_avisar(timestamptz, uuid[])', 'execute')
       or has_function_privilege(q, 'public._limpieza_ventana_de_aviso()', 'execute')
       or has_table_privilege(q, 'public.limpieza_avisos', 'select, insert, update, delete') then
      raise exception '% tiene privilegios sobre el aviso de limpieza', q;
    end if;
  end loop;
end $$;
