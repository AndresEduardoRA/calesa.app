-- Medición de la rueda de turnos por rol (`web.cola.participar`, migración 20261019003800): `pnpm db:medir:volumen`, contra el Supabase LOCAL, sobre los 50.000 leads
-- de la siembra de volumen (no los toca: la rueda no lee `leads`).
--
-- Lo que se mide es lo que el reparto paga por evaluar la elegibilidad de cada candidata AL REPARTIR (`puede_estar_en_la_rueda()`):
--   500 personas en la cola, 60 roles (tres por persona), 15 con el permiso, y solicitudes de hace tiempo (ver abajo).
--   A) la elección de la rueda (la consulta del paso 5 de `web.solicitar_asesor`) con 50.000 solicitudes (5.000 abiertas);
--   B) lo mismo con 200.000 (las mismas 5.000 abiertas): el costo NO puede crecer con las solicitudes cerradas;
--   y, en cada tamaño: la función sola sobre las 500 personas, la lista `estado_cola_web`, 50 llamadas completas a `web.solicitar_asesor` y la
--   reasignación de 20 vencidas por `web_expirar_solicitudes`.
-- Asserta: el plan (las abiertas se cuentan por `solicitudes_web_asesor_abiertas_idx`, nunca recorriendo `solicitudes_contacto_web`), el presupuesto en ms de
-- cada medida y que con 4 veces las solicitudes cuesta como mucho 1,5 veces (con un piso de 3 ms de ruido).
--
-- Todo en una transacción que se revierte. Una sola transacción miente en lo que ESCRIBE (cada llamada de `solicitar_asesor` inserta una solicitud y
-- actualiza el renglón de la persona): las 50 llamadas sirven para ver que no dependen de las solicitudes viejas, no como el costo de una escritura real.
\set ON_ERROR_STOP 1
begin;

create function pg_temp.mediana(p_sql text, p_veces int default 5) returns numeric language plpgsql as $$
declare v_ini timestamptz; v_ms numeric[] := '{}'; i int;
begin
  for i in 1..p_veces loop
    v_ini := clock_timestamp();
    execute p_sql;
    v_ms := v_ms || (extract(epoch from clock_timestamp() - v_ini) * 1000);
  end loop;
  return (select percentile_cont(0.5) within group (order by x) from unnest(v_ms) x);
end $$;

-- Las personas: 500 cuentas con WhatsApp, habilitadas y disponibles, y 60 roles; cada persona tiene tres roles seguidos, y el permiso lo llevan los roles 4, 8, … 60.
insert into auth.users (id, email, raw_app_meta_data)
select ('00000000-0000-0000-0000-' || lpad(to_hex(900000 + g), 12, '0'))::uuid, 'medir-rueda-' || g || '@ejemplo.com', '{"invitado": true}'
  from generate_series(1, 500) g;
update public.perfiles set whatsapp_web = '+5917' || lpad(substring(email::text from 'medir-rueda-(\d+)'), 7, '0'), nombre = 'Medir rueda ' || right(id::text, 6)
 where email::text like 'medir-rueda-%';
insert into public.roles (clave, nombre, orden) select 'medir_rueda_' || g, 'Medir rueda ' || g, 500 + g from generate_series(1, 60) g;
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, p.clave, 'todos'
  from public.roles r
  join lateral (select clave from public.permisos where clave <> 'web.cola.participar' order by clave limit 30) p on true
 where r.clave like 'medir_rueda_%';
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select id, 'web.cola.participar', 'todos' from public.roles where clave ~ '^medir_rueda_(4|8|12|16|20|24|28|32|36|40|44|48|52|56|60)$';
insert into public.usuarios_roles (usuario_id, rol_id)
select p.id, r.id
  from (select (row_number() over (order by id))::int as n, id from public.perfiles where email::text like 'medir-rueda-%') p
  cross join generate_series(0, 2) k
  join public.roles r on r.clave = 'medir_rueda_' || (1 + (p.n - 1 + k) % 60);
