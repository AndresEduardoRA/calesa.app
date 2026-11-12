-- Lo del panel de una unidad (paso 6.02-3): `logistica_unidad`. No depende de otro archivo (`SOLO=areas/mover/unidad.sql`). Cada bloque abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   U1. El acceso es el de la cadena: sin `logistica.ver` del origen (aunque la tenga de otro), sin `vehiculos.ver`, inexistente o en la papelera,
--       42501 hint `acceso` y el mismo texto; «propios» (`logistica.ver` propios con `vehiculos.ver` todos) ve la suya y la de su cartera, no la ajena;
--       `logistica.ver` todos con `vehiculos.ver` propios ve sólo la suya; la dueña ve todas; `anon` no ejecuta. Quien no pasa no recibe requisitos.
--   U2. Lo que devuelve: `faltan` = sólo los bloqueantes sin cumplir de su fase (y `fuera_de_regla`), `demorada` con la regla `alerta_demora`,
--       `movida` = la última fila de su historial con el nombre; sin fase, nada falta.

create or replace function pg_temp.mu_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-mu@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.mu_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.mu_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mu_' || substr(v_id::text, 1, 8), 'mu ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.mu_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('mu_' || s, 'mu origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.mu_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.mu_fase(p_flujo uuid, p_nombre text, p_orden int, p_logistica boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_logistica) values (p_flujo, p_nombre, p_orden, p_logistica) returning id;
$f$;

create or replace function pg_temp.mu_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null, p_desde timestamptz default null,
                                               p_titulo text default 'mu vehículo') returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por) values (p_origen, p_titulo, p_fase, p_desde, p_creado_por) returning id;
$f$;

