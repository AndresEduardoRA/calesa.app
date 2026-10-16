-- Medición de las listas hijas de un lead con volumen (`pnpm db:medir`, contra el Supabase LOCAL), 9d-2.
--
-- Todo pasa en una transacción que se revierte. El terreno: un lead de la dueña con 20.000 seguimientos
-- suyos, 2.000 recordatorios pendientes (1.000 vencidos) y 3.000 completados, y un lead de un asesor
-- con 20.000 seguimientos privados (la dueña lo ve con «todos» y no ve ninguno). La dueña tiene además
-- 3.000 pendientes sobre otro lead.
--
-- Además de los tiempos, **asserta la forma del plan** de cada consulta, tal como la corre la RPC
-- (sentencia preparada con plan genérico: plpgsql pasa a él tras unas llamadas): usa el índice que
-- la sostiene, no recorre la tabla y lo que descarta no crece con la profundidad del cursor. Si una
-- consulta cambia de forma, `db:medir` falla.
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
insert into public.leads (id, nombre, telefono_principal, creado_por) values
  ('00000000-0000-0000-0000-00000000f001', 'Medir volumen propio', '79900001', '00000000-0000-0000-0000-0000000000d1'),
  ('00000000-0000-0000-0000-00000000f002', 'Medir volumen ajeno', '79900002', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000f003', 'Medir otro propio', '79900003', '00000000-0000-0000-0000-0000000000d1');

-- Sin triggers para la siembra (cada seguimiento actualizaría el lead): no es lo que se mide.
set local session_replication_role = replica;
insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, detalle_doc, detalle_texto, ocurrido_en)
select v.l, v.u, (select id from public.tipos_seguimiento order by orden limit 1), 'Llamada ' || g,
  jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'paragraph',
    'content', jsonb_build_array(jsonb_build_object('type', 'text',
      'text', 'Habló del vehículo y quedó en volver a llamar la semana que viene, nota ' || g))))),
  'Habló del vehículo y quedó en volver a llamar la semana que viene, nota ' || g,
  now() - make_interval(mins => g * 30)
from generate_series(1, 20000) g,
     (values ('00000000-0000-0000-0000-00000000f001'::uuid, '00000000-0000-0000-0000-0000000000d1'::uuid),
             ('00000000-0000-0000-0000-00000000f002'::uuid, '00000000-0000-0000-0000-0000000000a1'::uuid)) v (l, u);
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en, completado_en)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f001', 'Recordar ' || g,
  case when g <= 1000 then now() - make_interval(hours => g) else now() + make_interval(hours => g) end,
  case when g > 2000 then now() - make_interval(hours => g) end
from generate_series(1, 5000) g;
-- Y 3.000 pendientes suyos sobre otro lead, entreverados en el tiempo: el índice por persona sola
-- los recorrería.
insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
select '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000f003', 'Otro ' || g,
  now() + make_interval(mins => g * 37 - 30000)
from generate_series(1, 3000) g;
set local session_replication_role = origin;
analyze public.seguimientos;
analyze public.recordatorios;
analyze public.leads;
analyze public.leads_asesores;

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

-- La forma del plan de una sentencia preparada, con plan genérico y como `authenticated`: usa
-- `p_indice`, ningún recorrido secuencial sobre las tablas de la lista y descarta a lo sumo
-- `p_descartes` filas. Informa además el tiempo.
create function pg_temp.forma(p_nombre text, p_execute text, p_indice text, p_descartes int) returns void
language plpgsql as $$
declare v_plan json; v_texto text; v_indices text[]; v_secuenciales text[]; v_descartadas numeric;
begin
  set local role authenticated;
  set local plan_cache_mode = force_generic_plan;
  execute 'explain (analyze, format json) ' || p_execute into v_plan;
  reset role;
  -- `json` (no `jsonb`) conserva el orden de las claves de cada nodo: el tipo va antes que la tabla.
  v_texto := v_plan::text;
  v_indices := array(select m[1] from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m);
  v_secuenciales := array(select m[1] from regexp_matches(v_texto,
    '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "(seguimientos|recordatorios)"', 'g') m);
  select coalesce(sum(m[1]::numeric), 0) into v_descartadas
    from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m;
  if not p_indice = any (v_indices) then
    raise exception '%: no usa %, usa % (plan: %)', p_nombre, p_indice, v_indices, v_plan;
  end if;
  if cardinality(v_secuenciales) > 0 then
    raise exception '%: recorre % entera (plan: %)', p_nombre, v_secuenciales, v_plan;
  end if;
  if v_descartadas > p_descartes then
    raise exception '%: descarta % filas, el tope es % (plan: %)', p_nombre, v_descartadas, p_descartes, v_plan;
  end if;
  raise notice 'medicion|%|%', p_nombre || ' (plan)', round((v_plan -> 0 ->> 'Execution Time')::numeric, 2);
