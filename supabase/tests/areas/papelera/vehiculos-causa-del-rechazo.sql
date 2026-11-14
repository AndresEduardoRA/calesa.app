-- Enviar un vehículo a la papelera y que la base lo frene dice también *cuál* regla lo frenó (`rechazados[].causa`), con una clave que la
-- pantalla traduce a acciones. No depende de otro archivo (`SOLO=areas/papelera/vehiculos-causa-del-rechazo.sql`). Cada bloque abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   VC1. Cada causa de bloqueo sale en `rechazados[].causa` con el mismo motivo de siempre: vinculado, fase, documentos, pagos, aduana, repuestos y final.
--   VC2. Un conflicto de versión (PT409) y un envío sin permiso (42501) no traen causa: no hay una regla que nombrar.
--   VC3. `_vehiculo_motivo_de_bloqueo(v, p)` es exactamente `_vehiculo_bloqueo(v, p) ->> 'motivo'`, con `p` verdadero y falso, para cada causa y sin bloqueo.
--   VC4. Un vehículo sin nada que lo frene entra, y `_vehiculo_bloqueo` da nulo.
--   VC5. `_vehiculo_bloqueo` sólo la ejecuta `service_role`.

-- Teléfonos distintos en cada llamada, sin azar (un número fijo chocaría con lo que otra prueba dejó).
create temp sequence vc_telefono;

create or replace function pg_temp.vc_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vc_' || substr(v_id::text, 1, 8), 'VC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen con su flujo: una fase inicial y otra que no lo es.
create or replace function pg_temp.vc_origen() returns jsonb language plpgsql as $f$
declare o uuid; v_flujo uuid; f_ini uuid; f_otra uuid;
begin
  insert into public.origenes (clave, nombre) values ('vc_' || substr(gen_random_uuid()::text, 1, 8), 'VC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  select id into v_flujo from public.flujos where origen_id = o;
  insert into public.fases (flujo_id, nombre, es_inicial) values (v_flujo, 'VC inicial', true) returning id into f_ini;
  insert into public.fases (flujo_id, nombre) values (v_flujo, 'VC en tránsito') returning id into f_otra;
  return jsonb_build_object('o', o, 'flujo', v_flujo, 'ini', f_ini, 'otra', f_otra);
end $f$;

create or replace function pg_temp.vc_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, fase_id) values ((e ->> 'o')::uuid, 'VC vehículo', (e ->> 'ini')::uuid) returning id into v;
  return v;
end $f$;

-- Manda ese vehículo a la papelera como esa persona, con la versión que se pase; devuelve la respuesta o {error, mensaje}.
create or replace function pg_temp.vc_enviar(p_quien uuid, p_v uuid, p_version timestamptz default null) returns jsonb language plpgsql as $f$
declare r jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    r := public.vehiculos_papelera_enviar(jsonb_build_array(jsonb_build_object('id', p_v,
           'actualizado_en', coalesce(p_version, (select actualizado_en from public.vehiculos where id = p_v)))));
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return r;
end $f$;

-- La causa y el motivo del único rechazado de una respuesta.
create or replace function pg_temp.vc_rechazo(r jsonb) returns jsonb language sql as $f$
  select jsonb_build_object('causa', r #> '{rechazados,0,causa}', 'motivo', r #> '{rechazados,0,motivo}', 'codigo', r #> '{rechazados,0,codigo}',
                            'rechazados', jsonb_array_length(r -> 'rechazados'), 'enviados', jsonb_array_length(r -> 'enviados'));
$f$;

