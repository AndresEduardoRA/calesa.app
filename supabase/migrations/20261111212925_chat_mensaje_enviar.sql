-- Enviar un mensaje por RPC, con menciones y una ficha (paso 7.08-2, C4–C8). `mensaje_enviar` es `security definer`; los ayudantes no.
--
-- Reglas:
--   - Escribir pide `chat.participar` y ser miembro vigente (`es_miembro`: en el canal global, con `chat.global`).
--   - Idempotente por `id` (lo genera el navegador): si ya existe, mío y en esa conversación → `repetido`; si no, 22023 sin decir de quién es.
--   - El cuerpo guarda la referencia y nunca el nombre: cada mención va en el texto como `#[<tipo>:<uuid>]` y el conjunto de tokens del cuerpo es
--     igual al de `p_menciones` (D2; así, mismo cuerpo ⇒ mismas menciones). Hasta 20.
--   - Mencionar o mandar en ficha un vehículo, un lead o una cotización exige verlo (D3); quien lee hidrata la ficha bajo su propia RLS.
--   - Una mención a una persona que es miembro vigente le deja el aviso `mencion` (sin copiar el texto), aunque tenga la conversación silenciada (D4).
--   - Una ficha de tarea o de evento no sale de aquí: tiene su RPC (D16). `ultimo_mensaje_en` lo mueve el trigger de 7.08-1 (C8: no avisa nada más).

-- C4 · Miembro vigente de un tercero: fila de miembro y, en el canal global, `chat.global` (la regla de `es_miembro` para otra persona).
create or replace function public._chat_miembro_vigente(p_conversacion uuid, p_usuario uuid) returns boolean
  language sql stable
  set search_path = ''
as $$
  select exists (
    select 1
      from public.conversaciones_miembros m
      join public.conversaciones c on c.id = m.conversacion_id
     where m.conversacion_id = p_conversacion
       and m.usuario_id = p_usuario
       and case when c.es_global then public.usuario_tiene_permiso(p_usuario, 'chat.global') else true end
  );
$$;
revoke all on function public._chat_miembro_vigente(uuid, uuid) from public, anon, authenticated;

-- C5 · El cuerpo sin blancos de los bordes; vacío vale nulo. Obligatorio y nulo, o de más de 4.000 caracteres → 22023 (D5).
create or replace function public._chat_cuerpo(p_cuerpo text, p_obligatorio boolean) returns text
  language plpgsql immutable
  set search_path = ''
as $$
declare v text := nullif(btrim(p_cuerpo, E' \t\r\n'), '');
begin
  if (v is null and p_obligatorio) or char_length(v) > 4000 then
    raise exception 'Escribe un mensaje de hasta 4.000 caracteres.' using errcode = '22023', hint = 'cuerpo';
  end if;
  return v;
end;
$$;
revoke all on function public._chat_cuerpo(text, boolean) from public, anon, authenticated;

-- C6 · Valida y deja exactamente las menciones del mensaje; avisa a las personas mencionadas que son miembros vigentes.
create or replace function public._chat_menciones_guardar(p_mensaje uuid, p_conversacion uuid, p_cuerpo text, p_menciones jsonb) returns void
  language plpgsql
  set search_path = ''
as $$
declare
  yo uuid := (select auth.uid());
  v jsonb := case when p_menciones is null or p_menciones = 'null'::jsonb then '[]'::jsonb else p_menciones end;
  e jsonb; v_tipo text; v_id uuid; v_ok boolean;
  v_pedidas text[] := '{}'; v_tokens text[];
begin
  if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 20 then
    raise exception 'Puedes mencionar hasta 20 veces en un mensaje.' using errcode = '22023', hint = 'menciones';
  end if;
  for e in select x from jsonb_array_elements(v) x loop
    v_tipo := case when jsonb_typeof(e) = 'object' then e ->> 'tipo' end;
    if v_tipo is null or v_tipo not in ('usuario', 'vehiculo', 'lead', 'cotizacion') then
      raise exception 'Esa mención no es válida.' using errcode = '22023', hint = 'menciones';
    end if;
    v_id := public._uuid_de(e -> 'id', 'menciones');
    if v_id is null then
      raise exception 'Esa mención no es válida.' using errcode = '22023', hint = 'menciones';
    end if;
    v_pedidas := v_pedidas || (v_tipo || ':' || v_id::text);
  end loop;
  v_pedidas := array(select distinct x from unnest(v_pedidas) x order by 1);
  v_tokens := array(
    select distinct m[1] || ':' || lower(m[2])
      from regexp_matches(coalesce(p_cuerpo, ''),
                          '#\[(usuario|vehiculo|lead|cotizacion):([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]', 'g') m
     order by 1);
  if v_tokens is distinct from v_pedidas then
    raise exception 'Cada mención va en el texto.' using errcode = '22023', hint = 'menciones';
  end if;
  for v_tipo, v_id in select split_part(x, ':', 1), split_part(x, ':', 2)::uuid from unnest(v_pedidas) x loop
    v_ok := case v_tipo
              when 'vehiculo' then public.puede_vehiculo(v_id, 'vehiculos.ver')
              when 'lead' then public.puede_lead(v_id, 'leads.ver')
              when 'cotizacion' then public.puede_cotizacion(v_id, 'cotizaciones.ver')
              else true
            end;
    if not v_ok then
      raise exception 'No encontramos lo que mencionaste o no tienes acceso.' using errcode = '42501', hint = 'menciones';
    end if;
  end loop;
  delete from public.mensajes_menciones mm where mm.mensaje_id = p_mensaje;
  insert into public.mensajes_menciones (mensaje_id, tipo, referencia_id)
  select p_mensaje, split_part(x, ':', 1), split_part(x, ':', 2)::uuid from unnest(v_pedidas) x;
  for v_id in
    select split_part(x, ':', 2)::uuid from unnest(v_pedidas) x where split_part(x, ':', 1) = 'usuario'
  loop
    if v_id is distinct from yo and public._chat_miembro_vigente(p_conversacion, v_id) then
      perform public.notificar(v_id, 'mencion', 'Te mencionaron en el chat', null, 'mensaje', p_mensaje, '/chat?c=' || p_conversacion, false);
    end if;
  end loop;
