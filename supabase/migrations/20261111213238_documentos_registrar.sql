-- Documentos: registrar por RPC después de subir el objeto (paso 6.05, C1–C6; decisiones D1, D5–D8).
--
-- El archivo se sube antes al bucket `documentos` (`<unidad>/<sha256>.<ext>`, por hash) y `documento_registrar` lo registra para una o varias
-- unidades: N vehículos dan N filas con la misma ruta (un objeto, N filas: D1), en una sentencia. Es idempotente: los ids derivan de `p_id` y de la
-- unidad (D6), así que reintentar devuelve las mismas filas. Nadie nace aprobado (`documento_sellos`). El mime y los bytes de storage pesan más que
-- los del cliente (D8); los formatos y el vencimiento salen del tipo (D7). La versión de la fila es propia (se mueve dos veces en una transacción).

-- C3 · el vencimiento que queda según el modo del tipo (D7): se valida, no se limpia.
create function public._documento_vence(p_modo public.modo_vencimiento, p_vigencia integer, p_emitido date, p_vence date, p_subido date)
returns date
language plpgsql
set search_path = ''
as $$
declare v_vence date := p_vence;
begin
  if p_modo = 'ninguno' and v_vence is not null then
    raise exception 'Este tipo de documento no vence: no lleva fecha de vencimiento.' using errcode = '22023', hint = 'vence_el';
  elsif p_modo = 'solicitar' and v_vence is null then
    raise exception 'Este tipo de documento pide la fecha de vencimiento.' using errcode = '22023', hint = 'vence_el';
  elsif p_modo = 'renovar' and v_vence is null and p_vigencia is not null then
    v_vence := coalesce(p_emitido, p_subido) + p_vigencia;
  end if;
  if v_vence is not null and p_emitido is not null and v_vence < p_emitido then
    raise exception 'El vencimiento no puede ser antes de la emisión.' using errcode = '22023', hint = 'vence_el';
  end if;
  return v_vence;
end;
$$;

comment on function public._documento_vence(public.modo_vencimiento, integer, date, date, date) is 'El vencimiento de un documento según el modo de su tipo (6.05 D7): ninguno con fecha, solicitar sin fecha o vence antes de emitir dan 22023/vence_el; renovar sin fecha la calcula desde la emisión (o la subida) más la vigencia. 6.05.';
revoke all on function public._documento_vence(public.modo_vencimiento, integer, date, date, date) from public, anon, authenticated;

-- C1.2–C1.3 · una sola clase de unidad, hasta 100 sin repetir, y la clave de subir en cada una.
create function public._documento_validar_unidades(p_vehiculos uuid[], p_repuesto uuid) returns uuid[]
language plpgsql
set search_path = ''
as $$
declare v_n int := coalesce(cardinality(p_vehiculos), 0);
begin
  if (p_repuesto is null) = (v_n = 0) or array_position(p_vehiculos, null) is not null then
    raise exception 'Elige los vehículos o el repuesto del documento.' using errcode = '22023', hint = 'unidad';
  end if;
  if v_n > 100 or v_n <> cardinality(array(select distinct u from unnest(p_vehiculos) u)) then
    raise exception 'Hasta 100 vehículos distintos por documento.' using errcode = '22023', hint = 'vehiculos';
  end if;
  if p_repuesto is not null then
    if not public.puede_repuesto(p_repuesto, 'repuestos.documentos.subir') then
      raise exception 'No puedes subir documentos a este repuesto.' using errcode = '42501';
    end if;
    return array[p_repuesto];
  end if;
  if exists (select 1 from unnest(p_vehiculos) u where not public.puede_vehiculo(u, 'logistica.documentos.subir')) then
    raise exception 'No puedes subir documentos a una de estas unidades.' using errcode = '42501';
  end if;
  return p_vehiculos;
end;
$$;

comment on function public._documento_validar_unidades(uuid[], uuid) is 'documento_registrar: vehículos (1 a 100, sin nulos ni repetidos) o un repuesto (22023/unidad, 22023/vehiculos), con logistica.documentos.subir en cada vehículo o repuestos.documentos.subir en el repuesto (42501). Devuelve las unidades. 6.05.';
revoke all on function public._documento_validar_unidades(uuid[], uuid) from public, anon, authenticated;

-- C1.5 · el tipo: existe, activo y global o del flujo de cada unidad.
create function public._documento_tipo_de(p_vehiculos uuid[], p_repuesto uuid, p_tipo uuid) returns public.tipos_documento
language plpgsql
set search_path = ''
as $$
declare td public.tipos_documento;
begin
  select * into td from public.tipos_documento t where t.id = p_tipo and t.activo;
  if not found
     or (td.flujo_id is not null and p_repuesto is not null
         and not exists (select 1 from public.flujos f where f.id = td.flujo_id and f.ambito = 'repuestos'))
     or (td.flujo_id is not null and p_repuesto is null
         and exists (select 1 from unnest(p_vehiculos) u join public.vehiculos v on v.id = u
                     where not exists (select 1 from public.flujos f where f.id = td.flujo_id and f.origen_id = v.origen_id))) then
    raise exception 'Ese tipo de documento no existe o no es de este flujo.' using errcode = '22023', hint = 'tipo';
  end if;
  return td;
