-- Configuración › Repuestos › «Cotizador» (paso 8.12-2, C1 y C2). La pantalla escribe la configuración, los tramos y las cajas bajo las
-- policies que ya tienen (`repuestos.configurar`): esta migración sólo cierra el signo de los tramos y valida los `check` que quedaron sin validar.

-- C1 · Un tramo no tiene montos negativos (un monto 0 es logística gratis).
alter table public.repuestos_tramos_logistica
  add constraint repuestos_tramos_logistica_signo_check check (costo_min >= 0 and monto >= 0) not valid;

-- D18 · Se validan sólo si ninguna fila los rompe: si las hay, quedan `not valid` (igual protegen lo nuevo) y la migración no falla.
do $$
declare v_sin_validar integer := 0;
begin
  if not exists (select 1 from public.repuestos_tramos_logistica where costo_min < 0 or monto < 0) then
    alter table public.repuestos_tramos_logistica validate constraint repuestos_tramos_logistica_signo_check;
  else
    v_sin_validar := v_sin_validar + 1;
  end if;
  if not exists (select 1 from public.repuestos_cotizador_config where redondeo <= 0) then
    alter table public.repuestos_cotizador_config validate constraint repuestos_cotizador_config_redondeo_check;
  else
    v_sin_validar := v_sin_validar + 1;
  end if;
  if v_sin_validar > 0 then
    raise notice 'repuestos_cotizador_configuracion: % tabla(s) con filas viejas que rompen su check; quedó sin validar.', v_sin_validar;
  end if;
end $$;

-- C2 · Dónde se aplica `repuestos.configurar`.
update public.permisos
   set aplicado_en = 'puede_configurar_flujo, policy repuestos_catalogos, policy repuestos_cotizador_config, policy repuestos_tramos_logistica, policy repuestos_cajas'
 where clave = 'repuestos.configurar';
