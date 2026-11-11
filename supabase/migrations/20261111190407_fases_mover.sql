-- Mover una fase por RPC con la versión del flujo (paso 5.01-2). Modelo `categoria_mover`: la fase va primera (`p_despues_de` nulo) o
-- inmediatamente después del ancla, y se renumeran **todas** las fases del flujo (activas y jubiladas) de 10 en 10 por (posición, nombre, id),
-- así que después no hay dos con el mismo `orden` aunque antes las hubiera. Sólo escribe `orden` de las que cambian (no toca la clave de la
-- fila: no frena el key share de `vehiculos.fase_id` ni de `historial_fases`). Siempre mueve la versión del flujo, también si nada cambió.

create or replace function public.fase_mover(p_fase uuid, p_actualizado_en_esperado timestamptz, p_despues_de uuid default null) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.fases;
  v_flujo uuid;
begin
  if p_despues_de is not null and p_despues_de = p_fase then
    raise exception 'Una fase no puede ir después de sí misma.' using errcode = '22023', hint = 'despues_de';
  end if;
  select flujo_id into v_flujo from public.fases where id = p_fase;
  if v_flujo is null then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  perform public._flujo_para_editar(v_flujo, p_actualizado_en_esperado);
  select * into v from public.fases where id = p_fase for no key update;
  if not found then
    raise exception 'Esta fase ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  if p_despues_de is not null and not exists (select 1 from public.fases x where x.id = p_despues_de and x.flujo_id = v_flujo) then
    raise exception 'Esa fase ya no está en este flujo. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;

  update public.fases x set orden = n.nuevo
  from (
    select q.id, (row_number() over (order by q.posicion, q.nombre, q.id) * 10)::smallint as nuevo from (
      select x.id, x.nombre,
        case
          when x.id = p_fase then (case when p_despues_de is null then -1.0
                                        else (select y.orden from public.fases y where y.id = p_despues_de) + 0.5 end)
          else x.orden::numeric
        end as posicion
      from public.fases x where x.flujo_id = v_flujo
    ) q
  ) n
  where x.id = n.id and x.orden <> n.nuevo;

  return public._flujo_tocar(v_flujo);
end $$;

comment on function public.fase_mover(uuid, timestamptz, uuid) is
  'Mueve una fase (primera o tras p_despues_de) y renumera todo el flujo de 10 en 10, sin orden repetido. Contrato _flujo_para_editar/_flujo_tocar; devuelve la versión del flujo.';

revoke all on function public.fase_mover(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.fase_mover(uuid, timestamptz, uuid) to authenticated, service_role;
