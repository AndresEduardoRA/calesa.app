-- La lista de declaraciones de aduana (paso 6.07-3, C1–C11, D31–D34). No depende de otro archivo (`SOLO=areas/aduana/listar.sql`). Cada bloque abre su
-- transacción y la revierte. Los ayudantes son copia de `guardar.sql`; la cabecera y la composición se siembran como superusuario (lo que se prueba es leer).
--
-- Qué asegura:
--   L1. Sin logistica.ver ni gestionar, 42501. Con logistica.ver en un origen y sin gestionar: la declaración con v1 y w (w en otro origen) sale con
--       vehiculos = 1 y hay_ocultos; la que sólo tiene w2 no sale. Con el tributo sólo de v1 ve pagada = false y faltan = 0 (D31: lo deducible); con el de
--       w también, pagada = true. Con gestionar y sin logistica.ver salen las dos, con vehiculos = 0.
--   L2. pagada pasa a verdadera recién con el tributo del último vehículo; un gasto de otra categoría no cuenta; borrar el tributo la devuelve a falsa;
--       quitar al que no lo tiene la vuelve verdadera; sin vivos, falsa. (El assert de la fila del 6.07.)
--   L3. El cursor (tope + 1, la página siguiente, un tramo solo da 22023) y los filtros canal, pagada y q; una clave de más, un canal que no existe o un q
--       de 2 letras, 22023 con la clave.
--   L4. El lote de la lista (sin y con cursor), en su plan genérico, va por declaraciones_aduana_creado_idx sin Sort ni Seq Scan.

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.adu_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-adu@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('adu_' || substr(v_id::text, 1, 8), 'adu ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen con v1, v2, v3 (en una fase que permite aduana) y otro con w y w2; las categorías de tributos y de flete.
create or replace function pg_temp.adu_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; v1 uuid; v2 uuid; v3 uuid; w uuid; w2 uuid; trib uuid; flete uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('adu_' || s, 'adu origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('adu2_' || s, 'adu origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'aduana', true)
    on conflict (flujo_id, regla) do update set activa = true;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, permite_aduana) values (fl, 'adu en aduana', 1, true, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v1', fa) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v2', fa) returning id into v2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v3', fa) returning id into v3;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w') returning id into w;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w2') returning id into w2;
  insert into public.categorias_gasto (nombre, proposito) values ('adu tributos ' || s, 'tributos') returning id into trib;
  insert into public.categorias_gasto (nombre, proposito) values ('adu flete ' || s, 'flete') returning id into flete;
  return jsonb_build_object('o', o, 'o2', o2, 'v1', v1, 'v2', v2, 'v3', v3, 'w', w, 'w2', w2, 'trib', trib, 'flete', flete, 's', s);
end $f$;

-- Una declaración con esos vehículos, como superusuario.
create or replace function pg_temp.adu_decl(p_numero text, p_vehiculos uuid[], p_creado timestamptz default now()) returns uuid language plpgsql as $f$
declare v_id uuid;
begin
  insert into public.declaraciones_aduana (numero, creado_en) values (p_numero, p_creado) returning id into v_id;
  insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) select v_id, x from unnest(p_vehiculos) x;
  return v_id;
end $f$;

create or replace function pg_temp.adu_gasto(p_vehiculo uuid, p_categoria uuid) returns uuid language sql as $f$
  insert into public.gastos (vehiculo_id, categoria_id, moneda, monto, monto_base) values (p_vehiculo, p_categoria, 'USD', 10, 10) returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.adu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '[]'::jsonb);
end $f$;

-- La página como arreglo jsonb.
create or replace function pg_temp.adu_listar(p_quien uuid, p_filtros jsonb default null, p_tope int default 50, p_desde timestamptz default null,
  p_id uuid default null) returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select jsonb_agg(to_jsonb(x)) from public.declaraciones_listar(%L, %L, %L, %L) x', p_desde, p_id, p_tope, p_filtros));
$f$;

