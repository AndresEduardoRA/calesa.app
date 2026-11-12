-- Las métricas del tablero en la base (paso 9.07), 1 de 2: permisos, privilegios y `leads.cliente_desde` por la clase del tipo de lead. Los conteos
-- (papelera, borde del mes, ventana, rankings, finales) están en `metricas-conteos.sql`.
-- No depende de otro archivo (`SOLO=areas/tablero/metricas.sql`). «Este mes» se mide por diferencia (antes y después). Cada bloque abre su transacción y
-- la revierte.
--
-- Qué asegura:
--   T1.  Sin `tablero.metricas.ver`, 42501 en las dos; con la clave, las dos responden con sus claves exactas.
--   T2.  `anon` no ejecuta ninguna; `authenticated` ejecuta las dos y no las privadas ni la del trigger; las dos son `definer` con `search_path` vacío.
--   T3.  `cliente_desde` no la lee `authenticated` ni está en `leads_vista`.
--   T4.  Un prospecto pasado a cliente este mes queda fechado y cuenta en `convertidos` del mes en La Paz.
--   T5.  Renombrar «Cliente» no cambia la cuenta; un segundo tipo de clase `cliente` también fecha y cuenta; de cliente a cliente conserva la fecha; volver a
--        prospecto la vacía y deja de contar.
--   T6.  Un alta directa como cliente queda sin fecha (D4); nadie escribe `cliente_desde` a mano.

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
