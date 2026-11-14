-- Editar las fechas de la subasta (A4b, `docs/TANDA.md`): `subasta_en` y `subasta_fin_en` entran a la lista cerrada de `vehiculo_guardar`,
-- sólo en un origen de subasta. Llegan como instante con su zona (el navegador convierte la hora que escribió la persona, en su zona, a
-- UTC): un texto sin zona se rechaza, para que la hora nunca dependa de la del servidor. Refrescar desde apibara sigue mandando.

create function public._vehiculo_instante(p_datos jsonb, p_clave text, p_nombre text) returns timestamptz
  language plpgsql stable
  set search_path = ''
  as $$
declare v_texto text;
begin
  if p_datos -> p_clave = 'null'::jsonb then
    return null;
  end if;
  if jsonb_typeof(p_datos -> p_clave) <> 'string' then
    raise exception '% tiene que ser una fecha con hora.', p_nombre using errcode = '22023', hint = p_clave;
  end if;
  v_texto := btrim(p_datos ->> p_clave);
  if v_texto !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$' then
    raise exception '% tiene que ser una fecha con hora y su zona.', p_nombre using errcode = '22023', hint = p_clave;
  end if;
  begin
    return v_texto::timestamptz;
  exception when others then
    raise exception '% no es una fecha válida.', p_nombre using errcode = '22023', hint = p_clave;
  end;
end;
$$;

comment on function public._vehiculo_instante(jsonb, text, text) is 'Un instante de los datos de un vehículo (`subasta_en`, `subasta_fin_en`): ISO con su zona, o null para borrarlo. Lo usa vehiculo_guardar.';
revoke all on function public._vehiculo_instante(jsonb, text, text) from public, anon, authenticated;
grant execute on function public._vehiculo_instante(jsonb, text, text) to service_role;

CREATE OR REPLACE FUNCTION "public"."vehiculo_guardar"("p_vehiculo" "uuid", "p_actualizado_en_esperado" timestamp with time zone, "p_datos" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v public.vehiculos; n public.vehiculos; v_es_subasta boolean;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  -- `puede_vehiculo()` y no la condición escrita acá: con `lead_id` nulo, `lead_id in (…)` da nulo,
  -- y un `if` con nulo no levanta (dejaba editar lo ajeno a quien tuviera algún lead en su cartera).
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;

  -- Las fechas de la subasta (A4b) se escriben acá y no en `_vehiculo_aplicar`: el alta no las recibe (las trae apibara al consultar).
  n := public._vehiculo_aplicar(v, case when jsonb_typeof(p_datos) = 'object' then p_datos - 'subasta_en' - 'subasta_fin_en' else p_datos end);
  if p_datos ? 'subasta_en' or p_datos ? 'subasta_fin_en' then
    select o.tipo = 'subasta' into v_es_subasta from public.origenes o where o.id = v.origen_id;
    if not coalesce(v_es_subasta, false) then
      raise exception 'Las fechas de subasta sólo existen en un origen de subasta.' using errcode = '22023', hint = 'subasta_en';
    end if;
    if p_datos ? 'subasta_en' then n.subasta_en := public._vehiculo_instante(p_datos, 'subasta_en', 'La fecha de la subasta'); end if;
    if p_datos ? 'subasta_fin_en' then n.subasta_fin_en := public._vehiculo_instante(p_datos, 'subasta_fin_en', 'El cierre de la subasta'); end if;
    if n.subasta_en is not null and n.subasta_fin_en is not null and n.subasta_fin_en < n.subasta_en then
      raise exception 'El cierre de la subasta no puede ser antes de su inicio.' using errcode = '22023', hint = 'subasta_fin_en';
    end if;
  end if;
  -- Guardar lo que ya está guardado no es un conflicto: un reintento tras perder la respuesta no
  -- choca consigo mismo, y quien no cambió nada no pisa a nadie.
  if to_jsonb(n) = to_jsonb(v) then
    return jsonb_build_object('actualizado_en', v.actualizado_en);
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  perform public._vehiculo_sin_repetidos(n);

  begin
    update public.vehiculos x set
      categoria_id = n.categoria_id, titulo = n.titulo, marca = n.marca, modelo = n.modelo, anio = n.anio, vin = n.vin,
      lote = n.lote, plataforma = n.plataforma, url_origen = n.url_origen, precio = n.precio,
      precio_negociable = n.precio_negociable, acepta_permuta = n.acepta_permuta, placado = n.placado,
      kilometraje = n.kilometraje, atributos = n.atributos, subasta_en = n.subasta_en, subasta_fin_en = n.subasta_fin_en
    where x.id = v.id
    returning * into n;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;
  return jsonb_build_object('actualizado_en', n.actualizado_en);
end;
$$;
;
