-- La genérica `papelera_restaurar(lote)` sobre la papelera de cotizaciones (paso 4.24-1b): la misma firma, retorno y textos, por el ayudante de la propia;
-- todo o nada (P2 a, P5 a): con algo pendiente, PT409 con su texto y nada vuelve (antes, el 23505 o el 23514 de la tabla: 4-70). Y los privilegios y el
-- orden de los candados de las tres funciones de restaurar.
-- No depende de otro archivo (`SOLO=areas/papelera/restaurar-generica.sql`). Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   R7. La genérica: la N+1 que choca y la final sin vehículo dan PT409 con texto y no restauran nada; un lote sano vuelve con su resumen y su versión;
--       uno ya restaurado devuelve 0 sin volver a sellarlo ni registrar otra actividad.
--   R8. Privilegios: el ayudante, de nadie; las dos RPC, `security definer`, `search_path` vacío, de authenticated y no de anon ni PUBLIC.
--   R9. El orden: quién se mira antes de tomar el lote; los vehículos y los leads del lote se toman, por id, antes que cualquier cotización.

create or replace function pg_temp.rg_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rg_' || substr(v_id::text, 1, 8), 'RG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rg_jefa() returns uuid language sql as $f$
  select pg_temp.rg_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.rg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rg_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.rg_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('rg_' || substr(gen_random_uuid()::text, 1, 8), 'RG origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona (con vehículo, lead o anterior si se pasan).
create or replace function pg_temp.rg_cot(p_quien uuid, e jsonb, p_vehiculo uuid default null, p_clase text default 'preventa', p_lead uuid default null,
  p_padre uuid default null) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, lead_id, cotizacion_padre_id, clase, titulo, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_lead, p_padre, p_clase::public.clase_cotizacion, 'RG cotización',
          '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

create or replace function pg_temp.rg_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'RG vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Manda esas cotizaciones a la papelera como esa persona; devuelve {lote, actualizado_en}.
create or replace function pg_temp.rg_enviar(p_quien uuid, p_ids uuid[]) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.rg_corre(p_quien, format('select public.cotizaciones_papelera_enviar(%L::jsonb)',
    (select jsonb_agg(jsonb_build_object('id', c.id, 'actualizado_en', c.actualizado_en)) from public.cotizaciones c where c.id = any (p_ids))));
  if r ? 'error' or jsonb_array_length(r -> 'rechazados') <> 0 then raise exception 'enviar a la papelera falló: %', r; end if;
  return jsonb_build_object('lote', r -> 'lote', 'actualizado_en', r -> 'actualizado_en');
end $f$;

create or replace function pg_temp.rg_restaurar(p_quien uuid, p_lote uuid, p_version timestamptz, p_ids uuid[] default null) returns jsonb language sql as $f$
  select pg_temp.rg_corre(p_quien, format('select public.cotizaciones_papelera_restaurar(%L, %L, %L)', p_lote, p_version, p_ids));
$f$;

create or replace function pg_temp.rg_version(p_lote uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.lotes_papelera where id = p_lote;
$f$;

create or replace function pg_temp.rg_generica(p_quien uuid, p_lote uuid) returns jsonb language sql as $f$
  select pg_temp.rg_corre(p_quien, format('select to_jsonb(public.papelera_restaurar(%L))', p_lote));
$f$;

create or replace function pg_temp.rg_en_papelera(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c and c.eliminado_en is not null and c.lote_papelera_id is not null);
$f$;

-- @test papelera de cotizaciones: la genérica es todo o nada, con PT409 y su texto; un lote sano vuelve con su resumen; uno ya restaurado da 0 (R7, 4-70)
begin;
do $$
declare
  jefa uuid := pg_temp.rg_jefa(); e jsonb := pg_temp.rg_origen(); a uuid; b uuid; otra uuid; v uuid; f uuid; p uuid; s jsonb; r jsonb;
  l public.lotes_papelera; v_actividad int;
begin
  -- La N+1 que choca: PT409 y la otra del lote tampoco vuelve.
  a := pg_temp.rg_cot(jefa, e); b := pg_temp.rg_cot(jefa, e, p_padre => a); otra := pg_temp.rg_cot(jefa, e);
  s := pg_temp.rg_enviar(jefa, array[b, otra]);
  perform pg_temp.rg_cot(jefa, e, p_padre => a);
  perform pg_temp.rg_da_error('la N+1 que choca', pg_temp.rg_generica(jefa, (s ->> 'lote')::uuid), 'PT409', 'Esa cotización ya tiene otra versión nueva.');
  if not (pg_temp.rg_en_papelera(b) and pg_temp.rg_en_papelera(otra)) then raise exception 'la genérica restauró una parte'; end if;

  -- La final sin vehículo (armada a mano, como R5).
  v := pg_temp.rg_vehiculo(e); f := pg_temp.rg_cot(jefa, e, v, 'final'); p := pg_temp.rg_cot(jefa, e);
  s := pg_temp.rg_enviar(jefa, array[f, p]);
  perform set_config('session_replication_role', 'replica', true);
  update public.cotizaciones set vehiculo_id = null where id = f;
  perform set_config('session_replication_role', 'origin', true);
  perform pg_temp.rg_da_error('la final sin vehículo', pg_temp.rg_generica(jefa, (s ->> 'lote')::uuid), 'PT409', 'Su vehículo ya no existe.');
  if not (pg_temp.rg_en_papelera(f) and pg_temp.rg_en_papelera(p)) then raise exception 'la genérica restauró una parte'; end if;

  -- Un lote sano: su cantidad, su resumen, su versión y su actividad.
  a := pg_temp.rg_cot(jefa, e); b := pg_temp.rg_cot(jefa, e);
  s := pg_temp.rg_enviar(jefa, array[a, b]);
  r := pg_temp.rg_generica(jefa, (s ->> 'lote')::uuid);
  if r is distinct from '2'::jsonb then raise exception 'la genérica no devolvió 2: %', r; end if;
  select * into l from public.lotes_papelera where id = (s ->> 'lote')::uuid;
  if l.restaurado_en is null or (l.resumen ->> 'restaurados')::int is distinct from 2 or l.actualizado_en <= (s ->> 'actualizado_en')::timestamptz then
    raise exception 'el lote sano no quedó con su resumen y su versión: %', to_jsonb(l); end if;
  if not exists (select 1 from public.actividad x where x.accion = 'papelera.restaurado' and x.registro_id = l.id::text
                   and x.detalle = '{"tipo": "cotizaciones", "cantidad": 2}'::jsonb) then raise exception 'la actividad no lleva su detalle'; end if;

  -- Uno ya restaurado: 0, sin volver a sellarlo ni registrar otra actividad.
  update public.lotes_papelera set restaurado_en = '2020-01-01' where id = l.id;
  select count(*) into v_actividad from public.actividad x where x.accion = 'papelera.restaurado' and x.registro_id = l.id::text;
  r := pg_temp.rg_generica(jefa, l.id);
  if r is distinct from '0'::jsonb then raise exception 'uno ya restaurado debía dar 0: %', r; end if;
  if (select restaurado_en from public.lotes_papelera where id = l.id) is distinct from '2020-01-01'::timestamptz then raise exception 'volvió a sellar restaurado_en'; end if;
  if (select count(*) from public.actividad x where x.accion = 'papelera.restaurado' and x.registro_id = l.id::text) <> v_actividad then
    raise exception 'registró otra actividad de un lote ya restaurado'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: el ayudante de restaurar es de nadie y las dos RPC son definer de authenticated (R8)
do $$
declare f text; v_fn regprocedure;
begin
  v_fn := 'public._papelera_restaurar_cotizaciones(uuid, uuid[])'::regprocedure;
  if has_function_privilege('authenticated', v_fn, 'execute') or has_function_privilege('anon', v_fn, 'execute')
     or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
    raise exception 'el ayudante de restaurar se puede ejecutar fuera de la base'; end if;
  foreach f in array array['public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[])', 'public.papelera_restaurar(uuid)'] loop
    v_fn := f::regprocedure;
    if not (select prosecdef and proconfig is not distinct from array['search_path=""'] from pg_proc where oid = v_fn) then raise exception '% no es definer con search_path vacío', f; end if;
    if not has_function_privilege('authenticated', v_fn, 'execute') or has_function_privilege('anon', v_fn, 'execute')
       or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception '% con privilegios de más o de menos', f; end if;
  end loop;
end $$;

-- @test papelera de cotizaciones: restaurar mira quién antes de tomar el lote, y toma vehículos y leads por id antes que cualquier cotización (R9)
do $$
declare v_src text; f text; v_quien int; v_toma int; v_veh int; v_lea int;
begin
  foreach f in array array['public.cotizaciones_papelera_restaurar(uuid, timestamptz, uuid[])', 'public.papelera_restaurar(uuid)'] loop
    select prosrc into v_src from pg_proc where oid = f::regprocedure;
    v_quien := position('creado_por' in v_src); v_toma := position('for no key update' in v_src);
    if v_toma = 0 then raise exception '% no toma el lote', f; end if;
    if v_quien = 0 or v_quien > v_toma then raise exception '% toma el lote antes de mirar quién', f; end if;
  end loop;
  select prosrc into v_src from pg_proc where oid = 'public._papelera_restaurar_cotizaciones(uuid, uuid[])'::regprocedure;
  v_veh := regexp_instr(v_src, 'from public\.vehiculos [^;]*order by [^;]*for key share');
  v_lea := regexp_instr(v_src, 'from public\.leads [^;]*order by [^;]*for key share');
  v_toma := position('for no key update' in v_src);
  if v_veh = 0 or v_lea = 0 then raise exception 'el ayudante no toma vehículos y leads for key share en orden'; end if;
  if v_toma = 0 or v_veh > v_toma or v_lea > v_toma then raise exception 'el ayudante toma una cotización antes que sus vehículos o leads'; end if;
  if v_veh > v_lea then raise exception 'el ayudante toma los leads antes que los vehículos'; end if;
end $$;
