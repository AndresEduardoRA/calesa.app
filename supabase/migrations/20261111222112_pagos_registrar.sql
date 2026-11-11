-- Pagos: registrar, corregir y eliminar sin confirmar, con el monto en base que calcula la base (paso 6.10-1, C3 y C13 en pagos, C9).
--   `pago_registrar()` es sólo de vehículo (D9): `puede_vehiculo(… 'logistica.pagos.editar')`, la regla `pagos`, concepto de 1 a 200, método ≤ 100,
--   monto > 0 (D16), el comprobante en la carpeta del vehículo y el cálculo de `_monto_en_base()`. El lead lo mira `trg_lead_visible`. Idempotente por id.
--   `pago_guardar()` (lista cerrada) y `pago_eliminar()` (suave), como los de gastos; uno confirmado da PT409 antes que la versión.

alter table public.pagos add column tipo_cambio_id uuid references public.tipos_cambio (id) on delete restrict;
create index pagos_tipo_cambio_id_idx on public.pagos using btree (tipo_cambio_id);
comment on column public.pagos.tipo_cambio_id is
  'El tipo de cambio que eligió quien cargó el pago. tipo_cambio_aplicado guarda su valor en ese momento; el sentido sale del tipo.';

create trigger trg_pago_version before update on public.pagos for each row execute function public.dinero_version();

create or replace function public._pago_validar(p_unidad uuid, p_concepto text, p_metodo text, p_monto numeric, p_ruta text) returns void
language plpgsql immutable
set search_path = ''
as $$
begin
  if coalesce(length(btrim(p_concepto)), 0) not between 1 and 200 then
    raise exception 'Escribe el concepto del pago (hasta 200 caracteres).' using errcode = '22023', hint = 'concepto';
  end if;
  if length(p_metodo) > 100 then
    raise exception 'El método va en 100 caracteres como mucho.' using errcode = '22023', hint = 'metodo';
  end if;
  if p_monto is null then
    raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
  end if;
  if p_monto <= 0 then
    raise exception 'El monto de un pago es mayor que cero.' using errcode = '22023', hint = 'monto';
  end if;
  if not public._comprobante_ruta_valida(p_unidad, p_ruta) then
    raise exception 'El comprobante no está en la carpeta de esta unidad.' using errcode = '22023', hint = 'comprobante_ruta';
  end if;
end;
$$;

create or replace function public._pago_respuesta(p public.pagos, p_extra jsonb) returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object('id', p.id, 'actualizado_en', p.actualizado_en, 'tipo_cambio_aplicado', p.tipo_cambio_aplicado, 'monto_base', p.monto_base)
         || p_extra;
$$;

-- El permiso de escribir un pago: el de su vehículo o, si es de un proyecto de repuestos, `repuestos.costos.editar` (lo que decía la policy).
create or replace function public._pago_exigir_edicion(p public.pagos) returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if p.vehiculo_id is not null and not public.puede_vehiculo(p.vehiculo_id, 'logistica.pagos.editar') then
    raise exception 'No tienes el permiso «logistica.pagos.editar».' using errcode = '42501';
  end if;
  if p.vehiculo_id is null and not public.tiene_permiso('repuestos.costos.editar') then
    raise exception 'No tienes el permiso «repuestos.costos.editar».' using errcode = '42501';
  end if;
end;
$$;