-- La fila de la declaración `p_id` en la página (o null si no salió).
create or replace function pg_temp.adu_fila(p_pagina jsonb, p_id uuid) returns jsonb language sql as $f$
  select x from jsonb_array_elements(case when jsonb_typeof(p_pagina) = 'array' then p_pagina else '[]'::jsonb end) x where x ->> 'id' = p_id::text;
$f$;

create or replace function pg_temp.adu_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

-- Compara las hojas `vehiculos`, `hay_ocultos`, `pagada`, `faltan` de una fila.
create or replace function pg_temp.adu_resumen(p_que text, p_fila jsonb, p_vehiculos int, p_ocultos boolean, p_pagada boolean, p_faltan int)
returns void language plpgsql as $f$
begin
  if p_fila is null then raise exception '%: la declaración no salió', p_que; end if;
  if ((p_fila ->> 'vehiculos')::int, (p_fila ->> 'hay_ocultos')::boolean, (p_fila ->> 'pagada')::boolean, (p_fila ->> 'faltan')::int)
     is distinct from (p_vehiculos, p_ocultos, p_pagada, p_faltan) then
    raise exception '%: debía dar vehiculos %, hay_ocultos %, pagada %, faltan % y dio %', p_que, p_vehiculos, p_ocultos, p_pagada, p_faltan, p_fila;
  end if;
end $f$;

-- @test aduana: listar sin las claves da 42501; con logistica.ver de un origen sólo las que tienen un vehículo que ve; con gestionar, todas (L1)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); sin uuid; uno uuid; gestor uuid; d_mix uuid; d_w uuid; r jsonb;
begin
  sin := pg_temp.adu_persona(array['vehiculos.ver']);
  uno := pg_temp.adu_persona(array['logistica.ver@' || (t ->> 'o')]);
  gestor := pg_temp.adu_persona(array['logistica.aduana.gestionar']);
  d_mix := pg_temp.adu_decl('LUNO-' || (t ->> 's') || '-1', array[(t ->> 'v1')::uuid, (t ->> 'w')::uuid]);
  d_w := pg_temp.adu_decl('LUNO-' || (t ->> 's') || '-2', array[(t ->> 'w2')::uuid]);
  perform pg_temp.adu_es('L1 sin las claves', pg_temp.adu_listar(sin), '42501');
  r := pg_temp.adu_listar(uno);
  perform pg_temp.adu_resumen('L1 un origen, la mixta', pg_temp.adu_fila(r, d_mix), 1, true, false, 1);
  if pg_temp.adu_fila(r, d_w) is not null then raise exception 'L1: la que sólo tiene un vehículo que no ve no debía salir: %', r; end if;
  -- D31: con el tributo de v1 y no el de w, quien ve sólo v1 lee pagada = false y faltan = 0.
  perform pg_temp.adu_gasto((t ->> 'v1')::uuid, (t ->> 'trib')::uuid);
  perform pg_temp.adu_resumen('L1 tributo de v1', pg_temp.adu_fila(pg_temp.adu_listar(uno), d_mix), 1, true, false, 0);
  perform pg_temp.adu_gasto((t ->> 'w')::uuid, (t ->> 'trib')::uuid);
  perform pg_temp.adu_resumen('L1 tributo de w', pg_temp.adu_fila(pg_temp.adu_listar(uno), d_mix), 1, true, true, 0);
  r := pg_temp.adu_listar(gestor);
  perform pg_temp.adu_resumen('L1 gestionar, la mixta', pg_temp.adu_fila(r, d_mix), 0, true, true, 0);
  perform pg_temp.adu_resumen('L1 gestionar, la de w2', pg_temp.adu_fila(r, d_w), 0, true, false, 0);
end $$;
rollback;

