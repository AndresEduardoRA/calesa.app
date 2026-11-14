-- Medición de los choques de teléfonos extra (`telefonos_extra_choques()`, Configuración › Leads › Teléfonos extra): `pnpm db:medir:volumen`, contra el Supabase LOCAL.
-- Todo en una transacción que se revierte: ningún lead ni extra queda. No necesita la siembra de volumen: arma su terreno con `generate_series`.
--
-- Qué se mide: la llamada como la dueña (`leads.configurar`) con 30.000 extras sin ningún choque (el peor caso: no halla filas que devolver, así que recorre
-- las 10.000 de su tope y responde `recorrido_cortado`) y otra vez con 60.000; después una con choques repartidos (devuelve su página sin recorrer todo).
--
-- Asserta:
--   - Assert 1, el plan de la consulta de recorrido (el mismo texto que la función): `Index Scan` por `leads_telefonos_pkey`, sin `Sort` encima ni `Seq Scan` de `leads_telefonos`
--     ni de `leads`, y la búsqueda del principal por `leads_telefono_unico` y la del otro extra por `leads_telefonos_telefono_idx`;
--   - Assert 2, por relación (`pg_stat_get_xact_blocks_fetched`, promedio de las 5 calientes): lo leído con 60.000 extras es a lo sumo 1,2 × lo leído con 30.000 + 50
--     (el recorrido tiene tope: no crece con N);
--   - Assert 3, ≤ 400 ms por llamada en el peor caso; la página con choques devuelve `hay_mas` y se corta sin recorrer todo (menos bloques que el peor caso).
\set ON_ERROR_STOP 1
begin;
do $$ begin
  if transaction_timestamp() = statement_timestamp() then raise exception 'la medición tiene que correr dentro de su begin'; end if;
end $$;

create temp table _p (id uuid);
do $$
declare v_duena uuid := gen_random_uuid(); v_web uuid := (select id from public.origenes_lead where clave = 'web');
begin
  -- La primera cuenta nace dueña (todos los permisos, también leads.configurar).
  if exists (select 1 from public.perfiles) then
    select p.id into v_duena from public.perfiles p join public.usuarios_roles ur on ur.usuario_id = p.id join public.roles r on r.id = ur.rol_id
     where r.clave = 'dueno' and p.activo limit 1;
  else
    insert into auth.users (id, email, raw_app_meta_data) values (v_duena, v_duena || '@ejemplo.com', '{"invitado": true}');
  end if;
  insert into _p values (v_duena);
  set local session_replication_role = replica;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, tipo_lead_id, atributos)
  select 'Medir choques ' || g, '5918' || lpad(g::text, 8, '0'), v_duena, v_web, (select id from public.tipos_lead order by orden, id limit 1), '{}' from generate_series(1, 30000) g;
  -- 30.000 extras distintos entre sí y de todo principal: ningún choque.
  insert into public.leads_telefonos (lead_id, telefono)
  select l.id, '5917' || lpad(row_number() over (order by l.id)::text, 8, '0') from public.leads l where l.nombre like 'Medir choques %';
  set local session_replication_role = origin;
end $$;
analyze public.leads;
analyze public.leads_telefonos;

create temp table _rel as
select c.oid, c.relname::text as nombre from pg_class c
 where c.oid in ('public.leads_telefonos'::regclass, 'public.leads'::regclass)
    or c.oid in (select indexrelid from pg_index where indrelid in ('public.leads_telefonos'::regclass, 'public.leads'::regclass));
create temp table _med (fase text, ms numeric, bloques numeric, resultado jsonb);
grant select on _rel, _p to authenticated;
grant all on _med to authenticated;

create function pg_temp.como_duena() returns void language sql as $$
  select set_config('request.jwt.claim.sub', (select id from _p)::text, true),
         set_config('request.jwt.claims', json_build_object('sub', (select id from _p), 'role', 'authenticated')::text, true);
$$;

-- 7 llamadas (las 2 primeras calientan): mediana de ms y promedio de bloques leídos entre todas las relaciones.
create function pg_temp.medir(p_fase text, p_sql text) returns void language plpgsql as $$
declare i int; t0 timestamptz; v_ms numeric[] := '{}'; b0 numeric; b1 numeric; v_b numeric := 0; r jsonb;
begin
  for i in 1 .. 7 loop
    select sum(pg_stat_get_xact_blocks_fetched(oid)) into b0 from _rel;
    t0 := clock_timestamp();
    execute p_sql into r;
    select sum(pg_stat_get_xact_blocks_fetched(oid)) into b1 from _rel;
    continue when i <= 2;
    v_ms := v_ms || (extract(epoch from clock_timestamp() - t0) * 1000)::numeric;
    v_b := v_b + b1 - b0;
  end loop;
  insert into _med values (p_fase, (select percentile_cont(0.5) within group (order by m) from unnest(v_ms) m), round(v_b / 5, 1), r);
end $$;

set local role authenticated;
select pg_temp.como_duena();
select pg_temp.medir('n30', 'select public.telefonos_extra_choques()');
reset role;

-- 30.000 más (otros 30.000 extras sin choque): el recorrido tiene tope.
do $$ begin
  set local session_replication_role = replica;
  insert into public.leads_telefonos (lead_id, telefono)
  select l.id, '5916' || lpad(row_number() over (order by l.id)::text, 8, '0') from public.leads l where l.nombre like 'Medir choques %';
  set local session_replication_role = origin;
end $$;
analyze public.leads_telefonos;
set local role authenticated;
select pg_temp.como_duena();
select pg_temp.medir('n60', 'select public.telefonos_extra_choques()');
reset role;