-- La equivalencia de VC3 para un vehículo: el texto de siempre y la causa esperada, con p verdadero y falso.
create or replace function pg_temp.vc_equivalen(p_v uuid, p_causa text, p_etiqueta text) returns void language plpgsql as $f$
declare p boolean;
begin
  foreach p in array array[true, false] loop
    if (select public._vehiculo_motivo_de_bloqueo(x, p) from public.vehiculos x where x.id = p_v)
       is distinct from (select (public._vehiculo_bloqueo(x, p)) ->> 'motivo' from public.vehiculos x where x.id = p_v) then
      raise exception 'VC3 (%): el motivo y _vehiculo_bloqueo difieren con p_al_enviar = %', p_etiqueta, p;
    end if;
  end loop;
  if (select (public._vehiculo_bloqueo(x, true)) ->> 'causa' from public.vehiculos x where x.id = p_v) is distinct from p_causa then
    raise exception 'VC3 (%): la causa debía ser % y dio %', p_etiqueta, p_causa,
      (select (public._vehiculo_bloqueo(x, true)) ->> 'causa' from public.vehiculos x where x.id = p_v);
  end if;
end $f$;

-- @test papelera de vehículos: cada causa de bloqueo sale en rechazados con su clave y el motivo de siempre, y el motivo equivale al de _vehiculo_bloqueo (VC1, VC3)
begin;
do $$
declare
  q uuid; e jsonb := pg_temp.vc_origen(); v uuid; r jsonb; l uuid; d uuid; td uuid; c uuid; v_caso record;
begin
  perform pg_temp.vc_persona(array['vehiculos.ver']);   -- con `SOLO=`, la primera cuenta nace dueña: no puede ser la que prueba
  q := pg_temp.vc_persona(array['vehiculos.ver', 'vehiculos.eliminar']);

  -- vinculado
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('VC lead', '7281' || lpad(nextval('pg_temp.vc_telefono')::text, 4, '0'), q, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  v := pg_temp.vc_vehiculo(e);
  update public.vehiculos set lead_id = l where id = v;
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v));
  if r <> jsonb_build_object('causa', 'vinculado', 'motivo', 'Está vinculado a un lead. Quita el vínculo antes.', 'codigo', '23514', 'rechazados', 1, 'enviados', 0) then
    raise exception 'VC1 vinculado: %', r;
  end if;
  perform pg_temp.vc_equivalen(v, 'vinculado', 'vinculado');

  -- fase que no es la inicial
  v := pg_temp.vc_vehiculo(e);
  update public.vehiculos set fase_id = (e ->> 'otra')::uuid where id = v;
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v));
  if r ->> 'causa' is distinct from 'fase' or r ->> 'motivo' <> 'Está en «VC en tránsito». Sólo va a la papelera lo que sigue en su fase inicial.' or r ->> 'codigo' <> '23514' then
    raise exception 'VC1 fase: %', r;
  end if;
  perform pg_temp.vc_equivalen(v, 'fase', 'fase');

  -- documentos vivos
  insert into public.tipos_documento (flujo_id, nombre) values ((e ->> 'flujo')::uuid, 'VC tipo') returning id into td;
  v := pg_temp.vc_vehiculo(e);
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v, td);
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v));
  if r ->> 'causa' is distinct from 'documentos' or r ->> 'motivo' <> 'Tiene documentos cargados.' then
    raise exception 'VC1 documentos: %', r;
  end if;
  perform pg_temp.vc_equivalen(v, 'documentos', 'documentos');

  -- pagos
  v := pg_temp.vc_vehiculo(e);
  insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values (v, 'Seña', 'USD', 1, 1);
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v));
  if r ->> 'causa' is distinct from 'pagos' or r ->> 'motivo' <> 'Tiene pagos o gastos registrados.' then
    raise exception 'VC1 pagos: %', r;
  end if;
  perform pg_temp.vc_equivalen(v, 'pagos', 'pagos');

  -- aduana
  v := pg_temp.vc_vehiculo(e);
  insert into public.declaraciones_aduana (numero) values ('VC-DUI-' || substr(gen_random_uuid()::text, 1, 8)) returning id into d;
  insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) values (d, v);
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v));
  if r ->> 'causa' is distinct from 'aduana' or r ->> 'motivo' <> 'Está en una declaración aduanera.' then
    raise exception 'VC1 aduana: %', r;
  end if;
  perform pg_temp.vc_equivalen(v, 'aduana', 'aduana');

  -- proyecto de repuestos
  v := pg_temp.vc_vehiculo(e);
  insert into public.repuestos_proyectos (vehiculo_id, creado_por) values (v, q);
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v));
  if r ->> 'causa' is distinct from 'repuestos' or r ->> 'motivo' <> 'Tiene un proyecto de repuestos.' then
    raise exception 'VC1 repuestos: %', r;
  end if;
  perform pg_temp.vc_equivalen(v, 'repuestos', 'repuestos');
