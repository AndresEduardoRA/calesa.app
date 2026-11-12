-- Guardar los ajustes de la web por RPC (8.01-1, C9–C12). No depende de otro archivo (`SOLO=areas/web/ajustes-guardar.sql`). Cada bloque
-- abre su transacción y la revierte.
--
-- Qué asegura:
--   A1. Sin permisos, cualquier clave da 42501 y nada cambia.
--   A2. Sólo con web.cola.gestionar: el ttl pasa y mueve la versión; lema y ttl juntos dan 42501 y no cambia ni el ttl.
--   A3. Con web.ajustes.gestionar cambia el sitio y la cola, y queda quién lo hizo.
--   A4. Versión vieja: PT409 y nada cambia; sin versión, error.
--   A5. Origen inexistente, red desconocida, red con http://, clave de SEO desconocida, clave raíz desconocida y ttl 4 dan 22023 con la clave en
--       hint; los orígenes repetidos se guardan una vez.
--   A6. Legales: un `<script>` en el texto llega a `web.ajustes` (como anon) escapado; una imagen da 22023; mismo título y documento no cambian
--       nada (misma versión y mismo actualizado_en de la clave); null quita la clave.
--   A7. Como authenticated con web.ajustes.gestionar, un `update` directo de ajustes_web da 42501.
--   A8. Como service_role (o postgres), el `html` que llega en legales se pisa con el derivado; un legales heredado con html ajeno se rehace
--       con la validación de la migración.
--   A9. Sin cambios devuelve la misma versión sin escribir.

create or replace function pg_temp.wa_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-wa@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wa_' || substr(v_id::text, 1, 8), 'WA ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): `{v: <resultado>}` o `{error, mensaje, hint}`.
create or replace function pg_temp.wa_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Guarda con la versión vigente (o la dada).
create or replace function pg_temp.wa_guardar(p_quien uuid, p_cambios jsonb, p_esperada timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.wa_corre(p_quien, format('select public.web_ajustes_guardar(%L, %L)::text',
    coalesce(p_esperada, (select actualizado_en from public.ajustes_web where id = 1)), p_cambios));
$f$;

create or replace function pg_temp.wa_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: se esperaba % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- now() no cambia dentro de una transacción: para ver si algo escribió, la versión y la fecha de cada legal se llevan al pasado.
create or replace function pg_temp.wa_envejecer() returns void language plpgsql as $f$
begin
  alter table public.ajustes_web disable trigger trg_actualizado_en;
  alter table public.ajustes_web disable trigger trg_web_ajustes_legales;
  update public.ajustes_web set actualizado_en = '2020-01-01T00:00:00Z',
    legales = coalesce((select jsonb_object_agg(e.key, e.value || '{"actualizado_en": "2020-01-01T00:00:00+00:00"}') from jsonb_each(legales) e), '{}')
   where id = 1;
  alter table public.ajustes_web enable trigger trg_web_ajustes_legales;
  alter table public.ajustes_web enable trigger trg_actualizado_en;
end $f$;

create or replace function pg_temp.wa_doc(p_texto text) returns jsonb language sql as $f$
  select jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content',
    jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_texto)))));
$f$;

-- @test web ajustes: sin permiso 42501; sólo con la cola, la política y nada más; con ajustes, todo (A1–A3)
begin;
do $$
declare
  v_nadie uuid := pg_temp.wa_persona(array[]::text[]);
  v_cola uuid := pg_temp.wa_persona(array['web.cola.gestionar']);
  v_ajustes uuid := pg_temp.wa_persona(array['web.ajustes.gestionar']);
  v_antes public.ajustes_web;
  v jsonb;
