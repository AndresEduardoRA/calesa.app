-- Los avisos de la cartera (paso 7.01-2): compartir avisa a quien recibe (`lead_compartido`) y transferir, al destino (`lead_transferido`), sólo
-- cuando algo cambió; ningún título ni cuerpo lleva el teléfono, el número ni el nombre del lead. No depende de otro archivo
-- (`SOLO=areas/notificaciones/avisos-de-cartera.sql`): cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. A (dueña) comparte con B: B tiene exactamente un `lead_compartido` (ruta, referencia, sin acción); A y C, ninguno; sin datos del lead.
--   A2. Compartir otra vez con B, o A consigo misma (`sin_cambios`), no suma.
--   A3. Quitarle el acceso a B y volver a compartir con el aviso sin accionar lo reemplaza; con el primero accionado, B tiene dos.

create temp sequence ac_telefono start 79800000;

-- Una persona con su rol propio, con nombre y los permisos de la cartera en el alcance que se pida.
create or replace function pg_temp.ac_persona(p_alcance text default 'propios') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Persona ' || substr(v_id::text, 1, 4) where id = v_id;
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

-- Falla si el aviso nombra el teléfono, el número o el nombre del lead, o si no es el que se espera.
create or replace function pg_temp.ac_aviso_limpio(p_usuario uuid, p_tipo text, p_lead uuid) returns void language plpgsql as $f$
declare n public.notificaciones; l public.leads; v_texto text;
begin
  select * into strict n from public.notificaciones where usuario_id = p_usuario and tipo = p_tipo and referencia_id = p_lead;
  select * into strict l from public.leads where id = p_lead;
  if n.ruta is distinct from '/leads/' || p_lead or n.referencia_tipo is distinct from 'lead' or n.requiere_accion then
    raise exception 'aviso inesperado: %', to_jsonb(n);
  end if;
  v_texto := n.titulo || ' ' || coalesce(n.cuerpo, '');
  if position(l.telefono_principal in v_texto) > 0 or position(l.nombre in v_texto) > 0
     or (l.numero_propio is not null and v_texto ~ ('(^|\D)' || l.numero_propio || '(\D|$)')) then
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
