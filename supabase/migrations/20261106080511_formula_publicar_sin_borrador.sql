-- 4.20-1: publicar la fórmula sin pisar lo que otro dejó (4-8). El ⚙ publica la N+1 desde la publicada sin tocar el borrador; el borrador recuerda
-- su versión de origen y publicarlo atrasado da PT409; el conflicto dice quién publicó, qué versión y cuándo, sin «Recarga». Publicar, el ⚙ y
-- revertir (la migración siguiente) pasan en serie por un candado del origen. docs/COTIZADOR.md › «Versiones (4.20-1)».

comment on column public.formulas.version_origen_id is
  'En una publicada o archivada, la publicada que reemplazó. En un borrador, la publicada sobre la que se empezó: si ya no es la publicada, publicarlo da PT409 (formula_guardar_borrador la escribe al crear el borrador). Nula si no había publicada o la fila se escribió fuera de las RPC.';

-- La frase del conflicto sobre la publicada `p_formula`, sin mayúscula inicial ni punto: «Ana publicó la versión 3 hace 2 min», «otra persona
-- publicó…» (sin quién o sin nombre), «publicaste…» (quien llama). Primero se elige el sujeto; el «hace…» se quita aparte si no hay cuándo (con
-- un nulo, `_hace` diría «hace un momento»).
create function public._version_publicada_por(p_formula uuid) returns text
  language plpgsql stable security definer
  set search_path = ''
as $$
declare v_f public.formulas; v_sujeto text;
begin
  select * into v_f from public.formulas f where f.id = p_formula;
  if v_f.id is null then return null; end if;
  if v_f.publicado_por is not null and v_f.publicado_por = (select auth.uid()) then
    v_sujeto := 'publicaste';
  else
    select nullif(btrim(p.nombre), '') || ' publicó' into v_sujeto from public.perfiles p where p.id = v_f.publicado_por;
    v_sujeto := coalesce(v_sujeto, 'otra persona publicó');
  end if;
  return v_sujeto || ' la versión ' || v_f.version || case when v_f.publicado_en is null then '' else ' ' || public._hace(v_f.publicado_en) end;
end;
$$;

revoke all on function public._version_publicada_por(uuid) from public, anon, authenticated;
grant execute on function public._version_publicada_por(uuid) to service_role;
comment on function public._version_publicada_por(uuid) is
  'Interna: la frase del PT409 de publicar, el ⚙ y revertir sobre una publicada (quién, qué versión y cuándo). docs/COTIZADOR.md › «Versiones (4.20-1)».';

-- Publicar el borrador: el candado del origen antes de leer la publicada; un borrador cuya versión de origen ya no es la publicada no se publica.
create or replace function public._publicar_formula(p_origen uuid, p_nota text, p_publicada_esperada uuid, p_ignorar_retirados boolean) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_b public.formulas; v_pub uuid; v_ver int; v_vis jsonb; v_f text;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  -- Publicar, el ⚙ y revertir de un origen, en serie: el segundo relee la publicada y la compara con su esperada.
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

-- Publicar una copia sin el borrador: la N+1 con lo que se le pasa, como fila nueva. El ⚙ y revertir; quien llama ya pidió el permiso.
create function public._publicar_version(p_origen uuid, p_def jsonb, p_params jsonb, p_diseno jsonb, p_nota text, p_esperada uuid, p_detalle jsonb,
                                         p_ignorar_retirados boolean) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_pub uuid; v_ver int; v_vis jsonb; v_id uuid; v_f text;
begin
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('formulas:' || p_origen::text, 0));
  select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if v_pub is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  if p_esperada is distinct from v_pub then
    v_f := public._version_publicada_por(v_pub);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;

  v_vis := public._preparar_publicacion(p_def, p_params, p_diseno, p_ignorar_retirados);

  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = p_origen;   -- formulas_origen_id_version_key
  update public.formulas set estado = 'archivada' where id = v_pub;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, version_origen_id, creado_por, publicado_por, publicado_en)
  values (p_origen, v_ver, 'publicada', p_def, p_params, p_diseno, v_vis, p_nota, v_pub, (select auth.uid()), (select auth.uid()), now())
  returning id into v_id;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_id::text, jsonb_build_object('anterior', v_pub),
                                     jsonb_build_object('version', v_ver, 'nota', p_nota) || coalesce(p_detalle, '{}'::jsonb));
  return v_id;
