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