begin
  select * into v_antes from public.ajustes_web where id = 1;
  perform pg_temp.wa_es('A1 lema', pg_temp.wa_guardar(v_nadie, '{"lema": "x"}'), '42501');
  perform pg_temp.wa_es('A1 ttl', pg_temp.wa_guardar(v_nadie, '{"ttl_contacto_minutos": 45}'), '42501');
  if (select a from public.ajustes_web a where id = 1) is distinct from v_antes then
    raise exception 'A1: sin permiso cambió la fila';
  end if;

  v := pg_temp.wa_guardar(v_cola, '{"ttl_contacto_minutos": 45, "cola_activa": false}');
  if v ->> 'v' is null or (select ttl_contacto_minutos from public.ajustes_web where id = 1) <> 45
     or (select cola_activa from public.ajustes_web where id = 1) or (v ->> 'v')::timestamptz = v_antes.actualizado_en then
    raise exception 'A2: sólo con web.cola.gestionar, la política dio % y no cambió', v;
  end if;
  perform pg_temp.wa_es('A2 lema y ttl', pg_temp.wa_guardar(v_cola, '{"lema": "x", "ttl_contacto_minutos": 60}'), '42501');
  if (select ttl_contacto_minutos from public.ajustes_web where id = 1) <> 45 or (select lema from public.ajustes_web where id = 1) is not null then
    raise exception 'A2: con lema y ttl sin web.ajustes.gestionar cambió algo';
  end if;

  v := pg_temp.wa_guardar(v_ajustes, '{"lema": "  Autos que llegan  ", "max_intentos": 5, "direccion_publica": "https://autos.ejemplo.com"}');
  if v ->> 'v' is null or (select lema from public.ajustes_web where id = 1) is distinct from 'Autos que llegan'
     or (select max_intentos from public.ajustes_web where id = 1) <> 5
     or (select direccion_publica from public.ajustes_web where id = 1) is distinct from 'https://autos.ejemplo.com'
     or (select actualizado_por from public.ajustes_web where id = 1) is distinct from v_ajustes then
    raise exception 'A3: con web.ajustes.gestionar dio % y no cambió sitio y cola', v;
  end if;
end $$;
rollback;

-- @test web ajustes: versión vieja PT409; sin versión, error; sin cambios, la misma versión (A4, A9)
begin;
do $$
declare
  v_ajustes uuid := pg_temp.wa_persona(array['web.ajustes.gestionar']);
  v_vieja timestamptz := (select actualizado_en from public.ajustes_web where id = 1);
  v jsonb;
begin
  v := pg_temp.wa_guardar(v_ajustes, '{"lema": "uno"}');
  perform pg_temp.wa_es('A4 vieja', pg_temp.wa_guardar(v_ajustes, '{"lema": "dos"}', v_vieja), 'PT409');
  if (select lema from public.ajustes_web where id = 1) is distinct from 'uno' then
    raise exception 'A4: con la versión vieja cambió el lema';
  end if;
  v := pg_temp.wa_corre(v_ajustes, 'select public.web_ajustes_guardar(null, ''{"lema": "tres"}'')::text');
  if v ->> 'error' is null or (select lema from public.ajustes_web where id = 1) is distinct from 'uno' then
    raise exception 'A4: sin versión dio %', v;
  end if;
  perform pg_temp.wa_envejecer();
  v_vieja := (select actualizado_en from public.ajustes_web where id = 1);
  v := pg_temp.wa_guardar(v_ajustes, '{"lema": "uno", "cola_activa": true}');
  if (v ->> 'v')::timestamptz is distinct from v_vieja or (select actualizado_en from public.ajustes_web where id = 1) is distinct from v_vieja then
    raise exception 'A9: sin cambios movió la versión (%)', v;
  end if;
end $$;
rollback;

-- @test web ajustes: las validaciones dan 22023 con la clave en hint; orígenes sin repetir (A5)
begin;
do $$
declare
  v_ajustes uuid := pg_temp.wa_persona(array['web.ajustes.gestionar']);
  v_o uuid := (select id from public.origenes order by clave limit 1);
  v jsonb;
