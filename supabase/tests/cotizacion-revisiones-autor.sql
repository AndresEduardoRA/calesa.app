-- `cotizacion_revisiones()` con autor y etiquetas (paso 4.15-2). El recorte del diff por nivel lo prueba `cotizaciones-visibilidad.sql`; acá va lo nuevo: cada fila
-- nombra a quien guardó (de `perfiles`) y la respuesta trae las etiquetas de lo que nombran los diffs YA recortados de esa página, y nada más.
-- Corre después de `cotizacion-hoja-guardada.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.

create or replace function pg_temp.ra_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
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

create or replace function pg_temp.ra_persona(p_id uuid, p_nombre text, p_claves text[]) returns uuid language plpgsql as $f$
declare v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre where id = p_id;
  insert into public.roles (clave, nombre) values ('ra_' || substr(p_id::text, 25, 12), 'RA ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, null, 'todos');
  end loop;
  return p_id;
end $f$;

-- Una cotización y tres revisiones: (1) de Ana: visible, oculto (del nivel «costos») y los dos grupos; (2) escrita como postgres, sin usuario: el título;
-- (3) de una persona sin nombre: sin_etq (un nodo sin etiqueta). `quieto` (visible) nunca cambia. Grupos: gv = visible y sin_etq; gk = oculto.
create or replace function pg_temp.ra_terreno(p_ana uuid, p_sin_nombre uuid) returns uuid language plpgsql as $f$
declare o uuid; f uuid; c uuid;
begin
  insert into public.origenes (clave, nombre) values ('ra_' || substr(gen_random_uuid()::text, 1, 8), 'RA origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'grupo', 'gv', 'bucket', 'origen'),
            jsonb_build_object('id', 'sin_etq', 'tipo', 'input', 'grupo', 'gv', 'bucket', 'origen'),
            jsonb_build_object('id', 'quieto', 'tipo', 'input', 'etiqueta', 'Quieto', 'bucket', 'origen'),
            jsonb_build_object('id', 'oculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'grupo', 'gk', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'sin_etq', 'quieto', 'oculto'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
          'grupos', jsonb_build_array(jsonb_build_object('id', 'gv', 'etiqueta', 'Grupo visible', 'bucket', 'origen'), jsonb_build_object('id', 'gk', 'etiqueta', 'Grupo costos', 'bucket', 'origen'))),
          '{}', '{}', '{"visible": {"ver": "todos", "editar": "todos"}, "sin_etq": {"ver": "todos", "editar": "todos"}, "quieto": {"ver": "todos", "editar": "todos"},
                      "oculto": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}}', now() - interval '1 day') returning id into f;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base)
  values (o, '00000000-0000-0000-0000-000000000001', f, '{"visible": 1, "sin_etq": 1, "quieto": 1, "oculto": 5, "total": 8}', '{"visible": "input", "sin_etq": "input", "quieto": "input", "oculto": "input"}',
          '{}', '{"usd": 8, "grupos": {"gv": {"usd": 2}, "gk": {"usd": 5}}}', 8) returning id into c;
  perform set_config('request.jwt.claim.sub', p_ana::text, true);
  update public.cotizaciones set valores = '{"visible": 2, "sin_etq": 1, "quieto": 1, "oculto": 6, "total": 10}',
                                 totales = '{"usd": 10, "grupos": {"gv": {"usd": 3}, "gk": {"usd": 6}}}', total_base = 10 where id = c;
  perform set_config('request.jwt.claim.sub', '', true);
  update public.cotizaciones set titulo = 'RA título' where id = c;
  perform set_config('request.jwt.claim.sub', p_sin_nombre::text, true);
  update public.cotizaciones set valores = '{"visible": 2, "sin_etq": 4, "quieto": 1, "oculto": 6, "total": 13}' where id = c;
  perform set_config('request.jwt.claim.sub', '', true);
  return c;
end $f$;

-- @test cotizacion_revisiones: R1 cada fila nombra a su autor (de perfiles); sin usuario, autor nulo; un nombre en blanco, nombre nulo; el ayudante de las etiquetas es de nadie
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  ana uuid := pg_temp.ra_persona(gen_random_uuid(), 'Ana Autor', '{}'); sn uuid := pg_temp.ra_persona(gen_random_uuid(), '   ', '{}');
  c uuid := pg_temp.ra_terreno(ana, sn); r jsonb;
begin
  r := pg_temp.ra_corre(duena, format('select public.cotizacion_revisiones(%L)', c));
  if r ? 'error' or jsonb_array_length(r -> 'revisiones') <> 3 then raise exception 'R1: %', r; end if;
  if r -> 'revisiones' -> 0 -> 'autor' is distinct from jsonb_build_object('id', sn, 'nombre', null)
     or jsonb_typeof(r -> 'revisiones' -> 1 -> 'autor') is distinct from 'null'
     or r -> 'revisiones' -> 2 -> 'autor' is distinct from jsonb_build_object('id', ana, 'nombre', 'Ana Autor') then
    raise exception 'R1: los autores: %', jsonb_path_query_array(r, '$.revisiones[*].autor');
  end if;
  if has_function_privilege('authenticated', 'public._revision_etiquetas(jsonb, jsonb)', 'execute') or has_function_privilege('anon', 'public._revision_etiquetas(jsonb, jsonb)', 'execute') then
    raise exception 'R1: _revision_etiquetas la ejecuta authenticated o anon';
  end if;
end $$;
rollback;

-- @test cotizacion_revisiones: R2 y R3 las etiquetas son exactamente las de lo que nombran los diffs recortados de la página: ni lo oculto, ni lo que no cambió; sin etiqueta, el id
begin;
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  ana uuid := pg_temp.ra_persona(gen_random_uuid(), 'Ana Autor', '{}'); sn uuid := pg_temp.ra_persona(gen_random_uuid(), '', '{}');
  sin uuid := pg_temp.ra_persona(gen_random_uuid(), 'Sin costos', array['cotizaciones.ver']);
  c uuid := pg_temp.ra_terreno(ana, sn); r jsonb;
begin
  r := pg_temp.ra_corre(duena, format('select public.cotizacion_revisiones(%L)', c));
  if r -> 'etiquetas' is distinct from '{"nodos": {"visible": "Visible", "sin_etq": "sin_etq", "oculto": "Oculto", "total": "Total"}, "grupos": {"gv": "Grupo visible", "gk": "Grupo costos"}}'::jsonb then
    raise exception 'R2: la dueña: %', r -> 'etiquetas';
  end if;
  -- Sin «costos»: ni el nodo oculto que cambió ni su grupo (ni la etiqueta del uno ni la del otro en toda la respuesta).
  r := pg_temp.ra_corre(sin, format('select public.cotizacion_revisiones(%L)', c));
  if r ? 'error' or r -> 'etiquetas' is distinct from '{"nodos": {"visible": "Visible", "sin_etq": "sin_etq", "total": "Total"}, "grupos": {"gv": "Grupo visible"}}'::jsonb then
    raise exception 'R2/R3: sin costos: %', coalesce(r -> 'etiquetas', r);
  end if;
  if r::text like '%Oculto%' or r::text like '%Grupo costos%' or r::text like '%"oculto"%' or r::text like '%"gk"%' then raise exception 'R2/R3: sin costos recibe algo de costos: %', r; end if;
  -- Con cursor, las de esa página: la más vieja sola (la de Ana) y la más nueva sola (sin_etq).
  r := pg_temp.ra_corre(sin, format('select public.cotizacion_revisiones(%L, %s, 1)', c, (select min(id) + 1 from public.cotizaciones_revisiones where cotizacion_id = c)));
  if r -> 'etiquetas' is distinct from '{"nodos": {"visible": "Visible", "total": "Total"}, "grupos": {"gv": "Grupo visible"}}'::jsonb then raise exception 'R2: con cursor: %', r -> 'etiquetas'; end if;
  r := pg_temp.ra_corre(sin, format('select public.cotizacion_revisiones(%L, null, 1)', c));
  if r -> 'etiquetas' is distinct from '{"nodos": {"sin_etq": "sin_etq", "total": "Total"}, "grupos": {}}'::jsonb then raise exception 'R2: la primera página de una: %', r -> 'etiquetas'; end if;
end $$;
rollback;
