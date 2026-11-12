-- El documento del sitio (8.01-1, C1–C4, C7): el JSON de ProseMirror que escribe el editor de guías y legales, validado contra una
-- lista blanca y convertido en el HTML que sirven las vistas `web.*`. Nunca se guarda HTML escrito por alguien: lo deriva la base.
-- Espejo en `src/modules/web/entities/contenido/doc.ts`; `doc.test.ts` corre estas funciones en PGlite sobre `doc.casos.ts`.
--
-- Lista blanca: doc › párrafo, título (2 o 3), lista con viñetas, lista numerada (`start`), cita, imagen; ítem y cita › párrafo o
-- lista; párrafo y título › texto y salto. Marcas: negrita, cursiva, enlace (http, https, mailto, tel). Imagen: `ruta` relativa al
-- bucket público `web` (el sitio arma la URL, como con `portada`) y `alt`. Lo que no está en la lista se rechaza (22023, hint `doc`):
-- no se recorta, el editor limpia antes de mandar.

-- El texto o el atributo escapado: `&` primero.
create or replace function public._web_html_escapar(p_texto text) returns text
language sql immutable
set search_path = ''
as $$
  select replace(replace(replace(replace(replace(p_texto, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;');
$$;

-- La ruta de una imagen del documento dentro del bucket `web`: carpetas y nombre con letras, dígitos, `_` y `-`, y extensión de imagen
-- en minúsculas. Sin esquema, sin host, sin `//` ni `..`.
create or replace function public._web_doc_ruta_valida(p_ruta text) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_ruta is not null
     and char_length(p_ruta) <= 300
     and p_ruta ~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.(webp|png|jpe?g)$';
$$;

-- Valida las marcas de un texto y envuelve su HTML en orden fijo (enlace › cursiva › negrita), sin importar el del arreglo.
create or replace function public._web_doc_marcas(p_marcas jsonb, p_html text) returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  m jsonb;
  v_tipo text;
  v_vistas text[] := '{}';
  v_negrita boolean := false;
  v_cursiva boolean := false;
  v_href text;
  v_salida text := p_html;
begin
  if p_marcas is null then
    return v_salida;
  end if;
  if jsonb_typeof(p_marcas) <> 'array' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  for m in select x from jsonb_array_elements(p_marcas) x loop
    if jsonb_typeof(m) <> 'object' or jsonb_typeof(m -> 'type') is distinct from 'string' then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_tipo := m ->> 'type';
    if v_tipo = any (v_vistas) then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_vistas := v_vistas || v_tipo;
    if v_tipo in ('bold', 'italic') then
      if exists (select 1 from jsonb_object_keys(m) k where k <> 'type') then
        raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
      end if;
      if v_tipo = 'bold' then
        v_negrita := true;
      else
        v_cursiva := true;
      end if;
    elsif v_tipo = 'link' then
      if exists (select 1 from jsonb_object_keys(m) k where k not in ('type', 'attrs'))
         or jsonb_typeof(m -> 'attrs') is distinct from 'object'
         or exists (select 1 from jsonb_object_keys(m -> 'attrs') k where k <> 'href')
         or jsonb_typeof(m -> 'attrs' -> 'href') is distinct from 'string' then
        raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
      end if;
      if not public._seguimiento_href_valido(m -> 'attrs' ->> 'href') then
        raise exception 'Ese enlace no se admite: usa una dirección http, https, mailto o tel.' using errcode = '22023', hint = 'doc';
      end if;
      v_href := m -> 'attrs' ->> 'href';
    else
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
  end loop;
  if v_negrita then
    v_salida := '<strong>' || v_salida || '</strong>';
  end if;
  if v_cursiva then
    v_salida := '<em>' || v_salida || '</em>';
  end if;
  if v_href is not null then
    v_salida := '<a href="' || public._web_html_escapar(v_href) || '" rel="noopener noreferrer nofollow">' || v_salida || '</a>';
  end if;
  return v_salida;
end;
$$;

-- La imagen: `attrs` con `ruta` (obligatoria) y `alt` (texto de hasta 300, o nulo), y nada más.
create or replace function public._web_doc_imagen(p_nodo jsonb) returns text
language plpgsql immutable
set search_path = ''
as $$
declare v_attrs jsonb := p_nodo -> 'attrs'; v_alt text := '';
begin
  if jsonb_typeof(v_attrs) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(v_attrs) k where k not in ('ruta', 'alt'))
     or jsonb_typeof(v_attrs -> 'ruta') is distinct from 'string' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  if v_attrs ? 'alt' and jsonb_typeof(v_attrs -> 'alt') <> 'null' then
    if jsonb_typeof(v_attrs -> 'alt') <> 'string' or char_length(v_attrs ->> 'alt') > 300 then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_alt := v_attrs ->> 'alt';
  end if;
  if not public._web_doc_ruta_valida(v_attrs ->> 'ruta') then
    raise exception 'Esa imagen no se admite: súbela desde el editor.' using errcode = '22023', hint = 'doc';
  end if;
  return '<img data-ruta="' || public._web_html_escapar(v_attrs ->> 'ruta') || '" alt="' || public._web_html_escapar(v_alt) || '">';
end;
$$;

-- Un nodo y sus hijos, en HTML. Mismo orden de chequeos que el espejo: niveles, forma, padre, claves, y después lo propio del tipo.
create or replace function public._web_doc_nodo(p_nodo jsonb, p_padre text, p_profundidad integer) returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  v_tipo text;
  v_admitido boolean;
  v_permitidas text[];
  v_hijos jsonb;
  v_hijo jsonb;
  v_partes text[] := '{}';
  v_attrs jsonb;
  v_inicio int := 1;
  v_nivel text;
  v_interior text;
begin
  if p_profundidad > 6 then
    raise exception 'El documento tiene demasiados niveles.' using errcode = '22023', hint = 'doc';
  end if;
  if jsonb_typeof(p_nodo) <> 'object' or jsonb_typeof(p_nodo -> 'type') is distinct from 'string' then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;
  v_tipo := p_nodo ->> 'type';
  v_admitido := case p_padre
    when 'raiz' then v_tipo = 'doc'
    when 'doc' then v_tipo in ('paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'image')
    when 'blockquote' then v_tipo in ('paragraph', 'bulletList', 'orderedList')
    when 'listItem' then v_tipo in ('paragraph', 'bulletList', 'orderedList')
    when 'bulletList' then v_tipo = 'listItem'
    when 'orderedList' then v_tipo = 'listItem'
    when 'paragraph' then v_tipo in ('text', 'hardBreak')
    when 'heading' then v_tipo in ('text', 'hardBreak')
    else false end;
  if not v_admitido then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;

  v_permitidas := case v_tipo
    when 'text' then array['type', 'text', 'marks']
    when 'hardBreak' then array['type', 'marks']
    when 'orderedList' then array['type', 'content', 'attrs']
    when 'heading' then array['type', 'content', 'attrs']
    when 'image' then array['type', 'attrs']
    else array['type', 'content'] end;
  if exists (select 1 from jsonb_object_keys(p_nodo) k where not (k = any (v_permitidas))) then
    raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
  end if;

  if v_tipo = 'text' then
    if jsonb_typeof(p_nodo -> 'text') is distinct from 'string' or (p_nodo ->> 'text') = '' then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    return public._web_doc_marcas(p_nodo -> 'marks', public._web_html_escapar(p_nodo ->> 'text'));
  end if;
  if v_tipo = 'hardBreak' then
    perform public._web_doc_marcas(p_nodo -> 'marks', '');
    return '<br>';
  end if;
  if v_tipo = 'image' then
    return public._web_doc_imagen(p_nodo);
  end if;

  if v_tipo = 'heading' then
    v_attrs := p_nodo -> 'attrs';
    if jsonb_typeof(v_attrs) is distinct from 'object'
       or exists (select 1 from jsonb_object_keys(v_attrs) k where k <> 'level')
       or jsonb_typeof(v_attrs -> 'level') is distinct from 'number'
       or (v_attrs ->> 'level') not in ('2', '3') then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_nivel := v_attrs ->> 'level';
  end if;
  if v_tipo = 'orderedList' and p_nodo ? 'attrs' then
    v_attrs := p_nodo -> 'attrs';
    if jsonb_typeof(v_attrs) <> 'object'
       or exists (select 1 from jsonb_object_keys(v_attrs) k where k <> 'start')
       or jsonb_typeof(v_attrs -> 'start') is distinct from 'number'
       or (v_attrs ->> 'start') !~ '^[0-9]{1,5}$'
       or (v_attrs ->> 'start')::int < 1 then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    v_inicio := (v_attrs ->> 'start')::int;
  end if;

  v_hijos := p_nodo -> 'content';
  if v_hijos is null then
    if v_tipo in ('bulletList', 'orderedList', 'listItem', 'blockquote') then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
  else
    if jsonb_typeof(v_hijos) <> 'array'
       or (v_tipo in ('bulletList', 'orderedList', 'listItem', 'blockquote') and jsonb_array_length(v_hijos) = 0) then
      raise exception 'El documento tiene un formato que no se admite.' using errcode = '22023', hint = 'doc';
    end if;
    for v_hijo in select x from jsonb_array_elements(v_hijos) x loop
      v_partes := v_partes || public._web_doc_nodo(v_hijo, v_tipo, p_profundidad + 1);
    end loop;
  end if;
  v_interior := array_to_string(v_partes, '');

  return case v_tipo
    when 'doc' then v_interior
    when 'paragraph' then '<p>' || v_interior || '</p>'
    when 'heading' then '<h' || v_nivel || '>' || v_interior || '</h' || v_nivel || '>'
    when 'bulletList' then '<ul>' || v_interior || '</ul>'
    when 'orderedList' then (case when v_inicio = 1 then '<ol>' else '<ol start="' || v_inicio || '">' end) || v_interior || '</ol>'
    when 'listItem' then '<li>' || v_interior || '</li>'
    when 'blockquote' then '<blockquote>' || v_interior || '</blockquote>'
  end;
end;
$$;

-- El HTML del documento. Nulo → ''. Un documento sin texto escrito y sin imágenes (párrafos vacíos) → ''.
create or replace function public._web_doc_html(p_doc jsonb) returns text
language plpgsql immutable
set search_path = ''
as $$
declare v_html text;
begin
  if p_doc is null or p_doc = 'null'::jsonb then
    return '';
  end if;
  if octet_length(p_doc::text) > 102400 then
    raise exception 'El documento es demasiado largo.' using errcode = '22023', hint = 'doc';
  end if;
  v_html := public._web_doc_nodo(p_doc, 'raiz', 0);
  if btrim(coalesce((select string_agg(x #>> '{}', '') from jsonb_path_query(p_doc, 'strict $.**.text') x), ''), E' \n\t') = ''
     and not jsonb_path_exists(p_doc, 'lax $.content[*].type ? (@ == "image")') then
    return '';
  end if;
  return v_html;
end;
$$;

-- Los minutos de lectura (D6): palabras de todos los textos / 200, hacia arriba, al menos 1; sin palabras, nulo. Sólo la base lo calcula.
create or replace function public._web_doc_minutos(p_doc jsonb) returns smallint
language sql immutable
set search_path = ''
as $$
  select case when t = '' then null
              else greatest(1, ceil(cardinality(regexp_split_to_array(t, '\s+')) / 200.0))::smallint end
    from (select btrim(coalesce((select string_agg(x #>> '{}', ' ')
                                   from jsonb_path_query(coalesce(p_doc, 'null'::jsonb), 'strict $.**.text') x), ''),
                       E' \n\t\r') as t) s;
$$;

-- D14: los ayudantes no son superficie de PostgREST; los usan los triggers y las RPC `security definer`.
do $$
declare f text;
begin
  foreach f in array array[
    'public._web_html_escapar(text)', 'public._web_doc_ruta_valida(text)', 'public._web_doc_marcas(jsonb, text)',
    'public._web_doc_imagen(jsonb)', 'public._web_doc_nodo(jsonb, text, integer)', 'public._web_doc_html(jsonb)',
    'public._web_doc_minutos(jsonb)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

comment on function public._web_doc_html(jsonb) is
  'El HTML de un documento del sitio (guías, legales) validado contra la lista blanca; 22023 hint doc si no cabe. Espejo: web/entities/contenido/doc.ts. 8.01-1.';
