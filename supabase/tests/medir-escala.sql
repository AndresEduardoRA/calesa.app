-- Medición de escala de toda la app (9e), sobre el volumen de `pnpm db:sembrar-volumen` (50.000 leads,
-- 10.000 vehículos, 200.000 seguimientos…). `pnpm db:medir:volumen` la corre; con la base de la semilla
-- (sin volumen) se niega. Cada consulta corre COMO `authenticated`, con los claims de la dueña («todos»)
-- o de Ana (la asesora de la semilla, «propios»): la RLS cuenta, medir como `postgres` no vale. Todo en
-- una transacción que se revierte.
--
-- Cada fila: la consulta tal como la corre la app (PostgREST o plpgsql), el índice que la sostiene, las
-- tablas que NO se pueden recorrer enteras y cuántas filas se pueden descartar. Se asserta con plan
-- genérico, que es el que usa plpgsql tras unas llamadas. Si una consulta cambia de forma, falla.
\set ON_ERROR_STOP 1
begin;

do $$ begin
  if (select count(*) from public.leads where nombre like 'Volumen %') < 50000 then
    raise exception 'Sin volumen: corre pnpm db:sembrar-volumen (y después pnpm db:reset).';
  end if;
end $$;

-- Los claims de la persona que mide: `request.jwt.claim.sub` (lo que lee `auth.uid()`) y `request.jwt.claims`.
create function pg_temp.quien(p_quien text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', case p_quien
    when 'duena' then '00000000-0000-0000-0000-0000000000d1'
    when 'berta' then '00000000-0000-0000-0000-0000000000b1'
    else '00000000-0000-0000-0000-0000000000a1' end, true);
  perform set_config('request.jwt.claims', json_build_object('sub', current_setting('request.jwt.claim.sub'),
    'role', 'authenticated')::text, true);
end $$;

-- Mide `p_sql` como `authenticated` (o `p_rol`): la mediana de 5 corridas (de 7) y la forma del plan
-- genérico. Asserta el **presupuesto de tiempo** (`p_ms`: unas 4 veces lo medido, para que lo atrape un
-- cambio de forma y no el ruido de la máquina) y, si `p_indice` no es nulo, la forma del plan: usa ese
-- índice, ningún recorrido secuencial sobre `p_tablas` y a lo sumo `p_descartes` filas descartadas. Una
-- RPC de plpgsql es opaca para `explain`: su forma se asserta sobre la consulta de adentro.
create function pg_temp.escala(p_nombre text, p_quien text, p_sql text, p_ms numeric default null, p_indice text default null,
                               p_tablas text[] default '{}', p_descartes int default 0, p_rol text default 'authenticated')
returns void language plpgsql as $$
declare v_plan json; v_texto text; v_tiempos numeric[] := '{}'; v_mediana numeric; i int;
        v_indices text[]; v_secuenciales text[]; v_descartadas numeric; v_tabla text;
begin
  perform pg_temp.quien(p_quien);
  execute format('set local role %I', p_rol);
  set local plan_cache_mode = force_generic_plan;
  for i in 1..7 loop
    execute 'explain (analyze, format json) ' || p_sql into v_plan;
    if i > 2 then v_tiempos := v_tiempos || ((v_plan -> 0 ->> 'Execution Time')::numeric); end if;
  end loop;
  reset role;
  select percentile_cont(0.5) within group (order by t) into v_mediana from unnest(v_tiempos) t;
  v_texto := v_plan::text;
  v_indices := array(select distinct m[1] from regexp_matches(v_texto, '"Index Name": "([^"]+)"', 'g') m);
  v_secuenciales := array(select distinct m[1] from regexp_matches(v_texto, '"Node Type": "Seq Scan"[^{}]*?"Relation Name": "([a-z_]+)"', 'g') m);
  select coalesce(sum(m[1]::numeric), 0) into v_descartadas from regexp_matches(v_texto, '"Rows Removed by Filter": (\d+)', 'g') m;
  raise notice 'medicion|% [%]|%', p_nombre, p_quien, round(v_mediana, 1);
  raise notice 'plan|% [%]|indices=%|seq=%|descartadas=%', p_nombre, p_quien, v_indices, v_secuenciales, v_descartadas;
  if p_indice is not null then
    if not p_indice = any (v_indices) then
      raise exception '% [%]: no usa %, usa % (plan: %)', p_nombre, p_quien, p_indice, v_indices, v_plan;
    end if;
    foreach v_tabla in array p_tablas loop
      if v_tabla = any (v_secuenciales) then
        raise exception '% [%]: recorre % entera (plan: %)', p_nombre, p_quien, v_tabla, v_plan;
      end if;
    end loop;
    if v_descartadas > p_descartes then
      raise exception '% [%]: descarta % filas, el tope es % (plan: %)', p_nombre, p_quien, v_descartadas, p_descartes, v_plan;
    end if;
  end if;
  if p_ms is not null and v_mediana > p_ms then
    raise exception '% [%]: tarda % ms, el presupuesto es % ms', p_nombre, p_quien, round(v_mediana, 1), p_ms;
  end if;
