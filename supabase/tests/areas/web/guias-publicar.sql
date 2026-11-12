-- Guías: publicar exige su permiso y el cuerpo sale del documento (8.01-1, C6–C8 y V10). No depende de otro archivo
-- (`SOLO=areas/web/guias-publicar.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   G1. Con web.contenido.gestionar y sin web.guias.publicar: crear publicada, publicar y despublicar dan 42501; con la clave, pasa.
--   G2. Crear con documento deriva cuerpo_html y minutos_lectura; un `update … set cuerpo_html = '<script>…'` como authenticated deja el
--       derivado, y `web.guias` (como anon) trae el derivado.
--   G3. Un documento con `javascript:` da 22023 y la guía no cambia.
--   G4. Una guía de antes (sin documento, con HTML escrito con el trigger apagado) conserva su HTML al cambiar `orden` (D8); publicarla
--       recalcula desde el documento (nulo → '').
--   G5. storage_refcount('web', ruta) cuenta una imagen del cuerpo y deja de contarla al quitarla.

create or replace function pg_temp.wg_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-wg@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wg_' || substr(v_id::text, 1, 8), 'WG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{ok: true}` o `{error, mensaje, hint}`.
create or replace function pg_temp.wg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return '{"ok": true}'::jsonb;
end $f$;

create or replace function pg_temp.wg_doc(p_texto text) returns jsonb language sql as $f$
  select jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content',
    jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_texto)))));
$f$;

-- @test web guías: publicar o despublicar sin web.guias.publicar da 42501; con la clave, pasa (G1)
begin;
do $$
declare
  v_editor uuid := pg_temp.wg_persona(array['web.contenido.gestionar']);
  v_publica uuid := pg_temp.wg_persona(array['web.contenido.gestionar', 'web.guias.publicar']);
  v_id uuid;
  v jsonb;
begin
  v := pg_temp.wg_corre(v_editor, format(
    'insert into public.web_guias (slug, titulo, creado_por, publicada_en) values (%L, %L, %L, now())', 'g1-a', 'G1 a', v_editor));
  if v ->> 'error' is distinct from '42501' then
    raise exception 'G1: crear publicada sin web.guias.publicar dio %', v;
  end if;
  v := pg_temp.wg_corre(v_editor, format(
    'insert into public.web_guias (slug, titulo, creado_por) values (%L, %L, %L)', 'g1-b', 'G1 b', v_editor));
  if v ->> 'ok' is null then
    raise exception 'G1: crear despublicada con web.contenido.gestionar dio %', v;
  end if;
  select id into v_id from public.web_guias where slug = 'g1-b';
  v := pg_temp.wg_corre(v_editor, format('update public.web_guias set publicada_en = now() where id = %L', v_id));
  if v ->> 'error' is distinct from '42501' then
    raise exception 'G1: publicar sin web.guias.publicar dio %', v;
  end if;
  v := pg_temp.wg_corre(v_publica, format('update public.web_guias set publicada_en = now() where id = %L', v_id));
  if v ->> 'ok' is null or (select publicada_en from public.web_guias where id = v_id) is null then
    raise exception 'G1: publicar con web.guias.publicar dio %', v;
  end if;
  v := pg_temp.wg_corre(v_editor, format('update public.web_guias set publicada_en = null where id = %L', v_id));
  if v ->> 'error' is distinct from '42501' or (select publicada_en from public.web_guias where id = v_id) is null then
    raise exception 'G1: despublicar sin web.guias.publicar dio %', v;
  end if;
end $$;
rollback;

-- @test web guías: el cuerpo sale del documento y un cuerpo_html escrito a mano se pisa (G2, G3)
begin;
do $$
declare
  v_publica uuid := pg_temp.wg_persona(array['web.contenido.gestionar', 'web.guias.publicar']);
  v_id uuid;
  v jsonb;
  v_antes timestamptz;
