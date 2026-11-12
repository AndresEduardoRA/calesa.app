-- `fase_desde` existe si y sólo si hay fase (paso 6.02-2, CA6): la cadena lo da por hecho («Sin fase» = `fase_id` nulo; una columna pide
-- `fase_desde < corte`). No depende de otro archivo (`SOLO=areas/mover/fase-desde.sql`); el bloque abre su transacción y la revierte.

-- @test cadena: fase_desde existe si y sólo si hay fase (trigger y check vehiculos_fase_desde_coherente) (CA6)
begin;
do $$
declare
  s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); o uuid; f uuid; v uuid; v_e text;
begin
  insert into public.origenes (clave, nombre, tipo) values ('mfd_' || s, 'mfd origen ' || s, 'manual') returning id into o;
  insert into public.fases (flujo_id, nombre, orden) select id, 'mfd uno', 10 from public.flujos where origen_id = o returning id into f;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'mfd vehículo', f) returning id into v;
  if (select fase_desde from public.vehiculos where id = v) is null then raise exception 'CA6: con fase y sin fase_desde no lo completó'; end if;
  update public.vehiculos set fase_id = null where id = v;
  if (select fase_desde from public.vehiculos where id = v) is not null then raise exception 'CA6: sin fase no vació fase_desde'; end if;
  update public.vehiculos set fase_id = f where id = v;
  -- Sin el trigger (replica), el check solo tiene que rechazarlo.
  set local session_replication_role = replica;
  begin
    update public.vehiculos set fase_desde = null where id = v;
    v_e := 'pasó';
  exception when check_violation then
    v_e := '23514';
  end;
  set local session_replication_role = origin;
  if v_e <> '23514' then raise exception 'CA6: sin el trigger, el check debía rechazar fase sin fase_desde y %', v_e; end if;
end $$;
rollback;
