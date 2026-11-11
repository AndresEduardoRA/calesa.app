-- Editar y eliminar un mensaje por RPC (paso 7.08-2, C9 y C10). Las dos `security definer`.
--
-- Reglas:
--   - Quien no es miembro vigente (`es_miembro`) no encuentra el mensaje: 42501, como si no existiera.
--   - Editar: sólo el autor, con `chat.participar`, dentro de 15 minutos desde que lo envió (D6), un mensaje vivo. La versión es
--     `coalesce(editado_en, creado_en)` (PT409 si cambió). Mismo cuerpo → `sin_cambios` (por C6, mismo cuerpo ⇒ mismas menciones). Reemplaza
--     el conjunto de menciones (D7).
--   - Eliminar: el autor o quien tiene `chat.moderar`, siempre siendo miembro (la dueña sin atajo). Sin ventana y sin versión (idempotente:
--     repetir da `sin_cambios`, D8). El cuerpo se vacía y las menciones se borran; la ficha (FK) queda.

-- C9
create or replace function public.mensaje_editar(p_mensaje uuid, p_actualizado_en_esperado timestamptz, p_cuerpo text, p_menciones jsonb default '[]')
returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); r public.mensajes; v_cuerpo text;
begin
  perform public.assert_permiso('chat.participar');
  if p_mensaje is null then
    raise exception 'Falta el mensaje.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.mensajes m where m.id = p_mensaje for update;
  if not found or not public.es_miembro(r.conversacion_id) then
    raise exception 'No encontramos este mensaje.' using errcode = '42501';
  end if;
  if r.autor_id <> yo then
    raise exception 'Sólo quien escribió el mensaje puede editarlo.' using errcode = '42501';
  end if;
  if r.eliminado_en is not null then
    raise exception 'Un mensaje eliminado no se edita.' using errcode = '23514';
  end if;
  if clock_timestamp() > r.creado_en + interval '15 minutes' then
    raise exception 'Pasaron más de 15 minutos: el mensaje ya no se edita.' using errcode = '23514', hint = 'cuerpo';
  end if;
  v_cuerpo := public._chat_cuerpo(p_cuerpo, r.tipo = 'texto');
  if v_cuerpo is not distinct from r.cuerpo then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id, 'actualizado_en', coalesce(r.editado_en, r.creado_en));
  end if;
  perform public._exigir_version(coalesce(r.editado_en, r.creado_en), p_actualizado_en_esperado,
                                 'Este mensaje cambió mientras lo editabas. Recarga e intenta de nuevo.');
  update public.mensajes m set cuerpo = v_cuerpo where m.id = r.id returning * into r;
  perform public._chat_menciones_guardar(r.id, r.conversacion_id, v_cuerpo, p_menciones);
  return jsonb_build_object('resultado', 'editado', 'id', r.id, 'actualizado_en', coalesce(r.editado_en, r.creado_en));
end;
$$;
revoke all on function public.mensaje_editar(uuid, timestamptz, text, jsonb) from public, anon;
grant execute on function public.mensaje_editar(uuid, timestamptz, text, jsonb) to authenticated;

-- C10
create or replace function public.mensaje_eliminar(p_mensaje uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); r public.mensajes;
begin
  perform public.assert_activo();
  if p_mensaje is null then
    raise exception 'Falta el mensaje.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.mensajes m where m.id = p_mensaje for update;
  if not found or not public.es_miembro(r.conversacion_id) then
    raise exception 'No encontramos este mensaje.' using errcode = '42501';
  end if;
  if r.eliminado_en is not null then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id);
  end if;
  if r.autor_id <> yo and not public.tiene_permiso('chat.moderar') then
    raise exception 'Sólo quien lo escribió o quien modera puede eliminar este mensaje.' using errcode = '42501';
  end if;
  update public.mensajes m set cuerpo = null, eliminado_en = clock_timestamp() where m.id = r.id;
  delete from public.mensajes_menciones mm where mm.mensaje_id = r.id;
  return jsonb_build_object('resultado', 'eliminado', 'id', r.id);
end;
$$;
revoke all on function public.mensaje_eliminar(uuid) from public, anon;
grant execute on function public.mensaje_eliminar(uuid) to authenticated;
