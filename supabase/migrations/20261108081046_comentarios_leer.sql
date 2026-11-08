-- Leer los comentarios de una cotización por cursor (4.27-1).
--
-- Un nivel de respuestas (P3 a): las raíces de la más nueva a la más vieja, de a 20 con «Ver más», cada una con sus primeras 20 respuestas en orden
-- de llegada y «Ver más respuestas» (P4 a). Con cursor y sin cursor son dos consultas, cada una por su índice y con `limit tope + 1`. El recorrido no
-- filtra: borrar (`cotizacion_comentario_borrar`, en este mismo paso) deja en la tabla sólo raíces vivas o eliminadas con respuestas, y respuestas
-- vivas. Una raíz eliminada viaja con `cuerpo` nulo y `eliminado` verdadero («Comentario eliminado.»). Pide ver la cotización.

create index cotizaciones_comentarios_raices_idx on public.cotizaciones_comentarios (cotizacion_id, creado_en desc, id desc) where padre_id is null;
create index cotizaciones_comentarios_respuestas_idx on public.cotizaciones_comentarios (padre_id, creado_en, id);
-- La FK `padre_id` queda cubierta por el índice de respuestas.
drop index public.cotizaciones_comentarios_padre_id_idx;

create function public._comentario_item(p_id uuid, p_autor uuid, p_nombre text, p_cuerpo text, p_eliminado_en timestamptz,
                                        p_creado_en timestamptz, p_actualizado_en timestamptz, p_yo uuid) returns jsonb
  language sql immutable
  set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_id,
    'autor', jsonb_build_object('id', p_autor, 'nombre', nullif(btrim(p_nombre), '')),
    'cuerpo', case when p_eliminado_en is null then p_cuerpo end,
    'creado_en', p_creado_en,
    'actualizado_en', p_actualizado_en,
    'editado', p_eliminado_en is null and p_actualizado_en > p_creado_en,
    'eliminado', p_eliminado_en is not null,
    'mio', p_autor = p_yo);
$$;

