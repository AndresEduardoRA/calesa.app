-- `cotizacion_tarjeta(p_formula)` (paso 4.18-1): lo que dibuja la tarjeta (y el PDF) de una versión de la fórmula, con la plantilla publicada del origen validada
-- contra ESA versión, sólo con lo del nivel «todos». docs/COTIZADOR.md › «La lectura de la tarjeta». K4 es el bloque de lo oculto, por cada nivel, que
-- nombra el inventario de `cotizaciones-visibilidad.sql` (`cubierta_por`). Usa `pg_temp.pv_formula` y `pg_temp.pv_plantilla_g1` de `plantilla-validar.sql`, que corre antes.
-- La dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte. Compara claves y hojas, nunca texto suelto.

create or replace function pg_temp.ct_como(p_quien uuid) returns void language sql as $f$ select pg_temp.pv_como(p_quien) $f$;
-- La tarjeta de esa versión como esa persona: la respuesta, o {error, mensaje} si falla.
create or replace function pg_temp.ct_tarjeta(p_quien uuid, p_formula uuid) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
begin
  perform pg_temp.ct_como(p_quien);
  set local role authenticated;
  begin
    v := public.cotizacion_tarjeta(p_formula);
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos), alcance (por omisión «todos»)}.
create or replace function pg_temp.ct_persona(p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ct_' || substr(v_id::text, 25, 12), 'CT ' || substr(v_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Pone una plantilla publicada en el origen sin pasar por `plantilla_publicar` (archiva la que había: plantillas_publicada_unica).
create or replace function pg_temp.ct_publicar(p_origen uuid, p_def jsonb) returns void language plpgsql as $f$
begin
  update public.plantillas_tarjeta set estado = 'archivada' where origen_id = p_origen and estado = 'publicada';
  insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, publicado_en) values (p_origen, (select coalesce(max(version), 0) + 1 from public.plantillas_tarjeta where origen_id = p_origen), 'publicada', p_def, now());
end $f$;
create or replace function pg_temp.ct_claves(p jsonb) returns text[] language sql as $f$ select array(select k from jsonb_object_keys(p) k order by k) $f$;
create or replace function pg_temp.ct_nombre_tc(p_clave text) returns text language sql as $f$ select nombre from public.tipos_cambio where clave = p_clave and activo $f$;

