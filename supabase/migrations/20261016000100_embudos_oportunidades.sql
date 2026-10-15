-- Embudos y oportunidades (Fase 3, parte 7a). Escrito a mano.
--
-- 1. Los embudos son PERSONALES: de cada persona, que no los ve nadie más (ni la supervisión ni la
--    dueña), igual que las marcas. Se leen las tablas (RLS de la dueña) y se escriben sólo por RPC
--    (`embudo_*`): una sola etapa inicial, al menos una ganada y una perdida, nombres sin repetir (sin
--    importar mayúsculas), la paleta cerrada y los topes. Las etapas se guardan como conjunto, de una
--    vez: nunca hay un estado intermedio inválido. La versión es `embudos.actualizado_en`.
-- 2. Una oportunidad es de una persona y de un lead (clase 1): crear, editar, mover, eliminar y
--    restaurar exigen ser su dueña, la cartera del lead y `leads.editar`. Bloquean el lead y vuelven a
--    mirar. Lo ajeno, lo inexistente y un lead que ya no se tiene responden lo mismo.
-- 3. Sólo se ven las propias y mientras se tenga el lead en la cartera (vivo): perder la cartera las
--    oculta sin borrarlas; recuperarla las devuelve. La supervisión ya no lee las ajenas.
-- 4. Mover recibe la etapa que la persona cree que tiene (`p_etapa_esperada`): otra es `PT409`, la
--    misma es `sin_cambios`. El estado lo deriva un trigger de la etapa, y otro escribe el historial.
-- 5. Nada de esto mueve la versión del lead ni lo toca. `actividad` deja constancia (creada, ganada,
--    perdida) sin montos ni notas.

-- ---------------------------------------------------------------------------
-- Las tablas de embudos se leen; se escriben por RPC
-- ---------------------------------------------------------------------------
drop policy if exists "embudos: crear" on public.embudos;
drop policy if exists "embudos: editar" on public.embudos;
drop policy if exists "embudos: borrar" on public.embudos;
revoke insert, update, delete on table public.embudos from anon, authenticated;

drop policy if exists "embudos_etapas: crear" on public.embudos_etapas;
drop policy if exists "embudos_etapas: editar" on public.embudos_etapas;
drop policy if exists "embudos_etapas: borrar" on public.embudos_etapas;
revoke insert, update, delete on table public.embudos_etapas from anon, authenticated;

-- La versión de una oportunidad la sellan sus RPC con la hora del reloj.
drop trigger if exists trg_actualizado_en on public.oportunidades;

-- ---------------------------------------------------------------------------
-- Quién ve una oportunidad
-- ---------------------------------------------------------------------------
-- Los leads vivos de la cartera de quien llama, como arreglo: la policy lo calcula una vez por
-- consulta (InitPlan), no una vez por fila. Sin limbo ni papelera.
create or replace function public._mis_leads_vivos()
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(la.lead_id), '{}'::uuid[])
    from public.leads_asesores la join public.leads l on l.id = la.lead_id
   where la.usuario_id = (select auth.uid()) and la.revocado_en is null and l.eliminado_en is null;
$$;
revoke all on function public._mis_leads_vivos() from public, anon;
grant execute on function public._mis_leads_vivos() to authenticated;

drop policy if exists "oportunidades: leer" on public.oportunidades;
create policy "oportunidades: leer" on public.oportunidades for select to authenticated
  using (usuario_id = (select auth.uid())
         and eliminado_en is null
         and (select public.alcance_de('leads.ver')) is not null
         and lead_id = any ((select public._mis_leads_vivos())::uuid[]));

-- El historial de una oportunidad que se ve (la RLS de `oportunidades` decide).
drop policy if exists "oportunidades_historial: leer" on public.oportunidades_historial;
create policy "oportunidades_historial: leer" on public.oportunidades_historial for select to authenticated
  using (exists (select 1 from public.oportunidades o where o.id = oportunidad_id));

-- ---------------------------------------------------------------------------
-- Estado e historial (triggers)
-- ---------------------------------------------------------------------------
-- Antes: el trigger escribía el historial y fijaba el estado con un segundo UPDATE de la fila. Ahora
-- el estado se deriva antes de escribir, y el historial se escribe después.
drop trigger if exists trg_oportunidad_historial on public.oportunidades;
drop function if exists public.oportunidad_historial();

create or replace function public.oportunidad_estado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ganada boolean; v_perdida boolean;
begin
  if tg_op = 'INSERT' or new.etapa_id is distinct from old.etapa_id then
    select e.es_ganada, e.es_perdida into v_ganada, v_perdida from public.embudos_etapas e where e.id = new.etapa_id;
    new.estado := case when v_ganada then 'ganada' when v_perdida then 'perdida' else 'abierta' end::public.estado_oportunidad;
    if not coalesce(v_perdida, false) then
      new.motivo_perdida := null;
    end if;
    new.ultima_actividad_en := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function public.oportunidad_estado() from public, anon, authenticated;
create trigger trg_oportunidad_estado before insert or update of etapa_id on public.oportunidades
  for each row execute function public.oportunidad_estado();

create or replace function public.oportunidad_historial()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.etapa_id is distinct from old.etapa_id then
    insert into public.oportunidades_historial (oportunidad_id, de_etapa_id, a_etapa_id, usuario_id)
    values (new.id, case when tg_op = 'UPDATE' then old.etapa_id end, new.etapa_id, (select auth.uid()));
  end if;
  return null;
end;
$$;
revoke all on function public.oportunidad_historial() from public, anon, authenticated;
create trigger trg_oportunidad_historial after insert or update of etapa_id on public.oportunidades
  for each row execute function public.oportunidad_historial();

-- ---------------------------------------------------------------------------
-- Embudos: internos
-- ---------------------------------------------------------------------------
-- Un candado por persona para todo lo que cuenta embudos o crea el de por defecto.
create or replace function public._embudos_candado(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('embudos:' || p_usuario::text, 0));
end;
$$;
revoke all on function public._embudos_candado(uuid) from public, anon, authenticated;

