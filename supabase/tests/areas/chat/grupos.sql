-- Grupos del chat (paso 7.08-1, C8–C10): crear, cambiar miembros y salir por RPC.
-- No depende de otro archivo (`SOLO=areas/chat/grupos.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chgr_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chgr_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chgr_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chgr_' || substr(v_id::text, 1, 8), 'CHGR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chgr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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
create or replace function pg_temp.chgr_conversacion(p_miembros uuid[], p_nombre text default 'CHGR grupo') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values (case when p_nombre is null then 'directa' else 'grupo' end::public.tipo_conversacion, p_nombre, p_miembros[1])
  returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- Cuántas filas de esa consulta ve la persona.
create or replace function pg_temp.chgr_cuenta(p_quien uuid, p_sql text) returns jsonb language sql as $f$
  select pg_temp.chgr_corre(p_quien, format('select to_jsonb(count(*)) from (%s) x', p_sql));
$f$;

-- Llama a una RPC de grupos como esa persona.
create or replace function pg_temp.chgr_crear(p_quien uuid, p_id uuid, p_nombre text, p_miembros uuid[]) returns jsonb language sql as $f$
  select pg_temp.chgr_corre(p_quien, format('select public.chat_grupo_crear(%L, %L, %L)', p_id, p_nombre, p_miembros));
$f$;
create or replace function pg_temp.chgr_miembros(p_quien uuid, p_conv uuid, p_agregar uuid[], p_quitar uuid[]) returns jsonb language sql as $f$
  select pg_temp.chgr_corre(p_quien, format('select public.chat_grupo_miembros(%L, %L, %L)', p_conv, p_agregar, p_quitar));
$f$;
-- Los miembros de una conversación, ordenados.
create or replace function pg_temp.chgr_de(p_conv uuid) returns uuid[] language sql as $f$
  select coalesce(array_agg(usuario_id order by usuario_id), '{}') from public.conversaciones_miembros where conversacion_id = p_conv;
$f$;
create or replace function pg_temp.chgr_orden(p uuid[]) returns uuid[] language sql as $f$ select array(select x from unnest(p) x order by x) $f$;

-- @test chat: crear un grupo: creado con todos más quien crea; repetido; id ajeno 22023; nombre y cantidad 22023; alguien sin chat 23514 (R1, C8)
begin;
do $$
declare a uuid := pg_temp.chgr_persona(array['chat.participar']); b uuid := pg_temp.chgr_persona(array['chat.participar']); c uuid := pg_temp.chgr_persona(array['chat.participar']);
  sin uuid := pg_temp.chgr_persona(); g uuid := gen_random_uuid(); r jsonb; n0 bigint; muchos uuid[];
begin
  r := pg_temp.chgr_crear(a, g, '  Ventas  ', array[b, c, b, a]);
  if r ->> 'resultado' is distinct from 'creado' or r ->> 'id' is distinct from g::text then raise exception 'no creó el grupo: %', r; end if;
  if pg_temp.chgr_de(g) is distinct from pg_temp.chgr_orden(array[a, b, c]) then raise exception 'los miembros no son los pedidos más quien crea'; end if;
  if (select nombre from public.conversaciones where id = g) <> 'Ventas' then raise exception 'el nombre no se recortó'; end if;
  r := pg_temp.chgr_crear(a, g, 'Ventas', array[b]);
  if r ->> 'resultado' is distinct from 'repetido' then raise exception 'repetir el id no dio repetido: %', r; end if;
  r := pg_temp.chgr_crear(b, g, 'Otro', array[a]);
  if r ->> 'error' is distinct from '22023' then raise exception 'el id de un grupo ajeno no dio 22023: %', r; end if;
  select count(*) into n0 from public.conversaciones;
  muchos := array(select gen_random_uuid() from generate_series(1, 50));
  r := pg_temp.chgr_crear(a, gen_random_uuid(), '   ', array[b]);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'nombre' then raise exception 'nombre vacío no dio 22023: %', r; end if;
  r := pg_temp.chgr_crear(a, gen_random_uuid(), repeat('x', 81), array[b]);
  if r ->> 'hint' is distinct from 'nombre' then raise exception 'nombre largo no dio 22023: %', r; end if;
  r := pg_temp.chgr_crear(a, gen_random_uuid(), 'Solo', array[a]);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'miembros' then raise exception 'sin otros no dio 22023: %', r; end if;
  r := pg_temp.chgr_crear(a, gen_random_uuid(), 'Lleno', muchos);
  if r ->> 'hint' is distinct from 'miembros' then raise exception '50 otros no dio 22023: %', r; end if;
  r := pg_temp.chgr_crear(a, gen_random_uuid(), 'Nulo', array[b, null]);
  if r ->> 'hint' is distinct from 'miembros' then raise exception 'un miembro nulo no dio 22023: %', r; end if;
  r := pg_temp.chgr_crear(a, gen_random_uuid(), 'Sin chat', array[b, sin]);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'miembros' then raise exception 'alguien sin chat.participar no dio 23514: %', r; end if;
  r := pg_temp.chgr_crear(sin, gen_random_uuid(), 'Sin permiso', array[b]);
  if r ->> 'error' is distinct from '42501' then raise exception 'crear sin chat.participar no dio 42501: %', r; end if;
  if (select count(*) from public.conversaciones) <> n0 then raise exception 'un intento rechazado creó una conversación'; end if;
end $$;
rollback;

-- @test chat: cambiar miembros: quien creó guardado y luego sin_cambios; otro miembro, una directa o el global 42501; quitarse, nulos, el mismo en los dos y más de 50, 22023 (R2, C9)
begin;
do $$
declare a uuid := pg_temp.chgr_persona(array['chat.participar', 'chat.global']); b uuid := pg_temp.chgr_persona(array['chat.participar']);
  c uuid := pg_temp.chgr_persona(array['chat.participar']); d uuid := pg_temp.chgr_persona(array['chat.participar']); sin uuid := pg_temp.chgr_persona();
  g uuid := gen_random_uuid(); dir uuid; glob uuid; r jsonb;
begin
  perform pg_temp.chgr_crear(a, g, 'Ventas', array[b, c]);
  r := pg_temp.chgr_miembros(a, g, array[d], array[c]);
  if r ->> 'resultado' is distinct from 'guardado' or pg_temp.chgr_de(g) is distinct from pg_temp.chgr_orden(array[a, b, d]) then raise exception 'agregar y quitar no guardó: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, array[d], array[c]);
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'repetirlo no dio sin_cambios: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, null, null);
  if r ->> 'resultado' is distinct from 'sin_cambios' then raise exception 'listas nulas no dieron sin_cambios: %', r; end if;
  r := pg_temp.chgr_miembros(b, g, array[c], null);
  if r ->> 'error' is distinct from '42501' then raise exception 'otro miembro cambió los miembros: %', r; end if;
  r := pg_temp.chgr_miembros(c, g, array[c], null);
  if r ->> 'error' is distinct from '42501' then raise exception 'alguien que ya no es miembro se volvió a sumar: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, null, array[a]);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'quitar' then raise exception 'quitarse a sí misma no dio 22023: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, array[c], array[c]);
  if r ->> 'hint' is distinct from 'agregar' then raise exception 'el mismo en los dos no dio 22023: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, array[null::uuid], null);
  if r ->> 'hint' is distinct from 'agregar' then raise exception 'agregar un nulo no dio 22023: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, array(select gen_random_uuid() from generate_series(1, 48)), null);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'agregar' then raise exception 'pasar de 50 no dio 22023: %', r; end if;
  r := pg_temp.chgr_miembros(a, g, array[sin], null);
  if r ->> 'error' is distinct from '23514' then raise exception 'sumar a alguien sin chat.participar no dio 23514: %', r; end if;
  dir := pg_temp.chgr_conversacion(array[a, b], null);
  r := pg_temp.chgr_miembros(a, dir, array[c], null);
  if r ->> 'error' is distinct from '42501' then raise exception 'cambió los miembros de una directa: %', r; end if;
  select id into glob from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (glob, a);
  r := pg_temp.chgr_miembros(a, glob, array[b], null);
  if r ->> 'error' is distinct from '42501' then raise exception 'cambió los miembros del canal global: %', r; end if;
  if pg_temp.chgr_de(g) is distinct from pg_temp.chgr_orden(array[a, b, d]) then raise exception 'un intento rechazado cambió los miembros'; end if;
end $$;
rollback;

-- @test chat: salir de un grupo corta su lectura; de una directa 22023; quien no es miembro 42501 (R3, C10)
begin;
do $$
declare a uuid := pg_temp.chgr_persona(array['chat.participar']); b uuid := pg_temp.chgr_persona(array['chat.participar']); afuera uuid := pg_temp.chgr_persona(array['chat.participar']);
  g uuid := gen_random_uuid(); dir uuid; r jsonb;
begin
  perform pg_temp.chgr_crear(a, g, 'Ventas', array[b]);
  r := pg_temp.chgr_corre(afuera, format('select public.chat_salir(%L)', g));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien no es miembro salió: %', r; end if;
  r := pg_temp.chgr_corre(a, format('select public.chat_salir(%L)', g));
  if r ->> 'resultado' is distinct from 'salio' then raise exception 'quien creó no pudo salir: %', r; end if;
  if pg_temp.chgr_cuenta(a, format('select 1 from public.conversaciones where id = %L', g)) <> '0' then raise exception 'después de salir sigue leyendo'; end if;
  if pg_temp.chgr_cuenta(b, format('select 1 from public.conversaciones where id = %L', g)) <> '1' then raise exception 'el grupo dejó de leerse para quien quedó'; end if;
  dir := pg_temp.chgr_conversacion(array[a, b], null);
  r := pg_temp.chgr_corre(a, format('select public.chat_salir(%L)', dir));
  if r ->> 'error' is distinct from '22023' then raise exception 'salió de una directa: %', r; end if;
end $$;
rollback;
