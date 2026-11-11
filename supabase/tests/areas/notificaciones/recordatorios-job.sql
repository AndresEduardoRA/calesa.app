-- El job de los recordatorios (paso 7.01-1): `recordatorios-notificar` corre cada minuto `recordatorios_notificar()`, que avisa una vez a quien
-- es dueño del recordatorio y sella `notificado_en`. La `ruta` nombra el lead sólo si su dueño todavía lo tiene vivo en la cartera; si no, va a
-- `/agenda?recordatorio=<id>`. No depende de otro archivo (`SOLO=areas/notificaciones/recordatorios-job.sql`): cada bloque abre su transacción
-- y la revierte.
--
-- Qué asegura:
--   R1. El job está en `cron.job` con su horario y su comando.
--   R2. Vencido, con el lead en la cartera: una corrida deja una notificación con `/leads/<id>` y sella; la segunda no suma.
--   R3. El dueño perdió el lead (acceso revocado, o el lead en la papelera): `/agenda?recordatorio=<id>`, sin el id del lead.
--   R4. Uno eliminado no avisa y queda sellado.
--   R5. Avisado y sin accionar, con la hora cambiada a una vencida: queda una sola notificación, la nueva.
--   R6. Ni `authenticated` ni `anon` ejecutan `recordatorios_notificar()`.

create temp sequence nr_telefono start 79700000;

create or replace function pg_temp.nr_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('nr_' || substr(v_id::text, 1, 8), 'NR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, 'leads.crear', 'propios'), (v_rol, 'leads.ver', 'propios');
  return v_id;
end $f$;

-- Un lead de esa persona por la RPC del alta (queda en su cartera).
create or replace function pg_temp.nr_lead(p_dueno uuid) returns uuid language plpgsql as $f$
declare v uuid := gen_random_uuid(); v_tel bigint := nextval('pg_temp.nr_telefono');
begin
  perform set_config('request.jwt.claim.sub', p_dueno::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.crear_lead(v, jsonb_build_object('nombre', 'Recordar ' || v_tel, 'telefono_principal', v_tel::text,
    'origen_lead_id', (select id from public.origenes_lead where clave = 'web')), null, null);
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  if not exists (select 1 from public.leads_asesores where lead_id = v and usuario_id = p_dueno and revocado_en is null) then
    raise exception 'el lead no quedó en la cartera de su dueño';
  end if;
  return v;
end $f$;

-- Un recordatorio de esa persona, vencido hace una hora (o a la hora que se pase).
create or replace function pg_temp.nr_recordatorio(p_dueno uuid, p_lead uuid, p_cuando timestamptz default now() - interval '1 hour') returns uuid
language sql as $f$
  insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en) values (p_dueno, p_lead, 'Llamar de vuelta', p_cuando) returning id;
$f$;

create or replace function pg_temp.nr_avisos(p_rec uuid) returns int language sql as $f$
  select count(*)::int from public.notificaciones where tipo = 'recordatorio' and referencia_id = p_rec;
$f$;

create or replace function pg_temp.nr_ruta(p_rec uuid) returns text language sql as $f$
  select ruta from public.notificaciones where tipo = 'recordatorio' and referencia_id = p_rec order by id desc limit 1;
$f$;

-- @test recordatorios: el job recordatorios-notificar está en cron.job, cada minuto (R1)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'recordatorios-notificar' and schedule = '* * * * *'
                 and command = 'select public.recordatorios_notificar()') then
    raise exception 'falta el job recordatorios-notificar: %', (select to_jsonb(j) from cron.job j where jobname = 'recordatorios-notificar');
  end if;
end $$;

-- @test recordatorios: vencido y con el lead en la cartera, una corrida avisa una vez con /leads/<id> y sella; la segunda no suma (R2)
begin;
do $$
declare a uuid := pg_temp.nr_persona(); l uuid; r uuid;
begin
  l := pg_temp.nr_lead(a);
  r := pg_temp.nr_recordatorio(a, l);
  perform public.recordatorios_notificar();
  if pg_temp.nr_avisos(r) <> 1 then raise exception 'avisó % veces', pg_temp.nr_avisos(r); end if;
  if pg_temp.nr_ruta(r) is distinct from '/leads/' || l then raise exception 'ruta: %', pg_temp.nr_ruta(r); end if;
  if (select usuario_id from public.notificaciones where referencia_id = r) <> a then raise exception 'le avisó a otro'; end if;
  if (select notificado_en from public.recordatorios where id = r) is null then raise exception 'no selló notificado_en'; end if;
  perform public.recordatorios_notificar();
  if pg_temp.nr_avisos(r) <> 1 then raise exception 'la segunda corrida sumó: %', pg_temp.nr_avisos(r); end if;
