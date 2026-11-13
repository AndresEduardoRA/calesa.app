-- Importar todo (9.06-2, parte 2 de 5): el job `importaciones-continuar`. La función edge `importar-csv` procesa por lotes mientras le dura el
-- tiempo; si se corta (tiempo, reinicio, un pedido que no llegó), la importación queda detenida en `pendiente` o `procesando`. Cada 2 minutos
-- el job toma hasta 5 detenidas (más de 2 minutos sin avance y sin un pase de los últimos 5) y le manda a la función un pase de cada una; la
-- función retoma desde `procesadas` (parte 1: idempotente por fila). A las 24 horas sin avance la deja `fallida` con su motivo. La URL sale de
-- Vault (`url_proyecto`) al correr, como `storage_gc_correr` (`20261028183622_jobs_con_la_url_del_proyecto.sql`): ningún `cron.job` la lleva
-- escrita (`supabase/tests/jobs.sql`). Sin `_programar`: la URL nunca se fija a mano en el comando.

-- El motivo de la que no avanzó en 24 horas (create or replace desde la parte 1, más una clave).
create or replace function public._importacion_motivo(p_clave text) returns text
  language sql immutable
  set search_path = ''
as $$
  select case p_clave
    when 'sin_permiso' then 'Quien importa ya no tiene el permiso para seguir.'
    when 'destino_no_puede' then 'La persona de destino ya no puede recibir leads.'
    when 'quien_importa_inactivo' then 'Quien importa está bloqueado o dado de baja.'
    when 'origen_inactivo' then 'El origen está desactivado.'
    when 'sin_avance' then 'La importación no avanzó en 24 horas: vuelve a subir el archivo.'
    else 'No se pudo seguir con la importación.'
  end;
$$;
revoke all on function public._importacion_motivo(text) from public, anon, authenticated, service_role;

-- Una corrida del job contra la dirección dada. Devuelve cuántos pedidos mandó. Sólo el pase viaja en el cuerpo: ni un id ni un dato de nadie.
create or replace function public.importaciones_continuar_disparar(p_url text) returns integer
  language plpgsql security definer
  set search_path = ''
as $_$
declare
  v_id uuid;
  v_pase uuid;
  v_n integer := 0;
begin
  if p_url is null or p_url !~ '^https?://[^[:space:]]+/functions/v1/importar-csv$' then
    raise exception 'La dirección de importar-csv no es válida.' using errcode = '22023';
  end if;

  -- 24 horas sin avance: fallida (hasta 50 por corrida; una que la función tiene tomada se salta). Sobre importaciones_en_curso_idx.
  for v_id in
    select i.id from public.importaciones i
     where i.archivo_ruta is not null and i.estado in ('pendiente', 'procesando')
       and coalesce(i.avance_en, i.creado_en) < now() - interval '24 hours'
     order by coalesce(i.avance_en, i.creado_en), i.id
     limit 50
     for update skip locked
  loop
    perform public._importacion_fallar(v_id, 'sin_avance');
  end loop;

  -- Hasta 5 detenidas: más de 2 minutos sin avance y sin un pase de los últimos 5 minutos. Sobre importaciones_en_curso_idx y, el pase
  -- reciente, sobre importaciones_pases_importacion_idx.
  for v_id in
    select i.id from public.importaciones i
     where i.archivo_ruta is not null and i.estado in ('pendiente', 'procesando')
       and coalesce(i.avance_en, i.creado_en) < now() - interval '2 minutes'
       and not exists (select 1 from public.importaciones_pases p
                        where p.importacion_id = i.id and p.creado_en > now() - interval '5 minutes')
     order by coalesce(i.avance_en, i.creado_en), i.id
     limit 5
     for update skip locked
  loop
    insert into public.importaciones_pases (importacion_id) values (v_id) returning pase into v_pase;
    perform net.http_post(url := p_url, body := jsonb_build_object('pase', v_pase),
      headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 60000);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$_$;

comment on function public.importaciones_continuar_disparar(text) is
  'Una corrida de importaciones-continuar contra esa dirección de importar-csv: deja fallidas las totales sin avance en 24 h (50 por corrida) '
  'y manda un pase a hasta 5 detenidas (2 min sin avance, sin pase reciente). Devuelve los pedidos mandados. Sólo service_role.';
revoke all on function public.importaciones_continuar_disparar(text) from public, anon, authenticated;
grant execute on function public.importaciones_continuar_disparar(text) to service_role;

-- El job: la dirección sale de Vault al correr. Sin el secreto, avisa y no hace nada.
create or replace function public.importaciones_continuar_correr() returns integer
  language plpgsql security definer
  set search_path = ''
as $$
declare v_url text := public._url_del_proyecto();
begin
  if v_url is null then
    raise warning 'importaciones-continuar no corrió: falta el secreto url_proyecto en Vault (lo pone scripts/demo/restaurar.sh).';
    return null;
  end if;
  return public.importaciones_continuar_disparar(v_url || '/functions/v1/importar-csv');
end;
$$;

comment on function public.importaciones_continuar_correr() is
  'El job importaciones-continuar: retoma las importaciones totales detenidas con la URL de Vault (url_proyecto). Sin el secreto, avisa y no hace nada.';
revoke all on function public.importaciones_continuar_correr() from public, anon, authenticated, service_role;

select cron.schedule('importaciones-continuar', '*/2 * * * *', 'select public.importaciones_continuar_correr()');
