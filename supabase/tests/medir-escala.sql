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

-- El total de leads de la base medida: sólo para decirlo al final. Ningún presupuesto de este archivo depende de él (la persona con pocos
-- leads lo tuvo hasta 5a-fix-1a y la búsqueda por nombre hasta 5a-fix-1b: las dos fórmulas por N se borraron). Las aserciones que fallan se
-- juntan y se dicen todas al final (`violaciones`): una corrida con otro volumen enseña todo lo que no cumple, no sólo lo primero.
select set_config('medir.n_leads', (select count(*)::text from public.leads), true);
create temp table violaciones (texto text);
-- Lo que midió cada `escala()` (la mediana), para sumar los dos pasos de una búsqueda.
create temp table medidas (nombre text, quien text, ms numeric);

-- De dónde lee «míos» cada persona, como lo decide la app (`fuenteDelListado()` y `leerMiosDeLaCartera()`): quien tiene `leads.ver` «propios» lee su cartera
-- (`leads_cartera_vista`, 5a-fix-1a); quien ve «todos» también si su cartera es corta (`leads_cartera_corta()`, 5a-5: la supervisora, con 3 leads propios); la
-- dueña (40 % de los leads) conserva `leads_vista`: su cartera es grande y por la cartera no mejora. Se lo pregunta a la base como esa persona, igual que la app.
create function pg_temp.fuente_mios(p_quien text) returns text language plpgsql as $$
declare v_cartera boolean;
begin
  perform pg_temp.quien(p_quien);
  set local role authenticated;
  v_cartera := public.alcance_de('leads.ver') = 'propios' or public.leads_cartera_corta();
  reset role;
  return case when v_cartera then 'leads_cartera_vista' else 'leads_vista' end;
end $$;

-- Los claims de la persona que mide: `request.jwt.claim.sub` (lo que lee `auth.uid()`) y `request.jwt.claims`.
create function pg_temp.quien(p_quien text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', case p_quien
    when 'duena' then '00000000-0000-0000-0000-0000000000d1'
    when 'berta' then '00000000-0000-0000-0000-0000000000b1'
    when 'chica' then '00000000-0000-0000-0000-0000000000c9'
    when 'papelera' then '00000000-0000-0000-0000-0000000000c6'
    when 'sup' then '00000000-0000-0000-0000-0000000000c8'
    else '00000000-0000-0000-0000-0000000000a1' end, true);
  perform set_config('request.jwt.claims', json_build_object('sub', current_setting('request.jwt.claim.sub'),
    'role', 'authenticated')::text, true);
end $$;

-- Mide `p_sql` como `authenticated` (o `p_rol`): la mediana de 5 corridas (de 7) y la forma del plan
-- genérico. Asserta el **presupuesto de tiempo** (`p_ms`: unas 4 veces lo medido, para que lo atrape un
-- cambio de forma y no el ruido de la máquina; en el listado, las metas de la 9h) y, si `p_indice` no es nulo, la forma del plan: usa ese
-- índice, ningún recorrido secuencial sobre `p_tablas` y a lo sumo `p_descartes` filas descartadas. Una
-- RPC de plpgsql es opaca para `explain`: su forma se asserta sobre la consulta de adentro. Lo que no cumple no corta la corrida: se
-- anota en `violaciones` y el final de este archivo las levanta todas juntas.
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
  insert into pg_temp.medidas values (p_nombre, p_quien, v_mediana);
  raise notice 'plan|% [%]|indices=%|seq=%|descartadas=%', p_nombre, p_quien, v_indices, v_secuenciales, v_descartadas;
  if p_indice is not null then
    if not p_indice = any (v_indices) then
      insert into pg_temp.violaciones values (format('%s [%s]: no usa %s, usa %s', p_nombre, p_quien, p_indice, v_indices));
    end if;
    foreach v_tabla in array p_tablas loop
      if v_tabla = any (v_secuenciales) then
        insert into pg_temp.violaciones values (format('%s [%s]: recorre %s entera', p_nombre, p_quien, v_tabla));
      end if;
    end loop;
    if v_descartadas > p_descartes then
      insert into pg_temp.violaciones values (format('%s [%s]: descarta %s filas, el tope es %s (índices %s)', p_nombre, p_quien, v_descartadas, p_descartes, v_indices));
    end if;
  end if;
  if p_ms is not null and v_mediana > p_ms then
    insert into pg_temp.violaciones values (format('%s [%s]: tarda %s ms, el presupuesto es %s ms', p_nombre, p_quien, round(v_mediana, 1), p_ms));
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
-- El tipo de lead (9j): el común (85 %), «Cliente» (14 %), el raro (1 %) y el que ningún lead usa.
select set_config('medir.tipo_comun', (select id::text from public.tipos_lead where clave = 'prospecto'), true);
select set_config('medir.tipo_cliente', (select id::text from public.tipos_lead where clave = 'cliente'), true);
select set_config('medir.tipo_raro', (select id::text from public.tipos_lead where clave = 'volumen_mayorista'), true);
select set_config('medir.tipo_sin', (select id::text from public.tipos_lead where clave = 'volumen_sin_leads'), true);
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
-- Una asesora con 3 leads (9h): el peor caso de «propios», que camina el índice entero para no juntar una página.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c9', 'chica-medir@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select '00000000-0000-0000-0000-0000000000c9', id, true from public.roles where clave = 'asesor' on conflict do nothing;
update public.leads_asesores set usuario_id = '00000000-0000-0000-0000-0000000000c9'
 where tipo_acceso = 'dueno' and revocado_en is null
   and lead_id in (select id from public.leads where nombre in ('Volumen 49000 Pérez', 'Volumen 30001 Gómez', 'Volumen 25003 Suárez'));
