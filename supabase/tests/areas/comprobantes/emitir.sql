-- Emitir un comprobante (paso 4.26-1): `comprobante_emitir(cotización, versión)`. La serie y `datos` los pone la base; pide la clave, ver la cotización (antes y
-- con la fila tomada), una final activa y la versión que se tenía en pantalla; un vigente por cotización; sin huecos. No depende de otro archivo
-- (`SOLO=areas/comprobantes/emitir.sql`). Cada bloque abre su transacción y la revierte. Lo comparten `anular.sql` y `serie.sql` copiando estos ayudantes.
--
-- Qué asegura:
--   E1. Sin la clave, 42501. Con la clave y sin ver la cotización (propios, de otra persona), en la papelera o inexistente: el mismo 42501.
--   E2. Una preventa o una final no activa: 23514. Versión nula: 22023. Versión vieja: PT409.
--   E3. `datos` del nivel «todos» aunque emita quien ve los costos: claves exactas, sin el nodo «costos», del cliente y del vehículo sólo los ids, y lo mismo
--       que `cotizacion_leer()` le da a quien sólo tiene `cotizaciones.ver`.
--   E4. La serie la pone la base (la vigente, aunque otra tenga contador): n y n+1; la respuesta trae exactamente {id, serie, numero, emitido_en}.
--   E5. Un vigente: la segunda emisión da PT409 y el contador no se mueve (también si quien llama atrapa el error y sigue); tras anular, el siguiente número.

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

-- @test comprobantes: emitir pide la clave y ver la cotización; lo que no se ve, lo que está en la papelera y lo inexistente dan lo mismo (E1)
begin;
do $$
declare
  t jsonb := pg_temp.cpb_terreno(); duena uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir');
  sin_clave uuid := pg_temp.cpb_persona('cotizaciones.ver'); propios uuid := pg_temp.cpb_persona('cotizaciones.ver:propios', 'cotizaciones.comprobantes.emitir');
  c uuid; p uuid; acceso constant text := 'No tienes acceso a esta cotización.';
begin
  perform pg_temp.cpb_serie('CM');
  c := pg_temp.cpb_cot(t, duena);
  if (pg_temp.cpb_emitir(sin_clave, c)) ->> 'error' is distinct from '42501' then raise exception 'sin la clave emitió'; end if;
  perform pg_temp.cpb_da_error('propios, de otra persona', pg_temp.cpb_emitir(propios, c), '42501', acceso);
  perform pg_temp.cpb_da_error('inexistente', pg_temp.cpb_corre(duena, format('select public.comprobante_emitir(%L, now())', gen_random_uuid())), '42501', acceso);
  p := pg_temp.cpb_cot(t, duena, 'final', (t ->> 'v2')::uuid);
  update public.cotizaciones set eliminado_en = now() where id = p;
  perform pg_temp.cpb_da_error('en la papelera', pg_temp.cpb_emitir(duena, p), '42501', acceso);
  if pg_temp.cpb_ultimo('CM') <> 0 or exists (select 1 from public.comprobantes where cotizacion_id in (c, p)) then raise exception 'un rechazo consumió número o dejó comprobante'; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: sólo una final activa, con la versión que se tenía en pantalla (E2)
begin;
do $$
declare t jsonb := pg_temp.cpb_terreno(); duena uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir'); c uuid; p uuid; r jsonb;
begin
  perform pg_temp.cpb_serie('CM');
  p := pg_temp.cpb_cot(t, duena, 'preventa');
  perform pg_temp.cpb_da_error('una preventa', pg_temp.cpb_emitir(duena, p), '23514', 'Sólo se emite comprobante de una cotización final activa.');
  c := pg_temp.cpb_cot(t, duena, 'final', (t ->> 'v2')::uuid);
  update public.cotizaciones set estado = 'invalida' where id = c;
  perform pg_temp.cpb_da_error('una final invalidada', pg_temp.cpb_emitir(duena, c), '23514', 'Sólo se emite comprobante de una cotización final activa.');
  update public.cotizaciones set estado = 'activa' where id = c;
  perform pg_temp.cpb_da_error('versión nula', pg_temp.cpb_corre(duena, format('select public.comprobante_emitir(%L, null)', c)), '22023',
    'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.');
  r := pg_temp.cpb_corre(duena, format('select public.comprobante_emitir(%L, %L)', c, (select actualizado_en - interval '1 second' from public.cotizaciones where id = c)));
  if r ->> 'error' is distinct from 'PT409' then raise exception 'versión vieja: debía dar PT409 y dio %', r; end if;
  if pg_temp.cpb_ultimo('CM') <> 0 then raise exception 'un rechazo consumió número'; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: datos sólo con lo del nivel «todos», aunque emita quien ve los costos (E3)
begin;
do $$
declare
  t jsonb := pg_temp.cpb_terreno(); ve_costos uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.nivel.costos.ver', 'cotizaciones.comprobantes.emitir');
  solo_ve uuid := pg_temp.cpb_persona('cotizaciones.ver'); c uuid; r jsonb; d jsonb; leida jsonb; suya jsonb;
