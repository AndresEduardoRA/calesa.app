-- Eliminar una transición por RPC (paso 5.05), con la versión del flujo. Sus roles caen en cascada; la actividad la deja `trg_auditar`.

create or replace function public.transicion_eliminar(p_transicion uuid, p_actualizado_en_esperado timestamptz) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flujo uuid;
begin
  select flujo_id into v_flujo from public.fases_transiciones where id = p_transicion;
  if v_flujo is null then
    raise exception 'Esta transición ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  delete from public.fases_transiciones where id = p_transicion;
  if not found then
    raise exception 'Esta transición ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  return public._flujo_tocar(v_flujo);
end $$;

revoke all on function public.transicion_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.transicion_eliminar(uuid, timestamptz) to authenticated, service_role;

comment on function public.transicion_eliminar(uuid, timestamptz) is
  'Elimina una transición y sus roles (5.05). Inexistente → PT409; _flujo_para_editar (42501, PT409). Devuelve la versión nueva del flujo.';
