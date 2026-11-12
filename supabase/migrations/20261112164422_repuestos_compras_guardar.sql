-- Compras de un proyecto de repuestos: escribir sólo por RPC, con el monto en base que calcula la base (paso 8.11-1, C1–C8).
--   C1. `tipo_cambio_id` congela el tipo de cambio con su valor (`tipo_cambio_aplicado`), como en `pagos`; la versión propia se mueve dos veces por transacción.
--   C2. Sin escritura directa: sin las policies de crear y editar y sin insert, update ni delete para authenticated. Queda la de leer.
--   C3. La tasa es la del tipo por defecto vigente de la moneda a la base (o al revés) al crear o al cambiar la moneda; editar sin cambiar la moneda la
--       conserva. Lo que el cliente crea saber de `monto_base` o de la tasa no entra (lista cerrada: 22023).
--   C4–C7. `repuesto_compra_guardar` (crea con la esperada nula, idempotente por id; edita con ella), `repuesto_compra_eliminar` y
--       `repuesto_compra_restaurar`. Piden `repuestos.costos.editar` y `repuestos.ver`. El proyecto, vivo y abierto, se toma `for share`.

alter table public.repuestos_compras add column tipo_cambio_id uuid references public.tipos_cambio (id) on delete restrict;
create index repuestos_compras_tipo_cambio_id_idx on public.repuestos_compras using btree (tipo_cambio_id);
comment on column public.repuestos_compras.tipo_cambio_id is
  'El tipo de cambio por defecto vigente cuando se guardó la compra (o se cambió su moneda). tipo_cambio_aplicado guarda su valor en ese momento; el sentido sale del tipo.';

create trigger trg_compra_version before update on public.repuestos_compras for each row execute function public.dinero_version();

-- C3 · el tipo por defecto vigente de esa moneda a la base: primero moneda → base y, si no hay, base → moneda. Nulo en la moneda base.
create or replace function public._repuesto_compra_tc_vigente(p_moneda text) returns uuid
language sql stable
set search_path = ''
as $$
  select t.id
    from public.tipos_cambio t
    join public.ajustes_empresa e on e.id = 1
   where t.activo and t.es_default
     and ((t.moneda_de::text = p_moneda and t.moneda_a = e.moneda_base) or (t.moneda_de = e.moneda_base and t.moneda_a::text = p_moneda))
   order by (t.moneda_de::text = p_moneda) desc
   limit 1;
$$;

-- C6 · el proyecto de la compra, vivo y abierto, tomado `for share` (el `for update` de eliminarlo espera a esta compra, o la compra lo ve eliminado).
create or replace function public._repuesto_compra_proyecto(p_proyecto uuid) returns public.repuestos_proyectos
language plpgsql
set search_path = ''
as $$
declare p public.repuestos_proyectos;
begin
  select * into p from public.repuestos_proyectos x where x.id = p_proyecto for share;
  if not found or p.eliminado_en is not null then
    raise exception 'Este proyecto ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if p.cerrado_en is not null then
    raise exception 'El proyecto está cerrado: reábrelo para registrar compras.' using errcode = '23514', hint = 'proyecto';
  end if;
  return p;
end;
$$;

