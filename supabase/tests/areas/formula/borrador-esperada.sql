-- La versión esperada del borrador de la fórmula (4.21-2, 4-8): `formula_guardar_borrador()` crea sin hora (y la publicada esperada, si viene, tiene que seguir
-- siendo la publicada) y pisa sólo con la `actualizado_en` que leyó; devuelve `{id, actualizado_en}` de la fila escrita. Descartar y publicar aceptan la hora.
-- El permiso va primero; el PT409 dice qué pasó, sin «Recarga». docs/COTIZADOR.md › «Versiones (4.20-1)». Corre en PGlite (`pnpm db:probar`, después de la lista
-- fija); cada bloque arma su terreno con `be_preparar()` dentro de su transacción y la revierte: no se apoya en el humo ni deja nada.

-- @test fórmula: los ayudantes de la versión esperada del borrador
reset role;
create or replace function pg_temp.be_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Una persona con un rol propio y un nombre (nulo: sin nombre); cada concesión es {clave, origen}. Si corre sola (`SOLO=`) la primera cuenta nace dueña: se le deja sólo su rol.
create or replace function pg_temp.be_persona(p_id uuid, p_nombre text, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = coalesce(p_nombre, ''), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('be_' || substr(p_id::text, 25, 12), 'BE ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', (c ->> 'origen')::uuid, 'todos');
  end loop;
end $f$;

-- El terreno: el origen `prueba_be` con su publicada v1 (…be01, la definición, los parámetros y el diseño de una publicada de la semilla, publicada por Beto),
-- el origen `prueba_be_sin` sin publicada, y las personas:
--   a (Ana Be)   configura los dos orígenes
--   b (Beto Be)  configura los dos orígenes
--   n (sin nombre) configura los dos orígenes
--   v            sólo ve `prueba_be` (cotizaciones.ver), sin configurarlo
-- Devuelve el origen `prueba_be`; el otro se lee por su clave.
create or replace function pg_temp.be_preparar() returns uuid language plpgsql as $f$
declare o uuid; o2 uuid; s public.formulas;
begin
  select * into s from public.formulas f
   where f.estado = 'publicada' and f.diseno is not null and exists (select 1 from jsonb_each(f.params) e where jsonb_typeof(e.value) = 'number')
   order by f.creado_en, f.id limit 1;
  if s.id is null then raise exception 'la semilla no trae una fórmula publicada con diseño y una constante'; end if;
  insert into public.origenes (clave, nombre) values ('prueba_be', 'Prueba be') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_be_sin', 'Prueba be sin') returning id into o2;
  perform pg_temp.be_persona('00000000-0000-4000-8000-0000000be00a', 'Ana Be', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.be_persona('00000000-0000-4000-8000-0000000be00b', 'Beto Be', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.be_persona('00000000-0000-4000-8000-0000000be00c', null, jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o2)));
  perform pg_temp.be_persona('00000000-0000-4000-8000-0000000be00d', 'Vera Be', jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  insert into public.formulas (id, origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_por, publicado_en)
  values ('00000000-0000-4000-8000-00000000be01', o, 1, 'publicada', s.definicion, s.params, s.diseno, s.visibilidad, 'v1',
          '00000000-0000-4000-8000-0000000be00b', now());
  return o;
end $f$;

create or replace function pg_temp.be_sin() returns uuid language sql as $f$ select id from public.origenes where clave = 'prueba_be_sin' $f$;
create or replace function pg_temp.be_def() returns jsonb language sql as $f$ select definicion from public.formulas where id = '00000000-0000-4000-8000-00000000be01' $f$;
create or replace function pg_temp.be_params() returns jsonb language sql as $f$ select params from public.formulas where id = '00000000-0000-4000-8000-00000000be01' $f$;
create or replace function pg_temp.be_diseno() returns jsonb language sql as $f$ select diseno from public.formulas where id = '00000000-0000-4000-8000-00000000be01' $f$;
-- Los parámetros con una marca (una constante de la semilla en 1000 + n), para saber si guardar pisó; `be_marca_de` la lee.
create or replace function pg_temp.be_clave() returns text language sql as $f$
  select k from jsonb_each(pg_temp.be_params()) e(k, v) where jsonb_typeof(v) = 'number' order by k limit 1
$f$;
create or replace function pg_temp.be_marca(p_n int) returns jsonb language sql as $f$ select pg_temp.be_params() || jsonb_build_object(pg_temp.be_clave(), 1000 + p_n) $f$;
create or replace function pg_temp.be_marca_de(p_params jsonb) returns int language sql as $f$ select (p_params ->> pg_temp.be_clave())::numeric::int - 1000 $f$;
-- El borrador de un origen, como postgres (todas sus columnas; nulas si no hay).
create or replace function pg_temp.be_borrador(p_origen uuid) returns public.formulas language sql as $f$
  select * from public.formulas where origen_id = p_origen and estado = 'borrador'
$f$;
-- Un borrador escrito como postgres, sin pasar por guardar: de `p_quien` (nulo: sin `creado_por`), sobre la publicada de ahora.
create or replace function pg_temp.be_insertar_borrador(p_origen uuid, p_quien uuid) returns public.formulas language plpgsql as $f$
declare r public.formulas;
begin
  insert into public.formulas (origen_id, estado, definicion, params, diseno, creado_por, version_origen_id)
  values (p_origen, 'borrador', pg_temp.be_def(), pg_temp.be_marca(0), pg_temp.be_diseno(), p_quien,
          (select id from public.formulas where origen_id = p_origen and estado = 'publicada'))
  returning * into r;
  return r;
end $f$;

-- Guardar como esa persona (como `authenticated`), con las dos esperadas por nombre; un error sube tal cual.
create or replace function pg_temp.be_guarda(p_quien uuid, p_origen uuid, p_params jsonb, p_publicada uuid, p_hora timestamptz, p_def jsonb default null)
  returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform pg_temp.be_como(p_quien);
  set local role authenticated;
  v := public.formula_guardar_borrador(p_origen => p_origen, p_def => coalesce(p_def, pg_temp.be_def()), p_params => p_params, p_diseno => pg_temp.be_diseno(),
                                       p_publicada_esperada => p_publicada, p_actualizado_en_esperado => p_hora);
  reset role;
  return v;
end $f$;

-- El código y el mensaje de un SQL corrido como esa persona: «sqlstate|mensaje», o «sin error».
create or replace function pg_temp.be_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_m text;
begin
  perform pg_temp.be_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_m = message_text;
  return sqlstate || '|' || v_m;
end $f$;

-- El SQL de guardar con las dos esperadas (literales), para `be_error`.
create or replace function pg_temp.be_sql_guarda(p_origen uuid, p_params jsonb, p_publicada uuid, p_hora timestamptz, p_def jsonb default null) returns text
  language sql as $f$
  select format('select public.formula_guardar_borrador(p_origen => %L, p_def => %L, p_params => %L, p_diseno => %L, p_publicada_esperada => %L, p_actualizado_en_esperado => %L)',
                p_origen, coalesce(p_def, pg_temp.be_def()), p_params, pg_temp.be_diseno(), p_publicada, p_hora)
$f$;

create or replace function pg_temp.be_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

-- @test fórmula: B1 guardar sin hora, con la publicada esperada correcta, crea sobre la publicada y devuelve el id y la hora de la fila creada
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); r jsonb; b public.formulas;
begin
  r := pg_temp.be_guarda('00000000-0000-4000-8000-0000000be00a', o, pg_temp.be_marca(1), '00000000-0000-4000-8000-00000000be01', null);
  b := pg_temp.be_borrador(o);
  if b.id is null then raise exception 'no creó el borrador'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'id'] then
    raise exception 'guardar no devolvió exactamente {id, actualizado_en}: %', r; end if;
  if (r ->> 'id')::uuid is distinct from b.id then raise exception 'el id devuelto (%) no es el del borrador (%)', r ->> 'id', b.id; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from b.actualizado_en then
    raise exception 'la hora devuelta (%) no es la del borrador (%)', r ->> 'actualizado_en', b.actualizado_en; end if;
  if b.version_origen_id is distinct from '00000000-0000-4000-8000-00000000be01' then raise exception 'version_origen_id: %', b.version_origen_id; end if;
  if b.creado_por is distinct from '00000000-0000-4000-8000-0000000be00a' or pg_temp.be_marca_de(b.params) is distinct from 1 then
    raise exception 'el borrador no es el que se guardó: %, %', b.creado_por, pg_temp.be_marca_de(b.params); end if;
