-- Quién da de alta y cómo (B1, `docs/TANDA.md`): el alta suelta (el inventario `/vehiculos`, la importación) y el alta desde la hoja de cotizar son
-- dos permisos por origen. `vehiculo_crear(…, p_contexto)` exige el que corresponde y deja la marca en `vehiculos.creado_desde`. Es un límite de
-- flujo, no de seguridad dura: quien tiene la clave de cotizar crea vehículos marcados «cotizar», y eso queda en la columna y en la actividad
-- (`docs/DECISIONES.md`). Nadie pierde nada: quien hoy puede crear vehículos recibe también la clave nueva, con el mismo origen y alcance.

insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('vehiculos.crear.desde_cotizar', 'vehiculos', 'Crear vehículos desde cotizar', 'Dar de alta un vehículo desde la hoja de cotizar (por origen)', true, false, 'vehiculo_crear (contexto cotizar), cotizacion_crear (vehículo nuevo)', 91)
on conflict (clave) do nothing;

update public.permisos
set nombre = 'Crear vehículos sueltos', descripcion = 'Dar de alta vehículos desde el inventario y por importación (por origen)'
where clave = 'vehiculos.crear';

-- Migración de datos: quien crea vehículos en un origen también los crea desde la hoja de cotizar.
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select rp.rol_id, 'vehiculos.crear.desde_cotizar', rp.origen_id, rp.alcance
from public.roles_permisos rp
where rp.permiso_clave = 'vehiculos.crear'
on conflict (rol_id, permiso_clave, origen_id) do nothing;

alter table public.vehiculos
  add column creado_desde text not null default 'suelto'
  constraint vehiculos_creado_desde_check check (creado_desde in ('suelto', 'cotizar'));

comment on column public.vehiculos.creado_desde is 'Desde dónde se dio de alta: «suelto» (inventario, importación) o «cotizar» (la hoja de cotizar). La pone vehiculo_crear().';

drop function public.vehiculo_crear(uuid, uuid, jsonb, uuid);

CREATE FUNCTION "public"."vehiculo_crear"("p_id" "uuid", "p_origen" "uuid", "p_datos" "jsonb", "p_consulta" "uuid" DEFAULT NULL::"uuid", "p_contexto" "text" DEFAULT 'suelto'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v public.vehiculos; v_origen public.origenes; v_fase uuid; v_flujo uuid; v_sub jsonb; c public.apibara_consultas;
begin
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen del vehículo.' using errcode = '22023';
  end if;
  -- El alta suelta (inventario, importación) pide `vehiculos.crear`; la de la hoja de cotizar, `vehiculos.crear.desde_cotizar`.
  if p_contexto is null or p_contexto not in ('suelto', 'cotizar') then
    raise exception 'El alta tiene que decir desde dónde se hace.' using errcode = '22023', hint = 'p_contexto';
  end if;
  perform public.assert_permiso(case p_contexto when 'cotizar' then 'vehiculos.crear.desde_cotizar' else 'vehiculos.crear' end, p_origen);

  select * into v from public.vehiculos x where x.id = p_id;
  if found then
    if v.creado_por is distinct from (select auth.uid()) or v.origen_id <> p_origen then
      raise exception 'Ese identificador ya está en uso. Cierra el formulario y vuelve a abrirlo.' using errcode = '23505';
    end if;
    return jsonb_build_object('id', v.id, 'numero', v.numero, 'actualizado_en', v.actualizado_en, 'fase_id', v.fase_id);
  end if;

  select * into v_origen from public.origenes o where o.id = p_origen;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  if not v_origen.activo then
    raise exception 'El origen «%» está desactivado: no recibe registros nuevos.', v_origen.nombre using errcode = '23514';
  end if;
  if p_consulta is not null then
    if v_origen.tipo <> 'subasta' then
      raise exception 'Sólo un origen de subasta guarda datos de apibara.' using errcode = '22023';
    end if;
    c := public._apibara_consulta_tomar(p_consulta, p_origen, p_id);
    v_sub := public._vehiculo_subasta_desde(c.raw);
  end if;

  v.id := p_id;
  v.origen_id := p_origen;
  v.atributos := '{}'::jsonb;
  v := public._vehiculo_aplicar(v, p_datos);
  perform public._vehiculo_sin_repetidos(v);

  begin
    insert into public.vehiculos (id, origen_id, categoria_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen,
      precio, precio_negociable, acepta_permuta, placado, kilometraje, atributos, creado_por, creado_desde,
      subasta_en, subasta_fin_en, estado_subasta, apibara_sync_en, apibara_raw, importado_apibara)
    values (v.id, v.origen_id, v.categoria_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen,
      v.precio, v.precio_negociable, v.acepta_permuta, v.placado, v.kilometraje, v.atributos, (select auth.uid()), p_contexto,
      (v_sub ->> 'subasta_en')::timestamptz, (v_sub ->> 'subasta_fin_en')::timestamptz,
      (v_sub ->> 'estado_subasta')::public.estado_subasta,
      case when p_consulta is not null then now() end, c.raw, p_consulta is not null)
    returning * into v;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;
  if p_consulta is not null then
    update public.apibara_consultas x set vehiculo_id = v.id where x.id = p_consulta;
  end if;

  v_fase := public._vehiculo_fase_de_entrada(v.id, p_origen);
  if v_fase is not null then
    select f.flujo_id into v_flujo from public.fases f where f.id = v_fase;
    update public.vehiculos x set fase_id = v_fase, fase_desde = now() where x.id = v.id returning * into v;
    insert into public.historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id, usuario_id)
    values (v_flujo, v.id, null, v_fase, (select auth.uid()));
  end if;
  return jsonb_build_object('id', v.id, 'numero', v.numero, 'actualizado_en', v.actualizado_en, 'fase_id', v.fase_id);