create or replace function pg_temp.mu_regla(p_flujo uuid, p_regla text, p_activa boolean) returns void language sql as $f$
  insert into public.flujos_reglas (flujo_id, regla, activa) values (p_flujo, p_regla, p_activa)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.mu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.mu_es(p_que text, p_r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;


-- Un lead en la cartera de quien lo crea.
create or replace function pg_temp.mu_lead(p_de uuid) returns uuid language sql as $f$
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('mu lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_de) returning id;
$f$;

create or replace function pg_temp.mu_unidad(p_quien uuid, p_vehiculo uuid) returns jsonb language sql as $f$
  select pg_temp.mu_corre(p_quien, format('select public.logistica_unidad(%L)', p_vehiculo));
$f$;

create or replace function pg_temp.mu_ve(p_que text, p_r jsonb, p_vehiculo uuid) returns void language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'vehiculo_id' is distinct from p_vehiculo::text then
    raise exception '%: debía verla y dio %', p_que, p_r;
  end if;
end $f$;

-- @test unidad: el acceso es el de la cadena; todo rechazo es 42501 hint acceso con el mismo texto (U1)
begin;
do $$
declare
  a uuid := pg_temp.mu_flujo(); o uuid := pg_temp.mu_origen_de(a); f uuid := pg_temp.mu_fase(a, 'mu uno', 10);
  otro uuid := pg_temp.mu_origen_de(pg_temp.mu_flujo());
  duena uuid := pg_temp.mu_persona(array['logistica.ver', 'vehiculos.ver']);
  sin_log uuid := pg_temp.mu_persona(array['vehiculos.ver@' || o, 'logistica.ver@' || otro]);
  sin_veh uuid := pg_temp.mu_persona(array['logistica.ver@' || o]);
  prop uuid := pg_temp.mu_persona(array['vehiculos.ver@' || o]);
  mixta uuid := pg_temp.mu_persona(array['logistica.ver@' || o]);
  otra uuid := pg_temp.mu_persona(array['vehiculos.ver']);
  v_mia uuid; v_ajena uuid; v_cartera uuid; v_mixta uuid; v_pap uuid; r jsonb; v_texto text; c record;
begin
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select ur.rol_id, 'logistica.ver', o, 'propios' from public.usuarios_roles ur where ur.usuario_id = prop and ur.es_principal;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select ur.rol_id, 'vehiculos.ver', o, 'propios' from public.usuarios_roles ur where ur.usuario_id = mixta and ur.es_principal;
  v_mia := pg_temp.mu_vehiculo(o, f, prop);
  v_ajena := pg_temp.mu_vehiculo(o, f, otra);
  v_cartera := pg_temp.mu_vehiculo(o, f, otra);
  update public.vehiculos set lead_id = pg_temp.mu_lead(prop) where id = v_cartera;
  v_mixta := pg_temp.mu_vehiculo(o, f, mixta);
  v_pap := pg_temp.mu_vehiculo(o, f, prop);
  update public.vehiculos set eliminado_en = now() where id = v_pap;

  v_texto := pg_temp.mu_unidad(duena, gen_random_uuid()) ->> 'mensaje';
  for c in select * from (values
      ('sin logistica.ver del origen', sin_log, v_ajena), ('sin vehiculos.ver', sin_veh, v_ajena), ('inexistente', duena, gen_random_uuid()),
      ('en la papelera', duena, v_pap), ('en la papelera, la suya', prop, v_pap), ('propios, la ajena', prop, v_ajena),
      ('logistica todos y vehiculos propios, la ajena', mixta, v_ajena)) x(que, quien, v) loop
    r := pg_temp.mu_unidad(c.quien, c.v);
    perform pg_temp.mu_es('U1 ' || c.que, r, '42501', 'acceso');
    if r ->> 'mensaje' is distinct from v_texto or v_texto is null then
      raise exception 'U1 %: debía decir lo mismo que una inexistente (%) y dijo %', c.que, v_texto, r ->> 'mensaje';
    end if;
  end loop;

  perform pg_temp.mu_ve('U1 propios, la suya', pg_temp.mu_unidad(prop, v_mia), v_mia);
  perform pg_temp.mu_ve('U1 propios, la de su cartera', pg_temp.mu_unidad(prop, v_cartera), v_cartera);
  perform pg_temp.mu_ve('U1 logistica todos y vehiculos propios, la suya', pg_temp.mu_unidad(mixta, v_mixta), v_mixta);
  perform pg_temp.mu_ve('U1 dueña, la de propios', pg_temp.mu_unidad(duena, v_mia), v_mia);
  perform pg_temp.mu_ve('U1 dueña, la ajena', pg_temp.mu_unidad(duena, v_ajena), v_ajena);
  perform pg_temp.mu_ve('U1 dueña, la de cartera', pg_temp.mu_unidad(duena, v_cartera), v_cartera);
  if has_function_privilege('anon', 'public.logistica_unidad(uuid)', 'execute') then raise exception 'U1: anon ejecuta logistica_unidad'; end if;
end $$;
rollback;

-- @test unidad: faltan sólo los bloqueantes sin cumplir de su fase; demorada con la regla; movida es la última del historial (U2)
begin;
do $$
declare
  a uuid := pg_temp.mu_flujo(); o uuid := pg_temp.mu_origen_de(a); f uuid := pg_temp.mu_fase(a, 'mu uno', 10);
  duena uuid := pg_temp.mu_persona(array['logistica.ver', 'vehiculos.ver']);
  p1 uuid := pg_temp.mu_persona(array['vehiculos.ver']); p2 uuid := pg_temp.mu_persona(array['vehiculos.ver']);
  v uuid; w uuid; td uuid; req uuid; r jsonb;
begin
  update public.fases set demora_dias = 2 where id = f;
  perform pg_temp.mu_regla(a, 'alerta_demora', true);
  v := pg_temp.mu_vehiculo(o, f, null, now() - interval '3 days');
  w := pg_temp.mu_vehiculo(o, null);
  insert into public.tipos_documento (nombre) values ('mu factura ' || substr(gen_random_uuid()::text, 1, 6)) returning id into td;
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante, orden) values (f, 'documento', td, true, 1) returning id into req;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato, bloqueante, orden) values (f, 'dato', 'transporte.contenedor', false, 2);

  r := pg_temp.mu_unidad(duena, v);
  if r -> 'fuera_de_regla' is distinct from 'true'::jsonb or jsonb_array_length(r -> 'faltan') <> 1
     or r -> 'faltan' -> 0 ->> 'requisito_id' is distinct from req::text
     or r -> 'faltan' -> 0 -> 'detalle' ->> 'tipo_documento_id' is distinct from td::text then
    raise exception 'U2: sin el documento debía faltar sólo el bloqueante (%) y dio %', req, r;
  end if;
  if r -> 'demorada' is distinct from 'true'::jsonb or r -> 'demora_dias' is distinct from '2'::jsonb then
    raise exception 'U2: con alerta_demora y 3 días en una fase de 2 debía estar demorada y dio %', r;
  end if;
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v, td);
  update public.documentos set estado = 'aprobado' where vehiculo_id = v;
  perform pg_temp.mu_regla(a, 'alerta_demora', false);
  r := pg_temp.mu_unidad(duena, v);
  if r -> 'fuera_de_regla' is distinct from 'false'::jsonb or r -> 'faltan' is distinct from '[]'::jsonb then
    raise exception 'U2: con el documento aprobado no debía faltar nada y dio %', r;
  end if;
  if r -> 'demorada' is distinct from 'false'::jsonb or r -> 'demora_dias' is distinct from 'null'::jsonb then
    raise exception 'U2: con la regla apagada no debía estar demorada y dio %', r;
  end if;

  r := pg_temp.mu_unidad(duena, w);
  if r -> 'fuera_de_regla' is distinct from 'false'::jsonb or r -> 'faltan' is distinct from '[]'::jsonb or r -> 'movida' is distinct from 'null'::jsonb then
    raise exception 'U2: sin fase ni historial no debía faltar nada ni tener movida y dio %', r;
  end if;
  update public.perfiles set nombre = 'MU Uno' where id = p1;
  update public.perfiles set nombre = 'MU Dos' where id = p2;
  insert into public.historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id, usuario_id, nota, creado_en) values
    (a, v, null, f, p1, 'mu primera', now() + interval '1 minute'),
    (a, v, f, f, p2, 'mu segunda', now() + interval '2 minutes');
  r := pg_temp.mu_unidad(duena, v);
  if r -> 'movida' ->> 'usuario_id' is distinct from p2::text or r -> 'movida' ->> 'nombre' is distinct from 'MU Dos'
     or r -> 'movida' ? 'nota' then
    raise exception 'U2: movida debía ser la última (MU Dos, sin la nota) y dio %', r -> 'movida';
  end if;
end $$;
rollback;
