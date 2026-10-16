-- El primer seguimiento del alta, opcional y enriquecido (Fase 3, parte 9b). Escrito a mano; sin cambio
-- de schema.
--
-- Leído contra la base viva (`pg_get_functiondef`) antes de escribir esto:
-- 1. `_lead_crear` guardaba sólo `detalle_texto` y su propia copia de la regla del resumen y del
--    detalle (`char_length > 5000`); no leía `detalle_doc` ni `ocurrido_en`. Y no miraba las claves de
--    `p_seguimiento`: una `visibilidad` pasaba callada.
-- 2. `seguimiento_crear` valida con `_seguimiento_titulo`, `_seguimiento_detalle` y `_seguimiento_fecha`.
--    El alta las reusa (una sola regla); levantan el hint de la ficha («detalle», «ocurrido_en») y acá
--    se vuelve a lanzar el mismo mensaje con el campo del formulario («seguimiento.detalle»).
-- 3. Carrera: dos envíos del mismo intento sobre un lead sin dueño pasan los dos la búsqueda del intento
--    en `actividad` (aún sin confirmar); el segundo espera el `for update` y, al soltarse, adoptaba otra
--    vez e insertaba un segundo seguimiento y otro recordatorio. Ahora vuelve a mirar tras el candado.
--
-- `p_seguimiento.detalle` es un documento del editor o nulo; un texto se rechaza («formato que no se
-- admite»). La forma de `crear_lead` no cambia. Los grants de `_lead_crear` (ninguno) se conservan.

create or replace function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_doc jsonb;
  v_id_previo uuid;
  v_numero_previo bigint;
  v_ocurrido timestamptz := now();
  v_k2 text;
  v_msg text;
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
    -- Las mismas claves que `seguimiento_crear`, menos las que el alta no ofrece (la visibilidad y el
    -- vehículo): una de más se rechaza con su nombre, no pasa callada.
    for v_k2 in select jsonb_object_keys(p_seguimiento) loop
      if v_k2 not in ('tipo_id', 'titulo', 'detalle', 'ocurrido_en') then
        raise exception 'El dato «%» no es del primer seguimiento.', v_k2
          using errcode = '22023', hint = 'seguimiento.' || v_k2;
      end if;
    end loop;
    begin
      v_tipo_seg := nullif(p_seguimiento ->> 'tipo_id', '')::uuid;
    exception when invalid_text_representation then
      v_tipo_seg := null;
    end;
    if v_tipo_seg is null or not exists (select 1 from public.tipos_seguimiento t where t.id = v_tipo_seg and t.activo) then
      raise exception 'Elige un tipo de seguimiento que esté activo.' using errcode = '22023', hint = 'seguimiento.tipo_id';
    end if;
    -- El resumen, el detalle y la fecha se validan con las funciones de `seguimiento_crear`: una sola
    -- regla. El resumen recibe su hint; el detalle y la fecha levantan el de la ficha («detalle»,
    -- «ocurrido_en») y acá se les pone el campo del alta.
    v_titulo := public._seguimiento_titulo(p_seguimiento -> 'titulo', 'seguimiento.titulo');
    begin
      v_doc := p_seguimiento -> 'detalle';
      v_detalle := public._seguimiento_detalle(v_doc);
      if v_detalle is null then
        v_doc := null;
      end if;
    exception when sqlstate '22023' then
      get stacked diagnostics v_msg = message_text;
      raise exception '%', v_msg using errcode = '22023', hint = 'seguimiento.detalle';
    end;
    if p_seguimiento ? 'ocurrido_en' and p_seguimiento -> 'ocurrido_en' <> 'null'::jsonb then
      begin
        v_ocurrido := public._seguimiento_fecha(p_seguimiento -> 'ocurrido_en');
      exception when sqlstate '22023' then
        get stacked diagnostics v_msg = message_text;
        raise exception '%', v_msg using errcode = '22023', hint = 'seguimiento.ocurrido_en';
      end;
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
    -- Otra llamada del MISMO intento pudo adoptarlo mientras esta esperaba el candado (un doble envío):
    -- ya se ve confirmado, y adoptar de nuevo duplicaría el seguimiento y el recordatorio. (Otro intento
    -- de otra persona sobre el mismo lead sigue siendo la carrera de siempre, fuera de esta parte.)
    select l.id, l.numero into v_id_previo, v_numero_previo
      from public.actividad a join public.leads l on l.id::text = a.registro_id
     where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
     order by a.id desc limit 1;
    if found then
      return jsonb_build_object('resultado', 'adoptado', 'id', v_id_previo, 'numero', v_numero_previo, 'repetido', true);
    end if;
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
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto, ocurrido_en, actualizado_en)
    values (v_id, v_yo, v_tipo_seg, v_titulo, v_doc, v_detalle, v_ocurrido, clock_timestamp());
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
$function$;