end $$;

-- Los cursores de una página profunda, leídos sin RLS (son sólo valores).
select set_config('medir.pendiente_en', (select recordar_en::text from public.recordatorios where lead_id = '00000000-0000-0000-0000-00000000f001' and completado_en is null order by recordar_en, id offset 1500 limit 1), true);
select set_config('medir.pendiente_id', (select id::text from public.recordatorios where lead_id = '00000000-0000-0000-0000-00000000f001' and completado_en is null order by recordar_en, id offset 1500 limit 1), true);
select set_config('medir.completado_en', (select completado_en::text from public.recordatorios where lead_id = '00000000-0000-0000-0000-00000000f001' and completado_en is not null order by completado_en desc, id desc offset 2500 limit 1), true);
select set_config('medir.completado_id', (select id::text from public.recordatorios where lead_id = '00000000-0000-0000-0000-00000000f001' and completado_en is not null order by completado_en desc, id desc offset 2500 limit 1), true);

select set_config('medir.seguimiento_en', (select ocurrido_en::text from public.seguimientos where lead_id = '00000000-0000-0000-0000-00000000f001' order by ocurrido_en desc, id desc offset 10000 limit 1), true);
select set_config('medir.seguimiento_id', (select id::text from public.seguimientos where lead_id = '00000000-0000-0000-0000-00000000f001' order by ocurrido_en desc, id desc offset 10000 limit 1), true);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);

-- Las dos ramas de `lead_seguimientos()` (los míos; los públicos), como las corre plpgsql.
prepare mios_desde(uuid, timestamptz, uuid) as
  select s.* from public.seguimientos s
   where s.lead_id = $1 and s.usuario_id = (select auth.uid()) and s.eliminado_en is null
     and (s.ocurrido_en, s.id) < ($2, $3)
   order by s.ocurrido_en desc, s.id desc limit 21;
prepare mios(uuid) as
  select s.* from public.seguimientos s
   where s.lead_id = $1 and s.usuario_id = (select auth.uid()) and s.eliminado_en is null
   order by s.ocurrido_en desc, s.id desc limit 21;
prepare publicos(uuid) as
  select s.* from public.seguimientos s
   where s.lead_id = $1 and s.visibilidad = 'publico' and s.eliminado_en is null
   order by s.ocurrido_en desc, s.id desc limit 21;

select pg_temp.forma('seguimientos míos, página 1', $$execute mios('00000000-0000-0000-0000-00000000f001')$$,
  'seguimientos_lead_autor_idx', 0);
select pg_temp.forma('seguimientos míos, página 501', format('execute mios_desde(%L, %L, %L)',
  '00000000-0000-0000-0000-00000000f001', current_setting('medir.seguimiento_en'), current_setting('medir.seguimiento_id')),
  'seguimientos_lead_autor_idx', 0);
select pg_temp.forma('seguimientos públicos de un lead con 20.000 privados ajenos', $$execute publicos('00000000-0000-0000-0000-00000000f002')$$,
  'seguimientos_lead_publicos_idx', 0);
select pg_temp.forma('seguimientos míos de un lead con 20.000 privados ajenos', $$execute mios('00000000-0000-0000-0000-00000000f002')$$,
  'seguimientos_lead_autor_idx', 0);

