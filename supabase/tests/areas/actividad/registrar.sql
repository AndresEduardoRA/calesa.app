-- Quién escribe la actividad y quién lee su `detalle` (paso 9.01-2). No depende de otro archivo (`SOLO=areas/actividad/registrar.sql`).
--
-- Qué asegura:
--   T1. La app (authenticated, anon) no ejecuta `registrar_actividad()`: sólo la llaman funciones `security definer`, y service_role.
--   T2. Ninguna función de invocador llama a `registrar_actividad()` (fallaría con 42501 al quitarle el execute a la app).
--   T4. El detector de T2 encuentra una invocadora plpgsql y una `begin atomic` (lee `pg_get_functiondef`, no `prosrc`).

-- @test actividad: los ayudantes de registrar
reset role;
-- Lo que devuelve un SQL corrido como esa persona (un jsonb).
create or replace function pg_temp.reg_como(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v;
end $f$;

-- El sqlstate de un SQL corrido como esa persona, u «ok».
create or replace function pg_temp.reg_error(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform pg_temp.reg_como(p_quien, p_sql);
  return 'ok';
exception when others then
  reset role;
  return sqlstate;
end $f$;

-- Una persona con `actividad.ver` (sin origen: vale en todos). Devuelve su id.
create or replace function pg_temp.reg_persona() returns uuid language plpgsql as $f$
declare p uuid := '00000000-0000-4000-8000-0000000990a1'; v_rol uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'REG 1', invitacion_aceptada_en = now() where id = p;
  insert into public.roles (clave, nombre) values ('reg_rol_1', 'REG rol 1') returning id into v_rol;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'actividad.ver', null, 'todos');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
  values (p, v_rol, not exists (select 1 from public.usuarios_roles where usuario_id = p));
  return p;
end $f$;

-- Las funciones de invocador que llaman a registrar_actividad (fuera de los esquemas del sistema).
create or replace function pg_temp.reg_invocadoras() returns text[] language sql as $f$
  select coalesce(array_agg(p.oid::regprocedure::text order by 1), '{}')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg\_temp%' and n.nspname not like 'pg\_toast%'
     and p.prokind in ('f', 'p') and not p.prosecdef and p.proname <> 'registrar_actividad'
     and pg_get_functiondef(p.oid) ~ 'registrar_actividad\s*\('
$f$;

-- @test actividad: la app no ejecuta registrar_actividad (T1)
do $$
declare
  f constant text := 'public.registrar_actividad(text,text,text,jsonb,jsonb,jsonb)';
  p uuid; v text;
begin
  if has_function_privilege('authenticated', f, 'execute') then raise exception 'T1: authenticated ejecuta registrar_actividad'; end if;
  if has_function_privilege('anon', f, 'execute') then raise exception 'T1: anon ejecuta registrar_actividad'; end if;
  if not has_function_privilege('service_role', f, 'execute') then raise exception 'T1: service_role no ejecuta registrar_actividad'; end if;
  p := pg_temp.reg_persona();
  v := pg_temp.reg_error(p, $q$select null::jsonb from public.registrar_actividad('x.prueba', 'leads', '1')$q$);
  if v <> '42501' then raise exception 'T1: una persona con sesión llamó a registrar_actividad (%)', v; end if;
  raise exception using errcode = 'P0001', message = 'deshacer';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'deshacer' then raise; end if;
end $$;

-- @test actividad: sólo funciones definer llaman a registrar_actividad (T2)
do $$
declare v text[] := pg_temp.reg_invocadoras();
begin
  if cardinality(v) > 0 then raise exception 'T2: funciones de invocador que llaman a registrar_actividad: %', v; end if;
end $$;

-- @test actividad: el detector de T2 encuentra una invocadora que llama a registrar_actividad (T4)
do $$
declare v text[];
begin
  create function public.reg_sonda_plpgsql() returns void language plpgsql as $f$
  begin perform public.registrar_actividad('x', 'y', 'z'); end $f$;
  create function public.reg_sonda_atomica() returns void language sql begin atomic select public.registrar_actividad('x', 'y', 'z'); end;
  v := pg_temp.reg_invocadoras();
  if not ('reg_sonda_plpgsql()' = any (v) and 'reg_sonda_atomica()' = any (v)) then
    raise exception 'T4: el detector no vio las dos sondas invocadoras: %', v;
  end if;
  alter function public.reg_sonda_plpgsql() security definer set search_path = '';
  v := pg_temp.reg_invocadoras();
  if 'reg_sonda_plpgsql()' = any (v) or not 'reg_sonda_atomica()' = any (v) then
    raise exception 'T4: con security definer el detector debió ver sólo la atómica: %', v;
  end if;
  raise exception using errcode = 'P0001', message = 'deshacer';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'deshacer' then raise; end if;
end $$;
