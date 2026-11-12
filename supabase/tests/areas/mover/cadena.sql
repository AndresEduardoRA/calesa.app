-- La cadena de logística (paso 6.02-2): `logistica_cadena` y `logistica_cadena_columna`. No depende de otro archivo (`SOLO=areas/mover/cadena.sql`).
-- Cada bloque abre su transacción y la revierte. El plan por su índice, con volumen: `supabase/tests/medir-escala.sql` › «La cadena».
--
-- Qué asegura:
--   CA1. Sin `logistica.ver` del origen (aunque la tenga de otro), o sin `vehiculos.ver`: 42501 hint `acceso` en las dos; `authenticated` no ejecuta
--        los ayudantes; `anon` ninguna.
--   CA2. «Propios» ve la que creó y la de un lead de su cartera, no la ajena; `logistica.ver` todos con `vehiculos.ver` propios ve sólo la suya; la
--        dueña ve todas. Nunca sale una de otro origen ni una de la papelera, en una fase o sin fase.
--   CA3. El cursor no repite ni salta (empates en `fase_desde`, y «Sin fase» por id); el tope se acota a 100 con `hay_mas`.
--   CA4. La forma de la cadena: «Sin fase» primera sólo con unidades, activas de logística por orden (vacías también), jubiladas con unidades al
--        final; `demorada` con la regla `alerta_demora`.
--   CA5. Los filtros y las entradas malas.
--   CA6 (que «Sin fase» es `fase_id` nulo y nada más): `fase-desde.sql`.

create or replace function pg_temp.mc_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-mc@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.mc_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.mc_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mc_' || substr(v_id::text, 1, 8), 'mc ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.mc_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('mc_' || s, 'mc origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.mc_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.mc_fase(p_flujo uuid, p_nombre text, p_orden int, p_logistica boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_logistica) values (p_flujo, p_nombre, p_orden, p_logistica) returning id;
$f$;

create or replace function pg_temp.mc_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null, p_desde timestamptz default null,
                                               p_titulo text default 'mc vehículo') returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por) values (p_origen, p_titulo, p_fase, p_desde, p_creado_por) returning id;
$f$;

create or replace function pg_temp.mc_regla(p_flujo uuid, p_activa boolean) returns void language sql as $f$
  insert into public.flujos_reglas (flujo_id, regla, activa) values (p_flujo, 'alerta_demora', p_activa)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.mc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.mc_cadena(p_quien uuid, p_origen uuid, p_filtros jsonb default '{}') returns jsonb language sql as $f$
  select pg_temp.mc_corre(p_quien, format('select public.logistica_cadena(%L, 50, %L)', p_origen, p_filtros));
$f$;

create or replace function pg_temp.mc_columna(p_quien uuid, p_origen uuid, p_fase uuid, p_desde text default null, p_id uuid default null,
                                              p_tope int default 50, p_filtros jsonb default '{}') returns jsonb language sql as $f$
  select pg_temp.mc_corre(p_quien, format('select public.logistica_cadena_columna(%L, %L, %L, %L, %s, %L)',
    p_origen, p_fase, p_desde, p_id, p_tope, p_filtros));
$f$;

-- Los ids de las tarjetas de una columna, o de todas las columnas de una cadena.
create or replace function pg_temp.mc_ids(p jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((x ->> 'id')::uuid), '{}')
    from jsonb_array_elements(coalesce(p -> 'tarjetas', jsonb_path_query_array(p, '$.columnas[*].tarjetas[*]'))) x;
$f$;

create or replace function pg_temp.mc_mismos(p_que text, p_dio uuid[], p_debia uuid[]) returns void language plpgsql as $f$
begin
  if (select coalesce(array_agg(x order by x), '{}') from unnest(p_dio) x) is distinct from
     (select coalesce(array_agg(x order by x), '{}') from unnest(p_debia) x) then
    raise exception '%: debía ver % y vio %', p_que, p_debia, p_dio;
  end if;
