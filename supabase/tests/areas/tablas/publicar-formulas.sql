-- Publicar una tabla de referencia publica la N+1 de cada fórmula que la usa (4.23-1, C7, C8 y C12): con la copia congelada nueva y todo lo demás
-- igual, sin tocar el borrador; sólo en los orígenes que la usan (un nodo o la copia congelada), en una compartida sólo donde no hay una propia y con
-- el permiso de cada uno; tras revertir, publicar las mismas filas le devuelve la tabla; y el cálculo de cada versión. Lo demás: `publicar.sql`.
-- docs/COTIZADOR.md › «Las tablas congeladas (D5)». Corre en PGlite (`pnpm db:probar`); cada bloque arma su terreno en su transacción y la revierte.

-- @test tablas: los ayudantes de la N+1
reset role;
create or replace function pg_temp.tf_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

create or replace function pg_temp.tf_persona(p_id uuid, p_nombre text, p_claves text[], p_origenes uuid[]) returns void language plpgsql as $f$
declare v_rol uuid; c text; o uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre, invitacion_aceptada_en = now() where id = p_id;
  delete from public.usuarios_roles where usuario_id = p_id;
  insert into public.roles (clave, nombre) values ('tf_' || substr(p_id::text, 25, 12), 'TF ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    foreach o in array p_origenes loop
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, o, 'todos');
    end loop;
  end loop;
end $f$;

-- El terreno (la publicada de la semilla que usa la comisión por variante, con esa tabla renombrada `tp_comision`):
--   `prueba_tf`  publicada v1 (…b001) que congela `tp_comision` y `tp_suelta` (ningún nodo la nombra); sus tablas `tp_comision`, `tp_suelta`
--                y `tp_nadie` (ni un nodo ni la copia).
--   `prueba_tf2` publicada v1 (…b002) sin copia de `tp_comision` (lee la viva) y sin tabla propia: lee la compartida `tp_comision`.
--   a (Ana Tf) configura y cotiza los dos; u (Uma Tf) configura sólo `prueba_tf`.
create or replace function pg_temp.tf_preparar() returns void language plpgsql as $f$
declare s public.formulas; o uuid; o2 uuid; v_def jsonb; v_par jsonb; v_dis jsonb; v_par2 jsonb; c_cols jsonb;
begin
  select * into s from public.formulas f
   where f.estado = 'publicada' and f.diseno is not null and f.params -> 'tablas' ? 'comision_por_variante'
     and exists (select 1 from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'tabla' = 'comision_por_variante')
   order by f.creado_en, f.id limit 1;
  if s.id is null then raise exception 'la semilla no trae una publicada que congele y use la comisión por variante'; end if;
  v_def := replace(s.definicion::text, '"comision_por_variante"', '"tp_comision"')::jsonb;
  v_par := replace(s.params::text, '"comision_por_variante"', '"tp_comision"')::jsonb;
  v_dis := replace(s.diseno::text, '"comision_por_variante"', '"tp_comision"')::jsonb;
  v_par2 := v_par || jsonb_build_object('tablas', (v_par -> 'tablas') - 'tp_comision');
  v_par := v_par || jsonb_build_object('tablas', (v_par -> 'tablas') || '{"tp_suelta": [{"k": 1}]}');
  insert into public.origenes (clave, nombre) values ('prueba_tf', 'Prueba tf') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_tf2', 'Prueba tf2') returning id into o2;
  perform pg_temp.tf_persona('00000000-0000-4000-8000-00000000b00a', 'Ana Tf', array['cotizaciones.configurar', 'cotizaciones.crear', 'cotizaciones.ver'], array[o, o2]);
  perform pg_temp.tf_persona('00000000-0000-4000-8000-00000000b00c', 'Uma Tf', array['cotizaciones.configurar'], array[o]);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select ur.rol_id, k, null, 'todos' from public.usuarios_roles ur, unnest(array['leads.ver', 'vehiculos.ver']) k
   where ur.usuario_id = '00000000-0000-4000-8000-00000000b00a';
  insert into public.formulas (id, origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  values ('00000000-0000-4000-8000-00000000b001', o, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, true), 'v1', now()),
         ('00000000-0000-4000-8000-00000000b002', o2, 1, 'publicada', v_def, v_par2, v_dis, public._preparar_publicacion(v_def, v_par2, v_dis, true), 'v1', now());
  c_cols := '[{"clave":"variante","etiqueta":"Variante","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]';
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values
    (o, 'tp_comision', 'Comisión tf', c_cols), (null, 'tp_comision', 'Comisión compartida', c_cols),
    (o, 'tp_suelta', 'Suelta', '[{"clave":"k","etiqueta":"K","tipo":"numero"}]'), (o, 'tp_nadie', 'Nadie', '[{"clave":"k","etiqueta":"K","tipo":"numero"}]');
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select r.id, f.valor, (f.n - 1)::smallint
    from public.tablas_referencia r cross join lateral jsonb_array_elements(v_par -> 'tablas' -> 'tp_comision') with ordinality f (valor, n)
   where r.clave = 'tp_comision';
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) select id, '{"k": 1}', 0 from public.tablas_referencia where clave in ('tp_suelta', 'tp_nadie');
end $f$;

