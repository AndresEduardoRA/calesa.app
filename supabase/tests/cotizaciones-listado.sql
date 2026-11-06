-- `cotizaciones_listado()` (paso 4.16-1): la lectura del listado `/cotizaciones` por cursor. Lo que devuelve contra la regla escrita a mano, persona por persona, lo prueba
-- `cotizaciones-visibilidad.sql` (L2); el costo con 50.000 y 250.000, `medir-cotizaciones-listado.sql`. Acá va la conducta: la forma (L1), el orden y el cursor (L3), el tamaño (L4),
-- «Vencida» (L5), los filtros (L6), las versiones de una cadena (L7) y el lead (L9, 4.17-4a). Corre después de `cotizacion-encima-niveles.sql`; la dueña es `…0001` (la crea `humo.sql`).
-- Cada bloque abre su transacción y la revierte. Compara ids y hojas, nunca texto suelto.

create temp sequence cl_telefono;

-- Una página como esa persona (authenticated): los ids y sus instantes, en el orden en que los devuelve la función. Sin lead, la llamada de 8 argumentos de siempre (C5:
-- vale igual con la firma de 9, que suma `p_lead` al final con su default).
create or replace function pg_temp.cl_pagina(p_quien uuid, p_tamano int, p_origen uuid default null, p_clase public.clase_cotizacion default null, p_mias boolean default false,
                                             p_vehiculo uuid default null, p_en timestamptz default null, p_id uuid default null, p_atras boolean default false,
                                             p_lead uuid default null)
  returns table (id uuid, creado_en timestamptz, vence_el date, vencida boolean) language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true), set_config('request.jwt.claim.role', 'authenticated', true),
          set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if p_lead is null then
    return query select l.id, l.creado_en, l.vence_el, l.vencida
                   from public.cotizaciones_listado(p_tamano, p_origen, p_clase, p_mias, p_vehiculo, p_en, p_id, p_atras) l;
  else
    return query select l.id, l.creado_en, l.vence_el, l.vencida
                   from public.cotizaciones_listado(p_tamano, p_origen, p_clase, p_mias, p_vehiculo, p_en, p_id, p_atras, p_lead => p_lead) l;
  end if;
  reset role;
exception when others then
  reset role;
  raise;
end $f$;

-- Recorre todas las páginas hacia adelante (de a `p_tamano`) y devuelve los ids en el orden en que salieron. Falla si una página trae más de `p_tamano + 1`,
-- si el orden no es `(creado_en desc, id desc)` estricto o si una fila sale dos veces.
create or replace function pg_temp.cl_recorrer(p_quien uuid, p_tamano int, p_origen uuid default null, p_clase public.clase_cotizacion default null, p_mias boolean default false,
                                               p_vehiculo uuid default null, p_lead uuid default null) returns uuid[] language plpgsql as $f$
declare v_ids uuid[] := '{}'; v_en timestamptz; v_id uuid; v_ant_en timestamptz; v_ant_id uuid; r record; v_n int; v_vueltas int := 0;
begin
  loop
    v_n := 0;
    for r in select * from pg_temp.cl_pagina(p_quien, p_tamano, p_origen, p_clase, p_mias, p_vehiculo, v_en, v_id, false, p_lead) loop
      v_n := v_n + 1;
      exit when v_n > p_tamano;
      if v_ant_en is not null and (r.creado_en, r.id) >= (v_ant_en, v_ant_id) then
        raise exception 'el listado no va en (creado_en desc, id desc): % (%) después de % (%)', r.id, r.creado_en, v_ant_id, v_ant_en;
      end if;
      if r.id = any (v_ids) then raise exception 'el listado repite %', r.id; end if;
      v_ids := v_ids || r.id; v_ant_en := r.creado_en; v_ant_id := r.id;
    end loop;
    exit when v_n <= p_tamano;
    v_en := v_ant_en; v_id := v_ant_id; v_vueltas := v_vueltas + 1;
    if v_vueltas > 10000 then raise exception 'el recorrido no termina'; end if;
  end loop;
  return v_ids;
end $f$;

-- Lo mismo, pero desde el final y hacia atrás (cada página llega en orden ascendente, como la pide `armarPagina`): devuelve los ids de la más nueva a la más vieja.
create or replace function pg_temp.cl_recorrer_atras(p_quien uuid, p_tamano int, p_en timestamptz, p_id uuid, p_origen uuid default null, p_lead uuid default null)
  returns uuid[] language plpgsql as $f$
