-- La dirección pública del sitio para el portal (paso 8.07-1): los route handlers `api/portal/*` aceptan un POST con el `Origin` propio o
-- con el del sitio, que reescribe `/api/portal/*` hacia el CRM. No hay sesión (el portal entra con cookie propia), así que la leen con el
-- cliente admin por esta RPC, sólo para `service_role`. `direccion_publica` no se suma a la vista `web.ajustes`: cambiaría el tipado del
-- sitio, que es otro repo.

create or replace function web.portal_direccion_publica() returns text
  language sql stable security definer set search_path = '' as $$
  select a.direccion_publica from public.ajustes_web a where a.id = 1
$$;
comment on function web.portal_direccion_publica() is
  'La dirección pública del sitio (ajustes_web.direccion_publica, https:// o nula): el origen que los route handlers del portal aceptan en un POST. Sólo service_role.';
revoke all on function web.portal_direccion_publica() from public, anon, authenticated;
grant execute on function web.portal_direccion_publica() to service_role;
