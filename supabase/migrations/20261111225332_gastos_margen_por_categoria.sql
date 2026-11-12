-- El margen de un vehículo suma el real por categoría (paso 6.10-2, C10–C11).
--   C10. `margen_vehiculo` (desde la base) conserva sus cinco claves y suma `por_categoria`: una entrada `{categoria_id, nombre, proposito, real}` por
--        categoría con algún gasto vivo del vehículo, en el orden del catálogo; sin gastos, `[]`. La suma de los `real` es `real`.
--   C11. Un vehículo inexistente o en la papelera da 42501 con el mismo texto que sin la clave (D8): antes devolvía ceros a quien tenía la clave en otro
--        origen. Sigue: `margen` nulo sin pagos confirmados (nunca 0) y `desviacion` nula sin cotización final activa.

create or replace function public.margen_vehiculo(p_vehiculo uuid) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_origen uuid; cot numeric; real numeric; venta numeric; v_por jsonb;
begin
  select origen_id into v_origen from public.vehiculos where id = p_vehiculo and eliminado_en is null;
  if v_origen is null then
    perform public.assert_activo();
    raise exception 'No tienes el permiso «%».', 'logistica.margen.ver' using errcode = '42501';
  end if;
  perform public.assert_permiso('logistica.margen.ver', v_origen);
  select total_base into cot from public.cotizaciones where vehiculo_id = p_vehiculo and clase = 'final' and estado = 'activa' and eliminado_en is null;
  -- gastos_vehiculo_idx.
  select coalesce(jsonb_agg(jsonb_build_object('categoria_id', c.id, 'nombre', c.nombre, 'proposito', c.proposito, 'real', s.suma)
                            order by c.orden, c.nombre, c.id), '[]'::jsonb),
         coalesce(sum(s.suma), 0)
    into v_por, real
    from (select g.categoria_id, sum(g.monto_base) as suma
            from public.gastos g
           where g.vehiculo_id = p_vehiculo and g.eliminado_en is null
           group by g.categoria_id) s
    join public.categorias_gasto c on c.id = s.categoria_id;
  select sum(monto_base) into venta from public.pagos where vehiculo_id = p_vehiculo and confirmado and eliminado_en is null;
  return jsonb_build_object('cotizado', cot, 'real', real, 'desviacion', case when cot is null then null else cot - real end, 'venta', venta,
                            'margen', case when venta is null then null else venta - real end, 'por_categoria', v_por);
end;
$$;

comment on function public.margen_vehiculo(uuid) is 'Cotizado (la final activa), real (gastos vivos en moneda base), desviación (nula sin final), venta (pagos confirmados; nula sin ninguno), margen (nulo sin venta) y por_categoria ([{categoria_id, nombre, proposito, real}], en el orden del catálogo). Pide logistica.margen.ver del origen; un vehículo inexistente o en la papelera da el mismo 42501 (6.10-2, C10–C11).';
