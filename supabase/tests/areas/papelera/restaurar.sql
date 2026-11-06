-- La papelera propia de cotizaciones: restaurar por lote con versión (paso 4.24-1b). `cotizaciones_papelera_restaurar(lote, versión, [ids])`, como la de
-- vehículos: lo que choca o cuelga de algo en la papelera queda «pendiente» con su motivo y el resto vuelve (P5, P7: cierra 4-70).
-- No depende de otro archivo (`SOLO=areas/papelera/restaurar.sql`): «la jefa» ve, edita, modera y gestiona finales en todo. Cada bloque que escribe abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   R1. Un lote de dos con su versión: las dos vuelven, el lote se cierra con su resumen, su versión y su actividad; con una parte, sólo esa y el lote sigue.
--   R2. 4-70: la N+1 cuya anterior ya tiene otra viva queda pendiente con texto; la otra vuelve; el lote sigue abierto.
--   R3. Una final cuando el vehículo ya tiene otra activa: pendiente.
--   R4. Su vehículo o su cliente en la papelera: pendiente.
--   R5. Una final sin vehículo (armada a mano: el camino normal no llega): pendiente; una preventa sin vehículo vuelve (P12).
--   R5b. Un 23514 de una regla nueva de la tabla deja pendiente esa y no aborta el lote.
--   R6. Quién y versión: el ajeno sin la clave (P10), con la clave, quien ya no ve una (P11), lotes que no son, versión nula o vieja.

create or replace function pg_temp.pr_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pr_' || substr(v_id::text, 1, 8), 'PR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.pr_jefa() returns uuid language sql as $f$
  select pg_temp.pr_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.pr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.pr_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pr_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('pr_' || substr(gen_random_uuid()::text, 1, 8), 'PR origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona (con vehículo, lead o anterior si se pasan).
create or replace function pg_temp.pr_cot(p_quien uuid, e jsonb, p_vehiculo uuid default null, p_clase text default 'preventa', p_lead uuid default null,
  p_padre uuid default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, lead_id, cotizacion_padre_id, clase, titulo, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_lead, p_padre, p_clase::public.clase_cotizacion, 'PR cotización',
          '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

create or replace function pg_temp.pr_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'PR vehículo', 'toyota') returning id into v;
  return v;
end $f$;

create or replace function pg_temp.pr_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id)
  values ('PR lead', '79424101', p_quien, (select id from public.origenes_lead where clave = 'web'))
  returning id into v;
  return v;
end $f$;

-- Manda esas cotizaciones a la papelera como esa persona; devuelve {lote, actualizado_en}.
create or replace function pg_temp.pr_enviar(p_quien uuid, p_ids uuid[]) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.pr_corre(p_quien, format('select public.cotizaciones_papelera_enviar(%L::jsonb)',
    (select jsonb_agg(jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en)) from public.cotizaciones c where c.id = any (p_ids))));
  if r ? 'error' or jsonb_array_length(r -> 'rechazados') <> 0 then raise exception 'enviar a la papelera falló: %', r; end if;
  return jsonb_build_object('lote', r -> 'lote', 'actualizado_en', r -> 'actualizado_en');
end $f$;

create or replace function pg_temp.pr_restaurar(p_quien uuid, p_lote uuid, p_version timestamptz, p_ids uuid[] default null) returns jsonb language sql as $f$
  select pg_temp.pr_corre(p_quien, format('select public.cotizaciones_papelera_restaurar(%L, %L, %L)', p_lote, p_version, p_ids));
$f$;

