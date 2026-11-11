-- Revalidar la web pública (paso 8.06): el job `web-revalidar`, cada minuto. Si la integración `web_publica` está activa, tiene una
-- dirección `https://` en `config.revalidar_url` y su secreto en Vault (`integracion:web_publica`), le manda al sitio un solo pedido con
-- las etiquetas pendientes (`{"etiquetas": [...]}`, ordenadas y sin repetir) y el secreto en la cabecera `Authorization`; nunca en el
-- cuerpo ni en el comando del job. Si falta algo, no envía ni pierde nada: sólo compacta la cola (sin eso, apagada crecería una fila por
-- transacción para siempre). Una dirección `http://` de loopback la acepta `integracion_guardar` para «Probar» en local, pero el job
-- no le pega: pg_net nunca llama a un puerto local del servidor de la base.

create or replace function public.web_revalidar_correr() returns bigint
  language plpgsql security definer set search_path = '' as $$
declare
  v public.integraciones;
  v_url text;
  v_secreto text;
  v_etiquetas text[];
  v_puede boolean;
begin
  select * into v from public.integraciones i where i.clave = 'web_publica';
  v_url := nullif(btrim(coalesce(v.config ->> 'revalidar_url', '')), '');
  v_puede := coalesce(v.activa, false) and v_url is not null and v_url ~* '^https://';
  if v_puede then
    v_secreto := nullif(btrim(coalesce(public.integracion_secreto('web_publica'), '')), '');
    v_puede := v_secreto is not null;
  end if;
  if not v_puede then
    -- Lo pendiente se queda; sólo se borran las filas repetidas (todas las que se ven están confirmadas: queda la más vieja de cada etiqueta).
    delete from interno.web_revalidar_pendiente a
    where exists (
      select 1 from interno.web_revalidar_pendiente b where b.etiqueta = a.etiqueta and b.id < a.id
    );
    return null;
  end if;
  -- Borra sólo lo confirmado que ve; lo que otra transacción todavía no confirma queda para el minuto siguiente.
  with enviadas as (
    delete from interno.web_revalidar_pendiente returning etiqueta
  )
  select coalesce(array_agg(distinct e.etiqueta order by e.etiqueta), '{}') into v_etiquetas from enviadas e;
  if cardinality(v_etiquetas) = 0 then
    return null;
  end if;
  return net.http_post(
    url => v_url,
    body => jsonb_build_object('etiquetas', to_jsonb(v_etiquetas)),
    headers => jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secreto),
    timeout_milliseconds => 5000
  );
end $$;
comment on function public.web_revalidar_correr() is
  'El job web-revalidar: si web_publica está activa, con dirección https:// y secreto, manda las etiquetas pendientes al sitio (secreto sólo en la cabecera) y vacía la cola; si no, no envía ni pierde nada.';
revoke all on function public.web_revalidar_correr() from public, anon, authenticated;
grant execute on function public.web_revalidar_correr() to service_role;

select cron.schedule('web-revalidar', '* * * * *', 'select public.web_revalidar_correr()');
