-- Los avisos de documentos por vencer (paso 6.12-1): `documentos_vencimientos()`. No depende de otro archivo (`SOLO=areas/alertas/vencimientos.sql`):
-- cada bloque abre su transacción y la revierte. Las cuentas miran sólo las personas y documentos de cada bloque.
--
-- Qué asegura:
--   V1. Un documento aprobado que vence en 5 días, tipo `renovar` con `aviso_dias = 7`: una `documento_por_vencer` por persona con
--       logistica.documentos.subir del origen, con su texto; la segunda corrida no suma, y tras accionarla tampoco (avisa una vez).
--   V2. Con `solicitar`, el cuerpo pide uno nuevo.
--   V3. No avisan: fuera de la ventana, `aviso_dias` nulo, `ninguno`, vencido, subido, rechazado, eliminado, el vehículo en la papelera, quien no tiene la
--       clave en el origen; con la clave en `propios`, sólo el de su unidad. La app no ejecuta las funciones.
-- Un documento de repuesto no entra por construcción (la lectura une `vehiculos` por `vehiculo_id`); sus avisos son de la Fase 8.

create or replace function pg_temp.av_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-av@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave`, `clave@origen` y opcionalmente `#propios` (si no, `todos`).
create or replace function pg_temp.av_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text; k text;
begin
  perform pg_temp.av_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('av_' || substr(v_id::text, 1, 8), 'av ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    k := split_part(c, '#', 1);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(k, '@', 1), nullif(split_part(k, '@', 2), '')::uuid, coalesce(nullif(split_part(c, '#', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.av_subidor(p_origen uuid, p_alcance text default '') returns uuid language sql as $f$
  select pg_temp.av_persona(array['logistica.documentos.subir@' || p_origen || p_alcance, 'logistica.ver@' || p_origen, 'vehiculos.ver@' || p_origen]);
$f$;

create or replace function pg_temp.av_origen() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('av_' || s, 'av origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

create or replace function pg_temp.av_tipo(p_modo text, p_aviso int) returns uuid language sql as $f$
  insert into public.tipos_documento (nombre, modo_vencimiento, vigencia_dias, aviso_dias)
  values ('AV tipo ' || substr(gen_random_uuid()::text, 1, 8), p_modo::public.modo_vencimiento, case when p_modo = 'renovar' then 30 end, p_aviso)
  returning id;
$f$;

create or replace function pg_temp.av_hoy() returns date language sql as $f$
  select (now() at time zone e.zona_horaria)::date from public.ajustes_empresa e where e.id = 1;
$f$;

create or replace function pg_temp.av_vehiculo(p_origen uuid, p_creado_por uuid default null) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo, creado_por) values (p_origen, 'av vehículo', p_creado_por) returning id;
$f$;

create or replace function pg_temp.av_documento(p_vehiculo uuid, p_tipo uuid, p_vence_en int, p_estado text default 'aprobado') returns uuid
language plpgsql as $f$
declare d uuid;
begin
  -- Nadie nace aprobado (documento_sellos): se inserta subido y se revisa.
  insert into public.documentos (vehiculo_id, tipo_documento_id, vence_el) values (p_vehiculo, p_tipo, pg_temp.av_hoy() + p_vence_en) returning id into d;
  if p_estado <> 'subido' then
    update public.documentos set estado = p_estado::public.estado_documento, motivo_rechazo = case when p_estado = 'rechazado' then 'av' end where id = d;
  end if;
  return d;
end $f$;

create or replace function pg_temp.av_avisos(p_usuario uuid, p_documento uuid) returns int language sql as $f$
  select count(*)::int from public.notificaciones where usuario_id = p_usuario and referencia_id = p_documento and tipo = 'documento_por_vencer';
$f$;

create or replace function pg_temp.av_fecha(p date) returns text language sql as $f$
  select extract(day from p)::int || ' ' || (array['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'])[extract(month from p)::int]
         || ' ' || extract(year from p)::int;
$f$;

-- @test vencimientos: vence en 5 días con aviso_dias 7 (renovar): una por persona con la clave, con su texto, y avisa una sola vez (V1)
begin;
do $$
declare
  o uuid := pg_temp.av_origen(); t uuid := pg_temp.av_tipo('renovar', 7);
  u1 uuid := pg_temp.av_subidor(o); u2 uuid := pg_temp.av_persona(array['logistica.documentos.subir', 'logistica.ver', 'vehiculos.ver']);
  v uuid := pg_temp.av_vehiculo(o); d uuid := pg_temp.av_documento(v, t, 5); n record;
begin
  perform public.documentos_vencimientos();
  if pg_temp.av_avisos(u1, d) <> 1 or pg_temp.av_avisos(u2, d) <> 1 then
    raise exception 'V1: cada persona debía tener una y tiene % y %', pg_temp.av_avisos(u1, d), pg_temp.av_avisos(u2, d);
  end if;
  select * into n from public.notificaciones where usuario_id = u1 and referencia_id = d;
  if n.titulo <> 'Documento por vencer: «' || (select nombre from public.tipos_documento where id = t) || '»'
     or n.cuerpo <> 'av vehículo · vence el ' || pg_temp.av_fecha(pg_temp.av_hoy() + 5) || '. Sube el nuevo para renovarlo.'
     or n.ruta <> '/logistica/vehiculo/' || v or n.referencia_tipo <> 'documento' or not n.requiere_accion then
    raise exception 'V1: el aviso no es el esperado: %', to_jsonb(n);
  end if;
  perform public.documentos_vencimientos();
  if pg_temp.av_avisos(u1, d) <> 1 then raise exception 'V1: la segunda corrida sumó'; end if;
  update public.notificaciones set accionada_en = now() where usuario_id = u1 and referencia_id = d;
  perform public.documentos_vencimientos();
  if pg_temp.av_avisos(u1, d) <> 1 then raise exception 'V1: tras accionarla avisó otra vez'; end if;
end $$;
rollback;

-- @test vencimientos: con solicitar, el cuerpo pide uno nuevo (V2)
begin;
do $$
declare
  o uuid := pg_temp.av_origen(); t uuid := pg_temp.av_tipo('solicitar', 7);
  u uuid := pg_temp.av_subidor(o); d uuid := pg_temp.av_documento(pg_temp.av_vehiculo(o), t, 5);
begin
  perform public.documentos_vencimientos();
  if (select cuerpo from public.notificaciones where usuario_id = u and referencia_id = d)
     is distinct from 'av vehículo · vence el ' || pg_temp.av_fecha(pg_temp.av_hoy() + 5) || '. Pide uno nuevo antes de que venza.' then
    raise exception 'V2: el cuerpo no es el de solicitar: %', (select cuerpo from public.notificaciones where usuario_id = u and referencia_id = d);
  end if;
end $$;
rollback;

-- @test vencimientos: no avisan fuera de la ventana, sin aviso, vencido, no aprobado, eliminado, papelera, sin la clave; propios sólo lo suyo (V3)
begin;
do $$
declare
  o uuid := pg_temp.av_origen(); otro uuid := pg_temp.av_origen();
  t uuid := pg_temp.av_tipo('renovar', 7); t_nulo uuid := pg_temp.av_tipo('solicitar', null); t_ninguno uuid := pg_temp.av_tipo('ninguno', 7);
  u uuid := pg_temp.av_subidor(o);
  x_otro uuid := pg_temp.av_persona(array['logistica.documentos.subir@' || otro, 'logistica.ver', 'vehiculos.ver']);
  prop uuid := pg_temp.av_subidor(o, '#propios');
  v uuid := pg_temp.av_vehiculo(o); v_papelera uuid := pg_temp.av_vehiculo(o); v_prop uuid := pg_temp.av_vehiculo(o, prop);
  d_ok uuid; d_prop uuid; d_eliminado uuid; malos uuid[];
begin
  update public.vehiculos set eliminado_en = now() where id = v_papelera;
  d_ok := pg_temp.av_documento(v, t, 5);
  d_prop := pg_temp.av_documento(v_prop, t, 5);
  d_eliminado := pg_temp.av_documento(v, t, 5);
  update public.documentos set eliminado_en = now() where id = d_eliminado;
  malos := array[pg_temp.av_documento(v, t, 10), pg_temp.av_documento(v, t_nulo, 5), pg_temp.av_documento(v, t_ninguno, 5),
                 pg_temp.av_documento(v, t, -1), pg_temp.av_documento(v, t, 5, 'subido'), pg_temp.av_documento(v, t, 5, 'rechazado'),
                 d_eliminado, pg_temp.av_documento(v_papelera, t, 5)];
  perform public.documentos_vencimientos();
  if exists (select 1 from public.notificaciones where referencia_id = any (malos)) then
    raise exception 'V3: avisó de %', (select array_agg(distinct referencia_id) from public.notificaciones where referencia_id = any (malos));
  end if;
  if pg_temp.av_avisos(u, d_ok) <> 1 or pg_temp.av_avisos(u, d_prop) <> 1 then raise exception 'V3: la prueba necesita los dos avisos de quien ve todo'; end if;
  if pg_temp.av_avisos(x_otro, d_ok) <> 0 then raise exception 'V3: avisó a quien tiene la clave en otro origen'; end if;
  if pg_temp.av_avisos(prop, d_ok) <> 0 or pg_temp.av_avisos(prop, d_prop) <> 1 then raise exception 'V3: propios debía recibir sólo el de su unidad'; end if;
  if has_function_privilege('authenticated', 'public.documentos_vencimientos()', 'execute')
     or has_function_privilege('anon', 'public.documentos_vencimientos()', 'execute')
     or has_function_privilege('authenticated', 'public._documento_vencimiento_avisar(uuid, uuid, text, text, timestamptz, uuid)', 'execute') then
    raise exception 'V3: la app ejecuta las funciones de vencimientos';
  end if;
end $$;
rollback;
