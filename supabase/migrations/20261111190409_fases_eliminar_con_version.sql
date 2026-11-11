-- Eliminar una fase con la versión del flujo (paso 5.01-2). Reemplaza a la de la base (sin versión, con conteos sin tope): se borra su firma y
-- deja de haber un camino de escritura de fases sin versión. La regla es `_fase_uso()` (la misma que lee `fase_impacto()`): con paradas o
-- historial jubila; sin ellos borra; con esperas → 23503; la única inicial activa → 23514; ya jubilada con uso → 22023.
-- La fase se toma `for update` antes de contar: espera a un cambio de fase en curso que entra o sale de ella (el key share de su FK) y cuenta lo
-- que dejó, así jubila en vez de caer con el 23503 crudo de la FK. Un cambio de fase hacia ella que llega mientras se borra recibe ese 23503.

drop function public.fase_eliminar(uuid);

create function public.fase_eliminar(p_fase uuid, p_actualizado_en_esperado timestamptz) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases;
  v_flujo uuid;
  v_uso jsonb;
  v_accion text;
  v_motivo text;
begin
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases where id = p_fase for update;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  v_uso := public._fase_uso(p_fase);
  v_accion := v_uso ->> 'accion';
  v_motivo := v_uso ->> 'motivo';

  if v_accion = 'jubilar' then
    update public.fases set activa = false where id = p_fase;
    perform public.registrar_actividad('fase.jubilada', 'fases', p_fase::text, null,
      jsonb_build_object('hay_historial', v_uso -> 'hay_historial', 'paradas', v_uso -> 'paradas'));
    return jsonb_build_object('accion', 'jubilada', 'version', public._flujo_tocar(v_flujo));
  elsif v_accion = 'eliminar' then
    delete from public.fases where id = p_fase;
    perform public.registrar_actividad('fase.eliminada', 'fases', p_fase::text, null, null);
    return jsonb_build_object('accion', 'eliminada', 'version', public._flujo_tocar(v_flujo));
  elsif v_motivo = 'esperas' then
    raise exception 'Hay requisitos que esperan a esta fase. Quítalos antes de eliminarla.' using errcode = '23503';
  elsif v_motivo = 'unica_inicial' then
    raise exception 'Es la única fase inicial del flujo: marca otra como inicial antes de eliminarla.' using errcode = '23514', hint = 'es_inicial';
  else
    raise exception 'Esta fase ya está jubilada.' using errcode = '22023';
  end if;
end $$;

comment on function public.fase_eliminar(uuid, timestamptz) is
  'Jubila o borra una fase según _fase_uso (la regla de fase_impacto). Contrato _flujo_para_editar/_flujo_tocar; la fase for update antes de contar. '
  'Devuelve {accion: jubilada|eliminada, version}. Esperas → 23503; única inicial activa → 23514 (hint es_inicial); ya jubilada con uso → 22023.';

revoke all on function public.fase_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.fase_eliminar(uuid, timestamptz) to authenticated, service_role;
