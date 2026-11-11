-- Quién lee un evento (paso 7.06-1): la matriz de `eventos: leer` y `eventos_destinatarios: leer` (`puede_evento`). Partido de `eventos.sql` por largo.
-- No depende de otro archivo (`SOLO=areas/agenda/eventos-leer.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   E4. La matriz de lectura: privado, público y seleccionados × creador, destinatario, tercero y agenda.ver_todo.

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

-- @test agenda: la matriz de lectura: privado, público y seleccionados × creador, destinatario, tercero y agenda.ver_todo (E4)
begin;
do $$
declare
  c uuid := pg_temp.ag_persona(); d uuid := pg_temp.ag_persona(); t uuid := pg_temp.ag_persona(); vt uuid := pg_temp.ag_persona(array['agenda.ver_todo']);
  priv uuid; pub uuid; sel uuid; quien uuid; i int; r jsonb;
  esperado constant jsonb := '{"priv": [1, 0, 0, 1], "pub": [1, 1, 1, 1], "sel": [1, 1, 0, 1]}';
  personas uuid[];
begin
  priv := pg_temp.ag_evento(c);
  pub := pg_temp.ag_evento(c, 'publico');
  sel := pg_temp.ag_evento(c, 'seleccionados', array[d]);
  personas := array[c, d, t, vt];
  for i in 1..4 loop
    quien := personas[i];
    r := pg_temp.ag_corre(quien, format($q$select jsonb_build_object(
           'priv', (select count(*) from public.eventos where id = %L),
           'pub', (select count(*) from public.eventos where id = %L),
           'sel', (select count(*) from public.eventos where id = %L),
           'dest', (select count(*) from public.eventos_destinatarios where evento_id = %L))$q$, priv, pub, sel, sel));
    if r -> 'priv' <> esperado -> 'priv' -> (i - 1) or r -> 'pub' <> esperado -> 'pub' -> (i - 1) or r -> 'sel' <> esperado -> 'sel' -> (i - 1)
       or r -> 'dest' <> esperado -> 'sel' -> (i - 1) then
      raise exception 'la persona % de [creador, destinatario, tercero, ver_todo] leyó %', i, r;
    end if;
  end loop;
end $$;
rollback;
