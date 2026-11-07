-- `validar_plantilla()` y la plantilla de la tarjeta al guardarla y publicarla (paso 4.18-1). docs/COTIZADOR.md › «Plantilla de tarjeta».
-- T1 corre el juego común `entities/plantilla/casos-de-plantilla.json` (tabla `_juego_de_plantilla`), el mismo que correrá `validarPlantilla()` de TS (4.19).
-- Corre después de `cotizacion-hoja-guardada.sql`; la dueña es `…0001` y la asesora `…00b1` (las crea `humo.sql`). Cada bloque abre su transacción y la revierte.
-- Lo de la semilla se mira contra la v1 de cada fórmula (`humo.sql` publica otras versiones antes de este archivo).

create or replace function pg_temp.pv_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado como texto, o {error, mensaje, detail, hint} si falla.
create or replace function pg_temp.pv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v text; v_d text; v_h text; v_m text; v_e text;
begin
  perform pg_temp.pv_como(p_quien);
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
  return jsonb_build_object('ok', v);
end $f$;

-- Lo que dice `validar_plantilla` de una plantilla: «válida» o «regla@donde» (un error que no es 22023 sube tal cual).
create or replace function pg_temp.pv_veredicto(p_pla jsonb, p_def jsonb, p_dis jsonb, p_vis jsonb, p_tonos text[]) returns text language plpgsql as $f$
declare v_d text; v_h text;
begin
  perform public.validar_plantilla(p_pla, p_def, p_dis, p_vis, p_tonos);
  return 'válida';
exception when sqlstate '22023' then
  get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint;
  return coalesce(v_d, '¿sin regla?') || '@' || coalesce(v_h, '');
end $f$;

-- Una fórmula publicada por el camino de publicar, con un grupo `g1` y un nodo centinela `cent` (etiqueta y descripción con la marca `p_tag`):
--   `p_modo` = 'abierto' (miembro de g1, del nivel «todos»), 'miembro' (miembro de g1 en una sección del nivel `p_nivel`) o 'suelto' (en esa sección, sin grupo).
create or replace function pg_temp.pv_formula(p_origen uuid, p_version int, p_nivel text, p_tag text, p_modo text) returns uuid language plpgsql as $f$
declare v_def jsonb; v_dis jsonb; v_cent jsonb; v_id uuid; v_abierta jsonb; v_nivel jsonb;
begin
  v_cent := jsonb_build_object('id', 'cent', 'tipo', 'input', 'etiqueta', 'CENT-' || p_tag, 'descripcion', 'CDESC-' || p_tag);
  if p_modo <> 'suelto' then v_cent := v_cent || jsonb_build_object('grupo', 'g1'); end if;
  v_def := jsonb_build_object(
    'nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'pub', 'tipo', 'input', 'etiqueta', 'Pública', 'descripcion', 'Lo que se ve', 'grupo', 'g1'),
      v_cent,
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'etiqueta', 'Total', 'salida', 'total',
                         'de', case when p_modo = 'suelto' then jsonb_build_array('pub') else jsonb_build_array('pub', 'cent') end)),
    'buckets', jsonb_build_object('origen', 'tc'), 'total_en', 'tc',
    'grupos', jsonb_build_array(jsonb_build_object('id', 'g1', 'etiqueta', 'Grupo uno', 'plazo', '3 días', 'tono', 'verde', 'bucket', 'origen')));
  v_abierta := jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'tc', 'ancho', 'mitad'), jsonb_build_object('tipo', 'celda', 'nodo', 'pub', 'ancho', 'mitad'));
  v_nivel := '[]'::jsonb;
  if p_modo = 'abierto' then
    v_abierta := v_abierta || jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'cent', 'ancho', 'mitad'));
  else
    v_nivel := jsonb_build_array(jsonb_build_object('tipo', 'celda', 'nodo', 'cent', 'ancho', 'mitad'));
  end if;
  v_dis := jsonb_build_object('cabecera', jsonb_build_object('ver_total_bs', true, 'modos', '[]'::jsonb),
    'secciones', jsonb_build_array(jsonb_build_object('id', 'abierta', 'titulo', 'Abierta', 'presentacion', 'principal', 'items', v_abierta))
              || case when jsonb_array_length(v_nivel) > 0 then jsonb_build_array(jsonb_build_object('id', 'del_nivel', 'titulo', 'Del nivel', 'presentacion', 'principal',
                                                                                                   'nivel_ver', p_nivel, 'nivel_editar', p_nivel, 'items', v_nivel)) else '[]'::jsonb end,
    'tarjeta_total', jsonb_build_object('nodo', 'total', 'secundarios', '[]'::jsonb));
  update public.formulas set estado = 'archivada' where origen_id = p_origen and estado = 'publicada';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_origen, p_version, 'publicada', v_def, '{}'::jsonb, v_dis, public._preparar_publicacion(v_def, '{}'::jsonb, v_dis, false), now()) returning id into v_id;
  return v_id;