begin
  perform pg_temp.cpb_serie('CM');
  c := pg_temp.cpb_cot(t, ve_costos);
  suya := pg_temp.cpb_corre(ve_costos, format('select public.cotizacion_leer(%L)', c));
  if not (suya -> 'valores') ? 'oculto' then raise exception 'la prueba necesita que quien emite vea el nodo «costos»: %', suya; end if;
  r := pg_temp.cpb_emitir(ve_costos, c);
  if r ? 'error' then raise exception 'no emitió: %', r; end if;
  select datos into d from public.comprobantes where id = (r ->> 'id')::uuid;
  if (select array_agg(k order by k) from jsonb_object_keys(d) k) is distinct from
     array['cliente', 'cotizacion', 'empresa', 'etiquetas', 'formula_id', 'origen', 'tipos_cambio', 'totales', 'valores', 'vehiculo', 'version'] then
    raise exception 'las claves de datos no son las de C5: %', d; end if;
  if d -> 'cliente' is distinct from jsonb_build_object('lead_id', t -> 'l') then raise exception 'del cliente sólo va el id: %', d -> 'cliente'; end if;
  if d -> 'vehiculo' is distinct from jsonb_build_object('id', t -> 'v') then raise exception 'del vehículo sólo va el id: %', d -> 'vehiculo'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(d -> 'cotizacion') k) is distinct from array['clase', 'id', 'numero', 'titulo']
     or (select array_agg(k order by k) from jsonb_object_keys(d -> 'empresa') k) is distinct from array['nit', 'razon_social']
     or d -> 'origen' ->> 'id' is distinct from t ->> 'o' then
    raise exception 'la cotización, la empresa o el origen no son los de C5: %', d; end if;
  if (d -> 'valores') ? 'oculto' or (d -> 'etiquetas') ? 'oculto' or d::text like '%Oculto%' then raise exception 'datos filtró el nodo «costos»: %', d; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(d -> 'etiquetas') k) is distinct from (select array_agg(k order by k) from jsonb_object_keys(d -> 'valores') k)
     or d -> 'etiquetas' ->> 'visible' is distinct from 'Visible' then raise exception 'las etiquetas no son las de los valores: %', d; end if;
  leida := pg_temp.cpb_corre(solo_ve, format('select public.cotizacion_leer(%L)', c));
  if leida ? 'error' then raise exception 'quien sólo ve no leyó: %', leida; end if;
  if d -> 'valores' is distinct from leida -> 'valores' or d -> 'totales' is distinct from leida -> 'totales' or d -> 'tipos_cambio' is distinct from leida -> 'tipos_cambio' then
    raise exception 'datos no es lo que lee quien sólo tiene cotizaciones.ver: % contra %', d, leida; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: la serie la pone la base y los números siguen sin hueco; la respuesta trae sus cuatro claves (E4)
begin;
do $$
declare t jsonb := pg_temp.cpb_terreno(); duena uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir'); r1 jsonb; r2 jsonb;
begin
  perform pg_temp.cpb_serie('CMOTRA', 50);
  perform pg_temp.cpb_serie('CM', 7);
  r1 := pg_temp.cpb_emitir(duena, pg_temp.cpb_cot(t, duena));
  r2 := pg_temp.cpb_emitir(duena, pg_temp.cpb_cot(t, duena, 'final', (t ->> 'v2')::uuid));
  if r1 ? 'error' or r2 ? 'error' then raise exception 'no emitió: % %', r1, r2; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r1) k) is distinct from array['emitido_en', 'id', 'numero', 'serie'] then raise exception 'la respuesta no es {id, serie, numero, emitido_en}: %', r1; end if;
  if r1 ->> 'serie' <> 'CM' or r2 ->> 'serie' <> 'CM' or (r1 ->> 'numero')::bigint <> 8 or (r2 ->> 'numero')::bigint <> 9 then raise exception 'debían ser CM-8 y CM-9: % %', r1, r2; end if;
  if pg_temp.cpb_ultimo('CMOTRA') <> 50 or pg_temp.cpb_ultimo('CM') <> 9 then raise exception 'los contadores no son los esperados'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'comprobante.emitido' and a.registro_id = r1 ->> 'id' and a.despues = '{"serie": "CM", "numero": 8}'::jsonb) then
    raise exception 'emitir no dejó su actividad'; end if;
end $$;
reset role;
rollback;

-- @test comprobantes: un vigente por cotización; la segunda emisión no consume número, ni si quien llama atrapa el error; tras anular, el siguiente (E5)
begin;
do $$
declare t jsonb := pg_temp.cpb_terreno(); duena uuid := pg_temp.cpb_persona('cotizaciones.ver', 'cotizaciones.comprobantes.emitir'); c uuid; r jsonb; r2 jsonb;
begin
  perform pg_temp.cpb_serie('CM');
  c := pg_temp.cpb_cot(t, duena);
  r := pg_temp.cpb_emitir(duena, c);
  if r ? 'error' then raise exception 'no emitió: %', r; end if;
  -- cm_corre atrapa el error en su bloque y sigue: es quien llama y confirma.
  perform pg_temp.cpb_da_error('la segunda', pg_temp.cpb_emitir(duena, c), 'PT409', 'Esta cotización ya tiene el comprobante «CM-1» vigente: anúlalo para emitir otro.');
  if pg_temp.cpb_ultimo('CM') <> 1 or (select count(*) from public.comprobantes where cotizacion_id = c) <> 1 then raise exception 'la segunda consumió número o dejó comprobante'; end if;
  r2 := pg_temp.cpb_corre(duena, format('select public.comprobante_anular(%L, %L)', r ->> 'id', 'Error de tipeo'));
  if r2 ? 'error' then raise exception 'no anuló: %', r2; end if;
  r2 := pg_temp.cpb_emitir(duena, c);
  if r2 ? 'error' or (r2 ->> 'numero')::bigint <> 2 then raise exception 'tras anular debía emitir CM-2: %', r2; end if;
end $$;
reset role;
rollback;
