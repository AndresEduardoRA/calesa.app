-- 4.21-2: guardar el borrador de la fórmula con su versión esperada (4-8). Sin hora crea, y si ya hay un borrador da PT409; con la hora que leyó pisa
-- sólo si es la del borrador. Devuelve `{id, actualizado_en}` de la fila escrita, para volver a guardar sin releer. El permiso va primero, después la
-- validación (lo caro, fuera del candado) y luego el candado del origen (el de publicar, el ⚙ y revertir). docs/COTIZADOR.md › «Versiones (4.20-1)».

-- Quien empezó el borrador, para el PT409: «lo empezó Ana», «lo empezaste tú» (quien llama) o «lo empezó otra persona» (sin quién o sin nombre).
create function public._borrador_formula_empezado_por(p_creado_por uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_nombre text;
begin
  if p_creado_por is not null and p_creado_por = (select auth.uid()) then return 'lo empezaste tú'; end if;
  select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = p_creado_por;
  return coalesce('lo empezó ' || v_nombre, 'lo empezó otra persona');
end;
$$;

revoke all on function public._borrador_formula_empezado_por(uuid) from public, anon, authenticated;
grant execute on function public._borrador_formula_empezado_por(uuid) to service_role;
comment on function public._borrador_formula_empezado_por(uuid) is
  'Interna: quién empezó un borrador de la fórmula, para el PT409 de guardarlo sin su versión. docs/COTIZADOR.md › «Versiones (4.20-1)».';

-- El borrador leído (`for update`, nulo si no hay) contra la hora que tenía quien llama: sin hora no compara; sin borrador o con otra hora, PT409.
create function public._exigir_borrador_formula(p_borrador public.formulas, p_esperado timestamptz) returns void
  language plpgsql stable
  set search_path = ''
as $$
begin
  if p_esperado is null then return; end if;
  if p_borrador.id is null then
    raise exception 'El borrador que abriste ya no está: se publicó o se descartó.' using errcode = 'PT409';
  end if;
  if p_borrador.actualizado_en is distinct from p_esperado then
    raise exception 'El borrador cambió después de que lo abriste: se guardó de nuevo %.', public._hace(p_borrador.actualizado_en) using errcode = 'PT409';
  end if;
end;
$$;

revoke all on function public._exigir_borrador_formula(public.formulas, timestamptz) from public, anon, authenticated;
grant execute on function public._exigir_borrador_formula(public.formulas, timestamptz) to service_role;
comment on function public._exigir_borrador_formula(public.formulas, timestamptz) is
  'Interna: compara el borrador leído con la actualizado_en que tenía quien llama (nula: no compara). PT409 si ya no está o cambió. docs/COTIZADOR.md › «Versiones (4.20-1)».';

drop function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text);
create function public.formula_guardar_borrador(p_origen uuid, p_def jsonb, p_params jsonb, p_diseno jsonb, p_nota text default null,
                                                p_publicada_esperada uuid default null, p_actualizado_en_esperado timestamptz default null) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare v_b public.formulas; v_pub uuid; v_id uuid; v_en timestamptz;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_formula(p_def, p_params);
  if p_diseno is not null then
    perform public._diseno_forma(p_diseno);   -- sólo la forma: cruzarlo con la fórmula es de publicar
  end if;
  -- Guardar, publicar, el ⚙ y revertir de un origen, en serie: el segundo lee lo que dejó el primero.
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  select * into v_b from public.formulas where origen_id = p_origen and estado = 'borrador' for update;   -- formulas_borrador_unico
  if p_actualizado_en_esperado is null then
    -- Crear: no había borrador, y la publicada sobre la que se empezó (si se dice) sigue siendo la publicada.
    if v_b.id is not null then
      raise exception 'Ya hay un borrador: % y se guardó %.', public._borrador_formula_empezado_por(v_b.creado_por), public._hace(v_b.actualizado_en)
        using errcode = 'PT409';
    end if;
    select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';   -- formulas_publicada_unica
    if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
      if v_pub is null then
        raise exception 'La versión que tenías ya no es la publicada, y el origen no tiene otra.' using errcode = 'PT409';
      end if;
      raise exception 'Mientras editabas, %.', public._version_publicada_por(v_pub) using errcode = 'PT409';
    end if;
    insert into public.formulas (origen_id, estado, definicion, params, diseno, nota, creado_por, version_origen_id)
    values (p_origen, 'borrador', p_def, p_params, p_diseno, p_nota, (select auth.uid()), v_pub)
    returning id, actualizado_en into v_id, v_en;
  else
    -- Pisar: el borrador que leyó, tal como lo leyó. La publicada no se compara: publicarlo atrasado da su propio PT409.
    perform public._exigir_borrador_formula(v_b, p_actualizado_en_esperado);
    update public.formulas set definicion = p_def, params = p_params, diseno = p_diseno, nota = p_nota, visibilidad = null
     where id = v_b.id
    returning id, actualizado_en into v_id, v_en;   -- la hora que puso trg_actualizado_en
  end if;
  return jsonb_build_object('id', v_id, 'actualizado_en', v_en);
end;
$$;

revoke all on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz) from public, anon;
grant execute on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz) to authenticated, service_role;
comment on function public.formula_guardar_borrador(uuid, jsonb, jsonb, jsonb, text, uuid, timestamptz) is
  'Guarda el borrador de un origen (cotizaciones.configurar). Sin p_actualizado_en_esperado crea (PT409 si ya hay borrador o si p_publicada_esperada ya no es la publicada); con ella pisa sólo si es la del borrador (PT409 si cambió o ya no está). Devuelve {id, actualizado_en}. docs/COTIZADOR.md › «Versiones (4.20-1)».';