comment on function public._comentario_item(uuid, uuid, text, text, timestamptz, timestamptz, timestamptz, uuid) is 'Un comentario como viaja a la pantalla: {id, autor {id, nombre}, cuerpo (nulo si está eliminado), creado_en, actualizado_en (la versión para editar o borrar), editado, eliminado, mio}. De nadie: la llaman las RPC de comentarios (4.27-1).';
revoke all on function public._comentario_item(uuid, uuid, text, text, timestamptz, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public._comentario_item(uuid, uuid, text, text, timestamptz, timestamptz, timestamptz, uuid) to service_role;

create function public.cotizacion_comentarios(p_cotizacion uuid, p_antes_en timestamptz default null, p_antes_id uuid default null,
                                              p_tope integer default null, p_primeros integer default null) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tope, 20, 50);
  v_r int := public._acotar_pagina(p_primeros, 20, 50);
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if (p_antes_en is null) <> (p_antes_id is null) then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  -- Las raíces por cotizaciones_comentarios_raices_idx; las respuestas de cada una por cotizaciones_comentarios_respuestas_idx (primeras + 1).
  if p_antes_en is null then
    select coalesce(jsonb_agg(public._comentario_item(r.id, r.usuario_id, p.nombre, r.cuerpo, r.eliminado_en, r.creado_en, r.actualizado_en, v_yo)
                              || jsonb_build_object('respuestas', case when jsonb_array_length(h.a) > v_r then h.a - v_r else h.a end,
                                                    'hay_mas_respuestas', jsonb_array_length(h.a) > v_r)
                              order by r.creado_en desc, r.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.usuario_id, x.cuerpo, x.eliminado_en, x.creado_en, x.actualizado_en from public.cotizaciones_comentarios x
             where x.cotizacion_id = p_cotizacion and x.padre_id is null
             order by x.creado_en desc, x.id desc limit v_n + 1) r
      left join public.perfiles p on p.id = r.usuario_id
      cross join lateral (
        select coalesce(jsonb_agg(public._comentario_item(y.id, y.usuario_id, q.nombre, y.cuerpo, y.eliminado_en, y.creado_en, y.actualizado_en, v_yo)
                                  order by y.creado_en, y.id), '[]'::jsonb) as a
          from (select z.id, z.usuario_id, z.cuerpo, z.eliminado_en, z.creado_en, z.actualizado_en from public.cotizaciones_comentarios z
                 where z.padre_id = r.id order by z.creado_en, z.id limit v_r + 1) y
          left join public.perfiles q on q.id = y.usuario_id) h;
  else
    select coalesce(jsonb_agg(public._comentario_item(r.id, r.usuario_id, p.nombre, r.cuerpo, r.eliminado_en, r.creado_en, r.actualizado_en, v_yo)
                              || jsonb_build_object('respuestas', case when jsonb_array_length(h.a) > v_r then h.a - v_r else h.a end,
                                                    'hay_mas_respuestas', jsonb_array_length(h.a) > v_r)
                              order by r.creado_en desc, r.id desc), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select x.id, x.usuario_id, x.cuerpo, x.eliminado_en, x.creado_en, x.actualizado_en from public.cotizaciones_comentarios x
             where x.cotizacion_id = p_cotizacion and x.padre_id is null and (x.creado_en, x.id) < (p_antes_en, p_antes_id)
             order by x.creado_en desc, x.id desc limit v_n + 1) r
      left join public.perfiles p on p.id = r.usuario_id
      cross join lateral (
        select coalesce(jsonb_agg(public._comentario_item(y.id, y.usuario_id, q.nombre, y.cuerpo, y.eliminado_en, y.creado_en, y.actualizado_en, v_yo)
                                  order by y.creado_en, y.id), '[]'::jsonb) as a
          from (select z.id, z.usuario_id, z.cuerpo, z.eliminado_en, z.creado_en, z.actualizado_en from public.cotizaciones_comentarios z
                 where z.padre_id = r.id order by z.creado_en, z.id limit v_r + 1) y
          left join public.perfiles q on q.id = y.usuario_id) h;
  end if;
  -- La de más no viaja: es sólo el aviso de que hay otra página.
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('comentarios', v_filas, 'hay_mas', v_hay,
                            'puede_moderar', public.tiene_permiso('cotizaciones.moderar'));
end $$;

comment on function public.cotizacion_comentarios(uuid, timestamptz, uuid, integer, integer) is 'Una página de comentarios raíz de una cotización, de la más nueva a la más vieja (p_tope, 20 por defecto, 50 como mucho), cada una con sus primeras p_primeros respuestas en orden de llegada (20, hasta 50) y hay_mas_respuestas. El cursor es (creado_en, id) de la última raíz de la página anterior. Pide cotizaciones.ver; sin ella, o inexistente o en la papelera, 42501. {comentarios, hay_mas, puede_moderar}. 4.27-1.';
revoke all on function public.cotizacion_comentarios(uuid, timestamptz, uuid, integer, integer) from public, anon;
grant execute on function public.cotizacion_comentarios(uuid, timestamptz, uuid, integer, integer) to authenticated, service_role;

create function public.cotizacion_comentario_respuestas(p_comentario uuid, p_despues_en timestamptz default null, p_despues_id uuid default null,
                                                        p_tope integer default null) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  v_n int := public._acotar_pagina(p_tope, 20, 50);
  v_cot uuid; v_padre uuid;
  v_filas jsonb; v_hay boolean;
begin
  perform public.assert_activo();
  select x.cotizacion_id, x.padre_id into v_cot, v_padre from public.cotizaciones_comentarios x where x.id = p_comentario;
  -- Un comentario inexistente, una respuesta o uno de una cotización que no se ve: lo mismo.
  if v_cot is null or v_padre is not null or not public.puede_cotizacion(v_cot, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if (p_despues_en is null) <> (p_despues_id is null) then
    raise exception 'El cursor de la página está incompleto.' using errcode = '22023', hint = 'cursor';
  end if;
  -- Por cotizaciones_comentarios_respuestas_idx.
  if p_despues_en is null then
    select coalesce(jsonb_agg(public._comentario_item(y.id, y.usuario_id, q.nombre, y.cuerpo, y.eliminado_en, y.creado_en, y.actualizado_en, v_yo)
                              order by y.creado_en, y.id), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select z.id, z.usuario_id, z.cuerpo, z.eliminado_en, z.creado_en, z.actualizado_en from public.cotizaciones_comentarios z
             where z.padre_id = p_comentario order by z.creado_en, z.id limit v_n + 1) y
      left join public.perfiles q on q.id = y.usuario_id;
  else
    select coalesce(jsonb_agg(public._comentario_item(y.id, y.usuario_id, q.nombre, y.cuerpo, y.eliminado_en, y.creado_en, y.actualizado_en, v_yo)
                              order by y.creado_en, y.id), '[]'::jsonb),
           coalesce(count(*) > v_n, false)
      into v_filas, v_hay
      from (select z.id, z.usuario_id, z.cuerpo, z.eliminado_en, z.creado_en, z.actualizado_en from public.cotizaciones_comentarios z
             where z.padre_id = p_comentario and (z.creado_en, z.id) > (p_despues_en, p_despues_id)
             order by z.creado_en, z.id limit v_n + 1) y
      left join public.perfiles q on q.id = y.usuario_id;
  end if;
  if v_hay then v_filas := v_filas - v_n; end if;
  return jsonb_build_object('respuestas', v_filas, 'hay_mas', v_hay);
end $$;

comment on function public.cotizacion_comentario_respuestas(uuid, timestamptz, uuid, integer) is 'Las respuestas de un comentario raíz después del cursor (creado_en, id), en orden de llegada (p_tope, 20 por defecto, 50 como mucho). Pide ver su cotización; un comentario inexistente, una respuesta o uno que no se ve dan el mismo 42501. {respuestas, hay_mas}. 4.27-1.';
revoke all on function public.cotizacion_comentario_respuestas(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.cotizacion_comentario_respuestas(uuid, timestamptz, uuid, integer) to authenticated, service_role;
