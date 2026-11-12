-- Transporte: aplicar cambios a un grupo, todo o nada (paso 6.07-1, C16–C19). Candados en un orden fijo: primero las filas de `transportes` por id,
-- después todas las unidades de una pasada, vehículos por id y luego ítems por id (`for share`). `cambiar_fase_lote` toma vehículos `for no key update`
-- por id de vehículo: tomarlos en el orden de `transportes.id` abría un ciclo (40P01). El permiso antes que la versión (D13).

-- C18 · las unidades del grupo, en orden de id. Si alguna se fue a la papelera mientras se esperaba, PT409.
create or replace function public._transporte_grupo_bloquear(p_vehiculos uuid[], p_repuestos uuid[]) returns void
language plpgsql
set search_path = ''
as $$
declare v_n int; v_m int;
begin
  perform 1 from public.vehiculos v where v.id = any (p_vehiculos) and v.eliminado_en is null order by v.id for share of v;
  get diagnostics v_n = row_count;
  perform 1 from public.repuestos_items i where i.id = any (p_repuestos) and i.eliminado_en is null order by i.id for share of i;
  get diagnostics v_m = row_count;
  if v_n + v_m < coalesce(cardinality(p_vehiculos), 0) + coalesce(cardinality(p_repuestos), 0) then
    raise exception 'Una unidad del grupo ya no existe o está en la papelera. Recarga.' using errcode = 'PT409';
  end if;
end;
$$;

