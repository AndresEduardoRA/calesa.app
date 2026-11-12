-- El documento del sitio en la base (8.01-1, C1–C4, C7): `_web_doc_html()` y `_web_doc_minutos()`. La tabla de casos completa la corre
-- `src/modules/web/entities/contenido/doc.test.ts` contra estas mismas funciones (PGlite); aquí, lo que nunca puede salir en el HTML,
-- los minutos y que ningún rol de la app las ejecuta. No depende de otro archivo (`SOLO=areas/web/doc-html.sql`); no escribe nada.
--
-- Qué asegura:
--   D1. Un `<script>` en el texto sale escapado; un nodo `html` o `script`, un enlace `javascript:` (también en mayúsculas o con un tab)
--       o con espacio delante, y una imagen de otro host, con `//`, con `..` o con `src` se rechazan con 22023 hint `doc`.
--   D2. La imagen válida sale `<img data-ruta=… alt="">`; título 1 y más de 100 KB se rechazan con su motivo.
--   D3. Minutos: nulo y sin palabras → nulo; 200 palabras → 1; 201 → 2.
--   D4. `anon` y `authenticated` no ejecutan ninguna función `_web_doc%` ni `_web_html_escapar`, ni los ayudantes de los ajustes ni las tres
--       funciones de trigger de 8.01-1.

create or replace function pg_temp.dh_html(p_doc jsonb) returns jsonb language plpgsql as $f$
declare v text; v_m text; v_e text; v_h text;
begin
  v := public._web_doc_html(p_doc);
  return jsonb_build_object('html', v);
exception when others then
  get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
  return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
end $f$;

create or replace function pg_temp.dh_con_enlace(p_href text) returns jsonb language sql as $f$
  select jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content',
    jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'aquí', 'marks',
      jsonb_build_array(jsonb_build_object('type', 'link', 'attrs', jsonb_build_object('href', p_href))))))));
$f$;

create or replace function pg_temp.dh_con_imagen(p_attrs jsonb) returns jsonb language sql as $f$
  select jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', p_attrs)));
$f$;

-- @test web doc: un script sale escapado; nodos, enlaces e imágenes fuera de la lista se rechazan (D1)
do $$
declare
  v jsonb;
  d jsonb;
begin
  v := pg_temp.dh_html('{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "<script>alert(1)</script>"}]}]}');
  if v ->> 'html' is distinct from '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>' or v ->> 'html' ~* '<script' then
    raise exception 'D1: el script no salió escapado: %', v;
  end if;
  foreach d in array array[
    '{"type": "doc", "content": [{"type": "html", "content": []}]}'::jsonb,
    '{"type": "doc", "content": [{"type": "script", "content": [{"type": "text", "text": "x"}]}]}'::jsonb,
    pg_temp.dh_con_enlace('javascript:alert(1)'), pg_temp.dh_con_enlace('JaVaScRiPt:alert(1)'),
    pg_temp.dh_con_enlace(E'\tjavascript:alert(1)'), pg_temp.dh_con_enlace(' https://a.com'),
    pg_temp.dh_con_imagen('{"ruta": "https://otro.host/x.png"}'), pg_temp.dh_con_imagen('{"ruta": "//otro.host/x.png"}'),
    pg_temp.dh_con_imagen('{"ruta": "../x.png"}'), pg_temp.dh_con_imagen('{"src": "a/b.webp"}')] loop
    v := pg_temp.dh_html(d);
    if v ->> 'error' is distinct from '22023' or v ->> 'hint' is distinct from 'doc' then
      raise exception 'D1: % debía rechazarse con 22023 hint doc y dio %', d, v;
    end if;
  end loop;
end $$;

-- @test web doc: la imagen del bucket sale con data-ruta; título 1 y más de 100 KB se rechazan con su motivo (D2)
do $$
declare v jsonb;
begin
  v := pg_temp.dh_html(pg_temp.dh_con_imagen('{"ruta": "a/b.webp"}'));
  if v ->> 'html' is distinct from '<img data-ruta="a/b.webp" alt="">' then
    raise exception 'D2: la imagen válida dio %', v;
  end if;
  v := pg_temp.dh_html('{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "x"}]}]}');
  if v ->> 'mensaje' is distinct from 'El documento tiene un formato que no se admite.' then
    raise exception 'D2: el título 1 dio %', v;
  end if;
  v := pg_temp.dh_html(jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content',
    jsonb_build_array(jsonb_build_object('type', 'text', 'text', repeat('a', 102400)))))));
  if v ->> 'mensaje' is distinct from 'El documento es demasiado largo.' then
    raise exception 'D2: más de 100 KB dio %', v;
  end if;
end $$;

-- @test web doc: los minutos de lectura (D3)
do $$
declare
  v_200 jsonb := jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'content',
    jsonb_build_array(jsonb_build_object('type', 'text', 'text', btrim(repeat('palabra ', 200)))))));
  v_201 jsonb := jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
    jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', btrim(repeat('palabra ', 200))))),
    jsonb_build_object('type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'otra')))));
begin
  if public._web_doc_minutos(null) is not null or public._web_doc_minutos('{"type": "doc", "content": [{"type": "paragraph"}]}') is not null then
    raise exception 'D3: sin palabras, los minutos debían ser nulos';
  end if;
  if public._web_doc_minutos(v_200) is distinct from 1::smallint then
    raise exception 'D3: 200 palabras dieron % minutos (debía 1)', public._web_doc_minutos(v_200);
  end if;
  if public._web_doc_minutos(v_201) is distinct from 2::smallint then
    raise exception 'D3: 201 palabras dieron % minutos (debía 2)', public._web_doc_minutos(v_201);
  end if;
end $$;

-- @test web doc: ningún rol de la app ejecuta los ayudantes del documento y de los ajustes ni los triggers (D4)
do $$
declare v_malas text[];
begin
  select array_agg(p.oid::regprocedure::text || ' por ' || r.rol) into v_malas
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) r (rol)
   where n.nspname = 'public' and (p.proname like '\_web\_doc%' or p.proname = '_web_html_escapar'
       or p.oid in ('public._web_ajustes_valor(text,jsonb)'::regprocedure, 'public._web_ajustes_objeto(text,jsonb,jsonb)'::regprocedure,
                    'public._web_legales_validar(jsonb,jsonb)'::regprocedure, 'public.web_guia_cuerpo()'::regprocedure,
                    'public.web_ajustes_legales()'::regprocedure, 'public.web_testimonio_exigir_consentimiento()'::regprocedure))
     and has_function_privilege(r.rol, p.oid, 'execute');
  if v_malas is not null then
    raise exception 'D4: estos ayudantes del documento los ejecuta un rol de la app: %', v_malas;
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname like '\_web\_doc%') < 6 then
    raise exception 'D4: faltan ayudantes del documento (¿se renombraron?)';
  end if;
end $$;
