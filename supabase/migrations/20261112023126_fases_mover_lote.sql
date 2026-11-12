-- Mover un lote con la fase esperada de cada unidad (paso 6.02-1, C5 y C6). La de antes recibía `uuid[]`, pasaba la esperada nula (desde 6.02-1, «la
-- espero sin fase») y se tragaba cualquier error con `when others`: un bug abortaba en silencio unidad por unidad. Ahora cada elemento es
-- `{vehiculo, fase_esperada}` y el resultado dice, por unidad y en el orden de entrada, `{vehiculo_id, ok, codigo, motivo, historial_id}`: `codigo` es el
-- `hint` del rechazo de `cambiar_fase` (conflicto, requisitos, rol, transicion, nota, acceso, unidad). Sólo se atrapan PT409, 23514, 42501 y 22023; lo demás
-- aborta el lote entero. Las unidades se mueven en orden de id (los candados en un orden fijo: dos lotes con los mismos vehículos no se trancan).

drop function public.cambiar_fase_lote(uuid[], uuid, text);

create function public.cambiar_fase_lote(p_unidades jsonb, p_fase_destino uuid, p_nota text default null) returns jsonb
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  e jsonb; v uuid; v_ids uuid[] := '{}'::uuid[]; v_esperadas uuid[] := '{}'::uuid[]; i int; h bigint; salida jsonb[]; v_m text; v_h text;
begin
  -- Una cuenta bloqueada aborta el lote entero (no 200 filas con el 42501 sin código de `assert_activo`).
  perform public.assert_activo();
  if jsonb_typeof(p_unidades) is distinct from 'array' or jsonb_array_length(p_unidades) not between 1 and 200 then
    raise exception 'Un lote lleva de 1 a 200 unidades.' using errcode = '22023', hint = 'p_unidades';
  end if;
  -- La forma es del llamador, no de una unidad: un elemento mal formado o repetido no mueve nada. Los ids se validan antes de convertir (un cast
  -- inválido daría 22P02).
  for e in select x from jsonb_array_elements(p_unidades) x loop
    if jsonb_typeof(e) is distinct from 'object' or jsonb_typeof(e -> 'vehiculo') is distinct from 'string'
       or not pg_input_is_valid(e ->> 'vehiculo', 'uuid')
       or coalesce(jsonb_typeof(e -> 'fase_esperada'), 'null') not in ('string', 'null')
       or (jsonb_typeof(e -> 'fase_esperada') = 'string' and not pg_input_is_valid(e ->> 'fase_esperada', 'uuid')) then
      raise exception 'Cada unidad del lote es {vehiculo, fase_esperada} con ids válidos.' using errcode = '22023', hint = 'p_unidades';
    end if;
    v := (e ->> 'vehiculo')::uuid;
    if v = any (v_ids) then
      raise exception 'Un vehículo está dos veces en el lote.' using errcode = '22023', hint = 'p_unidades';
    end if;
    v_ids := array_append(v_ids, v);
    v_esperadas := array_append(v_esperadas, (e ->> 'fase_esperada')::uuid);
  end loop;
  salida := array_fill(null::jsonb, array[cardinality(v_ids)]);
  for i in select o.n from unnest(v_ids) with ordinality o (id, n) order by o.id loop
    begin
      h := public.cambiar_fase(v_ids[i], null, p_fase_destino, p_nota, v_esperadas[i]);
      salida[i] := jsonb_build_object('vehiculo_id', v_ids[i], 'ok', true, 'codigo', null, 'motivo', null, 'historial_id', h);
    exception when sqlstate 'PT409' or check_violation or insufficient_privilege or invalid_parameter_value then
      get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
      salida[i] := jsonb_build_object('vehiculo_id', v_ids[i], 'ok', false, 'codigo', nullif(v_h, ''), 'motivo', v_m, 'historial_id', null);
    end;
  end loop;
  return to_jsonb(salida);
end;
$$;

revoke all on function public.cambiar_fase_lote(jsonb, uuid, text) from public, anon;
grant execute on function public.cambiar_fase_lote(jsonb, uuid, text) to authenticated, service_role;

comment on function public.cambiar_fase_lote(jsonb, uuid, text) is
  'Mueve hasta 200 vehículos a una fase (paso 6.02-1): p_unidades = [{vehiculo, fase_esperada}]; devuelve por unidad, en el orden de entrada, '
  '{vehiculo_id, ok, codigo, motivo, historial_id}. Un lote mal formado da 22023 (hint p_unidades) sin mover nada.';

-- La vista previa de hasta 200 en una llamada. Invocadora: sólo llama a la `definer` de una unidad, que ya mira el acceso de cada una.
create function public.previsualizar_cambio_fase_lote(p_vehiculos uuid[], p_fase uuid) returns jsonb
  language plpgsql
  stable
  set search_path = ''
as $$
begin
  if coalesce(array_length(p_vehiculos, 1), 0) > 200 then
    raise exception 'La vista previa lleva hasta 200 vehículos.' using errcode = '22023', hint = 'p_vehiculos';
  end if;
  return coalesce((
    select jsonb_agg(public.previsualizar_cambio_fase(x.id, null, p_fase) || jsonb_build_object('vehiculo_id', x.id) order by x.n)
      from unnest(p_vehiculos) with ordinality x (id, n)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.previsualizar_cambio_fase_lote(uuid[], uuid) from public, anon;
grant execute on function public.previsualizar_cambio_fase_lote(uuid[], uuid) to authenticated, service_role;
