-- Las alertas de demora (paso 6.12-1): `alertas_demora()`, sus ayudantes y el cierre al mover. No depende de otro archivo
-- (`SOLO=areas/alertas/demora.sql`): cada bloque abre su transacción y la revierte. Las cuentas miran sólo las personas y unidades de cada bloque (la
-- semilla también tiene demoradas y una dueña).
--
-- Qué asegura:
--   A1. Una unidad demorada deja una `demora_fase` por destinatario (flujos.mover + logistica.ver + vehiculos.ver del origen); no a quien tiene
--       flujos.mover de otro origen, a quien no tiene logistica.ver ni a una persona de baja; la segunda corrida no suma.
--   A2. Pasado `alerta_cada_horas` se reabre la misma fila (sin leer, `creado_en = now()`); antes no. Nulo = 72 h.
--   A3. Una accionada dentro de `alerta_cada_horas` no se repite; pasada, una nueva (sigue una sola abierta).
--   A4. No avisan: demora_dias 0, nulo con demora_dias_default 0, la regla apagada, una fase final o no de logística, la papelera, dentro del límite.
--   A5. Mover la cierra para todos (sólo la `demora_fase` de esa unidad); demorada en la fase nueva, avisa otra vez con una fila nueva.
--   A6. Manda el menor alcance: flujos.mover propios, logistica.ver propios o vehiculos.ver propios avisan sólo de la unidad propia o de su cartera.
--   A7. Ni `authenticated` ni `anon` ejecutan las funciones del job ni la del trigger.

create or replace function pg_temp.al_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-al@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave`, `clave@origen` y opcionalmente `#propios` (si no, `todos`).
create or replace function pg_temp.al_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text; k text;
begin
  perform pg_temp.al_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('al_' || substr(v_id::text, 1, 8), 'al ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    k := split_part(c, '#', 1);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(k, '@', 1), nullif(split_part(k, '@', 2), '')::uuid, coalesce(nullif(split_part(c, '#', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- Las tres claves del aviso en un origen.
create or replace function pg_temp.al_moverdor(p_origen uuid) returns uuid language sql as $f$
  select pg_temp.al_persona(array['flujos.mover@' || p_origen, 'logistica.ver@' || p_origen, 'vehiculos.ver@' || p_origen]);
$f$;

create or replace function pg_temp.al_flujo(p_regla boolean default true) returns uuid language plpgsql as $f$
declare o uuid; a uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('al_' || s, 'al origen ' || s, 'manual') returning id into o;
  a := (select id from public.flujos where origen_id = o);
  insert into public.flujos_reglas (flujo_id, regla, activa) values (a, 'alerta_demora', p_regla)
  on conflict (flujo_id, regla) do update set activa = excluded.activa;
  return a;
end $f$;

create or replace function pg_temp.al_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.al_fase(p_flujo uuid, p_orden int, p_demora int, p_horas int default null, p_logistica boolean default true)
returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_logistica, demora_dias, alerta_cada_horas)
  values (p_flujo, 'al fase ' || p_orden, p_orden, p_logistica, p_demora, p_horas) returning id;
$f$;

create or replace function pg_temp.al_vehiculo(p_origen uuid, p_fase uuid, p_dias numeric default 5, p_creado_por uuid default null) returns uuid
language sql as $f$
  insert into public.vehiculos (origen_id, titulo, fase_id, fase_desde, creado_por)
  values (p_origen, 'al vehículo', p_fase, now() - make_interval(secs => p_dias * 86400), p_creado_por) returning id;
$f$;

create or replace function pg_temp.al_avisos(p_usuario uuid, p_vehiculo uuid) returns int language sql as $f$
  select count(*)::int from public.notificaciones where usuario_id = p_usuario and referencia_id = p_vehiculo and tipo = 'demora_fase';
$f$;

create or replace function pg_temp.al_abiertos(p_usuario uuid, p_vehiculo uuid) returns int language sql as $f$
  select count(*)::int from public.notificaciones where usuario_id = p_usuario and referencia_id = p_vehiculo and tipo = 'demora_fase' and accionada_en is null;
$f$;

create or replace function pg_temp.al_avisadas(p_usuario uuid) returns uuid[] language sql as $f$
  select coalesce(array_agg(referencia_id order by referencia_id), '{}') from public.notificaciones where usuario_id = p_usuario and tipo = 'demora_fase';
$f$;

