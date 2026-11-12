-- Los permisos de las preguntas frecuentes (8.02-1, C7–C9 y D3). No depende de otro archivo (`SOLO=areas/web/faqs-permisos.sql`).
-- Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   F1. Sin web.contenido.gestionar: crear da 42501; editar y borrar una pregunta que existe no tocan ninguna fila (la RLS la deja en cero).
--   F2. Con web.contenido.gestionar: crear, editar con la versión esperada y borrar escriben; con una versión vieja, el update no toca ninguna fila.
--   F3. Cualquier cuenta con sesión lee public.web_faqs (también las no publicadas): la pestaña la lee quien entra.
--   F4. anon no lee public.web_faqs (sin grant) y web.faqs sólo trae las publicadas, sin id ni publicada.

create or replace function pg_temp.wf_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-wf@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wf_' || substr(v_id::text, 1, 8), 'WF ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{v: <resultado>}` o `{error, mensaje, hint}`. Un `returning`/`select` sin filas da `v` nulo.
create or replace function pg_temp.wf_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v text; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return jsonb_build_object('v', v);
end $f$;

create or replace function pg_temp.wf_es(p_que text, p_r jsonb, p_estado text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado then
    raise exception '%: se esperaba % y dio %', p_que, p_estado, p_r;
  end if;
end $f$;

-- @test web faqs: sin el permiso no se crea, no se edita y no se borra (F1)
begin;
do $$
declare
  v_nadie uuid := pg_temp.wf_persona(array[]::text[]);
  v_id uuid;
begin
  insert into public.web_faqs (pregunta, respuesta) values ('¿Hay garantía?', 'Sí') returning id into v_id;
  perform pg_temp.wf_es('F1 crear', pg_temp.wf_corre(v_nadie,
    'insert into public.web_faqs (pregunta, respuesta) values (''¿Cuánto tarda?'', ''Un mes'') returning id'), '42501');
  if (pg_temp.wf_corre(v_nadie, format('update public.web_faqs set respuesta = ''No'' where id = %L returning id', v_id)) ->> 'v') is not null then
    raise exception 'F1 editar: alguien sin permiso editó la pregunta';
  end if;
  if (pg_temp.wf_corre(v_nadie, format('delete from public.web_faqs where id = %L returning id', v_id)) ->> 'v') is not null then
    raise exception 'F1 borrar: alguien sin permiso borró la pregunta';
  end if;
  if (select respuesta from public.web_faqs where id = v_id) is distinct from 'Sí' then
    raise exception 'F1: la pregunta cambió sin permiso';
  end if;
end $$;
rollback;

-- @test web faqs: con el permiso se escribe, y la versión vieja no escribe (F2)
begin;
do $$
declare
  v_editor uuid := pg_temp.wf_persona(array['web.contenido.gestionar']);
  v_id uuid;
  v jsonb;
  v_vieja timestamptz;
begin
  v := pg_temp.wf_corre(v_editor, 'insert into public.web_faqs (pregunta, respuesta, orden) values (''¿Hay garantía?'', ''Sí'', 3) returning id');
  v_id := (v ->> 'v')::uuid;
  if v_id is null then
    raise exception 'F2 crear: dio %', v;
  end if;
  if (select publicada from public.web_faqs where id = v_id) then
    raise exception 'F2: una pregunta nueva debe nacer sin publicar';
  end if;
  -- now() no cambia dentro de una transacción: la versión se lleva al pasado para ver si algo escribió.
  alter table public.web_faqs disable trigger trg_actualizado_en;
  update public.web_faqs set actualizado_en = '2020-01-01T00:00:00Z' where id = v_id;
  alter table public.web_faqs enable trigger trg_actualizado_en;
  v_vieja := '2019-01-01T00:00:00Z';
  if (pg_temp.wf_corre(v_editor, format(
    'update public.web_faqs set respuesta = ''Tarde'' where id = %L and actualizado_en = %L returning id', v_id, v_vieja)) ->> 'v') is not null then
    raise exception 'F2: una versión vieja escribió';
  end if;
  v := pg_temp.wf_corre(v_editor, format(
    'update public.web_faqs set respuesta = ''Claro'', publicada = true where id = %L and actualizado_en = %L returning id',
    v_id, (select actualizado_en from public.web_faqs where id = v_id)));
  if v ->> 'v' is null or (select respuesta from public.web_faqs where id = v_id) is distinct from 'Claro' then
    raise exception 'F2 editar: dio %', v;
  end if;
  if (pg_temp.wf_corre(v_editor, format('delete from public.web_faqs where id = %L returning id', v_id)) ->> 'v') is null then
    raise exception 'F2 borrar: no borró';
  end if;
end $$;
rollback;

-- @test web faqs: quien tiene sesión lee todas; anon sólo lo publicado y por la vista (F3, F4)
begin;
do $$
declare
  v_nadie uuid := pg_temp.wf_persona(array[]::text[]);
  v_n int;
  v_e text;
begin
  delete from public.web_faqs;
  insert into public.web_faqs (pregunta, respuesta, categoria, publicada, orden) values ('Publicada', 'R1', 'Envíos', true, 1);
  insert into public.web_faqs (pregunta, respuesta, publicada, orden) values ('Borrador', 'R2', false, 2);
  if (pg_temp.wf_corre(v_nadie, 'select count(*) from public.web_faqs') ->> 'v')::int <> 2 then
    raise exception 'F3: quien tiene sesión debe leer las dos';
  end if;
  set local role anon;
  select count(*) into v_n from web.faqs;
  if v_n <> 1 or (select pregunta from web.faqs) is distinct from 'Publicada' then
    raise exception 'F4: web.faqs debe traer sólo la publicada (trajo %)', v_n;
  end if;
  begin
    perform 1 from public.web_faqs limit 1;
    raise exception 'F4: anon leyó public.web_faqs';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'select id from web.faqs limit 1';
    raise exception 'F4: web.faqs expone id';
  exception when undefined_column then
    null;
  end;
  begin
    execute 'select publicada from web.faqs limit 1';
    raise exception 'F4: web.faqs expone publicada';
  exception when undefined_column then
    null;
  end;
  reset role;
end $$;
rollback;
