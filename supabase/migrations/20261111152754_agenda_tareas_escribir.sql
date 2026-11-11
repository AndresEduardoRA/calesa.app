-- Escribir tareas por RPC (paso 7.06-1, C11–C18 de tareas): `tarea_crear`, `tarea_guardar`, `tarea_completar`, `tarea_eliminar` y
-- `reasignar_tarea` con versión (cambia de firma: se va la de `(uuid, uuid)`). Todas `security definer`. La escritura directa se fue en
-- `…_agenda_tareas_sin_escritura_directa.sql`.
--
-- Reglas:
--   - Quien está de baja o bloqueado no escribe (`assert_activo()` primero).
--   - Crear es idempotente por el `id` del navegador. Dar la tarea a otro exige agenda.tareas.asignar y que quien la recibe esté activo, sin bloqueo y
--     con agenda.tareas.recibir (`_agenda_puede_recibir`; `usuario_tiene_permiso` solo no mira la baja ni el bloqueo). No vence en el pasado.
--   - Con `p_conversacion` (la tarea nace en el chat): quien la crea es miembro y quien la recibe también (D3); se guarda en `conversacion_id` y no cambia.
--   - D2: el creador la edita, la elimina y la reasigna; el responsable sólo la completa y la reabre.
--   - Editar: la fila `for update`; si no la ve, 42501 «No encontramos esta tarea.»; si no le toca, 42501; luego `sin_cambios` y recién ahí la versión
--     (PT409). Un tercero no averigua nada de una tarea ajena.
--   - `p_datos` como en eventos (D15): presente = cambio, ausente = sin tocar, nulo = quitar; clave desconocida, 22023. El responsable no cambia al
--     guardar: se reasigna.
--   - Completar, eliminar o reasignar accionan la `tarea_asignada` abierta del responsable (al reasignar, la del anterior). El aviso al nuevo responsable
--     lo sigue dando `tarea_notificar()`.
--   - Responden `{resultado, id, actualizado_en}`.

-- Puede recibir una tarea: activo, sin bloqueo y con agenda.tareas.recibir.
create or replace function public._agenda_puede_recibir(p_usuario uuid) returns boolean
  language sql stable
  set search_path = ''
as $$
  select exists (select 1 from public.perfiles pf where pf.id = p_usuario and pf.activo and not pf.bloqueado)
     and public.usuario_tiene_permiso(p_usuario, 'agenda.tareas.recibir');
$$;

-- Aplica `p_datos` sobre la tarea (al crear, una vacía) y valida el resultado.
create or replace function public._agenda_tarea_datos(p_actual public.tareas, p_datos jsonb) returns public.tareas
  language plpgsql stable
  set search_path = ''
as $$
declare v public.tareas := p_actual; v_k text;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de una tarea tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_datos) loop
    if v_k not in ('titulo', 'descripcion', 'vence_en', 'responsable_id', 'lead_id', 'vehiculo_id', 'cotizacion_id') then
      raise exception 'El dato «%» no es de una tarea.', v_k using errcode = '22023', hint = v_k;
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
  if p_datos ? 'vence_en' then
    v.vence_en := public._agenda_fecha(p_datos -> 'vence_en', 'vence_en');
    if v.vence_en is distinct from p_actual.vence_en and v.vence_en < now() then
      raise exception 'El vencimiento no puede quedar en el pasado.' using errcode = '23514', hint = 'vence_en';
    end if;
  end if;
  if p_datos ? 'responsable_id' then v.responsable_id := public._uuid_de(p_datos -> 'responsable_id', 'responsable_id'); end if;
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

-- La fila de una tarea que quien llama ve, tomada `for update` (orden de D17). Quién puede cambiarla lo decide cada RPC.
create or replace function public._agenda_tarea_tomar(p_tarea uuid) returns public.tareas
  language plpgsql
  set search_path = ''
as $$
declare r public.tareas; yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  select * into r from public.tareas x where x.id = p_tarea for update;
  if not found or r.eliminado_en is not null
     or not coalesce(r.responsable_id = yo or r.creado_por = yo or public.tiene_permiso('agenda.ver_todo')
                     or (r.conversacion_id is not null and public.es_miembro(r.conversacion_id)), false) then
    raise exception 'No encontramos esta tarea.' using errcode = '42501';
  end if;
  return r;
end;
$$;

-- Deja de pedirle algo a esa persona: acciona su `tarea_asignada` abierta.
create or replace function public._agenda_tarea_accionar(p_tarea uuid, p_usuario uuid) returns void
  language sql
  set search_path = ''
as $$
  update public.notificaciones nt set accionada_en = now()
   where nt.usuario_id = p_usuario and nt.tipo = 'tarea_asignada' and nt.referencia_id = p_tarea and nt.accionada_en is null;
$$;

