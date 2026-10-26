-- `cotizacion_hoja()` (paso 4.13, prompt 1): la lectura que abre la hoja de cotizar. Lo que no se ve no viaja se prueba acá por cada nivel de
-- `cotizaciones_niveles` (el último bloque; el inventario de `cotizaciones-visibilidad.sql` la registra con esta prueba como `cubierta_por`); el resto es la conducta:
-- el diseño sembrado, el candado y su motivo, los permisos, «sin publicar», el ⚙, la ayuda y los atajos, y que D2 cierra con lo que la lectura entrega.
-- Corre después de `cotizacion-guardar.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.
-- Compara claves y hojas de la respuesta, nunca texto suelto (una respuesta trae uuids y fechas al azar).

create temp sequence ch_telefono;
create or replace function pg_temp.ch_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.ch_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform pg_temp.ch_como(p_quien);
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

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos)}.
create or replace function pg_temp.ch_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ch_' || substr(p_id::text, 25, 12), 'CH ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.ch_conc(variadic p_claves text[]) returns jsonb language sql as $f$
  select coalesce(jsonb_agg(jsonb_build_object('clave', c)), '[]'::jsonb) from unnest(p_claves) c
$f$;

-- Todas las claves de objeto y todas las hojas de texto de una respuesta, a cualquier profundidad.
create or replace function pg_temp.ch_textos(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(distinct t), '{}') from (
    select jsonb_object_keys(h) as t from jsonb_path_query(p, 'strict $.**') h where jsonb_typeof(h) = 'object'
    union all select h #>> '{}' from jsonb_path_query(p, 'strict $.**') h where jsonb_typeof(h) = 'string') x
$f$;

-- ¿Alguna hoja es uno de esos números (como número o como el texto del número)?
create or replace function pg_temp.ch_trae(p jsonb, p_valores numeric[]) returns boolean language sql as $f$
  select exists (select 1 from jsonb_path_query(p, 'strict $.**') h
                  where (jsonb_typeof(h) = 'number' and (h #>> '{}')::numeric = any (p_valores))
                     or (jsonb_typeof(h) = 'string' and h #>> '{}' = any (p_valores::text[])))
$f$;

-- Los ítems de una hoja, en orden: «tipo:nodo».
create or replace function pg_temp.ch_items(p jsonb) returns text[] language sql as $f$
  select coalesce(array_agg((i.v ->> 'tipo') || ':' || (i.v ->> 'nodo') order by s.o, i.o), '{}')
    from jsonb_array_elements(coalesce(p -> 'secciones', '[]'::jsonb)) with ordinality s (v, o),
         jsonb_array_elements(s.v -> 'items') with ordinality i (v, o)
$f$;

-- Los ítems de un diseño publicado, en orden: «tipo:nodo» (todo lo que dibuja quien lo ve todo).
create or replace function pg_temp.ch_items_del_diseno(p_formula uuid) returns text[] language sql as $f$
  select coalesce(array_agg((i.v ->> 'tipo') || ':' || (i.v ->> 'nodo') order by s.o, i.o), '{}')
    from public.formulas f, jsonb_array_elements(f.diseno -> 'secciones') with ordinality s (v, o), jsonb_array_elements(s.v -> 'items') with ordinality i (v, o)
   where f.id = p_formula
$f$;

-- Lo que se edita y no se edita dice su motivo: `editable` y `motivo` son opuestos en toda celda, variante, interruptor y secundario, y el código es uno de los cuatro.
create or replace function pg_temp.ch_motivos_ok(p jsonb) returns boolean language sql as $f$
  select not exists (select 1 from jsonb_path_query(p, 'strict $.secciones[*].items[*]') i where i ? 'editable' and ((i ->> 'editable')::boolean = (i ? 'motivo')))
     and not exists (select 1 from jsonb_path_query(p, 'lax $.secciones[*].items[*].secundario') i where ((i ->> 'editable')::boolean = (i ? 'motivo')))
     and not exists (select 1 from jsonb_path_query(p, 'lax $.secciones[*].items[*].motivo') m where m ->> 'codigo' not in ('se_calcula', 'del_vehiculo', 'nivel', 'no_se_edita'))
$f$;

-- El ítem de un nodo (el primero con ese tipo y nodo), o nulo.
create or replace function pg_temp.ch_item(p jsonb, p_tipo text, p_nodo text) returns jsonb language sql as $f$
  select i from jsonb_path_query(p, 'strict $.secciones[*].items[*]') i where i ->> 'tipo' = p_tipo and i ->> 'nodo' = p_nodo limit 1
$f$;

-- Una fórmula publicada por el camino de publicar con lo oculto en todas las formas (D7): un nivel `p_nivel` y centinelas con la marca `p_tag`.
create or replace function pg_temp.ch_formula(p_origen uuid, p_nivel text, p_tag text) returns uuid language plpgsql as $f$
declare
  v_def jsonb; v_par jsonb; v_dis jsonb; v_id uuid;
begin
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'tc_x', 'tipo', 'tipo_cambio', 'clave', 'paralelo', 'etiqueta', 'TCX-' || p_tag, 'formato', 'raw'),
      jsonb_build_object('id', 'v', 'tipo', 'opcion', 'etiqueta', 'Variante', 'por_defecto', 'a', 'opciones', jsonb_build_array(
        jsonb_build_object('clave', 'a', 'etiqueta', 'A', 'titulo', 'TITULO A'), jsonb_build_object('clave', 'b', 'etiqueta', 'B', 'titulo', 'TITULO B'))),
      jsonb_build_object('id', 'activar', 'tipo', 'bandera', 'etiqueta', 'Activar'),
      jsonb_build_object('id', 'oculta_b', 'tipo', 'bandera', 'etiqueta', 'OCULTAB-' || p_tag),
      jsonb_build_object('id', 'anio', 'tipo', 'campo_vehiculo', 'campo', 'anio', 'etiqueta', 'Año', 'formato', 'raw'),
      jsonb_build_object('id', 'pub', 'tipo', 'input', 'etiqueta', 'Pública', 'grupo', 'gpub', 'solo_en', jsonb_build_array('a')),
      jsonb_build_object('id', 'dep', 'tipo', 'input', 'etiqueta', 'Dependiente', 'grupo', 'gpub', 'condicion', 'activar'),
      jsonb_build_object('id', 'cond_oc', 'tipo', 'input', 'etiqueta', 'Condicionada', 'grupo', 'gpub', 'condicion', 'oculta_b', 'requerido_si', 'oculta_b'),
      jsonb_build_object('id', 'solo_n', 'tipo', 'input', 'etiqueta', 'Sólo editar', 'grupo', 'gpub'),
      jsonb_build_object('id', 'con_ayuda', 'tipo', 'constante', 'etiqueta', 'Con ayuda', 'grupo', 'gpub'),
      jsonb_build_object('id', 'x_celda', 'tipo', 'input', 'etiqueta', 'ETIQ-' || p_tag, 'grupo', 'gx'),
      jsonb_build_object('id', 'x_tabla', 'tipo', 'tabla', 'tabla', 'ch_tabla', 'match', jsonb_build_object('anio', 'anio'), 'columna', 'factor', 'etiqueta', 'XTAB-' || p_tag,
                         'sobrescribible', true),
      jsonb_build_object('id', 'x_sub', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('x_celda'), 'etiqueta', 'XSUB-' || p_tag),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'etiqueta', 'Total', 'salida', 'total',
                         'de', jsonb_build_array('pub', 'dep', 'cond_oc', 'solo_n', 'con_ayuda', 'x_celda'))),
    'buckets', jsonb_build_object('origen', 'tc', 'alt', 'tc_x'), 'total_en', 'tc',
    'grupos', jsonb_build_array(
      jsonb_build_object('id', 'gpub', 'etiqueta', 'Pública', 'plazo', '1 día', 'tono', 'verde', 'bucket', 'origen'),
      jsonb_build_object('id', 'gx', 'etiqueta', 'GRUPOX-' || p_tag, 'plazo', '2 días', 'tono', 'naranja', 'bucket', 'alt')));
  v_par := jsonb_build_object('con_ayuda', 5, 'tablas', jsonb_build_object('ch_tabla', jsonb_build_array(
    jsonb_build_object('anio', 2018, 'factor', 9191.5), jsonb_build_object('anio', 2019, 'factor', 9192.5), jsonb_build_object('anio', 2020, 'factor', 9193.5), jsonb_build_object('anio', 2021, 'factor', 9194.5))));
  v_dis := jsonb_build_object(
    'cabecera', jsonb_build_object('ver_total_bs', true, 'modos', jsonb_build_array(jsonb_build_object('clave', 'm1', 'nombre', 'Modo uno', 'total_en', 'tc',
      'buckets', jsonb_build_array(jsonb_build_object('bucket', 'origen', 'nodo', 'tc'), jsonb_build_object('bucket', 'alt', 'nodo', 'tc_x'))))),
    'secciones', jsonb_build_array(
      jsonb_build_object('id', 'abierta', 'titulo', 'Abierta', 'presentacion', 'principal', 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'variante', 'nodo', 'v'),
        jsonb_build_object('tipo', 'interruptor', 'nodo', 'activar', 'efecto', 'habilita'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'tc', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'pub', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'dep', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'cond_oc', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'con_ayuda', 'ancho', 'mitad', 'ayuda', jsonb_build_object('tabla', 'ch_tabla')),
        jsonb_build_object('tipo', 'celda', 'nodo', 'anio', 'ancho', 'mitad'))),
      jsonb_build_object('id', 'solo_editar', 'titulo', 'Sólo editar', 'presentacion', 'principal', 'nivel_editar', p_nivel, 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'celda', 'nodo', 'solo_n', 'ancho', 'completo'))),
      jsonb_build_object('id', 'del_nivel', 'titulo', 'SECCION-' || p_tag, 'presentacion', 'principal', 'nivel_ver', p_nivel, 'nivel_editar', p_nivel, 'items', jsonb_build_array(
        jsonb_build_object('tipo', 'interruptor', 'nodo', 'oculta_b', 'efecto', 'habilita'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'tc_x', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'celda', 'nodo', 'x_celda', 'ancho', 'mitad', 'ayuda', jsonb_build_object('texto', 'AYUDA-' || p_tag)),
        jsonb_build_object('tipo', 'atajos', 'nodo', 'x_tabla', 'columna', 'anio', 'filas', 3),
        jsonb_build_object('tipo', 'celda', 'nodo', 'x_tabla', 'ancho', 'mitad'),
        jsonb_build_object('tipo', 'subtotal', 'nodo', 'x_sub')))),
    'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (p_origen, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false)) returning id into v_id;
  return v_id;
end $f$;

-- @test cotizacion_hoja: la dueña recibe el diseño sembrado entero, en su orden, con las etiquetas de la fórmula, los tonos, los modos sin buckets y la versión que usó
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_clave text; o uuid; f public.formulas; r jsonb; it jsonb; v_t jsonb;
begin
  foreach v_clave in array array['subasta_usa', 'planilla_usa', 'oficina'] loop
    select x.id into o from public.origenes x where x.clave = v_clave;
    select * into f from public.formulas x where x.origen_id = o and x.estado = 'publicada';
    r := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o));
    if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception '%: la dueña no recibe la hoja: %', v_clave, left(r::text, 300); end if;
    if (r -> 'formula' ->> 'id')::uuid is distinct from f.id or (r -> 'formula' ->> 'version')::int is distinct from f.version then raise exception '%: la versión no es la publicada: %', v_clave, r -> 'formula'; end if;
    if (r ->> 'abierta_en')::timestamptz is distinct from now() then raise exception '%: abierta_en no es la hora de la base: %', v_clave, r ->> 'abierta_en'; end if;
    if jsonb_typeof(r -> 'vehiculo_obligatorio') is distinct from 'boolean' or (r -> 'origen' ->> 'id')::uuid is distinct from o then raise exception '%: origen o ajuste: %', v_clave, r; end if;
    if pg_temp.ch_items(r) is distinct from pg_temp.ch_items_del_diseno(f.id) then
      raise exception '%: los ítems no son los del diseño, en su orden: % contra %', v_clave, pg_temp.ch_items(r), pg_temp.ch_items_del_diseno(f.id);
    end if;
    if not pg_temp.ch_motivos_ok(r) then raise exception '%: algo editable lleva motivo o algo que no se edita no lo lleva: %', v_clave, r; end if;
    -- Las etiquetas son las de la definición.
    if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i join lateral jsonb_array_elements(f.definicion -> 'nodos') n on n ->> 'id' = i ->> 'nodo'
                where i ? 'etiqueta' and i ->> 'etiqueta' is distinct from n ->> 'etiqueta') then raise exception '%: una etiqueta no es la de la definición', v_clave; end if;
    -- Los modos: clave y nombre, nada más (sus buckets nombran tipos de cambio que un nivel puede esconder).
    if exists (select 1 from jsonb_array_elements(r -> 'cabecera' -> 'modos') m where (select array_agg(k order by k) from jsonb_object_keys(m) k) is distinct from array['clave', 'nombre']) then
      raise exception '%: un modo trae más que su clave y su nombre: %', v_clave, r -> 'cabecera';
    end if;
    if r -> 'cabecera' -> 'ver_total_bs' is distinct from f.diseno -> 'cabecera' -> 'ver_total_bs' then raise exception '%: ver_total_bs', v_clave; end if;
    if jsonb_array_length(r -> 'cabecera' -> 'modos') <> jsonb_array_length(f.diseno -> 'cabecera' -> 'modos') then raise exception '%: los modos', v_clave; end if;
  end loop;

  -- subasta_usa a mano: los dos modos, la tarjeta, los tres tonos exactos, y el par y los candados de «Compra».
  select x.id into o from public.origenes x where x.clave = 'subasta_usa';
  r := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o));
  if r -> 'cabecera' -> 'modos' is distinct from '[{"clave": "paralelo", "nombre": "Paralelo"}, {"clave": "unificado", "nombre": "Unificado"}]'::jsonb then raise exception 'los modos: %', r -> 'cabecera'; end if;
  if r -> 'tarjeta_total' is distinct from '{"nodo": "total", "etiqueta": "TOTAL", "formato": "usd", "secundarios": [{"nodo": "garantia", "etiqueta": "Garantía de participación", "formato": "usd"}]}'::jsonb then
    raise exception 'la tarjeta: %', r -> 'tarjeta_total';
  end if;
  select jsonb_agg(jsonb_build_object('clave', t.clave, 'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                      'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave) into v_t
    from public.tonos t where t.clave in ('amarillo', 'naranja', 'verde');
  if r -> 'tonos' is distinct from v_t then raise exception 'los tonos no son los del catálogo: % contra %', r -> 'tonos', v_t; end if;
  -- «Fees» (un cálculo sobrescribible) se edita; su par, el porcentaje, es una constante y tiene ⚙ (la dueña configura). «Transferencia» se calcula: no se edita y dice por qué.
  it := pg_temp.ch_item(r, 'celda', 'fees');
  if (it ->> 'editable')::boolean is not true or (it ->> 'ajustes')::boolean is not false or it -> 'secundario' is distinct from '{"nodo": "fees_pct", "como": "porcentaje", "formato": "pct", "editable": true, "ajustes": true}'::jsonb then
    raise exception 'fees: %', it;
  end if;
  it := pg_temp.ch_item(r, 'celda', 'transferencia');
  if (it ->> 'editable')::boolean is not false or it -> 'motivo' is distinct from '{"codigo": "se_calcula"}'::jsonb or (it -> 'secundario' ->> 'editable')::boolean is not true then raise exception 'transferencia: %', it; end if;
  -- Un tipo de cambio: se edita y tiene ⚙ (la dueña gestiona los tipos de cambio). La variante y los interruptores se editan.
  it := pg_temp.ch_item(r, 'celda', 'tc_oficial');
  if (it ->> 'editable')::boolean is not true or (it ->> 'ajustes')::boolean is not true or it ->> 'tipo_nodo' is distinct from 'tipo_cambio' then raise exception 'tc_oficial: %', it; end if;
  if (pg_temp.ch_item(r, 'variante', 'variante') ->> 'editable')::boolean is not true or (pg_temp.ch_item(r, 'interruptor', 'mostrar_garantia') ->> 'editable')::boolean is not true then
    raise exception 'la variante o un interruptor no se editan';
  end if;
  -- Las opciones de la variante son las de la fórmula.
  if jsonb_array_length(pg_temp.ch_item(r, 'variante', 'variante') -> 'opciones') <> 4 then raise exception 'las opciones de la variante: %', pg_temp.ch_item(r, 'variante', 'variante'); end if;
end $$;
rollback;

-- @test cotizacion_hoja: una asesora sin el nivel «costos» no recibe «Avanzado», ni sus celdas, ni la ayuda ni los atajos que sólo leen esas celdas; sí el total y la garantía
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  a constant uuid := '00000000-0000-0000-0000-000000000f11';
  o uuid; f public.formulas; r jsonb; v_ocultos text[]; v_etiquetas text[];
begin
  select x.id into o from public.origenes x where x.clave = 'subasta_usa';
  select * into f from public.formulas x where x.origen_id = o and x.estado = 'publicada';
  perform pg_temp.ch_persona(a, pg_temp.ch_conc('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver'));
  r := pg_temp.ch_corre(a, format('select public.cotizacion_hoja(%L)', o));
  if r ? 'error' then raise exception 'la asesora no recibe la hoja: %', r; end if;
  select array_agg(e.key) into v_ocultos from jsonb_each(f.visibilidad) e where e.value ->> 'ver' = 'costos';
  select array_agg(n ->> 'etiqueta') into v_etiquetas from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'id' = any (v_ocultos);
  if cardinality(v_ocultos) < 10 then raise exception 'la fórmula sembrada debía tener nodos de «costos»: %', v_ocultos; end if;
  if (select array_agg(s ->> 'id') from jsonb_array_elements(r -> 'secciones') s) is distinct from array['hoja', 'cambio', 'compra', 'logistica', 'aduana', 'garantia'] then
    raise exception 'las secciones de la asesora: %', (select array_agg(s ->> 'id') from jsonb_array_elements(r -> 'secciones') s);
  end if;
  if exists (select 1 from unnest(pg_temp.ch_textos(r)) t where t = any (v_ocultos) or t = any (v_etiquetas) or t in ('cif', 'impuestos', 'poliza', 'Componentes CIF', 'Impuestos', 'Póliza')) then
    raise exception 'la asesora recibe algo de «costos»: %', (select array_agg(t) from unnest(pg_temp.ch_textos(r)) t where t = any (v_ocultos) or t = any (v_etiquetas));
  end if;
  if exists (select 1 from unnest(pg_temp.ch_items(r)) i where split_part(i, ':', 2) = any (v_ocultos)) then raise exception 'un ítem de «costos» viaja'; end if;
  if not pg_temp.ch_motivos_ok(r) then raise exception 'motivos: %', r; end if;
  -- La ayuda de «Transporte» la leen celdas que ve: viaja. La de «Factor DP» sólo la lee una celda de «costos»: no viaja, ni los atajos de esa celda.
  if pg_temp.ch_item(r, 'celda', 'transporte_bolivia') -> 'ayuda' is distinct from '{"tabla": "transporte_usa_bolivia"}'::jsonb then raise exception 'la ayuda de Transporte: %', pg_temp.ch_item(r, 'celda', 'transporte_bolivia'); end if;
  if pg_temp.ch_item(r, 'atajos', 'factor_dp') is not null or pg_temp.ch_item(r, 'celda', 'factor_dp') is not null then raise exception 'viaja la celda o los atajos del factor'; end if;
  -- Sin permiso de configurar ni de tipos de cambio: ningún ⚙. Todo lo que se ve se edita, salvo lo que se calcula (con motivo).
  if exists (select 1 from jsonb_path_query(r, 'strict $.secciones[*].items[*]') i where (i ->> 'ajustes')::boolean is true)
     or exists (select 1 from jsonb_path_query(r, 'lax $.secciones[*].items[*].secundario') i where (i ->> 'ajustes')::boolean is true) then raise exception 'la asesora recibe un ⚙'; end if;
  -- La garantía (aparte) y el total viajan siempre; los tonos son sólo los que usa lo que viaja.
  if r -> 'tarjeta_total' ->> 'nodo' is distinct from 'total' or jsonb_array_length(r -> 'tarjeta_total' -> 'secundarios') <> 1 then raise exception 'la tarjeta de la asesora: %', r -> 'tarjeta_total'; end if;
  if (select array_agg(t ->> 'clave' order by t ->> 'clave') from jsonb_array_elements(r -> 'tonos') t) is distinct from array['amarillo', 'naranja', 'verde'] then raise exception 'los tonos de la asesora: %', r -> 'tonos'; end if;
  -- Es mucho más chica que la de la dueña.
  if octet_length(r::text) >= octet_length(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o))::text) then raise exception 'la hoja de la asesora no es más chica que la de la dueña'; end if;
end $$;
rollback;

-- @test cotizacion_hoja: el permiso va antes que el origen (el mismo 42501 con uno real y con uno que no existe), un origen sin fórmula publicada no devuelve versión, y un origen que no existe, 22023
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  sc constant uuid := '00000000-0000-0000-0000-000000000f21'; solo_otro constant uuid := '00000000-0000-0000-0000-000000000f22';
  cr constant uuid := '00000000-0000-0000-0000-000000000f23'; cf constant uuid := '00000000-0000-0000-0000-000000000f24';
  o uuid; o2 uuid; o_vacio uuid; r jsonb; r2 jsonb; v_inexistente constant uuid := '00000000-0000-0000-0000-00000000dead';
begin
  select x.id into o from public.origenes x where x.clave = 'subasta_usa';
  insert into public.origenes (clave, nombre) values ('ch_otro', 'CH otro') returning id into o2;
  insert into public.origenes (clave, nombre) values ('ch_vacio', 'CH sin publicar') returning id into o_vacio;
  perform pg_temp.ch_persona(sc, pg_temp.ch_conc('cotizaciones.ver', 'leads.ver'));
  perform pg_temp.ch_persona(solo_otro, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o2), jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2)));
  perform pg_temp.ch_persona(cr, pg_temp.ch_conc('cotizaciones.ver', 'cotizaciones.crear'));
  perform pg_temp.ch_persona(cf, pg_temp.ch_conc('cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.configurar'));
  -- Sin cotizaciones.crear, o con crear sólo en otro origen: 42501, y con un origen real o con uno que no existe, el mismo.
  r := pg_temp.ch_corre(sc, format('select public.cotizacion_hoja(%L)', o));
  r2 := pg_temp.ch_corre(sc, format('select public.cotizacion_hoja(%L)', v_inexistente));
  if r ->> 'error' is distinct from '42501' or r2 is distinct from r then raise exception 'sin crear: % contra %', r, r2; end if;
  r := pg_temp.ch_corre(solo_otro, format('select public.cotizacion_hoja(%L)', o));
  r2 := pg_temp.ch_corre(solo_otro, format('select public.cotizacion_hoja(%L)', v_inexistente));
  if r ->> 'error' is distinct from '42501' or r2 is distinct from r then raise exception 'crear sólo en otro origen: % contra %', r, r2; end if;
  if (pg_temp.ch_corre(solo_otro, format('select public.cotizacion_hoja(%L)', o2))) ->> 'estado' is distinct from 'sin_publicar' then raise exception 'quien cotiza en su origen no lo abre'; end if;
  -- Quien cotiza en todos los orígenes: uno que no existe es 22023; un nulo, también.
  r := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', v_inexistente));
  if r ->> 'error' is distinct from '22023' then raise exception 'un origen que no existe: %', r; end if;
  r := pg_temp.ch_corre(duena, 'select public.cotizacion_hoja(null)');
  if r ->> 'error' is distinct from '22023' then raise exception 'un origen nulo: %', r; end if;
  -- Sin publicar: sin versión, sin hora y sin hoja; dice si puede configurar.
  r := pg_temp.ch_corre(cr, format('select public.cotizacion_hoja(%L)', o_vacio));
  if r ->> 'estado' is distinct from 'sin_publicar' or r ->> 'puede_configurar' is distinct from 'false' or r -> 'origen' ->> 'nombre' is distinct from 'CH sin publicar'
     or (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['estado', 'origen', 'puede_configurar'] then raise exception 'sin publicar: %', r; end if;
  r := pg_temp.ch_corre(cf, format('select public.cotizacion_hoja(%L)', o_vacio));
  if r ->> 'estado' is distinct from 'sin_publicar' or r ->> 'puede_configurar' is distinct from 'true' then raise exception 'sin publicar, quien configura: %', r; end if;
  -- Un origen con la fórmula archivada y sin publicada también es «sin publicar».
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o_vacio, 1, 'archivada', '{"nodos": []}', '{}', '{}', '{}');
  if (pg_temp.ch_corre(cr, format('select public.cotizacion_hoja(%L)', o_vacio))) ->> 'estado' is distinct from 'sin_publicar' then raise exception 'una archivada no se abre'; end if;
end $$;
rollback;

-- @test cotizacion_hoja: el ⚙ (constante con configurar, tipo de cambio con tipos de cambio), la condición y el «requerido si» sólo con su bandera a la vista, y el candado de un nivel con su nombre
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  p_ninguna constant uuid := '00000000-0000-0000-0000-000000000f31'; p_cfg constant uuid := '00000000-0000-0000-0000-000000000f32';
  p_tc constant uuid := '00000000-0000-0000-0000-000000000f33'; p_nivel constant uuid := '00000000-0000-0000-0000-000000000f34';
  o uuid; r jsonb; it jsonb;
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver'];
begin
  insert into public.origenes (clave, nombre) values ('ch_ajustes', 'CH ajustes') returning id into o;
  perform pg_temp.ch_formula(o, 'costos', 'aj');
  perform pg_temp.ch_persona(p_ninguna, pg_temp.ch_conc(variadic v_base));
  perform pg_temp.ch_persona(p_cfg, pg_temp.ch_conc(variadic v_base || array['cotizaciones.configurar']));
  perform pg_temp.ch_persona(p_tc, pg_temp.ch_conc(variadic v_base || array['empresa.tipos_cambio.gestionar']));
  perform pg_temp.ch_persona(p_nivel, pg_temp.ch_conc(variadic v_base || array['cotizaciones.nivel.costos.ver']));
  -- El ⚙: una constante (con_ayuda) lo da cotizaciones.configurar del origen; un tipo de cambio (tc), empresa.tipos_cambio.gestionar; ninguno se da por el otro permiso. Un input nunca.
  r := pg_temp.ch_corre(p_ninguna, format('select public.cotizacion_hoja(%L)', o));
  if (pg_temp.ch_item(r, 'celda', 'con_ayuda') ->> 'ajustes')::boolean is not false or (pg_temp.ch_item(r, 'celda', 'tc') ->> 'ajustes')::boolean is not false then raise exception 'sin permisos hay ⚙: %', r; end if;
  r := pg_temp.ch_corre(p_cfg, format('select public.cotizacion_hoja(%L)', o));
  if (pg_temp.ch_item(r, 'celda', 'con_ayuda') ->> 'ajustes')::boolean is not true or (pg_temp.ch_item(r, 'celda', 'tc') ->> 'ajustes')::boolean is not false or (pg_temp.ch_item(r, 'celda', 'pub') ->> 'ajustes')::boolean is not false then
    raise exception 'quien configura: la constante sí, el tipo de cambio y el input no: %', r;
  end if;
  r := pg_temp.ch_corre(p_tc, format('select public.cotizacion_hoja(%L)', o));
  if (pg_temp.ch_item(r, 'celda', 'con_ayuda') ->> 'ajustes')::boolean is not false or (pg_temp.ch_item(r, 'celda', 'tc') ->> 'ajustes')::boolean is not true then raise exception 'quien gestiona tipos de cambio: %', r; end if;
  -- La condición y el «requerido si» de una celda que se ve nombran una bandera: viajan sólo si la bandera se ve. `activar` es de todos; `oculta_b`, del nivel.
  r := pg_temp.ch_corre(p_ninguna, format('select public.cotizacion_hoja(%L)', o));
  if pg_temp.ch_item(r, 'celda', 'dep') ->> 'condicion' is distinct from 'activar' then raise exception 'la condición de una bandera visible no viaja: %', pg_temp.ch_item(r, 'celda', 'dep'); end if;
  it := pg_temp.ch_item(r, 'celda', 'cond_oc');
  if it is null or it ? 'condicion' or it ? 'requerido_si' then raise exception 'la condición o el requerido de una bandera oculta viaja: %', it; end if;
  r := pg_temp.ch_corre(p_nivel, format('select public.cotizacion_hoja(%L)', o));
  it := pg_temp.ch_item(r, 'celda', 'cond_oc');
  if it ->> 'condicion' is distinct from 'oculta_b' or it ->> 'requerido_si' is distinct from 'oculta_b' then raise exception 'con el nivel, la condición y el requerido viajan: %', it; end if;
  -- Un dato del vehículo dibujado como celda no se edita y lo dice (no «se calcula»).
  it := pg_temp.ch_item(r, 'celda', 'anio');
  if (it ->> 'editable')::boolean is not false or it -> 'motivo' is distinct from '{"codigo": "del_vehiculo"}'::jsonb or it ->> 'tipo_nodo' is distinct from 'campo_vehiculo' then raise exception 'el campo del vehículo: %', it; end if;
  -- `solo_en` es de la variante (que todos ven).
  if pg_temp.ch_item(r, 'celda', 'pub') -> 'solo_en' is distinct from '["a"]'::jsonb then raise exception 'solo_en: %', pg_temp.ch_item(r, 'celda', 'pub'); end if;
  -- Una celda que se ve y su nivel de editar no tiene: no se edita, y el motivo nombra el nivel por su nombre (no su clave).
  it := pg_temp.ch_item(pg_temp.ch_corre(p_ninguna, format('select public.cotizacion_hoja(%L)', o)), 'celda', 'solo_n');
  if (it ->> 'editable')::boolean is not false or it -> 'motivo' is distinct from jsonb_build_object('codigo', 'nivel', 'nivel', (select nombre from public.cotizaciones_niveles where clave = 'costos')) then
    raise exception 'el candado por nivel: %', it;
  end if;
  it := pg_temp.ch_item(r, 'celda', 'solo_n');
  if (it ->> 'editable')::boolean is not false then raise exception 'ver el nivel no es editarlo: %', it; end if;
  -- El total no se edita ni se oculta: no está en ninguna sección, y su tarjeta viaja.
  if r -> 'tarjeta_total' ->> 'nodo' is distinct from 'total' then raise exception 'la tarjeta: %', r -> 'tarjeta_total'; end if;
end $$;
rollback;

-- @test cotizacion_hoja: los atajos salen de la copia congelada de la versión (aunque haya una viva) o, si no hay, de la tabla viva del origen o de la compartida, con su tope; la ayuda de una tabla sólo viaja si la tabla existe
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid; v_tabla uuid; r jsonb; it jsonb; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('ch_atajos', 'CH atajos') returning id into o;
  f := pg_temp.ch_formula(o, 'costos', 'at');
  r := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o));
  it := pg_temp.ch_item(r, 'atajos', 'x_tabla');
  -- La congelada: tres filas (el tope de `filas`), la etiqueta como texto y el valor de la columna del nodo.
  if it -> 'chips' is distinct from '[{"etiqueta": "2018", "valor": 9191.5}, {"etiqueta": "2019", "valor": 9192.5}, {"etiqueta": "2020", "valor": 9193.5}]'::jsonb then raise exception 'los chips de la congelada: %', it; end if;
  -- Una viva con otros valores no la reemplaza.
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (o, 'ch_tabla', 'CH tabla', '[{"clave":"anio","etiqueta":"Año","tipo":"anio"},{"clave":"factor","etiqueta":"Factor","tipo":"numero"}]') returning id into v_tabla;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) select v_tabla, jsonb_build_object('anio', 2000 + g, 'factor', 1 + g), g from generate_series(1, 20) g;
  if (pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'atajos', 'x_tabla') -> 'chips' -> 0 ->> 'etiqueta') is distinct from '2018' then raise exception 'la viva pisó a la congelada'; end if;
  -- Sin copia congelada: la viva, las primeras `filas` por su orden.
  update public.formulas set params = params - 'tablas' where id = f;
  it := pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'atajos', 'x_tabla');
  if it -> 'chips' is distinct from '[{"etiqueta": "2001", "valor": 2}, {"etiqueta": "2002", "valor": 3}, {"etiqueta": "2003", "valor": 4}]'::jsonb then raise exception 'los chips de la viva: %', it; end if;
  -- Una fila inactiva no cuenta; la compartida entra si el origen no tiene la suya.
  update public.tablas_referencia_filas set activa = false where tabla_id = v_tabla and orden = 1;
  if (pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'atajos', 'x_tabla') -> 'chips' -> 0 ->> 'etiqueta') is distinct from '2002' then raise exception 'una fila inactiva cuenta'; end if;
  update public.tablas_referencia set activa = false where id = v_tabla;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (null, 'ch_tabla', 'CH compartida', '[]') returning id into v_tabla;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (v_tabla, '{"anio": 1999, "factor": 7}', 0);
  it := pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'atajos', 'x_tabla');
  if it -> 'chips' is distinct from '[{"etiqueta": "1999", "valor": 7}]'::jsonb then raise exception 'la compartida: %', it; end if;
  -- Una congelada vacía manda aunque haya una viva: sin chips.
  update public.formulas set params = params || '{"tablas": {"ch_tabla": []}}' where id = f;
  if jsonb_array_length(pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'atajos', 'x_tabla') -> 'chips') <> 0 then raise exception 'una congelada vacía cae a la viva'; end if;
  -- La ayuda de la tabla viaja si existe (la congelada, aunque vacía); si no existe en ningún lado, la celda va sin ayuda aunque quien mira configure el origen.
  if pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'celda', 'con_ayuda') -> 'ayuda' is distinct from '{"tabla": "ch_tabla"}'::jsonb then raise exception 'la ayuda con una congelada vacía'; end if;
  update public.formulas set params = params - 'tablas' where id = f;
  update public.tablas_referencia set activa = false where id = v_tabla;
  if pg_temp.ch_item(pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o)), 'celda', 'con_ayuda') ? 'ayuda' then raise exception 'la ayuda de una tabla que no existe'; end if;
end $$;
rollback;

-- @test cotizacion_hoja: el candado de cada celda es el del tipo de su nodo (espejo de aceptaValor), también en un par; una celda que no se calcula ni es del vehículo dice «no se edita» si su nivel de editar es nulo
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_clave text; o uuid; f public.formulas; r jsonb; i jsonb; n jsonb; v_espera boolean; v_cod text;
begin
  foreach v_clave in array array['subasta_usa', 'planilla_usa', 'oficina'] loop
    select x.id into o from public.origenes x where x.clave = v_clave;
    select * into f from public.formulas x where x.origen_id = o and x.estado = 'publicada';
    r := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o));
    for i in select h from jsonb_path_query(r, 'strict $.secciones[*].items[*]') h where h ->> 'tipo' = 'celda' loop
      select x into n from jsonb_array_elements(f.definicion -> 'nodos') x where x ->> 'id' = i ->> 'nodo';
      v_espera := (n ->> 'tipo') in ('input', 'constante', 'tipo_cambio') or ((n ->> 'tipo') in ('tabla', 'tramo', 'calculo') and coalesce((n -> 'sobrescribible')::text = 'true', false));
      if (i ->> 'editable')::boolean is distinct from v_espera or i ->> 'tipo_nodo' is distinct from n ->> 'tipo' then raise exception '%: % (%) debía ser editable=%: %', v_clave, i ->> 'nodo', n ->> 'tipo', v_espera, i; end if;
      v_cod := case when v_espera then null when n ->> 'tipo' = 'campo_vehiculo' then 'del_vehiculo' else 'se_calcula' end;
      if i -> 'motivo' ->> 'codigo' is distinct from v_cod then raise exception '%: % debía decir %: %', v_clave, i ->> 'nodo', v_cod, i; end if;
      if i ? 'secundario' then
        select x into n from jsonb_array_elements(f.definicion -> 'nodos') x where x ->> 'id' = i -> 'secundario' ->> 'nodo';
        v_espera := (n ->> 'tipo') in ('input', 'constante', 'tipo_cambio') or ((n ->> 'tipo') in ('tabla', 'tramo', 'calculo') and coalesce((n -> 'sobrescribible')::text = 'true', false));
        if (i -> 'secundario' ->> 'editable')::boolean is distinct from v_espera then raise exception '%: el secundario % debía ser editable=%', v_clave, i -> 'secundario' ->> 'nodo', v_espera; end if;
      end if;
    end loop;
    if not pg_temp.ch_motivos_ok(r) then raise exception '%: motivos', v_clave; end if;
  end loop;
end $$;
rollback;

-- @test cotizacion_hoja: lo que entrega cierra D2: crear con la versión y la hora de la lectura no da «desactualizada»; después de publicar la N+1, sí
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  o uuid; l uuid; r jsonb; h jsonb; v_pub uuid;
begin
  insert into public.origenes (clave, nombre) values ('ch_d2', 'CH D2') returning id into o;
  perform pg_temp.ch_formula(o, 'costos', 'd2');
  -- Sin vehículo: el ajuste de la empresa lo permite (se revierte con el bloque).
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CH lead', '7215' || lpad(nextval('pg_temp.ch_telefono')::text, 4, '0'), duena, (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  h := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o));
  if (h ->> 'vehiculo_obligatorio')::boolean is not false then raise exception 'el ajuste del vehículo no viaja: %', h ->> 'vehiculo_obligatorio'; end if;
  r := pg_temp.ch_corre(duena, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"pub": 10}}''::jsonb, %L, %L)', o, l, h -> 'formula' ->> 'id', h ->> 'abierta_en'));
  if r ? 'error' or r -> 'cotizacion' ->> 'id' is null then raise exception 'crear con lo que entregó la lectura falla: %', r; end if;
  -- Una versión nueva: la hoja que se abrió antes ya no es la vigente.
  v_pub := (select f.id from public.formulas f where f.origen_id = o and f.estado = 'publicada');
  perform pg_temp.ch_como(duena);
  set local role authenticated;
  perform public.formula_cambiar_constante(o, 'con_ayuda', 6);
  reset role;
  if (select f.id from public.formulas f where f.origen_id = o and f.estado = 'publicada') = v_pub then raise exception 'no se publicó la N+1'; end if;
  r := pg_temp.ch_corre(duena, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"pub": 10}}''::jsonb, %L, %L)', o, l, h -> 'formula' ->> 'id', h ->> 'abierta_en'));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' or r ->> 'hint' is distinct from 'formula' then raise exception 'la hoja vieja debía dar desactualizada: %', r; end if;
  -- Y la lectura de ahora trae la versión nueva.
  h := pg_temp.ch_corre(duena, format('select public.cotizacion_hoja(%L)', o));
  if (h -> 'formula' ->> 'id')::uuid = v_pub then raise exception 'la lectura trae la versión vieja'; end if;
  r := pg_temp.ch_corre(duena, format('select public.cotizacion_crear(gen_random_uuid(), %L, %L, ''{"inputs": {"pub": 10}}''::jsonb, %L, %L)', o, l, h -> 'formula' ->> 'id', h ->> 'abierta_en'));
  if r ? 'error' then raise exception 'crear con la versión nueva falla: %', r; end if;
end $$;
rollback;

-- @test cotizacion_hoja: por cada nivel (los de fábrica y uno creado con nivel_crear), sin su permiso no llega ningún id, etiqueta, ayuda, título, tono ni valor del nivel; con él, sí; «ver como» no cambia lo que decide la base
-- Cada fórmula (`pg_temp.ch_formula`) pone lo oculto en toda forma: una celda y su ayuda de texto, un interruptor, un subtotal, una sección entera con su título, un tipo de cambio que un modo
-- nombra, unos atajos y una celda de tabla con valores centinela, un grupo sólo de nodos del nivel con su tono, una celda visible condicionada (y requerida) por la bandera del nivel, y
-- una ayuda de tabla que sólo lee la celda del nivel. Se compara por claves y hojas: la lista exacta de ítems que debe llegar a cada persona, escrita a mano.
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_nuevo uuid := gen_random_uuid(); v_niveles text[]; v_nivel text; v_otro text; v_i int := 0; v_tag text; v_nombre text;
  o uuid; o2 uuid; sin uuid; ed uuid; ajeno uuid; otro uuid; cfg uuid; solo_crear uuid; con uuid; solo_ver uuid; ver_como uuid;
  v_txt text; v_quien uuid; r jsonb; r2 jsonb; v_ocultos text[]; it jsonb; v_abierta text[]; v_todo text[]; v_con_nivel boolean;
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver'];
begin
  perform pg_temp.ch_como(duena);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia CH');
  reset role;
  v_niveles := array(select clave from public.cotizaciones_niveles where clave <> 'todos' order by clave);
  if cardinality(v_niveles) < 2 or not 'costos' = any (v_niveles) or not 'gerencia_ch' = any (v_niveles) then raise exception 'esperaba al menos costos y el creado: %', v_niveles; end if;
  -- Lo que llega a quien no tiene el nivel, y a quien sí (en el orden del diseño).
  v_abierta := array['variante:v', 'interruptor:activar', 'celda:tc', 'celda:pub', 'celda:dep', 'celda:cond_oc', 'celda:con_ayuda', 'celda:anio', 'celda:solo_n'];
  v_todo := v_abierta || array['interruptor:oculta_b', 'celda:tc_x', 'celda:x_celda', 'atajos:x_tabla', 'celda:x_tabla', 'subtotal:x_sub'];
  foreach v_nivel in array v_niveles loop
    v_i := v_i + 1;
    v_tag := 'k' || v_i;
    v_nombre := (select nombre from public.cotizaciones_niveles where clave = v_nivel);
    v_otro := (array(select clave from public.cotizaciones_niveles where clave <> 'todos' and clave <> v_nivel order by clave))[1];
    insert into public.origenes (clave, nombre) values ('ch_gen_' || v_i, 'CH generico ' || v_i) returning id into o;
    insert into public.origenes (clave, nombre) values ('ch_gen_otro_' || v_i, 'CH generico otro ' || v_i) returning id into o2;
    perform pg_temp.ch_formula(o, v_nivel, v_tag);
    sin := gen_random_uuid(); ed := gen_random_uuid(); ajeno := gen_random_uuid(); otro := gen_random_uuid(); cfg := gen_random_uuid();
    solo_crear := gen_random_uuid(); con := gen_random_uuid(); solo_ver := gen_random_uuid(); ver_como := gen_random_uuid();
    perform pg_temp.ch_persona(sin, pg_temp.ch_conc(variadic v_base));
    perform pg_temp.ch_persona(ed, pg_temp.ch_conc(variadic v_base || array['cotizaciones.nivel.' || v_nivel || '.editar']));
    perform pg_temp.ch_persona(ajeno, pg_temp.ch_conc(variadic v_base) || jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver', 'origen', o2)));
    perform pg_temp.ch_persona(otro, pg_temp.ch_conc(variadic v_base || array['cotizaciones.nivel.' || v_otro || '.ver', 'cotizaciones.nivel.' || v_otro || '.editar']));
    perform pg_temp.ch_persona(cfg, pg_temp.ch_conc(variadic v_base || array['cotizaciones.configurar']));
    perform pg_temp.ch_persona(solo_crear, pg_temp.ch_conc('cotizaciones.crear'));
    perform pg_temp.ch_persona(con, pg_temp.ch_conc(variadic v_base || array['cotizaciones.nivel.' || v_nivel || '.ver', 'cotizaciones.nivel.' || v_nivel || '.editar']));
    perform pg_temp.ch_persona(solo_ver, pg_temp.ch_conc(variadic v_base || array['cotizaciones.nivel.' || v_nivel || '.ver']));
    perform pg_temp.ch_persona(ver_como, pg_temp.ch_conc(variadic v_base || array['cotizaciones.nivel.' || v_nivel || '.ver', 'cotizaciones.nivel.' || v_nivel || '.editar', 'equipo.roles.gestionar']));
    -- Lo oculto: ids, etiquetas, títulos, ayuda, grupo y su tono, la sección y la clave del tipo de cambio.
    v_ocultos := array['tc_x', 'oculta_b', 'x_celda', 'x_tabla', 'x_sub', 'del_nivel', 'naranja', 'TCX-' || v_tag, 'OCULTAB-' || v_tag, 'ETIQ-' || v_tag, 'AYUDA-' || v_tag, 'XTAB-' || v_tag,
                       'XSUB-' || v_tag, 'GRUPOX-' || v_tag, 'SECCION-' || v_tag, 'gx', 'alt', 'paralelo'];

    foreach v_txt in array array['sin', 'ed', 'ajeno', 'otro', 'cfg', 'solo_crear', 'solo_ver', 'con', 'ver_como'] loop
      v_quien := case v_txt when 'sin' then sin when 'ed' then ed when 'ajeno' then ajeno when 'otro' then otro when 'cfg' then cfg when 'solo_crear' then solo_crear
                            when 'solo_ver' then solo_ver when 'con' then con else ver_como end;
      v_con_nivel := v_txt in ('solo_ver', 'con', 'ver_como');
      r := pg_temp.ch_corre(v_quien, format('select public.cotizacion_hoja(%L)', o));
      if r ? 'error' or r ->> 'estado' is distinct from 'lista' then raise exception 'nivel %: % no recibe la hoja: %', v_nivel, v_txt, r; end if;
      if not pg_temp.ch_motivos_ok(r) then raise exception 'nivel %: % motivos: %', v_nivel, v_txt, r; end if;
      -- La lista exacta de ítems.
      if pg_temp.ch_items(r) is distinct from (case when v_txt = 'solo_crear' then '{}'::text[] when v_con_nivel then v_todo else v_abierta end) then
        raise exception 'nivel %: los ítems de «%» no son los esperados: %', v_nivel, v_txt, pg_temp.ch_items(r);
      end if;
      if not v_con_nivel then
        -- Sin el nivel: ni un id, etiqueta, título, ayuda, tono ni clave del nivel en ninguna clave u hoja de texto, ni un valor de la tabla del nivel.
        if exists (select 1 from unnest(pg_temp.ch_textos(r)) t where t = any (v_ocultos)) then
          raise exception 'nivel %: «%» recibe algo del nivel: %', v_nivel, v_txt, (select array_agg(t) from unnest(pg_temp.ch_textos(r)) t where t = any (v_ocultos));
        end if;
        if pg_temp.ch_trae(r, '{9191.5, 9192.5, 9193.5, 9194.5}') then raise exception 'nivel %: «%» recibe un valor de la tabla del nivel', v_nivel, v_txt; end if;
        -- La celda condicionada por la bandera del nivel llega sin su condición ni su requerido; los modos, sin buckets.
        it := pg_temp.ch_item(r, 'celda', 'cond_oc');
        if (it is null) is distinct from (v_txt = 'solo_crear') or it ? 'condicion' or it ? 'requerido_si' then raise exception 'nivel %: «%» recibe la bandera del nivel en una celda: %', v_nivel, v_txt, it; end if;
        if (select array_agg(t ->> 'clave') from jsonb_array_elements(r -> 'tonos') t) is distinct from (case when v_txt = 'solo_crear' then null else array['verde'] end) then
          raise exception 'nivel %: los tonos de «%»: %', v_nivel, v_txt, r -> 'tonos';
        end if;
      else
        -- Con el nivel, llega todo, con su etiqueta, su ayuda de texto, sus chips y sus dos tonos.
        if (pg_temp.ch_item(r, 'celda', 'x_celda') ->> 'etiqueta') is distinct from 'ETIQ-' || v_tag or (pg_temp.ch_item(r, 'celda', 'x_celda') -> 'ayuda' ->> 'texto') is distinct from 'AYUDA-' || v_tag
           or (r -> 'secciones' -> 2 ->> 'titulo') is distinct from 'SECCION-' || v_tag or jsonb_array_length(pg_temp.ch_item(r, 'atajos', 'x_tabla') -> 'chips') <> 3
           or (select array_agg(t ->> 'clave' order by t ->> 'clave') from jsonb_array_elements(r -> 'tonos') t) is distinct from array['naranja', 'verde'] then
          raise exception 'nivel %: «%» no recibe lo del nivel: %', v_nivel, v_txt, r;
        end if;
        it := pg_temp.ch_item(r, 'celda', 'cond_oc');
        if it ->> 'condicion' is distinct from 'oculta_b' or it ->> 'requerido_si' is distinct from 'oculta_b' then raise exception 'nivel %: «%» no recibe la condición de la celda: %', v_nivel, v_txt, it; end if;
      end if;
      -- Los modos: sólo clave y nombre, para todos (sus buckets nombran el tipo de cambio del nivel).
      if r -> 'cabecera' -> 'modos' is distinct from '[{"clave": "m1", "nombre": "Modo uno"}]'::jsonb or pg_temp.ch_textos(r -> 'cabecera') && array['buckets', 'total_en'] then
        raise exception 'nivel %: «%» recibe más que la clave y el nombre del modo: %', v_nivel, v_txt, r -> 'cabecera';
      end if;
      -- El candado de «solo_n» (ver abierto, editar del nivel): se edita con el permiso de editar el nivel, y si no, dice el nombre del nivel.
      it := pg_temp.ch_item(r, 'celda', 'solo_n');
      if v_txt <> 'solo_crear' then
        if (it ->> 'editable')::boolean is distinct from (v_txt in ('ed', 'con', 'ver_como')) then raise exception 'nivel %: «%» edita solo_n = %', v_nivel, v_txt, it; end if;
        if v_txt not in ('ed', 'con', 'ver_como') and it -> 'motivo' is distinct from jsonb_build_object('codigo', 'nivel', 'nivel', v_nombre) then raise exception 'nivel %: el motivo de solo_n para «%»: %', v_nivel, v_txt, it; end if;
      end if;
      -- La ayuda de la tabla: llega a quien configura y a quien ve la celda que la lee; las dos mismas personas a las que `cotizacion_tabla` se la da.
      it := pg_temp.ch_item(r, 'celda', 'con_ayuda');
      r2 := pg_temp.ch_corre(v_quien, format('select public.cotizacion_tabla(%L, null, %L)', 'ch_tabla', o));
      if v_txt <> 'solo_crear' and ((it ? 'ayuda') is distinct from (v_txt in ('cfg', 'solo_ver', 'con', 'ver_como')) or (it ? 'ayuda') is distinct from not (r2 ? 'error')) then
        raise exception 'nivel %: la ayuda de la tabla para «%»: celda % y cotizacion_tabla %', v_nivel, v_txt, it, left(r2::text, 120);
      end if;
      if v_txt = 'solo_crear' and not (r2 ? 'error') then raise exception 'nivel %: cotizacion_tabla le da la tabla a quien no ve nada', v_nivel; end if;
    end loop;
    -- «Ver como» un rol sin el nivel no cambia lo que decide la base: la interfaz lo estrecha, la base sigue con los permisos reales.
    r := pg_temp.ch_corre(ver_como, format('select public.cotizacion_hoja(%L)', o));
    if pg_temp.ch_items(r) is distinct from v_todo then raise exception 'nivel %: con «ver como» cambia lo que decide la base', v_nivel; end if;
    -- La misma lectura de quien no tiene el nivel, sobre el origen donde sólo lo tiene `ajeno`: la hoja del origen de la fórmula no se mueve por permisos de otro.
    if pg_temp.ch_items(pg_temp.ch_corre(ajeno, format('select public.cotizacion_hoja(%L)', o))) is distinct from v_abierta then raise exception 'nivel %: el nivel de otro origen abre la hoja de éste', v_nivel; end if;
  end loop;
end $$;
rollback;