create or replace function public._embudo_json(p_embudo uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'nombre', e.nombre, 'es_default', e.es_default, 'actualizado_en', e.actualizado_en,
    'etapas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'nombre', s.nombre, 'color', s.color,
        'es_inicial', s.es_inicial, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida)
        order by s.orden, s.id)
      from public.embudos_etapas s where s.embudo_id = e.id), '[]'::jsonb))
  from public.embudos e where e.id = p_embudo;
$$;
revoke all on function public._embudo_json(uuid) from public, anon, authenticated;

create or replace function public._embudo_nombre(p_nombre text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(coalesce(p_nombre, ''));
begin
  if char_length(v) not between 1 and 40 then
    raise exception 'El nombre de un embudo lleva entre 1 y 40 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  return v;
end;
$$;
revoke all on function public._embudo_nombre(text) from public, anon, authenticated;

create or replace function public._embudo_nombre_libre(p_usuario uuid, p_nombre text, p_excepto uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  select e.nombre into v from public.embudos e
   where e.usuario_id = p_usuario and lower(e.nombre) = lower(p_nombre) and e.id is distinct from p_excepto;
  if found then
    raise exception 'Ya tienes un embudo «%».', v using errcode = '22023', hint = 'nombre';
  end if;
end;
$$;
revoke all on function public._embudo_nombre_libre(uuid, text, uuid) from public, anon, authenticated;

create or replace function public._embudo_conflicto(p_cuando timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Cambiaste este embudo % desde otra ventana. Recarga para seguir desde ahí.', public._hace(p_cuando)
    using errcode = 'PT409';
end;
$$;
revoke all on function public._embudo_conflicto(timestamptz) from public, anon, authenticated;

-- El embudo de quien llama, bloqueado. Uno ajeno o inexistente responde lo mismo.
create or replace function public._embudo_mio(p_embudo uuid)
returns public.embudos language plpgsql security definer set search_path = '' as $$
declare e public.embudos;
begin
  select * into e from public.embudos x where x.id = p_embudo and x.usuario_id = (select auth.uid()) for update;
  if not found then
    raise exception 'No encontramos este embudo. Recarga para ver los tuyos.' using errcode = '42501';
  end if;
  return e;
end;
$$;
revoke all on function public._embudo_mio(uuid) from public, anon, authenticated;

-- Crea un embudo con sus etapas (`[{nombre, color, es_inicial, es_ganada, es_perdida}]`, ya válidas).
create or replace function public._embudo_insertar(p_usuario uuid, p_id uuid, p_nombre text, p_default boolean, p_etapas jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.embudos (id, usuario_id, nombre, es_default, actualizado_en)
  values (coalesce(p_id, gen_random_uuid()), p_usuario, p_nombre, p_default, clock_timestamp())
  returning id into v_id;
  insert into public.embudos_etapas (embudo_id, nombre, color, es_inicial, es_ganada, es_perdida, orden)
  select v_id, x ->> 'nombre', x ->> 'color', coalesce((x ->> 'es_inicial')::boolean, false),
         coalesce((x ->> 'es_ganada')::boolean, false), coalesce((x ->> 'es_perdida')::boolean, false), (o * 10)::smallint
    from jsonb_array_elements(p_etapas) with ordinality t (x, o);
  return v_id;
end;
$$;
revoke all on function public._embudo_insertar(uuid, uuid, text, boolean, jsonb) from public, anon, authenticated;

-- El embudo por defecto de una persona: el que tiene, o el más viejo (que pasa a serlo), o uno nuevo
-- con etapas genéricas editables. Lo usan `embudo_por_defecto()`, crear una oportunidad sin embudo y
-- transferir un lead (el destino puede no tener ninguno todavía).
create or replace function public._embudo_defecto_de(p_usuario uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._embudos_candado(p_usuario);
  select e.id into v_id from public.embudos e where e.usuario_id = p_usuario and e.es_default;
  if found then
    return v_id;
  end if;
  select e.id into v_id from public.embudos e where e.usuario_id = p_usuario order by e.creado_en, e.id limit 1;
  if found then
    update public.embudos e set es_default = true where e.id = v_id;
    return v_id;
  end if;
  return public._embudo_insertar(p_usuario, null, 'Ventas', true, jsonb_build_array(
    jsonb_build_object('nombre', 'Nuevo', 'color', 'gris', 'es_inicial', true),
    jsonb_build_object('nombre', 'Contactado', 'color', 'azul'),
    jsonb_build_object('nombre', 'Cotizado', 'color', 'violeta'),
    jsonb_build_object('nombre', 'Negociación', 'color', 'ambar'),
    jsonb_build_object('nombre', 'Ganado', 'color', 'verde', 'es_ganada', true),
    jsonb_build_object('nombre', 'Perdido', 'color', 'rojo', 'es_perdida', true)));
end;
$$;
revoke all on function public._embudo_defecto_de(uuid) from public, anon, authenticated;

-- Quien usa embudos: activo y con `leads.ver` (son para sus oportunidades).
create or replace function public._embudos_puedo()
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_activo();
  if public.alcance_de('leads.ver') is null then
    raise exception 'No tienes permiso para ver leads.' using errcode = '42501';
  end if;
  return (select auth.uid());
end;
$$;
revoke all on function public._embudos_puedo() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Embudos: RPC (de quien mira)
-- ---------------------------------------------------------------------------
-- Idempotente: devuelve el embudo por defecto, y lo crea la primera vez.
create or replace function public.embudo_por_defecto()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._embudos_puedo(); v_habia boolean; v_id uuid;
begin
  v_habia := exists (select 1 from public.embudos e where e.usuario_id = v_yo);
  -- En su propia sentencia: `_embudo_json` (STABLE) lee con la foto de la sentencia que la llama, y
  -- en la misma no vería el embudo recién creado.
  v_id := public._embudo_defecto_de(v_yo);
  return jsonb_build_object('resultado', case when v_habia then 'existente' else 'creado' end,
    'embudo', public._embudo_json(v_id));
end;
$$;
revoke all on function public.embudo_por_defecto() from public, anon;
grant execute on function public.embudo_por_defecto() to authenticated;

-- Idempotente por id. Nace con tres etapas (inicial, ganada y perdida); si la persona no tenía
-- ninguno, éste es su embudo por defecto.
create or replace function public.embudo_crear(p_id uuid, p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._embudos_puedo(); e public.embudos; v_nombre text;
begin
  if p_id is null then
    raise exception 'Falta el identificador del embudo.' using errcode = '22023';
  end if;
  perform public._embudos_candado(v_yo);
  select * into e from public.embudos x where x.id = p_id;
  if found then
    if e.usuario_id = v_yo then
      return jsonb_build_object('resultado', 'repetido', 'embudo', public._embudo_json(e.id));
    end if;
    raise exception 'No pudimos crear este embudo. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  v_nombre := public._embudo_nombre(p_nombre);
  perform public._embudo_nombre_libre(v_yo, v_nombre, null);
  if (select count(*) from public.embudos x where x.usuario_id = v_yo) >= 10 then
    raise exception 'Puedes tener hasta 10 embudos. Elimina uno para crear otro.' using errcode = '22023', hint = 'nombre';
  end if;
  begin
    perform public._embudo_insertar(v_yo, p_id, v_nombre,
      not exists (select 1 from public.embudos x where x.usuario_id = v_yo),
      jsonb_build_array(
        jsonb_build_object('nombre', 'Nueva', 'color', 'gris', 'es_inicial', true),
        jsonb_build_object('nombre', 'Ganada', 'color', 'verde', 'es_ganada', true),
        jsonb_build_object('nombre', 'Perdida', 'color', 'rojo', 'es_perdida', true)));
  exception when unique_violation then
    raise exception 'No pudimos crear este embudo. Vuelve a intentarlo.' using errcode = '22023';
  end;
  return jsonb_build_object('resultado', 'creado', 'embudo', public._embudo_json(p_id));
end;
$$;
revoke all on function public.embudo_crear(uuid, text) from public, anon;
grant execute on function public.embudo_crear(uuid, text) to authenticated;

create or replace function public.embudo_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_nombre text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._embudos_puedo(); e public.embudos; v_nombre text;
begin
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  e := public._embudo_mio(p_id);
  v_nombre := public._embudo_nombre(p_nombre);
  if v_nombre = e.nombre then
    return jsonb_build_object('resultado', 'sin_cambios', 'embudo', public._embudo_json(e.id));
  end if;
  if e.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._embudo_conflicto(e.actualizado_en);
  end if;
  perform public._embudo_nombre_libre(v_yo, v_nombre, e.id);
  update public.embudos x set nombre = v_nombre,
    actualizado_en = greatest(clock_timestamp(), e.actualizado_en + interval '1 microsecond')
  where x.id = e.id;
  return jsonb_build_object('resultado', 'guardado', 'embudo', public._embudo_json(e.id));
end;
$$;
revoke all on function public.embudo_guardar(uuid, timestamptz, text) from public, anon;
grant execute on function public.embudo_guardar(uuid, timestamptz, text) to authenticated;

-- Sólo un embudo sin oportunidades vivas, y nunca el de por defecto. Las eliminadas de ese embudo
-- (la papelera de quien las eliminó) se van con él. Uno que ya no está: `sin_cambios`.
create or replace function public.embudo_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_yo uuid := public._embudos_puedo(); e public.embudos; n int;
begin
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  perform public._embudos_candado(v_yo);
  select * into e from public.embudos x where x.id = p_id and x.usuario_id = v_yo for update;
  if not found then
    return jsonb_build_object('resultado', 'sin_cambios');
  end if;
  if e.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._embudo_conflicto(e.actualizado_en);
  end if;
  if e.es_default then
    raise exception 'El embudo por defecto no se elimina: puedes renombrarlo.' using errcode = '23514';
  end if;
  select count(*) into n from public.oportunidades o where o.embudo_id = e.id and o.eliminado_en is null;
  if n > 0 then
    raise exception 'Este embudo tiene % %. Elimínalas antes de eliminarlo.', n,
      case when n = 1 then 'oportunidad' else 'oportunidades' end using errcode = '23514';
  end if;
  delete from public.oportunidades o where o.embudo_id = e.id;
  delete from public.embudos x where x.id = e.id;
  return jsonb_build_object('resultado', 'eliminado');
end;
$$;
revoke all on function public.embudo_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.embudo_eliminar(uuid, timestamptz) to authenticated;

-- Reemplaza las etapas de un embudo de una vez. `p_etapas` es el conjunto completo, en su orden:
-- `[{id?, nombre, color, es_inicial, es_ganada, es_perdida}]`. Un id que ya es de este embudo la
-- edita; uno nuevo la crea; una etapa que no viene se quita (si no tiene oportunidades vivas). Lo ya
-- guardado responde `sin_cambios` antes de mirar la versión.
create or replace function public.embudo_etapas_guardar(p_embudo uuid, p_actualizado_en_esperado timestamptz, p_etapas jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  e public.embudos; x jsonb; v_n int; v_ids uuid[] := '{}'::uuid[]; v_id uuid; v_nombres text[] := '{}'::text[]; v_nombre text;
  v_color text; v_ini int := 0; v_gan int := 0; v_per int := 0; v_nueva jsonb := '[]'::jsonb;
  v_quitada record;
begin
  perform public._embudos_puedo();
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  e := public._embudo_mio(p_embudo);
  if p_etapas is null or jsonb_typeof(p_etapas) <> 'array' then
    raise exception 'Las etapas tienen que ser una lista.' using errcode = '22023', hint = 'etapas';
  end if;
  v_n := jsonb_array_length(p_etapas);
  if v_n < 3 or v_n > 12 then
    raise exception 'Un embudo lleva entre 3 y 12 etapas.' using errcode = '22023', hint = 'etapas';
  end if;
  for x in select * from jsonb_array_elements(p_etapas) loop
    if jsonb_typeof(x) <> 'object' then
      raise exception 'Una de las etapas llegó incompleta. Recarga e intenta de nuevo.' using errcode = '22023', hint = 'etapas';
    end if;
    v_id := coalesce(public._uuid_de(x -> 'id', 'etapas'), gen_random_uuid());
    if v_id = any (v_ids) then
      raise exception 'Una etapa llegó dos veces. Recarga e intenta de nuevo.' using errcode = '22023', hint = 'etapas';
    end if;
    if exists (select 1 from public.embudos_etapas s where s.id = v_id and s.embudo_id <> e.id) then
      raise exception 'Una de las etapas no es de este embudo. Recarga e intenta de nuevo.' using errcode = '22023', hint = 'etapas';
    end if;
    v_nombre := btrim(coalesce(x ->> 'nombre', ''));
    if char_length(v_nombre) not between 1 and 30 then
      raise exception 'El nombre de una etapa lleva entre 1 y 30 caracteres.' using errcode = '22023', hint = 'etapas';
    end if;
    if exists (select 1 from unnest(v_nombres) n where lower(n) = lower(v_nombre)) then
      raise exception 'Hay dos etapas «%». Cámbiale el nombre a una.', v_nombre using errcode = '22023', hint = 'etapas';
    end if;
    v_color := x ->> 'color';
    if v_color is null or not (v_color = any (public._etiquetas_paleta())) then
      raise exception 'Elige un color de la paleta para «%».', v_nombre using errcode = '22023', hint = 'etapas';
    end if;
    if coalesce((x ->> 'es_ganada')::boolean, false) and coalesce((x ->> 'es_perdida')::boolean, false) then
      raise exception '«%» no puede ser ganada y perdida a la vez.', v_nombre using errcode = '22023', hint = 'etapas';
    end if;
    if coalesce((x ->> 'es_inicial')::boolean, false)
       and (coalesce((x ->> 'es_ganada')::boolean, false) or coalesce((x ->> 'es_perdida')::boolean, false)) then
      raise exception 'La etapa inicial no puede ser ganada ni perdida.' using errcode = '22023', hint = 'etapas';
    end if;
    v_ini := v_ini + case when coalesce((x ->> 'es_inicial')::boolean, false) then 1 else 0 end;
    v_gan := v_gan + case when coalesce((x ->> 'es_ganada')::boolean, false) then 1 else 0 end;
    v_per := v_per + case when coalesce((x ->> 'es_perdida')::boolean, false) then 1 else 0 end;
    v_ids := v_ids || v_id;
    v_nombres := v_nombres || v_nombre;
    v_nueva := v_nueva || jsonb_build_object('id', v_id, 'nombre', v_nombre, 'color', v_color,
      'es_inicial', coalesce((x ->> 'es_inicial')::boolean, false),
      'es_ganada', coalesce((x ->> 'es_ganada')::boolean, false),
      'es_perdida', coalesce((x ->> 'es_perdida')::boolean, false));
  end loop;
  if v_ini <> 1 then
    raise exception 'Marca una sola etapa como inicial.' using errcode = '22023', hint = 'etapas';
  end if;
  if v_gan < 1 then
    raise exception 'Hace falta al menos una etapa ganada.' using errcode = '22023', hint = 'etapas';
  end if;
  if v_per < 1 then
    raise exception 'Hace falta al menos una etapa perdida.' using errcode = '22023', hint = 'etapas';
  end if;

  if v_nueva = (public._embudo_json(e.id) -> 'etapas') then
    return jsonb_build_object('resultado', 'sin_cambios', 'embudo', public._embudo_json(e.id));
  end if;
  if e.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._embudo_conflicto(e.actualizado_en);
  end if;

  -- Una etapa que se quita no puede llevarse oportunidades vivas; las eliminadas se van con ella.
  for v_quitada in
    select s.id, s.nombre, (select count(*) from public.oportunidades o where o.etapa_id = s.id and o.eliminado_en is null) as n
      from public.embudos_etapas s where s.embudo_id = e.id and not (s.id = any (v_ids)) order by s.orden, s.id
  loop
    if v_quitada.n > 0 then
      raise exception '«%» tiene % %: muévelas antes de quitarla.', v_quitada.nombre, v_quitada.n,
        case when v_quitada.n = 1 then 'oportunidad' else 'oportunidades' end using errcode = '23514', hint = 'etapas';
    end if;
    delete from public.oportunidades o where o.etapa_id = v_quitada.id;
    delete from public.embudos_etapas s where s.id = v_quitada.id;
  end loop;

  -- Primero se liberan los nombres y la inicial (un intercambio de nombres no choca con el índice),
  -- después se escriben los valores finales.
  update public.embudos_etapas s set nombre = '~' || left(replace(s.id::text, '-', ''), 29), es_inicial = false
   where s.embudo_id = e.id;
  insert into public.embudos_etapas (id, embudo_id, nombre, color, es_inicial, es_ganada, es_perdida, orden)
  select (y ->> 'id')::uuid, e.id, '~' || left(replace(y ->> 'id', '-', ''), 29), y ->> 'color', false, false, false, 0
    from jsonb_array_elements(v_nueva) y
   where not exists (select 1 from public.embudos_etapas s where s.id = (y ->> 'id')::uuid);
  update public.embudos_etapas s set
    nombre = y ->> 'nombre', color = y ->> 'color', es_inicial = (y ->> 'es_inicial')::boolean,
    es_ganada = (y ->> 'es_ganada')::boolean, es_perdida = (y ->> 'es_perdida')::boolean, orden = (o * 10)::smallint
    from jsonb_array_elements(v_nueva) with ordinality t (y, o)
   where s.id = (y ->> 'id')::uuid;

  -- Una etapa que cambió de final a abierta (o al revés) cambia el estado de lo que tiene.
  update public.oportunidades o set
    estado = case when s.es_ganada then 'ganada' when s.es_perdida then 'perdida' else 'abierta' end::public.estado_oportunidad,
    motivo_perdida = case when s.es_perdida then o.motivo_perdida end
    from public.embudos_etapas s
   where s.id = o.etapa_id and s.embudo_id = e.id and o.estado <> 'cancelada'
     and o.estado <> case when s.es_ganada then 'ganada' when s.es_perdida then 'perdida' else 'abierta' end::public.estado_oportunidad;

  update public.embudos x set actualizado_en = greatest(clock_timestamp(), e.actualizado_en + interval '1 microsecond')
   where x.id = e.id;
  return jsonb_build_object('resultado', 'guardado', 'embudo', public._embudo_json(e.id));
end;
$$;
revoke all on function public.embudo_etapas_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.embudo_etapas_guardar(uuid, timestamptz, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Oportunidades: internos
-- ---------------------------------------------------------------------------
-- De invocador: la usan las RPC y las lecturas. El vehículo se nombra sólo si quien mira lo ve; a la
-- dueña (siempre es la dueña quien la lee) se le dice que había uno.
create or replace function public._oportunidad_json(o public.oportunidades)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'lead_id', o.lead_id, 'embudo_id', o.embudo_id, 'etapa_id', o.etapa_id, 'estado', o.estado,
    'titulo', o.titulo, 'notas', o.notas, 'monto_estimado', o.monto_estimado, 'moneda', o.moneda,
    'motivo_perdida', o.motivo_perdida, 'ultima_actividad_en', o.ultima_actividad_en,
    'creado_en', o.creado_en, 'actualizado_en', o.actualizado_en, 'eliminado', o.eliminado_en is not null,
    'vehiculo', case when o.vehiculo_id is not null and public.puede_vehiculo(o.vehiculo_id, 'vehiculos.ver') then
                  (select jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero)
                     from public.vehiculos v where v.id = o.vehiculo_id) end,
    'vehiculo_oculto', o.vehiculo_id is not null and not public.puede_vehiculo(o.vehiculo_id, 'vehiculos.ver'));
$$;
revoke all on function public._oportunidad_json(public.oportunidades) from public, anon;
grant execute on function public._oportunidad_json(public.oportunidades) to authenticated;

create or replace function public._oportunidad_conflicto(p_cuando timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Cambiaste esta oportunidad % desde otra ventana. Recarga para seguir desde ahí.', public._hace(p_cuando)
    using errcode = 'PT409';
end;
$$;
revoke all on function public._oportunidad_conflicto(timestamptz) from public, anon, authenticated;

-- La oportunidad de quien llama, sobre un lead que tiene (cartera + `leads.editar`). Mira sin
-- bloquear, bloquea el lead, comparte su embudo y bloquea la oportunidad, y vuelve a mirar: le pudieron
-- quitar la cartera o transferir el lead mientras esperaba. Orden de los candados: lead → embudo →
-- oportunidad (el mismo que guardar las etapas: embudo → oportunidades). Con el lead bloqueado, el
-- embudo de la oportunidad no cambia (sólo lo cambia transferir, que bloquea el lead).
create or replace function public._oportunidad_mia(p_id uuid, p_eliminada boolean default false)
returns public.oportunidades language plpgsql security definer set search_path = '' as $$
declare o public.oportunidades; v_yo uuid := (select auth.uid());
begin
  perform public.assert_activo();
  select * into o from public.oportunidades x
   where x.id = p_id and x.usuario_id = v_yo and (x.eliminado_en is null) = not p_eliminada;
  if not found or not public.puede_actuar_lead(o.lead_id, 'leads.editar') then
    raise exception 'No encontramos esta oportunidad o no tienes acceso.' using errcode = '42501';
  end if;
  perform 1 from public.leads l where l.id = o.lead_id and l.eliminado_en is null for update;
  if not found or not public.puede_actuar_lead(o.lead_id, 'leads.editar') then
    raise exception 'No encontramos esta oportunidad o no tienes acceso.' using errcode = '42501';
  end if;
  select * into o from public.oportunidades x
   where x.id = p_id and x.usuario_id = v_yo and (x.eliminado_en is null) = not p_eliminada;
  if not found then
    raise exception 'No encontramos esta oportunidad o no tienes acceso.' using errcode = '42501';
  end if;
  perform 1 from public.embudos e where e.id = o.embudo_id for share;
  select * into o from public.oportunidades x
   where x.id = p_id and x.usuario_id = v_yo and (x.eliminado_en is null) = not p_eliminada for update;
  if not found then
    raise exception 'No encontramos esta oportunidad o no tienes acceso.' using errcode = '42501';
  end if;
  return o;
end;
$$;
revoke all on function public._oportunidad_mia(uuid, boolean) from public, anon, authenticated;

create or replace function public._oportunidad_titulo(p_valor jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v text;
begin
  if p_valor is null or jsonb_typeof(p_valor) <> 'string' then
    raise exception 'Escribe un título.' using errcode = '22023', hint = 'titulo';
  end if;
  v := btrim(p_valor #>> '{}');
  if char_length(v) not between 1 and 120 then
    raise exception 'El título lleva entre 1 y 120 caracteres.' using errcode = '22023', hint = 'titulo';
  end if;
  return v;
end;
$$;
revoke all on function public._oportunidad_titulo(jsonb) from public, anon, authenticated;

create or replace function public._oportunidad_notas(p_valor jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare v text;
begin
  if p_valor is null or p_valor = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_valor) <> 'string' then
    raise exception 'Las notas tienen que ser texto.' using errcode = '22023', hint = 'notas';
  end if;
  v := nullif(btrim(p_valor #>> '{}'), '');
  if char_length(v) > 2000 then
    raise exception 'Las notas llevan hasta 2000 caracteres.' using errcode = '22023', hint = 'notas';
  end if;
  return v;
end;
$$;
revoke all on function public._oportunidad_notas(jsonb) from public, anon, authenticated;

create or replace function public._oportunidad_monto(p_valor jsonb)
returns numeric language plpgsql immutable set search_path = '' as $$
declare v numeric;
begin
  if p_valor is null or p_valor = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_valor) <> 'number' then
    raise exception 'El monto tiene que ser un número.' using errcode = '22023', hint = 'monto_estimado';
  end if;
  v := (p_valor #>> '{}')::numeric;
  if v < 0 then
    raise exception 'El monto no puede ser negativo.' using errcode = '22023', hint = 'monto_estimado';
  end if;
  if v >= 1000000000000 then
    raise exception 'El monto es demasiado grande.' using errcode = '22023', hint = 'monto_estimado';
  end if;
  if v <> round(v, 2) then
    raise exception 'El monto lleva hasta 2 decimales.' using errcode = '22023', hint = 'monto_estimado';
  end if;
  return v;
end;
$$;
revoke all on function public._oportunidad_monto(jsonb) from public, anon, authenticated;

create or replace function public._oportunidad_motivo(p_motivo text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if char_length(v) > 200 then
    raise exception 'El motivo lleva hasta 200 caracteres.' using errcode = '22023', hint = 'motivo_perdida';
  end if;
  return v;
end;
$$;
revoke all on function public._oportunidad_motivo(text) from public, anon, authenticated;

-- La constancia de un cierre: sin monto ni notas.
create or replace function public._oportunidad_constancia(o public.oportunidades, p_antes public.estado_oportunidad)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if o.estado in ('ganada', 'perdida') and o.estado is distinct from p_antes then
    perform public.registrar_actividad('oportunidad.' || o.estado, 'oportunidades', o.id::text, null, null,
      jsonb_build_object('lead', o.lead_id, 'etapa', o.etapa_id));
  end if;
end;
$$;
revoke all on function public._oportunidad_constancia(public.oportunidades, public.estado_oportunidad) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Oportunidades: RPC (clase 1)
-- ---------------------------------------------------------------------------
-- Idempotente por id (`repetido`). `p_datos`: `titulo` (obligatorio), `notas`, `monto_estimado`,
-- `vehiculo_id` (uno que quien la crea ve), `embudo_id` (sin él, el de por defecto) y `etapa_id` (sin
-- ella, la inicial). La moneda es la de la empresa.
create or replace function public.oportunidad_crear(p_id uuid, p_lead uuid, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  o public.oportunidades; v_yo uuid := (select auth.uid()); v_k text; v_embudo uuid; v_etapa uuid;
  v_titulo text; v_notas text; v_monto numeric; v_vehiculo uuid;
begin
  perform public._lead_mio(p_lead, 'leads.editar', true);
  if p_id is null then
    raise exception 'Falta el identificador de la oportunidad.' using errcode = '22023';
  end if;
  select * into o from public.oportunidades x where x.id = p_id;
  if found then
    if o.usuario_id = v_yo and o.lead_id = p_lead then
      return jsonb_build_object('resultado', 'repetido', 'oportunidad', public._oportunidad_json(o));
    end if;
    raise exception 'No pudimos crear esta oportunidad. Vuelve a intentarlo.' using errcode = '22023';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de una oportunidad tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_datos) loop
    if v_k not in ('titulo', 'notas', 'monto_estimado', 'vehiculo_id', 'embudo_id', 'etapa_id') then
      raise exception 'El dato «%» no es de una oportunidad.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  v_titulo := public._oportunidad_titulo(p_datos -> 'titulo');
  v_notas := public._oportunidad_notas(p_datos -> 'notas');
  v_monto := public._oportunidad_monto(p_datos -> 'monto_estimado');
  v_vehiculo := public._vehiculo_para_nota(public._uuid_de(p_datos -> 'vehiculo_id', 'vehiculo_id'));

  v_embudo := public._uuid_de(p_datos -> 'embudo_id', 'embudo_id');
  if v_embudo is null then
    v_embudo := public._embudo_defecto_de(v_yo);
  end if;
  perform 1 from public.embudos e where e.id = v_embudo and e.usuario_id = v_yo for share;
  if not found then
    raise exception 'No encontramos ese embudo. Recarga para ver los tuyos.' using errcode = '22023', hint = 'embudo_id';
  end if;
  v_etapa := public._uuid_de(p_datos -> 'etapa_id', 'etapa_id');
  if v_etapa is null then
    select s.id into v_etapa from public.embudos_etapas s where s.embudo_id = v_embudo and s.es_inicial;
  elsif not exists (select 1 from public.embudos_etapas s where s.id = v_etapa and s.embudo_id = v_embudo) then
    raise exception 'Esa etapa no es de este embudo.' using errcode = '22023', hint = 'etapa_id';
  end if;

  insert into public.oportunidades (id, lead_id, vehiculo_id, usuario_id, embudo_id, etapa_id, titulo, notas,
    monto_estimado, moneda, creado_en, actualizado_en)
  values (p_id, p_lead, v_vehiculo, v_yo, v_embudo, v_etapa, v_titulo, v_notas, v_monto,
    (select a.moneda_base from public.ajustes_empresa a where a.id = 1), clock_timestamp(), clock_timestamp())
  returning * into o;
  perform public.registrar_actividad('oportunidad.creada', 'oportunidades', o.id::text, null, null,
    jsonb_build_object('lead', o.lead_id, 'embudo', o.embudo_id, 'etapa', o.etapa_id));
  perform public._oportunidad_constancia(o, 'abierta');
  return jsonb_build_object('resultado', 'creada', 'oportunidad', public._oportunidad_json(o));
end;
$$;
revoke all on function public.oportunidad_crear(uuid, uuid, jsonb) from public, anon;
grant execute on function public.oportunidad_crear(uuid, uuid, jsonb) to authenticated;

-- `p_cambios`: `titulo`, `notas`, `monto_estimado`, `vehiculo_id` (sólo se mira si cambia: uno que
-- dejó de verse se conserva al editar lo demás). Lo ya guardado no choca con la versión.
create or replace function public.oportunidad_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.oportunidades; n public.oportunidades; v_k text; v_titulo text; v_notas text; v_monto numeric; v_vehiculo uuid;
begin
  o := public._oportunidad_mia(p_id);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios de una oportunidad tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_cambios) loop
    if v_k not in ('titulo', 'notas', 'monto_estimado', 'vehiculo_id') then
      raise exception 'El dato «%» no se edita aquí.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  v_titulo := case when p_cambios ? 'titulo' then public._oportunidad_titulo(p_cambios -> 'titulo') else o.titulo end;
  v_notas := case when p_cambios ? 'notas' then public._oportunidad_notas(p_cambios -> 'notas') else o.notas end;
  v_monto := case when p_cambios ? 'monto_estimado' then public._oportunidad_monto(p_cambios -> 'monto_estimado') else o.monto_estimado end;
  v_vehiculo := o.vehiculo_id;
  if p_cambios ? 'vehiculo_id' then
    v_vehiculo := public._uuid_de(p_cambios -> 'vehiculo_id', 'vehiculo_id');
    if v_vehiculo is distinct from o.vehiculo_id then
      v_vehiculo := public._vehiculo_para_nota(v_vehiculo);
    end if;
  end if;
  if (v_titulo, v_notas, v_monto, v_vehiculo) is not distinct from (o.titulo, o.notas, o.monto_estimado, o.vehiculo_id) then
    return jsonb_build_object('resultado', 'sin_cambios', 'oportunidad', public._oportunidad_json(o));
  end if;
  if o.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._oportunidad_conflicto(o.actualizado_en);
  end if;
  update public.oportunidades x set titulo = v_titulo, notas = v_notas, monto_estimado = v_monto, vehiculo_id = v_vehiculo,
    actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
  where x.id = o.id
  returning * into n;
  return jsonb_build_object('resultado', 'guardada', 'oportunidad', public._oportunidad_json(n));
end;
$$;
revoke all on function public.oportunidad_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.oportunidad_guardar(uuid, timestamptz, jsonb) to authenticated;

-- Mover de etapa dentro de su embudo. Ya estar en `p_etapa` es `sin_cambios` (un reintento no choca
-- consigo mismo); estar en otra que la esperada es `PT409`. Una etapa ganada o perdida la cierra; una
-- abierta la reabre. El motivo sólo se guarda al pasar a una perdida.
create or replace function public.oportunidad_mover(p_id uuid, p_etapa_esperada uuid, p_etapa uuid, p_motivo_perdida text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.oportunidades; n public.oportunidades; s public.embudos_etapas; v_actual text;
begin
  o := public._oportunidad_mia(p_id);
  if p_etapa is null then
    raise exception 'Elige una etapa.' using errcode = '22023', hint = 'etapa_id';
  end if;
  select * into s from public.embudos_etapas x where x.id = p_etapa and x.embudo_id = o.embudo_id;
  if not found then
    raise exception 'Esa etapa no es de este embudo.' using errcode = '22023', hint = 'etapa_id';
  end if;
  if o.etapa_id = p_etapa then
    return jsonb_build_object('resultado', 'sin_cambios', 'oportunidad', public._oportunidad_json(o));
  end if;
  if p_etapa_esperada is null then
    raise exception 'Falta la etapa que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if o.etapa_id <> p_etapa_esperada then
    select x.nombre into v_actual from public.embudos_etapas x where x.id = o.etapa_id;
    raise exception 'Esta oportunidad ya está en «%». Recarga para verla donde está.', v_actual using errcode = 'PT409';
  end if;
  update public.oportunidades x set etapa_id = s.id,
    motivo_perdida = case when s.es_perdida then public._oportunidad_motivo(p_motivo_perdida) end,
    actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
  where x.id = o.id
  returning * into n;
  perform public._oportunidad_constancia(n, o.estado);
  return jsonb_build_object('resultado', 'movida', 'oportunidad', public._oportunidad_json(n));
end;
$$;
revoke all on function public.oportunidad_mover(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.oportunidad_mover(uuid, uuid, uuid, text) to authenticated;

-- Eliminar es lógico y vuelve con «Deshacer» (`oportunidad_restaurar` con la versión que devolvió).
create or replace function public.oportunidad_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.oportunidades; n public.oportunidades;
begin
  o := public._oportunidad_mia(p_id);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if o.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._oportunidad_conflicto(o.actualizado_en);
  end if;
  update public.oportunidades x set eliminado_en = clock_timestamp(),
    actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
  where x.id = o.id
  returning * into n;
  return jsonb_build_object('resultado', 'eliminada', 'oportunidad', public._oportunidad_json(n));
end;
$$;
revoke all on function public.oportunidad_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.oportunidad_eliminar(uuid, timestamptz) to authenticated;

create or replace function public.oportunidad_restaurar(p_id uuid, p_actualizado_en_esperado timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.oportunidades; n public.oportunidades;
begin
  o := public._oportunidad_mia(p_id, true);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if o.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._oportunidad_conflicto(o.actualizado_en);
  end if;
  update public.oportunidades x set eliminado_en = null,
    actualizado_en = greatest(clock_timestamp(), o.actualizado_en + interval '1 microsecond')
  where x.id = o.id
  returning * into n;
  return jsonb_build_object('resultado', 'restaurada', 'oportunidad', public._oportunidad_json(n));
end;
$$;
revoke all on function public.oportunidad_restaurar(uuid, timestamptz) from public, anon;
grant execute on function public.oportunidad_restaurar(uuid, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Lecturas (de invocador: lo que la RLS no deja ver no llega ni se cuenta)
-- ---------------------------------------------------------------------------
-- Una tarjeta del kanban: la oportunidad, su lead (nombre y número: `leads` se lee por columnas, el
-- teléfono y los atributos no tienen grant) y su vehículo si quien mira lo ve (la RLS vacía el join).
create or replace function public._tarjeta_json(o public.oportunidades, p_lead jsonb, p_vehiculo jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', o.id, 'etapa_id', o.etapa_id, 'estado', o.estado, 'titulo', o.titulo,
    'monto_estimado', o.monto_estimado, 'moneda', o.moneda, 'motivo_perdida', o.motivo_perdida,
    'ultima_actividad_en', o.ultima_actividad_en, 'actualizado_en', o.actualizado_en,
    'lead', p_lead, 'vehiculo', p_vehiculo);
$$;
revoke all on function public._tarjeta_json(public.oportunidades, jsonb, jsonb) from public, anon;
grant execute on function public._tarjeta_json(public.oportunidades, jsonb, jsonb) to authenticated;

-- El kanban de un embudo propio: sus etapas, el total de cada una y las primeras `p_tope` tarjetas
-- (las que se movieron más recientemente). Nulo si el embudo no es de quien mira.
create or replace function public.embudo_tablero(p_embudo uuid, p_tope int default 50)
returns jsonb language sql stable set search_path = '' as $$
  with tope as (select least(greatest(coalesce(p_tope, 50), 1), 100) as n)
  select jsonb_build_object(
    'embudo', jsonb_build_object('id', x.id, 'nombre', x.nombre, 'es_default', x.es_default, 'actualizado_en', x.actualizado_en),
    'columnas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color,
                   'es_inicial', s.es_inicial, 'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
        'total', c.total,
        'hay_mas', c.total > (select n from tope),
        'tarjetas', coalesce((
          select jsonb_agg(t.tarjeta order by t.en desc, t.id desc)
            from (select public._tarjeta_json(o, jsonb_build_object('id', l.id, 'numero', l.numero, 'nombre', l.nombre),
                                         case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta, o.ultima_actividad_en as en, o.id
                    from public.oportunidades o
                    join public.leads l on l.id = o.lead_id
                    left join public.vehiculos v on v.id = o.vehiculo_id
                   where o.etapa_id = s.id
                   order by o.ultima_actividad_en desc, o.id desc
                   limit (select n from tope)) t), '[]'::jsonb))
        order by s.orden, s.id)
      from public.embudos_etapas s
      cross join lateral (select count(*)::int as total from public.oportunidades o2 where o2.etapa_id = s.id) c
      where s.embudo_id = x.id), '[]'::jsonb))
  from public.embudos x where x.id = p_embudo;
$$;
revoke all on function public.embudo_tablero(uuid, int) from public, anon;
grant execute on function public.embudo_tablero(uuid, int) to authenticated;

-- «Ver más» de una columna: las siguientes después de (`p_antes_en`, `p_antes_id`).
create or replace function public.embudo_etapa_pagina(p_etapa uuid, p_antes_en timestamptz, p_antes_id uuid, p_tope int default 50)
returns jsonb language sql stable set search_path = '' as $$
  with tope as (select least(greatest(coalesce(p_tope, 50), 1), 100) as n),
  pagina as (
    select public._tarjeta_json(o, jsonb_build_object('id', l.id, 'numero', l.numero, 'nombre', l.nombre),
                                         case when v.id is not null then jsonb_build_object('id', v.id, 'titulo', v.titulo, 'numero', v.numero) end) as tarjeta, o.ultima_actividad_en as en, o.id,
           row_number() over (order by o.ultima_actividad_en desc, o.id desc) as k
      from public.oportunidades o
      join public.leads l on l.id = o.lead_id
      left join public.vehiculos v on v.id = o.vehiculo_id
     where o.etapa_id = p_etapa
       and (p_antes_en is null or (o.ultima_actividad_en, o.id) < (p_antes_en, p_antes_id))
     order by o.ultima_actividad_en desc, o.id desc
     limit (select n from tope) + 1)
  select jsonb_build_object(
    'tarjetas', coalesce(jsonb_agg(p.tarjeta order by p.en desc, p.id desc) filter (where p.k <= (select n from tope)), '[]'::jsonb),
    'hay_mas', coalesce(bool_or(p.k > (select n from tope)), false))
  from pagina p;
$$;
revoke all on function public.embudo_etapa_pagina(uuid, timestamptz, uuid, int) from public, anon;
grant execute on function public.embudo_etapa_pagina(uuid, timestamptz, uuid, int) to authenticated;

-- Las oportunidades de quien mira sobre un lead (la sección de la ficha), con su etapa y su embudo,
-- y si puede crear (cartera + `leads.editar`). Las abiertas primero.
create or replace function public.lead_oportunidades(p_lead uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'puedo_crear', public.puede_actuar_lead(p_lead, 'leads.editar'),
    'oportunidades', coalesce((
      select jsonb_agg(public._oportunidad_json(o) || jsonb_build_object(
               'etapa', jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color,
                          'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida),
               'embudo', jsonb_build_object('id', e.id, 'nombre', e.nombre))
             order by (o.estado = 'abierta') desc, o.ultima_actividad_en desc, o.id desc)
        from public.oportunidades o
        join public.embudos e on e.id = o.embudo_id
        join public.embudos_etapas s on s.id = o.etapa_id
       where o.lead_id = p_lead), '[]'::jsonb));
$$;
revoke all on function public.lead_oportunidades(uuid) from public, anon;
grant execute on function public.lead_oportunidades(uuid) to authenticated;