begin
  perform pg_temp.wa_es('A5 origen', pg_temp.wa_guardar(v_ajustes, jsonb_build_object('origenes_visibles', jsonb_build_array(gen_random_uuid()))),
    '22023', 'origenes_visibles');
  perform pg_temp.wa_es('A5 origen texto', pg_temp.wa_guardar(v_ajustes, '{"origenes_visibles": ["no-es-uuid"]}'), '22023', 'origenes_visibles');
  perform pg_temp.wa_es('A5 red', pg_temp.wa_guardar(v_ajustes, '{"redes": {"myspace": "https://a.com"}}'), '22023', 'redes');
  perform pg_temp.wa_es('A5 http', pg_temp.wa_guardar(v_ajustes, '{"redes": {"facebook": "http://a.com"}}'), '22023', 'redes');
  perform pg_temp.wa_es('A5 seo', pg_temp.wa_guardar(v_ajustes, '{"seo": {"palabras": "x"}}'), '22023', 'seo');
  perform pg_temp.wa_es('A5 raíz', pg_temp.wa_guardar(v_ajustes, '{"actualizado_por": null}'), '22023', 'actualizado_por');
  perform pg_temp.wa_es('A5 ttl', pg_temp.wa_guardar(v_ajustes, '{"ttl_contacto_minutos": 4}'), '22023', 'ttl_contacto_minutos');
  perform pg_temp.wa_es('A5 whatsapp', pg_temp.wa_guardar(v_ajustes, '{"whatsapp_respaldo": "70000000"}'), '22023', 'whatsapp_respaldo');
  perform pg_temp.wa_es('A5 dirección', pg_temp.wa_guardar(v_ajustes, '{"direccion_publica": "http://a.com"}'), '22023', 'direccion_publica');
  v := pg_temp.wa_guardar(v_ajustes, jsonb_build_object('origenes_visibles', jsonb_build_array(v_o, v_o),
    'redes', jsonb_build_object('instagram', ' https://instagram.com/x ', 'x', null), 'seo', '{"titulo": "Autos"}'::jsonb));
  if v ->> 'v' is null or (select origenes_visibles from public.ajustes_web where id = 1) <> array[v_o]
     or (select redes from public.ajustes_web where id = 1) <> '{"instagram": "https://instagram.com/x"}'::jsonb
     or (select seo from public.ajustes_web where id = 1) <> '{"titulo": "Autos"}'::jsonb then
    raise exception 'A5: orígenes, redes y seo válidos dieron % y quedaron %', v, (select to_jsonb(a) from public.ajustes_web a where id = 1);
  end if;
end $$;
rollback;

-- @test web ajustes: legales con su html derivado; imagen 22023; mismo título y documento no cambian; null quita (A6)
begin;
do $$
declare
  v_ajustes uuid := pg_temp.wa_persona(array['web.ajustes.gestionar']);
  v jsonb;
  v_version timestamptz;
  v_clave_en text;
