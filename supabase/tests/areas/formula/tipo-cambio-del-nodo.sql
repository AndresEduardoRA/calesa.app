-- `formula_tipo_cambio_del_nodo(p_formula, p_nodo)` (4.20-3c): la fila de `tipos_cambio` que nombra un nodo `tipo_cambio` que quien llama ve, para el ⚙ de su celda
-- (la pantalla es del 4.20-3d). Pide `empresa.tipos_cambio.gestionar` y que el nodo esté en `_nodos_visibles()` de esa versión; un borrador no cuenta. Corre en PGlite
-- (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno con `tn_preparar()` dentro de su transacción y la revierte: no se apoya en el humo ni deja nada.

-- @test fórmula: los ayudantes del tipo de cambio de un nodo
reset role;
create or replace function pg_temp.tn_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Lo que esa persona recibe (como `authenticated`); un error sube tal cual.
create or replace function pg_temp.tn_lee(p_quien uuid, p_formula uuid, p_nodo text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform pg_temp.tn_como(p_quien);
  set local role authenticated;
  v := public.formula_tipo_cambio_del_nodo(p_formula, p_nodo);
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio; cada concesión es {clave, origen (nulo = el de la empresa)}. Si corre sola (`SOLO=`) la primera cuenta nace dueña: se le deja sólo su rol.
create or replace function pg_temp.tn_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Prueba 3c ' || substr(p_id::text, 33, 4), invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('tn_' || substr(p_id::text, 25, 12), 'TN ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, 'todos');
  end loop;
end $f$;

-- El terreno. Un origen con cuatro versiones de la misma definición (nodos `tc` y `tc2` de tipo de cambio, `tcx` de un tipo de cambio sin fila y `k`, una constante con
-- la clave de un tipo de cambio: sólo así el filtro de tipo no es equivalente):
--   …f001 archivada, …f002 archivada con `tc` en el nivel «costos», …f003 publicada y …f004 borrador; `tc2` no figura en `visibilidad` (sólo lo ve quien configura).
-- Dos tipos de cambio: `prueba_3c` (con `actualizado_en` explícito, anterior y con microsegundos: el insert no lo pisa) y `prueba_3c_dos`. Las personas:
--   g (Gina)   gestiona los tipos de cambio y ve el origen, sin configurarlo
--   s          ve y configura el origen, sin gestionar los tipos de cambio
--   h (Hugo)   sólo gestiona los tipos de cambio
--   c (Cora)   gestiona y configura el origen, sin verlo
--   n (Nivia)  lo de Gina, más ver el nivel «costos»
create or replace function pg_temp.tn_preparar() returns void language plpgsql as $f$
declare
  o uuid;
  v_def jsonb := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'prueba_3c'),
    jsonb_build_object('id', 'tc2', 'tipo', 'tipo_cambio', 'clave', 'prueba_3c_dos'),
    jsonb_build_object('id', 'tcx', 'tipo', 'tipo_cambio', 'clave', 'prueba_3c_sin_fila'),
    jsonb_build_object('id', 'k', 'tipo', 'constante', 'clave', 'prueba_3c')));
  v_vis jsonb := '{"tc": {"ver": "todos"}, "tcx": {"ver": "todos"}, "k": {"ver": "todos"}}';
  v_diseno jsonb;
  v_ges constant text := 'empresa.tipos_cambio.gestionar';
