-- Aduana: poner y quitar vehículos de una declaración (paso 6.07-2, C7–C13). Una sola RPC con la versión de la cabecera. Quitar deja la fila con
-- `removido_en` (el historial); volver a agregar revive la misma fila. Un vehículo vivo en otra declaración lo frena el índice único
-- `declaraciones_vehiculo_activo_unico` al escribir: si otra sesión lo está quitando de la otra, se espera y entra (D24).
--
-- Candados, siempre en este orden: la cabecera `for update` → los vehículos por id `for share` → las filas, en un solo recorrido de agregar ∪ quitar
-- en orden de id. Toda espera (por la fila o por el índice único) va hacia un id mayor que lo ya tomado: dos sesiones que intercambian vehículos entre
-- dos declaraciones terminan con 23514, nunca con 40P01 (auditoría del plan, obj. 1).

-- C8–C9 · las listas: nulas = vacías; sin nulos, sin el mismo en las dos, a lo sumo 200 entre ambas; ordenadas y sin repetidos. Cada vehículo tiene que
-- verse con logistica.ver (D23), antes de tomar candados y sin decir cuál.
create function public._declaracion_vehiculos_listas(p_agregar uuid[], p_quitar uuid[], out agregar uuid[], out quitar uuid[])
language plpgsql stable
set search_path = ''
as $$
declare x uuid;
begin
  if array_position(coalesce(p_agregar, '{}'), null) is not null or array_position(coalesce(p_quitar, '{}'), null) is not null then
    raise exception 'Hay un vehículo vacío en la lista.' using errcode = '22023', hint = 'vehiculos';
  end if;
  agregar := coalesce((select array_agg(distinct u order by u) from unnest(p_agregar) u), '{}');
  quitar := coalesce((select array_agg(distinct u order by u) from unnest(p_quitar) u), '{}');
  if agregar && quitar then
    raise exception 'Un vehículo no se agrega y se quita a la vez.' using errcode = '22023', hint = 'vehiculos';
  end if;
  if cardinality(agregar) + cardinality(quitar) > 200 then
    raise exception 'A lo sumo 200 vehículos por vez.' using errcode = '22023', hint = 'vehiculos';
  end if;
  foreach x in array agregar || quitar loop
    if not public.puede_vehiculo(x, 'logistica.ver') then
      raise exception 'No ves uno de esos vehículos.' using errcode = '42501';
    end if;
  end loop;
end;
$$;

