-- Mover de fase con el candado antes de leer y el conflicto con nombre (paso 6.02-1, C1–C4). Hasta aquí `cambiar_fase` leía la vista previa sin
-- candado y bloqueaba la fila recién al escribir: dos que movían con la misma fase esperada podían pasar los dos. Ahora el orden es acceso (barato,
-- sin esperar a nadie: quien no ve la unidad no espera su candado, como `_flujo_para_editar` del 5.01) → candado `for no key update` de la unidad →
-- vista previa sobre lo confirmado → conflicto (PT409 que dice quién y cuándo) → rechazos (23514 con un código en `hint`) → escribir.
-- `for no key update` y no `for update`: serializa a dos que mueven la misma unidad y no frena el `key share` de las FK de quien inserta hijos del
-- vehículo (documentos, notas, transportes) mientras tanto; `fase_id` y `fase_desde` no son clave de nadie.
--
-- Los códigos (`hint` del error y `codigos` de la vista previa, alineados con `motivos`): `acceso` (la unidad no existe, está en la papelera, su
-- flujo no existe o no la ves: un solo texto, para no decir si existe), `transicion`, `rol`, `requisitos`, `nota`, `conflicto`, `unidad`.

-- El texto de «no la ves», el mismo exista o no.
create function public._unidad_sin_acceso(p_vehiculo uuid) returns text
  language sql
  immutable
  set search_path = ''
as $$
  select case when p_vehiculo is not null
    then 'Este vehículo ya no está disponible: no existe o ya no tienes acceso.'
    else 'Este repuesto ya no está disponible: no existe o ya no tienes acceso.' end;
$$;

revoke all on function public._unidad_sin_acceso(uuid) from public, anon, authenticated;
grant execute on function public._unidad_sin_acceso(uuid) to service_role;

-- El PT409 de mover con la fase esperada vieja: quién la movió y cuándo, desde la última fila de `historial_fases` de la unidad (por su índice
-- `(vehiculo_id, creado_en)` o `(repuesto_id, creado_en)`). Sólo la llama `cambiar_fase`, después del acceso: el nombre no llega a quien no ve la unidad.
-- Sin «Recarga»: la interfaz ofrece recargar (patrón del 4.20-1).
create function public._fase_conflicto(p_vehiculo uuid, p_repuesto uuid, p_actual uuid) returns void
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare v_usuario uuid; v_cuando timestamptz; v_fase text; v_nombre text;
begin
  if p_actual is not null then
    if p_vehiculo is not null then
      select h.usuario_id, h.creado_en into v_usuario, v_cuando from public.historial_fases h
       where h.vehiculo_id = p_vehiculo order by h.creado_en desc, h.id desc limit 1;
    else
      select h.usuario_id, h.creado_en into v_usuario, v_cuando from public.historial_fases h
       where h.repuesto_id = p_repuesto order by h.creado_en desc, h.id desc limit 1;
    end if;
    select f.nombre into v_fase from public.fases f where f.id = p_actual;
  end if;
  if v_cuando is null or v_fase is null then
    raise exception 'Esta unidad ya no está en esa fase.' using errcode = 'PT409', hint = 'conflicto';
  end if;
  if v_usuario is not null and v_usuario = (select auth.uid()) then
    raise exception 'La moviste a «%» % desde otra ventana.', v_fase, public._hace(v_cuando) using errcode = 'PT409', hint = 'conflicto';
  end if;
  if v_usuario is not null then
    select nullif(btrim(p.nombre), '') into v_nombre from public.perfiles p where p.id = v_usuario;
  end if;
  raise exception '% la movió a «%» %.', coalesce(v_nombre, 'Otra persona'), v_fase, public._hace(v_cuando) using errcode = 'PT409', hint = 'conflicto';
end;
$$;

