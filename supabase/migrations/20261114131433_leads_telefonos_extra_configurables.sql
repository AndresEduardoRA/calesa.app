-- Teléfonos extra configurables por empresa (`ajustes_leads`): el máximo por lead (0 a 20, 6 de fábrica) y si un extra cuenta como el
-- principal (único entre leads vivos). La regla vive en `_lead_verificar()`: alta, importar, cambiar el principal, verificar al tipear y
-- restaurar de la papelera la heredan. Un índice único no puede abarcar `leads` y `leads_telefonos` (y los duplicados que ya existen deben
-- poder quedar), así que con la regla encendida se serializa por número con un candado: primero la fila del lead, después el número.

alter table public.ajustes_leads
  add column telefonos_extra_maximo smallint not null default 6,
  add column telefonos_extra_como_principal boolean not null default false,
  add column telefonos_actualizado_en timestamptz not null default now(),
  add constraint ajustes_leads_telefonos_extra_maximo_check check (telefonos_extra_maximo between 0 and 20);

comment on column public.ajustes_leads.telefonos_extra_maximo is
  'Máximo de teléfonos extra por lead (0 a 20): lo aplica `lead_telefono_guardar()` al agregar; los leads que ya tienen más los conservan.';
comment on column public.ajustes_leads.telefonos_extra_como_principal is
  'Con true, un teléfono extra es único entre leads vivos como el principal (`_lead_verificar()`); lo que ya se repite queda.';
comment on column public.ajustes_leads.telefonos_actualizado_en is
  'Versión de los ajustes de teléfonos extra (PT409 en `telefonos_extra_ajustes_guardar()`), independiente de la del embudo y la del portal.';
comment on table public.leads_telefonos is
  'Teléfonos extra de un lead (etiquetados). Hasta `ajustes_leads.telefonos_extra_maximo` por lead; únicos sólo dentro del lead: entre leads, según `ajustes_leads.telefonos_extra_como_principal`. Sin policies ni grants: se lee por `lead_telefonos()` y se escribe por `lead_telefono_*`.';

create or replace function public._lead_verificar(p_tel text, p_excluir uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare l record; d record; a record;
  v_como boolean := coalesce((select aj.telefonos_extra_como_principal from public.ajustes_leads aj where aj.id = 1), false);
  v_extra boolean := false;
  -- El permiso del número se pregunta sólo cuando hay un lead que nombrar («existe»): la papelera llama a esta función una vez
  -- por lead y casi nunca llega acá, y `tiene_permiso` cuesta ~0,25 ms.
  v_ve boolean;
  v_yo uuid := (select auth.uid());
begin
  select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre into l
    from public.leads x
   where x.telefono_principal = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir;
  if not found and v_como then
    -- Con la regla, un extra cuenta como el principal de su lead (el de un lead en limbo también): se contesta igual.
    select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre into l
      from public.leads_telefonos t join public.leads x on x.id = t.lead_id
     where t.telefono = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir
     order by public.puede_lead(x.id, 'leads.ver') desc, public.en_cartera(x.id) desc, t.creado_en, t.id
     limit 1;
    v_extra := found;
  end if;
  if not found then
    select x.id, x.numero, x.numero_propio, x.creado_por, x.nombre into a
      from public.leads_telefonos t join public.leads x on x.id = t.lead_id
     where t.telefono = p_tel and x.eliminado_en is null and x.id is distinct from p_excluir
       and not public.lead_en_limbo(x.id)
     order by public.puede_lead(x.id, 'leads.ver') desc, public.en_cartera(x.id) desc, t.creado_en, t.id
     limit 1;
    if not found then
      return jsonb_build_object('estado', 'libre');
    end if;
    if public.puede_lead(a.id, 'leads.ver') then
      v_ve := public.tiene_permiso('leads.numero_global.ver');
      return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object(
        'estado', 'existe', 'como', 'extra', 'lead_id', a.id, 'numero', case when v_ve then a.numero end,
        'numero_propio', case when v_ve or a.creado_por = v_yo then a.numero_propio end, 'nombre', a.nombre,
        'es_mio', public.en_cartera(a.id)));
    end if;
    select p.nombre into d
      from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
     where la.lead_id = a.id and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
     order by (la.tipo_acceso = 'dueno') desc, la.desde
     limit 1;
    return jsonb_build_object('estado', 'libre', 'alterno', jsonb_build_object('estado', 'de_otro', 'como', 'extra', 'dueno', d.nombre));
  end if;
  if public.lead_en_limbo(l.id) then
    return jsonb_build_object('estado', 'limbo') || case when v_extra then jsonb_build_object('como', 'extra') else '{}'::jsonb end;
  end if;
  if public.puede_lead(l.id, 'leads.ver') then
    v_ve := public.tiene_permiso('leads.numero_global.ver');
    return jsonb_build_object('estado', 'existe', 'lead_id', l.id, 'numero', case when v_ve then l.numero end,
                              'numero_propio', case when v_ve or l.creado_por = v_yo then l.numero_propio end, 'nombre', l.nombre,
                              'es_mio', public.en_cartera(l.id))
      || case when v_extra then jsonb_build_object('como', 'extra') else '{}'::jsonb end;
  end if;
  select p.id, p.nombre into d
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = l.id and la.revocado_en is null and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object('estado', 'de_otro', 'dueno', d.nombre, 'dueno_id', d.id)
    || case when v_extra then jsonb_build_object('como', 'extra') else '{}'::jsonb end;
