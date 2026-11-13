-- Un pago confirmado de un proyecto de repuestos se anula con `pago_anular`, como el de un vehículo: la misma clave (`logistica.pagos.confirmar`), ver el
-- pago (`repuestos.costos.ver`), motivo, versión y constancia. La guarda de fase es la del proyecto: `proyecto.pago_cliente` se cumple con cualquier pago vivo,
-- así que no se anula el último vivo mientras un ítem vivo del proyecto esté en una fase que lo pide (23514).

create or replace function public.pago_anular(p_id uuid, p_actualizado_en_esperado timestamp with time zone, p_motivo text) returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare o public.pagos; v_motivo text := btrim(coalesce(p_motivo, '')); v_antes jsonb; v_despues jsonb; v_fase text;
begin
  perform public.assert_permiso('logistica.pagos.confirmar');
  if length(v_motivo) not between 1 and 500 then
    raise exception 'Escribe por qué anulas el pago (hasta 500 caracteres).' using errcode = '22023', hint = 'motivo';
  end if;
  select * into o from public.pagos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  if not (case when o.vehiculo_id is not null then public.puede_vehiculo(o.vehiculo_id, 'logistica.pagos.ver')
               else public.tiene_permiso('repuestos.costos.ver') end) then
    raise exception 'No encontramos este pago o no tienes acceso.' using errcode = '42501';
  end if;
  if not o.confirmado then
    raise exception 'Este pago no está confirmado: elimínalo en vez de anularlo.' using errcode = '23514', hint = 'id';
  end if;
  if o.vehiculo_id is not null then
    -- C13 · los confirmados vivos del vehículo, en orden de id (la propia incluida). Usa pagos_vehiculo_idx.
    perform 1 from public.pagos x where x.vehiculo_id = o.vehiculo_id and x.confirmado and x.eliminado_en is null order by x.id for update;
  else
    -- Los vivos del proyecto, confirmados o no (cualquiera cumple `proyecto.pago_cliente`), en orden de id. Usa pagos_proyecto_repuestos_id_idx.
    perform 1 from public.pagos x where x.proyecto_repuestos_id = o.proyecto_repuestos_id and x.eliminado_en is null order by x.id for update;
  end if;
  select * into o from public.pagos x where x.id = p_id;
  if o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este pago mientras lo anulabas.');
  if o.vehiculo_id is not null then
    v_antes := public._pagos_requisitos_de_fase(o.vehiculo_id);
    update public.pagos x set eliminado_en = now() where x.id = p_id returning * into o;
    v_despues := public._pagos_requisitos_de_fase(o.vehiculo_id);
    if exists (select 1 from jsonb_each(v_antes) a where a.value = 'true'::jsonb and v_despues -> a.key = 'false'::jsonb) then
      select f.nombre into v_fase from public.vehiculos v join public.fases f on f.id = v.fase_id where v.id = o.vehiculo_id;
      raise exception 'La fase «%» pide pagos confirmados: anular este pago la deja sin cumplir.', v_fase using errcode = '23514', hint = 'id';
    end if;
  else
    update public.pagos x set eliminado_en = now() where x.id = p_id returning * into o;
    if not exists (select 1 from public.pagos x where x.proyecto_repuestos_id = o.proyecto_repuestos_id and x.eliminado_en is null) then
      select f.nombre into v_fase
        from public.repuestos_items i
        join public.fases_requisitos r on r.fase_id = i.fase_id and r.tipo = 'dato' and r.clave_dato = 'proyecto.pago_cliente'
        join public.fases f on f.id = i.fase_id
       where i.proyecto_id = o.proyecto_repuestos_id and i.eliminado_en is null
       order by f.orden, f.id
       limit 1;
      if found then
        raise exception 'La fase «%» pide un pago del cliente: anular el último pago del proyecto la deja sin cumplir.', v_fase using errcode = '23514', hint = 'id';
      end if;
    end if;
  end if;
  perform public.registrar_actividad('pago.anulado', 'pagos', p_id::text, null, null,
                                     jsonb_build_object('motivo', v_motivo, 'monto', o.monto, 'moneda', o.moneda, 'monto_base', o.monto_base,
                                                        'confirmado_por', o.confirmado_por));
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'anulado_en', o.eliminado_en);
end;
$$;

comment on function public.pago_anular(uuid, timestamp with time zone, text) is 'Anula un pago confirmado de un vehículo o de un proyecto de repuestos (borrado suave que no vuelve), con motivo y constancia pago.anulado en actividad. Pide logistica.pagos.confirmar y ver el pago (logistica.pagos.ver del vehículo o repuestos.costos.ver); no deja sin cumplir un requisito pagos.confirmado o pagos.umbral_pct de la fase actual del vehículo, ni proyecto.pago_cliente de la fase de un ítem vivo del proyecto (23514). Uno sin confirmar se elimina con pago_eliminar.';

revoke all on function public.pago_anular(uuid, timestamp with time zone, text) from public, anon;
grant execute on function public.pago_anular(uuid, timestamp with time zone, text) to authenticated, service_role;
