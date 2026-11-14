-- Enviar un lead a la papelera y que la base lo frene dice también *cuál* regla lo frenó, con una clave en el `hint` del 23514 que la pantalla
-- traduce a acciones. No depende de otro archivo (`SOLO=areas/papelera/leads-causa-del-rechazo.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   LC1. Un lead con un vehículo vinculado que quien envía ve: 23514 con hint `vinculado` y el motivo de siempre; con uno que no ve
--        (sin `vehiculos.ver`), `vinculado_ajeno`, con su texto.
--   LC2. `_lead_motivo_de_bloqueo(l, p)` es exactamente `_lead_bloqueo(l, p) ->> 'motivo'`, con `p` verdadero y falso; en la purga, `pagos` y `portal`.
--   LC3. `_lead_bloqueo` sólo la ejecuta `service_role`.

create temp sequence lcr_telefono;

create or replace function pg_temp.lcr_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('lcr_' || substr(v_id::text, 1, 8), 'LCR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'propios');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.lcr_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('LCR lead', '7282' || lpad(nextval('pg_temp.lcr_telefono')::text, 4, '0'), p_quien,
          (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.lcr_vehiculo(p_creador uuid, p_lead uuid) returns uuid language plpgsql as $f$
declare o uuid; v uuid;
begin
  insert into public.origenes (clave, nombre) values ('lcr_' || substr(gen_random_uuid()::text, 1, 8), 'LCR ' || substr(gen_random_uuid()::text, 1, 8))
  returning id into o;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id) values (o, 'LCR vehículo', p_creador, p_lead) returning id into v;
  return v;
end $f$;

-- Envía el lead como esa persona; devuelve {error, hint, mensaje} o la respuesta.
create or replace function pg_temp.lcr_enviar(p_quien uuid, p_lead uuid) returns jsonb language plpgsql as $f$
declare r jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    r := public.leads_papelera_enviar(gen_random_uuid(), array[p_lead]);
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'hint', v_h, 'mensaje', v_m);
  end;
  reset role;
  return r;
end $f$;

create or replace function pg_temp.lcr_equivalen(p_lead uuid, p_etiqueta text) returns void language plpgsql as $f$
declare p boolean;
begin
  foreach p in array array[true, false] loop
    if (select public._lead_motivo_de_bloqueo(x, p) from public.leads x where x.id = p_lead)
       is distinct from (select (public._lead_bloqueo(x, p)) ->> 'motivo' from public.leads x where x.id = p_lead) then
      raise exception 'LC2 (%): el motivo y _lead_bloqueo difieren con p_al_enviar = %', p_etiqueta, p;
    end if;
  end loop;
end $f$;

-- @test papelera de leads: el vehículo vinculado frena con 23514 y su clave en el hint (LC1, LC2)
begin;
do $$
declare q uuid; l uuid; r jsonb;
begin
  perform pg_temp.lcr_persona(array['leads.ver']);   -- con `SOLO=`, la primera cuenta nace dueña: no puede ser la que prueba
  q := pg_temp.lcr_persona(array['leads.ver', 'leads.eliminar', 'vehiculos.ver']);

  l := pg_temp.lcr_lead(q);
  perform pg_temp.lcr_vehiculo(q, l);
  r := pg_temp.lcr_enviar(q, l);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'vinculado'
     or r ->> 'mensaje' <> 'No se envió nada. «LCR lead»: Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.' then
    raise exception 'LC1 vinculado: %', r;
  end if;
  perform pg_temp.lcr_equivalen(l, 'vinculado');

end $$;
rollback;

-- @test papelera de leads: un vehículo vinculado que quien envía no ve da `vinculado_ajeno` (LC1)
begin;
do $$
declare q uuid; l uuid; r jsonb;
begin
  perform pg_temp.lcr_persona(array['leads.ver']);   -- con `SOLO=`, la primera cuenta nace dueña: no puede ser la que prueba
  q := pg_temp.lcr_persona(array['leads.ver', 'leads.eliminar']);   -- sin `vehiculos.ver`: el vehículo vinculado no se ve
  l := pg_temp.lcr_lead(q);
  perform pg_temp.lcr_vehiculo(q, l);
  r := pg_temp.lcr_enviar(q, l);
  if r ->> 'error' is distinct from '23514' or r ->> 'hint' is distinct from 'vinculado_ajeno'
     or r ->> 'mensaje' <> 'No se envió nada. «LCR lead»: Tiene un vehículo vinculado que no ves: quien lo gestiona tiene que desvincularlo antes.' then
    raise exception 'LC1 ajeno: %', r;
  end if;
  perform pg_temp.lcr_equivalen(l, 'ajeno');
end $$;
rollback;

-- @test papelera de leads: en la purga, los pagos y el portal tienen su clave y el mismo texto (LC2)
begin;
do $$
declare q uuid; l uuid; v uuid; c text;
begin
  q := pg_temp.lcr_persona(array['leads.ver']);
  l := pg_temp.lcr_lead(q);
  -- Un pago cuelga de un vehículo; el del lead no lo vincula (el vínculo frenaría antes).
  v := pg_temp.lcr_vehiculo(q, null);
  insert into public.pagos (vehiculo_id, lead_id, concepto, moneda, monto, monto_base) values (v, l, 'Seña', 'USD', 1, 1);
  select (public._lead_bloqueo(x, false)) ->> 'causa' into c from public.leads x where x.id = l;
  if c is distinct from 'pagos' then
    raise exception 'LC2 pagos: %', c;
  end if;
  perform pg_temp.lcr_equivalen(l, 'pagos');

  l := pg_temp.lcr_lead(q);
  select (public._lead_bloqueo(x, false)) into c from public.leads x where x.id = l;
  if c is not null then
    raise exception 'LC2 sin nada que lo frene: %', c;
  end if;
  perform pg_temp.lcr_equivalen(l, 'libre');
end $$;
rollback;

-- @test papelera de leads: _lead_bloqueo sólo la ejecuta service_role (LC3)
begin;
do $$
begin
  if has_function_privilege('authenticated', 'public._lead_bloqueo(public.leads, boolean)', 'execute')
     or has_function_privilege('anon', 'public._lead_bloqueo(public.leads, boolean)', 'execute') then
    raise exception 'LC3: _lead_bloqueo no es sólo de service_role';
  end if;
end $$;
rollback;
