-- Resolver una subasta sin resolver: «No la ganamos» (`vehiculo_subasta_no_ganada`, reversible con «Deshacer») y «La ganamos»
-- (`vehiculo_subasta_ganada`: mueve con `cambiar_fase` a una fase que no es la subasta y anota el resultado, en una transacción). Las dos piden
-- lo mismo que mover (ver la unidad con `logistica.ver` y `flujos.mover` o `.cualquiera` del origen), dejan su constancia en `actividad`
-- (`vehiculo.subasta_resuelta`) y no mueven la versión del vehículo (el WHEN de trg_actualizado_en y trg_auditar_cambio). Sin versión esperada: el
-- estado hace de versión. Sólo se resuelve lo que está sin_resolver; si no, PT409 con quién y cuándo (`_subasta_conflicto`).
-- Pruebas: supabase/tests/areas/situacion/resolver.sql; carreras: supabase/tests/areas/situacion/carreras.mjs (db:carreras).

-- El PT409 de resolver lo que ya no está sin resolver, sobre la fila ya tomada.
create or replace function public._subasta_conflicto(p_vehiculo uuid) returns void
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare v public.vehiculos; v_nombre text; v_fase text;
begin
  select * into v from public.vehiculos x where x.id = p_vehiculo;
  if v.subasta_resuelta_por is not null then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = v.subasta_resuelta_por;
  end if;
  if v.subasta_resultado = 'no_ganada' and v.subasta_resuelta_por = (select auth.uid()) then
    raise exception 'La marcaste como no ganada % desde otra ventana.', public._hace(v.subasta_resuelta_en) using errcode = 'PT409', hint = 'conflicto';
  end if;
  if v.subasta_resultado = 'no_ganada' then
    raise exception '% la marcó como no ganada %.', coalesce(v_nombre, 'Otra persona'), public._hace(v.subasta_resuelta_en)
      using errcode = 'PT409', hint = 'conflicto';
  end if;
  if v.subasta_resultado = 'ganada' then
    raise exception '% la marcó como ganada %.', coalesce(v_nombre, 'Otra persona'), public._hace(v.subasta_resuelta_en)
      using errcode = 'PT409', hint = 'conflicto';
  end if;
  if v.situacion = 'en_subasta' then
    raise exception 'La subasta volvió a abrirse: ya no está sin resolver.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if v.situacion = 'sin_resolver' then
    raise exception 'Sigue sin resolver: no hay nada que deshacer.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  select f.nombre into v_fase from public.fases f where f.id = v.fase_id;
  raise exception 'Ya no está sin resolver: está en «%».', coalesce(v_fase, 'Sin fase') using errcode = 'PT409', hint = 'conflicto';
end $$;

revoke all on function public._subasta_conflicto(uuid) from public, anon, authenticated;
grant execute on function public._subasta_conflicto(uuid) to service_role;

-- El acceso y el permiso de resolver, antes del candado (quien no puede no espera a quien está resolviendo). Devuelve el origen.
create or replace function public._subasta_puede_resolver(p_vehiculo uuid) returns uuid
    language plpgsql stable security definer
    set search_path = ''
    as $$
declare v_origen uuid;
begin
  if p_vehiculo is null or not public.puede_unidad(p_vehiculo, null, 'logistica.ver', 'repuestos.ver') then
    raise exception '%', public._unidad_sin_acceso(p_vehiculo) using errcode = '42501', hint = 'acceso';
  end if;
  select v.origen_id into v_origen from public.vehiculos v where v.id = p_vehiculo;
  if not (public.tiene_permiso('flujos.mover', v_origen) or public.tiene_permiso('flujos.mover.cualquiera', v_origen)) then
    raise exception 'Para resolver la subasta hace falta poder mover de fase en este origen.' using errcode = '42501', hint = 'permiso';
  end if;
  return v_origen;
end $$;

revoke all on function public._subasta_puede_resolver(uuid) from public, anon, authenticated;
grant execute on function public._subasta_puede_resolver(uuid) to service_role;

-- «No la ganamos» (true) y su «Deshacer» (false).
create or replace function public.vehiculo_subasta_no_ganada(p_vehiculo uuid, p_no_ganada boolean) returns jsonb
    language plpgsql security definer
    set search_path = ''
    as $$
