-- Adjuntar archivos a una cotización por RPC (4.27-1).
--
-- Adjunta quien puede guardarla (P2 a: `cotizacion_puede_adjuntar`, la misma regla que las policies de 4-69). El archivo se sube antes al bucket
-- `cotizaciones` (`<cotización>/<sha256>.<ext>`, por hash) y `cotizacion_adjuntar` lo registra: comprueba la carpeta, que el objeto exista y, si
-- su metadata los trae, toma de ahí el tipo y el tamaño. Los tipos son los del bucket (P8 a), hasta 20 por cotización (sin candado: dos a la vez
-- pueden dejar 21), y el mismo archivo dos veces en una cotización da 23505. Quitar lo hace quien lo subió (si todavía puede adjuntar) o quien
-- modera; la ruta va a la cola de limpieza si nadie más la usa (24 h de gracia). Se revocan las escrituras directas (P9 a).
-- La carpeta y el objeto se comprueban en la RPC (la única que escribe): el trigger sólo rescata la ruta de la cola de limpieza, como pide toda
-- columna con una ruta de storage (`.claude/rules/migraciones.md`).

create function public.comentarios_adjunto_rescatar() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  perform public.storage_gc_rescatar('cotizaciones', new.ruta);
  return new;
end $$;

comment on function public.comentarios_adjunto_rescatar() is 'Trigger before insert de cotizaciones_adjuntos: saca la ruta de la cola de limpieza de storage (o avisa si ya se está limpiando). 4.27-1.';
revoke all on function public.comentarios_adjunto_rescatar() from public, anon, authenticated;

create trigger trg_comentarios_adjunto_rescatar before insert on public.cotizaciones_adjuntos
  for each row execute function public.comentarios_adjunto_rescatar();

-- El mismo archivo una sola vez por cotización. Si hubiera duplicados de antes, crear el índice cae con su nombre.
create unique index cotizaciones_adjuntos_cotizacion_ruta_key on public.cotizaciones_adjuntos (cotizacion_id, ruta);

revoke insert, delete on public.cotizaciones_adjuntos from authenticated;

create function public.cotizacion_adjuntar(p_cotizacion uuid, p_ruta text, p_nombre text, p_mime text, p_bytes integer) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $_$
declare
  v_yo uuid := (select auth.uid());
  v_nombre text := btrim(p_nombre);
  v_meta jsonb;
  v_mime text; v_bytes bigint; v_ext text;
  a public.cotizaciones_adjuntos;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if not public.cotizacion_puede_adjuntar(p_cotizacion) then
    raise exception 'No tienes permiso para adjuntar en esta cotización.' using errcode = '42501';
  end if;
  if p_ruta is null or p_ruta !~ ('^' || p_cotizacion::text || '/[0-9a-f]{64}\.(pdf|webp|jpg|png|docx)$') then
    raise exception 'El archivo no está en la carpeta de esta cotización.' using errcode = '22023', hint = 'ruta';
  end if;
  if v_nombre is null or char_length(v_nombre) not between 1 and 200 or v_nombre ~ '[/\\]' then
    raise exception 'Ponle un nombre al archivo (hasta 200 caracteres, sin barras).' using errcode = '22023', hint = 'nombre';
  end if;
  select o.metadata into v_meta from storage.objects o where o.bucket_id = 'cotizaciones' and o.name = p_ruta;
  if not found then
    raise exception 'El archivo no terminó de subir. Vuelve a intentarlo.' using errcode = '22023', hint = 'ruta';
  end if;
  -- Lo que dice storage pesa más que lo que manda el cliente.
  v_mime := coalesce(v_meta ->> 'mimetype', p_mime);
  v_bytes := coalesce((v_meta ->> 'size')::bigint, p_bytes);
  v_ext := substring(p_ruta from '\.([a-z]+)$');
  if v_mime is distinct from (case v_ext when 'pdf' then 'application/pdf' when 'webp' then 'image/webp' when 'jpg' then 'image/jpeg'
                                          when 'png' then 'image/png'
                                          when 'docx' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' end) then
    raise exception 'Ese tipo de archivo no se puede adjuntar (PDF, imágenes o Word).' using errcode = '22023', hint = 'mime';
  end if;
  if v_bytes is null or v_bytes not between 1 and 26214400 then
    raise exception 'El archivo está vacío o pesa más de 25 MB.' using errcode = '22023', hint = 'bytes';
  end if;
  -- Hasta 20 por cotización (cotizaciones_adjuntos_cotizacion_ruta_key): se cuentan a lo sumo 20.
  if (select count(*) from (select 1 from public.cotizaciones_adjuntos x where x.cotizacion_id = p_cotizacion limit 20) t) >= 20 then
    raise exception 'Una cotización admite hasta 20 adjuntos.' using errcode = '23514';
  end if;
  begin
    insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes, subido_por)
    values (p_cotizacion, p_ruta, v_nombre, v_mime, v_bytes::integer, v_yo)
    returning * into a;
  exception when unique_violation then
    raise exception 'Ese archivo ya está adjunto.' using errcode = '23505';
  end;
  return jsonb_build_object('id', a.id, 'ruta', a.ruta, 'nombre', a.nombre, 'mime', a.mime, 'bytes', a.bytes, 'creado_en', a.creado_en);
