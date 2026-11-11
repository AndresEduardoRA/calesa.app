-- Pagos: confirmar como acto sellado por la base (paso 6.10-1, C10–C12).
--   C10. `pago_confirmar(id, versión)`: `logistica.pagos.confirmar` primero (42501), el pago vivo, verlo (`logistica.pagos.ver` del vehículo, D10), la fila
--        `for update`, PT409 si ya está confirmado (dice quién y cuándo), la versión, y `pago.confirmado` en `actividad`.
--   C11. El sello lo pone la base, también fuera de las RPC (D11): al insertar, un pago nace sin confirmar y sin sello; al pasar a confirmado, quien
--        confirma (`auth.uid()`, obligatorio) y cuándo. Uno confirmado no cambia nada salvo `eliminado_en` (para anularlo, 6.10-2) y `lead_id` → nulo
--        (el `on delete set null` de su FK, D22): ni volver a no confirmado.
--   C12. Fuera de `pago_guardar()` y `pago_eliminar()` (lo dice `_pago_tomar()`) y del UPDATE directo de cualquiera (C11).

-- C11 · desde su definición vigente (la base): además de `creado_por`, el pago nace sin confirmar y sin sello.
create or replace function public.pago_sellos() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := (select auth.uid());
    new.confirmado := false;
    new.confirmado_por := null;
    new.confirmado_en := null;
  end if;
  return new;
end;
$$;

-- C11 · el sello al confirmar y la inmutabilidad de lo confirmado.
create or replace function public.pago_sellado() returns trigger
language plpgsql
set search_path = ''
as $$
declare v_libres constant text[] := array['eliminado_en', 'actualizado_en', 'lead_id'];
begin
  if old.confirmado then
    if (to_jsonb(new) - v_libres) is distinct from (to_jsonb(old) - v_libres) or (new.lead_id is distinct from old.lead_id and new.lead_id is not null) then
      raise exception 'Un pago confirmado no se edita.' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.confirmado then
    if (select auth.uid()) is null then
      raise exception 'Confirmar un pago pide una sesión.' using errcode = '42501';
    end if;
    new.confirmado_por := (select auth.uid());
    new.confirmado_en := now();
  else
    new.confirmado_por := null;
    new.confirmado_en := null;
  end if;
  return new;
end;
$$;

create trigger trg_pago_sellado before update on public.pagos for each row execute function public.pago_sellado();

-- C10 · confirmar.
create or replace function public.pago_confirmar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.pagos; v_quien text;
begin
  perform public.assert_permiso('logistica.pagos.confirmar');
  select * into o from public.pagos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  if not (case when o.vehiculo_id is not null then public.puede_vehiculo(o.vehiculo_id, 'logistica.pagos.ver')
               else public.tiene_permiso('repuestos.costos.ver') end) then
    raise exception 'No encontramos este pago o no tienes acceso.' using errcode = '42501';
  end if;
  select * into o from public.pagos x where x.id = p_id for update;
  if o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  if o.confirmado then
    select nullif(btrim(pf.nombre), '') into v_quien from public.perfiles pf where pf.id = o.confirmado_por;
    raise exception '% ya confirmó este pago %.', coalesce(v_quien, 'Otra persona'), public._hace(o.confirmado_en) using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este pago mientras lo confirmabas.');
  update public.pagos x set confirmado = true where x.id = p_id returning * into o;
  perform public.registrar_actividad('pago.confirmado', 'pagos', p_id::text, null, null,
                                     jsonb_build_object('monto', o.monto, 'moneda', o.moneda, 'monto_base', o.monto_base));
  return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en, 'confirmado_por', o.confirmado_por, 'confirmado_en', o.confirmado_en);
end;
$$;

revoke all on function public.pago_sellado() from public, anon, authenticated, service_role;
revoke all on function public.pago_confirmar(uuid, timestamptz) from public, anon;
grant execute on function public.pago_confirmar(uuid, timestamptz) to authenticated, service_role;
