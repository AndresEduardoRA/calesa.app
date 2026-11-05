-- `cotizacion_encima()` (paso 4.15-2): cotizar encima de una cotización. Lo que no se ve por cada nivel lo prueba `cotizacion-encima-niveles.sql` (E7); acá va la conducta:
-- la versión nueva (E1), lo que se lleva a la versión de hoy (E2), una viva por anterior (E3), los permisos y su orden (E4), el intento (E5), el total sin valor (E6) y los
-- privilegios (E8, E9). Las carreras, en `scripts/carreras/cotizaciones-encima.mjs`. Corre después de `cotizacion-revisiones-autor.sql`; la dueña es `…0001`.

create temp sequence ce_telefono;
create or replace function pg_temp.ce_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_d text; v_h text; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
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

-- Una persona con un rol propio; una clave «x:propios» va con ese alcance.
create or replace function pg_temp.ce_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ce_' || substr(v_id::text, 25, 12), 'CE ' || substr(v_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, ':', 1), null, coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- La v1: visible, oculto («costos»), quita (no sigue en la v2), a_calc (input que en la v2 es cálculo), k (constante), la bandera bx, la variante v (a, b) y dos modos.
create or replace function pg_temp.ce_def(p_v2 boolean) returns jsonb language sql as $f$
  select jsonb_build_object('nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'v', 'tipo', 'opcion', 'etiqueta', 'Variante', 'por_defecto', 'a', 'opciones', case when p_v2 then '[{"clave": "a", "etiqueta": "A"}, {"clave": "c", "etiqueta": "C"}]'::jsonb
                                                                                                      else '[{"clave": "a", "etiqueta": "A"}, {"clave": "b", "etiqueta": "B"}]'::jsonb end),
      jsonb_build_object('id', 'bx', 'tipo', 'bandera', 'etiqueta', 'BX'),
      jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
      jsonb_build_object('id', 'oculto', 'tipo', 'input', 'etiqueta', 'Oculto', 'bucket', 'origen'),
      jsonb_build_object('id', 'k', 'tipo', 'constante', 'etiqueta', 'K', 'bucket', 'origen'),
      case when p_v2 then jsonb_build_object('id', 'a_calc', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'A calc', 'bucket', 'origen')
           else jsonb_build_object('id', 'a_calc', 'tipo', 'input', 'etiqueta', 'A calc', 'bucket', 'origen') end)
    || case when p_v2 then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id', 'quita', 'tipo', 'input', 'etiqueta', 'Quita', 'bucket', 'origen')) end
    || jsonb_build_array(jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen',
                                           'de', case when p_v2 then '["visible", "oculto", "k", "a_calc"]'::jsonb else '["visible", "oculto", "k", "a_calc", "quita"]'::jsonb end)),
    'buckets', jsonb_build_object('origen', 'tc'))
$f$;
create or replace function pg_temp.ce_publicar(p_o uuid, p_v2 boolean) returns uuid language plpgsql as $f$
declare f uuid; v_def jsonb := pg_temp.ce_def(p_v2);
begin
  update public.formulas set estado = 'archivada' where origen_id = p_o and estado = 'publicada';
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, publicado_en)
  values (p_o, case when p_v2 then 2 else 1 end, 'publicada', v_def, '{"k": 3}',
          jsonb_build_object('cabecera', jsonb_build_object('ver_total_bs', not p_v2, 'modos', (select jsonb_agg(jsonb_build_object('clave', m, 'nombre', m, 'buckets', '[{"bucket": "origen", "nodo": "tc"}]'::jsonb, 'total_en', 'tc'))
                                                                                             from unnest(case when p_v2 then array['m3'] else array['m1', 'm2'] end) m))),
          (select jsonb_object_agg(n ->> 'id', case when n ->> 'id' = 'oculto' then '{"ver": "costos", "editar": "costos"}'::jsonb else '{"ver": "todos", "editar": "todos"}'::jsonb end)
             from jsonb_array_elements(v_def -> 'nodos') n), now() - interval '1 day')
  returning id into f;
  return f;
end $f$;