create or replace function pg_temp.pr_version(p_lote uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.lotes_papelera where id = p_lote;
$f$;

create or replace function pg_temp.pr_viva(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c and c.eliminado_en is null and c.eliminado_por is null and c.lote_papelera_id is null);
$f$;

-- El motivo del pendiente de ese id (nulo si no está).
create or replace function pg_temp.pr_motivo(r jsonb, p_c uuid) returns text language sql as $f$
  select x ->> 'motivo' from jsonb_array_elements(r -> 'pendientes') x where x ->> 'id' = p_c::text;
$f$;

create or replace function pg_temp.pr_restaurada(r jsonb, p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from jsonb_array_elements(r -> 'restaurados') x where x ->> 'id' = p_c::text);
$f$;

-- @test papelera de cotizaciones: restaurar un lote de dos con su versión las devuelve y cierra el lote; con una parte, sólo esa (R1)
begin;
do $$
declare jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); c1 uuid; c2 uuid; s jsonb; r jsonb; l public.lotes_papelera; v0 timestamptz;
begin
  c1 := pg_temp.pr_cot(jefa, e); c2 := pg_temp.pr_cot(jefa, e);
  s := pg_temp.pr_enviar(jefa, array[c1, c2]);
  v0 := (s ->> 'actualizado_en')::timestamptz;
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, v0);
  if r ? 'error' then raise exception 'restaurar falló: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'pendientes', 'quedan', 'restaurados'] then
    raise exception 'las claves de la respuesta no son las esperadas: %', r; end if;
  if (select array_agg(distinct k order by k) from jsonb_array_elements(r -> 'restaurados') x, jsonb_object_keys(x) k) is distinct from array['id', 'numero', 'titulo'] then
    raise exception 'un restaurado no lleva id, numero y titulo: %', r; end if;
  if jsonb_array_length(r -> 'restaurados') <> 2 or jsonb_array_length(r -> 'pendientes') <> 0 or (r ->> 'quedan')::int <> 0 then raise exception 'no restauró las dos: %', r; end if;
  if not (pg_temp.pr_viva(c1) and pg_temp.pr_viva(c2)) then raise exception 'las dos no volvieron vivas'; end if;
  select * into l from public.lotes_papelera where id = (s ->> 'lote')::uuid;
  if l.restaurado_en is null or l.restaurado_por is distinct from jefa then raise exception 'el lote no quedó restaurado por la jefa: %', to_jsonb(l); end if;
  if (l.resumen ->> 'restaurados')::int is distinct from 2 then raise exception 'el resumen no suma: %', l.resumen; end if;
  if l.actualizado_en <= v0 or (r ->> 'actualizado_en')::timestamptz is distinct from l.actualizado_en then raise exception 'la versión no se movió o no es la devuelta'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'papelera.restaurado' and a.registro_id = l.id::text and a.actor_id = jefa
                   and a.detalle = '{"tipo": "cotizaciones", "cantidad": 2}'::jsonb) then raise exception 'la actividad no lleva su detalle'; end if;

  c1 := pg_temp.pr_cot(jefa, e); c2 := pg_temp.pr_cot(jefa, e);
  s := pg_temp.pr_enviar(jefa, array[c1, c2]);
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz, array[c1]);
  if r ? 'error' or not pg_temp.pr_restaurada(r, c1) or jsonb_array_length(r -> 'restaurados') <> 1 or (r ->> 'quedan')::int <> 1 then raise exception 'una parte: %', r; end if;
  if not pg_temp.pr_viva(c1) or pg_temp.pr_viva(c2) then raise exception 'debía volver sólo la pedida'; end if;
  select * into l from public.lotes_papelera where id = (s ->> 'lote')::uuid;
  if l.restaurado_en is not null or (l.resumen ->> 'restaurados')::int is distinct from 1 then raise exception 'el lote con una adentro no debía cerrarse: %', to_jsonb(l); end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: la versión nueva cuya anterior ya tiene otra viva queda pendiente, y la otra del lote vuelve (R2, 4-70)
begin;
do $$
declare jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); a uuid; b uuid; c uuid; otra uuid; s jsonb; r jsonb;
begin
  a := pg_temp.pr_cot(jefa, e);
  b := pg_temp.pr_cot(jefa, e, p_padre => a);
  otra := pg_temp.pr_cot(jefa, e);
  s := pg_temp.pr_enviar(jefa, array[b, otra]);
  c := pg_temp.pr_cot(jefa, e, p_padre => a);
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'restaurar abortó: %', r; end if;
  if pg_temp.pr_motivo(r, b) is distinct from 'Esa cotización ya tiene otra versión nueva.' then raise exception 'la N+1 no quedó pendiente con su texto: %', r; end if;
  if not pg_temp.pr_restaurada(r, otra) or not pg_temp.pr_viva(otra) or pg_temp.pr_viva(b) then raise exception 'debía volver sólo la otra: %', r; end if;
  if (r ->> 'quedan')::int <> 1 then raise exception 'quedan: %', r; end if;
  if (select (select array_agg(distinct k order by k) from jsonb_array_elements(r -> 'pendientes') x, jsonb_object_keys(x) k)) is distinct from array['id', 'motivo', 'numero', 'titulo'] then
    raise exception 'un pendiente no lleva id, numero, titulo y motivo: %', r; end if;
  if (select restaurado_en from public.lotes_papelera where id = (s ->> 'lote')::uuid) is not null then raise exception 'el lote con una pendiente no debía cerrarse'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: una final cuando su vehículo ya tiene otra activa queda pendiente (R3)
