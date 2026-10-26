-- Quién ve qué vehículo: la policy `vehiculos: leer` y `puede_vehiculo()` deciden fila a fila desde el paso 4.11 (`…20261019008800`), y nadie ve más ni
-- menos que antes. La prueba lo demuestra contra una COPIA de la definición vieja (la policy de `…20261013000100` y la función de `…20261011000200`), no contra
-- un comentario: por cada persona, la policy nueva, la vieja, `puede_vehiculo()` nueva y la vieja dan los mismos vehículos, y esos son los esperados.
-- Corre al final de `db:probar` (la dueña es `…0001`, la crea `humo.sql`; sus `pg_temp` no llegan a los archivos de antes). Cada bloque abre su transacción y
-- la revierte. Los teléfonos son fijos (`7211xxxx`, que nadie más usa) y se comprueba que estén libres: nunca `random()` (4-22).

-- La sesión de esa persona (como `cv_como` de `cotizaciones-visibilidad.sql`).
create or replace function pg_temp.vv_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', case when p_quien is null then '{"role": "authenticated"}' else json_build_object('sub', p_quien, 'role', 'authenticated')::text end, true);
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos), alcance}.
create or replace function pg_temp.vv_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('vv_' || substr(p_id::text, 30, 7), 'VV ' || substr(p_id::text, 30, 7)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
end $f$;

-- La función de antes, copiada tal cual (`…20261011000200:35-43`): `alcance_de` hasta dos veces y el arreglo de toda la cartera. Sólo para comparar.
create or replace function pg_temp.puede_vehiculo_vieja(p_vehiculo uuid, p_clave text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vehiculos v
    where v.id = p_vehiculo and v.eliminado_en is null
      and (public.alcance_de(p_clave, v.origen_id) = 'todos'
        or (public.alcance_de(p_clave, v.origen_id) = 'propios' and (v.creado_por = (select auth.uid()) or v.lead_id in (select public.mis_leads()))))
  );
$$;
-- Como la de verdad: `authenticated` sí, `anon` y PUBLIC no (una función de `pg_temp` la ejecuta cualquiera si no se le quita).
revoke all on function pg_temp.puede_vehiculo_vieja(uuid, text) from public;
grant execute on function pg_temp.puede_vehiculo_vieja(uuid, text) to authenticated;

-- La policy de antes, copiada tal cual (`…20261013000100:29-38`).
create or replace function pg_temp.vv_policy_vieja() returns text language sql as $f$
  select $p$eliminado_en is null
  and (
    origen_id = any ((select public.origenes_con_alcance('vehiculos.ver', 'todos'))::uuid[])
    or (
      origen_id = any ((select public.origenes_con_alcance('vehiculos.ver', 'propios'))::uuid[])
      and (creado_por = (select auth.uid()) or lead_id in (select public.mis_leads()))
    )
  )$p$
$f$;

-- @test vehículos: la policy de lectura y puede_vehiculo() dan lo mismo que la definición vieja, por persona, y siguen a un lead transferido y revocado
begin;
create temp table vv_v (nombre text primary key, id uuid not null);
grant select on vv_v to authenticated;

-- Lo que la policy le entrega a esa persona de los vehículos de la prueba. Con `p_vieja`, la policy de antes puesta en su lugar mientras dura la lectura
-- (como postgres, fuera del rol; el `alter policy` es de la transacción y se deshace con ella). La lectura va por `execute`: un plan guardado no vería el cambio.
create or replace function pg_temp.vv_lee(p_quien uuid, p_vieja boolean) returns text[] language plpgsql as $f$
declare v text[]; v_actual text;
begin
  if p_vieja then
    select qual into v_actual from pg_policies where schemaname = 'public' and tablename = 'vehiculos' and policyname = 'vehiculos: leer';
    execute format('alter policy "vehiculos: leer" on public.vehiculos using (%s)', pg_temp.vv_policy_vieja());
  end if;
  perform pg_temp.vv_como(p_quien);
  set local role authenticated;
  execute 'select coalesce(array_agg(x.nombre order by x.nombre), ''{}'') from public.vehiculos v join vv_v x on x.id = v.id' into v;
  reset role;
  if p_vieja then
    execute format('alter policy "vehiculos: leer" on public.vehiculos using (%s)', v_actual);
  end if;
  return v;
exception when others then
  reset role;
  raise;
end $f$;

-- Los que `puede_vehiculo()` (o la copia vieja) le deja con esa clave.
create or replace function pg_temp.vv_puede(p_quien uuid, p_clave text, p_vieja boolean) returns text[] language plpgsql as $f$
declare v text[];
begin
  perform pg_temp.vv_como(p_quien);
  set local role authenticated;
  if p_vieja then
    select coalesce(array_agg(x.nombre order by x.nombre), '{}') into v from vv_v x where pg_temp.puede_vehiculo_vieja(x.id, p_clave);
  else
    select coalesce(array_agg(x.nombre order by x.nombre), '{}') into v from vv_v x where public.puede_vehiculo(x.id, p_clave);
  end if;
  reset role;
  return v;
exception when others then
  reset role;
  raise;
end $f$;

-- Cada persona: la policy nueva y la vieja, y las dos funciones con ver, editar y eliminar. Con ver, las cuatro y lo esperado; con editar y eliminar, las dos
-- funciones entre sí (y lo esperado de editar, si se pasa).
create or replace function pg_temp.vv_verificar(p_quien uuid, p_nombre text, p_ve text[], p_edita text[] default null) returns void language plpgsql as $f$
declare
  v_esperado text[] := (select coalesce(array_agg(n order by n), '{}') from unnest(p_ve) n);
  v_nueva text[] := pg_temp.vv_lee(p_quien, false); v_vieja text[] := pg_temp.vv_lee(p_quien, true);
  v_clave text; v_fn text[]; v_fn_vieja text[];
begin
  if v_nueva is distinct from v_vieja then
    raise exception 'la policy nueva le entrega a % algo distinto de la vieja: nueva %, vieja %', p_nombre, v_nueva, v_vieja;
  end if;
  if v_nueva is distinct from v_esperado then
    raise exception '% debía ver % y ve %', p_nombre, v_esperado, v_nueva;
  end if;
  foreach v_clave in array array['vehiculos.ver', 'vehiculos.editar', 'vehiculos.eliminar'] loop
    v_fn := pg_temp.vv_puede(p_quien, v_clave, false);
    v_fn_vieja := pg_temp.vv_puede(p_quien, v_clave, true);
    if v_fn is distinct from v_fn_vieja then
      raise exception 'puede_vehiculo(…, %) le deja a % algo distinto de la vieja: nueva %, vieja %', v_clave, p_nombre, v_fn, v_fn_vieja;
    end if;
    if v_clave = 'vehiculos.ver' and v_fn is distinct from v_nueva then
      raise exception 'puede_vehiculo(…, vehiculos.ver) le deja ver a % algo distinto de la policy: función %, policy %', p_nombre, v_fn, v_nueva;
    end if;
    if v_clave = 'vehiculos.editar' and p_edita is not null and v_fn is distinct from (select coalesce(array_agg(n order by n), '{}') from unnest(p_edita) n) then
      raise exception '% debía editar % y edita %', p_nombre, p_edita, v_fn;
    end if;
  end loop;
end $f$;

do $$
declare
  d constant uuid := '00000000-0000-0000-0000-000000000001';  -- la dueña
  t constant uuid := '00000000-0000-0000-0000-000000000e51';  -- ve «todos» sólo en A; edita «propios» ahí
  p constant uuid := '00000000-0000-0000-0000-000000000e52';  -- ve y edita «propios» en todos; elimina «propios» sólo en A; transfiere sus leads
  q constant uuid := '00000000-0000-0000-0000-000000000e53';  -- ve «propios»; dueño de los leads ajenos; quita accesos
  s constant uuid := '00000000-0000-0000-0000-000000000e54';  -- sin `vehiculos.ver`
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  o_a uuid; o_b uuid; o_i uuid; l_p uuid; l_comp uuid; l_ajeno uuid; l_pap uuid; l_limbo uuid; l_trans uuid; o uuid; k text; v_sufijo text;
begin
  if exists (select 1 from public.leads where telefono_principal like '7211%' and eliminado_en is null) then
    raise exception 'ya hay leads vivos con 7211…: los teléfonos de esta prueba chocarían';
  end if;
  insert into public.origenes (clave, nombre) values ('vv_a', 'VV A') returning id into o_a;
  insert into public.origenes (clave, nombre) values ('vv_b', 'VV B') returning id into o_b;
  insert into public.origenes (clave, nombre) values ('vv_i', 'VV inactivo') returning id into o_i;
  perform pg_temp.vv_persona(t, jsonb_build_array(
    jsonb_build_object('clave', 'vehiculos.ver', 'origen', o_a), jsonb_build_object('clave', 'vehiculos.editar', 'origen', o_a, 'alcance', 'propios')));
  perform pg_temp.vv_persona(p, jsonb_build_array(
    jsonb_build_object('clave', 'vehiculos.ver', 'alcance', 'propios'), jsonb_build_object('clave', 'vehiculos.editar', 'alcance', 'propios'),
    jsonb_build_object('clave', 'vehiculos.eliminar', 'origen', o_a, 'alcance', 'propios'),
    jsonb_build_object('clave', 'leads.ver', 'alcance', 'propios'), jsonb_build_object('clave', 'leads.transferir', 'alcance', 'propios')));
  perform pg_temp.vv_persona(q, jsonb_build_array(
    jsonb_build_object('clave', 'vehiculos.ver', 'alcance', 'propios'),
    jsonb_build_object('clave', 'leads.ver', 'alcance', 'propios'), jsonb_build_object('clave', 'leads.compartir', 'alcance', 'propios')));
  perform pg_temp.vv_persona(s, jsonb_build_array(jsonb_build_object('clave', 'leads.ver', 'alcance', 'propios')));
  -- Los leads (el trigger le da la cartera a quien lo crea): de P; de Q, con P compartida; de Q solo; de P en la papelera (sigue en su cartera, como para
  -- `mis_leads()`); de Q en el limbo (nadie vigente); y uno de P que se transfiere en la segunda mitad.
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('VV lead de P', '72110001', p, v_web, '{}'), ('VV lead compartido', '72110002', q, v_web, '{}'), ('VV lead ajeno', '72110003', q, v_web, '{}'),
    ('VV lead en la papelera', '72110004', p, v_web, '{}'), ('VV lead en el limbo', '72110005', q, v_web, '{}'), ('VV lead que se transfiere', '72110006', p, v_web, '{}');
  select id into l_p from public.leads where nombre = 'VV lead de P';
  select id into l_comp from public.leads where nombre = 'VV lead compartido';
  select id into l_ajeno from public.leads where nombre = 'VV lead ajeno';
  select id into l_pap from public.leads where nombre = 'VV lead en la papelera';
  select id into l_limbo from public.leads where nombre = 'VV lead en el limbo';
  select id into l_trans from public.leads where nombre = 'VV lead que se transfiere';
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values (l_comp, p, 'compartido', q);
  update public.leads_asesores set revocado_en = now(), revocado_por = q where lead_id = l_limbo;
  update public.leads set eliminado_en = now() where id = l_pap;
  -- Los vehículos: cada clase en A, en B y en I (que se desactiva después: el trigger no deja crear en un origen inactivo), y en la papelera de A.
  -- «mío» lo creó P; los demás, la dueña.
  foreach o in array array[o_a, o_b, o_i] loop
    v_sufijo := case o when o_a then 'A' when o_b then 'B' else 'I' end;
    insert into public.vehiculos (origen_id, titulo, creado_por, lead_id) values
      (o, 'mío·' || v_sufijo, p, null), (o, 'cartera·' || v_sufijo, d, l_p), (o, 'compartido·' || v_sufijo, d, l_comp),
      (o, 'ajeno·' || v_sufijo, d, l_ajeno), (o, 'sin lead·' || v_sufijo, d, null);
  end loop;
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id, eliminado_en) values
    (o_a, 'mío·A·papelera', p, null, now()), (o_a, 'cartera·A·papelera', d, l_p, now()), (o_a, 'compartido·A·papelera', d, l_comp, now()),
    (o_a, 'ajeno·A·papelera', d, l_ajeno, now()), (o_a, 'sin lead·A·papelera', d, null, now());
  insert into public.vehiculos (origen_id, titulo, creado_por, lead_id) values
    (o_a, 'lead en la papelera·A', d, l_pap), (o_a, 'limbo·A', d, l_limbo), (o_a, 'transferido·A', d, l_trans);
  update public.origenes set activo = false where id = o_i;
  insert into vv_v select titulo, id from public.vehiculos where origen_id in (o_a, o_b, o_i);
  if (select count(*) from vv_v) <> 23 then raise exception 'la prueba esperaba 23 vehículos y hay %', (select count(*) from vv_v); end if;
