-- Directas del chat (paso 7.08-1, C1, C6 y C7): una por par, A→B y B→A son la misma.
-- No depende de otro archivo (`SOLO=areas/chat/directas.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chd_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chd_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chd_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chd_' || substr(v_id::text, 1, 8), 'CHD ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chd_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Una conversación armada como dueño de la tabla (terreno de la prueba): grupo si trae nombre, si no directa.
create or replace function pg_temp.chd_conversacion(p_miembros uuid[], p_nombre text default 'CHD grupo') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values (case when p_nombre is null then 'directa' else 'grupo' end::public.tipo_conversacion, p_nombre, p_miembros[1])
  returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- Cuántas filas de esa consulta ve la persona.
create or replace function pg_temp.chd_cuenta(p_quien uuid, p_sql text) returns jsonb language sql as $f$
  select pg_temp.chd_corre(p_quien, format('select to_jsonb(count(*)) from (%s) x', p_sql));
$f$;

-- @test chat: la base no admite dos directas del mismo par ni un par desordenado o en un grupo (D3, C1)
begin;
do $$
declare a uuid := pg_temp.chd_persona(); b uuid := pg_temp.chd_persona(); par uuid[]; e text;
begin
  par := array[least(a, b), greatest(a, b)];
  insert into public.conversaciones (tipo, creado_por, par_directo) values ('directa', a, par);
  begin
    insert into public.conversaciones (tipo, creado_por, par_directo) values ('directa', b, par);
    raise exception 'una segunda directa del mismo par entró';
  exception when unique_violation then null;
  end;
  begin
    insert into public.conversaciones (tipo, creado_por, par_directo) values ('directa', b, array[greatest(a, b), least(a, b)]);
    raise exception 'un par desordenado entró';
  exception when check_violation then null;
  end;
  begin
    insert into public.conversaciones (tipo, nombre, creado_por, par_directo) values ('grupo', 'CHD grupo', a, array[gen_random_uuid(), gen_random_uuid()]);
    e := 'un grupo con par entró';
  exception when check_violation then null;
  end;
  if e is not null then raise exception '%', e; end if;
end $$;
rollback;

-- @test chat: abrir A→B y luego B→A devuelve la misma directa, con sus dos miembros (D1, C7)
begin;
do $$
declare a uuid := pg_temp.chd_persona(array['chat.participar']); b uuid := pg_temp.chd_persona(array['chat.participar']); r1 jsonb; r2 jsonb; r3 jsonb;
begin
  r1 := pg_temp.chd_corre(a, format('select public.chat_directa(%L)', b));
  if r1 ->> 'resultado' is distinct from 'creada' then raise exception 'A→B no creó la directa: %', r1; end if;
  r2 := pg_temp.chd_corre(b, format('select public.chat_directa(%L)', a));
  if r2 ->> 'resultado' is distinct from 'existente' or r2 ->> 'id' is distinct from r1 ->> 'id' then raise exception 'B→A no devolvió la misma: % %', r1, r2; end if;
  r3 := pg_temp.chd_corre(a, format('select public.chat_directa(%L)', b));
  if r3 ->> 'id' is distinct from r1 ->> 'id' then raise exception 'repetir A→B dio otra: %', r3; end if;
  if (select count(*) from public.conversaciones where par_directo = array[least(a, b), greatest(a, b)]) <> 1 then raise exception 'hay más de una directa del par'; end if;
  if (select array_agg(usuario_id order by usuario_id) from public.conversaciones_miembros where conversacion_id = (r1 ->> 'id')::uuid) is distinct from array[least(a, b), greatest(a, b)] then
    raise exception 'la directa no tiene exactamente a sus dos miembros';
  end if;
  if pg_temp.chd_cuenta(b, format('select 1 from public.conversaciones where id = %L', r1 ->> 'id')) <> '1' then raise exception 'B no lee la directa'; end if;
end $$;
rollback;

-- @test chat: a sí misma 22023; sin chat.participar 42501; a alguien bloqueado, de baja o sin chat.participar 23514 y nada se crea (D2, C6, C7)
begin;
do $$
declare a uuid := pg_temp.chd_persona(array['chat.participar']); sin uuid := pg_temp.chd_persona(array['chat.global']);
  bloq uuid := pg_temp.chd_persona(array['chat.participar']); baja uuid := pg_temp.chd_persona(array['chat.participar']); b uuid := pg_temp.chd_persona(array['chat.participar']);
  r jsonb; n0 bigint; otro uuid;
begin
  update public.perfiles set bloqueado = true where id = bloq;
  update public.perfiles set activo = false where id = baja;
  select count(*) into n0 from public.conversaciones;
  r := pg_temp.chd_corre(a, format('select public.chat_directa(%L)', a));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'usuario' then raise exception 'a sí misma no dio 22023: %', r; end if;
  r := pg_temp.chd_corre(a, 'select public.chat_directa(null)');
  if r ->> 'error' is distinct from '22023' then raise exception 'a nadie no dio 22023: %', r; end if;
  r := pg_temp.chd_corre(sin, format('select public.chat_directa(%L)', b));
  if r ->> 'error' is distinct from '42501' then raise exception 'sin chat.participar no dio 42501: %', r; end if;
  foreach otro in array array[bloq, baja, sin, gen_random_uuid()] loop
    r := pg_temp.chd_corre(a, format('select public.chat_directa(%L)', otro));
    if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'usuario' then raise exception 'con quien no puede usar el chat no dio 23514: %', r; end if;
  end loop;
  if (select count(*) from public.conversaciones) <> n0 then raise exception 'un intento rechazado creó una conversación'; end if;
end $$;
rollback;