-- C3–C4 · la compra que resulta de aplicar `p_datos` a `o`: lista cerrada, validada y con el monto en base recalculado. `p_crear`: la tasa siempre se busca.
create or replace function public._repuesto_compra_de_datos(o public.repuestos_compras, p_datos jsonb, p_crear boolean) returns public.repuestos_compras
language plpgsql
set search_path = ''
as $$
declare
  n public.repuestos_compras := o;
  k text; v_txt text; v_num numeric; v_item uuid; v_base text; v_tc uuid; c record;
  i public.repuestos_items;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de la compra van como un objeto.' using errcode = '22023', hint = 'datos';
  end if;
  select x into k from jsonb_object_keys(p_datos) x
   where x <> all (array['proyecto_id', 'item_id', 'proveedor', 'moneda', 'monto', 'fecha', 'comprobante_ruta', 'notas'])
   limit 1;
  if k is not null then
    raise exception 'No se cambia «%».', k using errcode = '22023', hint = k;
  end if;

  if p_datos ? 'proyecto_id' then
    begin
      v_item := nullif(btrim(p_datos ->> 'proyecto_id'), '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Una compra no cambia de proyecto.' using errcode = '22023', hint = 'proyecto_id';
    end;
    if v_item is distinct from o.proyecto_id then
      raise exception 'Una compra no cambia de proyecto.' using errcode = '22023', hint = 'proyecto_id';
    end if;
  end if;

  if p_datos ? 'proveedor' then
    n.proveedor := nullif(btrim(p_datos ->> 'proveedor'), '');
    if char_length(n.proveedor) > 200 then
      raise exception 'El proveedor va en 200 caracteres como mucho.' using errcode = '22023', hint = 'proveedor';
    end if;
  end if;
  if p_datos ? 'notas' then
    n.notas := nullif(btrim(p_datos ->> 'notas'), '');
    if char_length(n.notas) > 2000 then
      raise exception 'Las notas van en 2000 caracteres como mucho.' using errcode = '22023', hint = 'notas';
    end if;
  end if;

  if p_datos ? 'moneda' then
    v_txt := nullif(upper(btrim(p_datos ->> 'moneda')), '');
    if v_txt is null then
      raise exception 'Elige la moneda de la compra.' using errcode = '23502', hint = 'moneda';
    end if;
    if not exists (select 1 from public.monedas m where m.codigo::text = v_txt) then
      raise exception 'Elige una moneda activa.' using errcode = '22023', hint = 'moneda';
    end if;
    n.moneda := v_txt;
  end if;
  if n.moneda is null then
    raise exception 'Elige la moneda de la compra.' using errcode = '23502', hint = 'moneda';
  end if;

  if p_datos ? 'monto' then
    begin
      v_num := nullif(btrim(p_datos ->> 'monto'), '')::numeric;
    exception when invalid_text_representation then
      raise exception 'El monto no es un número válido.' using errcode = '22023', hint = 'monto';
    end;
    if v_num is null then
      raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
    end if;
    -- Los decimales se miran antes de asignar: la columna numeric(18,2) redondearía en silencio.
    if v_num <> round(v_num, 2) then
      raise exception 'El monto lleva como mucho dos decimales.' using errcode = '22023', hint = 'monto';
    end if;
    if v_num < 0 then
      raise exception 'El monto no puede ser negativo.' using errcode = '22023', hint = 'monto';
    end if;
    if v_num >= 1e16 then
      raise exception 'El monto no cabe: revisa la cifra.' using errcode = '22023', hint = 'monto';
    end if;
    n.monto := v_num;
  end if;
  if n.monto is null then
    raise exception 'Falta el monto.' using errcode = '23502', hint = 'monto';
  end if;

  if p_datos ? 'fecha' then
    begin
      n.fecha := nullif(btrim(p_datos ->> 'fecha'), '')::date;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'La fecha no es válida.' using errcode = '22023', hint = 'fecha';
    end;
  end if;
  if n.fecha is null then
    raise exception 'Falta la fecha.' using errcode = '23502', hint = 'fecha';
  end if;

  if p_datos ? 'comprobante_ruta' then
    n.comprobante_ruta := nullif(btrim(p_datos ->> 'comprobante_ruta'), '');
  end if;
  if not public._comprobante_ruta_valida(n.proyecto_id, n.comprobante_ruta) then
    raise exception 'El comprobante no está en la carpeta de este proyecto.' using errcode = '22023', hint = 'comprobante_ruta';
  end if;

  if p_datos ? 'item_id' then
    begin
      v_item := nullif(btrim(p_datos ->> 'item_id'), '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ese ítem no es de este proyecto.' using errcode = '22023', hint = 'item_id';
    end;
    if v_item is not null and v_item is distinct from o.item_id then
      -- Un ítem con compras vivas no se borra (`repuesto_item_eliminar`): se toma `for share` para que no se borre a la vez.
      select * into i from public.repuestos_items x where x.id = v_item for share;
      if not found or i.eliminado_en is not null or i.proyecto_id <> n.proyecto_id then
        raise exception 'Ese ítem no es de este proyecto.' using errcode = '22023', hint = 'item_id';
      end if;
    end if;
    n.item_id := v_item;
  end if;

  select e.moneda_base::text into v_base from public.ajustes_empresa e where e.id = 1;
  if p_crear or n.moneda is distinct from o.moneda or (o.tipo_cambio_id is null and n.moneda::text <> v_base) then
    if not exists (select 1 from public.monedas m where m.codigo::text = n.moneda::text and m.activa) then
      raise exception 'Elige una moneda activa.' using errcode = '22023', hint = 'moneda';
    end if;
    v_tc := public._repuesto_compra_tc_vigente(n.moneda::text);
    if v_tc is null and n.moneda::text <> v_base then
      raise exception 'No hay un tipo de cambio por defecto de % a %: márcalo en los tipos de cambio de la empresa.', n.moneda, v_base
        using errcode = '23502', hint = 'moneda';
    end if;
    c := public._monto_en_base(n.moneda::text, v_tc, n.monto);
  else
    c := public._monto_en_base(n.moneda::text, o.tipo_cambio_id, n.monto, o.tipo_cambio_aplicado);
  end if;
  n.tipo_cambio_id := c.tipo_cambio_id;
  n.tipo_cambio_aplicado := c.tipo_cambio_aplicado;
  n.monto_base := c.monto_base;
  return n;
end;
$$;

create or replace function public._repuesto_compra_respuesta(c public.repuestos_compras, p_extra jsonb) returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en, 'tipo_cambio_aplicado', c.tipo_cambio_aplicado, 'monto_base', c.monto_base)
         || p_extra;
$$;

-- C5 · crear (la esperada nula) o editar (la esperada puesta).
create or replace function public.repuesto_compra_guardar(p_id uuid, p_datos jsonb, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.repuestos_compras; n public.repuestos_compras; v_proyecto uuid;
begin
  perform public.assert_permiso('repuestos.costos.editar');
  perform public.assert_permiso('repuestos.ver');
  if p_id is null then
    raise exception 'Falta el identificador de la compra.' using errcode = '23502', hint = 'id';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los datos de la compra van como un objeto.' using errcode = '22023', hint = 'datos';
  end if;

  if p_actualizado_en_esperado is null then
    begin
      v_proyecto := nullif(btrim(p_datos ->> 'proyecto_id'), '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ese proyecto no existe.' using errcode = '22023', hint = 'proyecto_id';
    end;
    select * into o from public.repuestos_compras x where x.id = p_id;
    if not found then
      if v_proyecto is null then
        raise exception 'Falta el proyecto de la compra.' using errcode = '23502', hint = 'proyecto_id';
      end if;
      perform public._repuesto_compra_proyecto(v_proyecto);
      o.id := p_id;
      o.proyecto_id := v_proyecto;
      o.fecha := current_date;
      n := public._repuesto_compra_de_datos(o, p_datos, true);
      insert into public.repuestos_compras (id, proyecto_id, item_id, proveedor, moneda, monto, tipo_cambio_id, tipo_cambio_aplicado, monto_base, fecha,
                                            comprobante_ruta, notas, creado_por)
      values (p_id, n.proyecto_id, n.item_id, n.proveedor, n.moneda, n.monto, n.tipo_cambio_id, n.tipo_cambio_aplicado, n.monto_base, n.fecha,
              n.comprobante_ruta, n.notas, (select auth.uid()))
      on conflict (id) do nothing
      returning * into n;
      if found then
        return public._repuesto_compra_respuesta(n, '{"ya_existia": false}');
      end if;
      select * into o from public.repuestos_compras x where x.id = p_id;
    end if;
    -- D3 · un reintento con el mismo id devuelve lo guardado y nunca pisa.
    if o.proyecto_id is distinct from v_proyecto then
      raise exception 'Ese id ya es de otra compra.' using errcode = '23505', hint = 'id';
    end if;
    if o.eliminado_en is not null then
      raise exception 'Esta compra ya no existe.' using errcode = 'PT409', hint = 'conflicto';
    end if;
    return public._repuesto_compra_respuesta(o, '{"ya_existia": true}');
  end if;

  select * into o from public.repuestos_compras x where x.id = p_id for update;
  if not found or o.eliminado_en is not null then
    raise exception 'Esta compra ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._repuesto_compra_proyecto(o.proyecto_id);
  n := public._repuesto_compra_de_datos(o, p_datos, false);
  if (n.item_id, n.proveedor, n.moneda, n.monto, n.tipo_cambio_id, n.tipo_cambio_aplicado, n.monto_base, n.fecha, n.comprobante_ruta, n.notas)
     is not distinct from
     (o.item_id, o.proveedor, o.moneda, o.monto, o.tipo_cambio_id, o.tipo_cambio_aplicado, o.monto_base, o.fecha, o.comprobante_ruta, o.notas) then
    return public._repuesto_compra_respuesta(o, '{"sin_cambios": true}');
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta compra. Recarga para ver lo nuevo.');
  update public.repuestos_compras x
     set item_id = n.item_id, proveedor = n.proveedor, moneda = n.moneda, monto = n.monto, tipo_cambio_id = n.tipo_cambio_id,
         tipo_cambio_aplicado = n.tipo_cambio_aplicado, monto_base = n.monto_base, fecha = n.fecha, comprobante_ruta = n.comprobante_ruta, notas = n.notas
   where x.id = p_id
  returning * into n;
  return public._repuesto_compra_respuesta(n, '{"sin_cambios": false}');
end;
$$;

-- C7 · eliminar (suave).
create or replace function public.repuesto_compra_eliminar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.repuestos_compras; v_en timestamptz;
begin
  perform public.assert_permiso('repuestos.costos.editar');
  perform public.assert_permiso('repuestos.ver');
  select * into o from public.repuestos_compras x where x.id = p_id for update;
  if not found or o.eliminado_en is not null then
    raise exception 'Esta compra ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._repuesto_compra_proyecto(o.proyecto_id);
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta compra. Recarga para ver lo nuevo.');
  update public.repuestos_compras x set eliminado_en = now() where x.id = p_id returning x.actualizado_en into v_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_en);
end;
$$;

-- C7 · restaurar (D5: el «Deshacer» de eliminar). Una compra viva vuelve tal cual; si su ítem se eliminó, no vuelve (un ítem con compras no se borra).
create or replace function public.repuesto_compra_restaurar(p_id uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare o public.repuestos_compras; i public.repuestos_items; v_en timestamptz;
begin
  perform public.assert_permiso('repuestos.costos.editar');
  perform public.assert_permiso('repuestos.ver');
  select * into o from public.repuestos_compras x where x.id = p_id for update;
  if not found then
    raise exception 'Esta compra ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._repuesto_compra_proyecto(o.proyecto_id);
  if o.eliminado_en is null then
    return jsonb_build_object('id', p_id, 'actualizado_en', o.actualizado_en);
  end if;
  perform public._exigir_version(o.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió esta compra. Recarga para ver lo nuevo.');
  if o.item_id is not null then
    select * into i from public.repuestos_items x where x.id = o.item_id for share;
    if not found or i.eliminado_en is not null then
      raise exception 'El ítem de esta compra se eliminó: restáuralo o registra la compra sin ítem.' using errcode = '23514', hint = 'item_id';
    end if;
  end if;
  update public.repuestos_compras x set eliminado_en = null where x.id = p_id returning x.actualizado_en into v_en;
  return jsonb_build_object('id', p_id, 'actualizado_en', v_en);
end;
$$;

-- C8 · privilegios.
revoke all on function public._repuesto_compra_tc_vigente(text) from public, anon, authenticated;
revoke all on function public._repuesto_compra_proyecto(uuid) from public, anon, authenticated;
revoke all on function public._repuesto_compra_de_datos(public.repuestos_compras, jsonb, boolean) from public, anon, authenticated;
revoke all on function public._repuesto_compra_respuesta(public.repuestos_compras, jsonb) from public, anon, authenticated;
grant execute on function public._repuesto_compra_tc_vigente(text) to service_role;
grant execute on function public._repuesto_compra_proyecto(uuid) to service_role;
grant execute on function public._repuesto_compra_de_datos(public.repuestos_compras, jsonb, boolean) to service_role;
grant execute on function public._repuesto_compra_respuesta(public.repuestos_compras, jsonb) to service_role;

revoke all on function public.repuesto_compra_guardar(uuid, jsonb, timestamptz) from public, anon;
revoke all on function public.repuesto_compra_eliminar(uuid, timestamptz) from public, anon;
revoke all on function public.repuesto_compra_restaurar(uuid, timestamptz) from public, anon;
grant execute on function public.repuesto_compra_guardar(uuid, jsonb, timestamptz) to authenticated, service_role;
grant execute on function public.repuesto_compra_eliminar(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.repuesto_compra_restaurar(uuid, timestamptz) to authenticated, service_role;

-- C2 · sin escritura directa.
drop policy "repuestos_compras: crear" on public.repuestos_compras;
drop policy "repuestos_compras: editar" on public.repuestos_compras;
revoke insert, update, delete on table public.repuestos_compras from authenticated;

comment on table public.repuestos_compras is
  'COSTO. Se lee sólo con repuestos.costos.ver. El margen del proyecto = Σ precios de ítems − Σ compras, por moneda. Escritura sólo por repuesto_compra_guardar, repuesto_compra_eliminar y repuesto_compra_restaurar: el monto en base y la tasa los pone la base.';

update public.permisos set aplicado_en = 'repuesto_compra_guardar, repuesto_compra_eliminar, repuesto_compra_restaurar, comprobante_puede'
 where clave = 'repuestos.costos.editar';
update public.permisos set aplicado_en = 'policy repuestos_compras, policy pagos, policy gastos, policy repuestos_cotizaciones, comprobante_puede'
 where clave = 'repuestos.costos.ver';
