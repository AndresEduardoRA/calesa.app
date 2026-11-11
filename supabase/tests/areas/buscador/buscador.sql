-- El buscador, la base (paso 7.12-1): `buscador_leads()`, `buscador_vehiculos()` y `buscador_cotizaciones()`.
-- No depende de otro archivo (`SOLO=areas/buscador/buscador.sql`). Cada bloque arma su terreno, abre su transacción y la revierte.
-- Las visitas (`visita_registrar()` y `visitados`) están en `visitados.sql`; la forma (sin montos, privilegios), en `forma.sql`, en esta carpeta.
--
-- Qué asegura (como Ana, asesora con «propios»; Beto, lo mismo; Dora, «todos» en todo):
--   B1. Leads: no sale el lead ajeno ni el de la papelera; sí el compartido; por `#n`, el suyo primero y nunca el de Beto.
--   B2. Un teléfono entero o parcial no encuentra ningún lead; el valor de un campo privado tampoco.
--   B3. Vehículos: el suyo por título, VIN parcial y lote; no el de Beto sin cartera, ni el de un origen sin permiso, ni el de la papelera.
--   B4. Cotizaciones: la suya por título y por número; no la de Beto sin cartera (ni por número), sí la de un lead de su cartera; no la de un origen sin
--       permiso ni la de la papelera. La visibilidad de la RPC es igual a la de la tabla para las tres personas, y con un título que comparten más de
--       1.000 cotizaciones ajenas Ana encuentra la suya.
--   B6. Con 2 letras, «a b», espacios o «#», nada en las tres; sin sesión, nada.
--   B7. El tope: con 25 coincidencias, p_tamano 5 da 6 y 1000 da 21.

create temp sequence bu_telefono;

