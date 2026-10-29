-- Los jobs que llaman a una función edge (`20261028183622_jobs_con_la_url_del_proyecto.sql`): están programados después de un reset y
-- leen la URL del proyecto de Vault (`url_proyecto`) cuando corren. Que de verdad lleguen a `storage-gc` y vuelvan con 200 lo prueba
-- `supabase/tests/jobs-de-verdad.sh`, contra la base local con las funciones servidas. Corre antes de `humo.sql` (que reprograma
-- `storage-gc` con una dirección a mano) y cada bloque deja la base como la encontró.

-- @test los jobs de las funciones edge están programados, sin una URL escrita en el comando
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'storage-gc' and command = 'select public.storage_gc_correr()') then
    raise exception 'falta el job storage-gc que lee la URL de Vault';
  end if;
  if not exists (select 1 from cron.job where jobname = 'avatares-miniaturas' and command = 'select public.avatares_miniaturas_correr()') then
    raise exception 'falta el job avatares-miniaturas que lee la URL de Vault';
  end if;
  if exists (select 1 from cron.job where command ~ 'https?://') then
    raise exception 'un job lleva una URL escrita en su comando';
  end if;
end $$;

-- @test sin url_proyecto el job no hace nada; con ella dispara la función en su dirección
begin;
delete from vault.secrets where name = 'url_proyecto';
do $$
declare n0 bigint := (select count(*) from net.pedidos);
begin
  if public.storage_gc_correr() is not null or public.avatares_miniaturas_correr() is not null then
    raise exception 'sin url_proyecto un job devolvió un pedido';
  end if;
  if (select count(*) from net.pedidos) <> n0 then
    raise exception 'sin url_proyecto un job mandó un pedido';
  end if;
end $$;
select vault.create_secret('https://abc.supabase.co/', 'url_proyecto', 'prueba');
do $$
begin
  perform public.storage_gc_correr();
  perform public.avatares_miniaturas_correr();
  if not exists (select 1 from net.pedidos where url = 'https://abc.supabase.co/functions/v1/storage-gc') then
    raise exception 'storage-gc no fue a su dirección (con la barra final de la URL quitada)';
  end if;
  if not exists (select 1 from net.pedidos where url = 'https://abc.supabase.co/functions/v1/avatares-miniaturas') then
    raise exception 'avatares-miniaturas no fue a su dirección';
  end if;
end $$;
rollback;

-- @test ningún rol de la app corre un job ni lee la URL del proyecto
do $$
begin
  if has_function_privilege('authenticated', 'public._url_del_proyecto()', 'execute')
     or has_function_privilege('anon', 'public._url_del_proyecto()', 'execute')
     or has_function_privilege('authenticated', 'public.storage_gc_correr()', 'execute')
     or has_function_privilege('authenticated', 'public.avatares_miniaturas_correr()', 'execute') then
    raise exception 'un rol de la app puede correr un job o leer la URL del proyecto';
  end if;
end $$;