end $f$;

create or replace function pg_temp.mc_es(p_que text, p_r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- @test cadena: sin logistica.ver o sin vehiculos.ver del origen, 42501 hint acceso; los ayudantes no los ejecuta authenticated ni anon (CA1)
begin;
do $$
declare
  a uuid := pg_temp.mc_flujo(); o uuid := pg_temp.mc_origen_de(a); f uuid := pg_temp.mc_fase(a, 'mc uno', 10);
  otro uuid := pg_temp.mc_origen_de(pg_temp.mc_flujo());
  sin_log uuid := pg_temp.mc_persona(array['vehiculos.ver@' || o, 'logistica.ver@' || otro]);
  sin_veh uuid := pg_temp.mc_persona(array['logistica.ver@' || o]);
  q text; fn text;
begin
  perform pg_temp.mc_vehiculo(o, f);
  perform pg_temp.mc_es('CA1 cadena sin logistica.ver del origen', pg_temp.mc_cadena(sin_log, o), '42501', 'acceso');
  perform pg_temp.mc_es('CA1 columna sin logistica.ver del origen', pg_temp.mc_columna(sin_log, o, f), '42501', 'acceso');
  perform pg_temp.mc_es('CA1 «Sin fase» sin logistica.ver del origen', pg_temp.mc_columna(sin_log, o, null), '42501', 'acceso');
  perform pg_temp.mc_es('CA1 cadena sin vehiculos.ver', pg_temp.mc_cadena(sin_veh, o), '42501', 'acceso');
  perform pg_temp.mc_es('CA1 columna sin vehiculos.ver', pg_temp.mc_columna(sin_veh, o, f), '42501', 'acceso');
  foreach q in array array[
    format('select to_jsonb(public._logistica_alcance(%L))', o),
    format('select to_jsonb(public._logistica_dias(%L))', f),
    'select public._logistica_filtros(''{}'')',
    format('select public._logistica_columna(%L, null, null, null, 5, ''{}'', true, null)', o)] loop
    if pg_temp.mc_corre(sin_veh, q) ->> 'error' is distinct from '42501' then raise exception 'CA1: authenticated ejecutó %', q; end if;
  end loop;
  foreach fn in array array['public.logistica_cadena(uuid,integer,jsonb)', 'public.logistica_cadena_columna(uuid,uuid,timestamptz,uuid,integer,jsonb)',
    'public._logistica_alcance(uuid)', 'public._logistica_dias(uuid)', 'public._logistica_filtros(jsonb)',
    'public._logistica_columna(uuid,uuid,timestamptz,uuid,integer,jsonb,boolean,integer)'] loop
    if has_function_privilege('anon', fn, 'execute') then raise exception 'CA1: anon ejecuta %', fn; end if;
  end loop;
end $$;
rollback;

-- @test cadena: «propios» ve lo suyo y lo de su cartera; nunca otro origen ni la papelera (CA2)
begin;
do $$
declare
  a uuid := pg_temp.mc_flujo(); o uuid := pg_temp.mc_origen_de(a); f uuid := pg_temp.mc_fase(a, 'mc uno', 10);
  b uuid := pg_temp.mc_flujo(); ob uuid := pg_temp.mc_origen_de(b); fb uuid := pg_temp.mc_fase(b, 'mc otro', 10);
  duena uuid := pg_temp.mc_persona(array['logistica.ver', 'vehiculos.ver']);
  prop uuid := pg_temp.mc_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o], 'propios');
  mixta uuid := pg_temp.mc_persona(array['logistica.ver@' || o]);
  otra uuid := pg_temp.mc_persona(array['vehiculos.ver']);
  v_lead uuid; v_mia uuid; v_ajena uuid; v_cartera uuid; v_mixta uuid; v_sf uuid; todas uuid[];