end;
$$;

revoke all on function public._lead_verificar(p_tel text, p_excluir uuid) from public, anon, authenticated;
grant execute on function public._lead_verificar(p_tel text, p_excluir uuid) to service_role;

create or replace function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  v_yo uuid := (select auth.uid());
  v_permitidas constant text[] := array['nombre', 'telefono_cc', 'telefono_principal', 'tipo_lead_id', 'origen_lead_id', 'atributos', 'adoptar'];
  v_k text;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_nombre text;
  v_tipo uuid;
  v_origen uuid;
  v_activos text[];
  v_atributos jsonb := '{}'::jsonb;
  v_verif jsonb;
  v_estado text;
  v_id uuid;
  v_adoptado boolean := false;
  v_tipo_seg uuid;
  v_titulo text;
  v_detalle text;
  v_doc jsonb;
  v_id_previo uuid;
  v_ocurrido timestamptz := now();
  v_k2 text;
  v_msg text;
  v_recordar timestamptz;
  v_titulo_rec text;
  v_como boolean := coalesce((select aj.telefonos_extra_como_principal from public.ajustes_leads aj where aj.id = 1), false);
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
  select l.id into v_id from public.leads l where l.id = p_id and l.creado_por = v_yo;
  if found then
    return jsonb_build_object('resultado', 'creado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
  end if;
  -- ¿Ya entró por una adopción del limbo? Sólo un alta que adopta (`adoptar`) puede haber escrito ese intento, y la
  -- importación nunca adopta: sin `adoptar` no se busca. Buscarlo siempre costaba 0,15 µs por fila de `actividad` por cada
  -- alta (con `leads` grande el planificador recorría `actividad_pkey` entera en vez de `actividad_intento_adopcion_idx`):
  -- importar 500 filas con 126.000 de `actividad` tardaba 10,5 s. `docs/DECISIONES.md`, «Cierre 5a-fix-2».
  if (p_lead ->> 'adoptar') = 'true' then
    select l.id into v_id
      from public.actividad a join public.leads l on l.id::text = a.registro_id
     where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
     order by a.id desc limit 1;
    if found then
      return jsonb_build_object('resultado', 'adoptado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
    end if;
  end if;

  -- El teléfono, y lo que ya se sabe de él.
  v_cc := coalesce(nullif(btrim(p_lead ->> 'telefono_cc'), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_lead ->> 'telefono_principal');
  -- Con la regla de los extras, el número se serializa: un índice único no abarca `leads_telefonos`. Su propia sentencia, antes de
  -- verificar, para que la verificación vea lo que otro confirmó mientras esperaba.
  if v_como then
  perform pg_advisory_xact_lock(hashtextextended('leads_telefono:' || v_tel, 0));
  end if;
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
    v_tipo := coalesce(nullif(p_lead ->> 'tipo_lead_id', '')::uuid, public._tipo_lead_por_defecto());
  exception when invalid_text_representation then
    raise exception 'Ese tipo de lead no existe.' using errcode = '22023', hint = 'tipo_lead_id';
  end;
  if v_tipo is null then
    raise exception 'Elige el tipo de lead.' using errcode = '22023', hint = 'tipo_lead_id';
  end if;
  perform public._tipo_lead_exigir_activo(v_tipo);
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
    select l.id into v_id from public.leads l
     where l.telefono_principal = v_tel and l.eliminado_en is null for update;
    if not found and v_como then
      -- Con la regla, el lead en limbo puede tener ese número como extra.
      select x.id into v_id
        from public.leads_telefonos t join public.leads x on x.id = t.lead_id
       where t.telefono = v_tel and x.eliminado_en is null
       order by public.lead_en_limbo(x.id) desc, t.creado_en, t.id
       limit 1
         for update of x;
    end if;
    -- Otra llamada del MISMO intento pudo adoptarlo mientras esta esperaba el candado (un doble envío):
    -- ya se ve confirmado, y adoptar de nuevo duplicaría el seguimiento y el recordatorio. (Otro intento
    -- de otra persona sobre el mismo lead sigue siendo la carrera de siempre, fuera de esta parte.)
    select l.id into v_id_previo
      from public.actividad a join public.leads l on l.id::text = a.registro_id
     where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = v_yo and a.detalle ->> 'intento' = p_id::text
     order by a.id desc limit 1;
    if found then
      return jsonb_build_object('resultado', 'adoptado', 'id', v_id_previo, 'repetido', true) || public._lead_numeros_de(v_id_previo);
    end if;
    -- Una baja en curso de quien lo tenía se aplica a este lead antes de tomarlo (cierre 1); y si otra persona lo tomó
    -- mientras se esperaba el candado, se dice como al verificar, en vez de chocar con el dueño único.
    perform public._lead_aplicar_bajas(v_id);
    if not public.lead_en_limbo(v_id) then
      v_verif := public._lead_verificar(v_tel);
      return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
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
    -- El candado de los embudos de quien crea va antes del teléfono: la oportunidad base lo toma al final, y dos altas o lotes de la misma
    -- persona con teléfonos cruzados se esperarían en orden inverso (40P01). Así todas toman primero el candado y después el teléfono.
    perform public._embudos_candado(v_yo);
    v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
    begin
      insert into public.leads (id, nombre, telefono_cc, telefono_principal, tipo_lead_id, origen_lead_id, atributos, creado_por)
      values (p_id, v_nombre,
              case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
              v_tel, v_tipo, v_origen, v_atributos, v_yo)
      returning id into v_id;
    exception when unique_violation then
      -- Dos personas guardaron el mismo teléfono a la vez (o este mismo intento, dos veces): el que
      -- llegó segundo ve su estado «existe», no un error.
      select l.id into v_id from public.leads l where l.id = p_id and l.creado_por = v_yo;
      if found then
        return jsonb_build_object('resultado', 'creado', 'id', v_id, 'repetido', true) || public._lead_numeros_de(v_id);
      end if;
      v_verif := public._lead_verificar(v_tel);
      if (v_verif ->> 'estado') in ('existe', 'de_otro', 'limbo') then
        return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
      end if;
      raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end;
    perform public.registrar_actividad('lead.creado', 'leads', v_id::text, null,
      jsonb_build_object('nombre', v_nombre), jsonb_build_object('intento', p_id));
    -- La oportunidad base (C3): todo lead nuevo nace con una, en la etapa inicial del embudo por defecto de quien lo crea, en esta transacción.
    perform public._lead_oportunidad_base(v_id, v_yo, v_nombre);
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
                            'id', v_id, 'repetido', false) || public._lead_numeros_de(v_id);
end;
$$;

revoke all on function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean) from public, anon, authenticated;
grant execute on function public._lead_crear(p_id uuid, p_lead jsonb, p_seguimiento jsonb, p_recordatorio jsonb, p_recordar_origen boolean) to service_role;

create or replace function public.cambiar_telefono_lead(p_lead uuid, p_actualizado_en_esperado timestamp with time zone, p_cc text, p_tel text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  l public.leads;
  v_cc text;
  v_cc_digitos text;
  v_tel text;
  v_verif jsonb;
  v_estado text;
begin
  l := public._lead_mio(p_lead, 'leads.editar', true);
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  v_tel := public.normalizar_telefono(v_cc, p_tel);
  -- El mismo número no es un conflicto aunque la versión sea otra: un reintento no choca consigo mismo.
  if v_tel = l.telefono_principal then
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;
  -- Con la regla de los extras, el número se serializa (primero la fila del lead, ya tomada; después el número).
  if coalesce((select aj.telefonos_extra_como_principal from public.ajustes_leads aj where aj.id = 1), false) then
  perform pg_advisory_xact_lock(hashtextextended('leads_telefono:' || v_tel, 0));
  end if;
  v_verif := public._lead_verificar(v_tel, l.id);
  v_estado := v_verif ->> 'estado';
  if v_estado in ('existe', 'de_otro', 'limbo') then
    return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
  end if;
  if l.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._lead_conflicto(l.id, l.actualizado_en);
  end if;

  v_cc_digitos := regexp_replace(coalesce(v_cc, ''), '\D', '', 'g');
  begin
    update public.leads x set
      telefono_cc = case when v_cc_digitos <> '' and v_tel like v_cc_digitos || '%' then '+' || v_cc_digitos end,
      telefono_principal = v_tel
    where x.id = l.id;
  exception when unique_violation then
    -- Otra persona tomó ese número justo ahora: se dice como valor, no como error.
    v_verif := public._lead_verificar(v_tel, l.id);
    v_estado := v_verif ->> 'estado';
    if v_estado in ('existe', 'de_otro', 'limbo') then
      return jsonb_build_object('resultado', v_estado, 'verificacion', v_verif);
    end if;
    raise exception 'Ese teléfono cambió mientras guardabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end;

  delete from public.leads_telefonos t where t.lead_id = l.id and t.telefono = v_tel;
  insert into public.leads_telefonos (lead_id, telefono, etiqueta)
  values (l.id, l.telefono_principal, 'Anterior')
  on conflict (lead_id, telefono) do nothing;

  perform public.registrar_actividad('lead.telefono_cambiado', 'leads', l.id::text, null, null,
    jsonb_build_object('anterior', public.enmascarar_telefono(l.telefono_principal),
                       'nuevo', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'cambiado');
end;
$$;

revoke all on function public.cambiar_telefono_lead(p_lead uuid, p_actualizado_en_esperado timestamp with time zone, p_cc text, p_tel text) from public, anon;
grant execute on function public.cambiar_telefono_lead(p_lead uuid, p_actualizado_en_esperado timestamp with time zone, p_cc text, p_tel text) to authenticated, service_role;

create or replace function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text DEFAULT NULL::text, p_creado_en timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  l public.leads;
  t public.leads_telefonos;
  v_cc text;
  v_tel text;
  v_etiqueta text;
  v_msg text;
  v_max integer := coalesce((select aj.telefonos_extra_maximo from public.ajustes_leads aj where aj.id = 1), 6);
  v_como boolean := coalesce((select aj.telefonos_extra_como_principal from public.ajustes_leads aj where aj.id = 1), false);
  v_verif jsonb;
begin
  l := public._lead_mio(p_lead, 'leads.telefonos_extra.editar', true);
  if p_id is null then
    raise exception 'Falta el identificador del teléfono.' using errcode = '22023';
  end if;
  v_etiqueta := nullif(btrim(coalesce(p_etiqueta, '')), '');
  if char_length(v_etiqueta) > 40 then
    raise exception 'La etiqueta admite hasta 40 caracteres.' using errcode = '22023', hint = 'etiqueta';
  end if;
  v_cc := coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1));
  begin
    v_tel := public.normalizar_telefono(v_cc, p_tel);
  exception when sqlstate '22023' then
    get stacked diagnostics v_msg = message_text;
    raise exception '%', v_msg using errcode = '22023', hint = 'telefono';
  end;

  select * into t from public.leads_telefonos x where x.id = p_id;
  if found then
    if t.lead_id <> l.id then
      raise exception 'No pudimos guardar este teléfono. Vuelve a intentarlo.' using errcode = '22023';
    end if;
    if t.telefono <> v_tel then
      raise exception 'Para cambiar el número, quita este teléfono y agrega el nuevo.'
        using errcode = '22023', hint = 'telefono';
    end if;
    if t.etiqueta is distinct from v_etiqueta then
      update public.leads_telefonos x set etiqueta = v_etiqueta where x.id = t.id;
      perform public.registrar_actividad('lead.telefono_extra_rotulado', 'leads', l.id::text, null, null,
        jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
      return public._lead_telefonos_estado(l.id, 'rotulado');
    end if;
    return public._lead_telefonos_estado(l.id, 'sin_cambios');
  end if;

  if v_tel = l.telefono_principal
     or exists (select 1 from public.leads_telefonos x where x.lead_id = l.id and x.telefono = v_tel) then
    raise exception 'Ese número ya está en este lead.' using errcode = '22023', hint = 'telefono';
  end if;
  if (select count(*) from public.leads_telefonos x where x.lead_id = l.id) >= v_max then
    raise exception '%', case when v_max = 0 then 'Esta empresa no admite teléfonos extra.'
      else format('Un lead admite hasta %s teléfonos extra. Quita uno para agregar otro.', v_max) end
      using errcode = '22023', hint = 'telefono';
  end if;
  if v_como then
    -- Con la regla, el extra es único entre leads vivos: el candado del número va en su propia sentencia (después de la fila del
    -- lead, ya tomada) para que la verificación vea lo que otro confirmó. Un choque se dice como valor, sin escribir.
    perform pg_advisory_xact_lock(hashtextextended('leads_telefono:' || v_tel, 0));
    v_verif := public._lead_verificar(v_tel, l.id);
    if (v_verif ->> 'estado') in ('existe', 'de_otro', 'limbo') then
      return jsonb_build_object('resultado', v_verif ->> 'estado', 'verificacion', v_verif);
    end if;
  end if;
  insert into public.leads_telefonos (id, lead_id, telefono, etiqueta, creado_en)
  values (p_id, l.id, v_tel, v_etiqueta, least(coalesce(p_creado_en, now()), now()));
  perform public.registrar_actividad('lead.telefono_extra_agregado', 'leads', l.id::text, null, null,
    jsonb_build_object('telefono', public.enmascarar_telefono(v_tel)));
  return public._lead_telefonos_estado(l.id, 'agregado');
end;
$$;

revoke all on function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text, p_creado_en timestamp with time zone) from public, anon;
grant execute on function public.lead_telefono_guardar(p_lead uuid, p_id uuid, p_cc text, p_tel text, p_etiqueta text, p_creado_en timestamp with time zone) to authenticated, service_role;

create or replace function public.verificar_telefono_extra(p_lead uuid, p_cc text, p_tel text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path = ''
as $$
declare l public.leads; v_tel text; v jsonb;
  v_como boolean := coalesce((select aj.telefonos_extra_como_principal from public.ajustes_leads aj where aj.id = 1), false);
begin
  perform public.assert_activo();
  if not public.puede_actuar_lead(p_lead, 'leads.telefonos_extra.editar') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  select * into l from public.leads x where x.id = p_lead and x.eliminado_en is null;
  if not found then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  v_tel := public.normalizar_telefono(
    coalesce(nullif(btrim(p_cc), ''), (select e.telefono_cc from public.ajustes_empresa e where e.id = 1)), p_tel);
  if v_tel = l.telefono_principal then
    return jsonb_build_object('estado', 'mismo');
  end if;
  -- Uno que el lead ya tiene como extra es «ya está en este lead», aunque otro lead lo repita.
  if exists (select 1 from public.leads_telefonos t where t.lead_id = l.id and t.telefono = v_tel) then
    return jsonb_build_object('estado', 'libre', 'es_extra', true);
  end if;
  v := public._lead_verificar(v_tel, l.id);
  if v_como then
    return v;
  end if;
  -- Sin la regla un extra puede repetirse: el principal de otro lead sólo avisa, y un lead en limbo no se nombra.
  if (v ->> 'estado') in ('existe', 'de_otro') then
    return jsonb_build_object('estado', 'libre', 'alterno', (v - 'dueno_id') || jsonb_build_object('como', 'principal'));
  end if;
  if (v ->> 'estado') = 'limbo' then
    return jsonb_build_object('estado', 'libre');
  end if;
  return v;
end;
$$;

revoke all on function public.verificar_telefono_extra(p_lead uuid, p_cc text, p_tel text) from public, anon;
grant execute on function public.verificar_telefono_extra(p_lead uuid, p_cc text, p_tel text) to authenticated, service_role;

create or replace function public.lead_telefonos_leer(p_lead uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path = ''
as $$
declare v record;
begin
  select lv.id, lv.telefono_cc, lv.telefono_principal, lv.en_cartera into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', v.id, 'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'maximo', coalesce((select aj.telefonos_extra_maximo from public.ajustes_leads aj where aj.id = 1), 6),
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta) order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb));
end;
$$;

