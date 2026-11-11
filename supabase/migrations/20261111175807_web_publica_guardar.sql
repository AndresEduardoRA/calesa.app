-- Revalidar la web pública (paso 8.06): `integracion_guardar` valida la dirección de revalidación de `web_publica`. Acepta `https://` con
-- host sin usuario ni clave, o `http://localhost|127.0.0.1` (para «Probar» en local y en el e2e; el job sólo le pega a `https://`), hasta
-- 2.000 caracteres; vacío guarda null. De la configuración de `web_publica` se guarda sólo `revalidar_url`: una clave de más no llega.
-- Encender no exige dirección ni secreto: sin ellos la cola espera. Lo demás, igual que en la base (`20261028180656_base.sql`).

create or replace function public.integracion_guardar(p_clave text, p_actualizado_en_esperado timestamptz, p_activa boolean default null, p_config jsonb default null)
  returns timestamptz
  language plpgsql security definer set search_path = '' as $_$
declare
  v public.integraciones;
  v_nueva timestamptz;
  v_config jsonb := p_config;
  v_url text;
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  select * into v from public.integraciones i where i.clave = p_clave for update;
  if not found then
    raise exception 'Esa integración no existe.';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta integración mientras la editabas.');
  if p_config is not null and jsonb_typeof(p_config) <> 'object' then
    raise exception 'La configuración no tiene la forma esperada.';
  end if;
  if v.clave = 'apibara' and p_config is not null
     and coalesce(p_config ->> 'endpoint', '') !~ '^https://([a-z0-9-]+\.)*apibara\.tech(:[0-9]+)?(/[^[:space:]]*)?$' then
    raise exception 'La dirección de apibara tiene que empezar con https:// y ser de apibara.tech.';
  end if;
  if v.clave = 'web_publica' and p_config is not null then
    v_url := nullif(btrim(coalesce(p_config ->> 'revalidar_url', '')), '');
    if v_url is not null and length(v_url) > 2000 then
      raise exception 'La dirección es demasiado larga.' using errcode = '22023', hint = 'revalidar_url';
    end if;
    if v_url is not null
       and v_url !~* '^https://[a-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$'
       and v_url !~* '^http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?(/[^[:space:]]*)?$' then
      raise exception 'La dirección de revalidación tiene que empezar con https://.' using errcode = '22023', hint = 'revalidar_url';
    end if;
    v_config := jsonb_build_object('revalidar_url', v_url);
  end if;
  if coalesce(p_activa, v.activa) and v.clave = 'apibara' and v.secreto_guardado_en is null then
    raise exception 'Guarda la clave de apibara antes de activarla.';
  end if;
  update public.integraciones i set
    activa = coalesce(p_activa, i.activa),
    config = coalesce(v_config, i.config),
    actualizado_por = (select auth.uid())
  where i.clave = v.clave
  returning i.actualizado_en into v_nueva;
  return v_nueva;
end;
$_$;
revoke all on function public.integracion_guardar(text, timestamptz, boolean, jsonb) from public, anon;
grant execute on function public.integracion_guardar(text, timestamptz, boolean, jsonb) to authenticated, service_role;
