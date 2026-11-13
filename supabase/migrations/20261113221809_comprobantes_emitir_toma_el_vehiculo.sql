-- Emitir un comprobante toma el vehículo de la cotización `for key share` antes que la cotización (el orden lead → vehículo → cotización,
-- docs/DECISIONES.md): mandar el vehículo a la papelera lo toma `for update` y mira sus comprobantes antes de llevarse sus cotizaciones, así que ve el
-- comprobante que se acaba de emitir. Su carrera: supabase/tests/areas/comprobantes/carreras-papelera.mjs (K8).

CREATE OR REPLACE FUNCTION "public"."comprobante_emitir"("p_cotizacion" "uuid", "p_cotizacion_esperada" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  c public.cotizaciones; v_def jsonb; v_vis jsonb; v_ctx jsonb; v_rec jsonb; v_datos jsonb; v_serie text; v_numero bigint; v_id uuid; v_emitido timestamptz;
  v_vigente text; v_restriccion text; v_vehiculo uuid;
begin
  -- 1. La clave.
  perform public.assert_activo();
  perform public.assert_permiso('cotizaciones.comprobantes.emitir');
  -- 2. Sin candado: lo que no existe, está en la papelera o no se ve da lo mismo, antes de tomar nada.
  perform 1 from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null;
  if not found or not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- 3. El orden de candados (lead → vehículo → cotización): su vehículo, leído sin candado, `for key share` antes que la fila. Mandarlo a la papelera lo
  -- toma `for update`, mira sus comprobantes y se lleva sus cotizaciones: sin este candado no ve el comprobante sin confirmar, espera la fila y, al
  -- confirmar esta emisión, se la lleva a la papelera con su comprobante.
  select x.vehiculo_id into v_vehiculo from public.cotizaciones x where x.id = p_cotizacion;
  if v_vehiculo is not null then
    perform 1 from public.vehiculos v where v.id = v_vehiculo for key share;
  end if;
  -- La fila viva, tomada (como `_cotizacion_a_papelera` y marcar final: no choca con las hijas que la referencian).
  select * into c from public.cotizaciones x where x.id = p_cotizacion and x.eliminado_en is null for no key update;
  if not found or not public.puede_cotizacion(c.id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- Si su vehículo cambió mientras se esperaba, el candado tomado es de otro.
  if c.vehiculo_id is distinct from v_vehiculo then
    raise exception 'La cotización cambió mientras emitías. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  -- 4. Sobre la fila tomada: final activa.
  if c.clase <> 'final' or c.estado <> 'activa' then
    raise exception 'Sólo se emite comprobante de una cotización final activa.' using errcode = '23514';
  end if;
  -- 5. Lo que se congela es lo que quien emite tenía en pantalla.
  if p_cotizacion_esperada is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' using errcode = '22023';
  end if;
  if c.actualizado_en is distinct from p_cotizacion_esperada then
    perform public._conflicto_de_edicion('cotizaciones', c.id, c.actualizado_en, 'esta cotización');
  end if;
  -- 6. Un vigente por cotización (P2 a).
  select cp.serie || '-' || cp.numero into v_vigente from public.comprobantes cp where cp.cotizacion_id = c.id and cp.anulado_en is null;
  if v_vigente is not null then
    raise exception 'Esta cotización ya tiene el comprobante «%» vigente: anúlalo para emitir otro.', v_vigente using errcode = 'PT409';
  end if;
  -- 7. `datos`, antes de tomar la serie: sólo lo del nivel «todos» (el recorte de quien sólo tiene cotizaciones.ver), y del cliente y el vehículo, los ids.
  select f.definicion, coalesce(f.visibilidad, '{}'::jsonb) into v_def, v_vis from public.formulas f where f.id = c.formula_id;
  v_ctx := public._cotizacion_contexto(coalesce(array(select e.key from jsonb_each(v_vis) e where e.value ->> 'ver' = 'todos'), '{}'), v_def, v_vis);
  v_rec := public._cotizacion_recorte(jsonb_build_object('valores', c.valores, 'fuentes', c.fuentes, 'totales', c.totales, 'tipos_cambio', c.tipos_cambio), v_ctx);
  v_datos := jsonb_build_object(
    'version', 1,
    'cotizacion', jsonb_build_object('id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'clase', c.clase),
    'origen', (select jsonb_build_object('id', o.id, 'nombre', o.nombre) from public.origenes o where o.id = c.origen_id),
    'formula_id', c.formula_id,
    'cliente', jsonb_build_object('lead_id', c.lead_id),
    'vehiculo', case when c.vehiculo_id is null then null else jsonb_build_object('id', c.vehiculo_id) end,
    'empresa', (select jsonb_build_object('razon_social', e.razon_social, 'nit', e.nit) from public.ajustes_empresa e where e.id = 1),
    'valores', coalesce(v_rec -> 'valores', '{}'::jsonb),
    'totales', coalesce(v_rec -> 'totales', '{}'::jsonb),
    'tipos_cambio', coalesce(v_rec -> 'tipos_cambio', '{}'::jsonb),
    'etiquetas', coalesce((select jsonb_object_agg(n ->> 'id', n ->> 'etiqueta') from jsonb_array_elements(coalesce(v_def -> 'nodos', '[]'::jsonb)) n
                            where coalesce(v_rec -> 'valores', '{}'::jsonb) ? (n ->> 'id')), '{}'::jsonb));
  -- 8. La serie vigente, tomada (ordena contra comprobantes_serie_cambiar).
  select a.serie into v_serie from public.comprobantes_ajustes a where a.unica for update;
  if v_serie is null then
    raise exception 'No hay una serie vigente de comprobantes.' using errcode = 'P0001';
  end if;
  -- 9. El número y el comprobante en un solo bloque: si sale un error, la subtransacción ya devolvió el número aunque quien llama lo atrape.
  begin
    update public.comprobantes_contadores k set ultimo = k.ultimo + 1 where k.serie = v_serie returning k.ultimo into v_numero;
    if not found then
      raise exception 'No hay contador para la serie vigente.' using errcode = 'P0001';
    end if;
    insert into public.comprobantes (cotizacion_id, serie, numero, datos, emitido_por)
    values (c.id, v_serie, v_numero, v_datos, (select auth.uid()))
    returning id, emitido_en into v_id, v_emitido;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    if v_restriccion = 'comprobantes_un_vigente_por_cotizacion' then
      raise exception 'Esta cotización ya tiene un comprobante vigente: anúlalo para emitir otro.' using errcode = 'PT409';
    end if;
    raise;
  end;
  -- 10. La actividad y la respuesta.
  perform public.registrar_actividad('comprobante.emitido', 'comprobantes', v_id::text, null, jsonb_build_object('serie', v_serie, 'numero', v_numero));
  return jsonb_build_object('id', v_id, 'serie', v_serie, 'numero', v_numero, 'emitido_en', v_emitido);
end;
$$;


COMMENT ON FUNCTION "public"."comprobante_emitir"("p_cotizacion" "uuid", "p_cotizacion_esperada" timestamp with time zone) IS 'Emite el comprobante de una cotización final activa en la serie vigente (4.26-1): cotizaciones.comprobantes.emitir; ver la cotización antes y con la fila tomada (si no, el 42501 de lo inexistente); la versión que se tenía en pantalla (nula 22023, distinta PT409); un vigente por cotización (PT409). datos = el recorte del nivel «todos» con sus etiquetas, la cotización, el origen, los ids del cliente y del vehículo, y la razón social y el NIT. Candados: su vehículo (for key share, contra mandarlo a la papelera) → cotización → comprobantes_ajustes → contador; sin huecos. Devuelve {id, serie, numero, emitido_en}.';

REVOKE ALL ON FUNCTION "public"."comprobante_emitir"("p_cotizacion" "uuid", "p_cotizacion_esperada" timestamp with time zone) FROM PUBLIC, "anon";
GRANT ALL ON FUNCTION "public"."comprobante_emitir"("p_cotizacion" "uuid", "p_cotizacion_esperada" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."comprobante_emitir"("p_cotizacion" "uuid", "p_cotizacion_esperada" timestamp with time zone) TO "service_role";