update public.cola_web_asesores set habilitado = false;
update public.cola_web_asesores set habilitado = true, disponible = true, prioridad = (abs(hashtext(usuario_id::text)) % 3)::smallint
 where usuario_id in (select id from public.perfiles where email::text like 'medir-rueda-%');
analyze public.roles_permisos;
analyze public.usuarios_roles;
create temporary table rueda_personas on commit drop as
  select (row_number() over (order by id))::int as n, id from public.perfiles where email::text like 'medir-rueda-%';
create unique index on rueda_personas (n);

-- Las solicitudes viejas: de a 50.000 con 5.000 abiertas (cupo 3 por persona: todas rebasan algo, el orden las manda al final).
create function pg_temp.sembrar(p_desde int, p_hasta int) returns void language plpgsql as $$
begin
  insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, fuente, creado_en, asignada_en, vence_en)
  select '#M' || g, 'medirrueda' || lpad(g::text, 10, '0'), x.id,
         case when g <= 5000 then 'asignada'::public.estado_solicitud_web else 'contactada'::public.estado_solicitud_web end,
         'boton_general', now() - make_interval(secs => g), now() - make_interval(secs => g),
         case when g <= 5000 then now() + interval '1 day' end
    from generate_series(p_desde, p_hasta) g join rueda_personas x on x.n = 1 + g % 500;
end $$;

create function pg_temp.rueda_sql() returns text language sql as $$
  select $q$select q.usuario_id from public.cola_web_asesores q join public.perfiles pf on pf.id = q.usuario_id
    where q.habilitado and q.disponible and pf.whatsapp_web is not null and public.puede_estar_en_la_rueda(q.usuario_id)
    order by ((select count(*) from public.solicitudes_contacto_web a where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa) >= coalesce(q.max_abiertas, 3)),
             (select count(*) from public.solicitudes_contacto_web a where a.usuario_id = q.usuario_id and a.estado = 'asignada' and not a.es_directa) / greatest(q.prioridad + 1, 1),
             q.ultima_asignacion_en asc nulls first, q.orden, q.usuario_id
    limit 1$q$;
$$;

create function pg_temp.rueda_antes_sql() returns text language sql as $$
  select replace(pg_temp.rueda_sql(), ' and public.puede_estar_en_la_rueda(q.usuario_id)', '');
$$;

create function pg_temp.plan(p_sql text) returns text language plpgsql as $$
declare v_linea text; v_plan text := '';
begin
  for v_linea in execute 'explain (analyze, costs off, timing off) ' || p_sql loop v_plan := v_plan || v_linea || E'\n'; end loop;
  return v_plan;
end $$;

