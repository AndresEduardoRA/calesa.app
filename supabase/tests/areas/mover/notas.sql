-- Las notas de una unidad bajo la RLS (paso 6.04-2): lo que la interfaz hace con `notas` sin RPC (crear, editar el cuerpo y el borrado suave) y quién lo puede. No depende de otro archivo
-- (`SOLO=areas/mover/notas.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   N1. Quien ve la unidad (`logistica.ver` en su origen) crea una nota suya y la lee.
--   N2. La autora edita el cuerpo de su nota.
--   N3. La autora NO puede borrarla suave por `update` (aunque no pida `returning`): la policy `notas: leer` también se aplica a la fila nueva y ésta ya no es legible (42501). Por eso la interfaz no
--       ofrece «Borrar» (abierto 6-3: borrar una nota propia pide una RPC, un paso de datos). Si algún día pasa, este caso cae y hay que ofrecer «Borrar».
--   N4. Otra persona que ve la unidad no edita ni borra la nota ajena (0 filas) ni crea una a nombre de otra.
--   N5. Quien no ve la unidad no crea notas (42501).

create or replace function pg_temp.mn_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-mn@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.mn_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.mn_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('mn_' || substr(v_id::text, 1, 8), 'mn ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.mn_vehiculo() returns table (origen uuid, vehiculo uuid) language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('mn_' || s, 'mn origen ' || s, 'manual') returning id into o;
  insert into public.vehiculos (origen_id, titulo) values (o, 'mn vehículo') returning id into vehiculo;
  origen := o;
  return next;
end $f$;

-- Corre un enunciado como `p_quien` (authenticated), **tal cual, sin returning**: devuelve las filas que tocó o `{error, mensaje}`.
create or replace function pg_temp.mn_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v_n bigint; v_m text; v_e text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql;
    get diagnostics v_n = row_count;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return jsonb_build_object('filas', v_n);
end $f$;

-- Las notas de la unidad que `p_quien` lee (ids, más nueva primero).
create or replace function pg_temp.mn_lee(p_quien uuid, p_v uuid) returns jsonb language plpgsql as $f$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select coalesce(jsonb_agg(cuerpo order by creado_en desc, id desc), '[]'::jsonb) into v from public.notas where vehiculo_id = p_v and eliminado_en is null;
  reset role;
  return v;
end $f$;

-- @test notas: quien ve la unidad crea su nota y la lee; no la crea a nombre de otra (N1)
begin;
do $$
declare
  u record; ana uuid; beto uuid; r jsonb;
begin
  select * into u from pg_temp.mn_vehiculo();
  ana := pg_temp.mn_persona(array['logistica.ver@' || u.origen]);
  beto := pg_temp.mn_persona(array['logistica.ver@' || u.origen]);
  r := pg_temp.mn_corre(ana, format('insert into public.notas (vehiculo_id, cuerpo, autor_id) values (%L, %L, %L)', u.vehiculo, 'Revisar el BL', ana));
  if r is distinct from '{"filas": 1}'::jsonb then raise exception 'N1: debía crear su nota y dio %', r; end if;
  if pg_temp.mn_lee(ana, u.vehiculo) is distinct from '["Revisar el BL"]'::jsonb then raise exception 'N1: debía leerla'; end if;
  r := pg_temp.mn_corre(ana, format('insert into public.notas (vehiculo_id, cuerpo, autor_id) values (%L, %L, %L)', u.vehiculo, 'A nombre de Beto', beto));
  if r ->> 'error' is distinct from '42501' then raise exception 'N1: crear a nombre de otra debía dar 42501 y dio %', r; end if;
end $$;
rollback;

-- @test notas: la autora edita su cuerpo (N2) y no puede borrarla suave por update (N3)
begin;
do $$
declare
  u record; ana uuid; r jsonb; n uuid;
begin
  select * into u from pg_temp.mn_vehiculo();
  ana := pg_temp.mn_persona(array['logistica.ver@' || u.origen]);
  insert into public.notas (vehiculo_id, cuerpo, autor_id) values (u.vehiculo, 'Uno', ana) returning id into n;
  r := pg_temp.mn_corre(ana, format('update public.notas set cuerpo = %L where id = %L and autor_id = %L and historial_fase_id is null and eliminado_en is null', 'Uno con Ana', n, ana));
  if r is distinct from '{"filas": 1}'::jsonb then raise exception 'N2: debía editar su nota y dio %', r; end if;
  if pg_temp.mn_lee(ana, u.vehiculo) is distinct from '["Uno con Ana"]'::jsonb then raise exception 'N2: debía leer el cuerpo nuevo'; end if;
  r := pg_temp.mn_corre(ana, format('update public.notas set eliminado_en = now() where id = %L and autor_id = %L and historial_fase_id is null and eliminado_en is null', n, ana));
  if r ->> 'error' is distinct from '42501' then raise exception 'N3: el borrado suave por update debía dar 42501 (abierto 6-3) y dio %', r; end if;
  if pg_temp.mn_lee(ana, u.vehiculo) is distinct from '["Uno con Ana"]'::jsonb then raise exception 'N3: un borrado rechazado no debía cambiar nada'; end if;
end $$;
rollback;

-- @test notas: otra persona que ve la unidad no edita ni borra la nota ajena (N4)
begin;
do $$
declare
  u record; ana uuid; beto uuid; r jsonb; n uuid;
begin
  select * into u from pg_temp.mn_vehiculo();
  ana := pg_temp.mn_persona(array['logistica.ver@' || u.origen]);
  beto := pg_temp.mn_persona(array['logistica.ver@' || u.origen]);
  insert into public.notas (vehiculo_id, cuerpo, autor_id) values (u.vehiculo, 'De Ana', ana) returning id into n;
  r := pg_temp.mn_corre(beto, format('update public.notas set cuerpo = %L where id = %L and autor_id = %L and historial_fase_id is null and eliminado_en is null', 'Pisada', n, beto));
  if r is distinct from '{"filas": 0}'::jsonb then raise exception 'N4: editar la ajena debía tocar 0 filas y dio %', r; end if;
  r := pg_temp.mn_corre(beto, format('update public.notas set eliminado_en = now() where id = %L', n));
  if r is distinct from '{"filas": 0}'::jsonb then raise exception 'N4: borrar la ajena debía tocar 0 filas y dio %', r; end if;
  if pg_temp.mn_lee(ana, u.vehiculo) is distinct from '["De Ana"]'::jsonb then raise exception 'N4: la nota de Ana debía seguir igual'; end if;
end $$;
rollback;

-- @test notas: quien no ve la unidad no crea notas (N5)
begin;
do $$
declare
  u record; sin_ver uuid; r jsonb;
begin
  select * into u from pg_temp.mn_vehiculo();
  sin_ver := pg_temp.mn_persona(array['flujos.mover@' || u.origen]);
  r := pg_temp.mn_corre(sin_ver, format('insert into public.notas (vehiculo_id, cuerpo, autor_id) values (%L, %L, %L)', u.vehiculo, 'Colada', sin_ver));
  if r ->> 'error' is distinct from '42501' then raise exception 'N5: sin logistica.ver debía dar 42501 y dio %', r; end if;
end $$;
rollback;
