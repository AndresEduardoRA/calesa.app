-- La lista del equipo con volumen (5a-21, migración 20261019004100): `pnpm db:medir:volumen`, contra el Supabase LOCAL.
--
-- Lo que se asserta es el PLAN y las FILAS y BUFFERS que lee cada etapa de `equipo_lista`, nunca milisegundos: cuántos buffers lee, con qué índice, y que no
-- crece con las personas (10.000 contra 100.000). Cada consulta es la que ejecuta la RPC (`_equipo_lista_sql`), explicada tal cual.
--   todo      sin texto: el índice del orden (perfiles_vigentes_orden_idx o perfiles_estado_orden_idx) y las 101 primeras
--   recorrer  un texto: las primeras S = 2.000 del estado, de a una, cortando al juntar 101 (un término común aparece enseguida)
--   indice    un texto que no apareció en esas S: el trigram (perfiles_busqueda_idx), ordenando lo que coincide
-- 5a-31: un texto sin tramo de 3 letras o dígitos («zq», «z») no filtra: corre la consulta sin texto (≤ 150 buffers con 100.000) y la RPC entera,
-- explicada como la dueña, cuesta lo mismo que sin texto. Antes recorría todo el orden buscándolo (172 ms y crecía con la tabla).
--
-- Una transacción que se revierte. Las personas se insertan sin triggers (`session_replication_role = replica`): no es lo que se mide. Lo revertido deja
-- 100.000 tuplas muertas en `perfiles` y sus índices (un escaneo sólo de índice visita el heap por cada una: 1.106 visitas en vez de 101); por eso se limpia
-- `perfiles` antes de medir (lo que dejó una corrida anterior) y después (para quien mide a continuación).
\set ON_ERROR_STOP 1
vacuum analyze public.perfiles;
begin;

create function pg_temp.plan(p_sql text) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  execute 'explain (analyze, buffers, costs off, timing off, format json) ' || p_sql into v;
  return v -> 0 -> 'Plan';
end $$;

-- Los buffers de todo el plan (los de la raíz suman los de sus hijos y de sus InitPlan).
create function pg_temp.buffers(p jsonb) returns int language sql as $$
  select coalesce((p ->> 'Shared Hit Blocks')::int, 0) + coalesce((p ->> 'Shared Read Blocks')::int, 0)
$$;
-- Las filas que devolvieron los nodos de un tipo (un índice o una exploración), sumadas.
create function pg_temp.filas_de(p jsonb, p_tipo text) returns int language sql as $$
  with recursive nodos (n) as (select p union all select h from nodos, jsonb_array_elements(coalesce(nodos.n -> 'Plans', '[]'::jsonb)) h)
  select coalesce(sum((n ->> 'Actual Rows')::int * coalesce((n ->> 'Actual Loops')::int, 1)), 0)::int from nodos where n ->> 'Node Type' = p_tipo
$$;
create function pg_temp.usa(p jsonb, p_indice text) returns boolean language sql as $$ select p::text like '%"Index Name": "' || p_indice || '"%' $$;
create function pg_temp.sin_seq(p jsonb) returns boolean language sql as $$ select p::text not like '%"Node Type": "Seq Scan"%' and p::text not like '%"Node Type": "Parallel Seq Scan"%' $$;

create temporary table resultado (caso text, total int, buffers int) on commit drop;
create function pg_temp.medir(p_caso text, p_sql text, p_indice text, p_tope_buffers int, p_tope_filas int default null) returns void language plpgsql as $$
declare
  v jsonb := pg_temp.plan(p_sql); v_b int := pg_temp.buffers(v); v_filas int := pg_temp.filas_de(v, 'Index Only Scan') + pg_temp.filas_de(v, 'Index Scan');
  -- Con 10.000 personas (la base de la comparación) todo cuesta poco y el planificador puede preferir recorrer la tabla (2.000 es el 20 % de ella): el
  -- plan y las filas se exigen con 100.000; los buffers, siempre.
  v_grande boolean := (select count(*) from perfiles_medidos) > 50000;