create or replace function pg_temp.tf_o(p_clave text) returns uuid language sql as $f$ select id from public.origenes where clave = p_clave $f$;
-- La tabla `p_clave` del origen (nulo: la compartida).
create or replace function pg_temp.tf_t(p_clave text, p_origen uuid) returns uuid language sql as $f$
  select id from public.tablas_referencia where clave = p_clave and origen_id is not distinct from p_origen
$f$;
create or replace function pg_temp.tf_pub(p_origen uuid) returns public.formulas language sql as $f$
  select * from public.formulas where origen_id = p_origen and estado = 'publicada'
$f$;
create or replace function pg_temp.tf_filas(p_tabla uuid, p_moto numeric) returns jsonb language sql as $f$
  select jsonb_agg(case when f.valores ->> 'variante' = 'moto' then f.valores || jsonb_build_object('monto', p_moto) else f.valores end order by f.orden, f.id)
    from public.tablas_referencia_filas f where f.tabla_id = p_tabla
$f$;
create or replace function pg_temp.tf_publicar(p_quien uuid, p_tabla uuid, p_filas jsonb, p_version int) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.tf_como(p_quien);
  set local role authenticated;
  r := public.tabla_referencia_publicar(p_tabla, p_filas, 'Prueba tf', p_version);
  reset role;
  return r;
end $f$;
create or replace function pg_temp.tf_error(p_quien uuid, p_tabla uuid, p_filas jsonb, p_version int) returns text language plpgsql as $f$
begin
  perform pg_temp.tf_publicar(p_quien, p_tabla, p_filas, p_version);
  return 'sin error';
exception when others then
  return sqlstate || '|' || sqlerrm;
end $f$;
-- Corre un SQL como esa persona y, si falla, dice por qué.
create or replace function pg_temp.tf_igual_cot(p_quien uuid, p_sql text) returns void language plpgsql as $f$
declare v_m text;
begin
  perform pg_temp.tf_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
exception when others then
  get stacked diagnostics v_m = message_text;
  raise exception 'guardar la cotización falló: % %', sqlstate, v_m;
end $f$;
-- La comisión de la moto con esa versión de la fórmula (la llama Ana: cotizaciones.crear del origen).
create or replace function pg_temp.tf_comision(p_formula uuid) returns numeric language plpgsql as $f$
declare v numeric;
begin
  perform pg_temp.tf_como('00000000-0000-4000-8000-00000000b00a');
  select (public.evaluar_formula(a.definicion, a.params, a.entrada, null) -> 'valores' ->> 'comision')::numeric into v
    from public._cotizacion_armar('{"variante": "moto"}', null, (select origen_id from public.formulas where id = p_formula), null, p_formula) a;
  return v;