revoke all on function public.lead_telefonos_leer(p_lead uuid) from public, anon;
grant execute on function public.lead_telefonos_leer(p_lead uuid) to authenticated, service_role;

create or replace function public.lead_ficha(p_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $$
declare v record; t record;
begin
  select * into v from public.leads_vista lv where lv.id = p_lead;
  if not found then
    return null;
  end if;
  select la.usuario_id as id, nullif(btrim(p.nombre), '') as nombre into t
    from public.leads_asesores la join public.perfiles p on p.id = la.usuario_id
   where la.lead_id = p_lead and la.revocado_en is null
     and la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])
   order by (la.tipo_acceso = 'dueno') desc, la.desde
   limit 1;
  return jsonb_build_object(
    'id', v.id, 'numero', v.numero, 'numero_propio', v.numero_propio, 'numero_propio_de', v.numero_propio_de,
    'numero_propio_creador', v.numero_propio_creador,
    'nombre', v.nombre,
    'telefono_cc', v.telefono_cc, 'telefono', v.telefono_principal, 'en_cartera', v.en_cartera,
    'tipo_lead_id', v.tipo_lead_id, 'origen_lead_id', v.origen_lead_id,
    'atributos', coalesce(v.atributos, '{}'::jsonb),
    'creado_en', v.creado_en, 'actualizado_en', v.actualizado_en,
    'tiene_id', t.id, 'tiene_nombre', t.nombre,
    'telefonos', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'telefono', x.telefono, 'etiqueta', x.etiqueta)
                       order by x.creado_en, x.id)
        from public.lead_telefonos(p_lead) x), '[]'::jsonb),
    'telefonos_maximo', coalesce((select aj.telefonos_extra_maximo from public.ajustes_leads aj where aj.id = 1), 6),
    'recordatorios_vencidos', (
      select count(*) from (
        select 1 from public.recordatorios r
         where r.usuario_id = (select auth.uid()) and r.lead_id = p_lead
           and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
         order by r.recordar_en limit 21) x),
    -- Hasta 101 (el aviso dice «más de 100»); índice `vehiculos_lead_idx`.
    'vehiculos_vinculados', (select count(*) from (select 1 from public.vehiculos x where x.lead_id = p_lead limit 101) q),
    'es_favorito', v.es_favorito, 'esta_tachado', v.esta_tachado,
    'etiquetas', to_jsonb(v.etiquetas));
