-- Publicar una tabla de referencia (4.23-1, C4–C11): el permiso antes que todo, la versión esperada, la nota, las filas contra sus columnas y lo que
-- deja (versión, nota, autor, filas y una respuesta sin contenido). La N+1 de las fórmulas, las compartidas y el dinero: `publicar-formulas.sql`.
-- docs/COTIZADOR.md › «Las tablas congeladas (D5)». Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con
-- `tp_preparar()` en su transacción y la revierte.

-- @test tablas: los ayudantes de publicar
reset role;
create or replace function pg_temp.tp_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con un rol propio y un nombre (nulo: sin nombre); cada concesión es {clave, origen}. Si corre sola, la primera cuenta nace dueña: se le
-- deja sólo su rol.
create or replace function pg_temp.tp_persona(p_id uuid, p_nombre text, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = coalesce(p_nombre, ''), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('tp_' || substr(p_id::text, 25, 12), 'TP ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- El terreno: el origen `prueba_tp` con su publicada v1 (…a001: la de la semilla que usa la comisión por variante, con esa tabla renombrada
-- `tp_comision` y congelada) y su tabla `tp_comision` (las mismas filas, versión 1). Las personas:
--   a (Ana Tp)    configura y cotiza `prueba_tp`     b (Beto Tp)  configura `prueba_tp`
--   n (sin nombre) configura `prueba_tp`              v            sólo ve `prueba_tp`, sin configurarlo
-- Devuelve la tabla.
create or replace function pg_temp.tp_preparar() returns uuid language plpgsql as $f$
declare s public.formulas; o uuid; t uuid; v_def jsonb; v_par jsonb; v_dis jsonb; c_conf jsonb;
begin
  select * into s from public.formulas f
   where f.estado = 'publicada' and f.diseno is not null and f.params -> 'tablas' ? 'comision_por_variante'
     and exists (select 1 from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tabla' = 'comision_por_variante')
   order by f.creado_en, f.id limit 1;
  if s.id is null then raise exception 'la semilla no trae una publicada que congele y use la comisión por variante'; end if;
  v_def := replace(s.definicion::text, '"comision_por_variante"', '"tp_comision"')::jsonb;
  v_par := replace(s.params::text, '"comision_por_variante"', '"tp_comision"')::jsonb;
  v_dis := replace(s.diseno::text, '"comision_por_variante"', '"tp_comision"')::jsonb;
  insert into public.origenes (clave, nombre) values ('prueba_tp', 'Prueba tp') returning id into o;
  c_conf := jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o);
  perform pg_temp.tp_persona('00000000-0000-4000-8000-00000000a00a', 'Ana Tp', jsonb_build_array(c_conf,
    jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o), jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  perform pg_temp.tp_persona('00000000-0000-4000-8000-00000000a00b', 'Beto Tp', jsonb_build_array(c_conf));
  perform pg_temp.tp_persona('00000000-0000-4000-8000-00000000a00c', null, jsonb_build_array(c_conf));
  perform pg_temp.tp_persona('00000000-0000-4000-8000-00000000a00d', 'Vera Tp', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  insert into public.formulas (id, origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  values ('00000000-0000-4000-8000-00000000a001', o, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, true), 'v1', now());
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  values (o, 'tp_comision', 'Comisión tp', '[{"clave":"variante","etiqueta":"Variante","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]')
  returning id into t;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select t, f.valor, (f.n - 1)::smallint from jsonb_array_elements(v_par -> 'tablas' -> 'tp_comision') with ordinality f (valor, n);
  return t;
end $f$;

create or replace function pg_temp.tp_tabla() returns uuid language sql as $f$
  select id from public.tablas_referencia where clave = 'tp_comision' and origen_id = (select id from public.origenes where clave = 'prueba_tp')
$f$;
-- Las filas vivas de la tabla de prueba con el monto de la moto cambiado.
create or replace function pg_temp.tp_filas(p_moto numeric) returns jsonb language sql as $f$
  select jsonb_agg(case when f.valores ->> 'variante' = 'moto' then f.valores || jsonb_build_object('monto', p_moto) else f.valores end
                   order by f.orden, f.id)
    from public.tablas_referencia_filas f where f.tabla_id = pg_temp.tp_tabla()
$f$;
-- Lo que la base guarda de la tabla y sus fórmulas, para comparar antes y después de un error.
create or replace function pg_temp.tp_foto() returns text language sql as $f$
  select jsonb_build_object(
    'tablas', (select jsonb_agg(to_jsonb(r) order by r.id) from public.tablas_referencia r where r.clave like 'tp_%'),
    'filas', (select jsonb_agg(to_jsonb(x) order by x.id) from public.tablas_referencia_filas x join public.tablas_referencia r on r.id = x.tabla_id where r.clave like 'tp_%'),
    'formulas', (select jsonb_agg(to_jsonb(f) order by f.id) from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave like 'prueba_tp%'))::text
$f$;

-- «sqlstate|mensaje|hint» de un SQL corrido como esa persona, o «sin error».
create or replace function pg_temp.tp_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_m text; v_h text;
begin
  perform pg_temp.tp_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
  return sqlstate || '|' || v_m || '|' || coalesce(v_h, '');
end $f$;

-- Publicar como esa persona y devolver la respuesta.
create or replace function pg_temp.tp_publicar(p_quien uuid, p_tabla uuid, p_filas jsonb, p_nota text, p_version int) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.tp_como(p_quien);
  set local role authenticated;
  r := public.tabla_referencia_publicar(p_tabla, p_filas, p_nota, p_version);
  reset role;
  return r;
end $f$;

create or replace function pg_temp.tp_sql(p_tabla uuid, p_filas jsonb, p_nota text, p_version int) returns text language sql as $f$
  select format('select public.tabla_referencia_publicar(%L, %L, %L, %L)', p_tabla, p_filas, p_nota, p_version)
$f$;

create or replace function pg_temp.tp_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

-- @test tablas: sin permiso, con una tabla que no existe o inactiva: el mismo 42501, antes de la esperada nula y del PT409, y nada cambia
begin;
select pg_temp.tp_preparar();
do $$
declare t uuid := pg_temp.tp_tabla(); v_antes text := pg_temp.tp_foto(); c_no constant text := '42501|No tienes el permiso «cotizaciones.configurar».|';
begin
  -- Sólo ve el origen: con la esperada buena, nula y vieja.
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00d', pg_temp.tp_sql(t, pg_temp.tp_filas(1), 'n', 1)), c_no);
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00d', pg_temp.tp_sql(t, pg_temp.tp_filas(1), 'n', null)), c_no);
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00d', pg_temp.tp_sql(t, pg_temp.tp_filas(1), 'n', 9)), c_no);
  -- Una tabla que no existe, para quien sí configura.
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00a', pg_temp.tp_sql(gen_random_uuid(), '[]', 'n', 1)), c_no);
  -- Una tabla de un origen que no configura (la de la semilla).
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00a',
    pg_temp.tp_sql((select id from public.tablas_referencia where origen_id is not null and clave <> 'tp_comision' order by id limit 1), '[]', 'n', 1)), c_no);
  perform pg_temp.tp_igual(pg_temp.tp_foto(), v_antes);
  -- Inactiva.
  update public.tablas_referencia set activa = false where id = t;
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00a', pg_temp.tp_sql(t, pg_temp.tp_filas(1), 'n', 1)), c_no);
end $$;
rollback;

-- @test tablas: con otra versión, PT409 que dice quién, cuál y cuándo (publicaste, con nombre, sin nombre, sin fecha) y nada cambia
begin;
select pg_temp.tp_preparar();
do $$
declare t uuid := pg_temp.tp_tabla(); v_antes text;
begin
  -- La versión 1 de la semilla no tiene autor ni fecha.
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00b', pg_temp.tp_sql(t, pg_temp.tp_filas(1), 'n', 7)),
    'PT409|Otra persona publicó la versión 1 de esta tabla.|');
  perform pg_temp.tp_publicar('00000000-0000-4000-8000-00000000a00a', t, pg_temp.tp_filas(401), 'Ana', 1);
  v_antes := pg_temp.tp_foto();
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00b', pg_temp.tp_sql(t, pg_temp.tp_filas(402), 'Beto', 1)),
    'PT409|Ana Tp publicó la versión 2 de esta tabla hace un momento.|');
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00a', pg_temp.tp_sql(t, pg_temp.tp_filas(402), 'Ana', 1)),
    'PT409|Publicaste la versión 2 de esta tabla hace un momento.|');
  perform pg_temp.tp_igual(pg_temp.tp_foto(), v_antes);
  perform pg_temp.tp_publicar('00000000-0000-4000-8000-00000000a00c', t, pg_temp.tp_filas(403), 'Sin nombre', 2);
  perform pg_temp.tp_igual(pg_temp.tp_error('00000000-0000-4000-8000-00000000a00b', pg_temp.tp_sql(t, pg_temp.tp_filas(404), 'Beto', 2)),
    'PT409|Otra persona publicó la versión 3 de esta tabla hace un momento.|');
