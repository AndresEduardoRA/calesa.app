-- Valor por defecto de un campo del layout. Escrito a mano.
--
-- El pedido de vehículos daba por hecho que el layout tenía valores por defecto: no existían. La
-- columna `origenes_campos.valor_defecto` (en `schemas/`) guarda lo que el formulario de alta trae
-- puesto. Sólo precarga: la base nunca lo aplica sola, y un vehículo se guarda con lo que la
-- persona dejó. No lo llevan los tipos donde un valor fijo no tiene sentido (fecha, enlace, VIN, lote).

-- El valor por defecto tal como se guarda, o un rechazo si no sirve para ese tipo y esas opciones.
-- Vacío (nulo, texto vacío, lista vacía) = sin valor por defecto.
create or replace function public._origen_valor_defecto(p_tipo public.tipo_campo, p_opciones jsonb, p_valor jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare v_claves text[];
begin
  if p_valor is null or p_valor in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then return null; end if;
  select coalesce(array_agg(o ->> 'clave'), '{}') into v_claves from jsonb_array_elements(coalesce(p_opciones, '[]'::jsonb)) o;
  case
    when p_tipo in ('texto', 'texto_largo') then
      if jsonb_typeof(p_valor) <> 'string' or char_length(p_valor #>> '{}') > 500 then
        raise exception 'El valor por defecto tiene que ser un texto de hasta 500 caracteres.' using errcode = '22023';
      end if;
    when p_tipo in ('numero', 'moneda') then
      if jsonb_typeof(p_valor) <> 'number' then
        raise exception 'El valor por defecto tiene que ser un número.' using errcode = '22023';
      end if;
    when p_tipo = 'booleano' then
      if jsonb_typeof(p_valor) <> 'boolean' then
        raise exception 'El valor por defecto tiene que ser sí o no.' using errcode = '22023';
      end if;
    when p_tipo = 'opcion' then
      if jsonb_typeof(p_valor) <> 'string' or not ((p_valor #>> '{}') = any (v_claves)) then
        raise exception 'El valor por defecto tiene que ser una de las opciones.' using errcode = '22023';
      end if;
    when p_tipo = 'multi_opcion' then
      if jsonb_typeof(p_valor) <> 'array'
         or exists (select 1 from jsonb_array_elements(p_valor) e where jsonb_typeof(e) <> 'string' or not ((e #>> '{}') = any (v_claves))) then
        raise exception 'El valor por defecto tiene que ser una lista de las opciones.' using errcode = '22023';
      end if;
    else
      raise exception 'Un campo de ese tipo no lleva valor por defecto.' using errcode = '22023';
  end case;
  return p_valor;
end;
$$;
revoke all on function public._origen_valor_defecto(public.tipo_campo, jsonb, jsonb) from public, anon, authenticated;

-- Un parámetro más cambia la firma: sin el `drop` quedarían dos sobrecargas y las llamadas por
-- nombre (PostgREST) serían ambiguas.
drop function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, text);

create or replace function public.origen_campo_crear(
  p_origen uuid, p_clave text, p_etiqueta text, p_tipo public.tipo_campo, p_opciones jsonb default '[]'::jsonb,
  p_requerido boolean default false, p_grupo text default null, p_en_tarjeta boolean default false,
  p_filtrable boolean default false, p_publico_web boolean default false, p_clave_apibara text default null,
  p_valor_defecto jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_origen public.origenes; v_etiqueta text; v_grupo text := nullif(btrim(p_grupo), '');
  v_apibara text := nullif(btrim(p_clave_apibara), ''); v_id uuid; v_version timestamptz; v_defecto jsonb;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into v_origen from public.origenes o where o.id = p_origen for update;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  if p_clave is null or p_clave !~ '^[a-z][a-z0-9_]{1,40}$' then
    raise exception 'La clave del campo usa minúsculas, números y guion bajo, y empieza con una letra.';
  end if;
  if public._origen_clave_reservada(p_clave) then
    raise exception '«%» ya es un dato común de todos los vehículos: no se crea como campo propio.', p_clave;
  end if;
  v_etiqueta := public._origen_nombre_valido(p_etiqueta, 'el nombre del campo', 60);
  perform public._origen_opciones_validas(coalesce(p_opciones, '[]'::jsonb));
  if p_tipo in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) = 0 then
    raise exception 'Un campo de opciones necesita al menos una opción.';
  end if;
  if p_tipo not in ('opcion', 'multi_opcion') and jsonb_array_length(coalesce(p_opciones, '[]'::jsonb)) > 0 then
    raise exception 'Sólo un campo de opciones lleva opciones.';
  end if;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  v_defecto := public._origen_valor_defecto(p_tipo, coalesce(p_opciones, '[]'::jsonb), p_valor_defecto);
  begin
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, opciones, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema, valor_defecto)
    values (p_origen, p_clave, v_etiqueta, p_tipo, coalesce(p_opciones, '[]'::jsonb), coalesce(p_requerido, false), v_grupo,
            coalesce((select max(c.orden) + 10 from public.origenes_campos c where c.origen_id = p_origen), 10),
            coalesce(p_en_tarjeta, false), coalesce(p_filtrable, false), coalesce(p_publico_web, false), v_apibara, false, v_defecto)
    returning id, actualizado_en into v_id, v_version;
  exception when unique_violation then
    raise exception 'Ya hay un campo con la clave «%» en este origen.', p_clave using errcode = '23505';
  end;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_version);
end;
$$;
revoke all on function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, text, jsonb) from public, anon;
grant execute on function public.origen_campo_crear(uuid, text, text, public.tipo_campo, jsonb, boolean, text, boolean, boolean, boolean, text, jsonb) to authenticated;

-- Cambia sólo las claves presentes en `p_cambios`; un valor nulo vacía la columna (grupo, clave de
-- apibara, valor por defecto). Devuelve la versión nueva del campo. Un valor por defecto que deja de
-- servir (cambió el tipo, se sacó su opción) se limpia solo; uno que viene mal en `p_cambios` se rechaza.
create or replace function public.origen_campo_guardar(p_campo uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  c public.origenes_campos; v_origen public.origenes; v_clave text; v_nueva timestamptz;
  v_editables constant text[] := array['etiqueta', 'tipo', 'opciones', 'requerido', 'grupo', 'en_tarjeta', 'filtrable', 'publico_web', 'clave_apibara', 'activo', 'valor_defecto'];
  v_tipo public.tipo_campo; v_opciones jsonb; v_grupo text; v_apibara text; v_con int; v_orden smallint; v_defecto jsonb;
begin
  perform public.assert_permiso('origenes.gestionar');
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los cambios a guardar.';
  end if;
  for v_clave in select jsonb_object_keys(p_cambios) loop
    if not (v_clave = any (v_editables)) then
      raise exception 'El dato «%» no se cambia desde el layout de campos.', v_clave;
    end if;
    if v_clave in ('etiqueta', 'tipo', 'opciones', 'requerido', 'en_tarjeta', 'filtrable', 'publico_web', 'activo') and p_cambios -> v_clave = 'null'::jsonb then
      raise exception 'El dato «%» no puede quedar vacío.', v_clave;
    end if;
  end loop;

  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  select * into v_origen from public.origenes o where o.id = c.origen_id;

  v_tipo := coalesce((p_cambios ->> 'tipo')::public.tipo_campo, c.tipo);
  if v_tipo is distinct from c.tipo then
    if c.es_sistema then
      raise exception 'El tipo de «%» no cambia: es un campo del sistema.', c.etiqueta;
    end if;
    v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
    if v_con > 0 then
      raise exception '% % ya tienen un valor en «%»: no se puede cambiar su tipo. Desactívalo y crea otro campo.',
        v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta;
    end if;
  end if;

  v_opciones := coalesce(p_cambios -> 'opciones', c.opciones);
  if v_tipo not in ('opcion', 'multi_opcion') then
    v_opciones := '[]'::jsonb;
  else
    perform public._origen_opciones_validas(v_opciones);
  end if;

  if p_cambios ? 'valor_defecto' then
    v_defecto := public._origen_valor_defecto(v_tipo, v_opciones, p_cambios -> 'valor_defecto');
  elsif v_tipo is distinct from c.tipo then
    v_defecto := null;
  else
    begin
      v_defecto := public._origen_valor_defecto(v_tipo, v_opciones, c.valor_defecto);
    exception when invalid_parameter_value then
      v_defecto := null;
    end;
  end if;

  v_grupo := case when p_cambios ? 'grupo' then nullif(btrim(p_cambios ->> 'grupo'), '') else c.grupo end;
  if v_grupo is not null and length(v_grupo) > 40 then raise exception 'El nombre del grupo no puede pasar de 40 caracteres.'; end if;
  v_apibara := case when p_cambios ? 'clave_apibara' then nullif(btrim(p_cambios ->> 'clave_apibara'), '') else c.clave_apibara end;
  if v_apibara is not null and v_origen.tipo <> 'subasta' then
    raise exception 'La clave de apibara sólo se usa en orígenes de subasta.';
  end if;

  -- Cambiar de grupo lo manda al final del grupo nuevo.
  v_orden := c.orden;
  if v_grupo is distinct from c.grupo then
    select max(x.orden) + 1 into v_orden from public.origenes_campos x
    where x.origen_id = c.origen_id and x.id <> c.id and x.grupo is not distinct from v_grupo;
    v_orden := coalesce(v_orden, (select coalesce(max(x.orden), 0) + 10 from public.origenes_campos x where x.origen_id = c.origen_id));
  end if;

  update public.origenes_campos x set
    etiqueta = case when p_cambios ? 'etiqueta' then public._origen_nombre_valido(p_cambios ->> 'etiqueta', 'el nombre del campo', 60) else x.etiqueta end,
    tipo = v_tipo,
    opciones = v_opciones,
    requerido = coalesce((p_cambios ->> 'requerido')::boolean, x.requerido),
    grupo = v_grupo,
    en_tarjeta = coalesce((p_cambios ->> 'en_tarjeta')::boolean, x.en_tarjeta),
    filtrable = coalesce((p_cambios ->> 'filtrable')::boolean, x.filtrable),
    publico_web = coalesce((p_cambios ->> 'publico_web')::boolean, x.publico_web),
    clave_apibara = v_apibara,
    activo = coalesce((p_cambios ->> 'activo')::boolean, x.activo),
    valor_defecto = v_defecto,
    orden = v_orden
  where x.id = p_campo
  returning x.actualizado_en into v_nueva;
  if v_orden is distinct from c.orden then
    perform public._origen_campos_renumerar(c.origen_id);
  end if;
  return v_nueva;
end;
$$;
revoke all on function public.origen_campo_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.origen_campo_guardar(uuid, timestamptz, jsonb) to authenticated;
