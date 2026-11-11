-- Revalidar la web pública (paso 8.06): cuántos vehículos empiezan a verse al encender la integración `web_publica` (o dejan de verse al
-- apagarla): los que hoy cumplen las otras cuatro condiciones de `interno.vitrina_vehiculos` (publicado, fase pública, origen activo y
-- visible). Conteo acotado: devuelve de 0 a 51, y 51 es «más de 50» (`TOPE_DE_VEHICULOS_QUE_CAMBIAN` en TS). Lo lee la tarjeta «Web
-- pública» de Empresa › Integraciones; sólo quien gestiona los ajustes de la empresa.

create or replace function public.web_publica_vehiculos_que_cambian() returns integer
  language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permiso('empresa.ajustes.gestionar');
  -- Sostiene: vehiculos_vitrina_idx (parcial, publicados vivos).
  return (
    select count(*)::int from (
      select 1 from interno.vitrina_vehiculos w
      where w.publicado and w.fase_publica and w.origen_activo and w.origen_visible
      limit 51
    ) s
  );
end $$;
comment on function public.web_publica_vehiculos_que_cambian() is
  'Cuántos vehículos cambian de visibilidad al encender o apagar la web pública (los que cumplen las otras cuatro condiciones de la vitrina), acotado a 51.';
revoke all on function public.web_publica_vehiculos_que_cambian() from public, anon;
grant execute on function public.web_publica_vehiculos_que_cambian() to authenticated, service_role;
