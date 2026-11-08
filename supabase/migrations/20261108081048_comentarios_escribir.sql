-- Escribir comentarios de una cotización por RPC (4.27-1).
--
-- Comenta quien ve la cotización (P1 a); un solo nivel de respuestas (P3 a): responder a una respuesta cuelga de su raíz. El autor edita (con la
-- versión, queda «editado») y borra; quien modera borra los ajenos y no los edita (P5 a). Borrar una respuesta o una raíz sin respuestas quita la
-- fila; una raíz con respuestas queda eliminada con el texto vaciado («Comentario eliminado.»), y se va con su última respuesta. Así la lectura
-- (`cotizacion_comentarios`) recorre sin filtro. Se revocan las escrituras directas (P9 a): todo pasa por estas RPC; las policies de escribir
-- quedan como cinturón.
-- Orden de candados: la raíz antes que la respuesta (comentar toma la raíz `for share`; borrar una respuesta, la raíz y la respuesta `for update`).

-- Lo que entró por PostgREST se normaliza antes de las restricciones: una respuesta de una respuesta cuelga de su raíz, una respuesta eliminada
-- y una raíz eliminada sin respuestas se quitan, y una eliminada queda sin texto. Si después una fila viva sigue fuera (vacía o de más de 4.000),
-- `validate constraint` cae con el nombre de la restricción.
do $$
declare i int := 0;
begin
  loop
    update public.cotizaciones_comentarios h set padre_id = p.padre_id
      from public.cotizaciones_comentarios p where h.padre_id = p.id and p.padre_id is not null;
    exit when not found;
    i := i + 1;
    if i > 100 then raise exception 'cotizaciones_comentarios: una cadena de respuestas de más de 100 niveles'; end if;
  end loop;
end $$;
delete from public.cotizaciones_comentarios where padre_id is not null and eliminado_en is not null;
delete from public.cotizaciones_comentarios c
 where c.padre_id is null and c.eliminado_en is not null
   and not exists (select 1 from public.cotizaciones_comentarios r where r.padre_id = c.id);
update public.cotizaciones_comentarios set cuerpo = '' where eliminado_en is not null and cuerpo <> '';

alter table public.cotizaciones_comentarios add constraint cotizaciones_comentarios_cuerpo_check
  check ((eliminado_en is null and char_length(btrim(cuerpo)) between 1 and 4000) or (eliminado_en is not null and cuerpo = '')) not valid;
alter table public.cotizaciones_comentarios validate constraint cotizaciones_comentarios_cuerpo_check;
alter table public.cotizaciones_comentarios add constraint cotizaciones_comentarios_respuesta_viva_check
  check (padre_id is null or eliminado_en is null) not valid;
alter table public.cotizaciones_comentarios validate constraint cotizaciones_comentarios_respuesta_viva_check;

revoke insert, update, delete on public.cotizaciones_comentarios from authenticated;

