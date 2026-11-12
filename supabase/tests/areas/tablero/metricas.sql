-- Las métricas del tablero en la base (paso 9.07): `leads.cliente_desde` por la clase del tipo de lead, y las RPC `tablero_leads` y `tablero_cotizaciones`.
-- No depende de otro archivo (`SOLO=areas/tablero/metricas.sql`). Los períodos fijos van en 2031 y 2032 (la semilla no tiene nada ahí); «este mes» se mide
-- por diferencia (antes y después). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   T1.  Sin `tablero.metricas.ver`, 42501 en las dos; con la clave, las dos responden con sus claves exactas.
--   T2.  `anon` no ejecuta ninguna; `authenticated` ejecuta las dos y no las privadas ni la del trigger; las dos son `definer` con `search_path` vacío.
--   T3.  `cliente_desde` no la lee `authenticated` ni está en `leads_vista`.
--   T4.  Un prospecto pasado a cliente este mes queda fechado y cuenta en `convertidos` del mes en La Paz.
--   T5.  Renombrar «Cliente» no cambia la cuenta; un segundo tipo de clase `cliente` también fecha y cuenta; de cliente a cliente conserva la fecha; volver a
--        prospecto la vacía y deja de contar.
--   T6.  Un alta directa como cliente queda sin fecha (D4); nadie escribe `cliente_desde` a mano.
--   T7.  Lo que está en la papelera no cuenta.
--   T8.  El borde del mes cae en `America/La_Paz` y no en UTC (y en UTC si la empresa cambia de zona).
--   T9.  Un período sin leads: `creados = 0`, `tasa` nula y un día por fecha en cero.
--   T10. La ventana: nulos, al revés y más de 366 días dan 22023 con su `hint`; 366 días pasa.
--   T11. Rankings: 10 orígenes y 20 personas como mucho, con el aviso de que había más; el lead sin origen es un grupo nulo; quien está en una baja en
--        curso sale del ranking de personas y su lead sigue en el total.
--   T12. `finales` cuenta las finales creadas en el período; `por_origen` de cotizaciones trae su origen con las dos cuentas.

-- Una persona activa con un rol propio y estas claves (alcance «todos»), con su nombre en el perfil.
create or replace function pg_temp.tm_persona(p_claves text[], p_nombre text default 'TM persona') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de una base vacía es la dueña (con `SOLO=` no hay otras): se la lleva una cuenta aparte, no la persona de la prueba.
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'tm-primera@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre where id = v_id;
  insert into public.roles (clave, nombre) values ('tm_' || substr(v_id::text, 1, 8), 'TM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.tm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.tm_leads(p_quien uuid, p_desde date, p_hasta date) returns jsonb language sql as $f$
  select pg_temp.tm_corre(p_quien, format('select public.tablero_leads(%L::date, %L::date)', p_desde, p_hasta));
$f$;

create or replace function pg_temp.tm_cots(p_quien uuid, p_desde date, p_hasta date) returns jsonb language sql as $f$
  select pg_temp.tm_corre(p_quien, format('select public.tablero_cotizaciones(%L::date, %L::date)', p_desde, p_hasta));
$f$;

-- El mes en curso en La Paz.
create or replace function pg_temp.tm_mes() returns daterange language sql as $f$
  select daterange(date_trunc('month', now() at time zone 'America/La_Paz')::date,
                   (date_trunc('month', now() at time zone 'America/La_Paz') + interval '1 month')::date);
$f$;

-- El primer tipo activo de una clase.
create or replace function pg_temp.tm_tipo(p_clase text) returns uuid language sql as $f$
  select t.id from public.tipos_lead t where t.clase = p_clase::public.clase_tipo_lead and t.activo order by t.orden, t.nombre limit 1;
$f$;

-- Un lead (prospecto) de esa persona, con un teléfono fijo por número de prueba.
create or replace function pg_temp.tm_lead(p_n int, p_quien uuid, p_creado timestamptz default now(), p_origen uuid default null, p_tipo uuid default null)
returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, creado_en, origen_lead_id, tipo_lead_id)
  values ('TM lead ' || p_n, '7907' || lpad(p_n::text, 4, '0'), p_quien, p_creado, p_origen, coalesce(p_tipo, pg_temp.tm_tipo('prospecto')))
  returning id into v;
  return v;
