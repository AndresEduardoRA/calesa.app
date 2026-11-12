-- Transporte: guardar el de una unidad con versión (paso 6.07-1, C4–C9). Una fila 1:1 por unidad: con la esperada nula la crea y, si ya existe, PT409
-- (nunca pisa). Orden: cuenta activa, una unidad, permiso, candado (unidad `for share` y después la fila `for update`), versión, validación, escritura.

create or replace function public.transporte_guardar(p_vehiculo uuid, p_repuesto uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  t public.transportes; n public.transportes; u record; v_hay boolean;
  v_sujeto constant text := 'el transporte de esta unidad';
begin
  perform public.assert_activo();
  if num_nonnulls(p_vehiculo, p_repuesto) <> 1 then
    raise exception 'Una unidad por vez.' using errcode = '22023', hint = 'unidad';
  end if;
  -- C5 · el permiso del origen antes del candado: quien no puede no espera a nadie. Cubre la unidad inexistente o en la papelera.
  if not public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.transporte.editar', 'repuestos.editar') then
    raise exception 'No tienes el permiso «%» de esta unidad.', case when p_vehiculo is not null then 'logistica.transporte.editar' else 'repuestos.editar' end
      using errcode = '42501';
  end if;
  -- C6 · unidad antes que fila, siempre. Por transportes_vehiculo_id_key o transportes_repuesto_id_key.
  select * into u from public._transporte_unidad(p_vehiculo, p_repuesto, true);
  if p_vehiculo is not null then
    select * into t from public.transportes x where x.vehiculo_id = p_vehiculo for update;
  else
    select * into t from public.transportes x where x.repuesto_id = p_repuesto for update;
  end if;
  v_hay := found;
  -- C7 · la esperada nula es crear: si la fila ya existe, PT409 aunque no haya diferencias (D11).
  if v_hay and p_actualizado_en_esperado is null then
    perform public._conflicto_de_edicion('transportes', t.id, t.actualizado_en, v_sujeto);
  end if;
  if not v_hay then
    t.vehiculo_id := p_vehiculo;
    t.repuesto_id := p_repuesto;
    t.sigue_al_vehiculo := false;
  end if;
  n := public._transporte_cambios(t, p_cambios,
    array['naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'contenedor', 'booking', 'zarpe_el', 'eta_el', 'arribo_el', 'notas']);
  if (n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, n.contenedor, n.booking, n.zarpe_el, n.eta_el, n.arribo_el, n.notas)
     is not distinct from
     (t.naviera_id, t.puerto_origen_id, t.puerto_destino_id, t.contenedor, t.booking, t.zarpe_el, t.eta_el, t.arribo_el, t.notas) then
    return jsonb_build_object('id', t.id, 'actualizado_en', t.actualizado_en, 'sin_cambios', true);
  end if;
  -- C8 · la versión.
  if not v_hay and p_actualizado_en_esperado is not null then
    raise exception 'El transporte de esta unidad ya no existe. Recarga.' using errcode = 'PT409';
  end if;
  if v_hay and t.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('transportes', t.id, t.actualizado_en, v_sujeto);
  end if;
  -- C9 · validar y escribir.
  perform public._transporte_validar(u.flujo, u.fase_id, t, n, null);
  if not v_hay then
    insert into public.transportes (vehiculo_id, repuesto_id, naviera_id, puerto_origen_id, puerto_destino_id, contenedor, booking, zarpe_el, eta_el,
                                    arribo_el, notas, actualizado_por)
    values (p_vehiculo, p_repuesto, n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, n.contenedor, n.booking, n.zarpe_el, n.eta_el,
            n.arribo_el, n.notas, (select auth.uid()))
    on conflict do nothing
    returning * into n;
    if not found then
      raise exception 'Otra persona cargó el transporte de esta unidad mientras lo editabas. Recarga.' using errcode = 'PT409';
    end if;
  else
    update public.transportes x
       set naviera_id = n.naviera_id, puerto_origen_id = n.puerto_origen_id, puerto_destino_id = n.puerto_destino_id, contenedor = n.contenedor,
           booking = n.booking, zarpe_el = n.zarpe_el, eta_el = n.eta_el, arribo_el = n.arribo_el, notas = n.notas,
           actualizado_por = (select auth.uid())
     where x.id = t.id
    returning * into n;
  end if;
  return jsonb_build_object('id', n.id, 'actualizado_en', n.actualizado_en, 'sin_cambios', false);
end;
$$;

revoke all on function public.transporte_guardar(uuid, uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.transporte_guardar(uuid, uuid, timestamptz, jsonb) to authenticated, service_role;

comment on function public.transporte_guardar(uuid, uuid, timestamptz, jsonb) is
  'Guarda el transporte 1:1 de una unidad (paso 6.07-1). p_cambios: naviera_id, puerto_origen_id, puerto_destino_id, contenedor, booking, zarpe_el, '
  'eta_el, arribo_el, notas (null = vaciar). Esperada nula = crear; si ya existe, PT409. Devuelve {id, actualizado_en, sin_cambios}.';
