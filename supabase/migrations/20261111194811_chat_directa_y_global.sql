-- Abrir una directa y entrar al canal global por RPC (paso 7.08-1, C6, C7 y C11). Las dos `security definer`.
--
-- Reglas:
--   - Quien está de baja o bloqueado no escribe (`assert_activo()` primero).
--   - `chat_directa(p_usuario)` pide `chat.participar`. A→B y B→A dan la misma conversación (el par ordenado y su único parcial). Si ya existe,
--     `existente` sin revalidar a la otra persona; si no, la otra tiene que poder usar el chat (`_chat_puede_conversar`: activa, sin bloqueo y con
--     `chat.participar`, D4). Si dos la abren a la vez, el índice único deja una sola y quien pierde la relee (D14).
--   - `chat_global_entrar()` pide `chat.global` y no `chat.participar` (se puede leer sin escribir, D16).
--   - Responden `{resultado, id}` (D15).

-- Puede conversar: activa, sin bloqueo y con chat.participar (`usuario_tiene_permiso` solo no mira la baja ni el bloqueo).
create or replace function public._chat_puede_conversar(p_usuario uuid) returns boolean
  language sql stable
  set search_path = ''
as $$
  select exists (select 1 from public.perfiles pf where pf.id = p_usuario and pf.activo and not pf.bloqueado)
     and public.usuario_tiene_permiso(p_usuario, 'chat.participar');
$$;
revoke all on function public._chat_puede_conversar(uuid) from public, anon, authenticated;

create or replace function public.chat_directa(p_usuario uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); v_par uuid[]; v_id uuid;
begin
  perform public.assert_activo();
  perform public.assert_permiso('chat.participar');
  if p_usuario is null or p_usuario = yo then
    raise exception 'Elige a otra persona del equipo.' using errcode = '22023', hint = 'usuario';
  end if;
  v_par := array[least(yo, p_usuario), greatest(yo, p_usuario)];
  select c.id into v_id from public.conversaciones c where c.par_directo = v_par;
  if v_id is not null then
    return jsonb_build_object('resultado', 'existente', 'id', v_id);
  end if;
  if not public._chat_puede_conversar(p_usuario) then
    raise exception 'Esa persona no puede usar el chat.' using errcode = '23514', hint = 'usuario';
  end if;
  insert into public.conversaciones (tipo, creado_por, par_directo) values ('directa', yo, v_par)
  on conflict (par_directo) where par_directo is not null do nothing
  returning id into v_id;
  if v_id is null then
    -- Otra sesión la abrió a la vez y ganó: el índice esperó su commit y esta lectura ya la ve.
    select c.id into v_id from public.conversaciones c where c.par_directo = v_par;
    return jsonb_build_object('resultado', 'existente', 'id', v_id);
  end if;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v_id, yo), (v_id, p_usuario);
  return jsonb_build_object('resultado', 'creada', 'id', v_id);
end;
$$;
revoke all on function public.chat_directa(uuid) from public, anon;
grant execute on function public.chat_directa(uuid) to authenticated;

create or replace function public.chat_global_entrar() returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare yo uuid := (select auth.uid()); v_id uuid; n int;
begin
  perform public.assert_activo();
  perform public.assert_permiso('chat.global');
  select c.id into v_id from public.conversaciones c where c.es_global;
  if v_id is null then
    raise exception 'No encontramos esta conversación.' using errcode = '42501';
  end if;
  insert into public.conversaciones_miembros (conversacion_id, usuario_id) values (v_id, yo) on conflict do nothing;
  get diagnostics n = row_count;
  return jsonb_build_object('resultado', case when n = 1 then 'entro' else 'ya_estaba' end, 'id', v_id);
end;
$$;
revoke all on function public.chat_global_entrar() from public, anon;
grant execute on function public.chat_global_entrar() to authenticated;