end;
$$;

comment on function public._documento_tipo_de(uuid[], uuid, uuid) is 'documento_registrar: el tipo activo, global o del flujo de cada unidad (22023/tipo). 6.05.';
revoke all on function public._documento_tipo_de(uuid[], uuid, uuid) from public, anon, authenticated;

-- C1.6–C1.9 · la ruta en la carpeta de una de las unidades, el nombre, el objeto en storage y su tipo y tamaño (de la metadata si están).
create function public._documento_validar_archivo(p_ruta text, p_unidades uuid[], p_nombre text, p_mime text, p_bytes integer, p_formatos text[],
                                                  out o_mime text, out o_bytes integer)
language plpgsql
set search_path = ''
as $_$
declare v_meta jsonb; v_bytes bigint;
begin
  if p_ruta is null or p_ruta !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.[a-z0-9]{1,5}$'
     or not (split_part(p_ruta, '/', 1) = any (array(select u::text from unnest(p_unidades) u))) then
    raise exception 'El archivo no está en la carpeta de una de estas unidades.' using errcode = '22023', hint = 'ruta';
  end if;
  if btrim(p_nombre) is null or char_length(btrim(p_nombre)) not between 1 and 200 or p_nombre ~ '[/\\]' then
    raise exception 'Ponle un nombre al archivo (hasta 200 caracteres, sin barras).' using errcode = '22023', hint = 'nombre';
  end if;
  -- Con el candado del objeto y fuera de la cola de limpieza antes de mirarlo (C1.8).
  perform public.storage_gc_rescatar('documentos', p_ruta);
  select o.metadata into v_meta from storage.objects o where o.bucket_id = 'documentos' and o.name = p_ruta;
  if not found then
    raise exception 'El archivo no terminó de subir. Vuelve a intentarlo.' using errcode = '22023', hint = 'ruta';
  end if;
  o_mime := coalesce(v_meta ->> 'mimetype', p_mime);
  v_bytes := coalesce((v_meta ->> 'size')::bigint, p_bytes);
  if o_mime is null or not (o_mime = any (p_formatos)) then
    raise exception 'Ese formato no se admite para este tipo de documento.' using errcode = '22023', hint = 'mime';
  end if;
  if v_bytes is null or v_bytes not between 1 and 26214400 then
    raise exception 'El archivo está vacío o pesa más de 25 MB.' using errcode = '22023', hint = 'bytes';
  end if;
  o_bytes := v_bytes::integer;
end;
$_$;

comment on function public._documento_validar_archivo(text, uuid[], text, text, integer, text[]) is 'documento_registrar: la ruta <unidad>/<sha256>.<ext> en la carpeta de una unidad de la llamada, el nombre (1 a 200, sin barras), el objeto en storage (rescatado de la cola de limpieza), el mime en los formatos del tipo y de 1 byte a 25 MB, con mime y tamaño de la metadata si están (22023 con hint). 6.05.';
revoke all on function public._documento_validar_archivo(text, uuid[], text, text, integer, text[]) from public, anon, authenticated;

-- Las filas de un registro, como las devuelve documento_registrar.
create function public._documentos_de(p_ids uuid[]) returns jsonb
language sql stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'vehiculo_id', d.vehiculo_id, 'repuesto_id', d.repuesto_id,
                                               'actualizado_en', d.actualizado_en) order by d.id), '[]'::jsonb)
  from public.documentos d where d.id = any (p_ids);
$$;

comment on function public._documentos_de(uuid[]) is 'documento_registrar: [{id, vehiculo_id, repuesto_id, actualizado_en}] de esos ids, por id. 6.05.';
revoke all on function public._documentos_de(uuid[]) from public, anon, authenticated;

-- C1.4 · el registro ya existe: los N ids con la misma ruta y de quien llama. Si no, 23505/id.
create function public._documento_ya_registrado(p_ids uuid[], p_ruta text) returns jsonb
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(p_ids) i
             where not exists (select 1 from public.documentos d
                               where d.id = i and d.ruta = p_ruta and d.subido_por = (select auth.uid()) and d.eliminado_en is null)) then
    raise exception 'Ese registro ya existe con otros datos. Recarga e intenta de nuevo.' using errcode = '23505', hint = 'id';
  end if;
  return public._documentos_de(p_ids);
end;
$$;

comment on function public._documento_ya_registrado(uuid[], text) is 'documento_registrar idempotente: con los N ids derivados vivos, la misma ruta y de quien llama devuelve sus filas; si no, 23505/id. 6.05.';
revoke all on function public._documento_ya_registrado(uuid[], text) from public, anon, authenticated;