-- C9 · registrar.
create or replace function public.pago_registrar(p_id uuid, p_vehiculo uuid, p_lead uuid, p_concepto text, p_moneda text, p_monto numeric,
  p_tipo_cambio uuid, p_metodo text, p_fecha date, p_comprobante_ruta text, p_notas text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare p public.pagos; c record;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el id del pago.' using errcode = '23502', hint = 'id';
  end if;
  if p_vehiculo is null then
    raise exception 'Elige el vehículo del pago.' using errcode = '23502', hint = 'vehiculo';
  end if;
  if not public.puede_vehiculo(p_vehiculo, 'logistica.pagos.editar') then
    raise exception 'No tienes el permiso «logistica.pagos.editar».' using errcode = '42501';
  end if;
  select * into p from public.pagos x where x.id = p_id;
  if not found then
    if not public._dinero_regla_activa(p_vehiculo, null, 'pagos') then
      raise exception 'Los pagos están apagados en el flujo de esta unidad.' using errcode = '23514';
    end if;
    perform public._pago_validar(p_vehiculo, p_concepto, p_metodo, p_monto, p_comprobante_ruta);
    c := public._monto_en_base(p_moneda, p_tipo_cambio, p_monto);
    insert into public.pagos (id, vehiculo_id, lead_id, concepto, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, metodo, fecha,
                              comprobante_ruta, notas)
    values (p_id, p_vehiculo, p_lead, regexp_replace(btrim(p_concepto), '\s+', ' ', 'g'), p_moneda, p_monto, c.tipo_cambio_id, c.tipo_cambio_aplicado,
            c.monto_base, nullif(btrim(p_metodo), ''), coalesce(p_fecha, current_date), p_comprobante_ruta, nullif(btrim(p_notas), ''))
    on conflict (id) do nothing
    returning * into p;
    if found then
      return public._pago_respuesta(p, '{"ya_existia": false}');
    end if;
    select * into p from public.pagos x where x.id = p_id;
  end if;
  if p.vehiculo_id is distinct from p_vehiculo then
    raise exception 'Ese id ya es de otro pago.' using errcode = '23505', hint = 'id';
  end if;
  if p.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  return public._pago_respuesta(p, '{"ya_existia": true}');
end;
$$;

-- El pago que resulta de aplicar los cambios: lista cerrada, validado y con el monto en base recalculado (D19, como en gastos).
create or replace function public._pago_de_cambios(o public.pagos, p_cambios jsonb) returns public.pagos
language plpgsql stable
set search_path = ''
as $$
declare n public.pagos := o; v_k text; c record;
begin
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  select k into v_k from jsonb_object_keys(p_cambios) k
   where k <> all (array['lead_id', 'concepto', 'moneda', 'monto', 'tipo_cambio_id', 'metodo', 'fecha', 'comprobante_ruta', 'notas'])
   limit 1;
  if v_k is not null then
    raise exception 'No se cambia «%».', v_k using errcode = '22023', hint = v_k;
  end if;
  if p_cambios ? 'lead_id' then n.lead_id := (p_cambios ->> 'lead_id')::uuid; end if;
  if p_cambios ? 'concepto' then n.concepto := regexp_replace(btrim(p_cambios ->> 'concepto'), '\s+', ' ', 'g'); end if;
  if p_cambios ? 'moneda' then n.moneda := p_cambios ->> 'moneda'; end if;
  if p_cambios ? 'monto' then
    -- Los decimales se miran antes de asignar: la columna numeric(18,2) redondearía en silencio.
    if (p_cambios ->> 'monto')::numeric <> round((p_cambios ->> 'monto')::numeric, 2) then
      raise exception 'El monto lleva como mucho dos decimales.' using errcode = '22023', hint = 'monto';
    end if;
    n.monto := (p_cambios ->> 'monto')::numeric;
  end if;
  if p_cambios ? 'tipo_cambio_id' then n.tipo_cambio_id := (p_cambios ->> 'tipo_cambio_id')::uuid; end if;
  if p_cambios ? 'metodo' then n.metodo := nullif(btrim(p_cambios ->> 'metodo'), ''); end if;
  if p_cambios ? 'fecha' then n.fecha := (p_cambios ->> 'fecha')::date; end if;
  if p_cambios ? 'comprobante_ruta' then n.comprobante_ruta := p_cambios ->> 'comprobante_ruta'; end if;
  if p_cambios ? 'notas' then n.notas := nullif(btrim(p_cambios ->> 'notas'), ''); end if;
  if n.fecha is null then
    raise exception 'Falta la fecha.' using errcode = '23502', hint = 'fecha';
  end if;
  perform public._pago_validar(coalesce(n.vehiculo_id, n.proyecto_repuestos_id), n.concepto, n.metodo, n.monto, n.comprobante_ruta);
  if n.moneda is distinct from o.moneda or n.tipo_cambio_id is distinct from o.tipo_cambio_id then
    c := public._monto_en_base(n.moneda::text, n.tipo_cambio_id, n.monto);
  else
    c := public._monto_en_base(n.moneda::text, n.tipo_cambio_id, n.monto, o.tipo_cambio_aplicado);
  end if;
  n.tipo_cambio_id := c.tipo_cambio_id;
  n.tipo_cambio_aplicado := c.tipo_cambio_aplicado;
  n.monto_base := c.monto_base;
  return n;
end;
$$;

-- La fila viva, sin confirmar y tomada `for update`, con el permiso mirado antes del candado.
create or replace function public._pago_tomar(p_id uuid) returns public.pagos
language plpgsql
set search_path = ''
as $$
declare o public.pagos;
begin
  perform public.assert_activo();
  select * into o from public.pagos x where x.id = p_id;
  if not found or o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  perform public._pago_exigir_edicion(o);
  select * into o from public.pagos x where x.id = p_id for update;
  if o.eliminado_en is not null then
    raise exception 'Ese pago ya no existe.' using errcode = 'PT409';
  end if;
  if o.confirmado then
    raise exception 'Este pago ya está confirmado: no se edita ni se elimina.' using errcode = 'PT409';
  end if;
  return o;
end;
$$;

-- C9 · corregir.
create or replace function public.pago_guardar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.pagos := public._pago_tomar(p_id); n public.pagos;
begin
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  n := public._pago_de_cambios(o, p_cambios);
  if (n.lead_id, n.concepto, n.moneda, n.monto, n.tipo_cambio_id, n.tipo_cambio_aplicado, n.monto_base, n.metodo, n.fecha, n.comprobante_ruta, n.notas)
     is not distinct from
     (o.lead_id, o.concepto, o.moneda, o.monto, o.tipo_cambio_id, o.tipo_cambio_aplicado, o.monto_base, o.metodo, o.fecha, o.comprobante_ruta, o.notas) then
    return public._pago_respuesta(o, '{"sin_cambios": true}');
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este pago mientras lo editabas.');
  update public.pagos x
     set lead_id = n.lead_id, concepto = n.concepto, moneda = n.moneda, monto = n.monto, tipo_cambio_id = n.tipo_cambio_id,
         tipo_cambio_aplicado = n.tipo_cambio_aplicado, monto_base = n.monto_base, metodo = n.metodo, fecha = n.fecha,
         comprobante_ruta = n.comprobante_ruta, notas = n.notas
   where x.id = p_id
  returning * into n;
  return public._pago_respuesta(n, '{"sin_cambios": false}');
end;
$$;

-- C9 · eliminar (suave).
create or replace function public.pago_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.pagos := public._pago_tomar(p_id); v_en timestamptz;
begin
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este pago mientras lo editabas.');
  update public.pagos x set eliminado_en = now() where x.id = p_id returning x.actualizado_en into v_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_en);
