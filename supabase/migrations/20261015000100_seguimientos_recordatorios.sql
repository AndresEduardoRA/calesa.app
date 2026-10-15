-- Seguimientos y recordatorios (Fase 3, parte 5a). Escrito a mano.
--
-- 1. Se escriben sólo por RPC. Las policies directas tenían huecos: con `leads.editar` «todos» se
--    anotaba en un lead ajeno sin la cartera; el UPDATE de un seguimiento dejaba moverlo a otro lead,
--    pasarlo a un tipo apagado o «borrarlo» a mano; el de un recordatorio no miraba el lead y dejaba
--    escribir `notificado_en`. Ahora la tabla sólo se lee.
-- 2. Actuar sobre un lead exige tenerlo en la cartera (`_lead_mio`), y lo que no cumple responde lo
--    mismo que un lead inexistente: no hay oráculo.
-- 3. El detalle de un seguimiento viaja como el documento del editor (JSON de ProseMirror), nunca como
--    HTML: `_seguimiento_detalle()` lo valida contra una lista blanca y deriva `detalle_texto`. Lo que
--    no está en la lista se rechaza. La pantalla lo dibuja con la misma lista, sin `innerHTML`.
-- 4. Privado = sólo su autor. Público («Visible para el cliente») = quienes ven el lead y el portal.
--    Quien ve «todos» sin estar en la cartera tampoco lee los privados ajenos.
-- 5. Un seguimiento no mueve la versión del lead (`lead_version()` no mira `ultimo_seguimiento_en`), y
--    el trigger que lo mantiene sólo corre cuando cambia algo que lo afecta.
-- 6. Las versiones de un seguimiento y de un recordatorio las sellan sus RPC con la hora del reloj.

-- ---------------------------------------------------------------------------
-- Las tablas se leen; se escriben por RPC
-- ---------------------------------------------------------------------------
drop policy if exists "seguimientos: leer" on public.seguimientos;
drop policy if exists "seguimientos: crear" on public.seguimientos;
drop policy if exists "seguimientos: editar" on public.seguimientos;
drop policy if exists "seguimientos: borrar" on public.seguimientos;
revoke insert, update, delete on table public.seguimientos from anon, authenticated;
create policy "seguimientos: leer" on public.seguimientos for select to authenticated
  using (eliminado_en is null
         and (select public.puede_lead(lead_id, 'leads.ver'))
         and (usuario_id = (select auth.uid()) or visibilidad = 'publico'));

drop policy if exists "recordatorios: leer" on public.recordatorios;
drop policy if exists "recordatorios: crear" on public.recordatorios;
drop policy if exists "recordatorios: editar" on public.recordatorios;
drop policy if exists "recordatorios: borrar" on public.recordatorios;
revoke insert, update, delete on table public.recordatorios from anon, authenticated;
create policy "recordatorios: leer" on public.recordatorios for select to authenticated
  using (usuario_id = (select auth.uid()) and eliminado_en is null);

drop trigger if exists trg_actualizado_en on public.seguimientos;
drop trigger if exists trg_actualizado_en on public.recordatorios;

-- `ultimo_seguimiento_en`: sólo cuando cambia algo que lo afecta (no al corregir un título).
drop trigger if exists trg_seguimiento_actualizar_lead on public.seguimientos;
create trigger trg_seguimiento_actualizar_lead
  after insert or delete or update of ocurrido_en, eliminado_en, lead_id on public.seguimientos
  for each row execute function public.seguimiento_actualizar_lead();

-- ---------------------------------------------------------------------------
-- El lead de mi cartera
-- ---------------------------------------------------------------------------
-- Inexistente, limbo, papelera, ajeno, sin `leads.editar` o fuera de la cartera: la misma respuesta.
-- No bloquea la fila (el trigger de `ultimo_seguimiento_en` la toma cuando hace falta).
create or replace function public._lead_mio(p_lead uuid)
returns public.leads language plpgsql security definer set search_path = '' as $$
declare l public.leads;
begin
  perform public.assert_activo();
  if p_lead is null
     or not public.puede_lead(p_lead, 'leads.ver')
     or not public.puede_lead(p_lead, 'leads.editar')
     or not public.en_cartera(p_lead) then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  return l;
