-- La bandeja de logística en Inicio (paso 6.12-1): `logistica_bandeja(p_tope)`. No depende de otro archivo (`SOLO=areas/alertas/bandeja.sql`): cada
-- bloque abre su transacción y la revierte. Las personas de cada bloque sólo tienen permisos en los orígenes del bloque (la semilla no les llega).
--
-- Qué asegura:
--   B1. Quien no ve el origen (sin logistica.ver o sin vehiculos.ver de ese origen, aunque los tenga de otro) recibe las tres listas vacías con
--       demoradas, trabados y por aprobar sembrados allí; quien sí lo ve, los recibe.
--   B2. Demoradas: la más pasada de su límite primero; p_tope 1 da una con hay_mas; p_tope 999 corta en 20; no salen la papelera ni una fase que no
--       alerta; propios ve sólo lo suyo. La fila trae sus claves exactas.
--   B3. Por aprobar: con logistica.documentos.aprobar del origen sale el subido y no el aprobado; sin la clave, vacía aunque vea el origen; con la clave
--       en propios, sólo el de su unidad.
--   B4. Trabados: una demorada con un requisito bloqueante incumplido para su fase siguiente (la activa de menor orden) sale con el motivo del primero por
--       orden; con el requisito no bloqueante o sin transición de salida, no.
--   B5. anon no ejecuta logistica_bandeja; authenticated sí, y no sus ayudantes.

create or replace function pg_temp.ab_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-ab@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave`, `clave@origen` y opcionalmente `#propios` (si no, `todos`).
create or replace function pg_temp.ab_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text; k text;
begin
  perform pg_temp.ab_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ab_' || substr(v_id::text, 1, 8), 'ab ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    k := split_part(c, '#', 1);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(k, '@', 1), nullif(split_part(k, '@', 2), '')::uuid, coalesce(nullif(split_part(c, '#', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.ab_flujo() returns uuid language plpgsql as $f$
declare o uuid; a uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('ab_' || s, 'ab origen ' || s, 'manual') returning id into o;
  a := (select id from public.flujos where origen_id = o);
  insert into public.flujos_reglas (flujo_id, regla, activa) values (a, 'alerta_demora', true)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
  return a;
end $f$;

create or replace function pg_temp.ab_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.ab_fase(p_flujo uuid, p_orden int, p_demora int default 3) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_logistica, demora_dias) values (p_flujo, 'ab fase ' || p_orden, p_orden, true, p_demora) returning id;
$f$;

create or replace function pg_temp.ab_vehiculo(p_origen uuid, p_fase uuid, p_dias numeric default 5, p_creado_por uuid default null,
                                               p_titulo text default 'ab vehículo') returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por)
  values (p_origen, p_titulo, p_fase, now() - make_interval(secs => p_dias * 86400), p_creado_por) returning id;
$f$;

create or replace function pg_temp.ab_tipo() returns uuid language sql as $f$
  insert into public.tipos_documento (nombre) values ('AB tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id;
$f$;

create or replace function pg_temp.ab_documento(p_vehiculo uuid, p_tipo uuid, p_estado text default 'subido') returns uuid language plpgsql as $f$
declare d uuid;
begin
  -- Nadie nace aprobado (documento_sellos): se inserta subido y se revisa.
  insert into public.documentos (vehiculo_id, tipo_documento_id) values (p_vehiculo, p_tipo) returning id into d;
  if p_estado <> 'subido' then update public.documentos set estado = p_estado::public.estado_documento where id = d; end if;
  return d;
end $f$;

-- La bandeja como `p_quien` (authenticated).
create or replace function pg_temp.ab_bandeja(p_quien uuid, p_tope int default 5) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  v := public.logistica_bandeja(p_tope);
  reset role;
  return v;
end $f$;

-- Los ids de una lista, en su orden.
create or replace function pg_temp.ab_ids(p jsonb, p_lista text) returns uuid[] language sql as $f$
  select coalesce(array_agg((e ->> 'id')::uuid order by i), '{}') from jsonb_array_elements(p -> p_lista -> 'filas') with ordinality x(e, i);
$f$;

create or replace function pg_temp.ab_igual(p_que text, p_dio anyelement, p_debia anyelement) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_debia then raise exception '%: debía ser % y fue %', p_que, p_debia, p_dio; end if;
end $f$;

-- @test bandeja: quien no ve el origen recibe las tres listas vacías; quien lo ve, las recibe (B1)
begin;
do $$
declare
  a uuid := pg_temp.ab_flujo(); o uuid := pg_temp.ab_origen_de(a); otro uuid := pg_temp.ab_origen_de(pg_temp.ab_flujo());
  f1 uuid := pg_temp.ab_fase(a, 10); f2 uuid := pg_temp.ab_fase(a, 20); t uuid := pg_temp.ab_tipo();
  sin_log uuid := pg_temp.ab_persona(array['logistica.ver@' || otro, 'vehiculos.ver@' || o, 'logistica.documentos.aprobar@' || o]);
  sin_veh uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || otro, 'logistica.documentos.aprobar@' || o]);
  ve uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'logistica.documentos.aprobar@' || o]);
  v uuid := pg_temp.ab_vehiculo(o, f1); d uuid; r jsonb; q uuid;
