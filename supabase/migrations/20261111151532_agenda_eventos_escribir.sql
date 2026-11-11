-- Escribir eventos por RPC (paso 7.06-1, C5–C10 y C18 de eventos): `evento_crear`, `evento_guardar` y `evento_eliminar`, todas `security
-- definer`. La escritura directa se fue en `…_agenda_eventos_sin_escritura_directa.sql`.
--
-- Reglas:
--   - Quien está de baja o bloqueado no escribe (`assert_activo()` primero, aunque su sesión siga viva).
--   - Crear es idempotente por el `id` del navegador: el mismo id de la misma persona es `repetido`; de otra, 22023.
--   - Editar y eliminar: la fila `for update`; si no la ve (`puede_evento`), 42501 «No encontramos este evento.»; si la ve y no la creó, 42501;
--     luego `sin_cambios` y recién ahí la versión (`_exigir_version`, PT409). Así un tercero no averigua nada de un evento ajeno.
--   - Publicar: un evento público o «seleccionados» exige agenda.eventos.publicar al crearlo, en todo guardar (también si sólo cambia el título,
--     o si vuelve a privado) y al eliminarlo (D16): lo que todos ven lo cambia sólo quien publica.
--   - `p_datos` (D15): clave presente = cambio, ausente = sin tocar, nulo = quitar; una clave desconocida da 22023 con la clave en el hint.
--   - Destinatarios: reemplazo completo, sin repetidos ni el creador, tope 50; sólo en «seleccionados» (y ahí, al menos uno); quien se suma tiene que
--     estar activo y sin bloqueo. `p_destinatarios` nulo al guardar deja la lista (y la vacía si el evento deja de ser «seleccionados»). Un cambio sólo
--     de destinatarios también mueve la versión. Todo o nada: la RPC es una sentencia.
--   - Vínculos: el lead lo mira `lead_visible_al_escribir()`; el vehículo, `_vehiculo_para_nota()`; la cotización, `_agenda_cotizacion()` (sin leer
--     `public.cotizaciones`: lo hace `puede_cotizacion()`). Sólo se miran si cambian.
--   - Aviso `evento_invitacion` a cada destinatario nuevo (no a quien ya estaba ni al creador), sin pedir acción.
--   - Responden `{resultado, id, actualizado_en}` y nada del contenido (la lectura es de 7.06-2).

-- Una fecha de `p_datos`: nula, o un texto que sea una fecha.
create or replace function public._agenda_fecha(p_valor jsonb, p_hint text) returns timestamptz
  language plpgsql stable
  set search_path = ''