-- C11 · las unidades `for share` por id (esperan y hacen esperar a cambiar_fase, que las toma `for no key update`), y las reglas de lo que se agrega
-- y no está ya vivo en esta declaración (D25). Por vehiculos_pkey y flujos por origen.
create function public._declaracion_vehiculos_validar(p_declaracion uuid, p_agregar uuid[], p_todos uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare n int; r record;
begin
  perform 1 from public.vehiculos v where v.id = any (p_todos) and v.eliminado_en is null order by v.id for share of v;
  get diagnostics n = row_count;
  if n < cardinality(p_todos) then
    raise exception 'Uno de los vehículos ya no existe o está en la papelera. Recarga.' using errcode = 'PT409';
  end if;
  for r in
    select v.id, v.titulo, f.id as flujo, fa.nombre as fase, fa.permite_aduana
      from public.vehiculos v
      left join public.flujos f on f.origen_id = v.origen_id
      left join public.fases fa on fa.id = v.fase_id
     where v.id = any (p_agregar)
       and not exists (select 1 from public.declaraciones_vehiculos dv
                        where dv.declaracion_id = p_declaracion and dv.vehiculo_id = v.id and dv.removido_en is null)
     order by v.id
  loop
    if not public.flujo_regla_activa(r.flujo, 'aduana') then
      raise exception '«%»: el flujo de este vehículo no lleva aduana.', r.titulo using errcode = '23514', hint = 'aduana';
    end if;
    if r.fase is null then
      raise exception '«%»: no está en ninguna fase.', r.titulo using errcode = '23514', hint = 'fase';
    end if;
    if not r.permite_aduana then
      raise exception '«%»: la fase «%» no permite aduana.', r.titulo, r.fase using errcode = '23514', hint = 'fase';
    end if;
  end loop;
end;
$$;

revoke all on function public._declaracion_vehiculos_listas(uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public._declaracion_vehiculos_validar(uuid, uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public._declaracion_vehiculos_listas(uuid[], uuid[]) to service_role;
grant execute on function public._declaracion_vehiculos_validar(uuid, uuid[], uuid[]) to service_role;

-- C7, C10, C12, C13.
create function public.declaracion_vehiculos_poner(p_declaracion uuid, p_actualizado_en_esperado timestamptz, p_agregar uuid[], p_quitar uuid[])
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  d public.declaraciones_aduana; l record; v_x uuid; v_c text; v_otra text; v_titulo text; v_escribio boolean := false; v_ver timestamptz;
begin
  perform public.assert_activo();
  if not (select public.tiene_permiso('logistica.aduana.gestionar')) then
    raise exception 'No tienes el permiso «logistica.aduana.gestionar».' using errcode = '42501';
  end if;
  select * into l from public._declaracion_vehiculos_listas(p_agregar, p_quitar);
  -- C10 · la cabecera por su PK; la versión antes que el canal: quien tenía la pantalla vieja recibe PT409.
  select * into d from public.declaraciones_aduana c where c.id = p_declaracion for update;
  if not found then
    raise exception 'La declaración ya no existe. Recarga.' using errcode = 'PT409';
  end if;
  if p_actualizado_en_esperado is null or d.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('declaraciones_aduana', d.id, d.actualizado_en, 'esta declaración');
  end if;
  if cardinality(l.agregar) + cardinality(l.quitar) = 0 then
    return jsonb_build_object('id', d.id, 'actualizado_en', d.actualizado_en, 'sin_cambios', true);
  end if;
  if d.canal is not null then
    raise exception 'La declaración ya tiene canal de aforo: su composición no cambia.' using errcode = '23514', hint = 'canal';
  end if;
  perform public._declaracion_vehiculos_validar(d.id, l.agregar, l.agregar || l.quitar);
  -- C12–C13 · un solo recorrido en orden de id. Por declaraciones_vehiculos_pkey y declaraciones_vehiculo_activo_unico.
  for v_x in select u from unnest(l.agregar || l.quitar) u order by u loop
    if v_x = any (l.quitar) then
      update public.declaraciones_vehiculos dv set removido_en = now()
       where dv.declaracion_id = d.id and dv.vehiculo_id = v_x and dv.removido_en is null;
      v_escribio := v_escribio or found;
      continue;
    end if;
    continue when exists (select 1 from public.declaraciones_vehiculos dv
                           where dv.declaracion_id = d.id and dv.vehiculo_id = v_x and dv.removido_en is null);
    begin
      insert into public.declaraciones_vehiculos as dv (declaracion_id, vehiculo_id) values (d.id, v_x)
        on conflict (declaracion_id, vehiculo_id) do update set removido_en = null, agregado_en = now() where dv.removido_en is not null;
      v_escribio := true;
    exception when unique_violation then
      get stacked diagnostics v_c = constraint_name;
      if v_c = 'declaraciones_vehiculo_activo_unico' then
        select v.titulo into v_titulo from public.vehiculos v where v.id = v_x;
        select o.numero into v_otra from public.declaraciones_vehiculos dv join public.declaraciones_aduana o on o.id = dv.declaracion_id
         where dv.vehiculo_id = v_x and dv.removido_en is null;
        raise exception '«%» ya está en la declaración «%».', v_titulo, coalesce(v_otra, 'otra') using errcode = '23514', hint = 'vehiculos';
      end if;
      raise;
    end;
  end loop;
  if not v_escribio then
    return jsonb_build_object('id', d.id, 'actualizado_en', d.actualizado_en, 'sin_cambios', true);
  end if;
  -- El toque mueve la versión (declaracion_version) y deja en actividad quién cambió (trg_auditar).
  update public.declaraciones_aduana x set actualizado_en = x.actualizado_en where x.id = d.id returning x.actualizado_en into v_ver;
  return jsonb_build_object('id', d.id, 'actualizado_en', v_ver, 'sin_cambios', false);
end;
$$;

revoke all on function public.declaracion_vehiculos_poner(uuid, timestamptz, uuid[], uuid[]) from public, anon;
grant execute on function public.declaracion_vehiculos_poner(uuid, timestamptz, uuid[], uuid[]) to authenticated, service_role;

comment on function public.declaracion_vehiculos_poner(uuid, timestamptz, uuid[], uuid[]) is
  'Agrega y quita vehículos de una declaración con la versión de la cabecera (paso 6.07-2). Pide logistica.aduana.gestionar y logistica.ver de cada '
  'vehículo; a lo sumo 200. Con canal no cambia (23514 canal). Un vehículo vivo en otra declaración, 23514 vehiculos. Devuelve {id, actualizado_en, sin_cambios}.';