end $$;

-- --- El terreno, leído sin RLS ------------------------------------------------------------------------
select set_config('medir.embudo', (select id::text from public.embudos where usuario_id = '00000000-0000-0000-0000-0000000000d1' and es_default), true);
select set_config('medir.etapa', (select etapa_id::text from public.oportunidades where usuario_id = '00000000-0000-0000-0000-0000000000d1'
  group by etapa_id order by count(*) desc limit 1), true);
select set_config('medir.op_en', (select ultima_actividad_en::text from public.oportunidades where etapa_id = current_setting('medir.etapa')::uuid
  order by ultima_actividad_en desc, id desc offset 449 limit 1), true);
select set_config('medir.op_id', (select id::text from public.oportunidades where etapa_id = current_setting('medir.etapa')::uuid
  order by ultima_actividad_en desc, id desc offset 449 limit 1), true);
select set_config('medir.lead_duena', (select id::text from public.leads where nombre like 'Volumen 20 %'), true);
select set_config('medir.lead_ana', (select id::text from public.leads where nombre like 'Volumen 20001 %'), true);
select set_config('medir.cursor_en', (select creado_en::text from public.leads where creado_por = '00000000-0000-0000-0000-0000000000d1' and eliminado_en is null
  order by creado_en desc, id desc offset 5000 limit 1), true);
select set_config('medir.cursor_id', (select id::text from public.leads where creado_por = '00000000-0000-0000-0000-0000000000d1' and eliminado_en is null
  order by creado_en desc, id desc offset 5000 limit 1), true);
select set_config('medir.et_duena', (select id::text from public.etiquetas where nombre = 'Vol 1' and usuario_id = '00000000-0000-0000-0000-0000000000d1'), true);
select set_config('medir.et_ana', (select id::text from public.etiquetas where nombre = 'Vol 1' and usuario_id = '00000000-0000-0000-0000-0000000000a1'), true);
select set_config('medir.origen', (select id::text from public.origenes where tipo = 'subasta' order by orden limit 1), true);
select set_config('medir.vcursor_en', (select creado_en::text from public.vehiculos where origen_id = current_setting('medir.origen')::uuid and eliminado_en is null
  order by creado_en desc, id desc offset 2000 limit 1), true);
select set_config('medir.vcursor_id', (select id::text from public.vehiculos where origen_id = current_setting('medir.origen')::uuid and eliminado_en is null
  order by creado_en desc, id desc offset 2000 limit 1), true);

-- La página del listado de leads, como la arma PostgREST sobre `leads_vista`.
create function pg_temp.pagina(p_donde text) returns text language sql as $$
  select format('select coalesce(json_agg(t), ''[]'') from (select id, numero, nombre, telefono_principal, en_cartera, tipo, origen_lead_id, creado_en,
    atributos -> ''ciudad_vol'' as a_ciudad, es_favorito, esta_tachado, etiquetas from public.leads_vista where %s order by creado_en desc, id desc limit 51) t', p_donde);
$$;

