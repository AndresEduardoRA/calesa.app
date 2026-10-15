-- Exportar e importar leads en CSV, lo propio (Fase 3, parte 8a). Escrito a mano. Lo declarativo
-- (`importaciones_leads`, `importaciones.archivo_ruta` nulo, los dos índices de `actividad`) está en
-- `schemas/` y su RLS en `…000200_rls_y_grants.sql`, como el resto de las tablas.
--
-- Leído contra la base viva antes de escribir esto:
-- 1. `crear_lead` busca su intento («¿ya adopté este id?») en `actividad` con un Seq Scan, y en cada
--    fila escribe la preferencia «último origen». Con 500 filas por archivo eso pesa: el cuerpo pasa a
--    `_lead_crear(…, p_recordar_origen)` (sin grant) y `crear_lead` queda como envoltorio igual a antes.
-- 2. `authenticated` corta a los 8 s y una fila mala no puede tumbar a las demás: la RPC del lote
--    procesa cada fila en su propia subtransacción (lotes de 50, por debajo de las 64 que Postgres
--    guarda en caché por sesión).
-- 3. `registrar_actividad` la puede llamar cualquiera: el límite de exportaciones cuenta filas de
--    `actividad`, y falsearlas sólo bloquea a quien las falsea.

-- ---------------------------------------------------------------------------------------------------
-- El permiso. Sin alcance «todos»: exporta lo suyo, es decir, su cartera.
-- ---------------------------------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('leads.exportar', 'leads', 'Exportar leads', 'Descargar en CSV los leads de mi cartera que muestra el listado', false, false, 'leads_exportacion_registrar', 205)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen,
  con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;
-- Nace concedido sólo al dueño; los demás roles lo reciben desde Roles.
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, 'leads.exportar', 'todos' from public.roles r where r.clave = 'dueno'
on conflict do nothing;

