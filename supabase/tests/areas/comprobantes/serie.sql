-- La serie vigente de los comprobantes (paso 4.26-1): `comprobantes_serie_cambiar(serie, versión)` con `empresa.ajustes.gestionar` (P1 a), formato de P6 a, y la
-- lectura de `comprobantes_ajustes` y `comprobantes_contadores` (quien emite o quien gestiona Empresa). No depende de otro archivo
-- (`SOLO=areas/comprobantes/serie.sql`): los ayudantes son copia de `emitir.sql`.
--
-- Qué asegura:
--   S1. Sin la clave: 42501. Formato inválido: 22023 con hint serie. «pu» se guarda «PU». Versión nula: 22023; vieja: PT409.
--   S2. Una serie nueva da siguiente 1; volver a una usada sigue su numeración. La actividad.
--   S3. RLS: sin emitir ni la clave de P1 se leen 0 filas; con cualquiera de las dos, la fila.
--   S4. Las tres RPC son definer con search_path vacío, de authenticated y no de anon ni PUBLIC.

create sequence if not exists pg_temp.cpb_telefono;

create or replace function pg_temp.cpb_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'cpb-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cpb_' || substr(v_id::text, 1, 8), 'CPB ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Un origen con una fórmula publicada (visible, oculto del nivel «costos», total), un lead y dos vehículos.
create or replace function pg_temp.cpb_terreno() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; l uuid; v uuid; v2 uuid; v_def jsonb; v_creador uuid := pg_temp.cpb_persona(variadic '{}'::text[]);
begin
  insert into public.origenes (clave, nombre) values ('cpb_' || substr(gen_random_uuid()::text, 1, 8), 'CM origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'oculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'oculto'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (o, 1, 'publicada', v_def, '{}', '{}',
          '{"tc": {"ver": "todos", "editar": "todos"}, "visible": {"ver": "todos", "editar": "todos"}, "oculto": {"ver": "costos", "editar": "costos"}, "total": {"ver": "todos", "editar": null}}',
          now() - interval '10 days') returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CM lead', '7217' || lpad(nextval('pg_temp.cpb_telefono')::text, 4, '0'), v_creador, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CM vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CM vehículo 2', 'mazda') returning id into v2;
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'v2', v2);
end $f$;