end $$;
rollback;

-- @test recordatorios: si el dueño perdió el lead (acceso revocado o lead en la papelera) la ruta va a la agenda y no nombra el lead (R3)
begin;
do $$
declare a uuid := pg_temp.nr_persona(); l1 uuid; l2 uuid; r1 uuid; r2 uuid; r3 uuid;
begin
  l1 := pg_temp.nr_lead(a);
  l2 := pg_temp.nr_lead(a);
  r1 := pg_temp.nr_recordatorio(a, l1);
  r2 := pg_temp.nr_recordatorio(a, l2);
  r3 := pg_temp.nr_recordatorio(a, null);
  update public.leads_asesores set revocado_en = now() where lead_id = l1 and usuario_id = a;
  update public.leads set eliminado_en = now() where id = l2;
  perform public.recordatorios_notificar();
  if pg_temp.nr_ruta(r1) is distinct from '/agenda?recordatorio=' || r1 then raise exception 'revocado, ruta: %', pg_temp.nr_ruta(r1); end if;
  if pg_temp.nr_ruta(r2) is distinct from '/agenda?recordatorio=' || r2 then raise exception 'en la papelera, ruta: %', pg_temp.nr_ruta(r2); end if;
  if pg_temp.nr_ruta(r3) is distinct from '/agenda?recordatorio=' || r3 then raise exception 'sin lead, ruta: %', pg_temp.nr_ruta(r3); end if;
  if position(l1::text in pg_temp.nr_ruta(r1)) > 0 or position(l2::text in pg_temp.nr_ruta(r2)) > 0 then raise exception 'la ruta nombra el lead'; end if;
end $$;
rollback;

-- @test recordatorios: uno eliminado no avisa y queda sellado (R4)
begin;
do $$
declare a uuid := pg_temp.nr_persona(); r uuid;
begin
  r := pg_temp.nr_recordatorio(a, null);
  update public.recordatorios set eliminado_en = now() where id = r;
  perform public.recordatorios_notificar();
  if pg_temp.nr_avisos(r) <> 0 then raise exception 'avisó uno eliminado'; end if;
  if (select notificado_en from public.recordatorios where id = r) is null then raise exception 'el eliminado no quedó sellado'; end if;
end $$;
rollback;

-- @test recordatorios: avisado y sin accionar, con la hora cambiada a una vencida, queda una sola notificación, la nueva (R5)
begin;
do $$
declare a uuid := pg_temp.nr_persona(); r uuid; v_vieja bigint;
begin
  r := pg_temp.nr_recordatorio(a, null);
  perform public.recordatorios_notificar();
  select id into v_vieja from public.notificaciones where referencia_id = r;
  -- Lo que hace recordatorio_guardar al cambiar la hora: notificado_en vuelve a nulo.
  update public.recordatorios set recordar_en = now() - interval '5 minutes', notificado_en = null where id = r;
  perform public.recordatorios_notificar();
  if pg_temp.nr_avisos(r) <> 1 then raise exception 'quedaron % avisos', pg_temp.nr_avisos(r); end if;
  if (select id from public.notificaciones where referencia_id = r) = v_vieja then raise exception 'quedó el aviso viejo, no el nuevo'; end if;
  if (select notificado_en from public.recordatorios where id = r) is null then raise exception 'no selló tras la hora nueva'; end if;
end $$;
rollback;

-- @test recordatorios: ni authenticated ni anon ejecutan recordatorios_notificar() (R6)
do $$
begin
  if has_function_privilege('authenticated', 'public.recordatorios_notificar()', 'execute')
     or has_function_privilege('anon', 'public.recordatorios_notificar()', 'execute') then
    raise exception 'recordatorios_notificar() se puede ejecutar desde la app';
  end if;
end $$;