-- @test tarjeta K1: la de subasta_usa trae sus grupos en el orden de la plantilla, las filas en el de la fórmula, el tono de la plantilla o el del grupo, la leyenda de la plantilla o la descripción, y los tonos como la hoja
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa');
  f uuid; r jsonb; g jsonb; v_pla jsonb; v_of uuid;
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  v_pla := (select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'publicada');
  v_pla := jsonb_set(v_pla, '{grupos}', '[{"grupo": "compra", "tono": "naranja"}, {"grupo": "logistica"}, {"grupo": "aduana", "tono": "naranja"}]')
           || '{"etiquetas": {"fees": "ETQ-FEES", "garantia": "GARANTÍA PARA LA PARTICIPACIÓN"}, "leyendas": {"fees": "LEY-FEES", "grua": ""}}';
  perform pg_temp.ct_publicar(o, v_pla - 'nota');
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'la tarjeta no está lista: %', r; end if;
  if pg_temp.ct_claves(r) is distinct from array['columnas', 'estado', 'grupos', 'logo', 'moneda_bs', 'nota', 'plantilla', 'secundarios', 'tipos_de_cambio', 'tonos', 'total', 'variante'] then
    raise exception 'las claves: %', pg_temp.ct_claves(r);
  end if;
  if r -> 'nota' <> 'null'::jsonb or r -> 'logo' <> 'true'::jsonb or r -> 'columnas' <> v_pla -> 'columnas'
     or (r -> 'plantilla' ->> 'version')::int is distinct from (select version from public.plantillas_tarjeta where origen_id = o and estado = 'publicada') then
    raise exception 'nota, logo, columnas o versión: %', r;
  end if;
  if (select array_agg(x ->> 'id' order by n) from jsonb_array_elements(r -> 'grupos') with ordinality t(x, n)) is distinct from array['compra', 'logistica', 'aduana']
     or (select array_agg(x ->> 'tono' order by n) from jsonb_array_elements(r -> 'grupos') with ordinality t(x, n)) is distinct from array['naranja', 'amarillo', 'naranja'] then
    raise exception 'los grupos o sus tonos: %', r -> 'grupos';
  end if;
  g := r -> 'grupos' -> 0;
  if pg_temp.ct_claves(g) is distinct from array['bucket', 'etiqueta', 'filas', 'id', 'plazo', 'tono'] or g ->> 'etiqueta' <> 'Compra' or g ->> 'plazo' <> '2 días' or g ->> 'bucket' <> 'exterior' then
    raise exception 'el grupo compra: %', g;
  end if;
  if (select array_agg(x ->> 'nodo' order by n) from jsonb_array_elements(g -> 'filas') with ordinality t(x, n)) is distinct from array['remate', 'fees', 'transferencia', 'cuenta_especial']
     or (select array_agg(x ->> 'nodo' order by n) from jsonb_array_elements(r -> 'grupos' -> 1 -> 'filas') with ordinality t(x, n))
        is distinct from array['grua', 'transporte_bolivia', 'transporte_chile', 'comision', 'documentacion', 'export']
     or r -> 'grupos' -> 2 -> 'filas' <> '[{"nodo": "nacionalizacion", "etiqueta": "Nacionalización", "leyenda": "Póliza y gastos aduaneros"}]' then
    raise exception 'las filas: %', r -> 'grupos';
  end if;
  if g -> 'filas' -> 0 <> '{"nodo": "remate", "etiqueta": "Remate (costo aprox.)", "leyenda": "Probabilidad de compra en subasta"}'
     or g -> 'filas' -> 1 <> '{"nodo": "fees", "etiqueta": "ETQ-FEES", "leyenda": "LEY-FEES"}'
     or g -> 'filas' -> 3 <> '{"nodo": "cuenta_especial", "etiqueta": "Cuenta especial USA", "leyenda": null}'
     or r -> 'grupos' -> 1 -> 'filas' -> 0 <> '{"nodo": "grua", "etiqueta": "Grúa", "leyenda": null}' then
    raise exception 'la etiqueta o la leyenda de una fila: %', r -> 'grupos';
  end if;
  if r -> 'total' <> jsonb_build_object('nodo', 'total', 'etiqueta', v_pla -> 'total' ->> 'etiqueta', 'leyenda', v_pla -> 'total' -> 'leyenda')
     or r -> 'secundarios' <> '[{"nodo": "garantia", "etiqueta": "GARANTÍA PARA LA PARTICIPACIÓN"}]' then
    raise exception 'el total o lo aparte: % %', r -> 'total', r -> 'secundarios';
  end if;
  if r -> 'variante' <> jsonb_build_object('nodo', 'variante', 'opciones', (select jsonb_agg(jsonb_build_object('clave', x ->> 'clave', 'titulo', x ->> 'titulo'))
                                            from jsonb_array_elements((select n -> 'opciones' from public.formulas fo, jsonb_array_elements(fo.definicion -> 'nodos') n where fo.id = f and n ->> 'id' = 'variante')) x)) then
    raise exception 'la variante: %', r -> 'variante';
  end if;
  if r -> 'tonos' <> (select jsonb_agg(jsonb_build_object('clave', t.clave, 'claro', jsonb_build_object('fondo', t.claro_fondo, 'borde', t.claro_borde, 'tinta', t.claro_tinta),
                                                          'oscuro', jsonb_build_object('fondo', t.oscuro_fondo, 'borde', t.oscuro_borde, 'tinta', t.oscuro_tinta)) order by t.clave)
                        from public.tonos t where t.clave in ('amarillo', 'naranja')) then
    raise exception 'los tonos: %', r -> 'tonos';
  end if;
  -- Una fórmula sin grupos (oficina): sólo el total, sin tipos de cambio, variante ni tonos.
  select id into v_of from public.formulas where origen_id = (select id from public.origenes where clave = 'oficina') and version = 1;
  r := pg_temp.ct_tarjeta(duena, v_of);
  if r ->> 'estado' is distinct from 'lista' or r -> 'grupos' is distinct from '[]' or r -> 'tipos_de_cambio' is distinct from '{"buckets": {}, "modos": {}}'
     or r -> 'variante' is distinct from 'null' or r -> 'tonos' is distinct from '[]' or r -> 'secundarios' is distinct from '[]' or r #>> '{total,nodo}' is distinct from 'total' then
    raise exception 'la de oficina: %', r;
  end if;
