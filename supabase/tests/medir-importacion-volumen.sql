-- Importar 500 filas con `actividad` grande y `leads` grande (cierre 5a-fix-2): `pnpm db:medir:volumen`, tras `pnpm db:sembrar-volumen`.
-- `medir-importacion.sql` mide la semilla, en una transacción y con 22.000 filas de `actividad`; no vio que 500 filas pasaran de 1 s
-- a 10,5 s cuando `actividad` pasó de 25.000 a 126.000 filas con 62.000 leads: `_lead_crear` preguntaba «¿este intento ya entró
-- por una adopción?» en cada fila y, con `leads` grande, el planificador recorría `actividad_pkey` entera en vez de usar
-- `actividad_intento_adopcion_idx` (3,4 ms por fila con 23.000 filas, 18,3 con 123.000). Ahora esa consulta sólo corre si el alta
-- trae `adoptar`, y la importación nunca lo trae.
--
-- Como la app: **una transacción por lote** (todo en una sola transacción mide otra cosa, `docs/RENDIMIENTO.md`), como `authenticated`, la
-- dueña de la siembra de volumen y 500 filas en lotes de `:lote` (`FILAS_POR_LOTE`, que `scripts/medir-listado.mjs` lee del código).
-- Dos pasadas, la segunda con 100.000 filas más en `actividad` (una cuarta parte, adopciones del limbo):
--   1. `actividad` llevada a 23.000 filas (si la base ya tiene más, las que tenga);
--   2. `actividad` +100.000 (≈ 123.000).
-- Asserta: 500 filas ≤ 2.000 ms en la segunda, y el tiempo por fila (la mediana de los lotes) de la segunda entre 0,8 y 1,2 veces el de la primera.
-- Confirma de verdad: al empezar y al terminar borra lo que importa y el relleno (también si una corrida anterior se cortó).
\set ON_ERROR_STOP 1

create or replace function pg_temp.borrar_lo_medido() returns void language plpgsql as $$
begin
  delete from public.importaciones where usuario_id = '00000000-0000-0000-0000-0000000000d1' and entidad = 'leads' and archivo_ruta is null
     and id in (select il.importacion_id from public.importaciones_leads il join public.leads l on l.id = il.lead_id where l.nombre like 'Volimp %');
  delete from public.leads where nombre like 'Volimp %';
  delete from public.actividad where tabla = 'medir_relleno';
  delete from public.actividad where actor_id = '00000000-0000-0000-0000-0000000000d1' and accion = 'lead.creado' and despues ->> 'nombre' like 'Volimp %';
end $$;
select pg_temp.borrar_lo_medido();

-- `actividad` hasta `p_total` filas, como las deja una empresa que usa la app: una de cada cuatro es una adopción del limbo (con su intento: así el
-- índice parcial tiene filas y el planificador lo conoce). Todas llevan `tabla = 'medir_relleno'` para borrarlas después.
create or replace function pg_temp.rellenar(p_total bigint) returns bigint language plpgsql as $$
declare v_actual bigint := (select count(*) from public.actividad); v_faltan bigint;
begin
  v_faltan := greatest(p_total - v_actual, 0);
  insert into public.actividad (accion, actor_id, tabla, registro_id, detalle, creado_en)
  select case when g % 4 = 0 then 'lead.adoptado_del_limbo' else 'medir.relleno' end,
         '00000000-0000-0000-0000-0000000000d1', 'medir_relleno', gen_random_uuid()::text,
         jsonb_build_object('intento', gen_random_uuid()), now() - make_interval(secs => g)
    from generate_series(1, v_faltan) g;
  return v_faltan;
end $$;

