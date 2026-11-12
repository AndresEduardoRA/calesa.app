-- @test dominancia sobre la persona: la siembra
-- 9-1 (paso 9.03-1, regla del 2026-10-21): nadie bloquea, desbloquea, da de baja ni cambia los roles de quien tiene permisos que él no
-- cubre; el dueño sí, sobre todos. Este archivo siembra sus personas («Dom …») y roles (`dom_…`) y los borra en el último bloque; cada
-- bloque de en medio corre en su transacción revertida. `pg_temp.dom_como(quien, sql)` corre un SQL como esa persona y devuelve
-- 'ok' o «<sqlstate> <mensaje>» (lo que hizo una llamada que cae se revierte con ella).
--   D dueño (rol `dueno`)      A `dom_equipo` (todo el módulo equipo)      B `dom_ver` + `dom_numero`      C `dom_equipo` + `dom_numero`
--   E sólo `dom_ver`           F sin roles                                 G sin roles (no ve al equipo)
--   origen y alcance, con `vehiculos.ver`: X en O «propios», X2 en O «todos», W global «todos»; Y en O «todos», Y2 en O «propios»,
--   Z global «todos», V en O2 «todos».
insert into auth.users (id, email, raw_app_meta_data)
select ('00000000-0000-4000-8000-0000000' || x.sufijo)::uuid, 'dom-' || x.letra || '@ejemplo.com', '{"invitado": true}'::jsonb
from (values ('dd0d0', 'd'), ('dd0a0', 'a'), ('dd0b0', 'b'), ('dd0c0', 'c'), ('dd0e0', 'e'), ('dd0f0', 'f'), ('dd0a9', 'g'),
  ('dd1a1', 'x'), ('dd1a2', 'x2'), ('dd1a3', 'w'), ('dd1b1', 'y'), ('dd1b2', 'y2'), ('dd1b3', 'z'), ('dd1b4', 'v')) x (sufijo, letra);
update public.perfiles set nombre = 'Dom ' || upper(split_part(split_part(email::text, '@', 1), '-', 2)), invitacion_aceptada_en = now()
where email::text like 'dom-%@ejemplo.com';
insert into public.roles (clave, nombre) values
  ('dom_equipo', 'Dom equipo'), ('dom_ver', 'Dom ver'), ('dom_ver2', 'Dom ver 2'), ('dom_numero', 'Dom número'),
  ('dom_op', 'Dom O propios'), ('dom_ot', 'Dom O todos'), ('dom_g', 'Dom global'), ('dom_o2', 'Dom O2 todos');
insert into public.roles_permisos (rol_id, permiso_clave)
select (select id from public.roles where clave = 'dom_equipo'), clave from public.permisos where modulo = 'equipo';
insert into public.roles_permisos (rol_id, permiso_clave) values
  ((select id from public.roles where clave = 'dom_ver'), 'equipo.usuarios.ver'),
  ((select id from public.roles where clave = 'dom_ver2'), 'equipo.roles.ver'),
  ((select id from public.roles where clave = 'dom_numero'), 'leads.numero_global.ver');
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select (select id from public.roles where clave = x.rol), 'vehiculos.ver', o.ids[x.cual], x.alcance::public.alcance_permiso
from (select array_agg(id order by orden, id) as ids from public.origenes) o,
  (values ('dom_op', 1, 'propios'), ('dom_ot', 1, 'todos'), ('dom_g', null, 'todos'), ('dom_o2', 2, 'todos')) x (rol, cual, alcance);
insert into public.usuarios_roles (usuario_id, rol_id)
select ('00000000-0000-4000-8000-0000000' || x.sufijo)::uuid, (select id from public.roles where clave = x.rol)
from (values ('dd0d0', 'dueno'), ('dd0a0', 'dom_equipo'), ('dd0b0', 'dom_ver'), ('dd0b0', 'dom_numero'), ('dd0c0', 'dom_equipo'),
  ('dd0c0', 'dom_numero'), ('dd0e0', 'dom_ver'), ('dd1a1', 'dom_op'), ('dd1a2', 'dom_ot'), ('dd1a3', 'dom_g'), ('dd1b1', 'dom_ot'),
  ('dd1b2', 'dom_op'), ('dd1b3', 'dom_g'), ('dd1b4', 'dom_o2')) x (sufijo, rol)
on conflict do nothing;
create function pg_temp.dom(p_letra text) returns uuid language sql immutable as $f$
  select ('00000000-0000-4000-8000-0000000' || case p_letra when 'D' then 'dd0d0' when 'A' then 'dd0a0' when 'B' then 'dd0b0'
    when 'C' then 'dd0c0' when 'E' then 'dd0e0' when 'F' then 'dd0f0' when 'G' then 'dd0a9' when 'X' then 'dd1a1' when 'X2' then 'dd1a2'
    when 'W' then 'dd1a3' when 'Y' then 'dd1b1' when 'Y2' then 'dd1b2' when 'Z' then 'dd1b3' when 'V' then 'dd1b4' else 'dd0ff' end)::uuid;