create or replace function pg_temp.al_mismos(p_que text, p_dio uuid[], p_debia uuid[]) returns void language plpgsql as $f$
begin
  if (select coalesce(array_agg(x order by x), '{}') from unnest(p_dio) x) is distinct from
     (select coalesce(array_agg(x order by x), '{}') from unnest(p_debia) x) then
    raise exception '%: debía avisar de % y avisó de %', p_que, p_debia, p_dio;
  end if;
end $f$;

-- @test alertas: una demorada deja una por destinatario, sólo a quien puede abrirla, y la segunda corrida no suma (A1)
begin;
do $$
declare
  a uuid := pg_temp.al_flujo(); o uuid := pg_temp.al_origen_de(a); f uuid := pg_temp.al_fase(a, 10, 3);
  otro uuid := pg_temp.al_origen_de(pg_temp.al_flujo());
  u1 uuid := pg_temp.al_moverdor(o);
  u2 uuid := pg_temp.al_persona(array['flujos.mover', 'logistica.ver', 'vehiculos.ver']);
  x_otro uuid := pg_temp.al_persona(array['flujos.mover@' || otro, 'logistica.ver', 'vehiculos.ver']);
  x_sin_log uuid := pg_temp.al_persona(array['flujos.mover@' || o, 'vehiculos.ver@' || o]);
  x_baja uuid := pg_temp.al_moverdor(o);
  v uuid; n record; v_total int;
begin
  update public.perfiles set activo = false where id = x_baja;
  v := pg_temp.al_vehiculo(o, f, 5);
  perform public.alertas_demora();
  if pg_temp.al_avisos(u1, v) <> 1 or pg_temp.al_avisos(u2, v) <> 1 then
    raise exception 'A1: cada destinatario debía tener una y tiene % y %', pg_temp.al_avisos(u1, v), pg_temp.al_avisos(u2, v);
  end if;
  if pg_temp.al_avisos(x_otro, v) + pg_temp.al_avisos(x_sin_log, v) + pg_temp.al_avisos(x_baja, v) <> 0 then
    raise exception 'A1: avisó a quien no debía (otro origen %, sin logistica.ver %, de baja %)',
      pg_temp.al_avisos(x_otro, v), pg_temp.al_avisos(x_sin_log, v), pg_temp.al_avisos(x_baja, v);
  end if;
  select * into n from public.notificaciones where usuario_id = u1 and referencia_id = v;
  if n.titulo <> 'Vehículo demorado en «al fase 10»' or n.cuerpo <> 'al vehículo lleva 5 días en la fase (el límite es 3)'
     or n.ruta <> '/logistica/vehiculo/' || v or n.referencia_tipo <> 'vehiculo' or not n.requiere_accion or n.leida_en is not null then
    raise exception 'A1: el aviso no es el esperado: %', to_jsonb(n);
  end if;
  select count(*) into v_total from public.notificaciones where referencia_id = v;
  perform public.alertas_demora();
  if (select count(*) from public.notificaciones where referencia_id = v) <> v_total then
    raise exception 'A1: la segunda corrida sumó avisos';
  end if;
end $$;
rollback;

-- @test alertas: pasado alerta_cada_horas se reabre la misma fila; antes no; nulo = 72 h (A2)
begin;
do $$
declare
  a uuid := pg_temp.al_flujo(); o uuid := pg_temp.al_origen_de(a);
  f2 uuid := pg_temp.al_fase(a, 10, 3, 2); fn uuid := pg_temp.al_fase(a, 20, 3);
  u uuid := pg_temp.al_moverdor(o);
  v uuid := pg_temp.al_vehiculo(o, f2, 5); w uuid := pg_temp.al_vehiculo(o, fn, 5);
  n1 bigint; m1 bigint; n record;
begin
  perform public.alertas_demora();
  select id into n1 from public.notificaciones where usuario_id = u and referencia_id = v;
  select id into m1 from public.notificaciones where usuario_id = u and referencia_id = w;
  update public.notificaciones set creado_en = now() - interval '1 hour', leida_en = now() where id = n1;
  perform public.alertas_demora();
  if (select leida_en from public.notificaciones where id = n1) is null then raise exception 'A2: reabrió antes de alerta_cada_horas'; end if;
  update public.notificaciones set creado_en = now() - interval '3 hours', titulo = 'viejo' where id = n1;
  perform public.alertas_demora();
  select * into n from public.notificaciones where usuario_id = u and referencia_id = v;
  if n.id <> n1 or n.leida_en is not null or n.creado_en <> now() or n.titulo <> 'Vehículo demorado en «al fase 10»' or pg_temp.al_avisos(u, v) <> 1 then
    raise exception 'A2: debía reabrir la misma fila: %', to_jsonb(n);
  end if;
  update public.notificaciones set creado_en = now() - interval '71 hours', leida_en = now() where id = m1;
  perform public.alertas_demora();
  if (select leida_en from public.notificaciones where id = m1) is null then raise exception 'A2: con alerta_cada_horas nulo reabrió a las 71 h'; end if;
  update public.notificaciones set creado_en = now() - interval '73 hours' where id = m1;
  perform public.alertas_demora();
  if (select leida_en is not null or creado_en <> now() from public.notificaciones where id = m1) or pg_temp.al_avisos(u, w) <> 1 then
    raise exception 'A2: con alerta_cada_horas nulo no reabrió a las 73 h';
  end if;