as $$
begin
  if p_valor is null or p_valor = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_valor) <> 'string' then
    raise exception 'Esa fecha no es válida.' using errcode = '22023', hint = p_hint;
  end if;
  return (p_valor #>> '{}')::timestamptz;
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
  raise exception 'Esa fecha no es válida.' using errcode = '22023', hint = p_hint;
end;
$$;

-- La cotización vinculada: quien escribe tiene que verla.
create or replace function public._agenda_cotizacion(p_cot uuid, p_hint text default 'cotizacion_id') returns uuid
  language plpgsql stable
  set search_path = ''
as $$
begin
  if p_cot is null then
    return null;
  end if;
  if not public.puede_cotizacion(p_cot, 'cotizaciones.ver') then
    raise exception 'Esa cotización no existe o no tienes acceso.' using errcode = '42501', hint = p_hint;
  end if;
  return p_cot;
end;
$$;

-- Aplica `p_datos` sobre el evento (al crear, uno vacío y privado) y valida el resultado.
create or replace function public._agenda_evento_datos(p_actual public.eventos, p_datos jsonb) returns public.eventos
  language plpgsql stable
  set search_path = ''
as $$
declare v public.eventos := p_actual; v_k text;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de un evento tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_datos) loop
    if v_k not in ('titulo', 'descripcion', 'inicia_en', 'termina_en', 'lugar', 'visibilidad', 'lead_id', 'vehiculo_id', 'cotizacion_id') then
      raise exception 'El dato «%» no es de un evento.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  if p_datos ? 'titulo' then v.titulo := btrim(p_datos ->> 'titulo'); end if;
  if v.titulo is null or char_length(v.titulo) not between 1 and 120 then
    raise exception 'Escribe un título de hasta 120 caracteres.' using errcode = '22023', hint = 'titulo';
  end if;
  if p_datos ? 'descripcion' then v.descripcion := nullif(btrim(p_datos ->> 'descripcion'), ''); end if;
  if char_length(v.descripcion) > 2000 then
    raise exception 'La descripción admite hasta 2.000 caracteres.' using errcode = '22023', hint = 'descripcion';
  end if;
  if p_datos ? 'lugar' then v.lugar := nullif(btrim(p_datos ->> 'lugar'), ''); end if;
  if char_length(v.lugar) > 200 then
    raise exception 'El lugar admite hasta 200 caracteres.' using errcode = '22023', hint = 'lugar';
  end if;
  if p_datos ? 'inicia_en' then v.inicia_en := public._agenda_fecha(p_datos -> 'inicia_en', 'inicia_en'); end if;
  if v.inicia_en is null then
    raise exception 'Elige cuándo empieza.' using errcode = '22023', hint = 'inicia_en';
  end if;
  if p_datos ? 'termina_en' then v.termina_en := public._agenda_fecha(p_datos -> 'termina_en', 'termina_en'); end if;
  if v.termina_en < v.inicia_en then
    raise exception 'El evento no puede terminar antes de empezar.' using errcode = '22023', hint = 'termina_en';
  end if;
  if p_datos ? 'visibilidad' then
    begin
      v.visibilidad := (p_datos ->> 'visibilidad')::public.visibilidad_evento;
    exception when invalid_text_representation then
      v.visibilidad := null;
    end;
    if v.visibilidad is null then
      raise exception 'Elige quién ve el evento.' using errcode = '22023', hint = 'visibilidad';
    end if;
  end if;
  if p_datos ? 'lead_id' then v.lead_id := public._uuid_de(p_datos -> 'lead_id', 'lead_id'); end if;
  if p_datos ? 'vehiculo_id' then
    v.vehiculo_id := public._uuid_de(p_datos -> 'vehiculo_id', 'vehiculo_id');
    if v.vehiculo_id is distinct from p_actual.vehiculo_id then
      perform public._vehiculo_para_nota(v.vehiculo_id, 'vehiculo_id');
    end if;
  end if;
  if p_datos ? 'cotizacion_id' then
    v.cotizacion_id := public._uuid_de(p_datos -> 'cotizacion_id', 'cotizacion_id');
    if v.cotizacion_id is distinct from p_actual.cotizacion_id then
      perform public._agenda_cotizacion(v.cotizacion_id, 'cotizacion_id');
    end if;
  end if;
  return v;
end;
$$;

-- Los destinatarios que quedarían, ordenados y sin repetir; `p_ya` son los que ya estaban (no se les vuelve a pedir estar activos).
create or replace function public._agenda_destinatarios_validar(p_dest uuid[], p_vis public.visibilidad_evento, p_creador uuid, p_ya uuid[]) returns uuid[]
  language plpgsql stable
  set search_path = ''
as $$
declare v_lista uuid[];
begin
  v_lista := coalesce(array(select distinct u from unnest(p_dest) u where u is not null and u is distinct from p_creador order by u), '{}');
  if cardinality(v_lista) > 50 then
    raise exception 'Puedes elegir hasta 50 personas.' using errcode = '22023', hint = 'destinatarios';
  end if;
  if p_vis <> 'seleccionados' then
    if cardinality(v_lista) > 0 then
      raise exception 'Sólo un evento para personas seleccionadas lleva destinatarios.' using errcode = '22023', hint = 'destinatarios';
    end if;
    return v_lista;
  end if;
  if cardinality(v_lista) = 0 then
    raise exception 'Elige al menos una persona.' using errcode = '23514', hint = 'destinatarios';
  end if;
  if exists (select 1 from unnest(v_lista) u
             where not u = any (coalesce(p_ya, '{}'))
               and not exists (select 1 from public.perfiles pf where pf.id = u and pf.activo and not pf.bloqueado)) then
    raise exception 'Alguna de las personas elegidas ya no está activa.' using errcode = '23514', hint = 'destinatarios';
  end if;
  return v_lista;
end;
$$;

-- Deja exactamente esos destinatarios y avisa a los nuevos.
create or replace function public._agenda_destinatarios_aplicar(p_evento uuid, p_dest uuid[], p_titulo text) returns void
  language plpgsql
  set search_path = ''
