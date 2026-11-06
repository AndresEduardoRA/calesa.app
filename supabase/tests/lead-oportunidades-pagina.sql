-- @test lead-oportunidades-pagina (4.17-1, 5a-12): el terreno
-- `lead_oportunidades()` lee las oportunidades de UN lead por cursor: las abiertas primero y después las demás, cada grupo por `ultima_actividad_en desc, id desc`; el cursor es la
-- tripleta de la última fila de la página anterior (`p_antes_abierta`, `p_antes_en`, `p_antes_id`) y el tamaño sale de `_acotar_pagina(p_tamano, 20, 100)`. Sigue siendo de
-- invocadora: la policy «oportunidades: leer» decide qué se ve (sólo las propias, sobre un lead vivo de la cartera). Lo que devuelve se compara contra la regla escrita a mano
-- desde `oportunidades`, sin mirar la función. Corre después de `matriz-leads.sql`: usa sus roles `humo_matriz_propios` y `humo_matriz_todos` y la dueña de la semilla.
--
-- Personas: A («propios»; dueña de las oportunidades que se miran), B («propios»; otra persona), T («todos»), S (sin rol: no ve leads) y la dueña de la semilla.
-- Leads: LA (de A: 45 de A —17 abiertas y 28 cerradas, con empates de `ultima_actividad_en`—, 6 de B, 2 eliminadas de A y 2 de T, que no la tiene en su cartera), LB (de B, con
-- 3 oportunidades de A que A no ve: no es su cartera), LM (de A, con 130 de A: para el tope de 100) y LD (de la dueña, con 1).
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000008e1', 'lop-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000008e2', 'lop-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000008e4', 'lop-todos@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000008e5', 'lop-sin-rol@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000008e1', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000008e2', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000008e4', (select id from public.roles where clave = 'humo_matriz_todos'), true);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

create or replace function pg_temp.lop_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  return r;
exception when others then
  reset role;
  raise;
end $$;

-- Una página: `p_cursor` es la última oportunidad de la página anterior (el elemento del JSON) o nulo.
create or replace function pg_temp.lop_pagina(p_quien uuid, p_lead uuid, p_cursor jsonb, p_tamano int) returns jsonb language sql as $$
  select pg_temp.lop_como(p_quien, format('select public.lead_oportunidades(%L, %L, %L, %L, %L)', p_lead,
    case when p_cursor is null then null else (p_cursor ->> 'estado') = 'abierta' end,
    p_cursor ->> 'ultima_actividad_en', p_cursor ->> 'id', p_tamano));
$$;

-- Todas las páginas de a `p_tamano`: los ids en orden, el `hay_mas` de cada página y cuántas trajo.
create or replace function pg_temp.lop_caminar(p_quien uuid, p_lead uuid, p_tamano int) returns jsonb language plpgsql as $$
declare r jsonb; v_cursor jsonb; v_ids text[] := '{}'; v_hay boolean[] := '{}'; v_tam int[] := '{}'; i int := 0;
begin
  loop
    r := pg_temp.lop_pagina(p_quien, p_lead, v_cursor, p_tamano);
    v_ids := v_ids || coalesce((select array_agg(e ->> 'id' order by n) from jsonb_array_elements(r -> 'oportunidades') with ordinality x (e, n)), '{}');
    v_hay := v_hay || (r ->> 'hay_mas')::boolean;
    v_tam := v_tam || jsonb_array_length(r -> 'oportunidades');
    exit when not (r ->> 'hay_mas')::boolean;
    v_cursor := r -> 'oportunidades' -> (jsonb_array_length(r -> 'oportunidades') - 1);
    i := i + 1;
    if i > 200 then raise exception 'más de 200 páginas: el cursor no avanza'; end if;
  end loop;
  return jsonb_build_object('ids', to_jsonb(v_ids), 'hay', to_jsonb(v_hay), 'tam', to_jsonb(v_tam));
end $$;

-- La regla escrita a mano: las vivas de `p_quien` en el lead, las abiertas primero, y cada grupo por `ultima_actividad_en desc, id desc`.
create or replace function pg_temp.lop_regla(p_quien uuid, p_lead uuid) returns jsonb language sql as $$
  select coalesce(to_jsonb(array_agg(o.id::text order by (o.estado = 'abierta') desc, o.ultima_actividad_en desc, o.id desc)), '[]'::jsonb)
    from public.oportunidades o where o.lead_id = p_lead and o.usuario_id = p_quien and o.eliminado_en is null;
