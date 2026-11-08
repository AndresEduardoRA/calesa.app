-- La purga automática de la papelera incluye las cotizaciones (paso 4.24-1b): `papelera_purgar_vencidos()` (el job, sin sesión) purga también los lotes
-- `cotizaciones` vencidos, por el ayudante de la propia, junto a los de vehículos y leads.
-- No depende de otro archivo (`SOLO=areas/papelera/purga-automatica.sql`). Cada bloque que escribe abre su transacción y la revierte; antes de sembrar, una
-- corrida limpia lo vencido que trajera la base, para contar exacto.
--
-- Qué asegura:
--   PA1. Un lote vencido se purga entero y se cierra; uno sin vencer, no; uno vencido con una bloqueada purga la otra y sigue; la 2.ª corrida no purga nada;
--        la actividad, sin actor y automática.
--   PA2. Lotes de leads y de vehículos vencidos se purgan en la misma corrida; la cuenta es la suma.
--   PA3. La forma: la rama de cotizaciones es una sonda por lote (no un `exists`) y salta lo tomado; el job no es de authenticated; el índice por ruta de los adjuntos.

create or replace function pg_temp.pa_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pa_' || substr(v_id::text, 1, 8), 'PA ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.pa_jefa() returns uuid language sql as $f$
  select pg_temp.pa_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.pa_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.pa_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pa_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('pa_' || substr(gen_random_uuid()::text, 1, 8), 'PA origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona (con vehículo, lead o anterior si se pasan).
create or replace function pg_temp.pa_cot(p_quien uuid, e jsonb, p_vehiculo uuid default null, p_clase text default 'preventa', p_lead uuid default null,
  p_padre uuid default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, lead_id, cotizacion_padre_id, clase, titulo, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_lead, p_padre, p_clase::public.clase_cotizacion, 'PA cotización',
          '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

create or replace function pg_temp.pa_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'PA vehículo', 'toyota') returning id into v;
  return v;
end $f$;

create or replace function pg_temp.pa_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id)
  values ('PA lead', '79424102', p_quien, (select id from public.origenes_lead where clave = 'web'))
  returning id into v;
  return v;
end $f$;

-- Manda esas cotizaciones a la papelera como esa persona; devuelve {lote, actualizado_en}.
create or replace function pg_temp.pa_enviar(p_quien uuid, p_ids uuid[]) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.pa_corre(p_quien, format('select public.cotizaciones_papelera_enviar(%L::jsonb)',
    (select jsonb_agg(jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en)) from public.cotizaciones c where c.id = any (p_ids))));
  if r ? 'error' or jsonb_array_length(r -> 'rechazados') <> 0 then raise exception 'enviar a la papelera falló: %', r; end if;
  return jsonb_build_object('lote', r -> 'lote', 'actualizado_en', r -> 'actualizado_en');
end $f$;


create or replace function pg_temp.pa_version(p_lote uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.lotes_papelera where id = p_lote;
$f$;

create or replace function pg_temp.pa_jefa_k() returns uuid language sql as $f$
  select pg_temp.pa_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar',
    'cotizaciones.papelera.purgar', 'cotizaciones.comprobantes.emitir']);
$f$;

-- Vence ese lote (un día más que la papelera).
create or replace function pg_temp.pa_vencer(p_lote uuid) returns void language sql as $f$
  update public.lotes_papelera set creado_en = now() - make_interval(days => (select papelera_dias + 1 from public.ajustes_empresa where id = 1)) where id = p_lote;
$f$;

create or replace function pg_temp.pa_existe(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c);
$f$;

-- El job, sin sesión.
create or replace function pg_temp.pa_job() returns int language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  return public.papelera_purgar_vencidos();
end $f$;

-- Un comprobante heredado (de antes del 4.26) sobre una cotización que ya está en la papelera: como postgres, en la serie PA de la prueba. Hoy emitir pide una
-- final viva y la papelera rechaza una cotización con comprobante; lo que queda por cubrir en la purga es el caso que ya estaba en la base.
create or replace function pg_temp.pa_comprobante(p_c uuid) returns void language sql as $f$
  insert into public.comprobantes_contadores (serie, ultimo) values ('PA', 0) on conflict do nothing;
  with n as (update public.comprobantes_contadores set ultimo = ultimo + 1 where serie = 'PA' returning ultimo)
  insert into public.comprobantes (cotizacion_id, serie, numero, datos) select p_c, 'PA', n.ultimo, '{}'::jsonb from n;
$f$;

-- @test papelera de cotizaciones: la purga automática purga los lotes vencidos de cotizaciones y nunca lo bloqueado (PA1)
begin;
do $$
declare
  jefa uuid := pg_temp.pa_jefa_k(); e jsonb := pg_temp.pa_origen(); c1 uuid; c2 uuid; nv uuid; f uuid; p uuid; r jsonb;
  l_venc uuid; l_nuevo uuid; l_bloq uuid; n int;