end;
$$;

revoke all on function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean) to service_role;
comment on function public._publicar_version(uuid, jsonb, jsonb, jsonb, text, uuid, jsonb, boolean) is
  'Interna: publica la N+1 de un origen como fila nueva (archiva la publicada), sin leer ni escribir el borrador, tras el candado del origen y la esperada. La usan el ⚙ y formula_revertir. docs/COTIZADOR.md › «Versiones (4.20-1)».';

-- El borrador recuerda la publicada sobre la que se empezó (al crearlo; pisarlo no la cambia).
create or replace function public.formula_guardar_borrador(p_origen uuid, p_def jsonb, p_params jsonb, p_diseno jsonb, p_nota text default null) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_id uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_formula(p_def, p_params);
  if p_diseno is not null then
    perform public._diseno_forma(p_diseno);   -- sólo la forma: cruzarlo con la fórmula es de publicar
  end if;
  insert into public.formulas (origen_id, estado, definicion, params, diseno, nota, creado_por, version_origen_id)
  values (p_origen, 'borrador', p_def, p_params, p_diseno, p_nota, (select auth.uid()),
          (select f.id from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada'))   -- formulas_publicada_unica
  on conflict (origen_id) where estado = 'borrador' do update
    set definicion = excluded.definicion, params = excluded.params, diseno = excluded.diseno, nota = excluded.nota, visibilidad = null
  returning id into v_id;
  return v_id;
end;
$$;

-- El ⚙: una constante publica la N+1 desde la publicada, sin crear ni tocar el borrador. Con esperada nula, la esperada es la publicada que lee al entrar.
drop function public.formula_cambiar_constante(uuid, text, numeric);
create function public.formula_cambiar_constante(p_origen uuid, p_nodo text, p_valor numeric, p_publicada_esperada uuid default null) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare v_pub public.formulas; v_anterior numeric; v_f text;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  select * into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if v_pub.id is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  -- Se compara con lo leído aquí, que es lo que se copia: `_publicar_version` vuelve a comparar tras el candado.
  if p_publicada_esperada is not null and p_publicada_esperada is distinct from v_pub.id then
    v_f := public._version_publicada_por(v_pub.id);
    raise exception '%.', upper(left(v_f, 1)) || substr(v_f, 2) using errcode = 'PT409';
  end if;
  v_anterior := (v_pub.params ->> p_nodo)::numeric;
  if v_anterior is null then raise exception 'La fórmula publicada no tiene la constante «%».', p_nodo using errcode = '22023'; end if;
  if v_anterior = p_valor then raise exception 'La constante ya tiene ese valor.' using errcode = '22023', hint = 'valor'; end if;
  return public._publicar_version(p_origen, v_pub.definicion, v_pub.params || jsonb_build_object(p_nodo, p_valor), v_pub.diseno,
                                  format('%s: %s → %s, desde el cotizador', p_nodo, v_anterior, p_valor), v_pub.id,
                                  jsonb_build_object('constante', p_nodo), true);
end;
$$;

revoke all on function public.formula_cambiar_constante(uuid, text, numeric, uuid) from public, anon;
grant execute on function public.formula_cambiar_constante(uuid, text, numeric, uuid) to authenticated, service_role;
comment on function public.formula_cambiar_constante(uuid, text, numeric, uuid) is
  'El ⚙ de una constante: publica la N+1 desde la publicada con ese valor, sin tocar el borrador (cotizaciones.configurar del origen). PT409 si la esperada ya no es la publicada; 22023 si el valor no cambia. docs/COTIZADOR.md › «Versiones (4.20-1)».';
