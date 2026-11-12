-- La purga del límite por IP del portal (paso 8.07-1): cada 5 minutos se van las ventanas vencidas de `interno.portal_intentos`, de a
-- 10.000 por corrida (`.claude/rules/escala.md`: los jobs van por lotes con tope). Una ventana vencida ya no frena a nadie: el próximo
-- intento de esa huella la reinicia igual.

create or replace function public.portal_intentos_purgar() returns integer
  language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  -- Por portal_intentos_ventana_desde_idx.
  delete from interno.portal_intentos
   where huella in (select p.huella from interno.portal_intentos p
                     where p.ventana_desde < now() - interval '15 minutes'
                     order by p.ventana_desde limit 10000);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
comment on function public.portal_intentos_purgar() is
  'El job portal-intentos-purgar: borra hasta 10.000 ventanas vencidas (más de 15 minutos) del límite por IP del portal y devuelve cuántas borró.';
revoke all on function public.portal_intentos_purgar() from public, anon, authenticated;
grant execute on function public.portal_intentos_purgar() to service_role;

select cron.schedule('portal-intentos-purgar', '*/5 * * * *', 'select public.portal_intentos_purgar()');
