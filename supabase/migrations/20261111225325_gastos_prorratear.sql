-- Gastos: prorratear un gasto entre vehículos por lote (paso 6.10-1, C8).
--   Entre 1 y 200 vehículos, sin repetidos ni nulos (D7). Cada uno con la clave y la regla de C4: si uno falla, no se escribe ninguna fila. El reparto, en
--   partes iguales por centavos y en el orden del arreglo: los centavos que sobran, a los primeros; la suma de los montos es exactamente el total. Cada fila
--   lleva su `monto_base` con la misma tasa, leída una vez (D6). Idempotente por `p_lote`: el mismo lote con los mismos vehículos devuelve lo ya repartido,
--   con otros da 23505. Un candado por lote: dos que llegan a la vez dejan un solo reparto.

alter table public.gastos add column lote_id uuid;
create index gastos_lote_idx on public.gastos using btree (lote_id) where lote_id is not null;
comment on column public.gastos.lote_id is 'El reparto de gastos_prorratear() que creó esta fila: un gasto repartido en partes iguales entre vehículos.';

create or replace function public.gastos_prorratear(p_lote uuid, p_vehiculos uuid[], p_categoria uuid, p_moneda text, p_monto numeric, p_tipo_cambio uuid,
  p_fecha date, p_proveedor text, p_comprobante_ruta text, p_notas text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare n int := coalesce(cardinality(p_vehiculos), 0); v uuid; c record; p record; v_centavos bigint; v_cada bigint; v_sobran bigint; v_parte numeric;
  v_id uuid; v_ids uuid[] := '{}'::uuid[];
begin
  perform public.assert_activo();
  if p_lote is null then
    raise exception 'Falta el id del reparto.' using errcode = '23502', hint = 'lote';
  end if;
  if n < 1 or n > 200 or array_position(p_vehiculos, null) is not null
     or n <> cardinality(array(select distinct x from unnest(p_vehiculos) x)) then
    raise exception 'Elige entre 1 y 200 vehículos, sin repetir.' using errcode = '22023', hint = 'vehiculos';
  end if;
  foreach v in array p_vehiculos loop
    if not public.puede_vehiculo(v, 'logistica.gastos.editar') then
      raise exception 'No tienes el permiso «logistica.gastos.editar».' using errcode = '42501';
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('gastos_prorratear:' || p_lote::text, 0));
  -- D8 · por gastos_lote_idx.
  if exists (select 1 from public.gastos g where g.lote_id = p_lote) then
    if (select array_agg(x order by x) from unnest(p_vehiculos) x)
       is distinct from (select array_agg(g.vehiculo_id order by g.vehiculo_id) from public.gastos g where g.lote_id = p_lote) then
      raise exception 'Ese reparto ya existe con otros vehículos.' using errcode = '23505', hint = 'lote';
    end if;
    return jsonb_build_object('lote', p_lote, 'ya_existia', true, 'ids',
      to_jsonb(array(select g.id from unnest(p_vehiculos) with ordinality u (v, o) join public.gastos g on g.vehiculo_id = u.v and g.lote_id = p_lote
                      order by u.o)));
  end if;
  foreach v in array p_vehiculos loop
    if not public._dinero_regla_activa(v, null, 'gastos') then
      raise exception 'Los gastos están apagados en el flujo de uno de los vehículos.' using errcode = '23514';
    end if;
  end loop;
  if p_categoria is null then
    raise exception 'Elige una categoría de gasto activa.' using errcode = '23502', hint = 'categoria_id';
  end if;
  perform public._gasto_validar(p_vehiculos[1], null, p_categoria, p_monto, p_comprobante_ruta);
  c := public._monto_en_base(p_moneda, p_tipo_cambio, p_monto);
  v_centavos := (p_monto * 100)::bigint;
  v_cada := v_centavos / n;
  v_sobran := v_centavos % n;
  for i in 1 .. n loop
    v_parte := (v_cada + case when i <= v_sobran then 1 else 0 end)::numeric / 100;
    p := public._monto_en_base(p_moneda, c.tipo_cambio_id, v_parte, c.tipo_cambio_aplicado);
    insert into public.gastos (vehiculo_id, categoria_id, proveedor, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, fecha, comprobante_ruta,
                               notas, creado_por, lote_id)
    values (p_vehiculos[i], p_categoria, nullif(btrim(p_proveedor), ''), p_moneda, v_parte, p.tipo_cambio_id, p.tipo_cambio_aplicado, p.monto_base,
            coalesce(p_fecha, current_date), p_comprobante_ruta, nullif(btrim(p_notas), ''), (select auth.uid()), p_lote)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  return jsonb_build_object('lote', p_lote, 'ya_existia', false, 'ids', to_jsonb(v_ids));
end;
$$;

revoke all on function public.gastos_prorratear(uuid, uuid[], uuid, text, numeric, uuid, date, text, text, text) from public, anon;
grant execute on function public.gastos_prorratear(uuid, uuid[], uuid, text, numeric, uuid, date, text, text, text) to authenticated, service_role;
