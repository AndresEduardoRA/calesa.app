-- `proyecto.pago_cliente` se cumple con cualquier pago vivo del proyecto, confirmado o no: eliminar el último sin confirmar lo deja sin cumplir igual que
-- anularlo. `pago_eliminar` lleva la misma guarda de fase que `pago_anular` (23514, hint `id`, con el nombre de la fase) y el mismo candado: los pagos vivos
-- del proyecto en orden de id, antes del suyo. La fase que lo pide sale de una función que comparten las dos.

-- La fase (por orden) de un ítem vivo del proyecto que pide `proyecto.pago_cliente`, o null. Volatile: la llama quien ya tomó los pagos del proyecto y
-- debe ver lo que otro acaba de confirmar.
create or replace function public._proyecto_fase_que_pide_pago(p_proyecto uuid) returns text
    language sql
    set search_path to ''
    as $$
  select f.nombre
    from public.repuestos_items i
    join public.fases_requisitos r on r.fase_id = i.fase_id and r.tipo = 'dato' and r.clave_dato = 'proyecto.pago_cliente'
    join public.fases f on f.id = i.fase_id
   where i.proyecto_id = p_proyecto and i.eliminado_en is null
   order by f.orden, f.id
   limit 1;
$$;

comment on function public._proyecto_fase_que_pide_pago(uuid) is 'Nombre de la primera fase (por orden) de un ítem vivo del proyecto que pide proyecto.pago_cliente, o null. La usan pago_anular y pago_eliminar para no dejar ese requisito sin cumplir.';

revoke all on function public._proyecto_fase_que_pide_pago(uuid) from public, anon, authenticated;
grant execute on function public._proyecto_fase_que_pide_pago(uuid) to service_role;

create or replace function public.pago_eliminar(p_id uuid, p_actualizado_en_esperado timestamp with time zone) returns jsonb
    language plpgsql security definer
    set search_path to ''
    as $$
declare o public.pagos; v_en timestamptz; v_fase text;
begin
  perform public.assert_activo();
  select * into o from public.pagos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  perform public._pago_exigir_edicion(o);
  if o.proyecto_repuestos_id is not null then
    -- Los vivos del proyecto (cualquiera cumple `proyecto.pago_cliente`) en orden de id, como `pago_anular`, antes del propio. Usa pagos_proyecto_repuestos_id_idx.
    perform 1 from public.pagos x where x.proyecto_repuestos_id = o.proyecto_repuestos_id and x.eliminado_en is null order by x.id for update;
  end if;
  o := public._pago_tomar(p_id);
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este pago mientras lo editabas.');
  update public.pagos x set eliminado_en = now() where x.id = p_id returning x.actualizado_en into v_en;
  if o.proyecto_repuestos_id is not null
     and not exists (select 1 from public.pagos x where x.proyecto_repuestos_id = o.proyecto_repuestos_id and x.eliminado_en is null) then
    v_fase := public._proyecto_fase_que_pide_pago(o.proyecto_repuestos_id);
    if v_fase is not null then
      raise exception 'La fase «%» pide un pago del cliente: eliminar el último pago del proyecto la deja sin cumplir.', v_fase using errcode = '23514', hint = 'id';
    end if;
  end if;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_en);
end;
$$;

comment on function public.pago_eliminar(uuid, timestamp with time zone) is 'Elimina (borrado suave) un pago sin confirmar de un vehículo o de un proyecto de repuestos. Pide logistica.pagos.editar del vehículo o repuestos.costos.editar, y la versión; uno confirmado se anula con pago_anular. No elimina el último pago vivo de un proyecto mientras un ítem vivo esté en una fase que pide proyecto.pago_cliente (23514).';

revoke all on function public.pago_eliminar(uuid, timestamp with time zone) from public, anon;
grant execute on function public.pago_eliminar(uuid, timestamp with time zone) to authenticated, service_role;

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
      v_fase := public._proyecto_fase_que_pide_pago(o.proyecto_repuestos_id);
      if v_fase is not null then
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