as $$
declare v_nuevos uuid[]; u uuid;
begin
  delete from public.eventos_destinatarios ed where ed.evento_id = p_evento and not ed.usuario_id = any (p_dest);
  with nuevos as (
    insert into public.eventos_destinatarios (evento_id, usuario_id)
    select p_evento, x from unnest(p_dest) x
    on conflict do nothing
    returning usuario_id
  )
  select coalesce(array_agg(nv.usuario_id), '{}') into v_nuevos from nuevos nv;
  foreach u in array v_nuevos loop
    perform public.notificar(u, 'evento_invitacion', 'Te invitaron a un evento', p_titulo, 'evento', p_evento, '/agenda?evento=' || p_evento, false);
  end loop;
end;
$$;

create or replace function public.evento_crear(p_id uuid, p_datos jsonb, p_destinatarios uuid[] default '{}') returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.eventos; v public.eventos; v_dest uuid[]; yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador del evento.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.eventos x where x.id = p_id;
  if found then
    if r.creado_por = yo then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'actualizado_en', r.actualizado_en);
    end if;
    raise exception 'No pudimos guardar este evento. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v.visibilidad := 'privado';
  v := public._agenda_evento_datos(v, p_datos);
  if v.visibilidad <> 'privado' then
    perform public.assert_permiso('agenda.eventos.publicar');
  end if;
  v_dest := public._agenda_destinatarios_validar(p_destinatarios, v.visibilidad, yo, '{}');
  begin
    insert into public.eventos (id, titulo, descripcion, inicia_en, termina_en, lugar, visibilidad, lead_id, vehiculo_id, cotizacion_id, creado_por, actualizado_en)
    values (p_id, v.titulo, v.descripcion, v.inicia_en, v.termina_en, v.lugar, v.visibilidad, v.lead_id, v.vehiculo_id, v.cotizacion_id, yo, clock_timestamp())
    returning * into r;
  exception when unique_violation then
    select * into r from public.eventos x where x.id = p_id;
    if r.creado_por = yo then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'actualizado_en', r.actualizado_en);
    end if;
    raise exception 'No pudimos guardar este evento. Vuelve a intentarlo.' using errcode = '22023';
  end;
  perform public._agenda_destinatarios_aplicar(r.id, v_dest, r.titulo);
  return jsonb_build_object('resultado', 'creado', 'id', r.id, 'actualizado_en', r.actualizado_en);
end;
$$;

-- La fila de un evento que quien llama puede cambiar, tomada `for update` (orden de D17).
create or replace function public._agenda_evento_mio(p_evento uuid) returns public.eventos
  language plpgsql
  set search_path = ''
as $$
declare r public.eventos;
begin
  perform public.assert_activo();
  select * into r from public.eventos x where x.id = p_evento for update;
  if not found or r.eliminado_en is not null or not public.puede_evento(p_evento) then
    raise exception 'No encontramos este evento.' using errcode = '42501';
  end if;
  if r.creado_por is distinct from (select auth.uid()) then
    raise exception 'Sólo quien creó el evento puede cambiarlo.' using errcode = '42501';
  end if;
  return r;
end;
$$;

