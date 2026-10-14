-- «Campo de fábrica» en lugar de «campo del sistema». Escrito a mano.
--
-- Un campo que nació con la preconfiguración (de un origen o de los leads) se llama «de fábrica»: se
-- edita, se apaga y se renombra, pero no se elimina ni cambia de tipo ni de clave. «Sistema» ya
-- nombra otra cosa (el rol dueño). Sólo cambia el texto de dos mensajes; las funciones son las mismas.

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
      raise exception 'El tipo de «%» no cambia: es un campo de fábrica.', c.etiqueta;
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

create or replace function public.origen_campo_eliminar(p_campo uuid, p_actualizado_en_esperado timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.origenes_campos; v_con int;
begin
  perform public.assert_permiso('origenes.gestionar');
  select * into c from public.origenes_campos x where x.id = p_campo for update;
  if not found then raise exception 'Ese campo ya no existe.' using errcode = 'PT409'; end if;
  perform public._exigir_version(c.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este campo mientras lo editabas.');
  if c.es_sistema then
    raise exception '«%» es un campo de fábrica: no se elimina. Puedes desactivarlo.', c.etiqueta using errcode = '23503';
  end if;
  v_con := public._origen_vehiculos_con_valor(c.origen_id, c.clave);
  if v_con > 0 then
    raise exception '% % tienen un valor en «%». Desactívalo para conservarlo.',
      v_con, case when v_con = 1 then 'vehículo' else 'vehículos' end, c.etiqueta using errcode = '23503';
  end if;
  delete from public.origenes_campos where id = p_campo;
end;
$$;
revoke all on function public.origen_campo_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.origen_campo_eliminar(uuid, timestamptz) to authenticated;
