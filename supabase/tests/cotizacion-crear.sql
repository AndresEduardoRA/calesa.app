-- `cotizacion_crear()` (paso 4.10, prompt 2): crear una cotización calculada en la base. Lo que no se ve no viaja (por nivel) lo prueba `cotizaciones-visibilidad.sql`
-- (el caso genérico por nivel y los errores indistinguibles); acá va el resto de la conducta: el cálculo y lo que se guarda, los permisos, el intento, el lead y el vehículo,
-- la clase, el modo de cambio, los tipos de cambio congelados, la moneda base, «cargar a mano» y lo que se rechaza.
-- Corre después de `cotizaciones-visibilidad.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte.

create or replace function pg_temp.cc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, detail, hint} si falla (lo hecho se deshace: va en su propia subtransacción).
create or replace function pg_temp.cc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform pg_temp.cc_como(p_quien);
  set local role authenticated;
  begin
    execute p_sql into v;
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
  values ('CC lead', '73' || lpad((floor(random() * 1000000))::text, 6, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
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

-- Una llamada a cotizacion_crear con esos argumentos (el id del intento y el modo, opcionales).
create or replace function pg_temp.cc_sql(p_id uuid, p_o uuid, p_l uuid, p_entradas text, p_v uuid default null, p_nuevo text default null, p_modo text default null, p_clase text default 'preventa')
returns text language sql as $f$
  select format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L::jsonb, %L, %L::public.clase_cotizacion)', p_id, p_o, p_l, p_entradas, p_v, p_nuevo, p_modo, p_clase)
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
  r := pg_temp.cc_corre((t ->> 'k')::uuid, 'select public.cotizacion_crear(null, null, null, ''{}''::jsonb)');
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
  values ('CC lead borrado', '74' || lpad((floor(random() * 1000000))::text, 6, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}', now()) returning id into l2;
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
  values ('CC lead modo', '75' || lpad((floor(random() * 1000000))::text, 6, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
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
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'modo_invalido' then raise exception 'un modo que la hoja no ofrece debía dar modo_invalido: %', r; end if;

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
  values ('CC lead desc', '76' || lpad((floor(random() * 1000000))::text, 6, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
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
  r := pg_temp.cc_corre(a, pg_temp.cc_sql(gen_random_uuid(), o2, l, '{}', null));
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'origen_sin_formula' then raise exception 'un origen sin fórmula debía dar origen_sin_formula: %', r; end if;
end $$;
rollback;