begin
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select ur.rol_id, 'vehiculos.ver', o, 'propios' from public.usuarios_roles ur where ur.usuario_id = mixta and ur.es_principal;
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('MC lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), prop) returning id into v_lead;
  v_mia := pg_temp.mc_vehiculo(o, f, prop);
  v_ajena := pg_temp.mc_vehiculo(o, f, otra);
  v_cartera := pg_temp.mc_vehiculo(o, f, otra);
  update public.vehiculos set lead_id = v_lead where id = v_cartera;
  v_mixta := pg_temp.mc_vehiculo(o, f, mixta);
  v_sf := pg_temp.mc_vehiculo(o, null, otra);
  -- Lo que nunca sale: otro origen (en fase y sin fase) y la papelera (en fase y sin fase).
  perform pg_temp.mc_vehiculo(ob, fb, prop);
  perform pg_temp.mc_vehiculo(ob, null, prop);
  v_mia := pg_temp.mc_vehiculo(o, f, prop);
  update public.vehiculos set eliminado_en = now() where id = v_mia;
  v_mia := pg_temp.mc_vehiculo(o, null, prop);
  update public.vehiculos set eliminado_en = now() where id = v_mia;
  v_mia := (select id from public.vehiculos where origen_id = o and creado_por = prop and eliminado_en is null);
  if pg_temp.mc_corre(prop, format('select to_jsonb(public.en_cartera(%L))', v_lead)) <> 'true' then
    raise exception 'la prueba necesita el lead en la cartera de quien lo creó';
  end if;

  perform pg_temp.mc_mismos('CA2 propios, cadena', pg_temp.mc_ids(pg_temp.mc_cadena(prop, o)), array[v_mia, v_cartera]);
  perform pg_temp.mc_mismos('CA2 propios, columna', pg_temp.mc_ids(pg_temp.mc_columna(prop, o, f)), array[v_mia, v_cartera]);
  perform pg_temp.mc_mismos('CA2 propios, «Sin fase»', pg_temp.mc_ids(pg_temp.mc_columna(prop, o, null)), '{}');
  perform pg_temp.mc_mismos('CA2 logistica todos y vehiculos propios, cadena', pg_temp.mc_ids(pg_temp.mc_cadena(mixta, o)), array[v_mixta]);
  perform pg_temp.mc_mismos('CA2 logistica todos y vehiculos propios, columna', pg_temp.mc_ids(pg_temp.mc_columna(mixta, o, f)), array[v_mixta]);
  todas := array[v_mia, v_ajena, v_cartera, v_mixta];
  perform pg_temp.mc_mismos('CA2 dueña, cadena', pg_temp.mc_ids(pg_temp.mc_cadena(duena, o)), todas || v_sf);
  perform pg_temp.mc_mismos('CA2 dueña, columna', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f)), todas);
  perform pg_temp.mc_mismos('CA2 dueña, «Sin fase»', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, null)), array[v_sf]);
end $$;
rollback;

-- @test cadena: el cursor no repite ni salta, con empates y en «Sin fase»; el tope se acota a 100 (CA3)
begin;
do $$
declare
  a uuid := pg_temp.mc_flujo(); o uuid := pg_temp.mc_origen_de(a); f uuid := pg_temp.mc_fase(a, 'mc uno', 10); g uuid := pg_temp.mc_fase(a, 'mc dos', 20);
  duena uuid := pg_temp.mc_persona(array['logistica.ver', 'vehiculos.ver']);
  t0 timestamptz := now() - interval '9 days'; leidos uuid[]; esperado uuid[]; r jsonb; v_desde text; v_id uuid; n int; vuelta int; fase uuid;
