-- El orden de candados lead → vehículo → cotización (docs/DECISIONES.md) en lo que cruza la papelera y no tiene otra prueba en `db:probar` (las carreras con
-- tres conexiones, `scripts/carreras/candados-papelera.mjs`, corren en `pnpm db:carreras`, que el CI no corre en cada PR).
-- No depende de otro archivo (`SOLO=areas/papelera/orden-de-candados.sql`). No escribe nada.
--
-- Qué asegura:
--   O1. Cotizar encima toma el lead y el vehículo de la anterior, en ese orden, antes que la anterior `for share` (al revés se cruza con mandar el
--       vehículo a la papelera, que toma el vehículo y después sus cotizaciones).
--   O2. Emitir un comprobante toma el vehículo de la cotización `for key share` antes que la cotización (sin él, mandar el vehículo a la papelera no ve el
--       comprobante sin confirmar y se lleva la final con su comprobante; su carrera, K8 en `supabase/tests/areas/comprobantes/carreras-papelera.mjs`).

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

-- @test orden de candados: emitir un comprobante toma el vehículo de la cotización antes que la cotización (O2)
do $$
declare v_src text; v_veh int; v_cot int;
begin
  select prosrc into v_src from pg_proc where oid = 'public.comprobante_emitir(uuid, timestamptz)'::regprocedure;
  v_veh := regexp_instr(v_src, 'from public\.vehiculos [^;]*for key share');
  v_cot := regexp_instr(v_src, 'from public\.cotizaciones x where x\.id = p_cotizacion [^;]*for no key update');
  if v_veh = 0 or v_cot = 0 then raise exception 'emitir no toma el vehículo y la cotización'; end if;
  if v_veh > v_cot then raise exception 'emitir toma la cotización antes que su vehículo'; end if;
end $$;