end $$;
rollback;

-- @test alertas: una accionada no se repite dentro de alerta_cada_horas; pasada, una nueva (A3)
begin;
do $$
declare
  a uuid := pg_temp.al_flujo(); o uuid := pg_temp.al_origen_de(a); f uuid := pg_temp.al_fase(a, 10, 3, 2);
  u uuid := pg_temp.al_moverdor(o); v uuid := pg_temp.al_vehiculo(o, f, 5); n1 bigint;
begin
  perform public.alertas_demora();
  select id into n1 from public.notificaciones where usuario_id = u and referencia_id = v;
  update public.notificaciones set accionada_en = now(), creado_en = now() - interval '1 hour' where id = n1;
  perform public.alertas_demora();
  if pg_temp.al_avisos(u, v) <> 1 then raise exception 'A3: repitió dentro de alerta_cada_horas'; end if;
  update public.notificaciones set creado_en = now() - interval '3 hours' where id = n1;
  perform public.alertas_demora();
  if pg_temp.al_avisos(u, v) <> 2 or pg_temp.al_abiertos(u, v) <> 1 then
    raise exception 'A3: pasada alerta_cada_horas debía haber dos (una abierta) y hay % (% abiertas)', pg_temp.al_avisos(u, v), pg_temp.al_abiertos(u, v);
  end if;
end $$;
rollback;

-- @test alertas: no avisan demora_dias 0, el default 0, la regla apagada, la final, la que no es de logística, la papelera ni dentro del límite (A4)
begin;
do $$
declare
  a uuid := pg_temp.al_flujo(); o uuid := pg_temp.al_origen_de(a);
  b uuid := pg_temp.al_flujo(false); ob uuid := pg_temp.al_origen_de(b);
  f0 uuid := pg_temp.al_fase(a, 10, 0); fnulo uuid := pg_temp.al_fase(a, 20, null);
  ffinal uuid := pg_temp.al_fase(a, 30, 3); fno uuid := pg_temp.al_fase(a, 40, 3, null, false);
  fok uuid := pg_temp.al_fase(a, 50, 3); fapagada uuid := pg_temp.al_fase(b, 10, 3);
  u uuid := pg_temp.al_persona(array['flujos.mover', 'logistica.ver', 'vehiculos.ver']);
  papelera uuid; vs uuid[];
begin
  update public.ajustes_empresa set demora_dias_default = 0 where id = 1;
  update public.fases set es_final = true where id = ffinal;
  papelera := pg_temp.al_vehiculo(o, fok, 5);
  update public.vehiculos set eliminado_en = now() where id = papelera;
  vs := array[pg_temp.al_vehiculo(o, f0, 30), pg_temp.al_vehiculo(o, fnulo, 30), pg_temp.al_vehiculo(o, ffinal, 30), pg_temp.al_vehiculo(o, fno, 30),
              pg_temp.al_vehiculo(ob, fapagada, 30), pg_temp.al_vehiculo(o, fok, 2), papelera];
  perform public.alertas_demora();
  if exists (select 1 from public.notificaciones where usuario_id = u and referencia_id = any (vs)) then
    raise exception 'A4: avisó de %', (select array_agg(referencia_id) from public.notificaciones where usuario_id = u and referencia_id = any (vs));
  end if;
end $$;
rollback;

-- @test alertas: mover la cierra para todos (sólo la demora de esa unidad) y, demorada en la fase nueva, avisa con una fila nueva (A5)
begin;
do $$
declare
  a uuid := pg_temp.al_flujo(); o uuid := pg_temp.al_origen_de(a);
  f uuid := pg_temp.al_fase(a, 10, 3); f2 uuid := pg_temp.al_fase(a, 20, 3);
  u1 uuid := pg_temp.al_moverdor(o); u2 uuid := pg_temp.al_moverdor(o);
  v1 uuid := pg_temp.al_vehiculo(o, f, 5); v2 uuid := pg_temp.al_vehiculo(o, f, 5); otro bigint;
