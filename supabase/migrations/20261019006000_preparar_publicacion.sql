-- La semilla del cotizador nace por el mismo camino que publicar (paso 4.08, prompt 3; docs/COTIZADOR.md › «La semilla (4.08-3)»).
--
-- Lo que `_publicar_formula()` hacía en línea —tomar los tonos de los grupos, leer el catálogo y los niveles, validar la fórmula y el diseño completo
-- y compilar la visibilidad— pasa a `_preparar_publicacion()`, y `_publicar_formula()` la llama. El seed la llama con la fórmula y el diseño de cada
-- origen: si un diseño sembrado no valida, el seed no se aplica (con la regla en DETAIL y `donde` en HINT), y la `visibilidad` que guarda es la que
-- calcula la base y no una copia escrita a mano. No cambia lo que publicar hace ni el orden de sus candados: el borrador `for update` y los tonos
-- `for key share` antes de leer el catálogo.
--
-- Lleva el diseño nulo a `diseno_faltante` (antes lo hacía `_publicar_formula()` en línea) y no es de nadie: `revoke … from public, anon,
-- authenticated`, como los demás ayudantes. No lleva el prefijo `_formula_` ni `_diseno_`: `validar-formula.sql` y `validar-diseno.sql` cuentan las
-- que lo llevan.

create or replace function public._preparar_publicacion(p_def jsonb, p_params jsonb, p_diseno jsonb, p_ignorar_retirados boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_niv text[]; v_ret text[]; v_tonos text[];
begin
  if p_diseno is null then
    perform public._formula_rechazar('diseno_faltante', 'diseno', 'Publicar pide el diseño de la hoja.');
  end if;
  -- Orden de los candados: los tonos de los grupos `for key share` ANTES de leer el catálogo: o publica y `tono_eliminar` ve el uso, o elimina y esto
  -- da `tono_inexistente`.
  perform 1 from public.tonos t where t.clave in (select jsonb_array_elements_text(public._tonos_de_grupos(p_def))) for key share;
  select coalesce(array_agg(t.clave), '{}') into v_tonos from public.tonos t;
  select n.niveles, case when p_ignorar_retirados then '{}'::text[] else n.retirados end into v_niv, v_ret from public._niveles_de_cotizacion() n;
  perform public.validar_formula(p_def, p_params);
  perform public.validar_diseno(p_def, p_diseno, v_niv, v_ret, v_tonos);
  return public._compilar_visibilidad(p_def, p_diseno);
end;
$$;
revoke all on function public._preparar_publicacion(jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;

create or replace function public._publicar_formula(p_origen uuid, p_nota text, p_publicada_esperada uuid, p_ignorar_retirados boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_b public.formulas; v_pub uuid; v_ver int; v_vis jsonb;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  select * into v_b from public.formulas where origen_id = p_origen and estado = 'borrador' for update;
  select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    raise exception 'Alguien publicó otra versión mientras editabas. Recarga.' using errcode = 'PT409';
  end if;
  if v_b.id is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;

  v_vis := public._preparar_publicacion(v_b.definicion, v_b.params, v_b.diseno, p_ignorar_retirados);

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = p_origen;
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, visibilidad = v_vis, publicado_por = (select auth.uid()),
         publicado_en = now(), version_origen_id = v_pub where id = v_b.id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_b.id::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota));
  return v_b.id;
end;
$$;
revoke all on function public._publicar_formula(uuid, text, uuid, boolean) from public, anon, authenticated;