end $$;

do $$
declare
  d constant uuid := '00000000-0000-0000-0000-000000000001'; t constant uuid := '00000000-0000-0000-0000-000000000e51';
  p constant uuid := '00000000-0000-0000-0000-000000000e52'; q constant uuid := '00000000-0000-0000-0000-000000000e53';
  s constant uuid := '00000000-0000-0000-0000-000000000e54';
  v_vivos constant text[] := array['mío·A', 'cartera·A', 'compartido·A', 'ajeno·A', 'sin lead·A', 'mío·B', 'cartera·B', 'compartido·B', 'ajeno·B', 'sin lead·B',
    'mío·I', 'cartera·I', 'compartido·I', 'ajeno·I', 'sin lead·I', 'lead en la papelera·A', 'limbo·A', 'transferido·A'];
  v_de_p constant text[] := array['mío·A', 'cartera·A', 'compartido·A', 'mío·B', 'cartera·B', 'compartido·B', 'mío·I', 'cartera·I', 'compartido·I', 'lead en la papelera·A'];
  l_trans uuid := (select id from public.leads where nombre = 'VV lead que se transfiere'); v_r jsonb;
begin
  -- La dueña ve todo lo vivo, también lo del origen inactivo; nunca la papelera.
  perform pg_temp.vv_verificar(d, 'la dueña', v_vivos, v_vivos);
  -- T: todo lo vivo de A y nada de B ni de I. Edita «propios» en A: no creó nada ni tiene cartera, no edita nada (ver «todos» no es editar «todos»).
  perform pg_temp.vv_verificar(t, 'T (todos sólo en A)', array['mío·A', 'cartera·A', 'compartido·A', 'ajeno·A', 'sin lead·A', 'lead en la papelera·A', 'limbo·A', 'transferido·A'], '{}');
  -- P: lo que creó, lo de su cartera (dueña, compartida, también el lead en la papelera) y el lead que todavía es suyo, en A, B e I. Ni lo ajeno, ni lo
  -- sin lead que no creó, ni el limbo.
  perform pg_temp.vv_verificar(p, 'P (propios)', v_de_p || array['transferido·A'], v_de_p || array['transferido·A']);
  -- Q: lo de sus leads (el compartido con P y el ajeno), en los tres orígenes.
  perform pg_temp.vv_verificar(q, 'Q (propios, dueño de los leads ajenos)', array['compartido·A', 'ajeno·A', 'compartido·B', 'ajeno·B', 'compartido·I', 'ajeno·I']);
  perform pg_temp.vv_verificar(s, 'S (sin vehiculos.ver)', '{}', '{}');
  perform pg_temp.vv_verificar(null, 'N (sin sesión)', '{}', '{}');

  -- P transfiere su lead a Q y queda como compartida: los dos lo ven (como en cotizaciones).
  perform pg_temp.vv_como(p);
  set local role authenticated;
  v_r := public.lead_transferir(l_trans, q, p);
  reset role;
  perform pg_temp.vv_verificar(p, 'P (que queda como compartida)', v_de_p || array['transferido·A'], v_de_p || array['transferido·A']);
  perform pg_temp.vv_verificar(q, 'Q (dueño de lo transferido)', array['compartido·A', 'ajeno·A', 'compartido·B', 'ajeno·B', 'compartido·I', 'ajeno·I', 'transferido·A']);
  -- Q le quita el acceso a P: P deja de verlo; lo que creó y su cartera siguen.
  perform pg_temp.vv_como(q);
  set local role authenticated;
  v_r := public.lead_revocar_acceso(l_trans, p);
  reset role;
  perform pg_temp.vv_verificar(p, 'P (sin acceso al lead transferido)', v_de_p, v_de_p);
  perform pg_temp.vv_verificar(q, 'Q (sigue siendo el dueño)', array['compartido·A', 'ajeno·A', 'compartido·B', 'ajeno·B', 'compartido·I', 'ajeno·I', 'transferido·A']);
  perform pg_temp.vv_verificar(d, 'la dueña, al final', v_vivos, v_vivos);