-- ---------------------------------------------------------------------------------------------------
-- El teléfono para ordenar un lote: nulo si no se puede normalizar (esa fila va a fallar sola).
-- ---------------------------------------------------------------------------------------------------
create or replace function public._telefono_o_nulo(p_cc text, p_tel text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  return public.normalizar_telefono(p_cc, p_tel);
exception when others then
  return null;
end;
$$;
revoke all on function public._telefono_o_nulo(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- `crear_lead`: el cuerpo vive en `_lead_crear`. `p_recordar_origen` apaga la preferencia «último
-- origen» (un lote la guarda una sola vez, al terminar). Sin grant: sólo lo llaman funciones «definer».
-- ---------------------------------------------------------------------------------------------------
create or replace function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_permitidas constant text[] := array['nombre', 'telefono_cc', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos', 'adoptar'];
  v_k text;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_nombre text;
  v_tipo public.tipo_lead;
  v_origen uuid;
  v_activos text[];
  v_atributos jsonb := '{}'::jsonb;
  v_verif jsonb;
  v_estado text;
  v_id uuid;
  v_numero bigint;
  v_adoptado boolean := false;
  v_tipo_seg uuid;
  v_titulo text;
  v_detalle text;
  v_recordar timestamptz;
  v_titulo_rec text;
begin
  if p_id is null then
    raise exception 'Falta el identificador del intento.' using errcode = '22023';
  end if;
  if p_lead is null or jsonb_typeof(p_lead) <> 'object' then
    raise exception 'Los datos del lead tienen que ser un objeto.' using errcode = '22023';
  end if;
  for v_k in select jsonb_object_keys(p_lead) loop
    if not (v_k = any (v_permitidas)) then
      raise exception 'El dato «%» no va suelto: los campos del lead se mandan dentro de «atributos».', v_k
        using errcode = '22023', hint = v_k;
    end if;
  end loop;

  -- ¿Ya entró este intento? Una respuesta perdida y un reintento: devuelve lo mismo, no duplica.
  select l.id, l.numero into v_id, v_numero from public.leads l where l.id = p_id and l.creado_por = v_yo;
  if found then
    return jsonb_build_object('resultado', 'creado', 'id', v_id, 'numero', v_numero, 'repetido', true);
  end if;
  select l.id, l.numero into v_id, v_numero
    from public.actividad a join public.leads l on l.id::text = a.registro_id
   where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
   order by a.id desc limit 1;
  if found then
    return jsonb_build_object('resultado', 'adoptado', 'id', v_id, 'numero', v_numero, 'repetido', true);
  end if;

  -- El teléfono, y lo que ya se sabe de él.
  v_cc := coalesce(nullif(btrim(p_lead ->> 'telefono_cc'), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_lead ->> 'telefono_principal');
  v_verif := public._lead_verificar(v_tel);
  v_estado := v_verif ->> 'estado';
  if v_estado in ('existe', 'de_otro') or (v_estado = 'limbo' and (p_lead ->> 'adoptar') is distinct from 'true') then
    return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
  end if;

  -- Lo demás que tiene que pasar, antes de escribir nada.
  v_nombre := btrim(coalesce(p_lead ->> 'nombre', ''));
  if v_nombre = '' then
    raise exception 'Escribe el nombre.' using errcode = '22023', hint = 'nombre';
  end if;
  if char_length(v_nombre) > 120 then
    raise exception 'El nombre admite hasta 120 caracteres.' using errcode = '22023', hint = 'nombre';
  end if;
  begin
    v_tipo := coalesce(nullif(p_lead ->> 'tipo', ''), 'prospecto')::public.tipo_lead;
  exception when invalid_text_representation then
    raise exception 'El tipo de lead no es uno de los que hay.' using errcode = '22023', hint = 'tipo';
  end;
  begin
    v_origen := nullif(p_lead ->> 'origen_lead_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Ese origen del lead no existe.' using errcode = '22023', hint = 'origen_lead_id';
  end;
  if v_origen is not null then
    if not exists (select 1 from public.origenes_lead o where o.id = v_origen and o.activo) then
      raise exception 'Ese origen del lead está desactivado o ya no existe.' using errcode = '22023', hint = 'origen_lead_id';
    end if;
  elsif exists (select 1 from public.origenes_lead o where o.activo) then
    raise exception 'Elige de dónde viene el lead.' using errcode = '22023', hint = 'origen_lead_id';
  end if;

  select coalesce(array_agg(c.clave), '{}') into v_activos from public.leads_campos c where c.activo;
  if p_lead ? 'atributos' then
    v_atributos := public._atributos_fusionar('{}'::jsonb, p_lead -> 'atributos', v_activos,
      'Los atributos de un lead tienen que ser un objeto.',
      'El campo «%s» no es un campo de los leads o está desactivado.');
  end if;

  if p_seguimiento is not null then
    if jsonb_typeof(p_seguimiento) <> 'object' then
      raise exception 'El seguimiento tiene que ser un objeto.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    begin
      v_tipo_seg := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo_seg := null;
    end;
    if v_tipo_seg is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo_seg and t.activo) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'seguimiento.tipo_id';
    end if;
    v_titulo := btrim(coalesce(p_seguimiento ->> 'titulo', ''));
    if v_titulo = '' then
      raise exception 'Escribe un resumen del seguimiento.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    if char_length(v_titulo) > 120 then
      raise exception 'El resumen admite hasta 120 caracteres.' using errcode = '22023', hint = 'seguimiento.titulo';
    end if;
    v_detalle := nullif(btrim(coalesce(p_seguimiento ->> 'detalle', '')), '');
    if char_length(v_detalle) > 5000 then
      raise exception 'El detalle admite hasta 5000 caracteres.' using errcode = '22023', hint = 'seguimiento.detalle';
    end if;
  end if;
  if p_recordatorio is not null then
    if jsonb_typeof(p_recordatorio) <> 'object' then
      raise exception 'El recordatorio tiene que ser un objeto.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    begin
      v_recordar := nullif(p_recordatorio ->> 'recordar_en', '')::timestamptz;
    exception when others then
      v_recordar := null;
    end;
    if v_recordar is null then
      raise exception 'Elige cuándo recordarlo.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    if v_recordar <= now() then
      raise exception 'El recordatorio tiene que ser en el futuro.' using errcode = '22023', hint = 'recordatorio.recordar_en';
    end if;
    v_titulo_rec := coalesce(nullif(btrim(p_recordatorio ->> 'titulo'), ''), v_titulo);
    if v_titulo_rec is null then
      raise exception 'Escribe de qué es el recordatorio.' using errcode = '22023', hint = 'recordatorio.titulo';
    end if;
  end if;

  if v_estado = 'limbo' then
    -- «Tomar lead»: queda de dueño y lo que el lead ya tiene no se pisa; lo vacío se completa.
    select l.id, l.numero into v_id, v_numero from public.leads l
     where l.telefono_principal = v_tel and l.eliminado_en is null for update;
    insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso)
    values (v_id, v_yo, 'dueno')
    on conflict (lead_id, usuario_id) do update
      set tipo_acceso = 'dueno', desde = now(), revocado_en = null, revocado_por = null, compartido_por = null;
    update public.leads l set
      origen_lead_id = coalesce(l.origen_lead_id, v_origen),
      atributos = public._atributos_completar(l.atributos, v_atributos, v_activos,
        'Los atributos de un lead tienen que ser un objeto.',
        'El campo «%s» no es un campo de los leads o está desactivado.')
     where l.id = v_id;
    v_adoptado := true;
    perform public.registrar_actividad('lead.adoptado_del_limbo', 'leads', v_id::text, null,
      jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)), jsonb_build_object('intento', p_id));
  else
    v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
    begin
      insert into public.leads (id, nombre, telefono_cc, telefono_principal, tipo, origen_lead_id, atributos, creado_por)
      values (p_id, v_nombre,
              case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
              v_tel, v_tipo, v_origen, v_atributos, v_yo)
      returning id, numero into v_id, v_numero;
    exception when unique_violation then
      -- Dos personas guardaron el mismo teléfono a la vez (o este mismo intento, dos veces): el que
      -- llegó segundo ve su estado «existe», no un error.
      select l.id, l.numero into v_id, v_numero from public.leads l where l.id = p_id and l.creado_por = v_yo;
      if found then
        return jsonb_build_object('resultado', 'creado', 'id', v_id, 'numero', v_numero, 'repetido', true);
      end if;
      v_verif := public._lead_verificar(v_tel);
      if (v_verif ->> 'estado') in ('existe', 'de_otro', 'limbo') then
        return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
      end if;
      raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end;
    perform public.registrar_actividad('lead.creado', 'leads', v_id::text, null,
      jsonb_build_object('nombre', v_nombre), jsonb_build_object('intento', p_id));
  end if;

  if p_seguimiento is not null then
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_texto)
    values (v_id, v_yo, v_tipo_seg, v_titulo, v_detalle);
  end if;
  if p_recordatorio is not null then
    insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    values (v_yo, v_id, v_titulo_rec, v_recordar);
  end if;
  if p_recordar_origen and v_origen is not null then
    insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (v_yo, 'leads.ultimo_origen_lead', to_jsonb(v_origen::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end if;

  return jsonb_build_object('resultado', case when v_adoptado then 'adoptado' else 'creado' end,
                            'id', v_id, 'numero', v_numero, 'repetido', false);
end;
$$

;
revoke all on function public._lead_crear(uuid, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;

create or replace function public.crear_lead(p_id uuid, p_lead jsonb, p_seguimiento jsonb default null, p_recordatorio jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_permiso('leads.crear');
  return public._lead_crear(p_id, p_lead, p_seguimiento, p_recordatorio, true);
end;
$$;
revoke all on function public.crear_lead(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.crear_lead(uuid, jsonb, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Importar: un lote de hasta 50 filas. Cada fila vale por sí misma y es idempotente por su id.
--   p_filas = [{id, fila, lead: {nombre, telefono_principal, tipo, origen_lead_id, atributos}}]
-- Devuelve {importacion, filas: [{id, fila, resultado, repetido?, numero?, campo?, motivo?}]} con
-- resultado `creado`, `ya_existe` (existe, de otra persona o sin dueño: no dice cuál ni de quién) o
-- `error`. Quien importa queda de dueño de lo que crea; nada se adopta del limbo desde aquí.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_importar_lote(p_importacion uuid, p_total integer, p_filas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cc text := (select e.telefono_cc from public.ajustes_empresa e where e.id = 1);
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_fila record;
  v_lead jsonb;
  v_res jsonb;
  v_salida jsonb := '[]'::jsonb;
  v_numero_de_fila integer;
  v_sqlstate text;
  v_mensaje text;
  v_hint text;
  v_permitidas constant text[] := array['nombre', 'telefono_principal', 'tipo', 'origen_lead_id', 'atributos'];
  v_k text;
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_importacion is null then
    raise exception 'Falta el identificador de la importación.' using errcode = '22023';
  end if;
  if p_total is null or p_total < 1 or p_total > 500 then
    raise exception 'Una importación lleva de 1 a 500 filas.' using errcode = '22023';
  end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) < 1 or jsonb_array_length(p_filas) > 50 then
    raise exception 'Un lote lleva de 1 a 50 filas.' using errcode = '22023';
  end if;

  -- La importación es de quien la empieza: retomarla con el mismo id es lo que hace un reintento.
  insert into public.importaciones (id, usuario_id, entidad, archivo_ruta, estado, filas_total, iniciada_en)
  values (p_importacion, v_yo, 'leads', null, 'procesando', p_total, now())
  on conflict (id) do nothing;
  select i.usuario_id, i.estado into v_dueno, v_estado from public.importaciones i where i.id = p_importacion for update;
  if v_dueno is distinct from v_yo or not exists (select 1 from public.importaciones i where i.id = p_importacion and i.entidad = 'leads') then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  if v_estado <> 'procesando' then
    raise exception 'Esta importación ya terminó.' using errcode = '22023';
  end if;

  -- Cada elemento, validado antes de tocar nada: una forma rota es un error del cliente, no de una fila.
  for v_fila in select e.value as v from jsonb_array_elements(p_filas) e loop
    if jsonb_typeof(v_fila.v) <> 'object' or jsonb_typeof(v_fila.v -> 'lead') is distinct from 'object'
       or jsonb_typeof(v_fila.v -> 'id') is distinct from 'string'
       or jsonb_typeof(v_fila.v -> 'fila') is distinct from 'number' then
      raise exception 'Una fila del lote no tiene la forma esperada.' using errcode = '22023';
    end if;
  end loop;

  -- En el orden del teléfono: dos lotes de dos personas que se cruzan toman los candados en el mismo
  -- orden y no se bloquean entre sí.
  for v_fila in
    select e.value as v, e.ordinality as ord
    from jsonb_array_elements(p_filas) with ordinality e
    order by public._telefono_o_nulo(v_cc, e.value -> 'lead' ->> 'telefono_principal') nulls first, e.ordinality
  loop
    v_numero_de_fila := (v_fila.v ->> 'fila')::integer;
    begin
      v_lead := v_fila.v -> 'lead';
      -- Sólo viajan las claves conocidas: `adoptar` y cualquier otra se rechazan, no se ignoran.
      for v_k in select jsonb_object_keys(v_lead) loop
        if not (v_k = any (v_permitidas)) then
          raise exception 'El dato «%» no se puede importar.', v_k using errcode = '22023', hint = v_k;
        end if;
      end loop;
      v_res := public._lead_crear((v_fila.v ->> 'id')::uuid, v_lead, null, null, false);
      if (v_res ->> 'resultado') = 'creado' then
        insert into public.importaciones_leads (importacion_id, lead_id, fila)
        values (p_importacion, (v_res ->> 'id')::uuid, v_numero_de_fila)
        on conflict do nothing;
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'creado',
          'numero', (v_res ->> 'numero')::bigint, 'repetido', coalesce((v_res ->> 'repetido')::boolean, false)));
      else
        -- existe, de_otro y limbo se dicen igual: en masa sólo se sabe que el número ya está.
        v_salida := v_salida || jsonb_build_array(jsonb_build_object(
          'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'ya_existe'));
      end if;
    exception when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate, v_mensaje = message_text, v_hint = pg_exception_hint;
      -- Lo que levantan nuestras reglas es humano; lo inesperado no se cuenta.
      if v_sqlstate not in ('22023', '23502', '23514', 'PT409') then
        v_mensaje := 'No pudimos importar esta fila. Inténtalo de nuevo.';
        v_hint := null;
      end if;
      v_salida := v_salida || jsonb_build_array(jsonb_build_object(
        'id', v_fila.v ->> 'id', 'fila', v_numero_de_fila, 'resultado', 'error',
        'campo', nullif(v_hint, ''), 'motivo', v_mensaje));
    end;
  end loop;

  update public.importaciones i set filas_ok = (select count(*) from public.importaciones_leads x where x.importacion_id = i.id)
   where i.id = p_importacion;
  return jsonb_build_object('importacion', p_importacion, 'filas', v_salida);
end;
$$;
revoke all on function public.leads_importar_lote(uuid, integer, jsonb) from public, anon;
grant execute on function public.leads_importar_lote(uuid, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Terminar: cierra la importación, deja su constancia (sólo números) y guarda el origen del archivo
-- como «último origen» una sola vez. Idempotente: terminarla otra vez devuelve lo mismo.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_importacion_terminar(p_importacion uuid, p_ya_existian integer, p_rechazadas integer, p_origen uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_dueno uuid;
  v_estado public.estado_importacion;
  v_creadas integer;
begin
  perform public.assert_permiso('leads.crear');
  perform public.assert_activo();
  if p_ya_existian is null or p_ya_existian < 0 or p_ya_existian > 500 or p_rechazadas is null or p_rechazadas < 0 or p_rechazadas > 500 then
    raise exception 'Las cuentas de la importación no son válidas.' using errcode = '22023';
  end if;
  select i.usuario_id, i.estado into v_dueno, v_estado
    from public.importaciones i where i.id = p_importacion and i.entidad = 'leads' for update;
  if not found or v_dueno is distinct from v_yo then
    raise exception 'No encontramos esta importación.' using errcode = '42501';
  end if;
  select count(*) into v_creadas from public.importaciones_leads x where x.importacion_id = p_importacion;
  if v_estado = 'terminada' then
    return jsonb_build_object('importacion', p_importacion, 'creadas', v_creadas, 'repetido', true);
  end if;
  update public.importaciones set estado = 'terminada', terminada_en = now(), filas_ok = v_creadas
   where id = p_importacion;
  perform public.registrar_actividad('leads.importado', 'importaciones', p_importacion::text, null, null,
    jsonb_build_object('creadas', v_creadas, 'ya_existian', p_ya_existian, 'rechazadas', p_rechazadas));
  if p_origen is not null and exists (select 1 from public.origenes_lead o where o.id = p_origen and o.activo) then
    insert into public.preferencias_usuario (usuario_id, clave, valor)
    values (v_yo, 'leads.ultimo_origen_lead', to_jsonb(p_origen::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor, actualizado_en = now();
  end if;
  return jsonb_build_object('importacion', p_importacion, 'creadas', v_creadas, 'repetido', false);
end;
$$;
revoke all on function public.leads_importacion_terminar(uuid, integer, integer, uuid) from public, anon;
grant execute on function public.leads_importacion_terminar(uuid, integer, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Exportar: deja la constancia y aplica el límite (5 por hora y persona). El límite es un valor, no una
-- excepción. Los filtros van por NOMBRE, nunca por valor: una búsqueda puede ser el nombre de alguien.
-- ---------------------------------------------------------------------------------------------------
create or replace function public.leads_exportacion_registrar(p_filas integer, p_filtros text[] default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cuantas integer;
  v_desde timestamptz;
  v_f text;
begin
  perform public.assert_permiso('leads.exportar');
  perform public.assert_activo();
  if p_filas is null or p_filas < 0 or p_filas > 5000 then
    raise exception 'Una exportación lleva hasta 5.000 leads.' using errcode = '22023';
  end if;
  p_filtros := coalesce(p_filtros, '{}');
  if cardinality(p_filtros) > 40 then
    raise exception 'Demasiados filtros.' using errcode = '22023';
  end if;
  foreach v_f in array p_filtros loop
    if v_f is null or v_f !~ '^[a-z][a-z0-9_.]{0,60}$' then
      raise exception 'Un filtro no tiene un nombre válido.' using errcode = '22023';
    end if;
  end loop;
  -- Dos exportaciones a la vez de la misma persona no se cuelan juntas por debajo del tope.
  perform pg_advisory_xact_lock(hashtext('leads_exportacion'), hashtext(v_yo::text));
  select count(*), min(a.creado_en) into v_cuantas, v_desde
    from public.actividad a
   where a.actor_id = v_yo and a.accion = 'leads.exportado' and a.creado_en > now() - interval '1 hour';
  if v_cuantas >= 5 then
    return jsonb_build_object('ok', false, 'libre_en', v_desde + interval '1 hour');
  end if;
  perform public.registrar_actividad('leads.exportado', 'leads', null, null, null,
    jsonb_build_object('filas', p_filas, 'filtros', to_jsonb(p_filtros)));
  return jsonb_build_object('ok', true, 'restantes', 4 - v_cuantas);
end;
$$;
revoke all on function public.leads_exportacion_registrar(integer, text[]) from public, anon;
grant execute on function public.leads_exportacion_registrar(integer, text[]) to authenticated;