-- Las consultas de `lead_recordatorios()` y del aviso de `lead_ficha()`, como las corre plpgsql.
prepare pendientes(uuid) as
  select r.* from public.recordatorios r
   where r.usuario_id = (select auth.uid()) and r.lead_id = $1 and r.completado_en is null and r.eliminado_en is null
   order by r.recordar_en, r.id limit 21;
prepare pendientes_desde(uuid, timestamptz, uuid) as
  select r.* from public.recordatorios r
   where r.usuario_id = (select auth.uid()) and r.lead_id = $1 and r.completado_en is null and r.eliminado_en is null
     and (r.recordar_en, r.id) > ($2, $3)
   order by r.recordar_en, r.id limit 21;
prepare completados_desde(uuid, timestamptz, uuid) as
  select r.* from public.recordatorios r
   where r.usuario_id = (select auth.uid()) and r.lead_id = $1 and r.completado_en is not null and r.eliminado_en is null
     and (r.completado_en, r.id) < ($2, $3)
   order by r.completado_en desc, r.id desc limit 21;
prepare vencidos(uuid) as
  select count(*) from (
    select 1 from public.recordatorios r
     where r.usuario_id = (select auth.uid()) and r.lead_id = $1
       and r.completado_en is null and r.eliminado_en is null and r.recordar_en <= now()
     order by r.recordar_en limit 21) x;

select pg_temp.forma('recordatorios pendientes, página 1', $$execute pendientes('00000000-0000-0000-0000-00000000f001')$$,
  'recordatorios_lead_pendientes_idx', 0);
select pg_temp.forma('recordatorios pendientes, página 76', format('execute pendientes_desde(%L, %L, %L)',
  '00000000-0000-0000-0000-00000000f001', current_setting('medir.pendiente_en'), current_setting('medir.pendiente_id')),
  'recordatorios_lead_pendientes_idx', 0);
select pg_temp.forma('recordatorios completados, página 126', format('execute completados_desde(%L, %L, %L)',
  '00000000-0000-0000-0000-00000000f001', current_setting('medir.completado_en'), current_setting('medir.completado_id')),
  'recordatorios_lead_completados_idx', 0);
select pg_temp.forma('aviso de vencidos (hasta 21)', $$execute vencidos('00000000-0000-0000-0000-00000000f001')$$,
  'recordatorios_lead_pendientes_idx', 0);

select pg_temp.medir('lead_recordatorios, pendientes página 1',
  $$select public.lead_recordatorios('00000000-0000-0000-0000-00000000f001', false, null, null, 20)$$);
select pg_temp.medir('lead_recordatorios, completados página 126', format(
  'select public.lead_recordatorios(%L, true, %L, %L, 20)', '00000000-0000-0000-0000-00000000f001',
  current_setting('medir.completado_en'), current_setting('medir.completado_id')));
select pg_temp.medir('lead_ficha (con el aviso de vencidos)',
  $$select public.lead_ficha('00000000-0000-0000-0000-00000000f001')$$);
select pg_temp.medir('lead_seguimientos, página 1 (autora)',
  $$select public.lead_seguimientos('00000000-0000-0000-0000-00000000f001', null, null, 20)$$);
select pg_temp.medir('lead_seguimientos, página 1 («todos», 20.000 privados ajenos)',
  $$select public.lead_seguimientos('00000000-0000-0000-0000-00000000f002', null, null, 20)$$);
select pg_temp.medir('lead_seguimientos, página 501 (autora)', format(
  'select public.lead_seguimientos(%L, %L, %L, 20)', '00000000-0000-0000-0000-00000000f001',
  current_setting('medir.seguimiento_en'), current_setting('medir.seguimiento_id')));
select pg_temp.medir('lead_seguimiento, uno por su id (Recargar)', format(
  'select public.lead_seguimiento(%L, %L)', '00000000-0000-0000-0000-00000000f001', current_setting('medir.seguimiento_id')));

rollback;
