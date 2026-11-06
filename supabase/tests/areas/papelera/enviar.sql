-- La papelera propia de cotizaciones: enviar por lote con versión (paso 4.24-1a). `cotizaciones_papelera_enviar([{id, actualizado_en}, …])`, como la de vehículos:
-- cada una en su bloque, lo que no se puede queda en `rechazados` y el resto se envía.
-- No depende de otro archivo (`SOLO=areas/papelera/enviar.sql`): «la jefa» ve, edita, modera y gestiona finales en todo. Cada bloque que escribe abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   E1. Dos con su versión: un lote de cotizaciones con su resumen y su versión, las dos con `eliminado_*` y en `enviados` con sus claves.
--   E2. Una con la versión vieja queda en `rechazados` con PT409; la otra se envía.
--   E3. Quien edita sin ver: lo que no ve, lo inexistente y lo que ya está en la papelera, con el mismo 42501 y el mismo texto, y sin título.
--   E4. Quien la ve y no puede: 42501 de permiso, con su título; con `ver` y `moderar`, se envía.
--   E6. Todo rechazado: sin lote. Vacío, más de 200 o mal formado: 22023.
--   E8b. Privilegios de la RPC.

create or replace function pg_temp.pe_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pe_' || substr(v_id::text, 1, 8), 'PE ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.pe_jefa() returns uuid language sql as $f$
  select pg_temp.pe_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.pe_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Envía como esa persona; p_items, el arreglo tal cual.
create or replace function pg_temp.pe_enviar(p_quien uuid, p_items jsonb) returns jsonb language sql as $f$
  select pg_temp.pe_corre(p_quien, format('select public.cotizaciones_papelera_enviar(%L::jsonb)', p_items));
$f$;

-- {id, actualizado_en} de una cotización, con su versión de hoy (o la que se pase).
create or replace function pg_temp.pe_item(p_c uuid, p_version timestamptz default null) returns jsonb language sql as $f$
  select jsonb_build_object('id', p_c, 'actualizado_en', coalesce(p_version, (select c.actualizado_en from public.cotizaciones c where c.id = p_c)));
$f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pe_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('pe_' || substr(gen_random_uuid()::text, 1, 8), 'PE origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una preventa viva de esa persona, con título.
create or replace function pg_temp.pe_cot(p_quien uuid, e jsonb, p_titulo text default 'PE cotización') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, titulo, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_titulo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

create or replace function pg_temp.pe_viva(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c and c.eliminado_en is null and c.lote_papelera_id is null);
$f$;

-- El rechazo de ese id, sin el id: {titulo, codigo, motivo}.
create or replace function pg_temp.pe_rechazo(r jsonb, p_c uuid) returns jsonb language sql as $f$
  select x - 'id' from jsonb_array_elements(r -> 'rechazados') x where x ->> 'id' = p_c::text;
$f$;

-- @test papelera de cotizaciones: enviar dos con su versión deja un lote de cotizaciones con su resumen y su versión (E1)
begin;
do $$
declare jefa uuid := pg_temp.pe_jefa(); e jsonb := pg_temp.pe_origen(); c1 uuid; c2 uuid; r jsonb; l public.lotes_papelera;
begin
  c1 := pg_temp.pe_cot(jefa, e, 'PE uno');
  c2 := pg_temp.pe_cot(jefa, e, null);
  r := pg_temp.pe_enviar(jefa, jsonb_build_array(pg_temp.pe_item(c1), pg_temp.pe_item(c2), pg_temp.pe_item(c1)));
  if r ? 'error' then raise exception 'enviar falló: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'enviados', 'lote', 'rechazados'] then
    raise exception 'las claves de la respuesta no son las esperadas: %', r; end if;
  select * into l from public.lotes_papelera where id = (r ->> 'lote')::uuid;
  if l.id is null or l.tipo <> 'cotizaciones' or l.creado_por <> jefa then raise exception 'el lote no es de cotizaciones de quien envió: %', to_jsonb(l); end if;
  if l.resumen is distinct from '{"cantidad": 2, "restaurados": 0, "purgados": 0}'::jsonb then raise exception 'el resumen no es el esperado: %', l.resumen; end if;
  if (r ->> 'actualizado_en')::timestamptz is distinct from l.actualizado_en or l.actualizado_en <= l.creado_en then raise exception 'la versión del lote no es la devuelta'; end if;
  if (select count(*) from public.cotizaciones where lote_papelera_id = l.id and eliminado_en is not null and eliminado_por = jefa) <> 2 then raise exception 'el lote no tiene las dos'; end if;
  if jsonb_array_length(r -> 'enviados') <> 2 or jsonb_array_length(r -> 'rechazados') <> 0 then raise exception 'enviados o rechazados de más: %', r; end if;
  if (select array_agg(distinct k order by k) from jsonb_array_elements(r -> 'enviados') x, jsonb_object_keys(x) k) is distinct from array['id', 'numero', 'titulo'] then
    raise exception 'un enviado no lleva id, numero y titulo: %', r -> 'enviados'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'enviados') x where x ->> 'id' = c1::text and x ->> 'titulo' = 'PE uno'
                   and (x ->> 'numero')::bigint = (select numero from public.cotizaciones where id = c1)) then raise exception 'el enviado no dice su número y su título'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: una con la versión vieja queda en rechazados con PT409 y la otra se envía (E2)
