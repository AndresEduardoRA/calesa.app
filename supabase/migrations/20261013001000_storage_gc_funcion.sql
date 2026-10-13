-- storage-gc: el job que le pide a la función que limpie, y cómo se autentica. Escrito a mano.
--
-- El protocolo de la limpieza ya estaba en SQL (`…000400_storage_gc.sql`): reclamar bajo candado,
-- borrar por la API, confirmar. Faltaba quien borre (la edge function `storage-gc`) y quien la
-- llame. Acá:
--   pg_cron y pg_net — nunca se habían instalado: ningún job de `…000800` se programó jamás
--   storage_gc_disparar(url)  — crea un pase de un solo uso y se lo manda a la función por pg_net
--   storage_gc_abrir(pase)    — lo llama la función con su service key: quema el pase o dice que no
--   storage_gc_programar(url) — programa el job de cada hora; es un paso por despliegue
--   storage_gc_pendiente()    — para la pantalla: cuánto lleva esperando lo que ya debía borrarse
-- y el job diario de la purga automática de la papelera.
--
-- Por qué un pase y no un secreto compartido: quien llama es la base, y la base no tiene entorno
-- donde guardar un secreto de infraestructura; tendría que vivir en Vault (que es para lo que el
-- dueño edita desde la interfaz) o en claro en `cron.job`. Con el pase la base no guarda nada: el
-- único secreto es la service key que el runtime le inyecta a la función, y con ella la función
-- le pregunta a la base si el pase es suyo. Sin un pase válido la función no hace nada.

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
-- Sólo donde existen: el Postgres embebido de `pnpm db:probar` no las trae y usa dobles de
-- `cron.schedule()` y `net.http_post()`.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- El barrido de huérfanos, sin recorrer el mapa entero por cada objeto
-- ---------------------------------------------------------------------------
-- Antes llamaba a `storage_refcount()` (trece subconsultas) por cada objeto del bucket. En
-- `vehiculos` sólo una tabla referencia objetos: alcanza con un anti-join contra sus dos columnas.
create or replace function public.storage_gc_encolar_huerfanos(p_bucket text, p_gracia interval)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_bucket = 'vehiculos' then
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'vehiculos'
      and o.created_at < now() - p_gracia
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta = o.name)
      and not exists (select 1 from public.vehiculos_imagenes i where i.ruta_miniatura = o.name)
      and not exists (select 1 from public.cola_gc_storage c where c.bucket = 'vehiculos' and c.ruta = o.name)
    on conflict do nothing;
  else
    insert into public.cola_gc_storage (bucket, ruta, encolado_en)
    select o.bucket_id, o.name, o.created_at
    from storage.objects o
    where o.bucket_id = p_bucket
      and o.created_at < now() - p_gracia
      and public.storage_refcount(o.bucket_id, o.name) = 0
    on conflict do nothing;
  end if;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- El pase
-- ---------------------------------------------------------------------------
-- pg_net manda el pedido recién cuando la transacción confirma: el pase ya existe cuando llega.
create or replace function public.storage_gc_disparar(p_url text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_pase uuid; v_pedido bigint;
begin
  if p_url is null or p_url !~ '^https?://[^[:space:]]+/functions/v1/storage-gc$' then
    raise exception 'La dirección de storage-gc no es válida.' using errcode = '22023';
  end if;
  delete from public.cola_gc_pases p where p.creado_en < now() - interval '7 days';
  insert into public.cola_gc_pases default values returning pase into v_pase;
  select net.http_post(url := p_url, body := jsonb_build_object('pase', v_pase),
    headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 60000) into v_pedido;
  return v_pedido;
end;
$$;

-- Vale una vez y por diez minutos. El `update … where usado_en is null` es la carrera: de dos
-- pedidos con el mismo pase, uno solo lo quema.
create or replace function public.storage_gc_abrir(p_pase uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.cola_gc_pases p set usado_en = now()
  where p.pase = p_pase and p.usado_en is null and p.creado_en > now() - interval '10 minutes';
  return found;
end;
$$;

-- Un paso por despliegue: la dirección de la función no se puede saber desde una migración.
-- Reprogramar con otra dirección reemplaza el job (pg_cron lo identifica por nombre).
create or replace function public.storage_gc_programar(p_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_url is null or p_url !~ '^https?://[^[:space:]]+/functions/v1/storage-gc$' then
    raise exception 'La dirección de storage-gc no es válida.' using errcode = '22023';
  end if;
  perform cron.schedule('storage-gc', '17 * * * *', format('select public.storage_gc_disparar(%L)', p_url));
end;
$$;

revoke all on function public.storage_gc_disparar(text), public.storage_gc_abrir(uuid), public.storage_gc_programar(text) from public, anon, authenticated;
grant execute on function public.storage_gc_disparar(text), public.storage_gc_abrir(uuid), public.storage_gc_programar(text) to service_role;

-- ---------------------------------------------------------------------------
-- La señal de que la limpieza no está corriendo
-- ---------------------------------------------------------------------------
-- pg_cron da por bueno un job que sólo encola un pedido HTTP: si la función no responde, nadie se
-- entera. Esto le dice a quien puede vaciar la papelera cuántos objetos llevan más de tres horas
-- pudiendo borrarse (tres corridas) y desde cuándo. Nulo para los demás.
create or replace function public.storage_gc_pendiente()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.assert_activo();
  if not public.tiene_permiso('vehiculos.papelera.purgar') then
    return null;
  end if;
  select jsonb_build_object('objetos', count(*), 'desde', min(c.encolado_en) + public._gracia_de_storage()) into v
  from public.cola_gc_storage c
  where c.encolado_en < now() - public._gracia_de_storage() - interval '3 hours';
  return v;
end;
$$;
revoke all on function public.storage_gc_pendiente() from public, anon;
grant execute on function public.storage_gc_pendiente() to authenticated;

-- ---------------------------------------------------------------------------
-- El job de la purga automática
-- ---------------------------------------------------------------------------
-- `…000800` lo programaba «si pg_cron está habilitado», y nunca lo estuvo. Los otros cuatro jobs
-- de aquel bloque (recordatorios, web-expirar, alertas-demora, actividad-purgar) siguen sin
-- programar: cada uno llega con su fase.
do $$
begin
  if to_regprocedure('cron.schedule(text, text, text)') is null then
    raise exception 'pg_cron no está disponible: la papelera no se purgaría nunca sola.';
  end if;
  perform cron.schedule('papelera-purgar', '30 3 * * *', 'select public.papelera_purgar_vencidos()');
end $$;
