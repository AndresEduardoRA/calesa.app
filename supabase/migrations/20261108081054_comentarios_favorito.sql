-- Marcar una cotización como favorita por RPC (4.27-1).
--
-- Una marca privada por persona, como la de los leads (`lead_favorito_poner`, P11 a): la pone y la quita quien ve la cotización; no mueve la versión
-- (los contadores no la mueven). El filtro «Favoritas» del listado no entra en este paso. Se revocan las escrituras directas (P9 a).

revoke insert, delete on public.cotizaciones_favoritos from authenticated;

create function public.cotizacion_favorito_poner(p_cotizacion uuid, p_valor boolean) returns jsonb
  language plpgsql security definer
  set search_path = ''
as $$
declare n int;
begin
  perform public.assert_activo();
  if not public.puede_cotizacion(p_cotizacion, 'cotizaciones.ver') then
    raise exception 'No tienes acceso a esta cotización.' using errcode = '42501';
  end if;
  if p_valor is null then
    raise exception 'Falta decir si va o no.' using errcode = '22023', hint = 'valor';
  end if;
  if p_valor then
    insert into public.cotizaciones_favoritos (cotizacion_id, usuario_id) values (p_cotizacion, (select auth.uid())) on conflict do nothing;
  else
    delete from public.cotizaciones_favoritos f where f.cotizacion_id = p_cotizacion and f.usuario_id = (select auth.uid());
  end if;
  get diagnostics n = row_count;
  return jsonb_build_object('resultado', case when n = 0 then 'sin_cambios' when p_valor then 'puesto' else 'quitado' end,
                            'valor', p_valor);
end $$;

comment on function public.cotizacion_favorito_poner(uuid, boolean) is 'Pone o quita la marca de favorita de quien llama en una cotización. Pide cotizaciones.ver (42501); p_valor nulo, 22023. No mueve la versión. {resultado: puesto | quitado | sin_cambios, valor}. 4.27-1.';
revoke all on function public.cotizacion_favorito_poner(uuid, boolean) from public, anon;
grant execute on function public.cotizacion_favorito_poner(uuid, boolean) to authenticated, service_role;

update public.permisos set
  aplicado_en = 'policy cotizaciones: leer, puede_cotizacion, cotizacion_leer, cotizacion_evaluar, cotizacion_revisiones, cotizacion_tabla, cotizacion_hoja, cotizacion_hoja_guardada, cotizacion_crear, cotizacion_encima, cotizacion_guardar, cotizacion_comentarios, cotizacion_comentar, cotizacion_reportar, cotizacion_favorito_poner'
 where clave = 'cotizaciones.ver';
