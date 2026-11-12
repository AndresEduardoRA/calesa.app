-- 9.07 · Tablero: las métricas de cotizaciones en la base (la otra RPC del grupo; ver `tablero_leads`).
-- {desde, hasta, zona, creadas, finales, por_dia[], por_origen[], por_origen_hay_mas}
--   creadas: cotizaciones creadas en el período. finales: de ésas, las de clase final, cualquiera sea su estado (D6: no hay fecha de cuando se
--   marcó final, así que se cuenta por cohorte de creación). por_origen: hasta 10, por el origen de la cotización. Sólo cuentas, ningún monto, y
--   toda la empresa (D9): no mira niveles ni carteras porque no devuelve contenido.
create function public.tablero_cotizaciones(p_desde date, p_hasta date)
  returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_zona text;
  v_ini timestamptz;
  v_fin timestamptz;
  v jsonb;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('tablero.metricas.ver') then
    raise exception 'No tienes permiso para ver las métricas.' using errcode = '42501';
  end if;
  select w.zona, w.ini, w.fin into v_zona, v_ini, v_fin from public._tablero_ventana(p_desde, p_hasta) w;

  with creadas as materialized (
    -- cotizaciones_listado_idx: rango de creado_en, sin papelera.
    select c.origen_id, (c.creado_en at time zone v_zona)::date as dia, (c.clase = 'final')::int as fin_
      from public.cotizaciones c
     where c.eliminado_en is null and c.creado_en >= v_ini and c.creado_en < v_fin
  ), dias as (
    select d::date as dia from generate_series(p_desde::timestamp, p_hasta::timestamp, interval '1 day') d
  ), por_dia as (
    select d.dia, count(c.dia)::int as creadas, coalesce(sum(c.fin_), 0)::int as finales
      from dias d left join creadas c on c.dia = d.dia
     group by d.dia
  ), por_origen as (
    select g.origen_id, o.nombre, g.creadas, g.finales,
           row_number() over (order by g.creadas desc, g.finales desc, o.nombre, g.origen_id) as n
      from (select c.origen_id, count(*)::int as creadas, sum(c.fin_)::int as finales from creadas c group by c.origen_id) g
      join public.origenes o on o.id = g.origen_id
  )
  select jsonb_build_object(
           'desde', p_desde, 'hasta', p_hasta, 'zona', v_zona,
           'creadas', (select count(*)::int from creadas),
           'finales', (select coalesce(sum(c.fin_), 0)::int from creadas c),
           'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', d.dia, 'creadas', d.creadas, 'finales', d.finales) order by d.dia), '[]'::jsonb)
                         from por_dia d),
           'por_origen', (select coalesce(jsonb_agg(jsonb_build_object('origen_id', o.origen_id, 'nombre', o.nombre,
                                                                      'creadas', o.creadas, 'finales', o.finales) order by o.n), '[]'::jsonb)
                            from por_origen o where o.n <= 10),
           'por_origen_hay_mas', exists (select 1 from por_origen o where o.n > 10))
    into v;
  return v;
end;
$$;

revoke all on function public.tablero_cotizaciones(date, date) from public, anon, authenticated;
grant execute on function public.tablero_cotizaciones(date, date) to authenticated, service_role;

insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden)
values ('tablero.metricas.ver', 'tablero', 'Ver métricas', 'Tablero con métricas y gráficas', false, false, 'tablero_leads, tablero_cotizaciones', 660)
on conflict (clave) do update set aplicado_en = excluded.aplicado_en;
