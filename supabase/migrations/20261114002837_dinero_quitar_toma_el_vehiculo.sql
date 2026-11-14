-- Quitar el dinero que pide la fase de un vehículo toma el vehículo `for share` antes que sus pagos o sus tributos, como quitar un documento o una
-- declaración exigidos: anular un pago confirmado (`pago_anular`) y eliminar un gasto o cambiarle la categoría (`gasto_eliminar` y `gasto_guardar`, por
-- `_gasto_bloquear`) esperan y hacen esperar a `cambiar_fase` (`for no key update`). Sin el candado, el vehículo entraba a una fase que pide
-- `pagos.confirmado` o `aduana.tributos_pagados` mientras se quitaba lo último que la cumplía, y quedaba sin cumplir.
-- Carreras: supabase/tests/areas/dinero/carreras-fase.mjs (K7, K8).

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
    -- El vehículo `for share` antes que sus pagos (el orden lead → vehículo → hijas): espera y hace esperar a `cambiar_fase` (`for no key update`),
    -- así que la fase que se mira abajo es la que queda.
    perform 1 from public.vehiculos v where v.id = o.vehiculo_id for share;
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

comment on function public.pago_anular(uuid, timestamp with time zone, text) is 'Anula un pago confirmado de un vehículo o de un proyecto de repuestos (borrado suave que no vuelve), con motivo y constancia pago.anulado en actividad. Pide logistica.pagos.confirmar y ver el pago (logistica.pagos.ver del vehículo o repuestos.costos.ver); toma el vehículo for share (contra cambiar_fase) antes que sus pagos; no deja sin cumplir un requisito pagos.confirmado o pagos.umbral_pct de la fase actual del vehículo, ni proyecto.pago_cliente de la fase de un ítem vivo del proyecto (23514). Uno sin confirmar se elimina con pago_eliminar.';


-- El vehículo `for share` y después sus tributos vivos en orden de id. La llaman `gasto_eliminar` y `gasto_guardar` antes de tomar el gasto.
create or replace function public._gasto_bloquear(o public.gastos) returns void
    language plpgsql
    set search_path to ''
    as $$
begin
  if o.vehiculo_id is not null then
    -- El vehículo antes que sus gastos (el orden lead → vehículo → hijas): espera y hace esperar a `cambiar_fase` (`for no key update`), así que
    -- `_gasto_tributo_protegido` mira la fase que queda.
    perform 1 from public.vehiculos v where v.id = o.vehiculo_id for share;
    perform 1 from public.gastos x join public.categorias_gasto c on c.id = x.categoria_id
     where x.vehiculo_id = o.vehiculo_id and x.eliminado_en is null and c.proposito = 'tributos'
     order by x.id
       for update of x;
  end if;
end;
$$;

comment on function public._gasto_bloquear(public.gastos) is 'Los candados de quien quita o corrige un gasto de un vehículo: el vehículo for share (contra cambiar_fase) y sus gastos de tributos vivos en orden de id (contra otro que quita el último). La llaman gasto_eliminar y gasto_guardar.';

revoke all on function public._gasto_bloquear(public.gastos) from public, anon, authenticated;
grant execute on function public._gasto_bloquear(public.gastos) to service_role;