revoke all on function public._fase_conflicto(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public._fase_conflicto(uuid, uuid, uuid) to service_role;

-- La vista previa suma `codigos` (alineado con `motivos`), exige ver la unidad también para un repuesto (`repuestos.ver`) y cuenta la nota obligatoria
-- de la transición desde la fase actual, no sólo la de la fase. Los motivos que no son de acceso quedan palabra por palabra.
create or replace function public.previsualizar_cambio_fase(p_vehiculo uuid, p_repuesto uuid, p_fase_destino uuid) returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = ''
as $$
declare
  v_flujo uuid; v_actual uuid; v_destino public.fases; motivos text[] := '{}'::text[]; codigos text[] := '{}'::text[]; req jsonb; faltan jsonb; v_nota boolean;
begin
  if num_nonnulls(p_vehiculo, p_repuesto) <> 1 then raise exception 'Una unidad por vez.' using errcode = '22023', hint = 'unidad'; end if;
  if p_vehiculo is not null then
    select f.id, v.fase_id into v_flujo, v_actual from public.vehiculos v join public.flujos f on f.origen_id = v.origen_id
     where v.id = p_vehiculo and v.eliminado_en is null;
  else
    select f.id, i.fase_id into v_flujo, v_actual from public.repuestos_items i join public.flujos f on f.ambito = 'repuestos'
     where i.id = p_repuesto and i.eliminado_en is null;
  end if;
  if v_flujo is null or not public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.ver', 'repuestos.ver') then
    return jsonb_build_object('ok', false, 'motivos', array[public._unidad_sin_acceso(p_vehiculo)], 'codigos', array['acceso'], 'fase_actual', null,
      'requisitos', '[]'::jsonb, 'faltan', '[]'::jsonb, 'nota_obligatoria', false);
  end if;
  select * into v_destino from public.fases where id = p_fase_destino;
  if v_destino.id is null or v_destino.flujo_id <> v_flujo then
    motivos := array_append(motivos, 'La fase destino no pertenece a este flujo.'); codigos := array_append(codigos, 'transicion');
  end if;
  if v_destino.id is not null and not v_destino.activa then
    motivos := array_append(motivos, 'La fase destino está jubilada.'); codigos := array_append(codigos, 'transicion');
  end if;
  if v_actual is null and v_destino.id is not null and not v_destino.es_inicial then
    motivos := array_append(motivos, 'La primera fase tiene que ser una inicial.'); codigos := array_append(codigos, 'transicion');
  end if;
  if v_actual is not null and v_destino.id is not null
     and not exists (select 1 from public.fases_transiciones where de_fase_id = v_actual and a_fase_id = v_destino.id) then
    motivos := array_append(motivos, 'No hay transición desde la fase actual.'); codigos := array_append(codigos, 'transicion');
  end if;
  if v_destino.id is not null and not public._puede_mover(v_flujo, v_actual, v_destino.id) then
    motivos := array_append(motivos, 'Tu rol no puede mover a esta fase.'); codigos := array_append(codigos, 'rol');
  end if;
  select jsonb_agg(to_jsonb(e)), jsonb_agg(to_jsonb(e)) filter (where e.bloqueante and not e.cumplido)
    into req, faltan from public.evaluar_requisitos(p_vehiculo, p_repuesto, p_fase_destino) e;
  if faltan is not null then
    motivos := array_append(motivos, ('Faltan ' || jsonb_array_length(faltan) || ' requisito(s) bloqueante(s).')); codigos := array_append(codigos, 'requisitos');
  end if;
  v_nota := coalesce(v_destino.nota_obligatoria, false)
    or exists (select 1 from public.fases_transiciones t where t.de_fase_id = v_actual and t.a_fase_id = p_fase_destino and t.nota_obligatoria);
  return jsonb_build_object('ok', coalesce(array_length(motivos, 1), 0) = 0, 'motivos', motivos, 'codigos', codigos, 'fase_actual', v_actual,
    'requisitos', coalesce(req, '[]'::jsonb), 'faltan', coalesce(faltan, '[]'::jsonb), 'nota_obligatoria', v_nota);
end;
$$;

revoke all on function public.previsualizar_cambio_fase(uuid, uuid, uuid) from public, anon;
grant execute on function public.previsualizar_cambio_fase(uuid, uuid, uuid) to authenticated, service_role;

create or replace function public.cambiar_fase(
  p_vehiculo uuid, p_repuesto uuid, p_fase_destino uuid, p_nota text default null, p_fase_esperada uuid default null
) returns bigint
  language plpgsql
  security definer
  set search_path = ''
as $$
declare pre jsonb; v_actual uuid; v_flujo uuid; v_hist bigint;
begin
  perform public.assert_activo();
  if num_nonnulls(p_vehiculo, p_repuesto) <> 1 then raise exception 'Una unidad por vez.' using errcode = '22023', hint = 'unidad'; end if;
  -- El acceso antes del candado: quien no ve la unidad recibe 42501 sin esperar a quien la está moviendo.
  if not public.puede_unidad(p_vehiculo, p_repuesto, 'logistica.ver', 'repuestos.ver') then
    raise exception '%', public._unidad_sin_acceso(p_vehiculo) using errcode = '42501', hint = 'acceso';
  end if;
  -- El candado de la unidad antes de leer: otro que mueve la misma unidad espera aquí y, cuando éste confirma, lee la fase nueva.
  if p_vehiculo is not null then
    perform 1 from public.vehiculos v where v.id = p_vehiculo and v.eliminado_en is null for no key update;
  else
    perform 1 from public.repuestos_items i where i.id = p_repuesto and i.eliminado_en is null for no key update;
  end if;
  -- Sentencia nueva: ve lo confirmado después del candado (la papelera y el acceso se vuelven a mirar).
  pre := public.previsualizar_cambio_fase(p_vehiculo, p_repuesto, p_fase_destino);
  if pre -> 'codigos' ->> 0 = 'acceso' then
    raise exception '%', pre -> 'motivos' ->> 0 using errcode = '42501', hint = 'acceso';
  end if;
  v_actual := (pre ->> 'fase_actual')::uuid;
  if v_actual is distinct from p_fase_esperada then
    perform public._fase_conflicto(p_vehiculo, p_repuesto, v_actual);
  end if;
  if not (pre ->> 'ok')::boolean then
    raise exception 'No se puede mover: %', array_to_string(array(select jsonb_array_elements_text(pre -> 'motivos')), ' ')
      using errcode = '23514', hint = pre -> 'codigos' ->> 0;
  end if;
  if (pre ->> 'nota_obligatoria')::boolean and coalesce(trim(p_nota), '') = '' then
    raise exception 'Esta fase pide una nota interna.' using errcode = '23514', hint = 'nota';
  end if;
  select flujo_id into v_flujo from public.fases where id = p_fase_destino;
  if p_vehiculo is not null then
    update public.vehiculos set fase_id = p_fase_destino, fase_desde = now() where id = p_vehiculo;
  else
    update public.repuestos_items set fase_id = p_fase_destino, fase_desde = now() where id = p_repuesto;
  end if;
  insert into public.historial_fases (flujo_id, vehiculo_id, repuesto_id, de_fase_id, a_fase_id, nota, usuario_id)
  values (v_flujo, p_vehiculo, p_repuesto, v_actual, p_fase_destino, nullif(trim(p_nota), ''), (select auth.uid())) returning id into v_hist;
  if nullif(trim(p_nota), '') is not null then
    insert into public.notas (vehiculo_id, repuesto_id, historial_fase_id, cuerpo, autor_id)
    values (p_vehiculo, p_repuesto, v_hist, trim(p_nota), (select auth.uid()));
  end if;
  perform public.registrar_actividad('unidad.fase_cambiada', case when p_vehiculo is not null then 'vehiculos' else 'repuestos_items' end,
    coalesce(p_vehiculo, p_repuesto)::text, jsonb_build_object('fase', v_actual), jsonb_build_object('fase', p_fase_destino, 'historial', v_hist));
  return v_hist;
end;
$$;

revoke all on function public.cambiar_fase(uuid, uuid, uuid, text, uuid) from public, anon;
grant execute on function public.cambiar_fase(uuid, uuid, uuid, text, uuid) to authenticated, service_role;

comment on function public.cambiar_fase(uuid, uuid, uuid, text, uuid) is
  'Mueve una unidad de fase (paso 6.02-1): acceso → candado for no key update → vista previa → conflicto → rechazos → escribir. p_fase_esperada nula '
  'significa «la espero sin fase»: vale sólo para una unidad que todavía no tiene fase; con fase da PT409 (cierra la deuda aceptada de ESTADO). Los rechazos llevan '
  'su código en hint: acceso, unidad (42501/22023), conflicto (PT409, con quién y cuándo), transicion, rol, requisitos, nota (23514).';
