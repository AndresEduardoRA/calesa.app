-- Cotizaciones: validación del grafo de la fórmula (el candado real), versionado append-only,
-- plantilla de tarjeta, cerrar la final al entrar a logística, comprobantes.

-- ---------------------------------------------------------------------------
-- Validación de la definición (grafo). El TS valida igual para la UX; esto es el candado.
-- definicion = { nodos: [ {id, tipo, etiqueta, formato, seccion?, bucket?, salida?, ...} ] }
--   tipo ∈ input | constante | tipo_cambio | campo_vehiculo | bandera | tabla | tramo | calculo
--   calculo.op ∈ suma | porcentaje_de | multiplicar | restar | dividir | si | depreciar | redondear
--   salida ∈ total | base_imponible | aparte  (a lo sumo un nodo total)
-- ---------------------------------------------------------------------------
create or replace function public.validar_formula(p_def jsonb, p_params jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare n jsonb; ids text[] := '{}'; id text; tipo text; refs text[]; r text; totales int := 0; i int;
begin
  if jsonb_typeof(p_def -> 'nodos') <> 'array' then raise exception 'definicion.nodos debe ser una lista' using errcode = '22023'; end if;
  for n in select * from jsonb_array_elements(p_def -> 'nodos') loop
    id := n ->> 'id'; tipo := n ->> 'tipo';
    if id is null or id !~ '^[a-z][a-z0-9_]{0,40}$' then raise exception 'Nodo con id inválido: %', id using errcode = '22023'; end if;
    if id = any (ids) then raise exception 'Nodo duplicado: %', id using errcode = '22023'; end if;
    if tipo not in ('input', 'constante', 'tipo_cambio', 'campo_vehiculo', 'bandera', 'tabla', 'tramo', 'calculo') then raise exception 'Nodo «%»: tipo desconocido %', id, tipo using errcode = '22023'; end if;
    if coalesce(n ->> 'formato', 'usd') not in ('usd', 'pct', 'raw', 'moneda') then raise exception 'Nodo «%»: formato inválido', id using errcode = '22023'; end if;
    if coalesce(n ->> 'bucket', 'ninguno') not in ('ninguno', 'origen', 'destino') then raise exception 'Nodo «%»: bucket inválido (ninguno|origen|destino)', id using errcode = '22023'; end if;
    if (n ->> 'salida') = 'total' then totales := totales + 1; end if;
    if tipo = 'constante' and not (p_params ? id) then raise exception 'La constante «%» no tiene valor en params', id using errcode = '22023'; end if;
    if tipo = 'calculo' and coalesce(n ->> 'op', '') not in ('suma', 'porcentaje_de', 'multiplicar', 'restar', 'dividir', 'si', 'depreciar', 'redondear') then
      raise exception 'Nodo «%»: operación desconocida', id using errcode = '22023';
    end if;
    -- referencias sólo a nodos anteriores (orden topológico = orden de la lista)
    refs := array(select jsonb_array_elements_text(coalesce(n -> 'de', '[]'::jsonb)));
    if n ? 'pct' then refs := refs || (n ->> 'pct'); end if;
    if n ? 'condicion' then refs := refs || (n ->> 'condicion'); end if;
    if n ? 'sobre' then refs := refs || (n ->> 'sobre'); end if;
    foreach r in array refs loop
      if not (r = any (ids)) then raise exception 'Nodo «%» referencia a «%», que no existe antes en la lista (sin ciclos: el orden de la lista es el de evaluación)', id, r using errcode = '22023'; end if;
    end loop;
    ids := ids || id;
  end loop;
  if totales <> 1 then raise exception 'La fórmula necesita exactamente un nodo con salida = total (hay %)', totales using errcode = '22023'; end if;
  -- params sólo con claves de constantes y valores numéricos
  for id in select jsonb_object_keys(p_params) loop
    if not exists (select 1 from jsonb_array_elements(p_def -> 'nodos') x where x ->> 'id' = id and x ->> 'tipo' = 'constante') then
      raise exception 'params.% no corresponde a ninguna constante', id using errcode = '22023';
    end if;
    if jsonb_typeof(p_params -> id) <> 'number' then raise exception 'params.% debe ser numérico', id using errcode = '22023'; end if;
  end loop;
end;
$$;

create or replace function public.formula_guardar_borrador(p_origen uuid, p_def jsonb, p_params jsonb, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  perform public.validar_formula(p_def, p_params);
  insert into public.formulas (origen_id, estado, definicion, params, nota, creado_por)
  values (p_origen, 'borrador', p_def, p_params, p_nota, (select auth.uid()))
  on conflict (origen_id) where estado = 'borrador' do update set definicion = excluded.definicion, params = excluded.params, nota = excluded.nota
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.formula_publicar(p_origen uuid, p_nota text, p_publicada_esperada uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_borrador uuid; v_pub uuid; v_ver int;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if coalesce(trim(p_nota), '') = '' then raise exception 'Publicar pide una nota.' using errcode = '22023'; end if;
  select id into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if p_publicada_esperada is not null and v_pub is distinct from p_publicada_esperada then
    raise exception 'Alguien publicó otra versión mientras editabas. Recargá.' using errcode = 'PT409';
  end if;
  select id into v_borrador from public.formulas where origen_id = p_origen and estado = 'borrador';
  if v_borrador is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  select coalesce(max(version), 0) + 1 into v_ver from public.formulas where origen_id = p_origen;
  update public.formulas set estado = 'archivada' where id = v_pub;
  update public.formulas set estado = 'publicada', version = v_ver, nota = p_nota, publicado_por = (select auth.uid()), publicado_en = now(), version_origen_id = v_pub where id = v_borrador;
  perform public.registrar_actividad('formula.publicada', 'formulas', v_borrador::text, jsonb_build_object('anterior', v_pub), jsonb_build_object('version', v_ver, 'nota', p_nota));
  return v_borrador;
end;
$$;

create or replace function public.formula_descartar_borrador(p_origen uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  delete from public.formulas where origen_id = p_origen and estado = 'borrador';
end;
$$;

-- Cambiar UN valor por defecto desde el ⚙ de una XCell: publica N+1 con nota autogenerada.
create or replace function public.formula_cambiar_constante(p_origen uuid, p_nodo text, p_valor numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pub public.formulas; v_anterior numeric;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  select * into v_pub from public.formulas where origen_id = p_origen and estado = 'publicada';
  if v_pub.id is null then raise exception 'El origen no tiene fórmula publicada.' using errcode = '22023'; end if;
  v_anterior := (v_pub.params ->> p_nodo)::numeric;
  if v_anterior is null then raise exception 'La fórmula publicada no tiene la constante «%».', p_nodo using errcode = '22023'; end if;
  perform public.formula_guardar_borrador(p_origen, v_pub.definicion, v_pub.params || jsonb_build_object(p_nodo, p_valor), null);
  return public.formula_publicar(p_origen, format('%s: %s → %s, desde el cotizador', p_nodo, v_anterior, p_valor), v_pub.id);
end;
$$;

-- Plantilla de tarjeta: mismo versionado.
create or replace function public.plantilla_guardar_borrador(p_origen uuid, p_def jsonb, p_nota text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  if jsonb_typeof(p_def -> 'columnas') <> 'array' or jsonb_typeof(p_def -> 'grupos') <> 'array' then raise exception 'La plantilla necesita columnas y grupos.' using errcode = '22023'; end if;
  insert into public.plantillas_tarjeta (origen_id, estado, definicion, nota, creado_por) values (p_origen, 'borrador', p_def, p_nota, (select auth.uid()))
  on conflict (origen_id) where estado = 'borrador' do update set definicion = excluded.definicion, nota = excluded.nota returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.plantilla_publicar(p_origen uuid, p_nota text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_borrador uuid; v_pub uuid; v_ver int;
begin
  perform public.assert_permiso('cotizaciones.configurar', p_origen);
  select id into v_pub from public.plantillas_tarjeta where origen_id = p_origen and estado = 'publicada';
  select id into v_borrador from public.plantillas_tarjeta where origen_id = p_origen and estado = 'borrador';
  if v_borrador is null then raise exception 'No hay borrador para publicar.' using errcode = '22023'; end if;
  select coalesce(max(version), 0) + 1 into v_ver from public.plantillas_tarjeta where origen_id = p_origen;
  update public.plantillas_tarjeta set estado = 'archivada' where id = v_pub;
  update public.plantillas_tarjeta set estado = 'publicada', version = v_ver, nota = p_nota, publicado_en = now() where id = v_borrador;
  return v_borrador;
end;
$$;

-- Cerrar la cotización final de un vehículo al entrar a logística: la final queda; las
-- preventas del vehículo van a la papelera (restaurables si el vehículo sale de logística).
create or replace function public.cotizacion_marcar_final(p_cotizacion uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.cotizaciones; v_ids uuid[];
begin
  select * into c from public.cotizaciones where id = p_cotizacion and eliminado_en is null;
  if c.id is null then raise exception 'Cotización inexistente.' using errcode = '22023'; end if;
  perform public.assert_permiso('cotizaciones.final.gestionar', c.origen_id);
  if c.vehiculo_id is null then raise exception 'Una final exige vehículo vinculado.' using errcode = '23514'; end if;
  update public.cotizaciones set clase = 'preventa' where vehiculo_id = c.vehiculo_id and clase = 'final' and id <> c.id and eliminado_en is null;
  update public.cotizaciones set clase = 'final' where id = c.id;
  select array_agg(id) into v_ids from public.cotizaciones where vehiculo_id = c.vehiculo_id and clase = 'preventa' and eliminado_en is null;
  if v_ids is not null then perform public.papelera_enviar('cotizaciones', v_ids); end if;
  if c.lead_id is not null then update public.vehiculos set lead_id = c.lead_id where id = c.vehiculo_id and lead_id is null; end if;
  perform public.registrar_actividad('cotizacion.final', 'cotizaciones', c.id::text, null, jsonb_build_object('vehiculo', c.vehiculo_id, 'preventas_a_papelera', coalesce(array_length(v_ids, 1), 0)));
end;
$$;

create or replace function public.cotizacion_moderar(p_cotizacion uuid, p_estado public.estado_cotizacion)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('cotizaciones.moderar');
  update public.cotizaciones set estado = p_estado where id = p_cotizacion;
  perform public.registrar_actividad('cotizacion.moderada', 'cotizaciones', p_cotizacion::text, null, jsonb_build_object('estado', p_estado));
end;
$$;

-- Comprobantes: numeración sin huecos por serie.
create or replace function public.comprobante_emitir(p_cotizacion uuid, p_serie text, p_datos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_num bigint; v_id uuid;
begin
  perform public.assert_permiso('cotizaciones.comprobantes.emitir');
  if not exists (select 1 from public.cotizaciones where id = p_cotizacion and clase = 'final' and estado = 'activa' and eliminado_en is null) then
    raise exception 'Sólo se emite comprobante de una cotización final activa.' using errcode = '23514';
  end if;
  insert into public.comprobantes_contadores (serie, ultimo) values (p_serie, 0) on conflict do nothing;
  update public.comprobantes_contadores set ultimo = ultimo + 1 where serie = p_serie returning ultimo into v_num;
  insert into public.comprobantes (cotizacion_id, serie, numero, datos, emitido_por) values (p_cotizacion, p_serie, v_num, p_datos, (select auth.uid())) returning id into v_id;
  perform public.registrar_actividad('comprobante.emitido', 'comprobantes', v_id::text, null, jsonb_build_object('serie', p_serie, 'numero', v_num));
  return jsonb_build_object('id', v_id, 'serie', p_serie, 'numero', v_num);
end;
$$;

create or replace function public.comprobante_anular(p_comprobante uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.assert_permiso('cotizaciones.comprobantes.emitir');
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Anular pide motivo.' using errcode = '22023'; end if;
  update public.comprobantes set anulado_por = (select auth.uid()), anulado_en = now(), motivo_anulacion = p_motivo where id = p_comprobante and anulado_en is null;
end;
$$;

-- Margen y desviación de un vehículo (null ≠ 0: sin venta registrada no hay margen).
create or replace function public.margen_vehiculo(p_vehiculo uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_origen uuid; cot numeric; real numeric; venta numeric;
begin
  select origen_id into v_origen from public.vehiculos where id = p_vehiculo and eliminado_en is null;
  perform public.assert_permiso('logistica.margen.ver', v_origen);
  select total_base into cot from public.cotizaciones where vehiculo_id = p_vehiculo and clase = 'final' and estado = 'activa' and eliminado_en is null;
  select coalesce(sum(monto_base), 0) into real from public.gastos where vehiculo_id = p_vehiculo and eliminado_en is null;
  select sum(monto_base) into venta from public.pagos where vehiculo_id = p_vehiculo and confirmado and eliminado_en is null;
  return jsonb_build_object('cotizado', cot, 'real', real, 'desviacion', case when cot is null then null else cot - real end, 'venta', venta, 'margen', case when venta is null then null else venta - real end);
end;
$$;

do $$
declare f text;
begin
  for f in select unnest(array['formula_guardar_borrador(uuid,jsonb,jsonb,text)', 'formula_publicar(uuid,text,uuid)', 'formula_descartar_borrador(uuid)', 'formula_cambiar_constante(uuid,text,numeric)', 'plantilla_guardar_borrador(uuid,jsonb,text)', 'plantilla_publicar(uuid,text)', 'cotizacion_marcar_final(uuid)', 'cotizacion_moderar(uuid,public.estado_cotizacion)', 'comprobante_emitir(uuid,text,jsonb)', 'comprobante_anular(uuid,text)', 'margen_vehiculo(uuid)', 'validar_formula(jsonb,jsonb)']) loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
