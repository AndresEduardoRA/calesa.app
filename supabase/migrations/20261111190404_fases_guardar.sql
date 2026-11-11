-- Guardar una fase por RPC (paso 5.01-1): una lista cerrada de cambios sobre la fila, con la versión del flujo (`_flujo_para_editar`,
-- `_flujo_tocar`). Usa los ayudantes de `fase_crear()` (`_fase_forma`, `_fase_aplicar`, `_fase_validar`, `_fase_unico`); las validaciones miran
-- la fila mezclada: lo que no cambia también cuenta.

create or replace function public.fase_guardar(p_fase uuid, p_actualizado_en_esperado timestamptz, p_cambios jsonb) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases;
  v_flujo uuid;
  v_restriccion text;
begin
  perform public._fase_forma(p_cambios, false);
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases where id = p_fase for update;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  v := public._fase_aplicar(v, p_cambios);
  perform public._fase_validar(v, array(select jsonb_object_keys(p_cambios)));

  begin
    update public.fases f set
      nombre = v.nombre, descripcion = v.descripcion, color = v.color, icono = v.icono, es_inicial = v.es_inicial, es_final = v.es_final,
      es_logistica = v.es_logistica, demora_dias = v.demora_dias, alerta_cada_horas = v.alerta_cada_horas, nota_obligatoria = v.nota_obligatoria,
      permite_contenedor = v.permite_contenedor, permite_aduana = v.permite_aduana, cuenta_llegada_repuestos = v.cuenta_llegada_repuestos,
      publica_web = v.publica_web, visible_portal = v.visible_portal, alias_portal = v.alias_portal, descripcion_portal = v.descripcion_portal
    where f.id = p_fase;
  exception when unique_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    perform public._fase_unico(v_restriccion, v.nombre);
    raise;
  end;
  return public._flujo_tocar(v_flujo);
end $$;

revoke all on function public.fase_guardar(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.fase_guardar(uuid, timestamptz, jsonb) to authenticated, service_role;