-- Una persona activa con un rol propio: cada concesión es {clave, alcance, origen} (sin alcance = «todos»; sin origen, en todos).
create or replace function pg_temp.bu_persona(p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('bu_' || substr(v_id::text, 1, 8), 'BU ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Hace de esa persona (authenticated); con nula, sin sesión.
create or replace function pg_temp.bu_soy(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', case when p_quien is null then '' else json_build_object('sub', p_quien, 'role', 'authenticated')::text end, true);
end $f$;

-- Lo que devuelve cada sección como esa persona: los ids, en su orden.
create or replace function pg_temp.bu_leads(p_quien uuid, p_texto text, p_tamano int default 5) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.bu_soy(p_quien);
  set local role authenticated;
  v := public.buscador_leads(p_texto, p_tamano);
  reset role;
  return v;
exception when others then reset role; raise;
end $f$;

create or replace function pg_temp.bu_vehiculos(p_quien uuid, p_texto text, p_tamano int default 5) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.bu_soy(p_quien);
  set local role authenticated;
  v := coalesce(array(select b.id from public.buscador_vehiculos(p_texto, p_tamano) b), '{}');
  reset role;
  return v;
exception when others then reset role; raise;
end $f$;

create or replace function pg_temp.bu_cotizaciones(p_quien uuid, p_texto text, p_tamano int default 5) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.bu_soy(p_quien);
  set local role authenticated;
  v := coalesce(array(select b.id from public.buscador_cotizaciones(p_texto, p_tamano) b), '{}');
  reset role;
  return v;
exception when others then reset role; raise;
end $f$;

-- Las cotizaciones que esa persona lee de la tabla (la RLS) con ese patrón, ordenadas por id.
create or replace function pg_temp.bu_tabla_cotizaciones(p_quien uuid, p_patron text) returns uuid[] language plpgsql as $f$
declare v uuid[];
begin
  perform pg_temp.bu_soy(p_quien);
  set local role authenticated;
  v := coalesce(array(select c.id from public.cotizaciones c where c.titulo ilike p_patron order by c.id), '{}');
  reset role;
  return v;
exception when others then reset role; raise;
end $f$;

create or replace function pg_temp.bu_orden(p uuid[]) returns uuid[] language sql immutable as $f$ select coalesce(array(select x from unnest(p) x order by x), '{}') $f$;

-- Un lead como postgres (el trigger lo pone en la cartera de quien lo crea).
create or replace function pg_temp.bu_lead(p_nombre text, p_creador uuid, p_atributos jsonb default '{}', p_telefono text default null) returns uuid language plpgsql as $f$
declare l uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values (p_nombre, coalesce(p_telefono, '7318' || lpad(nextval('pg_temp.bu_telefono')::text, 4, '0')), p_creador, (select id from public.origenes_lead where clave = 'web'), p_atributos)
  returning id into l;
  return l;
end $f$;

create or replace function pg_temp.bu_vehiculo(p_origen uuid, p_titulo text, p_creador uuid, p_vin text default null, p_lote text default null) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca, vin, lote, creado_por) values (p_origen, p_titulo, 'toyota', p_vin, p_lote, p_creador) returning id into v;
  return v;
end $f$;

create or replace function pg_temp.bu_cot(p_origen uuid, p_titulo text, p_creador uuid, p_lead uuid default null) returns uuid language plpgsql as $f$
declare c uuid;
begin
  insert into public.cotizaciones (origen_id, lead_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, titulo)
  values (p_origen, p_lead, p_creador, (select f.id from public.formulas f where f.origen_id = p_origen and f.estado = 'publicada' limit 1), '{}', '{}', '{}', '{}', 10, p_titulo)
  returning id into c;
  return c;
end $f$;

-- El terreno: dos orígenes con su fórmula, las tres personas y lo de cada sección.
create or replace function pg_temp.bu_terreno() returns jsonb language plpgsql as $f$
declare o1 uuid; o2 uuid; ana uuid; beto uuid; dora uuid; t jsonb; v_compartido uuid; v_ajeno uuid;
begin
  insert into public.origenes (clave, nombre) values ('bu_' || substr(gen_random_uuid()::text, 1, 8), 'BU origen 1 ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o1;
  insert into public.origenes (clave, nombre) values ('bu_' || substr(gen_random_uuid()::text, 1, 8), 'BU origen 2 ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o2;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select o, 1, 'publicada', '{"nodos": []}', '{}', '{}', '{}' from unnest(array[o1, o2]) o;
  -- Con `SOLO=` la primera cuenta es la dueña (no corrió `humo.sql`): una de relleno va antes, para que ninguna de las tres lo sea.
  insert into auth.users (id, email, raw_app_meta_data) select x, x || '@ejemplo.com', '{"invitado": true}' from gen_random_uuid() x;
  ana := pg_temp.bu_persona(jsonb_build_array(
    jsonb_build_object('clave', 'leads.ver', 'alcance', 'propios'),
    jsonb_build_object('clave', 'vehiculos.ver', 'alcance', 'propios', 'origen', o1),
    jsonb_build_object('clave', 'cotizaciones.ver', 'alcance', 'propios', 'origen', o1)));
  beto := pg_temp.bu_persona(jsonb_build_array(
    jsonb_build_object('clave', 'leads.ver', 'alcance', 'propios'),
    jsonb_build_object('clave', 'vehiculos.ver', 'alcance', 'propios', 'origen', o1),
    jsonb_build_object('clave', 'cotizaciones.ver', 'alcance', 'propios', 'origen', o1)));
  dora := pg_temp.bu_persona(jsonb_build_array(
    jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'vehiculos.ver'), jsonb_build_object('clave', 'cotizaciones.ver')));
  t := jsonb_build_object('o1', o1, 'o2', o2, 'ana', ana, 'beto', beto, 'dora', dora);
  -- Leads. El de Ana lleva un teléfono y un privado que nadie tiene que poder encontrar.
  t := t || jsonb_build_object(
    'l_ana', pg_temp.bu_lead('Rosqa Zafra', ana, '{"direccion": "Calle Zafiroqx"}', '59170019345'),
    'l_ajeno', pg_temp.bu_lead('Rosqa Ajena', beto),
    'l_papelera', pg_temp.bu_lead('Rosqa Papelera', beto),
    'l_compartido', pg_temp.bu_lead('Rosqa Compartida', beto));
  update public.leads set eliminado_en = now() where id = (t ->> 'l_papelera')::uuid;
  v_compartido := (t ->> 'l_compartido')::uuid;
  v_ajeno := (t ->> 'l_ajeno')::uuid;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values (v_compartido, ana, 'compartido', beto);
  -- Vehículos.
  t := t || jsonb_build_object(
    'v_ana', pg_temp.bu_vehiculo(o1, 'Vehqz Corolla', ana, 'JTDKZ12345678', 'LQZ-998'),
    'v_beto', pg_temp.bu_vehiculo(o1, 'Vehqz Beto', beto),
    'v_o2', pg_temp.bu_vehiculo(o2, 'Vehqz Otro origen', ana),
    'v_papelera', pg_temp.bu_vehiculo(o1, 'Vehqz Papelera', ana));
  update public.vehiculos set eliminado_en = now() where id = (t ->> 'v_papelera')::uuid;
  -- Cotizaciones.
  t := t || jsonb_build_object(
    'c_ana', pg_temp.bu_cot(o1, 'Cotqz Ana', ana),
    'c_ajena', pg_temp.bu_cot(o1, 'Cotqz Beto ajena', beto, v_ajeno),
    'c_cartera', pg_temp.bu_cot(o1, 'Cotqz Beto cartera', beto, v_compartido),
    'c_o2', pg_temp.bu_cot(o2, 'Cotqz Otro origen', ana),
    'c_papelera', pg_temp.bu_cot(o1, 'Cotqz Papelera', ana));
  update public.cotizaciones set eliminado_en = now() where id = (t ->> 'c_papelera')::uuid;
  return t;
end $f$;

-- @test buscador: B1 leads como Ana: el suyo y el compartido, nunca el ajeno ni el de la papelera; por #n, el suyo primero y nunca el de Beto
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); ana uuid := (t ->> 'ana')::uuid; v uuid[]; n_ana int; n_beto int;
begin
  v := pg_temp.bu_leads(ana, 'Rosqa', 20);
  if pg_temp.bu_orden(v) is distinct from pg_temp.bu_orden(array[(t ->> 'l_ana')::uuid, (t ->> 'l_compartido')::uuid]) then
    raise exception 'B1: «Rosqa» como Ana no trae sólo el suyo y el compartido: %', v;
  end if;
  select numero_propio into n_ana from public.leads where id = (t ->> 'l_ana')::uuid;
  select numero_propio into n_beto from public.leads where id = (t ->> 'l_ajeno')::uuid;
  v := pg_temp.bu_leads(ana, '#' || n_ana);
  if v[1] is distinct from (t ->> 'l_ana')::uuid then raise exception 'B1: #% como Ana no trae su lead primero: %', n_ana, v; end if;
  v := pg_temp.bu_leads(ana, '#' || n_beto);
  if (t ->> 'l_ajeno')::uuid = any (v) then raise exception 'B1: #% como Ana trae el lead ajeno de Beto', n_beto; end if;
  v := pg_temp.bu_leads(ana, n_beto::text);
  if (t ->> 'l_ajeno')::uuid = any (v) then raise exception 'B1: % (sin #) como Ana trae el lead ajeno de Beto', n_beto; end if;
end $$;
rollback;

-- @test buscador: B2 ni el teléfono entero o parcial ni el valor de un campo privado encuentran un lead, como Ana (su cartera) ni como Dora
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); p uuid; q text; v uuid[]; v_nuestros uuid[];
begin
  v_nuestros := array[(t ->> 'l_ana')::uuid, (t ->> 'l_ajeno')::uuid, (t ->> 'l_papelera')::uuid, (t ->> 'l_compartido')::uuid];
  foreach p in array array[(t ->> 'ana')::uuid, (t ->> 'dora')::uuid] loop
    foreach q in array array['70019345', '+59170019345', '+591 7001 9345', '7001', '019345', 'Zafiroqx', 'Calle Zafiroqx'] loop
      v := pg_temp.bu_leads(p, q, 20);
      if v && v_nuestros then raise exception 'B2: «%» encuentra un lead del terreno (%): %', q, p, v; end if;
      if p = (t ->> 'ana')::uuid and cardinality(v) > 0 then raise exception 'B2: «%» como Ana encuentra leads: %', q, v; end if;
    end loop;
  end loop;
end $$;
rollback;

-- @test buscador: B3 vehículos como Ana: el suyo por título, VIN parcial y lote; no el de Beto, el de otro origen ni el de la papelera
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); ana uuid := (t ->> 'ana')::uuid; q text; v uuid[];
begin
  foreach q in array array['Vehqz', 'corolla', 'kz1234', 'lqz-998'] loop
    v := pg_temp.bu_vehiculos(ana, q, 20);
    if v is distinct from array[(t ->> 'v_ana')::uuid] then raise exception 'B3: «%» como Ana no trae sólo su vehículo: %', q, v; end if;
  end loop;
  -- Dora ve los vivos de los dos orígenes, nunca el de la papelera.
  v := pg_temp.bu_vehiculos((t ->> 'dora')::uuid, 'Vehqz', 20);
  if pg_temp.bu_orden(v) is distinct from pg_temp.bu_orden(array[(t ->> 'v_ana')::uuid, (t ->> 'v_beto')::uuid, (t ->> 'v_o2')::uuid]) then
    raise exception 'B3: «Vehqz» como Dora no trae los tres vivos: %', v;
  end if;
  -- #n no busca vehículos.
  if cardinality(pg_temp.bu_vehiculos((t ->> 'dora')::uuid, '#998', 20)) > 0 then raise exception 'B3: #998 busca vehículos'; end if;
