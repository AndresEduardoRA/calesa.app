-- Anular un comprobante (paso 4.26-1): `comprobante_anular(id, motivo)` pide la clave que emite (P5 a), ver la cotización y un motivo de hasta 500, y da PT409
-- si ya estaba anulado. El número no vuelve. No depende de otro archivo (`SOLO=areas/comprobantes/anular.sql`): los ayudantes son copia de `emitir.sql`.
--
-- Qué asegura:
--   A1. Sin la clave: 42501. Sin ver la cotización o inexistente: el mismo 42501. Motivo vacío o de 501: 22023 con hint motivo.
--   A2. Anula: las tres columnas, la actividad y {id, anulado_en}. Una segunda vez: PT409, sin pisar anulado_en.

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

-- @test comprobantes: anular pide la clave, ver la cotización y un motivo de hasta 500 (A1)
begin;
do $$
declare
  t jsonb := pg_temp.cpb_terreno(); duena uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir');
  sin_clave uuid := pg_temp.cpb_persona('cotizaciones.ver'); propios uuid := pg_temp.cpb_persona('cotizaciones.ver:propios', 'cotizaciones.comprobantes.emitir');
  r jsonb; v_id uuid; acceso constant text := 'No tienes acceso a este comprobante.';
begin
  perform pg_temp.cpb_serie('CM');
  r := pg_temp.cpb_emitir(duena, pg_temp.cpb_cot(t, duena));
  if r ? 'error' then raise exception 'no emitió: %', r; end if;
  v_id := (r ->> 'id')::uuid;
  if (pg_temp.cpb_corre(sin_clave, format('select public.comprobante_anular(%L, %L)', v_id, 'x'))) ->> 'error' is distinct from '42501' then raise exception 'sin la clave anuló'; end if;
  perform pg_temp.cpb_da_error('sin ver la cotización', pg_temp.cpb_corre(propios, format('select public.comprobante_anular(%L, %L)', v_id, 'x')), '42501', acceso);
  perform pg_temp.cpb_da_error('inexistente', pg_temp.cpb_corre(duena, format('select public.comprobante_anular(%L, %L)', gen_random_uuid(), 'x')), '42501', acceso);
  foreach r in array array[to_jsonb(''::text), to_jsonb('   '::text), to_jsonb(repeat('a', 501))] loop
    r := pg_temp.cpb_corre(duena, format('select public.comprobante_anular(%L, %L)', v_id, r #>> '{}'));
    perform pg_temp.cpb_da_error('motivo inválido', r, '22023', 'Anular pide un motivo de hasta 500 caracteres.');
    if r ->> 'hint' is distinct from 'motivo' then raise exception 'el motivo inválido no lleva hint motivo: %', r; end if;
  end loop;
  if (select anulado_en from public.comprobantes where comprobantes.id = v_id) is not null then raise exception 'un rechazo anuló'; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: anular escribe las tres columnas y la actividad; una segunda vez da PT409 sin pisar nada (A2)
begin;
do $$
declare t jsonb := pg_temp.cpb_terreno(); duena uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir'); r jsonb; a jsonb; v_id uuid; k public.comprobantes;
begin
  perform pg_temp.cpb_serie('CM');
  r := pg_temp.cpb_emitir(duena, pg_temp.cpb_cot(t, duena));
  v_id := (r ->> 'id')::uuid;
  a := pg_temp.cpb_corre(duena, format('select public.comprobante_anular(%L, %L)', v_id, '  Error de tipeo  '));
  if a ? 'error' then raise exception 'no anuló: %', a; end if;
  if (select array_agg(x order by x) from jsonb_object_keys(a) x) is distinct from array['anulado_en', 'id'] then raise exception 'la respuesta no es {id, anulado_en}: %', a; end if;
  select * into k from public.comprobantes where id = v_id;
  if k.anulado_por is distinct from duena or k.anulado_en is null or k.motivo_anulacion is distinct from 'Error de tipeo' or to_jsonb(k.anulado_en) is distinct from a -> 'anulado_en' then
    raise exception 'anular no escribió lo esperado: %', to_jsonb(k); end if;
  if not exists (select 1 from public.actividad x where x.accion = 'comprobante.anulado' and x.registro_id = v_id::text and x.despues = '{"serie": "CM", "numero": 1}'::jsonb) then
    raise exception 'anular no dejó su actividad'; end if;
  perform pg_temp.cpb_da_error('la segunda', pg_temp.cpb_corre(duena, format('select public.comprobante_anular(%L, %L)', v_id, 'otra vez')), 'PT409', 'Este comprobante ya estaba anulado.');
  if (select motivo_anulacion from public.comprobantes where id = v_id) is distinct from 'Error de tipeo' then raise exception 'la segunda pisó el motivo'; end if;
  if pg_temp.cpb_ultimo('CM') <> 1 then raise exception 'anular devolvió el número'; end if;
end $$;
reset role;
rollback;
