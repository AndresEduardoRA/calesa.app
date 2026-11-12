-- Los permisos de los testimonios (8.02-2, C12 y C15; sin migración). No depende de otro archivo (`SOLO=areas/web/testimonios-permisos.sql`).
-- Cada bloque abre su transacción y la revierte. Lo del consentimiento (RPC, trigger, versiones) ya lo prueba `testimonios-consentimiento.sql`.
--
-- Qué asegura:
--   P1. Sin web.contenido.gestionar: crear da 42501; no lee ninguna fila; editar y borrar uno que existe no tocan ninguna fila (la RLS la deja en cero).
--   P2. Con web.contenido.gestionar: crea (sin publicar y sin consentimiento), edita con la versión esperada y borra; con una versión vieja, el update
--       no toca ninguna fila; `lead_id` y `consent_*` no se escriben directo (42501).
--   P3. anon no lee public.web_testimonios (sin grant) y web.testimonios no trae lo no publicado ni expone `id`.

create or replace function pg_temp.wtp_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-wtp@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wtp_' || substr(v_id::text, 1, 8), 'WTP ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{v: <resultado>}` o `{error, mensaje, hint}`. Un `returning`/`select` sin filas da `v` nulo.
create or replace function pg_temp.wtp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.wtp_es(p_que text, p_r jsonb, p_estado text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado then
    raise exception '%: se esperaba % y dio %', p_que, p_estado, p_r;
  end if;
end $f$;

-- @test web testimonios: sin el permiso no se lee, no se crea, no se edita y no se borra (P1)
begin;
do $$
declare
  v_nadie uuid := pg_temp.wtp_persona(array[]::text[]);
  v_id uuid;
begin
  insert into public.web_testimonios (cliente, texto) values ('Ana', 'Todo bien') returning id into v_id;
  perform pg_temp.wtp_es('P1 crear', pg_temp.wtp_corre(v_nadie,
    'insert into public.web_testimonios (cliente, texto) values (''Luis'', ''Muy bien'') returning id'), '42501');
  if (pg_temp.wtp_corre(v_nadie, 'select id from public.web_testimonios limit 1') ->> 'v') is not null then
    raise exception 'P1 leer: alguien sin permiso leyó testimonios';
  end if;
  if (pg_temp.wtp_corre(v_nadie, format('update public.web_testimonios set texto = ''No'' where id = %L returning id', v_id)) ->> 'v') is not null then
    raise exception 'P1 editar: alguien sin permiso editó el testimonio';
  end if;
  if (pg_temp.wtp_corre(v_nadie, format('delete from public.web_testimonios where id = %L returning id', v_id)) ->> 'v') is not null then
    raise exception 'P1 borrar: alguien sin permiso borró el testimonio';
  end if;
  if (select texto from public.web_testimonios where id = v_id) is distinct from 'Todo bien' then
    raise exception 'P1: el testimonio cambió sin permiso';
  end if;
end $$;
rollback;

-- @test web testimonios: con el permiso se escribe, la versión vieja no escribe y el consentimiento no se escribe directo (P2)
begin;
do $$
declare
  v_editor uuid := pg_temp.wtp_persona(array['web.contenido.gestionar']);
  v_id uuid;
  v jsonb;
begin
  v := pg_temp.wtp_corre(v_editor, 'insert into public.web_testimonios (cliente, texto, orden) values (''Ana'', ''Todo bien'', 3) returning id');
  v_id := (v ->> 'v')::uuid;
  if v_id is null then
    raise exception 'P2 crear: dio %', v;
  end if;
  if (select publicado from public.web_testimonios where id = v_id) or (select consent_por from public.web_testimonios where id = v_id) is not null then
    raise exception 'P2: un testimonio nuevo debe nacer sin publicar y sin consentimiento';
  end if;
  -- now() no cambia dentro de una transacción: la versión se lleva al pasado para ver si algo escribió.
  alter table public.web_testimonios disable trigger trg_actualizado_en;
  update public.web_testimonios set actualizado_en = '2020-01-01T00:00:00Z' where id = v_id;
  alter table public.web_testimonios enable trigger trg_actualizado_en;
  if (pg_temp.wtp_corre(v_editor, format(
    'update public.web_testimonios set ciudad = ''Tarde'' where id = %L and actualizado_en = %L returning id', v_id, '2019-01-01T00:00:00Z')) ->> 'v') is not null then
    raise exception 'P2: una versión vieja escribió';
  end if;
  v := pg_temp.wtp_corre(v_editor, format(
    'update public.web_testimonios set ciudad = ''Cochabamba'' where id = %L and actualizado_en = %L returning id',
    v_id, (select actualizado_en from public.web_testimonios where id = v_id)));
  if v ->> 'v' is null or (select ciudad from public.web_testimonios where id = v_id) is distinct from 'Cochabamba' then
    raise exception 'P2 editar: dio %', v;
  end if;
  perform pg_temp.wtp_es('P2 consent_por directo', pg_temp.wtp_corre(v_editor,
    format('update public.web_testimonios set consent_por = %L where id = %L returning id', v_editor, v_id)), '42501');
  perform pg_temp.wtp_es('P2 consent_en directo', pg_temp.wtp_corre(v_editor,
    format('update public.web_testimonios set consent_canal = ''x'' where id = %L returning id', v_id)), '42501');
  if (pg_temp.wtp_corre(v_editor, format('delete from public.web_testimonios where id = %L returning id', v_id)) ->> 'v') is null then
    raise exception 'P2 borrar: no borró';
  end if;
end $$;
rollback;

-- @test web testimonios: anon no lee la tabla; la vista sólo trae lo publicado con consentimiento y sin id (P3)
begin;
do $$
declare
  v_n int;
  v_persona uuid := pg_temp.wtp_persona(array[]::text[]);
begin
  delete from public.web_testimonios;
  insert into public.web_testimonios (cliente, texto, orden) values ('Sin consentimiento', 'R1', 1);
  insert into public.web_testimonios (cliente, texto, ciudad, orden, consent_por, consent_en, consent_canal, consent_ciudad)
    values ('Con consentimiento', 'R2', 'La Paz', 2, v_persona, now(), 'WhatsApp', true);
  update public.web_testimonios set publicado = true where cliente = 'Con consentimiento';
  set local role anon;
  select count(*) into v_n from web.testimonios;
  if v_n <> 1 or (select cliente from web.testimonios) is distinct from 'Con consentimiento' then
    raise exception 'P3: web.testimonios debe traer sólo el publicado con consentimiento (trajo %)', v_n;
  end if;
  begin
    perform 1 from public.web_testimonios limit 1;
    raise exception 'P3: anon leyó public.web_testimonios';
  exception when insufficient_privilege then
    null;
  end;
  begin
    execute 'select id from web.testimonios limit 1';
    raise exception 'P3: web.testimonios expone id';
  exception when undefined_column then
    null;
  end;
  reset role;
end $$;
rollback;
