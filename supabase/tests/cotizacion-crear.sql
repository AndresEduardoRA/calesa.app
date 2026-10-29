-- `cotizacion_crear()` (paso 4.10, prompt 2): crear una cotización calculada en la base. Lo que no se ve no viaja (por nivel) lo prueba `cotizaciones-visibilidad.sql`
-- (el caso genérico por nivel y los errores indistinguibles); acá va el resto de la conducta: el cálculo y lo que se guarda, los permisos, el intento, el lead y el vehículo,
-- la clase, el modo de cambio, los tipos de cambio congelados, la moneda base, «cargar a mano» y lo que se rechaza.
-- Corre después de `cotizaciones-visibilidad.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.

-- Los teléfonos de los leads de la prueba salen de una secuencia: `cc_preparar()` corre dos veces en un mismo bloque (un número fijo chocaría consigo
-- mismo), y uno al azar chocaba de vez en cuando con un lead vivo que dejó otra prueba (`docs/PLAN.md`, 4-22). Nadie más usa 7212xxxx.
create temp sequence cc_telefono;
create or replace function pg_temp.cc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- La hoja abierta de esa persona (4-27): lo que `cotizacion_hoja()` le entregaría, firmado como postgres con su identidad, para ese origen, esa versión y esa hora.
create or replace function pg_temp.cc_token(p_quien uuid, p_o uuid, p_f uuid, p_cuando timestamptz) returns text language plpgsql as $f$
begin
  perform pg_temp.cc_como(p_quien);
  return public._cotizacion_abierta_firmar(p_o, p_f, p_cuando);
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla (lo hecho se deshace: va en su propia subtransacción).
-- Antes firma, para esa persona, las hojas abiertas que el SQL pide con el marcador `@@abierta|origen|fórmula|µs@@` (lo arma `cc_sql`): ya como `authenticated` la firma no se puede llamar.
create or replace function pg_temp.cc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text; v_sql text := p_sql; m text[];
begin
  perform pg_temp.cc_como(p_quien);
  loop
    m := regexp_match(v_sql, '@@abierta\|([0-9a-f-]{36})\|([0-9a-f-]{36})\|([0-9]+)@@');
    exit when m is null;
    v_sql := replace(v_sql, '@@abierta|' || m[1] || '|' || m[2] || '|' || m[3] || '@@',
                     pg_temp.cc_token(p_quien, m[1]::uuid, m[2]::uuid, 'epoch'::timestamptz + m[3]::bigint * interval '1 microsecond'));
  end loop;
  set local role authenticated;
  begin
    execute v_sql into v;
  exception when others then
    get stacked diagnostics v_d = pg_exception_detail, v_h = pg_exception_hint, v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'detail', v_d, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, origen (nulo = todos), alcance}.
create or replace function pg_temp.cc_persona(p_id uuid, p_concesiones jsonb) returns void language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cc_' || substr(p_id::text, 25, 12), 'CC ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
end $f$;

create or replace function pg_temp.cc_conc(variadic p_claves text[]) returns jsonb language sql as $f$
  select coalesce(jsonb_agg(jsonb_build_object('clave', c)), '[]'::jsonb) from unnest(p_claves) c
$f$;

-- El terreno: un origen con una fórmula publicada de cuatro nodos (dos visibles —`visible` y `total`— y uno, `oculto_costos`, del nivel «costos»), un lead que ven todas las
-- personas que tienen `leads.ver`, un vehículo y las personas:
--   a (asesora)     cotizaciones.ver y .crear, leads.ver y vehículos ver y crear
--   k (costos)      lo de a, más ver y editar el nivel «costos»
--   kv (sólo ver)   lo de a, más ver el nivel «costos» (no lo edita)
--   ke (sólo edita) lo de a, más editar el nivel «costos» (no lo ve)
--   sl (sin lead)   cotizaciones.ver y .crear, sin leads.ver
--   sv (sin veh.)   cotizaciones.ver y .crear y leads.ver, sin vehículos.ver
--   sc (sin crear)  cotizaciones.ver y leads.ver
--   fg (final)      lo de a, más cotizaciones.final.gestionar
create or replace function pg_temp.cc_preparar() returns jsonb language plpgsql as $f$
declare
  o uuid; f uuid; l uuid; v uuid; v_def jsonb; v_vis jsonb;
  a uuid := gen_random_uuid(); k uuid := gen_random_uuid(); kv uuid := gen_random_uuid(); ke uuid := gen_random_uuid(); sl uuid := gen_random_uuid();
  sv uuid := gen_random_uuid(); sc uuid := gen_random_uuid(); fg uuid := gen_random_uuid();
  v_base constant text[] := array['cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver', 'vehiculos.crear'];
begin
  insert into public.origenes (clave, nombre) values ('cc_' || substr(gen_random_uuid()::text, 1, 8), 'CC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'oculto_costos', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible', 'oculto_costos'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
    'buckets', jsonb_build_object('origen', 'tc'));
  v_vis := jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                              'oculto_costos', jsonb_build_object('ver', 'costos', 'editar', 'costos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', v_def, '{}', '{}', v_vis) returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CC lead', '7212' || lpad(nextval('pg_temp.cc_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CC vehículo', 'toyota') returning id into v;
  perform pg_temp.cc_persona(a, pg_temp.cc_conc(variadic v_base));
  perform pg_temp.cc_persona(k, pg_temp.cc_conc(variadic v_base || array['cotizaciones.nivel.costos.ver', 'cotizaciones.nivel.costos.editar']));
  perform pg_temp.cc_persona(kv, pg_temp.cc_conc(variadic v_base || array['cotizaciones.nivel.costos.ver']));
  perform pg_temp.cc_persona(ke, pg_temp.cc_conc(variadic v_base || array['cotizaciones.nivel.costos.editar']));
  perform pg_temp.cc_persona(sl, pg_temp.cc_conc('cotizaciones.ver', 'cotizaciones.crear', 'vehiculos.ver'));
  perform pg_temp.cc_persona(sv, pg_temp.cc_conc('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver'));
  perform pg_temp.cc_persona(sc, pg_temp.cc_conc('cotizaciones.ver', 'leads.ver', 'vehiculos.ver'));
  perform pg_temp.cc_persona(fg, pg_temp.cc_conc(variadic v_base || array['cotizaciones.final.gestionar']));
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'a', a, 'k', k, 'kv', kv, 'ke', ke, 'sl', sl, 'sv', sv, 'sc', sc, 'fg', fg);
end $f$;

-- Una llamada a cotizacion_crear con esos argumentos (el id del intento, el modo y «Ver total Bs» —`p_ver`, en texto para poder mandar nulo—, opcionales). La hoja abierta va como marcador y `cc_corre` la firma para quien llama: por omisión «se abrió»
-- ahora sobre la versión publicada del origen (D2): ni la fórmula ni los tipos de cambio cambiaron desde entonces. `p_raw` pone en su lugar un texto cualquiera (una firma rota, basura).
create or replace function pg_temp.cc_sql(p_id uuid, p_o uuid, p_l uuid, p_entradas text, p_v uuid default null, p_nuevo text default null, p_modo text default null, p_clase text default 'preventa',
                                         p_abierta uuid default null, p_abierta_en timestamptz default null, p_con_la_abierta boolean default false, p_raw text default 'marcador',
                                         p_ver text default 'false')
returns text language sql as $f$
  select format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L, %L::jsonb, %L, %L::public.clase_cotizacion, %L, %L::boolean)', p_id, p_o, p_l, p_entradas,
                case when p_raw = 'marcador' then '@@abierta|' || p_o || '|' || coalesce(p_abierta, (select f.id from public.formulas f where f.origen_id = p_o and f.estado = 'publicada')) || '|'
                                                  || round(extract(epoch from coalesce(p_abierta_en, now())) * 1000000)::bigint || '@@' else p_raw end,
                p_v, p_nuevo, p_modo, p_clase, p_con_la_abierta, p_ver)
$f$;

-- @test cotizacion_crear: calcula en la base, guarda el snapshot entero (los nodos que no se ven, con su valor de la fórmula) y devuelve sólo lo que se ve
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; c public.cotizaciones;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; id1 uuid := gen_random_uuid(); id2 uuid := gen_random_uuid();
begin
  -- Quien no ve el nivel: tipea lo suyo; lo guardado trae el nodo del nivel en su valor por defecto (0, sin tipear) y lo que recibe no lo trae.
  r := pg_temp.cc_corre((t ->> 'a')::uuid, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 100}}', v));
  if r ? 'error' then raise exception 'crear falló: %', r; end if;
  if (r -> 'cotizacion' ->> 'id')::uuid <> id1 or r ->> 'repetido' <> 'false' then raise exception 'la respuesta no dice la cotización del intento: %', r; end if;
  if (r -> 'valores') ? 'oculto_costos' or r::text like '%oculto_costos%' then raise exception 'lo que recibe quien no ve el nivel trae el nodo: %', r; end if;
  if (r -> 'valores' ->> 'visible')::numeric is distinct from 100 or (r -> 'valores' ->> 'total')::numeric is distinct from 100 then raise exception 'los valores visibles no son los calculados: %', r -> 'valores'; end if;
  select * into c from public.cotizaciones where id = id1;
  if c.creado_por is distinct from (t ->> 'a')::uuid or c.origen_id is distinct from o or c.lead_id is distinct from l or c.vehiculo_id is distinct from v or c.clase is distinct from 'preventa' or c.estado is distinct from 'activa' or c.formula_id is distinct from (t ->> 'f')::uuid then
    raise exception 'la fila no es la esperada: %', to_jsonb(c);
  end if;
  if c.total_base <> 100 or (c.totales ->> 'usd')::numeric is distinct from 100 then raise exception 'total_base debía ser el total en USD (100) y es % (totales %)', c.total_base, c.totales; end if;
  if (c.valores -> 'oculto_costos') is distinct from '0'::jsonb or (c.valores ->> 'visible')::numeric is distinct from 100 or not (c.valores ? 'tc') or not (c.valores ? 'total') then
    raise exception 'valores no es el snapshot entero (el nodo oculto con su valor por defecto): %', c.valores;
  end if;
  if not (c.fuentes ? 'oculto_costos') or c.fuentes ->> 'visible' <> 'input' then raise exception 'fuentes no es el snapshot entero: %', c.fuentes; end if;
  if not (c.tipos_cambio ? 'oficial') or (c.tipos_cambio ->> 'oficial')::numeric <= 0 then raise exception 'tipos_cambio no congela la tarifa que usó: %', c.tipos_cambio; end if;
  if c.modo_tc is not null then raise exception 'sin modo, modo_tc debía quedar nulo'; end if;
  if (select count(*) from public.actividad where tabla = 'cotizaciones' and registro_id = id1::text and accion = 'cotizaciones.insert') <> 1 then raise exception 'el alta no quedó en actividad'; end if;
  -- Un total que no cabe en total_base (numeric(18,2)) se rechaza con su motivo, no con el desborde de la columna.
  r := pg_temp.cc_corre((t ->> 'a')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"inputs": {"visible": 10000000000000000}}', v));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'fuera_de_rango' or r ->> 'hint' is distinct from 'total' then raise exception 'un total que no cabe debía dar fuera_de_rango: %', r; end if;

  -- Quien ve y edita el nivel tipea también el nodo del nivel: lo recibe, y queda guardado.
  r := pg_temp.cc_corre((t ->> 'k')::uuid, pg_temp.cc_sql(id2, o, l, '{"inputs": {"visible": 100, "oculto_costos": 25}}', v));
  if r ? 'error' then raise exception 'crear con el nivel falló: %', r; end if;
  if (r -> 'valores' ->> 'oculto_costos')::numeric is distinct from 25 or (r -> 'valores' ->> 'total')::numeric is distinct from 125 then raise exception 'quien tiene el nivel no recibe su nodo: %', r -> 'valores'; end if;
  select * into c from public.cotizaciones where id = id2;
  if (c.valores ->> 'oculto_costos')::numeric is distinct from 25 or c.total_base <> 125 then raise exception 'lo guardado no es lo tipeado: % %', c.valores, c.total_base; end if;
end $$;
rollback;

-- @test cotizacion_crear: permisos (cotizaciones.crear en el origen, antes de mirar nada) y cuenta bloqueada
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; o2 uuid; v_ajeno uuid := gen_random_uuid();
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid;
begin
  -- Sin cotizaciones.crear: 42501, sea cual sea el resto (un lead y un vehículo inexistentes no cambian el error).
  r := pg_temp.cc_corre((t ->> 'sc')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v));
  if r ->> 'error' is distinct from '42501' or coalesce(r ->> 'mensaje', '') not like '%cotizaciones.crear%' then raise exception 'sin el permiso debía dar 42501: %', r; end if;
  if pg_temp.cc_corre((t ->> 'sc')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, gen_random_uuid(), '{}', gen_random_uuid())) is distinct from r then
    raise exception 'sin el permiso, un lead y un vehículo inexistentes cambian el error';
  end if;
  -- El permiso es del origen de la cotización: con él sólo en otro origen, no vale en éste.
  insert into public.origenes (clave, nombre) values ('cc_otro_' || substr(gen_random_uuid()::text, 1, 6), 'CC otro') returning id into o2;
  perform pg_temp.cc_persona(v_ajeno, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.crear', 'origen', o2), jsonb_build_object('clave', 'cotizaciones.ver'),
                             jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'vehiculos.ver')));
  r := pg_temp.cc_corre(v_ajeno, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v));
  if r ->> 'error' is distinct from '42501' or coalesce(r ->> 'mensaje', '') not like '%cotizaciones.crear%' then raise exception 'con cotizaciones.crear sólo en otro origen debía dar 42501: %', r; end if;
  if pg_temp.cc_corre(v_ajeno, pg_temp.cc_sql(gen_random_uuid(), o, gen_random_uuid(), '{}', gen_random_uuid())) is distinct from r then
    raise exception 'con el permiso sólo en otro origen, un lead y un vehículo inexistentes cambian el error (el permiso se pide antes de mirar nada)';
  end if;
  -- Una cuenta bloqueada no cotiza.
  update public.perfiles set bloqueado = true where id = (t ->> 'a')::uuid;
  r := pg_temp.cc_corre((t ->> 'a')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v));
  if r ->> 'error' is distinct from '42501' or coalesce(r ->> 'mensaje', '') not like '%bloqueada%' then raise exception 'una cuenta bloqueada debía dar 42501 con su motivo: %', r; end if;
  -- Faltan el id o el origen.
  r := pg_temp.cc_corre((t ->> 'k')::uuid, 'select public.cotizacion_crear(null, null, null, ''{}''::jsonb, null, null)');
  if r ->> 'error' is distinct from '22023' then raise exception 'sin id ni origen debía dar 22023: %', r; end if;
  if (select count(*) from public.cotizaciones where origen_id = o) <> 0 then raise exception 'un rechazo dejó una cotización'; end if;
end $$;
rollback;

-- @test cotizacion_crear: el intento. Repetirlo devuelve la misma cotización y no crea otra (aunque el lead cambie de manos); un id ajeno, de la papelera o de otro origen no se puede usar
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); t2 jsonb := pg_temp.cc_preparar(); r jsonb; r2 jsonb; r_leer jsonb; id1 uuid := gen_random_uuid();
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; a uuid := (t ->> 'a')::uuid; k uuid := (t ->> 'k')::uuid;
begin
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 7}}', v));
  if r ? 'error' or r ->> 'repetido' <> 'false' then raise exception 'la primera llamada falló: %', r; end if;
  r2 := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 7}}', v));
  if r2 ? 'error' or r2 ->> 'repetido' <> 'true' or r2 -> 'cotizacion' ->> 'id' <> r -> 'cotizacion' ->> 'id' or r2 -> 'valores' is distinct from r -> 'valores' then
    raise exception 'repetir el intento no devolvió lo mismo: % contra %', r2, r;
  end if;
  if (select count(*) from public.cotizaciones where id = id1) <> 1 or (select count(*) from public.cotizaciones where origen_id = o) <> 1 then raise exception 'repetir creó otra cotización'; end if;
  -- Aunque el lead ya no se vea (a la papelera), el intento repetido sigue devolviendo la suya.
  update public.leads set eliminado_en = now() where id = l;
  r2 := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 7}}', v));
  if r2 ? 'error' or r2 ->> 'repetido' <> 'true' then raise exception 'con el lead en la papelera el intento repetido debía devolver la suya: %', r2; end if;
  update public.leads set eliminado_en = null where id = l;

  -- El id de otra persona: no se puede usar, y el error es el de una cotización que no existe (el de `cotizacion_leer` con un id que no existe).
  r := pg_temp.cc_corre(k, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 7}}', v));
  r_leer := pg_temp.cc_corre(k, format('select public.cotizacion_leer(%L)', gen_random_uuid()));
  if r ->> 'error' is distinct from '42501' or r is distinct from r_leer then raise exception 'un id ajeno no da el error de una que no existe: % contra %', r, r_leer; end if;
  -- El id propio de otro origen o en la papelera tampoco se reutiliza (y no se devuelve): con todo lo demás en orden, choca con la clave y da el error de una que no existe.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, (t2 ->> 'o')::uuid, (t2 ->> 'l')::uuid, '{"inputs": {"visible": 7}}', (t2 ->> 'v')::uuid));
  if r ->> 'error' is distinct from '42501' then raise exception 'el id propio de otro origen no se rechazó: %', r; end if;
  update public.cotizaciones set eliminado_en = now() where id = id1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 7}}', v));
  if r ->> 'error' is distinct from '42501' then raise exception 'el id de una cotización en la papelera se reutilizó o dio otro error: %', r; end if;
  if (select count(*) from public.cotizaciones where id = id1) <> 1 then raise exception 'el intento rechazado tocó la fila'; end if;
end $$;
rollback;

-- @test cotizacion_crear: el lead es obligatorio y tiene que verse; un lead inexistente, de la papelera o de quien no puede verlo dan el mismo error
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; r_in jsonb; r_pap jsonb; r_sl jsonb; l2 uuid;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; a uuid := (t ->> 'a')::uuid;
begin
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, null, '{}', v));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'lead' then raise exception 'sin lead debía dar 22023 con la pista lead: %', r; end if;
  r_in := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, gen_random_uuid(), '{}', v));
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos, eliminado_en)
  values ('CC lead borrado', '7212' || lpad(nextval('pg_temp.cc_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}', now()) returning id into l2;
  r_pap := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l2, '{}', v));
  r_sl := pg_temp.cc_corre((t ->> 'sl')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v));
  if r_in ->> 'error' is distinct from '42501' or r_in ->> 'mensaje' is distinct from 'No encontramos este lead o no tienes acceso.' then raise exception 'un lead inexistente no da el error esperado: %', r_in; end if;
  if r_pap is distinct from r_in or r_sl is distinct from r_in then raise exception 'el lead de la papelera o el de quien no lo ve se distinguen de uno inexistente: % / % / %', r_in, r_pap, r_sl; end if;
  if (select count(*) from public.cotizaciones where origen_id = o) <> 0 then raise exception 'un rechazo dejó una cotización'; end if;
end $$;
rollback;

-- @test cotizacion_crear: el vehículo es obligatorio según el ajuste de la empresa (y siempre en una final); uno que no existe, de la papelera o que no se ve dan el mismo error
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; r_in jsonb; r_pap jsonb; r_sv jsonb; r_ev jsonb; v2 uuid; c public.cotizaciones;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; a uuid := (t ->> 'a')::uuid; fg uuid := (t ->> 'fg')::uuid;
begin
  if (select vehiculo_obligatorio_al_cotizar from public.ajustes_empresa where id = 1) is not true then raise exception 'el ajuste debía nacer en sí'; end if;
  -- Con «sí» (de fábrica): sin vehículo, 22023.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', null));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'sin vehículo y con el ajuste en sí debía dar 22023: %', r; end if;
  -- Los dos a la vez, no.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v, jsonb_build_object('id', gen_random_uuid(), 'datos', jsonb_build_object('titulo', 'x'))::text));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'un vehículo y otro a mano a la vez debía dar 22023: %', r; end if;
  -- Con «no»: una preventa se guarda sin vehículo; una final sigue exigiéndolo.
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', null));
  if r ? 'error' then raise exception 'con el ajuste en no, una preventa sin vehículo debía guardarse: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.vehiculo_id is not null then raise exception 'la cotización sin vehículo trae uno'; end if;
  r := pg_temp.cc_corre(fg, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', null, null, null, 'final'));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'una final sin vehículo debía dar 22023 aun con el ajuste en no: %', r; end if;
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = true where id = 1;

  -- Un vehículo que no existe, uno en la papelera y uno que quien llama no ve: el mismo error (el de `cotizacion_evaluar` con un vehículo que no existe).
  r_in := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', gen_random_uuid()));
  insert into public.vehiculos (origen_id, titulo, marca, eliminado_en) values (o, 'CC vehículo borrado', 'toyota', now()) returning id into v2;
  r_pap := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v2));
  r_sv := pg_temp.cc_corre((t ->> 'sv')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v));
  r_ev := pg_temp.cc_corre(a, format('select public.cotizacion_evaluar(''{}''::jsonb, null, %L, %L)', o, gen_random_uuid()));
  if r_in ->> 'error' is distinct from '42501' or r_in ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'un vehículo inexistente no da el error esperado: %', r_in; end if;
  if r_pap is distinct from r_in or r_sv is distinct from r_in or r_ev is distinct from r_in then
    raise exception 'el vehículo de la papelera, el que no se ve o el de cotizacion_evaluar se distinguen de uno inexistente: % / % / % / %', r_in, r_pap, r_sv, r_ev;
  end if;
  if (select count(*) from public.cotizaciones where origen_id = o) <> 1 then raise exception 'los rechazos dejaron cotizaciones (sólo la preventa sin vehículo)'; end if;
end $$;
rollback;

-- @test cotizacion_crear: una final pide cotizaciones.final.gestionar y su vehículo; una por vehículo (el índice, con su error); una preventa a la vez no estorba
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; c public.cotizaciones;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; a uuid := (t ->> 'a')::uuid; fg uuid := (t ->> 'fg')::uuid;
begin
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v, null, null, 'final'));
  if r ->> 'error' is distinct from '42501' or coalesce(r ->> 'mensaje', '') not like '%cotizaciones.final.gestionar%' then raise exception 'una final sin el permiso debía dar 42501: %', r; end if;
  r := pg_temp.cc_corre(fg, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v, null, null, 'final'));
  if r ? 'error' then raise exception 'una final con el permiso debía crearse: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.clase is distinct from 'final' or c.vehiculo_id is distinct from v then raise exception 'la final no quedó como final de ese vehículo: %', to_jsonb(c); end if;
  -- Otra final activa para el mismo vehículo: el error del índice, claro y con la pista.
  r := pg_temp.cc_corre(fg, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v, null, null, 'final'));
  if r ->> 'error' is distinct from '23505' or r ->> 'mensaje' is distinct from 'Este vehículo ya tiene una cotización final activa.' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'la segunda final no dio el error claro: %', r; end if;
  if (select count(*) from public.cotizaciones where vehiculo_id = v and clase = 'final') <> 1 then raise exception 'quedaron dos finales'; end if;
  -- Una preventa del mismo vehículo sí se puede.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', v));
  if r ? 'error' then raise exception 'una preventa del mismo vehículo debía crearse: %', r; end if;
end $$;
rollback;

-- @test cotizacion_crear: el modo de cambio (la clave de uno de la hoja), los tipos de cambio congelados, el total en la moneda base y lo que el motor deja sin valor (fórmula sembrada de subasta_usa)
begin;
do $$
declare
  r jsonb; c public.cotizaciones; v uuid; l uuid; a uuid := gen_random_uuid(); o uuid := (select id from public.origenes where clave = 'subasta_usa'); v_unif numeric; v_ofic numeric; v_bs numeric;
  v_entradas constant text := '{"overrides": {"transporte_bolivia": 0, "nacionalizacion": 1201}}';
begin
  perform pg_temp.cc_persona(a, pg_temp.cc_conc('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'));
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CC lead modo', '7212' || lpad(nextval('pg_temp.cc_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, anio, atributos) values (o, 'CC subasta', 2025, '{"tipo_vehiculo": "autos"}') returning id into v;
  -- El unificado se separa del paralelo (en la semilla valen lo mismo y un modo ignorado daría igual): así el total dice qué modo se usó.
  update public.tipos_cambio set valor = valor * 1.5 where clave = 'unificado';
  select valor into v_unif from public.tipos_cambio where clave = 'unificado';
  select valor into v_ofic from public.tipos_cambio where clave = 'oficial';
  -- La cuenta de la captura 02 con las tarifas de hoy (el humo ya cambió el oficial): 1.200 al unificado y 1.201 de la póliza al oficial, y el total en dólares es eso ÷ el unificado.
  v_bs := round(1200 * v_unif + 1201 * v_ofic, 2);

  -- Modo Unificado: el modo queda guardado y la tarifa, congelada.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, v_entradas, v, null, 'unificado'));
  if r ? 'error' then raise exception 'crear en modo unificado falló: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.modo_tc is distinct from 'unificado' or c.total_base <> round((c.totales ->> 'usd')::numeric, 2) or abs(c.total_base - round(v_bs / v_unif, 2)) > 0.01 then raise exception 'el modo o el total no son los de la captura 02 con las tarifas de hoy (Bs %): % % %', v_bs, c.modo_tc, c.total_base, c.totales; end if;
  if (c.tipos_cambio ->> 'unificado')::numeric is distinct from v_unif then raise exception 'tipos_cambio no congeló el unificado: %', c.tipos_cambio; end if;
  -- La empresa cambia la tarifa: la cotización ya guardada no se mueve.
  update public.tipos_cambio set valor = valor * 2 where clave = 'unificado';
  if (select (tipos_cambio ->> 'unificado')::numeric from public.cotizaciones where id = c.id) <> v_unif or (select total_base from public.cotizaciones where id = c.id) <> c.total_base then
    raise exception 'cambiar la tarifa de la empresa movió una cotización guardada';
  end if;
  update public.tipos_cambio set valor = v_unif where clave = 'unificado';
  -- Paralelo, el otro modo de la hoja; sin modo, los de la fórmula; y uno que la hoja no ofrece, rechazado.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, v_entradas, v, null, 'paralelo'));
  if r ? 'error' or (select modo_tc from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid) <> 'paralelo' then raise exception 'el modo paralelo no se guardó: %', r; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, v_entradas, v, null, null));
  if r ? 'error' or (select modo_tc from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid) is not null then raise exception 'sin modo, modo_tc debía quedar nulo: %', r; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, v_entradas, v, null, 'inventado'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'modo_invalido' or r ->> 'hint' is distinct from 'modo_tc' then raise exception 'un modo que la hoja no ofrece debía dar modo_invalido: %', r; end if;

  -- La moneda base de la empresa decide qué total se guarda: USD, el de dólares; BOB, el de bolivianos; otra, nada.
  update public.ajustes_empresa set moneda_base = 'BOB' where id = 1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, v_entradas, v, null, 'unificado'));
  if r ? 'error' then raise exception 'crear en BOB falló: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.total_base <> round((c.totales ->> 'bs')::numeric, 2) or abs(c.total_base - v_bs) > 0.01 then raise exception 'con la moneda base en BOB total_base debía ser el total en Bs (%): % %', v_bs, c.total_base, c.totales; end if;
  update public.ajustes_empresa set moneda_base = 'EUR' where id = 1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, v_entradas, v, null, 'unificado'));
  if r ->> 'error' is distinct from '22023' or coalesce(r ->> 'mensaje', '') not like '%EUR%' then raise exception 'con otra moneda base debía rechazar: %', r; end if;
  update public.ajustes_empresa set moneda_base = 'USD' where id = 1;

  -- Sin el transporte (el vehículo no trae un tipo que case) el total queda sin valor: se rechaza, sin nombrar nada oculto.
  update public.vehiculos set atributos = '{"tipo_vehiculo": "AUTOMOBILE"}' where id = v;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"overrides": {"nacionalizacion": 1201}}', v, null, 'unificado'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'total_sin_valor' or r ->> 'hint' is distinct from 'total' then raise exception 'sin el transporte debía dar total_sin_valor: %', r; end if;
end $$;
rollback;

-- @test cotizacion_crear: lo que el motor descarta de un nodo visible se rechaza (lo guardado es lo mandado) y un override de un nodo inexistente da nodo_inexistente (fórmula sembrada de subasta_usa)
begin;
do $$
declare
  r jsonb; v uuid; l uuid; a uuid := gen_random_uuid(); o uuid := (select id from public.origenes where clave = 'subasta_usa');
begin
  perform pg_temp.cc_persona(a, pg_temp.cc_conc('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver'));
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CC lead desc', '7212' || lpad(nextval('pg_temp.cc_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, anio, atributos) values (o, 'CC subasta', 2025, '{"tipo_vehiculo": "autos"}') returning id into v;
  -- «remate» es un input sin sugerido: no se sobrescribe, se tipea en `inputs`.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"inputs": {"remate": 1000}, "overrides": {"remate": 5, "nacionalizacion": 1201}}', v));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'no_sobrescribible' or r ->> 'hint' is distinct from 'remate' then raise exception 'un override de un input debía dar no_sobrescribible: %', r; end if;
  -- Un nodo que la fórmula no tiene.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"overrides": {"zz_no_existe": 5, "nacionalizacion": 1201}}', v));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'nodo_inexistente' or r ->> 'hint' is distinct from 'zz_no_existe' then raise exception 'un override de un nodo inexistente debía dar nodo_inexistente: %', r; end if;
  -- Lo de la hoja que sí se puede: el input y los dos overrides.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"inputs": {"remate": 1000}, "overrides": {"transporte_bolivia": 3000, "nacionalizacion": 1201}}', v));
  if r ? 'error' or (r -> 'valores' ->> 'remate')::numeric is distinct from 1000 or r -> 'fuentes' ->> 'transporte_bolivia' <> 'override' then raise exception 'lo permitido no se guardó como se mandó: %', r; end if;
end $$;
rollback;

-- @test cotizacion_crear: «cargar a mano» crea el vehículo en la misma transacción; sin vehiculos.crear o sin poder verlo, no deja nada; un origen sin fórmula publicada no cotiza
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; r2 jsonb; vn uuid := gen_random_uuid(); vn2 uuid := gen_random_uuid(); o2 uuid; c public.cotizaciones;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; a uuid := (t ->> 'a')::uuid; sv uuid := (t ->> 'sv')::uuid; id1 uuid := gen_random_uuid();
  v_nuevo text;
begin
  v_nuevo := jsonb_build_object('id', vn, 'datos', jsonb_build_object('titulo', 'CC a mano'))::text;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 3}}', null, v_nuevo));
  if r ? 'error' then raise exception 'cargar a mano falló: %', r; end if;
  select * into c from public.cotizaciones where id = id1;
  if c.vehiculo_id is distinct from vn or not exists (select 1 from public.vehiculos where id = vn and titulo = 'CC a mano' and origen_id = o and creado_por = a) then
    raise exception 'el vehículo a mano no se creó o no es el de la cotización: %', to_jsonb(c);
  end if;
  -- Repetir el intento no crea otro vehículo ni otra cotización.
  r2 := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, '{"inputs": {"visible": 3}}', null, v_nuevo));
  if r2 ? 'error' or r2 ->> 'repetido' <> 'true' or (select count(*) from public.vehiculos where titulo = 'CC a mano') <> 1 then raise exception 'repetir el intento a mano creó otro: %', r2; end if;
  -- Sin vehiculos.crear: 42501 y ni vehículo ni cotización.
  r := pg_temp.cc_corre((t ->> 'sc')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', null, jsonb_build_object('id', vn2, 'datos', jsonb_build_object('titulo', 'CC sin permiso'))::text));
  if r ->> 'error' is distinct from '42501' then raise exception 'sin cotizaciones.crear ni vehiculos.crear debía dar 42501: %', r; end if;
  -- Con vehiculos.crear y sin vehiculos.ver: lo crea y no lo ve, así que no cotiza y se deshace todo.
  insert into public.roles_permisos (rol_id, permiso_clave, alcance) select ur.rol_id, 'vehiculos.crear', 'todos' from public.usuarios_roles ur where ur.usuario_id = sv;
  r := pg_temp.cc_corre(sv, pg_temp.cc_sql(gen_random_uuid(), o, l, '{}', null, jsonb_build_object('id', vn2, 'datos', jsonb_build_object('titulo', 'CC sin ver'))::text));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'crear sin poder verlo debía dar el error de un vehículo que no se ve: %', r; end if;
  if exists (select 1 from public.vehiculos where id = vn2 or titulo in ('CC sin permiso', 'CC sin ver')) then raise exception 'un rechazo dejó un vehículo a mano'; end if;
  -- Un origen sin fórmula publicada.
  insert into public.origenes (clave, nombre) values ('cc_sinf_' || substr(gen_random_uuid()::text, 1, 6), 'CC sin fórmula') returning id into o2;
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o2, l, '{}', null, p_abierta => gen_random_uuid()));  -- (una hoja no se abre sin fórmula: el id es uno cualquiera)
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'origen_sin_formula' then raise exception 'un origen sin fórmula debía dar origen_sin_formula: %', r; end if;
end $$;
rollback;

-- Publica una v2 del origen: la v1 pasa a archivada y la v2 queda publicada (con la hora de publicación que se diga). Devuelve el id de la v2.
create or replace function pg_temp.cc_publicar_v2(p_o uuid, p_f1 uuid, p_cuando timestamptz) returns uuid language plpgsql as $f$
declare f2 uuid;
begin
  update public.formulas set estado = 'archivada', publicado_en = p_cuando - interval '10 days' where id = p_f1;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select origen_id, 2, 'publicada', definicion, params, diseno, visibilidad, p_cuando from public.formulas where id = p_f1 returning id into f2;
  return f2;
end $f$;

-- @test cotizacion_crear: D2 «desactualizada» por la versión de la hoja: se avisa sin guardar, «Guardar con la N» nace de la que se abrió, y tiene sus límites
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; c public.cotizaciones; f2 uuid; o2 uuid; f_otra uuid; f_borrador uuid;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; f1 uuid := (t ->> 'f')::uuid; a uuid := (t ->> 'a')::uuid;
  e constant text := '{"inputs": {"visible": 100}}';
begin
  -- Sin cambios entre la apertura y el guardado, se guarda (la publicada es la que se abrió).
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v));
  if r ? 'error' then raise exception 'sin cambios debía guardar: %', r; end if;
  -- Nula: la hoja que se abrió es obligatoria.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_raw => null));
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'abierta' or coalesce(r ->> 'detail', '') <> '' then raise exception 'sin la hoja abierta debía dar 22023 abierta: %', r; end if;

  -- Se publica la v2 mientras la hoja estaba abierta sobre la v1: aviso, y no se guarda.
  f2 := pg_temp.cc_publicar_v2(o, f1, now());
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' or r ->> 'hint' is distinct from 'formula' or r ->> 'mensaje' not like '%versión 2%' then
    raise exception 'la hoja de la v1 con la v2 publicada debía dar PT409 desactualizada (formula): %', r;
  end if;
  if (select count(*) from public.cotizaciones where origen_id = o and creado_por = a) <> 1 then raise exception 'el aviso dejó una cotización'; end if;
  -- Una hoja abierta sobre la v2 guarda (usar la N+1 es llamar con lo nuevo).
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f2));
  if r ? 'error' or (select formula_id from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid) is distinct from f2 then raise exception 'usar la N+1 debía guardar con la v2: %', r; end if;
  -- «Guardar con la N»: nace de la v1 (archivada), con su fórmula.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1, p_con_la_abierta => true));
  if r ? 'error' then raise exception 'guardar con la N debía guardar: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.formula_id is distinct from f1 or c.total_base <> 100 then raise exception 'guardar con la N no nació de la v1: % %', c.formula_id, c.total_base; end if;
  -- Con la abierta y sin cambios (la publicada es la abierta), nada especial.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f2, p_con_la_abierta => true));
  if r ? 'error' then raise exception 'con la abierta igual a la publicada debía guardar: %', r; end if;

  -- Los límites de «Guardar con la N»: hoja abierta hace más de un día, versión reemplazada hace más de un día o sin fecha, de otro origen, un borrador.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1, p_abierta_en => now() - interval '25 hours', p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'una hoja de hace más de un día debía dar abierta_vencida: %', r; end if;
  update public.formulas set publicado_en = now() - interval '25 hours' where id = f2;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1, p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'una versión reemplazada hace más de un día debía dar abierta_vencida: %', r; end if;
  update public.formulas set publicado_en = null where id = f2;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1, p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'una versión que no dice cuándo se reemplazó debía dar abierta_vencida: %', r; end if;
  update public.formulas set publicado_en = now() where id = f2;
  insert into public.origenes (clave, nombre) values ('cc_d2_' || substr(gen_random_uuid()::text, 1, 6), 'CC otro D2') returning id into o2;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  select o2, 1, 'archivada', definicion, params, diseno, visibilidad, now() from public.formulas where id = f1 returning id into f_otra;
  insert into public.formulas (origen_id, estado, definicion, params, diseno, visibilidad) select o, 'borrador', definicion, params, diseno, visibilidad from public.formulas where id = f1 returning id into f_borrador;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f_otra, p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_no_disponible' then raise exception 'una versión de otro origen debía dar abierta_no_disponible: %', r; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f_borrador, p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_no_disponible' then raise exception 'un borrador debía dar abierta_no_disponible: %', r; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f_borrador));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' then raise exception 'un id que no es la publicada, sin la abierta, debía dar desactualizada: %', r; end if;
  -- El trigger deja nacer de una versión archivada del origen, pero no de un borrador.
  begin
    insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base) values (o, a, f_borrador, '{}', '{}', '{}', '{}', 1);
    raise exception 'el trigger dejó nacer una cotización de un borrador';
  exception when check_violation then null; end;
  insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base) values (o, a, f1, '{}', '{}', '{}', '{}', 1);
  begin
    insert into public.cotizaciones (origen_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base) values (o, a, f_otra, '{}', '{}', '{}', '{}', 1);
    raise exception 'el trigger dejó nacer una cotización de la versión de otro origen';
  exception when check_violation then null; end;
end $$;
rollback;

-- @test cotizacion_crear: la hoja abierta la firma la base (4-27): una firma rota, de otra persona, de otro origen o de otra forma es abierta_invalida; el tope de 24 h corre siempre; «con la abierta» no cambia nada sin una desactualización
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; r2 jsonb; c public.cotizaciones; c2 public.cotizaciones; tok text; mala text; k text; id1 uuid := gen_random_uuid(); v_id_oficial uuid; v_antes numeric;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; f1 uuid := (t ->> 'f')::uuid; a uuid := (t ->> 'a')::uuid; kk uuid := (t ->> 'k')::uuid;
  e constant text := '{"inputs": {"visible": 100}}';
  n0 bigint;
begin
  -- Los cambios de tarifa que ya había pasaron hace días: la hoja de hace 25 h «vio» las tarifas de hoy.
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  tok := pg_temp.cc_token(a, o, f1, now());
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, e, v, p_raw => tok));
  if r ? 'error' or r ->> 'repetido' <> 'false' then raise exception 'una hoja abierta sana debía guardar: %', r; end if;
  n0 := (select count(*) from public.cotizaciones where origen_id = o and creado_por = a);

  -- Las rotas: ninguna guarda, todas dicen lo mismo (abierta_invalida, con el hint de la hoja abierta).
  foreach k in array array['firma', 'persona', 'origen', 'formula', 'hora', 'sufijo', 'mayusculas', 'diecisiete', 'basura', 'vacio', 'forma_ok_firma_falsa'] loop
    mala := case k
      when 'firma' then left(tok, length(tok) - 1) || case when right(tok, 1) = '0' then '1' else '0' end
      when 'persona' then pg_temp.cc_token(kk, o, f1, now())
      when 'origen' then pg_temp.cc_token(a, gen_random_uuid(), f1, now())
      when 'formula' then gen_random_uuid()::text || '.' || split_part(tok, '.', 2) || '.' || split_part(tok, '.', 3)
      when 'hora' then split_part(tok, '.', 1) || '.' || (split_part(tok, '.', 2)::bigint + 1)::text || '.' || split_part(tok, '.', 3)
      when 'sufijo' then tok || 'x'
      when 'mayusculas' then upper(tok)
      when 'diecisiete' then split_part(tok, '.', 1) || '.12345678901234567.' || split_part(tok, '.', 3)
      when 'basura' then 'hola'
      when 'vacio' then ''
      else split_part(tok, '.', 1) || '.' || split_part(tok, '.', 2) || '.' || repeat('0', 64)
    end;
    r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_raw => mala));
    if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_invalida' or r ->> 'hint' is distinct from 'abierta' then
      raise exception 'la hoja abierta rota («%») debía dar 22023 abierta_invalida: %', k, r;
    end if;
  end loop;
  if (select count(*) from public.cotizaciones where origen_id = o and creado_por = a) <> n0 then raise exception 'una hoja abierta rota dejó una cotización'; end if;

  -- El intento que se repite vuelve antes que la hoja abierta: vieja, de una clave que rotó o basura, vuelve lo guardado.
  foreach k in array array['vieja', 'basura'] loop
    r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, e, v, p_abierta_en => now() - interval '25 hours', p_con_la_abierta => true, p_raw => case k when 'vieja' then 'marcador' else 'hola' end));
    if r ? 'error' or r ->> 'repetido' <> 'true' then raise exception 'el intento repetido con una hoja abierta «%» debía devolver lo guardado: %', k, r; end if;
  end loop;

  -- Sin cambios de por medio, la hoja de hace 25 h con la versión vigente guarda (nada la desactualizó) y «Guardar con la N» no: el tope de 24 h corre siempre.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '25 hours'));
  if r ? 'error' then raise exception 'la hoja de hace 25 h, sin cambios y sin la bandera, debía guardar: %', r; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '25 hours', p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'con la abierta y una hoja de hace 25 h debía dar abierta_vencida aunque la versión sea la vigente: %', r; end if;

  -- «Con la abierta» sin una desactualización no cambia nada: la misma fórmula, las mismas tarifas y el mismo total.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '1 hour'));
  r2 := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '1 hour', p_con_la_abierta => true));
  if r ? 'error' or r2 ? 'error' then raise exception 'sin desactualización, con y sin la bandera debían guardar: % / %', r, r2; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  select * into c2 from public.cotizaciones where id = (r2 -> 'cotizacion' ->> 'id')::uuid;
  if c.formula_id is distinct from c2.formula_id or c.tipos_cambio is distinct from c2.tipos_cambio or c.total_base is distinct from c2.total_base or c.valores is distinct from c2.valores then
    raise exception 'sin desactualización, la bandera cambió lo guardado: % contra %', c, c2;
  end if;

  -- El exploit de 4-27: una tarifa cambió hace 2 h y quien manda la hora la pone de hace 25 h para quedarse con la de antes. La hora ya no la elige el cliente: vence.
  select id, valor into v_id_oficial, v_antes from public.tipos_cambio where clave = 'oficial';
  update public.tipos_cambio set valor = valor + 1 where clave = 'oficial';
  update public.tipos_cambio_historial set cambiado_en = now() - interval '2 hours' where tipo_cambio_id = v_id_oficial and valor_nuevo = v_antes + 1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '25 hours', p_con_la_abierta => true));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'abierta_vencida' then raise exception 'la hora de hace 25 h con una tarifa cambiada debía dar abierta_vencida: %', r; end if;
  -- Y con la hora de la apertura real (hace 3 h, antes del cambio de hace 2 h) congela la de entonces: es lo que pide «Guardar con la N».
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '3 hours', p_con_la_abierta => true));
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if r ? 'error' or (c.tipos_cambio ->> 'oficial')::numeric is distinct from v_antes then raise exception 'con la hoja abierta hace 3 h debía congelar la tarifa de entonces (%): %', v_antes, r; end if;
end $$;
rollback;

-- @test cotizacion_crear: cotizar pide también cotizaciones.ver del origen (4-32), después de crear y antes de mirar nada más
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; so uuid := gen_random_uuid(); ov uuid := gen_random_uuid(); o2 uuid;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid;
begin
  insert into public.origenes (clave, nombre) values ('cc_ver_' || substr(gen_random_uuid()::text, 1, 6), 'CC otro ver') returning id into o2;
  perform pg_temp.cc_persona(so, pg_temp.cc_conc('cotizaciones.crear', 'leads.ver', 'vehiculos.ver'));
  perform pg_temp.cc_persona(ov, jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.crear'), jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2),
                                                   jsonb_build_object('clave', 'leads.ver'), jsonb_build_object('clave', 'vehiculos.ver')));
  -- Con sólo crear (o con ver de otro origen) no se crea: 42501 que nombra el permiso que falta.
  r := pg_temp.cc_corre(so, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"inputs": {"visible": 1}}', v));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'con sólo crear debía dar 42501 (cotizaciones.ver): %', r; end if;
  r := pg_temp.cc_corre(ov, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"inputs": {"visible": 1}}', v));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.ver%' then raise exception 'con ver de otro origen debía dar 42501 (cotizaciones.ver): %', r; end if;
  -- Quien no tiene crear sigue recibiendo el 42501 de crear (el primero).
  r := pg_temp.cc_corre((t ->> 'sc')::uuid, pg_temp.cc_sql(gen_random_uuid(), o, l, '{"inputs": {"visible": 1}}', v));
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' not like '%cotizaciones.crear%' then raise exception 'sin crear debía dar 42501 (cotizaciones.crear): %', r; end if;
end $$;
rollback;

-- @test cotizacion_crear: D2 «desactualizada» por un tipo de cambio: avisa si uno que la hoja usa cambió desde que se abrió, «Guardar con la N» congela el de entonces, y el intento repetido va antes
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; c public.cotizaciones; id1 uuid := gen_random_uuid(); v_antes numeric; v_id_oficial uuid;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; f1 uuid := (t ->> 'f')::uuid; a uuid := (t ->> 'a')::uuid;
  e constant text := '{"inputs": {"visible": 100}}'; v_abierta timestamptz;
begin
  select id, valor into v_id_oficial, v_antes from public.tipos_cambio where clave = 'oficial';
  -- Los cambios de tarifa que ya había (el seed y otras pruebas) pasaron hace días, para que la hoja se abra «después» de ellos.
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 days' where tipo_cambio_id in (select id from public.tipos_cambio);
  v_abierta := now() - interval '1 hour';

  -- El intento que se repite vuelve antes que D2.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, e, v, p_abierta_en => v_abierta));
  if r ? 'error' then raise exception 'sin cambios debía guardar: %', r; end if;

  -- Una tarifa que la fórmula NO nombra cambia: no es desactualizada (el paralelo no figura en esta fórmula).
  update public.tipos_cambio set valor = valor + 1 where clave = 'paralelo';
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => v_abierta));
  if r ? 'error' then raise exception 'cambiar una tarifa que la hoja no usa no debía avisar: %', r; end if;

  -- La que sí usa (la oficial) cambia después de abrir la hoja.
  update public.tipos_cambio set valor = valor + 1 where clave = 'oficial';
  update public.tipos_cambio_historial set cambiado_en = now() - interval '10 minutes' where tipo_cambio_id = v_id_oficial and valor_nuevo = v_antes + 1;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => v_abierta));
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'desactualizada' or r ->> 'hint' is distinct from 'tipo_cambio' or r ->> 'mensaje' like '%oficial%' then
    raise exception 'un tipo de cambio que cambió debía dar PT409 desactualizada (tipo_cambio) sin nombrar cuál: %', r;
  end if;
  -- El mismo intento ya guardado no avisa: vuelve lo guardado.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id1, o, l, e, v, p_abierta_en => v_abierta));
  if r ? 'error' or r ->> 'repetido' <> 'true' then raise exception 'el intento repetido debía volver antes que D2: %', r; end if;
  -- Una hoja abierta después del cambio guarda.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '5 minutes'));
  if r ? 'error' then raise exception 'una hoja abierta después del cambio debía guardar: %', r; end if;
  -- «Guardar con la N»: congela la tarifa que valía cuando se abrió.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => v_abierta, p_con_la_abierta => true));
  if r ? 'error' then raise exception 'guardar con la N por una tarifa debía guardar: %', r; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if (c.tipos_cambio ->> 'oficial')::numeric is distinct from v_antes then raise exception 'guardar con la N debía congelar la tarifa de entonces (%): %', v_antes, c.tipos_cambio; end if;
  -- Sin «con la abierta», la que se congela es la de hoy.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '5 minutes'));
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if (c.tipos_cambio ->> 'oficial')::numeric is distinct from v_antes + 1 then raise exception 'sin la abierta debía congelar la tarifa de hoy: %', c.tipos_cambio; end if;
  -- Una tarifa desactivada no se usa (ni se congela ni cuenta para D2): el nodo queda sin valor, como antes de D2 (el total en USD no depende de ella).
  update public.tipos_cambio set activo = false where clave = 'oficial';
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => now() - interval '1 hour'));
  if r ? 'error' or r -> 'tipos_cambio' ? 'oficial' or r -> 'valores' -> 'tc' is distinct from 'null'::jsonb then raise exception 'una tarifa desactivada no debía congelarse ni avisar: %', r; end if;
  update public.tipos_cambio set activo = true where clave = 'oficial';
  -- Una tarifa que no valía todavía cuando se abrió la hoja (nació después) cuenta como cambiada.
  delete from public.tipos_cambio_historial where tipo_cambio_id = v_id_oficial;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta_en => v_abierta));
  if r ->> 'hint' is distinct from 'tipo_cambio' then raise exception 'una tarifa sin historial a esa hora debía contar como cambiada: %', r; end if;
end $$;
rollback;

-- Pone en el diseño de esa versión lo que ofrece la cabecera: «Ver total Bs» (`ofrece` en texto: 'true', 'false' o nulo para sacar la clave).
create or replace function pg_temp.cc_ofrece_ver_total_bs(p_f uuid, p_ofrece text) returns void language plpgsql as $f$
begin
  update public.formulas set diseno = case when p_ofrece is null then '{}'::jsonb
                                           else jsonb_build_object('cabecera', jsonb_build_object('ver_total_bs', p_ofrece::boolean)) end where id = p_f;
end $f$;

-- @test cotizacion_crear: «Ver total Bs» se guarda si el diseño de la versión lo ofrece, nace en falso, viaja en la respuesta y en cotizacion_leer; nulo o no ofrecido es 22023 sin escribir; el ayudante no lo ejecuta authenticated
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; r_leer jsonb; c public.cotizaciones; n int; id_r uuid := gen_random_uuid();
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; f uuid := (t ->> 'f')::uuid; a uuid := (t ->> 'a')::uuid;
  e constant text := '{"inputs": {"visible": 100}}';
begin
  -- Un diseño que no dice nada (la fórmula de prueba): sin pedirlo, la columna nace en falso y viaja en la respuesta.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v));
  if r ? 'error' then raise exception 'sin pedir «Ver total Bs» debía guardar: %', r; end if;
  if not jsonb_path_exists(r, '$.cotizacion.ver_total_bs ? (@ == false)') then raise exception 'la respuesta no trae ver_total_bs en falso: %', r -> 'cotizacion'; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.ver_total_bs is distinct from false then raise exception 'sin pedirlo, ver_total_bs debía nacer en falso: %', c.ver_total_bs; end if;
  -- Pedirlo cuando la versión no lo ofrece (falso, ausente o sin diseño): 22023 y nada escrito.
  select count(*) into n from public.cotizaciones where origen_id = o;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_ver => 'true'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'ver_total_bs_no_ofrecido' or r ->> 'hint' is distinct from 'ver_total_bs' then
    raise exception 'pedir «Ver total Bs» sin diseño debía dar ver_total_bs_no_ofrecido: %', r;
  end if;
  perform pg_temp.cc_ofrece_ver_total_bs(f, 'false');
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_ver => 'true'));
  if r ->> 'detail' is distinct from 'ver_total_bs_no_ofrecido' then raise exception 'pedir «Ver total Bs» con la clave en falso debía dar ver_total_bs_no_ofrecido: %', r; end if;
  -- Nulo: falta decirlo.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_ver => null));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'ver_total_bs_falta' or r ->> 'hint' is distinct from 'ver_total_bs' then
    raise exception 'un «Ver total Bs» nulo debía dar ver_total_bs_falta: %', r;
  end if;
  if (select count(*) from public.cotizaciones where origen_id = o) <> n then raise exception 'un rechazo dejó una cotización'; end if;

  -- La versión lo ofrece: se guarda en verdadero, viaja en la respuesta y en cotizacion_leer, y apagarlo también vale.
  perform pg_temp.cc_ofrece_ver_total_bs(f, 'true');
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_ver => 'true'));
  if r ? 'error' then raise exception 'pedir «Ver total Bs» con la versión que lo ofrece debía guardar: %', r; end if;
  if not jsonb_path_exists(r, '$.cotizacion.ver_total_bs ? (@ == true)') then raise exception 'la respuesta no trae ver_total_bs en verdadero: %', r -> 'cotizacion'; end if;
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if c.ver_total_bs is distinct from true then raise exception 'ver_total_bs no se guardó: %', c.ver_total_bs; end if;
  r_leer := pg_temp.cc_corre(a, format('select public.cotizacion_leer(%L)', c.id));
  if r_leer ? 'error' or not jsonb_path_exists(r_leer, '$.cotizacion.ver_total_bs ? (@ == true)') then raise exception 'cotizacion_leer no trae ver_total_bs en verdadero: %', r_leer; end if;
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_ver => 'false'));
  if r ? 'error' or not jsonb_path_exists(r, '$.cotizacion.ver_total_bs ? (@ == false)') then raise exception 'ofrecido y apagado debía guardar en falso: %', r; end if;

  -- El intento repetido vuelve lo guardado sin mirar el valor nuevo.
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id_r, o, l, e, v, p_ver => 'true'));
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(id_r, o, l, e, v, p_ver => 'false'));
  if r ->> 'repetido' <> 'true' or (select ver_total_bs from public.cotizaciones where id = id_r) is distinct from true then raise exception 'el intento repetido debía devolver lo guardado: %', r; end if;

  -- El ayudante es de nadie: ni authenticated ni anon lo ejecutan.
  if has_function_privilege('authenticated', 'public._cotizacion_ver_total_bs(uuid, boolean)', 'execute') or has_function_privilege('anon', 'public._cotizacion_ver_total_bs(uuid, boolean)', 'execute') then
    raise exception 'el ayudante _cotizacion_ver_total_bs lo ejecuta authenticated o anon';
  end if;
  if not has_function_privilege('service_role', 'public._cotizacion_ver_total_bs(uuid, boolean)', 'execute') then raise exception 'el ayudante no lo ejecuta service_role'; end if;
end $$;
rollback;

-- @test cotizacion_crear: con «Guardar con la N», «Ver total Bs» vale según la versión abierta, no la publicada
begin;
do $$
declare
  t jsonb := pg_temp.cc_preparar(); r jsonb; f2 uuid;
  o uuid := (t ->> 'o')::uuid; l uuid := (t ->> 'l')::uuid; v uuid := (t ->> 'v')::uuid; f1 uuid := (t ->> 'f')::uuid; a uuid := (t ->> 'a')::uuid;
  e constant text := '{"inputs": {"visible": 100}}';
begin
  -- La v1 (la abierta) lo ofrece; la v2 (la publicada) no: con la abierta se guarda en verdadero.
  perform pg_temp.cc_ofrece_ver_total_bs(f1, 'true');
  f2 := pg_temp.cc_publicar_v2(o, f1, now());
  perform pg_temp.cc_ofrece_ver_total_bs(f2, 'false');
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1, p_con_la_abierta => true, p_ver => 'true'));
  if r ? 'error' or not jsonb_path_exists(r, '$.cotizacion.ver_total_bs ? (@ == true)') then raise exception 'con la abierta que lo ofrece debía guardar en verdadero: %', r; end if;
  -- Al revés: la abierta no lo ofrece y la publicada sí → no ofrecido.
  perform pg_temp.cc_ofrece_ver_total_bs(f1, 'false');
  perform pg_temp.cc_ofrece_ver_total_bs(f2, 'true');
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o, l, e, v, p_abierta => f1, p_con_la_abierta => true, p_ver => 'true'));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'ver_total_bs_no_ofrecido' then raise exception 'con la abierta que no lo ofrece debía dar ver_total_bs_no_ofrecido: %', r; end if;
end $$;
rollback;
