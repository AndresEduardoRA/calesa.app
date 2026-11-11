-- Gastos: registrar con el monto en moneda base que calcula la base (paso 6.10-1, C1–C4 y C13 en gastos).
--   C1. La moneda existe y está activa. En la moneda base no va tipo de cambio y `monto_base = monto`.
--   C2. En otra moneda el tipo de cambio es obligatorio y une esa moneda con la base en cualquiera de los dos sentidos: moneda → base multiplica, base →
--       moneda divide. Se guarda el `valor` del momento tal cual y el id del tipo: el sentido sale del tipo (por eso `on delete restrict`; nada borra
--       `tipos_cambio`, se desactiva). Lo que el llamador crea saber del monto en base no entra por ningún parámetro.
--   C2b. Un monto con más de dos decimales es un error (no se redondea en silencio).
--   C3. Un `monto_base` que no cabe en numeric(18,2) da 22003 con un mensaje humano.
--   C4. `gasto_registrar()`: una unidad, `puede_unidad(… 'logistica.gastos.editar', 'repuestos.costos.editar')`, la regla `gastos` del flujo de la unidad,
--       categoría activa, monto ≥ 0, el comprobante en la carpeta de la unidad. Idempotente por id.
--   C13. La versión propia de la fila: se mueve dos veces en una transacción.

alter table public.gastos add column tipo_cambio_id uuid references public.tipos_cambio (id) on delete restrict;
create index gastos_tipo_cambio_id_idx on public.gastos using btree (tipo_cambio_id);
comment on column public.gastos.tipo_cambio_id is
  'El tipo de cambio que eligió quien cargó el gasto. tipo_cambio_aplicado guarda su valor en ese momento; el sentido (moneda → base o base → moneda) sale del tipo.';

-- C1–C3 · el cálculo. Con `p_valor` (corregir sólo el monto, D19) usa esa tasa y no exige que el tipo siga activo.
create or replace function public._monto_en_base(p_moneda text, p_tipo_cambio uuid, p_monto numeric, p_valor numeric default null,
  out tipo_cambio_id uuid, out tipo_cambio_aplicado numeric, out monto_base numeric)
language plpgsql stable
set search_path = ''
as $$
declare v_base text; t public.tipos_cambio;
begin
  if p_monto is null then
    raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
  end if;
  if p_monto <> round(p_monto, 2) then
    raise exception 'El monto lleva como mucho dos decimales.' using errcode = '22023', hint = 'monto';
  end if;
  if not exists (select 1 from public.monedas m where m.codigo::text = p_moneda and (m.activa or p_valor is not null)) then
    raise exception 'Elige una moneda activa.' using errcode = '22023', hint = 'moneda';
  end if;
  select e.moneda_base::text into v_base from public.ajustes_empresa e where e.id = 1;
  if p_moneda = v_base then
    if p_tipo_cambio is not null then
      raise exception 'En %, la moneda base, no va tipo de cambio.', v_base using errcode = '22023', hint = 'tipo_cambio';
    end if;
    tipo_cambio_id := null; tipo_cambio_aplicado := null; monto_base := p_monto;
    return;
  end if;
  if p_tipo_cambio is null then
    raise exception 'Elige el tipo de cambio de % a %.', p_moneda, v_base using errcode = '23502', hint = 'tipo_cambio';
  end if;
  select * into t from public.tipos_cambio x where x.id = p_tipo_cambio;
  if not found or (p_valor is null and not t.activo)
     or not ((t.moneda_de::text = p_moneda and t.moneda_a::text = v_base) or (t.moneda_de::text = v_base and t.moneda_a::text = p_moneda)) then
    raise exception 'Ese tipo de cambio no convierte % a % o está desactivado.', p_moneda, v_base using errcode = '22023', hint = 'tipo_cambio';
  end if;
  tipo_cambio_id := t.id;
  tipo_cambio_aplicado := coalesce(p_valor, t.valor);
  if t.moneda_de::text = p_moneda then
    monto_base := round(p_monto * tipo_cambio_aplicado, 2);
  else
    monto_base := round(p_monto / tipo_cambio_aplicado, 2);
  end if;
  if abs(monto_base) >= 1e16 then
    raise exception 'El monto en % no cabe: revisa la cifra.', v_base using errcode = '22003', hint = 'monto';
  end if;
end;
$$;

-- D13 · la ruta del comprobante, en la carpeta de la unidad: `<unidad>/<sha-256>.<ext>`.
create or replace function public._comprobante_ruta_valida(p_unidad uuid, p_ruta text) returns boolean
language sql immutable
set search_path = ''
as $$
  select p_ruta is null or p_ruta ~ ('^' || p_unidad::text || '/[0-9a-f]{64}\.[a-z0-9]{1,8}$');
$$;

-- D5 · la regla del flujo de la unidad: el de su fase y, sin fase, el del origen (vehículo) o el de repuestos.
create or replace function public._dinero_regla_activa(p_vehiculo uuid, p_repuesto uuid, p_regla text) returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(case
    when p_vehiculo is not null then (
      select public.flujo_regla_activa(coalesce(f.flujo_id, (select fl.id from public.flujos fl where fl.ambito = 'vehiculos' and fl.origen_id = v.origen_id)), p_regla)
        from public.vehiculos v left join public.fases f on f.id = v.fase_id
       where v.id = p_vehiculo)
    when p_repuesto is not null then (
      select public.flujo_regla_activa(coalesce(f.flujo_id, (select fl.id from public.flujos fl where fl.ambito = 'repuestos')), p_regla)
        from public.repuestos_items r left join public.fases f on f.id = r.fase_id
       where r.id = p_repuesto)
  end, false);
$$;