begin
  select f.diseno into v_diseno from public.formulas f where f.estado = 'publicada' and f.diseno is not null limit 1;
  if v_diseno is null then raise exception 'la semilla no trae una fórmula publicada con diseño'; end if;
  insert into public.origenes (clave, nombre) values ('prueba_3c', 'Prueba 3c') returning id into o;
  alter table public.formulas disable trigger trg_auditar;
  insert into public.formulas (id, origen_id, version, estado, definicion, diseno, visibilidad) values
    ('00000000-0000-4000-8000-00000003f001', o, 1, 'archivada', v_def, v_diseno, v_vis),
    ('00000000-0000-4000-8000-00000003f002', o, 2, 'archivada', v_def, v_diseno, v_vis || '{"tc": {"ver": "costos"}}'),
    ('00000000-0000-4000-8000-00000003f003', o, 3, 'publicada', v_def, v_diseno, v_vis),
    ('00000000-0000-4000-8000-00000003f004', o, null, 'borrador', v_def, v_diseno, v_vis);
  alter table public.formulas enable trigger trg_auditar;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, actualizado_en) values
    ('prueba_3c', 'Prueba 3c', 'USD', 'BOB', 6.96, '2026-01-02 03:04:05.123456+00'),
    ('prueba_3c_dos', 'Prueba 3c dos', 'USD', 'BOB', 7, '2026-01-02 03:04:05.654321+00');
  perform pg_temp.tn_persona('00000000-0000-4000-8000-00000003c001', jsonb_build_array(
    jsonb_build_object('clave', v_ges), jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o)));
  perform pg_temp.tn_persona('00000000-0000-4000-8000-00000003c002', jsonb_build_array(
    jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  perform pg_temp.tn_persona('00000000-0000-4000-8000-00000003c003', jsonb_build_array(jsonb_build_object('clave', v_ges)));
  perform pg_temp.tn_persona('00000000-0000-4000-8000-00000003c004', jsonb_build_array(
    jsonb_build_object('clave', v_ges), jsonb_build_object('clave', 'cotizaciones.configurar', 'origen', o)));
  perform pg_temp.tn_persona('00000000-0000-4000-8000-00000003c005', jsonb_build_array(
    jsonb_build_object('clave', v_ges), jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o),
    jsonb_build_object('clave', 'cotizaciones.nivel.costos.ver', 'origen', o)));
end $f$;

-- La fila esperada de un tipo de cambio: las 8 claves y nada más, con su valor.
create or replace function pg_temp.tn_es_la_fila(r jsonb, p_clave text, p_activo boolean default true) returns void language plpgsql as $f$
declare t public.tipos_cambio;
begin
  select * into t from public.tipos_cambio where clave = p_clave;
  if r is null then raise exception 'esperaba la fila de %, llegó null', p_clave; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k)
     is distinct from array['activo', 'actualizado_en', 'clave', 'id', 'moneda_a', 'moneda_de', 'nombre', 'valor'] then
    raise exception 'la fila de % no trae exactamente las 8 claves: %', p_clave, (select array_agg(k order by k) from jsonb_object_keys(r) k);
  end if;
  if (r ->> 'id')::uuid is distinct from t.id or r ->> 'clave' is distinct from p_clave or r ->> 'nombre' is distinct from t.nombre
     or r ->> 'moneda_de' is distinct from 'USD' or r ->> 'moneda_a' is distinct from 'BOB' or (r ->> 'valor')::numeric is distinct from t.valor
     or (r ->> 'activo')::boolean is distinct from p_activo or (r ->> 'actualizado_en')::timestamptz is distinct from t.actualizado_en then
    raise exception 'la fila de % no es la de la tabla: %', p_clave, r;
  end if;
end $f$;

-- @test fórmula: T1 quien gestiona los tipos de cambio y ve el nodo recibe su fila, con el actualizado_en exacto
begin;
select pg_temp.tn_preparar();
do $$
declare r jsonb;
begin
  r := pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f003', 'tc');
  perform pg_temp.tn_es_la_fila(r, 'prueba_3c');
  if (r ->> 'actualizado_en')::timestamptz is distinct from '2026-01-02 03:04:05.123456+00'::timestamptz then
    raise exception 'actualizado_en perdió los microsegundos: %', r ->> 'actualizado_en';
  end if;
end $$;
rollback;

-- @test fórmula: T2 sin empresa.tipos_cambio.gestionar da 42501, aunque configure el origen
begin;
select pg_temp.tn_preparar();
do $$
begin
  begin
    perform pg_temp.tn_lee('00000000-0000-4000-8000-00000003c002', '00000000-0000-4000-8000-00000003f003', 'tc');
    raise exception 'sin empresa.tipos_cambio.gestionar no dio 42501';
  exception when sqlstate '42501' then
    reset role;
  end;
end $$;
rollback;

-- @test fórmula: T3 sin ver ni configurar el origen, nada; quien configura sin ver recibe sólo lo que no figura en visibilidad
begin;
select pg_temp.tn_preparar();
do $$
declare r jsonb;
begin
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c003', '00000000-0000-4000-8000-00000003f003', 'tc') is not null then
    raise exception 'sin ver ni configurar el origen recibió el tipo de cambio del nodo';
  end if;
  r := pg_temp.tn_lee('00000000-0000-4000-8000-00000003c004', '00000000-0000-4000-8000-00000003f003', 'tc2');
  perform pg_temp.tn_es_la_fila(r, 'prueba_3c_dos');
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c004', '00000000-0000-4000-8000-00000003f003', 'tc') is not null then
    raise exception 'quien configura sin ver recibió un nodo que figura en visibilidad';
  end if;