end;
$$;

revoke all on function public.lead_ficha(p_lead uuid) from public, anon;
grant execute on function public.lead_ficha(p_lead uuid) to authenticated, service_role;

create or replace function public.ajustes_leads_leer()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare a public.ajustes_leads;
begin
  perform public.assert_activo();
  select * into a from public.ajustes_leads where id = 1;
  return jsonb_build_object(
    'embudo', jsonb_build_object(
      'etapas', coalesce(a.embudo_etapas, public._embudo_etapas_de_fabrica()),
      'de_fabrica', a.embudo_etapas is null,
      'actualizado_en', a.embudo_actualizado_en),
    'portal', jsonb_build_object(
      'mensaje', a.portal_mensaje,
      'actualizado_en', a.portal_actualizado_en),
    'telefonos', jsonb_build_object(
      'maximo', a.telefonos_extra_maximo,
      'como_principal', a.telefonos_extra_como_principal,
      'actualizado_en', a.telefonos_actualizado_en));
end;
$$;

revoke all on function public.ajustes_leads_leer() from public, anon;
grant execute on function public.ajustes_leads_leer() to authenticated, service_role;

create or replace function public.telefonos_extra_ajustes_guardar(
  p_maximo integer, p_como_principal boolean, p_actualizado_en_esperado timestamptz)
 returns timestamptz
 language plpgsql
 security definer
 set search_path = ''