end $f$;

-- Una plantilla válida para `pv_formula` (el grupo g1).
create or replace function pg_temp.pv_plantilla_g1() returns jsonb language sql as $f$
  select '{"grupos": [{"grupo": "g1"}], "total": {"etiqueta": "Total"}, "logo": false, "columnas": {"leyenda": true, "tipo_cambio": true, "plazo": true}}'::jsonb
$f$;

-- @test plantilla S0: los miembros de los grupos de la semilla son del nivel «todos»; los tipos de cambio de sus buckets (por omisión y en cada modo), en subasta_usa; planilla_usa no los dibuja y su plantilla va sin esa columna
begin;
do $$
declare v_clave text; f public.formulas; v_malos text[];
begin
  foreach v_clave in array array['subasta_usa', 'planilla_usa'] loop
    select x.* into f from public.formulas x join public.origenes o on o.id = x.origen_id where o.clave = v_clave and x.version = 1;
    if f.id is null then raise exception '%: sin su fórmula v1', v_clave; end if;
    select array_agg(n ->> 'id') into v_malos from jsonb_array_elements(f.definicion -> 'nodos') n
     where n ->> 'grupo' is not null and (f.visibilidad -> (n ->> 'id') ->> 'ver') is distinct from 'todos';
    if v_malos is not null then raise exception '%: miembros de grupo que no son del nivel «todos»: %', v_clave, v_malos; end if;
    if (select count(*) from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'grupo' is not null) <> 11 then
      raise exception '%: esperaba once miembros de grupo', v_clave;
    end if;
    if v_clave = 'planilla_usa' then
      -- Su diseño no dibuja tipos de cambio (S0 del 4.18-1): su plantilla nace sin la columna.
      if exists (select 1 from jsonb_each(f.definicion -> 'buckets') b where f.visibilidad ? (b.value #>> '{}')) then raise exception 'planilla_usa ya dibuja un tipo de cambio: S0 cambió'; end if;
      if (select p.definicion -> 'columnas' -> 'tipo_cambio' from public.plantillas_tarjeta p where p.origen_id = f.origen_id and p.version = 1) is distinct from 'false' then
        raise exception 'la plantilla de planilla_usa nombra los tipos de cambio que su hoja no dibuja';
      end if;
      continue;
    end if;
    select array_agg(x.id) into v_malos from (
      select value #>> '{}' as id from jsonb_each(f.definicion -> 'buckets')
      union all select b ->> 'nodo' from jsonb_array_elements(f.diseno -> 'cabecera' -> 'modos') m, jsonb_array_elements(m -> 'buckets') b) x
     where (f.visibilidad -> x.id ->> 'ver') is distinct from 'todos';
    if v_malos is not null then raise exception '%: tipos de cambio de un bucket que no son del nivel «todos»: %', v_clave, v_malos; end if;
  end loop;
end $$;
rollback;

-- @test plantilla T1: cada caso del juego común da «válida» o su regla con su donde (22023, la regla en DETAIL y el donde en HINT)
begin;
do $$
declare j jsonb; c jsonb; fo jsonb; v_tonos text[]; v_esperado text; v_dio text; v_malos text[] := '{}'; v_n int := 0; v_reglas text[];
begin
  select doc into j from pg_temp._juego_de_plantilla;
  if j is null then raise exception 'no se cargó casos-de-plantilla.json'; end if;
  v_tonos := array(select jsonb_array_elements_text(j -> 'tonos'));
  for c in select * from jsonb_array_elements(j -> 'casos') loop
    v_n := v_n + 1;
    fo := j -> 'formulas' -> (c ->> 'formula');
    if fo is null then raise exception 'el caso «%» nombra una fórmula que no está', c ->> 'nombre'; end if;
    v_esperado := case when c ? 'valida' then 'válida' else (c -> 'motivo' ->> 'regla') || '@' || coalesce(c -> 'motivo' ->> 'donde', '') end;
    v_dio := pg_temp.pv_veredicto(c -> 'plantilla', fo -> 'definicion', fo -> 'diseno', coalesce(c -> 'visibilidad', fo -> 'visibilidad'), v_tonos);
    if v_dio is distinct from v_esperado then v_malos := v_malos || format('«%s»: esperaba %s y dio %s', c ->> 'nombre', v_esperado, v_dio); end if;
  end loop;
  if cardinality(v_malos) > 0 then raise exception '% de % casos no dan lo esperado: %', cardinality(v_malos), v_n, array_to_string(v_malos, ' | '); end if;
  -- El juego tiene un caso válido y uno por cada regla.
  v_reglas := array(select distinct x -> 'motivo' ->> 'regla' from jsonb_array_elements(j -> 'casos') x where x ? 'motivo' order by 1);
  if v_reglas is distinct from array['forma', 'grupo_faltante', 'grupo_inexistente', 'grupo_repetido', 'nodo_inexistente', 'nodo_restringido', 'nodo_sin_lugar',
                                     'tipo_de_cambio_restringido', 'tono_inexistente'] then
    raise exception 'el juego no cubre todas las reglas: %', v_reglas;
  end if;
  -- Sin la fórmula valida sólo la forma: un grupo que no existe pasa.
  if pg_temp.pv_veredicto(j -> 'casos' -> 0 -> 'plantilla' || '{"grupos": [{"grupo": "no_existe"}]}', null, null, null, null) <> 'válida' then
    raise exception 'sin la fórmula, validar_plantilla mira más que la forma';
  end if;
end $$;
rollback;

-- @test plantilla T2: al tope (20 grupos, 200 etiquetas y 200 leyendas sobre una fórmula de 300 nodos) valida; un grupo, una etiqueta o un byte de más es `forma`
begin;
do $$
declare v_def jsonb; v_dis jsonb; v_vis jsonb; v_pla jsonb; v_r text;
begin
  -- 20 grupos de 14 miembros (280) más 19 nodos sueltos y el total: 300 nodos.
  v_def := jsonb_build_object(
    'nodos', (select jsonb_agg(jsonb_build_object('id', 'n' || i, 'tipo', 'input', 'etiqueta', 'Nodo ' || i, 'grupo', 'g' || (1 + (i - 1) / 14)) order by i) from generate_series(1, 280) i)
          || (select jsonb_agg(jsonb_build_object('id', 's' || i, 'tipo', 'input', 'etiqueta', 'Suelto ' || i) order by i) from generate_series(1, 19) i)
          || jsonb_build_array(jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('n1'), 'etiqueta', 'Total', 'salida', 'total')),
    'buckets', jsonb_build_object('b', 's1'), 'total_en', 's1',
    'grupos', (select jsonb_agg(jsonb_build_object('id', 'g' || i, 'etiqueta', 'Grupo ' || i, 'tono', 'verde', 'bucket', 'b') order by i) from generate_series(1, 20) i));
  v_dis := '{"cabecera": {"modos": []}, "secciones": [], "tarjeta_total": {"nodo": "total", "secundarios": []}}';
  v_vis := (select jsonb_object_agg(n ->> 'id', '{"ver": "todos"}'::jsonb) from jsonb_array_elements(v_def -> 'nodos') n);
  if jsonb_array_length(v_def -> 'nodos') <> 300 then raise exception 'la fórmula no tiene 300 nodos'; end if;
  v_pla := jsonb_build_object('grupos', (select jsonb_agg(jsonb_build_object('grupo', 'g' || i, 'tono', 'verde') order by i) from generate_series(1, 20) i),
    'etiquetas', (select jsonb_object_agg('n' || i, 'Etiqueta ' || i) from generate_series(1, 200) i),
    'leyendas', (select jsonb_object_agg('n' || (i + 80), 'Leyenda ' || i) from generate_series(1, 200) i),
    'total', jsonb_build_object('etiqueta', 'Total'), 'logo', true, 'columnas', jsonb_build_object('leyenda', true, 'tipo_cambio', true, 'plazo', true));
  v_r := pg_temp.pv_veredicto(v_pla, v_def, v_dis, v_vis, array['verde']);
  if v_r <> 'válida' then raise exception 'al tope no valida: %', v_r; end if;
  v_r := pg_temp.pv_veredicto(jsonb_set(v_pla, '{etiquetas,n201}', '"Una de más"'), v_def, v_dis, v_vis, array['verde']);
  if v_r <> 'forma@etiquetas' then raise exception '201 etiquetas: %', v_r; end if;
  v_r := pg_temp.pv_veredicto(jsonb_set(v_pla, '{leyendas,n1}', '"Una de más"'), v_def, v_dis, v_vis, array['verde']);
  if v_r <> 'forma@leyendas' then raise exception '201 leyendas: %', v_r; end if;
  v_r := pg_temp.pv_veredicto(jsonb_set(v_pla, '{grupos}', (v_pla -> 'grupos') || '[{"grupo": "g21"}]'), v_def, v_dis, v_vis, array['verde']);
  if v_r <> 'forma@grupos' then raise exception '21 grupos: %', v_r; end if;
  -- Más de 32 KB (en bytes): 200 leyendas de 160 caracteres.
  v_r := pg_temp.pv_veredicto(jsonb_set(v_pla, '{leyendas}', (select jsonb_object_agg('n' || (i + 80), repeat('x', 160)) from generate_series(1, 200) i)), v_def, v_dis, v_vis, array['verde']);
  if v_r <> 'forma@definicion' then raise exception 'más de 32 KB: %', v_r; end if;
end $$;
rollback;

-- @test plantilla T3: guardar el borrador valida la forma (la vieja y una clave de más no se guardan; un grupo que no existe sí) y pide el permiso de siempre
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; asesora constant uuid := '00000000-0000-0000-0000-0000000000b1';
  o uuid := (select id from public.origenes where clave = 'subasta_usa'); r jsonb; v_vieja jsonb; v_buena jsonb;
begin
  v_vieja := (select definicion from public.plantillas_tarjeta where origen_id = o and version = 1) - 'grupos' - 'total' - 'logo' - 'columnas' - 'etiquetas' - 'leyendas' - 'nota'
          || '{"paleta": {"fondo": "#ffffff"}, "columnas": [{"id": "etiqueta", "ancho": 640}], "encabezado": {"titulo": "{{titulo}}"}, "grupos": [{"titulo": "Detalle", "filas": "secciones"}]}';
  r := pg_temp.pv_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, v_vieja));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'forma' then raise exception 'la forma vieja se guarda: %', r; end if;
  v_buena := pg_temp.pv_plantilla_g1();
  r := pg_temp.pv_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, v_buena || '{"pie": "x"}'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'forma' or r ->> 'hint' is distinct from 'pie' then raise exception 'una clave de más se guarda: %', r; end if;
  if exists (select 1 from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') then raise exception 'un rechazo dejó un borrador'; end if;
  -- Sólo la forma: el grupo g1 no es de la fórmula de subasta_usa, y se guarda igual (se valida al publicar).
  r := pg_temp.pv_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L, %L)', o, v_buena, 'Borrador de prueba'));
  if r ? 'error' or (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'borrador') is distinct from v_buena then raise exception 'una forma buena no se guarda: %', r; end if;
  r := pg_temp.pv_corre(asesora, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, v_buena));
  if r ->> 'error' is distinct from '42501' then raise exception 'la asesora guarda una plantilla sin cotizaciones.configurar: %', r; end if;