-- Una cotización escrita como postgres con el snapshot del motor (visible 100, oculto 25).
create or replace function pg_temp.cpb_cot(t jsonb, p_creador uuid, p_clase text default 'final', p_vehiculo uuid default null) returns uuid language plpgsql as $f$
declare v_ent jsonb; v_res jsonb; c uuid;
begin
  v_ent := '{"inputs": {"visible": 100, "oculto": 25}, "banderas": {}, "overrides": {}, "vehiculo": {}, "tablas": {}}'::jsonb
           || jsonb_build_object('tipos_cambio', jsonb_build_object('oficial', (select valor from public.tipos_cambio where clave = 'oficial')));
  v_res := public.evaluar_formula((select definicion from public.formulas where id = (t ->> 'f')::uuid), '{}', v_ent, null);
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, clase, titulo)
  values ((t ->> 'o')::uuid, (t ->> 'l')::uuid, coalesce(p_vehiculo, (t ->> 'v')::uuid), p_creador, (t ->> 'f')::uuid, v_res -> 'valores', v_res -> 'fuentes',
          v_ent -> 'tipos_cambio', v_res -> 'totales', (v_res #>> '{totales,usd}')::numeric, p_clase::public.clase_cotizacion, 'CM cotización')
  returning id into c;
  return c;
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.cpb_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.cpb_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- La serie vigente de la prueba, como postgres (crea su contador).
create or replace function pg_temp.cpb_serie(p_serie text, p_ultimo bigint default 0) returns void language sql as $f$
  insert into public.comprobantes_contadores (serie, ultimo) values (p_serie, p_ultimo) on conflict (serie) do update set ultimo = excluded.ultimo;
  update public.comprobantes_ajustes set serie = p_serie where unica;
$f$;

create or replace function pg_temp.cpb_emitir(p_quien uuid, p_c uuid) returns jsonb language sql as $f$
  select pg_temp.cpb_corre(p_quien, format('select public.comprobante_emitir(%L, %L)', p_c, (select actualizado_en from public.cotizaciones where id = p_c)));
$f$;

create or replace function pg_temp.cpb_ultimo(p_serie text) returns bigint language sql as $f$
  select ultimo from public.comprobantes_contadores where serie = p_serie;
$f$;

create or replace function pg_temp.cpb_version() returns timestamptz language sql as $f$ select actualizado_en from public.comprobantes_ajustes $f$;

create or replace function pg_temp.cpb_cambiar(p_quien uuid, p_serie text, p_version timestamptz default null) returns jsonb language sql as $f$
  select pg_temp.cpb_corre(p_quien, format('select public.comprobantes_serie_cambiar(%L, %L)', p_serie, coalesce(p_version, pg_temp.cpb_version())));
$f$;

-- @test comprobantes: cambiar la serie pide la clave de Empresa, un formato y la versión (S1)
begin;
do $$
declare jefa uuid := pg_temp.cpb_persona('empresa.ajustes.gestionar'); emite uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir'); r jsonb; s text;
begin
  perform pg_temp.cpb_serie('CM');
  if (pg_temp.cpb_cambiar(emite, 'OTRA')) ->> 'error' is distinct from '42501' then raise exception 'quien sólo emite cambió la serie'; end if;
  foreach s in array array['', '   ', 'ABCDEFGHIJKLM', 'a b', 'ñ', 'A_B'] loop
    r := pg_temp.cpb_cambiar(jefa, s);
    perform pg_temp.cpb_da_error(format('la serie «%s»', s), r, '22023', 'La serie lleva de 1 a 12 letras, números o guiones.');
    if r ->> 'hint' is distinct from 'serie' then raise exception 'la serie inválida no lleva hint serie: %', r; end if;
  end loop;
  perform pg_temp.cpb_da_error('versión nula', pg_temp.cpb_corre(jefa, 'select public.comprobantes_serie_cambiar(''PU'', null)'), '22023',
    'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.');
  perform pg_temp.cpb_da_error('versión vieja', pg_temp.cpb_cambiar(jefa, 'PU', pg_temp.cpb_version() - interval '1 second'), 'PT409',
    'La serie cambió mientras la editabas. Recarga para ver la vigente.');
  if (select serie from public.comprobantes_ajustes) <> 'CM' then raise exception 'un rechazo cambió la serie'; end if;
  r := pg_temp.cpb_cambiar(jefa, ' pu ');
  if r ? 'error' or r ->> 'serie' <> 'PU' or (select serie from public.comprobantes_ajustes) <> 'PU' then raise exception '«pu» debía guardarse «PU»: %', r; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) is distinct from array['actualizado_en', 'serie', 'siguiente'] then raise exception 'la respuesta no es {serie, siguiente, actualizado_en}: %', r; end if;
  if (select actualizado_por from public.comprobantes_ajustes) is distinct from jefa or to_jsonb(pg_temp.cpb_version()) is distinct from r -> 'actualizado_en' then
    raise exception 'cambiar no dejó quién ni la versión nueva'; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: una serie nueva empieza en 1 y volver a una usada sigue su numeración (S2)
begin;
do $$
declare
  t jsonb := pg_temp.cpb_terreno(); jefa uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir', 'empresa.ajustes.gestionar'); r jsonb;
begin
  perform pg_temp.cpb_serie('CM', 4);
  r := pg_temp.cpb_cambiar(jefa, 'CMNUEVA');
  if r ? 'error' or (r ->> 'siguiente')::bigint <> 1 then raise exception 'una serie nueva debía empezar en 1: %', r; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'comprobante.serie_cambiada' and a.antes = '{"serie": "CM"}'::jsonb and a.despues = '{"serie": "CMNUEVA"}'::jsonb) then
    raise exception 'cambiar la serie no dejó su actividad'; end if;
  r := pg_temp.cpb_emitir(jefa, pg_temp.cpb_cot(t, jefa));
  if r ->> 'serie' <> 'CMNUEVA' or (r ->> 'numero')::bigint <> 1 then raise exception 'debía emitir CMNUEVA-1: %', r; end if;
  r := pg_temp.cpb_cambiar(jefa, 'CM');
  if (r ->> 'siguiente')::bigint <> 5 then raise exception 'volver a CM debía seguir en 5: %', r; end if;
  r := pg_temp.cpb_emitir(jefa, pg_temp.cpb_cot(t, jefa, 'final', (t ->> 'v2')::uuid));
  if r ->> 'serie' <> 'CM' or (r ->> 'numero')::bigint <> 5 then raise exception 'debía emitir CM-5: %', r; end if;
  r := pg_temp.cpb_cambiar(jefa, 'CM');
  if r ? 'error' or (select count(*) from public.actividad a where a.accion = 'comprobante.serie_cambiada') <> 2 then raise exception 'la misma serie no debía escribir: %', r; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: la serie y los contadores los lee quien emite o quien gestiona Empresa; nadie más (S3)
