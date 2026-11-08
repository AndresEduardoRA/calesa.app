-- Marcar una cotización como final (paso 4.25-1): el orden de candados en el cuerpo y el ayudante de los efectos, `_final_aplicar()`.
-- No depende de otro archivo (`SOLO=areas/final/marcar-candados.sql`). Cada bloque que escribe abre su transacción y la revierte. Las carreras que prueban el
-- orden con dos conexiones están en `carreras.mjs`; la conducta de marcar, en `marcar.sql`.
--
-- Qué asegura:
--   F10. Marcar toma el lead `for no key update`, después el vehículo `for key share`, después las cotizaciones, y recién entonces relee el lead del
--        vehículo y llama a `_final_aplicar()`; no escribe el vehículo. El ayudante no toma candados y cada `update` de cotizaciones va por id.
--   F11. El cinturón de `_final_aplicar()`: con el vehículo de otro lead, 23514 y nada cambia; con el vehículo ya del lead, no lo escribe.
--   F12. La final anterior baja por id: una final que no estaba entre las tomadas da 23505 y queda como estaba.
--   F13. Privilegios: marcar sigue de authenticated; el ayudante es sólo de service_role; los dos con `search_path` vacío.

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.mc_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('mc_' || substr(gen_random_uuid()::text, 1, 8), 'MC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una persona sin rol (los efectos los aplica el ayudante: no mira permisos) y un lead suyo.
create or replace function pg_temp.mc_persona() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;

create or replace function pg_temp.mc_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('MC lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id into v;
  return v;
end $f$;

create or replace function pg_temp.mc_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'MC vehículo', 'toyota') returning id into v;
  return v;
end $f$;

create or replace function pg_temp.mc_cot(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- Lo que el ayudante puede cambiar: clases y vida de las cotizaciones del vehículo, su lead, sus vínculos y el tipo del lead.
create or replace function pg_temp.mc_foto(p_v uuid, p_lead uuid) returns jsonb language sql as $f$
  select jsonb_build_object(
    'cotizaciones', (select jsonb_agg(jsonb_build_array(c.id, c.clase, c.eliminado_en is null, c.lote_papelera_id) order by c.id) from public.cotizaciones c where c.vehiculo_id = p_v),
    'lead_del_vehiculo', (select v.lead_id from public.vehiculos v where v.id = p_v),
    'vinculos', (select count(*) from public.vehiculos_vinculos k where k.vehiculo_id = p_v),
    'tipo', (select l.tipo_lead_id from public.leads l where l.id = p_lead));
$f$;

-- Llama al ayudante con esa cotización y esas tomadas; devuelve el sqlstate y el mensaje, o nulo si no falló.
create or replace function pg_temp.mc_aplicar(p_c uuid, p_tomadas uuid[]) returns jsonb language plpgsql as $f$
declare c public.cotizaciones; v_m text; v_e text;
begin
  select * into c from public.cotizaciones x where x.id = p_c;
  begin
    perform public._final_aplicar(c, p_tomadas);
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  return null;
end $f$;

-- @test marcar final: el orden de candados en el cuerpo, la relectura del vínculo y un ayudante sin candados que escribe por id (F10)
do $$
declare
  src text; ayu text; p_lead int; p_veh int; p_cot1 int; p_cotn int; p_apl int; p_relee int; s text;
  pat_cot constant text := 'public\.cotizaciones[^;]*for\s+no\s+key\s+update';
begin
  select pg_get_functiondef('public.cotizacion_marcar_final(uuid)'::regprocedure) into src;
  select pg_get_functiondef(p.oid) into ayu from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = '_final_aplicar';
  if ayu is null then raise exception 'no existe public._final_aplicar'; end if;
  p_lead := regexp_instr(src, 'public\.leads[^;]*for\s+no\s+key\s+update');
  p_veh := regexp_instr(src, 'public\.vehiculos[^;]*for\s+key\s+share');
  p_cot1 := regexp_instr(src, pat_cot);
  p_cotn := regexp_instr(src, pat_cot, 1, greatest(regexp_count(src, pat_cot), 1));
  p_apl := position('_final_aplicar(' in src);
  if p_lead = 0 or p_veh = 0 or p_cot1 = 0 or p_apl = 0 then
    raise exception 'marcar no toma el lead for no key update, el vehículo for key share y las cotizaciones for no key update, o no llama al ayudante: % % % %', p_lead, p_veh, p_cot1, p_apl; end if;
  if not (p_lead < p_veh and p_veh < p_cot1) then raise exception 'el orden de candados no es lead → vehículo → cotizaciones: % % %', p_lead, p_veh, p_cot1; end if;
  if p_apl < p_cotn then raise exception 'marcar llama al ayudante antes del último candado de cotizaciones'; end if;
  p_relee := regexp_instr(src, 'select[^;]*lead_id[^;]*from\s+public\.vehiculos', p_cotn);
  if p_relee = 0 or p_relee > p_apl then raise exception 'marcar no relee el lead del vehículo después de la pasada de cotizaciones (C3.iv)'; end if;
  if src ~* 'update\s+public\.vehiculos' then raise exception 'marcar escribe el vehículo: eso es del ayudante, con todo tomado'; end if;
  if ayu ~* 'for\s+(update|no\s+key\s+update|share|key\s+share)' then raise exception 'el ayudante toma candados'; end if;
  for s in select m[1] from regexp_matches(ayu, '(update\s+public\.cotizaciones[^;]*;)', 'gi') m loop
    if s ~* 'vehiculo_id' or not (s ~* 'id\s*=\s*c\.id' or s ~* '=\s*any\s*\(') then raise exception 'el ayudante escribe cotizaciones sin ir por id: %', s; end if;
  end loop;
  foreach s in array array[src, ayu] loop
    if s ~* 'public\.(leads|vehiculos)[^;]*for\s+update' then raise exception 'se toma un lead o un vehículo for update'; end if;
    if s ~* 'public\.vehiculos[^;]*for\s+(no\s+key\s+update|share)' then raise exception 'se toma el vehículo más fuerte que for key share'; end if;
  end loop;
end $$;

-- @test marcar final: el cinturón del ayudante, con el vehículo de otro lead o ya del lead (F11)
begin;
do $$
declare e jsonb := pg_temp.mc_origen(); q uuid := pg_temp.mc_persona(); l uuid; l2 uuid; v uuid; c uuid; f uuid; p uuid; antes jsonb; r jsonb;
begin
  perform set_config('request.jwt.claim.sub', q::text, true);
  l := pg_temp.mc_lead(q); l2 := pg_temp.mc_lead(q); v := pg_temp.mc_vehiculo(e);
  c := pg_temp.mc_cot(q, e, l, v); f := pg_temp.mc_cot(q, e, l, v, 'final'); p := pg_temp.mc_cot(q, e, l, v);
  update public.vehiculos set lead_id = l2 where id = v;
  antes := pg_temp.mc_foto(v, l);
  r := pg_temp.mc_aplicar(c, array[c, f, p]);
  if r ->> 'error' is distinct from '23514' or r ->> 'mensaje' is distinct from 'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.' then
    raise exception 'con el vehículo de otro lead el ayudante debía dar el 23514 de P4 a y dio %', r; end if;
  if pg_temp.mc_foto(v, l) is distinct from antes then raise exception 'con el vehículo de otro lead cambió algo: % → %', antes, pg_temp.mc_foto(v, l); end if;
  -- Ya del lead: no escribe el vehículo (ninguna fila nueva en el historial).
  update public.vehiculos set lead_id = l where id = v;
  antes := pg_temp.mc_foto(v, l);
  r := pg_temp.mc_aplicar(c, array[c, f, p]);
  if r is not null then raise exception 'con el vehículo ya del lead falló: %', r; end if;
  if (pg_temp.mc_foto(v, l) -> 'vinculos') is distinct from (antes -> 'vinculos') then raise exception 'con el vehículo ya del lead lo volvió a escribir'; end if;
end $$;
rollback;

-- @test marcar final: la final anterior baja por id; una que no estaba entre las tomadas da 23505 y queda como estaba (F12)
begin;
do $$
declare e jsonb := pg_temp.mc_origen(); q uuid := pg_temp.mc_persona(); l uuid; v uuid; c uuid; f uuid; v_tomadas uuid[]; r jsonb;
begin
  perform set_config('request.jwt.claim.sub', q::text, true);
  l := pg_temp.mc_lead(q); v := pg_temp.mc_vehiculo(e); c := pg_temp.mc_cot(q, e, l, v);
  v_tomadas := array(select x.id from public.cotizaciones x where x.vehiculo_id = v and x.eliminado_en is null order by x.id);
  -- Una final que se confirma después de la pasada (crear la permite).
  f := pg_temp.mc_cot(q, e, pg_temp.mc_lead(q), v, 'final');
  r := pg_temp.mc_aplicar(c, v_tomadas);
  if r ->> 'error' is distinct from '23505' then raise exception 'con una final que no tomó debía dar 23505 y dio %', r; end if;
  if (select clase::text from public.cotizaciones where id = f) <> 'final' or (select clase::text from public.cotizaciones where id = c) <> 'preventa' then
    raise exception 'la final que no tomó o la marcada cambiaron de clase'; end if;
end $$;
rollback;

-- @test marcar final: marcar sigue de authenticated y el ayudante es sólo de service_role, los dos definer con search_path vacío (F13)
do $$
declare r record;
begin
  for r in select f.oid, f.proname, f.prosecdef, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.proname in ('cotizacion_marcar_final', '_final_aplicar') loop
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío: % %', r.proname, r.prosecdef, r.proconfig; end if;
    if has_function_privilege('anon', r.oid, 'execute') then raise exception 'anon puede ejecutar %', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
    if has_function_privilege('authenticated', r.oid, 'execute') is distinct from (r.proname = 'cotizacion_marcar_final') then
      raise exception 'authenticated: el permiso de ejecutar % no es el esperado', r.proname; end if;
    if not has_function_privilege('service_role', r.oid, 'execute') then raise exception 'service_role no puede ejecutar %', r.proname; end if;
  end loop;
  if (select count(*) from pg_proc f join pg_namespace n on n.oid = f.pronamespace where n.nspname = 'public' and f.proname = '_final_aplicar') <> 1 then
    raise exception 'falta public._final_aplicar'; end if;
end $$;