begin;
do $$
declare jefa uuid := pg_temp.pe_jefa(); e jsonb := pg_temp.pe_origen(); c1 uuid; c2 uuid; r jsonb;
begin
  c1 := pg_temp.pe_cot(jefa, e);
  c2 := pg_temp.pe_cot(jefa, e);
  r := pg_temp.pe_enviar(jefa, jsonb_build_array(pg_temp.pe_item(c1, '2000-01-01'), pg_temp.pe_item(c2)));
  if r ? 'error' then raise exception 'enviar falló: %', r; end if;
  if pg_temp.pe_rechazo(r, c1) ->> 'codigo' is distinct from 'PT409' then raise exception 'la de versión vieja debía dar PT409: %', r; end if;
  if not pg_temp.pe_viva(c1) or pg_temp.pe_viva(c2) then raise exception 'debía enviarse sólo la de versión al día'; end if;
  if (select resumen ->> 'cantidad' from public.lotes_papelera where id = (r ->> 'lote')::uuid) <> '1' then raise exception 'el lote no cuenta una'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: lo que no se ve, lo inexistente y lo que ya está en la papelera dan el mismo 42501, sin título (E3)
begin;
do $$
declare jefa uuid := pg_temp.pe_jefa(); e jsonb := pg_temp.pe_origen(); ed uuid; c uuid; c_pap uuid; v_nada uuid := gen_random_uuid(); r jsonb; esperado jsonb;
begin
  ed := pg_temp.pe_persona(array['cotizaciones.editar']);
  c := pg_temp.pe_cot(jefa, e, 'PE secreta');
  c_pap := pg_temp.pe_cot(jefa, e, 'PE en la papelera');
  r := pg_temp.pe_enviar(jefa, jsonb_build_array(pg_temp.pe_item(c_pap)));
  if r ? 'error' or r ->> 'lote' is null then raise exception 'no se pudo preparar la que está en la papelera: %', r; end if;
  r := pg_temp.pe_enviar(ed, jsonb_build_array(pg_temp.pe_item(c), pg_temp.pe_item(v_nada, now()), pg_temp.pe_item(c_pap, now())));
  if r ? 'error' then raise exception 'enviar falló: %', r; end if;
  esperado := jsonb_build_object('titulo', null, 'codigo', '42501', 'motivo', 'No tienes acceso a esta cotización.');
  if pg_temp.pe_rechazo(r, c) is distinct from esperado then raise exception 'la que no ve: %', pg_temp.pe_rechazo(r, c); end if;
  if pg_temp.pe_rechazo(r, v_nada) is distinct from esperado then raise exception 'la inexistente: %', pg_temp.pe_rechazo(r, v_nada); end if;
  if pg_temp.pe_rechazo(r, c_pap) is distinct from esperado then raise exception 'la que ya está en la papelera: %', pg_temp.pe_rechazo(r, c_pap); end if;
  if not pg_temp.pe_viva(c) then raise exception 'quien edita sin ver la mandó'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: quien la ve y no puede recibe el 42501 de permiso con su título; con ver y moderar, se envía (E4)
