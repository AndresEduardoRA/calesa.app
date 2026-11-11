-- El impacto de jubilar o eliminar una fase (paso 5.01-2). `_fase_uso()` es la única regla: la lee la pantalla por `fase_impacto()` y la aplica
-- `fase_eliminar()`, así lo que se anuncia es lo que se hace. Conteos acotados: tope fijo de 50, se lee uno de más (la app los pasa por
-- `conteoAcotado(n, 50)`); sin parámetro de tamaño (no es una página). Las paradas cuentan también las unidades en la papelera (la FK `restrict`
-- de `vehiculos.fase_id` no las distingue) y las esperas, las de cualquier flujo (la FK `restrict` frena cualquiera).

create or replace function public._fase_uso(p_fase uuid) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v public.fases;
  v_tope constant int := 50;
  v_paradas int;
  v_historial boolean;
  v_esperas int;
  v_unica_inicial boolean;
  v_accion text;
  v_motivo text;
begin
  select * into v from public.fases where id = p_fase;
  if not found then
    return null;
  end if;
  -- vehiculos_fase_id_idx y repuestos_items_fase_id_idx, cada lado con su tope; la suma, acotada.
  v_paradas := least(v_tope + 1,
    (select count(*) from (select 1 from public.vehiculos x where x.fase_id = p_fase limit v_tope + 1) q)
    + (select count(*) from (select 1 from public.repuestos_items x where x.fase_id = p_fase limit v_tope + 1) q))::int;
  -- historial_fases_a_fase_id_idx y historial_fases_de_fase_id_idx.
  v_historial := exists (select 1 from public.historial_fases h where h.a_fase_id = p_fase)
    or exists (select 1 from public.historial_fases h where h.de_fase_id = p_fase);
  -- fases_requisitos_espera_fase_id_idx.
  v_esperas := (select count(*) from (select 1 from public.fases_requisitos r where r.espera_fase_id = p_fase limit v_tope + 1) q)::int;
  -- Una inicial jubilada no sostiene el flujo: sólo cuenta si está activa.
  v_unica_inicial := v.activa and v.es_inicial
    and not exists (select 1 from public.fases o where o.flujo_id = v.flujo_id and o.id <> p_fase and o.es_inicial and o.activa);

  if not v.activa and (v_paradas > 0 or v_historial) then
    v_accion := 'bloqueada'; v_motivo := 'ya_jubilada';
  elsif v_paradas > 0 then
    v_accion := 'jubilar'; v_motivo := 'paradas';
  elsif v_historial then
    v_accion := 'jubilar'; v_motivo := 'historial';
  elsif v_esperas > 0 then
    v_accion := 'bloqueada'; v_motivo := 'esperas';
  elsif v_unica_inicial then
    v_accion := 'bloqueada'; v_motivo := 'unica_inicial';
  else
    v_accion := 'eliminar'; v_motivo := null;
  end if;

  return jsonb_build_object('accion', v_accion, 'motivo', v_motivo, 'paradas', v_paradas, 'hay_historial', v_historial,
    'esperas', v_esperas, 'unica_inicial', v_unica_inicial);
end $$;

comment on function public._fase_uso(uuid) is
  'Lo que usa una fase y qué haría eliminarla: {accion: jubilar|eliminar|bloqueada, motivo, paradas, hay_historial, esperas, unica_inicial}. '
  'Conteos con tope 50 (lee 51). Regla única de fase_impacto y fase_eliminar; sin EXECUTE para authenticated.';

revoke all on function public._fase_uso(uuid) from public, anon, authenticated;
grant execute on function public._fase_uso(uuid) to service_role;

-- La lectura del impacto, para la pantalla: sin versión ni candado.
create or replace function public.fase_impacto(p_fase uuid) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_flujo uuid;
begin
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if not public.puede_configurar_flujo(v_flujo) then
    raise exception 'No tienes permiso para configurar este flujo.' using errcode = '42501';
  end if;
  return public._fase_uso(p_fase);
end $$;

comment on function public.fase_impacto(uuid) is
  'Qué pasaría al eliminar una fase (la regla de _fase_uso). Inexistente → PT409; sin puede_configurar_flujo → 42501. Lectura: no devuelve versión.';

revoke all on function public.fase_impacto(uuid) from public, anon;
grant execute on function public.fase_impacto(uuid) to authenticated, service_role;