-- Una supervisora (5a-5): ve «todos» y tiene 3 leads propios. Su «míos» es la cartera de 3, no la tabla: por la vista de siempre recorría el índice del listado entero.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c8', 'supervisora-medir@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select '00000000-0000-0000-0000-0000000000c8', id, true from public.roles where clave = 'dueno' on conflict do nothing;
update public.leads_asesores set usuario_id = '00000000-0000-0000-0000-0000000000c8'
 where tipo_acceso = 'dueno' and revocado_en is null
   and lead_id in (select lead_id from public.leads_asesores where usuario_id = '00000000-0000-0000-0000-0000000000d1' and tipo_acceso = 'dueno' and revocado_en is null order by lead_id limit 3);
-- Una asesora con 3 leads vivos y 500 de los más nuevos en la papelera (lo que deja deshacer una importación): su fila de la cartera
-- sigue vigente, así que el recorrido de su cartera los descarta al unir con `leads`. Es el costo que acota la papelera de cada persona.
insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-0000-0000-0000000000c6', 'papelera-medir@ejemplo.com', '{"invitado": true}');
insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
select '00000000-0000-0000-0000-0000000000c6', id, true from public.roles where clave = 'asesor' on conflict do nothing;
create temp table medir_papelera as
  select l.id from public.leads l join public.leads_asesores la on la.lead_id = l.id and la.tipo_acceso = 'dueno' and la.revocado_en is null
   where l.eliminado_en is null and la.usuario_id in ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1')
   order by l.creado_en desc, l.id desc limit 500;
update public.leads_asesores set usuario_id = '00000000-0000-0000-0000-0000000000c6'
 where tipo_acceso = 'dueno' and revocado_en is null
   and (lead_id in (select id from medir_papelera)
        or lead_id in (select id from public.leads where nombre in ('Volumen 42000 Pérez', 'Volumen 42001 Gómez', 'Volumen 42002 Rojas')));
set local session_replication_role = replica;
update public.leads set eliminado_en = now() where id in (select id from medir_papelera);
set local session_replication_role = origin;
analyze public.leads;
analyze public.leads_asesores;
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

-- La página del listado de leads, como la arma PostgREST sobre `p_rel`: `leads_vista` («todos») o `leads_cartera_vista` («míos»).
create function pg_temp.pagina(p_donde text, p_n int default 50, p_rel text default 'leads_vista') returns text language sql as $$
  select format('select coalesce(json_agg(t), ''[]'') from (select id, numero, numero_propio, numero_propio_creador, numero_visible, nombre, telefono_principal, en_cartera, dueno_id, tipo_lead_id, origen_lead_id, creado_en,
    atributos -> ''ciudad_vol'' as a_ciudad, es_favorito, esta_tachado, etiquetas from public.%I where %s order by creado_en desc, id desc limit %s) t', p_rel, p_donde, p_n + 1);
$$;

-- Un atributo como lo filtra la app: una opción es `@>`; un campo público, sobre la copia de lo público (9h,
-- `columnaParaFiltrar()`), y uno privado sobre lo recortado y sólo en la cartera (`p_columna = 'atributos'`).
create function pg_temp.atributo(p_valor text, p_columna text default 'atributos_publicos') returns text language sql as $$
  select format('%I @> %L', p_columna, jsonb_build_object('ciudad_vol', p_valor));
$$;

