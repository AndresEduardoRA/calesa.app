-- La purga de lo que ya no sirve (paso 7.01-1): cada día, las notificaciones leídas o accionadas de más de 90 días y los `visitados` de
-- más de 30. Una no leída y no accionada nunca se purga. Por lotes de 5.000, hasta 10 por tabla y corrida: el `limit` corta el
-- recorrido al llenar el lote y lo viejo está al principio. `actividad_purgar()` no se programa ni se toca: borra auditoría y es de la
-- Fase 9 (que las dos borren lo mismo cuando la programe es inocuo).

create or replace function public.notificaciones_purgar() returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  c_lote constant int := 5000;
  c_lotes constant int := 10;
  v_n int; v_notificaciones int := 0; v_visitados int := 0;
begin
  for i in 1 .. c_lotes loop
    delete from public.notificaciones
    where id = any (array(
      select x.id from public.notificaciones x
      where x.creado_en < now() - interval '90 days' and (x.leida_en is not null or x.accionada_en is not null)
      limit c_lote
    ));
    get diagnostics v_n = row_count;
    v_notificaciones := v_notificaciones + v_n;
    exit when v_n < c_lote;
  end loop;
  for i in 1 .. c_lotes loop
    delete from public.visitados v
    where (v.usuario_id, v.tipo, v.referencia_id) in (
      select x.usuario_id, x.tipo, x.referencia_id from public.visitados x
      where x.visto_en < now() - interval '30 days'
      limit c_lote
    );
    get diagnostics v_n = row_count;
    v_visitados := v_visitados + v_n;
    exit when v_n < c_lote;
  end loop;
  return jsonb_build_object('notificaciones', v_notificaciones, 'visitados', v_visitados);
end;
$$;

revoke all on function public.notificaciones_purgar() from public, anon, authenticated;
grant execute on function public.notificaciones_purgar() to service_role;

comment on function public.notificaciones_purgar() is
  'Purga diaria (7.01): notificaciones leídas o accionadas de más de 90 días y visitados de más de 30, por lotes de 5.000 y hasta 10 por tabla y corrida. Job notificaciones-purgar.';

-- 03:45 UTC: no choca con importaciones-vinculos-purgar (03:35) ni apibara-consultas-purgar (04:40).
select cron.schedule('notificaciones-purgar', '45 3 * * *', 'select public.notificaciones_purgar()');
