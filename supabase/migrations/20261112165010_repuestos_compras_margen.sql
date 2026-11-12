-- El margen de un proyecto de repuestos, por moneda (paso 8.11-1, C9–C11).
--   C9. `repuestos_proyecto_margen(p_proyecto)`: `repuestos.costos.ver` y `repuestos.ver` (revela la suma de los precios de los ítems). PT409 si el proyecto
--       no existe o está eliminado.
--   C10. Por moneda: precios = Σ cantidad × precio_cliente de los ítems vivos con precio y moneda; compras = Σ monto de las compras vivas; margen = precios −
--        compras. Una moneda que falta en un lado suma 0 en ese lado.
--   C11. Nulo, no 0: con algún ítem vivo sin precio (o con precio y sin moneda, como lo deja la hoja celda a celda), el margen es nulo en todas las monedas.
--        `sin_precio` cuenta hasta 201 («más de 200»).

create or replace function public.repuestos_proyecto_margen(p_proyecto uuid) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare v_sin integer; v_monedas jsonb;
begin
  perform public.assert_permiso('repuestos.costos.ver');
  perform public.assert_permiso('repuestos.ver');
  if not exists (select 1 from public.repuestos_proyectos p where p.id = p_proyecto and p.eliminado_en is null) then
    raise exception 'Este proyecto ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;

  -- Los ítems por `repuestos_items_proyecto_id_idx`, con tope: 201 quiere decir «más de 200».
  select count(*)::integer into v_sin
    from (select 1
            from public.repuestos_items i
           where i.proyecto_id = p_proyecto and i.eliminado_en is null and (i.precio_cliente is null or i.moneda is null)
           limit 201) s;

  -- Las compras por `repuestos_compras_proyecto_id_idx`.
  select coalesce(jsonb_agg(jsonb_build_object('moneda', m.moneda, 'precios', m.precios, 'compras', m.compras,
                                               'margen', case when v_sin > 0 then null else m.precios - m.compras end)
                            order by m.moneda), '[]'::jsonb)
    into v_monedas
    from (select coalesce(pr.moneda, co.moneda) as moneda, coalesce(pr.total, 0) as precios, coalesce(co.total, 0) as compras
            from (select i.moneda::text as moneda, sum(i.cantidad * i.precio_cliente) as total
                    from public.repuestos_items i
                   where i.proyecto_id = p_proyecto and i.eliminado_en is null and i.precio_cliente is not null and i.moneda is not null
                   group by i.moneda) pr
            full join (select c.moneda::text as moneda, sum(c.monto) as total
                         from public.repuestos_compras c
                        where c.proyecto_id = p_proyecto and c.eliminado_en is null
                        group by c.moneda) co on co.moneda = pr.moneda) m;

  return jsonb_build_object('sin_precio', v_sin, 'monedas', v_monedas);
end;
$$;

revoke all on function public.repuestos_proyecto_margen(uuid) from public, anon;
grant execute on function public.repuestos_proyecto_margen(uuid) to authenticated, service_role;

update public.permisos
   set aplicado_en = 'policy repuestos_compras, policy pagos, policy gastos, policy repuestos_cotizaciones, comprobante_puede, repuestos_proyecto_margen'
 where clave = 'repuestos.costos.ver';