-- El listado de leads (9h; 5a-fix-1a). Dos lecturas, las dos que manda la app:
--  · «míos» (`en_cartera = true`): lo que ve por defecto TODA persona y lo único que ve quien tiene «propios». Se lee de
--    `leads_cartera_vista`, que camina la cartera de quien mira por `leads_asesores_listado_idx`: cuesta lo que pesa esa cartera y no
--    cuántos leads hay en la tabla. La asesora con 3 leads, la supervisora con 3 propios y la que tiene 500 en la papelera tienen
--    el mismo presupuesto que la dueña.
--  · «todos» (sin `en_cartera`): sólo quien tiene `leads.ver` «todos». Camina `leads_listado_idx` y filtra por la visibilidad.
-- Las metas: página 1 a 30 ms y una profunda a 150, un filtro sin resultados, una etiqueta, los tachados y un origen a 100. La
-- página 1 y la profunda caminan su índice sin recorrer `leads` y descartando a lo sumo lo que mide una página (3.000; una asesora con
-- 500 leads propios en la papelera descarta 530). Ningún presupuesto de acá depende de cuántos leads hay en la tabla: con 62.000 y con
-- 212.000 son los mismos. La búsqueda por nombre sí (`busqueda()`): es de 5a-1 y no se toca acá.
create function pg_temp.listado(q text, p_mios boolean) returns void language plpgsql as $$
declare
  v_max int := current_setting('medir.max_leads')::int;
  v_cursor text := format('creado_en <= %L and (creado_en < %L or id < %L)',
    current_setting('medir.cursor_en'), current_setting('medir.cursor_en'), current_setting('medir.cursor_id'));
  v_etiqueta text := case q when 'duena' then current_setting('medir.et_duena') when 'ana' then current_setting('medir.et_ana') end;
  v_rel text := case when p_mios then pg_temp.fuente_mios(q) else 'leads_vista' end;
  v_m text := case when p_mios then 'en_cartera = true and ' else '' end;
  v_modo text := case when p_mios then 'listado «míos»' else 'listado «todos»' end;
  v_idx text := case when v_rel = 'leads_cartera_vista' then 'leads_asesores_listado_idx' else 'leads_listado_idx' end;
  v_tablas text[] := case when v_rel = 'leads_cartera_vista' then '{leads,leads_asesores}' else '{leads}' end;
  -- La dueña en «míos» camina `leads_listado_idx` y descarta lo que no es suyo (un 60 %): el doble de margen, como siempre.
  v_desc int := case when p_mios and v_rel = 'leads_vista' then 6000 else 3000 end;