begin
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (a, f1, f2);
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante) values (f2, 'documento', t, true);
  d := pg_temp.ab_documento(v, t);
  foreach q in array array[sin_log, sin_veh] loop
    r := pg_temp.ab_bandeja(q);
    if r <> '{"demoradas": {"filas": [], "hay_mas": false}, "trabados": {"filas": [], "hay_mas": false}, "por_aprobar": {"filas": [], "hay_mas": false}}'::jsonb then
      raise exception 'B1: quien no ve el origen recibió %', r;
    end if;
  end loop;
  r := pg_temp.ab_bandeja(ve);
  perform pg_temp.ab_igual('B1 demoradas de quien ve', pg_temp.ab_ids(r, 'demoradas'), array[v]);
  perform pg_temp.ab_igual('B1 trabados de quien ve', pg_temp.ab_ids(r, 'trabados'), array[v]);
  perform pg_temp.ab_igual('B1 por aprobar de quien ve', pg_temp.ab_ids(r, 'por_aprobar'), array[d]);
end $$;
rollback;

-- @test bandeja: demoradas por lo pasado de su límite, con tope y hay_mas, sin papelera ni fase que no alerta; propios sólo lo suyo (B2)
begin;
do $$
declare
  a uuid := pg_temp.ab_flujo(); o uuid := pg_temp.ab_origen_de(a);
  f3 uuid := pg_temp.ab_fase(a, 10, 3); f10 uuid := pg_temp.ab_fase(a, 20, 10); f0 uuid := pg_temp.ab_fase(a, 30, 0);
  u uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o]);
  prop uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o || '#propios']);
  v_a uuid; v_b uuid; v_c uuid; v_papelera uuid; r jsonb;
begin
  v_a := pg_temp.ab_vehiculo(o, f3, 5, prop);     -- 2 días pasada
  v_b := pg_temp.ab_vehiculo(o, f10, 20);         -- 10 días pasada
  v_c := pg_temp.ab_vehiculo(o, f3, 4);           -- 1 día pasada
  perform pg_temp.ab_vehiculo(o, f3, 2);          -- dentro del límite
  perform pg_temp.ab_vehiculo(o, f0, 30);         -- fase que no alerta
  v_papelera := pg_temp.ab_vehiculo(o, f3, 30);
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  r := pg_temp.ab_bandeja(u);
  perform pg_temp.ab_igual('B2 orden', pg_temp.ab_ids(r, 'demoradas'), array[v_b, v_a, v_c]);
  perform pg_temp.ab_igual('B2 hay_mas', r -> 'demoradas' -> 'hay_mas', 'false'::jsonb);
  perform pg_temp.ab_igual('B2 claves de la fila', (select array_agg(k order by k) from jsonb_object_keys(r -> 'demoradas' -> 'filas' -> 0) k),
                           array['dias', 'fase', 'fase_desde', 'fase_id', 'id', 'origen_id', 'titulo']);
  perform pg_temp.ab_igual('B2 hojas de la fila', jsonb_build_array(r #> '{demoradas,filas,0,fase}', r #> '{demoradas,filas,0,dias}', r #> '{demoradas,filas,0,fase_id}'),
                           jsonb_build_array('ab fase 20', 10, f10));
  r := pg_temp.ab_bandeja(u, 1);
  perform pg_temp.ab_igual('B2 p_tope 1', pg_temp.ab_ids(r, 'demoradas'), array[v_b]);
  perform pg_temp.ab_igual('B2 p_tope 1, hay_mas', r -> 'demoradas' -> 'hay_mas', 'true'::jsonb);
  perform pg_temp.ab_igual('B2 propios', pg_temp.ab_ids(pg_temp.ab_bandeja(prop), 'demoradas'), array[v_a]);
  for i in 1 .. 20 loop perform pg_temp.ab_vehiculo(o, f3, 4 + i / 100.0); end loop;
  r := pg_temp.ab_bandeja(u, 999);
  perform pg_temp.ab_igual('B2 p_tope 999 corta en 20', jsonb_array_length(r -> 'demoradas' -> 'filas'), 20);
  perform pg_temp.ab_igual('B2 p_tope 999, hay_mas', r -> 'demoradas' -> 'hay_mas', 'true'::jsonb);
end $$;
rollback;

-- @test bandeja: por aprobar con la clave de aprobar del origen; sin ella, vacía; con ella en propios, sólo lo suyo (B3)
begin;
do $$
declare
  a uuid := pg_temp.ab_flujo(); o uuid := pg_temp.ab_origen_de(a); f uuid := pg_temp.ab_fase(a, 10, 0); t uuid := pg_temp.ab_tipo();
  apr uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'logistica.documentos.aprobar@' || o]);
  sin uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o]);
  prop uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'logistica.documentos.aprobar@' || o || '#propios']);
  v uuid := pg_temp.ab_vehiculo(o, f, 1); v_prop uuid := pg_temp.ab_vehiculo(o, f, 1, prop, 'ab propio');
  d uuid; d_prop uuid; r jsonb;