begin
  -- Las filas que lee el índice del orden: la recorrida es de a una y corta al juntar lo que pide.
  if v_grande and p_tope_filas is not null and v_filas > p_tope_filas then raise exception '% lee % filas del índice y el tope es %', p_caso, v_filas, p_tope_filas; end if;
  if v_grande and p_indice is not null and not pg_temp.usa(v, p_indice) then raise exception '% no usa % (plan: %)', p_caso, p_indice, v::text; end if;
  if v_grande and not pg_temp.sin_seq(v) then raise exception '% recorre la tabla entera (Seq Scan): %', p_caso, v::text; end if;
  if v_b > p_tope_buffers then raise exception '% lee % buffers y el tope es % (%)', p_caso, v_b, p_tope_buffers, v::text; end if;
  insert into resultado values (p_caso, (select count(*) from perfiles_medidos), v_b);
  raise notice 'medicion|% (% personas, buffers)|%', p_caso, (select count(*) from perfiles_medidos), v_b;
end $$;
-- Las personas medidas: las del volumen y las de esta prueba (se cuentan para decir con cuántas se midió).
create temporary view perfiles_medidos as select id from public.perfiles;

-- La dueña (para llamar a la RPC de verdad) y las personas.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-00000000e9a1', 'medir-equipo-duena@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select '00000000-0000-0000-0000-00000000e9a1', id, true from public.roles where clave = 'dueno' on conflict do nothing;

-- n personas desde la `desde`: nombres con ñ, tildes y repetidos; 2 % de baja, ~3 % bloqueadas, 5 % con la invitación pendiente.
create function pg_temp.sembrar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  set local session_replication_role = replica;
  insert into public.perfiles (id, nombre, email, activo, bloqueado, invitado_en, invitacion_aceptada_en)
  select ('00000000-0000-0000-0000-' || lpad(to_hex(1000000 + g), 12, '0'))::uuid,
         (array['Ana','José','María','Luis','Carla','Ñandú','Pedro','Lucía','Sofía','Mateo','Elías','Úrsula'])[1 + g % 12] || ' ' ||
         (array['Pérez','Núñez','Gómez','Rojas','Suárez','Mamani','Quispe','Álvarez','Choque','Flores','Vargas','Ñusta','Salazar','Peña'])[1 + (g / 12) % 14] || ' ' || g,
         'p' || g || '@ejemplo.com',
         g % 50 <> 0, g % 33 = 0 and g % 50 <> 0, case when g % 20 = 1 then now() else null end, null
    from generate_series(p_desde, p_hasta) g;
  set local session_replication_role = origin;
end $$;

-- Los casos: se miden con 10.000 personas y otra vez con 100.000.
create function pg_temp.casos(p_tope int) returns void language plpgsql as $$
declare s int := public._equipo_lista_recorrido(); t int := p_tope + 1;
begin
  -- Sin texto: el índice del orden y las 101 primeras. No depende del tamaño de la tabla.
  perform pg_temp.medir('sin texto, en el equipo', public._equipo_lista_sql(null, 'vigentes', t, 'todo'), 'perfiles_vigentes_orden_idx', 150);
  perform pg_temp.medir('sin texto, invitación pendiente', public._equipo_lista_sql(null, 'invitacion_pendiente', t, 'todo'), 'perfiles_estado_orden_idx', 150);
  perform pg_temp.medir('sin texto, dadas de baja', public._equipo_lista_sql(null, 'baja', t, 'todo'), 'perfiles_estado_orden_idx', 150);
  -- Un término que está en todas (el correo): la recorrida junta 101 enseguida y corta (perezosa: no lee las 2.000).
  perform pg_temp.medir('recorrer, término en todas', public._equipo_lista_sql('ejemplo', 'vigentes', t, 'recorrer'), 'perfiles_vigentes_orden_idx', 600, t + 20);
  -- Un término que no aparece en las primeras S: la recorrida lee S y no junta nada; el límite de buffers es de S filas (con su visibilidad), no de la tabla.
  perform pg_temp.medir('recorrer, término que no aparece', public._equipo_lista_sql('zzzqq', 'vigentes', t, 'recorrer'), 'perfiles_vigentes_orden_idx', 3 * s, s);
  -- Por el trigram: lee lo que coincide, no la tabla.
  perform pg_temp.medir('índice, término raro (correo)', public._equipo_lista_sql('p777@', 'vigentes', t, 'indice'), 'perfiles_busqueda_idx', 400);
  perform pg_temp.medir('índice, sin coincidencias', public._equipo_lista_sql('zzzqq', 'vigentes', t, 'indice'), 'perfiles_busqueda_idx', 400);
  perform pg_temp.medir('índice, con tildes (núñez)', public._equipo_lista_sql('NÚÑEZ ana', 'vigentes', t, 'indice'), 'perfiles_busqueda_idx', 6000);
  perform pg_temp.medir('índice, texto y estado', public._equipo_lista_sql('maria', 'bloqueada', t, 'indice'), null, 600);