begin
  -- La dueña en «míos» sigue leyendo `leads_vista` (su cartera es grande: por la cartera no mejora, `docs/RENDIMIENTO.md`): se asserta lo
  -- que ya se asertaba de esa lectura y nada más. Su etiqueta propia (112 ms con 62.000 leads, presupuesto 100) es de `docs/PLAN.md` 5a-7; un campo
  -- público (el atributo común, 105,6 ms con 212.000) se lee ahora por los candidatos y lo mide `busqueda()`.
  if p_mios and v_rel = 'leads_vista' then
    perform pg_temp.escala(v_modo || ': página 1 con el máximo de la lista', q, pg_temp.pagina(v_m || 'esta_tachado = false', v_max, v_rel), 30, v_idx, v_tablas, v_desc);
    perform pg_temp.escala(v_modo || ': un campo privado sin resultados (recorre la cartera)', q, pg_temp.pagina('en_cartera = true and ' || pg_temp.atributo('nada', 'atributos') || ' and esta_tachado = false', v_max, v_rel), 6000);
    return;
  end if;
  perform pg_temp.escala(v_modo || ': página 1 (tachados ocultos)', q, pg_temp.pagina(v_m || 'esta_tachado = false', 50, v_rel), 30, v_idx, v_tablas, v_desc);
  perform pg_temp.escala(v_modo || ': página 1 con el máximo de la lista', q, pg_temp.pagina(v_m || 'esta_tachado = false', v_max, v_rel), 30, v_idx, v_tablas, v_desc);
  perform pg_temp.escala(v_modo || ': página 100 por cursor', q, pg_temp.pagina(v_m || 'esta_tachado = false and ' || v_cursor, 50, v_rel), 150, v_idx, v_tablas, v_desc);
  perform pg_temp.escala(v_modo || ': página 100 por cursor con el máximo de la lista', q, pg_temp.pagina(v_m || 'esta_tachado = false and ' || v_cursor, v_max, v_rel), 150, v_idx, v_tablas, v_desc);
  -- Un campo público (`atributos_publicos @>`) y un nombre se leen por los candidatos: `busqueda()`.
  -- Límite aceptado: un campo privado se filtra por lo recortado, con `atributos_lead()` en cada lead de la cartera
  -- (~66 µs): cuesta lo que suma la cartera de quien filtra (la dueña, 20.000). Sólo se filtra en «míos»: sólo la cartera lo tiene.
  if p_mios then
    perform pg_temp.escala(v_modo || ': un campo privado sin resultados (recorre la cartera)', q, pg_temp.pagina('en_cartera = true and ' || pg_temp.atributo('nada', 'atributos') || ' and esta_tachado = false', v_max, v_rel), 6000);
  end if;
  perform pg_temp.escala(v_modo || ': sólo favoritos', q, pg_temp.pagina(v_m || 'es_favorito = true and esta_tachado = false', v_max, v_rel), 100);
  perform pg_temp.escala(v_modo || ': sólo tachados', q, pg_temp.pagina(v_m || 'esta_tachado = true', v_max, v_rel), 100);
  if v_etiqueta is not null then
    perform pg_temp.escala(v_modo || ': etiqueta', q, pg_temp.pagina(v_m || format('etiquetas && array[%L::uuid] and esta_tachado = false', v_etiqueta), v_max, v_rel), 100);
  end if;
  -- El filtro por origen del lead (`?origen=`): uno de cinco (un quinto de la cartera), dos, y uno sin leads (que no
  -- recorre nada: lo resuelve el índice de la FK).
  perform pg_temp.escala(v_modo || ': un origen del lead', q, pg_temp.pagina(v_m || format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.origen_lead')), v_max, v_rel), 100);
  perform pg_temp.escala(v_modo || ': dos orígenes del lead', q, pg_temp.pagina(v_m || format('origen_lead_id = any (array[%L, %L]::uuid[]) and esta_tachado = false', current_setting('medir.origen_lead'), current_setting('medir.origen_lead_dos')), v_max, v_rel), 100);
  perform pg_temp.escala(v_modo || ': un origen del lead sin leads', q, pg_temp.pagina(v_m || format('origen_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.origen_lead_sin')), v_max, v_rel), 100, 'leads_origen_lead_id_idx', '{leads}', 0);
  -- El filtro por tipo de lead (`?tipo=`, 9j): la misma forma que el de origen, con la columna `tipo_lead_id` y su índice. Uno
  -- común o intermedio recorre el índice de la lectura y descarta lo que no es de quien mira; uno raro y uno vacío van por la FK
  -- (a Ana con el raro, 7.551 descartes con 212.000 leads en «todos» y 21 ms; en «míos», lo que otras personas tienen de ese tipo no
  -- se recorre). Se mide el tiempo y no se afirma una forma para los intermedios.
  perform pg_temp.escala(v_modo || ': el tipo más común (85 %)', q, pg_temp.pagina(v_m || format('tipo_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.tipo_comun')), v_max, v_rel), 100);
  perform pg_temp.escala(v_modo || ': un tipo del 14 %', q, pg_temp.pagina(v_m || format('tipo_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.tipo_cliente')), v_max, v_rel), 100);
  perform pg_temp.escala(v_modo || ': un tipo raro (1 %)', q, pg_temp.pagina(v_m || format('tipo_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.tipo_raro')), v_max, v_rel), 100, 'leads_tipo_lead_id_idx', '{leads}', 10000);
  perform pg_temp.escala(v_modo || ': dos tipos', q, pg_temp.pagina(v_m || format('tipo_lead_id = any (array[%L, %L]::uuid[]) and esta_tachado = false', current_setting('medir.tipo_cliente'), current_setting('medir.tipo_raro')), v_max, v_rel), 100);
  perform pg_temp.escala(v_modo || ': un tipo sin leads', q, pg_temp.pagina(v_m || format('tipo_lead_id = any (array[%L]::uuid[]) and esta_tachado = false', current_setting('medir.tipo_sin')), v_max, v_rel), 100, 'leads_tipo_lead_id_idx', '{leads}', 0);
end $$;

-- La búsqueda por nombre y un campo público (5a-1, cierre 5a-fix-1b): lo que manda la app, en sus dos pasos. `leads_candidatos()` saca de `leads_busqueda_idx`
-- los primeros que coinciden (en el orden del listado, sólo de lo que quien mira ve) y `leads_vista_por_ids()` lee la página de esos ids con lo que queda
-- (tachados ocultos, «míos»). Cada paso tiene su presupuesto (25 y 40 ms: el paso 2 son las 101 filas con sus columnas, ~21–25 ms, lo que ya cuesta cualquier página) y los dos
-- juntos, 50 ms, **con 62.000 y con 212.000 leads**: sin fórmula por N. La dueña
-- mide «míos» y «todos»; Ana, Berta y la «chica» («propios»), «míos». Se asserta además la forma: el paso 2 lee `leads` por su clave, sin recorrerla
-- entera, y la vista por ids se inlinea (sin `Function Scan`, que calcularía las columnas caras de todos los ids), y que lo ajeno no se lee: un término
-- que otras personas tienen y quien busca no, no lleva al heap ninguna fila (el tiempo no cuenta los leads de los demás).
-- Los términos sin un tramo de 3 letras o dígitos (`x`, `zq`, `%`, `a_b`) no tienen trigramas que buscar en el índice: recorren la cartera de quien mira
-- (la dueña, casi todo). Se miden y no se asertan: la app ya no los manda (5a-8: el nombre se busca con 3 letras o dígitos seguidos, y con menos el campo lo
-- dice y no pide nada al servidor). La función de la base los sigue resolviendo, caminando la cartera, por si algo la llama directo. Lo que sí se asserta es el
-- escaso de 3 letras (`zqx`, `zzzzqx`): el mínimo que la app deja pasar.
create function pg_temp.pagina_por_ids(p_ids uuid[], p_mios boolean, p_n int) returns text language sql as $$
  select format('select coalesce(json_agg(t), ''[]'') from (select id, numero, numero_propio, numero_propio_creador, numero_visible, nombre, telefono_principal, en_cartera, dueno_id, tipo_lead_id, origen_lead_id, creado_en,
    atributos -> ''ciudad_vol'' as a_ciudad, es_favorito, esta_tachado, etiquetas from public.leads_vista_por_ids(%L::uuid[]) where %s esta_tachado = false order by creado_en desc, id desc limit %s) t',
    p_ids, case when p_mios then 'en_cartera = true and' else '' end, p_n + 1)
