-- 4.19-1: guardar el borrador de la plantilla de la tarjeta y publicarla piden la versión que se vio en pantalla, y un candado por origen las pone en fila
-- (con la descartar de la migración siguiente). Hasta hoy guardar pisaba lo de otra persona y dos publicar a la vez publicaban las dos: la segunda
-- esperaba la fila de la primera, la releía por id y pisaba su nota. Ahora la que llega tarde recibe un PT409 con su texto.
-- docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».

drop function public.plantilla_guardar_borrador(uuid, jsonb, text);
drop function public.plantilla_publicar(uuid, text);

-- El PT409 de «el borrador ya no está»: o se publicó (la publicada es de ese instante o posterior) o se descartó. Quien llama ya tiene el candado del origen.
create function public._plantilla_borrador_ausente(p_origen uuid, p_esperada timestamptz) returns void
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_pub public.plantillas_tarjeta;
begin
  select * into v_pub from public.plantillas_tarjeta where origen_id = p_origen and estado = 'publicada';
  if v_pub.id is not null and v_pub.publicado_en >= p_esperada then
    raise exception 'El borrador ya no está: la versión % se publicó %.', v_pub.version, public._hace(v_pub.publicado_en) using errcode = 'PT409';
  end if;
  raise exception 'El borrador ya no está: se descartó.' using errcode = 'PT409';
end;
$$;

revoke all on function public._plantilla_borrador_ausente(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._plantilla_borrador_ausente(uuid, timestamptz) to service_role;
comment on function public._plantilla_borrador_ausente(uuid, timestamptz) is
  'Interna: el PT409 de guardar, publicar o descartar un borrador que ya no está (se publicó o se descartó). docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';

-- Guardar el borrador. Con la esperada nula es crear: sin borrador lo inserta y, si ya hay uno, PT409 (nunca lo pisa). Con la esperada, la compara con el borrador
-- de ahora. La forma se valida antes del candado; la fórmula puede cambiar antes de publicar, así que sólo se valida la forma. Devuelve la versión nueva.
create function public.plantilla_guardar_borrador(p_origen uuid, p_actualizado_en_esperado timestamptz, p_def jsonb, p_nota text default null::text) returns timestamptz
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_b public.plantillas_tarjeta; v_v timestamptz;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_plantilla(p_def, null, null, null, null);
  -- Guardar, publicar y descartar de un origen, en serie: el segundo lee el borrador que dejó el primero.
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  select * into v_b from public.plantillas_tarjeta where origen_id = p_origen and estado = 'borrador' for update;
  if p_actualizado_en_esperado is null then
    if v_b.id is not null then
      raise exception 'Ya hay un borrador de esta plantilla, guardado %.', public._hace(v_b.actualizado_en) using errcode = 'PT409';
    end if;
    insert into public.plantillas_tarjeta (origen_id, estado, definicion, nota, creado_por) values (p_origen, 'borrador', p_def, p_nota, (select auth.uid()))
    returning actualizado_en into v_v;
    return v_v;
  end if;
  if v_b.id is null then perform public._plantilla_borrador_ausente(p_origen, p_actualizado_en_esperado); end if;
  perform public._exigir_version(v_b.actualizado_en, p_actualizado_en_esperado,
    'El borrador de esta plantilla cambió ' || public._hace(v_b.actualizado_en) || ', mientras lo editabas.');
  update public.plantillas_tarjeta set definicion = p_def, nota = p_nota where id = v_b.id returning actualizado_en into v_v;
  return v_v;
end;
$$;

-- Publicar valida el borrador contra la fórmula publicada del origen y los tonos del catálogo, antes de archivar nada: un rechazo no cambia nada.
-- La esperada nula y la nota en blanco se rechazan antes del candado, sin mirar el estado.
create function public.plantilla_publicar(p_origen uuid, p_actualizado_en_esperado timestamptz, p_nota text) returns uuid
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_b public.plantillas_tarjeta; v_pub uuid; v_ver int; fo record;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if p_actualizado_en_esperado is null then perform public._exigir_version(null, null, null); end if;
  if coalesce(btrim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023', hint = 'nota'; end if;
  perform pg_advisory_xact_lock(hashtextextended('plantillas:' || p_origen::text, 0));
  select * into v_b from public.plantillas_tarjeta where origen_id = p_origen and estado = 'borrador' for update;
  if v_b.id is null then perform public._plantilla_borrador_ausente(p_origen, p_actualizado_en_esperado); end if;
  perform public._exigir_version(v_b.actualizado_en, p_actualizado_en_esperado,
    'El borrador de esta plantilla cambió ' || public._hace(v_b.actualizado_en) || ', mientras lo editabas.');
  select id into v_pub from public.plantillas_tarjeta where origen_id = p_origen and estado = 'publicada';
  select f.definicion, f.diseno, f.visibilidad into fo from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada';
  if not found then perform public._formula_rechazar('formula_sin_publicar', 'origen', 'Publica la fórmula del origen antes que su plantilla.'); end if;
  perform public.validar_plantilla(v_b.definicion, fo.definicion, fo.diseno, fo.visibilidad, array(select t.clave from public.tonos t));
  select coalesce(max(version), 0) + 1 into v_ver from public.plantillas_tarjeta where origen_id = p_origen;
  update public.plantillas_tarjeta set estado = 'archivada' where id = v_pub;
  update public.plantillas_tarjeta set estado = 'publicada', version = v_ver, nota = p_nota, publicado_en = now() where id = v_b.id;
  return v_b.id;
end;
$$;

revoke all on function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text) from public, anon;
grant execute on function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text) to authenticated, service_role;
revoke all on function public.plantilla_publicar(uuid, timestamptz, text) from public, anon;
grant execute on function public.plantilla_publicar(uuid, timestamptz, text) to authenticated, service_role;

comment on function public.plantilla_guardar_borrador(uuid, timestamptz, jsonb, text) is
  'Guarda el borrador de la plantilla de la tarjeta de un origen (cotizaciones.configurar del origen). Esperada nula = crear (PT409 si ya hay uno); con la esperada, la compara con la del borrador (PT409). Devuelve la versión nueva (actualizado_en). Candado por origen. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';
comment on function public.plantilla_publicar(uuid, timestamptz, text) is
  'Publica el borrador de la plantilla de un origen como la N+1 (cotizaciones.configurar del origen): pide la versión del borrador que se vio y una nota; lo valida contra la fórmula publicada y los tonos. Candado por origen. Devuelve el id de la publicada. docs/COTIZADOR.md › «Versiones de la plantilla (4.19-1)».';
