-- El ciclo de vida de un proyecto de repuestos, sólo por RPC (paso 8.08-1, C1–C4).
--   C1. `repuesto_proyecto_crear(id, datos)`: de un vehículo que quien crea ve (`vehiculos.ver` con su alcance) o externo (con etiqueta). Idempotente
--       por id, como `vehiculo_crear`. El 23505 del índice `repuestos_proyecto_por_vehiculo` dice «Ese vehículo ya tiene un proyecto.».
--   C2. `repuesto_proyecto_cerrar` / `_reabrir`, con versión.
--   C3. `repuesto_proyecto_eliminar`: sólo vacío (sin ítems vivos, compras, pagos ni cotizaciones); borrado suave.
--   C3b. `repuesto_proyecto_restaurar`: el «Deshacer» de eliminar, contra el `eliminado_en` que se vio.
--   C4. Se quitan el INSERT directo y el UPDATE de tabla: `eliminado_en`, `cerrado_en`, `vehiculo_id` y `creado_por` sólo cambian por RPC. Un proyecto
--       de un vehículo no lleva etiqueta ni VIN propios (lo asegura un `check`, porque esas dos columnas siguen editables).
-- Toda RPC que escribe pide `repuestos.editar` antes de tomar el candado (auditoría del plan, hallazgo 1). El lead lo exige `trg_lead_visible`.