declare v_ids uuid[] := '{}'; v_pagina uuid[]; v_en timestamptz := p_en; v_id uuid := p_id; r record; v_n int; v_ant_en timestamptz; v_ant_id uuid;
begin
  loop
    v_n := 0; v_pagina := '{}'; v_ant_en := null;
    for r in select * from pg_temp.cl_pagina(p_quien, p_tamano, p_origen, null, false, null, v_en, v_id, true, p_lead) loop
      v_n := v_n + 1;
      exit when v_n > p_tamano;
      if v_ant_en is not null and (r.creado_en, r.id) <= (v_ant_en, v_ant_id) then raise exception 'hacia atrás no llega en orden ascendente: % después de %', r.id, v_ant_id; end if;
      v_pagina := v_pagina || r.id; v_ant_en := r.creado_en; v_ant_id := r.id;
    end loop;
    v_ids := (select array_agg(x order by o desc) from unnest(v_pagina) with ordinality u (x, o)) || v_ids;
    exit when v_n <= p_tamano;
    v_en := v_ant_en; v_id := v_ant_id;
  end loop;
  return v_ids;
end $f$;

-- Una persona con un rol propio: cada concesión es {clave, alcance, origen} (sin alcance = «todos»; sin origen, en todos).
create or replace function pg_temp.cl_persona(p_id uuid, p_concesiones jsonb) returns uuid language plpgsql as $f$
declare v_rol uuid; c jsonb;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p_id, p_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('cl_' || substr(p_id::text, 25, 12), 'CL ' || substr(p_id::text, 25, 12)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p_id, v_rol, true);
  for c in select * from jsonb_array_elements(p_concesiones) loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, c ->> 'clave', nullif(c ->> 'origen', '')::uuid, coalesce(c ->> 'alcance', 'todos')::public.alcance_permiso);
  end loop;
  return p_id;
end $f$;