end $$;
rollback;

-- @test buscador: B4 cotizaciones como Ana, por título y por número; la visibilidad de la RPC es la de la tabla para Ana, Beto y Dora
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); ana uuid := (t ->> 'ana')::uuid; p uuid; v uuid[]; n bigint;
begin
  v := pg_temp.bu_cotizaciones(ana, 'Cotqz', 20);
  if pg_temp.bu_orden(v) is distinct from pg_temp.bu_orden(array[(t ->> 'c_ana')::uuid, (t ->> 'c_cartera')::uuid]) then
    raise exception 'B4: «Cotqz» como Ana no trae la suya y la de su cartera: %', v;
  end if;
  select numero into n from public.cotizaciones where id = (t ->> 'c_ana')::uuid;
  if pg_temp.bu_cotizaciones(ana, '#' || n) is distinct from array[(t ->> 'c_ana')::uuid] then raise exception 'B4: #% como Ana no trae la suya', n; end if;
  select numero into n from public.cotizaciones where id = (t ->> 'c_ajena')::uuid;
  if cardinality(pg_temp.bu_cotizaciones(ana, '#' || n)) > 0 then raise exception 'B4: #% como Ana trae la ajena de Beto', n; end if;
  select numero into n from public.cotizaciones where id = (t ->> 'c_papelera')::uuid;
  if cardinality(pg_temp.bu_cotizaciones(ana, '#' || n)) > 0 then raise exception 'B4: #% como Ana trae la de la papelera', n; end if;
  select numero into n from public.cotizaciones where id = (t ->> 'c_o2')::uuid;
  if cardinality(pg_temp.bu_cotizaciones(ana, '#' || n)) > 0 then raise exception 'B4: #% como Ana trae la de otro origen', n; end if;
  -- Igual a la tabla: ni de más (un definer suelto) ni de menos (sin la rama de la cartera).
  foreach p in array array[ana, (t ->> 'beto')::uuid, (t ->> 'dora')::uuid] loop
    if pg_temp.bu_orden(pg_temp.bu_cotizaciones(p, 'Cotqz', 20)) is distinct from pg_temp.bu_tabla_cotizaciones(p, '%Cotqz%') then
      raise exception 'B4: para % la RPC (%) no ve lo mismo que la tabla (%)', p, pg_temp.bu_cotizaciones(p, 'Cotqz', 20), pg_temp.bu_tabla_cotizaciones(p, '%Cotqz%');
    end if;
  end loop;
  if cardinality(pg_temp.bu_tabla_cotizaciones((t ->> 'dora')::uuid, '%Cotqz%')) <> 4 then raise exception 'B4: el terreno no es el esperado (Dora ve 4 vivas)'; end if;