$$;

-- Los ids que `leads_candidatos()` le da a `p_quien` para esos filtros (como authenticated, con su sesión).
create function pg_temp.candidatos(p_quien text, p_filtros jsonb) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform pg_temp.quien(p_quien);
  set local role authenticated;
  r := public.leads_candidatos(p_filtros);
  reset role;
  return r;
end $$;

-- Cuántos bloques del heap lee una consulta (como postgres: es la consulta de la definer, sin RLS).
create function pg_temp.bloques_del_heap(p_sql text) returns numeric language plpgsql as $$
declare v_plan json;
begin
  execute 'explain (analyze, buffers, format json) ' || p_sql into v_plan;
  return (select coalesce(sum(m[1]::numeric), 0) from regexp_matches(v_plan::text, '"(?:Exact|Lossy) Heap Blocks": (\d+)', 'g') m);
end $$;

create function pg_temp.busqueda_de(q text, p_modo text, p_nombre text, p_filtros jsonb, p_ms1 numeric, p_ms2 numeric, p_ms numeric) returns void language plpgsql as $$
declare
  v_max int := current_setting('medir.max_leads')::int;
  v_mios boolean := p_modo = 'mios';
  v_filtros jsonb := p_filtros || jsonb_build_object('mios', v_mios, 'sentido', 'siguiente');
  v_r jsonb; v_ids uuid[]; v_sql2 text; v_plan text; v_suma numeric; v_nombre text := 'búsqueda ' || p_modo || ': ' || p_nombre;
begin
  perform pg_temp.escala(v_nombre || ' (paso 1: candidatos)', q, format('select public.leads_candidatos(%L::jsonb)', v_filtros), p_ms1);
  v_r := pg_temp.candidatos(q, v_filtros);
  v_ids := array(select jsonb_array_elements_text(v_r -> 'ids'))::uuid[];
  v_sql2 := pg_temp.pagina_por_ids(v_ids, v_mios, v_max);
  -- El paso 2 lee por clave: sin recorrer `leads` y sin descartar más que los ids que llegan.
  -- «Descartadas» suma también el filtro de los subplanes por fila de la vista (los números de un lead, ~64 por fila de salida): escala con la página, nunca con los leads.
  perform pg_temp.escala(v_nombre || ' (paso 2: la página)', q, v_sql2, p_ms2, 'leads_pkey', '{leads}', (v_max + 1) * 100);
  -- Sin `Function Scan`: si la vista por ids no se inlinea, calcula las columnas caras de TODOS los ids antes de ordenar y cortar.
  perform pg_temp.quien(q);
  set local role authenticated;
  execute 'explain (format json) ' || v_sql2 into v_plan;
  reset role;
  if v_plan ~ '"Node Type": "Function Scan"' then
    insert into pg_temp.violaciones values (format('%s [%s]: leads_vista_por_ids se lee como un Function Scan (no se inlinea)', v_nombre, q));
  end if;
  select sum(ms) into v_suma from pg_temp.medidas where quien = q and nombre in (v_nombre || ' (paso 1: candidatos)', v_nombre || ' (paso 2: la página)');
  raise notice 'medicion|% (los dos pasos, % candidatos) [%]|%', v_nombre, cardinality(v_ids), q, round(v_suma, 1);
  if p_ms is not null and v_suma > p_ms then
    insert into pg_temp.violaciones values (format('%s [%s]: los dos pasos tardan %s ms, el presupuesto es %s ms', v_nombre, q, round(v_suma, 1), p_ms));
  end if;
end $$;

create function pg_temp.busqueda(q text) returns void language plpgsql as $$
declare
  v_modo text; t text; r record;