end;
$$;
revoke all on function public._lead_mio(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- El documento del editor: la lista blanca
-- ---------------------------------------------------------------------------
-- Espejo: `src/modules/leads/entities/seguimiento.ts` (un test corre esta función sobre la misma
-- tabla de casos). Nodos: doc, paragraph, text, hardBreak, bulletList, orderedList (sólo `start`),
-- listItem. Marcas: bold, italic, link (sólo `href`: http, https, mailto o tel). Profundidad ≤ 6 (dos
-- niveles de lista). El texto que devuelve: un bloque por línea, los ítems con «• » o «n. ».
create or replace function public._seguimiento_href_valido(p_href text)
returns boolean language sql immutable set search_path = '' as $$
  select p_href is not null
     and char_length(p_href) between 1 and 2000
     and p_href ~* '^(https?://|mailto:|tel:)'
     and p_href !~ '[[:space:][:cntrl:]]';
$$;
revoke all on function public._seguimiento_href_valido(text) from public, anon, authenticated;

create or replace function public._seguimiento_marcas(p_marcas jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare m jsonb; v_tipo text; v_vistas text[] := '{}';
begin
  if p_marcas is null then
    return;
  end if;
  if jsonb_typeof(p_marcas) <> 'array' then
    raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
  end if;
  for m in select x from jsonb_array_elements(p_marcas) x loop
    if jsonb_typeof(m) <> 'object' or jsonb_typeof(m -> 'type') is distinct from 'string' then
      raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
    end if;
    v_tipo := m ->> 'type';
    if v_tipo = any (v_vistas) then
      raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
    end if;
    v_vistas := v_vistas || v_tipo;
    if v_tipo in ('bold', 'italic') then
      if exists (select 1 from jsonb_object_keys(m) k where k <> 'type') then
        raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
      end if;
    elsif v_tipo = 'link' then
      if exists (select 1 from jsonb_object_keys(m) k where k not in ('type', 'attrs'))
         or jsonb_typeof(m -> 'attrs') is distinct from 'object'
         or exists (select 1 from jsonb_object_keys(m -> 'attrs') k where k <> 'href')
         or jsonb_typeof(m -> 'attrs' -> 'href') is distinct from 'string' then
        raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
      end if;
      if not public._seguimiento_href_valido(m -> 'attrs' ->> 'href') then
        raise exception 'Ese enlace no se admite: usa una dirección http, https, mailto o tel.'
          using errcode = '22023', hint = 'detalle';
      end if;
    else
      raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
    end if;
  end loop;
end;
$$;
revoke all on function public._seguimiento_marcas(jsonb) from public, anon, authenticated;

-- El texto de un nodo. `p_padre` decide qué hijos admite; la lista pone el «• » o el «n. » de cada ítem.
create or replace function public._seguimiento_nodo(p_nodo jsonb, p_padre text, p_profundidad int)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_tipo text;
  v_hijos jsonb;
  v_hijo jsonb;
  v_partes text[] := '{}';
  v_texto text;
  v_n int;
  v_inicio int;
  v_permitidas text[];
begin
  if p_profundidad > 6 then
    raise exception 'El detalle tiene demasiados niveles de lista.' using errcode = '22023', hint = 'detalle';
  end if;
  if jsonb_typeof(p_nodo) <> 'object' or jsonb_typeof(p_nodo -> 'type') is distinct from 'string' then
    raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
  end if;
  v_tipo := p_nodo ->> 'type';
  if not (case p_padre
            when 'raiz' then v_tipo = 'doc'
            when 'doc' then v_tipo in ('paragraph', 'bulletList', 'orderedList')
            when 'listItem' then v_tipo in ('paragraph', 'bulletList', 'orderedList')
            when 'bulletList' then v_tipo = 'listItem'
            when 'orderedList' then v_tipo = 'listItem'
            when 'paragraph' then v_tipo in ('text', 'hardBreak')
            else false end) then
    raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
  end if;

  v_permitidas := case v_tipo
    when 'text' then array['type', 'text', 'marks']
    when 'hardBreak' then array['type', 'marks']
    when 'orderedList' then array['type', 'content', 'attrs']
    else array['type', 'content'] end;
  if exists (select 1 from jsonb_object_keys(p_nodo) k where not (k = any (v_permitidas))) then
    raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
  end if;

  if v_tipo = 'text' then
    if jsonb_typeof(p_nodo -> 'text') is distinct from 'string' or (p_nodo ->> 'text') = '' then
      raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
    end if;
    perform public._seguimiento_marcas(p_nodo -> 'marks');
    return p_nodo ->> 'text';
  end if;
  if v_tipo = 'hardBreak' then
    perform public._seguimiento_marcas(p_nodo -> 'marks');
    return E'\n';
  end if;

  v_inicio := 1;
  if v_tipo = 'orderedList' and p_nodo ? 'attrs' then
    if jsonb_typeof(p_nodo -> 'attrs') <> 'object'
       or exists (select 1 from jsonb_object_keys(p_nodo -> 'attrs') k where k <> 'start')
       or jsonb_typeof(p_nodo -> 'attrs' -> 'start') is distinct from 'number'
       or (p_nodo -> 'attrs' ->> 'start') !~ '^[0-9]{1,5}$'
       or (p_nodo -> 'attrs' ->> 'start')::int < 1 then
      raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
    end if;
    v_inicio := (p_nodo -> 'attrs' ->> 'start')::int;
  end if;

  v_hijos := p_nodo -> 'content';
  if v_hijos is null then
    if v_tipo in ('bulletList', 'orderedList', 'listItem') then
      raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
    end if;
    return '';
  end if;
  if jsonb_typeof(v_hijos) <> 'array'
     or (v_tipo in ('bulletList', 'orderedList', 'listItem') and jsonb_array_length(v_hijos) = 0) then
    raise exception 'El detalle tiene un formato que no se admite.' using errcode = '22023', hint = 'detalle';
  end if;

  v_n := 0;
  for v_hijo in select x from jsonb_array_elements(v_hijos) x loop
    v_texto := public._seguimiento_nodo(v_hijo, v_tipo, p_profundidad + 1);
    if v_tipo = 'bulletList' then
      v_texto := '• ' || v_texto;
    elsif v_tipo = 'orderedList' then
      v_texto := (v_inicio + v_n)::text || '. ' || v_texto;
    end if;
    v_partes := v_partes || v_texto;
    v_n := v_n + 1;
  end loop;
  if v_tipo = 'paragraph' then
    return array_to_string(v_partes, '');
  end if;
  return array_to_string(v_partes, E'\n');
end;
$$;
revoke all on function public._seguimiento_nodo(jsonb, text, int) from public, anon, authenticated;

-- Valida el documento y devuelve su texto. Nulo si ningún nodo de texto dice algo: un documento de
-- párrafos o ítems vacíos es «sin detalle», no un error.
create or replace function public._seguimiento_detalle(p_doc jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v_texto text;
begin
  if p_doc is null or p_doc = 'null'::jsonb then
    return null;
  end if;
  if octet_length(p_doc::text) > 20000 then
    raise exception 'El detalle es demasiado largo.' using errcode = '22023', hint = 'detalle';
  end if;
  v_texto := btrim(public._seguimiento_nodo(p_doc, 'raiz', 0), E' \n\t');
  if btrim(coalesce((select string_agg(x #>> '{}', '') from jsonb_path_query(p_doc, 'strict $.**.text') x), ''),
           E' \n\t') = '' then
    return null;
  end if;
  if char_length(v_texto) > 5000 then
    raise exception 'El detalle admite hasta 5000 caracteres.' using errcode = '22023', hint = 'detalle';
  end if;
  return v_texto;
end;
$$;
revoke all on function public._seguimiento_detalle(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Lo que se devuelve de un seguimiento (lo mismo que lee `lead_seguimientos`)
-- ---------------------------------------------------------------------------
create or replace function public._seguimiento_json(s public.seguimientos)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'lead_id', s.lead_id,
    'tipo_id', s.tipo_id, 'tipo_nombre', t.nombre, 'tipo_icono', t.icono,
    'titulo', s.titulo, 'detalle_doc', s.detalle_doc, 'detalle_texto', s.detalle_texto,
    'visibilidad', s.visibilidad, 'ocurrido_en', s.ocurrido_en, 'actualizado_en', s.actualizado_en,
    'eliminado', s.eliminado_en is not null,
    'autor_id', s.usuario_id, 'autor_nombre', nullif(btrim(p.nombre), ''),
    'es_mio', s.usuario_id = (select auth.uid()))
  from public.tipos_seguimiento t, public.perfiles p
  where t.id = s.tipo_id and p.id = s.usuario_id;
$$;
revoke all on function public._seguimiento_json(public.seguimientos) from public, anon, authenticated;

-- El seguimiento propio sobre un lead de mi cartera. Uno ajeno, de un lead que ya no tengo o que no
-- existe: la misma respuesta. Bloquea la fila.
create or replace function public._seguimiento_mio(p_id uuid)
returns public.seguimientos language plpgsql security definer set search_path = '' as $$
declare s public.seguimientos;
begin
  perform public.assert_activo();
  select * into s from public.seguimientos x where x.id = p_id for update;
  if not found
     or s.usuario_id <> (select auth.uid())
     or not public.puede_lead(s.lead_id, 'leads.ver')
     or not public.puede_lead(s.lead_id, 'leads.editar')
     or not public.en_cartera(s.lead_id) then
    raise exception 'No encontramos este seguimiento o no tienes acceso.' using errcode = '42501';
  end if;
  return s;
end;
$$;
revoke all on function public._seguimiento_mio(uuid) from public, anon, authenticated;

create or replace function public._seguimiento_conflicto(p_cuando timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Sólo su autor lo edita: el otro lado del conflicto es otra ventana suya.
  raise exception 'Cambiaste este seguimiento % desde otra ventana. Recarga para seguir desde ahí.', public._hace(p_cuando)
    using errcode = 'PT409';
end;
$$;
revoke all on function public._seguimiento_conflicto(timestamptz) from public, anon, authenticated;

-- La fecha de un seguimiento: puede ser pasada, no futura (unos minutos de margen por los relojes).
create or replace function public._seguimiento_fecha(p_valor jsonb)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare v timestamptz;
begin
  if jsonb_typeof(p_valor) is distinct from 'string' then
    raise exception 'Elige cuándo fue.' using errcode = '22023', hint = 'ocurrido_en';
  end if;
  begin
    v := (p_valor #>> '{}')::timestamptz;
  exception when others then
    raise exception 'Elige cuándo fue.' using errcode = '22023', hint = 'ocurrido_en';
  end;
  if v > now() + interval '5 minutes' then
    raise exception 'Un seguimiento no puede ser en el futuro: para eso, agenda un recordatorio.'
      using errcode = '22023', hint = 'ocurrido_en';
  end if;
  if v < '2000-01-01'::timestamptz then
    raise exception 'Elige cuándo fue.' using errcode = '22023', hint = 'ocurrido_en';
  end if;
  return v;
end;
$$;
revoke all on function public._seguimiento_fecha(jsonb) from public, anon, authenticated;

create or replace function public._seguimiento_titulo(p_valor jsonb, p_hint text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text;
begin
  if jsonb_typeof(p_valor) is distinct from 'string' then
    raise exception 'Escribe un resumen del seguimiento.' using errcode = '22023', hint = p_hint;
  end if;
  v := btrim(p_valor #>> '{}');
  if v = '' then
    raise exception 'Escribe un resumen del seguimiento.' using errcode = '22023', hint = p_hint;
  end if;
  if char_length(v) > 120 then
    raise exception 'El resumen admite hasta 120 caracteres.' using errcode = '22023', hint = p_hint;
  end if;
  return v;
end;
$$;
revoke all on function public._seguimiento_titulo(jsonb, text) from public, anon, authenticated;

create or replace function public._seguimiento_visibilidad(p_valor jsonb)
returns public.visibilidad_seguimiento language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(p_valor) is distinct from 'string' or (p_valor #>> '{}') not in ('privado', 'publico') then
    raise exception 'La visibilidad no es una de las que hay.' using errcode = '22023', hint = 'visibilidad';
  end if;
  return (p_valor #>> '{}')::public.visibilidad_seguimiento;
end;
$$;
revoke all on function public._seguimiento_visibilidad(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recordatorios: las piezas
-- ---------------------------------------------------------------------------
create or replace function public._recordatorio_titulo(p_valor text, p_hint text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_valor, ''));
begin
  if v = '' then
    raise exception 'Escribe de qué es el recordatorio.' using errcode = '22023', hint = p_hint;
  end if;
  if char_length(v) > 120 then
    raise exception 'El recordatorio admite hasta 120 caracteres.' using errcode = '22023', hint = p_hint;
  end if;
  return v;
end;
$$;
revoke all on function public._recordatorio_titulo(text, text) from public, anon, authenticated;

create or replace function public._recordatorio_cuando(p_valor timestamptz, p_hint text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  if p_valor is null then
    raise exception 'Elige cuándo recordarlo.' using errcode = '22023', hint = p_hint;
  end if;
  if p_valor <= now() then
    raise exception 'El recordatorio tiene que ser en el futuro.' using errcode = '22023', hint = p_hint;
  end if;
  if p_valor > now() + interval '5 years' then
    raise exception 'Elige una fecha dentro de los próximos 5 años.' using errcode = '22023', hint = p_hint;
  end if;
  return p_valor;
end;
$$;
revoke all on function public._recordatorio_cuando(timestamptz, text) from public, anon, authenticated;

-- Lo que se devuelve de un recordatorio: el lead sólo si quien lo pide todavía lo ve.
create or replace function public._recordatorio_json(r public.recordatorios)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'titulo', r.titulo, 'recordar_en', r.recordar_en,
    'notificado_en', r.notificado_en, 'completado_en', r.completado_en,
    'eliminado', r.eliminado_en is not null, 'actualizado_en', r.actualizado_en,
    'lead_id', case when v then r.lead_id end,
    'lead_nombre', case when v then (select l.nombre from public.leads l where l.id = r.lead_id) end,
    'lead_numero', case when v then (select l.numero from public.leads l where l.id = r.lead_id) end)
  from (select r.lead_id is not null and public.puede_lead(r.lead_id, 'leads.ver') as v) x;
$$;
revoke all on function public._recordatorio_json(public.recordatorios) from public, anon, authenticated;

-- El recordatorio propio (vivo o en la papelera, según quien pregunta). Uno ajeno: no existe.
create or replace function public._recordatorio_mio(p_id uuid)
returns public.recordatorios language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios;
begin
  perform public.assert_activo();
  select * into r from public.recordatorios x where x.id = p_id and x.usuario_id = (select auth.uid()) for update;
  if not found then
    raise exception 'No encontramos este recordatorio.' using errcode = '42501';
  end if;
  return r;
end;
$$;
revoke all on function public._recordatorio_mio(uuid) from public, anon, authenticated;

create or replace function public._recordatorio_conflicto(p_cuando timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Cambiaste este recordatorio % desde otra ventana. Recarga para seguir desde ahí.', public._hace(p_cuando)
    using errcode = 'PT409';
end;
$$;
revoke all on function public._recordatorio_conflicto(timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seguimientos: crear
-- ---------------------------------------------------------------------------
-- `p_seguimiento`: {tipo_id, titulo, detalle?, visibilidad?, ocurrido_en?}. `p_recordatorio`
-- (opcional): {titulo?, recordar_en}; sin título usa el del seguimiento. Entra todo o nada.
-- El intento lleva su id: un reintento devuelve lo mismo con `repetido` (aunque el tipo se haya
-- apagado entretanto). Devuelve `{resultado: creado | repetido, seguimiento, recordatorio}`.
create or replace function public.seguimiento_crear(
  p_id uuid, p_lead uuid, p_seguimiento jsonb, p_recordatorio jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  s public.seguimientos;
  r public.recordatorios;
  v_tipo uuid;
  v_titulo text;
  v_doc jsonb;
  v_texto text;
  v_visibilidad public.visibilidad_seguimiento := 'privado';
  v_ocurrido timestamptz := now();
  v_recordar timestamptz;
  v_k text;
begin
  l := public._lead_mio(p_lead);
  if p_id is null then
    raise exception 'Falta el identificador del seguimiento.' using errcode = '22023';
  end if;
  select * into s from public.seguimientos x where x.id = p_id;
  if found then
    if s.usuario_id = (select auth.uid()) and s.lead_id = l.id then
      return jsonb_build_object('resultado', 'repetido', 'seguimiento', public._seguimiento_json(s), 'recordatorio', null);
    end if;
    raise exception 'No pudimos guardar este seguimiento. Vuelve a intentarlo.' using errcode = '22023';
  end if;

  if p_seguimiento is null or jsonb_typeof(p_seguimiento) <> 'object' then
    raise exception 'Escribe un resumen del seguimiento.' using errcode = '22023', hint = 'titulo';
  end if;
  for v_k in select jsonb_object_keys(p_seguimiento) loop
    if v_k not in ('tipo_id', 'titulo', 'detalle', 'visibilidad', 'ocurrido_en') then
      raise exception 'El dato «%» no es de un seguimiento.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;

  begin
    v_tipo := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
  exception when invalid_text_representation then
    v_tipo := null;
  end;
  if v_tipo is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo and t.activo) then
    raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'tipo_id';
  end if;
  v_titulo := public._seguimiento_titulo(p_seguimiento -> 'titulo', 'titulo');
  v_doc := p_seguimiento -> 'detalle';
  v_texto := public._seguimiento_detalle(v_doc);
  if v_texto is null then
    v_doc := null;
  end if;
  if p_seguimiento ? 'visibilidad' then
    v_visibilidad := public._seguimiento_visibilidad(p_seguimiento -> 'visibilidad');
  end if;
  if p_seguimiento ? 'ocurrido_en' and p_seguimiento -> 'ocurrido_en' <> 'null'::jsonb then
    v_ocurrido := public._seguimiento_fecha(p_seguimiento -> 'ocurrido_en');
  end if;

  if p_recordatorio is not null and p_recordatorio <> 'null'::jsonb then
    if jsonb_typeof(p_recordatorio) <> 'object' then
      raise exception 'Elige cuándo recordarlo.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    begin
      v_recordar := (p_recordatorio ->> 'recordar_en')::timestamptz;
    exception when others then
      v_recordar := null;
    end;
    v_recordar := public._recordatorio_cuando(v_recordar, 'recordatorio.recordar_en');
  end if;

  begin
    insert into public.seguimientos (id, lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto,
                                     visibilidad, ocurrido_en, actualizado_en)
    values (p_id, l.id, (select auth.uid()), v_tipo, v_titulo, v_doc, v_texto, v_visibilidad, v_ocurrido, clock_timestamp())
    returning * into s;
  exception when unique_violation then
    -- El mismo intento llegó dos veces a la vez (doble clic): el otro ya lo guardó.
    select * into s from public.seguimientos x where x.id = p_id;
    if s.usuario_id = (select auth.uid()) and s.lead_id = l.id then
      return jsonb_build_object('resultado', 'repetido', 'seguimiento', public._seguimiento_json(s), 'recordatorio', null);
    end if;
    raise exception 'No pudimos guardar este seguimiento. Vuelve a intentarlo.' using errcode = '22023';
  end;

  if v_recordar is not null then
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en, actualizado_en)
    values ((select auth.uid()), l.id,
            public._recordatorio_titulo(coalesce(nullif(btrim(p_recordatorio ->> 'titulo'), ''), v_titulo), 'recordatorio.titulo'),
            v_recordar, clock_timestamp())
    returning * into r;
  end if;

  perform public.registrar_actividad('lead.seguimiento_creado', 'leads', l.id::text, null, null,
    jsonb_build_object('seguimiento', s.id, 'tipo', s.tipo_id, 'visibilidad', s.visibilidad));
  return jsonb_build_object('resultado', 'creado', 'seguimiento', public._seguimiento_json(s),
    'recordatorio', case when r.id is not null then public._recordatorio_json(r) end);
end;
$$;
revoke all on function public.seguimiento_crear(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.seguimiento_crear(uuid, uuid, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Seguimientos: editar, eliminar y restaurar
-- ---------------------------------------------------------------------------
-- `p_cambios`: un subconjunto de {tipo_id, titulo, detalle, visibilidad, ocurrido_en}. Lo que ya
-- está guardado no choca (un reintento no choca consigo mismo). Un tipo apagado que el seguimiento
-- ya tiene se conserva; pasar a otro apagado, no. Devuelve `{resultado: guardado | sin_cambios, seguimiento}`.
create or replace function public.seguimiento_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.seguimientos;
  n public.seguimientos;
  v_tipo uuid;
  v_titulo text;
  v_doc jsonb;
  v_texto text;
  v_visibilidad public.visibilidad_seguimiento;
  v_ocurrido timestamptz;
  v_k text;
begin
  s := public._seguimiento_mio(p_id);
  if s.eliminado_en is not null then
    raise exception 'No encontramos este seguimiento o no tienes acceso.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un seguimiento tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('tipo_id', 'titulo', 'detalle', 'visibilidad', 'ocurrido_en') then
      raise exception 'El dato «%» no es de un seguimiento.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;

  v_tipo := s.tipo_id;
  v_titulo := s.titulo;
  v_doc := s.detalle_doc;
  v_texto := s.detalle_texto;
  v_visibilidad := s.visibilidad;
  v_ocurrido := s.ocurrido_en;

  if p_cambios ? 'tipo_id' then
    begin
      v_tipo := nullif(p_cambios ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo := null;
    end;
    if v_tipo is distinct from s.tipo_id
       and (v_tipo is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo and t.activo)) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'tipo_id';
    end if;
  end if;
  if p_cambios ? 'titulo' then
    v_titulo := public._seguimiento_titulo(p_cambios -> 'titulo', 'titulo');
  end if;
  if p_cambios ? 'detalle' then
    v_doc := p_cambios -> 'detalle';
    v_texto := public._seguimiento_detalle(v_doc);
    if v_texto is null then
      v_doc := null;
    end if;
  end if;
  if p_cambios ? 'visibilidad' then
    v_visibilidad := public._seguimiento_visibilidad(p_cambios -> 'visibilidad');
  end if;
  if p_cambios ? 'ocurrido_en' then
    v_ocurrido := public._seguimiento_fecha(p_cambios -> 'ocurrido_en');
  end if;

  if (v_tipo, v_titulo, v_doc, v_texto, v_visibilidad, v_ocurrido)
     is not distinct from (s.tipo_id, s.titulo, s.detalle_doc, s.detalle_texto, s.visibilidad, s.ocurrido_en) then
    return jsonb_build_object('resultado', 'sin_cambios', 'seguimiento', public._seguimiento_json(s));
  end if;
  if s.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._seguimiento_conflicto(s.actualizado_en);
  end if;

  update public.seguimientos x set
    tipo_id = v_tipo, titulo = v_titulo, detalle_doc = v_doc, detalle_texto = v_texto,
    visibilidad = v_visibilidad, ocurrido_en = v_ocurrido,
    actualizado_en = greatest(clock_timestamp(), s.actualizado_en + interval '1 microsecond')
  where x.id = s.id
  returning * into n;
  perform public.registrar_actividad('lead.seguimiento_editado', 'leads', n.lead_id::text, null, null,
    jsonb_build_object('seguimiento', n.id, 'tipo', n.tipo_id, 'visibilidad', n.visibilidad));
  return jsonb_build_object('resultado', 'guardado', 'seguimiento', public._seguimiento_json(n));
end;
$$;
revoke all on function public.seguimiento_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.seguimiento_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Eliminar es lógico. Repetirlo es `sin_cambios`. Devuelve `{resultado, seguimiento}` (con la versión
-- que pide «Deshacer»).
create or replace function public.seguimiento_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.seguimientos; n public.seguimientos;
begin
  s := public._seguimiento_mio(p_id);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if s.eliminado_en is not null then
    return jsonb_build_object('resultado', 'sin_cambios', 'seguimiento', public._seguimiento_json(s));
  end if;
  if s.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._seguimiento_conflicto(s.actualizado_en);
  end if;
  update public.seguimientos x set
    eliminado_en = now(),
    actualizado_en = greatest(clock_timestamp(), s.actualizado_en + interval '1 microsecond')
  where x.id = s.id
  returning * into n;
  perform public.registrar_actividad('lead.seguimiento_eliminado', 'leads', n.lead_id::text, null, null,
    jsonb_build_object('seguimiento', n.id, 'tipo', n.tipo_id, 'visibilidad', n.visibilidad));
  return jsonb_build_object('resultado', 'eliminado', 'seguimiento', public._seguimiento_json(n));
end;
$$;
revoke all on function public.seguimiento_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.seguimiento_eliminar(uuid, timestamptz) to authenticated;

create or replace function public.seguimiento_restaurar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.seguimientos; n public.seguimientos;
begin
  s := public._seguimiento_mio(p_id);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if s.eliminado_en is null then
    return jsonb_build_object('resultado', 'sin_cambios', 'seguimiento', public._seguimiento_json(s));
  end if;
  if s.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._seguimiento_conflicto(s.actualizado_en);
  end if;
  update public.seguimientos x set
    eliminado_en = null,
    actualizado_en = greatest(clock_timestamp(), s.actualizado_en + interval '1 microsecond')
  where x.id = s.id
  returning * into n;
  perform public.registrar_actividad('lead.seguimiento_restaurado', 'leads', n.lead_id::text, null, null,
    jsonb_build_object('seguimiento', n.id, 'tipo', n.tipo_id, 'visibilidad', n.visibilidad));
  return jsonb_build_object('resultado', 'restaurado', 'seguimiento', public._seguimiento_json(n));
end;
$$;
revoke all on function public.seguimiento_restaurar(uuid, timestamptz) from public, anon;
grant execute on function public.seguimiento_restaurar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Seguimientos: leer
-- ---------------------------------------------------------------------------
-- Invoker: la RLS decide qué hay (privado = sólo su autor). Más recientes primero, de a `p_tamano`,
-- con un cursor `(ocurrido_en, id)`. Nunca un conteo: no insinúa que haya privados ajenos.
-- `puede_editar` = es mío y tengo el lead en la cartera con `leads.editar`. Un lead que no se ve: vacío.
create or replace function public.lead_seguimientos(
  p_lead uuid, p_antes_en timestamptz default null, p_antes_id uuid default null, p_tamano int default 20)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_tamano int := least(greatest(coalesce(p_tamano, 20), 1), 50);
  v_puedo boolean;
  v_filas jsonb;
  v_hay_mas boolean;
begin
  v_puedo := public.en_cartera(p_lead) and public.puede_lead(p_lead, 'leads.editar');
  with pagina as (
    select s.*, t.nombre as tipo_nombre, t.icono as tipo_icono, nullif(btrim(p.nombre), '') as autor_nombre
      from public.seguimientos s
      join public.tipos_seguimiento t on t.id = s.tipo_id
      left join public.perfiles p on p.id = s.usuario_id
     where s.lead_id = p_lead
       and (p_antes_en is null or (s.ocurrido_en, s.id) < (p_antes_en, p_antes_id))
     order by s.ocurrido_en desc, s.id desc
     limit v_tamano + 1
  ), numeradas as (
    select pagina.*, row_number() over (order by ocurrido_en desc, id desc) as n from pagina
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'lead_id', x.lead_id,
           'tipo_id', x.tipo_id, 'tipo_nombre', x.tipo_nombre, 'tipo_icono', x.tipo_icono,
           'titulo', x.titulo, 'detalle_doc', x.detalle_doc, 'detalle_texto', x.detalle_texto,
           'visibilidad', x.visibilidad, 'ocurrido_en', x.ocurrido_en, 'actualizado_en', x.actualizado_en,
           'eliminado', false,
           'autor_id', x.usuario_id, 'autor_nombre', x.autor_nombre,
           'es_mio', x.usuario_id = (select auth.uid()))
           order by x.ocurrido_en desc, x.id desc) filter (where x.n <= v_tamano), '[]'::jsonb),
         coalesce(bool_or(x.n > v_tamano), false)
    into v_filas, v_hay_mas
    from numeradas x;
  return jsonb_build_object('seguimientos', v_filas, 'hay_mas', v_hay_mas, 'puedo_anotar', v_puedo);
end;
$$;
revoke all on function public.lead_seguimientos(uuid, timestamptz, uuid, int) from public, anon;
grant execute on function public.lead_seguimientos(uuid, timestamptz, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Recordatorios: crear, editar, completar, eliminar
-- ---------------------------------------------------------------------------
-- Con lead, exige tenerlo en la cartera; sin lead es personal. El intento lleva su id.
-- Devuelve `{resultado: creado | repetido, recordatorio}`.
create or replace function public.recordatorio_crear(p_id uuid, p_lead uuid, p_titulo text, p_recordar_en timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; v_lead uuid; v_titulo text; v_cuando timestamptz;
begin
  perform public.assert_activo();
  if p_lead is not null then
    v_lead := (public._lead_mio(p_lead)).id;
  end if;
  if p_id is null then
    raise exception 'Falta el identificador del recordatorio.' using errcode = '22023';
  end if;
  select * into r from public.recordatorios x where x.id = p_id;
  if found then
    if r.usuario_id = (select auth.uid()) and r.lead_id is not distinct from v_lead then
      return jsonb_build_object('resultado', 'repetido', 'recordatorio', public._recordatorio_json(r));
    end if;
    raise exception 'No pudimos guardar este recordatorio. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v_titulo := public._recordatorio_titulo(p_titulo, 'titulo');
  v_cuando := public._recordatorio_cuando(p_recordar_en, 'recordar_en');
  begin
    insert into public.recordatorios (id, usuario_id, lead_id, titulo, recordar_en, actualizado_en)
    values (p_id, (select auth.uid()), v_lead, v_titulo, v_cuando, clock_timestamp())
    returning * into r;
  exception when unique_violation then
    select * into r from public.recordatorios x where x.id = p_id;
    if r.usuario_id = (select auth.uid()) and r.lead_id is not distinct from v_lead then
      return jsonb_build_object('resultado', 'repetido', 'recordatorio', public._recordatorio_json(r));
    end if;
    raise exception 'No pudimos guardar este recordatorio. Vuelve a intentarlo.' using errcode = '22023';
  end;
  return jsonb_build_object('resultado', 'creado', 'recordatorio', public._recordatorio_json(r));
end;
$$;
revoke all on function public.recordatorio_crear(uuid, uuid, text, timestamptz) from public, anon;
grant execute on function public.recordatorio_crear(uuid, uuid, text, timestamptz) to authenticated;

-- `p_cambios`: un subconjunto de {titulo, recordar_en}. Cambiar la hora exige que sea futura y lo
-- vuelve a dejar por avisar (`notificado_en` nulo). Es suyo aunque haya perdido el lead.
create or replace function public.recordatorio_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; n public.recordatorios; v_titulo text; v_cuando timestamptz; v_k text;
begin
  r := public._recordatorio_mio(p_id);
  if r.eliminado_en is not null then
    raise exception 'No encontramos este recordatorio.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de un recordatorio tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('titulo', 'recordar_en') then
      raise exception 'El dato «%» no es de un recordatorio.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  v_titulo := r.titulo;
  v_cuando := r.recordar_en;
  if p_cambios ? 'titulo' then
    v_titulo := public._recordatorio_titulo(p_cambios ->> 'titulo', 'titulo');
  end if;
  if p_cambios ? 'recordar_en' then
    begin
      v_cuando := (p_cambios ->> 'recordar_en')::timestamptz;
    exception when others then
      v_cuando := null;
    end;
    if v_cuando is distinct from r.recordar_en then
      v_cuando := public._recordatorio_cuando(v_cuando, 'recordar_en');
    end if;
  end if;
  if (v_titulo, v_cuando) is not distinct from (r.titulo, r.recordar_en) then
    return jsonb_build_object('resultado', 'sin_cambios', 'recordatorio', public._recordatorio_json(r));
  end if;
  if r.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._recordatorio_conflicto(r.actualizado_en);
  end if;
  update public.recordatorios x set
    titulo = v_titulo, recordar_en = v_cuando,
    notificado_en = case when v_cuando is distinct from r.recordar_en then null else r.notificado_en end,
    actualizado_en = greatest(clock_timestamp(), r.actualizado_en + interval '1 microsecond')
  where x.id = r.id
  returning * into n;
  return jsonb_build_object('resultado', 'guardado', 'recordatorio', public._recordatorio_json(n));
end;
$$;
revoke all on function public.recordatorio_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.recordatorio_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Poner, no alternar: `p_completado` true completa, false reabre; si ya está así, `sin_cambios`.
create or replace function public.recordatorio_completar(p_id uuid, p_actualizado_en_esperado timestamptz, p_completado boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; n public.recordatorios;
begin
  r := public._recordatorio_mio(p_id);
  if r.eliminado_en is not null then
    raise exception 'No encontramos este recordatorio.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_completado is null then
    raise exception 'Falta decir si se completa o se reabre.' using errcode = '22023';
  end if;
  if (r.completado_en is not null) = p_completado then
    return jsonb_build_object('resultado', 'sin_cambios', 'recordatorio', public._recordatorio_json(r));
  end if;
  if r.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._recordatorio_conflicto(r.actualizado_en);
  end if;
  update public.recordatorios x set
    completado_en = case when p_completado then now() end,
    actualizado_en = greatest(clock_timestamp(), r.actualizado_en + interval '1 microsecond')
  where x.id = r.id
  returning * into n;
  return jsonb_build_object('resultado', case when p_completado then 'completado' else 'reabierto' end,
                            'recordatorio', public._recordatorio_json(n));
end;
$$;
revoke all on function public.recordatorio_completar(uuid, timestamptz, boolean) from public, anon;
grant execute on function public.recordatorio_completar(uuid, timestamptz, boolean) to authenticated;

create or replace function public.recordatorio_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; n public.recordatorios;
begin
  r := public._recordatorio_mio(p_id);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if r.eliminado_en is not null then
    return jsonb_build_object('resultado', 'sin_cambios', 'recordatorio', public._recordatorio_json(r));
  end if;
  if r.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._recordatorio_conflicto(r.actualizado_en);
  end if;
  update public.recordatorios x set
    eliminado_en = now(),
    actualizado_en = greatest(clock_timestamp(), r.actualizado_en + interval '1 microsecond')
  where x.id = r.id
  returning * into n;
  return jsonb_build_object('resultado', 'eliminado', 'recordatorio', public._recordatorio_json(n));
end;
$$;
revoke all on function public.recordatorio_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.recordatorio_eliminar(uuid, timestamptz) to authenticated;

create or replace function public.recordatorio_restaurar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.recordatorios; n public.recordatorios;
begin
  r := public._recordatorio_mio(p_id);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if r.eliminado_en is null then
    return jsonb_build_object('resultado', 'sin_cambios', 'recordatorio', public._recordatorio_json(r));
  end if;
  if r.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._recordatorio_conflicto(r.actualizado_en);
  end if;
  update public.recordatorios x set
    eliminado_en = null,
    actualizado_en = greatest(clock_timestamp(), r.actualizado_en + interval '1 microsecond')
  where x.id = r.id
  returning * into n;
  return jsonb_build_object('resultado', 'restaurado', 'recordatorio', public._recordatorio_json(n));
end;
$$;
revoke all on function public.recordatorio_restaurar(uuid, timestamptz) from public, anon;
grant execute on function public.recordatorio_restaurar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Recordatorios: leer
-- ---------------------------------------------------------------------------
-- Los míos y vivos (la RLS). El lead sale sólo si todavía lo veo: si perdí el acceso, el recordatorio
-- sigue y el lead viene nulo (la RLS de `leads` vacía el `left join`).
create or replace view public.recordatorios_vista with (security_invoker = true) as
select r.id, r.titulo, r.recordar_en, r.notificado_en, r.completado_en, r.creado_en, r.actualizado_en,
       l.id as lead_id, l.nombre as lead_nombre, l.numero as lead_numero
  from public.recordatorios r
  left join public.leads l on l.id = r.lead_id;
revoke all on public.recordatorios_vista from anon, authenticated;
grant select on public.recordatorios_vista to authenticated;
comment on view public.recordatorios_vista is 'Los recordatorios de quien mira (vivos). lead_id, lead_nombre y lead_numero son nulos si ya no ve ese lead: el recordatorio sigue siendo suyo, sin nombrar lo que no ve.';

-- ---------------------------------------------------------------------------
-- La ficha suma los recordatorios vencidos de quien mira (sin otra lectura)
-- ---------------------------------------------------------------------------
create or replace function public.lead_ficha(p_lead uuid)
returns jsonb language plpgsql stable set search_path = '' as $$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo', v.tipo, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'recordatorios_vencidos', (
      select count(*) from public.recordatorios r
       where r.lead_id = p_lead and r.usuario_id = (select auth.uid())
         and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()));
end;
$$;
revoke all on function public.lead_ficha(uuid) from public, anon;
grant execute on function public.lead_ficha(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- El permiso que lo gobierna
-- ---------------------------------------------------------------------------
update public.permisos
   set aplicado_en = 'puede_lead, seguimiento_*, recordatorio_crear (con lead), vehiculo_interesado_marcar, vehiculo_interesado_quitar, vehiculo_vincular'
 where clave = 'leads.editar';