end $$;
rollback;

-- @test buscador: B4 con un título que comparten más de 1.000 cotizaciones ajenas o de otro origen, encuentra la que le corresponde
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); c uuid;
begin
  perform pg_temp.bu_cot((t ->> 'o1')::uuid, 'Comunqz ' || g, (t ->> 'dora')::uuid) from generate_series(1, 1100) g;
  c := pg_temp.bu_cot((t ->> 'o1')::uuid, 'Comunqz de Ana', (t ->> 'ana')::uuid);
  if not c = any (pg_temp.bu_cotizaciones((t ->> 'ana')::uuid, 'Comunqz', 5)) then raise exception 'B4: Ana no encuentra la suya entre más de 1.000 ajenas'; end if;
  -- Quien ve «todos» en un solo origen encuentra la de ese origen aunque más de 1.000 de otro compartan el título.
  perform pg_temp.bu_cot((t ->> 'o2')::uuid, 'Origqz ' || g, (t ->> 'dora')::uuid) from generate_series(1, 1100) g;
  c := pg_temp.bu_cot((t ->> 'o1')::uuid, 'Origqz de o1', (t ->> 'dora')::uuid);
  if pg_temp.bu_cotizaciones(pg_temp.bu_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', t ->> 'o1'))), 'Origqz', 5) is distinct from array[c] then
    raise exception 'B4: con «todos» sólo en o1 no encuentra la de o1 entre más de 1.000 de o2';
  end if;
end $$;
rollback;

-- @test buscador: B6 con menos que el mínimo, nada en las tres; sin sesión, nada
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); dora uuid := (t ->> 'dora')::uuid; q text;
begin
  foreach q in array array['Ro', 'a b', '  ', '#', '', 'Ve', 'Co'] loop
    if cardinality(pg_temp.bu_leads(dora, q, 20)) > 0 then raise exception 'B6: «%» busca leads', q; end if;
    if cardinality(pg_temp.bu_vehiculos(dora, q, 20)) > 0 then raise exception 'B6: «%» busca vehículos', q; end if;
    if cardinality(pg_temp.bu_cotizaciones(dora, q, 20)) > 0 then raise exception 'B6: «%» busca cotizaciones', q; end if;
  end loop;
  if cardinality(pg_temp.bu_leads(dora, null, 20)) > 0 then raise exception 'B6: un texto nulo busca leads'; end if;
  if cardinality(pg_temp.bu_leads(dora, 'Rosqa', 20)) = 0 or cardinality(pg_temp.bu_vehiculos(dora, 'Vehqz', 20)) = 0 or cardinality(pg_temp.bu_cotizaciones(dora, 'Cotqz', 20)) = 0 then
    raise exception 'B6: con el mínimo, Dora no encuentra nada';
  end if;
  if cardinality(pg_temp.bu_leads(null, 'Rosqa', 20)) > 0 or cardinality(pg_temp.bu_vehiculos(null, 'Vehqz', 20)) > 0 or cardinality(pg_temp.bu_cotizaciones(null, 'Cotqz', 20)) > 0 then
    raise exception 'B6: sin sesión encuentra algo';
  end if;