end $_$;

comment on function public.cotizacion_adjuntar(uuid, text, text, text, integer) is 'Registra un archivo ya subido al bucket cotizaciones como adjunto de la cotización. Pide ver (42501 «No tienes acceso…») y poder adjuntar (cotizacion_puede_adjuntar: 42501 «No tienes permiso para adjuntar…»). La ruta, <cotización>/<sha256>.<pdf|webp|jpg|png|docx>, en la carpeta de la cotización y existente en storage.objects; tipo y tamaño de su metadata si están (si no, los del cliente), concordantes con la extensión y de 1 byte a 25 MB; nombre de 1 a 200 sin barras (22023 con hint). Hasta 20 (23514); el mismo archivo dos veces, 23505. 4.27-1.';
revoke all on function public.cotizacion_adjuntar(uuid, text, text, text, integer) from public, anon;
grant execute on function public.cotizacion_adjuntar(uuid, text, text, text, integer) to authenticated, service_role;

create function public.cotizacion_adjunto_quitar(p_adjunto uuid) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare
  v_yo uuid := (select auth.uid());
  a public.cotizaciones_adjuntos;
begin
  perform public.assert_activo();
  select * into a from public.cotizaciones_adjuntos x where x.id = p_adjunto;
  if not found or not public.puede_cotizacion(a.cotizacion_id, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if not ((a.subido_por = v_yo and public.cotizacion_puede_adjuntar(a.cotizacion_id)) or public.tiene_permiso('cotizaciones.moderar')) then
    raise exception 'No puedes quitar este adjunto.' using errcode = '42501';
  end if;
  delete from public.cotizaciones_adjuntos x where x.id = a.id;
  if not found then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  -- A la cola de limpieza sólo si nadie más usa esa ruta (storage_refcount), con la gracia de siempre.
  perform public._encolar_para_limpiar('cotizaciones', array[a.ruta], false);
  return jsonb_build_object('resultado', 'quitado');
end $$;

comment on function public.cotizacion_adjunto_quitar(uuid) is 'Quita un adjunto: quien lo subió y todavía puede adjuntar, o quien tiene cotizaciones.moderar (42501 «No puedes quitar este adjunto.»). Pide ver la cotización (42501, también si el adjunto no existe). Encola su ruta para limpiar si nadie más la usa. 4.27-1.';
revoke all on function public.cotizacion_adjunto_quitar(uuid) from public, anon;
grant execute on function public.cotizacion_adjunto_quitar(uuid) to authenticated, service_role;

update public.permisos set aplicado_en = 'puede_cotizacion, cotizacion_guardar, cotizacion_hoja_guardada, papeleras, cotizacion_puede_adjuntar, cotizacion_adjuntar, cotizacion_adjunto_quitar'
 where clave = 'cotizaciones.editar';
update public.permisos set aplicado_en = 'cotizacion_moderar, cotizacion_comentario_borrar, cotizacion_adjunto_quitar' where clave = 'cotizaciones.moderar';
