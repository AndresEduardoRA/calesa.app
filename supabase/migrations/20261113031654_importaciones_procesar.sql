-- Importar todo (9.06-1, parte 1 de 5): procesar la importación total por lotes, sólo para `service_role` (la función edge `importar-csv`, 9.06-3).
-- Cada llamada actúa a nombre de una persona: fija `request.jwt.claim.*` locales a la transacción para que `auth.uid()`, los permisos, los triggers
-- y la constancia vean a quien importa (o al destino, que crea los leads) con las mismas reglas que en la pantalla, y los repone antes de devolver.
-- Quién es esa persona sale de la fila de `importaciones` (`usuario_id`, `asignar_a`), que sólo escribe `importacion_crear()` tras sus
-- comprobaciones. Los permisos se vuelven a mirar en cada lote; perderlos deja la importación `fallida`. Idempotente por (importación, fila): la
-- marca de agua `procesadas` bajo el candado de la fila, y el id de cada lead o vehículo sale de (importación, fila).

-- La identidad. Las tres de abajo las llama sólo el dueño de las funciones (revocadas a todos, también a service_role).
create or replace function public._importacion_previo() returns jsonb
  language sql stable
  set search_path = ''
as $$
  select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true), 'role', current_setting('request.jwt.claim.role', true),
                            'claims', current_setting('request.jwt.claims', true));
$$;

comment on function public._importacion_previo() is
  'Importación total: los claims vigentes ({sub, role, claims}), para reponerlos con _importacion_volver. Se captura una sola vez, al entrar.';

create or replace function public._importacion_fijar(p_usuario uuid) returns void
  language plpgsql
  set search_path = ''
as $$
begin
  if p_usuario is null then
    raise exception 'Falta la persona a cuyo nombre se importa.' using errcode = '22023';
  end if;
  perform set_config('request.jwt.claim.sub', p_usuario::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
end;
$$;

comment on function public._importacion_fijar(uuid) is
  'Importación total: actúa como esa persona (claims locales a la transacción). No devuelve el previo: lo captura quien llama, una vez.';

create or replace function public._importacion_volver(p_previo jsonb) returns void
  language plpgsql
  set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_previo ->> 'sub', ''), true);
  perform set_config('request.jwt.claim.role', coalesce(p_previo ->> 'role', ''), true);
  perform set_config('request.jwt.claims', coalesce(p_previo ->> 'claims', ''), true);
end;
$$;

comment on function public._importacion_volver(jsonb) is 'Importación total: repone los claims que capturó _importacion_previo.';

-- ¿Se puede seguir? null si sí; si no, la clave del motivo. Deja puesta la identidad de quien crea las filas: el destino en leads, quien importa en
-- vehículos. Quien llama repone la suya.
create or replace function public._importacion_autorizar(p_imp public.importaciones) returns text
  language plpgsql
  set search_path = ''
as $$
begin
  -- Se creó para otra persona y su perfil ya no está: nunca se cambia de dueño en silencio.
  if p_imp.con_destino and p_imp.asignar_a is null then
    return 'destino_no_puede';
  end if;
  perform public._importacion_fijar(p_imp.usuario_id);
  if not public.es_usuario_activo() then
    return 'quien_importa_inactivo';
  end if;
  if p_imp.entidad = 'leads' then
    if p_imp.asignar_a is null then
      if not public.tiene_permiso('leads.crear') then return 'sin_permiso'; end if;
      return null;
    end if;
    if not public.tiene_permiso('datos.importar.todo') then return 'sin_permiso'; end if;
    perform public._importacion_fijar(p_imp.asignar_a);
    if not public.es_usuario_activo() or not public.tiene_permiso('leads.crear') then return 'destino_no_puede'; end if;
    return null;
  end if;
  if p_imp.entidad = 'vehiculos' then
    if p_imp.origen_id is null or not exists (select 1 from public.origenes o where o.id = p_imp.origen_id and o.activo) then
      return 'origen_inactivo';
    end if;
    if not public.tiene_permiso('vehiculos.crear', p_imp.origen_id) then return 'sin_permiso'; end if;
    return null;
  end if;
  return 'sin_permiso';
end;
$$;

comment on function public._importacion_autorizar(public.importaciones) is
  'Enforcement por lote de datos.importar.todo, leads.crear y vehiculos.crear (9.06): vuelve a mirar a quien importa y al destino con los permisos de hoy.';

create or replace function public._importacion_motivo(p_clave text) returns text
  language sql immutable
  set search_path = ''