end;
$$;

revoke all on function public.vehiculo_crear(uuid, uuid, jsonb, uuid, text) from public, anon;
grant execute on function public.vehiculo_crear(uuid, uuid, jsonb, uuid, text) to authenticated, service_role;

-- La hoja de cotizar que guarda con un vehículo nuevo lo crea en su contexto.
CREATE OR REPLACE FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid" DEFAULT NULL::"uuid", "p_vehiculo_nuevo" "jsonb" DEFAULT NULL::"jsonb", "p_modo_tc" "text" DEFAULT NULL::"text", "p_clase" "public"."clase_cotizacion" DEFAULT 'preventa'::"public"."clase_cotizacion", "p_con_la_abierta" boolean DEFAULT false, "p_ver_total_bs" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_yo uuid := (select auth.uid());
  c public.cotizaciones;
  a record;
  v_formula uuid; v_uso uuid; v_vuelta int := 0; v_version int;
  v_ab_formula uuid; v_ab_en timestamptz; v_ab_huella text;
  v_veh uuid := p_vehiculo;
  v_obligatorio boolean;
  v_modo jsonb;
  v_visibles text[]; v_editables jsonb; v_ctx jsonb;
  v_k text; v_opc text;
  v_res jsonb;
  v_total_base numeric;
  v_constraint text;
  v_ids uuid[]; v_tomadas uuid[];