end $f$;

-- @test tablas: la N+1 lleva la copia nueva y todo lo demás igual (las otras copias, los params, la definición y el diseño), sin tocar el borrador
begin;
select pg_temp.tf_preparar();
do $$
declare o uuid := pg_temp.tf_o('prueba_tf'); t uuid; p0 public.formulas; p1 public.formulas; b0 text; v_filas jsonb; r jsonb;
begin
  t := pg_temp.tf_t('tp_comision', o);
  p0 := pg_temp.tf_pub(o);
  insert into public.formulas (origen_id, estado, definicion, params, diseno, version_origen_id) values (o, 'borrador', p0.definicion, p0.params, p0.diseno, p0.id);
  b0 := (select to_jsonb(f)::text from public.formulas f where origen_id = o and estado = 'borrador');
  v_filas := pg_temp.tf_filas(t, 451);
  r := pg_temp.tf_publicar('00000000-0000-4000-8000-00000000b00a', t, v_filas, 1);
  p1 := pg_temp.tf_pub(o);
  if p1.id = p0.id or p1.version <> 2 or p1.version_origen_id <> p0.id or (select estado from public.formulas where id = p0.id) <> 'archivada' then
    raise exception 'no hubo N+1 sobre la v1'; end if;
  if p1.params -> 'tablas' -> 'tp_comision' <> v_filas then raise exception 'la N+1 no congeló las filas nuevas'; end if;
  if (p1.params -> 'tablas') - 'tp_comision' <> (p0.params -> 'tablas') - 'tp_comision' then raise exception 'la N+1 pisó las otras copias congeladas'; end if;
  if p1.params - 'tablas' <> p0.params - 'tablas' or p1.definicion <> p0.definicion or p1.diseno <> p0.diseno then
    raise exception 'la N+1 cambió los params, la definición o el diseño'; end if;
  if p1.nota <> 'Tabla «Comisión tf» versión 2: Prueba tf' then raise exception 'la nota de la N+1 es %', p1.nota; end if;
  if (select to_jsonb(f)::text from public.formulas f where origen_id = o and estado = 'borrador') <> b0 then raise exception 'publicar la tabla tocó el borrador'; end if;
  if r -> 'formulas' <> jsonb_build_array(jsonb_build_object('origen_id', o, 'version', 2)) then raise exception 'la respuesta no nombra la N+1: %', r; end if;
  if not exists (select 1 from public.actividad where accion = 'formula.publicada' and registro_id = p1.id::text
                   and despues @> '{"tabla": "tp_comision", "version_tabla": 2}') then raise exception 'la N+1 no dejó su actividad'; end if;
  -- La compartida y el otro origen, quietos.
  if (select version from public.tablas_referencia where id = pg_temp.tf_t('tp_comision', null)) <> 1
     or (pg_temp.tf_pub(pg_temp.tf_o('prueba_tf2'))).version <> 1 then raise exception 'publicar la del origen tocó la compartida'; end if;
end $$;
rollback;

-- @test tablas: recibe la N+1 la publicada que sólo la congeló (sin nodo); no la recibe la que ni la nombra ni la congeló
begin;
select pg_temp.tf_preparar();
do $$
declare o uuid := pg_temp.tf_o('prueba_tf'); a uuid := '00000000-0000-4000-8000-00000000b00a'; r jsonb;
begin
  r := pg_temp.tf_publicar(a, pg_temp.tf_t('tp_suelta', o), '[{"k": 2}]', 1);
  if r -> 'formulas' <> jsonb_build_array(jsonb_build_object('origen_id', o, 'version', 2))
     or (pg_temp.tf_pub(o)).params -> 'tablas' -> 'tp_suelta' <> '[{"k": 2}]' then raise exception 'la congelada sin nodo no recibió la N+1: %', r; end if;
  r := pg_temp.tf_publicar(a, pg_temp.tf_t('tp_nadie', o), '[{"k": 2}]', 1);
  if r <> '{"version": 2, "formulas": []}' or (pg_temp.tf_pub(o)).version <> 2 then raise exception 'una tabla que nadie usa dio N+1: %', r; end if;