-- Un tamaño: mide y asserta lo que no depende de comparar con otro.
create temporary table rueda_medidas (nombre text, tamano text, ms numeric) on commit drop;
create function pg_temp.medir(p_tamano text, p_max_rueda numeric, p_max_lista numeric, p_max_llamada numeric, p_max_expirar numeric) returns void language plpgsql as $$
declare v_ms numeric; v_plan text; v_ini timestamptz; i int; v_n int;
begin
  analyze public.solicitudes_contacto_web;
  analyze public.cola_web_asesores;
  -- A/B) la elección de la rueda
  v_ms := pg_temp.mediana(pg_temp.rueda_sql());
  insert into rueda_medidas values ('rueda', p_tamano, v_ms);
  raise notice 'medicion|rueda, 500 en la cola, % solicitudes|%', p_tamano, round(v_ms, 1);
  if v_ms > p_max_rueda then raise exception 'la rueda tarda % ms con % solicitudes, el presupuesto es % ms', round(v_ms, 1), p_tamano, p_max_rueda; end if;
  -- Como era antes (sin preguntar por el rol): sólo informa, para saber cuánto cuesta preguntar.
  v_ms := pg_temp.mediana(pg_temp.rueda_antes_sql());
  raise notice 'medicion|rueda ANTES de la migración (sin el permiso), % solicitudes|%', p_tamano, round(v_ms, 1);
  v_plan := pg_temp.plan(pg_temp.rueda_sql());
  raise notice 'plan|rueda %|%', p_tamano, replace(v_plan, E'\n', ' / ');
  if v_plan !~ 'solicitudes_web_asesor_abiertas_idx' then raise exception 'las abiertas de cada persona no se cuentan por solicitudes_web_asesor_abiertas_idx:%', E'\n' || v_plan; end if;
  if v_plan ~ 'Seq Scan on solicitudes_contacto_web' then raise exception 'la rueda recorre solicitudes_contacto_web entera:%', E'\n' || v_plan; end if;
  -- la función sola, sobre las 500
  v_ms := pg_temp.mediana($q$select count(*) from public.cola_web_asesores q where public.puede_estar_en_la_rueda(q.usuario_id)$q$);
  insert into rueda_medidas values ('funcion', p_tamano, v_ms);
  raise notice 'medicion|puede_estar_en_la_rueda() sobre toda la cola, % solicitudes|%', p_tamano, round(v_ms, 1);
  -- la lista
  v_ms := pg_temp.mediana($q$select count(*) from public.estado_cola_web$q$);
  insert into rueda_medidas values ('lista', p_tamano, v_ms);
  raise notice 'medicion|estado_cola_web, % solicitudes|%', p_tamano, round(v_ms, 1);
  if v_ms > p_max_lista then raise exception 'estado_cola_web tarda % ms con % solicitudes, el presupuesto es % ms', round(v_ms, 1), p_tamano, p_max_lista; end if;
  -- 50 llamadas completas de un visitante anónimo
  v_ini := clock_timestamp();
  for i in 1..50 loop perform web.solicitar_asesor('medirllamada' || replace(p_tamano, '.', '') || lpad(i::text, 6, '0'), 'boton_general'); end loop;
  v_ms := extract(epoch from clock_timestamp() - v_ini) * 1000 / 50;
  insert into rueda_medidas values ('llamada', p_tamano, v_ms);
  raise notice 'medicion|web.solicitar_asesor (promedio de 50), % solicitudes|%', p_tamano, round(v_ms, 1);
  if v_ms > p_max_llamada then raise exception 'solicitar_asesor tarda % ms con % solicitudes, el presupuesto es % ms', round(v_ms, 1), p_tamano, p_max_llamada; end if;
  -- 20 vencidas, reasignadas
  update public.solicitudes_contacto_web set vence_en = now() - interval '1 minute'
   where id in (select id from public.solicitudes_contacto_web where estado = 'asignada' and not es_directa and vence_en > now() order by id limit 20);
  v_ini := clock_timestamp();
  v_n := public.web_expirar_solicitudes(20);
  v_ms := extract(epoch from clock_timestamp() - v_ini) * 1000;
  insert into rueda_medidas values ('expirar', p_tamano, v_ms);
  raise notice 'medicion|web_expirar_solicitudes(20), % solicitudes|%', p_tamano, round(v_ms, 1);
  if v_n <> 20 then raise exception 'debían vencer 20 y vencieron %', v_n; end if;
  if v_ms > p_max_expirar then raise exception 'web_expirar_solicitudes(20) tarda % ms con % solicitudes, el presupuesto es % ms', round(v_ms, 1), p_tamano, p_max_expirar; end if;
end $$;

select pg_temp.sembrar(1, 50000);
select pg_temp.medir('50.000', 40, 40, 60, 800);
select pg_temp.sembrar(50001, 200000);
select pg_temp.medir('200.000', 40, 40, 60, 800);

-- La razón: con 4 veces las solicitudes, lo que pagaba cada cosa no puede haber crecido más de 1,5 veces (con 3 ms de piso: el ruido de una medida chica).
do $$
declare r record;
begin
  for r in select a.nombre, a.ms as chico, b.ms as grande from rueda_medidas a join rueda_medidas b on b.nombre = a.nombre and b.tamano = '200.000' where a.tamano = '50.000' loop
    raise notice 'razon|%|% -> % ms', r.nombre, round(r.chico, 1), round(r.grande, 1);
    if r.grande > greatest(r.chico * 1.5, r.chico + 3) then
      raise exception '% crece con las solicitudes: % ms con 50.000 y % ms con 200.000', r.nombre, round(r.chico, 1), round(r.grande, 1); end if;
  end loop;
end $$;

rollback;