begin
  perform pg_temp.pa_job();
  c1 := pg_temp.pa_cot(jefa, e); c2 := pg_temp.pa_cot(jefa, e); nv := pg_temp.pa_cot(jefa, e);
  f := pg_temp.pa_cot(jefa, e, pg_temp.pa_vehiculo(e), 'final'); p := pg_temp.pa_cot(jefa, e);
  l_venc := (pg_temp.pa_enviar(jefa, array[c1, c2]) ->> 'lote')::uuid;
  l_nuevo := (pg_temp.pa_enviar(jefa, array[nv]) ->> 'lote')::uuid;
  l_bloq := (pg_temp.pa_enviar(jefa, array[f, p]) ->> 'lote')::uuid;
  perform pg_temp.pa_comprobante(f);
  perform pg_temp.pa_vencer(l_venc); perform pg_temp.pa_vencer(l_bloq);

  n := pg_temp.pa_job();
  if n <> 3 then raise exception 'la purga automática debía purgar 3 cotizaciones y purgó %', n; end if;
  if pg_temp.pa_existe(c1) or pg_temp.pa_existe(c2) or (select purgado_en is null from public.lotes_papelera where id = l_venc) then raise exception 'el lote vencido no se purgó entero'; end if;
  if not pg_temp.pa_existe(nv) then raise exception 'purgó un lote sin vencer'; end if;
  if pg_temp.pa_existe(p) or not pg_temp.pa_existe(f) or (select purgado_en is not null from public.lotes_papelera where id = l_bloq) then
    raise exception 'el lote con una bloqueada: debía purgar la otra y seguir pendiente'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'papelera.purgado' and a.registro_id = l_venc::text and a.actor_id is null
                   and a.detalle = '{"tipo": "cotizaciones", "cantidad": 2, "automatica": true}'::jsonb) then raise exception 'la purga automática no quedó registrada como tal'; end if;
  n := pg_temp.pa_job();
  if n <> 0 then raise exception 'la segunda corrida purgó %', n; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: en la misma corrida se siguen purgando los lotes de leads y de vehículos (PA2)
begin;
do $$
declare jefa uuid := pg_temp.pa_jefa_k(); e jsonb := pg_temp.pa_origen(); c uuid; v uuid; ld uuid; l_c uuid; l_v uuid; l_l uuid; n int;
begin
  perform pg_temp.pa_job();
  c := pg_temp.pa_cot(jefa, e); v := pg_temp.pa_vehiculo(e); ld := pg_temp.pa_lead(jefa);
  l_c := (pg_temp.pa_enviar(jefa, array[c]) ->> 'lote')::uuid;
  insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', jefa) returning id into l_v;
  insert into public.lotes_papelera (tipo, creado_por) values ('leads', jefa) returning id into l_l;
  update public.vehiculos set eliminado_en = now(), eliminado_por = jefa, lote_papelera_id = l_v where id = v;
  update public.leads set eliminado_en = now(), eliminado_por = jefa, lote_papelera_id = l_l where id = ld;
  perform pg_temp.pa_vencer(l_c); perform pg_temp.pa_vencer(l_v); perform pg_temp.pa_vencer(l_l);
  n := pg_temp.pa_job();
  if n <> 3 then raise exception 'debía purgar una de cada tipo (3) y purgó %', n; end if;
  if pg_temp.pa_existe(c) or exists (select 1 from public.vehiculos where id = v) or exists (select 1 from public.leads where id = ld) then raise exception 'quedó alguno sin purgar'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la rama de cotizaciones del job es una sonda por lote que salta lo tomado, y los adjuntos tienen su índice por ruta (PA3)
do $$
declare v_src text := (select prosrc from pg_proc where oid = 'public.papelera_purgar_vencidos()'::regprocedure);
begin
  if v_src !~ $r$l\.tipo = 'cotizaciones' and \(select true from public\.cotizaciones c where c\.lote_papelera_id = l\.id and c\.eliminado_en is not null limit 1\)$r$ then
    raise exception 'la rama de cotizaciones del job no es la sonda por lote'; end if;
  if v_src ~ 'exists \(select 1 from public\.cotizaciones' then raise exception 'la rama de cotizaciones del job usa exists'; end if;
  if v_src !~ 'for no key update skip locked' then raise exception 'el job no salta un lote de cotizaciones tomado'; end if;
  if has_function_privilege('authenticated', 'public.papelera_purgar_vencidos()', 'execute') then raise exception 'el job es de authenticated'; end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'cotizaciones_adjuntos_ruta_idx'
                   and indexdef like '%ON public.cotizaciones_adjuntos USING btree (ruta)') then raise exception 'falta cotizaciones_adjuntos_ruta_idx (ruta)'; end if;
end $$;