end $$;
rollback;

-- @test tablas: 22023 con su hint (esperada nula, nota vacía, no es lista, 2.001 filas, columna ajena, celda de otro tipo, texto largo, sin cambios) y nada cambia
begin;
select pg_temp.tp_preparar();
do $$
declare t uuid := pg_temp.tp_tabla(); v_antes text := pg_temp.tp_foto(); a uuid := '00000000-0000-4000-8000-00000000a00a';
begin
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, pg_temp.tp_filas(1), 'n', null)), '22023|Falta la versión de la tabla que tenías.|version');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, pg_temp.tp_filas(1), '  ', 1)), '22023|Publicar pide una nota.|nota');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, '{}', 'n', 1)), '22023|Las filas de la tabla van en una lista.|filas');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, (select jsonb_agg(jsonb_build_object('variante', 'v' || i, 'monto', i)) from generate_series(1, 2001) i), 'n', 1)),
    '22023|Una tabla tiene hasta 2.000 filas.|filas');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, '[{"variante":"moto","otra":1}]', 'n', 1)), '22023|La fila 1: la tabla no tiene la columna «otra».|filas.0.otra');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, '[{"variante":"moto","monto":1},{"variante":"auto","monto":"mil"}]', 'n', 1)),
    '22023|La fila 2: «Monto» va con un número.|filas.1.monto');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, jsonb_build_array(jsonb_build_object('variante', repeat('x', 201))), 'n', 1)),
    '22023|La fila 1: «Variante» va con un texto de hasta 200 letras.|filas.0.variante');
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, '[3]', 'n', 1)), '22023|La fila 1: no es una fila de la tabla.|filas.0');
  -- Las mismas filas vivas, en el mismo orden, y la publicada ya las tiene congeladas.
  perform pg_temp.tp_igual(pg_temp.tp_error(a, pg_temp.tp_sql(t, pg_temp.tp_filas((select (valores ->> 'monto')::numeric from public.tablas_referencia_filas
                                                                                    where tabla_id = t and valores ->> 'variante' = 'moto')), 'n', 1)),
    '22023|La tabla no cambió.|filas');
  perform pg_temp.tp_igual(pg_temp.tp_foto(), v_antes);