-- C1 · registrar.
create function public.documento_registrar(p_id uuid, p_vehiculos uuid[], p_repuesto uuid, p_tipo uuid, p_ruta text, p_nombre text, p_mime text,
                                           p_bytes integer, p_emitido_el date, p_vence_el date, p_nota text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_unidades uuid[]; v_ids uuid[]; td public.tipos_documento; a record; v_vence date; v_nota text := nullif(btrim(p_nota), ''); n int;
begin
  perform public.assert_activo();
  v_unidades := public._documento_validar_unidades(p_vehiculos, p_repuesto);
  if p_id is null then
    raise exception 'Falta el identificador del registro.' using errcode = '22023', hint = 'id';
  end if;
  v_ids := array(select md5(p_id::text || ':' || u::text)::uuid from unnest(v_unidades) u);
  if exists (select 1 from public.documentos d where d.id = any (v_ids)) then
    return public._documento_ya_registrado(v_ids, p_ruta);
  end if;
  td := public._documento_tipo_de(p_vehiculos, p_repuesto, p_tipo);
  select * into a from public._documento_validar_archivo(p_ruta, v_unidades, p_nombre, p_mime, p_bytes, td.formatos);
  v_vence := public._documento_vence(td.modo_vencimiento, td.vigencia_dias, p_emitido_el, p_vence_el, current_date);
  if char_length(v_nota) > 2000 then
    raise exception 'La nota admite hasta 2000 caracteres.' using errcode = '22023', hint = 'nota';
  end if;
  insert into public.documentos (id, vehiculo_id, repuesto_id, tipo_documento_id, estado, ruta, nombre_archivo, mime, bytes, emitido_el, vence_el, nota)
  select md5(p_id::text || ':' || u::text)::uuid, case when p_repuesto is null then u end, p_repuesto, td.id, 'subido', p_ruta, btrim(p_nombre),
         a.o_mime, a.o_bytes, p_emitido_el, v_vence, v_nota
  from unnest(v_unidades) u
  on conflict (id) do nothing;
  get diagnostics n = row_count;
  if n < cardinality(v_ids) then
    -- Un reintento simultáneo con el mismo p_id escribió antes: si calza, son las mismas filas.
    return public._documento_ya_registrado(v_ids, p_ruta);
  end if;
  return public._documentos_de(v_ids);
end;
$$;

comment on function public.documento_registrar(uuid, uuid[], uuid, uuid, text, text, text, integer, date, date, text) is 'Registra un archivo ya subido al bucket documentos para 1 a 100 vehículos (una fila por vehículo, la misma ruta) o un repuesto, en «subido». Pide logistica.documentos.subir en cada vehículo o repuestos.documentos.subir en el repuesto (42501). El tipo activo y global o del flujo de cada unidad (22023/tipo); ruta en la carpeta de una de las unidades, objeto existente, mime en los formatos del tipo, 1 byte a 25 MB (22023 con hint); vencimiento según el modo del tipo (22023/vence_el). Idempotente por p_id: reintentar devuelve las mismas filas; con otros datos, 23505/id. Devuelve [{id, vehiculo_id, repuesto_id, actualizado_en}]. 6.05.';
revoke all on function public.documento_registrar(uuid, uuid[], uuid, uuid, text, text, text, integer, date, date, text) from public, anon;
grant execute on function public.documento_registrar(uuid, uuid[], uuid, uuid, text, text, text, integer, date, date, text) to authenticated;

-- C4 · el objeto sale de la cola de limpieza al nacer una fila que lo usa (o avisa si ya se está limpiando).
create function public.documento_rescatar() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.ruta is not null then
    perform public.storage_gc_rescatar('documentos', new.ruta);
  end if;
  return new;
end;
$$;

comment on function public.documento_rescatar() is 'Trigger before insert de documentos: saca la ruta de la cola de limpieza de storage (o avisa si ya se está limpiando). 6.05.';
revoke all on function public.documento_rescatar() from public, anon, authenticated;

create trigger trg_documento_rescatar before insert on public.documentos
  for each row execute function public.documento_rescatar();

-- C5 · la versión propia: se mueve en cada cambio, también dos veces en una transacción (set_actualizado_en pone now()).
drop trigger trg_actualizado_en on public.documentos;

create function public.documento_version() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := greatest(clock_timestamp(), old.actualizado_en + interval '1 microsecond');
  return new;
end;
$$;

comment on function public.documento_version() is 'Trigger before update de documentos: la versión de la fila con greatest(clock_timestamp(), anterior + 1 µs), para que se mueva dos veces en una transacción. 6.05.';
revoke all on function public.documento_version() from public, anon, authenticated;

create trigger trg_documento_version before update on public.documentos
  for each row execute function public.documento_version();
