-- Tutear el conflicto de formula_publicar (docs/DECISIONES.md, 2026-10-11, «Voz: español neutro con tuteo, también en la base»): el
-- mensaje de una RPC se muestra tal cual, y éste era el último de cotizaciones que hablaba de vos. El cuerpo es el de
-- `20261011000600_rpc_cotizaciones.sql`, con «Recarga.» en vez de «Recargá.». `create or replace` conserva los permisos.
create or replace function public.formula_publicar(p_origen uuid, p_nota text, p_publicada_esperada uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_borrador uuid; v_pub uuid; v_ver int;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    raise exception 'Alguien publicó otra versión mientras editabas. Recarga.' using errcode = 'PT409';
  end if;
  select id into v_borrador from public.formulas where origen_id = p_origen and estado = 'borrador';
  if v_borrador is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = p_origen;
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, publicado_por = (select auth.uid()), publicado_en = now(), version_origen_id = v_pub where id = v_borrador;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_borrador::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota));
  return v_borrador;
end;
$$;