$f$;
create function pg_temp.dom_rol(p_clave text) returns uuid language sql stable as $f$ select id from public.roles where clave = p_clave $f$;
create function pg_temp.dom_como(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  begin
    set local role authenticated;
    execute p_sql;
    reset role;
    return 'ok';
  exception when others then
    reset role;
    return sqlstate || ' ' || sqlerrm;
  end;
end $f$;
create function pg_temp.dom_espero(p_quien text, p_sql text, p_esperado text) returns void language plpgsql as $f$
declare v text := pg_temp.dom_como(pg_temp.dom(p_quien), p_sql);
begin
  if v is distinct from p_esperado then raise exception '% «%»: esperaba «%», fue «%»', p_quien, p_sql, p_esperado, v; end if;
end $f$;
-- ¿Domina `quien` a `a`? Como `postgres`, con `request.jwt.claim.sub` puesto: las privadas no son de `authenticated`.
create function pg_temp.dom_domina(p_quien text, p_a text) returns boolean language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', pg_temp.dom(p_quien)::text, true);
  return public.persona_dominada(pg_temp.dom(p_a));
end $f$;

-- @test dominancia sobre la persona: A sin `leads.numero_global.ver` no bloquea, no da de baja ni cambia los roles de B, que lo tiene
begin;
do $$
declare b text := pg_temp.dom('B')::text; m text := ': tiene permisos que tú no tienes.';
begin
  perform pg_temp.dom_espero('A', format('select public.equipo_bloquear(%L, true)', b), '42501 No puedes bloquear a Dom B' || m);
  perform pg_temp.dom_espero('A', format('select public.equipo_dar_de_baja(%L)', b), '42501 No puedes dar de baja a Dom B' || m);
  -- `dom_ver2` lo domina A y B no lo tiene: cae por la persona, no por el rol.
  perform pg_temp.dom_espero('A', format('select public.rbac_asignar_rol(%L, %L)', b, pg_temp.dom_rol('dom_ver2')),
    '42501 No puedes cambiar los roles de Dom B' || m);
  perform pg_temp.dom_espero('A', format('select public.rbac_quitar_rol(%L, %L)', b, pg_temp.dom_rol('dom_ver')),
    '42501 No puedes cambiar los roles de Dom B' || m);
  if (select not activo or bloqueado from public.perfiles where id = b::uuid) then raise exception 'B cambió de estado'; end if;
  if (select array_agg(r.clave order by r.clave) from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where ur.usuario_id = b::uuid)
     is distinct from array['dom_numero', 'dom_ver'] then
    raise exception 'los roles de B cambiaron';
  end if;
  -- Desbloquear también exige dominar (D1).
  update public.perfiles set bloqueado = true, bloqueado_en = now() where id = b::uuid;
  -- La dominancia va antes que el estado: bloquear a quien ya está bloqueada no dice «ya estaba» a quien no la domina.
  perform pg_temp.dom_espero('A', format('select public.equipo_bloquear(%L, true)', b), '42501 No puedes bloquear a Dom B' || m);
  perform pg_temp.dom_espero('A', format('select public.equipo_bloquear(%L, false)', b), '42501 No puedes desbloquear a Dom B' || m);
  if not (select bloqueado from public.perfiles where id = b::uuid) then raise exception 'A desbloqueó a B'; end if;
end $$;
rollback;

-- @test dominancia sobre la persona: el dueño puede sobre B aunque a su rol le falte un permiso de B
-- Sin quitarle nada, el rol `dueno` del seed cubre todo el catálogo y la rama «el dueño domina a todos» no se probaría.
begin;
delete from public.roles_permisos where rol_id = pg_temp.dom_rol('dueno') and permiso_clave = 'leads.numero_global.ver';
do $$
declare b text := pg_temp.dom('B')::text; r2 text := pg_temp.dom_rol('dom_ver2')::text;
begin
  perform pg_temp.dom_espero('D', format('select public.equipo_bloquear(%L, true)', b), 'ok');
  perform pg_temp.dom_espero('D', format('select public.equipo_bloquear(%L, false)', b), 'ok');
  perform pg_temp.dom_espero('D', format('select public.rbac_asignar_rol(%L, %L)', b, r2), 'ok');
  perform pg_temp.dom_espero('D', format('select public.rbac_quitar_rol(%L, %L)', b, r2), 'ok');
  perform set_config('request.jwt.claim.sub', pg_temp.dom('D')::text, true);
  set local role authenticated;
  if not exists (select 1 from public.personas_dominadas(array[b::uuid]) x where x = b::uuid) then raise exception 'personas_dominadas no dio B al dueño'; end if;
  reset role;
  perform pg_temp.dom_espero('D', format('select public.equipo_dar_de_baja(%L)', b), 'ok');
  if (select activo from public.perfiles where id = b::uuid) then raise exception 'B sigue activa'; end if;
end $$;
rollback;

-- @test dominancia sobre la persona: quien cubre todo lo de la persona puede; una persona sin roles la domina cualquiera
begin;
do $$
begin
  perform pg_temp.dom_espero('C', format('select public.equipo_bloquear(%L, true)', pg_temp.dom('B')), 'ok');
  perform pg_temp.dom_espero('C', format('select public.rbac_asignar_rol(%L, %L)', pg_temp.dom('B'), pg_temp.dom_rol('dom_ver2')), 'ok');
  perform pg_temp.dom_espero('A', format('select public.equipo_bloquear(%L, true)', pg_temp.dom('E')), 'ok');
  perform pg_temp.dom_espero('A', format('select public.rbac_asignar_rol(%L, %L)', pg_temp.dom('F'), pg_temp.dom_rol('dom_ver')), 'ok');
  if (select bloqueado_por from public.perfiles where id = pg_temp.dom('B')) is distinct from pg_temp.dom('C') then raise exception 'C no bloqueó a B'; end if;
end $$;
rollback;

-- @test dominancia sobre la persona: origen y alcance se comparan como en rol_dominado()
begin;
do $$
declare r record;
begin
  for r in select * from (values
      ('X', 'Y2', true), ('X', 'Y', false), ('X', 'Z', false),
      ('X2', 'Y', true), ('X2', 'Y2', true), ('X2', 'Z', false), ('X2', 'V', false),
      ('W', 'Y', true), ('W', 'Y2', true), ('W', 'Z', true), ('W', 'V', true),
      ('X', 'X', true), ('D', 'V', true), ('X', 'fantasma', false)) x (quien, a, esperado) loop
    if pg_temp.dom_domina(r.quien, r.a) is distinct from r.esperado then
      raise exception '¿% domina a %? esperaba %', r.quien, r.a, r.esperado;
    end if;
  end loop;
end $$;
rollback;

-- @test dominancia sobre la persona: las privadas no son de authenticated
begin;
do $$
declare v text;
begin
  foreach v in array array[
      format('select public.persona_dominada(%L)', pg_temp.dom('B')),
      format('select * from public._personas_dominadas(array[%L]::uuid[])', pg_temp.dom('B')),
      format('select public._exigir_persona_dominada(%L, %L)', pg_temp.dom('B'), 'bloquear a')] loop
    if pg_temp.dom_como(pg_temp.dom('D'), v) not like '42501 permission denied%' then raise exception 'authenticated ejecutó «%»', v; end if;
  end loop;
end $$;
rollback;

-- @test dominancia sobre la persona: nadie se bloquea ni se da de baja a sí mismo; uno se domina a sí mismo; una persona que no está es PT409
begin;
do $$
declare a text := pg_temp.dom('A')::text; nadie text := pg_temp.dom('fantasma')::text; r text := pg_temp.dom_rol('dom_ver')::text;
begin
  perform pg_temp.dom_espero('A', format('select public.equipo_bloquear(%L, true)', a), '42501 No puedes bloquearte a ti mismo.');
  perform pg_temp.dom_espero('A', format('select public.equipo_dar_de_baja(%L)', a), '42501 No puedes darte de baja a ti mismo.');
  perform pg_temp.dom_espero('A', format('select public.rbac_asignar_rol(%L, %L)', a, r), 'ok');
  perform pg_temp.dom_espero('A', format('select public.rbac_asignar_rol(%L, %L)', nadie, r), 'PT409 Esa persona ya no está en el equipo.');
  perform pg_temp.dom_espero('A', format('select public.rbac_quitar_rol(%L, %L)', nadie, r), 'PT409 Esa persona ya no está en el equipo.');
end $$;
rollback;

-- @test dominancia sobre la persona: personas_dominadas() para la interfaz
begin;
do $$
declare v uuid[];
begin
  perform set_config('request.jwt.claim.sub', pg_temp.dom('A')::text, true);
  set local role authenticated;
  select array_agg(x order by x) into v from public.personas_dominadas(
    array[pg_temp.dom('B'), pg_temp.dom('E'), pg_temp.dom('F'), pg_temp.dom('A'), null, pg_temp.dom('E'), pg_temp.dom('fantasma')]) x;
  if exists (select 1 from public.personas_dominadas(null)) then raise exception 'con ids nulos devolvió filas'; end if;
  reset role;
  if v is distinct from (select array_agg(x order by x) from unnest(array[pg_temp.dom('A'), pg_temp.dom('E'), pg_temp.dom('F')]) x) then
    raise exception 'A domina a %, esperaba A, E y F', v;
  end if;
  perform pg_temp.dom_espero('G', format('select * from public.personas_dominadas(array[%L]::uuid[])', pg_temp.dom('B')),
    '42501 No tienes el permiso «equipo.usuarios.ver».');
  perform pg_temp.dom_espero('A', 'select * from public.personas_dominadas(array(select (''00000000-0000-4000-8000-'' || lpad(g::text, 12, ''0''))::uuid from generate_series(1, 102) g))',
    '22023 Se piden a lo sumo 101 personas.');
  perform pg_temp.dom_espero('A', 'select * from public.personas_dominadas(array(select (''00000000-0000-4000-8000-'' || lpad(g::text, 12, ''0''))::uuid from generate_series(1, 101) g))', 'ok');
end $$;
rollback;

-- @test dominancia sobre la persona: borrar la siembra
delete from auth.users where email like 'dom-%@ejemplo.com';
delete from public.roles where clave like 'dom\_%';