create function public.cotizacion_comentar(p_cotizacion uuid, p_padre uuid, p_cuerpo text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cuerpo text := btrim(p_cuerpo);
  v_cot uuid; v_abuelo uuid; v_raiz uuid;
  r public.cotizaciones_comentarios;
  v_nombre text;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if v_cuerpo is null or char_length(v_cuerpo) not between 1 and 4000 then
    raise exception 'Escribe el comentario (hasta 4.000 caracteres).' using errcode = '22023', hint = 'cuerpo';
  end if;
  if p_padre is not null then
    select x.cotizacion_id, x.padre_id into v_cot, v_abuelo from public.cotizaciones_comentarios x where x.id = p_padre;
    if v_cot is distinct from p_cotizacion then
      raise exception 'Ese comentario ya no está.' using errcode = '22023', hint = 'padre';
    end if;
    -- Un nivel: la respuesta a una respuesta cuelga de su raíz. La raíz se toma `for share`: borrarla a la vez espera, y si ya se fue, no se responde.
    v_raiz := coalesce(v_abuelo, p_padre);
    perform 1 from public.cotizaciones_comentarios x where x.id = v_raiz for share;
    if not found then
      raise exception 'Ese comentario ya no está.' using errcode = '22023', hint = 'padre';
    end if;
  end if;
  insert into public.cotizaciones_comentarios (cotizacion_id, usuario_id, padre_id, cuerpo)
  values (p_cotizacion, v_yo, v_raiz, v_cuerpo)
  returning * into r;
  select p.nombre into v_nombre from public.perfiles p where p.id = v_yo;
  return public._comentario_item(r.id, r.usuario_id, v_nombre, r.cuerpo, r.eliminado_en, r.creado_en, r.actualizado_en, v_yo);
end $$;

comment on function public.cotizacion_comentar(uuid, uuid, text) is 'Comenta una cotización o responde un comentario (p_padre). Pide cotizaciones.ver (42501). El cuerpo, sin espacios a los lados, de 1 a 4.000 caracteres (22023, hint cuerpo). Un padre de otra cotización o que ya no está: 22023, hint padre; la respuesta a una respuesta cuelga de su raíz (un nivel). Devuelve el comentario como lo lee cotizacion_comentarios. 4.27-1.';
revoke all on function public.cotizacion_comentar(uuid, uuid, text) from public, anon;
grant execute on function public.cotizacion_comentar(uuid, uuid, text) to authenticated, service_role;

create function public.cotizacion_comentario_editar(p_comentario uuid, p_actualizado_en_esperado timestamptz, p_cuerpo text) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cuerpo text := btrim(p_cuerpo);
  v_cot uuid;
  r public.cotizaciones_comentarios;
  v_nombre text;
begin
  perform public.assert_activo();
  -- Ver antes de tomar la fila, y otra vez con la fila tomada.
  select x.cotizacion_id into v_cot from public.cotizaciones_comentarios x where x.id = p_comentario;
  if v_cot is null or not public.puede_cotizacion(v_cot, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  select * into r from public.cotizaciones_comentarios x where x.id = p_comentario for update;
  if not found or not public.puede_cotizacion(r.cotizacion_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if r.usuario_id is distinct from v_yo or r.eliminado_en is not null then
    raise exception 'Sólo quien escribió el comentario puede editarlo.' using errcode = '42501';
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado,
                                 'Alguien cambió este comentario mientras lo editabas. Recarga e intenta de nuevo.');
  if v_cuerpo is null or char_length(v_cuerpo) not between 1 and 4000 then
    raise exception 'Escribe el comentario (hasta 4.000 caracteres).' using errcode = '22023', hint = 'cuerpo';
  end if;
  if v_cuerpo is distinct from r.cuerpo then
    update public.cotizaciones_comentarios x set cuerpo = v_cuerpo where x.id = r.id returning * into r;
  end if;
  select p.nombre into v_nombre from public.perfiles p where p.id = r.usuario_id;
  return public._comentario_item(r.id, r.usuario_id, v_nombre, r.cuerpo, r.eliminado_en, r.creado_en, r.actualizado_en, v_yo);
end $$;

comment on function public.cotizacion_comentario_editar(uuid, timestamptz, text) is 'Edita el texto de un comentario propio y vivo, con su versión (actualizado_en: PT409 si cambió). Pide ver la cotización (42501, también si no existe); otra persona, aun con moderar: 42501. Devuelve el comentario como lo lee cotizacion_comentarios (editado). 4.27-1.';
revoke all on function public.cotizacion_comentario_editar(uuid, timestamptz, text) from public, anon;
grant execute on function public.cotizacion_comentario_editar(uuid, timestamptz, text) to authenticated, service_role;

create function public.cotizacion_comentario_borrar(p_comentario uuid, p_actualizado_en_esperado timestamptz) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_cot uuid; v_padre uuid;
  v_raiz public.cotizaciones_comentarios;
  r public.cotizaciones_comentarios;
  v_ajeno boolean; v_res text;
begin
  perform public.assert_activo();
  select x.cotizacion_id, x.padre_id into v_cot, v_padre from public.cotizaciones_comentarios x where x.id = p_comentario;
  if v_cot is null or not public.puede_cotizacion(v_cot, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- La raíz antes que la respuesta: si se va la última respuesta de una raíz eliminada, la raíz también.
  if v_padre is not null then
    select * into v_raiz from public.cotizaciones_comentarios x where x.id = v_padre for update;
  end if;
  select * into r from public.cotizaciones_comentarios x where x.id = p_comentario for update;
  if not found or not public.puede_cotizacion(r.cotizacion_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  v_ajeno := r.usuario_id is distinct from v_yo;
  if v_ajeno and not public.tiene_permiso('cotizaciones.moderar') then
    raise exception 'No puedes borrar este comentario.' using errcode = '42501';
  end if;
  if r.eliminado_en is not null then
    return jsonb_build_object('resultado', 'sin_cambios');
  end if;
  perform public._exigir_version(r.actualizado_en, p_actualizado_en_esperado,
                                 'Alguien cambió este comentario mientras lo mirabas. Recarga e intenta de nuevo.');
  if r.padre_id is null and exists (select 1 from public.cotizaciones_comentarios x where x.padre_id = r.id) then
    update public.cotizaciones_comentarios x set eliminado_en = now(), cuerpo = '' where x.id = r.id;
    v_res := 'eliminado';
  else
    delete from public.cotizaciones_comentarios x where x.id = r.id;
    v_res := 'borrado';
    if r.padre_id is not null and v_raiz.eliminado_en is not null
       and not exists (select 1 from public.cotizaciones_comentarios x where x.padre_id = v_raiz.id) then
      delete from public.cotizaciones_comentarios x where x.id = v_raiz.id;
    end if;
  end if;
  -- El de otra persona queda en la actividad, sin el texto.
  if v_ajeno then
    perform public.registrar_actividad('cotizacion.comentario_moderado', 'cotizaciones', r.cotizacion_id::text, null, null,
                                       jsonb_build_object('comentario', r.id, 'autor', r.usuario_id));
  end if;
  return jsonb_build_object('resultado', v_res);
end $$;

comment on function public.cotizacion_comentario_borrar(uuid, timestamptz) is 'Borra un comentario: el autor, o quien tiene cotizaciones.moderar (42501 «No puedes borrar este comentario.»), con la versión (PT409). Pide ver la cotización (42501, también si no existe). Una respuesta o una raíz sin respuestas se quitan (borrado); una raíz con respuestas queda eliminada sin texto (eliminado) y se va con su última respuesta; una ya eliminada: sin_cambios. El de otra persona deja cotizacion.comentario_moderado en la actividad, sin el texto. 4.27-1.';
revoke all on function public.cotizacion_comentario_borrar(uuid, timestamptz) from public, anon;
grant execute on function public.cotizacion_comentario_borrar(uuid, timestamptz) to authenticated, service_role;

-- El catálogo: comentar es de quien ve (P1 a), y borrar los ajenos es de moderar. El seed repite estos textos (`on conflict do update`).
update public.permisos set
  descripcion = 'Ver cotizaciones y comentarlas (por origen; propios = mías o de mis leads)',
  aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla, cotizacion_hoja, cotizacion_hoja_guardada, cotizacion_crear, cotizacion_encima, cotizacion_guardar, cotizacion_comentarios, cotizacion_comentar'
 where clave = 'cotizaciones.ver';
update public.permisos set
  descripcion = 'Editar preventas y adjuntarles archivos (por origen y alcance; para guardar pide también cotizaciones.ver)'
 where clave = 'cotizaciones.editar';
update public.permisos set aplicado_en = 'cotizacion_moderar, cotizacion_comentario_borrar' where clave = 'cotizaciones.moderar';