begin;
do $$
declare jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); v uuid; f1 uuid; s jsonb; r jsonb;
begin
  v := pg_temp.pr_vehiculo(e);
  f1 := pg_temp.pr_cot(jefa, e, v, 'final');
  s := pg_temp.pr_enviar(jefa, array[f1]);
  perform pg_temp.pr_cot(jefa, e, v, 'final');
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'restaurar abortó: %', r; end if;
  if pg_temp.pr_motivo(r, f1) is distinct from 'Ese vehículo ya tiene otra cotización final.' then raise exception 'la final no quedó pendiente con su texto: %', r; end if;
  if pg_temp.pr_viva(f1) then raise exception 'la final volvió'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: si su vehículo o su cliente está en la papelera, queda pendiente (R4)
begin;
do $$
declare jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); v uuid; ld uuid; cv uuid; cl uuid; s jsonb; r jsonb;
begin
  v := pg_temp.pr_vehiculo(e); ld := pg_temp.pr_lead(jefa);
  cv := pg_temp.pr_cot(jefa, e, v); cl := pg_temp.pr_cot(jefa, e, p_lead => ld);
  s := pg_temp.pr_enviar(jefa, array[cv, cl]);
  update public.vehiculos set eliminado_en = now(), eliminado_por = jefa where id = v;
  update public.leads set eliminado_en = now(), eliminado_por = jefa where id = ld;
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'restaurar abortó: %', r; end if;
  if pg_temp.pr_motivo(r, cv) is distinct from 'Su vehículo está en la papelera.' then raise exception 'la del vehículo: %', r; end if;
  if pg_temp.pr_motivo(r, cl) is distinct from 'Su cliente está en la papelera.' then raise exception 'la del cliente: %', r; end if;
  if pg_temp.pr_viva(cv) or pg_temp.pr_viva(cl) or (r ->> 'quedan')::int <> 2 then raise exception 'ninguna debía volver: %', r; end if;
  if pg_temp.pr_version(( s ->> 'lote')::uuid) is distinct from (s ->> 'actualizado_en')::timestamptz then raise exception 'sin ninguna restaurada el lote no se toca'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: una final sin vehículo queda pendiente y una preventa sin vehículo vuelve (R5, P7, P12)
begin;
do $$
declare jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); v uuid; f uuid; p uuid; s jsonb; r jsonb;
begin
  v := pg_temp.pr_vehiculo(e);
  f := pg_temp.pr_cot(jefa, e, v, 'final'); p := pg_temp.pr_cot(jefa, e, v);
  s := pg_temp.pr_enviar(jefa, array[f, p]);
  -- Lo que dejaría purgar su vehículo si la purga no cayera con 23514 (V4): sin triggers, a mano.
  perform set_config('session_replication_role', 'replica', true);
  update public.cotizaciones set vehiculo_id = null where id in (f, p);
  perform set_config('session_replication_role', 'origin', true);
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'restaurar abortó: %', r; end if;
  if pg_temp.pr_motivo(r, f) is distinct from 'Su vehículo ya no existe.' then raise exception 'la final sin vehículo: %', r; end if;
  if not pg_temp.pr_restaurada(r, p) or not pg_temp.pr_viva(p) or pg_temp.pr_viva(f) then raise exception 'la preventa sin vehículo debía volver y la final no: %', r; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: un 23514 de otra regla de la tabla deja pendiente esa con su texto y no aborta el lote (R5b, P7)