begin
  perform public.assert_activo();
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen de la cotización.' using errcode = '22023';
  end if;
  perform public.assert_permiso('cotizaciones.crear', p_origen);
  -- Cotizar pide también ver: con sólo `crear` la hoja no tiene nada que mostrar (4-32). Después de `crear`: quien no cotiza ahí sigue recibiendo ese permiso en el error.
  perform public.assert_permiso('cotizaciones.ver', p_origen);
  -- D2: la hoja que se abrió. La firma la base (`cotizacion_hoja()`): trae la versión de la fórmula y la hora de la apertura, y no se puede inventar (4-27).
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  if p_clase = 'final' then
    perform public.assert_permiso('cotizaciones.final.gestionar', p_origen);
  end if;

  -- El intento: dos llamadas con el mismo id se ordenan acá (la segunda espera a que la primera confirme). Sólo una cotización MÍA, de este origen y viva se devuelve; un id ajeno
  -- no se mira (sería una sonda barata de ids): sigue y choca con la clave en el `insert`.
  perform pg_advisory_xact_lock(hashtextextended('cotizacion_crear:' || p_id::text, 0));
  select * into c from public.cotizaciones x where x.id = p_id and x.creado_por = v_yo and x.origen_id = p_origen and x.eliminado_en is null;
  if found then
    return public._cotizacion_respuesta(c) || jsonb_build_object('repetido', true);
  end if;

  -- La hoja abierta: su firma, su versión, su hora y la huella de las tarifas que vio. Después del intento: un reintento vuelve lo guardado aunque la clave haya rotado o la hoja sea vieja.
  select l.formula_id, l.abierta_en, l.huella into v_ab_formula, v_ab_en, v_ab_huella from public._cotizacion_abierta_leer(p_abierta, p_origen) l;

  -- 4.25-1b, C1.1: una final sin vehículo, antes de mirar el lead (el mismo error que abajo con el ajuste en «sí»).
  if p_clase = 'final' and p_vehiculo is null and p_vehiculo_nuevo is null then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- El lead (comprobar, bloquear y volver a comprobar: nadie bloquea un lead que no ve).
  if p_lead is null then
    raise exception 'Elige el lead de la cotización.' using errcode = '22023', hint = 'lead';
  end if;
  if not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;
  if p_clase = 'final' then
    -- 4.25-1b, una final mira sin candado lo que mira marcar (C1): el lead en la cartera con leads.editar (P2 a) y, con un vehículo del inventario, que lo
    -- vea (antes que nada que delate su final, su vínculo o sus preventas) y, en la ayudante, otra final activa (P7 a), las preventas que no puede mandar a la
    -- papelera (P3 a) y el vínculo de otro lead (P4 a). Después toma el lead como marcar (no key update); una preventa, como siempre (key share).
    if not public.puede_actuar_lead(p_lead, 'leads.editar') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    if p_vehiculo is not null and p_vehiculo_nuevo is null then
      if not public.puede_vehiculo(p_vehiculo, 'vehiculos.ver') then
        raise exception 'No tienes acceso a este vehículo.' using errcode = '42501';
      end if;
      v_ids := array(select z.id from public.cotizaciones z where z.vehiculo_id = p_vehiculo and z.eliminado_en is null order by z.id);
      perform public._final_crear_mirar(p_vehiculo, p_lead, v_ids);
    end if;
    perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for no key update;
  else
    perform 1 from public.leads l where l.id = p_lead and l.eliminado_en is null for key share;
  end if;
  if not found or not public.puede_lead(p_lead, 'leads.ver') then
    raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
  end if;

  -- El vehículo.
  if p_vehiculo is not null and p_vehiculo_nuevo is not null then
    raise exception 'Elige un vehículo del inventario o carga uno a mano, no los dos.' using errcode = '22023', hint = 'vehiculo';
  end if;
  select coalesce((select e.vehiculo_obligatorio_al_cotizar from public.ajustes_empresa e where e.id = 1), true) into v_obligatorio;
  if p_vehiculo_nuevo is not null then
    if jsonb_typeof(p_vehiculo_nuevo) <> 'object' or (p_vehiculo_nuevo - array['id', 'datos', 'consulta']) <> '{}'::jsonb
       or coalesce(p_vehiculo_nuevo ->> 'id', '') !~ c_uuid
       or (p_vehiculo_nuevo ? 'consulta' and coalesce(p_vehiculo_nuevo ->> 'consulta', '') !~ c_uuid)
       or (p_vehiculo_nuevo ? 'datos' and jsonb_typeof(p_vehiculo_nuevo -> 'datos') <> 'object') then
      raise exception 'El vehículo a mano lleva su identificador y sus datos.' using errcode = '22023', hint = 'vehiculo';
    end if;
    v_veh := (p_vehiculo_nuevo ->> 'id')::uuid;
    -- En su propia sentencia y antes de armar: `_cotizacion_armar()` es STABLE y ve lo que esta transacción ya escribió.
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid, 'cotizar');
  elsif p_vehiculo is not null then
    perform public._cotizacion_vehiculo(p_vehiculo);
  elsif v_obligatorio then
    raise exception 'Elige el vehículo de la cotización.' using errcode = '22023', hint = 'vehiculo';
  end if;

  -- La fórmula publicada, `for share` por su id: si publicaron mientras esperábamos, READ COMMITTED descarta la fila que ya se archivó y se vuelve a leer la nueva.
  loop
    v_vuelta := v_vuelta + 1;
    select f.id into v_formula from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
    if v_formula is null then
      perform public._motor_fallar('origen_sin_formula', null, 'Este origen no tiene una fórmula publicada.');
    end if;
    perform 1 from public.formulas f where f.id = v_formula and f.estado = 'publicada' for share;
    exit when found;
    if v_vuelta >= 3 then
      raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
    end if;
  end loop;

  -- D2: la hoja se abrió sobre otra versión que la publicada. Sin «Guardar con la N», se avisa y no se guarda; con ella, se usa esa versión (publicada o archivada de este origen, y reciente).
  -- «Con la abierta» vale siempre dentro de las 24 h de la apertura (4-27): con la versión vigente sólo cambia algo si una tarifa cambió desde entonces, y la hora ya no la elige el cliente.
  v_uso := v_formula;
  if v_ab_formula is distinct from v_formula then
    select f.version into v_version from public.formulas f where f.id = v_formula;
    if not p_con_la_abierta then
      raise exception 'Se publicó la versión % de la hoja mientras cotizabas.', v_version using errcode = 'PT409', detail = 'desactualizada', hint = 'formula';
    end if;
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
    -- `for share`, como la publicada: archivada ya no cambia, pero el candado ordena esta alta con quien la borre (un origen que se elimina).
    perform 1 from public.formulas f where f.id = v_ab_formula and f.estado in ('publicada', 'archivada') for share;
    if not found then
      raise exception 'La versión de la hoja que abriste ya no está disponible: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_no_disponible', hint = 'abierta';
    end if;
    v_uso := v_ab_formula;
  elsif p_con_la_abierta then
    perform public._cotizacion_abierta(p_origen, v_ab_formula, v_ab_en);
  end if;

  select * into a from public._cotizacion_armar(p_entradas, null, p_origen, v_veh, v_uso, v_ab_en, p_con_la_abierta);
  if a.formula_id is distinct from v_uso then
    raise exception 'La fórmula cambió mientras cotizabas. Vuelve a intentarlo.' using errcode = 'PT409';
  end if;
  -- D2 (4-33): las tarifas de la apertura que ARMAR reconstruyó del historial son las que la hoja vio. Un cambio que confirmó después de abrirla con un
  -- `cambiado_en` anterior (una transacción larga) entra en la reconstrucción sin haberse visto: la huella firmada no coincide. Va en una sentencia posterior a ARMAR,
  -- con una foto igual o más nueva: lo que ARMAR vio, la huella lo ve. Con «Guardar con la N», lo que la hoja vio ya no se puede reproducir: recargar.
  if public._cotizacion_huella_tarifas(v_ab_formula, v_ab_en) is distinct from v_ab_huella then
    if p_con_la_abierta then
      raise exception 'Cambió un tipo de cambio mientras abrías la hoja: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_tarifas', hint = 'abierta';
    end if;
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;
  -- D2: algún tipo de cambio que la hoja usa cambió desde que se abrió (ARMAR lo lee en una sola foto con los de hoy).
  if a.tc_cambiado and not p_con_la_abierta then
    raise exception 'Cambió un tipo de cambio de la hoja mientras cotizabas.' using errcode = 'PT409', detail = 'desactualizada', hint = 'tipo_cambio';
  end if;

  -- El modo de cambio: la clave de uno de los modos del diseño de esa versión, convertido a la forma del motor.
  v_modo := public._cotizacion_modo(a.formula_id, p_modo_tc);
  -- «Ver total Bs»: sólo si el diseño de esa versión lo ofrece (y nunca nulo).
  perform public._cotizacion_ver_total_bs(a.formula_id, p_ver_total_bs);

  -- Lo que se ve y lo que se edita (una sola lectura de los niveles) y la revisión de lo tipeado, la misma que hace `cotizacion_evaluar()`.
  select coalesce(array_agg(n.nodo), '{}'), coalesce(jsonb_object_agg(n.nodo, true) filter (where n.editar), '{}'::jsonb)
    into v_visibles, v_editables from public._nodos_visibles(a.formula_id) n;
  v_ctx := public._cotizacion_contexto(v_visibles, a.definicion, a.visibilidad);
  perform public._cotizacion_tipeado(a.definicion, a.entrada, v_modo, v_ctx -> 'ok');

  -- Un override de un nodo que no se ve y uno de un nodo que no existe: el mismo error (el primero por id, en bytes).
  select min(k collate "C") into v_k from jsonb_object_keys(a.entrada -> 'overrides') k where not (v_ctx -> 'ok') ? k;
  if v_k is not null then
    raise exception 'La hoja no tiene un nodo «%».', v_k using errcode = '22023', detail = 'nodo_inexistente', hint = v_k;
  end if;
  -- Un valor para un nodo que se ve y no se edita.
  select min(t.k collate "C") into v_k
    from (select jsonb_object_keys(a.entrada -> 'inputs') as k
          union all select jsonb_object_keys(a.entrada -> 'banderas')
          union all select jsonb_object_keys(a.entrada -> 'overrides')) t
   where not v_editables ? t.k;
  if v_k is null and a.entrada ? 'variante' then
    select n ->> 'id' into v_opc from jsonb_array_elements(a.definicion -> 'nodos') n where n ->> 'tipo' = 'opcion' limit 1;
    if v_opc is not null and not v_editables ? v_opc then v_k := v_opc; end if;
  end if;
  if v_k is not null then
    raise exception 'No puedes cambiar «%» en esta hoja.', v_k using errcode = '42501', detail = 'nodo_no_editable', hint = v_k;
  end if;

  -- El cálculo, entero (los nodos que quien llama no ve toman el valor de la fórmula y se guardan igual).
  v_res := public.evaluar_formula(a.definicion, a.params, a.entrada, v_modo);
  -- Lo que el motor descarta de un nodo visible no se guarda en silencio; el total tiene que tener valor, caber y estar en la moneda base: `_cotizacion_guardable()`.
  v_total_base := public._cotizacion_guardable(v_res, a.entrada -> 'overrides');

  -- 4.25-1b, una final (C2.4 y C3): después del cálculo, las vivas del vehículo en una pasada por id (el orden de marcar y de la papelera de cotizaciones);
  -- con todo tomado, otra vez la cartera y la ayudante, que relee el vínculo en una sentencia nueva (otro pudo escribirlo mientras se esperaba).
  if p_clase = 'final' then
    v_tomadas := array(select z.id from public.cotizaciones z where z.vehiculo_id = v_veh and z.eliminado_en is null order by z.id for no key update);
    if not public.puede_actuar_lead(p_lead, 'leads.editar') then
      raise exception 'No encontramos este lead o no tienes acceso.' using errcode = '42501';
    end if;
    perform public._final_crear_mirar(v_veh, p_lead, v_tomadas);
  end if;

  begin
    insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs)
    values (p_id, p_origen, p_lead, v_veh, v_yo, p_clase, a.formula_id, v_res -> 'valores', coalesce(v_res -> 'fuentes', '{}'::jsonb), a.entrada -> 'tipos_cambio',
            v_res -> 'totales', v_total_base, p_modo_tc, p_ver_total_bs)
    returning * into c;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'cotizaciones_pkey' then
      raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
    elsif v_constraint = 'cotizaciones_final_por_vehiculo' then
      raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
    end if;
    raise;
  end;
  -- 4.25-1b, C4: los efectos de marcar, con todo tomado (la cotización ya es final: el paso 2 no la toca). La respuesta no cambia.
  if p_clase = 'final' then
    perform public._final_aplicar(c, v_tomadas);
  end if;

  return public._cotizacion_respuesta(c, v_ctx) || jsonb_build_object('repetido', false);
