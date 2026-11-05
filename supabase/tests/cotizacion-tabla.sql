-- `cotizacion_tabla()` con la hoja abierta (paso 4.13-4c1): la tabla de una ayuda se lee con la versión con que la hoja calcula (la de `p_abierta`, como `cotizacion_evaluar`), con su
-- puerta (`cotizaciones.crear` y `cotizaciones.ver` del origen, antes de mirar nada) y con las columnas que esa versión deja ver. Lo de siempre (por cotización, la publicada, lo oculto por
-- nivel, la congelada y la viva) lo prueba el bloque de tablas de `cotizaciones-visibilidad.sql`; la equivalencia con la ayuda de `cotizacion_hoja()`, `cotizacion-hoja.sql`.
-- Corre después de `humo.sql` (la dueña es `…0001`): `SOLO=humo.sql,cotizacion-tabla.sql pnpm db:probar`. Cada bloque abre su transacción y la revierte.

create or replace function pg_temp.ct_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.ct_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform pg_temp.ct_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio y esas claves (en todos los orígenes).
create or replace function pg_temp.ct_persona(p_id uuid, variadic p_claves text[]) returns void language plpgsql as $f$
declare v_rol uuid; k text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ct_' || substr(p_id::text, 25, 12), 'CT ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach k in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, k, null, 'todos');
  end loop;
end $f$;

-- La hoja abierta de esa persona a esa hora, firmada como postgres con su identidad (lo que `cotizacion_hoja()` le habría entregado).
create or replace function pg_temp.ct_token(p_quien uuid, p_o uuid, p_f uuid, p_cuando timestamptz) returns text language plpgsql as $f$
begin
  perform pg_temp.ct_como(p_quien);
  return public._cotizacion_abierta_firmar(p_o, p_f, p_cuando);
end $f$;

-- Una versión con dos nodos que leen `ct_tabla`: `x` lee `factor` (lo ven todos) y `y` lee `oficina` (en la v1, sólo el nivel «costos»). Las filas congeladas son de cada versión.
create or replace function pg_temp.ct_version(p_o uuid, p_version int, p_y text, p_filas jsonb, p_cuando timestamptz) returns uuid language plpgsql as $f$
declare v_id uuid;
begin
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_o, p_version, 'publicada',
          jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'anio', 'tipo', 'campo_vehiculo', 'campo', 'anio', 'etiqueta', 'Año'),
            jsonb_build_object('id', 'x', 'tipo', 'tabla', 'tabla', 'ct_tabla', 'match', jsonb_build_object('anio', 'anio'), 'columna', 'factor', 'etiqueta', 'X'),
            jsonb_build_object('id', 'y', 'tipo', 'tabla', 'tabla', 'ct_tabla', 'match', jsonb_build_object('anio', 'anio'), 'columna', 'oficina', 'etiqueta', 'Y'))),
          jsonb_build_object('tablas', jsonb_build_object('ct_tabla', p_filas)), '{"secciones": []}'::jsonb,
          jsonb_build_object('anio', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'x', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                             'y', jsonb_build_object('ver', p_y, 'editar', p_y)),
          p_cuando)
  returning id into v_id;
  return v_id;
end $f$;

-- El terreno: el origen con la v1 publicada; con `p_v2`, la v1 archivada y la v2 publicada a esa hora (sin nivel en `y` y con otras filas).
create or replace function pg_temp.ct_terreno(p_clave text, p_v2 timestamptz) returns uuid language plpgsql as $f$
declare o uuid; f1 uuid;
begin
  insert into public.origenes (clave, nombre) values (p_clave, 'CT ' || p_clave) returning id into o;
  f1 := pg_temp.ct_version(o, 1, 'costos', '[{"anio": 2018, "factor": 1.5, "oficina": 7001}, {"anio": 2019, "factor": 2.5, "oficina": 7002}]', now() - interval '10 days');
  if p_v2 is not null then
    update public.formulas set estado = 'archivada' where id = f1;
    perform pg_temp.ct_version(o, 2, 'todos', '[{"anio": 2018, "factor": 3.5, "oficina": 8001}]', p_v2);
  end if;
  return o;