begin;
do $$
declare jefa uuid := pg_temp.pe_jefa(); e jsonb := pg_temp.pe_origen(); ve uuid; mo uuid; c uuid; r jsonb;
begin
  ve := pg_temp.pe_persona(array['cotizaciones.ver']);
  mo := pg_temp.pe_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  c := pg_temp.pe_cot(jefa, e, 'PE a la vista');
  r := pg_temp.pe_enviar(ve, jsonb_build_array(pg_temp.pe_item(c)));
  if pg_temp.pe_rechazo(r, c) is distinct from jsonb_build_object('titulo', 'PE a la vista', 'codigo', '42501', 'motivo', 'No tienes permiso para enviarla a la papelera.') then
    raise exception 'quien sólo ve: %', r; end if;
  r := pg_temp.pe_enviar(mo, jsonb_build_array(pg_temp.pe_item(c)));
  if r ? 'error' or jsonb_array_length(r -> 'enviados') <> 1 or pg_temp.pe_viva(c) then raise exception 'con ver y moderar no se envió: %', r; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: todo rechazado no deja lote; vacío, más de 200 o mal formado dan 22023 (E6)
begin;
do $$
declare jefa uuid := pg_temp.pe_jefa(); e jsonb := pg_temp.pe_origen(); ve uuid; c uuid; r jsonb;
begin
  ve := pg_temp.pe_persona(array['cotizaciones.ver']);
  c := pg_temp.pe_cot(jefa, e);
  r := pg_temp.pe_enviar(ve, jsonb_build_array(pg_temp.pe_item(c)));
  if r -> 'lote' is distinct from 'null'::jsonb or r -> 'actualizado_en' is distinct from 'null'::jsonb or jsonb_array_length(r -> 'enviados') <> 0 then
    raise exception 'todo rechazado debía dar lote nulo: %', r; end if;
  if exists (select 1 from public.lotes_papelera where creado_por = ve) then raise exception 'todo rechazado dejó un lote'; end if;
  r := pg_temp.pe_enviar(jefa, '[]');
  if r is distinct from jsonb_build_object('error', '22023', 'mensaje', 'No llegó ninguna cotización.') then raise exception 'vacío: %', r; end if;
  r := pg_temp.pe_enviar(jefa, '{"id": 1}');
  if r is distinct from jsonb_build_object('error', '22023', 'mensaje', 'No llegó ninguna cotización.') then raise exception 'un objeto: %', r; end if;
  r := pg_temp.pe_enviar(jefa, (select jsonb_agg(pg_temp.pe_item(gen_random_uuid(), now())) from generate_series(1, 201)));
  if r is distinct from jsonb_build_object('error', '22023', 'mensaje', 'Se envían hasta 200 por vez.') then raise exception '201: %', r; end if;
  r := pg_temp.pe_enviar(jefa, jsonb_build_array(jsonb_build_object('id', 'no-es-un-uuid', 'actualizado_en', now())));
  if r is distinct from jsonb_build_object('error', '22023', 'mensaje', 'Una de las cotizaciones llegó incompleta. Recarga e intenta de nuevo.') then raise exception 'mal formado: %', r; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la RPC de enviar tiene prosecdef, search_path vacío, y execute sólo para authenticated (E8b)
do $$
declare r record;
begin
  select f.oid, f.prosecdef, f.proconfig into r from pg_proc f join pg_namespace n on n.oid = f.pronamespace
   where n.nspname = 'public' and f.proname = 'cotizaciones_papelera_enviar';
  if r.oid is null then raise exception 'no existe public.cotizaciones_papelera_enviar'; end if;
  if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception 'sin prosecdef o sin el search_path vacío: % %', r.prosecdef, r.proconfig; end if;
  if has_function_privilege('anon', r.oid, 'execute') then raise exception 'anon puede ejecutarla'; end if;
  if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'PUBLIC puede ejecutarla'; end if;
  if not has_function_privilege('authenticated', r.oid, 'execute') then raise exception 'authenticated no puede ejecutarla'; end if;
end $$;