end $$;
reset role;
rollback;

-- @test papelera de vehículos: un conflicto de versión y un envío sin permiso no traen causa (VC2)
begin;
do $$
declare q uuid; sin uuid; e jsonb := pg_temp.vc_origen(); v uuid; r jsonb;
begin
  perform pg_temp.vc_persona(array['vehiculos.ver']);
  q := pg_temp.vc_persona(array['vehiculos.ver', 'vehiculos.eliminar']);
  sin := pg_temp.vc_persona(array['vehiculos.ver']);
  -- Vinculado y con una versión vieja: la versión se mira antes que el bloqueo, así que es un conflicto, sin causa.
  v := pg_temp.vc_vehiculo(e);
  insert into public.pagos (vehiculo_id, concepto, moneda, monto, monto_base) values (v, 'Seña', 'USD', 1, 1);
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(q, v, '2000-01-01'::timestamptz));
  if r ->> 'codigo' is distinct from 'PT409' or (r -> 'causa') <> 'null'::jsonb then
    raise exception 'VC2 conflicto: debía ser PT409 sin causa y dio %', r;
  end if;
  -- Sin permiso para enviar: 42501, sin causa, aunque el vehículo además esté bloqueado.
  r := pg_temp.vc_rechazo(pg_temp.vc_enviar(sin, v));
  if r ->> 'codigo' is distinct from '42501' or (r -> 'causa') <> 'null'::jsonb then
    raise exception 'VC2 sin permiso: debía ser 42501 sin causa y dio %', r;
  end if;
end $$;
reset role;
rollback;

-- @test papelera de vehículos: un vehículo sin nada que lo frene entra y _vehiculo_bloqueo da nulo (VC4)
begin;
do $$
declare q uuid; e jsonb := pg_temp.vc_origen(); v uuid; r jsonb;
begin
  perform pg_temp.vc_persona(array['vehiculos.ver']);
  q := pg_temp.vc_persona(array['vehiculos.ver', 'vehiculos.eliminar']);
  v := pg_temp.vc_vehiculo(e);
  if (select public._vehiculo_bloqueo(x, true) from public.vehiculos x where x.id = v) is not null
     or (select public._vehiculo_motivo_de_bloqueo(x, true) from public.vehiculos x where x.id = v) is not null then
    raise exception 'VC4: un vehículo limpio no debía tener bloqueo';
  end if;
  r := pg_temp.vc_enviar(q, v);
  if jsonb_array_length(r -> 'enviados') <> 1 or jsonb_array_length(r -> 'rechazados') <> 0 then
    raise exception 'VC4: debía entrar y dio %', r;
  end if;
end $$;
reset role;
rollback;

-- @test papelera de vehículos: _vehiculo_bloqueo sólo la ejecuta service_role (VC5)
begin;
do $$
begin
  if has_function_privilege('anon', 'public._vehiculo_bloqueo(public.vehiculos, boolean)', 'execute')
     or has_function_privilege('authenticated', 'public._vehiculo_bloqueo(public.vehiculos, boolean)', 'execute')
     or not has_function_privilege('service_role', 'public._vehiculo_bloqueo(public.vehiculos, boolean)', 'execute') then
    raise exception 'VC5: _vehiculo_bloqueo debía ser sólo de service_role';
  end if;
end $$;
rollback;