end $$;
rollback;

-- @test fórmula: B2 guardar sin hora con un borrador ya empezado da PT409 con quién lo empezó y cuándo se guardó, y no lo toca
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, null)),
    'PT409|Ya hay un borrador: lo empezó Beto Be y se guardó hace un momento.');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'guardar tocó el borrador de Beto'; end if;
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00b', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, null)),
    'PT409|Ya hay un borrador: lo empezaste tú y se guardó hace un momento.');
  -- Sin nombre, y sin `creado_por`.
  delete from public.formulas where id = b0.id;
  perform pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00c');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, null)),
    'PT409|Ya hay un borrador: lo empezó otra persona y se guardó hace un momento.');
  delete from public.formulas where origen_id = o and estado = 'borrador';
  perform pg_temp.be_insertar_borrador(o, null);
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, null)),
    'PT409|Ya hay un borrador: lo empezó otra persona y se guardó hace un momento.');
  if pg_temp.be_marca_de((pg_temp.be_borrador(o)).params) is distinct from 0 then raise exception 'guardar pisó el borrador sin hora'; end if;
end $$;
rollback;

-- @test fórmula: B3 guardar sin hora con una publicada esperada que ya no es la publicada da PT409 con quién publicó, y no escribe nada
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be');
begin
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), gen_random_uuid(), null)),
    'PT409|Mientras editabas, Beto Be publicó la versión 1 hace un momento.');
  if (pg_temp.be_borrador(o)).id is not null then raise exception 'guardar creó el borrador con la publicada vieja'; end if;
  -- Un origen sin publicada.
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_guarda(pg_temp.be_sin(), pg_temp.be_marca(1), gen_random_uuid(), null)),
    'PT409|La versión que tenías ya no es la publicada, y el origen no tiene otra.');
  if (pg_temp.be_borrador(pg_temp.be_sin())).id is not null then raise exception 'guardar creó el borrador sin publicada'; end if;