declare v public.vehiculos; v_antes text; v_despues text;
begin
  perform public.assert_activo();
  if p_no_ganada is null then
    raise exception 'Falta decir si la subasta se ganó o no.' using errcode = '22023', hint = 'p_no_ganada';
  end if;
  perform public._subasta_puede_resolver(p_vehiculo);
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for no key update;
  if not found then
    raise exception '%', public._unidad_sin_acceso(p_vehiculo) using errcode = '42501', hint = 'acceso';
  end if;
  if (p_no_ganada and v.situacion <> 'sin_resolver') or (not p_no_ganada and v.situacion <> 'no_ganada') then
    perform public._subasta_conflicto(p_vehiculo);
  end if;
  v_antes := v.subasta_resultado;
  if p_no_ganada then
    update public.vehiculos set subasta_resultado = 'no_ganada', subasta_resuelta_por = (select auth.uid()), subasta_resuelta_en = now()
     where id = p_vehiculo
    returning * into v;
  else
    update public.vehiculos set subasta_resultado = null, subasta_resuelta_por = null, subasta_resuelta_en = null
     where id = p_vehiculo
    returning * into v;
  end if;
  v_despues := v.subasta_resultado;
  perform public.registrar_actividad('vehiculo.subasta_resuelta', 'vehiculos', p_vehiculo::text,
    jsonb_build_object('resultado', v_antes), jsonb_build_object('resultado', v_despues));
  return jsonb_build_object('situacion', v.situacion, 'resultado', v.subasta_resultado);
end $$;

revoke all on function public.vehiculo_subasta_no_ganada(uuid, boolean) from public, anon;
grant execute on function public.vehiculo_subasta_no_ganada(uuid, boolean) to authenticated, service_role;

comment on function public.vehiculo_subasta_no_ganada(uuid, boolean) is '«No la ganamos» (p_no_ganada true, sólo desde sin_resolver) y su «Deshacer» (false, sólo desde no_ganada). Acceso como cambiar_fase (42501 hint acceso) y flujos.mover o .cualquiera del origen (42501 hint permiso), antes del candado; otro estado es PT409 hint conflicto con quién y cuándo. Deja vehiculo.subasta_resuelta en actividad y no mueve la versión. Devuelve {situacion, resultado}.';

-- «La ganamos»: mover con cambiar_fase a una fase que no es la subasta y anotarla ganada, todo o nada.
create or replace function public.vehiculo_subasta_ganada(p_vehiculo uuid, p_fase_destino uuid, p_nota text default null, p_fase_esperada uuid default null)
returns bigint
    language plpgsql security definer
    set search_path = ''
    as $$
declare v public.vehiculos; v_hist bigint;
begin
  perform public.assert_activo();
  perform public._subasta_puede_resolver(p_vehiculo);
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for no key update;
  if not found then
    raise exception '%', public._unidad_sin_acceso(p_vehiculo) using errcode = '42501', hint = 'acceso';
  end if;
  if v.situacion <> 'sin_resolver' then
    perform public._subasta_conflicto(p_vehiculo);
  end if;
  if p_fase_destino is null or coalesce((select f.es_subasta from public.fases f where f.id = p_fase_destino), false) then
    raise exception 'Para marcarla como ganada, elige una fase que no sea de subasta.' using errcode = '23514', hint = 'transicion';
  end if;
  -- Sus rechazos (conflicto, transicion, rol, requisitos, nota, acceso) suben con su hint y revierten todo.
  v_hist := public.cambiar_fase(p_vehiculo, null, p_fase_destino, p_nota, p_fase_esperada);
  update public.vehiculos set subasta_resultado = 'ganada', subasta_resuelta_por = (select auth.uid()), subasta_resuelta_en = now()
   where id = p_vehiculo;
  perform public.registrar_actividad('vehiculo.subasta_resuelta', 'vehiculos', p_vehiculo::text,
    jsonb_build_object('resultado', null), jsonb_build_object('resultado', 'ganada', 'historial', v_hist));
  return v_hist;
end $$;

revoke all on function public.vehiculo_subasta_ganada(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.vehiculo_subasta_ganada(uuid, uuid, text, uuid) to authenticated, service_role;

comment on function public.vehiculo_subasta_ganada(uuid, uuid, text, uuid) is '«La ganamos»: sólo desde sin_resolver (si no, PT409 hint conflicto), hacia una fase que no es de subasta (23514 hint transicion). Mueve con cambiar_fase (sus rechazos suben con su hint y no queda nada) y anota ganada, en una transacción. Acceso y permiso como vehiculo_subasta_no_ganada. Deja unidad.fase_cambiada y vehiculo.subasta_resuelta en actividad. Devuelve el id del historial.';