begin
  v := pg_temp.wg_corre(v_publica, format(
    'insert into public.web_guias (slug, titulo, creado_por, cuerpo_doc, publicada_en) values (%L, %L, %L, %L, now() - interval ''1 minute'')',
    'g2', 'G2', v_publica, pg_temp.wg_doc('Hola <b>mundo</b>')));
  if v ->> 'ok' is null then
    raise exception 'G2: crear con documento dio %', v;
  end if;
  select id into v_id from public.web_guias where slug = 'g2';
  if (select cuerpo_html from public.web_guias where id = v_id) is distinct from '<p>Hola &lt;b&gt;mundo&lt;/b&gt;</p>'
     or (select minutos_lectura from public.web_guias where id = v_id) is distinct from 1::smallint then
    raise exception 'G2: el cuerpo derivado es % (% min)', (select cuerpo_html from public.web_guias where id = v_id),
      (select minutos_lectura from public.web_guias where id = v_id);
  end if;
  v := pg_temp.wg_corre(v_publica, format(
    'update public.web_guias set cuerpo_html = %L, minutos_lectura = 99 where id = %L', '<script>alert(1)</script>', v_id));
  if v ->> 'ok' is null or (select cuerpo_html from public.web_guias where id = v_id) is distinct from '<p>Hola &lt;b&gt;mundo&lt;/b&gt;</p>'
     or (select minutos_lectura from public.web_guias where id = v_id) is distinct from 1::smallint then
    raise exception 'G2: un cuerpo_html escrito a mano quedó: % (%)', (select cuerpo_html from public.web_guias where id = v_id), v;
  end if;
  set local role anon;
  if (select cuerpo_html from web.guias where slug = 'g2') is distinct from '<p>Hola &lt;b&gt;mundo&lt;/b&gt;</p>' then
    raise exception 'G2: web.guias no trae el derivado';
  end if;
  reset role;

  select actualizado_en into v_antes from public.web_guias where id = v_id;
  v := pg_temp.wg_corre(v_publica, format('update public.web_guias set cuerpo_doc = %L where id = %L',
    '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "link", "attrs": {"href": "javascript:alert(1)"}}]}]}]}',
    v_id));
  if v ->> 'error' is distinct from '22023' or v ->> 'hint' is distinct from 'doc'
     or (select cuerpo_doc from public.web_guias where id = v_id) is distinct from pg_temp.wg_doc('Hola <b>mundo</b>') then
    raise exception 'G3: un documento con javascript: dio % y la guía cambió', v;
  end if;
end $$;
rollback;

-- @test web guías: una guía de antes conserva su HTML hasta que se escribe el cuerpo; publicarla lo recalcula (G4)
begin;
alter table public.web_guias disable trigger trg_web_guia_cuerpo;
insert into public.web_guias (slug, titulo, cuerpo_html, minutos_lectura) values ('g4', 'G4', '<p>de antes</p>', 3);
alter table public.web_guias enable trigger trg_web_guia_cuerpo;
do $$
declare v_publica uuid := pg_temp.wg_persona(array['web.contenido.gestionar', 'web.guias.publicar']); v jsonb;
begin
  v := pg_temp.wg_corre(v_publica, 'update public.web_guias set orden = 5 where slug = ''g4''');
  if v ->> 'ok' is null or (select cuerpo_html from public.web_guias where slug = 'g4') is distinct from '<p>de antes</p>'
     or (select minutos_lectura from public.web_guias where slug = 'g4') is distinct from 3::smallint then
    raise exception 'G4: cambiar el orden no conservó el HTML de antes: % (%)', (select cuerpo_html from public.web_guias where slug = 'g4'), v;
  end if;
  v := pg_temp.wg_corre(v_publica, 'update public.web_guias set publicada_en = now() where slug = ''g4''');
  if v ->> 'ok' is null or (select cuerpo_html from public.web_guias where slug = 'g4') is distinct from ''
     or (select minutos_lectura from public.web_guias where slug = 'g4') is not null then
    raise exception 'G4: publicar no recalculó el cuerpo desde el documento: % (%)', (select cuerpo_html from public.web_guias where slug = 'g4'), v;
  end if;
end $$;
rollback;

-- @test web guías: storage_refcount cuenta las imágenes del cuerpo (G5)
begin;
do $$
declare
  v_publica uuid := pg_temp.wg_persona(array['web.contenido.gestionar']);
  v_con jsonb := '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "a"}]}, {"type": "image", "attrs": {"ruta": "guias/g5.webp"}}]}';
  v jsonb;
begin
  v := pg_temp.wg_corre(v_publica, format('insert into public.web_guias (slug, titulo, creado_por, cuerpo_doc) values (%L, %L, %L, %L)',
    'g5', 'G5', v_publica, v_con));
  if v ->> 'ok' is null or public.storage_refcount('web', 'guias/g5.webp') <> 1 or public.storage_refcount('web', 'guias/otra.webp') <> 0
     or public.storage_refcount('vehiculos', 'guias/g5.webp') <> 0 then
    raise exception 'G5: la imagen del cuerpo dio refcount % (%)', public.storage_refcount('web', 'guias/g5.webp'), v;
  end if;
  update public.web_guias set cuerpo_doc = pg_temp.wg_doc('a') where slug = 'g5';
  if public.storage_refcount('web', 'guias/g5.webp') <> 0 then
    raise exception 'G5: quitada del cuerpo, la imagen sigue contando %', public.storage_refcount('web', 'guias/g5.webp');
  end if;
end $$;
rollback;
