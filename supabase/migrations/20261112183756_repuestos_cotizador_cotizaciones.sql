-- Cotizaciones de repuestos: crear y guardar por RPC, con el total que calcula la base sobre el snapshot (paso 8.12-1, C9–C13).
--   C10. `repuestos_cotizacion_crear` congela en `config_snapshot` la configuración de id más alto, los tramos activos y las cajas activas de la
--        moneda (versión 1, números como texto). Idempotente por id.
--   C11–C13. `repuestos_cotizacion_guardar` reemplaza las líneas (lista cerrada: lo que el cliente crea saber del total no entra) y recalcula cada
--        sugerencia y cada total con `_repuesto_cotizacion_linea` sobre **su** snapshot. Un error de una línea dice «Línea N: …», con `hint` = el
--        campo y `detail` = el id de la línea.
--   Piden `repuestos.cotizar` y `repuestos.ver`; el proyecto, vivo y abierto, se toma `for share` (D8).

-- C9 · el proyecto de la cotización, vivo y abierto.
create or replace function public._repuesto_cotizacion_proyecto(p_proyecto uuid) returns void
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
    raise exception 'El proyecto está cerrado: reábrelo para cotizar.' using errcode = '23514', hint = 'proyecto';
  end if;
end;
$$;

-- D15 · la cotización, tomada `for update`, en borrador y con un snapshot de la versión 1 (las escritas por el cliente antes de las RPC no lo tienen).
create or replace function public._repuesto_cotizacion_para_cambiar(p_id uuid, p_esperado timestamptz) returns public.repuestos_cotizaciones
language plpgsql
set search_path = ''
as $$
declare c public.repuestos_cotizaciones;
begin
  select * into c from public.repuestos_cotizaciones x where x.id = p_id for update;
  if not found then
    raise exception 'Esta cotización ya no existe.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  perform public._repuesto_cotizacion_proyecto(c.proyecto_id);
  perform public._exigir_version(c.actualizado_en, p_esperado, 'Otra persona cambió esta cotización. Recarga para ver lo nuevo.');
  if c.estado <> 'borrador' then
    raise exception 'Una cotización aceptada o anulada no se edita.' using errcode = '23514', hint = 'estado';
  end if;
  if c.config_snapshot ->> 'version' is distinct from '1' then
    raise exception 'Esta cotización no tiene una configuración válida: anúlala y crea otra.' using errcode = '23514', hint = 'config_snapshot';
  end if;
  return c;
end;
$$;

create or replace function public._repuesto_cotizacion_respuesta(c public.repuestos_cotizaciones, p_ya_existia boolean) returns jsonb
language sql immutable
set search_path = ''
as $$
  select jsonb_build_object('id', c.id, 'numero', c.numero, 'estado', c.estado, 'moneda', btrim(c.moneda), 'actualizado_en', c.actualizado_en,
                            'config_snapshot', c.config_snapshot, 'ya_existia', p_ya_existia);
$$;

