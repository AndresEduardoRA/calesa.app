-- Documentos: revisar, editar y eliminar por RPC con versión (paso 6.05, C7–C11b; decisiones D2–D4, D9, D10).
--
-- Revisar (aprobar o rechazar con motivo) pide la clave de aprobar de la unidad; el permiso se mira antes que la versión, y la versión vieja da PT409.
-- Editar las fechas y la nota lo hace quien aprueba o quien subió mientras siga «subido» (D9); `visible_portal` sólo quien aprueba (D3). Eliminar es un
-- borrado suave sin restaurar (D2) y encola el objeto si ya ninguna fila viva lo usa: el refcount cuenta sólo las filas vivas de documentos (D4).

-- C7 · revisar.
create function public.documento_revisar(p_id uuid, p_actualizado_en_esperado timestamptz, p_estado public.estado_documento, p_motivo text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare d public.documentos; v_motivo text := nullif(btrim(p_motivo), '');
begin
  perform public.assert_activo();
  select * into d from public.documentos x where x.id = p_id for update;
  if not found or d.eliminado_en is not null then
    raise exception 'Ese documento ya no existe.' using errcode = 'PT409';
  end if;
  if not public.puede_unidad(d.vehiculo_id, d.repuesto_id, 'logistica.documentos.aprobar', 'repuestos.documentos.aprobar') then
    raise exception 'No puedes revisar este documento.' using errcode = '42501';
  end if;
  perform public._exigir_version(d.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este documento mientras lo revisabas.');
  if p_estado is null or p_estado not in ('aprobado', 'rechazado') then
    raise exception 'Un documento se aprueba o se rechaza.' using errcode = '22023', hint = 'estado';
  end if;
  if p_estado = 'rechazado' and (v_motivo is null or char_length(v_motivo) > 500) then
    raise exception 'Rechazar pide un motivo (hasta 500 caracteres).' using errcode = '22023', hint = 'motivo';
  end if;
  update public.documentos x
     set estado = p_estado, motivo_rechazo = case when p_estado = 'rechazado' then v_motivo end
   where x.id = d.id
  returning * into d;
  return jsonb_build_object('id', d.id, 'estado', d.estado, 'actualizado_en', d.actualizado_en);
end;
$$;

comment on function public.documento_revisar(uuid, timestamptz, public.estado_documento, text) is 'Aprueba o rechaza un documento vivo (si no existe, PT409). Pide logistica.documentos.aprobar del vehículo o repuestos.documentos.aprobar del repuesto (42501), antes que la versión (PT409). Rechazar pide motivo de 1 a 500 (22023/motivo); otro estado, 22023/estado. Aprobar limpia el motivo. Quitar un aprobado que exige la fase actual lo impide documento_exigido. Devuelve {id, estado, actualizado_en}. 6.05.';
revoke all on function public.documento_revisar(uuid, timestamptz, public.estado_documento, text) from public, anon;
grant execute on function public.documento_revisar(uuid, timestamptz, public.estado_documento, text) to authenticated;

-- C8–C10 · quién puede tocar un documento vivo: quien aprueba, o quien lo subió mientras siga «subido» y conserve la clave de subir (D9).
-- Escalares y no la fila: una función de public con la fila como argumento sería una columna calculada para PostgREST.
create function public._documento_puede_tocar(p_vehiculo uuid, p_repuesto uuid, p_subido_por uuid, p_estado public.estado_documento) returns boolean
language sql stable
set search_path = ''
as $$
  select public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.documentos.aprobar', 'repuestos.documentos.aprobar')
      or (p_subido_por = (select auth.uid()) and p_estado = 'subido'
          and public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.documentos.subir', 'repuestos.documentos.subir'));
$$;

comment on function public._documento_puede_tocar(uuid, uuid, uuid, public.estado_documento) is 'documento_editar y documento_eliminar: quien aprueba en la unidad, o quien lo subió mientras siga «subido» y conserve la clave de subir (6.05 D9). 6.05.';
revoke all on function public._documento_puede_tocar(uuid, uuid, uuid, public.estado_documento) from public, anon, authenticated;

-- Una fecha de p_cambios (null o 'AAAA-MM-DD'); si no lo es, 22023 con la clave como hint.
create function public._documento_fecha(p_cambios jsonb, p_clave text) returns date
language plpgsql stable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_cambios -> p_clave) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_cambios -> p_clave) <> 'string' or (p_cambios ->> p_clave) !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Esa fecha no es válida.' using errcode = '22023', hint = p_clave;
  end if;
  return (p_cambios ->> p_clave)::date;
exception when datetime_field_overflow or invalid_datetime_format then
  raise exception 'Esa fecha no es válida.' using errcode = '22023', hint = p_clave;
end;
$$;

comment on function public._documento_fecha(jsonb, text) is 'documento_editar: la fecha de esa clave (null o AAAA-MM-DD), o 22023 con la clave como hint. 6.05.';
revoke all on function public._documento_fecha(jsonb, text) from public, anon, authenticated;

-- C8 · editar las fechas, la nota o «visible en el portal».
create function public.documento_editar(p_id uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.documentos; td public.tipos_documento; k text; v_nota text; v_emitido date; v_vence date; v_portal boolean;
  v_admitidas constant text[] := array['emitido_el', 'vence_el', 'nota', 'visible_portal'];
begin
  perform public.assert_activo();
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Los cambios van como un objeto.' using errcode = '22023', hint = 'cambios';
  end if;
  for k in select jsonb_object_keys(p_cambios) loop
    if not (k = any (v_admitidas)) then
      raise exception 'No se puede cambiar «%» de un documento.', k using errcode = '22023', hint = k;
    end if;
  end loop;
  select * into d from public.documentos x where x.id = p_id for update;
  if not found or d.eliminado_en is not null then
    raise exception 'Ese documento ya no existe.' using errcode = 'PT409';
  end if;
  if p_cambios ? 'visible_portal'
     and not public.puede_unidad(d.vehiculo_id, d.repuesto_id, 'logistica.documentos.aprobar', 'repuestos.documentos.aprobar') then
    raise exception 'Sólo quien aprueba documentos decide si se ve en el portal.' using errcode = '42501', hint = 'visible_portal';
  end if;
  if not public._documento_puede_tocar(d.vehiculo_id, d.repuesto_id, d.subido_por, d.estado) then
    raise exception 'No puedes editar este documento.' using errcode = '42501';
  end if;
  perform public._exigir_version(d.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este documento mientras lo editabas.');

  v_nota := d.nota; v_emitido := d.emitido_el; v_vence := d.vence_el; v_portal := d.visible_portal;
  if p_cambios ? 'nota' then
    if jsonb_typeof(p_cambios -> 'nota') not in ('string', 'null') or char_length(p_cambios ->> 'nota') > 2000 then
      raise exception 'La nota admite hasta 2000 caracteres.' using errcode = '22023', hint = 'nota';
    end if;
    v_nota := nullif(btrim(p_cambios ->> 'nota'), '');
  end if;
  if p_cambios ? 'visible_portal' then
    if jsonb_typeof(p_cambios -> 'visible_portal') <> 'boolean' then
      raise exception '«Visible en el portal» es sí o no.' using errcode = '22023', hint = 'visible_portal';
    end if;
    v_portal := (p_cambios -> 'visible_portal')::boolean;
  end if;
  -- Las fechas se revalidan sólo si cambian (C8.5): editar la nota no traba un tipo que cambió de modo.
  if p_cambios ? 'emitido_el' or p_cambios ? 'vence_el' then
    select * into td from public.tipos_documento t where t.id = d.tipo_documento_id;
    if p_cambios ? 'emitido_el' then v_emitido := public._documento_fecha(p_cambios, 'emitido_el'); end if;
    if p_cambios ? 'vence_el' then
      v_vence := public._documento_fecha(p_cambios, 'vence_el');
    elsif td.modo_vencimiento = 'renovar' then
      v_vence := null;
    end if;
    v_vence := public._documento_vence(td.modo_vencimiento, td.vigencia_dias, v_emitido, v_vence, d.creado_en::date);
  end if;

  update public.documentos x
     set nota = v_nota, emitido_el = v_emitido, vence_el = v_vence, visible_portal = v_portal
   where x.id = d.id
  returning * into d;
  return jsonb_build_object('id', d.id, 'actualizado_en', d.actualizado_en);
end;
$$;

comment on function public.documento_editar(uuid, timestamptz, jsonb) is 'Edita emitido_el, vence_el, nota o visible_portal de un documento vivo (si no existe, PT409; otra clave, 22023 con la clave). visible_portal pide la clave de aprobar (42501/visible_portal); lo demás, quien aprueba o quien lo subió mientras siga «subido» con la clave de subir (42501). La versión vieja da PT409. Las fechas se revalidan según el modo del tipo sólo si cambian (22023/vence_el); un tipo que no admite el portal da 23514 al encenderlo. Devuelve {id, actualizado_en}. 6.05.';
revoke all on function public.documento_editar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.documento_editar(uuid, timestamptz, jsonb) to authenticated;

-- C10 · eliminar (borrado suave, sin restaurar: D2). El objeto va a la cola de limpieza si ya ninguna fila viva lo usa.
create function public.documento_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare d public.documentos;
begin
  perform public.assert_activo();
  select * into d from public.documentos x where x.id = p_id for update;
  if not found or d.eliminado_en is not null then
    raise exception 'Ese documento ya no existe.' using errcode = 'PT409';
  end if;
  if not public._documento_puede_tocar(d.vehiculo_id, d.repuesto_id, d.subido_por, d.estado) then
    raise exception 'No puedes eliminar este documento.' using errcode = '42501';
  end if;
  perform public._exigir_version(d.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este documento mientras lo eliminabas.');
  update public.documentos x set eliminado_en = now(), eliminado_por = (select auth.uid()) where x.id = d.id;
  perform public._encolar_para_limpiar('documentos', array[d.ruta], false);
  return jsonb_build_object('id', d.id);
end;
$$;

comment on function public.documento_eliminar(uuid, timestamptz) is 'Elimina (borrado suave, sin restaurar) un documento vivo (si no existe, PT409): quien aprueba o quien lo subió mientras siga «subido» con la clave de subir (42501, que se mira con logistica.documentos.aprobar / repuestos.documentos.aprobar y logistica.documentos.subir / repuestos.documentos.subir). La versión vieja da PT409. El que exige la fase actual no se elimina (documento_exigido, 23514). Encola el objeto si ya ninguna fila viva lo usa. Devuelve {id}. 6.05.';
revoke all on function public.documento_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.documento_eliminar(uuid, timestamptz) to authenticated;

-- C11 · el refcount de documentos cuenta sólo las filas vivas (D4): una eliminada ya no retiene su objeto. Lo demás, idéntico a la base.
create or replace function public.storage_refcount(p_bucket text, p_ruta text) returns integer
language sql stable security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta = p_ruta) +
    (select count(*) from public.vehiculos_imagenes where p_bucket = 'vehiculos' and ruta_miniatura = p_ruta) +
    (select count(*) from public.repuestos_items_imagenes where p_bucket = 'repuestos' and ruta = p_ruta) +
    (select count(*) from public.documentos where p_bucket = 'documentos' and ruta = p_ruta and eliminado_en is null) +
    (select count(*) from public.cotizaciones_adjuntos where p_bucket = 'cotizaciones' and ruta = p_ruta) +
    (select count(*) from public.gastos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.pagos where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.repuestos_compras where p_bucket = 'comprobantes' and comprobante_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_ruta = p_ruta) +
    (select count(*) from public.perfiles where p_bucket = 'avatares' and avatar_miniatura_ruta = p_ruta) +
    (select count(*) from public.web_guias where p_bucket = 'web' and portada_ruta = p_ruta) +
    (select count(*) from public.web_testimonios where p_bucket = 'web' and foto_ruta = p_ruta) +
    (select count(*) from public.ajustes_empresa where p_bucket = 'marca' and (logo_ruta = p_ruta or logo_oscuro_ruta = p_ruta)) +
    (select count(*) from public.ajustes_empresa e, jsonb_each_text(coalesce(e.iconos, '{}'::jsonb)) i where p_bucket = 'marca' and i.value = p_ruta)
  )::int;
$$;

-- C11b · la regla del portal mira sólo cuando visible_portal se enciende: un documento visible de un tipo al que luego se le apagó el permiso
-- (D8 de 5.03) se puede seguir revisando, editando y eliminando. Lo demás, idéntico a la base.
create or replace function public.documento_sellos() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.subido_por := (select auth.uid());
    if new.estado = 'aprobado' then new.estado := 'subido'; end if;   -- nadie nace aprobado
  elsif new.estado is distinct from old.estado and new.estado in ('aprobado', 'rechazado') then
    new.revisado_por := (select auth.uid()); new.revisado_en := now();
    if new.estado = 'rechazado' and coalesce(new.motivo_rechazo, '') = '' then
      raise exception 'Rechazar pide motivo.' using errcode = '23514';
    end if;
  end if;
  if new.visible_portal and (tg_op = 'INSERT' or not old.visible_portal)
     and not exists (select 1 from public.tipos_documento td where td.id = new.tipo_documento_id and td.visible_portal_permitido) then
    raise exception 'Este tipo de documento no puede mostrarse en el portal.' using errcode = '23514';
  end if;
  return new;
end;
$$;
