-- Pagos del cliente de un proyecto de repuestos: registrar por RPC (paso 8.13-5, C1–C5).
--   `pago_registrar()` es sólo de vehículo (6.10-1, D9); ésta es su gemela para el proyecto (D1): no cambia la firma que usa Logística.
--   Pide `repuestos.costos.editar` y `repuestos.ver`, como las compras. Sin lead (D2) y sin la regla de flujo `pagos` (D3).
--   El proyecto, vivo, se toma `for share` (el `for update` de eliminarlo o cerrarlo espera); sólo crear lo exige abierto (D5).
--   Idempotente por id: un reintento devuelve lo guardado aunque el proyecto se haya cerrado después. El monto en base lo calcula la base.
--   Corregir, eliminar y confirmar ya sirven al proyecto (`_pago_exigir_edicion`, `pago_confirmar`); anular no (abierto 8-13d).

create function public.pago_registrar_proyecto(p_id uuid, p_proyecto uuid, p_concepto text, p_moneda text, p_monto numeric,
  p_tipo_cambio uuid, p_metodo text, p_fecha date, p_comprobante_ruta text, p_notas text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare p public.pagos; v_proyecto public.repuestos_proyectos; c record;
begin
  perform public.assert_activo();
  perform public.assert_permiso('repuestos.costos.editar');
  perform public.assert_permiso('repuestos.ver');
  if p_id is null then
    raise exception 'Falta el id del pago.' using errcode = '23502', hint = 'id';
  end if;
  if p_proyecto is null then
    raise exception 'Elige el proyecto del pago.' using errcode = '23502', hint = 'proyecto';
  end if;
  select * into v_proyecto from public.repuestos_proyectos x where x.id = p_proyecto for share;
  if not found or v_proyecto.eliminado_en is not null then
    raise exception 'Este proyecto ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  select * into p from public.pagos x where x.id = p_id;
  if not found then
    if v_proyecto.cerrado_en is not null then
      raise exception 'El proyecto está cerrado: reábrelo para registrar pagos.' using errcode = '23514', hint = 'proyecto';
    end if;
    -- 'NaN' > 0 es verdadero en PG y numeric(18,2) lo guarda: se corta antes de validar.
    if p_monto = 'NaN'::numeric then
      raise exception 'El monto de un pago es mayor que cero.' using errcode = '22023', hint = 'monto';
    end if;
    perform public._pago_validar(p_proyecto, p_concepto, p_metodo, p_monto, p_comprobante_ruta);
    -- Los decimales se miran antes de insertar: la columna numeric(18,2) redondearía en silencio.
    if p_monto <> round(p_monto, 2) then
      raise exception 'El monto lleva como mucho dos decimales.' using errcode = '22023', hint = 'monto';
    end if;
    c := public._monto_en_base(p_moneda, p_tipo_cambio, p_monto);
    insert into public.pagos (id, proyecto_repuestos_id, concepto, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, metodo, fecha,
                              comprobante_ruta, notas)
    values (p_id, p_proyecto, regexp_replace(btrim(p_concepto), '\s+', ' ', 'g'), p_moneda, p_monto, c.tipo_cambio_id, c.tipo_cambio_aplicado,
            c.monto_base, nullif(btrim(p_metodo), ''), coalesce(p_fecha, current_date), p_comprobante_ruta, nullif(btrim(p_notas), ''))
    on conflict (id) do nothing
    returning * into p;
    if found then
      return public._pago_respuesta(p, '{"ya_existia": false}');
    end if;
    select * into p from public.pagos x where x.id = p_id;
  end if;
  if p.proyecto_repuestos_id is distinct from p_proyecto then
    raise exception 'Ese id ya es de otro pago.' using errcode = '23505', hint = 'id';
  end if;
  if p.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  return public._pago_respuesta(p, '{"ya_existia": true}');
end;
$$;

comment on function public.pago_registrar_proyecto(uuid, uuid, text, text, numeric, uuid, text, date, text, text) is
  'Registra un pago del cliente de un proyecto de repuestos (8.13-5). repuestos.costos.editar + repuestos.ver; proyecto vivo y abierto; idempotente por id.';

revoke all on function public.pago_registrar_proyecto(uuid, uuid, text, text, numeric, uuid, text, date, text, text) from public, anon;
grant execute on function public.pago_registrar_proyecto(uuid, uuid, text, text, numeric, uuid, text, date, text, text) to authenticated, service_role;

update public.permisos
   set aplicado_en = 'repuesto_compra_guardar, repuesto_compra_eliminar, repuesto_compra_restaurar, pago_registrar_proyecto, comprobante_puede'
 where clave = 'repuestos.costos.editar';
