-- La versión esperada al descartar y al publicar el borrador de la fórmula (4.21-2, 4-8), y el permiso antes que las esperadas en las tres RPC: con la
-- `actualizado_en` que leyó, un borrador que cambió o que ya no está da PT409; sin hora, como antes. docs/COTIZADOR.md › «Versiones».
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con `be_preparar()` dentro de su transacción y la revierte: no se
-- apoya en el humo ni en otro archivo, ni deja nada. Los otros dos: `borrador-*.sql`.

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
-- Los parámetros con una marca (una constante de la semilla en 1000 + n), para distinguir un borrador de la publicada.
create or replace function pg_temp.be_clave() returns text language sql as $f$
  select k from jsonb_each(pg_temp.be_params()) e(k, v) where jsonb_typeof(v) = 'number' order by k limit 1
$f$;
create or replace function pg_temp.be_marca(p_n int) returns jsonb language sql as $f$ select pg_temp.be_params() || jsonb_build_object(pg_temp.be_clave(), 1000 + p_n) $f$;
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

-- El SQL de descartar con la hora (literal), para `be_error`.
create or replace function pg_temp.be_sql_descarta(p_origen uuid, p_hora timestamptz) returns text language sql as $f$
  select format('select public.formula_descartar_borrador(p_origen => %L, p_actualizado_en_esperado => %L)', p_origen, p_hora)
$f$;

-- El SQL de publicar con las dos esperadas (literales), para `be_error`.
create or replace function pg_temp.be_sql_publica(p_origen uuid, p_publicada uuid, p_hora timestamptz) returns text language sql as $f$
  select format('select public.formula_publicar(p_origen => %L, p_nota => %L, p_publicada_esperada => %L, p_actualizado_en_esperado => %L)',
                p_origen, 'Prueba be', p_publicada, p_hora)
$f$;

create or replace function pg_temp.be_igual(p_dio text, p_esperado text) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception 'esperaba «%», dio «%»', p_esperado, p_dio; end if;
end $f$;

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
  -- Descartar con una hora mala (sería T2), y sin borrador con hora (T3).
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00d', pg_temp.be_sql_descarta(o, b0.actualizado_en - interval '1 microsecond')),
    '42501|No tienes el permiso «cotizaciones.configurar».');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'sin permiso tocó el borrador'; end if;
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00d', pg_temp.be_sql_descarta(pg_temp.be_sin(), now())),
    '42501|No tienes el permiso «cotizaciones.configurar».');
  -- Publicar con una hora mala (sería T2).
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00d',
                                            pg_temp.be_sql_publica(o, null, b0.actualizado_en - interval '1 microsecond')),
    '42501|No tienes el permiso «cotizaciones.configurar».');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'sin permiso publicó el borrador'; end if;
end $$;
rollback;

-- @test fórmula: D1 descartar sin hora borra el borrador que haya y, si no hay, no hace nada (lo de hoy)
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be');
begin
  perform pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', format('select public.formula_descartar_borrador(%L)', o)), 'sin error');
  if (pg_temp.be_borrador(o)).id is not null then raise exception 'descartar sin hora no borró'; end if;
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', format('select public.formula_descartar_borrador(%L)', o)), 'sin error');
  if not exists (select 1 from public.formulas where id = '00000000-0000-4000-8000-00000000be01' and estado = 'publicada') then
    raise exception 'descartar tocó la publicada'; end if;
end $$;
rollback;

-- @test fórmula: D2 descartar con la hora que leyó borra el borrador
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_descarta(o, b0.actualizado_en)), 'sin error');
  if (pg_temp.be_borrador(o)).id is not null then raise exception 'descartar con la hora leída no borró'; end if;
end $$;
rollback;

-- @test fórmula: D3 descartar con una hora que no es la del borrador da PT409 y el borrador sigue
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_descarta(o, b0.actualizado_en - interval '1 microsecond')),
    'PT409|El borrador cambió después de que lo abriste: se guardó de nuevo hace un momento.');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'descartar con la hora mala tocó el borrador'; end if;
end $$;
rollback;

-- @test fórmula: D4 descartar con hora cuando ya no hay borrador da PT409 (se publicó o se descartó)
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be');
begin
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_descarta(o, now())),
    'PT409|El borrador que abriste ya no está: se publicó o se descartó.');
end $$;
rollback;

-- @test fórmula: P1 publicar con la hora que leyó publica el borrador
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a',
                                            pg_temp.be_sql_publica(o, '00000000-0000-4000-8000-00000000be01', b0.actualizado_en)), 'sin error');
  if (select estado::text || version from public.formulas where id = b0.id) is distinct from 'publicada2' then raise exception 'no publicó la v2'; end if;
  if (pg_temp.be_borrador(o)).id is not null then raise exception 'quedó un borrador'; end if;
end $$;
rollback;

-- @test fórmula: P2 publicar con una hora que no es la del borrador da PT409 y no cambia nada
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a',
                                            pg_temp.be_sql_publica(o, '00000000-0000-4000-8000-00000000be01', b0.actualizado_en - interval '1 microsecond')),
    'PT409|El borrador cambió después de que lo abriste: se guardó de nuevo hace un momento.');
  if pg_temp.be_borrador(o)::text is distinct from b0::text then raise exception 'publicar con la hora mala tocó el borrador'; end if;
  if not exists (select 1 from public.formulas where id = '00000000-0000-4000-8000-00000000be01' and estado = 'publicada') then
    raise exception 'publicar con la hora mala cambió la publicada'; end if;
end $$;
rollback;

-- @test fórmula: P3 publicar con hora cuando ya no hay borrador da PT409 (no «No hay borrador»)
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be');
begin
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', pg_temp.be_sql_publica(o, '00000000-0000-4000-8000-00000000be01', now())),
    'PT409|El borrador que abriste ya no está: se publicó o se descartó.');
end $$;
rollback;

-- @test fórmula: P4 publicar sin hora publica el borrador que haya y, sin borrador, da «No hay borrador» (lo de hoy)
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', format($s$select public.formula_publicar(%L, 'Prueba be')$s$, o)),
    '22023|No hay borrador para publicar.');
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a', format($s$select public.formula_publicar(%L, 'Prueba be')$s$, o)),
    'sin error');
  if (select estado::text || version from public.formulas where id = b0.id) is distinct from 'publicada2' then raise exception 'sin hora no publicó la v2'; end if;
end $$;
rollback;

-- @test fórmula: P5 publicar con la publicada vieja y una hora mala da el PT409 de la publicada (va primero)
begin;
select pg_temp.be_preparar();
do $$
declare o uuid := (select id from public.origenes where clave = 'prueba_be'); b0 public.formulas;
begin
  b0 := pg_temp.be_insertar_borrador(o, '00000000-0000-4000-8000-0000000be00b');
  perform pg_temp.be_igual(pg_temp.be_error('00000000-0000-4000-8000-0000000be00a',
                                            pg_temp.be_sql_publica(o, gen_random_uuid(), b0.actualizado_en - interval '1 microsecond')),
    'PT409|Beto Be publicó la versión 1 hace un momento.');
end $$;
rollback;
