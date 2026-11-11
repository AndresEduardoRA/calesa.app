-- Las lecturas del chat (paso 7.08-3): la lista de mis conversaciones por cursor, con sus no leídos y la otra persona de una directa, y el
-- total de no leídos. No depende de otro archivo (`SOLO=areas/chat/lista.sql`). Cada bloque abre su transacción y la revierte. Prefijo `chl_`.

-- Una persona activa con un rol propio y estas concesiones (alcance «todos»). La primera cuenta de una base vacía queda dueña: se la lleva una aparte.
create or replace function pg_temp.chl_persona(p_concesiones text[] default '{}') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'chl_duena-' || v_id || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('chl_' || substr(v_id::text, 1, 8), 'CHL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.chl_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Una conversación armada como dueño de la tabla (terreno de la prueba): grupo si trae nombre, si no directa (sin par_directo: una vieja).
create or replace function pg_temp.chl_conversacion(p_miembros uuid[], p_nombre text default 'CHL grupo') returns uuid language plpgsql as $f$
declare v uuid; u uuid;
begin
  insert into public.conversaciones (tipo, nombre, creado_por) values (case when p_nombre is null then 'directa' else 'grupo' end::public.tipo_conversacion, p_nombre, p_miembros[1])
  returning id into v;
  foreach u in array p_miembros loop insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v, u); end loop;
  return v;
end $f$;

-- n mensajes de texto de esa persona, en el pasado (antes de now(): una lectura hasta now() los cubre).
create or replace function pg_temp.chl_mensajes(p_conversacion uuid, p_autor uuid, p_n int) returns void language sql as $f$
  insert into public.mensajes (conversacion_id, autor_id, cuerpo, creado_en)
  select p_conversacion, p_autor, 'CHL ' || i, now() - interval '1 hour' + i * interval '1 millisecond' from generate_series(1, p_n) i;
$f$;

-- Los ids de una página de chat_conversaciones, en su orden.
create or replace function pg_temp.chl_ids(p jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((x ->> 'id')::uuid order by o), '{}') from jsonb_array_elements(p -> 'conversaciones') with ordinality t (x, o);
$f$;

-- La fila de esa conversación en una página, o null.
create or replace function pg_temp.chl_fila(p jsonb, p_id uuid) returns jsonb language sql as $f$
  select jsonb_path_query_first(p, '$.conversaciones[*] ? (@.id == $id)', jsonb_build_object('id', p_id::text));
$f$;

-- @test chat: la lista trae sólo mis conversaciones vigentes; ni la dueña ve una ajena; el global sigue a chat.global (L1, C1, D1)
begin;
do $$
declare
  a uuid := pg_temp.chl_persona(array['chat.participar', 'chat.global']);
  b uuid := pg_temp.chl_persona(array['chat.participar', 'chat.global']);
  c uuid := pg_temp.chl_persona(array['chat.participar', 'chat.global']);
  nadie uuid := pg_temp.chl_persona(array['chat.participar']);
  duena uuid; g uuid; grupo uuid; directa uuid; ajena uuid; dejo uuid; r jsonb; ids uuid[];
