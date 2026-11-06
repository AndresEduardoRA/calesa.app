-- La papelera de cotizaciones tiene su propia clave, `cotizaciones.papelera.purgar` (paso 4.15-7, 4-87). Antes la gobernaba `vehiculos.papelera.purgar`.
-- Corre después de `cotizaciones-visibilidad.sql`: la dueña es `…0001` (la crea `humo.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   T1. La fila del catálogo (cada campo), que el dueño la tiene con «todos» y sin origen, y el texto nuevo de la de vehículos.
--   T2. Las tres genéricas (`papelera_listar`, `papelera_restaurar`, `papelera_purgar`) piden la clave nueva: con la de vehículos ya no se ve, restaura ni purga lo
--       ajeno; quien envió ve y restaura lo suyo; sin sesión (el job) se purga igual. V y E van antes de crear a K (K nombra la clave nueva, que antes no existía).
--   T3. La migración, ejecutada otra vez sobre una base con roles propios (como la nube): concede la clave al dueño y a todo rol con alguna concesión de la de
--       vehículos, con «todos» y sin origen, a nadie más; y ejecutarla de nuevo no cambia nada. El texto llega en `_migracion_cpp` (`DATOS_DE_PRUEBA`).
--   T4. Ninguna genérica nombra la clave de vehículos, las tres nombran la nueva, y siguen con `prosecdef`, con `search_path = ''` y sin `execute` para anon ni PUBLIC.

-- Una persona activa con un rol propio y estas concesiones (todos los orígenes, alcance «todos»).
create or replace function pg_temp.cpp_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cpp_' || substr(v_id::text, 1, 8), 'CPP ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.cpp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Los lotes de cotizaciones que esa persona ve en papelera_listar, entre estos.
create or replace function pg_temp.cpp_lista(p_quien uuid, p_lotes uuid[]) returns uuid[] language plpgsql as $f$
declare v jsonb := pg_temp.cpp_corre(p_quien, $q$select coalesce(jsonb_agg(distinct l.lote_id), '[]') from public.papelera_listar('cotizaciones') l$q$);
begin
  if v ? 'error' then raise exception 'papelera_listar falló: %', v; end if;
  return array(select x::uuid from jsonb_array_elements_text(v) x where x::uuid = any (p_lotes) order by 1);
end $f$;

-- Da ese error (sqlstate y mensaje exactos).
create or replace function pg_temp.cpp_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Una cotización de esa persona, en un lote de la papelera que envió ella. Devuelve el lote.
create or replace function pg_temp.cpp_en_la_papelera(p_quien uuid, p_origen uuid, p_formula uuid) returns uuid language plpgsql as $f$
declare v_c uuid; v_lote uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (p_origen, p_quien, p_formula, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10) returning id into v_c;
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('cotizaciones', p_quien, '{"cantidad": 1}') returning id into v_lote;
  update public.cotizaciones set eliminado_en = now(), eliminado_por = p_quien, lote_papelera_id = v_lote where id = v_c;
  return v_lote;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.cpp_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cpp_' || substr(gen_random_uuid()::text, 1, 8), 'CPP origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- @test papelera de cotizaciones: la clave está en el catálogo, el dueño la tiene, y la de vehículos ya no habla de cotizaciones (T1)
do $$
declare v_fila jsonb; v_veh jsonb;
begin
  select jsonb_build_object('modulo', p.modulo, 'nombre', p.nombre, 'descripcion', p.descripcion, 'por_origen', p.por_origen, 'con_alcance', p.con_alcance,
      'aplicado_en', p.aplicado_en, 'orden', p.orden, 'nivel_clave', p.nivel_clave)
    into v_fila from public.permisos p where p.clave = 'cotizaciones.papelera.purgar';
  if v_fila is null then raise exception 'no existe la clave cotizaciones.papelera.purgar en el catálogo'; end if;
  if v_fila is distinct from jsonb_build_object('modulo', 'cotizaciones', 'nombre', 'Vaciar la papelera de cotizaciones',
      'descripcion', 'Ver toda la papelera de cotizaciones, restaurar y purgar antes de tiempo', 'por_origen', false, 'con_alcance', false,
      'aplicado_en', 'papelera_* (cotizaciones), policy lotes_papelera', 'orden', 245, 'nivel_clave', null) then
    raise exception 'la fila del catálogo no es la esperada: %', v_fila;
  end if;
  if not exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id
                  where r.clave = 'dueno' and rp.permiso_clave = 'cotizaciones.papelera.purgar' and rp.alcance = 'todos' and rp.origen_id is null) then
    raise exception 'el dueño no tiene cotizaciones.papelera.purgar con «todos» y sin origen';
  end if;
  select jsonb_build_object('nombre', p.nombre, 'descripcion', p.descripcion, 'aplicado_en', p.aplicado_en) into v_veh from public.permisos p where p.clave = 'vehiculos.papelera.purgar';
  if v_veh is distinct from jsonb_build_object('nombre', 'Vaciar la papelera de vehículos', 'descripcion', 'Ver toda la papelera de vehículos, restaurar y purgar antes de tiempo',
      'aplicado_en', 'vehiculos_papelera_*, policy lotes_papelera') then
    raise exception 'la de vehículos no dice lo suyo: %', v_veh;
  end if;
end $$;

-- @test papelera de cotizaciones: con la clave de vehículos no se ve, restaura ni purga lo ajeno; quien envió ve y restaura lo suyo (T2, V y E)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  e jsonb := pg_temp.cpp_origen(); v uuid; ed uuid; l_d uuid; l_e uuid; r jsonb; v_ve uuid[];
begin
  v := pg_temp.cpp_persona(array['vehiculos.papelera.purgar']);
  ed := pg_temp.cpp_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  l_d := pg_temp.cpp_en_la_papelera(duena, (e ->> 'o')::uuid, (e ->> 'f')::uuid);
  l_e := pg_temp.cpp_en_la_papelera(ed, (e ->> 'o')::uuid, (e ->> 'f')::uuid);

  v_ve := pg_temp.cpp_lista(v, array[l_d, l_e]);
  if cardinality(v_ve) <> 0 then raise exception 'V (sólo vehiculos.papelera.purgar) ve % lotes ajenos de cotizaciones en papelera_listar: la clave de vehículos todavía abre la de cotizaciones', cardinality(v_ve); end if;
  perform pg_temp.cpp_da_error('V restaura un lote ajeno', pg_temp.cpp_corre(v, format('select to_jsonb(public.papelera_restaurar(%L))', l_d)),
    '42501', 'Sólo quien lo envió (o quien purga) lo restaura.');
  perform pg_temp.cpp_da_error('V purga un lote ajeno', pg_temp.cpp_corre(v, format('select to_jsonb(public.papelera_purgar(%L))', l_d)),
    '42501', 'Sin permiso para purgar.');
  if (select count(*) from public.cotizaciones where lote_papelera_id = l_d) <> 1 then raise exception 'el lote de la dueña perdió su cotización'; end if;

  v_ve := pg_temp.cpp_lista(ed, array[l_d, l_e]);
  if v_ve is distinct from array[l_e] then raise exception 'E debía ver sólo su lote: %', v_ve; end if;
  perform pg_temp.cpp_da_error('E restaura el lote de la dueña', pg_temp.cpp_corre(ed, format('select to_jsonb(public.papelera_restaurar(%L))', l_d)),
    '42501', 'Sólo quien lo envió (o quien purga) lo restaura.');
  perform pg_temp.cpp_da_error('E purga su propio lote', pg_temp.cpp_corre(ed, format('select to_jsonb(public.papelera_purgar(%L))', l_e)),
    '42501', 'Sin permiso para purgar.');
  r := pg_temp.cpp_corre(ed, format('select to_jsonb(public.papelera_restaurar(%L))', l_e));
  if r is distinct from '1'::jsonb then raise exception 'E no restauró su propio lote: %', r; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: con la clave nueva se ve, restaura y purga lo ajeno; sin sesión (el job) se purga (T2, K)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  e jsonb := pg_temp.cpp_origen(); k uuid; ed uuid; l_d uuid; l_e uuid; l_j uuid; r jsonb; v_ve uuid[];
begin
  k := pg_temp.cpp_persona(array['cotizaciones.papelera.purgar']);
  ed := pg_temp.cpp_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  l_d := pg_temp.cpp_en_la_papelera(duena, (e ->> 'o')::uuid, (e ->> 'f')::uuid);
  l_e := pg_temp.cpp_en_la_papelera(ed, (e ->> 'o')::uuid, (e ->> 'f')::uuid);
  l_j := pg_temp.cpp_en_la_papelera(duena, (e ->> 'o')::uuid, (e ->> 'f')::uuid);

  v_ve := pg_temp.cpp_lista(k, array[l_d, l_e, l_j]);
  if v_ve is distinct from (select array_agg(x order by x) from unnest(array[l_d, l_e, l_j]) x) then raise exception 'K debía ver los tres lotes: %', v_ve; end if;
  r := pg_temp.cpp_corre(k, format('select to_jsonb(public.papelera_restaurar(%L))', l_d));
  if r is distinct from '1'::jsonb then raise exception 'K no restauró el lote de la dueña: %', r; end if;
  r := pg_temp.cpp_corre(k, format('select to_jsonb(public.papelera_purgar(%L))', l_e));
  if r is distinct from '1'::jsonb then raise exception 'K no purgó el lote de E (o no devolvió la cantidad): %', r; end if;
  if exists (select 1 from public.cotizaciones where lote_papelera_id = l_e) then raise exception 'la purga de K dejó la cotización'; end if;

  -- Sin sesión (auth.uid() nulo), como el job: purga sin pedir la clave.
  perform set_config('request.jwt.claim.sub', '', true);
  if public.papelera_purgar(l_j) <> 1 then raise exception 'sin sesión no purgó'; end if;
  if (select purgado_en from public.lotes_papelera where id = l_j) is null then raise exception 'sin sesión el lote no quedó purgado'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la migración concede la clave al dueño y a quien tenía la de vehículos, y volver a ejecutarla no cambia nada (T3)
begin;
do $$
declare
  o uuid := (select id from public.origenes order by clave limit 1); r1 uuid; r2 uuid; v_antes jsonb; v_despues jsonb; v_n int; v_mal text[];
  v_sql text := (select doc #>> '{}' from _migracion_cpp);
begin
  if v_sql is null or v_sql !~ 'cotizaciones\.papelera\.purgar' then raise exception 'la migración del 4.15-7 no llegó o no nombra la clave'; end if;
  select to_jsonb(p) into v_antes from public.permisos p where p.clave = 'cotizaciones.papelera.purgar';
  if v_antes is null then raise exception 'no existe la clave cotizaciones.papelera.purgar en el catálogo'; end if;

  insert into public.roles (clave, nombre) values ('cpp_r1', 'CPP R1') returning id into r1;
  insert into public.roles (clave, nombre) values ('cpp_r2', 'CPP R2') returning id into r2;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (r1, 'vehiculos.papelera.purgar', o, 'propios');
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (r2, 'vehiculos.editar', 'todos');
  delete from public.roles_permisos where permiso_clave = 'cotizaciones.papelera.purgar';
  update public.permisos set nombre = 'pisado', descripcion = 'pisado', aplicado_en = 'pisado' where clave = 'vehiculos.papelera.purgar';

  execute v_sql;

  -- Quién la tiene: el dueño y todo rol con alguna concesión de la de vehículos, con «todos» y sin origen; nadie más.
  select array_agg(r.clave order by r.clave) into v_mal from public.roles r
   where (r.clave = 'dueno' or exists (select 1 from public.roles_permisos x where x.rol_id = r.id and x.permiso_clave = 'vehiculos.papelera.purgar'))
     and not exists (select 1 from public.roles_permisos x where x.rol_id = r.id and x.permiso_clave = 'cotizaciones.papelera.purgar' and x.alcance = 'todos' and x.origen_id is null);
  if v_mal is not null then raise exception 'la migración no concedió la clave con «todos» y sin origen a: %', v_mal; end if;
  select array_agg(distinct r.clave order by r.clave) into v_mal from public.roles r join public.roles_permisos x on x.rol_id = r.id and x.permiso_clave = 'cotizaciones.papelera.purgar'
   where r.clave <> 'dueno' and not exists (select 1 from public.roles_permisos y where y.rol_id = r.id and y.permiso_clave = 'vehiculos.papelera.purgar');
  if v_mal is not null then raise exception 'la migración concedió la clave a roles sin la de vehículos: %', v_mal; end if;
  if (select count(*) from public.roles_permisos where permiso_clave = 'cotizaciones.papelera.purgar' and (alcance <> 'todos' or origen_id is not null)) <> 0 then
    raise exception 'la migración concedió la clave con otro alcance o con origen'; end if;
  if not exists (select 1 from public.roles_permisos where rol_id = r1 and permiso_clave = 'cotizaciones.papelera.purgar') then raise exception 'R1 (la de vehículos en un origen, «propios») no la recibió'; end if;
  if exists (select 1 from public.roles_permisos where rol_id = r2 and permiso_clave = 'cotizaciones.papelera.purgar') then raise exception 'R2 (sin la de vehículos) la recibió'; end if;

  -- La fila del catálogo es la del seed, y la de vehículos vuelve a decir lo suyo.
  select to_jsonb(p) into v_despues from public.permisos p where p.clave = 'cotizaciones.papelera.purgar';
  if v_despues is distinct from v_antes then raise exception 'la migración y el seed no dicen lo mismo de la clave: % contra %', v_despues, v_antes; end if;
  if (select jsonb_build_object('nombre', nombre, 'descripcion', descripcion, 'aplicado_en', aplicado_en) from public.permisos where clave = 'vehiculos.papelera.purgar')
     is distinct from jsonb_build_object('nombre', 'Vaciar la papelera de vehículos', 'descripcion', 'Ver toda la papelera de vehículos, restaurar y purgar antes de tiempo',
       'aplicado_en', 'vehiculos_papelera_*, policy lotes_papelera') then
    raise exception 'la migración no dejó el texto de la de vehículos'; end if;

  -- Otra vez: ni una concesión ni un campo de más.
  select count(*) into v_n from public.roles_permisos where permiso_clave = 'cotizaciones.papelera.purgar';
  execute v_sql;
  if (select count(*) from public.roles_permisos where permiso_clave = 'cotizaciones.papelera.purgar') <> v_n then raise exception 'ejecutarla otra vez duplicó concesiones'; end if;
  if (select to_jsonb(p) from public.permisos p where p.clave = 'cotizaciones.papelera.purgar') is distinct from v_antes then raise exception 'ejecutarla otra vez cambió el catálogo'; end if;
end $$;
rollback;

-- @test papelera de cotizaciones: las genéricas nombran la clave nueva y no la de vehículos, y siguen con prosecdef sin execute para anon ni PUBLIC (T4)
do $$
declare r record; v_n int := 0;
begin
  for r in select f.oid, f.proname, f.prosrc, f.prosecdef, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.prosrc like '%public._papelera_solo_cotizaciones(%' loop
    if r.prosrc like '%''vehiculos.papelera.purgar''%' then raise exception '% todavía nombra vehiculos.papelera.purgar', r.proname; end if;
  end loop;
  for r in select f.oid, f.proname, f.prosrc, f.prosecdef, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.proname in ('papelera_listar', 'papelera_purgar', 'papelera_restaurar') loop
    v_n := v_n + 1;
    if r.prosrc not like '%''cotizaciones.papelera.purgar''%' then raise exception '% no nombra cotizaciones.papelera.purgar', r.proname; end if;
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío: % %', r.proname, r.prosecdef, r.proconfig; end if;
    if has_function_privilege('anon', r.oid, 'execute') then raise exception 'anon puede ejecutar %', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
    if not has_function_privilege('authenticated', r.oid, 'execute') then raise exception 'authenticated perdió execute sobre %', r.proname; end if;
  end loop;
  if v_n <> 3 then raise exception 'esperaba las tres genéricas y hay %', v_n; end if;
end $$;
