-- Los ítems de repuestos nacen y se borran sólo por RPC (paso 8.08-1, C5–C8).
--   C5. `repuesto_item_crear(id, proyecto, datos)`: pide `repuestos.editar`, idempotente por id; toma el proyecto `for share` antes de leer su estado
--       (choca con el `for update` de `repuesto_proyecto_eliminar`); un proyecto cerrado no recibe ítems. Valida cada dato con su clave en el hint.
--   C6. `_repuesto_fase_de_entrada(item)`: la única fase inicial activa del flujo de repuestos si no hay nada que decidir (nota, bloqueante sin cumplir,
--       rol), como `_vehiculo_fase_de_entrada`. Con fase, el ítem nace en ella con su fila de historial; sin fase (cero o varias iniciales), nace sin fase.
--   C7. `repuesto_item_eliminar(item, versión)`: sólo si no pasó por otra fase y no tiene documentos, compras, gastos ni stock. Si no, 23514
--       «<motivo> Pásalo a stock o márcalo perdido.».
--   C8. Se quita el INSERT directo de `repuestos_items`: `fase_id`, `stock_cantidad` y el nacimiento en la fase sólo los escribe la base.

create function public._repuesto_fase_de_entrada(p_item uuid)
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare v_iniciales uuid[]; f public.fases;
begin
  select array_agg(fa.id) into v_iniciales
  from public.fases fa join public.flujos fl on fl.id = fa.flujo_id
  where fl.ambito = 'repuestos' and fa.es_inicial and fa.activa;
  if coalesce(cardinality(v_iniciales), 0) <> 1 then return null; end if;
  select * into f from public.fases where id = v_iniciales[1];
  if f.nota_obligatoria then return null; end if;
  if exists (select 1 from public.evaluar_requisitos(null, p_item, f.id) e where e.bloqueante and not e.cumplido) then return null; end if;
  if exists (select 1 from public.fases_roles fr where fr.fase_id = f.id)
     and not exists (
       select 1 from public.fases_roles fr join public.usuarios_roles ur on ur.rol_id = fr.rol_id
       where fr.fase_id = f.id and ur.usuario_id = (select auth.uid())) then
    return null;
  end if;
  return f.id;
end;
$$;

