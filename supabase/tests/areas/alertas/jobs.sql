-- Los jobs de las alertas (paso 6.12-1). No depende de otro archivo (`SOLO=areas/alertas/jobs.sql`).
--
-- Qué asegura:
--   J1. `alertas-demora` cada hora en el minuto 12 y `documentos-vencimientos` a las 11:15 UTC están en `cron.job`, cada uno con su comando.

-- @test alertas: los jobs alertas-demora y documentos-vencimientos están en cron.job (J1)
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'alertas-demora' and schedule = '12 * * * *'
                 and command = 'select public.alertas_demora()') then
    raise exception 'falta el job alertas-demora';
  end if;
  if not exists (select 1 from cron.job where jobname = 'documentos-vencimientos' and schedule = '15 11 * * *'
                 and command = 'select public.documentos_vencimientos()') then
    raise exception 'falta el job documentos-vencimientos';
  end if;
end $$;