-- @test aduana: pagada pasa a verdadera recién con el tributo del último vehículo (L2, el assert de la fila)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; d uuid; g2 uuid; q jsonb;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d := pg_temp.adu_decl('LPAG-' || (t ->> 's'), array[(t ->> 'v1')::uuid, (t ->> 'v2')::uuid, (t ->> 'v3')::uuid]);
  q := jsonb_build_object('q', 'LPAG-' || (t ->> 's'));
  perform pg_temp.adu_resumen('L2 sin tributos', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 3, false, false, 3);
  perform pg_temp.adu_gasto((t ->> 'v1')::uuid, (t ->> 'trib')::uuid);
  g2 := pg_temp.adu_gasto((t ->> 'v2')::uuid, (t ->> 'trib')::uuid);
  perform pg_temp.adu_resumen('L2 dos de tres', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 3, false, false, 1);
  perform pg_temp.adu_gasto((t ->> 'v3')::uuid, (t ->> 'flete')::uuid);
  perform pg_temp.adu_resumen('L2 un flete no es tributo', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 3, false, false, 1);
  perform pg_temp.adu_gasto((t ->> 'v3')::uuid, (t ->> 'trib')::uuid);
  perform pg_temp.adu_resumen('L2 el último', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 3, false, true, 0);
  update public.gastos set eliminado_en = now() where id = g2;
  perform pg_temp.adu_resumen('L2 tributo borrado', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 3, false, false, 1);
  update public.declaraciones_vehiculos set removido_en = now() where declaracion_id = d and vehiculo_id = (t ->> 'v2')::uuid;
  perform pg_temp.adu_resumen('L2 quitado el que faltaba', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 2, false, true, 0);
  update public.declaraciones_vehiculos set removido_en = now() where declaracion_id = d and removido_en is null;
  perform pg_temp.adu_resumen('L2 sin vivos', pg_temp.adu_fila(pg_temp.adu_listar(p, q), d), 0, false, false, 0);
end $$;
rollback;

-- @test aduana: la lista por cursor (tope + 1, la página siguiente) y sus filtros cerrados (L3)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; s text := t ->> 's'; d1 uuid; d2 uuid; d3 uuid; r jsonb; q jsonb; ultima jsonb;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d1 := pg_temp.adu_decl('LCUR-' || s || '-1', array[(t ->> 'v1')::uuid], now() - interval '3 hours');
  d2 := pg_temp.adu_decl('LCUR-' || s || '-2', array[(t ->> 'v2')::uuid], now() - interval '2 hours');
  d3 := pg_temp.adu_decl('lcur-' || s || '-10', array[(t ->> 'v3')::uuid], now() - interval '1 hour');
  q := jsonb_build_object('q', 'lcur-' || s);
  r := pg_temp.adu_listar(p, q, 2);
  if jsonb_array_length(r) <> 3 or r -> 0 ->> 'id' <> d3::text or r -> 1 ->> 'id' <> d2::text or r -> 2 ->> 'id' <> d1::text then
    raise exception 'L3: tope 2 debía dar 3 filas (d3, d2, d1) y dio %', r;
  end if;
  ultima := r -> 1;
  r := pg_temp.adu_listar(p, q, 2, (ultima ->> 'creado_en')::timestamptz, (ultima ->> 'id')::uuid);
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> d1::text then raise exception 'L3: tras d2 sólo quedaba d1 y dio %', r; end if;
  perform pg_temp.adu_es('L3 un tramo del cursor', pg_temp.adu_listar(p, q, 2, now(), null), '22023', 'cursor');
  -- q sin distinguir mayúsculas y por prefijo: «LCUR-<s>-1» encuentra -1 y -10, no -2.
  r := pg_temp.adu_listar(p, jsonb_build_object('q', 'LCUR-' || s || '-1'));
  if (select array_agg(x ->> 'id' order by x ->> 'id') from jsonb_array_elements(r) x) is distinct from
     (select array_agg(y order by y) from unnest(array[d1::text, d3::text]) y) then
    raise exception 'L3: el prefijo debía encontrar d1 y d3: %', r;
  end if;
  update public.declaraciones_aduana set canal = 'verde' where id = d2;
  r := pg_temp.adu_listar(p, q || '{"canal": "verde"}');
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> d2::text then raise exception 'L3: el canal verde debía dar sólo d2: %', r; end if;
  perform pg_temp.adu_gasto((t ->> 'v1')::uuid, (t ->> 'trib')::uuid);
  r := pg_temp.adu_listar(p, q || '{"pagada": true}');
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'id' <> d1::text then raise exception 'L3: pagada debía dar sólo d1: %', r; end if;
  r := pg_temp.adu_listar(p, q || '{"pagada": false}');
  if jsonb_array_length(r) <> 2 or pg_temp.adu_fila(r, d1) is not null then raise exception 'L3: sin pagar debía dar d3 y d2: %', r; end if;
  perform pg_temp.adu_es('L3 una clave de más', pg_temp.adu_listar(p, '{"origen": "x"}'), '22023', 'origen');
  perform pg_temp.adu_es('L3 canal que no existe', pg_temp.adu_listar(p, '{"canal": "azul"}'), '22023', 'canal');
  perform pg_temp.adu_es('L3 pagada que no es sí o no', pg_temp.adu_listar(p, '{"pagada": "si"}'), '22023', 'pagada');
  perform pg_temp.adu_es('L3 q de 2', pg_temp.adu_listar(p, '{"q": "lc"}'), '22023', 'q');
  perform pg_temp.adu_es('L3 filtros que no son objeto', pg_temp.adu_listar(p, '[1]'), '22023', 'filtros');
