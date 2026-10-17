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

-- Los tamaños de página, de `paginacion.ts` y de lo que declara cada lista (los pasa `scripts/medir-listado.mjs` como
-- variables de psql: acá no se escribe ningún tamaño a mano). `max_*` es el máximo del selector de esa lista.
select set_config('medir.max_leads', :'max_leads', true), set_config('medir.max_vehiculos', :'max_vehiculos', true),
       set_config('medir.tam_columna', :'tam_columna', true), set_config('medir.tope_cargado', :'tope_cargado', true),
       set_config('medir.lotes', :'lotes', true);

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
-- El origen del lead: el primero (el volumen reparte los leads entre los cinco primeros) y el último, que no tiene ninguno.
select set_config('medir.origen_lead', (select id::text from public.origenes_lead order by orden, id limit 1), true);
select set_config('medir.origen_lead_dos', (select id::text from public.origenes_lead order by orden, id offset 1 limit 1), true);
select set_config('medir.origen_lead_sin', (select id::text from public.origenes_lead order by orden desc, id limit 1), true);
-- Los números de la numeración (9f-2): un global de la dueña, y un número propio de Ana con su id (Ana lo busca como `#n`).
select set_config('medir.num_global', (select numero::text from public.leads where nombre like 'Volumen 20 %'), true);
select set_config('medir.num_propio_ana', (select numero_propio::text from public.leads where nombre like 'Volumen 20001 %'), true);
-- Un origen con un solo lead (el peor caso de la sonda «¿lo usa algún lead?»): se crea aquí y se revierte con la transacción.
insert into public.origenes_lead (clave, nombre, orden) values ('medir_uno', 'Medir uno', 9990);
select set_config('medir.origen_lead_uno', (select id::text from public.origenes_lead where clave = 'medir_uno'), true);
set local session_replication_role = replica;
update public.leads set origen_lead_id = current_setting('medir.origen_lead_uno')::uuid
  where id = (select id from public.leads where nombre like 'Volumen %' and eliminado_en is null order by ctid desc limit 1);
set local session_replication_role = origin;
analyze public.leads;
select set_config('medir.origen', (select id::text from public.origenes where tipo = 'subasta' order by orden limit 1), true);
select set_config('medir.vcursor_en', (select creado_en::text from public.vehiculos where origen_id = current_setting('medir.origen')::uuid and eliminado_en is null
  order by creado_en desc, id desc offset 2000 limit 1), true);
select set_config('medir.vcursor_id', (select id::text from public.vehiculos where origen_id = current_setting('medir.origen')::uuid and eliminado_en is null
  order by creado_en desc, id desc offset 2000 limit 1), true);

-- Cuántas veces se llama a una función mientras corre una consulta como `p_quien` (`track_functions` es de superusuario:
-- se enciende antes de cambiar de rol). Sirve para probar que el permiso se calcula una vez por consulta y no por fila.
create function pg_temp.llamadas(p_nombre text, p_quien text, p_sql text, p_funcion regprocedure, p_tope int) returns void language plpgsql as $$
declare v bigint; v_antes bigint;
begin
  perform pg_temp.quien(p_quien);
  set local track_functions = 'all';
  -- El contador de la transacción acumula todo lo que corrió antes: se mide la diferencia.
  select coalesce(max(calls), 0) into v_antes from pg_stat_xact_user_functions where funcid = p_funcion::oid;
  set local role authenticated;
  execute p_sql;
  reset role;
  perform pg_stat_clear_snapshot();
  select coalesce(max(calls), 0) - v_antes into v from pg_stat_xact_user_functions where funcid = p_funcion::oid;
  raise notice 'medicion|% [%] llamadas a %|%', p_nombre, p_quien, p_funcion, v;
  if v > p_tope then
    raise exception '% [%]: % se llamó % veces para una página, el tope es % (se está calculando por fila)', p_nombre, p_quien, p_funcion, v, p_tope;
  end if;
end $$;

-- La página del listado de leads, como la arma PostgREST sobre `leads_vista`.
create function pg_temp.pagina(p_donde text, p_n int default 50) returns text language sql as $$
  select format('select coalesce(json_agg(t), ''[]'') from (select id, numero, numero_propio, numero_visible, nombre, telefono_principal, en_cartera, tipo, origen_lead_id, creado_en,
    atributos -> ''ciudad_vol'' as a_ciudad, es_favorito, esta_tachado, etiquetas from public.leads_vista where %s order by creado_en desc, id desc limit %s) t', p_donde, p_n + 1);