create or replace function pg_temp.ce_terreno() returns jsonb language plpgsql as $f$
declare o uuid; l uuid; v uuid; v2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('ce_' || substr(gen_random_uuid()::text, 1, 8), 'CE origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  perform pg_temp.ce_publicar(o, false);
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CE lead', '7217' || lpad(nextval('pg_temp.ce_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CE vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CE vehículo 2', 'mazda') returning id into v2;
  return jsonb_build_object('o', o, 'l', l, 'v', v, 'v2', v2);
end $f$;

-- Una anterior escrita como postgres sobre la publicada de su origen: visible 100, oculto 25, quita 7, a_calc 9, k pisada en 4, bx encendida, la variante b, el modo m2, «Ver total Bs»,
-- título y notas, y un tipo de cambio viejo (1,11).
create or replace function pg_temp.ce_ant(t jsonb, p_creador uuid, p_clase text default 'preventa', p_vehiculo uuid default null, p_sin_vehiculo boolean default false,
                                          p_sin_lead boolean default false) returns uuid language plpgsql as $f$
declare f public.formulas; v_ent jsonb; v_res jsonb; c uuid;
begin
  select * into f from public.formulas where origen_id = (t ->> 'o')::uuid and estado = 'publicada';
  v_ent := '{"inputs": {"visible": 100, "oculto": 25, "quita": 7, "a_calc": 9}, "banderas": {"bx": true}, "overrides": {"k": 4}, "variante": "b", "vehiculo": {}, "tablas": {},
             "tipos_cambio": {"oficial": 1.11}}';
  v_res := public.evaluar_formula(f.definicion, f.params, v_ent, '{"buckets": {"origen": "tc"}, "total_en": "tc"}');
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, clase, formula_id, valores, fuentes, tipos_cambio, totales, total_base, modo_tc, ver_total_bs, titulo, notas)
  values ((t ->> 'o')::uuid, case when not p_sin_lead then (t ->> 'l')::uuid end, case when not p_sin_vehiculo then coalesce(p_vehiculo, (t ->> 'v')::uuid) end, p_creador,
          p_clase::public.clase_cotizacion, f.id, v_res -> 'valores', v_res -> 'fuentes', v_ent -> 'tipos_cambio', v_res -> 'totales', (v_res #>> '{totales,usd}')::numeric,
          'm2', true, 'CE título', 'CE notas')
  returning id into c;
  return c;
end $f$;

create or replace function pg_temp.ce_encima(p_quien uuid, p_ant uuid, p_id uuid default gen_random_uuid()) returns jsonb language sql as $f$
  select pg_temp.ce_corre(p_quien, format('select public.cotizacion_encima(%L, %L)', p_id, p_ant))
$f$;

-- @test cotizacion_encima: E1 la versión nueva es otra cotización (preventa, versión + 1, su número, el lead y el vehículo de la anterior, quien la cotiza, la publicada y las tarifas de hoy) y la anterior no cambia
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.ce_terreno(); a uuid; af uuid; r jsonb; n public.cotizaciones; antes public.cotizaciones; v_oficial numeric := (select valor from public.tipos_cambio where clave = 'oficial');
begin
  a := pg_temp.ce_ant(t, duena);
  select * into antes from public.cotizaciones where id = a;
  r := pg_temp.ce_encima(duena, a);
  if r ? 'error' or (r ->> 'repetido')::boolean or (r ->> 'descartados')::int <> 0 then raise exception 'E1: %', r; end if;
  select * into n from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if n.version <> 2 or n.cotizacion_padre_id is distinct from a or n.numero = antes.numero or n.clase <> 'preventa' or n.lead_id is distinct from antes.lead_id
     or n.vehiculo_id is distinct from antes.vehiculo_id or n.creado_por <> duena or n.formula_id <> antes.formula_id or (n.tipos_cambio ->> 'oficial')::numeric is distinct from v_oficial
     or n.modo_tc is distinct from 'm2' or not n.ver_total_bs or n.titulo is distinct from 'CE título' or n.notas is distinct from 'CE notas'
     or n.valores -> 'visible' is distinct from '100' or n.valores -> 'oculto' is distinct from '25' or n.valores -> 'k' is distinct from '4' or n.valores -> 'v' is distinct from '"b"' then
    raise exception 'E1: la nueva: %', to_jsonb(n);
  end if;
  if (select to_jsonb(x) from public.cotizaciones x where x.id = a) is distinct from to_jsonb(antes) or exists (select 1 from public.cotizaciones_revisiones where cotizacion_id = a) then
    raise exception 'E1: la anterior cambió';
  end if;
  -- Encima de una final, una preventa (P10); la final sigue final.
  af := pg_temp.ce_ant(t, duena, 'final', (t ->> 'v2')::uuid);
  r := pg_temp.ce_encima(duena, af);
  if r ? 'error' or r -> 'cotizacion' ->> 'clase' is distinct from 'preventa' or (select clase from public.cotizaciones where id = af) <> 'final' then raise exception 'E1: encima de una final: %', r; end if;
end $$;
rollback;

-- @test cotizacion_encima: E2 se lleva a la versión de hoy lo tipeado de los nodos que siguen; lo demás se pierde y se cuenta: un nodo que no sigue, uno que ya no es input, la variante que ya no es opción
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.ce_terreno(); a uuid; f2 uuid; r jsonb; n public.cotizaciones;
begin
  a := pg_temp.ce_ant(t, duena);
  f2 := pg_temp.ce_publicar((t ->> 'o')::uuid, true);
  r := pg_temp.ce_encima(duena, a);
  if r ? 'error' then raise exception 'E2: %', r; end if;
  select * into n from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if n.formula_id <> f2 or n.valores -> 'visible' is distinct from '100' or n.valores -> 'oculto' is distinct from '25' or n.valores -> 'k' is distinct from '4' or n.fuentes ->> 'k' is distinct from 'override'
     or n.valores ? 'quita' or n.fuentes ->> 'a_calc' = 'input' or n.valores -> 'a_calc' is distinct from '100' or n.valores -> 'v' is distinct from '"a"' or n.valores -> 'bx' is distinct from '1' then
    raise exception 'E2: lo que se llevó: % / %', n.valores, n.fuentes;
  end if;
  -- El modo m2 ya no existe: vale el primero de hoy (m3); «Ver total Bs» no se ofrece: falso.
  if n.modo_tc is distinct from 'm3' or n.ver_total_bs then raise exception 'E2: modo % y ver_total_bs %', n.modo_tc, n.ver_total_bs; end if;
  if (r ->> 'descartados')::int <> 3 then raise exception 'E2: descartados = % (quita, a_calc y la variante)', r ->> 'descartados'; end if;
end $$;
rollback;

-- @test cotizacion_encima: E3 una versión nueva viva por anterior (P3): la segunda da PT409 ya_tiene_encima, con su id sólo a quien la ve (P11); en la papelera, no cuenta
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.ce_terreno(); a uuid; ve uuid; r jsonb; n uuid; v_num bigint;
begin
  -- ve sólo ve lo que creó (no está en la cartera del lead) y ve todos los leads.
  ve := pg_temp.ce_persona('cotizaciones.ver:propios', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver');
  a := pg_temp.ce_ant(t, ve);
  n := (pg_temp.ce_encima(duena, a) -> 'cotizacion' ->> 'id')::uuid;
  select numero into v_num from public.cotizaciones where id = n;
  r := pg_temp.ce_encima(duena, a);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'ya_tiene_encima' or r ->> 'hint' is distinct from n::text then raise exception 'E3: la dueña: %', r; end if;
  r := pg_temp.ce_encima(ve, a);
  if r ->> 'error' is distinct from 'PT409' or r ->> 'detail' is distinct from 'ya_tiene_encima' or coalesce(r ->> 'hint', '') <> '' then raise exception 'E3: ve: %', r; end if;
  if r::text like '%' || n::text || '%' or r ->> 'mensaje' like '%' || v_num || '%' then raise exception 'E3: ve recibe el id o el número de la nueva: %', r; end if;
  update public.cotizaciones set eliminado_en = now() where id = n;
  r := pg_temp.ce_encima(ve, a);
  if r ? 'error' or (r -> 'cotizacion' ->> 'version')::int <> 2 then raise exception 'E3: con la nueva en la papelera: %', r; end if;
end $$;
rollback;

-- @test cotizacion_encima: E4 lo que no se ve da el error de lo inexistente antes que el permiso o el lead; después, cotizar, el lead, el vehículo y la publicada, y nada se escribe
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.ce_terreno(); a uuid; ap uuid; ap2 uuid; asl uuid; asv uuid; nc uuid; nl uuid; nlv uuid; nv uuid; r jsonb; v_antes bigint := (select count(*) from public.cotizaciones);
  c_no constant text := 'No tienes acceso a esta cotización.';
begin
  nc := pg_temp.ce_persona('cotizaciones.ver', 'leads.ver', 'vehiculos.ver');
  nl := pg_temp.ce_persona('cotizaciones.ver:propios', 'cotizaciones.crear', 'vehiculos.ver');
  nlv := pg_temp.ce_persona('cotizaciones.ver', 'cotizaciones.crear', 'vehiculos.ver');
  nv := pg_temp.ce_persona('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver');
  a := pg_temp.ce_ant(t, duena);
  ap := pg_temp.ce_ant(t, duena, p_vehiculo => (t ->> 'v2')::uuid);
  update public.cotizaciones set eliminado_en = now() where id = ap;
  ap2 := pg_temp.ce_ant(t, duena, p_vehiculo => (t ->> 'v2')::uuid);
  v_antes := (select count(*) from public.cotizaciones) + 1;
  -- Lo que no existe, está en la papelera o no se ve: el mismo 42501, primero (nc no cotiza; nl no ve el lead).
  foreach r in array array[pg_temp.ce_encima(duena, gen_random_uuid()), pg_temp.ce_encima(duena, ap), pg_temp.ce_encima(nc, gen_random_uuid()), pg_temp.ce_encima(nl, a)] loop
    if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from c_no then raise exception 'E4: lo que no se ve: %', r; end if;
  end loop;
  r := pg_temp.ce_encima(nc, a);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' = c_no then raise exception 'E4: sin crear: %', r; end if;
  r := pg_temp.ce_encima(nlv, a);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No encontramos este lead o no tienes acceso.' then raise exception 'E4: sin ver el lead: %', r; end if;
  -- Sin ver el lead, sobre una anterior que ya tiene versión nueva: el error del lead, no el PT409 (que diría que la nueva existe).
  perform pg_temp.ce_encima(duena, ap2);
  r := pg_temp.ce_encima(nlv, ap2);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No encontramos este lead o no tienes acceso.' then raise exception 'E4: sin ver el lead, con una nueva: %', r; end if;
  r := pg_temp.ce_encima(nc, ap2);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' = c_no then raise exception 'E4: sin crear, con una nueva: %', r; end if;
  r := pg_temp.ce_encima(nv, a);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a este vehículo.' then raise exception 'E4: sin ver el vehículo: %', r; end if;
  asl := pg_temp.ce_ant(t, duena, p_sin_lead => true);
  r := pg_temp.ce_encima(duena, asl);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'lead' then raise exception 'E4: sin lead: %', r; end if;
  asv := pg_temp.ce_ant(t, duena, p_sin_vehiculo => true);
  r := pg_temp.ce_encima(duena, asv);
  if r ->> 'error' is distinct from '22023' or r ->> 'hint' is distinct from 'vehiculo' then raise exception 'E4: sin vehículo y obligatorio: %', r; end if;
  update public.formulas set estado = 'archivada' where origen_id = (t ->> 'o')::uuid;
  r := pg_temp.ce_encima(duena, a);
  if r ->> 'detail' is distinct from 'origen_sin_formula' then raise exception 'E4: sin publicada: %', r; end if;
  if (select count(*) from public.cotizaciones) <> v_antes + 2 then raise exception 'E4: se escribió algo'; end if;
end $$;
rollback;

-- @test cotizacion_encima: E5 el intento: repetido devuelve la misma sin crear otra; el mismo id con otra anterior es intento_reusado; el id de una ajena, el 42501 de lo inexistente
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.ce_terreno(); a uuid; b uuid; c uuid; v_id uuid := gen_random_uuid(); r jsonb; r2 jsonb; otra uuid;
begin
  a := pg_temp.ce_ant(t, duena);
  b := pg_temp.ce_ant(t, duena, p_vehiculo => (t ->> 'v2')::uuid);
  r := pg_temp.ce_encima(duena, a, v_id);
  r2 := pg_temp.ce_encima(duena, a, v_id);
  if r2 ? 'error' or not (r2 ->> 'repetido')::boolean or r2 -> 'cotizacion' ->> 'id' is distinct from v_id::text
     or (select count(*) from public.cotizaciones where cotizacion_padre_id = a) <> 1 then raise exception 'E5: repetido: %', r2; end if;
  r := pg_temp.ce_encima(duena, b, v_id);
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'intento_reusado' then raise exception 'E5: otra anterior: %', r; end if;
  otra := pg_temp.ce_persona('cotizaciones.ver', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver');
  r := pg_temp.ce_encima(otra, b, v_id);
  if r ->> 'error' is distinct from '42501' or r ->> 'mensaje' is distinct from 'No tienes acceso a esta cotización.' or exists (select 1 from public.cotizaciones where cotizacion_padre_id = b) then
    raise exception 'E5: un id ajeno: %', r;
  end if;
end $$;
rollback;

-- @test cotizacion_encima: E6 si la versión de hoy no calcula el total con lo de la anterior (un dato nuevo requerido sin valor), no se crea y se dice por qué (P9)
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.ce_terreno(); a uuid; r jsonb;
begin
  a := pg_temp.ce_ant(t, duena);
  -- La v2 suma «req», requerido con bx encendida (lo está en la anterior), y lo suma al total.
  update public.formulas f
     set definicion = jsonb_set(f.definicion, '{nodos}', (select jsonb_agg(n order by o) filter (where n ->> 'id' <> 'total') from jsonb_array_elements(f.definicion -> 'nodos') with ordinality x (n, o))
                                || '[{"id": "req", "tipo": "input", "etiqueta": "Req", "requerido_si": "bx", "bucket": "origen"}]'::jsonb
                                || jsonb_build_array((select jsonb_set(n, '{de}', (n -> 'de') || '["req"]') from jsonb_array_elements(f.definicion -> 'nodos') n where n ->> 'id' = 'total'))),
         visibilidad = f.visibilidad || '{"req": {"ver": "todos", "editar": "todos"}}'
   where origen_id = (t ->> 'o')::uuid and estado = 'publicada';
  r := pg_temp.ce_encima(duena, a);
  if r ->> 'error' is distinct from '22023' or r ->> 'detail' is distinct from 'total_sin_valor' or exists (select 1 from public.cotizaciones where cotizacion_padre_id = a) then
    raise exception 'E6: %', r;
  end if;
end $$;
rollback;

-- @test cotizacion_encima: E8 y E9 de quien inicia sesión, prosecdef con search_path vacío, sus ayudantes de nadie, el índice único y parcial, y dónde se aplican los permisos
do $$
declare v_f text; p record;
begin
  foreach v_f in array array['public.cotizacion_encima(uuid, uuid)', 'public._cotizacion_lo_que_se_lleva(jsonb, jsonb, jsonb, jsonb)', 'public._cotizacion_descartados(jsonb, text[], jsonb, jsonb, jsonb, jsonb)'] loop
    select * into p from pg_proc x where x.oid = to_regprocedure(v_f);
    if p.oid is null or p.proconfig is distinct from array['search_path=""'] or p.prosecdef is distinct from (v_f like 'public.cotizacion_encima%') then raise exception 'E8: %: %', v_f, p.proconfig; end if;
    if has_function_privilege('anon', v_f, 'execute') or has_function_privilege('authenticated', v_f, 'execute') is distinct from (v_f like 'public.cotizacion_encima%') then raise exception 'E8: los privilegios de %', v_f; end if;
  end loop;
  if not exists (select 1 from pg_index i where i.indexrelid = to_regclass('public.cotizaciones_encima_unica') and i.indisunique and i.indpred is not null) then raise exception 'E8: el índice'; end if;
  if (select aplicado_en from public.permisos where clave = 'cotizaciones.ver') not like '%cotizacion_encima%' or (select aplicado_en from public.permisos where clave = 'cotizaciones.crear') not like '%cotizacion_encima%'
     or (select aplicado_en from public.permisos where clave = 'cotizaciones.ver') not like '%cotizacion_hoja_guardada%' or (select aplicado_en from public.permisos where clave = 'cotizaciones.editar') not like '%cotizacion_hoja_guardada%'
     or (select aplicado_en from public.permisos where clave = 'cotizaciones.final.gestionar') not like '%cotizacion_hoja_guardada%' then
    raise exception 'E9: aplicado_en';
  end if;
end $$;