do $medir$ declare q text; begin
  foreach q in array array['duena', 'ana'] loop
    -- El listado. La página 1 camina `leads_listado_idx` sin recorrer `leads` ni descartar de más.
    perform pg_temp.escala('listado: página 1 (tachados ocultos)', q, pg_temp.pagina('esta_tachado = false'), 100, 'leads_listado_idx', '{leads}', 3000);
    perform pg_temp.escala('listado: página 100 por cursor', q, pg_temp.pagina(format('esta_tachado = false and creado_en <= %L and (creado_en < %L or id < %L)',
      current_setting('medir.cursor_en'), current_setting('medir.cursor_en'), current_setting('medir.cursor_id'))), 1200, 'leads_listado_idx', '{leads}', 60000);
    perform pg_temp.escala('listado: un atributo', q, pg_temp.pagina($w$atributos ->> 'ciudad_vol' = 'lp' and esta_tachado = false$w$), 300, 'leads_listado_idx', '{leads}', 60000);
    -- Peor caso aceptado: un filtro que no coincide con nadie recorre la cartera visible (~80 µs por lead).
    perform pg_temp.escala('listado: un atributo sin resultados (recorre la cartera visible)', q, pg_temp.pagina($w$atributos ->> 'ciudad_vol' = 'nada' and esta_tachado = false$w$), 12000);
    perform pg_temp.escala('listado: búsqueda que coincide con pocos', q, pg_temp.pagina($w$nombre ilike '%Volumen 4999% Gómez%'$w$), 1500);
    perform pg_temp.escala('listado: búsqueda sin resultados (recorre la cartera visible)', q, pg_temp.pagina($w$nombre ilike '%zzzzqx%'$w$), 1500);
    perform pg_temp.escala('listado: sólo favoritos', q, pg_temp.pagina('es_favorito = true and esta_tachado = false'), 500);
    perform pg_temp.escala('listado: sólo tachados', q, pg_temp.pagina('esta_tachado = true'), 500);
    perform pg_temp.escala('listado: etiqueta', q, pg_temp.pagina(format('etiquetas && array[%L::uuid] and esta_tachado = false', case q when 'duena' then current_setting('medir.et_duena') else current_setting('medir.et_ana') end)), 1500);
    -- Los números que se muestran: hasta el tope, por el índice del listado, nunca el total.
    perform pg_temp.escala('listado: ocultos hasta 51', q, 'select id from public.leads_vista where esta_tachado = true order by creado_en desc, id desc limit 51', 100);
    perform pg_temp.escala('listado: ocultos con un atributo, hasta 51', q, $w$select id from public.leads_vista where esta_tachado = true and atributos ->> 'ciudad_vol' = 'lp' order by creado_en desc, id desc limit 51$w$, 2500);
    perform pg_temp.escala('exportar: conteo hasta 5.001', q, 'select id from public.leads_vista where en_cartera = true order by creado_en desc, id desc limit 5001', 3000);
    perform pg_temp.escala('etiquetas_vista', q, 'select id, nombre, leads from public.etiquetas_vista order by nombre', 300);
    perform pg_temp.escala('papelera de leads, página 1 de 5 lotes', q, 'select public.leads_papelera_listar(null, null, false, 6)', 400);
    perform pg_temp.escala('importaciones recientes', q, 'select public.leads_importaciones_recientes()', 300);
    -- Un lead.
    perform pg_temp.escala('lead_ficha', q, format('select public.lead_ficha(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 80);
    perform pg_temp.escala('lead_cartera', q, format('select public.lead_cartera(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 50);
    perform pg_temp.escala('lead_cartera_candidatos', q, format('select public.lead_cartera_candidatos(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 50);
    perform pg_temp.escala('lead_oportunidades', q, format('select public.lead_oportunidades(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 150);
    perform pg_temp.escala('lead_vehiculos', q, format('select public.lead_vehiculos(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 50);
    -- El kanban.
    if q = 'duena' then
      perform pg_temp.escala('kanban: tablero (50 por columna, total hasta 500)', q, format('select public.embudo_tablero(%L, 50, 500)', current_setting('medir.embudo')), 800);
      perform pg_temp.escala('kanban: «Ver más», página 10 de la columna de 8.000', q, format('select public.embudo_etapa_pagina(%L, %L, %L, 50)',
        current_setting('medir.etapa'), current_setting('medir.op_en'), current_setting('medir.op_id')), 500);
      -- Lo de adentro. Bajo la policy de `oportunidades` (`lead_id = any(_mis_leads_vivos())`, un arreglo de
      -- tamaño desconocido) Postgres elige `oportunidades_lead_id_idx` y ordena las de la persona: cuesta lo
      -- que tiene la persona (~2 µs por oportunidad), no lo que tiene la columna. Límite anotado.
      perform pg_temp.escala('kanban: primera página de una columna (la consulta)', q, format('select o.id from public.oportunidades o where o.etapa_id = %L order by o.ultima_actividad_en desc, o.id desc limit 51', current_setting('medir.etapa')),
        100);
      perform pg_temp.escala('kanban: «Ver más» de una columna (la consulta)', q, format('select o.id from public.oportunidades o where o.etapa_id = %L and (o.ultima_actividad_en, o.id) < (%L, %L) order by o.ultima_actividad_en desc, o.id desc limit 51',
        current_setting('medir.etapa'), current_setting('medir.op_en'), current_setting('medir.op_id')), 100);
      perform pg_temp.escala('kanban: el total acotado de una columna', q, format('select count(*) from (select 1 from public.oportunidades o2 where o2.etapa_id = %L limit 501) q', current_setting('medir.etapa')),
        100);
    end if;
    -- Vehículos y configuración.
    perform pg_temp.escala('vehículos: página 1', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L order by creado_en desc, id desc limit 51) t$w$, current_setting('medir.origen')), 20, 'vehiculos_origen_listado_idx', '{vehiculos}', 0);
    perform pg_temp.escala('vehículos: página 40 por cursor', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L and (creado_en, id) < (%L, %L) order by creado_en desc, id desc limit 51) t$w$, current_setting('medir.origen'),
      current_setting('medir.vcursor_en'), current_setting('medir.vcursor_id')), 20, 'vehiculos_origen_listado_idx', '{vehiculos}', 0);
    perform pg_temp.escala('vehículos: búsqueda', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L and (titulo ilike '%%Toyota 99%%' or vin ilike '%%99%%') order by creado_en desc, id desc limit 51) t$w$, current_setting('medir.origen')), 100, 'vehiculos_origen_listado_idx', '{vehiculos}', 20000);
    perform pg_temp.escala('vehículos: filtro de limpieza', q, format($w$select coalesce(json_agg(t), '[]') from (select v.id, v.titulo, v.creado_en, public.limpieza_el(v) from public.vehiculos v
      where v.origen_id = %L and public.limpieza_el(v) <= now() + interval '30 days' order by v.creado_en desc, v.id desc limit 51) t$w$, current_setting('medir.origen')), 150, 'vehiculos_origen_listado_idx', '{vehiculos}', 5000);
    perform pg_temp.escala('papelera de vehículos, página 1 de 5 lotes', q, 'select public.vehiculos_papelera_listar(null, null, false, 6)', 200);
    perform pg_temp.escala('storage_gc_pendiente', q, 'select public.storage_gc_pendiente()', 50);
    if q = 'duena' then perform pg_temp.escala('origenes_resumen', q, 'select public.origenes_resumen()', 100); end if;
    if q = 'duena' then perform pg_temp.escala('categorias_con_uso', q, format('select public.categorias_con_uso(%L)', current_setting('medir.origen')), 50); end if;
    perform pg_temp.escala('vehiculos_para_lead', q, format('select public.vehiculos_para_lead(%L, %L)',
      case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end, 'toyota'), 300);
    if q = 'duena' then perform pg_temp.escala('baja de una persona (vista previa)', q, $w$select public.equipo_vista_previa_baja('00000000-0000-0000-0000-0000000000a1')$w$, 100); end if;
  end loop;

  -- Quien no tiene ningún tachado ni favorito (Berta, con 7.000 leads) no recorre su cartera para saberlo.
  perform pg_temp.escala('listado: ocultos hasta 51 de quien no tiene ninguno', 'berta', 'select id from public.leads_vista where esta_tachado = true order by creado_en desc, id desc limit 51', 30);
  perform pg_temp.escala('listado: sólo favoritos de quien no tiene ninguno', 'berta', pg_temp.pagina('es_favorito = true and esta_tachado = false'), 30);

  -- Lo que usa la papelera, como lo corre la base (sin RLS: `security definer`). La cola de Storage, con 100.000
  -- filas, la mide `medir-jobs.sql`.
  perform pg_temp.escala('papeleras: una página de lotes (la consulta)', 'duena',
    $w$select l.id from public.lotes_papelera l where l.tipo = 'leads' and l.purgado_en is null and l.restaurado_en is null order by l.creado_en desc, l.id desc limit 6$w$,
    50, 'lotes_papelera_tipo_idx', '{lotes_papelera}', 0, 'postgres');
end $medir$;

rollback;