-- 500 filas en lotes de `p_lote`, cada uno su transacción (`commit`), como `authenticated`; deja el total en ms en `importadora.medir_total_<p_pasada>`.
-- (`:variables` de psql no se expanden dentro de un cuerpo entre `$$`: los valores entran como argumentos.)
create or replace procedure pg_temp.importar(p_pasada int, p_actividad bigint, p_inicio int, p_lote int) language plpgsql as $$
declare
  v_imp uuid := gen_random_uuid(); v_origen uuid := (select id from public.origenes_lead where activo order by orden limit 1);
  v_filas jsonb; v_t timestamptz; v_ms numeric[] := '{}'; v_total numeric := 0; v_r jsonb; v_creadas int := 0; i int;
  v_etiqueta text := to_char(p_actividad, 'FM999G999');
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', false);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', false);
  -- Lo que dejó lo anterior (el relleno y su borrado) dispara el autovacuum de estas tablas: medir mientras corre da ruido.
  for i in 1..240 loop
    exit when not exists (select 1 from pg_stat_progress_vacuum p join pg_class c on c.oid = p.relid where c.relname in ('leads', 'actividad', 'leads_asesores'));
    perform pg_sleep(0.5);
  end loop;
  set role authenticated;
  for i in 0..(500 / p_lote - 1) loop
    select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'fila', i * p_lote + j, 'lead', jsonb_build_object(
             'nombre', 'Volimp ' || (p_pasada * 1000 + i * p_lote + j), 'telefono_principal', (p_inicio + i * p_lote + j)::text,
             'origen_lead_id', v_origen, 'atributos', jsonb_build_object('ciudad', 'La Paz', 'notas', 'fila ' || j))))
      into v_filas from generate_series(1, p_lote) j;
    v_t := clock_timestamp();
    v_r := public.leads_importar_lote(v_imp, 500, v_filas);
    commit;
    v_ms := v_ms || (extract(epoch from clock_timestamp() - v_t) * 1000);
    v_total := v_total + v_ms[array_length(v_ms, 1)];
    v_creadas := v_creadas + (select count(*) from jsonb_array_elements(v_r -> 'filas') e where e ->> 'resultado' = 'creado');
  end loop;
  reset role;
  if v_creadas <> 500 then raise exception 'entraron % de 500', v_creadas; end if;
  perform set_config('importadora.medir_total_' || p_pasada, v_total::text, false);
  perform set_config('importadora.medir_mediana_' || p_pasada, (select percentile_cont(0.5) within group (order by x) from unnest(v_ms) x)::text, false);
  raise notice 'medicion|500 filas con % filas de actividad: el lote más lento|%', v_etiqueta, round((select max(x) from unnest(v_ms) x), 1);
  raise notice 'medicion|500 filas con % filas de actividad|%', v_etiqueta, round(v_total, 1);
end $$;

-- Un teléfono fijo que no choca: la semilla de volumen usa 8xxxxxxx y 9xxxxxxx, las pruebas de `db:probar` 7xxxxxxx, `medir-bajas.sql` nueve dígitos (69…), y
-- `borrar_lo_medido()` quita los «Volimp» de una corrida anterior al empezar. Nunca `random()` (`docs/PLAN.md`, 4-22: 1 de cada N corridas chocaba).
select 60000000 as base \gset

-- Pasada 1: `actividad` en 23.000 filas.
select pg_temp.rellenar(23000) as agregadas \gset
analyze public.actividad;
select count(*) as actividad_1 from public.actividad \gset
call pg_temp.importar(1, :actividad_1, :base, :lote);

-- Pasada 2: +100.000 filas.
select pg_temp.rellenar((select count(*) from public.actividad) + 100000) as agregadas \gset
analyze public.actividad;
select count(*) as actividad_2 from public.actividad \gset
call pg_temp.importar(2, :actividad_2, :base + 1000, :lote);

-- Las aserciones no levantan hasta haber borrado lo medido: una medición que falla no deja 120.000 filas de relleno.
do $$
declare
  v_1 numeric := current_setting('importadora.medir_total_1')::numeric; v_2 numeric := current_setting('importadora.medir_total_2')::numeric;
  v_razon numeric := current_setting('importadora.medir_mediana_2')::numeric / current_setting('importadora.medir_mediana_1')::numeric;
  v_fallo text := '';
begin
  -- El tiempo por fila se compara por la mediana de los lotes: un lote que cae sobre un checkpoint o un fsync lento no es la forma.
  raise notice 'medicion|tiempo por fila de la pasada 2 sobre el de la 1, mediana de los lotes (veces)|%', round(v_razon, 2);
  if v_2 > 2000 then
    v_fallo := format('importar 500 filas con ≈ 123.000 filas de actividad tarda %s ms, el presupuesto es 2000 ms. ', round(v_2, 0));
  end if;
  if v_razon < 0.8 or v_razon > 1.2 then
    v_fallo := v_fallo || format('el tiempo por fila con ≈ 123.000 filas de actividad es %s veces el de con ≈ 23.000 (tiene que ser igual: entre 0,8 y 1,2).', round(v_razon, 2));
  end if;
  perform set_config('importadora.medir_fallo', v_fallo, false);
end $$;

select pg_temp.borrar_lo_medido();

do $$
begin
  if current_setting('importadora.medir_fallo') <> '' then
    raise exception '%', current_setting('importadora.medir_fallo');
  end if;
end $$;