as $$
declare a public.ajustes_leads;
begin
  perform public.assert_permiso('leads.configurar');
  if p_maximo is null or p_maximo < 0 or p_maximo > 20 then
    raise exception 'El máximo va de 0 a 20.' using errcode = '22023', hint = 'maximo';
  end if;
  if p_como_principal is null then
    raise exception 'Falta decir si los teléfonos extra cuentan como el principal.' using errcode = '22023', hint = 'como_principal';
  end if;
  select * into a from public.ajustes_leads where id = 1 for update;
  perform public._exigir_version(a.telefonos_actualizado_en, p_actualizado_en_esperado,
    'Alguien cambió los teléfonos extra mientras los veías. Recarga para seguir.');
  if p_maximo = a.telefonos_extra_maximo and p_como_principal = a.telefonos_extra_como_principal then
    return a.telefonos_actualizado_en;
  end if;
  update public.ajustes_leads
     set telefonos_extra_maximo = p_maximo,
         telefonos_extra_como_principal = p_como_principal,
         telefonos_actualizado_en = greatest(clock_timestamp(), a.telefonos_actualizado_en + interval '1 microsecond')
   where id = 1
  returning telefonos_actualizado_en into a.telefonos_actualizado_en;
  return a.telefonos_actualizado_en;
end;
$$;

