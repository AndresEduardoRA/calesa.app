-- Mover un requisito dentro de su fase por RPC (paso 5.07-1). Molde `fase_mover`: va primero (`p_despues_de` nulo) o justo después del ancla,
-- y se renumeran todos los de la fase de 10 en 10 por (posición, id), escribiendo sólo los que cambian. Siempre mueve la versión del flujo.

create or replace function public.requisito_mover(p_requisito uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases_requisitos;
  v_flujo uuid;
begin
  if p_despues_de is not null and p_despues_de = p_requisito then
    raise exception 'Un requisito no puede ir después de sí mismo.' using errcode = '22023', hint = 'despues_de';
  end if;
  select f.flujo_id into v_flujo from public.fases_requisitos r join public.fases f on f.id = r.fase_id where r.id = p_requisito;
  if v_flujo is null then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases_requisitos where id = p_requisito for update;
  if not found then
    raise exception 'Este requisito ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if p_despues_de is not null and not exists (select 1 from public.fases_requisitos x where x.id = p_despues_de and x.fase_id = v.fase_id) then
    raise exception 'Ese requisito ya no está en esta fase. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  update public.fases_requisitos x set orden = n.nuevo
  from (
    select q.id, (row_number() over (order by q.posicion, q.id) * 10)::smallint as nuevo from (
      select x.id,
        case
          when x.id = p_requisito then (case when p_despues_de is null then -1.0
                                             else (select y.orden from public.fases_requisitos y where y.id = p_despues_de) + 0.5 end)
          else x.orden::numeric
        end as posicion
      from public.fases_requisitos x where x.fase_id = v.fase_id
    ) q
  ) n
  where x.id = n.id and x.orden <> n.nuevo;

  return public._flujo_tocar(v_flujo);
end $$;

comment on function public.requisito_mover(uuid, timestamptz, uuid) is
  'Mueve un requisito (primero o tras p_despues_de) y renumera su fase de 10 en 10. Contrato _flujo_para_editar/_flujo_tocar; devuelve la versión del flujo.';

revoke all on function public.requisito_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.requisito_mover(uuid, timestamptz, uuid) to authenticated, service_role;