end $$;
rollback;

-- @test aduana: la lista va por declaraciones_aduana_creado_idx, sin ordenar ni recorrer la tabla, con y sin cursor (L4)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno();
begin
  insert into public.declaraciones_aduana (numero, creado_en)
  select 'LVOLX-' || n, now() - make_interval(mins => n) from generate_series(1, 2000) n;
end $$;
-- La única que cumple el filtro está al fondo: el recorrido cruza los lotes de 200 hasta encontrarla.
do $$
declare p uuid := pg_temp.adu_persona(array['logistica.aduana.gestionar']); r jsonb;
begin
  r := pg_temp.adu_listar(p, '{"q": "LVOLX-2000"}');
  if jsonb_array_length(r) <> 1 or r -> 0 ->> 'numero' <> 'LVOLX-2000' then raise exception 'L4: debía encontrar la del fondo y dio %', r; end if;
  r := pg_temp.adu_listar(p, '{"q": "LVOLX-1"}', 100);
  if jsonb_array_length(r) <> 101 then raise exception 'L4: tope 100 debía dar 101 y dio %', jsonb_array_length(r); end if;
end $$;
analyze public.declaraciones_aduana;
analyze public.declaraciones_vehiculos;
-- El plan genérico del lote de declaraciones_listar (los mismos parámetros que plpgsql: el cursor, que sin cursor es infinity, y el tamaño del lote).
set local plan_cache_mode = force_generic_plan;
prepare adu_lote(timestamptz, uuid, integer) as
  select x.* from public.declaraciones_aduana x
   where (x.creado_en, x.id) < ($1, $2)
   order by x.creado_en desc, x.id desc
   limit $3;
do $$
declare consulta text; linea text; plan text;
begin
  foreach consulta in array array[
    'execute adu_lote(''infinity'', ''ffffffff-ffff-ffff-ffff-ffffffffffff'', 200)',
    'execute adu_lote(now() - interval ''1000 minutes'', ''ffffffff-ffff-4fff-8fff-ffffffffffff'', 200)'
  ] loop
    plan := '';
    for linea in execute 'explain (costs off) ' || consulta loop
      plan := plan || linea || E'\n';
    end loop;
    if plan !~ 'Index Scan using declaraciones_aduana_creado_idx' then raise exception 'L4: la lista dejó de ir por declaraciones_aduana_creado_idx: %', plan; end if;
    if plan ~ 'Sort' or plan ~ 'Seq Scan' then raise exception 'L4: la lista ordena o recorre la tabla: %', plan; end if;
  end loop;
end $$;
deallocate adu_lote;
rollback;