begin;
do $$
declare nadie uuid := pg_temp.cpb_persona('cotizaciones.ver'); emite uuid := pg_temp.cpb_persona('cotizaciones.comprobantes.emitir'); jefa uuid := pg_temp.cpb_persona('empresa.ajustes.gestionar');
        q constant text := 'select jsonb_build_object(''a'', (select count(*) from public.comprobantes_ajustes), ''c'', (select count(*) from public.comprobantes_contadores where serie = ''CM''))';
begin
  perform pg_temp.cpb_serie('CM');
  if pg_temp.cpb_corre(nadie, q) is distinct from '{"a": 0, "c": 0}'::jsonb then raise exception 'sin las claves lee la serie: %', pg_temp.cpb_corre(nadie, q); end if;
  if pg_temp.cpb_corre(emite, q) is distinct from '{"a": 1, "c": 1}'::jsonb then raise exception 'quien emite no lee la serie: %', pg_temp.cpb_corre(emite, q); end if;
  if pg_temp.cpb_corre(jefa, q) is distinct from '{"a": 1, "c": 1}'::jsonb then raise exception 'quien gestiona Empresa no lee la serie: %', pg_temp.cpb_corre(jefa, q); end if;
  if (pg_temp.cpb_corre(jefa, 'update public.comprobantes_ajustes set serie = ''A'' returning to_jsonb(serie)')) ->> 'error' is distinct from '42501' then
    raise exception 'la serie se escribe directo'; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: las tres RPC son definer con search_path vacío, de authenticated y de nadie más (S4)
do $$
declare f text; v_fn regprocedure;
begin
  foreach f in array array['public.comprobante_emitir(uuid, timestamptz)', 'public.comprobante_anular(uuid, text)', 'public.comprobantes_serie_cambiar(text, timestamptz)'] loop
    v_fn := f::regprocedure;
    if not (select prosecdef and proconfig is not distinct from array['search_path=""'] from pg_proc where oid = v_fn) then raise exception '% no es definer con search_path vacío', f; end if;
    if not has_function_privilege('authenticated', v_fn, 'execute') or has_function_privilege('anon', v_fn, 'execute')
       or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = v_fn and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception '% con privilegios de más o de menos', f; end if;
  end loop;
  if (select count(*) from pg_proc where proname in ('comprobante_emitir', 'comprobante_anular')) <> 2 then raise exception 'quedó una sobrecarga de la firma vieja'; end if;
end $$;
