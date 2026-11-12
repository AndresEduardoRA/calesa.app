-- La cola web del tablero en la base (paso 9.11-1), 2 de 2: las cifras del período. Los permisos y los privilegios de `tablero_cola_web` están en
-- `margen-y-cola.sql` (R4 y R5). No depende de otro archivo (`SOLO=areas/tablero/cola-web.sql`); los ayudantes son copia de `margen-y-cola.sql`. Cada
-- bloque abre su transacción y la revierte. Marzo de 2020 y de 2019: nada sembrado ahí.
--
-- Qué asegura:
--   R6. La cola de marzo de 2020 con cifras exactas: la directa no cuenta en la tasa ni en la mediana; los bordes del mes en la zona de la empresa.
--   R7. Un período sin solicitudes: las cinco claves en 0 y la tasa y la mediana nulas.

-- Una persona activa con estas claves (`clave[:alcance[:origen]]`) y su nombre.
create or replace function pg_temp.tmc_persona(p_claves text[], p_nombre text default 'TMC persona') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'tmc-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = p_nombre where id = v_id;
  insert into public.roles (clave, nombre) values ('tmc_' || substr(v_id::text, 1, 8), 'TMC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.tmc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', sqlstate, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.tmc_zona() returns text language sql as $f$
  select coalesce((select zona_horaria from public.ajustes_empresa where id = 1), 'America/La_Paz');
$f$;

create or replace function pg_temp.tmc_claves(p jsonb) returns text language sql as $f$
  select string_agg(k, ',' order by k) from jsonb_object_keys(p) k;
$f$;

-- Un monto de una respuesta, como número (nulo si la hoja es null).
create or replace function pg_temp.tmc_n(p jsonb, p_clave text) returns numeric language sql as $f$
  select (p ->> p_clave)::numeric;
$f$;

-- Una solicitud de la cola con sus horas explícitas (el `asignada_en` por omisión es now()), a una hora de la zona de la empresa.
create or replace function pg_temp.tmc_solicitud(p_usuario uuid, p_estado public.estado_solicitud_web, p_asignada timestamp,
                                                 p_minutos int default null, p_directa boolean default false) returns void language sql as $f$
  insert into public.solicitudes_contacto_web (codigo, token_visitante, usuario_id, estado, es_directa, fuente, asignada_en, contactada_en, contactada_por, creado_en)
  values ('TMC-' || substr(gen_random_uuid()::text, 1, 8), 'tmc_visitante_0123456789', p_usuario, p_estado, p_directa, 'ficha',
          p_asignada at time zone pg_temp.tmc_zona(),
          case when p_minutos is not null then (p_asignada + make_interval(mins => p_minutos)) at time zone pg_temp.tmc_zona() end,
          case when p_minutos is not null then p_usuario end,
          p_asignada at time zone pg_temp.tmc_zona());
$f$;

-- @test tablero: R6 · la cola del período con cifras exactas; la directa no cuenta en la tasa
begin;
do $$
declare x uuid := pg_temp.tmc_persona(array['web.cola.participar'], 'TMC Ximena'); y uuid := pg_temp.tmc_persona(array['web.cola.participar'], 'TMC Yolanda');
  q uuid := pg_temp.tmc_persona(array['web.cola.gestionar']); m jsonb; pp jsonb;
begin
  perform pg_temp.tmc_solicitud(x, 'contactada', '2020-03-02 10:00', 10);
  perform pg_temp.tmc_solicitud(x, 'contactada', '2020-03-05 11:00', 30);
  perform pg_temp.tmc_solicitud(x, 'vencida', '2020-03-06 09:00');
  perform pg_temp.tmc_solicitud(y, 'asignada', '2020-03-10 15:00');
  perform pg_temp.tmc_solicitud(y, 'contactada', '2020-03-11 16:00', 1, true);
  perform pg_temp.tmc_solicitud(null, 'sin_asignar', '2020-03-12 08:00');
  perform pg_temp.tmc_solicitud(null, 'cancelada', '2020-03-31 23:30');
  perform pg_temp.tmc_solicitud(x, 'asignada', '2020-04-01 00:00');
  m := pg_temp.tmc_corre(q, $q$select public.tablero_cola_web('2020-03-01', '2020-03-31')$q$);
  if pg_temp.tmc_claves(m) is distinct from 'asignadas,contactadas,desde,directas,hasta,mediana_minutos,por_estado,por_persona,por_persona_hay_mas,tasa,total,zona' then
    raise exception 'R6: claves %', pg_temp.tmc_claves(m);
  end if;
  if (m ->> 'total')::int is distinct from 7
     or m -> 'por_estado' is distinct from '{"asignada": 1, "contactada": 3, "vencida": 1, "sin_asignar": 1, "cancelada": 1}'::jsonb
     or (m ->> 'directas')::int is distinct from 1 or (m ->> 'asignadas')::int is distinct from 4 or (m ->> 'contactadas')::int is distinct from 2
     or pg_temp.tmc_n(m, 'tasa') is distinct from 0.5 or pg_temp.tmc_n(m, 'mediana_minutos') is distinct from 20.0 then
    raise exception 'R6: debía dar 7, directas 1, asignadas 4, contactadas 2, tasa 0,5 y mediana 20,0: %', m;
  end if;
  pp := m -> 'por_persona';
  if jsonb_array_length(pp) <> 2 or (m -> 'por_persona_hay_mas') <> 'false'::jsonb
     or pp -> 0 ->> 'usuario_id' is distinct from x::text or pp -> 0 ->> 'nombre' <> 'TMC Ximena' or (pp -> 0 ->> 'asignadas')::int <> 3
     or (pp -> 0 ->> 'contactadas')::int <> 2 or pg_temp.tmc_n(pp -> 0, 'tasa') <> 0.6667 or pg_temp.tmc_n(pp -> 0, 'mediana_minutos') <> 20.0
     or pp -> 1 ->> 'usuario_id' is distinct from y::text or (pp -> 1 ->> 'asignadas')::int <> 1 or (pp -> 1 ->> 'contactadas')::int <> 0
     or pg_temp.tmc_n(pp -> 1, 'tasa') <> 0 or pp -> 1 -> 'mediana_minutos' <> 'null'::jsonb then
    raise exception 'R6: por_persona debía ser X {3, 2, 0,6667, 20,0} e Y {1, 0, 0, null}: %', pp;
  end if;
end $$;
rollback;

-- @test tablero: R7 · la cola de un período sin solicitudes
begin;
do $$
declare m jsonb := pg_temp.tmc_corre(pg_temp.tmc_persona(array['web.cola.gestionar']), $q$select public.tablero_cola_web('2019-03-01', '2019-03-31')$q$);
begin
  if (m ->> 'total')::int is distinct from 0
     or m -> 'por_estado' is distinct from '{"asignada": 0, "contactada": 0, "vencida": 0, "sin_asignar": 0, "cancelada": 0}'::jsonb
     or m -> 'tasa' <> 'null'::jsonb or m -> 'mediana_minutos' <> 'null'::jsonb or m -> 'por_persona' <> '[]'::jsonb then
    raise exception 'R7: sin solicitudes debía dar ceros y nulos: %', m;
  end if;
end $$;
rollback;