create or replace function public.transporte_grupo_aplicar(p_tipo text, p_clave text, p_esperadas jsonb, p_cambios jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_clave text := public._transporte_clave(p_tipo, p_clave);
  v_claves constant text[] := array['naviera_id', 'puerto_origen_id', 'puerto_destino_id', 'contenedor', 'booking', 'zarpe_el', 'eta_el', 'arribo_el'];
  v_esperadas uuid[]; v_ids uuid[]; r public.transportes; n public.transportes; u record; k text; v_titulo text;
  v_nueva text := v_clave; v_unidades jsonb := '[]'::jsonb; v_escribio boolean := false;
begin
  perform public.assert_activo();
  -- Sin la clave en ningún origen, 42501 antes de tomar un candado: ni bloquea filas que no puede leer ni distingue un booking que existe de uno que no.
  if not (public.tiene_permiso('logistica.transporte.editar') or public.tiene_permiso('repuestos.editar')) then
    raise exception 'No tienes permiso para editar el transporte.' using errcode = '42501';
  end if;
  -- C16 · {"<transporte_id>": "<actualizado_en>"} de 1 a 200 claves.
  if p_esperadas is null or jsonb_typeof(p_esperadas) <> 'object' then
    raise exception 'Las versiones del grupo van como un objeto.' using errcode = '22023', hint = 'esperadas';
  end if;
  for k in select x from jsonb_object_keys(p_esperadas) x loop
    if not pg_input_is_valid(k, 'uuid') or jsonb_typeof(p_esperadas -> k) <> 'string'
       or not pg_input_is_valid(p_esperadas ->> k, 'timestamptz') then
      raise exception 'Cada versión del grupo es {id: fecha}.' using errcode = '22023', hint = 'esperadas';
    end if;
    v_esperadas := array_append(v_esperadas, k::uuid);
  end loop;
  if coalesce(cardinality(v_esperadas), 0) not between 1 and 200 then
    raise exception 'Un grupo se edita con 1 a 200 unidades.' using errcode = '22023', hint = 'esperadas';
  end if;
  select array_agg(x order by x) into v_esperadas from unnest(v_esperadas) x;
  -- C17 · las filas de la clave en orden de id (por transportes_booking_idx o transportes_contenedor_idx). Una que salió del grupo mientras se esperaba
  -- el candado no cumple al re-evaluarse y no vuelve. Las de una unidad en la papelera no son del grupo (D19).
  execute format('select array_agg(x.id order by x.id) from (select t.id from public.transportes t where t.%I = $1 and '
    || '(exists (select 1 from public.vehiculos v where v.id = t.vehiculo_id and v.eliminado_en is null)'
    || ' or exists (select 1 from public.repuestos_items i where i.id = t.repuesto_id and i.eliminado_en is null))'
    || ' order by t.id limit 201 for update of t) x', p_tipo)
     into v_ids using v_clave;
  if coalesce(cardinality(v_ids), 0) > 200 then
    raise exception 'Un grupo se edita con hasta 200 unidades.' using errcode = '22023', hint = 'grupo';
  end if;
  for r in select * from public.transportes t where t.id = any (v_ids) order by t.id loop
    if not (public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.ver', 'repuestos.ver')
            and public.puede_unidad(r.vehiculo_id, r.repuesto_id, 'logistica.transporte.editar', 'repuestos.editar')) then
      raise exception 'Hay unidades del grupo que no puedes editar.' using errcode = '42501';
    end if;
  end loop;
  if v_ids is distinct from v_esperadas then
    raise exception 'El grupo cambió mientras lo editabas. Recarga.' using errcode = 'PT409';
  end if;
  for r in select * from public.transportes t where t.id = any (v_ids) order by t.id loop
    if r.actualizado_en is distinct from (p_esperadas ->> r.id::text)::timestamptz then
      select coalesce(v.titulo, i.descripcion) into v_titulo
        from (select 1) uno left join public.vehiculos v on v.id = r.vehiculo_id left join public.repuestos_items i on i.id = r.repuesto_id;
      raise exception 'Otra persona cambió «%» mientras editabas el grupo. Recarga.', v_titulo using errcode = 'PT409';
    end if;
  end loop;
  -- C18 · las unidades de una sola pasada; el bucle ya no toma candados de unidad.
  perform public._transporte_grupo_bloquear(
    (select array_agg(t.vehiculo_id) from public.transportes t where t.id = any (v_ids) and t.vehiculo_id is not null),
    (select array_agg(t.repuesto_id) from public.transportes t where t.id = any (v_ids) and t.repuesto_id is not null));
  for r in select * from public.transportes t where t.id = any (v_ids) order by t.id loop
    n := public._transporte_cambios(r, p_cambios, v_claves);
    if p_cambios ? p_tipo then
      v_nueva := case when p_tipo = 'booking' then n.booking else n.contenedor end;
    end if;
    if (n.naviera_id, n.puerto_origen_id, n.puerto_destino_id, n.contenedor, n.booking, n.zarpe_el, n.eta_el, n.arribo_el)
       is distinct from
       (r.naviera_id, r.puerto_origen_id, r.puerto_destino_id, r.contenedor, r.booking, r.zarpe_el, r.eta_el, r.arribo_el) then
      select * into u from public._transporte_unidad(r.vehiculo_id, r.repuesto_id, false);
      perform public._transporte_validar(u.flujo, u.fase_id, r, n, u.titulo);
      update public.transportes x
         set naviera_id = n.naviera_id, puerto_origen_id = n.puerto_origen_id, puerto_destino_id = n.puerto_destino_id, contenedor = n.contenedor,
             booking = n.booking, zarpe_el = n.zarpe_el, eta_el = n.eta_el, arribo_el = n.arribo_el, actualizado_por = (select auth.uid())
       where x.id = r.id
      returning * into n;
      v_escribio := true;
    end if;
    v_unidades := v_unidades || jsonb_build_object('transporte_id', r.id, 'actualizado_en', n.actualizado_en);
  end loop;
  return jsonb_build_object('tipo', p_tipo, 'clave', v_nueva, 'unidades', v_unidades, 'sin_cambios', not v_escribio);
end;
$$;

revoke all on function public._transporte_grupo_bloquear(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public._transporte_grupo_bloquear(uuid[], uuid[]) to service_role;
revoke all on function public.transporte_grupo_aplicar(text, text, jsonb, jsonb) from public, anon;
grant execute on function public.transporte_grupo_aplicar(text, text, jsonb, jsonb) to authenticated, service_role;

comment on function public.transporte_grupo_aplicar(text, text, jsonb, jsonb) is
  'Aplica los mismos cambios (sin notas) a todas las unidades de un embarque o contenedor, todo o nada (paso 6.07-1). p_esperadas = {transporte_id: '
  'actualizado_en} de todo el grupo. 42501 si alguna no se puede editar; PT409 si el grupo o una versión cambió. Devuelve {tipo, clave, unidades, sin_cambios}.';

update public.permisos set aplicado_en = 'transporte_guardar, transporte_grupo_aplicar' where clave = 'logistica.transporte.editar';