as $$
  select case p_clave
    when 'sin_permiso' then 'Quien importa ya no tiene el permiso para seguir.'
    when 'destino_no_puede' then 'La persona de destino ya no puede recibir leads.'
    when 'quien_importa_inactivo' then 'Quien importa está bloqueado o dado de baja.'
    when 'origen_inactivo' then 'El origen está desactivado.'
    else 'No se pudo seguir con la importación.'
  end;
$$;

-- La importación queda fallida con su motivo (D8: no es un error del lote, así el job no la reintenta para siempre).
create or replace function public._importacion_fallar(p_importacion uuid, p_clave text) returns void
  language sql
  set search_path = ''
as $$
  update public.importaciones i
     set estado = 'fallida', errores = jsonb_build_array(jsonb_build_object('motivo', public._importacion_motivo(p_clave))),
         terminada_en = now(), avance_en = now()
   where i.id = p_importacion;
$$;

-- La forma del lote, antes de tocar nada: un error de forma es del llamador y rechaza el lote entero.
create or replace function public._importacion_lote_validar(p_desde integer, p_filas jsonb, p_total integer, p_procesadas integer) returns void
  language plpgsql
  set search_path = ''
as $$
declare
  v_e jsonb;
  v_k integer := 0;
  v_r jsonb;
  v_clave text;
begin
  if p_desde is null or p_desde < 1 then
    raise exception 'Un lote empieza en la fila 1 o después.' using errcode = '22023', hint = 'desde';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) < 1 or jsonb_array_length(p_filas) > 50 then
    raise exception 'Un lote lleva de 1 a 50 filas.' using errcode = '22023', hint = 'filas';
  end if;
  for v_e in select e.value from jsonb_array_elements(p_filas) e loop
    v_k := v_k + 1;
    if jsonb_typeof(v_e) <> 'object' or jsonb_typeof(v_e -> 'fila') is distinct from 'number' or (v_e ->> 'fila') !~ '^[0-9]{1,9}$' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023', hint = 'filas';
    end if;
    if (v_e ->> 'fila')::integer <> p_desde + v_k - 1 or (v_e ? 'datos') = (v_e ? 'rechazo') then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023', hint = 'filas';
    end if;
    for v_clave in select jsonb_object_keys(v_e) loop
      if v_clave not in ('fila', 'datos', 'rechazo') then
        raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023', hint = 'filas';
      end if;
    end loop;
    if v_e ? 'datos' and jsonb_typeof(v_e -> 'datos') <> 'object' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023', hint = 'filas';
    end if;
    if v_e ? 'rechazo' then
      v_r := v_e -> 'rechazo';
      if jsonb_typeof(v_r) <> 'object' or jsonb_typeof(v_r -> 'motivo') is distinct from 'string'
         or char_length(btrim(v_r ->> 'motivo')) not between 1 and 500
         or coalesce(jsonb_typeof(v_r -> 'campo'), 'null') not in ('string', 'null') or char_length(coalesce(v_r ->> 'campo', '')) > 120 then
        raise exception 'Una fila rechazada lleva su motivo.' using errcode = '22023', hint = 'filas';
      end if;
    end if;
  end loop;
  if p_total is null or p_desde + v_k - 1 > p_total then
    raise exception 'El lote pasa del total de filas.' using errcode = '22023', hint = 'filas';
  end if;
  if p_desde > p_procesadas + 1 then
    raise exception 'Falta procesar desde la fila %.', p_procesadas + 1 using errcode = '22023', hint = 'desde';
  end if;
end;
$$;

-- Una fila de leads, con la identidad del destino: la misma regla de duplicados y limbo que el alta a mano, nunca adopta. Devuelve el resultado.
create or replace function public._importacion_fila_lead(p_imp public.importaciones, p_fila integer, p_datos jsonb) returns jsonb
  language plpgsql
  set search_path = ''
as $$
declare
  v_id uuid := md5(p_imp.id::text || ':' || p_fila::text)::uuid;
  v_permitidas constant text[] := array['nombre', 'telefono_principal', 'tipo_lead_id', 'origen_lead_id', 'atributos'];
  v_k text;
  v_res jsonb;
begin
  -- Sólo viajan las claves conocidas: `adoptar` y cualquier otra se rechazan, no se ignoran.
  for v_k in select jsonb_object_keys(p_datos) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no se puede importar.', v_k using errcode = '22023', hint = v_k;
    end if;
  end loop;
  v_res := public._lead_crear(v_id, p_datos, null, null, false);
  if (v_res ->> 'resultado') = 'creado' then
    insert into public.importaciones_leads (importacion_id, lead_id, fila) values (p_imp.id, v_id, p_fila) on conflict do nothing;
    return jsonb_build_object('resultado', case when coalesce((v_res ->> 'repetido')::boolean, false) then 'repetido' else 'creado' end, 'id', v_id);
  end if;
  -- existe, de_otro y limbo se dicen igual: la verificación (que nombra al dueño) se descarta aquí.
  return jsonb_build_object('resultado', 'ya_existe', 'campo', 'telefono_principal');
