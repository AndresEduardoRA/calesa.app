-- Actividad: la purga diaria por lotes (paso 9.01-1). `actividad_purgar()` existía desde la base y nunca se programó: borraba todo de una vez y,
-- de paso, `visitados` y `notificaciones`, que desde el 7.01 purga `notificaciones_purgar()` cada día (03:45). Ahora borra sólo la actividad de
-- más de `ajustes_empresa.actividad_dias` y los `eventos_web` de más de 12 meses, de a 10.000 y hasta 10 lotes por tabla y corrida (el patrón de
-- `notificaciones_purgar`): el primer pase, con la tabla sin purgar nunca, termina en varias noches sin una transacción enorme. Devuelve cuántas
-- filas de actividad borró. Sigue siendo sólo de service_role (el cron).

create or replace function public.actividad_purgar() returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c_lote constant int := 10000;
  c_lotes constant int := 10;
  v_dias int;
  v_corte timestamptz;
  v_n int;
  v_actividad int := 0;
begin
  select e.actividad_dias into v_dias from public.ajustes_empresa e where e.id = 1;
  v_corte := now() - make_interval(days => coalesce(v_dias, 14));
  for i in 1 .. c_lotes loop
    -- actividad_fecha_idx
    delete from public.actividad
    where id = any (array(select x.id from public.actividad x where x.creado_en < v_corte limit c_lote));
    get diagnostics v_n = row_count;
    v_actividad := v_actividad + v_n;
    exit when v_n < c_lote;
  end loop;
  for i in 1 .. c_lotes loop
    -- eventos_web_fecha_idx
    delete from public.eventos_web
    where id = any (array(select x.id from public.eventos_web x where x.creado_en < now() - interval '12 months' limit c_lote));
    get diagnostics v_n = row_count;
    exit when v_n < c_lote;
  end loop;
  return v_actividad;
end;
$$;

revoke all on function public.actividad_purgar() from public, anon, authenticated;
grant execute on function public.actividad_purgar() to service_role;

comment on function public.actividad_purgar() is
  'Purga diaria (9.01-1): la actividad de más de ajustes_empresa.actividad_dias y los eventos_web de más de 12 meses, por lotes de 10.000 y hasta 10 por tabla y corrida. Job actividad-purgar. notificaciones y visitados los purga notificaciones_purgar().';

-- 03:25 UTC: libre (importaciones-vinculos-purgar 03:35, notificaciones-purgar 03:45).
select cron.schedule('actividad-purgar', '25 3 * * *', 'select public.actividad_purgar()');
