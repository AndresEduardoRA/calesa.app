-- El orden de candados lead → vehículo → cotización (docs/DECISIONES.md) en lo que cruza la papelera y no tiene otra prueba en `db:probar` (las carreras con
-- tres conexiones, `scripts/carreras/candados-papelera.mjs`, corren en `pnpm db:carreras`, que el CI no corre en cada PR).
-- No depende de otro archivo (`SOLO=areas/papelera/orden-de-candados.sql`). No escribe nada.
--
-- Qué asegura:
--   O1. Cotizar encima toma el lead y el vehículo de la anterior, en ese orden, antes que la anterior `for share` (al revés se cruza con mandar el
--       vehículo a la papelera, que toma el vehículo y después sus cotizaciones).

-- @test orden de candados: cotizar encima toma el lead y el vehículo de la anterior antes que la anterior (O1)
do $$
declare v_src text; v_lead int; v_veh int; v_ant int;
begin
  select prosrc into v_src from pg_proc where oid = 'public.cotizacion_encima(uuid, uuid)'::regprocedure;
  v_lead := regexp_instr(v_src, 'from public\.leads [^;]*for key share');
  v_veh := regexp_instr(v_src, 'from public\.vehiculos [^;]*for key share');
  v_ant := regexp_instr(v_src, 'from public\.cotizaciones x where x\.id = p_anterior [^;]*for share');
  if v_lead = 0 or v_veh = 0 or v_ant = 0 then raise exception 'cotizar encima no toma el lead, el vehículo y la anterior'; end if;
  if v_lead > v_veh then raise exception 'cotizar encima toma el vehículo antes que el lead'; end if;
  if v_veh > v_ant then raise exception 'cotizar encima toma la anterior antes que su vehículo'; end if;
end $$;