end $$;

-- anon: ni la tabla ni ninguna de las dos funciones (el mismo 42501 con la nueva y con la vieja).
do $$
declare v_id uuid := (select id from vv_v where nombre = 'mío·A'); v_estado text;
begin
  set local role anon;
  begin
    perform count(*) from public.vehiculos;
    v_estado := 'ok';
  exception when others then v_estado := sqlstate;
  end;
  if v_estado <> '42501' then raise exception 'anon leyendo vehiculos debía dar 42501 y dio %', v_estado; end if;
  begin
    perform public.puede_vehiculo(v_id, 'vehiculos.ver');
    v_estado := 'ok';
  exception when others then v_estado := sqlstate;
  end;
  if v_estado <> '42501' then raise exception 'anon con puede_vehiculo() debía dar 42501 y dio %', v_estado; end if;
  begin
    perform pg_temp.puede_vehiculo_vieja(v_id, 'vehiculos.ver');
    v_estado := 'ok';
  exception when others then v_estado := sqlstate;
  end;
  if v_estado <> '42501' then raise exception 'anon con la copia vieja debía dar 42501 y dio %', v_estado; end if;
  reset role;
end $$;

-- puede_vehiculo() contesta falso (nunca nulo) a lo que no existe, a lo que está en la papelera, a quien no puede y a una clave que no tiene.
do $$
declare
  p constant uuid := '00000000-0000-0000-0000-000000000e52'; s constant uuid := '00000000-0000-0000-0000-000000000e54';
  v_mio uuid := (select id from vv_v where nombre = 'mío·A'); v_papelera uuid := (select id from vv_v where nombre = 'mío·A·papelera');
