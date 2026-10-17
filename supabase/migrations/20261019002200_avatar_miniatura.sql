-- El avatar chico (cierre 1 de la Fase 3).
--
-- La lista del equipo dibujaba el avatar de 512 px a 32. Ahora cada perfil guarda también una miniatura de 96 px
-- (`avatar_miniatura_ruta`): al subir, el navegador saca los dos tamaños de una sola decodificación; lo que ya existía lo
-- rellena por lotes la edge function `avatares-miniaturas` (cada hora, con un pase de un uso, como storage-gc), que marca
-- `avatar_miniatura_fallo_en` en una imagen que no puede leer para no reintentarla cada hora.
--
-- La miniatura es siempre del avatar vigente: cambiar `avatar_ruta` sin una miniatura nueva la deja nula (la vuelve a
-- hacer el relleno). Una miniatura que se reemplaza o se quita se encola en `cola_gc_storage` y la borra storage-gc
-- recontando (`storage_refcount` la cuenta); una que vuelve a usarse se rescata de la cola antes de que la reclamen.

alter table public.perfiles add column if not exists avatar_miniatura_ruta text;
alter table public.perfiles add column if not exists avatar_miniatura_fallo_en timestamptz;
grant update (avatar_miniatura_ruta) on table public.perfiles to authenticated;

create or replace function public.storage_refcount(p_bucket text, p_ruta text)
returns int language sql stable security definer set search_path = '' as $$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_miniatura_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta)) +
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$$;

create or replace function public.perfil_avatar_coherente()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.avatar_ruta is distinct from old.avatar_ruta then
    new.avatar_miniatura_fallo_en := null;
    -- Cambió el avatar y la miniatura no: era la del anterior.
    if new.avatar_miniatura_ruta is not distinct from old.avatar_miniatura_ruta then
      new.avatar_miniatura_ruta := null;
    end if;
  end if;
  if new.avatar_miniatura_ruta is distinct from old.avatar_miniatura_ruta and new.avatar_miniatura_ruta is not null then
    -- La carpeta es la persona, como el avatar (la policy de Storage sólo deja subir a la propia).
    if split_part(new.avatar_miniatura_ruta, '/', 1) <> new.id::text then
      raise exception 'La miniatura no es de esta persona.' using errcode = '22023', hint = 'avatar_miniatura_ruta';
    end if;
    perform public.storage_gc_rescatar('avatares', new.avatar_miniatura_ruta);
  end if;
  return new;
end;
$$;
revoke all on function public.perfil_avatar_coherente() from public, anon, authenticated;
drop trigger if exists trg_perfil_avatar_coherente on public.perfiles;
create trigger trg_perfil_avatar_coherente before update of avatar_ruta, avatar_miniatura_ruta on public.perfiles
  for each row execute function public.perfil_avatar_coherente();

create or replace function public.perfil_avatar_encolar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.avatar_miniatura_ruta is not null and old.avatar_miniatura_ruta is distinct from new.avatar_miniatura_ruta then
    insert into public.cola_gc_storage (bucket, ruta) values ('avatares', old.avatar_miniatura_ruta) on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke all on function public.perfil_avatar_encolar() from public, anon, authenticated;
drop trigger if exists trg_perfil_avatar_encolar on public.perfiles;
create trigger trg_perfil_avatar_encolar after update of avatar_ruta, avatar_miniatura_ruta on public.perfiles
  for each row execute function public.perfil_avatar_encolar();

-- El relleno (sólo service_role): los que tienen avatar y no miniatura (ni un fallo anotado), y cómo guardar cada uno. Las
-- dos escrituras miran que el avatar siga siendo el mismo: si la persona lo cambió mientras tanto, no se pisa nada.
create or replace function public.avatares_miniaturas_pendientes(p_max int)
returns table (usuario_id uuid, avatar_ruta text) language sql stable security definer set search_path = '' as $$
  select p.id, p.avatar_ruta from public.perfiles p
   where p.avatar_ruta is not null and p.avatar_miniatura_ruta is null and p.avatar_miniatura_fallo_en is null
   order by p.id
   limit public._acotar_pagina(p_max, 20, 100);
$$;

create or replace function public.avatar_miniatura_guardar(p_usuario uuid, p_avatar_ruta text, p_miniatura text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.perfiles set avatar_miniatura_ruta = p_miniatura
   where id = p_usuario and avatar_ruta = p_avatar_ruta and avatar_miniatura_ruta is null;
  return found;
end;
$$;

create or replace function public.avatar_miniatura_fallo(p_usuario uuid, p_avatar_ruta text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.perfiles set avatar_miniatura_fallo_en = now()
   where id = p_usuario and avatar_ruta = p_avatar_ruta and avatar_miniatura_ruta is null;
  return found;
end;
$$;

-- El job: le pide a la función que rellene, con un pase de un uso (los mismos de storage-gc: `cola_gc_pases`).
create or replace function public.avatares_miniaturas_disparar(p_url text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_pase uuid; v_pedido bigint;
begin
  if p_url is null or p_url !~ '^https?://[^[:space:]]+/functions/v1/avatares-miniaturas$' then
    raise exception 'La dirección de avatares-miniaturas no es válida.' using errcode = '22023';
  end if;
  insert into public.cola_gc_pases default values returning pase into v_pase;
  select net.http_post(url := p_url, body := jsonb_build_object('pase', v_pase),
    headers := jsonb_build_object('Content-Type', 'application/json'), timeout_milliseconds := 60000) into v_pedido;
  return v_pedido;
end;
$$;

create or replace function public.avatares_miniaturas_programar(p_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_url is null or p_url !~ '^https?://[^[:space:]]+/functions/v1/avatares-miniaturas$' then
    raise exception 'La dirección de avatares-miniaturas no es válida.' using errcode = '22023';
  end if;
  perform cron.schedule('avatares-miniaturas', '23 * * * *', format('select public.avatares_miniaturas_disparar(%L)', p_url));
end;
$$;

revoke all on function public.avatares_miniaturas_pendientes(int), public.avatar_miniatura_guardar(uuid, text, text),
  public.avatar_miniatura_fallo(uuid, text), public.avatares_miniaturas_disparar(text), public.avatares_miniaturas_programar(text)
  from public, anon, authenticated;
grant execute on function public.avatares_miniaturas_pendientes(int), public.avatar_miniatura_guardar(uuid, text, text),
  public.avatar_miniatura_fallo(uuid, text) to service_role;