end $$;
rollback;

-- @test fórmula: B4 guardar sin ninguna esperada (como las carreras) crea sobre la publicada de ahora
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be');
begin
  perform pg_temp.be_como('00000000-0000-4000-8000-0000000be00a');
  set local role authenticated;
  perform public.formula_guardar_borrador(o, pg_temp.be_def(), pg_temp.be_marca(1), pg_temp.be_diseno());
  reset role;
  if (pg_temp.be_borrador(o)).version_origen_id is distinct from '00000000-0000-4000-8000-00000000be01' then raise exception 'no creó sobre la publicada'; end if;
  -- Sin publicada, también crea.
  set local role authenticated;
  perform public.formula_guardar_borrador(pg_temp.be_sin(), pg_temp.be_def(), pg_temp.be_marca(1), pg_temp.be_diseno());
  reset role;
  if (pg_temp.be_borrador(pg_temp.be_sin())).id is null or (pg_temp.be_borrador(pg_temp.be_sin())).version_origen_id is not null then
    raise exception 'sin publicada no creó el borrador sin origen'; end if;
end $$;
rollback;

-- @test fórmula: B5 guardar con la hora que leyó pisa, sin cambiar de dónde salió ni quién lo empezó, y devuelve la hora nueva, con la que vuelve a guardar
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); r jsonb; r2 jsonb; r3 jsonb; h0 timestamptz; b public.formulas;
begin
  r := pg_temp.be_guarda('00000000-0000-4000-8000-0000000be00a', o, pg_temp.be_marca(1), '00000000-0000-4000-8000-00000000be01', null);
  -- La hora del borrador, 1 min atrás: sin el trigger (dentro de la transacción, como `tipo-cambio-del-nodo.sql`); se vuelve a encender antes de guardar.
  alter table public.formulas disable trigger trg_actualizado_en;
  update public.formulas set actualizado_en = actualizado_en - interval '1 min', visibilidad = '{}' where id = (r ->> 'id')::uuid returning actualizado_en into h0;
  alter table public.formulas enable trigger trg_actualizado_en;
  r2 := pg_temp.be_guarda('00000000-0000-4000-8000-0000000be00b', o, pg_temp.be_marca(2), null, h0);
  b := pg_temp.be_borrador(o);
  if (r2 ->> 'id')::uuid is distinct from b.id or b.id is distinct from (r ->> 'id')::uuid then raise exception 'pisar cambió el id: %, %', r2, b.id; end if;
  if pg_temp.be_marca_de(b.params) is distinct from 2 or b.visibilidad is not null then raise exception 'no pisó: %, %', pg_temp.be_marca_de(b.params), b.visibilidad; end if;
  if b.version_origen_id is distinct from '00000000-0000-4000-8000-00000000be01' or b.creado_por is distinct from '00000000-0000-4000-8000-0000000be00a' then
    raise exception 'pisar cambió version_origen_id o creado_por: %, %', b.version_origen_id, b.creado_por; end if;
  if (r2 ->> 'actualizado_en')::timestamptz is distinct from b.actualizado_en or b.actualizado_en = h0 then
    raise exception 'la hora devuelta (%) no es la nueva de la fila (%; la de antes era %)', r2 ->> 'actualizado_en', b.actualizado_en, h0; end if;
  -- Con la hora devuelta vuelve a guardar.
  r3 := pg_temp.be_guarda('00000000-0000-4000-8000-0000000be00b', o, pg_temp.be_marca(3), null, (r2 ->> 'actualizado_en')::timestamptz);
  if pg_temp.be_marca_de((pg_temp.be_borrador(o)).params) is distinct from 3 or (r3 ->> 'id')::uuid is distinct from b.id then raise exception 'no volvió a guardar con la hora devuelta'; end if;