begin;
create function public.pr_regla_nueva() returns trigger language plpgsql set search_path = '' as $f$
begin
  if new.titulo = 'PR regla' and old.eliminado_en is not null and new.eliminado_en is null then raise exception 'R5b: regla nueva.' using errcode = '23514'; end if;
  return new;
end $f$;
create trigger pr_regla_nueva before update on public.cotizaciones for each row execute function public.pr_regla_nueva();
do $$
declare jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); x uuid; ok uuid; s jsonb; r jsonb;
begin
  x := pg_temp.pr_cot(jefa, e); ok := pg_temp.pr_cot(jefa, e);
  update public.cotizaciones set titulo = 'PR regla' where id = x;
  s := pg_temp.pr_enviar(jefa, array[x, ok]);
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' then raise exception 'restaurar abortó: %', r; end if;
  if pg_temp.pr_motivo(r, x) is distinct from 'R5b: regla nueva.' then raise exception 'la que rompe la regla: %', r; end if;
  if not pg_temp.pr_restaurada(r, ok) or not pg_temp.pr_viva(ok) or pg_temp.pr_viva(x) then raise exception 'la otra debía volver: %', r; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: restaurar pide ser quien lo envió o la clave, el lote de cotizaciones pendiente y la versión (R6, P10, P11)
begin;
do $$
declare
  jefa uuid := pg_temp.pr_jefa(); e jsonb := pg_temp.pr_origen(); e2 jsonb := pg_temp.pr_origen(); otro uuid; k uuid; ed uuid;
  c uuid; s jsonb; r jsonb; v_lote_veh uuid; v_veh uuid;
begin
  otro := pg_temp.pr_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar']);
  k := pg_temp.pr_persona(array['cotizaciones.papelera.purgar']);
  c := pg_temp.pr_cot(jefa, e);
  s := pg_temp.pr_enviar(jefa, array[c]);
  perform pg_temp.pr_da_error('el ajeno sin la clave', pg_temp.pr_restaurar(otro, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz),
    '42501', 'Sólo lo restaura quien lo envió o quien puede vaciar la papelera.');
  if pg_temp.pr_viva(c) or pg_temp.pr_version((s ->> 'lote')::uuid) is distinct from (s ->> 'actualizado_en')::timestamptz then raise exception 'el ajeno tocó el lote'; end if;
  perform pg_temp.pr_da_error('versión nula', pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, null),
    '22023', 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.');
  r := pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz - interval '1 second');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'la versión vieja debía dar PT409: %', r; end if;
  r := pg_temp.pr_restaurar(k, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' or not pg_temp.pr_restaurada(r, c) then raise exception 'con la clave debía restaurar el ajeno: %', r; end if;
  perform pg_temp.pr_da_error('uno ya restaurado', pg_temp.pr_restaurar(jefa, (s ->> 'lote')::uuid, pg_temp.pr_version((s ->> 'lote')::uuid)),
    'PT409', 'Ese lote ya no está en la papelera.');
  perform pg_temp.pr_da_error('uno inexistente', pg_temp.pr_restaurar(jefa, gen_random_uuid(), now()), 'PT409', 'Ese lote ya no está en la papelera.');
  v_veh := pg_temp.pr_vehiculo(e);
  insert into public.lotes_papelera (tipo, creado_por) values ('vehiculos', jefa) returning id into v_lote_veh;
  perform pg_temp.pr_da_error('un lote de vehículos', pg_temp.pr_restaurar(jefa, v_lote_veh, pg_temp.pr_version(v_lote_veh)), 'PT409', 'Ese lote ya no está en la papelera.');
  -- Quien envió y ya no ve una (le quitaron el origen): la restaura igual (P11 a).
  ed := pg_temp.pr_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  c := pg_temp.pr_cot(ed, e2);
  s := pg_temp.pr_enviar(ed, array[c]);
  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = ed and rp.rol_id = ur.rol_id and rp.permiso_clave = 'cotizaciones.ver';
  r := pg_temp.pr_restaurar(ed, (s ->> 'lote')::uuid, (s ->> 'actualizado_en')::timestamptz);
  if r ? 'error' or not pg_temp.pr_restaurada(r, c) or not pg_temp.pr_viva(c) then raise exception 'quien la envió y ya no la ve debía restaurarla: %', r; end if;
end $$;
reset role;
rollback;
