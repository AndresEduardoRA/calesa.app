-- Importar todo (9.06-2, parte 2 de 5): la purga diaria de la importación total. El informe por fila (`importaciones_filas`, para «Descargar las
-- rechazadas») vive 30 días después de que la importación terminó o falló; los pases (`importaciones_pases`), 7 días. Por lotes de 10.000 y
-- hasta 10 por corrida, como `importaciones_vinculos_purgar` (`docs/RENDIMIENTO.md`). Aparte del job de cada 2 minutos, para que ése sea corto.

create or replace function public.importaciones_filas_purgar() returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare v_n integer; v_total integer := 0; i integer;
begin
  -- Las filas de una total terminada o fallida hace más de 30 días, por su clave primaria (importacion_id, fila).
  for i in 1..10 loop
    delete from public.importaciones_filas f
     where (f.importacion_id, f.fila) in (
       select y.importacion_id, y.fila from public.importaciones_filas y
        where y.importacion_id in (
          select im.id from public.importaciones im
           where im.archivo_ruta is not null and im.estado in ('terminada', 'fallida')
             and im.terminada_en < now() - interval '30 days')
        limit 10000);
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
    exit when v_n < 10000;
  end loop;

  -- Los pases de más de 7 días (pocos por importación: emitir reusa el vivo y el job manda uno cada 5 minutos a lo sumo).
  for i in 1..10 loop
    delete from public.importaciones_pases p
     where p.pase in (select q.pase from public.importaciones_pases q where q.creado_en < now() - interval '7 days' limit 10000);
    get diagnostics v_n = row_count;
    exit when v_n < 10000;
  end loop;
  return v_total;
end;
$$;

comment on function public.importaciones_filas_purgar() is
  'El job importaciones-filas-purgar: borra el informe por fila de las importaciones totales terminadas o fallidas hace más de 30 días y los '
  'pases de más de 7, de a 10.000 y hasta 10 lotes por corrida. Devuelve las filas del informe borradas.';
revoke all on function public.importaciones_filas_purgar() from public, anon, authenticated, service_role;

select cron.schedule('importaciones-filas-purgar', '50 3 * * *', 'select public.importaciones_filas_purgar()');