end $$;
rollback;

-- @test plantilla T4: publicar valida contra la fórmula publicada del origen; un rechazo no archiva la publicada; sin fórmula publicada, `formula_sin_publicar`
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid; o2 uuid; v_pub uuid; r jsonb; v_sub uuid := (select id from public.origenes where clave = 'subasta_usa');
begin
  insert into public.origenes (clave, nombre) values ('pv_t4', 'PV T4') returning id into o;
  insert into public.origenes (clave, nombre) values ('pv_t4_sin', 'PV T4 sin fórmula') returning id into o2;
  perform pg_temp.pv_formula(o, 1, 'costos', 't4', 'miembro');
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en) values (o, 1, 'publicada', pg_temp.pv_plantilla_g1(), now()) returning id into v_pub;
  -- Un miembro del grupo en una sección de «costos»: nodo_restringido@cent, y la publicada sigue publicada.
  perform pg_temp.pv_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o, pg_temp.pv_plantilla_g1()));
  r := pg_temp.pv_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', o, (select actualizado_en from public.plantillas_tarjeta where origen_id = o and estado = 'borrador'), 'v2'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'nodo_restringido' or r ->> 'hint' is distinct from 'cent' then raise exception 'publica un miembro de costos: %', r; end if;
  if (select estado from public.plantillas_tarjeta where id = v_pub) is distinct from 'publicada' then raise exception 'un rechazo archivó la publicada'; end if;
  -- Sin fórmula publicada.
  perform pg_temp.pv_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', o2, pg_temp.pv_plantilla_g1()));
  r := pg_temp.pv_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', o2, (select actualizado_en from public.plantillas_tarjeta where origen_id = o2 and estado = 'borrador'), 'v1'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'formula_sin_publicar' or r ->> 'hint' is distinct from 'origen' then raise exception 'publica sin fórmula: %', r; end if;
  -- Una válida publica la N+1 y archiva la anterior.
  perform pg_temp.pv_corre(duena, format('select public.plantilla_guardar_borrador(%L, null::timestamptz, %L)', v_sub, (select definicion from public.plantillas_tarjeta where origen_id = v_sub and estado = 'publicada')));
  r := pg_temp.pv_corre(duena, format('select public.plantilla_publicar(%L, %L::timestamptz, %L)', v_sub, (select actualizado_en from public.plantillas_tarjeta where origen_id = v_sub and estado = 'borrador'), 'otra'));
  if r ? 'error' then raise exception 'una válida no se publica: %', r; end if;
  if (select version from public.plantillas_tarjeta where origen_id = v_sub and estado = 'publicada') <> 2
     or (select estado from public.plantillas_tarjeta where origen_id = v_sub and version = 1) is distinct from 'archivada' then
    raise exception 'publicar no dejó la v2 publicada y la v1 archivada';
  end if;
