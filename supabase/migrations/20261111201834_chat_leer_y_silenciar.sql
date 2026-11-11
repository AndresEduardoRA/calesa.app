-- Marcar leída y silenciar una conversación por RPC (paso 7.08-1, C12). Las dos `security definer`, sobre la fila propia de miembro.
--
-- Reglas:
--   - Quien está de baja o bloqueado no escribe (`assert_activo()` primero). Si no es miembro (el global pide `chat.global`), 42501.
--   - `chat_leer(p, p_hasta)` recibe hasta dónde se leyó (D9): no lee `mensajes`, así un mensaje de otra transacción con hora anterior no queda
--     leído sin verse. Se acota a la hora actual y nunca retrocede. Responde `{resultado: leido | sin_cambios, id, ultimo_leido_en}`.
--   - `chat_silenciar(p, p_silenciada)` cambia sólo la fila propia: `{resultado: guardado | sin_cambios, id}`. Sin versión (D7).

create or replace function public.chat_leer(p_conversacion uuid, p_hasta timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); v_hasta timestamptz; v timestamptz;
begin
  perform public.assert_activo();
  if p_conversacion is null then
    raise exception 'Falta la conversación.' using errcode = '22023', hint = 'conversacion';
  end if;
  if p_hasta is null then
    raise exception 'Falta hasta dónde leíste.' using errcode = '22023', hint = 'hasta';
  end if;
  if not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  v_hasta := least(p_hasta, clock_timestamp());
  update public.conversaciones_miembros m set ultimo_leido_en = v_hasta
   where m.conversacion_id = p_conversacion and m.usuario_id = yo and (m.ultimo_leido_en is null or m.ultimo_leido_en < v_hasta)
  returning m.ultimo_leido_en into v;
  if found then
    return jsonb_build_object('resultado', 'leido', 'id', p_conversacion, 'ultimo_leido_en', v);
  end if;
  select m.ultimo_leido_en into v from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id = yo;
  return jsonb_build_object('resultado', 'sin_cambios', 'id', p_conversacion, 'ultimo_leido_en', v);
end;
$$;
revoke all on function public.chat_leer(uuid, timestamptz) from public, anon;
grant execute on function public.chat_leer(uuid, timestamptz) to authenticated;

create or replace function public.chat_silenciar(p_conversacion uuid, p_silenciada boolean) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  if p_conversacion is null then
    raise exception 'Falta la conversación.' using errcode = '22023', hint = 'conversacion';
  end if;
  if p_silenciada is null then
    raise exception 'Di si la silencias o no.' using errcode = '22023', hint = 'silenciada';
  end if;
  if not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  update public.conversaciones_miembros m set silenciada = p_silenciada
   where m.conversacion_id = p_conversacion and m.usuario_id = yo and m.silenciada is distinct from p_silenciada;
  return jsonb_build_object('resultado', case when found then 'guardado' else 'sin_cambios' end, 'id', p_conversacion);
end;
$$;
revoke all on function public.chat_silenciar(uuid, boolean) from public, anon;
grant execute on function public.chat_silenciar(uuid, boolean) to authenticated;
