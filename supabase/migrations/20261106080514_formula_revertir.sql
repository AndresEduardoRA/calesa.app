-- 4.20-1: revertir la fórmula de un origen a una versión archivada. Publica la N+1 como copia de esa versión, con su definición, sus params y su
-- diseño (4-8), por `_publicar_version`: el candado del origen, la esperada y sin tocar el borrador. Un nivel retirado en el diseño elegido se
-- rechaza como al publicar un borrador (P7). docs/COTIZADOR.md › «Versiones (4.20-1)».
create function public.formula_revertir(p_origen uuid, p_version uuid, p_nota text, p_publicada_esperada uuid) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_v public.formulas; v_estado text;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_publicada_esperada is null then
    raise exception 'Revertir pide la versión publicada que tienes.' using errcode = '22023', hint = 'publicada_esperada';
  end if;
  -- Una versión de otro origen y una que no existe dan el mismo texto: no se delata ninguna fila.
  select * into v_v from public.formulas f where f.id = p_version and f.origen_id = p_origen;
  if v_v.id is null then raise exception 'Esa versión no es de este origen.' using errcode = '22023', hint = 'version'; end if;
  v_estado := v_v.estado::text;
  if v_estado = 'publicada' then raise exception 'Esa ya es la versión publicada.' using errcode = '22023', hint = 'version'; end if;
  if v_estado = 'borrador' then raise exception 'Un borrador no se revierte: se publica.' using errcode = '22023', hint = 'version'; end if;
  return public._publicar_version(p_origen, v_v.definicion, v_v.params, v_v.diseno, p_nota, p_publicada_esperada,
                                  jsonb_build_object('copia_de', v_v.id, 'version_copiada', v_v.version), false);
end;
$$;

revoke all on function public.formula_revertir(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.formula_revertir(uuid, uuid, text, uuid) to authenticated, service_role;
comment on function public.formula_revertir(uuid, uuid, text, uuid) is
  'Revertir la fórmula de un origen (cotizaciones.configurar): publica la N+1 como copia, con su diseño, de una versión archivada, sin tocar el borrador. PT409 si la esperada ya no es la publicada; 22023 con nivel_retirado si su diseño usa un nivel retirado. docs/COTIZADOR.md › «Versiones (4.20-1)».';