-- Un origen con una fórmula publicada vacía, un lead y un vehículo.
create or replace function pg_temp.cl_terreno() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; l uuid; v uuid; v2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('cl_' || substr(gen_random_uuid()::text, 1, 8), 'CL origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada', '{"nodos": []}', '{}', '{}', '{}') returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('CL lead', '7217' || lpad(nextval('pg_temp.cl_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CL vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'CL vehículo 2', 'mazda') returning id into v2;
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v', v, 'v2', v2);
end $f$;

-- Una cotización escrita como postgres (una final va sobre el vehículo del terreno o sobre `p_veh`: a lo sumo una final activa por vehículo).
create or replace function pg_temp.cl_cot(t jsonb, p_creador uuid, p_creado timestamptz default now(), p_clase text default 'preventa', p_vehiculo boolean default false,
                                          p_padre uuid default null, p_veh uuid default null) returns uuid language plpgsql as $f$
declare c uuid;
begin
  insert into public.cotizaciones (origen_id, lead_id, vehiculo_id, creado_por, formula_id, valores, fuentes, tipos_cambio, totales, total_base, clase, cotizacion_padre_id, version, creado_en)
  values ((t ->> 'o')::uuid, (t ->> 'l')::uuid, coalesce(p_veh, case when p_vehiculo or p_clase = 'final' then (t ->> 'v')::uuid end), p_creador, (t ->> 'f')::uuid, '{}', '{}', '{}', '{}', 10,
          p_clase::public.clase_cotizacion, p_padre, coalesce((select x.version + 1 from public.cotizaciones x where x.id = p_padre), 1), p_creado)
  returning id into c;
  return c;
end $f$;

-- @test cotizaciones_listado: L1 la forma: invocadora, estable, search_path vacío, las columnas legibles y sin el snapshot; la ejecuta authenticated y no anon ni PUBLIC
begin;
do $$
declare p record; v_cols text;
begin
  select x.oid, x.prosecdef, x.provolatile, x.proconfig into p from pg_proc x where x.proname = 'cotizaciones_listado' and x.pronamespace = 'public'::regnamespace;
  if p.oid is null then raise exception 'L1: no existe public.cotizaciones_listado'; end if;
  if (select count(*) from pg_proc x where x.proname = 'cotizaciones_listado' and x.pronamespace = 'public'::regnamespace) <> 1 then raise exception 'L1: hay más de una cotizaciones_listado'; end if;
  -- Los 8 de siempre en su orden (las llamadas posicionales siguen valiendo) y `p_lead` al final (4.17-4a).
  if pg_get_function_identity_arguments(p.oid) is distinct from
     'p_tamano integer, p_origen uuid, p_clase clase_cotizacion, p_mias boolean, p_vehiculo uuid, p_cursor_en timestamp with time zone, p_cursor_id uuid, p_hacia_atras boolean, p_lead uuid' then
    raise exception 'L1: los argumentos no son los del listado con el lead al final: %', pg_get_function_identity_arguments(p.oid);
  end if;
  if p.prosecdef then raise exception 'L1: cotizaciones_listado corre con los derechos de su dueña (prosecdef): tiene que correr como quien la llama (la RLS decide)'; end if;
  if p.provolatile <> 's' then raise exception 'L1: cotizaciones_listado no es stable (%)', p.provolatile; end if;
  if not coalesce(p.proconfig @> array['search_path=""'], false) then raise exception 'L1: search_path: %', p.proconfig; end if;
  v_cols := pg_get_function_result(p.oid);
  if v_cols is distinct from 'TABLE(id uuid, numero bigint, origen_id uuid, lead_id uuid, vehiculo_id uuid, creado_por uuid, clase clase_cotizacion, estado estado_cotizacion, titulo text, total_base numeric, moneda_mostrar character, creado_en timestamp with time zone, vence_el date, vencida boolean)' then
    raise exception 'L1: las columnas no son las del listado: %', v_cols;
  end if;
  if v_cols ~ '(valores|fuentes|totales|tipos_cambio)' then raise exception 'L1: devuelve el snapshot: %', v_cols; end if;
  if not has_function_privilege('authenticated', p.oid, 'execute') then raise exception 'L1: authenticated no la ejecuta'; end if;
  if has_function_privilege('anon', p.oid, 'execute') then raise exception 'L1: anon la ejecuta'; end if;
  if exists (select 1 from aclexplode((select proacl from pg_proc where oid = p.oid)) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') then raise exception 'L1: PUBLIC la ejecuta'; end if;
end $$;
rollback;

-- @test cotizaciones_listado: L3 el orden (creado_en desc, id desc) con empates, el cursor hacia adelante y hacia atrás sin repetir ni saltear, y el cursor incompleto
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.cl_terreno(); v_esperado uuid[]; v_ids uuid[]; v_atras uuid[]; i int; r record; v_err text; v_hint text; v_n int; v_ultima record;
begin
  -- 25 cotizaciones: 12 con el mismo instante (lo que deja una importación) y 13 con instantes propios, antes y después.
  for i in 1 .. 25 loop
    perform pg_temp.cl_cot(t, duena, case when i between 7 and 18 then timestamptz '2026-03-01 12:00:00+00' else timestamptz '2026-03-01 12:00:00+00' + (i - 12) * interval '1 minute' end);
  end loop;
  select array_agg(c.id order by c.creado_en desc, c.id desc) into v_esperado from public.cotizaciones c where c.origen_id = (t ->> 'o')::uuid;
  -- Por origen (la ruta por origen y clase) y sin filtro (la del índice global): de a 10 y de a 1.
  v_ids := pg_temp.cl_recorrer(duena, 10, (t ->> 'o')::uuid);
  if v_ids is distinct from v_esperado then raise exception 'L3: de a 10 por origen no da lo esperado: % de %', cardinality(v_ids), cardinality(v_esperado); end if;
  v_ids := pg_temp.cl_recorrer(duena, 1, (t ->> 'o')::uuid);
  if v_ids is distinct from v_esperado then raise exception 'L3: de a 1 por origen no da lo esperado'; end if;
  v_ids := pg_temp.cl_recorrer(duena, 10);
  if v_ids is distinct from (select array_agg(c.id order by c.creado_en desc, c.id desc) from public.cotizaciones c where c.eliminado_en is null) then
    raise exception 'L3: sin filtro, la dueña no recorre todas las de la base en orden';
  end if;
  -- La primera página trae una de más mientras hay otra.
  select count(*) into v_n from pg_temp.cl_pagina(duena, 10, (t ->> 'o')::uuid);
  if v_n <> 11 then raise exception 'L3: la primera página de 10 trae % filas (debía traer 11)', v_n; end if;
  -- Hacia atrás desde la última: lo mismo, al revés por página y en orden al juntarlo. El cursor es la última fila de todas.
  select c.creado_en, c.id into v_ultima from public.cotizaciones c where c.id = v_esperado[25];
  v_atras := pg_temp.cl_recorrer_atras(duena, 10, v_ultima.creado_en, v_ultima.id, (t ->> 'o')::uuid);
  if v_atras is distinct from v_esperado[1:24] then raise exception 'L3: hacia atrás no da lo mismo: % de 24', cardinality(v_atras); end if;
  -- Hacia atrás sin cursor es como no tener cursor.
  if (select array_agg(p.id) from pg_temp.cl_pagina(duena, 10, (t ->> 'o')::uuid, p_atras => true) p) is distinct from v_esperado[1:11] then raise exception 'L3: hacia atrás sin cursor'; end if;
  -- El cursor incompleto.
  foreach i in array array[1, 2] loop
    begin
      perform * from pg_temp.cl_pagina(duena, 10, p_en => case when i = 1 then now() end, p_id => case when i = 2 then gen_random_uuid() end);
      raise exception 'L3: el cursor incompleto (%) pasó', i;
    exception when others then
      get stacked diagnostics v_err = returned_sqlstate, v_hint = pg_exception_hint;
      if v_err <> '22023' or v_hint is distinct from 'cursor' then raise exception 'L3: el cursor incompleto da % (%), debía dar 22023 con hint cursor', v_err, v_hint; end if;
    end;
  end loop;
end $$;
rollback;

-- @test cotizaciones_listado: L4 el tamaño se acota: nulo da el máximo + 1, 0 da 2 y 1.000 da el máximo + 1
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001'; t jsonb := pg_temp.cl_terreno(); i int; v_n int; v_tam int; v_esperado int;
begin
  for i in 1 .. 120 loop perform pg_temp.cl_cot(t, duena, now() - i * interval '1 second'); end loop;
  foreach v_tam in array array[null, 0, 1, 1000, 50] loop
    select count(*) into v_n from pg_temp.cl_pagina(duena, v_tam, (t ->> 'o')::uuid);
    v_esperado := case when v_tam is null or v_tam >= 100 then 101 when v_tam < 1 then 2 else v_tam + 1 end;
    if v_n <> v_esperado then raise exception 'L4: con tamaño % salen % (debían salir %)', coalesce(v_tam::text, 'nulo'), v_n, v_esperado; end if;
  end loop;
end $$;
rollback;

-- @test cotizaciones_listado: L5 «Vencida»: la misma regla que cotizacion_hoja_guardada (por día, en la zona de la empresa, con vigencia_dias), con la sesión en cualquier zona
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t jsonb := pg_temp.cl_terreno(); z text; hoy date; c_0 uuid; c_8 uuid; c_n uuid; c_2 uuid; v_tz text; r record;
  v_casos jsonb;
begin
  select zona_horaria into z from public.ajustes_empresa where id = 1;
  hoy := (now() at time zone z)::date;
  -- Los casos de `cotizacion-hoja-guardada.sql` (L7): la de hoy−7 vale hasta hoy; la de hoy−8 a las 23:59 y a las 23:30 locales vencieron ayer.
  c_0 := pg_temp.cl_cot(t, duena, ((hoy - 7)::timestamp at time zone z) + interval '5 seconds');
  c_8 := pg_temp.cl_cot(t, duena, ((hoy - 8)::timestamp + interval '23 hours 59 minutes') at time zone z);
  c_n := pg_temp.cl_cot(t, duena, ((hoy - 8)::timestamp + interval '23 hours 30 minutes') at time zone z);
  v_casos := jsonb_build_object(c_0, jsonb_build_array(hoy, false), c_8, jsonb_build_array(hoy - 1, true), c_n, jsonb_build_array(hoy - 1, true));
  foreach v_tz in array array['UTC', 'Etc/GMT-14', 'Etc/GMT+12'] loop
    perform set_config('timezone', v_tz, true);
    for r in select * from pg_temp.cl_pagina(duena, 10, (t ->> 'o')::uuid) loop
      if r.vence_el::text is distinct from v_casos -> r.id::text ->> 0 or r.vencida is distinct from (v_casos -> r.id::text ->> 1)::boolean then
        raise exception 'L5 (%): % vence el % (vencida %), debía %', v_tz, r.id, r.vence_el, r.vencida, v_casos -> r.id::text;
      end if;
    end loop;
  end loop;
  -- Con un día de vigencia, la de hace dos días venció ayer.
  update public.ajustes_empresa set vigencia_dias = 1 where id = 1;
  c_2 := pg_temp.cl_cot(t, duena, ((hoy - 2)::timestamp + interval '12 hours') at time zone z);
  select * into r from pg_temp.cl_pagina(duena, 10, (t ->> 'o')::uuid) p where p.id = c_2;
  if r.vence_el is distinct from hoy - 1 or r.vencida is distinct from true then raise exception 'L5: con 1 día: % %', r.vence_el, r.vencida; end if;
  -- Lo mismo que calcula la hoja de una guardada, para cada una: la regla de `cotizacion_hoja_guardada` escrita sobre la fila.
  for r in select p.*, (c.creado_en at time zone e.zona_horaria)::date + e.vigencia_dias as v_hoja, (now() at time zone e.zona_horaria)::date as hoy_hoja
             from pg_temp.cl_pagina(duena, 10, (t ->> 'o')::uuid) p join public.cotizaciones c on c.id = p.id cross join public.ajustes_empresa e where e.id = 1 loop
    if r.vence_el is distinct from r.v_hoja or r.vencida is distinct from (r.v_hoja < r.hoy_hoja) then raise exception 'L5: % no da lo de la hoja guardada', r.id; end if;
  end loop;
end $$;
rollback;

-- @test cotizaciones_listado: L6 cada filtro solo y de a dos (origen, clase, mías, vehículo); un origen que no se ve da vacío; nada de la papelera
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t1 jsonb := pg_temp.cl_terreno(); t2 jsonb := pg_temp.cl_terreno(); otra uuid; solo2 uuid; v_ids uuid[];
  d1 uuid; d1f uuid; d1v uuid; o1 uuid; o1f uuid; d2 uuid; o2 uuid; borrada uuid;
begin
  otra := pg_temp.cl_persona(gen_random_uuid(), '[{"clave": "cotizaciones.ver"}]');
  solo2 := pg_temp.cl_persona(gen_random_uuid(), jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', t2 ->> 'o')));
  d1 := pg_temp.cl_cot(t1, duena, now() - interval '1 minute');
  d1f := pg_temp.cl_cot(t1, duena, now() - interval '2 minutes', 'final', p_veh => (t1 ->> 'v2')::uuid);
  d1v := pg_temp.cl_cot(t1, duena, now() - interval '3 minutes', p_vehiculo => true);
  o1 := pg_temp.cl_cot(t1, otra, now() - interval '4 minutes');
  o1f := pg_temp.cl_cot(t1, otra, now() - interval '5 minutes', 'final');
  d2 := pg_temp.cl_cot(t2, duena, now() - interval '6 minutes');
  o2 := pg_temp.cl_cot(t2, otra, now() - interval '7 minutes', p_vehiculo => true);
  borrada := pg_temp.cl_cot(t1, duena, now() - interval '8 minutes');
  update public.cotizaciones set eliminado_en = now() where id = borrada;
  -- Sólo las del terreno: `cl_recorrer` filtra después; acá se compara lo del terreno.
  create temp table cl_mias (id uuid) on commit drop;
  insert into cl_mias values (d1), (d1f), (d1v), (o1), (o1f), (d2), (o2), (borrada);
  -- El origen.
  if pg_temp.cl_recorrer(otra, 2, (t1 ->> 'o')::uuid) is distinct from array[d1, d1f, d1v, o1, o1f] then raise exception 'L6: origen 1: %', pg_temp.cl_recorrer(otra, 2, (t1 ->> 'o')::uuid); end if;
  if pg_temp.cl_recorrer(otra, 2, (t2 ->> 'o')::uuid) is distinct from array[d2, o2] then raise exception 'L6: origen 2'; end if;
  -- La clase, sola (la ruta por clase) y con el origen.
  v_ids := array(select x from unnest(pg_temp.cl_recorrer(otra, 2, p_clase => 'final')) with ordinality u (x, o) where x in (select id from cl_mias) order by o);
  if v_ids is distinct from array[d1f, o1f] then raise exception 'L6: clase final: %', v_ids; end if;
  if pg_temp.cl_recorrer(otra, 2, (t1 ->> 'o')::uuid, 'preventa') is distinct from array[d1, d1v, o1] then raise exception 'L6: origen 1 y preventa'; end if;
  if pg_temp.cl_recorrer(otra, 2, (t2 ->> 'o')::uuid, 'final') is distinct from '{}'::uuid[] then raise exception 'L6: origen 2 y final'; end if;
  -- Mías: las que creó quien mira (P1), con el origen y con la clase.
  v_ids := array(select x from unnest(pg_temp.cl_recorrer(otra, 2, p_mias => true)) with ordinality u (x, o) where x in (select id from cl_mias) order by o);
  if v_ids is distinct from array[o1, o1f, o2] then raise exception 'L6: mías: %', v_ids; end if;
  if pg_temp.cl_recorrer(otra, 2, (t1 ->> 'o')::uuid, 'final', true) is distinct from array[o1f] then raise exception 'L6: mías, origen 1 y final'; end if;
  v_ids := array(select x from unnest(pg_temp.cl_recorrer(duena, 2, p_mias => true)) with ordinality u (x, o) where x in (select id from cl_mias) order by o);
  if v_ids is distinct from array[d1, d1f, d1v, d2] then raise exception 'L6: mías de la dueña: %', v_ids; end if;
  -- El vehículo, solo y con la clase y con mías.
  if pg_temp.cl_recorrer(otra, 2, p_vehiculo => (t1 ->> 'v')::uuid) is distinct from array[d1v, o1f] then raise exception 'L6: vehículo 1: %', pg_temp.cl_recorrer(otra, 2, p_vehiculo => (t1 ->> 'v')::uuid); end if;
  if pg_temp.cl_recorrer(otra, 2, p_clase => 'final', p_vehiculo => (t1 ->> 'v')::uuid) is distinct from array[o1f] then raise exception 'L6: vehículo 1 y final'; end if;
  if pg_temp.cl_recorrer(otra, 2, p_mias => true, p_vehiculo => (t1 ->> 'v')::uuid) is distinct from array[o1f] then raise exception 'L6: vehículo 1 y mías'; end if;
  if pg_temp.cl_recorrer(otra, 2, (t2 ->> 'o')::uuid, p_vehiculo => (t1 ->> 'v')::uuid) is distinct from '{}'::uuid[] then raise exception 'L6: vehículo 1 y origen 2'; end if;
  -- Un origen que no se ve da vacío, no un error; y quien ve sólo el origen 2 no ve el 1 sin filtro.
  if pg_temp.cl_recorrer(solo2, 2, (t1 ->> 'o')::uuid) is distinct from '{}'::uuid[] then raise exception 'L6: un origen que no se ve'; end if;
  if pg_temp.cl_recorrer(solo2, 2, p_vehiculo => (t1 ->> 'v')::uuid) is distinct from '{}'::uuid[] then raise exception 'L6: el vehículo de un origen que no se ve'; end if;
  v_ids := array(select x from unnest(pg_temp.cl_recorrer(solo2, 2)) with ordinality u (x, o) where x in (select id from cl_mias) order by o);
  if v_ids is distinct from array[d2, o2] then raise exception 'L6: quien ve sólo el origen 2: %', v_ids; end if;
  -- La papelera no sale por ningún camino.
  if borrada = any (pg_temp.cl_recorrer(duena, 3)) or borrada = any (pg_temp.cl_recorrer(duena, 3, (t1 ->> 'o')::uuid)) or borrada = any (pg_temp.cl_recorrer(duena, 3, p_mias => true)) then
    raise exception 'L6: sale una de la papelera';
  end if;
end $$;
rollback;

-- @test cotizaciones_listado: L7 una cotización y su versión nueva (cotizar encima) salen las dos, cada una en su fila
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001'; t jsonb := pg_temp.cl_terreno(); c1 uuid; c2 uuid;
begin
  c1 := pg_temp.cl_cot(t, duena, now() - interval '1 hour');
  c2 := pg_temp.cl_cot(t, duena, now(), p_padre => c1);
  if pg_temp.cl_recorrer(duena, 10, (t ->> 'o')::uuid) is distinct from array[c2, c1] then raise exception 'L7: la cadena no sale entera: %', pg_temp.cl_recorrer(duena, 10, (t ->> 'o')::uuid); end if;
end $$;
rollback;

-- @test cotizaciones_listado: L8 los índices del listado: lead_id y origen_id con un solo índice entero al frente (cubre la FK, también la papelera), la final por sus parciales y la clase nunca como columna
begin;
do $$
declare v_col text; v_enteros text[]; v_parciales text[]; v_esperados text[]; v_pred text;
  v_pred_final constant text := '((eliminado_en IS NULL) AND (clase = ''final''::clase_cotizacion))';
begin
  foreach v_col in array array['lead_id', 'origen_id'] loop
    select coalesce(array_agg(c.relname::text order by c.relname) filter (where i.indpred is null), '{}'), coalesce(array_agg(c.relname::text order by c.relname) filter (where i.indpred is not null), '{}')
      into v_enteros, v_parciales
      from pg_index i join pg_class c on c.oid = i.indexrelid
     where i.indrelid = 'public.cotizaciones'::regclass and i.indkey[0] = (select a.attnum from pg_attribute a where a.attrelid = 'public.cotizaciones'::regclass and a.attname = v_col);
    if cardinality(v_enteros) <> 1 then raise exception 'L8: % debía tener exactamente un índice entero al frente y tiene %', v_col, v_enteros; end if;
    -- (un `if` termina en el primer `then`, también el de un `case`: lo esperado va a una variable)
    v_esperados := case when v_col = 'origen_id' then array['cotizaciones_origen_finales_idx'] else '{}'::text[] end;
    if v_parciales is distinct from v_esperados then
      raise exception 'L8: los parciales con % al frente son % (con lead_id, ninguno; con origen_id, sólo el de la final)', v_col, v_parciales;
    end if;
  end loop;
  foreach v_col in array array['cotizaciones_finales_idx', 'cotizaciones_origen_finales_idx'] loop
    select pg_get_expr(i.indpred, i.indrelid) into v_pred from pg_index i where i.indexrelid = to_regclass('public.' || v_col);
    if v_pred is distinct from v_pred_final then raise exception 'L8: % debía ser parcial de la final (%) y su predicado es %', v_col, v_pred_final, v_pred; end if;
  end loop;
  if exists (select 1 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
              where i.indrelid = 'public.cotizaciones'::regclass and a.attname = 'clase') then
    raise exception 'L8: un índice de cotizaciones tiene la clase como columna (enum_eq no es leakproof: bajo la RLS no sirve)';
  end if;
end $$;
rollback;

-- @test cotizaciones_listado: L9 el lead (4.17-4a): solo y con cada filtro (origen, clase, mías, vehículo), el cursor en los dos sentidos, la papelera, un lead que no se ve o no existe
begin;
do $$
declare duena constant uuid := '00000000-0000-0000-0000-000000000001';
  t1 jsonb := pg_temp.cl_terreno(); t2 jsonb := pg_temp.cl_terreno(); t3 jsonb := pg_temp.cl_terreno(); otra uuid; solo2 uuid; prop uuid;
  lead uuid; lead3 uuid; o1 uuid; o2 uuid; v uuid;
  l1 uuid; l1f uuid; l1v2 uuid; l2 uuid; l1v uuid; p1 uuid; borrada uuid; x1 uuid; x2 uuid; p3 uuid; d3 uuid; v_ult record; v_ids uuid[];
begin
  lead := (t1 ->> 'l')::uuid; lead3 := (t3 ->> 'l')::uuid; o1 := (t1 ->> 'o')::uuid; o2 := (t2 ->> 'o')::uuid; v := (t1 ->> 'v')::uuid;
  otra := pg_temp.cl_persona(gen_random_uuid(), '[{"clave": "cotizaciones.ver"}]');
  solo2 := pg_temp.cl_persona(gen_random_uuid(), jsonb_build_array(jsonb_build_object('clave', 'cotizaciones.ver', 'origen', o2)));
  -- «propios» en todos los orígenes, con el lead del terreno 3 compartido: la ruta de lo propio y la de la cartera no pueden colarse en la del lead.
  prop := pg_temp.cl_persona(gen_random_uuid(), '[{"clave": "cotizaciones.ver", "alcance": "propios"}]');
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por, lead_creado_en)
  select l.id, prop, 'compartido', duena, l.creado_en from public.leads l where l.id = lead3;
  -- Las del lead del terreno 1: en el origen 1 y en el 2, sobre el vehículo del terreno y sobre otro, de la dueña, de «otra» y de «prop», y una en la papelera.
  l1 := pg_temp.cl_cot(t1, duena, now() - interval '1 minute');
  l1f := pg_temp.cl_cot(t1, otra, now() - interval '2 minutes', 'final');
  l1v2 := pg_temp.cl_cot(t1, duena, now() - interval '3 minutes', p_veh => (t1 ->> 'v2')::uuid);
  l2 := pg_temp.cl_cot(t2 || jsonb_build_object('l', lead), duena, now() - interval '4 minutes');
  l1v := pg_temp.cl_cot(t1, otra, now() - interval '5 minutes', p_vehiculo => true);
  p1 := pg_temp.cl_cot(t1, prop, now() - interval '6 minutes');
  borrada := pg_temp.cl_cot(t1, duena, now() - interval '7 minutes');
  update public.cotizaciones set eliminado_en = now() where id = borrada;
  -- De otros leads, más nuevas que todas las del lead: el vehículo del terreno 1 cotizado para el lead del terreno 2 (así «el lead y el vehículo» no es la ruta del vehículo),
  -- el lead del terreno 2 en el origen 2, y el del terreno 3 (sólo en el origen 1) de «prop» y de la dueña.
  x1 := pg_temp.cl_cot(t1 || jsonb_build_object('l', t2 ->> 'l'), duena, now() - interval '10 seconds', p_vehiculo => true);
  x2 := pg_temp.cl_cot(t2, duena, now() - interval '20 seconds');
  p3 := pg_temp.cl_cot(t1 || jsonb_build_object('l', lead3), prop, now() - interval '30 seconds');
  d3 := pg_temp.cl_cot(t1 || jsonb_build_object('l', lead3), duena, now() - interval '40 seconds');

  -- El lead solo: lo mismo de a 1, de a 2 y de a 10 (el cursor hacia adelante sin repetir ni saltear), para la dueña y para quien ve «todos».
  if pg_temp.cl_recorrer(duena, 1, p_lead => lead) is distinct from array[l1, l1f, l1v2, l2, l1v, p1] then raise exception 'L9: el lead, de a 1: %', pg_temp.cl_recorrer(duena, 1, p_lead => lead); end if;
  if pg_temp.cl_recorrer(duena, 2, p_lead => lead) is distinct from array[l1, l1f, l1v2, l2, l1v, p1] then raise exception 'L9: el lead, de a 2'; end if;
  if pg_temp.cl_recorrer(otra, 10, p_lead => lead) is distinct from array[l1, l1f, l1v2, l2, l1v, p1] then raise exception 'L9: el lead, quien ve todos'; end if;
  -- La primera página trae una de más mientras hay otra.
  if (select count(*) from pg_temp.cl_pagina(duena, 2, p_lead => lead)) <> 3 then raise exception 'L9: la primera página de 2 no trae 3'; end if;
  -- Hacia atrás desde la última del lead: las demás, en orden al juntarlas.
  select c.creado_en, c.id into v_ult from public.cotizaciones c where c.id = p1;
  if pg_temp.cl_recorrer_atras(duena, 2, v_ult.creado_en, v_ult.id, p_lead => lead) is distinct from array[l1, l1f, l1v2, l2, l1v] then
    raise exception 'L9: el lead hacia atrás: %', pg_temp.cl_recorrer_atras(duena, 2, v_ult.creado_en, v_ult.id, p_lead => lead);
  end if;
  -- El lead y el origen 1, y el 2.
  if pg_temp.cl_recorrer(otra, 2, o1, p_lead => lead) is distinct from array[l1, l1f, l1v2, l1v, p1] then raise exception 'L9: el lead y el origen 1: %', pg_temp.cl_recorrer(otra, 2, o1, p_lead => lead); end if;
  if pg_temp.cl_recorrer(otra, 2, o2, p_lead => lead) is distinct from array[l2] then raise exception 'L9: el lead y el origen 2: %', pg_temp.cl_recorrer(otra, 2, o2, p_lead => lead); end if;
  -- El lead y la clase.
  if pg_temp.cl_recorrer(otra, 2, p_clase => 'final', p_lead => lead) is distinct from array[l1f] then raise exception 'L9: el lead y final: %', pg_temp.cl_recorrer(otra, 2, p_clase => 'final', p_lead => lead); end if;
  if pg_temp.cl_recorrer(otra, 2, p_clase => 'preventa', p_lead => lead) is distinct from array[l1, l1v2, l2, l1v, p1] then raise exception 'L9: el lead y preventa'; end if;
  -- El lead y «mías» (las que creó quien mira).
  if pg_temp.cl_recorrer(otra, 2, p_mias => true, p_lead => lead) is distinct from array[l1f, l1v] then raise exception 'L9: el lead y mías: %', pg_temp.cl_recorrer(otra, 2, p_mias => true, p_lead => lead); end if;
  if pg_temp.cl_recorrer(duena, 2, p_mias => true, p_lead => lead) is distinct from array[l1, l1v2, l2] then raise exception 'L9: el lead y mías de la dueña'; end if;
  -- El lead y el vehículo: la intersección (ni lo del vehículo para otro lead, x1, ni lo del lead sobre otro vehículo, l1v2), también con «mías» y con la clase.
  if pg_temp.cl_recorrer(otra, 1, p_vehiculo => v, p_lead => lead) is distinct from array[l1f, l1v] then raise exception 'L9: el lead y el vehículo: %', pg_temp.cl_recorrer(otra, 1, p_vehiculo => v, p_lead => lead); end if;
  if pg_temp.cl_recorrer(duena, 1, p_mias => true, p_vehiculo => v, p_lead => lead) is distinct from '{}'::uuid[] then raise exception 'L9: el lead, el vehículo y mías de la dueña'; end if;
  if pg_temp.cl_recorrer(otra, 1, p_clase => 'preventa', p_vehiculo => v, p_lead => lead) is distinct from array[l1v] then raise exception 'L9: el lead, el vehículo y preventa'; end if;
  -- «propios»: del lead ve sólo lo que creó (no tiene el lead en su cartera); nada de lo suyo de otro lead (p3) ni de su cartera (d3).
  if pg_temp.cl_recorrer(prop, 2, p_lead => lead) is distinct from array[p1] then raise exception 'L9: propios, el lead: %', pg_temp.cl_recorrer(prop, 2, p_lead => lead); end if;
  if pg_temp.cl_recorrer(prop, 2, p_lead => lead3) is distinct from array[p3, d3] then raise exception 'L9: propios, el lead de su cartera: %', pg_temp.cl_recorrer(prop, 2, p_lead => lead3); end if;
  if pg_temp.cl_recorrer(prop, 2, p_mias => true, p_lead => lead3) is distinct from array[p3] then raise exception 'L9: propios, el lead de su cartera y mías'; end if;
  -- Quien ve sólo el origen 2: del lead, sólo lo del 2; del lead del terreno 3 (sólo en el origen 1), nada; un lead que no existe, nada.
  if pg_temp.cl_recorrer(solo2, 2, p_lead => lead) is distinct from array[l2] then raise exception 'L9: quien ve sólo el origen 2, el lead: %', pg_temp.cl_recorrer(solo2, 2, p_lead => lead); end if;
  if pg_temp.cl_recorrer(solo2, 2, o1, p_lead => lead) is distinct from '{}'::uuid[] then raise exception 'L9: quien ve sólo el origen 2, el lead y el origen 1'; end if;
  if pg_temp.cl_recorrer(solo2, 2, p_lead => lead3) is distinct from '{}'::uuid[] then raise exception 'L9: un lead de un origen que no se ve'; end if;
  if pg_temp.cl_recorrer(duena, 2, p_lead => gen_random_uuid()) is distinct from '{}'::uuid[] then raise exception 'L9: un lead que no existe'; end if;
  -- La papelera no sale.
  if borrada = any (pg_temp.cl_recorrer(duena, 3, p_lead => lead)) or borrada = any (pg_temp.cl_recorrer(duena, 3, p_mias => true, p_lead => lead)) then
    raise exception 'L9: sale una de la papelera';
  end if;
end $$;
rollback;