end $f$;

-- Fecha una conversión en el pasado: el trigger la pone en now(), así que se reescribe con el trigger apagado.
create or replace function pg_temp.tm_convertir(p_lead uuid, p_cuando timestamptz) returns void language plpgsql as $f$
begin
  update public.leads set tipo_lead_id = pg_temp.tm_tipo('cliente') where id = p_lead;
  alter table public.leads disable trigger trg_lead_z_cliente_desde;
  update public.leads set cliente_desde = p_cuando where id = p_lead;
  alter table public.leads enable trigger trg_lead_z_cliente_desde;
end $f$;

-- Un origen de cotizaciones con una fórmula publicada mínima.
create or replace function pg_temp.tm_origen(p_nombre text) returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('tm_' || substr(gen_random_uuid()::text, 1, 8), p_nombre) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización de ese origen, creada en ese momento.
create or replace function pg_temp.tm_cot(p_quien uuid, e jsonb, p_creado timestamptz, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid; v_vehiculo uuid;
begin
  if p_clase = 'final' then
    insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'TM vehículo', 'toyota') returning id into v_vehiculo;
  end if;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base, creado_en)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, v_vehiculo, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10, p_creado)
  returning id into v_c;
  return v_c;
end $f$;

-- El elemento de `por_dia` de esa fecha.
create or replace function pg_temp.tm_dia(r jsonb, p_dia date) returns jsonb language sql as $f$
  select d from jsonb_array_elements(r -> 'por_dia') d where d ->> 'dia' = p_dia::text;
$f$;

create or replace function pg_temp.tm_claves(r jsonb) returns text[] language sql as $f$
  select array_agg(k order by k) from jsonb_object_keys(r) k;
$f$;

-- @test tablero: T1 · Sin el permiso, 42501 en las dos; con él, las claves exactas.
begin;
do $$
declare v_sin uuid := pg_temp.tm_persona(array['leads.ver', 'cotizaciones.ver']); v_con uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); r jsonb;
begin
  r := pg_temp.tm_leads(v_sin, '2031-01-01', '2031-01-31');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes permiso para ver las métricas.' then
    raise exception 'T1: tablero_leads sin el permiso debía dar 42501 y dio %', r; end if;
  r := pg_temp.tm_cots(v_sin, '2031-01-01', '2031-01-31');
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes permiso para ver las métricas.' then
    raise exception 'T1: tablero_cotizaciones sin el permiso debía dar 42501 y dio %', r; end if;
  r := pg_temp.tm_leads(v_con, '2031-01-01', '2031-01-31');
  if pg_temp.tm_claves(r) is distinct from array['conversion_desde', 'convertidos', 'creados', 'desde', 'hasta', 'por_asesor', 'por_asesor_hay_mas', 'por_dia',
                                                 'por_origen', 'por_origen_hay_mas', 'tasa', 'zona'] then
    raise exception 'T1: claves de tablero_leads: %', r; end if;
  if r ->> 'desde' <> '2031-01-01' or r ->> 'hasta' <> '2031-01-31' or r ->> 'zona' <> 'America/La_Paz' then raise exception 'T1: período o zona: %', r; end if;
  if (r ->> 'conversion_desde')::date > (now() at time zone 'America/La_Paz')::date then raise exception 'T1: conversion_desde en el futuro: %', r; end if;
  r := pg_temp.tm_cots(v_con, '2031-01-01', '2031-01-31');
  if pg_temp.tm_claves(r) is distinct from array['creadas', 'desde', 'finales', 'hasta', 'por_dia', 'por_origen', 'por_origen_hay_mas', 'zona'] then
    raise exception 'T1: claves de tablero_cotizaciones: %', r; end if;
end $$;
rollback;

