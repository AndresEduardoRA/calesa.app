-- `cotizacion_guardar()` (paso 4.10, prompt 3): la única edición de una cotización. Lo que no se ve no viaja (por nivel) lo prueba `cotizaciones-visibilidad.sql`; acá va la
-- conducta: la versión, SU versión de la fórmula y SUS tipos de cambio, los permisos, el intento, lo que no se edita, el título, las notas, el modo, el vehículo y las
-- revisiones. `cotizacion-reconstruir.sql` prueba la propiedad de lo que se reconstruye de lo guardado.
-- Corre después de `cotizacion-crear.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.

-- Una cotización escrita directo (como postgres) sobre una fórmula publicada nueva: sirve para probar la versión sin pasar por ninguna RPC.
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
--   visible   input, lo ven y lo editan todos          fijo        input, lo ven todos y nadie lo edita
--   oculto    input del nivel «costos»                 b_costos    bandera del nivel «costos»          bono_costos  input de «costos», sólo con b_costos encendida
--   der_costos cálculo de «costos» (= visible)         total       suma de todo, lo ven todos y nadie lo edita
-- Personas: a (cotiza: ver, crear, editar, leads y vehículos), k (a + ver y editar el nivel «costos»), kv (a + sólo ver «costos»), ke (a + sólo editar «costos»), sc (sólo ver),
-- fg (a + gestionar finales), aj (a, pero en OTRO origen), sl (sin leads.ver: igual puede guardar, el lead no se mira). La cotización: visible 100, fijo 5, oculto 25, b_costos encendida, bono 7.
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
    jsonb_build_object('id', 'der_costos', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Derivado', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'fijo', 'oculto', 'bono_costos', 'der_costos'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                              'fijo', jsonb_build_object('ver', 'todos', 'editar', null), 'oculto', jsonb_build_object('ver', 'costos', 'editar', 'costos'),
                              'b_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'bono_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'),
                              'der_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis, now() - interval '10 days') returning id into f;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en) values (o2, 1, 'publicada', v_def, '{}', '{}', v_vis, now() - interval '10 days');
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CG lead', '73' || lpad((floor(random() * 1000000))::text, 6, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
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
  v_ent := '{"inputs": {"visible": 100, "fijo": 5, "oculto": 25, "bono_costos": 7}, "banderas": {"b_costos": true}, "overrides": {}, "vehiculo": {}, "tablas": {}}'::jsonb
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
  if (select actualizado_en from public.cotizaciones where id = c) <> v2 then raise exception 'un update sin cambios movió la versión'; end if;

  -- Un favorito y un reporte (los cuentan triggers) no son un cambio de la cotización: ni la versión, ni una revisión, ni una fila de actividad.
  select count(*) into v_rev from public.cotizaciones_revisiones where cotizacion_id = c;
  select count(*) into v_act from public.actividad where tabla = 'cotizaciones' and registro_id = c::text;
  insert into public.cotizaciones_favoritos (cotizacion_id, usuario_id) values (c, '00000000-0000-0000-0000-000000000001');
  insert into public.cotizaciones_reportes (cotizacion_id, usuario_id, motivo) values (c, '00000000-0000-0000-0000-000000000001', 'x');
  if (select favoritos_count from public.cotizaciones where id = c) <> 1 or (select reportes_count from public.cotizaciones where id = c) <> 1 then
    raise exception 'los contadores debían subir';
  end if;
  if (select actualizado_en from public.cotizaciones where id = c) <> v2 then raise exception 'un favorito o un reporte movió la versión'; end if;
  if (select count(*) from public.cotizaciones_revisiones where cotizacion_id = c) <> v_rev then raise exception 'un favorito o un reporte dejó una revisión'; end if;
  if (select count(*) from public.actividad where tabla = 'cotizaciones' and registro_id = c::text) <> v_act then raise exception 'un favorito o un reporte quedó en actividad'; end if;
  -- Y uno que sí cambia algo, junto con un contador, sí la mueve.
  update public.cotizaciones set titulo = 'T', favoritos_count = 5 where id = c;
  if (select actualizado_en from public.cotizaciones where id = c) <= v2 then raise exception 'un cambio de título junto a un contador debía mover la versión'; end if;
  if (select count(*) from public.actividad where tabla = 'cotizaciones' and registro_id = c::text) <> v_act + 1 then raise exception 'un cambio real debía quedar en actividad'; end if;
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
  if r::text like '%oculto%' or r::text like '%der_costos%' or r::text like '%b_costos%' or r::text like '%bono_costos%' then raise exception 'viaja algo del nivel: %', r; end if;
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