create or replace function public.tarea_crear(p_id uuid, p_datos jsonb, p_conversacion uuid default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.tareas; v public.tareas; yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el identificador de la tarea.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.tareas x where x.id = p_id;
  if found then
    if r.creado_por = yo then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'actualizado_en', r.actualizado_en);
    end if;
    raise exception 'No pudimos guardar esta tarea. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v := public._agenda_tarea_datos(v, p_datos);
  v.responsable_id := coalesce(v.responsable_id, yo);
  if v.responsable_id <> yo then
    perform public.assert_permiso('agenda.tareas.asignar');
    if not public._agenda_puede_recibir(v.responsable_id) then
      raise exception 'Esa persona no puede recibir tareas.' using errcode = '23514', hint = 'responsable_id';
    end if;
  end if;
  if p_conversacion is not null then
    if not public.es_miembro(p_conversacion) then
      raise exception 'No estás en esa conversación.' using errcode = '42501', hint = 'conversacion_id';
    end if;
    if not exists (select 1 from public.conversaciones_miembros cm where cm.conversacion_id = p_conversacion and cm.usuario_id = v.responsable_id) then
      raise exception 'Esa persona no está en la conversación de la tarea.' using errcode = '23514', hint = 'responsable_id';
    end if;
  end if;
  begin
    insert into public.tareas (id, titulo, descripcion, vence_en, responsable_id, creado_por, lead_id, vehiculo_id, cotizacion_id, conversacion_id, actualizado_en)
    values (p_id, v.titulo, v.descripcion, v.vence_en, v.responsable_id, yo, v.lead_id, v.vehiculo_id, v.cotizacion_id, p_conversacion, clock_timestamp())
    returning * into r;
  exception when unique_violation then
    select * into r from public.tareas x where x.id = p_id;
    if r.creado_por = yo then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id, 'actualizado_en', r.actualizado_en);
    end if;
    raise exception 'No pudimos guardar esta tarea. Vuelve a intentarlo.' using errcode = '22023';
  end;
  return jsonb_build_object('resultado', 'creado', 'id', r.id, 'actualizado_en', r.actualizado_en);
end;
$$;