end $f$;

create or replace function pg_temp.ct_version_de(p_o uuid, p_version int) returns uuid language sql as $f$
  select f.id from public.formulas f where f.origen_id = p_o and f.version = p_version
$f$;

-- @test cotizacion_tabla por origen pide crear y ver del origen (P4): quien configura sin ver y quien sólo crea reciben el 42501 de cotizaciones.ver; con crear y ver, la tabla
begin;
do $$
declare
  cfg_sin_ver constant uuid := '00000000-0000-0000-0000-0000000c7a01'; solo_crear constant uuid := '00000000-0000-0000-0000-0000000c7a02';
  con_ver constant uuid := '00000000-0000-0000-0000-0000000c7a03';
  o uuid; r jsonb; c_t constant text := 'select public.cotizacion_tabla(''ct_tabla'', null, %L)';
begin
  o := pg_temp.ct_terreno('ct_t1', null);
  perform pg_temp.ct_persona(cfg_sin_ver, 'cotizaciones.crear', 'cotizaciones.configurar');
  perform pg_temp.ct_persona(solo_crear, 'cotizaciones.crear');
  perform pg_temp.ct_persona(con_ver, 'cotizaciones.crear', 'cotizaciones.ver');
  -- Quien configura lee las tablas directo por la policy, pero por la RPC de la hoja entra por la puerta de la hoja.
  r := pg_temp.ct_corre(cfg_sin_ver, format(c_t, o));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'quien configura sin ver debía recibir 42501 (cotizaciones.ver): %', left(r::text, 200); end if;
  r := pg_temp.ct_corre(solo_crear, format(c_t, o));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'quien sólo crea debía recibir 42501 (cotizaciones.ver): %', left(r::text, 200); end if;
  r := pg_temp.ct_corre(con_ver, format(c_t, o));
  if r ? 'error' or r -> 'filas' is distinct from '[{"anio": 2018, "factor": 1.5}, {"anio": 2019, "factor": 2.5}]'::jsonb then raise exception 'con crear y ver debía recibir la tabla: %', r; end if;
end $$;
rollback;

-- @test cotizacion_tabla con la hoja abierta: con la de la v1 y la v2 publicada, las filas congeladas de la v1; sin abierta, las de la v2; con la abierta de la v2, lo mismo que sin ella
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid; r jsonb; r_sin jsonb;
  c_t constant text := 'select public.cotizacion_tabla(''ct_tabla'', null, %L, %L)';
begin
  o := pg_temp.ct_terreno('ct_t2', now());
  r := pg_temp.ct_corre(duena, format(c_t, o, pg_temp.ct_token(duena, o, pg_temp.ct_version_de(o, 1), now())));
  if r ? 'error' or r -> 'filas' is distinct from '[{"anio": 2018, "factor": 1.5, "oficina": 7001}, {"anio": 2019, "factor": 2.5, "oficina": 7002}]'::jsonb or r ->> 'congelada' <> 'true' then
    raise exception 'con la abierta de la v1 debía leer las filas de la v1: %', r;
  end if;
  r_sin := pg_temp.ct_corre(duena, format('select public.cotizacion_tabla(''ct_tabla'', null, %L)', o));
  if r_sin ? 'error' or r_sin -> 'filas' is distinct from '[{"anio": 2018, "factor": 3.5, "oficina": 8001}]'::jsonb then raise exception 'sin abierta debía leer la publicada (v2): %', r_sin; end if;
  r := pg_temp.ct_corre(duena, format(c_t, o, pg_temp.ct_token(duena, o, pg_temp.ct_version_de(o, 2), now())));
  if r is distinct from r_sin then raise exception 'con la abierta de la publicada debía leer lo mismo que sin ella: % contra %', r, r_sin; end if;
end $$;
rollback;