begin
  perform pg_temp.mc_vehiculo(o, f, null, t0 + make_interval(days => k)) from generate_series(1, 3) k;
  perform pg_temp.mc_vehiculo(o, f, null, t0) from generate_series(1, 3);
  perform pg_temp.mc_vehiculo(o, null) from generate_series(1, 5);
  foreach fase in array array[f, null] loop
    leidos := '{}'; v_desde := null; v_id := null; vuelta := 0;
    loop
      vuelta := vuelta + 1;
      r := pg_temp.mc_columna(duena, o, fase, v_desde, v_id, 2);
      n := jsonb_array_length(r -> 'tarjetas');
      if r ? 'error' or n > 2 or vuelta > 10 then raise exception 'CA3: página % dio %', vuelta, r; end if;
      leidos := leidos || pg_temp.mc_ids(r);
      exit when not (r ->> 'hay_mas')::boolean;
      v_desde := r -> 'tarjetas' -> (n - 1) ->> 'fase_desde';
      v_id := (r -> 'tarjetas' -> (n - 1) ->> 'id')::uuid;
    end loop;
    esperado := array(select id from public.vehiculos where origen_id = o and fase_id is not distinct from fase order by fase_desde, id);
    if leidos is distinct from esperado then raise exception 'CA3 (fase %): leyó % y debía %', coalesce(fase::text, 'sin fase'), leidos, esperado; end if;
  end loop;
  perform pg_temp.mc_vehiculo(o, g) from generate_series(1, 101);
  r := pg_temp.mc_columna(duena, o, g, null, null, 1000);
  if jsonb_array_length(r -> 'tarjetas') <> 100 or (r ->> 'hay_mas')::boolean is distinct from true then
    raise exception 'CA3: con 101 y tope 1000 debía traer 100 y hay_mas, y trajo % (hay_mas %)', jsonb_array_length(r -> 'tarjetas'), r ->> 'hay_mas';
  end if;
end $$;
rollback;

-- @test cadena: «Sin fase» primera, activas de logística por orden, jubiladas con unidades al final; demorada con la regla (CA4)
begin;
do $$
declare
  a uuid := pg_temp.mc_flujo(); o uuid := pg_temp.mc_origen_de(a);
  f1 uuid := pg_temp.mc_fase(a, 'mc uno', 10); f2 uuid := pg_temp.mc_fase(a, 'mc dos', 20); f3 uuid := pg_temp.mc_fase(a, 'mc no logística', 15, false);
  f4 uuid := pg_temp.mc_fase(a, 'mc jubilada', 5); f5 uuid := pg_temp.mc_fase(a, 'mc jubilada vacía', 6);
  duena uuid := pg_temp.mc_persona(array['logistica.ver', 'vehiculos.ver']);
  v uuid; r jsonb;
begin
  update public.fases set demora_dias = 2 where id = f1;
  v := pg_temp.mc_vehiculo(o, f1, null, now() - interval '3 days');
  perform pg_temp.mc_vehiculo(o, f3);
  perform pg_temp.mc_vehiculo(o, f4);
  update public.fases set activa = false where id in (f4, f5);
  perform pg_temp.mc_regla(a, true);
  r := pg_temp.mc_cadena(duena, o);
  if jsonb_path_query_array(r, '$.columnas[*].fase_id') is distinct from jsonb_build_array(f1, f2, f4) then
    raise exception 'CA4: sin unidades sin fase, las columnas debían ser [uno, dos, jubilada] y dieron %', jsonb_path_query_array(r, '$.columnas[*].fase_id');
  end if;
  if jsonb_path_query_first(r, '$.columnas[0].tarjetas[0].demorada') is distinct from 'true'::jsonb
     or jsonb_path_query_first(r, '$.columnas[0].demora_dias') is distinct from '2'::jsonb then
    raise exception 'CA4: con alerta_demora debía estar demorada (2 días) y dio %', r -> 'columnas' -> 0;
  end if;
  perform pg_temp.mc_vehiculo(o, null);
  perform pg_temp.mc_regla(a, false);
  r := pg_temp.mc_cadena(duena, o);
  if jsonb_path_query_array(r, '$.columnas[*].fase_id') is distinct from jsonb_build_array(null, f1, f2, f4) then
    raise exception 'CA4: con una sin fase debía ir primera y dio %', jsonb_path_query_array(r, '$.columnas[*].fase_id');
  end if;
  if jsonb_path_query_first(r, '$.columnas[1].tarjetas[0].demorada') is distinct from 'false'::jsonb
     or jsonb_path_query_first(r, '$.columnas[1].demora_dias') is distinct from 'null'::jsonb then
    raise exception 'CA4: con la regla apagada no debía estar demorada y dio %', r -> 'columnas' -> 1;
  end if;
