-- Leer la oferta de transporte de un flujo (paso 5.10-2). `security invoker`: todo lo que lee (flujos, flujos_reglas, la oferta, puertos,
-- navieras) es «leer = true» para authenticated. Listas vacías = se ofrece todo, nunca null. La lee aunque «transporte» esté apagada.

create or replace function public.flujo_oferta(p_flujo uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_existe boolean;
begin
  v_existe := exists (select 1 from public.flujos where id = p_flujo);
  if not v_existe then
    raise exception 'Este flujo ya no existe. Recarga e intenta de nuevo.' using errcode = 'PT409';
  end if;
  -- Sin limit: el tope de 200 por lista lo pone flujo_oferta_guardar(). flujos_transporte_oferta_flujo_id_idx; puertos_pkey, navieras_pkey.
  return jsonb_build_object(
    'transporte', coalesce((select r.activa from public.flujos_reglas r where r.flujo_id = p_flujo and r.regla = 'transporte'), false),
    'puertos_origen', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'activo', p.activo) order by p.orden, p.nombre, p.id)
      from public.flujos_transporte_oferta o join public.puertos p on p.id = o.puerto_id
      where o.flujo_id = p_flujo and o.tipo = 'puerto_origen'), '[]'::jsonb),
    'puertos_destino', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'activo', p.activo) order by p.orden, p.nombre, p.id)
      from public.flujos_transporte_oferta o join public.puertos p on p.id = o.puerto_id
      where o.flujo_id = p_flujo and o.tipo = 'puerto_destino'), '[]'::jsonb),
    'navieras', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'nombre', n.nombre, 'activo', n.activo) order by n.nombre, n.id)
      from public.flujos_transporte_oferta o join public.navieras n on n.id = o.naviera_id
      where o.flujo_id = p_flujo and o.tipo = 'naviera'), '[]'::jsonb)
  );
end $$;

comment on function public.flujo_oferta(uuid) is
  'La oferta de transporte de un flujo: {transporte, puertos_origen, puertos_destino, navieras}, cada elemento {id, nombre, activo}; puertos '
  'por (orden, nombre, id), navieras por (nombre, id); lista vacía = se ofrece todo. Flujo inexistente → PT409.';

revoke all on function public.flujo_oferta(uuid) from public, anon;
grant execute on function public.flujo_oferta(uuid) to authenticated, service_role;
