-- La papelera propia de cotizaciones: purgar por lote con versión (paso 4.24-1b). `cotizaciones_papelera_purgar(lote, versión, [ids])`, como la de
-- vehículos: lo que otra tabla necesita (un comprobante, P4) queda «bloqueado» y el resto se borra para siempre; los adjuntos se encolan para limpiar
-- después del borrado y sólo si nadie más nombra su ruta. La genérica `papelera_purgar(lote)` pasa por el mismo ayudante y ya no aborta con una bloqueada.
-- No depende de otro archivo (`SOLO=areas/papelera/purgar.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   PU1. Un lote de dos con revisiones y adjuntos: se borran con sus hijas, sus rutas a la cola, el lote se cierra con resumen, versión y actividad; una parte, sólo esa.
--   PU2. Una final con comprobante queda bloqueada con su motivo; la otra se purga; el lote sigue.
--   PU3. Un adjunto cuya ruta también nombra una cotización viva no va a la cola.
--   PU4. Quién y versión: sin la clave, antes de mirar el lote; con la clave, el ajeno; lotes que no son; versión nula o vieja.
--   PU5. La genérica: no aborta con la bloqueada, encola por refcount y, sin sesión, registra la purga como automática.
--   PU6. Purgar una anterior deja viva su versión nueva, sin anterior.
--   PU7. Privilegios.

create or replace function pg_temp.pu_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pu_' || substr(v_id::text, 1, 8), 'PU ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.pu_jefa() returns uuid language sql as $f$
  select pg_temp.pu_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.pu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.pu_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pu_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('pu_' || substr(gen_random_uuid()::text, 1, 8), 'PU origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona (con vehículo, lead o anterior si se pasan).
create or replace function pg_temp.pu_cot(p_quien uuid, e jsonb, p_vehiculo uuid default null, p_clase text default 'preventa', p_lead uuid default null,
  p_padre uuid default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, lead_id, cotizacion_padre_id, clase, titulo, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_lead, p_padre, p_clase::public.clase_cotizacion, 'PU cotización',
          '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

create or replace function pg_temp.pu_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'PU vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Manda esas cotizaciones a la papelera como esa persona; devuelve {lote, actualizado_en}.
create or replace function pg_temp.pu_enviar(p_quien uuid, p_ids uuid[]) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.pu_corre(p_quien, format('select public.cotizaciones_papelera_enviar(%L::jsonb)',
    (select jsonb_agg(jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en)) from public.cotizaciones c where c.id = any (p_ids))));
  if r ? 'error' or jsonb_array_length(r -> 'rechazados') <> 0 then raise exception 'enviar a la papelera falló: %', r; end if;
  return jsonb_build_object('lote', r -> 'lote', 'actualizado_en', r -> 'actualizado_en');
end $f$;


create or replace function pg_temp.pu_version(p_lote uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.lotes_papelera where id = p_lote;
$f$;

create or replace function pg_temp.pu_purgar(p_quien uuid, p_lote uuid, p_version timestamptz, p_ids uuid[] default null) returns jsonb language sql as $f$
  select pg_temp.pu_corre(p_quien, format('select public.cotizaciones_papelera_purgar(%L, %L, %L)', p_lote, p_version, p_ids));
$f$;

create or replace function pg_temp.pu_generica(p_quien uuid, p_lote uuid) returns jsonb language sql as $f$
  select pg_temp.pu_corre(p_quien, format('select to_jsonb(public.papelera_purgar(%L))', p_lote));
$f$;

-- Un adjunto y una revisión de esa cotización.
create or replace function pg_temp.pu_hijas(p_c uuid, p_ruta text) returns void language sql as $f$
  insert into public.cotizaciones_adjuntos (cotizacion_id, ruta, nombre, mime, bytes) values (p_c, p_ruta, 'a.pdf', 'application/pdf', 10);
  insert into public.cotizaciones_revisiones (cotizacion_id, diff) values (p_c, '{}');
$f$;

create or replace function pg_temp.pu_viva(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c and c.eliminado_en is null and c.lote_papelera_id is null);
$f$;

create or replace function pg_temp.pu_existe(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c);
$f$;

create or replace function pg_temp.pu_en_cola(p_ruta text) returns boolean language sql as $f$
  select exists (select 1 from public.cola_gc_storage g where g.bucket = 'cotizaciones' and g.ruta = p_ruta);
$f$;

create or replace function pg_temp.pu_bloqueo(r jsonb, p_c uuid) returns text language sql as $f$
  select x ->> 'motivo' from jsonb_array_elements(r -> 'bloqueados') x where x ->> 'id' = p_c::text;
$f$;

-- La jefa que además vacía la papelera y emite comprobantes.
create or replace function pg_temp.pu_jefa_k() returns uuid language sql as $f$
  select pg_temp.pu_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar',
    'cotizaciones.papelera.purgar', 'cotizaciones.comprobantes.emitir']);
$f$;

-- @test papelera de cotizaciones: purgar un lote de dos las borra con sus hijas, encola sus rutas y cierra el lote; una parte, sólo esa (PU1)
begin;
do $$
declare jefa uuid := pg_temp.pu_jefa_k(); e jsonb := pg_temp.pu_origen(); c1 uuid; c2 uuid; s jsonb; r jsonb; l public.lotes_papelera;
begin
  c1 := pg_temp.pu_cot(jefa, e); c2 := pg_temp.pu_cot(jefa, e);
  perform pg_temp.pu_hijas(c1, c1 || '/a.pdf'); perform pg_temp.pu_hijas(c2, c2 || '/a.pdf');
  s := pg_temp.pu_enviar(jefa, array[c1, c2]);
  r := pg_temp.pu_purgar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'purgar falló: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'bloqueados', 'purgados', 'quedan'] then
    raise exception 'las claves de la respuesta no son las esperadas: %', r; end if;
  if (select array_agg(distinct k order by k) from jsonb_array_elements(r -> 'purgados') x, jsonb_object_keys(x) k) is distinct from array['id', 'numero', 'titulo'] then
    raise exception 'un purgado no lleva id, numero y titulo: %', r; end if;
  if jsonb_array_length(r -> 'purgados') <> 2 or jsonb_array_length(r -> 'bloqueados') <> 0 or (r ->> 'quedan')::int <> 0 then raise exception 'no purgó las dos: %', r; end if;
  if pg_temp.pu_existe(c1) or pg_temp.pu_existe(c2) then raise exception 'las cotizaciones siguen'; end if;
  if exists (select 1 from public.cotizaciones_revisiones where cotizacion_id in (c1, c2)) or exists (select 1 from public.cotizaciones_adjuntos where cotizacion_id in (c1, c2)) then
    raise exception 'quedaron hijas'; end if;
  if not (pg_temp.pu_en_cola(c1 || '/a.pdf') and pg_temp.pu_en_cola(c2 || '/a.pdf')) then raise exception 'las rutas no fueron a la cola'; end if;
  select * into l from public.lotes_papelera where id = (s ->> 'lote')::uuid;
  if l.purgado_en is null or (l.resumen ->> 'purgados')::int is distinct from 2 then raise exception 'el lote no quedó purgado con su resumen: %', to_jsonb(l); end if;
  if l.actualizado_en <= (s ->> 'actualizado_en')::timestamptz or (r ->> 'actualizado_en')::timestamptz is distinct from l.actualizado_en then raise exception 'la versión'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'papelera.purgado' and a.registro_id = l.id::text and a.actor_id = jefa
                   and a.detalle = '{"tipo": "cotizaciones", "cantidad": 2, "automatica": false}'::jsonb) then raise exception 'la actividad no lleva su detalle'; end if;

  c1 := pg_temp.pu_cot(jefa, e); c2 := pg_temp.pu_cot(jefa, e);
  s := pg_temp.pu_enviar(jefa, array[c1, c2]);
  r := pg_temp.pu_purgar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz, array[c1]);
  if r ? 'error' or jsonb_array_length(r -> 'purgados') <> 1 or (r ->> 'quedan')::int <> 1 or pg_temp.pu_existe(c1) or not pg_temp.pu_existe(c2) then raise exception 'una parte: %', r; end if;
  if (select purgado_en from public.lotes_papelera where id = (s ->> 'lote')::uuid) is not null then raise exception 'el lote con una adentro no debía cerrarse'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: una final con comprobante queda bloqueada y la otra se purga (PU2, P4)
begin;
do $$
declare jefa uuid := pg_temp.pu_jefa_k(); e jsonb := pg_temp.pu_origen(); f uuid; p uuid; s jsonb; r jsonb;
begin
  f := pg_temp.pu_cot(jefa, e, pg_temp.pu_vehiculo(e), 'final'); p := pg_temp.pu_cot(jefa, e);
  r := pg_temp.pu_corre(jefa, format('select public.comprobante_emitir(%L, %L, %L::jsonb)', f, 'PU', '{"cliente": "PU"}'));
  if r ? 'error' then raise exception 'no se emitió el comprobante: %', r; end if;
  s := pg_temp.pu_enviar(jefa, array[f, p]);
  r := pg_temp.pu_purgar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'purgar abortó: %', r; end if;
  if pg_temp.pu_bloqueo(r, f) is distinct from 'Otros registros dependen de ella.' then raise exception 'la final con comprobante: %', r; end if;
  if (select array_agg(distinct k order by k) from jsonb_array_elements(r -> 'bloqueados') x, jsonb_object_keys(x) k) is distinct from array['id', 'motivo', 'numero', 'titulo'] then
    raise exception 'un bloqueado no lleva id, numero, titulo y motivo: %', r; end if;
  if pg_temp.pu_existe(p) or not pg_temp.pu_existe(f) or (r ->> 'quedan')::int <> 1 then raise exception 'debía purgarse sólo la preventa: %', r; end if;
  if (select purgado_en from public.lotes_papelera where id = (s ->> 'lote')::uuid) is not null then raise exception 'el lote con una bloqueada no debía cerrarse'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: un adjunto cuya ruta nombra también una viva no va a la cola; el propio, sí (PU3)
begin;
do $$
declare jefa uuid := pg_temp.pu_jefa_k(); e jsonb := pg_temp.pu_origen(); w uuid; c uuid; s jsonb; r jsonb;
begin
  w := pg_temp.pu_cot(jefa, e); c := pg_temp.pu_cot(jefa, e);
  perform pg_temp.pu_hijas(w, w || '/compartido.pdf');
  perform pg_temp.pu_hijas(c, w || '/compartido.pdf'); perform pg_temp.pu_hijas(c, c || '/propio.pdf');
  s := pg_temp.pu_enviar(jefa, array[c]);
  r := pg_temp.pu_purgar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' or pg_temp.pu_existe(c) then raise exception 'purgar falló: %', r; end if;
  if pg_temp.pu_en_cola(w || '/compartido.pdf') then raise exception 'encoló una ruta que una viva todavía nombra'; end if;
  if not pg_temp.pu_en_cola(c || '/propio.pdf') then raise exception 'no encoló la ruta propia'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: purgar pide la clave antes de mirar el lote, el lote de cotizaciones pendiente y la versión (PU4)
begin;
do $$
declare k uuid; jefa uuid; e jsonb := pg_temp.pu_origen(); c uuid; s jsonb; r jsonb; v_lote_veh uuid;
begin
  -- K primero: con `SOLO=` la primera cuenta nace dueña (lo puede todo), y la jefa tiene que ser una sin la clave.
  k := pg_temp.pu_persona(array['cotizaciones.papelera.purgar']);
  jefa := pg_temp.pu_jefa();
  c := pg_temp.pu_cot(jefa, e);
  s := pg_temp.pu_enviar(jefa, array[c]);
  perform pg_temp.pu_da_error('sin la clave, su propio lote', pg_temp.pu_purgar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz),
    '42501', 'No tienes permiso para purgar la papelera.');
  perform pg_temp.pu_da_error('sin la clave, uno inexistente', pg_temp.pu_purgar(jefa, gen_random_uuid(), now()), '42501', 'No tienes permiso para purgar la papelera.');
  if not pg_temp.pu_existe(c) then raise exception 'sin la clave se purgó'; end if;
  perform pg_temp.pu_da_error('versión nula', pg_temp.pu_purgar(k, (s ->> 'lote')::uuid, null),
    '22023', 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.');
  r := pg_temp.pu_purgar(k, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz - interval '1 second');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'la versión vieja debía dar PT409: %', r; end if;
  r := pg_temp.pu_purgar(k, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' or pg_temp.pu_existe(c) then raise exception 'con la clave debía purgar el ajeno: %', r; end if;
  perform pg_temp.pu_da_error('uno ya purgado', pg_temp.pu_purgar(k, (s ->> 'lote')::uuid, pg_temp.pu_version((s ->> 'lote')::uuid)), 'PT409', 'Ese lote ya no está en la papelera.');
  perform pg_temp.pu_da_error('uno inexistente', pg_temp.pu_purgar(k, gen_random_uuid(), now()), 'PT409', 'Ese lote ya no está en la papelera.');
  insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', jefa) returning id into v_lote_veh;
  perform pg_temp.pu_da_error('un lote de vehículos', pg_temp.pu_purgar(k, v_lote_veh, pg_temp.pu_version(v_lote_veh)), 'PT409', 'Ese lote ya no está en la papelera.');
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la genérica no aborta con una bloqueada, encola por refcount y sin sesión es automática (PU5)
begin;
do $$
declare jefa uuid := pg_temp.pu_jefa_k(); e jsonb := pg_temp.pu_origen(); f uuid; p uuid; w uuid; s jsonb; r jsonb; v_lote uuid;
begin
  f := pg_temp.pu_cot(jefa, e, pg_temp.pu_vehiculo(e), 'final'); p := pg_temp.pu_cot(jefa, e); w := pg_temp.pu_cot(jefa, e);
  r := pg_temp.pu_corre(jefa, format('select public.comprobante_emitir(%L, %L, %L::jsonb)', f, 'PU', '{"cliente": "PU"}'));
  if r ? 'error' then raise exception 'no se emitió el comprobante: %', r; end if;
  perform pg_temp.pu_hijas(w, w || '/compartido.pdf'); perform pg_temp.pu_hijas(p, w || '/compartido.pdf');
  s := pg_temp.pu_enviar(jefa, array[f, p]);
  r := pg_temp.pu_generica(jefa, (s ->> 'lote')::uuid);
  if r is distinct from '1'::jsonb then raise exception 'la genérica debía purgar una: %', r; end if;
  if pg_temp.pu_existe(p) or not pg_temp.pu_existe(f) then raise exception 'debía purgarse sólo la preventa'; end if;
  if (select purgado_en from public.lotes_papelera where id = (s ->> 'lote')::uuid) is not null then raise exception 'el lote con una bloqueada no debía cerrarse'; end if;
  if pg_temp.pu_en_cola(w || '/compartido.pdf') then raise exception 'la genérica encoló una ruta que una viva todavía nombra'; end if;

  p := pg_temp.pu_cot(jefa, e);
  v_lote := (pg_temp.pu_enviar(jefa, array[p]) ->> 'lote')::uuid;
  perform set_config('request.jwt.claim.sub', '', true);
  if public.papelera_purgar(v_lote) <> 1 then raise exception 'sin sesión no purgó'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'papelera.purgado' and a.registro_id = v_lote::text and a.actor_id is null
                   and a.detalle = '{"tipo": "cotizaciones", "cantidad": 1, "automatica": true}'::jsonb) then raise exception 'sin sesión la purga no quedó como automática'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: purgar una anterior deja viva su versión nueva, sin anterior (PU6)
begin;
do $$
declare jefa uuid := pg_temp.pu_jefa_k(); e jsonb := pg_temp.pu_origen(); a uuid; b uuid; s jsonb; r jsonb;
begin
  a := pg_temp.pu_cot(jefa, e); b := pg_temp.pu_cot(jefa, e, p_padre => a);
  s := pg_temp.pu_enviar(jefa, array[a]);
  r := pg_temp.pu_purgar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' or pg_temp.pu_existe(a) then raise exception 'purgar la anterior falló: %', r; end if;
  if not pg_temp.pu_viva(b) or (select cotizacion_padre_id from public.cotizaciones where id = b) is not null then raise exception 'la versión nueva no quedó viva y sin anterior'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: el ayudante de purgar es de nadie y las dos RPC son definer de authenticated (PU7)
do $$
declare f text; v_fn regprocedure;
begin
  v_fn := 'public._papelera_purgar_cotizaciones(uuid, uuid[])'::regprocedure;
  if has_function_privilege('authenticated', v_fn, 'execute') or has_function_privilege('anon', v_fn, 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'el ayudante de purgar se puede ejecutar fuera de la base'; end if;
  foreach f in array array['public.cotizaciones_papelera_purgar(uuid, timestamptz, uuid[])', 'public.papelera_purgar(uuid)'] loop
    v_fn := f::regprocedure;
    if not (select prosecdef and proconfig is not distinct from array['search_path=""'] from pg_proc where oid = v_fn) then raise exception '% no es definer con search_path vacío', f; end if;
    if not has_function_privilege('authenticated', v_fn, 'execute') or has_function_privilege('anon', v_fn, 'execute')
       or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception '% con privilegios de más o de menos', f; end if;
  end loop;
end $$;
