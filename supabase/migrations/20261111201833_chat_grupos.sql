-- Grupos por RPC (paso 7.08-1, C8–C10): crear, cambiar sus miembros y salir. Las tres `security definer`.
--
-- Reglas:
--   - Quien está de baja o bloqueado no escribe (`assert_activo()` primero). Crear y cambiar miembros piden `chat.participar`; salir, no.
--   - Un grupo tiene de 2 a 50 miembros y un nombre de 1 a 80 caracteres (D8). Cada persona que se suma tiene que poder usar el chat (D4).
--   - `chat_grupo_crear` es idempotente por el `id` del navegador: `repetido` si es mío, 22023 si es ajeno.
--   - El grupo lo administra quien lo creó (D6): sólo esa persona agrega y quita. No se quita a sí misma (sale con `chat_salir`). Sin versión
--     (D7): agregar a quien ya está o quitar a quien no está no cambia nada (`sin_cambios`). La conversación se toma `for no key update`.
--   - Una directa no se deja: se silencia (D5). El canal global y los grupos, sí; quien creó el grupo también sale.
--   - «No lo ves» y «no estás» dan el mismo 42501. La membresía de quien llama se decide con `es_miembro()` (el global pide `chat.global`).

create or replace function public.chat_grupo_crear(p_id uuid, p_nombre text, p_miembros uuid[]) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); r public.conversaciones; v_nombre text := btrim(p_nombre); v_otros uuid[]; u uuid;
begin
  perform public.assert_activo();
  perform public.assert_permiso('chat.participar');
  if p_id is null then
    raise exception 'Falta el identificador del grupo.' using errcode = '22023', hint = 'id';
  end if;
  select * into r from public.conversaciones c where c.id = p_id;
  if found then
    if r.creado_por = yo and r.tipo = 'grupo' and not r.es_global then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id);
    end if;
    raise exception 'No pudimos crear este grupo. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  if v_nombre is null or char_length(v_nombre) not between 1 and 80 then
    raise exception 'Ponle al grupo un nombre de hasta 80 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  if p_miembros is null or array_position(p_miembros, null) is not null then
    raise exception 'Elige a quiénes sumas al grupo.' using errcode = '22023', hint = 'miembros';
  end if;
  v_otros := array(select distinct m from unnest(p_miembros) m where m <> yo);
  if cardinality(v_otros) not between 1 and 49 then
    raise exception 'Un grupo tiene de 2 a 50 personas.' using errcode = '22023', hint = 'miembros';
  end if;
  foreach u in array v_otros loop
    if not public._chat_puede_conversar(u) then
      raise exception 'Alguien de la lista no puede usar el chat.' using errcode = '23514', hint = 'miembros';
    end if;
  end loop;
  begin
    insert into public.conversaciones (id, tipo, nombre, creado_por) values (p_id, 'grupo', v_nombre, yo);
  exception when unique_violation then
    select * into r from public.conversaciones c where c.id = p_id;
    if r.creado_por = yo and r.tipo = 'grupo' and not r.es_global then
      return jsonb_build_object('resultado', 'repetido', 'id', r.id);
    end if;
    raise exception 'No pudimos crear este grupo. Vuelve a intentarlo.' using errcode = '22023';
  end;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) select p_id, x from unnest(v_otros || yo) x;
  return jsonb_build_object('resultado', 'creado', 'id', p_id);
end;
$$;
revoke all on function public.chat_grupo_crear(uuid, text, uuid[]) from public, anon;
grant execute on function public.chat_grupo_crear(uuid, text, uuid[]) to authenticated;

create or replace function public.chat_grupo_miembros(p_conversacion uuid, p_agregar uuid[], p_quitar uuid[]) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); c public.conversaciones; v_ag uuid[]; v_qu uuid[]; u uuid; n int; v_total int; v_cambios int := 0;
begin
  perform public.assert_activo();
  perform public.assert_permiso('chat.participar');
  if p_conversacion is null then
    raise exception 'Falta la conversación.' using errcode = '22023', hint = 'conversacion';
  end if;
  if array_position(p_agregar, null) is not null then
    raise exception 'Hay una persona vacía en la lista.' using errcode = '22023', hint = 'agregar';
  end if;
  if array_position(p_quitar, null) is not null then
    raise exception 'Hay una persona vacía en la lista.' using errcode = '22023', hint = 'quitar';
  end if;
  v_ag := array(select distinct x from unnest(coalesce(p_agregar, '{}')) x);
  v_qu := array(select distinct x from unnest(coalesce(p_quitar, '{}')) x);
  if v_ag && v_qu then
    raise exception 'No puedes sumar y quitar a la misma persona.' using errcode = '22023', hint = 'agregar';
  end if;
  select * into c from public.conversaciones x where x.id = p_conversacion for no key update;
  if not found or not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  if c.tipo <> 'grupo' or c.es_global or c.creado_por is distinct from yo then
    raise exception 'Sólo quien creó el grupo cambia sus miembros.' using errcode = '42501';
  end if;
  if yo = any (v_qu) then
    raise exception 'Para dejar el grupo, sal de él.' using errcode = '22023', hint = 'quitar';
  end if;
  -- Cuenta con tope: alcanza saber si pasa de 50.
  select count(*) into v_total from (
    select m.usuario_id from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id <> all (v_qu)
    union
    select x from unnest(v_ag) x
    limit 51
  ) t;
  if v_total > 50 then
    raise exception 'Un grupo tiene hasta 50 personas.' using errcode = '22023', hint = 'agregar';
  end if;
  foreach u in array v_ag loop
    if not exists (select 1 from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id = u)
       and not public._chat_puede_conversar(u) then
      raise exception 'Alguien de la lista no puede usar el chat.' using errcode = '23514', hint = 'agregar';
    end if;
  end loop;
  delete from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id = any (v_qu);
  get diagnostics n = row_count;
  v_cambios := v_cambios + n;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) select p_conversacion, x from unnest(v_ag) x on conflict do nothing;
  get diagnostics n = row_count;
  v_cambios := v_cambios + n;
  return jsonb_build_object('resultado', case when v_cambios > 0 then 'guardado' else 'sin_cambios' end, 'id', p_conversacion);
end;
$$;
revoke all on function public.chat_grupo_miembros(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.chat_grupo_miembros(uuid, uuid[], uuid[]) to authenticated;

create or replace function public.chat_salir(p_conversacion uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); c public.conversaciones;
begin
  perform public.assert_activo();
  if p_conversacion is null then
    raise exception 'Falta la conversación.' using errcode = '22023', hint = 'conversacion';
  end if;
  select * into c from public.conversaciones x where x.id = p_conversacion;
  if not found or not public.es_miembro(p_conversacion) then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  if c.tipo = 'directa' then
    raise exception 'Una conversación directa no se deja: puedes silenciarla.' using errcode = '22023';
  end if;
  delete from public.conversaciones_miembros m where m.conversacion_id = p_conversacion and m.usuario_id = yo;
  return jsonb_build_object('resultado', 'salio', 'id', p_conversacion);
end;
$$;
revoke all on function public.chat_salir(uuid) from public, anon;
grant execute on function public.chat_salir(uuid) to authenticated;