create function public.repuesto_proyecto_crear(p_id uuid, p_datos jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  p public.repuestos_proyectos;
  v_datos jsonb := coalesce(p_datos, '{}'::jsonb);
  k text;
  v_vehiculo uuid; v_lead uuid;
  v_etiqueta text; v_vin text; v_cliente text; v_telefono text; v_notas text;
begin
  if p_id is null then
    raise exception 'Falta el identificador del proyecto.' using errcode = '22023', hint = 'id';
  end if;
  perform public.assert_permiso('repuestos.editar');

  select * into p from public.repuestos_proyectos x where x.id = p_id;
  if found then
    if p.creado_por is distinct from (select auth.uid()) then
      raise exception 'Ese identificador ya está en uso. Cierra el formulario y vuelve a abrirlo.' using errcode = '23505', hint = 'id';
    end if;
    return jsonb_build_object('id', p.id, 'numero', p.numero, 'actualizado_en', p.actualizado_en);
  end if;

  if jsonb_typeof(v_datos) <> 'object' then
    raise exception 'Los datos del proyecto no son válidos.' using errcode = '22023', hint = 'datos';
  end if;
  for k in select jsonb_object_keys(v_datos) loop
    if k <> all (array['vehiculo_id', 'vehiculo_etiqueta', 'vin', 'lead_id', 'cliente_nombre', 'cliente_telefono', 'notas']) then
      raise exception 'El dato «%» no es de un proyecto.', k using errcode = '22023', hint = k;
    end if;
  end loop;
  begin
    v_vehiculo := nullif(btrim(v_datos ->> 'vehiculo_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'El vehículo no es válido.' using errcode = '22023', hint = 'vehiculo_id';
  end;
  begin
    v_lead := nullif(btrim(v_datos ->> 'lead_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'El lead no es válido.' using errcode = '22023', hint = 'lead_id';
  end;
  v_etiqueta := nullif(btrim(v_datos ->> 'vehiculo_etiqueta'), '');
  v_vin := nullif(btrim(v_datos ->> 'vin'), '');
  v_cliente := nullif(btrim(v_datos ->> 'cliente_nombre'), '');
  v_telefono := nullif(btrim(v_datos ->> 'cliente_telefono'), '');
  v_notas := nullif(btrim(v_datos ->> 'notas'), '');

  if v_vehiculo is not null then
    -- El mismo texto exista o no: no se revela un vehículo que no se ve.
    if not public.puede_vehiculo(v_vehiculo, 'vehiculos.ver') then
      raise exception 'No encontramos este vehículo o no tienes acceso.' using errcode = '42501', hint = 'vehiculo_id';
    end if;
    if v_etiqueta is not null or v_vin is not null then
      raise exception 'Un proyecto de un vehículo toma sus datos del vehículo.' using errcode = '22023', hint = 'vehiculo_etiqueta';
    end if;
  elsif v_etiqueta is null then
    raise exception 'Escribe qué vehículo es.' using errcode = '22023', hint = 'vehiculo_etiqueta';
  end if;

  begin
    insert into public.repuestos_proyectos (id, vehiculo_id, vehiculo_etiqueta, vin, lead_id, cliente_nombre, cliente_telefono, notas, creado_por)
    values (p_id, v_vehiculo, v_etiqueta, v_vin, v_lead, v_cliente, v_telefono, v_notas, (select auth.uid()))
    returning * into p;
  exception when unique_violation then
    raise exception 'Ese vehículo ya tiene un proyecto.' using errcode = '23505', hint = 'vehiculo_id';
  end;
  return jsonb_build_object('id', p.id, 'numero', p.numero, 'actualizado_en', p.actualizado_en);
end;
$$;

-- Toma el proyecto vivo con candado y comprueba la versión; lo comparten cerrar, reabrir y eliminar.
create function public._repuesto_proyecto_tomar(p_proyecto uuid, p_esperado timestamptz)
returns public.repuestos_proyectos
language plpgsql security definer
set search_path = ''
as $$
declare p public.repuestos_proyectos;
begin
  select * into p from public.repuestos_proyectos x where x.id = p_proyecto for update;
  if not found or p.eliminado_en is not null then
    raise exception 'Este proyecto ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._exigir_version(p.actualizado_en, p_esperado, 'Otra persona cambió este proyecto. Recarga para ver lo nuevo.');
  return p;
end;
$$;

create function public.repuesto_proyecto_cerrar(p_proyecto uuid, p_actualizado_en_esperado timestamptz)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare p public.repuestos_proyectos;
begin
  perform public.assert_permiso('repuestos.editar');
  p := public._repuesto_proyecto_tomar(p_proyecto, p_actualizado_en_esperado);
  if p.cerrado_en is not null then
    raise exception 'Este proyecto ya está cerrado.' using errcode = '23514', hint = 'estado';
  end if;
  update public.repuestos_proyectos x set cerrado_en = now() where x.id = p.id returning * into p;
  return jsonb_build_object('id', p.id, 'actualizado_en', p.actualizado_en, 'cerrado_en', p.cerrado_en);
end;
$$;

create function public.repuesto_proyecto_reabrir(p_proyecto uuid, p_actualizado_en_esperado timestamptz)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare p public.repuestos_proyectos;
begin
  perform public.assert_permiso('repuestos.editar');
  p := public._repuesto_proyecto_tomar(p_proyecto, p_actualizado_en_esperado);
  if p.cerrado_en is null then
    raise exception 'Este proyecto ya está abierto.' using errcode = '23514', hint = 'estado';
  end if;
  update public.repuestos_proyectos x set cerrado_en = null where x.id = p.id returning * into p;
  return jsonb_build_object('id', p.id, 'actualizado_en', p.actualizado_en, 'cerrado_en', p.cerrado_en);
end;
$$;

create function public.repuesto_proyecto_eliminar(p_proyecto uuid, p_actualizado_en_esperado timestamptz)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare p public.repuestos_proyectos;
begin
  perform public.assert_permiso('repuestos.editar');
  p := public._repuesto_proyecto_tomar(p_proyecto, p_actualizado_en_esperado);
  if exists (select 1 from public.repuestos_items i where i.proyecto_id = p.id and i.eliminado_en is null) then
    raise exception 'Tiene ítems: ciérralo en vez de eliminarlo.' using errcode = '23514', hint = 'en_uso';
  end if;
  if exists (select 1 from public.repuestos_compras c where c.proyecto_id = p.id and c.eliminado_en is null)
     or exists (select 1 from public.pagos g where g.proyecto_repuestos_id = p.id and g.eliminado_en is null)
     or exists (select 1 from public.repuestos_cotizaciones q where q.proyecto_id = p.id) then
    raise exception 'Tiene compras, pagos o cotizaciones: ciérralo en vez de eliminarlo.' using errcode = '23514', hint = 'en_uso';
  end if;
  update public.repuestos_proyectos x set eliminado_en = now() where x.id = p.id returning * into p;
  return jsonb_build_object('id', p.id, 'eliminado_en', p.eliminado_en);
end;
$$;

create function public.repuesto_proyecto_restaurar(p_proyecto uuid, p_eliminado_en_esperado timestamptz)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare p public.repuestos_proyectos;
begin
  perform public.assert_permiso('repuestos.editar');
  select * into p from public.repuestos_proyectos x where x.id = p_proyecto for update;
  if not found or p.eliminado_en is null or p_eliminado_en_esperado is null or p.eliminado_en <> p_eliminado_en_esperado then
    raise exception 'Este proyecto ya no se puede restaurar. Recarga para ver lo nuevo.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  begin
    update public.repuestos_proyectos x set eliminado_en = null where x.id = p.id returning * into p;
  exception when unique_violation then
    raise exception 'Ese vehículo ya tiene otro proyecto.' using errcode = '23505', hint = 'vehiculo_id';
  end;
  return jsonb_build_object('id', p.id, 'actualizado_en', p.actualizado_en);
end;
$$;

revoke all on function public.repuesto_proyecto_crear(uuid, jsonb) from public, anon;
revoke all on function public.repuesto_proyecto_cerrar(uuid, timestamptz) from public, anon;
revoke all on function public.repuesto_proyecto_reabrir(uuid, timestamptz) from public, anon;
revoke all on function public.repuesto_proyecto_eliminar(uuid, timestamptz) from public, anon;
revoke all on function public.repuesto_proyecto_restaurar(uuid, timestamptz) from public, anon;
grant execute on function public.repuesto_proyecto_crear(uuid, jsonb) to authenticated, service_role;
grant execute on function public.repuesto_proyecto_cerrar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.repuesto_proyecto_reabrir(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.repuesto_proyecto_eliminar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.repuesto_proyecto_restaurar(uuid, timestamptz) to authenticated, service_role;
revoke all on function public._repuesto_proyecto_tomar(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._repuesto_proyecto_tomar(uuid, timestamptz) to service_role;

-- C4. Sin escrituras directas de lo que da permisos o cambia el estado.
drop policy "repuestos_proyectos: crear" on public.repuestos_proyectos;
revoke insert, update on public.repuestos_proyectos from authenticated;
grant update (vehiculo_etiqueta, vin, lead_id, cliente_nombre, cliente_telefono, notas) on public.repuestos_proyectos to authenticated;

alter table public.repuestos_proyectos
  add constraint repuestos_proyectos_vehiculo_o_etiqueta check (vehiculo_id is null or (vehiculo_etiqueta is null and vin is null)) not valid;
alter table public.repuestos_proyectos validate constraint repuestos_proyectos_vehiculo_o_etiqueta;
