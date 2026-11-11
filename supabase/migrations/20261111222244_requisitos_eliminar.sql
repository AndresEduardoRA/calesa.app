-- Eliminar un requisito de fase por RPC (paso 5.07-1), con la versión del flujo. La actividad la deja `trg_auditar`.

create or replace function public.requisito_eliminar(p_requisito uuid, p_actualizado_en_esperado timestamptz) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flujo uuid;
begin
  select f.flujo_id into v_flujo from public.fases_requisitos r join public.fases f on f.id = r.fase_id where r.id = p_requisito;
  if v_flujo is null then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  delete from public.fases_requisitos where id = p_requisito;
  if not found then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  return public._flujo_tocar(v_flujo);
end $$;

comment on function public.requisito_eliminar(uuid, timestamptz) is
  'Elimina un requisito. Contrato _flujo_para_editar/_flujo_tocar; devuelve la versión del flujo.';

revoke all on function public.requisito_eliminar(uuid, timestamptz) from public, anon;
grant execute on function public.requisito_eliminar(uuid, timestamptz) to authenticated, service_role;