-- C10 · crear.
create or replace function public.repuestos_cotizacion_crear(p_id uuid, p_proyecto uuid, p_moneda text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.repuestos_cotizaciones; k public.repuestos_cotizador_config; v_moneda text := nullif(upper(btrim(p_moneda)), ''); v_snap jsonb;
begin
  perform public.assert_permiso('repuestos.cotizar');
  perform public.assert_permiso('repuestos.ver');
  if p_id is null then
    raise exception 'Falta el identificador de la cotización.' using errcode = '23502', hint = 'id';
  end if;
  if p_proyecto is null then
    raise exception 'Falta el proyecto de la cotización.' using errcode = '23502', hint = 'proyecto_id';
  end if;
  select * into c from public.repuestos_cotizaciones x where x.id = p_id;
  if not found then
    perform public._repuesto_cotizacion_proyecto(p_proyecto);
    if v_moneda is null or not exists (select 1 from public.monedas m where m.codigo::text = v_moneda and m.activa) then
      raise exception 'Elige una moneda activa.' using errcode = '22023', hint = 'moneda';
    end if;
    select * into k from public.repuestos_cotizador_config x order by x.id desc limit 1;
    if not found then
      raise exception 'Todavía no hay configuración del cotizador: publícala en Configuración › Repuestos.' using errcode = '23514', hint = 'config';
    end if;
    v_snap := jsonb_build_object(
      'version', 1,
      'moneda', v_moneda,
      'config', jsonb_build_object('id', k.id, 'factor_importado', k.factor_importado::text, 'recargo_local', k.recargo_local::text,
                                   'redondeo', k.redondeo::text, 'vigente_desde', k.vigente_desde),
      'tramos', coalesce((select jsonb_agg(jsonb_build_object('costo_min', t.costo_min::text, 'costo_max', t.costo_max::text, 'monto', t.monto::text)
                                           order by t.costo_min)
                            from public.repuestos_tramos_logistica t where t.moneda::text = v_moneda and t.activo), '[]'::jsonb),
      'cajas', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'monto', b.monto::text) order by b.monto, b.id)
                           from public.repuestos_cajas b where b.moneda::text = v_moneda and b.activa), '[]'::jsonb));
    insert into public.repuestos_cotizaciones (id, proyecto_id, moneda, estado, config_snapshot, total, creado_por)
    values (p_id, p_proyecto, v_moneda, 'borrador', v_snap, null, (select auth.uid()))
    on conflict (id) do nothing
    returning * into c;
    if found then
      return public._repuesto_cotizacion_respuesta(c, false);
    end if;
    select * into c from public.repuestos_cotizaciones x where x.id = p_id;
  end if;
  -- Un reintento con el mismo id devuelve la que ya está y nunca pisa.
  if c.proyecto_id is distinct from p_proyecto or btrim(c.moneda) is distinct from v_moneda then
    raise exception 'Ese id ya es de otra cotización.' using errcode = '23505', hint = 'id';
  end if;
  return public._repuesto_cotizacion_respuesta(c, true);
end;
$$;

-- C12 · un monto de una línea: texto o número, ≥ 0, con dos decimales como mucho y que quepa; o nulo.
create or replace function public._repuesto_cotizacion_monto(p_linea jsonb, p_clave text) returns numeric
language plpgsql immutable
set search_path = ''
as $$
declare v numeric;
begin
  begin
    v := nullif(btrim(p_linea ->> p_clave), '')::numeric;
  exception when invalid_text_representation then
    raise exception 'el % no es un número válido.', p_clave using errcode = '22023', hint = p_clave;
  end;
  if v is null then
    return null;
  end if;
  if v = 'NaN'::numeric or v < 0 then
    raise exception 'el % no puede ser negativo.', p_clave using errcode = '22023', hint = p_clave;
  end if;
  if v >= 1e16 then
    raise exception 'el % no cabe: revisa la cifra.', p_clave using errcode = '22023', hint = p_clave;
  end if;
  -- Antes de asignar: la columna numeric(18,2) redondearía en silencio.
  if v <> round(v, 2) then
    raise exception 'el % lleva como mucho dos decimales.', p_clave using errcode = '22023', hint = p_clave;
  end if;
  return v;
end;
$$;