end $$;
rollback;

-- @test fórmula: B6 guardar con una hora que no es la del borrador da PT409 y no lo toca
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a',
                                            pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, b0.actualizado_en - interval '1 microsecond')),
    'PT409|El borrador cambió después de que lo abriste: se guardó de nuevo hace un momento.');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'guardar con la hora mala tocó el borrador'; end if;
end $$;
rollback;

-- @test fórmula: B7 guardar con hora cuando ya no hay borrador da PT409 y no crea ninguno
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be');
begin
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, now())),
    'PT409|El borrador que abriste ya no está: se publicó o se descartó.');
  if (pg_temp.be_borrador(o)).id is not null then raise exception 'guardar con hora creó un borrador'; end if;
end $$;
rollback;

-- @test fórmula: B8 un borrador atrasado (otra persona publicó después) se sigue guardando con su hora, conserva su versión de origen, y publicarlo da el PT409 de siempre
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00a');
  -- Beto publica la v2 desde la publicada (lo que hace el ⚙), sin tocar el borrador.
  update public.formulas set estado = 'archivada' where id = '00000000-0000-4000-8000-00000000be01';
  insert into public.formulas (id, origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_por, publicado_en, version_origen_id)
  select '00000000-0000-4000-8000-00000000be02', o, 2, 'publicada', definicion, params, diseno, visibilidad, 'v2', '00000000-0000-4000-8000-0000000be00b', now(), id
    from public.formulas where id = '00000000-0000-4000-8000-00000000be01';
  perform pg_temp.be_guarda('00000000-0000-4000-8000-0000000be00a', o, pg_temp.be_marca(1), '00000000-0000-4000-8000-00000000be01', b0.actualizado_en);
  if pg_temp.be_marca_de((pg_temp.be_borrador(o)).params) is distinct from 1 then raise exception 'el borrador atrasado no se guardó'; end if;
  if (pg_temp.be_borrador(o)).version_origen_id is distinct from '00000000-0000-4000-8000-00000000be01' then
    raise exception 'pisar cambió la versión de origen: %', (pg_temp.be_borrador(o)).version_origen_id; end if;
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', format($s$select public.formula_publicar(%L, 'Atrasado')$s$, o)),
    'PT409|Después de que empezaste este borrador, Beto Be publicó la versión 2 hace un momento.');