end;
$$;

-- Una fila de vehículos, con la identidad de quien importa y su origen.
create or replace function public._importacion_fila_vehiculo(p_imp public.importaciones, p_fila integer, p_datos jsonb) returns jsonb
  language plpgsql
  set search_path = ''
as $$
declare
  v_id uuid := md5(p_imp.id::text || ':' || p_fila::text)::uuid;
  v_ya boolean := exists (select 1 from public.vehiculos x where x.id = v_id);
begin
  begin
    perform public.vehiculo_crear(v_id, p_imp.origen_id, p_datos);
  exception when unique_violation then
    return jsonb_build_object('resultado', 'ya_existe', 'motivo', 'Ya hay un vehículo con ese VIN o ese lote.');
  end;
  return jsonb_build_object('resultado', case when v_ya then 'repetido' else 'creado' end);
end;
$$;

-- Empezar: fija el total cuando la función edge ya leyó el archivo entero. En `procesando` con el mismo total, retoma.
create or replace function public.importacion_empezar(p_importacion uuid, p_total integer) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v public.importaciones;
  v_previo jsonb;
  v_motivo text;
begin
  select * into v from public.importaciones i where i.id = p_importacion for update;
  if not found or v.archivo_ruta is null then
    raise exception 'No encontramos esta importación.' using errcode = '22023';
  end if;
  v_previo := public._importacion_previo();
  if p_total is null or p_total < 1 or p_total > 20000 then
    raise exception 'Un archivo lleva de 1 a 20.000 filas: pártelo.' using errcode = '22023', hint = 'filas_total';
  end if;
  if v.estado in ('terminada', 'fallida') then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;
  if v.estado = 'procesando' then
    if v.filas_total is distinct from p_total then
      raise exception 'Esta importación ya empezó con otro total de filas.' using errcode = '22023', hint = 'filas_total';
    end if;
    perform public._importacion_volver(v_previo);
    return jsonb_build_object('importacion', v.id, 'estado', 'procesando', 'filas_total', v.filas_total, 'procesadas', v.procesadas, 'repetido', true);
  end if;
  v_motivo := public._importacion_autorizar(v);
  perform public._importacion_volver(v_previo);
  if v_motivo is not null then
    perform public._importacion_fallar(v.id, v_motivo);
    return jsonb_build_object('importacion', v.id, 'estado', 'fallida', 'rechazado', v_motivo);
  end if;
  update public.importaciones i set estado = 'procesando', filas_total = p_total, iniciada_en = now(), avance_en = now() where i.id = v.id;
  return jsonb_build_object('importacion', v.id, 'estado', 'procesando', 'filas_total', p_total, 'procesadas', 0, 'repetido', false);
end;
$$;

-- Procesar un lote de hasta 50 filas consecutivas desde `p_desde`. Todo o nada por fila; las ya procesadas se saltan.
create or replace function public.importacion_procesar_lote(p_importacion uuid, p_desde integer, p_filas jsonb) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v public.importaciones;
  v_previo jsonb;
  v_motivo text;
  v_cc text := (select e.telefono_cc from public.ajustes_empresa e where e.id = 1);
  v_e record;
  v_r jsonb;
  v_ultima integer;
  v_creadas integer := 0;
  v_ya integer := 0;
  v_rech integer := 0;
  v_ids uuid[] := '{}';
  v_filas integer[] := '{}';
  v_sqlstate text;
  v_mensaje text;
  v_hint text;
