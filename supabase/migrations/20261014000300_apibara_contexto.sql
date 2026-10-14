-- apibara_contexto: el uso de la cuenta no es de un origen. Escrito a mano.
--
-- La función la llama la edge function `apibara` antes de leer la clave. Para ver el uso de la
-- cuenta (`/usage`) no hay origen: hay que saber si quien llama gestiona los ajustes de la
-- empresa, también cuando el origen no existe o no es de subasta. Mismo contrato que antes, con
-- `puede_ver_uso` presente en toda respuesta.
create or replace function public.apibara_contexto(p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_int public.integraciones; v_origen public.origenes; v_plat text[]; v_config text[]; v_uso boolean;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('aplica', false, 'puede_ver_uso', false);
  end if;
  v_uso := public.tiene_permiso('empresa.ajustes.gestionar');
  select * into v_int from public.integraciones i where i.clave = 'apibara';
  select * into v_origen from public.origenes o where o.id = p_origen;
  if p_origen is null or not found or v_origen.tipo <> 'subasta' then
    return jsonb_build_object('aplica', false, 'puede_ver_uso', v_uso);
  end if;
  select coalesce(array_agg(x), '{}') into v_config from jsonb_array_elements_text(coalesce(v_int.config -> 'plataformas', '[]'::jsonb)) x;
  v_plat := case when cardinality(v_origen.apibara_plataformas) = 0 then v_config
                 else (select coalesce(array_agg(p), '{}') from unnest(v_origen.apibara_plataformas) p where p = any (v_config)) end;
  return jsonb_build_object(
    'aplica', true,
    'activa', coalesce(v_int.activa, false) and v_int.secreto_guardado_en is not null,
    'endpoint', v_int.config ->> 'endpoint',
    'plataformas', to_jsonb(v_plat),
    'puede_crear', public.tiene_permiso('vehiculos.crear', p_origen),
    'puede_editar', public.tiene_permiso('vehiculos.editar', p_origen),
    'puede_ver_uso', v_uso);
end;
$$;
revoke all on function public.apibara_contexto(uuid) from public, anon;
grant execute on function public.apibara_contexto(uuid) to authenticated;
