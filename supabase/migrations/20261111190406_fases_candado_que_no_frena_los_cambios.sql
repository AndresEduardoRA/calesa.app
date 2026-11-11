-- El candado de la configuración de un flujo no frena los cambios de fase (paso 5.01-1, de la auditoría del informe). `for update` sobre la fila
-- de `flujos` (y de la fase en `fase_guardar`) choca con el `key share` que toman las FK: `cambiar_fase` actualiza `vehiculos.fase_id` (key share
-- sobre la fase) y después inserta en `historial_fases` (key share sobre el flujo); con `fase_guardar` en medio, las dos se esperaban (40P01).
-- `for no key update` sigue serializando dos guardados de configuración (K1) y deja pasar a las FK (K3); `fase_guardar` asigna `nombre` sólo si
-- cambia, porque asignar una columna de un único (aun con el mismo valor) toma el candado de clave de la fila. Además, `_fase_forma` pide un entero
-- escrito como entero: `1.0` pasaba la forma y caía después con 22P02, sin hint.

create or replace function public._flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns public.flujos
language plpgsql
set search_path = ''
as $$
declare
  v public.flujos;
begin
  if p_flujo is null or not exists (select 1 from public.flujos where id = p_flujo) then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  -- El permiso antes del candado: quien no puede no espera ni hace esperar (el ámbito y el origen de un flujo no se editan).
  if not public.puede_configurar_flujo(p_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;
  select * into v from public.flujos where id = p_flujo for no key update;
  if not found then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._exigir_version(v.actualizado_en, p_actualizado_en_esperado, 'Otra persona cambió este flujo mientras lo editabas.');
  return v;
end $$;

comment on function public._flujo_para_editar(uuid, timestamptz) is
  'Contrato de la configuración de un flujo (5.01). Orden: inexistente → PT409; sin puede_configurar_flujo → 42501 (antes del candado); '
  'for no key update de la fila de flujos (no frena el key share de las FK de historial_fases ni de vehiculos); _exigir_version contra flujos.actualizado_en → PT409. Devuelve la fila bloqueada. Sólo para RPC security definer.';

create or replace function public._fase_forma(p_datos jsonb, p_vacio_vale boolean) returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_clave text;
  v_tipo text;
  v_valor jsonb;
  v_booleanos constant text[] := array['es_inicial', 'es_final', 'es_logistica', 'nota_obligatoria', 'permite_contenedor', 'permite_aduana',
    'cuenta_llegada_repuestos', 'publica_web', 'visible_portal'];
  v_enteros constant text[] := array['demora_dias', 'alerta_cada_horas'];
  v_textos_obligatorios constant text[] := array['nombre', 'color'];
  v_textos constant text[] := array['descripcion', 'icono', 'alias_portal', 'descripcion_portal'];
  v_bien boolean;
begin
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Faltan los datos de la fase.' using errcode = '22023';
  end if;
  if not p_vacio_vale and p_datos = '{}'::jsonb then
    raise exception 'No hay cambios para guardar.' using errcode = '22023';
  end if;
  for v_clave, v_valor in select key, value from jsonb_each(p_datos) loop
    v_tipo := jsonb_typeof(v_valor);
    if v_clave = any (v_booleanos) then
      v_bien := v_tipo = 'boolean';
    elsif v_clave = any (v_enteros) then
      v_bien := v_tipo = 'null'
        or (v_tipo = 'number' and (v_valor #>> '{}') ~ '^-?[0-9]+$'
            and (v_valor #>> '{}')::numeric between -2147483648 and 2147483647);
    elsif v_clave = any (v_textos_obligatorios) then
      v_bien := v_tipo = 'string';
    elsif v_clave = any (v_textos) then
      v_bien := v_tipo in ('string', 'null');
    else
      raise exception 'El dato «%» no se cambia desde una fase.', v_clave using errcode = '22023', hint = v_clave;
    end if;
    if not v_bien then
      raise exception 'El dato «%» no tiene el formato esperado.', v_clave using errcode = '22023', hint = v_clave;
    end if;
  end loop;
end $$;

create or replace function public.fase_guardar(p_fase uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases;
  v_antes public.fases;
  v_flujo uuid;
  v_restriccion text;
begin
  perform public._fase_forma(p_cambios, false);
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases where id = p_fase for no key update;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  v_antes := v;

  v := public._fase_aplicar(v, p_cambios);
  perform public._fase_validar(v, array(select jsonb_object_keys(p_cambios)));

  begin
    -- `nombre` (con `flujo_id`, la clave de `fases_flujo_id_nombre_key`) va al update sólo si cambia: asignarlo, aun igual, toma el candado de
    -- clave de la fila y frena el key share de `vehiculos.fase_id` (medido). Renombrar sí espera a quien mueve un vehículo a esa fase.
    if v.nombre is distinct from v_antes.nombre then
      update public.fases f set
        nombre = v.nombre, descripcion = v.descripcion, color = v.color, icono = v.icono, es_inicial = v.es_inicial, es_final = v.es_final,
        es_logistica = v.es_logistica, demora_dias = v.demora_dias, alerta_cada_horas = v.alerta_cada_horas, nota_obligatoria = v.nota_obligatoria,
        permite_contenedor = v.permite_contenedor, permite_aduana = v.permite_aduana, cuenta_llegada_repuestos = v.cuenta_llegada_repuestos,
        publica_web = v.publica_web, visible_portal = v.visible_portal, alias_portal = v.alias_portal, descripcion_portal = v.descripcion_portal
      where f.id = p_fase;
    else
      update public.fases f set
        descripcion = v.descripcion, color = v.color, icono = v.icono, es_inicial = v.es_inicial, es_final = v.es_final,
        es_logistica = v.es_logistica, demora_dias = v.demora_dias, alerta_cada_horas = v.alerta_cada_horas, nota_obligatoria = v.nota_obligatoria,
        permite_contenedor = v.permite_contenedor, permite_aduana = v.permite_aduana, cuenta_llegada_repuestos = v.cuenta_llegada_repuestos,
        publica_web = v.publica_web, visible_portal = v.visible_portal, alias_portal = v.alias_portal, descripcion_portal = v.descripcion_portal
      where f.id = p_fase;
    end if;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._fase_unico(v_restriccion, v.nombre);
    raise;
  end;
  return public._flujo_tocar(v_flujo);
end $$;

revoke all on function public._flujo_para_editar(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public._flujo_para_editar(uuid, timestamptz) to service_role;
revoke all on function public._fase_forma(jsonb, boolean) from public, anon, authenticated;
grant execute on function public._fase_forma(jsonb, boolean) to service_role;
revoke all on function public.fase_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.fase_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