begin
  foreach v_modo in array case when q = 'duena' then array['mios', 'todos'] else array['mios'] end loop
    -- Con tramo de 3 letras: un término selectivo, uno sin resultados, un apellido común (12,5 % de los leads), el mismo con otra tilde o mayúscula, y los que
    -- coinciden con casi todo (el índice de trigramas no corta en K: los resuelve la ventana, `leads_candidatos()` etapa W).
    foreach t in array array['Volumen 4999', 'zzzzqx', 'zqx', 'Gómez', 'GÓMEZ', 'Mamani', 'Vol', 'Volumen'] loop
      perform pg_temp.busqueda_de(q, v_modo, '«' || t || '»', jsonb_build_object('texto', t), 25, 40, 50);
    end loop;
    -- Densos de 1 y 2 caracteres: los resuelve la ventana. Escasos (`x`, `zq`), sin tramo y con comodines: se miden, no se asertan (la app ya no los manda, 5a-8).
    foreach t in array array['v', 'ol'] loop
      perform pg_temp.busqueda_de(q, v_modo, '«' || t || '» (denso)', jsonb_build_object('texto', t), 25, 40, 50);
    end loop;
    foreach t in array array['x', 'zq', 'a_b', '%'] loop
      perform pg_temp.busqueda_de(q, v_modo, '«' || t || '» (sin tramo de 3: la app no lo manda)', jsonb_build_object('texto', t), null, null, null);
    end loop;
    -- Un campo público (5a-fix-1a/1b): uno común, otro sin resultados, y combinado con un nombre.
    perform pg_temp.busqueda_de(q, v_modo, 'un atributo común', '{"atributos": [[{"ciudad_vol": "lp"}]]}', 25, 40, 50);
    perform pg_temp.busqueda_de(q, v_modo, 'un atributo sin resultados', '{"atributos": [[{"ciudad_vol": "nada"}]]}', 25, 40, 50);
    perform pg_temp.busqueda_de(q, v_modo, 'un atributo y un nombre', '{"atributos": [[{"ciudad_vol": "lp"}]], "texto": "Gómez"}', 25, 40, 50);
    perform pg_temp.busqueda_de(q, v_modo, 'un tipo y un nombre', jsonb_build_object('texto', 'Gómez', 'tipos', jsonb_build_array(current_setting('medir.tipo_comun'))), 25, 40, 50);
  end loop;
  -- Lo ajeno no se lee: Berta busca un apellido que otras personas tienen y ella no, y uno que nadie tiene; el índice cruza la cartera con el trigrama, así que
  -- ninguna fila de los demás llega al heap (y el tiempo no cuenta los leads de otras personas). La etapa de índice como la ejecuta la definer.
  if q = 'berta' then
    for r in select * from (values ('Mamani'), ('Quispe'), ('Gómez'), ('zzzzqx')) x (termino) loop
      perform pg_temp.quien(q);
      declare v_bloques numeric;
      begin
        v_bloques := pg_temp.bloques_del_heap(public._leads_candidatos_sql('indice', jsonb_build_object('texto', r.termino, 'mios', true, 'sentido', 'siguiente'),
            '00000000-0000-0000-0000-0000000000b1', 'propios', '{}'));
        raise notice 'medicion|búsqueda: bloques del heap de Berta con «%» (el índice)|%', r.termino, v_bloques;
        -- Lo que lee es lo que va a devolver (y a lo sumo sus filas): no un bloque por cada lead ajeno que coincide.
        if v_bloques > 40 then
          insert into pg_temp.violaciones values (format('«%s» [berta]: lee %s bloques del heap con el índice: llegan filas de otras personas', r.termino, v_bloques));
        end if;
      end;
    end loop;
  end if;
end $$;