begin
  d := pg_temp.ab_documento(v, t);
  perform pg_temp.ab_documento(v, t, 'aprobado');
  d_prop := pg_temp.ab_documento(v_prop, t);
  update public.documentos set creado_en = now() - interval '1 hour' where id = d;  -- el más viejo primero
  r := pg_temp.ab_bandeja(apr);
  perform pg_temp.ab_igual('B3 con la clave', pg_temp.ab_ids(r, 'por_aprobar'), array[d, d_prop]);
  perform pg_temp.ab_igual('B3 claves de la fila', (select array_agg(k order by k) from jsonb_object_keys(r -> 'por_aprobar' -> 'filas' -> 0) k),
                           array['creado_en', 'id', 'tipo', 'titulo', 'vehiculo_id']);
  perform pg_temp.ab_igual('B3 vehículo de la fila', r #>> '{por_aprobar,filas,1,vehiculo_id}', v_prop::text);
  perform pg_temp.ab_igual('B3 sin la clave', pg_temp.ab_ids(pg_temp.ab_bandeja(sin), 'por_aprobar'), '{}'::uuid[]);
  perform pg_temp.ab_igual('B3 propios', pg_temp.ab_ids(pg_temp.ab_bandeja(prop), 'por_aprobar'), array[d_prop]);
end $$;
rollback;

-- @test bandeja: trabado = demorada con un requisito bloqueante incumplido para su fase siguiente (la de menor orden), con su motivo (B4)
begin;
do $$
declare
  a uuid := pg_temp.ab_flujo(); o uuid := pg_temp.ab_origen_de(a);
  f1 uuid := pg_temp.ab_fase(a, 10); f2 uuid := pg_temp.ab_fase(a, 20, 0); f3 uuid := pg_temp.ab_fase(a, 30, 0);
  g1 uuid := pg_temp.ab_fase(a, 40); g2 uuid := pg_temp.ab_fase(a, 50, 0); h1 uuid := pg_temp.ab_fase(a, 60);
  t_a uuid := pg_temp.ab_tipo(); t_b uuid := pg_temp.ab_tipo();
  u uuid := pg_temp.ab_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o]);
  v1 uuid; r jsonb;
begin
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) values (a, f1, f3), (a, f1, f2), (a, g1, g2);
  insert into public.fases_requisitos (fase_id, tipo, tipo_documento_id, bloqueante, orden) values
    (f2, 'documento', t_a, true, 2), (f2, 'documento', t_b, true, 1), (g2, 'documento', t_a, false, 1);
  v1 := pg_temp.ab_vehiculo(o, f1, 10);
  perform pg_temp.ab_vehiculo(o, g1, 9);  -- requisito no bloqueante
  perform pg_temp.ab_vehiculo(o, h1, 8);  -- sin transición de salida
  r := pg_temp.ab_bandeja(u);
  perform pg_temp.ab_igual('B4 demoradas (control)', cardinality(pg_temp.ab_ids(r, 'demoradas')), 3);
  perform pg_temp.ab_igual('B4 trabados', pg_temp.ab_ids(r, 'trabados'), array[v1]);
  perform pg_temp.ab_igual('B4 claves de la fila', (select array_agg(k order by k) from jsonb_object_keys(r -> 'trabados' -> 'filas' -> 0) k),
                           array['fase', 'fase_desde', 'fase_siguiente', 'id', 'motivo', 'titulo']);
  perform pg_temp.ab_igual('B4 motivo y fase siguiente', jsonb_build_array(r #> '{trabados,filas,0,motivo}', r #> '{trabados,filas,0,fase_siguiente}'),
                           jsonb_build_array('Documento: ' || (select nombre from public.tipos_documento where id = t_b), 'ab fase 20'));
  perform pg_temp.ab_igual('B4 hay_mas', r -> 'trabados' -> 'hay_mas', 'false'::jsonb);
end $$;
rollback;

-- @test bandeja: anon no ejecuta logistica_bandeja; authenticated sí, y no sus ayudantes (B5)
do $$
declare fn text;
begin
  if has_function_privilege('anon', 'public.logistica_bandeja(integer)', 'execute') then raise exception 'B5: anon ejecuta logistica_bandeja'; end if;
  if not has_function_privilege('authenticated', 'public.logistica_bandeja(integer)', 'execute') then raise exception 'B5: authenticated no ejecuta logistica_bandeja'; end if;
  foreach fn in array array['public._bandeja_demoradas(integer)', 'public._bandeja_trabados(jsonb, integer)', 'public._bandeja_por_aprobar(integer)'] loop
    if has_function_privilege('authenticated', fn, 'execute') or has_function_privilege('anon', fn, 'execute') then
      raise exception 'B5: % se puede ejecutar desde la app', fn;
    end if;
  end loop;
end $$;