begin
  -- Dos invocaciones sobre la misma importación se forman en fila aquí: la segunda ve la marca ya movida.
  select * into v from public.importaciones i where i.id = p_importacion for update;
  if not found or v.archivo_ruta is null then
    raise exception 'No encontramos esta importación.' using errcode = '22023';
  end if;
  v_previo := public._importacion_previo();
  if v.estado <> 'procesando' then
    raise exception 'Esta importación no está en curso.' using errcode = '22023';
  end if;
  perform public._importacion_lote_validar(p_desde, p_filas, v.filas_total, v.procesadas);
  v_ultima := p_desde + jsonb_array_length(p_filas) - 1;
  if v_ultima <= v.procesadas then
    perform public._importacion_volver(v_previo);
    return jsonb_build_object('importacion', v.id, 'procesadas', v.procesadas, 'creadas', 0, 'ya_existian', 0, 'rechazadas', 0,
                              'saltadas', jsonb_array_length(p_filas));
  end if;

  v_motivo := public._importacion_autorizar(v);
  if v_motivo is not null then
    perform public._importacion_volver(v_previo);
    perform public._importacion_fallar(v.id, v_motivo);
    return jsonb_build_object('importacion', v.id, 'estado', 'fallida', 'rechazado', v_motivo);
  end if;

  -- Leads en el orden del teléfono (dos importaciones que se cruzan toman los candados en el mismo orden), luego por fila.
  for v_e in
    select x.value as v, (x.value ->> 'fila')::integer as fila
      from jsonb_array_elements(p_filas) x
     where (x.value ->> 'fila')::integer > v.procesadas
     order by case when v.entidad = 'leads' then public._telefono_o_nulo(v_cc, x.value -> 'datos' ->> 'telefono_principal') end nulls first,
              (x.value ->> 'fila')::integer
  loop
    begin
      if v_e.v ? 'rechazo' then
        v_r := jsonb_build_object('resultado', 'error', 'campo', nullif(btrim(v_e.v -> 'rechazo' ->> 'campo'), ''),
                                  'motivo', btrim(v_e.v -> 'rechazo' ->> 'motivo'));
      elsif v.entidad = 'leads' then
        v_r := public._importacion_fila_lead(v, v_e.fila, v_e.v -> 'datos');
      else
        v_r := public._importacion_fila_vehiculo(v, v_e.fila, v_e.v -> 'datos');
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate, v_mensaje = message_text, v_hint = pg_exception_hint;
      -- Lo que levantan nuestras reglas es humano; lo inesperado no se cuenta.
      if v_sqlstate not in ('22023', '23502', '23514', 'PT409') then
        v_mensaje := 'No pudimos importar esta fila.';
        v_hint := null;
      end if;
      v_r := jsonb_build_object('resultado', 'error', 'campo', left(nullif(v_hint, ''), 120), 'motivo', left(v_mensaje, 500));
    end;
    if (v_r ->> 'resultado') in ('creado', 'repetido') then
      v_creadas := v_creadas + 1;
      if (v_r ->> 'resultado') = 'creado' and v_r ? 'id' then
        v_ids := v_ids || (v_r ->> 'id')::uuid;
        v_filas := v_filas || v_e.fila;
      end if;
    else
      if (v_r ->> 'resultado') = 'ya_existe' then v_ya := v_ya + 1; else v_rech := v_rech + 1; end if;
      insert into public.importaciones_filas (importacion_id, fila, resultado, campo, motivo)
      values (v.id, v_e.fila, v_r ->> 'resultado', v_r ->> 'campo', v_r ->> 'motivo')
      on conflict (importacion_id, fila) do nothing;
    end if;
  end loop;

  -- Los números propios de lo que entró ahora, repartidos por orden de fila (el bloque de leads_importar_lote).
  if cardinality(v_ids) > 1 then
    perform set_config('importadora.numerar_lote', 'si', true);
    with a as (select t.id, row_number() over (order by t.fila) as rn from unnest(v_ids, v_filas) as t(id, fila)),
         n as (select l.numero_propio, row_number() over (order by l.numero_propio) as rn from public.leads l where l.id = any (v_ids)),
         m as (select a.id, n.numero_propio from a join n using (rn))
    update public.leads l set numero_propio = m.numero_propio from m where l.id = m.id and l.numero_propio is distinct from m.numero_propio;
    perform set_config('importadora.numerar_lote', 'no', true);
  end if;

  update public.importaciones i
     set procesadas = v_ultima, filas_ok = coalesce(i.filas_ok, 0) + v_creadas, ya_existian = i.ya_existian + v_ya,
         rechazadas = i.rechazadas + v_rech, avance_en = now()
   where i.id = v.id;
  perform public._importacion_volver(v_previo);
  return jsonb_build_object('importacion', v.id, 'procesadas', v_ultima, 'creadas', v_creadas, 'ya_existian', v_ya, 'rechazadas', v_rech,
                            'saltadas', jsonb_array_length(p_filas) - (v_ultima - v.procesadas));
end;
$$;