-- @test tablero: T2 · Privilegios y forma.
do $$
declare f text;
begin
  foreach f in array array['public.tablero_leads(date,date)', 'public.tablero_cotizaciones(date,date)'] loop
    if has_function_privilege('anon', f, 'execute') then raise exception 'T2: anon ejecuta %', f; end if;
    if not has_function_privilege('authenticated', f, 'execute') then raise exception 'T2: authenticated no ejecuta %', f; end if;
    if not exists (select 1 from pg_proc p where p.oid = f::regprocedure and p.prosecdef and p.proconfig = array['search_path=""']) then
      raise exception 'T2: % no es definer con search_path vacío', f; end if;
  end loop;
  foreach f in array array['public._tablero_ventana(date,date)', 'public._tablero_conversion_desde()', 'public.lead_cliente_desde()'] loop
    if has_function_privilege('anon', f, 'execute') or has_function_privilege('authenticated', f, 'execute') then
      raise exception 'T2: la privada % la ejecuta la app', f; end if;
  end loop;
end $$;

-- @test tablero: T3 · La columna no la lee la app.
do $$
begin
  if has_column_privilege('authenticated', 'public.leads', 'cliente_desde', 'select') or has_column_privilege('anon', 'public.leads', 'cliente_desde', 'select') then
    raise exception 'T3: la app lee leads.cliente_desde'; end if;
  if exists (select 1 from pg_attribute a where a.attrelid = 'public.leads_vista'::regclass and a.attname = 'cliente_desde' and not a.attisdropped) then
    raise exception 'T3: leads_vista trae cliente_desde'; end if;
end $$;

-- @test tablero: T4 · Pasado a cliente este mes: fechado, y cuenta en el mes en curso de La Paz.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); v_l uuid; m daterange := pg_temp.tm_mes(); v_antes int; v_despues int; r jsonb;
begin
  v_l := pg_temp.tm_lead(1, v_p);
  if (select cliente_desde from public.leads where id = v_l) is not null then raise exception 'T4: un prospecto nuevo ya tiene cliente_desde'; end if;
  v_antes := (pg_temp.tm_leads(v_p, lower(m), upper(m) - 1) ->> 'convertidos')::int;
  update public.leads set tipo_lead_id = pg_temp.tm_tipo('cliente') where id = v_l;
  if (select cliente_desde from public.leads where id = v_l) is distinct from now() then raise exception 'T4: pasar a cliente no fechó'; end if;
  r := pg_temp.tm_leads(v_p, lower(m), upper(m) - 1);
  v_despues := (r ->> 'convertidos')::int;
  if v_despues <> v_antes + 1 then raise exception 'T4: convertidos debía subir 1 (% → %)', v_antes, v_despues; end if;
  if (pg_temp.tm_dia(r, (now() at time zone 'America/La_Paz')::date) ->> 'convertidos')::int < 1 then raise exception 'T4: el día de hoy no cuenta la conversión: %', r -> 'por_dia'; end if;
end $$;
rollback;

-- @test tablero: T5 · La clase manda, no el nombre.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); a uuid; b uuid; v_vip uuid; m daterange := pg_temp.tm_mes(); v0 int; v int; v_fecha timestamptz;
begin
  a := pg_temp.tm_lead(11, v_p); b := pg_temp.tm_lead(12, v_p);
  v0 := (pg_temp.tm_leads(v_p, lower(m), upper(m) - 1) ->> 'convertidos')::int;
  update public.leads set tipo_lead_id = pg_temp.tm_tipo('cliente') where id = a;
  update public.tipos_lead set nombre = 'TM comprador' where id = pg_temp.tm_tipo('cliente');
  v := (pg_temp.tm_leads(v_p, lower(m), upper(m) - 1) ->> 'convertidos')::int;
  if v <> v0 + 1 then raise exception 'T5: renombrar el tipo cliente cambió la cuenta (% → %)', v0, v; end if;
  insert into public.tipos_lead (clave, nombre, clase, orden) values ('tm_vip', 'TM VIP', 'cliente', 99) returning id into v_vip;
  update public.leads set tipo_lead_id = v_vip where id = b;
  if (select cliente_desde from public.leads where id = b) is null then raise exception 'T5: un segundo tipo de clase cliente no fechó'; end if;
  v := (pg_temp.tm_leads(v_p, lower(m), upper(m) - 1) ->> 'convertidos')::int;
  if v <> v0 + 2 then raise exception 'T5: el segundo tipo de clase cliente no cuenta (% → %)', v0, v; end if;
  -- De cliente a otro cliente conserva la fecha.
  alter table public.leads disable trigger trg_lead_z_cliente_desde;
  update public.leads set cliente_desde = '2031-05-05 12:00+00' where id = a;
  alter table public.leads enable trigger trg_lead_z_cliente_desde;
  update public.leads set tipo_lead_id = v_vip where id = a;
  v_fecha := (select cliente_desde from public.leads where id = a);
  if v_fecha is distinct from '2031-05-05 12:00+00'::timestamptz then raise exception 'T5: de cliente a cliente cambió la fecha: %', v_fecha; end if;
  -- Volver a prospecto la vacía y deja de contar.
  update public.leads set tipo_lead_id = pg_temp.tm_tipo('prospecto') where id = b;
  if (select cliente_desde from public.leads where id = b) is not null then raise exception 'T5: volver a prospecto no vació la fecha'; end if;
  v := (pg_temp.tm_leads(v_p, lower(m), upper(m) - 1) ->> 'convertidos')::int;
  if v <> v0 then raise exception 'T5: tras mover a y volver b a prospecto debía quedar % y quedó %', v0, v; end if;