revoke all on function public.telefonos_extra_ajustes_guardar(p_maximo integer, p_como_principal boolean, p_actualizado_en_esperado timestamp with time zone) from public, anon;
grant execute on function public.telefonos_extra_ajustes_guardar(p_maximo integer, p_como_principal boolean, p_actualizado_en_esperado timestamp with time zone) to authenticated, service_role;

-- Los choques: extras de leads vivos cuyo número ya es el principal (o un extra anterior) de otro lead vivo. Se recorre `leads_telefonos`
-- por su clave (`leads_telefonos_pkey`) desde el cursor, hasta 10.000 filas por llamada; cada fila busca su choque por `leads_telefono_unico`
-- (el principal) y por `leads_telefonos_telefono_idx` (otro extra). Sin total exacto: `tamano + 1` para saber si hay más, y
-- «recorrido_cortado» si no alcanzó a mirar todo. Nunca el número completo; el nombre de un lead sólo si quien configura lo ve.
create or replace function public.telefonos_extra_choques(p_despues uuid default null, p_tamano integer default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path = ''
as $$
declare
  c refcursor;
  r record;
  v_tam integer := public._acotar_pagina(p_tamano, 20, 50);
  v_recorrido constant integer := 10000;
  v_vistas integer := 0;
  v_filas jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_ultimo uuid;
  v_siguiente uuid;
  v_mas boolean := false;
  v_cortado boolean := false;
begin
  perform public.assert_permiso('leads.configurar');
  if p_despues is null then
    open c for
      select e.id, e.telefono, s.id as lead_id, s.nombre as lead_nombre, o.id as otro_id, o.nombre as otro_nombre, o.como
        from (select t.id, t.lead_id, t.telefono from public.leads_telefonos t order by t.id limit v_recorrido + 1) e
        left join lateral (select x.id, x.nombre from public.leads x where x.id = e.lead_id and x.eliminado_en is null) s on true
        left join lateral (
          select q.id, q.nombre, q.como from (
            select x.id, x.nombre, 'principal'::text as como, 0 as orden from public.leads x
             where x.telefono_principal = e.telefono and x.eliminado_en is null and x.id <> e.lead_id
            union all
            select x.id, x.nombre, 'extra'::text, 1 from public.leads_telefonos t2 join public.leads x on x.id = t2.lead_id
             where t2.telefono = e.telefono and t2.id < e.id and t2.lead_id <> e.lead_id and x.eliminado_en is null) q
           order by q.orden, q.id limit 1) o on s.id is not null
       order by e.id;
  else
    open c for
      select e.id, e.telefono, s.id as lead_id, s.nombre as lead_nombre, o.id as otro_id, o.nombre as otro_nombre, o.como
        from (select t.id, t.lead_id, t.telefono from public.leads_telefonos t where t.id > p_despues order by t.id limit v_recorrido + 1) e
        left join lateral (select x.id, x.nombre from public.leads x where x.id = e.lead_id and x.eliminado_en is null) s on true
        left join lateral (
          select q.id, q.nombre, q.como from (
            select x.id, x.nombre, 'principal'::text as como, 0 as orden from public.leads x
             where x.telefono_principal = e.telefono and x.eliminado_en is null and x.id <> e.lead_id
            union all
            select x.id, x.nombre, 'extra'::text, 1 from public.leads_telefonos t2 join public.leads x on x.id = t2.lead_id
             where t2.telefono = e.telefono and t2.id < e.id and t2.lead_id <> e.lead_id and x.eliminado_en is null) q
           order by q.orden, q.id limit 1) o on s.id is not null
       order by e.id;
  end if;
  loop
    fetch c into r;
    exit when not found;
    v_vistas := v_vistas + 1;
    if v_vistas > v_recorrido then
      v_cortado := true;
      exit;
    end if;
    v_ultimo := r.id;
    if r.otro_id is null then
      continue;
    end if;
    if v_n = v_tam then
      v_mas := true;
      exit;
    end if;
    v_n := v_n + 1;
    v_siguiente := r.id;
    v_filas := v_filas || jsonb_build_object(
      'id', r.id,
      'telefono', public.enmascarar_telefono(r.telefono),
      'lead', jsonb_build_object('id', case when public.puede_lead(r.lead_id, 'leads.ver') then r.lead_id end,
                                 'nombre', case when public.puede_lead(r.lead_id, 'leads.ver') then r.lead_nombre end),
      'otro', jsonb_build_object('id', case when public.puede_lead(r.otro_id, 'leads.ver') then r.otro_id end,
                                 'nombre', case when public.puede_lead(r.otro_id, 'leads.ver') then r.otro_nombre end,
                                 'como', r.como));
  end loop;
  close c;
  return jsonb_build_object(
    'filas', v_filas,
    'siguiente', case when v_mas then v_siguiente when v_cortado then v_ultimo end,
    'hay_mas', v_mas,
    'recorrido_cortado', v_cortado and not v_mas);
end;
$$;

revoke all on function public.telefonos_extra_choques(p_despues uuid, p_tamano integer) from public, anon;
grant execute on function public.telefonos_extra_choques(p_despues uuid, p_tamano integer) to authenticated, service_role;

update public.permisos
   set aplicado_en = aplicado_en || ', telefonos_extra_ajustes_guardar, telefonos_extra_choques'
 where clave = 'leads.configurar' and aplicado_en not like '%telefonos_extra_ajustes_guardar%';
