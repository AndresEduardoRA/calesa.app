-- Diagnóstico de la importación de leads por etapa (cierre 5a). NO asserta nada y no corre en `pnpm db:medir` ni en
-- `db:medir:volumen`: sirve para decir dónde se va el tiempo de importar 500 filas cuando la tabla de leads crece, y para que
-- quien lo arregle mida antes y después con el mismo método.
--   docker exec -i supabase_db_<project_id> psql -U postgres -X -v ON_ERROR_STOP=1 -v lote=50 < supabase/tests/medir-importacion-etapas.sql
-- (`lote` es `FILAS_POR_LOTE`, de `src/modules/leads/entities/importacion/limites.ts`.) Sirve igual en la base de la semilla que con el
-- volumen de `pnpm db:sembrar-volumen`, y **deja los leads que importa**: cada lote es una transacción de verdad, como en la app (una
-- sola transacción para las 500 filas no mide lo mismo: las versiones muertas de `leads_contadores`, que cada alta actualiza, no se
-- limpian hasta que termina, y cada alta cuesta más que la anterior). Después: `pnpm db:reset`.
--
-- Etapas: (1) el tamaño de la tabla; (2) el tiempo de cada lote de `leads_importar_lote` como `authenticated` (con `\timing`); (3) por
-- función, con `track_functions = 'all'`: llamadas y tiempo propio de lo que corre adentro del lote (las funciones de los triggers de `leads`
-- incluidas: números, derivados, auditoría, tipo, origen, cartera); (4) `EXPLAIN (ANALYZE)` de 50 altas directas en `leads` (una transacción
-- que se revierte), que lista cada trigger con su tiempo y sus llamadas, y de las consultas de adentro que podrían crecer con la tabla.
\set ON_ERROR_STOP 1

-- La dueña y su rol en una sola transacción: la base no admite un instante sin nadie que gestione el equipo.
begin;
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'duena-medir@ejemplo.com', '{"invitado": true}')
on conflict (id) do nothing;
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000d1', id from public.roles where clave = 'dueno'
on conflict do nothing;
update public.perfiles set invitacion_aceptada_en = coalesce(invitacion_aceptada_en, now()) where id = '00000000-0000-0000-0000-0000000000d1';
commit;

select format('medicion|N leads|%s (de la dueña %s; actividad %s; leads_asesores %s)',
  (select count(*) from public.leads), (select count(*) from public.leads where creado_por = '00000000-0000-0000-0000-0000000000d1'),
  (select count(*) from public.actividad), (select count(*) from public.leads_asesores)) as dato \gset
\echo :dato

-- Un teléfono que no choca con la semilla (8xxxxxxx y 9xxxxxxx) ni con una corrida anterior: esta deja sus «Etapas», así que la base corre tantos como ya hay.
-- Nunca `random()` (`docs/PLAN.md`, 4-22).
select 61000000 + (select count(*) from public.leads where nombre like 'Etapas %')::int as base \gset

set track_functions = 'all';
create temp table antes as select funcid, calls, total_time, self_time from pg_stat_user_functions where schemaname = 'public';
select pg_stat_force_next_flush();
\timing on
\o /dev/null
-- Cada lote, una transacción. `\gexec` manda cada texto como una sola consulta con su begin y su commit.
select format($f$
  begin;
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
  set local role authenticated;
  select count(*) from (select public.leads_importar_lote(%1$L::uuid, 500, (
    select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'fila', %2$s + j, 'lead', jsonb_build_object(
      'nombre', 'Etapas ' || (%3$s + j), 'telefono_principal', (%3$s + j)::text,
      'origen_lead_id', (select id from public.origenes_lead where activo order by orden limit 1),
      'atributos', jsonb_build_object('ciudad', 'La Paz', 'notas', 'fila ' || j))))
    from generate_series(1, %4$s) j)) as r) q;
  commit;$f$, gen_random_uuid(), i * :lote, :base + i * :lote, :lote) from generate_series(0, 500 / :lote - 1) i \gexec
\o
\timing off

select pg_stat_force_next_flush();
\echo Por función (las 22 de mayor tiempo propio): llamadas, ms por llamada (total) y ms propios de las 500 filas:
select format('medicion|%-36s|%5s llamadas|%7s ms por llamada|%8s ms propios', u.funcid::regproc, u.calls - coalesce(a.calls, 0),
              round(((u.total_time - coalesce(a.total_time, 0)) / nullif(u.calls - coalesce(a.calls, 0), 0))::numeric, 3),
              round((u.self_time - coalesce(a.self_time, 0))::numeric, 1))
  from pg_stat_user_functions u left join antes a using (funcid)
 where u.schemaname = 'public' and u.calls > coalesce(a.calls, 0)
 order by u.self_time - coalesce(a.self_time, 0) desc limit 22;
reset track_functions;

-- Etapa 4: 50 altas directas, con cada trigger y su tiempo (EXPLAIN ANALYZE lo imprime al pie del plan).
begin;
\echo Triggers de 50 altas directas en leads:
explain (analyze, costs off, timing on, summary on)
insert into public.leads (id, nombre, telefono_principal, tipo_lead_id, origen_lead_id, atributos, creado_por)
select gen_random_uuid(), 'Directa ' || g, (:base + 9000 + g)::text, (select id from public.tipos_lead where clase = 'prospecto' and activo order by orden limit 1),
       (select id from public.origenes_lead where activo order by orden limit 1), jsonb_build_object('ciudad', 'La Paz'), '00000000-0000-0000-0000-0000000000d1'
  from generate_series(1, 50) g;

-- Las consultas de adentro que podrían crecer con la tabla, con el plan genérico que usa plpgsql tras unas llamadas.
set local plan_cache_mode = force_generic_plan;
\echo El intento ya entró (clave primaria de leads):
explain (analyze, buffers, costs off, timing on, summary on)
select l.id from public.leads l where l.id = '00000000-0000-0000-0000-00000000abcd' and l.creado_por = '00000000-0000-0000-0000-0000000000d1';
\echo El intento adoptado del limbo (actividad):
explain (analyze, buffers, costs off, timing on, summary on)
select l.id from public.actividad a join public.leads l on l.id::text = a.registro_id
 where a.accion = 'lead.adoptado_del_limbo' and a.actor_id = '00000000-0000-0000-0000-0000000000d1' and a.detalle ->> 'intento' = '00000000-0000-0000-0000-00000000abcd'
 order by a.id desc limit 1;
\echo El teléfono, lo que ya se sabe de él (_lead_verificar):
explain (analyze, buffers, costs off, timing on, summary on)
select public._lead_verificar('59170000001');
rollback;