create or replace function public.tarea_guardar(p_tarea uuid, p_actualizado_en_esperado timestamptz, p_datos jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.tareas; v public.tareas; n public.tareas;
begin
  r := public._agenda_tarea_tomar(p_tarea);
  if r.creado_por is distinct from (select auth.uid()) then
    raise exception 'Sólo quien creó la tarea puede editarla.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_datos) = 'object' and p_datos ? 'responsable_id' then
    raise exception 'Para cambiar el responsable, reasigna la tarea.' using errcode = '22023', hint = 'responsable_id';
  end if;
  v := public._agenda_tarea_datos(r, p_datos);
  if (v.titulo, v.descripcion, v.vence_en, v.lead_id, v.vehiculo_id, v.cotizacion_id)
     is not distinct from (r.titulo, r.descripcion, r.vence_en, r.lead_id, r.vehiculo_id, r.cotizacion_id) then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id, 'actualizado_en', r.actualizado_en);
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Esta tarea cambió mientras la veías. Recarga para seguir desde la última versión.');
  update public.tareas x set
    titulo = v.titulo, descripcion = v.descripcion, vence_en = v.vence_en, lead_id = v.lead_id, vehiculo_id = v.vehiculo_id, cotizacion_id = v.cotizacion_id
  where x.id = r.id
  returning * into n;
  return jsonb_build_object('resultado', 'guardado', 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

create or replace function public.tarea_completar(p_tarea uuid, p_actualizado_en_esperado timestamptz, p_completada boolean) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.tareas; n public.tareas; yo uuid := (select auth.uid());
begin
  r := public._agenda_tarea_tomar(p_tarea);
  if yo is distinct from r.creado_por and yo is distinct from r.responsable_id then
    raise exception 'Sólo quien creó la tarea o su responsable pueden completarla.' using errcode = '42501';
  end if;
  if p_completada is null then
    raise exception 'Falta decir si la tarea queda completada.' using errcode = '22023', hint = 'completada';
  end if;
  if (r.estado = 'completado') = p_completada then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id, 'actualizado_en', r.actualizado_en);
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Esta tarea cambió mientras la veías. Recarga para seguir desde la última versión.');
  update public.tareas x set
    estado = case when p_completada then 'completado'::public.estado_agenda else 'pendiente'::public.estado_agenda end,
    completada_en = case when p_completada then now() end
  where x.id = r.id
  returning * into n;
  if p_completada then
    perform public._agenda_tarea_accionar(n.id, n.responsable_id);
  end if;
  return jsonb_build_object('resultado', case when p_completada then 'completada' else 'reabierta' end, 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

create or replace function public.tarea_eliminar(p_tarea uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.tareas; n public.tareas;
begin
  r := public._agenda_tarea_tomar(p_tarea);
  if r.creado_por is distinct from (select auth.uid()) then
    raise exception 'Sólo quien creó la tarea puede eliminarla.' using errcode = '42501';
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Esta tarea cambió mientras la veías. Recarga para seguir desde la última versión.');
  update public.tareas x set eliminado_en = now() where x.id = r.id returning * into n;
  perform public._agenda_tarea_accionar(n.id, n.responsable_id);
  return jsonb_build_object('resultado', 'eliminada', 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

drop function public.reasignar_tarea(uuid, uuid);

create or replace function public.reasignar_tarea(p_tarea uuid, p_actualizado_en_esperado timestamptz, p_responsable uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare r public.tareas; n public.tareas; yo uuid := (select auth.uid());
begin
  perform public.assert_permiso('agenda.tareas.asignar');
  r := public._agenda_tarea_tomar(p_tarea);
  if r.creado_por is distinct from yo then
    raise exception 'Sólo quien creó la tarea puede reasignarla.' using errcode = '42501';
  end if;
  if p_responsable is null then
    raise exception 'Elige a quién darle la tarea.' using errcode = '22023', hint = 'responsable_id';
  end if;
  if p_responsable = r.responsable_id then
    return jsonb_build_object('resultado', 'sin_cambios', 'id', r.id, 'actualizado_en', r.actualizado_en);
  end if;
  if p_responsable <> yo and not public._agenda_puede_recibir(p_responsable) then
    raise exception 'Esa persona no puede recibir tareas.' using errcode = '23514', hint = 'responsable_id';
  end if;
  if r.conversacion_id is not null
     and not exists (select 1 from public.conversaciones_miembros cm where cm.conversacion_id = r.conversacion_id and cm.usuario_id = p_responsable) then
    raise exception 'Esa persona no está en la conversación de la tarea.' using errcode = '23514', hint = 'responsable_id';
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado, 'Esta tarea cambió mientras la veías. Recarga para seguir desde la última versión.');
  update public.tareas x set responsable_id = p_responsable where x.id = r.id returning * into n;
  perform public._agenda_tarea_accionar(n.id, r.responsable_id);
  return jsonb_build_object('resultado', 'reasignada', 'id', n.id, 'actualizado_en', n.actualizado_en);
end;
$$;

-- C18 · privilegios
revoke all on function public._agenda_puede_recibir(uuid) from public, anon, authenticated;
revoke all on function public._agenda_tarea_datos(public.tareas, jsonb) from public, anon, authenticated;
revoke all on function public._agenda_tarea_tomar(uuid) from public, anon, authenticated;
revoke all on function public._agenda_tarea_accionar(uuid, uuid) from public, anon, authenticated;
grant execute on function public._agenda_puede_recibir(uuid) to service_role;
grant execute on function public._agenda_tarea_datos(public.tareas, jsonb) to service_role;
grant execute on function public._agenda_tarea_tomar(uuid) to service_role;
grant execute on function public._agenda_tarea_accionar(uuid, uuid) to service_role;

revoke all on function public.tarea_crear(uuid, jsonb, uuid) from public, anon;
revoke all on function public.tarea_guardar(uuid, timestamptz, jsonb) from public, anon;
revoke all on function public.tarea_completar(uuid, timestamptz, boolean) from public, anon;
revoke all on function public.tarea_eliminar(uuid, timestamptz) from public, anon;
revoke all on function public.reasignar_tarea(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.tarea_crear(uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function public.tarea_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
grant execute on function public.tarea_completar(uuid, timestamptz, boolean) to authenticated, service_role;
grant execute on function public.tarea_eliminar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.reasignar_tarea(uuid, timestamptz, uuid) to authenticated, service_role;

comment on function public.tarea_crear(uuid, jsonb, uuid) is 'Crea una tarea con el id del navegador. Para otro exige agenda.tareas.asignar y que reciba (activo, sin bloqueo, agenda.tareas.recibir); no vence en el pasado; con p_conversacion, los dos son miembros. Responde {resultado, id, actualizado_en} (7.06-1).';
comment on function public.tarea_guardar(uuid, timestamptz, jsonb) is 'Guarda una tarea propia (sólo el creador) con su versión (PT409); el responsable no cambia aquí. Responde {resultado, id, actualizado_en} (7.06-1).';
comment on function public.tarea_completar(uuid, timestamptz, boolean) is 'Completa o reabre una tarea (creador o responsable) con su versión (PT409); completar acciona la tarea_asignada. Responde {resultado, id, actualizado_en} (7.06-1).';
comment on function public.tarea_eliminar(uuid, timestamptz) is 'Elimina una tarea propia (sólo el creador) con su versión (PT409) y acciona la tarea_asignada. Responde {resultado, id, actualizado_en} (7.06-1).';
comment on function public.reasignar_tarea(uuid, timestamptz, uuid) is 'Reasigna una tarea propia (creador con agenda.tareas.asignar) con su versión (PT409), a alguien que puede recibir y, si nació en el chat, miembro de esa conversación. Responde {resultado, id, actualizado_en} (7.06-1).';