end $$;
rollback;

-- @test tablas: una compartida da la N+1 sólo en el origen sin tabla propia, y pide el permiso de cada origen que la usa
begin;
select pg_temp.tf_preparar();
do $$
declare o uuid := pg_temp.tf_o('prueba_tf'); o2 uuid := pg_temp.tf_o('prueba_tf2'); ts uuid := pg_temp.tf_t('tp_comision', null);
        v_filas jsonb; r jsonb; v_antes text;
begin
  v_filas := pg_temp.tf_filas(ts, 471);
  v_antes := (select jsonb_agg(to_jsonb(f) order by f.id)::text from public.formulas f where f.origen_id in (o, o2));
  -- Uma configura sólo `prueba_tf`, que no la usa (tiene la suya): `prueba_tf2` sí, y le falta su permiso.
  if pg_temp.tf_error('00000000-0000-4000-8000-00000000b00c', ts, v_filas, 1) <> '42501|No tienes el permiso «cotizaciones.configurar».' then
    raise exception 'publicar una compartida sin el permiso de un origen que la usa no dio 42501'; end if;
  if (select version from public.tablas_referencia where id = ts) <> 1
     or (select jsonb_agg(to_jsonb(f) order by f.id)::text from public.formulas f where f.origen_id in (o, o2)) <> v_antes then
    raise exception 'el 42501 dejó algo cambiado'; end if;
  r := pg_temp.tf_publicar('00000000-0000-4000-8000-00000000b00a', ts, v_filas, 1);
  if r -> 'formulas' <> jsonb_build_array(jsonb_build_object('origen_id', o2, 'version', 2)) then raise exception 'la compartida no dio la N+1 sólo en prueba_tf2: %', r; end if;
  if (pg_temp.tf_pub(o2)).params -> 'tablas' -> 'tp_comision' <> v_filas then raise exception 'la N+1 de prueba_tf2 no congeló la compartida'; end if;
  if (pg_temp.tf_pub(o)).version <> 1 then raise exception 'la compartida dio N+1 en un origen con tabla propia'; end if;
end $$;
rollback;

-- @test tablas: tras revertir la fórmula, publicar las mismas filas vivas le devuelve la tabla (N+1, no «La tabla no cambió.»)
begin;
select pg_temp.tf_preparar();
do $$
declare o uuid := pg_temp.tf_o('prueba_tf'); t uuid; a uuid := '00000000-0000-4000-8000-00000000b00a'; v_filas jsonb; p2 public.formulas;
begin
  t := pg_temp.tf_t('tp_comision', o);
  v_filas := pg_temp.tf_filas(t, 452);
  perform pg_temp.tf_publicar(a, t, v_filas, 1);
  p2 := pg_temp.tf_pub(o);
  perform pg_temp.tf_como(a);
  perform public.formula_revertir(o, '00000000-0000-4000-8000-00000000b001', 'Volver a la v1', p2.id);
  if (pg_temp.tf_pub(o)).params -> 'tablas' -> 'tp_comision' = v_filas then raise exception 'revertir no devolvió la copia vieja'; end if;
  perform pg_temp.tf_publicar(a, t, v_filas, 2);
  if (pg_temp.tf_pub(o)).version <> 4 or (pg_temp.tf_pub(o)).params -> 'tablas' -> 'tp_comision' <> v_filas then
    raise exception 'publicar las filas vivas tras revertir no dio la N+1 con ellas'; end if;
end $$;
rollback;