end $$;
rollback;

-- @test tarjeta K2: sin cotizaciones.ver del origen, una versión que no existe y un borrador dan el mismo 42501 con el mismo texto (también a la dueña); con «propios» y una publicada, sí
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa');
  o_of uuid := (select id from public.origenes where clave = 'oficina'); f uuid; v_borr uuid; sin uuid; propios uuid; otro uuid; r jsonb; v_quien uuid; v_cual uuid;
  v_no constant jsonb := '{"error": "42501", "mensaje": "No tienes acceso a esa versión de la fórmula."}';
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  insert into public.formulas (origen_id, estado, definicion, params) select origen_id, 'borrador', definicion, params from public.formulas where id = f returning id into v_borr;
  sin := pg_temp.ct_persona('[{"clave": "leads.ver"}, {"clave": "cotizaciones.crear"}]');
  propios := pg_temp.ct_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o, 'alcance', 'propios')));
  otro := pg_temp.ct_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o_of)));
  foreach v_quien in array array[sin, duena, propios] loop
    foreach v_cual in array array[gen_random_uuid(), v_borr] loop
      r := pg_temp.ct_tarjeta(v_quien, v_cual);
      if r is distinct from v_no then raise exception 'una versión inexistente o un borrador (%) no da el mismo 42501: %', v_cual = v_borr, r; end if;
    end loop;
  end loop;
  foreach v_quien in array array[sin, otro] loop
    r := pg_temp.ct_tarjeta(v_quien, f);
    if r is distinct from v_no then raise exception 'sin cotizaciones.ver del origen: %', r; end if;
  end loop;
  foreach v_quien in array array[propios, duena] loop
    r := pg_temp.ct_tarjeta(v_quien, f);
    if r ->> 'estado' is distinct from 'lista' then raise exception 'con cotizaciones.ver del origen no hay tarjeta: %', r; end if;
  end loop;
  -- Una versión archivada (la de una guardada) también se lee.
  update public.formulas set estado = 'archivada' where id = f;
  if pg_temp.ct_tarjeta(propios, f) ->> 'estado' is distinct from 'lista' then raise exception 'una archivada no se lee'; end if;
end $$;
rollback;

-- @test tarjeta K3: sin_plantilla exacto con la forma vieja y con la N+1 que restringe un miembro (la N sigue lista); un tono borrado del catálogo cae al del grupo; otro error sube tal cual
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o_sub uuid := (select id from public.origenes where clave = 'subasta_usa'); o uuid;
  f1 uuid; fn uuid; fn1 uuid; r jsonb;