begin
  perform pg_temp.vv_como(s);
  set local role authenticated;
  if public.puede_vehiculo(gen_random_uuid(), 'vehiculos.ver') is distinct from false then raise exception 'uno que no existe no da falso'; end if;
  if public.puede_vehiculo(v_mio, 'vehiculos.ver') is distinct from false then raise exception 'quien no tiene vehiculos.ver no da falso'; end if;
  reset role;
  perform pg_temp.vv_como(p);
  set local role authenticated;
  if public.puede_vehiculo(v_mio, 'vehiculos.ver') is distinct from true then raise exception 'quien lo creó no puede verlo'; end if;
  if public.puede_vehiculo(v_papelera, 'vehiculos.ver') is distinct from false then raise exception 'uno en la papelera no da falso'; end if;
  if public.puede_vehiculo(v_mio, 'vehiculos.vitrina') is distinct from false then raise exception 'una clave que no tiene no da falso'; end if;
  if public.puede_vehiculo(v_mio, null) is distinct from false then raise exception 'una clave nula no da falso'; end if;
  reset role;
end $$;
rollback;

-- @test vehículos: la policy y puede_vehiculo() preguntan por fila (sin el arreglo de la cartera), y la función mira el alcance una sola vez
-- Lo que la matriz no ve: quitar el `lead_id is not null` o evaluar el alcance dos veces no cambia quién ve qué, sólo cuánto cuesta (la medición lo cuenta;
-- esto lo fija).
do $$
declare v_qual text; v_src text;
begin
  select coalesce(qual, '') into v_qual from pg_policies where schemaname = 'public' and tablename = 'vehiculos' and policyname = 'vehiculos: leer';
  if v_qual is null then raise exception 'falta la policy «vehiculos: leer»'; end if;
  if v_qual ~ 'mis_leads' then raise exception '«vehiculos: leer» arma el arreglo de toda la cartera (mis_leads)'; end if;
  if v_qual !~ 'en_cartera' or v_qual !~ 'origenes_con_alcance' then raise exception '«vehiculos: leer» no pregunta por fila con en_cartera y los orígenes con alcance: %', v_qual; end if;
  if v_qual !~* 'lead_id IS NOT NULL' then raise exception '«vehiculos: leer» llama a en_cartera también sin lead (falta lead_id is not null): %', v_qual; end if;
  if v_qual ~ 'alcance_de' then raise exception '«vehiculos: leer» llama a alcance_de por fila'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'vehiculos' and policyname = 'vehiculos: fuera de la papelera'
                  and permissive = 'RESTRICTIVE' and cmd = 'ALL' and qual ~* 'eliminado_en IS NULL') then
    raise exception 'falta la policy restrictiva que esconde la papelera';
  end if;
  select prosrc into v_src from pg_proc where proname = 'puede_vehiculo' and pronamespace = 'public'::regnamespace;
  if v_src ~ 'mis_leads' then raise exception 'puede_vehiculo() arma el arreglo de toda la cartera'; end if;
  if v_src !~ 'en_cartera' then raise exception 'puede_vehiculo() no usa en_cartera'; end if;
  if (select count(*) from regexp_matches(v_src, 'alcance_de\(', 'g')) <> 1 then raise exception 'puede_vehiculo() nombra alcance_de más de una vez'; end if;
  -- El alcance es el argumento de un `case` simple (se evalúa una vez); comparado en dos ramas, o en un lateral que Postgres aplana, corre dos veces.
  if v_src !~* 'case\s+public\.alcance_de\(' then raise exception 'puede_vehiculo() no evalúa el alcance como el argumento de un case: alcance_de correría dos veces'; end if;
end $$;
