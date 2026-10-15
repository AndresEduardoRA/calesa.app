-- Medición del kanban de oportunidades (`pnpm db:medir`, contra el Supabase LOCAL), parte 7a.
--
-- Todo pasa en una transacción que se revierte. El terreno: una dueña con 2.000 leads y 5.000
-- oportunidades repartidas en las seis etapas de su embudo por defecto, y un asesor con 5.000 propias
-- sobre sus 50 leads (la policy tiene que descartarlas sin recorrerlas una por una). Cada consulta
-- corre como `authenticated` con la sesión de la dueña, 7 veces, y se informa la mediana de las 5 últimas.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'duena-medir@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000000a1', 'asesor-medir@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000d1', id from public.roles where clave = 'dueno'
on conflict do nothing;
insert into public.usuarios_roles (usuario_id, rol_id)
select '00000000-0000-0000-0000-0000000000a1', id from public.roles where clave = 'asesor'
on conflict do nothing;

insert into public.leads (nombre, telefono_principal, creado_por, creado_en)
select 'Medir ' || g, (79000000 + g)::text,
       case when g % 40 = 0 then '00000000-0000-0000-0000-0000000000a1'::uuid
            else '00000000-0000-0000-0000-0000000000d1'::uuid end,
       now() - make_interval(mins => g)
from generate_series(1, 2000) g;

create temporary table medir_leads on commit drop as
select l.id, a.usuario_id, row_number() over (partition by a.usuario_id order by l.creado_en) as n
  from public.leads l join public.leads_asesores a on a.lead_id = l.id and a.tipo_acceso = 'dueno'
 where l.nombre like 'Medir %';

do $$ declare v_u uuid; v_emb uuid; v_etapas uuid[]; v_cuantos int; begin
  foreach v_u in array array['00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1']::uuid[] loop
    v_emb := public._embudo_defecto_de(v_u);
    select array_agg(id order by orden) into v_etapas from public.embudos_etapas where embudo_id = v_emb;
    select count(*) into v_cuantos from medir_leads where usuario_id = v_u;
    insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, monto_estimado, moneda)
    select l.id, v_u, v_emb, v_etapas[1 + g % 6], 'Medir oportunidad ' || g, 1000 + g, 'USD'
      from generate_series(1, 5000) g
      join medir_leads l on l.usuario_id = v_u and l.n = 1 + g % v_cuantos;
  end loop;
end $$;
-- La última actividad repartida en el tiempo (el trigger la sella al insertar).
update public.oportunidades set ultima_actividad_en = now() - make_interval(mins => (abs(hashtext(id::text)) % 100000))
 where titulo like 'Medir oportunidad %';
analyze public.oportunidades;
analyze public.leads;
analyze public.leads_asesores;
analyze public.embudos_etapas;

create function pg_temp.medir(p_nombre text, p_sql text) returns void language plpgsql as $$
declare v_plan json; v_tiempos numeric[] := '{}'; v_mediana numeric; i int;
begin
  set local role authenticated;
  for i in 1..7 loop
    execute 'explain (analyze, format json) ' || p_sql into v_plan;
    if i > 2 then
      v_tiempos := v_tiempos || ((v_plan -> 0 ->> 'Execution Time')::numeric);
    end if;
  end loop;
  reset role;
  select percentile_cont(0.5) within group (order by t) into v_mediana from unnest(v_tiempos) t;
  raise notice 'medicion|%|%', p_nombre, round(v_mediana, 1);
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select set_config('medir.embudo', (select id::text from public.embudos where usuario_id = '00000000-0000-0000-0000-0000000000d1' and es_default), true);
select set_config('medir.etapa', (select id::text from public.embudos_etapas where embudo_id = current_setting('medir.embudo')::uuid order by orden offset 1 limit 1), true);
select set_config('medir.lead', (select id::text from medir_leads where usuario_id = '00000000-0000-0000-0000-0000000000d1' and n = 7), true);

select pg_temp.medir('tablero, 6 columnas de 50 (5.000 propias)', format('select public.embudo_tablero(%L, 50)', current_setting('medir.embudo')));
select pg_temp.medir('«Ver más» de una columna, página 2', format(
  'select public.embudo_etapa_pagina(%L, (select ultima_actividad_en from public.oportunidades where etapa_id = %L order by ultima_actividad_en desc, id desc offset 49 limit 1), (select id from public.oportunidades where etapa_id = %L order by ultima_actividad_en desc, id desc offset 49 limit 1), 50)',
  current_setting('medir.etapa'), current_setting('medir.etapa'), current_setting('medir.etapa')));
select pg_temp.medir('las de un lead (sección de la ficha)', format('select public.lead_oportunidades(%L)', current_setting('medir.lead')));
select pg_temp.medir('contar las que ve (la policy sola)', 'select count(*) from public.oportunidades');

rollback;