end $$;

select pg_temp.sembrar(1, 10000);
analyze public.perfiles;
select pg_temp.casos(:tope_equipo);

select pg_temp.sembrar(10001, 100000);
analyze public.perfiles;
select pg_temp.casos(:tope_equipo);

-- Con diez veces las personas, lo que cuesta no crece con la tabla: los casos que no dependen de cuánto coincide (sin texto y el trigram de un
-- término raro o sin coincidencias; la recorrida tiene su cota absoluta, S filas) cuestan casi lo mismo —un piso de 60 buffers de ruido y hasta 1,5 veces—. El trigram de un término común (tildes, texto y estado)
-- sí crece con lo que coincide, y se informa sin assert.
do $$
declare r record;
begin
  for r in select g.caso, g.buffers chico, c.buffers grande
             from resultado g join resultado c on c.caso = g.caso and c.total > 50000
            where g.total < 50000 and (g.caso like 'sin texto%' or g.caso in ('índice, término raro (correo)', 'índice, sin coincidencias')) loop
    if r.grande > r.chico * 1.5 + 60 then
      raise exception '«%» creció con la tabla: % buffers con 10.000 y % con 100.000', r.caso, r.chico, r.grande;
    end if;
  end loop;
  if (select count(*) from resultado) <> 18 then raise exception 'faltan medidas (%)', (select count(*) from resultado); end if;
end $$;

-- La RPC de verdad, como la dueña, con 100.000 personas: cada camino devuelve lo que dice y, en el tope, 101.
select set_config('medir.tope_equipo', :'tope_equipo', true) \g /dev/null
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000e9a1', true),
       set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000e9a1","role":"authenticated"}', true) \g /dev/null
-- 5a-31: la RPC entera (el Function Scan suma los buffers de las consultas que corre adentro), con 1 y 2 letras sin coincidencias, cuesta lo mismo que la
-- RPC sin texto (lo fijo de la RPC —la sesión activa, los permisos, armar la consulta— y la consulta `todo` sin texto, ≤ 150 arriba): no camina el
-- orden buscando el texto. Una llamada antes, para que lo medido no sea el primer uso de la función.
do $$
declare v_q text; v jsonb; v_b int; v_base int; v_t int := current_setting('medir.tope_equipo')::int + 1;
begin
  perform count(*) from public.equipo_lista(null, 'vigentes', v_t);
  v_base := pg_temp.buffers(pg_temp.plan(format('select * from public.equipo_lista(null, %L, %s)', 'vigentes', v_t)));
  raise notice 'medicion|RPC sin texto (% personas, buffers)|%', (select count(*) from perfiles_medidos), v_base;
  foreach v_q in array array['zq', 'z', 'ñq'] loop
    v := pg_temp.plan(format('select * from public.equipo_lista(%L, %L, %s)', v_q, 'vigentes', v_t));
    v_b := pg_temp.buffers(v);
    raise notice 'medicion|RPC «%» (% personas, buffers)|%', v_q, (select count(*) from perfiles_medidos), v_b;
    if v_b > v_base + 20 then
      raise exception 'equipo_lista(%) lee % buffers con % personas, y sin texto %: el texto corto no tiene que costar más', v_q, v_b, (select count(*) from perfiles_medidos), v_base;
    end if;
  end loop;
end $$;
set local role authenticated;
do $$
declare r record; v_n int; v_t int := current_setting('medir.tope_equipo')::int + 1;
begin
  for r in select * from (values (null, 'vigentes', v_t), ('maria', 'vigentes', v_t), ('MARÍA núñez', 'vigentes', v_t), ('p77777@', 'vigentes', 1),
                                 ('p9999@', 'vigentes', 1), ('zzzqq', 'vigentes', 0), ('zq', 'vigentes', v_t), ('z', 'vigentes', v_t)) x (q, e, esperado) loop
    select count(*) into v_n from public.equipo_lista(r.q, r.e, v_t);
    if v_n <> r.esperado then raise exception 'equipo_lista(%, %) devolvió % y se esperaban %', r.q, r.e, v_n, r.esperado; end if;
  end loop;
end $$;
reset role;
rollback;
vacuum analyze public.perfiles;