end $$;
rollback;

-- @test tablero: T6 · Alta directa como cliente: sin fecha; y nadie la escribe a mano.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['leads.ver']); v_l uuid;
begin
  v_l := pg_temp.tm_lead(21, v_p, now(), null, pg_temp.tm_tipo('cliente'));
  if (select cliente_desde from public.leads where id = v_l) is not null then raise exception 'T6: un alta como cliente quedó fechada'; end if;
  update public.leads set cliente_desde = now() where id = v_l;
  if (select cliente_desde from public.leads where id = v_l) is not null then raise exception 'T6: un update a mano escribió cliente_desde'; end if;
  update public.leads set tipo_lead_id = pg_temp.tm_tipo('cliente'), cliente_desde = '2031-01-01' where id = v_l;
  if (select cliente_desde from public.leads where id = v_l) is not null then raise exception 'T6: un update del mismo tipo escribió cliente_desde'; end if;
end $$;
rollback;

-- @test tablero: T7 · La papelera no cuenta.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); v_l uuid; v_vivo uuid; e jsonb := pg_temp.tm_origen('TM origen papelera'); v_c uuid; r jsonb;
begin
  v_vivo := pg_temp.tm_lead(31, v_p, '2031-03-10 15:00+00');
  v_l := pg_temp.tm_lead(32, v_p, '2031-03-10 15:00+00');
  perform pg_temp.tm_convertir(v_vivo, '2031-03-11 15:00+00');
  perform pg_temp.tm_convertir(v_l, '2031-03-11 15:00+00');
  update public.leads set eliminado_en = now() where id = v_l;
  r := pg_temp.tm_leads(v_p, '2031-03-01', '2031-03-31');
  if (r ->> 'creados')::int <> 1 or (r ->> 'convertidos')::int <> 1 then raise exception 'T7: un lead en la papelera cuenta: %', r; end if;
  if (r ->> 'tasa')::numeric <> 1 then raise exception 'T7: tasa: %', r; end if;
  perform pg_temp.tm_cot(v_p, e, '2031-03-10 15:00+00', 'final');
  v_c := pg_temp.tm_cot(v_p, e, '2031-03-10 15:00+00', 'final');
  update public.cotizaciones set eliminado_en = now() where id = v_c;
  r := pg_temp.tm_cots(v_p, '2031-03-01', '2031-03-31');
  if (r ->> 'creadas')::int <> 1 or (r ->> 'finales')::int <> 1 then raise exception 'T7: una cotización en la papelera cuenta: %', r; end if;
end $$;
rollback;

