-- @test permisos: toda clave del catálogo tiene un punto de enforcement en la base (una función, una policy o una vista que la nombra)
-- «Un permiso existe sólo si hay un punto de enforcement» (`docs/DECISIONES.md`, 2026-10-11) era una regla sin cinturón: una clave sembrada
-- que nadie consulta es un interruptor de la matriz que no protege nada. Este bloque la comprueba. Las que hoy no tienen enforcement en la base
-- (su `aplicado_en` dice UI, vistas o una función edge) figuran acá, cada una con su motivo; si una de ellas llega a tenerlo, el bloque falla
-- y la excepción se borra. Una excepción nueva es una deuda a la vista: lleva su motivo y su fase.
create or replace function pg_temp.con_enforcement(p_clave text) returns boolean language sql stable as $$
  select exists (select 1 from pg_proc f join pg_namespace n on n.oid = f.pronamespace
                  where n.nspname !~ '^pg_' and n.nspname <> 'information_schema' and f.prosrc like '%''' || p_clave || '''%')
      or exists (select 1 from pg_policies c where coalesce(c.qual, '') || coalesce(c.with_check, '') like '%''' || p_clave || '''%')
      or exists (select 1 from pg_views v where v.schemaname !~ '^pg_' and v.schemaname <> 'information_schema' and v.definition like '%''' || p_clave || '''%');
$$;

do $$
declare
  r record; v_sin text[] := '{}'; v_sobran text[] := '{}';
  v_excepciones constant jsonb := jsonb_build_object(
    'datos.exportar.todo', 'UI + queries: la exportación de los datos de todos llega con la Fase 9 (Datos)',
    'equipo.roles.ver', 'UI: gobierna sólo que se dibuje la pantalla de Roles; la lectura de roles y permisos es abierta a quien tiene sesión (policy true)',
    'logistica.pagos.confirmar', 'la RPC pago_confirmar llega con la Fase 6 (Logística)',
    'notificaciones.push', 'función edge de push (Fase 7): vive fuera de la base',
    'tablero.metricas.ver', 'UI + vistas del tablero de equipo (Fase 9)');
begin
  -- El autotest: una clave inventada no tiene enforcement y una real sí; si no, el detector no detecta.
  if pg_temp.con_enforcement('inventada.clave_que_nadie_consulta') then raise exception 'el detector da por enforzada una clave inventada'; end if;
  if not pg_temp.con_enforcement('web.cola.participar') or not pg_temp.con_enforcement('leads.ver') then raise exception 'el detector no ve el enforcement de claves que sí lo tienen'; end if;

  for r in select clave from public.permisos order by clave loop
    if not pg_temp.con_enforcement(r.clave) and not v_excepciones ? r.clave then v_sin := v_sin || r.clave; end if;
  end loop;
  if cardinality(v_sin) > 0 then
    raise exception 'permisos sin ningún punto de enforcement (una función, una policy o una vista que los nombre): %. Crea el enforcement en la misma migración o, si de verdad vive fuera de la base, súmalo a las excepciones con su motivo', v_sin;
  end if;

  for r in select k as clave from jsonb_object_keys(v_excepciones) k loop
    if not exists (select 1 from public.permisos where clave = r.clave) then v_sobran := v_sobran || (r.clave || ' (ya no está en el catálogo)');
    elsif pg_temp.con_enforcement(r.clave) then v_sobran := v_sobran || (r.clave || ' (ya tiene enforcement)'); end if;
  end loop;
  if cardinality(v_sobran) > 0 then raise exception 'excepciones que ya no hacen falta, bórralas: %', v_sobran; end if;
end $$;
