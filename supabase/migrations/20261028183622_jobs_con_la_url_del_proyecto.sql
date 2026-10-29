-- Los jobs que llaman a una función edge (`storage-gc` y `avatares-miniaturas`) se programan solos, con la URL del proyecto
-- sacada de Vault (`url_proyecto`) cuando corren, no escrita en el comando. Antes había que llamar a mano
-- `storage_gc_programar(url)` y `avatares_miniaturas_programar(url)` después de cada reset (y sin eso la purga dejaba los archivos).
-- `url_proyecto` lo pone `scripts/demo/restaurar.sh` en la nube (con `SUPABASE_URL`) y el seed en local
-- (`http://api.supabase.internal:8000`, el gateway visto desde la base, igual en todo stack local). Sin el secreto, el job no hace nada
-- y deja un aviso en el log de la base. Las dos `*_programar(url)` siguen: sirven para fijar otra dirección a mano.

create or replace function public._url_del_proyecto() returns text
  language sql stable security definer set search_path = '' as $$
  select nullif(rtrim(btrim(s.decrypted_secret), '/'), '') from vault.decrypted_secrets s where s.name = 'url_proyecto' limit 1
$$;
comment on function public._url_del_proyecto() is
  'La URL del proyecto (secreto url_proyecto de Vault), sin la barra final, o null. La leen los jobs que llaman a una función edge.';
revoke all on function public._url_del_proyecto() from public, anon, authenticated, service_role;

create or replace function public.storage_gc_correr() returns bigint
  language plpgsql security definer set search_path = '' as $$
declare v_url text := public._url_del_proyecto();
begin
  if v_url is null then
    raise warning 'storage-gc no corrió: falta el secreto url_proyecto en Vault (lo pone scripts/demo/restaurar.sh).';
    return null;
  end if;
  return public.storage_gc_disparar(v_url || '/functions/v1/storage-gc');
end $$;
comment on function public.storage_gc_correr() is
  'El job storage-gc: dispara la función con la URL de Vault (url_proyecto). Sin el secreto, avisa y no hace nada.';
revoke all on function public.storage_gc_correr() from public, anon, authenticated, service_role;

create or replace function public.avatares_miniaturas_correr() returns bigint
  language plpgsql security definer set search_path = '' as $$
declare v_url text := public._url_del_proyecto();
begin
  if v_url is null then
    raise warning 'avatares-miniaturas no corrió: falta el secreto url_proyecto en Vault (lo pone scripts/demo/restaurar.sh).';
    return null;
  end if;
  return public.avatares_miniaturas_disparar(v_url || '/functions/v1/avatares-miniaturas');
end $$;
comment on function public.avatares_miniaturas_correr() is
  'El job avatares-miniaturas: dispara la función con la URL de Vault (url_proyecto). Sin el secreto, avisa y no hace nada.';
revoke all on function public.avatares_miniaturas_correr() from public, anon, authenticated, service_role;

-- `avatares_miniaturas_disparar` y su `_programar` dependían del privilegio por defecto para `service_role`: ahora es explícito, como
-- en las de storage-gc.
grant execute on function public.avatares_miniaturas_disparar(text), public.avatares_miniaturas_programar(text) to service_role;

select cron.schedule('storage-gc', '17 * * * *', 'select public.storage_gc_correr()');
select cron.schedule('avatares-miniaturas', '23 * * * *', 'select public.avatares_miniaturas_correr()');
