-- Guardar la oferta de transporte de un flujo (paso 5.10-2), con la versión del flujo (`_flujo_para_editar`, 5.01). Reemplazo todo
-- o nada: lo que llega es la oferta entera; una lista vacía = se ofrece todo. Sólo con la regla «transporte» encendida; apagarla
-- después no borra la oferta. Un puerto o una naviera inactivos se aceptan (la oferta filtra, nunca invalida lo guardado).

create or replace function public.flujo_oferta_guardar(
  p_flujo uuid,
  p_actualizado_en_esperado timestamptz,
  p_puertos_origen uuid[],
  p_puertos_destino uuid[],
  p_navieras uuid[]
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hint text;
  v_transporte boolean;
  v_origen uuid[];
  v_destino uuid[];
  v_navieras uuid[];
begin
  -- Forma, por arreglo y en su orden; nulo vale vacío.
  v_hint := case
    when array_position(p_puertos_origen, null) is not null then 'puertos_origen'
    when array_position(p_puertos_destino, null) is not null then 'puertos_destino'
    when array_position(p_navieras, null) is not null then 'navieras'
  end;
  if v_hint is not null then
    raise exception 'Un puerto o una naviera viene vacío.' using errcode = '22023', hint = v_hint;
  end if;
  v_hint := case
    when cardinality(p_puertos_origen) > 200 then 'puertos_origen'
    when cardinality(p_puertos_destino) > 200 then 'puertos_destino'
    when cardinality(p_navieras) > 200 then 'navieras'
  end;
  if v_hint is not null then
    raise exception 'Son demasiados: hasta 200 por lista.' using errcode = '22023', hint = v_hint;
  end if;
  v_origen := coalesce((select array_agg(distinct x) from unnest(p_puertos_origen) x), '{}');
  v_destino := coalesce((select array_agg(distinct x) from unnest(p_puertos_destino) x), '{}');
  v_navieras := coalesce((select array_agg(distinct x) from unnest(p_navieras) x), '{}');

  perform public._flujo_para_editar(p_flujo, p_actualizado_en_esperado);

  v_transporte := public.flujo_regla_activa(p_flujo, 'transporte');
  if not v_transporte then
    raise exception 'La oferta de transporte se guarda con la regla «Transporte» encendida.' using errcode = '23514', hint = 'transporte';
  end if;

  -- Existencia antes de escribir (puertos_pkey, navieras_pkey).
  v_hint := case
    when exists (select 1 from unnest(v_origen) x where not exists (select 1 from public.puertos p where p.id = x)) then 'puertos_origen'
    when exists (select 1 from unnest(v_destino) x where not exists (select 1 from public.puertos p where p.id = x)) then 'puertos_destino'
    when exists (select 1 from unnest(v_navieras) x where not exists (select 1 from public.navieras n where n.id = x)) then 'navieras'
  end;
  if v_hint is not null then
    raise exception 'Un puerto o una naviera ya no existe. Recarga e intenta de nuevo.' using errcode = '23503', hint = v_hint;
  end if;

  -- flujos_transporte_oferta_flujo_id_idx
  delete from public.flujos_transporte_oferta where flujo_id = p_flujo;
  insert into public.flujos_transporte_oferta (flujo_id, tipo, puerto_id, naviera_id)
  select p_flujo, 'puerto_origen', x, null::uuid from unnest(v_origen) x
  union all
  select p_flujo, 'puerto_destino', x, null::uuid from unnest(v_destino) x
  union all
  select p_flujo, 'naviera', null::uuid, x from unnest(v_navieras) x;

  return public._flujo_tocar(p_flujo);
end $$;

comment on function public.flujo_oferta_guardar(uuid, timestamptz, uuid[], uuid[], uuid[]) is
  'Reemplaza la oferta de transporte de un flujo (todo o nada) y devuelve la versión nueva del flujo. Vacío = se ofrece todo. Orden: forma '
  '(22023: elemento nulo o más de 200, hint el arreglo); _flujo_para_editar (PT409 / 42501 / versión PT409); regla transporte apagada → 23514 '
  '(hint transporte); un id inexistente → 23503 (hint el arreglo). Repetidos se colapsan; inactivos se aceptan. La versión se mueve siempre.';

revoke all on function public.flujo_oferta_guardar(uuid, timestamptz, uuid[], uuid[], uuid[]) from public, anon;
grant execute on function public.flujo_oferta_guardar(uuid, timestamptz, uuid[], uuid[], uuid[]) to authenticated, service_role;