end $_$;

-- Traer de una subasta (la consulta a apibara y la búsqueda de repetidos) vale para las dos altas: el panel de la hoja lo ofrece con la de cotizar.
CREATE OR REPLACE FUNCTION "public"."apibara_contexto"("p_origen" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_int public.integraciones; v_origen public.origenes; v_plat text[]; v_config text[]; v_uso boolean;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('aplica', false, 'puede_ver_uso', false);
  end if;
  v_uso := public.tiene_permiso('empresa.ajustes.gestionar');
  select * into v_int from public.integraciones i where i.clave = 'apibara';
  select * into v_origen from public.origenes o where o.id = p_origen;
  if p_origen is null or not found or v_origen.tipo <> 'subasta' then
    return jsonb_build_object('aplica', false, 'puede_ver_uso', v_uso);
  end if;
  select coalesce(array_agg(x), '{}') into v_config from jsonb_array_elements_text(coalesce(v_int.config -> 'plataformas', '[]'::jsonb)) x;
  v_plat := case when cardinality(v_origen.apibara_plataformas) = 0 then v_config
                 else (select coalesce(array_agg(p), '{}') from unnest(v_origen.apibara_plataformas) p where p = any (v_config)) end;
  return jsonb_build_object(
    'aplica', true,
    'usuario', (select auth.uid()),
    'activa', coalesce(v_int.activa, false) and v_int.secreto_guardado_en is not null,
    'endpoint', v_int.config ->> 'endpoint',
    'plataformas', to_jsonb(v_plat),
    -- Cualquiera de las dos altas (suelta o desde cotizar) puede traer de una subasta.
    'puede_crear', public.tiene_permiso('vehiculos.crear', p_origen) or public.tiene_permiso('vehiculos.crear.desde_cotizar', p_origen),
    'puede_editar', public.tiene_permiso('vehiculos.editar', p_origen),
    'puede_ver_uso', v_uso);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."vehiculos_repetidos"("p_origen" "uuid", "p_claves" "jsonb") RETURNS TABLE("posicion" integer, "vehiculo_id" "uuid", "visible" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare k jsonb; i int := 0; v_id uuid; v_vin text; v_lote text; v_plat text;
begin
  -- Antes de un alta, suelta o desde cotizar.
  if not (public.tiene_permiso('vehiculos.crear', p_origen) or public.tiene_permiso('vehiculos.crear.desde_cotizar', p_origen)) then
    raise exception 'No tienes permiso para dar de alta en este origen.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_claves) is distinct from 'array' or jsonb_array_length(p_claves) > 100 then
    raise exception 'Las claves a revisar tienen que ser una lista de hasta 100.' using errcode = '22023';
  end if;
  for k in select * from jsonb_array_elements(p_claves) loop
    i := i + 1;
    v_id := null;
    v_vin := nullif(upper(btrim(k ->> 'vin')), '');
    v_lote := nullif(btrim(k ->> 'lote'), '');
    v_plat := nullif(lower(btrim(k ->> 'plataforma')), '');
    if v_vin is not null then
      select x.id into v_id from public.vehiculos x where x.vin = v_vin and x.eliminado_en is null limit 1;
    end if;
    if v_id is null and v_lote is not null then
      select x.id into v_id from public.vehiculos x
      where x.origen_id = p_origen and x.lote = v_lote and x.eliminado_en is null
        and (v_plat is null or x.plataforma is not distinct from v_plat) limit 1;
    end if;
    if v_id is not null then
      posicion := i;
      visible := public.puede_vehiculo(v_id, 'vehiculos.ver');
      vehiculo_id := case when visible then v_id end;
      return next;
    end if;
  end loop;
end;
$$;