-- @test tablero: T8 · El borde del mes cae en la zona de la empresa.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); v_l uuid; e jsonb := pg_temp.tm_origen('TM origen borde'); r jsonb;
begin
  v_l := pg_temp.tm_lead(41, v_p, '2031-11-01 03:30+00');
  perform pg_temp.tm_convertir(v_l, '2031-11-01 03:30+00');
  perform pg_temp.tm_cot(v_p, e, '2031-11-01 03:30+00');
  r := pg_temp.tm_leads(v_p, '2031-10-01', '2031-10-31');
  if (r ->> 'creados')::int <> 1 or (r ->> 'convertidos')::int <> 1 then raise exception 'T8: en La Paz, el lead es de octubre: %', r; end if;
  if pg_temp.tm_dia(r, '2031-10-31') is distinct from '{"dia": "2031-10-31", "creados": 1, "convertidos": 1}'::jsonb then
    raise exception 'T8: por_dia del 31 de octubre: %', pg_temp.tm_dia(r, '2031-10-31'); end if;
  r := pg_temp.tm_leads(v_p, '2031-11-01', '2031-11-30');
  if (r ->> 'creados')::int <> 0 or (r ->> 'convertidos')::int <> 0 then raise exception 'T8: en La Paz, el lead no es de noviembre: %', r; end if;
  r := pg_temp.tm_cots(v_p, '2031-10-01', '2031-10-31');
  if (r ->> 'creadas')::int <> 1 or pg_temp.tm_dia(r, '2031-10-31') is distinct from '{"dia": "2031-10-31", "creadas": 1, "finales": 0}'::jsonb then
    raise exception 'T8: en La Paz, la cotización es de octubre: %', r; end if;
  update public.ajustes_empresa set zona_horaria = 'UTC' where id = 1;
  r := pg_temp.tm_leads(v_p, '2031-11-01', '2031-11-30');
  if (r ->> 'creados')::int <> 1 or (r ->> 'convertidos')::int <> 1 or r ->> 'zona' <> 'UTC' then raise exception 'T8: en UTC, el lead es de noviembre: %', r; end if;
  if (pg_temp.tm_cots(v_p, '2031-11-01', '2031-11-30') ->> 'creadas')::int <> 1 then raise exception 'T8: en UTC, la cotización es de noviembre'; end if;
end $$;
rollback;

-- @test tablero: T9 · Sin leads: cero, tasa nula y un día por fecha.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); r jsonb;
begin
  r := pg_temp.tm_leads(v_p, '2032-01-01', '2032-01-31');
  if (r ->> 'creados')::int <> 0 or (r ->> 'convertidos')::int <> 0 then raise exception 'T9: enero de 2032 tiene leads: %', r; end if;
  if r -> 'tasa' is distinct from 'null'::jsonb then raise exception 'T9: tasa debía ser null y es %', r -> 'tasa'; end if;
  if jsonb_array_length(r -> 'por_dia') <> 31 or r -> 'por_dia' -> 0 is distinct from '{"dia": "2032-01-01", "creados": 0, "convertidos": 0}'::jsonb
     or r -> 'por_dia' -> 30 ->> 'dia' <> '2032-01-31' then
    raise exception 'T9: por_dia: %', r -> 'por_dia'; end if;
  if r -> 'por_origen' <> '[]'::jsonb or r -> 'por_asesor' <> '[]'::jsonb or r -> 'por_origen_hay_mas' <> 'false'::jsonb then raise exception 'T9: rankings: %', r; end if;
end $$;
rollback;

-- @test tablero: T10 · La ventana.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); r jsonb;
begin
  r := pg_temp.tm_corre(v_p, 'select public.tablero_leads(null, ''2031-01-31'')');
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' <> 'Elige el período.' or r ->> 'hint' <> 'p_desde' then raise exception 'T10: nulo: %', r; end if;
  r := pg_temp.tm_cots(v_p, '2031-02-01', '2031-01-31');
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' <> 'El período termina antes de empezar.' or r ->> 'hint' <> 'p_hasta' then raise exception 'T10: al revés: %', r; end if;
  r := pg_temp.tm_leads(v_p, '2031-01-01', '2032-01-02');
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' <> 'El período puede tener hasta 366 días.' or r ->> 'hint' <> 'p_hasta' then raise exception 'T10: 367 días: %', r; end if;
  r := pg_temp.tm_cots(v_p, '2031-01-01', '2032-01-01');
  if r ? 'error' or jsonb_array_length(r -> 'por_dia') <> 366 then raise exception 'T10: 366 días debía pasar: %', r; end if;
end $$;
rollback;