-- @test cotizacion_tabla con la hoja abierta: las columnas son las que deja ver esa versión (la v1 esconde en «costos» el nodo que lee oficina; la v2, no)
begin;
do $$
declare
  asesora constant uuid := '00000000-0000-0000-0000-0000000c7a11';
  o uuid; r jsonb;
begin
  o := pg_temp.ct_terreno('ct_t3', now());
  perform pg_temp.ct_persona(asesora, 'cotizaciones.crear', 'cotizaciones.ver');
  r := pg_temp.ct_corre(asesora, format('select public.cotizacion_tabla(''ct_tabla'', null, %L, %L)', o, pg_temp.ct_token(asesora, o, pg_temp.ct_version_de(o, 1), now())));
  if r ? 'error' or r -> 'filas' is distinct from '[{"anio": 2018, "factor": 1.5}, {"anio": 2019, "factor": 2.5}]'::jsonb then
    raise exception 'sin «costos», con la abierta de la v1 no debía viajar oficina: %', r;
  end if;
  if exists (select 1 from jsonb_path_query(r, 'strict $.**') h where (jsonb_typeof(h) = 'number' and (h #>> '{}')::numeric in (7001, 7002)) or h #>> '{}' = 'oficina') then
    raise exception 'oficina o su valor viajan: %', r;
  end if;
  -- La v2 no esconde `y`: sin abierta (la publicada), oficina viaja.
  r := pg_temp.ct_corre(asesora, format('select public.cotizacion_tabla(''ct_tabla'', null, %L)', o));
  if r ? 'error' or r -> 'filas' is distinct from '[{"anio": 2018, "factor": 3.5, "oficina": 8001}]'::jsonb then raise exception 'con la v2, oficina se ve: %', r; end if;
end $$;
rollback;

-- @test cotizacion_tabla con la hoja abierta: rota, de otra persona o de otro origen, abierta_invalida con el mismo texto; reemplazada hace más de un día, abierta_vencida; una versión que no es del origen, abierta_no_disponible
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; asesora constant uuid := '00000000-0000-0000-0000-0000000c7a21';
  o uuid; o2 uuid; f1 uuid; tok text; r jsonb; v_mensaje text;
  c_t constant text := 'select public.cotizacion_tabla(''ct_tabla'', null, %L, %L)';
begin
  o := pg_temp.ct_terreno('ct_t4', now());
  o2 := pg_temp.ct_terreno('ct_t4_otro', null);
  f1 := pg_temp.ct_version_de(o, 1);
  perform pg_temp.ct_persona(asesora, 'cotizaciones.crear', 'cotizaciones.ver');
  tok := pg_temp.ct_token(duena, o, f1, now());
  foreach tok in array array['hola', left(tok, 100) || '0', pg_temp.ct_token(asesora, o, f1, now()), pg_temp.ct_token(duena, o2, f1, now())] loop
    r := pg_temp.ct_corre(duena, format(c_t, o, tok));
    if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_invalida' then raise exception 'debía dar abierta_invalida: % (%)', r, tok; end if;
    if v_mensaje is not null and r ->> 'mensaje' is distinct from v_mensaje then raise exception 'abierta_invalida no dice siempre lo mismo: % contra %', r ->> 'mensaje', v_mensaje; end if;
    v_mensaje := r ->> 'mensaje';
  end loop;
  -- La v2 se publicó hace 25 h: la hoja de la v1 ya no vale.
  update public.formulas set publicado_en = now() - interval '25 hours' where id = pg_temp.ct_version_de(o, 2);
  r := pg_temp.ct_corre(duena, format(c_t, o, pg_temp.ct_token(duena, o, f1, now())));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'la v1 reemplazada hace 25 h debía dar abierta_vencida: %', r; end if;
  r := pg_temp.ct_corre(duena, format(c_t, o, pg_temp.ct_token(duena, o, gen_random_uuid(), now())));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_no_disponible' then raise exception 'una versión que no es del origen debía dar abierta_no_disponible: %', r; end if;
end $$;
rollback;

-- @test cotizacion_tabla con la hoja abierta: los permisos van antes de leerla (sin crear o sin ver, 42501 aunque la hoja sea basura)
begin;
do $$
declare
  solo_ver constant uuid := '00000000-0000-0000-0000-0000000c7a31'; solo_crear constant uuid := '00000000-0000-0000-0000-0000000c7a32';
  o uuid; tok text; r jsonb;
begin
  o := pg_temp.ct_terreno('ct_t5', null);
  perform pg_temp.ct_persona(solo_ver, 'cotizaciones.ver');
  perform pg_temp.ct_persona(solo_crear, 'cotizaciones.crear');
  foreach tok in array array['hola', pg_temp.ct_token(solo_crear, o, pg_temp.ct_version_de(o, 1), now())] loop
    r := pg_temp.ct_corre(solo_ver, format('select public.cotizacion_tabla(''ct_tabla'', null, %L, %L)', o, tok));
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.crear%' then raise exception 'sin crear debía dar 42501 (cotizaciones.crear): %', r; end if;
    r := pg_temp.ct_corre(solo_crear, format('select public.cotizacion_tabla(''ct_tabla'', null, %L, %L)', o, tok));
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'sin ver debía dar 42501 (cotizaciones.ver): %', r; end if;
  end loop;
end $$;
rollback;

-- @test cotizacion_tabla con la hoja abierta: es de una hoja nueva; con una cotización, llamada_invalida, también con la cotización y el origen juntos
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid; tok text; r jsonb;
begin
  o := pg_temp.ct_terreno('ct_t6', null);
  tok := pg_temp.ct_token(duena, o, pg_temp.ct_version_de(o, 1), now());
  r := pg_temp.ct_corre(duena, format('select public.cotizacion_tabla(''ct_tabla'', %L, null, %L)', gen_random_uuid(), tok));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'llamada_invalida' then raise exception 'p_abierta con una cotización debía dar llamada_invalida: %', r; end if;
  r := pg_temp.ct_corre(duena, format('select public.cotizacion_tabla(''ct_tabla'', %L, %L, %L)', gen_random_uuid(), o, tok));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'llamada_invalida' then raise exception 'con abierta, cotización y origen debía ganar llamada_invalida: %', r; end if;
end $$;
rollback;

-- @test cotizacion_tabla: una sola firma (la de cuatro), de authenticated y no de anon ni PUBLIC; su ayudante, de nadie; aplicado_en de cotizaciones.crear la nombra
begin;
do $$
declare
  c_f constant text := 'public.cotizacion_tabla(text,uuid,uuid,text)'; c_v constant text := 'public._cotizacion_tabla_version(uuid,uuid,text)';
begin
  if to_regprocedure('public.cotizacion_tabla(text,uuid,uuid)') is not null then raise exception 'queda la firma de tres argumentos'; end if;
  if (select count(*) from pg_proc p where p.proname = 'cotizacion_tabla' and p.pronamespace = 'public'::regnamespace) <> 1 then raise exception 'cotizacion_tabla tiene más de una firma'; end if;
  if to_regprocedure(c_f) is null or to_regprocedure(c_v) is null then raise exception 'falta la firma de cuatro o el ayudante'; end if;
  if not has_function_privilege('authenticated', c_f, 'execute') or has_function_privilege('anon', c_f, 'execute') then raise exception 'los grants de cotizacion_tabla'; end if;
  if has_function_privilege('authenticated', c_v, 'execute') or has_function_privilege('anon', c_v, 'execute') then raise exception '_cotizacion_tabla_version la ejecuta authenticated o anon'; end if;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid in (to_regprocedure(c_f), to_regprocedure(c_v)) and x.grantee = 0) then
    raise exception 'PUBLIC ejecuta cotizacion_tabla o su ayudante';
  end if;
  if (select p.aplicado_en from public.permisos p where p.clave = 'cotizaciones.crear') not like '%cotizacion_tabla%' then raise exception 'aplicado_en de cotizaciones.crear no nombra cotizacion_tabla'; end if;
end $$;
rollback;