end $$;
rollback;

-- @test fórmula: B9 sin cotizaciones.configurar da 42501 antes de mirar las esperadas
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  -- Sin hora con borrador (sería T1), con una publicada vieja (T4) y con una hora mala (T2): siempre 42501.
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00d', pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), gen_random_uuid(), null)),
    '42501|No tienes el permiso «cotizaciones.configurar».');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00d',
                                            pg_temp.be_sql_guarda(o, pg_temp.be_marca(1), null, b0.actualizado_en - interval '1 microsecond')),
    '42501|No tienes el permiso «cotizaciones.configurar».');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'sin permiso tocó el borrador'; end if;
end $$;
rollback;

-- @test fórmula: B10 guardar valida la fórmula antes de comparar la hora
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas; v text;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  v := pg_temp.be_error('00000000-0000-4000-8000-0000000be00a',
                        pg_temp.be_sql_guarda(o, '{}', null, b0.actualizado_en - interval '1 microsecond', '{"nodos": []}'));
  if left(v, 6) <> '22023|' then raise exception 'esperaba la validación (22023), dio «%»', v; end if;
end $$;
rollback;

-- @test fórmula: F1 una firma de guardar, de authenticated y no de anon, definer con search_path vacío, devuelve jsonb y toma el candado; sus ayudantes no son de nadie
do $$
declare v_p regprocedure; f text;
begin
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'formula_guardar_borrador') <> 1 then
    raise exception 'formula_guardar_borrador tiene más de una firma (o ninguna)'; end if;
  v_p := to_regprocedure('public.formula_guardar_borrador(uuid,jsonb,jsonb,jsonb,text,uuid,timestamptz)');
  if v_p is null then raise exception 'no existe formula_guardar_borrador(uuid,jsonb,jsonb,jsonb,text,uuid,timestamptz)'; end if;
  if not has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute') then
    raise exception 'los grants de formula_guardar_borrador'; end if;
  if (select p.prosecdef and p.proconfig = array['search_path=""'] and p.prorettype = 'jsonb'::regtype from pg_proc p where p.oid = v_p) is not true then
    raise exception 'formula_guardar_borrador no es definer con search_path vacío que devuelve jsonb'; end if;
  if position($c$pg_advisory_xact_lock(hashtextextended('formulas:'$c$ in pg_get_functiondef(v_p)) = 0 then
    raise exception 'formula_guardar_borrador no toma el candado del origen'; end if;
  foreach f in array array['public._borrador_formula_empezado_por(uuid)', 'public._exigir_borrador_formula(public.formulas,timestamptz)'] loop
    v_p := to_regprocedure(f);
    if v_p is null then raise exception 'no existe %', f; end if;
    if has_function_privilege('authenticated', v_p, 'execute') or has_function_privilege('anon', v_p, 'execute')
       or not has_function_privilege('service_role', v_p, 'execute') then
      raise exception 'los grants de %', f; end if;
    if (select p.proconfig = array['search_path=""'] from pg_proc p where p.oid = v_p) is not true then raise exception '% no lleva search_path vacío', f; end if;
  end loop;
end $$;