do $medir$ declare q text; begin
  foreach q in array array['duena', 'ana'] loop
    perform pg_temp.listado(q, true);
    if q = 'duena' then perform pg_temp.listado(q, false); end if;
    -- La numeración (9f-2). Los números salen de dos copias bajo su policy, como subconsultas de la lista de columnas
    -- (se evalúan sólo para las filas que salen, no para las que la consulta recorre): el permiso se pregunta una vez
    -- por consulta (`llamadas`) y la página profunda cuesta lo mismo que sin pedirlos. Buscar `#n` resuelve el número a un
    -- id leyendo la copia que corresponde por su índice único, sin recorrer `leads`.
    perform pg_temp.llamadas('listado «míos»: página 1, el permiso del número', q, pg_temp.pagina('en_cartera = true and esta_tachado = false', 50, pg_temp.fuente_mios(q)), 'public.tiene_permiso(text,uuid)'::regprocedure, 6);
    -- `atributos_lead()` (~66 µs) corre sólo para las filas que salen (101 con el máximo), no para las que la consulta recorre.
    perform pg_temp.llamadas('listado «míos»: página 1, atributos_lead() por fila', q, pg_temp.pagina('en_cartera = true and esta_tachado = false', current_setting('medir.max_leads')::int, pg_temp.fuente_mios(q)), 'public.atributos_lead(uuid)'::regprocedure, current_setting('medir.max_leads')::int + 1);
    if q = 'duena' then
      perform pg_temp.escala('buscar #n con el permiso (el global)', q, format('select lead_id from public.leads_numeros_globales where numero = %s', current_setting('medir.num_global')),
        20, 'leads_numeros_globales_numero_key', '{leads,leads_numeros_globales}', 5);
    else
      perform pg_temp.escala('buscar #n sin el permiso (el propio)', q, format('select lead_id from public.leads_numeros_propios where creado_por = %L and numero = %s',
        '00000000-0000-0000-0000-0000000000a1', current_setting('medir.num_propio_ana')),
        20, 'leads_numeros_propios_creador_idx', '{leads,leads_numeros_propios}', 5);
    end if;
    -- Los números que se muestran: hasta el tope, por el índice del listado, nunca el total.
    perform pg_temp.escala('listado «míos»: ocultos hasta 51', q, format('select id from public.%I where en_cartera = true and esta_tachado = true order by creado_en desc, id desc limit 51', pg_temp.fuente_mios(q)), 100);
    perform pg_temp.escala('listado «míos»: ocultos con un atributo, hasta 51', q, format('select id from public.%I where en_cartera = true and esta_tachado = true and ', pg_temp.fuente_mios(q)) || pg_temp.atributo('lp') || ' order by creado_en desc, id desc limit 51', 100);
    if q = 'duena' then
      perform pg_temp.escala('listado «todos»: ocultos hasta 51', q, 'select id from public.leads_vista where esta_tachado = true order by creado_en desc, id desc limit 51', 100);
      perform pg_temp.escala('listado «todos»: ocultos con un atributo, hasta 51', q, 'select id from public.leads_vista where esta_tachado = true and ' || pg_temp.atributo('lp') || ' order by creado_en desc, id desc limit 51', 100);
    end if;
    perform pg_temp.escala('exportar: conteo hasta 5.001', q, format('select id from public.%I where en_cartera = true order by creado_en desc, id desc limit 5001', pg_temp.fuente_mios(q)), 100);
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
      -- Buscar en el embudo (cierre 1): sin resultados recorre la columna entera de la persona (lo peor); con resultados corta.
      perform pg_temp.escala('kanban: buscar sin resultados (todas las columnas)', q, format('select public.embudo_tablero(%L, %s, %s, %L)', current_setting('medir.embudo'), current_setting('medir.tam_columna'), current_setting('medir.tope_cargado'), 'zzzz nada'), 700);
      perform pg_temp.escala('kanban: buscar con resultados (todas las columnas)', q, format('select public.embudo_tablero(%L, %s, %s, %L)', current_setting('medir.embudo'), current_setting('medir.tam_columna'), current_setting('medir.tope_cargado'), 'Volumen 1'), 700);
      perform pg_temp.escala('kanban: «Ver más» buscando, sin resultados', q, format('select public.embudo_etapa_pagina(%L, %L, %L, %s, %L)',
        current_setting('medir.etapa'), current_setting('medir.op_en'), current_setting('medir.op_id'), current_setting('medir.tam_columna'), 'zzzz nada'), 200);
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
    -- Los tipos de lead (9j), con la misma sonda por rango que el origen: «¿algún lead usa este tipo?» camina
    -- `leads_tipo_lead_id_idx`. El catálogo que leen el listado, la ficha y la exportación es una sola llamada.
    if q = 'duena' then
      perform pg_temp.escala('tipos_lead_con_uso (hasta 100 tipos)', q, 'select public.tipos_lead_con_uso()', 100);
      perform pg_temp.escala('tipo de lead: con_leads de todos (la lista)', q,
        'select t.id, exists (select 1 from public.leads l where l.tipo_lead_id >= t.id and l.tipo_lead_id <= t.id) from public.tipos_lead t',
        20, 'leads_tipo_lead_id_idx', '{leads}', 0, 'postgres');
      perform pg_temp.escala('tipo de lead: eliminar, uno sin leads', q, format(
        'select exists (select 1 from public.leads l where l.tipo_lead_id >= t.id and l.tipo_lead_id <= t.id) from public.tipos_lead t where t.id = %L',
        current_setting('medir.tipo_sin')), 5, 'leads_tipo_lead_id_idx', '{leads}', 100, 'postgres');
    end if;
    perform pg_temp.escala('leads_catalogos (orígenes y tipos)', q, 'select public.leads_catalogos()', 30);
    if q = 'duena' then perform pg_temp.escala('origenes_resumen', q, 'select public.origenes_resumen()', 100); end if;
    if q = 'duena' then perform pg_temp.escala('categorias_con_uso', q, format('select public.categorias_con_uso(%L)', current_setting('medir.origen')), 50); end if;
    perform pg_temp.escala('vehiculos_para_lead', q, format('select public.vehiculos_para_lead(%L, %L)',
      case q when 'duena' then current_setting('medir.lead_duena') else current_setting('medir.lead_ana') end, 'toyota'), 300);
    if q = 'duena' then perform pg_temp.escala('baja de una persona (vista previa)', q, $w$select public.equipo_vista_previa_baja('00000000-0000-0000-0000-0000000000a1')$w$, 100); end if;
  end loop;

  -- Berta (7.000 leads), una asesora con 3, la asesora con 500 leads en la papelera y la supervisora («todos» y 3 propios, 5a-5): «míos» entero, por su
  -- cartera, con los mismos presupuestos que la dueña. La búsqueda por nombre (5a-1) sólo de las cuatro de siempre.
  foreach q in array array['berta', 'chica', 'papelera', 'sup'] loop
    perform pg_temp.listado(q, true);
  end loop;
  -- La supervisora en «todos» (sin `en_cartera`): la vista de siempre, como la dueña.
  perform pg_temp.listado('sup', false);
  foreach q in array array['duena', 'ana', 'berta', 'chica'] loop
    perform pg_temp.busqueda(q);
  end loop;
  -- Quien no tiene ningún tachado ni favorito (Berta, con 7.000 leads) no recorre su cartera para saberlo.
  perform pg_temp.escala('listado «míos»: ocultos hasta 51 de quien no tiene ninguno', 'berta', 'select id from public.leads_cartera_vista where en_cartera = true and esta_tachado = true order by creado_en desc, id desc limit 51', 30);
  perform pg_temp.escala('listado «míos»: sólo favoritos de quien no tiene ninguno', 'berta', pg_temp.pagina('en_cartera = true and es_favorito = true and esta_tachado = false', 50, 'leads_cartera_vista'), 30);

  -- Lo que usa la papelera, como lo corre la base (sin RLS: con los derechos de la dueña de la función). La cola de Storage, con 100.000
  -- filas, la mide `medir-jobs.sql`.
  perform pg_temp.escala('papeleras: una página de lotes (la consulta)', 'duena',
    $w$select l.id from public.lotes_papelera l where l.tipo = 'leads' and l.purgado_en is null and l.restaurado_en is null order by l.creado_en desc, l.id desc limit 6$w$,
    50, 'lotes_papelera_tipo_idx', '{lotes_papelera}', 0, 'postgres');