$$;

do $medir$ declare q text; begin
  foreach q in array array['duena', 'ana'] loop
    -- El listado. La página 1 camina `leads_listado_idx` sin recorrer `leads` ni descartar de más.
    perform pg_temp.escala('listado: página 1 (tachados ocultos)', q, pg_temp.pagina('esta_tachado = false'), 100, 'leads_listado_idx', '{leads}', 3000);
    perform pg_temp.escala('listado: página 100 por cursor', q, pg_temp.pagina(format('esta_tachado = false and creado_en <= %L and (creado_en < %L or id < %L)',
      current_setting('medir.cursor_en'), current_setting('medir.cursor_en'), current_setting('medir.cursor_id'))), 1200, 'leads_listado_idx', '{leads}', 60000);
    -- Con el máximo que ofrece el selector (9g): la misma consulta con una página más larga. La página 1 y una profunda
    -- siguen por `leads_listado_idx`, sin recorrer `leads` ni descartar de más.
    perform pg_temp.escala('listado: página 1 con el máximo de la lista', q, pg_temp.pagina('esta_tachado = false', current_setting('medir.max_leads')::int), 100, 'leads_listado_idx', '{leads}', 3000);
    perform pg_temp.escala('listado: página 100 por cursor con el máximo de la lista', q, pg_temp.pagina(format('esta_tachado = false and creado_en <= %L and (creado_en < %L or id < %L)',
      current_setting('medir.cursor_en'), current_setting('medir.cursor_en'), current_setting('medir.cursor_id')), current_setting('medir.max_leads')::int), 1200, 'leads_listado_idx', '{leads}', 60000);
    perform pg_temp.escala('listado: un atributo', q, pg_temp.pagina($w$atributos ->> 'ciudad_vol' = 'lp' and esta_tachado = false$w$), 300, 'leads_listado_idx', '{leads}', 60000);
    -- Peor caso aceptado: un filtro que no coincide con nadie recorre la cartera visible (~80 µs por lead).
    perform pg_temp.escala('listado: un atributo sin resultados (recorre la cartera visible)', q, pg_temp.pagina($w$atributos ->> 'ciudad_vol' = 'nada' and esta_tachado = false$w$), 12000);
    perform pg_temp.escala('listado: búsqueda que coincide con pocos', q, pg_temp.pagina($w$nombre ilike '%Volumen 4999% Gómez%'$w$), 1500);
    perform pg_temp.escala('listado: búsqueda sin resultados (recorre la cartera visible)', q, pg_temp.pagina($w$nombre ilike '%zzzzqx%'$w$), 1500);
    perform pg_temp.escala('listado: sólo favoritos', q, pg_temp.pagina('es_favorito = true and esta_tachado = false'), 500);
    perform pg_temp.escala('listado: sólo tachados', q, pg_temp.pagina('esta_tachado = true'), 500);
    perform pg_temp.escala('listado: etiqueta', q, pg_temp.pagina(format('etiquetas && array[%L::uuid] and esta_tachado = false', case q when 'duena' then current_setting('medir.et_duena') else current_setting('medir.et_ana') end)), 1500);
    -- El filtro por origen del lead (`?origen=`): uno de cinco (un quinto de la cartera) y uno sin leads.
    -- El filtro por origen del lead (`?origen=`), sostenido por `leads_origen_lead_id_idx` (el de la FK). Cuesta lo
    -- que suman los leads de ese origen (~10 µs cada uno: un bitmap y un top-N), no la página: el planificador
    -- estima mal lo que deja pasar la policy de `leads` y no camina un índice compuesto en el orden del listado
    -- (con `(origen_lead_id, creado_en desc, id desc)` forzado la página cuesta 3 ms, pero no lo elige). Un
    -- origen sin leads no recorre nada. Límite anotado en `docs/RENDIMIENTO.md`.
    perform pg_temp.escala('listado: un origen del lead (cuesta lo que suma ese origen)', q, pg_temp.pagina(format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.origen_lead'))), 450, 'leads_origen_lead_id_idx', '{leads}', 15000);
    perform pg_temp.escala('listado: un origen del lead sin leads', q, pg_temp.pagina(format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.origen_lead_sin'))), 100, 'leads_origen_lead_id_idx', '{leads}', 0);
    perform pg_temp.escala('listado: dos orígenes del lead (suma sus leads)', q, pg_temp.pagina(format('origen_lead_id = any (array[%L, %L]::uuid[]) and esta_tachado = false', current_setting('medir.origen_lead'), current_setting('medir.origen_lead_dos'))), 800, 'leads_origen_lead_id_idx', '{leads}', 30000);
    -- La numeración (9f-2). Los números salen de dos copias bajo su policy, como subconsultas de la lista de columnas
    -- (se evalúan sólo para las filas que salen, no para las que la consulta recorre): el permiso se pregunta una vez
    -- por consulta (`llamadas`) y la página profunda cuesta lo mismo que sin pedirlos. Buscar `#n` resuelve el número a un
    -- id leyendo la copia que corresponde por su índice único, sin recorrer `leads`.
    perform pg_temp.llamadas('listado: página 1, el permiso del número', q, pg_temp.pagina('esta_tachado = false'), 'public.tiene_permiso(text,uuid)'::regprocedure, 6);
    if q = 'duena' then
      perform pg_temp.escala('buscar #n con el permiso (el global)', q, format('select lead_id from public.leads_numeros_globales where numero = %s', current_setting('medir.num_global')),
        20, 'leads_numeros_globales_numero_key', '{leads,leads_numeros_globales}', 5);
    else
      perform pg_temp.escala('buscar #n sin el permiso (el propio)', q, format('select lead_id from public.leads_numeros_propios where creado_por = %L and numero = %s',
        '00000000-0000-0000-0000-0000000000a1', current_setting('medir.num_propio_ana')),
        20, 'leads_numeros_propios_creador_idx', '{leads,leads_numeros_propios}', 5);
    end if;
    -- Los números que se muestran: hasta el tope, por el índice del listado, nunca el total.
    perform pg_temp.escala('listado: ocultos hasta 51', q, 'select id from public.leads_vista where esta_tachado = true order by creado_en desc, id desc limit 51', 100);
    perform pg_temp.escala('listado: ocultos con un atributo, hasta 51', q, $w$select id from public.leads_vista where esta_tachado = true and atributos ->> 'ciudad_vol' = 'lp' order by creado_en desc, id desc limit 51$w$, 2500);
    perform pg_temp.escala('exportar: conteo hasta 5.001', q, 'select id from public.leads_vista where en_cartera = true order by creado_en desc, id desc limit 5001', 3000);
    perform pg_temp.escala('etiquetas_vista', q, 'select id, nombre, leads from public.etiquetas_vista order by nombre', 300);
    perform pg_temp.escala('papelera de leads, página 1 de 5 lotes', q, format('select public.leads_papelera_listar(null, null, false, %s)', current_setting('medir.lotes')::int + 1), 400);
    perform pg_temp.escala('importaciones recientes', q, 'select public.leads_importaciones_recientes()', 300);
    -- Un lead.
    perform pg_temp.escala('lead_ficha', q, format('select public.lead_ficha(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 80);
    perform pg_temp.escala('lead_cartera', q, format('select public.lead_cartera(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 50);
    perform pg_temp.escala('lead_cartera_candidatos', q, format('select public.lead_cartera_candidatos(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 50);
    perform pg_temp.escala('lead_oportunidades', q, format('select public.lead_oportunidades(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 150);
    perform pg_temp.escala('lead_vehiculos', q, format('select public.lead_vehiculos(%L)', case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end), 50);
    -- El kanban.
    if q = 'duena' then
      perform pg_temp.escala('kanban: tablero (50 por columna, total hasta 500)', q, format('select public.embudo_tablero(%L, %s, %s)', current_setting('medir.embudo'), current_setting('medir.tam_columna'), current_setting('medir.tope_cargado')), 800);
      perform pg_temp.escala('kanban: «Ver más», página 10 de la columna de 8.000', q, format('select public.embudo_etapa_pagina(%L, %L, %L, %s)',
        current_setting('medir.etapa'), current_setting('medir.op_en'), current_setting('medir.op_id'), current_setting('medir.tam_columna')), 500);
      -- Lo de adentro. Bajo la policy de `oportunidades` (`lead_id = any(_mis_leads_vivos())`, un arreglo de
      -- tamaño desconocido) Postgres elige `oportunidades_lead_id_idx` y ordena las de la persona: cuesta lo
      -- que tiene la persona (~2 µs por oportunidad), no lo que tiene la columna. Límite anotado.
      perform pg_temp.escala('kanban: primera página de una columna (la consulta)', q, format('select o.id from public.oportunidades o where o.etapa_id = %L order by o.ultima_actividad_en desc, o.id desc limit %s', current_setting('medir.etapa'), current_setting('medir.tam_columna')::int + 1),
        100);
      perform pg_temp.escala('kanban: «Ver más» de una columna (la consulta)', q, format('select o.id from public.oportunidades o where o.etapa_id = %L and (o.ultima_actividad_en, o.id) < (%L, %L) order by o.ultima_actividad_en desc, o.id desc limit %s',
        current_setting('medir.etapa'), current_setting('medir.op_en'), current_setting('medir.op_id'), current_setting('medir.tam_columna')::int + 1), 100);
      perform pg_temp.escala('kanban: el total acotado de una columna', q, format('select count(*) from (select 1 from public.oportunidades o2 where o2.etapa_id = %L limit %s) q', current_setting('medir.etapa'), current_setting('medir.tope_cargado')::int + 1),
        100);
    end if;
    -- Vehículos y configuración.
    -- Con el máximo que ofrece el selector (9g): página 1 y una profunda, por el mismo índice y sin descartar.
    perform pg_temp.escala('vehículos: página 1 con el máximo de la lista', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L order by creado_en desc, id desc limit %s) t$w$, current_setting('medir.origen'), current_setting('medir.max_vehiculos')::int + 1), 20, 'vehiculos_origen_listado_idx', '{vehiculos}', 0);
    perform pg_temp.escala('vehículos: página 20 por cursor con el máximo de la lista', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L and (creado_en, id) < (%L, %L) order by creado_en desc, id desc limit %s) t$w$, current_setting('medir.origen'),
      current_setting('medir.vcursor_en'), current_setting('medir.vcursor_id'), current_setting('medir.max_vehiculos')::int + 1), 20, 'vehiculos_origen_listado_idx', '{vehiculos}', 0);
    perform pg_temp.escala('vehículos: página 1', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L order by creado_en desc, id desc limit 51) t$w$, current_setting('medir.origen')), 20, 'vehiculos_origen_listado_idx', '{vehiculos}', 0);
    perform pg_temp.escala('vehículos: página 40 por cursor', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L and (creado_en, id) < (%L, %L) order by creado_en desc, id desc limit 51) t$w$, current_setting('medir.origen'),
      current_setting('medir.vcursor_en'), current_setting('medir.vcursor_id')), 20, 'vehiculos_origen_listado_idx', '{vehiculos}', 0);
    perform pg_temp.escala('vehículos: búsqueda', q, format($w$select coalesce(json_agg(t), '[]') from (select id, titulo, creado_en from public.vehiculos
      where origen_id = %L and (titulo ilike '%%Toyota 99%%' or vin ilike '%%99%%') order by creado_en desc, id desc limit 51) t$w$, current_setting('medir.origen')), 100, 'vehiculos_origen_listado_idx', '{vehiculos}', 20000);
    perform pg_temp.escala('vehículos: filtro de limpieza', q, format($w$select coalesce(json_agg(t), '[]') from (select v.id, v.titulo, v.creado_en, public.limpieza_el(v) from public.vehiculos v
      where v.origen_id = %L and public.limpieza_el(v) <= now() + interval '30 days' order by v.creado_en desc, v.id desc limit 51) t$w$, current_setting('medir.origen')), 150, 'vehiculos_origen_listado_idx', '{vehiculos}', 5000);
    perform pg_temp.escala('papelera de vehículos, página 1 de 5 lotes', q, format('select public.vehiculos_papelera_listar(null, null, false, %s)', current_setting('medir.lotes')::int + 1), 200);
    perform pg_temp.escala('storage_gc_pendiente', q, 'select public.storage_gc_pendiente()', 50);
    -- El alta con el contador: un upsert por la clave primaria, lo mismo con 20 leads que con 62.000.
    perform pg_temp.escala('alta de un lead (trigger del número propio incluido)', q, $w$select public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Medir alta',
      'telefono_principal', '7' || lpad(floor(random() * 9999999)::text, 7, '0'), 'origen_lead_id', (select id from public.origenes_lead order by orden limit 1)))$w$, 80);
    if q = 'duena' then
      perform pg_temp.escala('contador del número propio (upsert)', q, $w$insert into public.leads_contadores as c (usuario_id, ultimo) values ('00000000-0000-0000-0000-0000000000a1', 1)
        on conflict (usuario_id) do update set ultimo = c.ultimo + 1 returning c.ultimo$w$, 5, null, '{}', 0, 'postgres');  -- el arbitro es leads_contadores_pkey (no figura como «Index Name»)
    end if;
    if q = 'duena' then perform pg_temp.escala('origenes_lead_con_uso (hasta 100 orígenes)', q, 'select public.origenes_lead_con_uso()', 100); end if;
    -- Lo de adentro de `_origenes_lead_json()` y de `origen_lead_eliminar()`: «¿algún lead usa este origen?». Con
    -- `= o.id` el plan genérico estima un quinto de la tabla y recorre `leads` (5 ms con 62.000, creciendo con la
    -- tabla); la sonda por rango camina `leads_origen_lead_id_idx`. Se mide con el origen como columna (no como
    -- literal), que es lo que ve el plan genérico, y con uno que tiene un solo lead y uno que no tiene ninguno. Los
    -- 100 descartes son las filas de `origenes_lead` (a lo sumo 100), no de `leads`.
    if q = 'duena' then
      perform pg_temp.escala('origen del lead: con_leads de todos (la lista)', q,
        'select o.id, exists (select 1 from public.leads l where l.origen_lead_id >= o.id and l.origen_lead_id <= o.id) from public.origenes_lead o',
        20, 'leads_origen_lead_id_idx', '{leads}', 0, 'postgres');
      perform pg_temp.escala('origen del lead: eliminar, uno sin leads', q, format(
        'select exists (select 1 from public.leads l where l.origen_lead_id >= o.id and l.origen_lead_id <= o.id) from public.origenes_lead o where o.id = %L',
        current_setting('medir.origen_lead_sin')), 5, 'leads_origen_lead_id_idx', '{leads}', 100, 'postgres');
      perform pg_temp.escala('origen del lead: eliminar, uno con un solo lead', q, format(
        'select exists (select 1 from public.leads l where l.origen_lead_id >= o.id and l.origen_lead_id <= o.id) from public.origenes_lead o where o.id = %L',
        current_setting('medir.origen_lead_uno')), 5, 'leads_origen_lead_id_idx', '{leads}', 100, 'postgres');
    end if;
    if q = 'duena' then perform pg_temp.escala('origenes_resumen', q, 'select public.origenes_resumen()', 100); end if;
    if q = 'duena' then perform pg_temp.escala('categorias_con_uso', q, format('select public.categorias_con_uso(%L)', current_setting('medir.origen')), 50); end if;
    perform pg_temp.escala('vehiculos_para_lead', q, format('select public.vehiculos_para_lead(%L, %L)',
      case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end, 'toyota'), 300);
    if q = 'duena' then perform pg_temp.escala('baja de una persona (vista previa)', q, $w$select public.equipo_vista_previa_baja('00000000-0000-0000-0000-0000000000a1')$w$, 100); end if;
  end loop;

  -- Quien no tiene ningún tachado ni favorito (Berta, con 7.000 leads) no recorre su cartera para saberlo.
  perform pg_temp.escala('listado: ocultos hasta 51 de quien no tiene ninguno', 'berta', 'select id from public.leads_vista where esta_tachado = true order by creado_en desc, id desc limit 51', 30);
  perform pg_temp.escala('listado: sólo favoritos de quien no tiene ninguno', 'berta', pg_temp.pagina('es_favorito = true and esta_tachado = false'), 30);

  -- Lo que usa la papelera, como lo corre la base (sin RLS: con los derechos de la dueña de la función). La cola de Storage, con 100.000
  -- filas, la mide `medir-jobs.sql`.
  perform pg_temp.escala('papeleras: una página de lotes (la consulta)', 'duena',
    $w$select l.id from public.lotes_papelera l where l.tipo = 'leads' and l.purgado_en is null and l.restaurado_en is null order by l.creado_en desc, l.id desc limit 6$w$,
    50, 'lotes_papelera_tipo_idx', '{lotes_papelera}', 0, 'postgres');
end $medir$;

rollback;
