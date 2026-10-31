-- `cotizacion_guardar()` (paso 4.10, prompt 3): la única edición de una cotización. Lo que no se ve no viaja (por nivel) lo prueba `cotizaciones-visibilidad.sql`; acá va la
-- conducta: la versión, SU versión de la fórmula y SUS tipos de cambio, los permisos, el intento, lo que no se edita, el título, las notas, el modo, el vehículo y las
-- revisiones. `cotizacion-reconstruir.sql` prueba la propiedad de lo que se reconstruye de lo guardado.
-- Corre después de `cotizacion-crear.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.

-- Una cotización escrita directo (como postgres) sobre una fórmula publicada nueva: sirve para probar la versión sin pasar por ninguna RPC.
-- Los teléfonos de los leads de la prueba salen de una secuencia: un número fijo chocaría consigo mismo si un bloque preparara dos terrenos, y uno al azar
-- chocaba de vez en cuando con un lead vivo que dejó otra prueba (`docs/PLAN.md`, 4-22). Nadie más usa 7213xxxx.
create temp sequence cg_telefono;
create or replace function pg_temp.cg_basica() returns jsonb language plpgsql as $f$
declare
  o uuid; f uuid; c uuid;
  v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cg_' || substr(gen_random_uuid()::text, 1, 8), 'CG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (o, '00000000-0000-0000-0000-000000000001', f, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10) returning id into c;
  return jsonb_build_object('o', o, 'f', f, 'c', c);
end $f$;

-- Lo mismo que cotizacion-crear.sql: llamar como una persona (authenticated), devolver el resultado o {error, mensaje, detail, hint}, y armar personas con un rol propio.
create or replace function pg_temp.cg_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

create or replace function pg_temp.cg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform pg_temp.cg_como(p_quien);
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

create or replace function pg_temp.cg_persona(p_id uuid, p_claves text[], p_origen uuid default null) returns void language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cg_' || substr(p_id::text, 25, 12), 'CG ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, p_origen, 'todos');
  end loop;
end $f$;

-- El terreno de guardar: un origen con una fórmula publicada de nueve nodos, un lead y un vehículo (y otro), las personas y UNA cotización ya guardada (escrita directo, consistente con la fórmula).
--   visible   input, lo ven y lo editan todos          fijo        input, lo ven todos y nadie lo edita          ajuste  cálculo sobrescribible que no entra al total
--   oculto    input del nivel «costos»                 b_costos    bandera del nivel «costos»          bono_costos  input de «costos», sólo con b_costos encendida
--   der_costos cálculo de «costos» (= visible)         aparte_costos  input de «costos» que no entra al total       total  suma de todo lo demás, lo ven todos y nadie lo edita
-- Personas: a (cotiza: ver, crear, editar, leads y vehículos), k (a + ver y editar el nivel «costos»), kv (a + sólo ver «costos»), ke (a + sólo editar «costos»), sc (sólo ver),
-- fg (a + gestionar finales), aj (a, pero en OTRO origen), sl (sin leads.ver: igual puede guardar, el lead no se mira). La cotización: visible 100, fijo 5, oculto 25, b_costos encendida, bono 7, aparte 3 (total 237).
create or replace function pg_temp.cg_preparar() returns jsonb language plpgsql as $f$
declare
  o uuid; o2 uuid; f uuid; l uuid; v uuid; v2 uuid; c uuid := gen_random_uuid(); v_def jsonb; v_vis jsonb; v_res jsonb; v_ent jsonb;
  a uuid := gen_random_uuid(); k uuid := gen_random_uuid(); kv uuid := gen_random_uuid(); ke uuid := gen_random_uuid(); sc uuid := gen_random_uuid(); fg uuid := gen_random_uuid();
  aj uuid := gen_random_uuid(); sl uuid := gen_random_uuid();
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver'];
begin
  insert into public.origenes (clave, nombre) values ('cg_' || substr(gen_random_uuid()::text, 1, 8), 'CG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.origenes (clave, nombre) values ('cg_' || substr(gen_random_uuid()::text, 1, 8), 'CG otro ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o2;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'fijo', 'tipo', 'input', 'etiqueta', 'Fijo', 'bucket', 'origen'),
    jsonb_build_object('id', 'oculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
    jsonb_build_object('id', 'b_costos', 'tipo', 'bandera', 'etiqueta', 'Bono'),
    jsonb_build_object('id', 'bono_costos', 'tipo', 'input', 'etiqueta', 'Bono', 'condicion', 'b_costos', 'bucket', 'origen'),
    jsonb_build_object('id', 'aparte_costos', 'tipo', 'input', 'etiqueta', 'Aparte', 'bucket', 'origen'),
    jsonb_build_object('id', 'ajuste', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Ajuste', 'sobrescribible', true, 'bucket', 'origen'),
    jsonb_build_object('id', 'der_costos', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Derivado', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'fijo', 'oculto', 'bono_costos', 'der_costos'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                              'fijo', jsonb_build_object('ver', 'todos', 'editar', null), 'oculto', jsonb_build_object('ver', 'costos', 'editar', 'costos'),
                              'b_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'bono_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'),
                              'der_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'aparte_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'ajuste', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en) values (o, 1, 'publicada', v_def, '{}',
    '{"cabecera": {"modos": [{"clave": "paralelo", "nombre": "Paralelo", "buckets": [{"bucket": "origen", "nodo": "tc"}], "total_en": "tc"}]}}', v_vis, now() - interval '10 days') returning id into f;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en) values (o2, 1, 'publicada', v_def, '{}', '{}', v_vis, now() - interval '10 days');
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CG lead', '7213' || lpad(nextval('pg_temp.cg_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CG vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CG vehículo 2', 'mazda') returning id into v2;
  perform pg_temp.cg_persona(a, v_base, o);
  perform pg_temp.cg_persona(k, v_base || array['cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar'], o);
  perform pg_temp.cg_persona(kv, v_base || array['cotizaciones.nivel.costos.ver'], o);
  perform pg_temp.cg_persona(ke, v_base || array['cotizaciones.nivel.costos.editar'], o);
  perform pg_temp.cg_persona(sc, array['cotizaciones.ver', 'leads.ver', 'vehiculos.ver'], o);
  perform pg_temp.cg_persona(fg, v_base || array['cotizaciones.final.gestionar'], o);
  perform pg_temp.cg_persona(aj, v_base, o2);
  perform pg_temp.cg_persona(sl, array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'vehiculos.ver'], o);
  -- La cotización: el resultado del motor con esas entradas, tal cual lo guardaría crear (la fila la escribe postgres).
  v_ent := '{"inputs": {"visible": 100, "fijo": 5, "oculto": 25, "bono_costos": 7, "aparte_costos": 3}, "banderas": {"b_costos": true}, "overrides": {}, "vehiculo": {}, "tablas": {}}'::jsonb
           || jsonb_build_object('tipos_cambio', jsonb_build_object('oficial', (select valor from public.tipos_cambio where clave = 'oficial')));
  v_res := public.evaluar_formula(v_def, '{}', v_ent, null);
  insert into public.cotizaciones (id, origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (c, o, l, v, a, f, v_res -> 'valores', v_res -> 'fuentes', v_ent -> 'tipos_cambio', v_res -> 'totales', (v_res #>> '{totales,usd}')::numeric);
  return jsonb_build_object('o', o, 'o2', o2, 'f', f, 'l', l, 'v', v, 'v2', v2, 'c', c, 'a', a, 'k', k, 'kv', kv, 'ke', ke, 'sc', sc, 'fg', fg, 'aj', aj, 'sl', sl);
end $f$;

-- Una llamada a cotizacion_evaluar sobre la cotización con esas entradas (y, opcional, otro vehículo).
create or replace function pg_temp.cg_evalua(p_c uuid, p_entradas text, p_v uuid default null) returns text language sql as $f$
  select format('select public.cotizacion_evaluar(%L::jsonb, %L, null, %L)', p_entradas, p_c, p_v)
$f$;

-- @test cotizacion_guardar: la versión de una cotización se mueve con cada cambio (también dos en la misma transacción) y no con los contadores de favoritos y reportes
begin;
do $$
declare
  t jsonb := pg_temp.cg_basica(); c uuid := (t ->> 'c')::uuid;
  v0 timestamptz; v1 timestamptz; v2 timestamptz; v_rev int; v_act int;
begin
  select actualizado_en into v0 from public.cotizaciones where id = c;
  update public.cotizaciones set notas = 'uno' where id = c;
  select actualizado_en into v1 from public.cotizaciones where id = c;
  if v1 <= v0 then raise exception 'un cambio debía mover la versión (% -> %)', v0, v1; end if;
  -- Dos cambios en la misma transacción: now() no se mueve, la versión sí.
  update public.cotizaciones set notas = 'dos' where id = c;
  select actualizado_en into v2 from public.cotizaciones where id = c;
  if v2 <= v1 then raise exception 'dos cambios en la misma transacción debían dar dos versiones (% -> %)', v1, v2; end if;
  -- Un update que no cambia nada no mueve la versión.
  update public.cotizaciones set notas = 'dos' where id = c;
  if (select actualizado_en from public.cotizaciones where id = c) is distinct from v2 then raise exception 'un update sin cambios movió la versión'; end if;

  -- Un favorito y un reporte (los cuentan triggers) no son un cambio de la cotización: ni la versión, ni una revisión, ni una fila de actividad.
  select count(*) into v_rev from public.cotizaciones_revisiones where cotizacion_id = c;
  select count(*) into v_act from public.actividad where tabla = 'cotizaciones' and registro_id = c::text;
  insert into public.cotizaciones_favoritos (cotizacion_id, usuario_id) values (c, '00000000-0000-0000-0000-000000000001');
  insert into public.cotizaciones_reportes (cotizacion_id, usuario_id, motivo) values (c, '00000000-0000-0000-0000-000000000001', 'x');
  if (select favoritos_count from public.cotizaciones where id = c) is distinct from 1 or (select reportes_count from public.cotizaciones where id = c) is distinct from 1 then
    raise exception 'los contadores debían subir';
  end if;
  if (select actualizado_en from public.cotizaciones where id = c) is distinct from v2 then raise exception 'un favorito o un reporte movió la versión'; end if;
  if (select count(*) from public.cotizaciones_revisiones where cotizacion_id = c) is distinct from v_rev then raise exception 'un favorito o un reporte dejó una revisión'; end if;
  if (select count(*) from public.actividad where tabla = 'cotizaciones' and registro_id = c::text) is distinct from v_act then raise exception 'un favorito o un reporte quedó en actividad'; end if;
  -- Y uno que sí cambia algo, junto con un contador, sí la mueve.
  update public.cotizaciones set titulo = 'T', favoritos_count = 5 where id = c;
  if (select actualizado_en from public.cotizaciones where id = c) <= v2 then raise exception 'un cambio de título junto a un contador debía mover la versión'; end if;
  if (select count(*) from public.actividad where tabla = 'cotizaciones' and registro_id = c::text) is distinct from v_act + 1 then raise exception 'un cambio real debía quedar en actividad'; end if;
end $$;
rollback;

-- @test cotizacion_guardar: la revisión guarda sólo los nodos que cambiaron, con el intento y la huella del guardado, y esas dos columnas no se leen
begin;
do $$
declare
  t jsonb := pg_temp.cg_basica(); c uuid := (t ->> 'c')::uuid; i uuid := gen_random_uuid(); d jsonb; r public.cotizaciones_revisiones;
begin
  -- Un nodo cambia, otro no: el diff trae sólo el que cambió, en valores y en fuentes por separado (fuentes no cambió, no figura).
  update public.cotizaciones set valores = '{"visible": 20, "total": 10}' where id = c;
  select * into r from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if r.diff is distinct from '{"valores": {"de": {"visible": 10}, "a": {"visible": 20}}}'::jsonb then raise exception 'el diff no es por nodo: %', r.diff; end if;
  if r.intento is not null or r.huella is not null then raise exception 'un cambio sin guardado no lleva intento ni huella: % %', r.intento, r.huella; end if;
  -- Un nodo que aparece o desaparece figura en un solo lado; uno que pasa a nulo figura con el jsonb null (no es lo mismo que faltar).
  update public.cotizaciones set valores = '{"visible": null, "total": 10, "nuevo": 5}', fuentes = '{}' where id = c;
  select * into r from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if r.diff is distinct from '{"valores": {"de": {"visible": 20}, "a": {"visible": null, "nuevo": 5}}, "fuentes": {"de": {"visible": "input"}, "a": {}}}'::jsonb then
    raise exception 'el diff de un nodo nulo, uno nuevo y uno que se va: %', r.diff;
  end if;
  -- El resto de las columnas, tal cual: de y a enteros.
  update public.cotizaciones set titulo = 'Nuevo', totales = '{"usd": 11}' where id = c;
  select * into r from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if r.diff is distinct from '{"titulo": {"de": null, "a": "Nuevo"}, "totales": {"de": {"usd": 10}, "a": {"usd": 11}}}'::jsonb then raise exception 'las demás columnas, tal cual: %', r.diff; end if;

  -- El intento y la huella que deja cotizacion_guardar en el ajuste de la transacción.
  perform set_config('importadora.guardado', jsonb_build_object('intento', i, 'huella', 'abc')::text, true);
  update public.cotizaciones set notas = 'con intento' where id = c;
  select * into r from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if r.intento is distinct from i or r.huella is distinct from 'abc' then raise exception 'la revisión no lleva el intento y la huella: % %', r.intento, r.huella; end if;
  -- Limpiado con '' (lo que queda tras fijarlo una vez en la sesión), la revisión siguiente no los lleva.
  perform set_config('importadora.guardado', '', true);
  update public.cotizaciones set notas = 'sin intento' where id = c;
  select * into r from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if r.intento is not null or r.huella is not null then raise exception 'el ajuste vacío dejó el intento: % %', r.intento, r.huella; end if;
  -- Un intento es de una sola revisión de la cotización; el mismo en otra cotización no choca.
  begin
    insert into public.cotizaciones_revisiones (cotizacion_id, diff, intento, huella) values (c, '{}', i, 'otra');
    raise exception 'el mismo intento entró dos veces a la misma cotización';
  exception when unique_violation then null; end;
  d := pg_temp.cg_basica();
  insert into public.cotizaciones_revisiones (cotizacion_id, diff, intento, huella) values ((d ->> 'c')::uuid, '{}', i, 'otra');

  -- Ni authenticated ni anon las leen (la lista exacta de columnas legibles la guarda cotizaciones-visibilidad.sql).
  if has_column_privilege('authenticated', 'public.cotizaciones_revisiones', 'intento', 'select') or has_column_privilege('authenticated', 'public.cotizaciones_revisiones', 'huella', 'select')
     or has_column_privilege('anon', 'public.cotizaciones_revisiones', 'intento', 'select') or has_column_privilege('anon', 'public.cotizaciones_revisiones', 'huella', 'select') then
    raise exception 'el intento o la huella de una revisión se pueden leer';
  end if;
end $$;
rollback;

-- @test cotizacion_evaluar con una cotización: lo que quien llama no ve o no edita es lo guardado, lo que edita es lo que manda, y lo derivado se recalcula
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; r2 jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; k uuid := (t ->> 'k')::uuid; sc uuid := (t ->> 'sc')::uuid;
  v_antes jsonb;
begin
  select to_jsonb(x) into v_antes from (select valores, fuentes, totales, total_base, actualizado_en from public.cotizaciones where id = c) x;
  -- Quien no ve el nivel cambia lo visible: el costo guardado (25), la bandera y el bono (7) se conservan y lo derivado (der_costos = visible) se recalcula: 200 + 5 + 25 + 7 + 200 = 437.
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{"inputs": {"visible": 200}}'));
  if r ? 'error' then raise exception 'evaluar falló: %', r; end if;
  if (r -> 'valores' ->> 'total')::numeric is distinct from 437 or (r -> 'totales' ->> 'usd')::numeric is distinct from 437 then raise exception 'el total debía conservar lo oculto (437): %', r -> 'totales'; end if;
  if r::text like '%oculto%' or r::text like '%der_costos%' or r::text like '%b_costos%' or r::text like '%bono_costos%' or r::text like '%aparte_costos%' then raise exception 'viaja algo del nivel: %', r; end if;
  -- Mandando lo mismo que está guardado de lo que edita, da lo guardado; sin mandarlo, lo que edita queda sin tipear (↺) y lo demás se conserva: 0 + 5 + 25 + 7 + 0 = 37.
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{"inputs": {"visible": 100}}'));
  if (r -> 'valores' ->> 'total')::numeric is distinct from 100 + 5 + 25 + 7 + 100 then raise exception 'mandando lo guardado debía dar lo guardado (237): %', r -> 'valores'; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{}'));
  if (r -> 'valores' ->> 'total')::numeric is distinct from 37 then raise exception 'sin mandar nada lo que edita debía quedar sin tipear (37): %', r -> 'valores'; end if;
  -- Un valor igual al guardado para lo que ve y no edita no es un cambio; uno distinto es nodo_no_editable.
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{"inputs": {"visible": 100, "fijo": 5}}'));
  if r ? 'error' then raise exception 'repetir lo guardado de un nodo no editable no debía fallar: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{"inputs": {"fijo": 6}}'));
  if r ->> 'error' is distinct from '42501' or r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from 'fijo' then raise exception 'cambiar un nodo no editable: %', r; end if;
  -- Lo oculto sigue sin poder nombrarse: el error del que no existe.
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{"inputs": {"oculto": 1}}'));
  r2 := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{"inputs": {"zz_inexistente": 1}}'));
  if r ->> 'error' is distinct from '22023' or replace(r::text, 'oculto', 'zz_inexistente') is distinct from r2::text then raise exception 'un nodo oculto debía dar el error de uno inexistente: % / %', r, r2; end if;
  -- Quien edita el nivel: lo que manda entra, lo que no manda queda sin tipear (la bandera apagada: sin bono).
  r := pg_temp.cg_corre(k, pg_temp.cg_evalua(c, '{"inputs": {"visible": 200, "oculto": 30, "bono_costos": 9}, "banderas": {"b_costos": true}}'));
  if (r -> 'valores' ->> 'total')::numeric is distinct from 200 + 5 + 30 + 9 + 200 then raise exception 'quien edita el nivel debía poder cambiarlo (444): %', r -> 'valores'; end if;
  r := pg_temp.cg_corre(k, pg_temp.cg_evalua(c, '{"inputs": {"visible": 200, "oculto": 30}}'));
  if (r -> 'valores' ->> 'total')::numeric is distinct from 200 + 5 + 30 + 0 + 200 then raise exception 'lo que edita y no manda debía quedar sin tipear (435): %', r -> 'valores'; end if;
  -- Quien sólo ve (o sólo edita) el nivel: lo que ve y no edita es lo guardado.
  r := pg_temp.cg_corre((t ->> 'kv')::uuid, pg_temp.cg_evalua(c, '{"inputs": {"oculto": 99}}'));
  if r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from 'oculto' then raise exception 'ver sin editar el nivel: %', r; end if;
  r := pg_temp.cg_corre((t ->> 'kv')::uuid, pg_temp.cg_evalua(c, '{"inputs": {"oculto": 25, "visible": 50}}'));
  if r ? 'error' or (r -> 'valores' ->> 'total')::numeric is distinct from 50 + 5 + 25 + 7 + 50 then raise exception 'ver sin editar el nivel, con lo guardado: %', r; end if;
  -- Otro vehículo para ese cálculo: se acepta (uno que ve), no con uno que no ve, ni en una final.
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{}', (t ->> 'v2')::uuid));
  if r ? 'error' then raise exception 'otro vehículo para el cálculo: %', r; end if;
  r := pg_temp.cg_corre(sc, pg_temp.cg_evalua(c, '{}', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' then raise exception 'un vehículo inexistente: %', r; end if;
  -- Evaluar no escribe nada.
  if (select to_jsonb(x) from (select valores, fuentes, totales, total_base, actualizado_en from public.cotizaciones where id = c) x) is distinct from v_antes then raise exception 'evaluar escribió la cotización'; end if;
  update public.cotizaciones set clase = 'final' where id = c;
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{}', (t ->> 'v2')::uuid));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'llamada_invalida' or r ->> 'hint' is distinct from 'p_vehiculo' then raise exception 'una final no cambia de vehículo: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_evalua(c, '{}', (t ->> 'v')::uuid));
  if r ? 'error' then raise exception 'una final con su mismo vehículo debía evaluar: %', r; end if;
end $$;
rollback;

-- Una llamada a cotizacion_guardar (la versión se pasa tal cual: se escribe con %L; «Ver total Bs» va en texto, `p_ver`, para poder mandar nulo).
create or replace function pg_temp.cg_sql(p_c uuid, p_intento uuid, p_version timestamptz, p_entradas text, p_modo text, p_titulo text, p_notas text, p_v uuid, p_ver text default 'false') returns text language sql as $f$
  select format('select public.cotizacion_guardar(%L, %L, %L, %L::jsonb, %L, %L, %L, %L, %L::boolean)', p_c, p_intento, p_version, p_entradas, p_modo, p_titulo, p_notas, p_v, p_ver)
$f$;
create or replace function pg_temp.cg_ver(p_c uuid) returns timestamptz language sql as $f$ select actualizado_en from public.cotizaciones where id = p_c $f$;
create or replace function pg_temp.cg_veh(p_c uuid) returns uuid language sql as $f$ select vehiculo_id from public.cotizaciones where id = p_c $f$;
create or replace function pg_temp.cg_revs(p_c uuid) returns bigint language sql as $f$ select count(*) from public.cotizaciones_revisiones where cotizacion_id = p_c $f$;
-- Las claves de objeto y las hojas (escalares) de un jsonb, a cualquier profundidad. Para preguntar por estructura y no por el texto de una respuesta que trae
-- uuids y fechas: `r::text ~ '99'` caía cuando el usuario_id traía «99» (4.10-3b).
create or replace function pg_temp.cg_claves(p jsonb) returns setof text language sql as $f$
  select k from jsonb_path_query(p, 'strict $.**') v, jsonb_object_keys(case when jsonb_typeof(v) = 'object' then v end) k
$f$;
create or replace function pg_temp.cg_hojas(p jsonb) returns setof jsonb language sql as $f$
  select v from jsonb_path_query(p, 'strict $.**') v where jsonb_typeof(v) not in ('object', 'array')
$f$;

-- Pone si el diseño de esa versión ofrece «Ver total Bs» (diseno.cabecera.ver_total_bs).
create or replace function pg_temp.cg_ofrece(p_f uuid, p_ofrece boolean) returns void language plpgsql as $f$
begin
  update public.formulas set diseno = jsonb_set(diseno, '{cabecera,ver_total_bs}', to_jsonb(p_ofrece)) where id = p_f;
end $f$;

-- @test cotizacion_guardar: guarda lo que edita, conserva lo oculto byte a byte, recalcula lo derivado, devuelve sólo lo que se ve y deja una revisión por nodo con su intento
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; k uuid := (t ->> 'k')::uuid; v uuid := (t ->> 'v')::uuid;
  i1 uuid := gen_random_uuid(); i2 uuid := gen_random_uuid(); antes public.cotizaciones; despues public.cotizaciones; rev public.cotizaciones_revisiones; n text;
begin
  select * into antes from public.cotizaciones where id = c;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, antes.actualizado_en, '{"inputs": {"visible": 200}}', null, ' Nuevo título ', ' una nota ', v));
  if r ? 'error' then raise exception 'guardar falló: %', r; end if;
  if r ->> 'repetido' is distinct from 'false' or r -> 'cotizacion' ->> 'titulo' is distinct from 'Nuevo título' or r -> 'cotizacion' ->> 'notas' is distinct from 'una nota' then raise exception 'la respuesta no es lo guardado: %', r -> 'cotizacion'; end if;
  if r::text ~ 'oculto|der_costos|b_costos|bono_costos|aparte_costos' then raise exception 'la respuesta trae nodos del nivel: %', r; end if;
  select * into despues from public.cotizaciones where id = c;
  -- Lo oculto, idéntico (leído como postgres), valores y fuentes.
  foreach n in array array['oculto', 'b_costos', 'bono_costos', 'aparte_costos', 'fijo', 'tc'] loop
    if despues.valores -> n is distinct from antes.valores -> n or despues.fuentes -> n is distinct from antes.fuentes -> n then raise exception 'lo oculto o fijo % cambió: % -> %', n, antes.valores -> n, despues.valores -> n; end if;
  end loop;
  -- Lo que edita, lo que mandó; lo derivado, recalculado; el total en la moneda base.
  if (despues.valores ->> 'visible')::numeric is distinct from 200 or (despues.valores ->> 'der_costos')::numeric is distinct from 200 or (despues.valores ->> 'total')::numeric is distinct from 437 or despues.total_base is distinct from 437 then
    raise exception 'el snapshot no es el calculado (437): %', despues.valores;
  end if;
  if despues.titulo is distinct from 'Nuevo título' or despues.notas is distinct from 'una nota' or despues.modo_tc is not null or despues.tipos_cambio is distinct from antes.tipos_cambio or despues.formula_id is distinct from antes.formula_id then
    raise exception 'las demás columnas: %', to_jsonb(despues);
  end if;
  if despues.actualizado_en <= antes.actualizado_en then raise exception 'la versión no se movió'; end if;
  -- La revisión: por nodo (los que cambiaron), con el intento y la huella; el diff real trae lo derivado oculto.
  select * into rev from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rev.intento is distinct from i1 or rev.huella is null or rev.usuario_id is distinct from a then raise exception 'la revisión no lleva el intento, la huella y quién: %', to_jsonb(rev); end if;
  if rev.diff -> 'valores' is distinct from jsonb_build_object('de', jsonb_build_object('visible', 100, 'ajuste', 100, 'der_costos', 100, 'total', 237), 'a', jsonb_build_object('visible', 200, 'ajuste', 200, 'der_costos', 200, 'total', 437)) then
    raise exception 'el diff no es por nodo con lo derivado: %', rev.diff -> 'valores';
  end if;
  if rev.diff ? 'fuentes' or rev.diff ->> 'titulo' is null or rev.diff ? 'tipos_cambio' then raise exception 'el diff trae de más o le falta: %', rev.diff; end if;
  -- Quien ve el nivel guarda lo suyo y cambia el nodo oculto: total = 100 + 5 + 30 + 9 + 100.
  select * into antes from public.cotizaciones where id = c;
  r := pg_temp.cg_corre(k, pg_temp.cg_sql(c, i2, antes.actualizado_en, '{"inputs": {"visible": 100, "oculto": 30, "bono_costos": 9, "aparte_costos": 3}, "banderas": {"b_costos": true}}', null, 'Nuevo título', 'una nota', v));
  if r ? 'error' or (r -> 'valores' ->> 'oculto')::numeric is distinct from 30 or (r -> 'valores' ->> 'total')::numeric is distinct from 244 then raise exception 'quien edita el nivel debía poder cambiar el nodo (244): %', r; end if;
  select * into despues from public.cotizaciones where id = c;
  if (despues.valores ->> 'oculto')::numeric is distinct from 30 or despues.total_base is distinct from 244 or despues.fuentes ->> 'oculto' is distinct from 'input' then raise exception 'lo guardado por quien edita el nivel: %', despues.valores; end if;
end $$;
rollback;

-- @test cotizacion_guardar: un guardado que sólo cambia lo oculto no se delata a quien no lo ve (la revisión viaja con el diff vacío) y a quien lo ve se le muestra
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; k uuid := (t ->> 'k')::uuid; v uuid := (t ->> 'v')::uuid; antes public.cotizaciones; leido jsonb;
begin
  select * into antes from public.cotizaciones where id = c;
  -- k cambia sólo «aparte_costos» (no entra al total): para quien no ve el nivel, el snapshot visible no cambia.
  r := pg_temp.cg_corre(k, pg_temp.cg_sql(c, gen_random_uuid(), antes.actualizado_en,
         '{"inputs": {"visible": 100, "oculto": 25, "bono_costos": 7, "aparte_costos": 99}, "banderas": {"b_costos": true}}', null, null, null, v));
  if r ? 'error' then raise exception 'k no pudo guardar: %', r; end if;
  if (select valores ->> 'aparte_costos' from public.cotizaciones where id = c)::numeric is distinct from 99 then raise exception 'el nodo oculto no cambió'; end if;
  -- a lee: la cotización y las revisiones. Lo visible es lo mismo; la revisión nueva dice quién y cuándo, no qué.
  leido := pg_temp.cg_corre(a, format('select public.cotizacion_leer(%L)', c));
  if leido -> 'valores' is distinct from (select jsonb_object_agg(e.key, e.value) from jsonb_each(antes.valores) e where e.key in ('tc', 'visible', 'fijo', 'ajuste', 'total')) then raise exception 'lo visible cambió: %', leido -> 'valores'; end if;
  r := pg_temp.cg_corre(a, format('select public.cotizacion_revisiones(%L)', c));
  if r -> 'revisiones' -> 0 -> 'diff' is distinct from '{}'::jsonb or (r -> 'revisiones' -> 0 ->> 'usuario_id')::uuid is distinct from k then raise exception 'la revisión de sólo lo oculto se delata o no dice quién: %', r -> 'revisiones' -> 0; end if;
  -- Lo oculto no viaja: se mira la forma de la respuesta y los valores del diff, nunca su texto (el uuid y la fecha de una revisión son al azar).
  if (select array_agg(x order by x) from jsonb_object_keys(r) x) is distinct from array['hay_mas', 'revisiones', 'siguiente'] then raise exception 'la respuesta trae otras claves: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'revisiones') e
              where (select array_agg(x order by x) from jsonb_object_keys(e) x) is distinct from array['creado_en', 'diff', 'id', 'usuario_id']) then
    raise exception 'una revisión trae otras claves: %', r;
  end if;
  if exists (select 1 from pg_temp.cg_claves(r) x where x in ('oculto', 'b_costos', 'bono_costos', 'der_costos', 'aparte_costos')) then raise exception 'un nodo oculto viaja como clave: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'revisiones') e, pg_temp.cg_hojas(e -> 'diff') h
              where h in ('3', '99') or h #>> '{}' in ('3', '99', 'oculto', 'b_costos', 'bono_costos', 'der_costos', 'aparte_costos')) then
    raise exception 'algo oculto viaja en el diff de las revisiones: %', r;
  end if;
  -- k sí lo ve.
  r := pg_temp.cg_corre(k, format('select public.cotizacion_revisiones(%L)', c));
  if r -> 'revisiones' -> 0 -> 'diff' is distinct from '{"valores": {"de": {"aparte_costos": 3}, "a": {"aparte_costos": 99}}}'::jsonb then raise exception 'quien ve el nivel debía ver el cambio: %', r -> 'revisiones' -> 0 -> 'diff'; end if;
end $$;
rollback;

-- @test cotizacion_guardar: permisos — una que no existe, está en la papelera, es de otro origen o sólo se ve dan exactamente el mismo error; una final pide gestionarla
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; r0 jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; ver timestamptz := pg_temp.cg_ver(c);
  e constant text := '{"inputs": {"visible": 100}}'; n_antes bigint := pg_temp.cg_revs(c);
begin
  -- Lo que dice una cotización que no existe.
  r0 := pg_temp.cg_corre(a, pg_temp.cg_sql(gen_random_uuid(), gen_random_uuid(), ver, e, null, 'x', null, v));
  if r0 ->> 'error' is distinct from '42501' or r0 ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'una inexistente: %', r0; end if;
  -- Sólo ver, de otro origen (con todo ahí) y la misma de quien sí puede, pero sin `cotizaciones.editar`: lo mismo, palabra por palabra.
  if pg_temp.cg_corre((t ->> 'sc')::uuid, pg_temp.cg_sql(c, gen_random_uuid(), ver, e, null, 'x', null, v)) is distinct from r0 then raise exception 'sólo ver se distingue de lo inexistente'; end if;
  if pg_temp.cg_corre((t ->> 'aj')::uuid, pg_temp.cg_sql(c, gen_random_uuid(), ver, e, null, 'x', null, v)) is distinct from r0 then raise exception 'otro origen se distingue de lo inexistente'; end if;
  -- La papelera.
  update public.cotizaciones set eliminado_en = now() where id = c;
  if pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, e, null, 'x', null, v)) is distinct from r0 then raise exception 'la papelera se distingue de lo inexistente'; end if;
  update public.cotizaciones set eliminado_en = null where id = c;
  ver := pg_temp.cg_ver(c); n_antes := pg_temp.cg_revs(c);
  -- Una cuenta bloqueada no guarda.
  update public.perfiles set bloqueado = true where id = a;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, e, null, 'x', null, v));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%bloqueada%' then raise exception 'una cuenta bloqueada debía dar 42501 con su motivo: %', r; end if;
  update public.perfiles set bloqueado = false where id = a;
  -- Faltan los ids.
  r := pg_temp.cg_corre(a, format('select public.cotizacion_guardar(null, null, null, ''{}'', null, null, null, null, false)'));
  if r ->> 'error' is distinct from '22023' then raise exception 'sin ids debía dar 22023: %', r; end if;
  if pg_temp.cg_revs(c) is distinct from n_antes or exists (select 1 from public.cotizaciones where id = c and titulo is not null) then raise exception 'un rechazo dejó rastro'; end if;

  -- Una final: la edita quien la gestiona; quien sólo edita preventas recibe el mismo error que lo inexistente.
  update public.cotizaciones set clase = 'final' where id = c;
  ver := pg_temp.cg_ver(c);
  if pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, e, null, 'x', null, v)) is distinct from r0 then raise exception 'una final sin gestionarla se distingue de lo inexistente'; end if;
  r := pg_temp.cg_corre((t ->> 'fg')::uuid, pg_temp.cg_sql(c, gen_random_uuid(), ver, e, null, 'Final', null, v));
  if r ? 'error' or (select titulo from public.cotizaciones where id = c) is distinct from 'Final' then raise exception 'quien gestiona la final debía poder editarla: %', r; end if;
  -- Y no le cambia el vehículo.
  r := pg_temp.cg_corre((t ->> 'fg')::uuid, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, 'Final', null, (t ->> 'v2')::uuid));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'una final no cambia de vehículo: %', r; end if;
end $$;
rollback;

-- @test cotizacion_guardar: el intento — repetirlo devuelve lo guardado, con otros datos o de otra persona es un error claro, y no escribir nada no escribe
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; r2 jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; k uuid := (t ->> 'k')::uuid; v uuid := (t ->> 'v')::uuid;
  i1 uuid := gen_random_uuid(); v0 timestamptz := pg_temp.cg_ver(c); v1 timestamptz; n bigint; e constant text := '{"inputs": {"visible": 200}}';
begin
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, e, null, 'T', null, v));
  if r ? 'error' or r ->> 'repetido' is distinct from 'false' then raise exception 'el primer guardado: %', r; end if;
  v1 := pg_temp.cg_ver(c); n := pg_temp.cg_revs(c);
  -- El mismo intento, con la versión de antes (que ya cambió): lo guardado, `repetido`, sin PT409 y sin otra revisión.
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, e, null, 'T', null, v));
  if r2 ? 'error' or r2 ->> 'repetido' is distinct from 'true' or (r2 - 'repetido') is distinct from (r - 'repetido') then raise exception 'repetir el intento: % contra %', r2, r; end if;
  if pg_temp.cg_ver(c) is distinct from v1 or pg_temp.cg_revs(c) is distinct from n then raise exception 'repetir el intento escribió'; end if;
  -- El mismo intento con otros datos (cualquiera de los ocho): un error claro, nunca lo viejo en silencio.
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, '{"inputs": {"visible": 201}}', null, 'T', null, v));
  if r2 ->> 'error' is distinct from '22023' or r2 ->> 'detail' is distinct from 'intento_reusado' or r2 ->> 'hint' is distinct from 'intento' then raise exception 'otras entradas con el mismo intento: %', r2; end if;
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, '{"inputs": {"visible": 200}}', null, 'otro título', null, v));
  if r2 ->> 'detail' is distinct from 'intento_reusado' then raise exception 'otro título con el mismo intento: %', r2; end if;
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v1, '{"inputs": {"visible": 200}}', null, 'T', null, v));
  if r2 ->> 'detail' is distinct from 'intento_reusado' then raise exception 'otra versión esperada con el mismo intento: %', r2; end if;
  r2 := pg_temp.cg_corre(k, pg_temp.cg_sql(c, i1, v0, '{"inputs": {"visible": 200}}', null, 'T', null, v));
  if r2 ->> 'detail' is distinct from 'intento_reusado' then raise exception 'otra persona con el mismo intento: %', r2; end if;
  -- Nada cambió: no escribe (ni la versión ni una revisión), y repetirlo da lo mismo.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v1, '{"inputs": {"visible": 200}}', null, 'T', null, v));
  if r ? 'error' or r ->> 'repetido' is distinct from 'false' then raise exception 'guardar sin cambios: %', r; end if;
  if pg_temp.cg_ver(c) is distinct from v1 or pg_temp.cg_revs(c) is distinct from n then raise exception 'guardar sin cambios escribió'; end if;
  i1 := gen_random_uuid();
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v1, '{"inputs": {"visible": 200}}', null, 'T', null, v));
  if r2 ? 'error' or pg_temp.cg_ver(c) is distinct from v1 then raise exception 'guardar sin cambios, otra vez: %', r2; end if;
end $$;
rollback;

-- @test cotizacion_guardar: la versión esperada — nula pide recargar, una vieja es PT409 (con quién y cuándo) y un favorito no la mueve
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; k uuid := (t ->> 'k')::uuid; v uuid := (t ->> 'v')::uuid;
  v0 timestamptz := pg_temp.cg_ver(c); e constant text := '{"inputs": {"visible": 150}}';
begin
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), null, e, null, 'T', null, v));
  if r ->> 'error' is distinct from 'P0001' or r ->> 'mensaje' not like 'Falta la versión%' then raise exception 'sin versión: %', r; end if;
  -- Un favorito de cualquiera no mueve la versión: guardar con la de antes sigue valiendo.
  insert into public.cotizaciones_favoritos (cotizacion_id, usuario_id) values (c, k);
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v0, e, null, 'T', null, v));
  if r ? 'error' then raise exception 'un favorito no debía dar conflicto: %', r; end if;
  -- Otra persona guardó mientras tanto: PT409 diciendo quién.
  r := pg_temp.cg_corre(k, pg_temp.cg_sql(c, gen_random_uuid(), v0, '{"inputs": {"visible": 160}}', null, 'T', null, v));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'mensaje' not like '%esta cotización%' then raise exception 'una versión vieja debía dar PT409: %', r; end if;
  if (select valores ->> 'visible' from public.cotizaciones where id = c)::numeric is distinct from 150 then raise exception 'el conflicto escribió'; end if;
  -- Con la de ahora, sí.
  r := pg_temp.cg_corre(k, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), '{"inputs": {"visible": 160}}', null, 'T', null, v));
  if r ? 'error' then raise exception 'con la versión de ahora debía guardar: %', r; end if;
end $$;
rollback;

-- @test cotizacion_guardar: lo que no se edita — un valor distinto es nodo_no_editable, lo oculto da el error de lo inexistente y un override que el motor descarta se rechaza
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; r2 jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; ver timestamptz := pg_temp.cg_ver(c); n bigint := pg_temp.cg_revs(c);
begin
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"inputs": {"visible": 100, "fijo": 6}}', null, null, null, v));
  if r ->> 'error' is distinct from '42501' or r ->> 'detail' is distinct from 'nodo_no_editable' or r ->> 'hint' is distinct from 'fijo' then raise exception 'cambiar lo que se ve y no se edita: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"inputs": {"visible": 100, "fijo": 5}}', null, null, null, v));
  if r ? 'error' then raise exception 'repetir lo guardado de lo que no se edita no es un cambio: %', r; end if;
  -- Lo oculto: un input, una bandera y un override dan lo que daría uno que no existe.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"inputs": {"oculto": 1}}', null, null, null, v));
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"inputs": {"zz_nada": 1}}', null, null, null, v));
  if r ->> 'error' is distinct from '22023' or replace(r::text, 'oculto', 'zz_nada') is distinct from r2::text then raise exception 'un input oculto: % / %', r, r2; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"banderas": {"b_costos": false}}', null, null, null, v));
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"banderas": {"zz_nada": false}}', null, null, null, v));
  if r ->> 'error' is distinct from '22023' or replace(r::text, 'b_costos', 'zz_nada') is distinct from r2::text then raise exception 'una bandera oculta: % / %', r, r2; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"overrides": {"oculto": 1}}', null, null, null, v));
  r2 := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"overrides": {"zz_nada": 1}}', null, null, null, v));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'nodo_inexistente' or replace(r::text, 'oculto', 'zz_nada') is distinct from r2::text then raise exception 'un override oculto: % / %', r, r2; end if;
  -- Un override de un nodo visible que no se sobrescribe: el motor lo descarta y no se guarda en silencio.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"overrides": {"visible": 1}}', null, null, null, v));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'no_sobrescribible' or r ->> 'hint' is distinct from 'visible' then raise exception 'un override descartado: %', r; end if;
  -- Una entrada que no es un objeto, o con claves que la base pone.
  r := pg_temp.cg_corre(a, format('select public.cotizacion_guardar(%L, %L, %L, ''[]''::jsonb, null, null, null, %L, false)', c, gen_random_uuid(), ver, v));
  if r ->> 'detail' is distinct from 'entradas_invalidas' then raise exception 'entradas que no son un objeto: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), ver, '{"tipos_cambio": {"oficial": 1}}', null, null, null, v));
  if r ->> 'detail' is distinct from 'entradas_invalidas' then raise exception 'tipos de cambio mandados: %', r; end if;
  if pg_temp.cg_revs(c) is distinct from n or pg_temp.cg_ver(c) is distinct from ver then raise exception 'un rechazo escribió'; end if;
end $$;
rollback;

-- @test cotizacion_guardar: título, notas, modo y vehículo
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; v2 uuid := (t ->> 'v2')::uuid; o2 uuid := (t ->> 'o2')::uuid;
  e constant text := '{"inputs": {"visible": 100}}'; v_otro uuid; rev public.cotizaciones_revisiones; todos uuid := gen_random_uuid();
begin
  -- Largos.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, repeat('t', 121), null, v));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'titulo' then raise exception 'un título de 121: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, repeat('n', 2001), v));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'notas' then raise exception 'unas notas de 2.001: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, repeat('t', 120), repeat('n', 2000), v));
  if r ? 'error' then raise exception '120 y 2.000 caben: %', r; end if;
  -- Vacíos son nulos.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, '   ', '', v));
  if r ? 'error' or exists (select 1 from public.cotizaciones where id = c and (titulo is not null or notas is not null)) then raise exception 'los vacíos debían quedar nulos: %', r; end if;
  -- El modo: la hoja de esta fórmula no ofrece ninguno.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, 'unificado', null, null, v));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'modo_invalido' or r ->> 'hint' is distinct from 'modo_tc' then raise exception 'un modo que la hoja no ofrece: %', r; end if;
  -- El vehículo: otro del mismo origen se guarda; no se quita; uno que no existe o que no se ve da el error de siempre; uno de otro origen lo dice el motor.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v2));
  if r ? 'error' or pg_temp.cg_veh(c) is distinct from v2 then raise exception 'cambiar el vehículo: %', r; end if;
  select * into rev from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rev.diff -> 'vehiculo_id' is distinct from jsonb_build_object('de', v, 'a', v2) then raise exception 'la revisión no dice el cambio de vehículo: %', rev.diff; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, null));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'quitar el vehículo: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'un vehículo que no existe: %', r; end if;
  insert into public.vehiculos (origen_id, titulo, marca) values (o2, 'CG de otro origen', 'x') returning id into v_otro;
  -- Quien no ve los vehículos de ese otro origen recibe el error de siempre; quien los ve en todos, el del motor.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v_otro));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'un vehículo de un origen que no ve: %', r; end if;
  perform pg_temp.cg_persona(todos, array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'leads.ver', 'vehiculos.ver']);
  r := pg_temp.cg_corre(todos, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v_otro));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'vehiculo_de_otro_origen' then raise exception 'un vehículo de otro origen: %', r; end if;
  update public.vehiculos set eliminado_en = now() where id = v;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'un vehículo en la papelera: %', r; end if;
  update public.vehiculos set eliminado_en = null where id = v;
  -- Una preventa sin vehículo (el ajuste lo permite) lo recibe, y sin vehículo se queda.
  update public.cotizaciones set vehiculo_id = null where id = c;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, 'sin vehículo', null, null));
  if r ? 'error' or pg_temp.cg_veh(c) is not null then raise exception 'sin vehículo y sin pedirlo se queda sin: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v));
  if r ? 'error' or pg_temp.cg_veh(c) is distinct from v then raise exception 'ponerle un vehículo: %', r; end if;
end $$;
rollback;

-- @test cotizacion_guardar: se calcula con SU versión de la fórmula y SUS tipos de cambio, no con los de hoy
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; f uuid := (t ->> 'f')::uuid; o uuid := (t ->> 'o')::uuid;
  antes public.cotizaciones; despues public.cotizaciones; f2 uuid; v_def jsonb;
begin
  select * into antes from public.cotizaciones where id = c;
  -- Se publica una v2 distinta (el total sólo suma lo visible) y cambian las tarifas de la empresa.
  select definicion into v_def from public.formulas where id = f;
  update public.formulas set estado = 'archivada' where id = f;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select o, 2, 'publicada', jsonb_set(definicion, '{nodos}', (select jsonb_agg(case when n ->> 'id' = 'total' then jsonb_set(n, '{de}', '["visible"]') else n end) from jsonb_array_elements(definicion -> 'nodos') n)), params, diseno, visibilidad
    from public.formulas where id = f returning id into f2;
  update public.tipos_cambio set valor = valor + 5 where clave = 'oficial';
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), antes.actualizado_en, '{"inputs": {"visible": 300}}', null, null, null, v));
  if r ? 'error' then raise exception 'guardar con una v2 publicada: %', r; end if;
  select * into despues from public.cotizaciones where id = c;
  if despues.formula_id is distinct from f or (despues.valores ->> 'total')::numeric is distinct from 300 + 5 + 25 + 7 + 300 then raise exception 'debía calcular con la v1 (637): % %', despues.formula_id, despues.valores ->> 'total'; end if;
  if despues.tipos_cambio is distinct from antes.tipos_cambio or despues.valores -> 'tc' is distinct from antes.valores -> 'tc' then raise exception 'debía conservar los tipos de cambio congelados: %', despues.tipos_cambio; end if;
end $$;
rollback;

-- @test cotizacion_guardar: cada columna que difiere de lo calculado se reescribe (una por una), y guardar lo mismo que hay no escribe nada
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; v2 uuid := (t ->> 'v2')::uuid;
  e constant text := '{"inputs": {"visible": 100}}'; original public.cotizaciones; despues public.cotizaciones; k text; v_estropicio text;
  estropicios constant text[] := array[
    'titulo', $q$titulo = 'estropeado'$q$, 'notas', $q$notas = 'estropeadas'$q$, 'modo_tc', $q$modo_tc = 'paralelo'$q$, 'total_base', $q$total_base = 1$q$,
    'fuentes', $q$fuentes = jsonb_set(fuentes, '{ajuste}', '"override"')$q$, 'totales', $q$totales = '{}'::jsonb$q$, 'valores', $q$valores = jsonb_set(valores, '{visible}', '1')$q$, 'vehiculo_id', format('vehiculo_id = %L', v2), 'ver_total_bs', 'ver_total_bs = true'];
  i int;
begin
  select * into original from public.cotizaciones where id = c;
  -- Lo mismo que hay: no escribe (ni versión, ni revisión, ni actividad).
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), original.actualizado_en, e, null, null, null, v));
  if r ? 'error' or r ->> 'repetido' is distinct from 'false' then raise exception 'guardar lo mismo: %', r; end if;
  if pg_temp.cg_ver(c) is distinct from original.actualizado_en or pg_temp.cg_revs(c) is distinct from 0 then raise exception 'guardar lo mismo escribió'; end if;
  -- Cada columna estropeada por separado: guardar la deja como la calcula. (Se estropea lo que no sirve para reconstruir lo guardado: sin `fuentes` ni lo tipeado de `valores`, lo que no se edita se perdería.)
  for i in 1 .. cardinality(estropicios) / 2 loop
    k := estropicios[2 * i - 1]; v_estropicio := estropicios[2 * i];
    execute format('update public.cotizaciones set %s where id = %L', v_estropicio, c);
    r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v));
    if r ? 'error' then raise exception 'guardar con % estropeado: %', k, r; end if;
    select * into despues from public.cotizaciones where id = c;
    if (to_jsonb(despues) - 'actualizado_en') is distinct from (to_jsonb(original) - 'actualizado_en') then raise exception 'con % estropeado, guardar no lo dejó como estaba: % contra %', k, to_jsonb(despues), to_jsonb(original); end if;
  end loop;
  -- La moneda base de la empresa cambia (total_base sigue a otro total) y guardar lo mismo lo reescribe.
  update public.ajustes_empresa set moneda_base = 'BOB' where id = 1;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v));
  select * into despues from public.cotizaciones where id = c;
  if r ? 'error' or despues.total_base is distinct from round((despues.totales ->> 'bs')::numeric, 2) or despues.total_base is not distinct from original.total_base then raise exception 'con otra moneda base, total_base debía seguir al total en bolivianos: % %', despues.total_base, despues.totales; end if;
  update public.ajustes_empresa set moneda_base = 'USD' where id = 1;
  -- Sólo las fuentes: un override igual a lo sugerido cambia la fuente y no el valor.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), '{"inputs": {"visible": 100}, "overrides": {"ajuste": 100}}', null, null, null, v));
  select * into despues from public.cotizaciones where id = c;
  if r ? 'error' or despues.fuentes ->> 'ajuste' is distinct from 'override' or despues.valores ->> 'ajuste' is distinct from '100' then raise exception 'un override igual a lo sugerido: % %', r, despues.fuentes; end if;
  -- El modo (la hoja ofrece «paralelo»): se guarda y se quita.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), '{"inputs": {"visible": 100}, "overrides": {"ajuste": 100}}', 'paralelo', null, null, v));
  if r ? 'error' or (select modo_tc from public.cotizaciones where id = c) is distinct from 'paralelo' then raise exception 'guardar con el modo: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), '{"inputs": {"visible": 100}, "overrides": {"ajuste": 100}}', null, null, null, v));
  if r ? 'error' or (select modo_tc from public.cotizaciones where id = c) is not null then raise exception 'quitar el modo: %', r; end if;
end $$;
rollback;

-- @test cotizacion_guardar: «Ver total Bs» se pone y se quita, mueve la versión y deja diff.ver_total_bs; nulo o no ofrecido es 22023; el mismo intento con otro valor es intento_reusado; una final lo cambia
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; f uuid := (t ->> 'f')::uuid;
  e constant text := '{"inputs": {"visible": 100}}'; v0 timestamptz := pg_temp.cg_ver(c); v1 timestamptz; n bigint; i1 uuid := gen_random_uuid(); rev public.cotizaciones_revisiones;
begin
  -- La versión no lo ofrece (la fórmula de prueba no trae la clave): pedirlo es 22023 y no escribe; apagarlo vale siempre.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v0, e, null, null, null, v, 'true'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'ver_total_bs_no_ofrecido' or r ->> 'hint' is distinct from 'ver_total_bs' then raise exception 'pedirlo sin que la versión lo ofrezca: %', r; end if;
  perform pg_temp.cg_ofrece(f, false);
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v0, e, null, null, null, v, 'true'));
  if r ->> 'detail' is distinct from 'ver_total_bs_no_ofrecido' then raise exception 'pedirlo con la clave en falso: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v0, e, null, null, null, v, null));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'ver_total_bs_falta' or r ->> 'hint' is distinct from 'ver_total_bs' then raise exception 'nulo debía dar ver_total_bs_falta: %', r; end if;
  if pg_temp.cg_ver(c) is distinct from v0 or pg_temp.cg_revs(c) is distinct from 0 then raise exception 'un rechazo escribió'; end if;
  -- La versión lo ofrece: se pone, mueve la versión, viaja en la respuesta y deja la revisión con su diff.
  perform pg_temp.cg_ofrece(f, true);
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, e, null, null, null, v, 'true'));
  if r ? 'error' or r ->> 'repetido' is distinct from 'false' or not jsonb_path_exists(r, '$.cotizacion.ver_total_bs ? (@ == true)') then raise exception 'ponerlo: %', r; end if;
  v1 := pg_temp.cg_ver(c); n := pg_temp.cg_revs(c);
  if v1 <= v0 or n <> 1 or (select ver_total_bs from public.cotizaciones where id = c) is distinct from true then raise exception 'ponerlo no movió la versión ni dejó una revisión (% % %)', v1, n, (select ver_total_bs from public.cotizaciones where id = c); end if;
  select * into rev from public.cotizaciones_revisiones where cotizacion_id = c order by id desc limit 1;
  if rev.diff is distinct from '{"ver_total_bs": {"de": false, "a": true}}'::jsonb then raise exception 'la revisión no dice sólo ver_total_bs: %', rev.diff; end if;
  -- El mismo intento con otro valor es un error claro; repetido con el mismo valor devuelve lo guardado.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, e, null, null, null, v, 'false'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'intento_reusado' then raise exception 'el mismo intento con otro «Ver total Bs»: %', r; end if;
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, i1, v0, e, null, null, null, v, 'true'));
  if r ? 'error' or r ->> 'repetido' is distinct from 'true' then raise exception 'repetir el intento: %', r; end if;
  -- Lo mismo que hay no escribe; quitarlo sí, y apagarlo vale aunque la versión ya no lo ofrezca.
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v1, e, null, null, null, v, 'true'));
  if r ? 'error' or pg_temp.cg_ver(c) is distinct from v1 or pg_temp.cg_revs(c) is distinct from n then raise exception 'guardar lo mismo escribió: %', r; end if;
  perform pg_temp.cg_ofrece(f, false);
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), v1, e, null, null, null, v, 'false'));
  if r ? 'error' or (select ver_total_bs from public.cotizaciones where id = c) is distinct from false or pg_temp.cg_revs(c) <> n + 1 then raise exception 'quitarlo: %', r; end if;
  -- Una final lo cambia con las mismas reglas (quien la gestiona).
  perform pg_temp.cg_ofrece(f, true);
  update public.cotizaciones set clase = 'final' where id = c;
  r := pg_temp.cg_corre((t ->> 'fg')::uuid, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v, 'true'));
  if r ? 'error' or (select ver_total_bs from public.cotizaciones where id = c) is distinct from true then raise exception 'una final debía poder ponerlo: %', r; end if;
end $$;
rollback;

-- @test cotizacion_guardar: «Ver total Bs» se valida con SU versión: SU versión no lo ofrece y la publicada sí → ver_total_bs_no_ofrecido; SU versión lo ofrece y la publicada no → se guarda
begin;
do $$
declare
  t jsonb := pg_temp.cg_preparar(); r jsonb; c uuid := (t ->> 'c')::uuid; a uuid := (t ->> 'a')::uuid; v uuid := (t ->> 'v')::uuid; f uuid := (t ->> 'f')::uuid; o uuid := (t ->> 'o')::uuid;
  e constant text := '{"inputs": {"visible": 100}}'; f2 uuid;
begin
  -- Se archiva la v1 (SU versión) y se publica una v2 con el mismo diseño; después se cambia lo que ofrece cada una.
  update public.formulas set estado = 'archivada' where id = f;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  select o, 2, 'publicada', definicion, params, diseno, visibilidad from public.formulas where id = f returning id into f2;
  -- SU versión (v1) no lo ofrece y la publicada (v2) sí.
  perform pg_temp.cg_ofrece(f, false);
  perform pg_temp.cg_ofrece(f2, true);
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v, 'true'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'ver_total_bs_no_ofrecido' then raise exception 'SU versión no lo ofrece y la publicada sí debía rechazar: %', r; end if;
  -- SU versión lo ofrece y la publicada no.
  perform pg_temp.cg_ofrece(f, true);
  perform pg_temp.cg_ofrece(f2, false);
  r := pg_temp.cg_corre(a, pg_temp.cg_sql(c, gen_random_uuid(), pg_temp.cg_ver(c), e, null, null, null, v, 'true'));
  if r ? 'error' or (select ver_total_bs from public.cotizaciones where id = c) is distinct from true then raise exception 'SU versión lo ofrece y la publicada no debía guardar: %', r; end if;
end $$;
rollback;