begin
  insert into public.notificaciones (usuario_id, tipo, titulo, referencia_tipo, referencia_id) values (u1, 'al_otro', 'otro tipo', 'vehiculo', v1)
  returning id into otro;
  perform public.alertas_demora();
  if pg_temp.al_abiertos(u1, v1) + pg_temp.al_abiertos(u2, v1) + pg_temp.al_abiertos(u1, v2) <> 3 then raise exception 'A5: faltan avisos antes de mover'; end if;
  update public.vehiculos set fase_id = f2, fase_desde = now() where id = v1;
  insert into public.historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id) values (a, v1, f, f2);
  if pg_temp.al_abiertos(u1, v1) + pg_temp.al_abiertos(u2, v1) <> 0 then raise exception 'A5: mover no cerró los avisos de la unidad'; end if;
  if pg_temp.al_abiertos(u1, v2) <> 1 then raise exception 'A5: mover cerró el aviso de otra unidad'; end if;
  if (select accionada_en from public.notificaciones where id = otro) is not null then raise exception 'A5: mover cerró un aviso de otro tipo'; end if;
  -- Demorada otra vez en la fase nueva: el aviso cerrado es de antes de fase_desde.
  update public.notificaciones set creado_en = now() - interval '6 days' where referencia_id = v1 and tipo = 'demora_fase';
  update public.vehiculos set fase_desde = now() - interval '5 days' where id = v1;
  perform public.alertas_demora();
  if pg_temp.al_avisos(u1, v1) <> 2 or pg_temp.al_abiertos(u1, v1) <> 1 then raise exception 'A5: en la fase nueva no avisó con una fila nueva'; end if;
end $$;
rollback;

-- @test alertas: manda el menor alcance de flujos.mover, logistica.ver y vehiculos.ver (A6)
begin;
do $$
declare
  a uuid := pg_temp.al_flujo(); o uuid := pg_temp.al_origen_de(a); f uuid := pg_temp.al_fase(a, 10, 3);
  prop uuid := pg_temp.al_persona(array['flujos.mover@' || o || '#propios', 'logistica.ver@' || o, 'vehiculos.ver@' || o]);
  mix_l uuid := pg_temp.al_persona(array['flujos.mover@' || o, 'logistica.ver@' || o || '#propios', 'vehiculos.ver@' || o]);
  mix_v uuid := pg_temp.al_persona(array['flujos.mover@' || o, 'logistica.ver@' || o, 'vehiculos.ver@' || o || '#propios']);
  v_lead uuid; v_prop uuid; v_cartera uuid; v_mix_l uuid; v_mix_v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('AL lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), prop) returning id into v_lead;
  if not exists (select 1 from public.leads_asesores where lead_id = v_lead and usuario_id = prop and revocado_en is null) then
    raise exception 'A6: la prueba necesita el lead en la cartera de quien lo creó';
  end if;
  v_prop := pg_temp.al_vehiculo(o, f, 5, prop);
  v_cartera := pg_temp.al_vehiculo(o, f, 5);
  update public.vehiculos set lead_id = v_lead where id = v_cartera;
  perform pg_temp.al_vehiculo(o, f, 5);
  v_mix_l := pg_temp.al_vehiculo(o, f, 5, mix_l);
  v_mix_v := pg_temp.al_vehiculo(o, f, 5, mix_v);
  perform public.alertas_demora();
  perform pg_temp.al_mismos('A6 flujos.mover propios', pg_temp.al_avisadas(prop), array[v_prop, v_cartera]);
  perform pg_temp.al_mismos('A6 logistica.ver propios', pg_temp.al_avisadas(mix_l), array[v_mix_l]);
  perform pg_temp.al_mismos('A6 vehiculos.ver propios', pg_temp.al_avisadas(mix_v), array[v_mix_v]);
end $$;
rollback;

-- @test alertas: la app no ejecuta las funciones del job ni la del trigger (A7)
do $$
declare fn text;
begin
  foreach fn in array array['public.alertas_demora()', 'public._alcance_de_usuario(uuid, text, uuid)', 'public._alertas_destinatarios(text, uuid)',
                            'public._alerta_demora_avisar(uuid, text, uuid, text, timestamptz, integer, integer, uuid)', 'public.alertas_cerrar_al_mover()'] loop
    if has_function_privilege('authenticated', fn, 'execute') or has_function_privilege('anon', fn, 'execute') then
      raise exception 'A7: % se puede ejecutar desde la app', fn;
    end if;
  end loop;
end $$;
