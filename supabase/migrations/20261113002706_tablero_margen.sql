-- 9.11 · Tablero: el margen del mes en la base (otra RPC por grupo de widgets, como `tablero_leads` y `tablero_cotizaciones` del 9.07).
-- {desde, hasta, zona, moneda, vehiculos, venta, real, cotizado, margen, sin_venta, por_origen[], por_origen_hay_mas}
--   Cohorte (D3): el vehículo vivo, de un origen donde quien llama tiene `logistica.margen.ver`, cuyo ÚLTIMO pago confirmado vivo tiene `confirmado_en`
--   en el período (días en la zona de la empresa, D1). Su venta son TODOS sus pagos confirmados vivos, su real los gastos vivos y su cotizado la final
--   activa: el mismo número que `margen_vehiculo` y que el panel de la unidad, y un vehículo pagado en dos meses no suma dos veces. Consecuencia: un mes
--   pasado cambia si después se confirma (o se anula) un pago de uno de sus vehículos. Sólo vehículos (D5); todo en moneda base (`monto_base`).
--   Sin vehículos en la cohorte, venta, real, cotizado y margen son nulos, nunca 0. `cotizado` es nulo si ningún vehículo tiene final (D9).
--   sin_venta (D4): vehículos con un pago vivo sin confirmar de `fecha` en el período y ningún pago confirmado vivo; no suman a nada.
--   Pago a medias (D2): la base no guarda precio ni saldo, así que se suma lo confirmado tal cual.
--   por_origen: hasta 10, por margen (nulos al final), nombre e id; los totales cuentan todos los orígenes.

-- El rango de `confirmado_en` de los pagos confirmados vivos de un vehículo (no hay otro índice por esa columna).
create index pagos_tablero_confirmado_idx on public.pagos (confirmado_en)
  where confirmado and eliminado_en is null and vehiculo_id is not null;

create function public.tablero_margen(p_desde date, p_hasta date)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_origenes uuid[];
  v_zona text;
  v_ini timestamptz;
  v_fin timestamptz;
  v_moneda text;
  v jsonb;
begin
  perform public.assert_permiso('logistica.margen.ver');
  v_origenes := public.origenes_con_alcance('logistica.margen.ver', 'propios');
  select w.zona, w.ini, w.fin into v_zona, v_ini, v_fin from public._tablero_ventana(p_desde, p_hasta) w;
  select e.moneda_base::text into v_moneda from public.ajustes_empresa e where e.id = 1;

  with cohorte as materialized (
    -- pagos_tablero_confirmado_idx: rango de confirmado_en; el pago confirmado posterior, por pagos_vehiculo_idx.
    select p.vehiculo_id, v.origen_id
      from public.pagos p
      join public.vehiculos v on v.id = p.vehiculo_id
     where p.confirmado and p.eliminado_en is null and p.vehiculo_id is not null
       and p.confirmado_en >= v_ini and p.confirmado_en < v_fin
       and v.eliminado_en is null and v.origen_id = any (v_origenes)
       and not exists (select 1 from public.pagos q
                        where q.vehiculo_id = p.vehiculo_id and q.confirmado and q.eliminado_en is null and q.confirmado_en >= v_fin)
     group by p.vehiculo_id, v.origen_id
  ), por_vehiculo as materialized (
    -- Lo mismo que margen_vehiculo: pagos_vehiculo_idx, gastos_vehiculo_idx y cotizaciones_final_por_vehiculo (una final activa por vehículo).
    select c.vehiculo_id, c.origen_id,
           (select sum(p.monto_base) from public.pagos p
             where p.vehiculo_id = c.vehiculo_id and p.confirmado and p.eliminado_en is null) as venta,
           (select coalesce(sum(g.monto_base), 0) from public.gastos g
             where g.vehiculo_id = c.vehiculo_id and g.eliminado_en is null) as real_,
           (select k.total_base from public.cotizaciones k
             where k.vehiculo_id = c.vehiculo_id and k.clase = 'final' and k.estado = 'activa' and k.eliminado_en is null) as cotizado
      from cohorte c
  ), sin_venta as materialized (
    -- pagos_fecha_idx: rango de fecha de los pagos vivos.
    select distinct p.vehiculo_id, v.origen_id
      from public.pagos p
      join public.vehiculos v on v.id = p.vehiculo_id
     where p.eliminado_en is null and not p.confirmado and p.vehiculo_id is not null
       and p.fecha >= p_desde and p.fecha <= p_hasta
       and v.eliminado_en is null and v.origen_id = any (v_origenes)
       and not exists (select 1 from public.pagos q where q.vehiculo_id = p.vehiculo_id and q.confirmado and q.eliminado_en is null)
  ), por_origen as (
    select o.id as origen_id, o.nombre, coalesce(a.vehiculos, 0) as vehiculos, a.venta, a.real_, a.cotizado,
           a.venta - a.real_ as margen, coalesce(s.n, 0) as sin_venta,
           row_number() over (order by a.venta - a.real_ desc nulls last, o.nombre, o.id) as n
      from (select pv.origen_id, count(*)::int as vehiculos, sum(pv.venta) as venta, sum(pv.real_) as real_, sum(pv.cotizado) as cotizado
              from por_vehiculo pv group by pv.origen_id) a
      full join (select sv.origen_id, count(*)::int as n from sin_venta sv group by sv.origen_id) s on s.origen_id = a.origen_id
      join public.origenes o on o.id = coalesce(a.origen_id, s.origen_id)
  )
  select jsonb_build_object(
           'desde', p_desde, 'hasta', p_hasta, 'zona', v_zona, 'moneda', v_moneda,
           'vehiculos', t.vehiculos, 'venta', t.venta, 'real', t.real_, 'cotizado', t.cotizado, 'margen', t.venta - t.real_,
           'sin_venta', (select count(*)::int from sin_venta),
           'por_origen', (select coalesce(jsonb_agg(jsonb_build_object('origen_id', o.origen_id, 'nombre', o.nombre, 'vehiculos', o.vehiculos,
                                                                      'venta', o.venta, 'real', o.real_, 'cotizado', o.cotizado,
                                                                      'margen', o.margen, 'sin_venta', o.sin_venta) order by o.n), '[]'::jsonb)
                            from por_origen o where o.n <= 10),
           'por_origen_hay_mas', exists (select 1 from por_origen o where o.n > 10))
    into v
    from (select count(*)::int as vehiculos, sum(pv.venta) as venta, sum(pv.real_) as real_, sum(pv.cotizado) as cotizado
            from por_vehiculo pv) t;
  return v;
end;
$$;

comment on function public.tablero_margen(date, date) is 'Margen del período en moneda base: {desde, hasta, zona, moneda, vehiculos, venta, real, cotizado, margen, sin_venta, por_origen (hasta 10), por_origen_hay_mas}. Cohorte: el vehículo cuyo último pago confirmado cae en el período, con todos sus pagos confirmados (el mismo margen que margen_vehiculo; un mes pasado cambia si después se confirma o anula un pago). Nulos sin vehículos, nunca 0; sin_venta = pagos sin confirmar del período y ningún confirmado. Pide logistica.margen.ver y sólo mira sus orígenes (9.11, D1–D9).';

revoke all on function public.tablero_margen(date, date) from public, anon, authenticated;
grant execute on function public.tablero_margen(date, date) to authenticated, service_role;

update public.permisos set aplicado_en = 'margen_vehiculo, tablero_margen' where clave = 'logistica.margen.ver';