$$;

create or replace function pg_temp.lop_claves(p_json jsonb) returns text language sql as $$
  select string_agg(k, ',' order by k collate "C") from jsonb_object_keys(p_json) k;
$$;

do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; b constant uuid := '00000000-0000-0000-0000-0000000008e2';
  t constant uuid := '00000000-0000-0000-0000-0000000008e4'; s constant uuid := '00000000-0000-0000-0000-0000000008e5';
  d constant uuid := '00000000-0000-0000-0000-000000000001';
  v_web uuid := (select id from public.origenes_lead where clave = 'web'); u uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('LoPag LA', '69331001', a, v_web, '{}'), ('LoPag LB', '69331002', b, v_web, '{}'),
    ('LoPag LM', '69331003', a, v_web, '{}'), ('LoPag LD', '69331004', d, v_web, '{}');
  for u in select unnest(array[a, b, t, d]) loop
    perform public._embudo_defecto_de(u);
  end loop;
  -- Con `replica`: el trigger `trg_oportunidad_estado` deriva el estado de la etapa y pone `ultima_actividad_en` en `clock_timestamp()`, y aquí el terreno fija los dos.
  set local session_replication_role = replica;
  -- Las 45 de A en LA: 1 a 17 abiertas y 18 a 45 cerradas (ganada, perdida y cancelada). Cada una un instante distinto, con microsegundos, salvo tres empates: {3, 4, 5} entre las
  -- abiertas y {20, 21, 22} entre las cerradas (el mismo instante, el orden lo da el `id`).
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, estado, titulo, moneda, ultima_actividad_en)
  select l.id, a, e.id, (select se.id from public.embudos_etapas se where se.embudo_id = e.id and se.es_inicial),
         case when g <= 17 then 'abierta' when g % 3 = 0 then 'ganada' when g % 3 = 1 then 'perdida' else 'cancelada' end::public.estado_oportunidad,
         'LoPag A ' || g, 'USD',
         timestamptz '2026-03-01 10:00:00+00' + (case when g in (4, 5) then 3 when g in (21, 22) then 20 else g end) * interval '1 hour 1.234567 seconds'
    from generate_series(1, 45) g join public.leads l on l.nombre = 'LoPag LA' join public.embudos e on e.usuario_id = a and e.es_default;
  -- Lo que no tiene que llegar: 6 de B (3 abiertas y 3 cerradas) y 2 eliminadas de A en LA, 2 de T en LA, 3 de A en el lead de B.
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, estado, titulo, moneda, ultima_actividad_en, eliminado_en)
  select l.id, x.quien, e.id, (select se.id from public.embudos_etapas se where se.embudo_id = e.id and se.es_inicial), x.estado::public.estado_oportunidad, x.titulo, 'USD',
         timestamptz '2026-03-02 10:00:00+00' + x.n * interval '1 minute', x.eliminada
    from (values
      ('LoPag LA', b, 'abierta', 'B abierta 1', 1, null::timestamptz), ('LoPag LA', b, 'abierta', 'B abierta 2', 2, null), ('LoPag LA', b, 'abierta', 'B abierta 3', 3, null),
      ('LoPag LA', b, 'ganada', 'B ganada 1', 4, null), ('LoPag LA', b, 'perdida', 'B perdida 1', 5, null), ('LoPag LA', b, 'cancelada', 'B cancelada 1', 6, null),
      ('LoPag LA', a, 'abierta', 'A eliminada abierta', 7, now()), ('LoPag LA', a, 'ganada', 'A eliminada cerrada', 8, now()),
      ('LoPag LA', t, 'abierta', 'T abierta en lead ajeno', 9, null), ('LoPag LA', t, 'ganada', 'T cerrada en lead ajeno', 10, null),
      ('LoPag LB', a, 'abierta', 'A en lead de B 1', 11, null), ('LoPag LB', a, 'abierta', 'A en lead de B 2', 12, null), ('LoPag LB', a, 'ganada', 'A en lead de B 3', 13, null))
      x (lead, quien, estado, titulo, n, eliminada)
    join public.leads l on l.nombre = x.lead join public.embudos e on e.usuario_id = x.quien and e.es_default;
  -- 130 de A en LM (70 abiertas y 60 cerradas) para el tope de 100 y, de la dueña, 1 en LD.
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, estado, titulo, moneda, ultima_actividad_en)
  select l.id, a, e.id, (select se.id from public.embudos_etapas se where se.embudo_id = e.id and se.es_inicial),
         case when g <= 70 then 'abierta' else 'perdida' end::public.estado_oportunidad, 'LoPag M ' || g, 'USD', timestamptz '2026-03-03 10:00:00+00' + g * interval '1 minute 7 microseconds'
    from generate_series(1, 130) g join public.leads l on l.nombre = 'LoPag LM' join public.embudos e on e.usuario_id = a and e.es_default;
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda)
  select l.id, d, e.id, (select se.id from public.embudos_etapas se where se.embudo_id = e.id and se.es_inicial), 'LoPag D 1', 'USD'
    from public.leads l join public.embudos e on e.usuario_id = d and e.es_default where l.nombre = 'LoPag LD';
  set local session_replication_role = origin;
  analyze public.oportunidades;
  if (select count(*) from public.oportunidades where lead_id = (select id from public.leads where nombre = 'LoPag LA') and usuario_id = a and eliminado_en is null) <> 45 then
    raise exception 'el terreno de LA no trae las 45 de A';
  end if;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T1 las páginas de a 20 dan las 45 una vez cada una, en el orden de siempre, y la primera trae las 17 abiertas y 3 cerradas
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; v_la uuid := (select id from public.leads where nombre = 'LoPag LA');
  v_ruta jsonb := pg_temp.lop_caminar(a, v_la, 20); v_regla jsonb := pg_temp.lop_regla(a, v_la); v_p1 jsonb := pg_temp.lop_pagina(a, v_la, null, 20);
