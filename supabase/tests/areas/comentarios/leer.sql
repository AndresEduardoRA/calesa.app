-- Leer los comentarios de una cotización por cursor (paso 4.27-1): `cotizacion_comentarios()` y `cotizacion_comentario_respuestas()`.
-- No depende de otro archivo (`SOLO=areas/comentarios/leer.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   L1. Pide ver: sin ver, una inexistente o una en la papelera dan el mismo 42501; con «propios», las suyas sí y las ajenas no.
--   L2. Raíces de la más nueva a la más vieja, de a 20 con hay_mas, por cursor (creado_en, id); un cursor a medias da 22023; p_tope se acota a 50.
--   L3. Cada raíz trae sus primeras 20 respuestas en orden de llegada y hay_mas_respuestas (p_primeros se acota a 50); las demás, por
--       `cotizacion_comentario_respuestas()` con su cursor. Una raíz eliminada viaja con cuerpo nulo y eliminado; una respuesta como raíz da 42501.
--   L4. Los dos índices existen con sus columnas y su where; las dos RPC son definer con search_path vacío, de authenticated y no de anon ni PUBLIC;
--       el ayudante del ítem no es de authenticated.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.cm_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cm_' || substr(v_id::text, 1, 8), 'CM ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.cm_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.cm_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('cm_' || substr(gen_random_uuid()::text, 1, 8), 'CM origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona; una final lleva un vehículo propio.
create or replace function pg_temp.cm_cot(p_quien uuid, e jsonb, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid; v_v uuid;
begin
  if p_clase = 'final' then
    insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'CM vehículo', 'toyota') returning id into v_v;
  end if;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, v_v, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- Un comentario de esa persona, escrito a esa hora (como dueño de la tabla: arma el terreno).
create or replace function pg_temp.cm_comentario(p_c uuid, p_quien uuid, p_padre uuid, p_en timestamptz, p_eliminado boolean default false) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.cotizaciones_comentarios (cotizacion_id, usuario_id, padre_id, cuerpo, eliminado_en, creado_en, actualizado_en)
  values (p_c, p_quien, p_padre, case when p_eliminado then '' else 'Comentario ' || p_en end, case when p_eliminado then p_en end, p_en, p_en)
  returning id into v;
  return v;
end $f$;

-- @test comentarios: leer pide ver; lo inexistente y lo que está en la papelera dan el mismo 42501; «propios» ve sólo lo suyo (L1)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); ed uuid; pr uuid; c uuid; c_pr uuid; c_pap uuid; v_l uuid; r jsonb;
  acceso constant text := 'No tienes acceso a esta cotización.';
  leer constant text := 'select public.cotizacion_comentarios(%L)';
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  pr := pg_temp.cm_persona(array['cotizaciones.ver:propios']);
  c := pg_temp.cm_cot(jefa, e);
  c_pr := pg_temp.cm_cot(pr, e);
  c_pap := pg_temp.cm_cot(jefa, e);
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('cotizaciones', jefa, '{"cantidad": 1}') returning id into v_l;
  update public.cotizaciones set eliminado_en = now(), eliminado_por = jefa, lote_papelera_id = v_l where id = c_pap;
  perform pg_temp.cm_comentario(c, jefa, null, now());

  r := pg_temp.cm_corre(ed, format(leer, c));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from acceso then raise exception 'quien edita sin ver leyó comentarios: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(leer, gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from acceso then raise exception 'una inexistente no dio el 42501: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(leer, c_pap));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from acceso then raise exception 'una en la papelera no dio el 42501: %', r; end if;
  r := pg_temp.cm_corre(pr, format(leer, c));
  if r ->> 'error' is distinct from '42501' then raise exception '«propios» leyó los comentarios de una ajena: %', r; end if;
  r := pg_temp.cm_corre(pr, format(leer, c_pr));
  if r ? 'error' or r -> 'comentarios' is distinct from '[]'::jsonb or (r ->> 'hay_mas')::boolean or (r ->> 'puede_moderar')::boolean then
    raise exception '«propios» no leyó la suya, vacía y sin moderar: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(leer, c));
  if jsonb_array_length(r -> 'comentarios') <> 1 or (r #>> '{comentarios,0,mio}')::boolean is distinct from true then raise exception 'la jefa no leyó su comentario: %', r; end if;
end $$;
rollback;

-- @test comentarios: las raíces de la más nueva a la más vieja, de a 20, por cursor; el cursor a medias da 22023 y p_tope se acota a 50 (L2)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  e jsonb := pg_temp.cm_origen(); c uuid; r jsonb; i int; v_en timestamptz; v_id uuid; v_vistos uuid[] := '{}'; v_todos uuid[];
  t0 constant timestamptz := '2026-01-01 12:00:00+00';
begin
  c := pg_temp.cm_cot(jefa, e);
  for i in 1..55 loop perform pg_temp.cm_comentario(c, jefa, null, t0 + make_interval(mins => i)); end loop;
  -- Dos con la misma hora: el id desempata.
  perform pg_temp.cm_comentario(c, jefa, null, t0);
  perform pg_temp.cm_comentario(c, jefa, null, t0);
  select array_agg(x.id order by x.creado_en desc, x.id desc) into v_todos from public.cotizaciones_comentarios x where x.cotizacion_id = c;

  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentarios(%L)', c));
  if jsonb_array_length(r -> 'comentarios') <> 20 or not (r ->> 'hay_mas')::boolean or not (r ->> 'puede_moderar')::boolean then raise exception 'la primera página no trajo 20 con hay_mas: %', r -> 'hay_mas'; end if;
  if (r #>> '{comentarios,0,creado_en}')::timestamptz <> t0 + interval '55 minutes' then raise exception 'la primera no es la más nueva: %', r #> '{comentarios,0}'; end if;
  for i in 1..3 loop
    v_vistos := v_vistos || array(select (x ->> 'id')::uuid from jsonb_array_elements(r -> 'comentarios') x);
    exit when not (r ->> 'hay_mas')::boolean;
    v_en := (r -> 'comentarios' -> -1 ->> 'creado_en')::timestamptz;
    v_id := (r -> 'comentarios' -> -1 ->> 'id')::uuid;
    r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentarios(%L, %L, %L)', c, v_en, v_id));
  end loop;
  if v_vistos is distinct from v_todos then raise exception 'las tres páginas no recorren las 57 en orden y sin repetir'; end if;
  if jsonb_array_length(r -> 'comentarios') <> 17 or (r ->> 'hay_mas')::boolean then raise exception 'la tercera página debía traer 17 sin hay_mas: %', jsonb_array_length(r -> 'comentarios'); end if;

  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentarios(%L, %L, null)', c, t0));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from 'El cursor de la página está incompleto.' then raise exception 'un cursor a medias no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentarios(%L, p_tope => 1000)', c));
  if jsonb_array_length(r -> 'comentarios') <> 50 or not (r ->> 'hay_mas')::boolean then raise exception 'p_tope 1000 no se acotó a 50: %', jsonb_array_length(r -> 'comentarios'); end if;
end $$;
rollback;

-- @test comentarios: cada raíz con sus primeras respuestas; las demás por cursor; una raíz eliminada sin su texto (L3)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  otra uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); c uuid; raiz uuid; borrada uuid; resp1 uuid; r jsonb; i int; v_todas uuid[]; v_vistas uuid[];
  t0 constant timestamptz := '2026-01-01 12:00:00+00';
begin
  c := pg_temp.cm_cot(jefa, e);
  raiz := pg_temp.cm_comentario(c, jefa, null, t0);
  for i in 1..55 loop perform pg_temp.cm_comentario(c, otra, raiz, t0 + make_interval(secs => i)); end loop;
  borrada := pg_temp.cm_comentario(c, otra, null, t0 + interval '1 hour', true);
  resp1 := pg_temp.cm_comentario(c, jefa, borrada, t0 + interval '2 hours');
  select array_agg(x.id order by x.creado_en, x.id) into v_todas from public.cotizaciones_comentarios x where x.padre_id = raiz;

  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentarios(%L)', c));
  -- La más nueva es la eliminada: sin texto, con su respuesta.
  if r #> '{comentarios,0,id}' is distinct from to_jsonb(borrada) or r #> '{comentarios,0,cuerpo}' is distinct from 'null'::jsonb
     or r #> '{comentarios,0,eliminado}' is distinct from 'true'::jsonb or r #> '{comentarios,0,mio}' is distinct from 'false'::jsonb
     or r #> '{comentarios,0,respuestas,0,id}' is distinct from to_jsonb(resp1) or r #> '{comentarios,0,hay_mas_respuestas}' is distinct from 'false'::jsonb then
    raise exception 'la raíz eliminada no viajó sin texto y con su respuesta: %', r #> '{comentarios,0}'; end if;
  if r #> '{comentarios,1,id}' is distinct from to_jsonb(raiz) or jsonb_array_length(r #> '{comentarios,1,respuestas}') <> 20
     or r #> '{comentarios,1,hay_mas_respuestas}' is distinct from 'true'::jsonb then
    raise exception 'la raíz no trajo sus primeras 20 respuestas con hay_mas_respuestas: %', r #> '{comentarios,1,hay_mas_respuestas}'; end if;
  if (r #>> '{comentarios,1,respuestas,0,id}')::uuid <> v_todas[1] or r #> '{comentarios,1,respuestas,0,autor,id}' is distinct from to_jsonb(otra) then
    raise exception 'la primera respuesta no es la más vieja, con su autor'; end if;
  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentarios(%L, p_primeros => 1000)', c));
  if jsonb_array_length(r #> '{comentarios,1,respuestas}') <> 50 or r #> '{comentarios,1,hay_mas_respuestas}' is distinct from 'true'::jsonb then
    raise exception 'p_primeros 1000 no se acotó a 50'; end if;

  -- Las demás: después de la 20.ª, de a 20, hasta las 55.
  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentario_respuestas(%L, (select creado_en from public.cotizaciones_comentarios where id = %L), %L)', raiz, v_todas[20], v_todas[20]));
  if jsonb_array_length(r -> 'respuestas') <> 20 or not (r ->> 'hay_mas')::boolean or (r #>> '{respuestas,0,id}')::uuid <> v_todas[21] then raise exception 'la segunda página de respuestas no siguió a la 20.ª: %', r -> 'hay_mas'; end if;
  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentario_respuestas(%L, (select creado_en from public.cotizaciones_comentarios where id = %L), %L, 1000)', raiz, v_todas[20], v_todas[20]));
  select array_agg((x ->> 'id')::uuid) into v_vistas from jsonb_array_elements(r -> 'respuestas') x;
  if v_vistas is distinct from v_todas[21:55] or (r ->> 'hay_mas')::boolean then raise exception 'las respuestas restantes no llegaron en orden y completas'; end if;

  -- Una respuesta no es una raíz; una inexistente, tampoco.
  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentario_respuestas(%L)', v_todas[1]));
  if r ->> 'error' is distinct from '42501' then raise exception 'pedir las respuestas de una respuesta no dio 42501: %', r; end if;
  r := pg_temp.cm_corre(jefa, format('select public.cotizacion_comentario_respuestas(%L)', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' then raise exception 'pedir las respuestas de uno inexistente no dio 42501: %', r; end if;
  r := pg_temp.cm_corre(pg_temp.cm_persona(array['cotizaciones.editar']), format('select public.cotizacion_comentario_respuestas(%L)', raiz));
  if r ->> 'error' is distinct from '42501' then raise exception 'quien no ve leyó respuestas: %', r; end if;
end $$;
rollback;

-- @test comentarios: los índices de la lectura y los privilegios de las dos RPC (L4)
do $$
declare r record;
begin
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'cotizaciones_comentarios_raices_idx'
                  and indexdef like '%(cotizacion_id, creado_en DESC, id DESC) WHERE (padre_id IS NULL)') then
    raise exception 'falta cotizaciones_comentarios_raices_idx con sus columnas y su where'; end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'cotizaciones_comentarios_respuestas_idx'
                  and indexdef like '%(padre_id, creado_en, id)') then
    raise exception 'falta cotizaciones_comentarios_respuestas_idx con sus columnas'; end if;
  for r in select f.oid, f.proname, f.prosecdef, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.proname in ('cotizacion_comentarios', 'cotizacion_comentario_respuestas') loop
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', r.proname; end if;
    if not has_function_privilege('authenticated', r.oid, 'execute') or has_function_privilege('anon', r.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
  end loop;
  if has_function_privilege('authenticated', 'public._comentario_item(uuid, uuid, text, text, timestamptz, timestamptz, timestamptz, uuid)', 'execute') then
    raise exception 'authenticated puede ejecutar _comentario_item'; end if;
end $$;
