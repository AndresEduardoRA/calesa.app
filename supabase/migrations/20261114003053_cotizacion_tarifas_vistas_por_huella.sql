-- La hoja abierta lleva la huella de las tarifas que vio (4-33): `abierta` pasa a ser `<fórmula>.<µs>.<huella>.<firma>`, y la firma cubre también la
-- huella. `cotizacion_crear` reconstruye del historial las tarifas de la apertura y, si su huella no es la firmada, la hoja no las vio: un cambio que
-- confirmó después de abrirla con un `cambiado_en` anterior (`now()` es la hora del comienzo de su transacción). Sin «Guardar con la N», PT409
-- `desactualizada` (`tipo_cambio`); con ella, 22023 `abierta_tarifas` (`hint abierta`: la hoja pide recargar). Una hoja abierta con el formato de antes
-- es `abierta_invalida` y se abre de nuevo.
-- Prueba: supabase/tests/areas/cotizaciones/tarifa-vista.sql.

-- La huella: `md5` de las tarifas que la fórmula nombra (activas o no) con el valor que tenían a esa hora según el historial; una sin valor a esa hora
-- (nació después) no entra. La calcula igual quien firma y quien compara.
create or replace function public._cotizacion_huella_tarifas(p_formula uuid, p_cuando timestamptz) returns text
    language sql stable
    set search_path to ''
    as $$
  select md5(coalesce(jsonb_object_agg(x.clave, x.entonces) filter (where x.entonces is not null), '{}'::jsonb)::text)
    from (select t.clave,
                 (select h.valor_nuevo from public.tipos_cambio_historial h                                 -- tipos_cambio_historial_tipo_idx
                   where h.tipo_cambio_id = t.id and h.cambiado_en <= p_cuando order by h.cambiado_en desc, h.id desc limit 1) as entonces
            from public.tipos_cambio t                                                                    -- tipos_cambio_clave_key
           where t.clave in (select n ->> 'clave' from public.formulas f, jsonb_array_elements(f.definicion -> 'nodos') n
                              where f.id = p_formula and n ->> 'tipo' = 'tipo_cambio')) x;                   -- formulas_pkey
$$;

comment on function public._cotizacion_huella_tarifas(uuid, timestamptz) is 'La huella de las tarifas de una hoja abierta: md5 de los tipos de cambio que nombra esa versión de la fórmula (activos o no) con su valor a p_cuando según tipos_cambio_historial; uno sin valor a esa hora no entra. Invoker y de nadie; la llaman _cotizacion_abierta_firmar y cotizacion_crear. docs/COTIZADOR.md › «La hoja abierta».';

