-- «Dónde está» (paso 6.02-3): `logistica_donde_esta`. No depende de otro archivo (`SOLO=areas/mover/donde-esta.sql`). Cada bloque abre su transacción y
-- la revierte. El plan por sus índices, con volumen: `supabase/tests/medir-escala.sql` › «Dónde está».
--
-- Qué asegura:
--   DE1. El alcance: sólo orígenes cuya logística veo y con la regla `logistica` activa; el menor de `logistica.ver` y `vehiculos.ver` (sin
--        `vehiculos.ver` del origen no ve; `logistica.ver` todos con `vehiculos.ver` propios ve sólo la suya); «propios» ve la suya y la de su cartera;
--        nunca la papelera; sin permisos, vacío sin error; `anon` no ejecuta.
--   DE2. El texto y el tope: por título, VIN y lote sin mayúsculas; corto o nulo, vacío; de más de 100, 22023 hint `p_buscar`; hasta 10 con
--        `hay_mas`; el VIN exacto primero; las claves de cada unidad.

create or replace function pg_temp.md_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-md@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`, todas con el mismo alcance.
create or replace function pg_temp.md_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.md_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('md_' || substr(v_id::text, 1, 8), 'md ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.md_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('md_' || s, 'md origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.md_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.md_fase(p_flujo uuid, p_nombre text, p_orden int, p_logistica boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_logistica) values (p_flujo, p_nombre, p_orden, p_logistica) returning id;
$f$;

create or replace function pg_temp.md_vehiculo(p_origen uuid, p_fase uuid, p_creado_por uuid default null, p_desde timestamptz default null,
                                               p_titulo text default 'md vehículo') returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por) values (p_origen, p_titulo, p_fase, p_desde, p_creado_por) returning id;
$f$;

create or replace function pg_temp.md_regla(p_flujo uuid, p_regla text, p_activa boolean) returns void language sql as $f$
  insert into public.flujos_reglas (flujo_id, regla, activa) values (p_flujo, p_regla, p_activa)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.md_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.md_es(p_que text, p_r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;


-- Un lead en la cartera de quien lo crea.
create or replace function pg_temp.md_lead(p_de uuid) returns uuid language sql as $f$
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('md lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_de) returning id;
$f$;

create or replace function pg_temp.md_donde(p_quien uuid, p_buscar text, p_tope int default 10) returns jsonb language sql as $f$
  select pg_temp.md_corre(p_quien, format('select public.logistica_donde_esta(%L, %s)', p_buscar, p_tope));
$f$;

create or replace function pg_temp.md_ids(p jsonb) returns uuid[] language sql as $f$
  select coalesce(array_agg((x ->> 'id')::uuid), '{}') from jsonb_array_elements(coalesce(p -> 'unidades', '[]')) x;
$f$;

create or replace function pg_temp.md_mismos(p_que text, p_r jsonb, p_debia uuid[]) returns void language plpgsql as $f$
begin
  if p_r ? 'error' or (select coalesce(array_agg(x order by x), '{}') from unnest(pg_temp.md_ids(p_r)) x) is distinct from
                      (select coalesce(array_agg(x order by x), '{}') from unnest(p_debia) x) then
    raise exception '%: debía ver % y dio %', p_que, p_debia, p_r;
  end if;
end $f$;

-- @test dónde está: sólo orígenes con logistica.ver y vehiculos.ver y la regla logistica activa; propios, papelera, sin permisos y anon (DE1)
begin;
do $$
declare
  a uuid := pg_temp.md_flujo(); o uuid := pg_temp.md_origen_de(a); f uuid := pg_temp.md_fase(a, 'md uno', 10);
  b uuid := pg_temp.md_flujo(); ob uuid := pg_temp.md_origen_de(b); fb uuid := pg_temp.md_fase(b, 'md otro', 10);
  c uuid := pg_temp.md_flujo(); oc uuid := pg_temp.md_origen_de(c);
  duena uuid := pg_temp.md_persona(array['logistica.ver', 'vehiculos.ver']);
  solo_a uuid := pg_temp.md_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o]);
  log_b uuid := pg_temp.md_persona(array['logistica.ver@' || o, 'vehiculos.ver@' || o, 'logistica.ver@' || ob]);
  prop uuid := pg_temp.md_persona(array['vehiculos.ver@' || o]);
  mixta uuid := pg_temp.md_persona(array['logistica.ver@' || o]);
  nadie uuid := pg_temp.md_persona(array['vehiculos.ver']);
  otra uuid := pg_temp.md_persona(array['vehiculos.ver']);
  v_ajena uuid; v_mia uuid; v_cartera uuid; v_mixta uuid; v_b uuid; v_c uuid; v_pap uuid; todas_a uuid[];
begin
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select ur.rol_id, 'logistica.ver', o, 'propios' from public.usuarios_roles ur where ur.usuario_id = prop and ur.es_principal;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select ur.rol_id, 'vehiculos.ver', o, 'propios' from public.usuarios_roles ur where ur.usuario_id = mixta and ur.es_principal;
  v_ajena := pg_temp.md_vehiculo(o, f, otra, null, 'mdzeta ajena');
  v_mia := pg_temp.md_vehiculo(o, f, prop, null, 'mdzeta mía');
  v_cartera := pg_temp.md_vehiculo(o, null, otra, null, 'mdzeta cartera');
  update public.vehiculos set lead_id = pg_temp.md_lead(prop) where id = v_cartera;
  v_mixta := pg_temp.md_vehiculo(o, f, mixta, null, 'mdzeta mixta');
  v_b := pg_temp.md_vehiculo(ob, fb, prop, null, 'mdzeta de B');
  v_c := pg_temp.md_vehiculo(oc, null, prop, null, 'mdzeta de C');
  v_pap := pg_temp.md_vehiculo(o, f, prop, null, 'mdzeta papelera');
  update public.vehiculos set eliminado_en = now() where id = v_pap;
  todas_a := array[v_ajena, v_mia, v_cartera, v_mixta];

  perform pg_temp.md_mismos('DE1 dueña ve los dos orígenes (la regla viene activa)', pg_temp.md_donde(duena, 'mdzeta'), todas_a || v_b || v_c);
  perform pg_temp.md_mismos('DE1 sólo A', pg_temp.md_donde(solo_a, 'mdzeta'), todas_a);
  perform pg_temp.md_mismos('DE1 logistica.ver de B sin vehiculos.ver de B', pg_temp.md_donde(log_b, 'mdzeta'), todas_a);
  perform pg_temp.md_mismos('DE1 logistica todos y vehiculos propios', pg_temp.md_donde(mixta, 'mdzeta'), array[v_mixta]);
  perform pg_temp.md_mismos('DE1 propios: la suya y la de su cartera', pg_temp.md_donde(prop, 'mdzeta'), array[v_mia, v_cartera]);
  perform pg_temp.md_mismos('DE1 sin logistica.ver de nada', pg_temp.md_donde(nadie, 'mdzeta'), '{}');
  -- La regla se apaga en C, que no tiene fases de logística (con ellas, el trigger de `flujos_reglas` no la deja apagar).
  update public.flujos_reglas set activa = false where flujo_id = c and regla = 'logistica';
  if not found then raise exception 'DE1: la regla logistica debía venir activa en el flujo del origen nuevo'; end if;
  perform pg_temp.md_mismos('DE1 dueña, con la regla logistica apagada en C', pg_temp.md_donde(duena, 'mdzeta'), todas_a || v_b);
  if has_function_privilege('anon', 'public.logistica_donde_esta(text,integer)', 'execute') then
    raise exception 'DE1: anon ejecuta logistica_donde_esta';
  end if;
end $$;
rollback;

-- @test dónde está: título, VIN y lote sin mayúsculas; corto, nulo y largo; tope de 10 con hay_mas; el VIN exacto primero; las claves (DE2)
begin;
do $$
declare
  a uuid := pg_temp.md_flujo(); o uuid := pg_temp.md_origen_de(a); f uuid := pg_temp.md_fase(a, 'md uno', 10);
  duena uuid := pg_temp.md_persona(array['logistica.ver', 'vehiculos.ver']);
  v_tit uuid; v_vin uuid; v_lote uuid; v_viejo uuid; r jsonb;
begin
  v_tit := pg_temp.md_vehiculo(o, f, null, null, 'Toyota Mdqhilux');
  v_vin := pg_temp.md_vehiculo(o, f);
  update public.vehiculos set vin = 'MDV2345678ABCDE' where id = v_vin;
  v_lote := pg_temp.md_vehiculo(o, null);
  update public.vehiculos set lote = 'MDLOTE7788' where id = v_lote;
  perform pg_temp.md_mismos('DE2 por título', pg_temp.md_donde(duena, 'MDQHILUX'), array[v_tit]);
  perform pg_temp.md_mismos('DE2 por VIN', pg_temp.md_donde(duena, 'mdv2345678'), array[v_vin]);
  perform pg_temp.md_mismos('DE2 por lote', pg_temp.md_donde(duena, ' mdlote77 '), array[v_lote]);
  perform pg_temp.md_mismos('DE2 corto', pg_temp.md_donde(duena, 'md'), '{}');
  perform pg_temp.md_mismos('DE2 nulo', pg_temp.md_donde(duena, null), '{}');
  perform pg_temp.md_es('DE2 de 101 caracteres', pg_temp.md_donde(duena, repeat('m', 101)), '22023', 'p_buscar');

  perform pg_temp.md_vehiculo(o, f, null, null, 'mddoce ' || k) from generate_series(1, 12) k;
  r := pg_temp.md_donde(duena, 'mddoce', 1000);
  if r ? 'error' or jsonb_array_length(r -> 'unidades') <> 10 or r -> 'hay_mas' is distinct from 'true'::jsonb then
    raise exception 'DE2: con 12 y tope 1000 debía traer 10 y hay_mas, y dio %', r;
  end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r -> 'unidades' -> 0) k) is distinct from
     array['eta_el', 'fase_color', 'fase_desde', 'fase_id', 'fase_nombre', 'id', 'lote', 'origen_id', 'titulo', 'vin'] then
    raise exception 'DE2: las claves de una unidad no son las esperadas: %', r -> 'unidades' -> 0;
  end if;

  v_viejo := pg_temp.md_vehiculo(o, f);
  update public.vehiculos set vin = 'MDXACT12345678', creado_en = now() - interval '1 day' where id = v_viejo;
  perform pg_temp.md_vehiculo(o, f, null, null, 'lleva MDXACT12345678 en el título ' || k) from generate_series(1, 3) k;
  r := pg_temp.md_donde(duena, 'mdxact12345678');
  if jsonb_array_length(r -> 'unidades') <> 4 or r -> 'unidades' -> 0 ->> 'id' is distinct from v_viejo::text then
    raise exception 'DE2: el VIN exacto (%) debía salir primero aunque sea el más viejo y dio %', v_viejo, r;
  end if;
end $$;
rollback;
