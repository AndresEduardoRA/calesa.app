-- 4.21-2: publicar el borrador de la fórmula con su versión esperada (4-8: «publicar toma el borrador más reciente»). Con la actualizado_en que leyó
-- publica sólo ese borrador: si cambió o ya no está, PT409 (en vez de «No hay borrador»). La publicada esperada se mira primero, como hoy. Sin hora,
-- como hoy, hasta que la app la mande (4.21-3b). `_publicar_formula` sigue siendo sólo de service_role. docs/COTIZADOR.md › «Versiones (4.20-1)».

drop function public.formula_publicar(uuid, text, uuid);
drop function public._publicar_formula(uuid, text, uuid, boolean);

-- Publicar el borrador: el candado del origen antes de leer la publicada; un borrador cuya versión de origen ya no es la publicada no se publica.
create function public._publicar_formula(p_origen uuid, p_nota text, p_publicada_esperada uuid, p_ignorar_retirados boolean,
                                         p_actualizado_en_esperado timestamptz) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_b public.formulas; v_pub uuid; v_ver int; v_vis jsonb; v_f text;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  -- Guardar, publicar, el ⚙ y revertir de un origen, en serie: el segundo relee la publicada y el borrador y los compara con sus esperadas.
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  select * into v_b from public.formulas where origen_id = p_origen and estado = 'borrador' for update;
  select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    if v_pub is null then
      raise exception 'La versión que tenías ya no es la publicada, y el origen no tiene otra.' using errcode = 'PT409';
    end if;
    v_f := public._version_publicada_por(v_pub);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
  if v_b.id is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  if v_b.version_origen_id is not null and v_b.version_origen_id is distinct from v_pub then
    raise exception 'Después de que empezaste este borrador, %.', coalesce(public._version_publicada_por(v_pub), 'la versión publicada cambió')
      using errcode = 'PT409';
  end if;

  v_vis := public._preparar_publicacion(v_b.definicion, v_b.params, v_b.diseno, p_ignorar_retirados);

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = p_origen;
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, visibilidad = v_vis, publicado_por = (select auth.uid()),
         publicado_en = now(), version_origen_id = v_pub where id = v_b.id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_b.id::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota));
  return v_b.id;
end;
$$;

revoke all on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz) to service_role;
comment on function public._publicar_formula(uuid, text, uuid, boolean, timestamptz) is
  'Interna: publica el borrador de un origen tras el candado, la publicada esperada y la actualizado_en esperada del borrador (nula: no compara). La usa formula_publicar. docs/COTIZADOR.md › «Versiones (4.20-1)».';

create function public.formula_publicar(p_origen uuid, p_nota text, p_publicada_esperada uuid default null,
                                        p_actualizado_en_esperado timestamptz default null) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
begin
  return public._publicar_formula(p_origen, p_nota, p_publicada_esperada, false, p_actualizado_en_esperado);
end;
$$;

revoke all on function public.formula_publicar(uuid, text, uuid, timestamptz) from public, anon;
grant execute on function public.formula_publicar(uuid, text, uuid, timestamptz) to authenticated, service_role;
comment on function public.formula_publicar(uuid, text, uuid, timestamptz) is
  'Publica el borrador de un origen (cotizaciones.configurar). PT409 si p_publicada_esperada ya no es la publicada, si el borrador ya no tiene la p_actualizado_en_esperado (o ya no está) o si nació sobre otra publicada. docs/COTIZADOR.md › «Versiones (4.20-1)».';