end $$;
rollback;

-- @test buscador: B7 con 25 coincidencias, p_tamano 5 devuelve 6 y 1000 devuelve 21, en las tres
begin;
do $$
declare t jsonb := pg_temp.bu_terreno(); ana uuid := (t ->> 'ana')::uuid; o1 uuid := (t ->> 'o1')::uuid;
begin
  perform pg_temp.bu_lead('Topeqz ' || g, ana) from generate_series(1, 25) g;
  perform pg_temp.bu_vehiculo(o1, 'Topeqz ' || g, ana) from generate_series(1, 25) g;
  perform pg_temp.bu_cot(o1, 'Topeqz ' || g, ana) from generate_series(1, 25) g;
  if cardinality(pg_temp.bu_leads(ana, 'Topeqz', 5)) <> 6 or cardinality(pg_temp.bu_leads(ana, 'Topeqz', 1000)) <> 21 then
    raise exception 'B7: leads: % y %', cardinality(pg_temp.bu_leads(ana, 'Topeqz', 5)), cardinality(pg_temp.bu_leads(ana, 'Topeqz', 1000));
  end if;
  if cardinality(pg_temp.bu_vehiculos(ana, 'Topeqz', 5)) <> 6 or cardinality(pg_temp.bu_vehiculos(ana, 'Topeqz', 1000)) <> 21 then
    raise exception 'B7: vehículos: % y %', cardinality(pg_temp.bu_vehiculos(ana, 'Topeqz', 5)), cardinality(pg_temp.bu_vehiculos(ana, 'Topeqz', 1000));
  end if;
  if cardinality(pg_temp.bu_cotizaciones(ana, 'Topeqz', 5)) <> 6 or cardinality(pg_temp.bu_cotizaciones(ana, 'Topeqz', 1000)) <> 21 then
    raise exception 'B7: cotizaciones: % y %', cardinality(pg_temp.bu_cotizaciones(ana, 'Topeqz', 5)), cardinality(pg_temp.bu_cotizaciones(ana, 'Topeqz', 1000));
  end if;
end $$;
rollback;
