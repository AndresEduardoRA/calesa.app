-- Motor de flujos: evaluación de requisitos, previsualización, cambio de fase (uno y en lote),
-- «llegó a una fase», fuera de regla, revisión de coherencia del flujo, vitrina.

-- ---------------------------------------------------------------------------
-- ¿La unidad llegó alguna vez a esta fase? (para esperas): entró a ESA fase, o está en una
-- fase no final posterior; terminó en una final sin pasar = no llegó.
-- ---------------------------------------------------------------------------
create or replace function public.unidad_llego_a_fase(p_vehiculo uuid, p_repuesto uuid, p_fase uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.historial_fases h
    where h.a_fase_id = p_fase and h.vehiculo_id is not distinct from p_vehiculo and h.repuesto_id is not distinct from p_repuesto
  ) or exists (
    select 1 from public.fases actual join public.fases destino on destino.id = p_fase
    where actual.id = coalesce((select v.fase_id from public.vehiculos v where v.id = p_vehiculo), (select i.fase_id from public.repuestos_items i where i.id = p_repuesto))
      and actual.flujo_id = destino.flujo_id and not actual.es_final and actual.orden > destino.orden
  );
$$;

-- Evaluador de requisitos de dato: cada clave tiene su lectura. Agregar una clave = agregar
-- un caso acá Y en claves_dato_requisito().
create or replace function public._requisito_dato_cumplido(p_vehiculo uuid, p_repuesto uuid, p_clave text, p_config jsonb)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v public.vehiculos; t public.transportes; i public.repuestos_items; pct numeric;
begin
  if p_vehiculo is not null then select * into v from public.vehiculos where id = p_vehiculo; end if;
  if p_repuesto is not null then select * into i from public.repuestos_items where id = p_repuesto; end if;
  select * into t from public.transportes where vehiculo_id is not distinct from p_vehiculo and repuesto_id is not distinct from p_repuesto;
  if p_repuesto is not null and t.sigue_al_vehiculo then
    select tr.* into t from public.transportes tr join public.repuestos_proyectos pr on pr.id = i.proyecto_id where tr.vehiculo_id = pr.vehiculo_id;
  end if;
  case p_clave
    when 'vehiculo.vin' then return v.vin is not null;
    when 'vehiculo.lead' then return v.lead_id is not null;
    when 'vehiculo.cotizacion_final' then return exists (select 1 from public.cotizaciones c where c.vehiculo_id = p_vehiculo and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null);
    when 'transporte.naviera' then return t.naviera_id is not null;
    when 'transporte.contenedor' then return coalesce(t.contenedor, '') <> '';
    when 'transporte.booking' then return coalesce(t.booking, '') <> '';
    when 'transporte.zarpe' then return t.zarpe_el is not null;
    when 'transporte.eta' then return t.eta_el is not null;
    when 'transporte.arribo' then return t.arribo_el is not null;
    when 'aduana.declaracion' then return exists (select 1 from public.declaraciones_vehiculos dv where dv.vehiculo_id = p_vehiculo and dv.removido_en is null);
    when 'aduana.canal' then return exists (select 1 from public.declaraciones_vehiculos dv join public.declaraciones_aduana d on d.id = dv.declaracion_id where dv.vehiculo_id = p_vehiculo and dv.removido_en is null and d.canal is not null);
    when 'aduana.tributos_pagados' then return exists (select 1 from public.gastos g join public.categorias_gasto cg on cg.id = g.categoria_id where g.vehiculo_id = p_vehiculo and g.eliminado_en is null and cg.proposito = 'tributos');
    when 'pagos.confirmado' then return exists (select 1 from public.pagos p where p.vehiculo_id = p_vehiculo and p.confirmado and p.eliminado_en is null);
    when 'pagos.umbral_pct' then
      pct := coalesce((p_config ->> 'pct')::numeric, 100);
      return coalesce((select sum(p.monto_base) from public.pagos p where p.vehiculo_id = p_vehiculo and p.confirmado and p.eliminado_en is null), 0)
             >= pct / 100 * coalesce((select c.total_base from public.cotizaciones c where c.vehiculo_id = p_vehiculo and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null), 0)
             and exists (select 1 from public.cotizaciones c where c.vehiculo_id = p_vehiculo and c.clase = 'final' and c.estado = 'activa' and c.eliminado_en is null);
    when 'repuesto.tracking' then return coalesce(i.tracking, '') <> '';
    when 'repuesto.precio' then return i.precio_cliente is not null;
    when 'proyecto.pago_cliente' then return exists (select 1 from public.pagos p where p.proyecto_repuestos_id = i.proyecto_id and p.eliminado_en is null);
    else return false;
  end case;
