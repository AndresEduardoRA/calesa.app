-- El dato del vehículo de una celda de tabla (paso 4.14-2c2): `cotizacion_hoja()` dice, en cada celda de un nodo `tabla` que quien mira ve, qué columna de su tabla casa con
-- qué dato del vehículo (`dato_del_vehiculo: {tabla, columnas: [{columna, campo}]}`), y `cotizacion_tabla()` le da las filas de esa columna. Un valor de `match` que nombra un
-- nodo nunca viaja, aunque coincida con la clave de un campo activo (D7). docs/COTIZADOR.md › «La lectura que abre la hoja (4.13-1)».
-- Corre después de `cotizacion-tabla.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte. Compara claves y hojas, nunca texto suelto.

create or replace function pg_temp.dv_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.dv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform pg_temp.dv_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    reset role;
    return jsonb_build_object('error', sqlstate, 'mensaje', sqlerrm);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos)}.
create or replace function pg_temp.dv_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('dv_' || substr(p_id::text, 25, 12), 'DV ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.dv_conc(variadic p_claves text[]) returns jsonb language sql as $f$
  select coalesce(jsonb_agg(jsonb_build_object('clave', c)), '[]'::jsonb) from unnest(p_claves) c
$f$;

-- Todas las claves de objeto y todas las hojas de texto de una respuesta, a cualquier profundidad.
create or replace function pg_temp.dv_textos(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(distinct t), '{}') from (
    select jsonb_object_keys(h) as t from jsonb_path_query(p, 'strict $.**') h where jsonb_typeof(h) = 'object'
    union all select h #>> '{}' from jsonb_path_query(p, 'strict $.**') h where jsonb_typeof(h) = 'string') x
$f$;

-- Nodo → `dato_del_vehiculo` de cada celda que lo trae (`{}` si ninguna).
create or replace function pg_temp.dv_datos(p jsonb) returns jsonb language sql as $f$
  select coalesce(jsonb_object_agg(i ->> 'nodo', i -> 'dato_del_vehiculo'), '{}'::jsonb)
    from jsonb_path_query(p, 'strict $.secciones[*].items[*]') i where i ->> 'tipo' = 'celda' and i ? 'dato_del_vehiculo'
$f$;

create or replace function pg_temp.dv_dato(p_tabla text, variadic p_pares text[]) returns jsonb language sql as $f$
  select jsonb_build_object('tabla', p_tabla, 'columnas', jsonb_agg(jsonb_build_object('columna', p_pares[i], 'campo', p_pares[i + 1]) order by i))
    from generate_series(1, cardinality(p_pares), 2) i
$f$;

create or replace function pg_temp.dv_campo(p_origen uuid, p_clave text, p_activo boolean) returns void language sql as $f$
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, activo) values (p_origen, p_clave, initcap(p_clave), 'texto', p_activo)
$f$;

-- Una tabla viva del origen (activa o no) con sus filas (cada una activa o no).
create or replace function pg_temp.dv_viva(p_origen uuid, p_clave text, p_activa boolean, p_filas jsonb, p_filas_activas boolean) returns void language plpgsql as $f$
declare v uuid;
begin
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas, activa)
  values (p_origen, p_clave, 'DV ' || p_clave, '[{"clave": "tipo", "etiqueta": "Tipo", "tipo": "texto"}, {"clave": "monto", "etiqueta": "Monto", "tipo": "numero"}]', p_activa) returning id into v;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden, activa)
  select v, f.value, f.ord::smallint, p_filas_activas from jsonb_array_elements(p_filas) with ordinality f (value, ord);
end $f$;

-- Una fórmula publicada por el camino de publicar: cada nodo `tabla` en una celda abierta, con `p_nodos` antes del total y `p_tablas` congeladas.
create or replace function pg_temp.dv_publicar(p_origen uuid, p_nodos jsonb, p_tablas jsonb, p_secciones jsonb) returns uuid language plpgsql as $f$
declare v_def jsonb; v_par jsonb; v_dis jsonb; v_id uuid;
begin
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'))
             || p_nodos
             || jsonb_build_array(jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'etiqueta', 'Total', 'salida', 'total',
                  'de', (select jsonb_agg(n ->> 'id') from jsonb_array_elements(p_nodos) n where n ->> 'tipo' in ('tabla', 'input')))),
    'buckets', jsonb_build_object('origen', 'tc'), 'total_en', 'tc',
    'grupos', jsonb_build_array(jsonb_build_object('id', 'g', 'etiqueta', 'G', 'plazo', '1 día', 'tono', 'verde', 'bucket', 'origen')));
  v_par := jsonb_build_object('tablas', p_tablas);
  v_dis := jsonb_build_object('cabecera', jsonb_build_object('ver_total_bs', false, 'modos', '[]'::jsonb), 'secciones', p_secciones, 'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (p_origen, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false)) returning id into v_id;
  return v_id;
end $f$;

create or replace function pg_temp.dv_tabla(p_id text, p_tabla text, p_match jsonb) returns jsonb language sql as $f$
  select jsonb_build_object('id', p_id, 'tipo', 'tabla', 'tabla', p_tabla, 'match', p_match, 'columna', 'monto', 'etiqueta', 'T ' || p_id, 'grupo', 'g')
$f$;

-- T2: las reglas. El origen tiene activos `xtipo` y `xvar` (también el id de la variante), inactivo `xapagado`, y `xotro` activo sólo en `p_otro`.
create or replace function pg_temp.dv_reglas(p_origen uuid, p_otro uuid) returns uuid language plpgsql as $f$
declare v_nodos jsonb; v_fila jsonb := '[{"tipo": "k1", "variante": "a", "monto": 1}]';
begin
  perform pg_temp.dv_campo(p_origen, 'xtipo', true);
  perform pg_temp.dv_campo(p_origen, 'xvar', true);
  perform pg_temp.dv_campo(p_origen, 'xapagado', false);
  perform pg_temp.dv_campo(p_otro, 'xotro', true);
  perform pg_temp.dv_viva(p_origen, 'dv_viva', true, v_fila, true);
  perform pg_temp.dv_viva(p_origen, 'dv_viva_inact', false, v_fila, true);
  perform pg_temp.dv_viva(p_origen, 'dv_cong_inact', false, v_fila, true);
  perform pg_temp.dv_viva(p_origen, 'dv_viva_vacia', true, v_fila, false);
  -- Referencia hacia adelante (validar_formula): la variante `xvar` va antes que `t_dir`, y `anio` antes que `t_nodo`.
  v_nodos := jsonb_build_array(
    jsonb_build_object('id', 'xvar', 'tipo', 'opcion', 'etiqueta', 'Variante', 'por_defecto', 'a', 'opciones', jsonb_build_array(jsonb_build_object('clave', 'a', 'etiqueta', 'A', 'titulo', 'TA'), jsonb_build_object('clave', 'b', 'etiqueta', 'B', 'titulo', 'TB'))),
    jsonb_build_object('id', 'anio', 'tipo', 'campo_vehiculo', 'campo', 'anio', 'etiqueta', 'Año', 'formato', 'raw'),
    pg_temp.dv_tabla('t_dir', 'dv_dir', '{"tipo": "xtipo", "variante": "xvar"}'),
    pg_temp.dv_tabla('t_dos', 'dv_dos', '{"zz": "xtipo", "anio": "marca", "a_z": "modelo"}'),
    pg_temp.dv_tabla('t_nodo', 'dv_nodo', '{"anio": "anio"}'),
    pg_temp.dv_tabla('t_inact', 'dv_inact', '{"tipo": "xapagado"}'),
    pg_temp.dv_tabla('t_nada', 'dv_nada', '{"tipo": "xnoexiste"}'),
    pg_temp.dv_tabla('t_otro', 'dv_otro', '{"tipo": "xotro"}'),
    pg_temp.dv_tabla('t_sin', 'dv_sin', '{"tipo": "xtipo"}'),
    pg_temp.dv_tabla('t_viva', 'dv_viva', '{"tipo": "xtipo"}'),
    pg_temp.dv_tabla('t_viva_inact', 'dv_viva_inact', '{"tipo": "xtipo"}'),
    pg_temp.dv_tabla('t_cong', 'dv_cong', '{"tipo": "xtipo"}'),
    pg_temp.dv_tabla('t_cong_inact', 'dv_cong_inact', '{"tipo": "xtipo"}'),
    pg_temp.dv_tabla('t_cong_vacia', 'dv_cong_vacia', '{"tipo": "xtipo"}'),
    pg_temp.dv_tabla('t_viva_vacia', 'dv_viva_vacia', '{"tipo": "xtipo"}'));
  return pg_temp.dv_publicar(p_origen, v_nodos,
    jsonb_build_object('dv_dir', v_fila, 'dv_dos', '[{"zz": "k1", "anio": "m", "a_z": "x", "monto": 1}]'::jsonb, 'dv_nodo', '[{"anio": 2020, "monto": 1}]'::jsonb,
                       'dv_inact', v_fila, 'dv_nada', v_fila, 'dv_otro', v_fila, 'dv_cong', v_fila, 'dv_cong_inact', v_fila, 'dv_cong_vacia', '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('id', 'abierta', 'titulo', 'Abierta', 'presentacion', 'principal', 'items',
      '[{"tipo": "variante", "nodo": "xvar"}]'::jsonb
      || (select jsonb_agg(jsonb_build_object('tipo', 'celda', 'nodo', n ->> 'id', 'ancho', 'mitad') order by o) from jsonb_array_elements(v_nodos) with ordinality x (n, o) where n ->> 'tipo' = 'tabla'))));
end $f$;

-- T3: lo oculto. El origen tiene activos `xtipo` y `xoculto`; `xoculto` es también un input del nivel, y la celda abierta `pub_veh` casa `oculto` con él.
create or replace function pg_temp.dv_nivel(p_origen uuid, p_nivel text, p_tag text) returns uuid language plpgsql as $f$
begin
  perform pg_temp.dv_campo(p_origen, 'xtipo', true);
  perform pg_temp.dv_campo(p_origen, 'xoculto', true);
  return pg_temp.dv_publicar(p_origen,
    jsonb_build_array(jsonb_build_object('id', 'xoculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'grupo', 'g'),
                      pg_temp.dv_tabla('x_veh', 'chv_' || p_tag, jsonb_build_object('xcol_' || p_tag, 'marca')),
                      pg_temp.dv_tabla('pub_veh', 'dv_pub', '{"tipo": "xtipo", "oculto": "xoculto"}')),
    jsonb_build_object('chv_' || p_tag, jsonb_build_array(jsonb_build_object('xcol_' || p_tag, 'm', 'monto', 1)), 'dv_pub', '[{"tipo": "k1", "oculto": 5, "monto": 1}]'::jsonb),
    jsonb_build_array(
      jsonb_build_object('id', 'abierta', 'titulo', 'Abierta', 'presentacion', 'principal', 'items', '[{"tipo": "celda", "nodo": "pub_veh", "ancho": "mitad"}]'::jsonb),
      jsonb_build_object('id', 'del_nivel', 'titulo', 'Nivel', 'presentacion', 'principal', 'nivel_ver', p_nivel, 'nivel_editar', p_nivel, 'items',
                         '[{"tipo": "celda", "nodo": "xoculto", "ancho": "mitad"}, {"tipo": "celda", "nodo": "x_veh", "ancho": "mitad"}]'::jsonb)));
end $f$;

-- Las personas de la matriz por nivel (las de cotizacion-hoja.sql, sin `solo_crear`, que no abre la hoja): nombre → id, creadas para ese nivel y ese origen ajeno.
create or replace function pg_temp.dv_personas(p_nivel text, p_otro_nivel text, p_o2 uuid) returns jsonb language plpgsql as $f$
declare v jsonb := '{}'; v_id uuid; v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver']; c jsonb; v_n text;
begin
  for v_n, c in select * from jsonb_each(jsonb_build_object(
      'sin', pg_temp.dv_conc(variadic v_base),
      'ed', pg_temp.dv_conc(variadic v_base || array['cotizaciones.nivel.' || p_nivel || '.editar']),
      'cfg', pg_temp.dv_conc(variadic v_base || array['cotizaciones.configurar']),
      'otro', pg_temp.dv_conc(variadic v_base || array['cotizaciones.nivel.' || p_otro_nivel || '.ver', 'cotizaciones.nivel.' || p_otro_nivel || '.editar']),
      'ajeno', pg_temp.dv_conc(variadic v_base) || jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.nivel.' || p_nivel || '.ver', 'origen', p_o2)),
      'solo_ver', pg_temp.dv_conc(variadic v_base || array['cotizaciones.nivel.' || p_nivel || '.ver']),
      'con', pg_temp.dv_conc(variadic v_base || array['cotizaciones.nivel.' || p_nivel || '.ver', 'cotizaciones.nivel.' || p_nivel || '.editar']),
      'ver_como', pg_temp.dv_conc(variadic v_base || array['cotizaciones.nivel.' || p_nivel || '.ver', 'cotizaciones.nivel.' || p_nivel || '.editar', 'equipo.roles.gestionar']))) loop
    v_id := gen_random_uuid();
    perform pg_temp.dv_persona(v_id, c);
    v := v || jsonb_build_object(v_n, v_id);
  end loop;
  return v;
end $f$;

-- T4: cada dato que llega con esa hoja, con sus filas por `cotizacion_tabla` y la hoja abierta de esa lectura. Devuelve cuántos recorrió, o cae.
create or replace function pg_temp.dv_coherente(p_quien uuid, p_o uuid, p_contexto text) returns int language plpgsql as $f$
declare r jsonb; t jsonb; d record; c jsonb; v_n int := 0;
begin
  r := pg_temp.dv_corre(p_quien, format('select public.cotizacion_hoja(%L)', p_o));
  for d in select e.key as nodo, e.value as dato from jsonb_each(pg_temp.dv_datos(r)) e loop
    v_n := v_n + 1;
    t := pg_temp.dv_corre(p_quien, format('select public.cotizacion_tabla(%L, null, %L, %L)', d.dato ->> 'tabla', p_o, r ->> 'abierta'));
    if t ? 'error' then raise exception 'T4 %: % recibe el dato y cotizacion_tabla le da %', p_contexto, d.nodo, t; end if;
    if (d.nodo in ('t_cong_vacia', 't_viva_vacia')) <> (jsonb_array_length(t -> 'filas') = 0) then raise exception 'T4 %: las filas de %: %', p_contexto, d.nodo, t -> 'filas'; end if;
    for c in select * from jsonb_array_elements(d.dato -> 'columnas') loop
      if exists (select 1 from jsonb_array_elements(t -> 'filas') f where not f ? (c ->> 'columna')) then
        raise exception 'T4 %: una fila de % no trae la columna %: %', p_contexto, d.nodo, c ->> 'columna', t -> 'filas';
      end if;
    end loop;
  end loop;
  return v_n;
end $f$;

-- @test dato_del_vehiculo: T1 la semilla. En subasta_usa y planilla_usa, sólo las dos celdas de transporte traen el dato (tipo ← tipo_vehiculo), para la dueña y una asesora sin «costos»; en oficina, ninguna; las filas, por cotizacion_tabla
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  a constant uuid := '00000000-0000-0000-0000-000000000d01';
  v_clave text; o uuid; v_quien uuid; r jsonb; t jsonb; v_esperado jsonb; v_claves text[];
begin
  perform pg_temp.dv_persona(a, pg_temp.dv_conc('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver'));
  foreach v_clave in array array['subasta_usa', 'planilla_usa', 'oficina'] loop
    select x.id into o from public.origenes x where x.clave = v_clave;
    v_esperado := case when v_clave = 'oficina' then '{}'::jsonb else jsonb_build_object(
      'transporte_bolivia', pg_temp.dv_dato('transporte_usa_bolivia', 'tipo', 'tipo_vehiculo'), 'transporte_chile', pg_temp.dv_dato('transporte_usa_chile', 'tipo', 'tipo_vehiculo')) end;
    foreach v_quien in array array[duena, a] loop
      r := pg_temp.dv_corre(v_quien, format('select public.cotizacion_hoja(%L)', o));
      if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'T1 %: no abre la hoja: %', v_clave, left(r::text, 300); end if;
      if pg_temp.dv_datos(r) = '{}'::jsonb and v_clave <> 'oficina' then raise exception 'T1 %: ninguna celda llega con su dato, sin dato_del_vehiculo', v_clave; end if;
      if pg_temp.dv_datos(r) is distinct from v_esperado then raise exception 'T1 %: los datos del vehículo: % contra %', v_clave, pg_temp.dv_datos(r), v_esperado; end if;
      continue when v_clave = 'oficina';
      t := pg_temp.dv_corre(v_quien, format('select public.cotizacion_tabla(%L, null, %L, %L)', 'transporte_usa_bolivia', o, r ->> 'abierta'));
      v_claves := array(select f.value ->> 'tipo' from public.formulas x, jsonb_array_elements(x.params -> 'tablas' -> 'transporte_usa_bolivia') with ordinality f (value, ord)
                         where x.origen_id = o and x.estado = 'publicada' order by f.ord);
      if t ? 'error' or not exists (select 1 from jsonb_array_elements(t -> 'columnas') c where c ->> 'clave' = 'tipo') or cardinality(v_claves) <> 8
         or array(select f ->> 'tipo' from jsonb_array_elements(t -> 'filas') f) is distinct from v_claves then
        raise exception 'T1 %: cotizacion_tabla no da la columna tipo con sus 8 claves: % contra %', v_clave, left(t::text, 400), v_claves;
      end if;
    end loop;
  end loop;
end $$;
rollback;

-- @test dato_del_vehiculo: T2 las reglas. Viaja un valor de match que no es un nodo y es una columna del vehículo o un campo activo del origen, de una tabla congelada o viva y activa, ordenado con collate "C"
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  a constant uuid := '00000000-0000-0000-0000-000000000d02';
  o uuid; o2 uuid; v_quien uuid; r jsonb; v_esperado jsonb;
begin
  insert into public.origenes (clave, nombre) values ('dv_reglas', 'DV reglas') returning id into o;
  insert into public.origenes (clave, nombre) values ('dv_reglas_otro', 'DV reglas otro') returning id into o2;
  perform pg_temp.dv_reglas(o, o2);
  perform pg_temp.dv_persona(a, pg_temp.dv_conc('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver'));
  v_esperado := jsonb_build_object(
    't_dir', pg_temp.dv_dato('dv_dir', 'tipo', 'xtipo'),
    't_dos', pg_temp.dv_dato('dv_dos', 'a_z', 'modelo', 'anio', 'marca', 'zz', 'xtipo'),
    't_viva', pg_temp.dv_dato('dv_viva', 'tipo', 'xtipo'),
    't_cong', pg_temp.dv_dato('dv_cong', 'tipo', 'xtipo'),
    't_cong_inact', pg_temp.dv_dato('dv_cong_inact', 'tipo', 'xtipo'),
    't_cong_vacia', pg_temp.dv_dato('dv_cong_vacia', 'tipo', 'xtipo'),
    't_viva_vacia', pg_temp.dv_dato('dv_viva_vacia', 'tipo', 'xtipo'));
  foreach v_quien in array array[duena, a] loop
    r := pg_temp.dv_corre(v_quien, format('select public.cotizacion_hoja(%L)', o));
    if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'T2: no abre la hoja: %', left(r::text, 300); end if;
    if pg_temp.dv_datos(r) is distinct from v_esperado then
      raise exception 'T2: los datos del vehículo: % contra %', pg_temp.dv_datos(r), v_esperado;
    end if;
  end loop;
end $$;
rollback;

-- @test dato_del_vehiculo: T3 por cada nivel (los de fábrica y uno creado), la celda abierta nunca nombra un nodo oculto aunque su id sea un campo activo; sin el nivel no llega nada de la celda del nivel; con él, su dato
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_nuevo uuid := gen_random_uuid(); v_nivel text; v_i int := 0; v_tag text; o uuid; o2 uuid; v_p jsonb; v_n text; r jsonb; v_ocultos text[];
begin
  perform pg_temp.dv_como(duena);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia DV');
  reset role;
  foreach v_nivel in array array(select clave from public.cotizaciones_niveles where clave <> 'todos' order by clave) loop
    v_i := v_i + 1;
    v_tag := 'k' || v_i;
    insert into public.origenes (clave, nombre) values ('dv_niv_' || v_i, 'DV nivel ' || v_i) returning id into o;
    insert into public.origenes (clave, nombre) values ('dv_niv_otro_' || v_i, 'DV nivel otro ' || v_i) returning id into o2;
    perform pg_temp.dv_nivel(o, v_nivel, v_tag);
    v_p := pg_temp.dv_personas(v_nivel, (select clave from public.cotizaciones_niveles where clave not in ('todos', v_nivel) order by clave limit 1), o2);
    v_ocultos := array['x_veh', 'xoculto', 'oculto', 'xcol_' || v_tag, 'chv_' || v_tag];
    for v_n in select jsonb_object_keys(v_p) loop
      r := pg_temp.dv_corre((v_p ->> v_n)::uuid, format('select public.cotizacion_hoja(%L)', o));
      if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'T3 nivel % (%): no abre la hoja: %', v_nivel, v_n, left(r::text, 300); end if;
      if pg_temp.dv_datos(r) -> 'pub_veh' is distinct from pg_temp.dv_dato('dv_pub', 'tipo', 'xtipo') then
        raise exception 'T3 nivel % (%): pub_veh debía traer sólo tipo ← xtipo: %', v_nivel, v_n, pg_temp.dv_datos(r) -> 'pub_veh';
      end if;
      if v_n in ('solo_ver', 'con', 'ver_como') then
        if pg_temp.dv_datos(r) -> 'x_veh' is distinct from pg_temp.dv_dato('chv_' || v_tag, 'xcol_' || v_tag, 'marca') then
          raise exception 'T3 nivel % (%): con el nivel, x_veh debía traer su dato: %', v_nivel, v_n, pg_temp.dv_datos(r);
        end if;
      elsif exists (select 1 from unnest(pg_temp.dv_textos(r)) t where t = any (v_ocultos)) then
        raise exception 'T3 nivel % (%): recibe algo del nivel: %', v_nivel, v_n, (select array_agg(t) from unnest(pg_temp.dv_textos(r)) t where t = any (v_ocultos));
      end if;
    end loop;
  end loop;
end $$;
rollback;

-- @test dato_del_vehiculo: T4 cada dato que llega a una persona tiene sus filas por cotizacion_tabla con esa hoja abierta, y cada fila trae la columna (columnas puede venir vacío)
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  a constant uuid := '00000000-0000-0000-0000-000000000d04';
  v_clave text; o uuid; o2 uuid; v_quien uuid; v_p jsonb; v_n text; v_total int := 0;
begin
  perform pg_temp.dv_persona(a, pg_temp.dv_conc('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver'));
  -- La semilla: 2 orígenes × 2 celdas × 2 personas.
  foreach v_clave in array array['subasta_usa', 'planilla_usa'] loop
    select x.id into o from public.origenes x where x.clave = v_clave;
    foreach v_quien in array array[duena, a] loop v_total := v_total + pg_temp.dv_coherente(v_quien, o, v_clave); end loop;
  end loop;
  -- Las reglas: 7 datos × 2 personas.
  insert into public.origenes (clave, nombre) values ('dv_coh', 'DV coherencia') returning id into o;
  insert into public.origenes (clave, nombre) values ('dv_coh_otro', 'DV coherencia otro') returning id into o2;
  perform pg_temp.dv_reglas(o, o2);
  foreach v_quien in array array[duena, a] loop v_total := v_total + pg_temp.dv_coherente(v_quien, o, 'reglas'); end loop;
  -- Un nivel: 5 personas sin él (1 dato) y 3 con él (2). `otro` tiene el nivel creado.
  perform pg_temp.dv_como(duena);
  set local role authenticated;
  perform public.nivel_crear(gen_random_uuid(), 'Gerencia DV');
  reset role;
  insert into public.origenes (clave, nombre) values ('dv_coh_niv', 'DV coherencia nivel') returning id into o;
  insert into public.origenes (clave, nombre) values ('dv_coh_niv_otro', 'DV coherencia nivel otro') returning id into o2;
  perform pg_temp.dv_nivel(o, 'costos', 'c1');
  v_p := pg_temp.dv_personas('costos', (select clave from public.cotizaciones_niveles where clave not in ('todos', 'costos') order by clave limit 1), o2);
  for v_n in select jsonb_object_keys(v_p) loop v_total := v_total + pg_temp.dv_coherente((v_p ->> v_n)::uuid, o, 'nivel ' || v_n); end loop;
  if v_total <> 8 + 14 + 11 then raise exception 'T4: recorrió % datos y esperaba %', v_total, 8 + 14 + 11; end if;
end $$;
rollback;

-- @test dato_del_vehiculo: T5 _cotizacion_hoja sigue prosecdef con search_path vacío y de nadie; su ayudante _hoja_datos_del_vehiculo es invoker, con search_path vacío, de nadie y ordena con collate "C"
do $$
declare v_f text; p record;
begin
  foreach v_f in array array['public._cotizacion_hoja(uuid, uuid)', 'public._hoja_datos_del_vehiculo(jsonb, uuid, jsonb, jsonb)'] loop
    if to_regprocedure(v_f) is null then raise exception 'T5: % no existe', v_f; end if;
    select * into p from pg_proc x where x.oid = to_regprocedure(v_f);
    if p.prosecdef is distinct from (v_f like 'public._cotizacion_hoja%') then raise exception 'T5: % prosecdef = %', v_f, p.prosecdef; end if;
    if p.proconfig is distinct from array['search_path=""'] then raise exception 'T5: % proconfig = %', v_f, p.proconfig; end if;
    if exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x
                where x.privilege_type = 'EXECUTE' and (x.grantee = 0 or x.grantee in (select oid from pg_roles where rolname in ('anon', 'authenticated')))) then
      raise exception 'T5: % la ejecuta PUBLIC, anon o authenticated', v_f;
    end if;
  end loop;
  -- El orden de `columnas` es el de collate "C": PGlite ya ordena así (datcollate C) y ninguna clave lo separa aquí, pero una base con ICU pone `a_` antes que `a1`.
  if pg_get_functiondef(to_regprocedure('public._hoja_datos_del_vehiculo(jsonb, uuid, jsonb, jsonb)')) not like '%order by m.key collate "C"%' then
    raise exception 'T5: _hoja_datos_del_vehiculo no ordena columnas con collate "C"';
  end if;
end $$;