-- C12 · una línea de `p_lineas` validada (lista cerrada), sin calcular todavía. `item_id` se mira después, con todos a la vez.
create or replace function public._repuesto_cotizacion_linea_de(p_linea jsonb, p_cotizacion uuid, p_orden integer, p_snapshot jsonb)
returns public.repuestos_cotizaciones_lineas
language plpgsql stable
set search_path = ''
as $$
declare l public.repuestos_cotizaciones_lineas; k text; v_txt text; v_num numeric;
begin
  if p_linea is null or jsonb_typeof(p_linea) <> 'object' then
    raise exception 'cada línea va como un objeto.' using errcode = '22023', hint = 'lineas';
  end if;
  select x into k from jsonb_object_keys(p_linea) x
   where x <> all (array['id', 'item_id', 'descripcion', 'tipo_pieza_id', 'condicion_id', 'bloque', 'cantidad', 'costo', 'logistica', 'caja'])
   limit 1;
  if k is not null then
    raise exception 'no se escribe «%».', k using errcode = '22023', hint = k;
  end if;
  begin
    l.id := nullif(btrim(p_linea ->> 'id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'el identificador de la línea no es válido.' using errcode = '22023', hint = 'id';
  end;
  begin
    l.item_id := nullif(btrim(p_linea ->> 'item_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'ese ítem no es de este proyecto.' using errcode = '22023', hint = 'item_id';
  end;
  if l.id is null then
    raise exception 'falta el identificador de la línea.' using errcode = '23502', hint = 'id';
  end if;
  l.cotizacion_id := p_cotizacion;
  l.orden := p_orden;

  l.descripcion := nullif(btrim(p_linea ->> 'descripcion'), '');
  if l.descripcion is null then
    raise exception 'falta la descripción.' using errcode = '23502', hint = 'descripcion';
  end if;
  if char_length(l.descripcion) > 200 then
    raise exception 'la descripción va en 200 caracteres como mucho.' using errcode = '22023', hint = 'descripcion';
  end if;
  l.tipo_pieza_id := public._repuesto_catalogo(p_linea, 'tipo_pieza_id', 'tipo_pieza');
  l.condicion_id := public._repuesto_catalogo(p_linea, 'condicion_id', 'condicion');

  l.bloque := nullif(btrim(p_linea ->> 'bloque'), '');
  if l.bloque is null then
    raise exception 'elige el bloque.' using errcode = '23502', hint = 'bloque';
  end if;
  if l.bloque not in ('importado', 'local') then
    raise exception 'el bloque es «importado» o «local».' using errcode = '22023', hint = 'bloque';
  end if;

  v_txt := nullif(btrim(p_linea ->> 'cantidad'), '');
  if v_txt is null then
    l.cantidad := 1;
  else
    begin
      v_num := v_txt::numeric;
    exception when invalid_text_representation then
      v_num := null;
    end;
    if v_num is null or v_num = 'NaN'::numeric or v_num <> trunc(v_num) or v_num < 1 or v_num > 100000 then
      raise exception 'la cantidad es un entero de 1 a 100000.' using errcode = '22023', hint = 'cantidad';
    end if;
    l.cantidad := v_num::integer;
  end if;

  l.costo := public._repuesto_cotizacion_monto(p_linea, 'costo');
  l.logistica := public._repuesto_cotizacion_monto(p_linea, 'logistica');
  l.caja := public._repuesto_cotizacion_monto(p_linea, 'caja');
  -- D1 · la caja es «sin caja» (0) o una de las del snapshot; la elegida queda como `caja_sugerida`.
  if l.caja is not null and l.caja <> 0
     and not exists (select 1 from jsonb_array_elements(coalesce(p_snapshot -> 'cajas', '[]'::jsonb)) b where (b ->> 'monto')::numeric = l.caja) then
    raise exception 'esa caja no está entre las de esta cotización.' using errcode = '22023', hint = 'caja';
  end if;
  l.caja_sugerida := l.caja;
  return l;
end;
$$;

-- C11 · guardar: reemplaza las líneas y recalcula todo con el snapshot de la cotización.
create or replace function public.repuestos_cotizacion_guardar(p_id uuid, p_lineas jsonb, p_notas text, p_actualizado_en_esperado timestamptz)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  c public.repuestos_cotizaciones; l public.repuestos_cotizaciones_lineas;
  v_filas public.repuestos_cotizaciones_lineas[] := '{}'::public.repuestos_cotizaciones_lineas[];
  v_faltas text[] := '{}'::text[]; v_items uuid[] := '{}'::uuid[]; v_vivos uuid[]; v_ids uuid[] := '{}'::uuid[]; v_r jsonb;
  v_notas text := nullif(btrim(p_notas), ''); v_e text; v_m text; v_h text; v_total numeric; v_res jsonb := '[]'::jsonb;
begin
  perform public.assert_permiso('repuestos.cotizar');
  perform public.assert_permiso('repuestos.ver');
  c := public._repuesto_cotizacion_para_cambiar(p_id, p_actualizado_en_esperado);
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' then
    raise exception 'Las líneas van como una lista.' using errcode = '22023', hint = 'lineas';
  end if;
  if jsonb_array_length(p_lineas) > 200 then
    raise exception 'Una cotización lleva como mucho 200 líneas.' using errcode = '22023', hint = 'lineas';
  end if;
  if char_length(v_notas) > 2000 then
    raise exception 'Las notas van en 2000 caracteres como mucho.' using errcode = '22023', hint = 'notas';
  end if;

  -- C12–C13 · cada línea validada y calculada; su error dice qué línea es.
  for v_n in 1 .. jsonb_array_length(p_lineas) loop
    begin
      l := public._repuesto_cotizacion_linea_de(p_lineas -> (v_n - 1), p_id, v_n, c.config_snapshot);
      if l.id = any (v_ids) then
        raise exception 'esa línea está repetida.' using errcode = '22023', hint = 'id';
      end if;
      if l.item_id is not null and l.item_id = any (v_items) then
        raise exception 'ese ítem ya está en otra línea.' using errcode = '22023', hint = 'item_id';
      end if;
      v_r := public._repuesto_cotizacion_linea(c.config_snapshot, l.bloque, l.cantidad, l.costo, l.logistica, l.caja);
      if v_r ->> 'falta' = 'no_cabe' then
        raise exception 'el total no cabe: revisa la cantidad y el costo.' using errcode = '22023', hint = 'cantidad';
      end if;
    exception when others then
      get stacked diagnostics v_e = returned_sqlstate, v_m = message_text, v_h = pg_exception_hint;
      raise exception using message = format('Línea %s: %s', v_n, v_m), errcode = v_e, hint = coalesce(v_h, ''),
                            detail = coalesce(nullif(btrim(p_lineas -> (v_n - 1) ->> 'id'), ''), '');
    end;
    l.logistica_sugerida := (v_r ->> 'logistica_sugerida')::numeric;
    l.total := (v_r ->> 'total')::numeric;
    v_ids := v_ids || l.id;
    if l.item_id is not null then
      v_items := v_items || l.item_id;
    end if;
    v_filas := v_filas || l;
    v_faltas := v_faltas || (v_r ->> 'falta');
  end loop;

  -- C12 · los ítems, del mismo proyecto y vivos, tomados `for share` en orden de id (sin cruzarse con `aceptar`) en una sola consulta.
  select coalesce(array_agg(x.id), '{}') into v_vivos
    from (select x.id from public.repuestos_items x
           where x.id = any (v_items) and x.proyecto_id = c.proyecto_id and x.eliminado_en is null
           order by x.id for share) x;
  if cardinality(v_vivos) <> cardinality(v_items) then
    for i in 1 .. cardinality(v_filas) loop
      if v_filas[i].item_id is not null and not (v_filas[i].item_id = any (v_vivos)) then
        raise exception 'Línea %: ese ítem no es de este proyecto.', i using errcode = '22023', hint = 'item_id', detail = v_filas[i].id::text;
      end if;
    end loop;
  end if;

  delete from public.repuestos_cotizaciones_lineas x where x.cotizacion_id = p_id;
  begin
    insert into public.repuestos_cotizaciones_lineas select * from unnest(v_filas);
  exception when unique_violation then
    raise exception 'Una línea tiene el id de otra cotización.' using errcode = '23505', hint = 'id';
  end;

  -- D6 · el total es la suma si todas las líneas tienen total y hay al menos una; si no, nulo.
  if cardinality(v_filas) > 0 and not exists (select 1 from unnest(v_filas) f where f.total is null) then
    select sum(f.total) into v_total from unnest(v_filas) f;
  end if;
  update public.repuestos_cotizaciones x set total = v_total, notas = v_notas where x.id = p_id returning * into c;

  for i in 1 .. cardinality(v_filas) loop
    v_res := v_res || jsonb_build_array(jsonb_build_object('id', v_filas[i].id, 'logistica_sugerida', v_filas[i].logistica_sugerida::text,
                                                           'total', v_filas[i].total::text, 'falta', v_faltas[i]));
  end loop;
  return jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en, 'total', c.total::text, 'lineas', v_res);
end;
$$;

revoke all on function public._repuesto_cotizacion_proyecto(uuid) from public, anon, authenticated;
revoke all on function public._repuesto_cotizacion_para_cambiar(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public._repuesto_cotizacion_respuesta(public.repuestos_cotizaciones, boolean) from public, anon, authenticated;
revoke all on function public._repuesto_cotizacion_monto(jsonb, text) from public, anon, authenticated;
revoke all on function public._repuesto_cotizacion_linea_de(jsonb, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public._repuesto_cotizacion_proyecto(uuid) to service_role;
grant execute on function public._repuesto_cotizacion_para_cambiar(uuid, timestamptz) to service_role;
grant execute on function public._repuesto_cotizacion_respuesta(public.repuestos_cotizaciones, boolean) to service_role;
grant execute on function public._repuesto_cotizacion_monto(jsonb, text) to service_role;
grant execute on function public._repuesto_cotizacion_linea_de(jsonb, uuid, integer, jsonb) to service_role;

revoke all on function public.repuestos_cotizacion_crear(uuid, uuid, text) from public, anon;
revoke all on function public.repuestos_cotizacion_guardar(uuid, jsonb, text, timestamptz) from public, anon;
grant execute on function public.repuestos_cotizacion_crear(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.repuestos_cotizacion_guardar(uuid, jsonb, text, timestamptz) to authenticated, service_role;