end;
$$;

revoke all on function public._pago_validar(uuid, text, text, numeric, text) from public, anon, authenticated;
revoke all on function public._pago_respuesta(public.pagos, jsonb) from public, anon, authenticated;
revoke all on function public._pago_exigir_edicion(public.pagos) from public, anon, authenticated;
revoke all on function public._pago_de_cambios(public.pagos, jsonb) from public, anon, authenticated;
revoke all on function public._pago_tomar(uuid) from public, anon, authenticated;
grant execute on function public._pago_validar(uuid, text, text, numeric, text) to service_role;
grant execute on function public._pago_respuesta(public.pagos, jsonb) to service_role;
grant execute on function public._pago_exigir_edicion(public.pagos) to service_role;
grant execute on function public._pago_de_cambios(public.pagos, jsonb) to service_role;
grant execute on function public._pago_tomar(uuid) to service_role;

revoke all on function public.pago_registrar(uuid, uuid, uuid, text, text, numeric, uuid, text, date, text, text) from public, anon;
revoke all on function public.pago_guardar(uuid, timestamptz, jsonb) from public, anon;
revoke all on function public.pago_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.pago_registrar(uuid, uuid, uuid, text, text, numeric, uuid, text, date, text, text) to authenticated, service_role;
grant execute on function public.pago_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
grant execute on function public.pago_eliminar(uuid, timestamptz) to authenticated, service_role;