revoke all on function public._cotizacion_huella_tarifas(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._cotizacion_huella_tarifas(uuid, timestamptz) to service_role;

create or replace function public._cotizacion_abierta_firmar(p_origen uuid, p_formula uuid, p_cuando timestamptz) returns text
    language plpgsql stable security definer
    set search_path to ''
    as $$
declare
  v_uid uuid := (select auth.uid());
  v_clave text; v_us bigint; v_huella text;
begin
  if v_uid is null or p_origen is null or p_formula is null or p_cuando is null then
    raise exception 'No se puede firmar la hoja abierta sin persona, origen, versión y hora.' using errcode = '42501';
  end if;
  select s.decrypted_secret into v_clave from vault.decrypted_secrets s where s.name = 'cotizacion:abierta';
  if v_clave is null then
    raise exception 'Falta la clave que firma la hoja abierta: avisa a quien administra el sistema.' using errcode = 'XX000';
  end if;
  v_us := round(extract(epoch from p_cuando) * 1000000)::bigint;
  -- Las tarifas que ve esta lectura a la hora de la apertura: lo que `cotizacion_evaluar` le mostrará a la hoja con esta abierta.
  v_huella := public._cotizacion_huella_tarifas(p_formula, p_cuando);
  return p_formula::text || '.' || v_us::text || '.' || v_huella || '.'
         || encode(extensions.hmac(convert_to(format('cotizacion_abierta|%s|%s|%s|%s|%s', v_uid, p_origen, p_formula, v_us, v_huella), 'UTF8'), decode(v_clave, 'hex'), 'sha256'), 'hex');
end $$;

comment on function public._cotizacion_abierta_firmar(uuid, uuid, timestamptz) is 'Firma (HMAC con la clave de Vault cotizacion:abierta) la hoja abierta de quien llama: fórmula, origen, hora y la huella de las tarifas que ve (_cotizacion_huella_tarifas). De nadie; la llama cotizacion_hoja. docs/COTIZADOR.md › «La hoja abierta».';

-- Devuelve una columna más (la huella): se borra y se crea.
drop function public._cotizacion_abierta_leer(text, uuid);

create function public._cotizacion_abierta_leer(p_abierta text, p_origen uuid) returns table (formula_id uuid, abierta_en timestamptz, huella text)
    language plpgsql stable security definer
    set search_path to ''
    as $_$
declare
  c_forma constant text := '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([0-9]{1,16})\.([0-9a-f]{32})\.([0-9a-f]{64})$';
  v_uid uuid := (select auth.uid());
  v_partes text[]; v_clave text; v_firma text;
begin
  if p_abierta is null then
    raise exception 'Falta la hoja que abriste: ábrela de nuevo.' using errcode = '22023', hint = 'abierta';
  end if;
  v_partes := regexp_match(p_abierta, c_forma);
  select s.decrypted_secret into v_clave from vault.decrypted_secrets s where s.name = 'cotizacion:abierta';
  if v_partes is null or v_uid is null or p_origen is null or v_clave is null then
    raise exception 'La hoja que abriste ya no es válida: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_invalida', hint = 'abierta';
  end if;
  v_firma := encode(extensions.hmac(convert_to(format('cotizacion_abierta|%s|%s|%s|%s|%s', v_uid, p_origen, v_partes[1], v_partes[2]::bigint, v_partes[3]), 'UTF8'),
                                    decode(v_clave, 'hex'), 'sha256'), 'hex');
  if v_firma <> v_partes[4] then
    raise exception 'La hoja que abriste ya no es válida: ábrela de nuevo.' using errcode = '22023', detail = 'abierta_invalida', hint = 'abierta';
  end if;
  return query select v_partes[1]::uuid, 'epoch'::timestamptz + v_partes[2]::bigint * interval '1 microsecond', v_partes[3];
end $_$;

comment on function public._cotizacion_abierta_leer(text, uuid) is 'Verifica la hoja abierta de quien llama en ese origen y devuelve la versión de la fórmula, la hora de la apertura y la huella de las tarifas que vio; 22023 abierta_invalida si no es la que firmó la base. De nadie; la llaman cotizacion_crear, cotizacion_evaluar y _cotizacion_tabla_version. docs/COTIZADOR.md › «La hoja abierta».';

revoke all on function public._cotizacion_abierta_leer(text, uuid) from public, anon, authenticated;
grant execute on function public._cotizacion_abierta_leer(text, uuid) to service_role;

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
    perform public.vehiculo_crear(v_veh, p_origen, coalesce(p_vehiculo_nuevo -> 'datos', '{}'::jsonb), (p_vehiculo_nuevo ->> 'consulta')::uuid);
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

COMMENT ON FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid", "p_vehiculo_nuevo" "jsonb", "p_modo_tc" "text", "p_clase" "public"."clase_cotizacion", "p_con_la_abierta" boolean, "p_ver_total_bs" boolean) IS 'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen, o sobre la abierta con p_con_la_abierta) y devuelve lo que quien llama ve (_cotizacion_respuesta). Pide cotizaciones.crear y cotizaciones.ver. Idempotente por el id del intento. D2: PT409 desactualizada si la hoja que se abrió (p_abierta, la de cotizacion_hoja) ya no es la vigente o si las tarifas de la apertura que reconstruye del historial no son las que vio (su huella, _cotizacion_huella_tarifas; con p_con_la_abierta, 22023 abierta_tarifas). «Ver total Bs» (p_ver_total_bs, falso por omisión) sólo vale si el diseño de la versión que se usa lo ofrece (_cotizacion_ver_total_bs). Una final (4.25-1b) deja el estado de marcarla: mira sin candado (el lead en la cartera con leads.editar, ver el vehículo y, en _final_crear_mirar, otra final activa, las preventas que no puede mandar a la papelera y el vínculo de otro lead), toma lead (no key update) → vehículo → fórmula → las vivas del vehículo, vuelve a mirar y aplica _final_aplicar. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)», «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';