end $medir$;


-- La baja por lotes (cierre 1): un lote toma los ids de la persona por leads_asesores_usuario_vigente_idx, en orden y sin
-- recorrer leads_asesores, y bloquea esos leads por su clave (la dueña, con 20.000). La baja de 200.000, con sus tiempos, en `medir-bajas.sql`.
select pg_temp.escala('baja: los ids de un lote (la consulta)', 'duena',
  $w$select la.lead_id from public.leads_asesores la
      where la.usuario_id = '00000000-0000-0000-0000-0000000000d1' and la.revocado_en is null
      order by la.lead_id limit 5000$w$,
  50, 'leads_asesores_usuario_vigente_idx', array['leads_asesores'], 0, 'postgres');
select pg_temp.escala('baja: los ids de un lote con el cursor (la consulta)', 'duena',
  $w$select la.lead_id from public.leads_asesores la
      where la.usuario_id = '00000000-0000-0000-0000-0000000000d1' and la.revocado_en is null
        and la.lead_id > '80000000-0000-0000-0000-000000000000'
      order by la.lead_id limit 5000$w$,
  50, 'leads_asesores_usuario_vigente_idx', array['leads_asesores'], 0, 'postgres');
select pg_temp.escala('baja: el candado de los leads de un lote (la consulta)', 'duena',
  $w$select l.id from public.leads l
      where l.id = any (array(select la.lead_id from public.leads_asesores la
                               where la.usuario_id = '00000000-0000-0000-0000-0000000000d1' and la.revocado_en is null
                               order by la.lead_id limit 5000))
      order by l.id for update skip locked$w$,
  200, 'leads_pkey', array['leads'], 0, 'postgres');
select pg_temp.escala('baja de la dueña (vista previa, hasta 1.001)', 'duena',
  $w$select public.equipo_vista_previa_baja('00000000-0000-0000-0000-0000000000d1')$w$, 100);

-- Las aserciones que no se cumplieron, todas juntas.
do $violaciones$ declare v_texto text; v_n int;
begin
  select count(*), string_agg(texto, E'\n  ') into v_n, v_texto from pg_temp.violaciones;
  if v_n > 0 then
    raise exception E'% aserciones de escala no se cumplen (N = % leads):\n  %', v_n, current_setting('medir.n_leads'), v_texto;
  end if;
end $violaciones$;

rollback;
