-- Escribir comentarios de una cotización por RPC (paso 4.27-1): `cotizacion_comentar()`, `cotizacion_comentario_editar()` y `cotizacion_comentario_borrar()`.
-- No depende de otro archivo (`SOLO=areas/comentarios/escribir.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   E1. Comentar pide ver (no editar); el cuerpo va sin espacios a los lados, de 1 a 4.000; un padre de otra cotización o inexistente da 22023 `padre`;
--       la respuesta a una respuesta cuelga de su raíz; una raíz eliminada se puede responder.
--   E2. Editar: sólo el autor (aun quien modera da 42501), con la versión (vieja PT409, nula «Falta la versión…»); queda «editado».
--   E3. Borrar: el autor, o quien modera y ve (deja actividad sin el texto); quien modera sin ver, 42501. Una respuesta y una raíz sin respuestas
--       se quitan; una raíz con respuestas queda eliminada sin texto (y otra vez: sin_cambios); su última respuesta se la lleva.
--   E4. Las escrituras directas sobre cotizaciones_comentarios están revocadas; las tres RPC son definer con search_path vacío, de authenticated.

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

-- La versión de un comentario, como la tiene la pantalla.
create or replace function pg_temp.cm_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.cotizaciones_comentarios where id = p_id;
$f$;

-- @test comentarios: comentar pide ver; el cuerpo y el padre se validan; un solo nivel de respuestas (E1)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  e jsonb := pg_temp.cm_origen(); ed uuid; ve uuid; c uuid; c2 uuid; raiz uuid; resp uuid; otra uuid; r jsonb;
  comentar constant text := 'select public.cotizacion_comentar(%L, %L, %L)';
  falta constant text := 'Escribe el comentario (hasta 4.000 caracteres).';
  ya_no constant text := 'Ese comentario ya no está.';
begin
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  c := pg_temp.cm_cot(jefa, e);
  c2 := pg_temp.cm_cot(jefa, e);

  r := pg_temp.cm_corre(ed, format(comentar, c, null, 'Hola'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien edita sin ver comentó: %', r; end if;
  r := pg_temp.cm_corre(ve, format(comentar, c, null, '  Hola  '));
  if r ? 'error' or r ->> 'cuerpo' is distinct from 'Hola' or not (r ->> 'mio')::boolean or (r ->> 'editado')::boolean or r #>> '{autor,id}' is distinct from ve::text then
    raise exception 'quien ve no comentó, o el comentario no volvió como se lee: %', r; end if;
  raiz := (r ->> 'id')::uuid;

  r := pg_temp.cm_corre(ve, format(comentar, c, null, '   '));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from falta then raise exception 'un cuerpo vacío no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ve, format(comentar, c, null, repeat('a', 4001)));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from falta then raise exception 'un cuerpo de 4.001 no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ve, format(comentar, c, null, repeat('a', 4000)));
  if r ? 'error' then raise exception 'un cuerpo de 4.000 no entró: %', r; end if;
  r := pg_temp.cm_corre(ve, format(comentar, c2, raiz, 'De otra'));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from ya_no then raise exception 'un padre de otra cotización no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ve, format(comentar, c, gen_random_uuid(), 'Sin padre'));
  if r ->> 'error' is distinct from '22023' or r ->> 'mensaje' is distinct from ya_no then raise exception 'un padre inexistente no dio 22023: %', r; end if;

  -- Responder a una respuesta cuelga de la raíz.
  resp := (pg_temp.cm_corre(jefa, format(comentar, c, raiz, 'Respuesta')) ->> 'id')::uuid;
  otra := (pg_temp.cm_corre(ve, format(comentar, c, resp, 'Respuesta a la respuesta')) ->> 'id')::uuid;
  if (select padre_id from public.cotizaciones_comentarios where id = resp) is distinct from raiz
     or (select padre_id from public.cotizaciones_comentarios where id = otra) is distinct from raiz then
    raise exception 'las respuestas no cuelgan de la raíz'; end if;
  -- Una raíz eliminada (con respuestas) se puede responder.
  update public.cotizaciones_comentarios set eliminado_en = now(), cuerpo = '' where id = raiz;
  r := pg_temp.cm_corre(ve, format(comentar, c, raiz, 'Aun así'));
  if r ? 'error' then raise exception 'no se pudo responder a una raíz eliminada: %', r; end if;
end $$;
rollback;

-- @test comentarios: editar es del autor, con la versión; queda editado (E2)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  e jsonb := pg_temp.cm_origen(); ve uuid; ed uuid; c uuid; k uuid; r jsonb;
  editar constant text := 'select public.cotizacion_comentario_editar(%L, %L, %L)';
begin
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  ed := pg_temp.cm_persona(array['cotizaciones.editar']);
  c := pg_temp.cm_cot(jefa, e);
  k := (pg_temp.cm_corre(ve, format('select public.cotizacion_comentar(%L, null, ''Primero'')', c)) ->> 'id')::uuid;
  -- Escrito hace un minuto (en una sola transacción now() no avanza).
  update public.cotizaciones_comentarios set creado_en = creado_en - interval '1 minute' where id = k;

  r := pg_temp.cm_corre(jefa, format(editar, k, pg_temp.cm_version(k), 'De la jefa'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'Sólo quien escribió el comentario puede editarlo.' then raise exception 'quien modera editó un comentario ajeno: %', r; end if;
  r := pg_temp.cm_corre(ed, format(editar, k, pg_temp.cm_version(k), 'Sin ver'));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien no ve editó: %', r; end if;
  r := pg_temp.cm_corre(ve, format(editar, k, '2000-01-01T00:00:00Z', 'Vieja'));
  if r ->> 'error' is distinct from 'PT409' then raise exception 'una versión vieja no dio PT409: %', r; end if;
  r := pg_temp.cm_corre(ve, format(editar, k, null, 'Sin versión'));
  if r ->> 'mensaje' is distinct from 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.' then raise exception 'sin versión no lo dijo: %', r; end if;
  r := pg_temp.cm_corre(ve, format(editar, k, pg_temp.cm_version(k), '   '));
  if r ->> 'error' is distinct from '22023' then raise exception 'editar a vacío no dio 22023: %', r; end if;
  r := pg_temp.cm_corre(ve, format(editar, k, pg_temp.cm_version(k), 'Corregido'));
  if r ? 'error' or r ->> 'cuerpo' is distinct from 'Corregido' or not (r ->> 'editado')::boolean then raise exception 'el autor no editó, o no quedó editado: %', r; end if;
end $$;
rollback;

-- @test comentarios: borrar es del autor o de quien modera y ve; respuestas y raíces sin respuestas se quitan, la raíz con respuestas queda eliminada (E3)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver']);
  e jsonb := pg_temp.cm_origen(); ve uuid; mo uuid; edmo uuid; c uuid; solo uuid; raiz uuid; r1 uuid; r2 uuid; r jsonb;
  borrar constant text := 'select public.cotizacion_comentario_borrar(%L, %L)';
  comentar constant text := 'select public.cotizacion_comentar(%L, %L, %L)';
begin
  ve := pg_temp.cm_persona(array['cotizaciones.ver']);
  mo := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  edmo := pg_temp.cm_persona(array['cotizaciones.editar', 'cotizaciones.moderar']);
  c := pg_temp.cm_cot(jefa, e);
  solo := (pg_temp.cm_corre(jefa, format(comentar, c, null, 'Sola')) ->> 'id')::uuid;
  raiz := (pg_temp.cm_corre(jefa, format(comentar, c, null, 'Con respuestas')) ->> 'id')::uuid;
  r1 := (pg_temp.cm_corre(ve, format(comentar, c, raiz, 'Una')) ->> 'id')::uuid;
  r2 := (pg_temp.cm_corre(ve, format(comentar, c, raiz, 'Dos')) ->> 'id')::uuid;

  r := pg_temp.cm_corre(ve, format(borrar, solo, pg_temp.cm_version(solo)));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No puedes borrar este comentario.' then raise exception 'otra persona sin moderar borró: %', r; end if;
  r := pg_temp.cm_corre(edmo, format(borrar, solo, pg_temp.cm_version(solo)));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' then raise exception 'quien modera sin ver borró: %', r; end if;
  r := pg_temp.cm_corre(jefa, format(borrar, solo, '2000-01-01T00:00:00Z'));
  if r ->> 'error' is distinct from 'PT409' then raise exception 'borrar con una versión vieja no dio PT409: %', r; end if;
  -- Una raíz sin respuestas, por su autor: se quita, sin actividad.
  r := pg_temp.cm_corre(jefa, format(borrar, solo, pg_temp.cm_version(solo)));
  if r is distinct from '{"resultado": "borrado"}'::jsonb or exists (select 1 from public.cotizaciones_comentarios where id = solo) then raise exception 'la raíz sin respuestas no se quitó: %', r; end if;
  if exists (select 1 from public.actividad where accion = 'cotizacion.comentario_moderado' and registro_id = c::text) then raise exception 'el autor dejó actividad de moderación'; end if;

  -- Una raíz con respuestas, por quien modera: queda eliminada sin texto, y deja actividad sin el texto.
  r := pg_temp.cm_corre(mo, format(borrar, raiz, pg_temp.cm_version(raiz)));
  if r is distinct from '{"resultado": "eliminado"}'::jsonb then raise exception 'la raíz con respuestas no quedó eliminada: %', r; end if;
  if (select cuerpo from public.cotizaciones_comentarios where id = raiz) is distinct from '' then raise exception 'la raíz eliminada conservó su texto'; end if;
  if not exists (select 1 from public.actividad where accion = 'cotizacion.comentario_moderado' and registro_id = c::text and actor_id = mo
                  and detalle = jsonb_build_object('comentario', raiz, 'autor', jefa) and antes is null and despues is null) then
    raise exception 'moderar no dejó su actividad, o la dejó con más de lo debido'; end if;
  r := pg_temp.cm_corre(jefa, format(borrar, raiz, pg_temp.cm_version(raiz)));
  if r is distinct from '{"resultado": "sin_cambios"}'::jsonb then raise exception 'borrar una raíz ya eliminada no dio sin_cambios: %', r; end if;

  -- Las respuestas se quitan; con la última se va la raíz eliminada.
  r := pg_temp.cm_corre(ve, format(borrar, r1, pg_temp.cm_version(r1)));
  if r is distinct from '{"resultado": "borrado"}'::jsonb or not exists (select 1 from public.cotizaciones_comentarios where id = raiz) then raise exception 'la primera respuesta no se quitó, o se llevó la raíz: %', r; end if;
  r := pg_temp.cm_corre(ve, format(borrar, r2, pg_temp.cm_version(r2)));
  if r is distinct from '{"resultado": "borrado"}'::jsonb or exists (select 1 from public.cotizaciones_comentarios where id in (raiz, r2)) then raise exception 'la última respuesta no se llevó la raíz eliminada: %', r; end if;
  r := pg_temp.cm_corre(ve, format(borrar, r2, now()));
  if r ->> 'error' is distinct from '42501' then raise exception 'borrar uno que ya no está no dio 42501: %', r; end if;
end $$;
rollback;

-- @test comentarios: las escrituras directas están revocadas y las tres RPC tienen sus privilegios (E4)
begin;
do $$
declare
  jefa uuid := pg_temp.cm_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  e jsonb := pg_temp.cm_origen(); c uuid; c2 uuid; k uuid; r jsonb; f record;
begin
  c := pg_temp.cm_cot(jefa, e);
  c2 := pg_temp.cm_cot(jefa, e);
  k := (pg_temp.cm_corre(jefa, format('select public.cotizacion_comentar(%L, null, ''Mío'')', c)) ->> 'id')::uuid;
  r := pg_temp.cm_corre(jefa, format('insert into public.cotizaciones_comentarios (cotizacion_id, usuario_id, cuerpo) values (%L, %L, ''x'') returning to_jsonb(id)', c, jefa));
  if r ->> 'error' is distinct from '42501' then raise exception 'un insert directo entró: %', r; end if;
  r := pg_temp.cm_corre(jefa, format('update public.cotizaciones_comentarios set cotizacion_id = %L where id = %L returning to_jsonb(id)', c2, k));
  if r ->> 'error' is distinct from '42501' then raise exception 'un update directo entró: %', r; end if;
  r := pg_temp.cm_corre(jefa, format('delete from public.cotizaciones_comentarios where id = %L returning to_jsonb(id)', k));
  if r ->> 'error' is distinct from '42501' then raise exception 'un delete directo entró: %', r; end if;
  for f in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('cotizacion_comentar', 'cotizacion_comentario_editar', 'cotizacion_comentario_borrar') loop
    if not f.prosecdef or f.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío', f.proname; end if;
    if not has_function_privilege('authenticated', f.oid, 'execute') or has_function_privilege('anon', f.oid, 'execute') then
      raise exception '%: execute debía ser de authenticated y no de anon', f.proname; end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = f.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', f.proname; end if;
  end loop;
  -- El catálogo (migración y seed): comentar es de quien ve, no de editar.
  if (select descripcion from public.permisos where clave = 'cotizaciones.editar') ~ 'comentar'
     or (select descripcion from public.permisos where clave = 'cotizaciones.ver') !~ 'comentarlas' then
    raise exception 'el catálogo de permisos sigue diciendo que comentar es de editar'; end if;
end $$;
rollback;