-- Con choques repartidos (un extra por cada 250 igual al principal de otro): la página se llena y se corta antes del tope.
do $$ begin
  set local session_replication_role = replica;
  update public.leads_telefonos t set telefono = l2.telefono_principal
    from (select t3.id, row_number() over (order by t3.id) as k from public.leads_telefonos t3) x
    join public.leads l2 on l2.nombre = 'Medir choques ' || (x.k * 500 % 30000 + 1)
   where t.id = x.id and x.k % 250 = 0;
  set local session_replication_role = origin;
end $$;
set local role authenticated;
select pg_temp.como_duena();
select pg_temp.medir('choques', 'select public.telefonos_extra_choques()');
reset role;

-- El plan de la consulta de recorrido (la de la función, con cursor y sin él), con la RLS de la dueña.
create temp table _plan (ruta text, plan text);
grant all on _plan to authenticated;
do $$
declare v_plan jsonb; v_texto text; v_ruta text;
begin
  foreach v_ruta in array array['sin', 'con'] loop
    v_texto := 'select e.id, e.telefono, s.id as lead_id, o.id as otro_id from (select t.id, t.lead_id, t.telefono from public.leads_telefonos t '
      || case v_ruta when 'con' then 'where t.id > ''00000000-0000-4000-8000-000000000000'' ' else '' end
      || 'order by t.id limit 10001) e '
      || 'left join lateral (select x.id from public.leads x where x.id = e.lead_id and x.eliminado_en is null) s on true '
      || 'left join lateral (select q.id from (select x.id, 0 as orden from public.leads x where x.telefono_principal = e.telefono and x.eliminado_en is null and x.id <> e.lead_id '
      || 'union all select x.id, 1 from public.leads_telefonos t2 join public.leads x on x.id = t2.lead_id where t2.telefono = e.telefono and t2.id < e.id and t2.lead_id <> e.lead_id and x.eliminado_en is null) q '
      || 'order by q.orden, q.id limit 1) o on s.id is not null order by e.id';
    execute 'explain (format json) ' || v_texto into v_plan;
    insert into _plan values (v_ruta, v_plan::text);
  end loop;
end $$;

do $$
declare r record; v_fallas text := ''; n30 record; n60 record; ch record;
begin
  select * into n30 from _med where fase = 'n30'; select * into n60 from _med where fase = 'n60'; select * into ch from _med where fase = 'choques';
  for r in select * from _plan loop
    if r.plan !~ 'leads_telefonos_pkey' then v_fallas := v_fallas || E'\n  la ruta ' || r.ruta || ' no camina por leads_telefonos_pkey'; end if;
    -- El orden es el de la clave: ningún Sort arriba del recorrido (el de adentro es el de a lo sumo un par de filas de cada búsqueda).
    if (r.plan::jsonb -> 0 -> 'Plan' ->> 'Node Type') = 'Sort' then v_fallas := v_fallas || E'\n  la ruta ' || r.ruta || ' ordena todo el recorrido'; end if;
    if r.plan ~ '"Node Type": "Seq Scan", "Parallel Aware": (true|false), "Async Capable": false, "Relation Name": "leads_telefonos"' then
      v_fallas := v_fallas || E'\n  la ruta ' || r.ruta || ' recorre leads_telefonos entera';
    end if;
    if r.plan !~ 'leads_telefono_unico' then v_fallas := v_fallas || E'\n  la ruta ' || r.ruta || ' no busca el principal por leads_telefono_unico'; end if;
    if r.plan !~ 'leads_telefonos_telefono_idx' then v_fallas := v_fallas || E'\n  la ruta ' || r.ruta || ' no busca el otro extra por leads_telefonos_telefono_idx'; end if;
  end loop;
  if n60.bloques > n30.bloques * 1.2 + 50 then v_fallas := v_fallas || format(E'\n  los bloques crecen con N: %s con 30.000 y %s con 60.000', n30.bloques, n60.bloques); end if;
  if n60.ms > 400 or n30.ms > 400 then v_fallas := v_fallas || format(E'\n  el peor caso pasa de 400 ms: %s y %s', n30.ms, n60.ms); end if;
  if (n30.resultado ->> 'recorrido_cortado')::boolean is not true then v_fallas := v_fallas || E'\n  el peor caso debía cortar el recorrido'; end if;
  if (ch.resultado ->> 'hay_mas')::boolean is not true or jsonb_array_length(ch.resultado -> 'filas') <> 20 then v_fallas := v_fallas || E'\n  la página con choques debía llenarse y tener más'; end if;
  if ch.bloques >= n30.bloques then v_fallas := v_fallas || format(E'\n  la página con choques no corta antes del tope: %s contra %s', ch.bloques, n30.bloques); end if;
  raise notice 'medicion|Choques de teléfonos extra · peor caso con 30.000 extras (ms)|%', round(n30.ms, 2);
  raise notice 'medicion|Choques de teléfonos extra · peor caso con 60.000 extras (ms)|%', round(n60.ms, 2);
  raise notice 'medicion|Choques de teléfonos extra · peor caso con 30.000 extras (bloques)|%', n30.bloques;
  raise notice 'medicion|Choques de teléfonos extra · peor caso con 60.000 extras (bloques)|%', n60.bloques;
  raise notice 'medicion|Choques de teléfonos extra · página con choques (ms)|%', round(ch.ms, 2);
  raise notice 'medicion|Choques de teléfonos extra · página con choques (bloques)|%', ch.bloques;
  if v_fallas <> '' then raise exception 'Los choques de teléfonos extra rompen su presupuesto:%', v_fallas; end if;
end $$;
rollback;