end $$;
rollback;

-- @test tablas: publicar sube la versión con nota, autor y fecha, deja las filas enviadas en su orden y responde sólo la versión y las N+1
begin;
select pg_temp.tp_preparar();
do $$
declare t uuid := pg_temp.tp_tabla(); a uuid := '00000000-0000-4000-8000-00000000a00a'; v_filas jsonb; r jsonb; v_t public.tablas_referencia;
begin
  -- Al revés y con una celda nula (se guarda como ausente).
  select jsonb_agg(x.valores order by x.orden desc) || '[{"variante":"nueva","monto":null}]' into v_filas
    from public.tablas_referencia_filas x where x.tabla_id = t;
  update public.tablas_referencia_filas set activa = false where tabla_id = t and orden = 0;   -- una inactiva también se va
  r := pg_temp.tp_publicar(a, t, v_filas, '  Nueva lista  ', 1);
  select * into v_t from public.tablas_referencia where id = t;
  if v_t.version <> 2 or v_t.nota <> 'Nueva lista' or v_t.publicado_por <> a or v_t.publicado_en is null then
    raise exception 'la tabla no quedó en la versión 2 de Ana: %', to_jsonb(v_t); end if;
  if (select jsonb_agg(x.valores order by x.orden) from public.tablas_referencia_filas x where x.tabla_id = t and x.activa)
     <> (select jsonb_agg(jsonb_strip_nulls(f) order by n) from jsonb_array_elements(v_filas) with ordinality e (f, n)) then
    raise exception 'las filas vivas no son las enviadas en su orden'; end if;
  if (select count(*) from public.tablas_referencia_filas x where x.tabla_id = t) <> jsonb_array_length(v_filas)
     or exists (select 1 from public.tablas_referencia_filas x where x.tabla_id = t and not x.activa) then
    raise exception 'quedaron filas de antes'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['formulas', 'version'] or r -> 'version' <> '2'
     or jsonb_array_length(r -> 'formulas') <> 1
     or (select array_agg(k order by k) from jsonb_object_keys(r -> 'formulas' -> 0) k) <> array['origen_id', 'version']
     or r -> 'formulas' -> 0 ->> 'origen_id' <> (select id::text from public.origenes where clave = 'prueba_tp') or r -> 'formulas' -> 0 -> 'version' <> '2' then
    raise exception 'la respuesta no es {version, formulas: [{origen_id, version}]}: %', r; end if;
  if not exists (select 1 from public.actividad where accion = 'tabla_referencia.publicada' and registro_id = t::text and actor_id = a
                   and antes = '{"version": 1}' and despues -> 'version' = '2' and despues -> 'filas' = to_jsonb(jsonb_array_length(v_filas))) then
    raise exception 'publicar no dejó su actividad'; end if;
end $$;
rollback;