begin
  if v_ruta -> 'ids' <> v_regla then raise exception 'T1: el recorrido de a 20 no es la regla: % contra %', v_ruta -> 'ids', v_regla; end if;
  if jsonb_array_length(v_regla) <> 45 then raise exception 'T1: la regla no trae las 45: %', jsonb_array_length(v_regla); end if;
  if v_ruta -> 'hay' <> '[true, true, false]'::jsonb then raise exception 'T1: hay_mas por página: %', v_ruta -> 'hay'; end if;
  if v_ruta -> 'tam' <> '[20, 20, 5]'::jsonb then raise exception 'T1: tamaños: %', v_ruta -> 'tam'; end if;
  -- La primera página: las 17 abiertas y, para completar, las 3 cerradas más recientes (la ruta de las abiertas sin cursor completa con las demás).
  if (select count(*) from jsonb_array_elements(v_p1 -> 'oportunidades') e where e ->> 'estado' = 'abierta') <> 17 then raise exception 'T1: la primera página no trae las 17 abiertas'; end if;
  if (select count(distinct e #>> '{}') from jsonb_array_elements(v_ruta -> 'ids') e) <> 45 then raise exception 'T1: hay repetidas'; end if;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T2 el cursor en la última abierta trae primero la cerrada más reciente; un cursor en una cerrada no trae abiertas; de a 5 se cruza el paso
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; v_la uuid := (select id from public.leads where nombre = 'LoPag LA');
  v_regla jsonb := pg_temp.lop_regla(a, v_la); v_p jsonb; v_cursor jsonb; v_ruta jsonb;
begin
  -- De a 17 la primera página son las 17 abiertas, con `hay_mas` (hay cerradas).
  v_p := pg_temp.lop_pagina(a, v_la, null, 17);
  if jsonb_array_length(v_p -> 'oportunidades') <> 17 or not (v_p ->> 'hay_mas')::boolean then raise exception 'T2: la página de 17 no es de las 17 abiertas con hay_mas: %', v_p ->> 'hay_mas'; end if;
  v_cursor := v_p -> 'oportunidades' -> 16;
  if v_cursor ->> 'estado' <> 'abierta' then raise exception 'T2: la última de las 17 no es abierta'; end if;
  v_p := pg_temp.lop_pagina(a, v_la, v_cursor, 5);
  if v_p -> 'oportunidades' -> 0 ->> 'id' <> v_regla ->> 17 then raise exception 'T2: tras la última abierta no sigue la cerrada más reciente'; end if;
  if exists (select 1 from jsonb_array_elements(v_p -> 'oportunidades') e where e ->> 'estado' = 'abierta') then raise exception 'T2: tras la última abierta llegó una abierta'; end if;
  -- Un cursor en una cerrada: ninguna abierta, desde la siguiente.
  v_cursor := (select e from jsonb_array_elements(pg_temp.lop_pagina(a, v_la, null, 30) -> 'oportunidades') e where e ->> 'id' = v_regla ->> 24);
  v_p := pg_temp.lop_pagina(a, v_la, v_cursor, 20);
  if v_p -> 'oportunidades' -> 0 ->> 'id' <> v_regla ->> 25 or exists (select 1 from jsonb_array_elements(v_p -> 'oportunidades') e where e ->> 'estado' = 'abierta') then
    raise exception 'T2: el cursor en una cerrada no sigue por la siguiente cerrada'; end if;
  -- De a 5 son 9 páginas: el paso de abiertas a cerradas cae dentro de la cuarta (abiertas 16 y 17, y 3 cerradas).
  v_ruta := pg_temp.lop_caminar(a, v_la, 5);
  if v_ruta -> 'ids' <> v_regla then raise exception 'T2: de a 5 no es la regla: %', v_ruta -> 'ids'; end if;
  if v_ruta -> 'tam' <> '[5, 5, 5, 5, 5, 5, 5, 5, 5]'::jsonb then raise exception 'T2: tamaños de a 5: %', v_ruta -> 'tam'; end if;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T3 los empates de ultima_actividad_en se ordenan por id desc sin saltar ni repetir, aunque la página los parta
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; v_la uuid := (select id from public.leads where nombre = 'LoPag LA');
  v_regla jsonb := pg_temp.lop_regla(a, v_la); v_n int; v_tam int; v_ruta jsonb;
begin
  if (select count(*) from (select ultima_actividad_en from public.oportunidades where lead_id = v_la and usuario_id = a and eliminado_en is null group by 1 having count(*) = 3) x) <> 2 then
    raise exception 'T3: el terreno no trae los dos empates de tres'; end if;
  foreach v_tam in array array[1, 2, 3, 4, 7] loop
    v_ruta := pg_temp.lop_caminar(a, v_la, v_tam);
    if v_ruta -> 'ids' <> v_regla then raise exception 'T3: de a % no es la regla: %', v_tam, v_ruta -> 'ids'; end if;
    v_n := jsonb_array_length(v_ruta -> 'tam');
    if v_n <> ceil(45.0 / v_tam) then raise exception 'T3: de a % hubo % páginas', v_tam, v_n; end if;
    if (v_ruta -> 'hay' -> (v_n - 1))::boolean then raise exception 'T3: de a % la última página dice hay_mas', v_tam; end if;
  end loop;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T4 el tamaño (nulo 20, 0 y negativo 1, 1000 → 100) y el cursor incompleto (22023, hint cursor)
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; v_lm uuid := (select id from public.leads where nombre = 'LoPag LM'); v_la uuid := (select id from public.leads where nombre = 'LoPag LA');
  r jsonb; v_cursor jsonb; v_estado text; v_hint text; v_en text; v_id text;
begin
  if jsonb_array_length(pg_temp.lop_como(a, format('select public.lead_oportunidades(%L)', v_lm)) -> 'oportunidades') <> 20 then raise exception 'T4: p_tamano nulo no da 20'; end if;
  if jsonb_array_length(pg_temp.lop_pagina(a, v_lm, null, 0) -> 'oportunidades') <> 1 then raise exception 'T4: p_tamano 0 no da 1'; end if;
  if jsonb_array_length(pg_temp.lop_pagina(a, v_lm, null, -5) -> 'oportunidades') <> 1 then raise exception 'T4: p_tamano -5 no da 1'; end if;
  r := pg_temp.lop_pagina(a, v_lm, null, 1000);
  if jsonb_array_length(r -> 'oportunidades') <> 100 or not (r ->> 'hay_mas')::boolean then raise exception 'T4: p_tamano 1000 no da 100 con hay_mas: %', jsonb_array_length(r -> 'oportunidades'); end if;
  -- Las 100 de la página son las abiertas (70) y las 30 cerradas más recientes; la que sigue trae las 30 restantes sin hay_mas.
  v_cursor := r -> 'oportunidades' -> 99;
  r := pg_temp.lop_pagina(a, v_lm, v_cursor, 1000);
  if jsonb_array_length(r -> 'oportunidades') <> 30 or (r ->> 'hay_mas')::boolean then raise exception 'T4: la segunda de 100 no trae 30 sin hay_mas: % %', jsonb_array_length(r -> 'oportunidades'), r ->> 'hay_mas'; end if;
  -- El cursor incompleto: con el instante y sin el estado o sin el id.
  v_cursor := pg_temp.lop_pagina(a, v_la, null, 20) -> 'oportunidades' -> 5;
  v_en := v_cursor ->> 'ultima_actividad_en'; v_id := v_cursor ->> 'id'; v_estado := (v_cursor ->> 'estado' = 'abierta')::text;
  begin
    perform pg_temp.lop_como(a, format('select public.lead_oportunidades(%L, null, %L, %L, 20)', v_la, v_en, v_id));
    raise exception 'T4: el cursor sin estado no falló';
  exception when sqlstate '22023' then get stacked diagnostics v_hint = pg_exception_hint;
    if v_hint <> 'cursor' then raise exception 'T4: el hint del cursor incompleto es %', v_hint; end if;
  end;
  begin
    perform pg_temp.lop_como(a, format('select public.lead_oportunidades(%L, %L, %L, null, 20)', v_la, v_estado, v_en));
    raise exception 'T4: el cursor sin id no falló';
  exception when sqlstate '22023' then get stacked diagnostics v_hint = pg_exception_hint;
    if v_hint <> 'cursor' then raise exception 'T4: el hint del cursor sin id es %', v_hint; end if;
  end;
  -- Sin el instante se lee la primera página, aunque lleguen el estado y el id.
  r := pg_temp.lop_como(a, format('select public.lead_oportunidades(%L, %L, null, %L, 20)', v_la, v_estado, v_id));
  if r -> 'oportunidades' <> pg_temp.lop_pagina(a, v_la, null, 20) -> 'oportunidades' then raise exception 'T4: sin el instante no leyó la primera página'; end if;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T5 lo ajeno y lo eliminado no llegan, y un lead fuera de la cartera da [] aunque haya oportunidades propias sembradas en él
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; b constant uuid := '00000000-0000-0000-0000-0000000008e2';
  t constant uuid := '00000000-0000-0000-0000-0000000008e4'; s constant uuid := '00000000-0000-0000-0000-0000000008e5'; d constant uuid := '00000000-0000-0000-0000-000000000001';
  v_la uuid := (select id from public.leads where nombre = 'LoPag LA'); v_lb uuid := (select id from public.leads where nombre = 'LoPag LB');
  v_ld uuid := (select id from public.leads where nombre = 'LoPag LD'); r jsonb;
begin
  -- A: sólo las suyas vivas (ni las 6 de B, ni las 2 eliminadas, ni las 2 de T), y puede crear.
  r := pg_temp.lop_pagina(a, v_la, null, 100);
  if jsonb_array_length(r -> 'oportunidades') <> 45 or exists (select 1 from jsonb_array_elements(r -> 'oportunidades') e where e ->> 'titulo' !~ '^LoPag A [0-9]+$') then
    raise exception 'T5: A en LA no ve sólo sus 45 vivas'; end if;
  if not (r ->> 'puedo_crear')::boolean then raise exception 'T5: A debería poder crear en su lead'; end if;
  -- B: sus 6 sobre LA no se ven (LA no es su cartera): la lista vacía, y no puede crear.
  r := pg_temp.lop_pagina(b, v_la, null, 100);
  if jsonb_array_length(r -> 'oportunidades') <> 0 or (r ->> 'hay_mas')::boolean or (r ->> 'puedo_crear')::boolean then raise exception 'T5: B sobre LA: %', r; end if;
  -- A sobre el lead de B (3 propias sembradas): fuera de su cartera, la RLS vacía la lista, y no puede crear.
  r := pg_temp.lop_pagina(a, v_lb, null, 100);
  if jsonb_array_length(r -> 'oportunidades') <> 0 or (r ->> 'hay_mas')::boolean or (r ->> 'puedo_crear')::boolean then raise exception 'T5: A sobre LB: %', r; end if;
  if (select count(*) from public.oportunidades where lead_id = v_lb and usuario_id = a) <> 3 then raise exception 'T5: el terreno de LB no trae las 3 de A'; end if;
  -- T («todos») sobre LA, con 2 propias sembradas y sin el lead en su cartera: ve todos los leads, pero ni la lista ni «crear» (editar con «todos» no alcanza sin la cartera).
  r := pg_temp.lop_pagina(t, v_la, null, 100);
  if jsonb_array_length(r -> 'oportunidades') <> 0 or (r ->> 'puedo_crear')::boolean then raise exception 'T5: T sobre un lead fuera de su cartera: %', r; end if;
  -- Sin rol: nada y no crea. La dueña, en su lead: la suya, y crea.
  r := pg_temp.lop_pagina(s, v_la, null, 100);
  if jsonb_array_length(r -> 'oportunidades') <> 0 or (r ->> 'puedo_crear')::boolean then raise exception 'T5: sin rol: %', r; end if;
  r := pg_temp.lop_pagina(d, v_ld, null, 100);
  if jsonb_array_length(r -> 'oportunidades') <> 1 or not (r ->> 'puedo_crear')::boolean then raise exception 'T5: la dueña en su lead: %', r; end if;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T6 las claves de la respuesta, de cada oportunidad, de la etapa y del embudo son las de siempre
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000008e1'; v_la uuid := (select id from public.leads where nombre = 'LoPag LA');
  r jsonb := pg_temp.lop_pagina(a, v_la, null, 20); e jsonb;
begin
  if pg_temp.lop_claves(r) <> 'hay_mas,oportunidades,puedo_crear' then raise exception 'T6: claves de la respuesta: %', pg_temp.lop_claves(r); end if;
  for e in select x from jsonb_array_elements(r -> 'oportunidades') x loop
    if pg_temp.lop_claves(e) <> 'actualizado_en,creado_en,eliminado,embudo,embudo_id,estado,etapa,etapa_id,id,lead_id,moneda,monto_estimado,motivo_perdida,notas,titulo,ultima_actividad_en,vehiculo,vehiculo_oculto' then
      raise exception 'T6: claves de una oportunidad: %', pg_temp.lop_claves(e); end if;
    if pg_temp.lop_claves(e -> 'etapa') <> 'color,es_ganada,es_perdida,id,nombre' then raise exception 'T6: claves de la etapa: %', pg_temp.lop_claves(e -> 'etapa'); end if;
    if pg_temp.lop_claves(e -> 'embudo') <> 'id,nombre' then raise exception 'T6: claves del embudo: %', pg_temp.lop_claves(e -> 'embudo'); end if;
    if e -> 'etapa' ->> 'id' <> e ->> 'etapa_id' or e -> 'embudo' ->> 'id' <> e ->> 'embudo_id' then raise exception 'T6: la etapa o el embudo no son los de la oportunidad'; end if;
    if e -> 'etapa' ->> 'nombre' is distinct from (select nombre from public.embudos_etapas where id = (e ->> 'etapa_id')::uuid)
       or e -> 'embudo' ->> 'nombre' is distinct from (select nombre from public.embudos where id = (e ->> 'embudo_id')::uuid) then raise exception 'T6: nombres de etapa o embudo'; end if;
  end loop;
end $$;

-- @test lead-oportunidades-pagina (4.17-1): T7 la firma de un argumento ya no existe y los privilegios son los de siempre (authenticated y service_role; ni anon ni PUBLIC)
do $$
declare v_f regprocedure := to_regprocedure('public.lead_oportunidades(uuid,boolean,timestamp with time zone,uuid,integer)');
begin
  if to_regprocedure('public.lead_oportunidades(uuid)') is not null then raise exception 'T7: sigue la de un argumento'; end if;
  if v_f is null then raise exception 'T7: falta la de cinco argumentos'; end if;
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'lead_oportunidades') <> 1 then raise exception 'T7: hay una sobrecarga'; end if;
  if not has_function_privilege('authenticated', v_f, 'execute') or not has_function_privilege('service_role', v_f, 'execute') then raise exception 'T7: faltan execute'; end if;
  if has_function_privilege('anon', v_f, 'execute') or exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x where p.oid = v_f and x.grantee = 0) then
    raise exception 'T7: anon o PUBLIC pueden ejecutarla'; end if;
  if (select prosecdef from pg_proc where oid = v_f) then raise exception 'T7: corre con los derechos de quien la creó (no es de invocadora)'; end if;
end $$;