-- @test tablas: dinero: la N+1 calcula con la fila nueva; la versión anterior que congeló, con la de antes; la que leía la viva, con la nueva; lo guardado no cambia
begin;
select pg_temp.tf_preparar();
do $$
declare o uuid := pg_temp.tf_o('prueba_tf'); o2 uuid := pg_temp.tf_o('prueba_tf2'); a uuid := '00000000-0000-4000-8000-00000000b00a'; v_antes numeric;
        v_cot uuid := gen_random_uuid(); v_lead uuid; v_veh uuid; v_guardada jsonb;
begin
  v_antes := pg_temp.tf_comision('00000000-0000-4000-8000-00000000b001');
  if v_antes is null or v_antes = 453 then raise exception 'la comisión de la moto de la semilla no sirve para la prueba: %', v_antes; end if;
  if pg_temp.tf_comision('00000000-0000-4000-8000-00000000b002') <> v_antes then raise exception 'la que lee la compartida no calcula como la congelada'; end if;
  -- Del origen, congelada: la v1 sigue con su copia y la N+1 calcula con la nueva.
  perform pg_temp.tf_publicar(a, pg_temp.tf_t('tp_comision', o), pg_temp.tf_filas(pg_temp.tf_t('tp_comision', o), 453), 1);
  if pg_temp.tf_comision((pg_temp.tf_pub(o)).id) <> 453 then raise exception 'la N+1 no calcula con la fila nueva'; end if;
  if pg_temp.tf_comision('00000000-0000-4000-8000-00000000b001') <> v_antes then raise exception 'la v1 congelada cambió su cifra'; end if;
  -- Una cotización guardada de `prueba_tf2` con su v1, que lee la compartida viva.
  insert into public.leads (nombre, telefono_principal, creado_por) values ('TF lead', '59871234567', a) returning id into v_lead;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo) values (o2, 'tipo_vehiculo', 'Tipo', 'texto');
  insert into public.vehiculos (origen_id, titulo, marca, anio, atributos) values (o2, 'TF vehículo', 'toyota', 2022, '{"tipo_vehiculo": "autos"}') returning id into v_veh;
  perform pg_temp.tf_como(a);
  perform pg_temp.tf_igual_cot(a, format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L, null, null, %L::public.clase_cotizacion)',
    v_cot, o2, v_lead, '{"variante": "moto", "inputs": {"remate": 14200}}', public._cotizacion_abierta_firmar(o2, '00000000-0000-4000-8000-00000000b002', now()), v_veh, 'preventa'));
  select jsonb_build_object('formula_id', formula_id, 'valores', valores, 'totales', totales, 'total_base', total_base, 'actualizado_en', actualizado_en)
    into v_guardada from public.cotizaciones where id = v_cot;
  if (v_guardada -> 'valores' ->> 'comision')::numeric is distinct from v_antes then raise exception 'la guardada no tiene la comisión de antes: %', v_guardada -> 'valores'; end if;
  -- La compartida: la v1 de `prueba_tf2` leía la viva y recalcula con la nueva; lo guardado de la cotización no cambia (manda su snapshot).
  perform pg_temp.tf_publicar(a, pg_temp.tf_t('tp_comision', null), pg_temp.tf_filas(pg_temp.tf_t('tp_comision', null), 454), 1);
  if pg_temp.tf_comision((pg_temp.tf_pub(o2)).id) <> 454 then raise exception 'la N+1 de la compartida no calcula con la fila nueva'; end if;
  if pg_temp.tf_comision('00000000-0000-4000-8000-00000000b002') <> 454 then raise exception 'la v1 que leía la viva no recalcula con la fila nueva'; end if;
  if (select jsonb_build_object('formula_id', formula_id, 'valores', valores, 'totales', totales, 'total_base', total_base, 'actualizado_en', actualizado_en)
        from public.cotizaciones where id = v_cot) <> v_guardada then raise exception 'publicar la compartida cambió lo guardado de una cotización'; end if;
end $$;
rollback;
