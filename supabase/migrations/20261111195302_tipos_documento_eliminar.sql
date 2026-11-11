-- Tipos de documento: eliminar o desactivar y contar su uso (paso 5.03, C9 y C12).
--   C9. `tipo_documento_eliminar(id, versión)`: sin uso se borra; con documentos (también los de la papelera: la FK los ve) o con un requisito que lo
--       pide, se desactiva y los requisitos quedan (D7). Los conteos se cortan en 51 (D9; los escribe `conteoAcotado()` en el 5.09).
--   C12. `tipos_documento_con_uso(flujo)`: el uso de cada tipo de un grupo, para que la pantalla diga antes qué va a pasar.

-- Cuántos documentos y requisitos usan un tipo, cada conteo con tope 51 (por documentos_tipo_documento_id_idx y
-- fases_requisitos_tipo_documento_id_idx). Recibe el id, no la fila: no es una columna calculada de PostgREST.
create or replace function public._tipo_documento_uso(p_id uuid, out documentos integer, out requisitos integer)
language sql stable
set search_path = ''
as $$
  select (select count(*)::integer from (select 1 from public.documentos d where d.tipo_documento_id = p_id limit 51) q),
         (select count(*)::integer from (select 1 from public.fases_requisitos r where r.tipo_documento_id = p_id limit 51) q)
$$;

create or replace function public.tipo_documento_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.tipos_documento; u record;
begin
  select * into o from public.tipos_documento x where x.id = p_id;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._tipo_documento_exigir_permiso(o.flujo_id);
  lock table public.tipos_documento in share row exclusive mode;
  select * into o from public.tipos_documento x where x.id = p_id for update;
  if not found then
    raise exception 'Ese tipo de documento ya no existe.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este tipo de documento mientras lo editabas.');
  select * into u from public._tipo_documento_uso(p_id);
  if u.documentos = 0 and u.requisitos = 0 then
    begin
      delete from public.tipos_documento x where x.id = p_id;
      return jsonb_build_object('accion', 'eliminado', 'documentos', 0, 'requisitos', 0, 'actualizado_en', null);
    exception when foreign_key_violation then
      -- Una fila que lo usa entró entre la cuenta y el borrado: se desactiva.
      select * into u from public._tipo_documento_uso(p_id);
    end;
  end if;
  if o.activo then
    update public.tipos_documento x set activo = false where x.id = p_id returning x.actualizado_en into o.actualizado_en;
  end if;
  return jsonb_build_object('accion', 'desactivado', 'documentos', u.documentos, 'requisitos', u.requisitos, 'actualizado_en', o.actualizado_en);
end;
$$;

create or replace function public.tipos_documento_con_uso(p_flujo uuid)
returns table (tipo_id uuid, documentos integer, requisitos integer)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public._tipo_documento_exigir_permiso(p_flujo);
  -- El grupo, por el btree de tipos_documento_flujo_id_nombre_key (flujo_id primero), con tope de la lista + 1.
  return query
    select t.id, u.documentos, u.requisitos
    from public.tipos_documento t, lateral public._tipo_documento_uso(t.id) u
    where (p_flujo is null and t.flujo_id is null) or t.flujo_id = p_flujo
    order by t.orden, t.nombre
    limit public._tipos_documento_tope() + 1;
end;
$$;

revoke all on function public._tipo_documento_uso(uuid) from public, anon, authenticated;
revoke all on function public.tipo_documento_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.tipo_documento_eliminar(uuid, timestamptz) to authenticated, service_role;
revoke all on function public.tipos_documento_con_uso(uuid) from public, anon;
grant execute on function public.tipos_documento_con_uso(uuid) to authenticated, service_role;