-- C4 · lo que se valida al registrar y al corregir. `p_categoria` nula = no cambió (una categoría desactivada después no traba la corrección).
create or replace function public._gasto_validar(p_vehiculo uuid, p_repuesto uuid, p_categoria uuid, p_monto numeric, p_ruta text) returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if p_categoria is not null and not exists (select 1 from public.categorias_gasto c where c.id = p_categoria and c.activo) then
    raise exception 'Elige una categoría de gasto activa.' using errcode = '22023', hint = 'categoria_id';
  end if;
  if p_monto is null then
    raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
  end if;
  if p_monto < 0 then
    raise exception 'El monto no puede ser negativo.' using errcode = '22023', hint = 'monto';
  end if;
  if not public._comprobante_ruta_valida(coalesce(p_vehiculo, p_repuesto), p_ruta) then
    raise exception 'El comprobante no está en la carpeta de esta unidad.' using errcode = '22023', hint = 'comprobante_ruta';
  end if;
end;
$$;

create or replace function public._gasto_respuesta(g public.gastos, p_extra jsonb) returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object('id', g.id, 'actualizado_en', g.actualizado_en, 'tipo_cambio_aplicado', g.tipo_cambio_aplicado, 'monto_base', g.monto_base)
         || p_extra;
$$;

-- C4 · registrar.
create or replace function public.gasto_registrar(p_id uuid, p_vehiculo uuid, p_repuesto uuid, p_categoria uuid, p_moneda text, p_monto numeric,
  p_tipo_cambio uuid, p_fecha date, p_proveedor text, p_comprobante_ruta text, p_notas text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare g public.gastos; c record;
begin
  perform public.assert_activo();
  if p_id is null then
    raise exception 'Falta el id del gasto.' using errcode = '23502', hint = 'id';
  end if;
  if num_nonnulls(p_vehiculo, p_repuesto) <> 1 then
    raise exception 'Un gasto es de un vehículo o de un repuesto: uno solo.' using errcode = '22023', hint = 'unidad';
  end if;
  if not public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.gastos.editar', 'repuestos.costos.editar') then
    raise exception 'No tienes el permiso «%».', case when p_vehiculo is not null then 'logistica.gastos.editar' else 'repuestos.costos.editar' end
      using errcode = '42501';
  end if;
  select * into g from public.gastos x where x.id = p_id;
  if not found then
    if not public._dinero_regla_activa(p_vehiculo, p_repuesto, 'gastos') then
      raise exception 'Los gastos están apagados en el flujo de esta unidad.' using errcode = '23514';
    end if;
    perform public._gasto_validar(p_vehiculo, p_repuesto, p_categoria, p_monto, p_comprobante_ruta);
    if p_categoria is null then
      raise exception 'Elige una categoría de gasto activa.' using errcode = '23502', hint = 'categoria_id';
    end if;
    c := public._monto_en_base(p_moneda, p_tipo_cambio, p_monto);
    insert into public.gastos (id, vehiculo_id, repuesto_id, categoria_id, proveedor, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, fecha,
                               comprobante_ruta, notas, creado_por)
    values (p_id, p_vehiculo, p_repuesto, p_categoria, nullif(btrim(p_proveedor), ''), p_moneda, p_monto, c.tipo_cambio_id, c.tipo_cambio_aplicado,
            c.monto_base, coalesce(p_fecha, current_date), p_comprobante_ruta, nullif(btrim(p_notas), ''), (select auth.uid()))
    on conflict (id) do nothing
    returning * into g;
    if found then
      return public._gasto_respuesta(g, '{"ya_existia": false}');
    end if;
    select * into g from public.gastos x where x.id = p_id;
  end if;
  -- D8 · un reintento devuelve lo ya registrado; nunca duplica ni pisa.
  if g.vehiculo_id is distinct from p_vehiculo or g.repuesto_id is distinct from p_repuesto then
    raise exception 'Ese id ya es de otro gasto.' using errcode = '23505', hint = 'id';
  end if;
  if g.eliminado_en is not null then
    raise exception 'Ese gasto ya no existe.' using errcode = 'PT409';
  end if;
  return public._gasto_respuesta(g, '{"ya_existia": true}');
end;
$$;

-- C13 · la versión propia (corre después de trg_actualizado_en: los triggers van por orden alfabético).
create or replace function public.dinero_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end;
$$;

create trigger trg_gasto_version before update on public.gastos for each row execute function public.dinero_version();

revoke all on function public._monto_en_base(text, uuid, numeric, numeric) from public, anon, authenticated;
revoke all on function public._comprobante_ruta_valida(uuid, text) from public, anon, authenticated;
revoke all on function public._dinero_regla_activa(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public._gasto_validar(uuid, uuid, uuid, numeric, text) from public, anon, authenticated;
revoke all on function public._gasto_respuesta(public.gastos, jsonb) from public, anon, authenticated;
revoke all on function public.dinero_version() from public, anon, authenticated, service_role;
grant execute on function public._monto_en_base(text, uuid, numeric, numeric) to service_role;
grant execute on function public._comprobante_ruta_valida(uuid, text) to service_role;
grant execute on function public._dinero_regla_activa(uuid, uuid, text) to service_role;
grant execute on function public._gasto_validar(uuid, uuid, uuid, numeric, text) to service_role;
grant execute on function public._gasto_respuesta(public.gastos, jsonb) to service_role;

revoke all on function public.gasto_registrar(uuid, uuid, uuid, uuid, text, numeric, uuid, date, text, text, text) from public, anon;
grant execute on function public.gasto_registrar(uuid, uuid, uuid, uuid, text, numeric, uuid, date, text, text, text) to authenticated, service_role;