-- Terminar: con todas las filas procesadas, `terminada`; con `p_error` (el archivo ilegible), `fallida`. Deja la constancia a nombre de quien importa.
create or replace function public.importacion_terminar(p_importacion uuid, p_error text default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v public.importaciones;
  v_previo jsonb;
begin
  select * into v from public.importaciones i where i.id = p_importacion for update;
  if not found or v.archivo_ruta is null then
    raise exception 'No encontramos esta importación.' using errcode = '22023';
  end if;
  v_previo := public._importacion_previo();
  if v.estado in ('terminada', 'fallida') then
    perform public._importacion_volver(v_previo);
    return jsonb_build_object('importacion', v.id, 'estado', v.estado, 'repetido', true);
  end if;
  if p_error is null then
    if v.estado <> 'procesando' or v.procesadas is distinct from v.filas_total then
      raise exception 'Faltan filas por procesar.' using errcode = '22023';
    end if;
    update public.importaciones i set estado = 'terminada', terminada_en = now(), avance_en = now() where i.id = v.id returning * into v;
  else
    if btrim(p_error) = '' or char_length(p_error) > 500 then
      raise exception 'El motivo del fallo lleva de 1 a 500 caracteres.' using errcode = '22023', hint = 'error';
    end if;
    update public.importaciones i
       set estado = 'fallida', errores = jsonb_build_array(jsonb_build_object('motivo', btrim(p_error))), terminada_en = now(), avance_en = now()
     where i.id = v.id returning * into v;
  end if;
  perform public._importacion_fijar(v.usuario_id);
  perform public.registrar_actividad('datos.importado', 'importaciones', v.id::text, null, null, jsonb_build_object(
    'entidad', v.entidad, 'estado', v.estado, 'filas', v.filas_total, 'procesadas', v.procesadas, 'creadas', coalesce(v.filas_ok, 0),
    'ya_existian', v.ya_existian, 'rechazadas', v.rechazadas, 'asignar_a', v.asignar_a));
  perform public._importacion_volver(v_previo);
  return jsonb_build_object('importacion', v.id, 'estado', v.estado, 'creadas', coalesce(v.filas_ok, 0), 'ya_existian', v.ya_existian,
                            'rechazadas', v.rechazadas, 'repetido', false);
end;
$$;

comment on function public.importacion_empezar(uuid, integer) is
  'Importación total (9.06), sólo service_role: fija el total (1 a 20.000) y pasa a procesando tras mirar los permisos; en procesando con el mismo total, retoma.';
comment on function public.importacion_procesar_lote(uuid, integer, jsonb) is
  'Importación total (9.06), sólo service_role: un lote de hasta 50 filas consecutivas a nombre de quien importa (los leads, del destino), con los permisos de hoy. Todo o nada por fila; idempotente por (importación, fila). Devuelve sólo cuentas.';
comment on function public.importacion_terminar(uuid, text) is
  'Importación total (9.06), sólo service_role: terminada (todas las filas procesadas) o fallida (p_error), con la constancia datos.importado a nombre de quien importa.';
comment on function public._importacion_motivo(text) is 'Importación total: el texto de cada motivo por el que no se puede seguir.';
comment on function public._importacion_fallar(uuid, text) is 'Importación total: la deja fallida con su motivo.';
comment on function public._importacion_lote_validar(integer, jsonb, integer, integer) is 'Importación total: la forma de un lote (22023 si no).';
comment on function public._importacion_fila_lead(public.importaciones, integer, jsonb) is
  'Importación total: una fila de leads con _lead_crear (sin adoptar), con el id de (importación, fila).';
comment on function public._importacion_fila_vehiculo(public.importaciones, integer, jsonb) is
  'Importación total: una fila de vehículos con vehiculo_crear, con el id de (importación, fila).';

revoke all on function public.importacion_empezar(uuid, integer) from public, anon, authenticated;
revoke all on function public.importacion_procesar_lote(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.importacion_terminar(uuid, text) from public, anon, authenticated;
grant execute on function public.importacion_empezar(uuid, integer) to service_role;
grant execute on function public.importacion_procesar_lote(uuid, integer, jsonb) to service_role;
grant execute on function public.importacion_terminar(uuid, text) to service_role;

revoke all on function public._importacion_previo() from public, anon, authenticated, service_role;
revoke all on function public._importacion_fijar(uuid) from public, anon, authenticated, service_role;
revoke all on function public._importacion_volver(jsonb) from public, anon, authenticated, service_role;
revoke all on function public._importacion_autorizar(public.importaciones) from public, anon, authenticated, service_role;
revoke all on function public._importacion_motivo(text) from public, anon, authenticated, service_role;
revoke all on function public._importacion_fallar(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public._importacion_lote_validar(integer, jsonb, integer, integer) from public, anon, authenticated, service_role;
revoke all on function public._importacion_fila_lead(public.importaciones, integer, jsonb) from public, anon, authenticated, service_role;
revoke all on function public._importacion_fila_vehiculo(public.importaciones, integer, jsonb) from public, anon, authenticated, service_role;
