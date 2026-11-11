-- Reactivar una fase jubilada con la versión del flujo (paso 5.01-2). Valida las reglas del flujo sobre la fila (`_fase_validar` con claves
-- vacías: una regla apagada desde que se jubiló → 23514 con el campo en `hint`, y sigue jubilada). Sólo escribe `activa`. Sin evento de
-- actividad propio (lo registra `trg_auditar`).

create or replace function public.fase_reactivar(p_fase uuid, p_actualizado_en_esperado timestamptz) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases;
  v_flujo uuid;
begin
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases where id = p_fase for no key update;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if v.activa then
    raise exception 'Esta fase ya está activa.' using errcode = '22023';
  end if;
  v.activa := true;
  perform public._fase_validar(v, '{}'::text[]);
  update public.fases set activa = true where id = p_fase;
  return public._flujo_tocar(v_flujo);
end $$;

comment on function public.fase_reactivar(uuid, timestamptz) is
  'Reactiva una fase jubilada. Contrato _flujo_para_editar/_flujo_tocar; ya activa → 22023; reglas del flujo → 23514 con hint. Devuelve la versión del flujo.';

revoke all on function public.fase_reactivar(uuid, timestamptz) from public, anon;
grant execute on function public.fase_reactivar(uuid, timestamptz) to authenticated, service_role;