begin
  v := pg_temp.wa_guardar(v_ajustes, jsonb_build_object('legales', jsonb_build_object('terminos',
    jsonb_build_object('titulo', ' Términos ', 'doc', pg_temp.wa_doc('<script>alert(1)</script>')))));
  if v ->> 'v' is null then
    raise exception 'A6: guardar legales dio %', v;
  end if;
  set local role anon;
  if (select legales -> 'terminos' ->> 'html' from web.ajustes) is distinct from '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>'
     or (select legales -> 'terminos' ->> 'titulo' from web.ajustes) is distinct from 'Términos' then
    raise exception 'A6: web.ajustes trae %', (select legales from web.ajustes);
  end if;
  reset role;
  perform pg_temp.wa_es('A6 imagen', pg_temp.wa_guardar(v_ajustes, jsonb_build_object('legales', jsonb_build_object('privacidad',
    jsonb_build_object('titulo', 'Privacidad', 'doc', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x"}]}, {"type": "image", "attrs": {"ruta": "a.png"}}]}'::jsonb)))),
    '22023', 'legales');
  perform pg_temp.wa_es('A6 vacío', pg_temp.wa_guardar(v_ajustes, jsonb_build_object('legales', jsonb_build_object('privacidad',
    jsonb_build_object('titulo', 'Privacidad', 'doc', '{"type": "doc", "content": [{"type": "paragraph"}]}'::jsonb)))), '22023', 'legales');
  perform pg_temp.wa_es('A6 javascript', pg_temp.wa_guardar(v_ajustes, jsonb_build_object('legales', jsonb_build_object('privacidad',
    jsonb_build_object('titulo', 'Privacidad', 'doc', '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "x", "marks": [{"type": "link", "attrs": {"href": "javascript:x"}}]}]}]}'::jsonb)))),
    '22023', 'legales');
  perform pg_temp.wa_es('A6 clave', pg_temp.wa_guardar(v_ajustes, '{"legales": {"cookies": null}}'), '22023', 'legales');

  perform pg_temp.wa_envejecer();
  v_version := (select actualizado_en from public.ajustes_web where id = 1);
  v_clave_en := (select legales -> 'terminos' ->> 'actualizado_en' from public.ajustes_web where id = 1);
  v := pg_temp.wa_guardar(v_ajustes, jsonb_build_object('legales', jsonb_build_object('terminos',
    jsonb_build_object('titulo', 'Términos', 'doc', pg_temp.wa_doc('<script>alert(1)</script>')))));
  if (v ->> 'v')::timestamptz is distinct from v_version
     or (select legales -> 'terminos' ->> 'actualizado_en' from public.ajustes_web where id = 1) is distinct from v_clave_en then
    raise exception 'A6: mismo título y documento movieron la versión o la fecha de la clave (%)', v;
  end if;
  -- Otro documento en la misma clave sí la cambia: fecha nueva.
  v := pg_temp.wa_guardar(v_ajustes, jsonb_build_object('legales', jsonb_build_object('terminos',
    jsonb_build_object('titulo', 'Términos', 'doc', pg_temp.wa_doc('otro')))));
  if (v ->> 'v')::timestamptz = v_version
     or (select legales -> 'terminos' ->> 'actualizado_en' from public.ajustes_web where id = 1) = v_clave_en then
    raise exception 'A6: otro documento no movió la versión ni la fecha de la clave (%)', v;
  end if;
  v := pg_temp.wa_guardar(v_ajustes, '{"legales": {"terminos": null}}');
  if v ->> 'v' is null or (select legales from public.ajustes_web where id = 1) <> '{}'::jsonb then
    raise exception 'A6: null no quitó la clave (%)', v;
  end if;
end $$;
rollback;

-- @test web ajustes: authenticated no escribe la fila directo; el html de legales se pisa escriba quien escriba (A7, A8)
begin;
do $$
declare
  v_ajustes uuid := pg_temp.wa_persona(array['web.ajustes.gestionar']);
  v jsonb;
begin
  v := pg_temp.wa_corre(v_ajustes, 'update public.ajustes_web set lema = ''directo'' where id = 1 returning lema');
  if v ->> 'error' is distinct from '42501' or (select lema from public.ajustes_web where id = 1) is not distinct from 'directo' then
    raise exception 'A7: el update directo como authenticated dio %', v;
  end if;

  set local role service_role;
  update public.ajustes_web set legales = jsonb_build_object('terminos', jsonb_build_object('titulo', 'T', 'doc', pg_temp.wa_doc('hola'),
    'html', '<script>x</script>', 'actualizado_en', '2000-01-01')) where id = 1;
  reset role;
  if (select legales -> 'terminos' ->> 'html' from public.ajustes_web where id = 1) is distinct from '<p>hola</p>'
     or (select legales -> 'terminos' ->> 'actualizado_en' from public.ajustes_web where id = 1) = '2000-01-01' then
    raise exception 'A8: el html o la fecha que escribió service_role quedaron: %', (select legales from public.ajustes_web where id = 1);
  end if;
  begin
    update public.ajustes_web set legales = '{"terminos": {"titulo": "T", "html": "<script>x</script>"}}' where id = 1;
    raise exception 'A8: un legales sin documento se guardó';
  exception when sqlstate '22023' then
    null;
  end;
end $$;
rollback;

-- @test web ajustes: un legales heredado con html ajeno se rehace con la validación de la migración (A8)
begin;
alter table public.ajustes_web disable trigger trg_web_ajustes_legales;
update public.ajustes_web set legales = jsonb_build_object('privacidad', jsonb_build_object('titulo', 'P',
  'doc', pg_temp.wa_doc('texto'), 'html', '<img src=x onerror=alert(1)>')) where id = 1;
alter table public.ajustes_web enable trigger trg_web_ajustes_legales;
do $$
begin
  update public.ajustes_web set legales = public._web_legales_validar(legales, legales);
  if (select legales -> 'privacidad' ->> 'html' from public.ajustes_web where id = 1) is distinct from '<p>texto</p>' then
    raise exception 'A8: la validación de la migración no rehízo el html heredado: %', (select legales from public.ajustes_web where id = 1);
  end if;
end $$;
rollback;