begin
  select ur.usuario_id into duena from public.usuarios_roles ur join public.roles ro on ro.id = ur.rol_id where ro.clave = 'dueno' limit 1;
  if duena is null then raise exception 'no hay dueña en la base de la prueba'; end if;
  select id into g from public.conversaciones where es_global;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (g, a);
  grupo := pg_temp.chl_conversacion(array[a, b]);
  directa := (pg_temp.chl_corre(a, format('select public.chat_directa(%L)', b)) ->> 'id')::uuid;
  ajena := pg_temp.chl_conversacion(array[b, c], 'CHL ajena');
  dejo := pg_temp.chl_conversacion(array[a, c], 'CHL dejo');

  ids := pg_temp.chl_ids(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'));
  if not (ids @> array[g, grupo, directa, dejo]) or cardinality(ids) <> 4 then raise exception 'A no vio sus 4 conversaciones: %', ids; end if;
  if ajena = any (ids) then raise exception 'A vio una conversación ajena'; end if;

  r := pg_temp.chl_corre(duena, 'select public.chat_conversaciones()');
  if r ? 'error' then raise exception 'la dueña no pudo listar: %', r; end if;
  if ajena = any (pg_temp.chl_ids(r)) then raise exception 'la dueña, sin fila de miembro, vio una conversación ajena'; end if;

  r := pg_temp.chl_corre(a, format('select public.chat_salir(%L)', dejo));
  if r ->> 'resultado' is distinct from 'salio' then raise exception 'A no pudo salir: %', r; end if;
  ids := pg_temp.chl_ids(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'));
  if dejo = any (ids) or cardinality(ids) <> 3 then raise exception 'A sigue viendo el grupo que dejó: %', ids; end if;

  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = a and rp.rol_id = ur.rol_id and rp.permiso_clave = 'chat.global';
  ids := pg_temp.chl_ids(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'));
  if g = any (ids) or cardinality(ids) <> 2 then raise exception 'sin chat.global A sigue viendo el canal global: %', ids; end if;
  if not exists (select 1 from public.conversaciones_miembros where conversacion_id = g and usuario_id = a) then raise exception 'la fila de A en el global se borró'; end if;

  r := pg_temp.chl_corre(nadie, 'select public.chat_conversaciones()');
  if r -> 'conversaciones' is distinct from '[]'::jsonb or r -> 'hay_mas' is distinct from 'false'::jsonb then raise exception 'quien no es miembro de nada recibió %', r; end if;
end $$;
rollback;

-- @test chat: la lista va de la más reciente a la más antigua, el cursor corta entre dos empatadas sin repetir y el tamaño se acota (L2, C1, D6)
begin;
do $$
declare
  p uuid := pg_temp.chl_persona(array['chat.participar']);
  t0 timestamptz := now() - interval '1 day';
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; alta uuid; baja uuid; r jsonb; r2 jsonb; ultima jsonb; i int;
begin
  c1 := pg_temp.chl_conversacion(array[p], 'CHL 1');
  c2 := pg_temp.chl_conversacion(array[p], 'CHL 2');
  c3 := pg_temp.chl_conversacion(array[p], 'CHL 3');
  c4 := pg_temp.chl_conversacion(array[p], 'CHL 4');
  update public.conversaciones set ultimo_mensaje_en = t0 + interval '3 hours' where id = c1;
  update public.conversaciones set ultimo_mensaje_en = t0 + interval '2 hours' where id in (c2, c3);
  update public.conversaciones set ultimo_mensaje_en = t0 + interval '1 hour' where id = c4;
  alta := greatest(c2, c3); baja := least(c2, c3);

  r := pg_temp.chl_corre(p, 'select public.chat_conversaciones(2)');
  if pg_temp.chl_ids(r) is distinct from array[c1, alta] then raise exception 'la página 1 no es [c1, la empatada de id mayor]: %', r; end if;
  if r -> 'hay_mas' is distinct from 'true'::jsonb then raise exception 'la página 1 no avisó que hay más: %', r; end if;
  ultima := r -> 'conversaciones' -> 1;
  r2 := pg_temp.chl_corre(p, format('select public.chat_conversaciones(2, %L::timestamptz, %L::uuid)', ultima ->> 'ultimo_mensaje_en', ultima ->> 'id'));
  if pg_temp.chl_ids(r2) is distinct from array[baja, c4] then raise exception 'la página 2 no es [la otra empatada, c4]: %', r2; end if;
  if r2 -> 'hay_mas' is distinct from 'false'::jsonb then raise exception 'la página 2 avisó que hay más: %', r2; end if;

  r := pg_temp.chl_corre(p, 'select public.chat_conversaciones(2, now(), null)');
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'cursor' then raise exception 'un cursor a medias no dio 22023 cursor: %', r; end if;

  for i in 1..51 loop perform pg_temp.chl_conversacion(array[p], 'CHL más'); end loop;
  r := pg_temp.chl_corre(p, 'select public.chat_conversaciones(1000)');
  if jsonb_array_length(r -> 'conversaciones') <> 50 or r -> 'hay_mas' is distinct from 'true'::jsonb then
    raise exception 'p_tamano 1000 no se acotó a 50: % filas, hay_mas %', jsonb_array_length(r -> 'conversaciones'), r -> 'hay_mas';
  end if;
  r := pg_temp.chl_corre(p, 'select public.chat_conversaciones()');
  if jsonb_array_length(r -> 'conversaciones') <> 20 then raise exception 'sin p_tamano no trajo 20: %', jsonb_array_length(r -> 'conversaciones'); end if;
end $$;
rollback;

-- @test chat: los no leídos de una conversación cuentan los de otros tras mi lectura, hasta 100; otro es la otra persona de la directa (L3, C3, C4)
begin;
do $$
declare
  a uuid := pg_temp.chl_persona(array['chat.participar']);
  b uuid := pg_temp.chl_persona(array['chat.participar']);
  g uuid; con_par uuid; sin_par uuid; r jsonb;
begin
  g := pg_temp.chl_conversacion(array[a, b]);
  perform pg_temp.chl_mensajes(g, b, 3);
  perform pg_temp.chl_mensajes(g, a, 2);
  r := pg_temp.chl_fila(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'), g);
  if r -> 'no_leidos' is distinct from '3'::jsonb then raise exception 'no leídos no es 3: %', r; end if;
  if r -> 'otro' is distinct from 'null'::jsonb then raise exception 'un grupo trajo otro: %', r; end if;

  insert into public.mensajes (conversacion_id, autor_id, cuerpo, eliminado_en, creado_en) values (g, b, null, now() - interval '30 minutes', now() - interval '30 minutes');
  r := pg_temp.chl_fila(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'), g);
  if r -> 'no_leidos' is distinct from '4'::jsonb then raise exception 'un mensaje eliminado de B no contó: %', r; end if;

  perform pg_temp.chl_mensajes(g, b, 120);
  r := pg_temp.chl_fila(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'), g);
  if r -> 'no_leidos' is distinct from '100'::jsonb then raise exception 'no leídos no se acotó a 100: %', r; end if;

  r := pg_temp.chl_corre(a, format('select public.chat_leer(%L, now())', g));
  if r ? 'error' then raise exception 'A no pudo leer: %', r; end if;
  r := pg_temp.chl_fila(pg_temp.chl_corre(a, 'select public.chat_conversaciones()'), g);
  if r -> 'no_leidos' is distinct from '0'::jsonb then raise exception 'tras leer quedaron no leídos: %', r; end if;

  -- Dos directas A–B: la de par_directo (chat_directa) y una vieja sin él. Desde A, otro es B; desde B, otro es A.
  con_par := (pg_temp.chl_corre(a, format('select public.chat_directa(%L)', b)) ->> 'id')::uuid;
  sin_par := pg_temp.chl_conversacion(array[a, b], null);
  if (select par_directo from public.conversaciones where id = con_par) is null then raise exception 'chat_directa no dejó par_directo'; end if;
  r := pg_temp.chl_corre(a, 'select public.chat_conversaciones()');
  if pg_temp.chl_fila(r, con_par) #>> '{otro,id}' is distinct from b::text then raise exception 'desde A, otro de la directa con par no es B: %', pg_temp.chl_fila(r, con_par); end if;
  if pg_temp.chl_fila(r, sin_par) #>> '{otro,id}' is distinct from b::text then raise exception 'desde A, otro de la directa sin par no es B: %', pg_temp.chl_fila(r, sin_par); end if;
  r := pg_temp.chl_corre(b, 'select public.chat_conversaciones()');
  if pg_temp.chl_fila(r, con_par) #>> '{otro,id}' is distinct from a::text then raise exception 'desde B, otro de la directa con par no es A: %', pg_temp.chl_fila(r, con_par); end if;
  if pg_temp.chl_fila(r, sin_par) #>> '{otro,id}' is distinct from a::text then raise exception 'desde B, otro de la directa sin par no es A: %', pg_temp.chl_fila(r, sin_par); end if;
end $$;
rollback;