end $$;
rollback;

-- @test fórmula: T4 un nodo de un nivel sólo con su permiso
begin;
select pg_temp.tn_preparar();
do $$
begin
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f002', 'tc') is not null then
    raise exception 'sin cotizaciones.nivel.costos.ver recibió el tipo de cambio de un nodo del nivel';
  end if;
  perform pg_temp.tn_es_la_fila(
    pg_temp.tn_lee('00000000-0000-4000-8000-00000003c005', '00000000-0000-4000-8000-00000003f002', 'tc'), 'prueba_3c');
end $$;
rollback;

-- @test fórmula: T5 un nodo de otro tipo, uno que no existe y una versión que no existe dan null
begin;
select pg_temp.tn_preparar();
do $$
begin
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f003', 'k') is not null then
    raise exception 'una constante con clave de tipo de cambio dio una fila';
  end if;
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f003', 'no_existe') is not null then
    raise exception 'un nodo que no existe dio una fila';
  end if;
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f0ff', 'tc') is not null then
    raise exception 'una versión que no existe dio una fila';
  end if;
end $$;
rollback;

-- @test fórmula: T6 un borrador no cuenta; una archivada sí
begin;
select pg_temp.tn_preparar();
do $$
begin
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f004', 'tc') is not null then
    raise exception 'un borrador dio una fila';
  end if;
  perform pg_temp.tn_es_la_fila(
    pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f001', 'tc'), 'prueba_3c');
end $$;
rollback;

-- @test fórmula: T7 desactivado viene con activo false; una clave sin fila da null
begin;
select pg_temp.tn_preparar();
update public.tipos_cambio set activo = false where clave = 'prueba_3c';
do $$
begin
  perform pg_temp.tn_es_la_fila(
    pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f003', 'tc'), 'prueba_3c', false);
  if pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f003', 'tcx') is not null then
    raise exception 'un tipo de cambio sin fila dio algo';
  end if;
end $$;
rollback;

-- @test fórmula: T8 lo que devuelve es la esperada de tipo_cambio_guardar, y la misma otra vez da PT409
begin;
select pg_temp.tn_preparar();
do $$
declare r jsonb;
begin
  r := pg_temp.tn_lee('00000000-0000-4000-8000-00000003c001', '00000000-0000-4000-8000-00000003f003', 'tc');
  set local role authenticated;
  perform public.tipo_cambio_guardar((r ->> 'id')::uuid, (r ->> 'actualizado_en')::timestamptz, p_valor => 7.1);
  reset role;
  if (select valor from public.tipos_cambio where clave = 'prueba_3c') is distinct from 7.1 then
    raise exception 'tipo_cambio_guardar con la esperada leída no cambió el valor';
  end if;
  begin
    set local role authenticated;
    perform public.tipo_cambio_guardar((r ->> 'id')::uuid, (r ->> 'actualizado_en')::timestamptz, p_valor => 7.2);
    raise exception 'la misma esperada otra vez no dio PT409';
  exception when sqlstate 'PT409' then
    reset role;
  end;
end $$;
rollback;

-- @test fórmula: T9 corre con los permisos de su dueña, search_path vacío, estable y sólo authenticated la ejecuta
reset role;
do $$
declare p pg_proc;
begin
  select * into p from pg_proc where oid = 'public.formula_tipo_cambio_del_nodo(uuid, text)'::regprocedure;
  if not p.prosecdef then raise exception 'no corre con los permisos de su dueña (prosecdef)'; end if;
  if p.proconfig is distinct from array['search_path=""'] then raise exception 'search_path: %', p.proconfig; end if;
  if p.provolatile <> 's' then raise exception 'no es stable: %', p.provolatile; end if;
  if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception 'authenticated no la ejecuta'; end if;
  if has_function_privilege('anon', p.oid, 'execute') then raise exception 'anon la ejecuta'; end if;
  if exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'PUBLIC la ejecuta';
  end if;
end $$;