end $$;
rollback;

-- @test cadena: los filtros dejan la tarjeta esperada; filtro, fase o cursor malos dan 22023 con su hint (CA5)
begin;
do $$
declare
  a uuid := pg_temp.mc_flujo(); o uuid := pg_temp.mc_origen_de(a); f uuid := pg_temp.mc_fase(a, 'mc uno', 10);
  fb uuid := pg_temp.mc_fase(pg_temp.mc_flujo(), 'mc otro', 10);
  duena uuid := pg_temp.mc_persona(array['logistica.ver', 'vehiculos.ver']);
  v_dem uuid; v_apr uuid; v_tr uuid; v_q uuid; td uuid; nav uuid;
begin
  update public.fases set demora_dias = 2 where id = f;
  perform pg_temp.mc_regla(a, true);
  v_dem := pg_temp.mc_vehiculo(o, f, null, now() - interval '3 days');
  v_apr := pg_temp.mc_vehiculo(o, f);
  v_tr := pg_temp.mc_vehiculo(o, f);
  v_q := pg_temp.mc_vehiculo(o, f, null, null, 'Toyota Hilux zeta');
  insert into public.tipos_documento (nombre) values ('mc factura ' || substr(gen_random_uuid()::text, 1, 6)) returning id into td;
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (v_apr, td);   -- nace «subido»
  insert into public.navieras (nombre) values ('mc naviera') returning id into nav;
  insert into public.transportes (vehiculo_id, naviera_id, contenedor, booking) values (v_tr, nav, 'ABCU1234567', 'BK778899');
  perform pg_temp.mc_mismos('CA5 demoradas', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f, p_filtros => '{"demoradas": true}')), array[v_dem]);
  perform pg_temp.mc_mismos('CA5 por aprobar', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f, p_filtros => '{"por_aprobar": true}')), array[v_apr]);
  perform pg_temp.mc_mismos('CA5 contenedor', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f, p_filtros => '{"contenedor": " abcu1234567 "}')), array[v_tr]);
  perform pg_temp.mc_mismos('CA5 naviera', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f, p_filtros => jsonb_build_object('naviera', nav))), array[v_tr]);
  perform pg_temp.mc_mismos('CA5 q por título', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f, p_filtros => '{"q": "hilux"}')), array[v_q]);
  perform pg_temp.mc_mismos('CA5 q por prefijo de booking', pg_temp.mc_ids(pg_temp.mc_cadena(duena, o, '{"q": "bk778"}')), array[v_tr]);
  perform pg_temp.mc_mismos('CA5 q corto se ignora', pg_temp.mc_ids(pg_temp.mc_columna(duena, o, f, p_filtros => '{"q": "hi"}')),
    array[v_dem, v_apr, v_tr, v_q]);
  perform pg_temp.mc_es('CA5 clave desconocida', pg_temp.mc_cadena(duena, o, '{"x": 1}'), '22023', 'filtros');
  perform pg_temp.mc_es('CA5 naviera que no es uuid', pg_temp.mc_columna(duena, o, f, p_filtros => '{"naviera": "x"}'), '22023', 'filtros');
  perform pg_temp.mc_es('CA5 fase de otro origen', pg_temp.mc_columna(duena, o, fb), '22023', 'p_fase');
  perform pg_temp.mc_es('CA5 cursor sin p_desde', pg_temp.mc_columna(duena, o, f, null, v_q), '22023', 'cursor');
end $$;
rollback;