end $$;
rollback;

-- @test plantilla T5: la v1 de cada origen del cotizador valida contra su fórmula v1 con los tonos del catálogo; validar_plantilla y sus ayudantes son de authenticated y service_role
begin;
do $$
declare v_clave text; v_r text; v_f text;
begin
  foreach v_clave in array array['subasta_usa', 'planilla_usa', 'oficina'] loop
    select pg_temp.pv_veredicto(p.definicion, f.definicion, f.diseno, f.visibilidad, array(select t.clave from public.tonos t)) into v_r
      from public.origenes o join public.plantillas_tarjeta p on p.origen_id = o.id and p.version = 1 join public.formulas f on f.origen_id = o.id and f.version = 1
     where o.clave = v_clave;
    if v_r is distinct from 'válida' then raise exception 'la plantilla v1 de % no valida contra su fórmula: %', v_clave, v_r; end if;
  end loop;
  if (select p.definicion -> 'grupos' from public.plantillas_tarjeta p join public.origenes o on o.id = p.origen_id where o.clave = 'subasta_usa' and p.version = 1)
     is distinct from '[{"grupo": "compra", "tono": "verde"}, {"grupo": "logistica", "tono": "amarillo"}, {"grupo": "aduana", "tono": "naranja"}]' then
    raise exception 'la plantilla de subasta_usa no lleva sus tres grupos con su tono';
  end if;
  foreach v_f in array array['public.validar_plantilla(jsonb, jsonb, jsonb, jsonb, text[])', 'public._plantilla_forma(jsonb)', 'public._plantilla_nodos(jsonb, jsonb, jsonb, jsonb)'] loop
    if not has_function_privilege('authenticated', v_f, 'execute') or not has_function_privilege('service_role', v_f, 'execute')
       or has_function_privilege('anon', v_f, 'execute') or has_function_privilege('public', v_f, 'execute') then
      raise exception 'privilegios de %', v_f;
    end if;
    if (select prosecdef from pg_proc where oid = v_f::regprocedure) then raise exception '% corre con los derechos de su dueña', v_f; end if;
  end loop;
end $$;
rollback;