-- @test tablero: T11 · Rankings acotados.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver'], 'TM jefa'); v_o uuid; v_u uuid; i int; r jsonb;
begin
  for i in 1..12 loop
    insert into public.origenes_lead (clave, nombre) values ('tm_o' || i, 'TM origen ' || i) returning id into v_o;
    perform pg_temp.tm_lead(100 + i, v_p, '2031-02-10 15:00+00', v_o);
  end loop;
  perform pg_temp.tm_lead(120, v_p, '2031-02-10 15:00+00');
  perform pg_temp.tm_lead(121, v_p, '2031-02-10 15:00+00');
  for i in 1..20 loop
    v_u := pg_temp.tm_persona(array[]::text[], 'TM asesor ' || lpad(i::text, 2, '0'));
    perform pg_temp.tm_lead(200 + i, v_u, '2031-02-11 15:00+00');
  end loop;
  r := pg_temp.tm_leads(v_p, '2031-02-01', '2031-02-28');
  if (r ->> 'creados')::int <> 34 then raise exception 'T11: creados: %', r ->> 'creados'; end if;
  if jsonb_array_length(r -> 'por_origen') <> 10 or r -> 'por_origen_hay_mas' <> 'true'::jsonb then raise exception 'T11: por_origen: %', r -> 'por_origen'; end if;
  if r -> 'por_origen' -> 0 is distinct from '{"origen_lead_id": null, "nombre": null, "creados": 22, "convertidos": 0}'::jsonb then
    raise exception 'T11: el grupo sin origen debía ir primero: %', r -> 'por_origen' -> 0; end if;
  if jsonb_array_length(r -> 'por_asesor') <> 20 or r -> 'por_asesor_hay_mas' <> 'true'::jsonb then raise exception 'T11: por_asesor: %', r -> 'por_asesor'; end if;
  if r -> 'por_asesor' -> 0 is distinct from jsonb_build_object('usuario_id', v_p, 'nombre', 'TM jefa', 'creados', 14, 'convertidos', 0) then
    raise exception 'T11: la jefa debía ir primera: %', r -> 'por_asesor' -> 0; end if;
  if r -> 'por_asesor' -> 1 ->> 'nombre' <> 'TM asesor 01' then raise exception 'T11: desempate por nombre: %', r -> 'por_asesor' -> 1; end if;
  -- Quien está en una baja en curso no se queda con el lead: sale del ranking y su lead sigue en el total.
  insert into public.equipo_bajas (usuario_id, por) values ((r -> 'por_asesor' -> 1 ->> 'usuario_id')::uuid, v_p);
  r := pg_temp.tm_leads(v_p, '2031-02-01', '2031-02-28');
  if (r ->> 'creados')::int <> 34 or jsonb_array_length(r -> 'por_asesor') <> 20 or r -> 'por_asesor_hay_mas' <> 'false'::jsonb
     or r -> 'por_asesor' -> 1 ->> 'nombre' <> 'TM asesor 02' then
    raise exception 'T11: la baja en curso sigue en el ranking: %', r -> 'por_asesor'; end if;
end $$;
rollback;

-- @test tablero: T12 · Finales y orígenes de cotizaciones.
begin;
do $$
declare v_p uuid := pg_temp.tm_persona(array['tablero.metricas.ver']); e jsonb := pg_temp.tm_origen('TM origen cotizaciones'); r jsonb; v_o jsonb;
begin
  perform pg_temp.tm_cot(v_p, e, '2031-04-10 15:00+00', 'final');
  perform pg_temp.tm_cot(v_p, e, '2031-04-11 15:00+00');
  perform pg_temp.tm_cot(v_p, e, '2031-04-12 15:00+00');
  perform pg_temp.tm_cot(v_p, e, '2031-05-01 15:00+00', 'final');
  r := pg_temp.tm_cots(v_p, '2031-04-01', '2031-04-30');
  if (r ->> 'creadas')::int <> 3 or (r ->> 'finales')::int <> 1 then raise exception 'T12: creadas y finales: %', r; end if;
  if pg_temp.tm_dia(r, '2031-04-10') is distinct from '{"dia": "2031-04-10", "creadas": 1, "finales": 1}'::jsonb then raise exception 'T12: por_dia: %', r -> 'por_dia'; end if;
  select o into v_o from jsonb_array_elements(r -> 'por_origen') o where o ->> 'origen_id' = e ->> 'o';
  if v_o is distinct from jsonb_build_object('origen_id', e ->> 'o', 'nombre', 'TM origen cotizaciones', 'creadas', 3, 'finales', 1) then
    raise exception 'T12: por_origen: %', r -> 'por_origen'; end if;
end $$;
rollback;