-- Un valor de catálogo vivo y de su tipo; si no, 22023 con la clave.
create function public._repuesto_catalogo(p_datos jsonb, p_clave text, p_catalogo text)
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare v uuid;
begin
  begin
    v := nullif(btrim(p_datos ->> p_clave), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Ese valor ya no está en el catálogo.' using errcode = '22023', hint = p_clave;
  end;
  if v is not null and not exists (select 1 from public.repuestos_catalogos c where c.id = v and c.catalogo = p_catalogo and c.activo) then
    raise exception 'Ese valor ya no está en el catálogo.' using errcode = '22023', hint = p_clave;
  end if;
  return v;
end;
$$;

create function public.repuesto_item_crear(p_id uuid, p_proyecto uuid, p_datos jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  i public.repuestos_items;
  p public.repuestos_proyectos;
  v_datos jsonb := coalesce(p_datos, '{}'::jsonb);
  k text; v_desc text; v_cantidad integer; v_precio numeric; v_moneda text; v_fase uuid; v_flujo uuid;
begin
  perform public.assert_permiso('repuestos.editar');
  if p_id is null then
    raise exception 'Falta el identificador del ítem.' using errcode = '22023', hint = 'id';
  end if;
  if p_proyecto is null then
    raise exception 'Falta el proyecto del ítem.' using errcode = '22023', hint = 'proyecto';
  end if;

  select * into i from public.repuestos_items x where x.id = p_id;
  if found then
    if i.creado_por is distinct from (select auth.uid()) or i.proyecto_id <> p_proyecto then
      raise exception 'Ese identificador ya está en uso. Cierra el formulario y vuelve a abrirlo.' using errcode = '23505', hint = 'id';
    end if;
    return jsonb_build_object('id', i.id, 'actualizado_en', i.actualizado_en, 'fase_id', i.fase_id);
  end if;

  -- Antes de leer su estado: el `for update` de eliminar el proyecto espera a este ítem, o este ítem lo ve eliminado.
  select * into p from public.repuestos_proyectos x where x.id = p_proyecto for share;
  if not found or p.eliminado_en is not null then
    raise exception 'Este proyecto ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if p.cerrado_en is not null then
    raise exception 'El proyecto está cerrado: reábrelo para sumar ítems.' using errcode = '23514', hint = 'proyecto';
  end if;

  if jsonb_typeof(v_datos) <> 'object' then
    raise exception 'Los datos del ítem no son válidos.' using errcode = '22023', hint = 'datos';
  end if;
  for k in select jsonb_object_keys(v_datos) loop
    if k <> all (array['descripcion', 'tipo_pieza_id', 'condicion_id', 'pais_origen_id', 'modo_transporte_id', 'cantidad', 'precio_cliente', 'moneda',
                       'tracking', 'notas']) then
      raise exception 'El dato «%» no es de un ítem.', k using errcode = '22023', hint = k;
    end if;
  end loop;
  v_desc := nullif(btrim(v_datos ->> 'descripcion'), '');
  if v_desc is null or char_length(v_desc) > 500 then
    raise exception 'Escribe qué repuesto es (hasta 500 caracteres).' using errcode = '22023', hint = 'descripcion';
  end if;
  begin
    v_cantidad := coalesce(nullif(btrim(v_datos ->> 'cantidad'), '')::integer, 1);
  exception when invalid_text_representation or numeric_value_out_of_range then
    v_cantidad := 0;
  end;
  if v_cantidad < 1 then
    raise exception 'La cantidad es un número entero desde 1.' using errcode = '22023', hint = 'cantidad';
  end if;
  begin
    v_precio := nullif(btrim(v_datos ->> 'precio_cliente'), '')::numeric(18, 2);
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'El precio no es un número válido.' using errcode = '22023', hint = 'precio_cliente';
  end;
  if v_precio < 0 then
    raise exception 'El precio no puede ser negativo.' using errcode = '22023', hint = 'precio_cliente';
  end if;
  v_moneda := nullif(upper(btrim(v_datos ->> 'moneda')), '');
  if v_precio is not null and v_moneda is null then
    raise exception 'Elige la moneda del precio.' using errcode = '22023', hint = 'moneda';
  end if;
  if v_moneda is not null and not exists (select 1 from public.monedas m where m.codigo = v_moneda) then
    raise exception 'Esa moneda no existe.' using errcode = '22023', hint = 'moneda';
  end if;

  insert into public.repuestos_items (id, proyecto_id, descripcion, tipo_pieza_id, condicion_id, pais_origen_id, modo_transporte_id, cantidad,
    precio_cliente, moneda, tracking, notas, creado_por)
  values (p_id, p.id, v_desc,
    public._repuesto_catalogo(v_datos, 'tipo_pieza_id', 'tipo_pieza'),
    public._repuesto_catalogo(v_datos, 'condicion_id', 'condicion'),
    public._repuesto_catalogo(v_datos, 'pais_origen_id', 'pais_origen'),
    public._repuesto_catalogo(v_datos, 'modo_transporte_id', 'modo_transporte'),
    v_cantidad, v_precio, v_moneda, nullif(btrim(v_datos ->> 'tracking'), ''), nullif(btrim(v_datos ->> 'notas'), ''), (select auth.uid()))
  returning * into i;

  v_fase := public._repuesto_fase_de_entrada(i.id);
  if v_fase is not null then
    select f.flujo_id into v_flujo from public.fases f where f.id = v_fase;
    update public.repuestos_items x set fase_id = v_fase, fase_desde = now() where x.id = i.id returning * into i;
    insert into public.historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id, usuario_id)
    values (v_flujo, i.id, null, v_fase, (select auth.uid()));
  end if;
  return jsonb_build_object('id', i.id, 'actualizado_en', i.actualizado_en, 'fase_id', i.fase_id);
end;
$$;

create function public.repuesto_item_eliminar(p_item uuid, p_actualizado_en_esperado timestamptz)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare i public.repuestos_items; v_motivo text;
begin
  perform public.assert_permiso('repuestos.editar');
  select * into i from public.repuestos_items x where x.id = p_item for update;
  if not found or i.eliminado_en is not null
     or exists (select 1 from public.repuestos_proyectos pr where pr.id = i.proyecto_id and pr.eliminado_en is not null) then
    raise exception 'Este ítem ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._exigir_version(i.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este ítem. Recarga para ver lo nuevo.');

  if (select count(*) from (select 1 from public.historial_fases h where h.repuesto_id = i.id limit 2) h2) > 1
     or exists (select 1 from public.historial_fases h where h.repuesto_id = i.id and h.de_fase_id is not null) then
    v_motivo := 'Ya pasó por otra fase.';
  elsif exists (select 1 from public.documentos d where d.repuesto_id = i.id and d.eliminado_en is null) then
    v_motivo := 'Tiene documentos.';
  elsif exists (select 1 from public.repuestos_compras c where c.item_id = i.id and c.eliminado_en is null) then
    v_motivo := 'Tiene compras.';
  elsif exists (select 1 from public.gastos g where g.repuesto_id = i.id and g.eliminado_en is null) then
    v_motivo := 'Tiene gastos.';
  elsif i.stock_cantidad > 0 or i.en_stock_desde is not null
     or exists (select 1 from public.repuestos_stock_movimientos m where m.item_id = i.id) then
    v_motivo := 'Tiene movimientos de stock.';
  end if;
  if v_motivo is not null then
    raise exception '% Pásalo a stock o márcalo perdido.', v_motivo using errcode = '23514', hint = 'en_uso';
  end if;
  update public.repuestos_items x set eliminado_en = now() where x.id = i.id returning * into i;
  return jsonb_build_object('id', i.id, 'eliminado_en', i.eliminado_en);
end;
$$;

revoke all on function public.repuesto_item_crear(uuid, uuid, jsonb) from public, anon;
revoke all on function public.repuesto_item_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.repuesto_item_crear(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.repuesto_item_eliminar(uuid, timestamptz) to authenticated, service_role;
revoke all on function public._repuesto_fase_de_entrada(uuid) from public, anon, authenticated;
revoke all on function public._repuesto_catalogo(jsonb, text, text) from public, anon, authenticated;
grant execute on function public._repuesto_fase_de_entrada(uuid) to service_role;
grant execute on function public._repuesto_catalogo(jsonb, text, text) to service_role;

-- C8. Sin INSERT directo: el ítem nace por `repuesto_item_crear`. Los UPDATE por columna no cambian (`en_stock_desde` lo quita 8.10).
drop policy "repuestos_items: crear" on public.repuestos_items;
revoke insert on public.repuestos_items from authenticated;