end;
$$;

-- Evalúa TODOS los requisitos de una fase para una unidad. Devuelve una fila por requisito.
create or replace function public.evaluar_requisitos(p_vehiculo uuid, p_repuesto uuid, p_fase uuid)
returns table (requisito_id uuid, tipo public.tipo_requisito, bloqueante boolean, descripcion text, cumplido boolean, detalle jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare r record; n int; ok boolean; d jsonb; v_padre uuid; v_hijos int; v_hijos_ok int;
begin
  for r in select q.*, td.nombre as tipo_doc_nombre, td.formatos as tipo_doc_formatos, fe.nombre as espera_nombre
           from public.fases_requisitos q
           left join public.tipos_documento td on td.id = q.tipo_documento_id
           left join public.fases fe on fe.id = q.espera_fase_id
           where q.fase_id = p_fase order by q.orden loop
    d := '{}'::jsonb;
    if r.tipo = 'documento' then
      select count(*) into n from public.documentos doc
      where doc.vehiculo_id is not distinct from p_vehiculo and doc.repuesto_id is not distinct from p_repuesto
        and doc.tipo_documento_id = r.tipo_documento_id and doc.estado = 'aprobado' and doc.eliminado_en is null
        and (doc.vence_el is null or doc.vence_el >= current_date)
        and (r.formatos is null or doc.mime is null or doc.mime = any (r.formatos));
      ok := n >= coalesce(r.min_archivos, 1) and (r.max_archivos is null or n <= r.max_archivos);
      d := jsonb_build_object('aprobados', n, 'min', coalesce(r.min_archivos, 1), 'max', r.max_archivos);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Documento: ' || r.tipo_doc_nombre; cumplido := ok; detalle := d;
      return next;
    elsif r.tipo = 'dato' then
      ok := public._requisito_dato_cumplido(p_vehiculo, p_repuesto, r.clave_dato, r.config);
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Dato: ' || r.clave_dato; cumplido := ok; detalle := r.config;
      return next;
    elsif r.tipo = 'espera' then
      if r.espera_ambito = 'hijos' then
        -- vehículo espera a sus repuestos (los en stock no cuentan). Sin hijos = no aplica = cumple.
        select count(*), count(*) filter (where public.unidad_llego_a_fase(null, i.id, r.espera_fase_id)) into v_hijos, v_hijos_ok
        from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id
        where pr.vehiculo_id = p_vehiculo and i.eliminado_en is null and i.en_stock_desde is null and pr.eliminado_en is null;
        ok := v_hijos = 0 or v_hijos = v_hijos_ok;
        d := jsonb_build_object('hijos', v_hijos, 'llegaron', v_hijos_ok);
      else
        select pr.vehiculo_id into v_padre from public.repuestos_items i join public.repuestos_proyectos pr on pr.id = i.proyecto_id where i.id = p_repuesto;
        ok := v_padre is null or public.unidad_llego_a_fase(v_padre, null, r.espera_fase_id);
        d := jsonb_build_object('padre', v_padre);
      end if;
      requisito_id := r.id; tipo := r.tipo; bloqueante := r.bloqueante; descripcion := 'Espera: ' || r.espera_nombre; cumplido := ok; detalle := d;
      return next;
    end if;
  end loop;
end;
$$;

-- ¿Puede ESTE usuario mover por esta transición / hasta esta fase? (roles por transición
-- mandan sobre roles por fase; sin listas = cualquiera con el permiso del flujo).
create or replace function public._puede_mover(p_flujo uuid, p_de uuid, p_a uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_origen uuid; v_ambito public.ambito_flujo; v_trans uuid; mis_roles uuid[];
begin
  select origen_id, ambito into v_origen, v_ambito from public.flujos where id = p_flujo;
  if v_ambito = 'vehiculos' then
    if not public.tiene_permiso('flujos.mover', v_origen) then return false; end if;
    if public.tiene_permiso('flujos.mover.cualquiera', v_origen) then return true; end if;
  else
    if not public.tiene_permiso('repuestos.mover') then return false; end if;
    if public.tiene_permiso('flujos.mover.cualquiera') then return true; end if;
  end if;
  select array_agg(rol_id) into mis_roles from public.usuarios_roles where usuario_id = (select auth.uid());
  if p_de is not null then
    select id into v_trans from public.fases_transiciones where de_fase_id = p_de and a_fase_id = p_a;
    if v_trans is not null and exists (select 1 from public.fases_transiciones_roles where transicion_id = v_trans) then
      return exists (select 1 from public.fases_transiciones_roles where transicion_id = v_trans and rol_id = any (mis_roles));
    end if;
  end if;
  if exists (select 1 from public.fases_roles where fase_id = p_a) then
    return exists (select 1 from public.fases_roles where fase_id = p_a and rol_id = any (mis_roles));
  end if;
  return true;
end;
$$;

-- Previsualiza sin escribir: por qué se podría o no mover. Misma secuencia que cambiar_fase.
create or replace function public.previsualizar_cambio_fase(p_vehiculo uuid, p_repuesto uuid, p_fase_destino uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_flujo uuid; v_actual uuid; v_destino public.fases; motivos text[] := '{}'; req jsonb; faltan jsonb;
begin
  if num_nonnulls(p_vehiculo, p_repuesto) <> 1 then raise exception 'Una unidad por vez.' using errcode = '22023'; end if;
  if p_vehiculo is not null then
    select f.id, v.fase_id into v_flujo, v_actual from public.vehiculos v join public.flujos f on f.origen_id = v.origen_id where v.id = p_vehiculo and v.eliminado_en is null;
    if v_flujo is null then return jsonb_build_object('ok', false, 'motivos', array['El vehículo no existe o está en la papelera.']); end if;
    if not public.puede_vehiculo(p_vehiculo, 'logistica.ver') then return jsonb_build_object('ok', false, 'motivos', array['Sin acceso a la logística de este vehículo.']); end if;
  else
    select f.id, i.fase_id into v_flujo, v_actual from public.repuestos_items i join public.flujos f on f.ambito = 'repuestos' where i.id = p_repuesto and i.eliminado_en is null;
    if v_flujo is null then return jsonb_build_object('ok', false, 'motivos', array['El repuesto no existe o no hay flujo de repuestos.']); end if;
  end if;
  select * into v_destino from public.fases where id = p_fase_destino;
  if v_destino.id is null or v_destino.flujo_id <> v_flujo then motivos := array_append(motivos, 'La fase destino no pertenece a este flujo.'); end if;
  if v_destino.id is not null and not v_destino.activa then motivos := array_append(motivos, 'La fase destino está jubilada.'); end if;
  if v_actual is null and v_destino.id is not null and not v_destino.es_inicial then motivos := array_append(motivos, 'La primera fase tiene que ser una inicial.'); end if;
  if v_actual is not null and v_destino.id is not null and not exists (select 1 from public.fases_transiciones where de_fase_id = v_actual and a_fase_id = v_destino.id) then
    motivos := array_append(motivos, 'No hay transición desde la fase actual.');
  end if;
  if v_destino.id is not null and not public._puede_mover(v_flujo, v_actual, v_destino.id) then motivos := array_append(motivos, 'Tu rol no puede mover a esta fase.'); end if;
  select jsonb_agg(to_jsonb(e)), jsonb_agg(to_jsonb(e)) filter (where e.bloqueante and not e.cumplido)
    into req, faltan from public.evaluar_requisitos(p_vehiculo, p_repuesto, p_fase_destino) e;
  if faltan is not null then motivos := array_append(motivos, ('Faltan ' || jsonb_array_length(faltan) || ' requisito(s) bloqueante(s).')); end if;
  return jsonb_build_object('ok', coalesce(array_length(motivos, 1), 0) = 0, 'motivos', motivos, 'fase_actual', v_actual, 'requisitos', coalesce(req, '[]'::jsonb), 'faltan', coalesce(faltan, '[]'::jsonb), 'nota_obligatoria', coalesce(v_destino.nota_obligatoria, false));
end;
$$;

-- Cambiar de fase: la ÚNICA puerta que escribe fase_id. Bloqueo optimista por fase esperada.
create or replace function public.cambiar_fase(p_vehiculo uuid, p_repuesto uuid, p_fase_destino uuid, p_nota text default null, p_fase_esperada uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare pre jsonb; v_actual uuid; v_flujo uuid; v_hist bigint; v_nota_oblig boolean;
begin
  perform public.assert_activo();
  pre := public.previsualizar_cambio_fase(p_vehiculo, p_repuesto, p_fase_destino);
  v_actual := (pre ->> 'fase_actual')::uuid;
  if p_fase_esperada is not null and v_actual is distinct from p_fase_esperada then
    raise exception 'Alguien movió esta unidad hace un momento. Recargá para ver la fase actual.' using errcode = 'PT409';
  end if;
  if not (pre ->> 'ok')::boolean then
    raise exception 'No se puede mover: %', array_to_string(array(select jsonb_array_elements_text(pre -> 'motivos')), ' ') using errcode = '23514';
  end if;
  v_nota_oblig := (pre ->> 'nota_obligatoria')::boolean or exists (select 1 from public.fases_transiciones t where t.de_fase_id = v_actual and t.a_fase_id = p_fase_destino and t.nota_obligatoria);
  if v_nota_oblig and coalesce(trim(p_nota), '') = '' then raise exception 'Esta fase pide una nota interna.' using errcode = '23514'; end if;
  select flujo_id into v_flujo from public.fases where id = p_fase_destino;
  -- lock de la fila para que dos cambios concurrentes se serialicen
  if p_vehiculo is not null then
    perform 1 from public.vehiculos where id = p_vehiculo for update;
    update public.vehiculos set fase_id = p_fase_destino, fase_desde = now() where id = p_vehiculo;
  else
    perform 1 from public.repuestos_items where id = p_repuesto for update;
    update public.repuestos_items set fase_id = p_fase_destino, fase_desde = now() where id = p_repuesto;
  end if;
  insert into public.historial_fases (flujo_id, vehiculo_id, repuesto_id, de_fase_id, a_fase_id, nota, usuario_id)
  values (v_flujo, p_vehiculo, p_repuesto, v_actual, p_fase_destino, nullif(trim(p_nota), ''), (select auth.uid())) returning id into v_hist;
  if nullif(trim(p_nota), '') is not null then
    insert into public.notas (vehiculo_id, repuesto_id, historial_fase_id, cuerpo, autor_id) values (p_vehiculo, p_repuesto, v_hist, trim(p_nota), (select auth.uid()));
  end if;
  perform public.registrar_actividad('unidad.fase_cambiada', case when p_vehiculo is not null then 'vehiculos' else 'repuestos_items' end, coalesce(p_vehiculo, p_repuesto)::text,
    jsonb_build_object('fase', v_actual), jsonb_build_object('fase', p_fase_destino, 'historial', v_hist));
  return v_hist;
end;
$$;

-- Lote: una por una, nunca transaccional. Devuelve ok/motivo por unidad.
create or replace function public.cambiar_fase_lote(p_vehiculos uuid[], p_fase_destino uuid, p_nota text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v uuid; res jsonb := '[]'::jsonb; h bigint;
begin
  if coalesce(array_length(p_vehiculos, 1), 0) > 200 then raise exception 'Máximo 200 por lote.' using errcode = '22023'; end if;
  foreach v in array p_vehiculos loop
    begin
      h := public.cambiar_fase(v, null, p_fase_destino, p_nota, null);
      res := res || jsonb_build_object('vehiculo_id', v, 'ok', true, 'historial_id', h);
    exception when others then
      res := res || jsonb_build_object('vehiculo_id', v, 'ok', false, 'motivo', sqlerrm);
    end;
  end loop;
  return res;
end;
$$;

-- Unidades que están en una fase cuyos requisitos bloqueantes ya no cumplen (H3: se muestran,
-- nunca se las saca).
create or replace function public.fuera_de_regla(p_flujo uuid)
returns table (vehiculo_id uuid, repuesto_id uuid, fase_id uuid, faltan int)
language sql stable security definer set search_path = '' as $$
  select v.id, null::uuid, v.fase_id, (select count(*)::int from public.evaluar_requisitos(v.id, null, v.fase_id) e where e.bloqueante and not e.cumplido)
  from public.vehiculos v join public.flujos f on f.origen_id = v.origen_id
  where f.id = p_flujo and v.fase_id is not null and v.eliminado_en is null
    and exists (select 1 from public.evaluar_requisitos(v.id, null, v.fase_id) e where e.bloqueante and not e.cumplido)
  union all
  select null::uuid, i.id, i.fase_id, (select count(*)::int from public.evaluar_requisitos(null, i.id, i.fase_id) e where e.bloqueante and not e.cumplido)
  from public.repuestos_items i join public.flujos f on f.ambito = 'repuestos'
  where f.id = p_flujo and i.fase_id is not null and i.eliminado_en is null
    and exists (select 1 from public.evaluar_requisitos(null, i.id, i.fase_id) e where e.bloqueante and not e.cumplido);
$$;

-- Revisión de coherencia del flujo: avisos que la UI muestra en la franja «Revisar».
create or replace function public.revisar_flujo(p_flujo uuid)
returns table (nivel text, codigo text, mensaje text, fase_id uuid)
language sql stable security definer set search_path = '' as $$
  with f as (select * from public.fases where flujo_id = p_flujo and activa)
  select 'error', 'sin_inicial', 'El flujo no tiene ninguna fase inicial activa.', null::uuid where not exists (select 1 from f where es_inicial)
  union all
  select 'aviso', 'sin_salida', 'La fase «' || f.nombre || '» no tiene salida y no es final.', f.id from f where not f.es_final and not exists (select 1 from public.fases_transiciones t where t.de_fase_id = f.id)
  union all
  select 'aviso', 'inalcanzable', 'La fase «' || f.nombre || '» no es inicial y nadie llega a ella.', f.id from f where not f.es_inicial and not exists (select 1 from public.fases_transiciones t where t.a_fase_id = f.id)
  union all
  select 'aviso', 'orden_duplicado', 'Dos fases comparten el orden ' || orden || '.', (array_agg(id order by nombre))[1] from f group by orden having count(*) > 1
  union all
  select 'aviso', 'contenedor_inalcanzable', 'La fase «' || f.nombre || '» exige contenedor pero ninguna fase del flujo permite asignarlo.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.clave_dato = 'transporte.contenedor') and not exists (select 1 from f f2 where f2.permite_contenedor)
  union all
  select 'aviso', 'espera_jubilada', 'La fase «' || f.nombre || '» espera a una fase jubilada.', f.id
    from f where exists (select 1 from public.fases_requisitos q join public.fases e on e.id = q.espera_fase_id where q.fase_id = f.id and not e.activa)
  union all
  select 'aviso', 'espera_cruzada', 'Esperas cruzadas: «' || f.nombre || '» y la fase que espera se esperan mutuamente.', f.id
    from f where exists (
      select 1 from public.fases_requisitos a join public.fases_requisitos b on b.fase_id = a.espera_fase_id
      where a.fase_id = f.id and a.tipo = 'espera' and b.tipo = 'espera' and b.espera_fase_id = f.id)
  union all
  select 'info', 'sin_bloqueantes', 'La fase «' || f.nombre || '» sólo tiene requisitos informativos.', f.id
    from f where exists (select 1 from public.fases_requisitos q where q.fase_id = f.id) and not exists (select 1 from public.fases_requisitos q where q.fase_id = f.id and q.bloqueante);
$$;

-- Jubilar o eliminar una fase con sus condiciones.
create or replace function public.fase_eliminar(p_fase uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_flujo uuid; n_hist int; n_paradas int; n_esperas int; v_iniciales int;
begin
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if not public.puede_configurar_flujo(v_flujo) then raise exception 'Sin permiso para configurar este flujo.' using errcode = '42501'; end if;
  select count(*) into n_hist from public.historial_fases where a_fase_id = p_fase or de_fase_id = p_fase;
  select (select count(*) from public.vehiculos where fase_id = p_fase) + (select count(*) from public.repuestos_items where fase_id = p_fase) into n_paradas;
  select count(*) into n_esperas from public.fases_requisitos where espera_fase_id = p_fase;
  select count(*) into v_iniciales from public.fases where flujo_id = v_flujo and es_inicial and activa and id <> p_fase;
  if n_paradas > 0 or n_hist > 0 then
    update public.fases set activa = false where id = p_fase;
    perform public.registrar_actividad('fase.jubilada', 'fases', p_fase::text, null, jsonb_build_object('historial', n_hist, 'paradas', n_paradas));
    return jsonb_build_object('accion', 'jubilada', 'historial', n_hist, 'paradas', n_paradas);
  end if;
  if n_esperas > 0 then raise exception 'Otro flujo espera a esta fase (% requisito/s).', n_esperas using errcode = '23503'; end if;
  if v_iniciales = 0 and exists (select 1 from public.fases where id = p_fase and es_inicial) then raise exception 'Es la única fase inicial.' using errcode = '23514'; end if;
  delete from public.fases where id = p_fase;
  perform public.registrar_actividad('fase.eliminada', 'fases', p_fase::text, null, null);
  return jsonb_build_object('accion', 'eliminada');
end;
$$;

-- Vitrina: sólo por RPC (publicado_web, destacado, precio público)
create or replace function public.vehiculo_vitrina(p_vehiculo uuid, p_publicado boolean, p_destacado boolean default false, p_precio numeric default null, p_precio_hasta numeric default null, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_origen uuid;
begin
  select origen_id into v_origen from public.vehiculos where id = p_vehiculo and eliminado_en is null;
  if v_origen is null then raise exception 'Vehículo inexistente.' using errcode = '22023'; end if;
  perform public.assert_permiso('vehiculos.vitrina', v_origen);
  update public.vehiculos set publicado_web = p_publicado, destacado_web = p_destacado, precio_web = p_precio, precio_web_hasta = p_precio_hasta, precio_web_nota = p_nota where id = p_vehiculo;
  perform public.registrar_actividad('vehiculo.vitrina', 'vehiculos', p_vehiculo::text, null, jsonb_build_object('publicado', p_publicado, 'precio', p_precio));
end;
$$;

do $$
declare f text;
begin
  for f in select unnest(array['unidad_llego_a_fase(uuid,uuid,uuid)', 'evaluar_requisitos(uuid,uuid,uuid)', 'previsualizar_cambio_fase(uuid,uuid,uuid)', 'cambiar_fase(uuid,uuid,uuid,text,uuid)', 'cambiar_fase_lote(uuid[],uuid,text)', 'fuera_de_regla(uuid)', 'revisar_flujo(uuid)', 'fase_eliminar(uuid)', 'vehiculo_vitrina(uuid,boolean,boolean,numeric,numeric,text)']) loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke all on function public._requisito_dato_cumplido(uuid, uuid, text, jsonb) from public, anon, authenticated;
  revoke all on function public._puede_mover(uuid, uuid, uuid) from public, anon, authenticated;
end $$;
