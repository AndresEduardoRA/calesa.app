-- La validación de los ajustes de la web, clave por clave (8.01-1, C11 y C12). La usan `web_ajustes_guardar()` (la RPC, en la migración
-- que sigue) y el trigger de `legales`. Ninguna es superficie de PostgREST: sin `execute` para la app (D14). Errores 22023 con la clave
-- en `hint`. JSON `null` (o un texto vacío) vacía donde la columna admite nulo.

-- Texto, WhatsApp, dirección, booleano y número: el valor ya normalizado (texto recortado, vacío → null).
create or replace function public._web_ajustes_valor(p_clave text, p_valor jsonb) returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_tipo text := jsonb_typeof(p_valor);
  v_texto text;
  v_maximo int;
  v_min int;
  v_max int;
  v_rango text;
begin
  if p_clave in ('nombre_sitio', 'lema', 'horario', 'whatsapp_respaldo', 'direccion_publica') then
    if v_tipo = 'null' then
      return 'null'::jsonb;
    end if;
    if v_tipo is distinct from 'string' then
      raise exception 'El valor de «%» no es válido.', p_clave using errcode = '22023', hint = p_clave;
    end if;
    v_texto := nullif(btrim(p_valor #>> '{}'), '');
    if v_texto is null then
      return 'null'::jsonb;
    end if;
    v_maximo := case p_clave when 'nombre_sitio' then 80 when 'lema' then 160 when 'horario' then 200 else 500 end;
    if char_length(v_texto) > v_maximo then
      raise exception '%', case p_clave
        when 'nombre_sitio' then 'El nombre del sitio lleva hasta 80 caracteres.'
        when 'lema' then 'El lema lleva hasta 160 caracteres.'
        when 'horario' then 'El horario lleva hasta 200 caracteres.'
        when 'whatsapp_respaldo' then 'El WhatsApp va con el código de país, por ejemplo +59170000000.'
        else 'La dirección pública lleva hasta 500 caracteres.' end
        using errcode = '22023', hint = p_clave;
    end if;
    if p_clave = 'whatsapp_respaldo' and v_texto !~ '^\+[1-9][0-9]{6,14}$' then
      raise exception 'El WhatsApp va con el código de país, por ejemplo +59170000000.' using errcode = '22023', hint = p_clave;
    end if;
    if p_clave = 'direccion_publica' and v_texto !~ '^https://[^[:space:]]+$' then
      raise exception 'La dirección pública empieza con https://.' using errcode = '22023', hint = p_clave;
    end if;
    return to_jsonb(v_texto);
  end if;

  if p_clave in ('mostrar_moneda_secundaria', 'cola_activa') then
    if v_tipo is distinct from 'boolean' then
      raise exception 'El valor de «%» no es válido.', p_clave using errcode = '22023', hint = p_clave;
    end if;
    return p_valor;
  end if;

  if p_clave in ('ttl_contacto_minutos', 'dias_pegajoso', 'max_abiertas_default', 'max_intentos') then
    v_min := case p_clave when 'ttl_contacto_minutos' then 5 when 'dias_pegajoso' then 0 else 1 end;
    v_max := case p_clave when 'ttl_contacto_minutos' then 1440 when 'dias_pegajoso' then 365 when 'max_abiertas_default' then 50 else 10 end;
    v_rango := case p_clave
      when 'ttl_contacto_minutos' then 'El tiempo para contactar va de 5 a 1440 minutos.'
      when 'dias_pegajoso' then 'Los días con el mismo asesor van de 0 a 365.'
      when 'max_abiertas_default' then 'Las solicitudes abiertas por asesor van de 1 a 50.'
      else 'Los intentos van de 1 a 10.' end;
    if v_tipo is distinct from 'number' or (p_valor #>> '{}') !~ '^-?[0-9]{1,6}$'
       or (p_valor #>> '{}')::int not between v_min and v_max then
      raise exception '%', v_rango using errcode = '22023', hint = p_clave;
    end if;
    return to_jsonb((p_valor #>> '{}')::int);
  end if;

  raise exception 'No se cambia «%».', p_clave using errcode = '22023', hint = p_clave;
end;
$$;

-- Los legales tal como se guardan: `{terminos|privacidad: {titulo, doc, html, actualizado_en}}` (D2). Valida cada clave, **reescribe**
-- `html` desde el documento (lo que llegue se pisa, escriba quien escriba) y pone `actualizado_en` = ahora en la que cambió de título o
-- de documento; la que no cambió conserva el suyo. Sin imágenes (D7) y no vacíos.
create or replace function public._web_legales_validar(p_legales jsonb, p_anterior jsonb) returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  k text;
  v jsonb;
  v_ant jsonb;
  v_titulo text;
  v_html text;
  v_salida jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_legales) is distinct from 'object' then
    raise exception 'Los legales admiten «terminos» y «privacidad».' using errcode = '22023', hint = 'legales';
  end if;
  for k, v in select e.key, e.value from jsonb_each(p_legales) e loop
    if k not in ('terminos', 'privacidad') then
      raise exception 'Los legales admiten «terminos» y «privacidad».' using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_typeof(v) is distinct from 'object'
       or exists (select 1 from jsonb_object_keys(v) c where c not in ('titulo', 'doc', 'html', 'actualizado_en')) then
      raise exception 'Los legales tienen un formato que no se admite.' using errcode = '22023', hint = 'legales';
    end if;
    v_titulo := case when jsonb_typeof(v -> 'titulo') = 'string' then btrim(v ->> 'titulo') end;
    if v_titulo is null or char_length(v_titulo) not between 1 and 120 then
      raise exception 'Escribe el título de «%».', k using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_typeof(v -> 'doc') is distinct from 'object' then
      raise exception 'Escribe el texto de «%».', k using errcode = '22023', hint = 'legales';
    end if;
    if jsonb_path_exists(v -> 'doc', 'lax $.content[*] ? (@.type == "image")') then
      raise exception 'Los legales no llevan imágenes.' using errcode = '22023', hint = 'legales';
    end if;
    begin
      v_html := public._web_doc_html(v -> 'doc');
    exception when sqlstate '22023' then
      raise exception '%', sqlerrm using errcode = '22023', hint = 'legales';
    end;
    if v_html = '' then
      raise exception 'Escribe el texto de «%».', k using errcode = '22023', hint = 'legales';
    end if;
    v_ant := p_anterior -> k;
    v_salida := v_salida || jsonb_build_object(k, jsonb_build_object(
      'titulo', v_titulo, 'doc', v -> 'doc', 'html', v_html,
      'actualizado_en', case
        when v_ant ->> 'titulo' = v_titulo and v_ant -> 'doc' = v -> 'doc' and jsonb_typeof(v_ant -> 'actualizado_en') = 'string'
          then v_ant -> 'actualizado_en'
        else to_jsonb(now()) end));
  end loop;
  return v_salida;
end;
$$;

-- Redes, SEO, orígenes visibles y legales: el valor nuevo de la columna. `p_actual` es el guardado (legales se aplica encima: una clave
-- en null se quita; una con el mismo título y documento conserva lo guardado).
create or replace function public._web_ajustes_objeto(p_clave text, p_valor jsonb, p_actual jsonb) returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  k text;
  v jsonb;
  v_texto text;
  v_salida jsonb := '{}'::jsonb;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_largo int;
begin
  if p_clave = 'origenes_visibles' then
    if jsonb_typeof(p_valor) is distinct from 'array' then
      raise exception 'El valor de «origenes_visibles» no es válido.' using errcode = '22023', hint = p_clave;
    end if;
    for v in select x from jsonb_array_elements(p_valor) x loop
      if jsonb_typeof(v) is distinct from 'string' or not pg_input_is_valid(v #>> '{}', 'uuid') then
        raise exception 'Ese origen no existe.' using errcode = '22023', hint = p_clave;
      end if;
      v_id := (v #>> '{}')::uuid;
      if not exists (select 1 from public.origenes o where o.id = v_id) then
        raise exception 'Ese origen no existe.' using errcode = '22023', hint = p_clave;
      end if;
      if not (v_id = any (v_ids)) then
        v_ids := v_ids || v_id;
      end if;
    end loop;
    return to_jsonb(v_ids);
  end if;

  if jsonb_typeof(p_valor) is distinct from 'object' then
    raise exception 'El valor de «%» no es válido.', p_clave using errcode = '22023', hint = p_clave;
  end if;

  if p_clave = 'legales' then
    v_salida := coalesce(p_actual, '{}'::jsonb);
    for k, v in select e.key, e.value from jsonb_each(p_valor) e loop
      if k not in ('terminos', 'privacidad') then
        raise exception 'Los legales admiten «terminos» y «privacidad».' using errcode = '22023', hint = p_clave;
      end if;
      if jsonb_typeof(v) = 'null' then
        v_salida := v_salida - k;
        continue;
      end if;
      if jsonb_typeof(v) is distinct from 'object'
         or exists (select 1 from jsonb_object_keys(v) c where c not in ('titulo', 'doc')) then
        raise exception 'Los legales tienen un formato que no se admite.' using errcode = '22023', hint = p_clave;
      end if;
      v_texto := case when jsonb_typeof(v -> 'titulo') = 'string' then btrim(v ->> 'titulo') end;
      if v_texto is null or char_length(v_texto) not between 1 and 120 then
        raise exception 'Escribe el título de «%».', k using errcode = '22023', hint = p_clave;
      end if;
      if jsonb_typeof(v -> 'doc') is distinct from 'object' then
        raise exception 'Escribe el texto de «%».', k using errcode = '22023', hint = p_clave;
      end if;
      if not coalesce(v_salida -> k ->> 'titulo' = v_texto and v_salida -> k -> 'doc' = v -> 'doc', false) then
        v_salida := v_salida || jsonb_build_object(k, jsonb_build_object('titulo', v_texto, 'doc', v -> 'doc'));
      end if;
    end loop;
    return v_salida;
  end if;

  -- redes y seo: se reemplazan enteros; un valor nulo o vacío omite la clave (D9).
  for k, v in select e.key, e.value from jsonb_each(p_valor) e loop
    if (p_clave = 'redes' and k not in ('facebook', 'instagram', 'tiktok', 'youtube', 'x', 'linkedin'))
       or (p_clave = 'seo' and k not in ('titulo', 'descripcion')) then
      raise exception '%', case p_clave when 'redes' then format('No se admite la red «%s».', k) else format('No se admite «%s» en SEO.', k) end
        using errcode = '22023', hint = p_clave;
    end if;
    if jsonb_typeof(v) = 'null' then
      continue;
    end if;
    if jsonb_typeof(v) is distinct from 'string' then
      raise exception 'El valor de «%» no es válido.', k using errcode = '22023', hint = p_clave;
    end if;
    v_texto := nullif(btrim(v #>> '{}'), '');
    continue when v_texto is null;
    if p_clave = 'redes' and (v_texto !~ '^https://[^[:space:]]+$' or char_length(v_texto) > 500) then
      raise exception 'La dirección de «%» empieza con https://.', k using errcode = '22023', hint = p_clave;
    end if;
    v_largo := case k when 'titulo' then 70 else 160 end;
    if p_clave = 'seo' and char_length(v_texto) > v_largo then
      raise exception '%', case k when 'titulo' then 'El título para buscadores lleva hasta 70 caracteres.'
        else 'La descripción para buscadores lleva hasta 160 caracteres.' end using errcode = '22023', hint = p_clave;
    end if;
    v_salida := v_salida || jsonb_build_object(k, v_texto);
  end loop;
  return v_salida;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['public._web_ajustes_valor(text, jsonb)', 'public._web_legales_validar(jsonb, jsonb)',
                           'public._web_ajustes_objeto(text, jsonb, jsonb)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