end;
$$;
revoke all on function public._chat_menciones_guardar(uuid, uuid, text, jsonb) from public, anon, authenticated;

-- C7
create or replace function public.mensaje_enviar(p_id uuid, p_conversacion uuid, p_cuerpo text, p_menciones jsonb default '[]',
                                                 p_responde_a uuid default null, p_ficha jsonb default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  yo uuid := (select auth.uid()); r public.mensajes;
  v_tipo text := 'texto'; v_ref uuid; v_ok boolean; v_cuerpo text;
begin
  perform public.assert_permiso('chat.participar');
  if p_id is null then
    raise exception 'Falta el identificador del mensaje.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.mensajes m where m.id = p_id;
  if found then
    if r.autor_id = yo and r.conversacion_id = p_conversacion then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'creado_en', r.creado_en);
    end if;
    raise exception 'No pudimos enviar este mensaje. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  if p_conversacion is null or not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  if p_ficha is not null and p_ficha <> 'null'::jsonb then
    v_tipo := case when jsonb_typeof(p_ficha) = 'object' then p_ficha ->> 'tipo' end;
    if v_tipo in ('tarea', 'evento') then
      raise exception 'Una tarea o un evento se crean con su comando.' using errcode = '22023', hint = 'ficha';
    end if;
    if v_tipo is null or v_tipo not in ('vehiculo', 'lead', 'cotizacion') then
      raise exception 'Esa ficha no es válida.' using errcode = '22023', hint = 'ficha';
    end if;
    v_ref := public._uuid_de(p_ficha -> 'id', 'ficha');
    if v_ref is null then
      raise exception 'Esa ficha no es válida.' using errcode = '22023', hint = 'ficha';
    end if;
    v_ok := case v_tipo
              when 'vehiculo' then public.puede_vehiculo(v_ref, 'vehiculos.ver')
              when 'lead' then public.puede_lead(v_ref, 'leads.ver')
              else public.puede_cotizacion(v_ref, 'cotizaciones.ver')
            end;
    if not v_ok then
      raise exception 'No encontramos esa ficha o no tienes acceso.' using errcode = '42501', hint = 'ficha';
    end if;
  end if;
  v_cuerpo := public._chat_cuerpo(p_cuerpo, v_tipo = 'texto');
  if p_responde_a is not null
     and not exists (select 1 from public.mensajes m where m.id = p_responde_a and m.conversacion_id = p_conversacion) then
    raise exception 'Ese mensaje no está en esta conversación.' using errcode = '22023', hint = 'responde_a';
  end if;
  begin
    insert into public.mensajes (id, conversacion_id, autor_id, tipo, cuerpo, vehiculo_id, lead_id, cotizacion_id, responde_a_id, creado_en)
    values (p_id, p_conversacion, yo, v_tipo::public.tipo_mensaje, v_cuerpo,
            case when v_tipo = 'vehiculo' then v_ref end, case when v_tipo = 'lead' then v_ref end, case when v_tipo = 'cotizacion' then v_ref end,
            p_responde_a, clock_timestamp())
    returning * into r;
  exception when unique_violation then
    select * into r from public.mensajes m where m.id = p_id;
    if r.autor_id = yo and r.conversacion_id = p_conversacion then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'creado_en', r.creado_en);
    end if;
    raise exception 'No pudimos enviar este mensaje. Vuelve a intentarlo.' using errcode = '22023';
  end;
  perform public._chat_menciones_guardar(r.id, p_conversacion, v_cuerpo, p_menciones);
  return jsonb_build_object('resultado', 'enviado', 'id', r.id, 'creado_en', r.creado_en);
end;
$$;
revoke all on function public.mensaje_enviar(uuid, uuid, text, jsonb, uuid, jsonb) from public, anon;
grant execute on function public.mensaje_enviar(uuid, uuid, text, jsonb, uuid, jsonb) to authenticated;
