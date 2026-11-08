-- Crear una cotización final con `cotizacion_crear` deja el estado de marcarla (paso 4.25-1b; cierra 4-17; P6 y P7 a de la persona, 2026-11-07).
--
-- Antes, `cotizacion_crear(…, p_clase := 'final')` exigía `cotizaciones.final.gestionar`, un vehículo y el índice de una final activa por vehículo, pero no
-- vinculaba el vehículo al lead, no mandaba las preventas del vehículo a la papelera ni pasaba el lead a la clase cliente (4-17). Ahora, sólo con una final:
--   C1. Mira sin candado lo que mira marcar: la final sin vehículo (22023, adelantado), el lead en la cartera con `leads.editar` (P2 a), que vea el vehículo
--       y, en `_final_crear_mirar`, otra final activa (23505, P7 a: se rechaza como antes, ahora antes del cálculo), las preventas que no puede mandar a la
--       papelera (42501, P3 a) y el vínculo de otro lead (23514, P4 a).
--   C2. Toma en el orden de marcar, con el de crear en el medio: el lead `for no key update`, el vehículo (`_cotizacion_vehiculo`, `for key share`), la
--       fórmula `for share` y, después del cálculo, las vivas del vehículo en una pasada por id. No hay vuelta `PF425`: lo que crear toma son sus parámetros.
--   C3. Con todo tomado vuelve a mirar la cartera y la ayudante (el vínculo, en una sentencia nueva).
--   C4. Inserta como siempre (una final confirmada después de la pasada choca con el índice: el 23505 de siempre) y aplica `_final_aplicar` del 4.25-1.
-- La preventa no cambia. Pruebas: `supabase/tests/areas/final/crear.sql`, `crear-candados.sql`, `carreras-crear.mjs` y `carreras-crear-candados.mjs`.

create function public._final_crear_mirar(p_vehiculo uuid, p_lead uuid, p_ids uuid[]) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare v_hay_final boolean; v_no_puede boolean; v_lead uuid;
begin
  -- P7 a: otra final activa entre las vivas del vehículo (el predicado del índice `cotizaciones_final_por_vehiculo`).
  v_hay_final := exists (select 1 from public.cotizaciones z
                          where z.id = any (p_ids) and z.clase = 'final' and z.estado = 'activa' and z.eliminado_en is null);
  if v_hay_final then
    raise exception 'Este vehículo ya tiene una cotización final activa.' using errcode = '23505', hint = 'vehiculo';
  end if;
  -- P3 a: lo que pide `_cotizacion_a_papelera` para quien crea, sobre cada viva del vehículo (la regla de marcar).
  v_no_puede := exists (select 1 from public.cotizaciones z
                         where z.id = any (p_ids) and z.eliminado_en is null
                           and not (public.puede_cotizacion(z.id, 'cotizaciones.ver')
                                    and case when z.clase = 'final' then public.tiene_permiso('cotizaciones.final.gestionar', z.origen_id)
                                             else public.puede_cotizacion(z.id, 'cotizaciones.editar') or public.tiene_permiso('cotizaciones.moderar') end));
  if v_no_puede then
    raise exception 'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.' using errcode = '42501';
  end if;
  -- P4 a: el vínculo, leído en esta sentencia.
  select v.lead_id into v_lead from public.vehiculos v where v.id = p_vehiculo;
  if v_lead is not null and v_lead <> p_lead then
    raise exception 'Este vehículo está vinculado a otro lead. Desvincúlalo antes de crear la final.' using errcode = '23514', hint = 'vehiculo';
  end if;
end;
$$;

comment on function public._final_crear_mirar(uuid, uuid, uuid[]) is 'Lo que crear una final mira sobre su vehículo (4.25-1b), sin tomar candados: otra final activa entre p_ids (23505, P7 a), una viva de p_ids que quien llama no puede mandar a la papelera (42501, P3 a) y el vehículo de otro lead (23514, P4 a). De nadie: la llama cotizacion_crear antes del primer candado y con todo tomado.';
revoke all on function public._final_crear_mirar(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public._final_crear_mirar(uuid, uuid, uuid[]) to service_role;

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
  v_ab_formula uuid; v_ab_en timestamptz;
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

  -- La hoja abierta: su firma, su versión y su hora. Después del intento: un reintento vuelve lo guardado aunque la clave haya rotado o la hoja sea vieja.
  select l.formula_id, l.abierta_en into v_ab_formula, v_ab_en from public._cotizacion_abierta_leer(p_abierta, p_origen) l;

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

COMMENT ON FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid", "p_vehiculo_nuevo" "jsonb", "p_modo_tc" "text", "p_clase" "public"."clase_cotizacion", "p_con_la_abierta" boolean, "p_ver_total_bs" boolean) IS 'Crea una cotización calculada en la base (evaluar_formula sobre la fórmula publicada del origen, o sobre la abierta con p_con_la_abierta) y devuelve lo que quien llama ve (_cotizacion_respuesta). Pide cotizaciones.crear y cotizaciones.ver. Idempotente por el id del intento. D2: PT409 desactualizada si la hoja que se abrió (p_abierta, la de cotizacion_hoja) ya no es la vigente. «Ver total Bs» (p_ver_total_bs, falso por omisión) sólo vale si el diseño de la versión que se usa lo ofrece (_cotizacion_ver_total_bs). Una final (4.25-1b) deja el estado de marcarla: mira sin candado (el lead en la cartera con leads.editar, ver el vehículo y, en _final_crear_mirar, otra final activa, las preventas que no puede mandar a la papelera y el vínculo de otro lead), toma lead (no key update) → vehículo → fórmula → las vivas del vehículo, vuelve a mirar y aplica _final_aplicar. docs/COTIZADOR.md › «Quién escribe una cotización y cómo (4.10-2)», «Cómo se guarda (4.10-3)» y «La hoja abierta (4.13-3a)».';
-- `create or replace` conserva los privilegios; se repiten explícitos (redundante a propósito).
REVOKE ALL ON FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid", "p_vehiculo_nuevo" "jsonb", "p_modo_tc" "text", "p_clase" "public"."clase_cotizacion", "p_con_la_abierta" boolean, "p_ver_total_bs" boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION "public"."cotizacion_crear"("p_id" "uuid", "p_origen" "uuid", "p_lead" "uuid", "p_entradas" "jsonb", "p_abierta" "text", "p_vehiculo" "uuid", "p_vehiculo_nuevo" "jsonb", "p_modo_tc" "text", "p_clase" "public"."clase_cotizacion", "p_con_la_abierta" boolean, "p_ver_total_bs" boolean) TO authenticated, service_role;
