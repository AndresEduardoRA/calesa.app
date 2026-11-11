-- Guardar una transición por RPC (paso 5.05), con la versión del flujo. Sólo cambian la acción y la nota obligatoria: cambiar el origen o el
-- destino es eliminar y crear (los roles propios de la transición no se arrastran a otro destino). La actividad la deja `trg_auditar`.

create or replace function public.transicion_guardar(p_transicion uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases_transiciones;
  v_flujo uuid;
  v_clave text;
  v_tipo text;
begin
  -- La forma, sin mirar el estado (va antes del permiso).
  if p_cambios is null or jsonb_typeof(p_cambios) <> 'object' then
    raise exception 'Faltan los datos de la transición.' using errcode = '22023';
  end if;
  if p_cambios = '{}'::jsonb then
    raise exception 'No hay cambios para guardar.' using errcode = '22023';
  end if;
  for v_clave, v_tipo in select key, jsonb_typeof(value) from jsonb_each(p_cambios) loop
    if v_clave not in ('accion', 'nota_obligatoria') then
      raise exception 'El dato «%» no se cambia desde una transición.', v_clave using errcode = '22023', hint = v_clave;
    end if;
    -- `nota_obligatoria` es not null: un null cae aquí y no en un 23502 crudo.
    if (v_clave = 'accion' and v_tipo not in ('string', 'null')) or (v_clave = 'nota_obligatoria' and v_tipo <> 'boolean') then
      raise exception 'El dato «%» no tiene el formato esperado.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;
  if p_cambios ? 'accion' then
    perform public._transicion_accion(p_cambios ->> 'accion');
  end if;

  select flujo_id into v_flujo from public.fases_transiciones where id = p_transicion;
  if v_flujo is null then
    raise exception 'Esta transición ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases_transiciones where id = p_transicion for no key update;
  if not found then
    raise exception 'Esta transición ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  if p_cambios ? 'accion' then
    v.accion := public._transicion_accion(p_cambios ->> 'accion');
  end if;
  if p_cambios ? 'nota_obligatoria' then
    v.nota_obligatoria := (p_cambios ->> 'nota_obligatoria')::boolean;
  end if;
  update public.fases_transiciones t set accion = v.accion, nota_obligatoria = v.nota_obligatoria where t.id = p_transicion;
  return public._flujo_tocar(v_flujo);
end $$;

revoke all on function public.transicion_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.transicion_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;

comment on function public.transicion_guardar(uuid, timestamptz, jsonb) is
  'Guarda una transición (5.05). Forma: sólo accion (texto o null, hasta 40) y nota_obligatoria (boolean); otra clave o tipo → 22023 con hint. '
  'Inexistente → PT409; _flujo_para_editar (42501, PT409). Devuelve la versión nueva del flujo.';