begin
  select id into f1 from public.formulas where origen_id = o_sub and version = 1;
  -- (a) la forma vieja.
  perform pg_temp.ct_publicar(o_sub, '{"paleta": {"fondo": "#ffffff"}, "columnas": [], "grupos": [{"titulo": "Detalle", "filas": "secciones"}]}');
  r := pg_temp.ct_tarjeta(duena, f1);
  if r is distinct from '{"estado": "sin_plantilla"}' then raise exception '(a) la forma vieja: %', r; end if;
  -- (b) la plantilla vale para la N y no para la N+1, que pone un miembro en «costos».
  insert into public.origenes (clave, nombre) values ('ct_k3', 'CT K3') returning id into o;
  fn := pg_temp.pv_formula(o, 1, 'costos', 'k3', 'abierto');
  perform pg_temp.ct_publicar(o, pg_temp.pv_plantilla_g1());
  fn1 := pg_temp.pv_formula(o, 2, 'costos', 'k3', 'miembro');
  r := pg_temp.ct_tarjeta(duena, fn1);
  if r is distinct from '{"estado": "sin_plantilla"}' then raise exception '(b) la N+1: %', r; end if;
  r := pg_temp.ct_tarjeta(duena, fn);
  if r ->> 'estado' is distinct from 'lista' or (r #>> '{grupos,0,filas,1,etiqueta}') is distinct from 'CENT-k3' then raise exception '(b) la N: %', r; end if;
  -- (c) un tono que sólo elige la plantilla, borrado del catálogo.
  insert into public.tonos (clave, nombre, claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta)
  select 'ct_tono', 'CT tono', claro_fondo, claro_borde, claro_tinta, oscuro_fondo, oscuro_borde, oscuro_tinta from public.tonos where clave = 'verde';
  perform pg_temp.ct_publicar(o_sub, jsonb_set((select definicion from public.plantillas_tarjeta where origen_id = o_sub and version = 1), '{grupos,0,tono}', '"ct_tono"'));
  r := pg_temp.ct_tarjeta(duena, f1);
  if (r #>> '{grupos,0,tono}') is distinct from 'ct_tono' or not exists (select 1 from jsonb_array_elements(r -> 'tonos') t where t ->> 'clave' = 'ct_tono') then raise exception '(c) el tono elegido: %', r; end if;
  delete from public.tonos where clave = 'ct_tono';
  r := pg_temp.ct_tarjeta(duena, f1);
  if r ->> 'estado' is distinct from 'lista' or (r #>> '{grupos,0,tono}') is distinct from 'verde'
     or (select array_agg(t ->> 'clave' order by t ->> 'clave') from jsonb_array_elements(r -> 'tonos') t) is distinct from array['amarillo', 'naranja', 'verde'] then
    raise exception '(c) con el tono borrado: %', r;
  end if;
end $$;
rollback;

begin;
create or replace function public.validar_plantilla(p_plantilla jsonb, p_def jsonb, p_diseno jsonb, p_visibilidad jsonb, p_tonos text[]) returns void
  language plpgsql set search_path = '' as $f$ begin raise exception 'roto a propósito' using errcode = 'XX000'; end $f$;
do $$
declare r jsonb;
begin
  r := pg_temp.ct_tarjeta('00000000-0000-0000-0000-000000000001', (select f.id from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = 'subasta_usa' and f.version = 1));
  if r ->> 'error' is distinct from 'XX000' then raise exception '(d) un error que no es un rechazo se volvió otra cosa: %', r; end if;
end $$;
rollback;

-- @test tarjeta K4: por cada nivel (costos y uno creado con nivel_crear), un nodo del nivel (miembro de la N+1, nombrado por una plantilla metida directo o suelto) no sale ni por su id, ni por su etiqueta, ni por su descripción, ni por el texto de la plantilla
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; v_nuevo uuid := gen_random_uuid(); v_nivel text; v_i int := 0; v_tag text;
  o_a uuid; o_b uuid; o_c uuid; f_i uuid; f_ii uuid; f_iii uuid; asesora uuid; v_quien uuid; r jsonb; v_caso text; v_esperado text;
begin
  perform pg_temp.ct_como(duena);
  set local role authenticated;
  perform public.nivel_crear(v_nuevo, 'Gerencia CT');
  reset role;
  foreach v_nivel in array array['costos', (select clave from public.cotizaciones_niveles where nombre = 'Gerencia CT')] loop
    v_i := v_i + 1; v_tag := 'k4n' || v_i;
    insert into public.origenes (clave, nombre) values ('ct_k4a_' || v_i, 'CT K4 A ' || v_i) returning id into o_a;
    insert into public.origenes (clave, nombre) values ('ct_k4b_' || v_i, 'CT K4 B ' || v_i) returning id into o_b;
    insert into public.origenes (clave, nombre) values ('ct_k4c_' || v_i, 'CT K4 C ' || v_i) returning id into o_c;
    -- (i) la plantilla vale para la N (el centinela abierto) y la N+1 lo pone en el nivel.
    perform pg_temp.pv_formula(o_a, 1, v_nivel, v_tag || 'i', 'abierto');
    perform pg_temp.ct_publicar(o_a, pg_temp.pv_plantilla_g1());
    f_i := pg_temp.pv_formula(o_a, 2, v_nivel, v_tag || 'i', 'miembro');
    -- (ii) miembro del nivel y nombrado por una plantilla publicada sin pasar por plantilla_publicar.
    f_ii := pg_temp.pv_formula(o_b, 1, v_nivel, v_tag || 'ii', 'miembro');
    perform pg_temp.ct_publicar(o_b, pg_temp.pv_plantilla_g1() || jsonb_build_object('etiquetas', jsonb_build_object('cent', 'PLAETQ-' || v_tag),
                                                                                   'leyendas', jsonb_build_object('cent', 'PLALEY-' || v_tag)));
    -- (iii) suelto: del nivel, ni miembro ni nombrado.
    f_iii := pg_temp.pv_formula(o_c, 1, v_nivel, v_tag || 'iii', 'suelto');
    perform pg_temp.ct_publicar(o_c, pg_temp.pv_plantilla_g1());
    asesora := pg_temp.ct_persona(jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver'), jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.ver'),
                                                    jsonb_build_object('clave', 'cotizaciones.nivel.' || v_nivel || '.editar')));
    foreach v_quien in array array[duena, asesora] loop
      foreach v_caso in array array['i', 'ii', 'iii'] loop
        r := pg_temp.ct_tarjeta(v_quien, case v_caso when 'i' then f_i when 'ii' then f_ii else f_iii end);
        if r ? 'error' then raise exception 'nivel %, caso %: %', v_nivel, v_caso, r; end if;
        if position('cent' in r::text) > 0 or position('CENT-' in r::text) > 0 or position('CDESC-' in r::text) > 0 or position('PLAETQ-' in r::text) > 0 or position('PLALEY-' in r::text) > 0 then
          raise exception 'nivel %, caso %: sale el nodo del nivel: %', v_nivel, v_caso, r;
        end if;
        v_esperado := case when v_caso = 'iii' then 'lista' else 'sin_plantilla' end;
        if r ->> 'estado' is distinct from v_esperado then raise exception 'nivel %, caso %: el estado: %', v_nivel, v_caso, r; end if;
      end loop;
    end loop;
  end loop;
end $$;
rollback;

-- @test tarjeta K5: los tipos de cambio por su nombre, por bucket y por modo (uno inactivo, nulo); sin la columna, vacíos; nunca el id ni la clave del nodo
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb;
begin
  select id into f from public.formulas where origen_id = o and version = 1;
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'no está lista: %', r; end if;
  if r -> 'tipos_de_cambio' is distinct from jsonb_build_object(
       'buckets', jsonb_build_object('exterior', pg_temp.ct_nombre_tc('paralelo'), 'aduana', pg_temp.ct_nombre_tc('oficial')),
       'modos', jsonb_build_object('paralelo', jsonb_build_object('exterior', pg_temp.ct_nombre_tc('paralelo'), 'aduana', pg_temp.ct_nombre_tc('oficial')),
                                   'unificado', jsonb_build_object('exterior', pg_temp.ct_nombre_tc('unificado'), 'aduana', pg_temp.ct_nombre_tc('oficial')))) then
    raise exception 'los tipos de cambio: %', r -> 'tipos_de_cambio';
  end if;
  if position('tc_' in (r -> 'tipos_de_cambio')::text) > 0 then raise exception 'sale el id de un nodo tipo_cambio: %', r -> 'tipos_de_cambio'; end if;
  update public.tipos_cambio set activo = false where clave = 'unificado';
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' then raise exception 'con uno inactivo no está lista: %', r; end if;
  if r #> '{tipos_de_cambio,modos,unificado,exterior}' is distinct from 'null'::jsonb or r #>> '{tipos_de_cambio,modos,unificado,aduana}' is distinct from pg_temp.ct_nombre_tc('oficial') then
    raise exception 'uno inactivo: %', r -> 'tipos_de_cambio';
  end if;
  perform pg_temp.ct_publicar(o, jsonb_set((select definicion from public.plantillas_tarjeta where origen_id = o and estado = 'publicada'), '{columnas,tipo_cambio}', 'false'));
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' or r -> 'tipos_de_cambio' is distinct from '{"buckets": {}, "modos": {}}' then raise exception 'sin la columna: %', r; end if;
end $$;
rollback;

-- @test tarjeta K6: la moneda del total en Bs es la del tipo de cambio que nombra el total_en de ESA versión (no la de un bucket), la misma que da la hoja
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; o uuid := (select id from public.origenes where clave = 'subasta_usa'); f uuid; r jsonb; h jsonb; v_def jsonb;
begin
  -- Una versión cuyo total_en es un tipo de cambio a otra moneda (los de la semilla son todos a BOB): el del modo unificado, que ningún bucket usa por omisión.
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('ct_eur', 'CT a euros', 'USD', 'EUR', 0.92);
  select jsonb_set(jsonb_set(x.definicion, '{total_en}', '"tc_unificado"'), '{nodos}',
                   (select jsonb_agg(case when n ->> 'id' = 'tc_unificado' then n || '{"clave": "ct_eur"}' else n end order by t.pos)
                      from jsonb_array_elements(x.definicion -> 'nodos') with ordinality t (n, pos)))
    into v_def from public.formulas x where x.origen_id = o and x.version = 1;
  update public.formulas set estado = 'archivada' where origen_id = o and estado = 'publicada';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select origen_id, (select max(version) + 1 from public.formulas where origen_id = o), 'publicada', v_def, params, diseno, visibilidad, now()
    from public.formulas where origen_id = o and version = 1 returning id into f;
  r := pg_temp.ct_tarjeta(duena, f);
  if r ->> 'estado' is distinct from 'lista' or r -> 'moneda_bs' is distinct from '"EUR"' then raise exception 'moneda_bs de la versión: %', r; end if;
  h := (pg_temp.pv_corre(duena, format('select public.cotizacion_hoja(%L)', o)) ->> 'ok')::jsonb;
  if h #> '{cabecera,moneda_bs}' is distinct from r -> 'moneda_bs' then raise exception 'la hoja dice % y la tarjeta %', h #> '{cabecera,moneda_bs}', r -> 'moneda_bs'; end if;
  -- La v1 (total_en = el paralelo, a BOB) sigue con la suya: la moneda es de la versión.
  r := pg_temp.ct_tarjeta(duena, (select id from public.formulas where origen_id = o and version = 1));
  if r -> 'moneda_bs' is distinct from '"BOB"' then raise exception 'moneda_bs de la v1: %', r -> 'moneda_bs'; end if;
end $$;
rollback;

-- @test tarjeta K7: cotizacion_tarjeta es de authenticated y service_role (no de anon ni PUBLIC), corre con los derechos de su dueña y search_path vacío; sus ayudantes, sólo de service_role
do $$
declare v_f text; v_quien text[]; v_esperado text[];
begin
  foreach v_f in array array['public.cotizacion_tarjeta(uuid)', 'public._tarjeta_grupos(jsonb, jsonb, jsonb)', 'public._tarjeta_tipos_de_cambio(jsonb, jsonb, text[])'] loop
    v_quien := array(select r from unnest(array['authenticated', 'service_role', 'anon', 'public']) r where has_function_privilege(r, v_f, 'execute'));
    v_esperado := case when v_f like '%cotizacion_tarjeta%' then array['authenticated', 'service_role'] else array['service_role'] end;
    if v_quien is distinct from v_esperado then raise exception 'privilegios de %: %', v_f, v_quien; end if;
  end loop;
  if not (select prosecdef and proconfig = array['search_path=""'] from pg_proc where oid = 'public.cotizacion_tarjeta(uuid)'::regprocedure) then raise exception 'cotizacion_tarjeta no tiene los derechos de su dueña y search_path vacío'; end if;
end $$;