create or replace function public.evento_guardar(p_evento uuid, p_actualizado_en_esperado timestamptz, p_datos jsonb, p_destinatarios uuid[]) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.eventos; v public.eventos; n public.eventos; v_dest uuid[]; v_actuales uuid[];
begin
  r := public._agenda_evento_mio(p_evento);
  v := public._agenda_evento_datos(r, p_datos);
  if r.visibilidad <> 'privado' or v.visibilidad <> 'privado' then
    perform public.assert_permiso('agenda.eventos.publicar');
  end if;
  v_actuales := coalesce(array(select ed.usuario_id from public.eventos_destinatarios ed where ed.evento_id = r.id order by ed.usuario_id), '{}');
  v_dest := public._agenda_destinatarios_validar(
    case when p_destinatarios is not null then p_destinatarios when v.visibilidad = 'seleccionados' then v_actuales else '{}'::uuid[] end,
    v.visibilidad, r.creado_por, v_actuales);
  if (v.titulo, v.descripcion, v.inicia_en, v.termina_en, v.lugar, v.visibilidad, v.lead_id, v.vehiculo_id, v.cotizacion_id)
     is not distinct from (r.titulo, r.descripcion, r.inicia_en, r.termina_en, r.lugar, r.visibilidad, r.lead_id, r.vehiculo_id, r.cotizacion_id)
     and v_dest = v_actuales then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id, 'actualizado_en', r.actualizado_en);
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Este evento cambió mientras lo veías. Recarga para seguir desde la última versión.');
  -- Siempre un update, también si sólo cambian los destinatarios: `agenda_version()` mueve la versión.
  update public.eventos x set
    titulo = v.titulo, descripcion = v.descripcion, inicia_en = v.inicia_en, termina_en = v.termina_en, lugar = v.lugar,
    visibilidad = v.visibilidad, lead_id = v.lead_id, vehiculo_id = v.vehiculo_id, cotizacion_id = v.cotizacion_id
  where x.id = r.id
  returning * into n;
  perform public._agenda_destinatarios_aplicar(n.id, v_dest, n.titulo);
  return jsonb_build_object('resultado', 'guardado', 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

create or replace function public.evento_eliminar(p_evento uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.eventos; n public.eventos;
begin
  r := public._agenda_evento_mio(p_evento);
  if r.visibilidad <> 'privado' then
    perform public.assert_permiso('agenda.eventos.publicar');
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Este evento cambió mientras lo veías. Recarga para seguir desde la última versión.');
  update public.eventos x set eliminado_en = now() where x.id = r.id returning * into n;
  return jsonb_build_object('resultado', 'eliminado', 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

-- C18 · privilegios
revoke all on function public._agenda_fecha(jsonb, text) from public, anon, authenticated;
revoke all on function public._agenda_cotizacion(uuid, text) from public, anon, authenticated;
revoke all on function public._agenda_evento_datos(public.eventos, jsonb) from public, anon, authenticated;
revoke all on function public._agenda_destinatarios_validar(uuid[], public.visibilidad_evento, uuid, uuid[]) from public, anon, authenticated;
revoke all on function public._agenda_destinatarios_aplicar(uuid, uuid[], text) from public, anon, authenticated;
revoke all on function public._agenda_evento_mio(uuid) from public, anon, authenticated;
grant execute on function public._agenda_fecha(jsonb, text) to service_role;
grant execute on function public._agenda_cotizacion(uuid, text) to service_role;
grant execute on function public._agenda_evento_datos(public.eventos, jsonb) to service_role;
grant execute on function public._agenda_destinatarios_validar(uuid[], public.visibilidad_evento, uuid, uuid[]) to service_role;
grant execute on function public._agenda_destinatarios_aplicar(uuid, uuid[], text) to service_role;
grant execute on function public._agenda_evento_mio(uuid) to service_role;

revoke all on function public.evento_crear(uuid, jsonb, uuid[]) from public, anon;
revoke all on function public.evento_guardar(uuid, timestamptz, jsonb, uuid[]) from public, anon;
revoke all on function public.evento_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.evento_crear(uuid, jsonb, uuid[]) to authenticated, service_role;
grant execute on function public.evento_guardar(uuid, timestamptz, jsonb, uuid[]) to authenticated, service_role;
grant execute on function public.evento_eliminar(uuid, timestamptz) to authenticated, service_role;

comment on function public.evento_crear(uuid, jsonb, uuid[]) is 'Crea un evento con el id del navegador (repetido si ya es suyo; 22023 si es ajeno). Público o seleccionados exige agenda.eventos.publicar; destinatarios sólo en seleccionados (1 a 50, activos); avisa evento_invitacion. Responde {resultado, id, actualizado_en} (7.06-1).';
comment on function public.evento_guardar(uuid, timestamptz, jsonb, uuid[]) is 'Guarda un evento propio con su versión (PT409). Lo publicado exige agenda.eventos.publicar en todo guardar; p_datos: presente = cambio, nulo = quitar; p_destinatarios nulo deja la lista. Responde {resultado, id, actualizado_en} (7.06-1).';
comment on function public.evento_eliminar(uuid, timestamptz) is 'Elimina un evento propio con su versión (PT409); uno publicado exige agenda.eventos.publicar. Responde {resultado, id, actualizado_en} (7.06-1).';
