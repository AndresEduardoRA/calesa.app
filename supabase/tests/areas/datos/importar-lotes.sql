-- Importar todo (9.06): el resto de los lotes de la importación total (los cinco del Assert están en `importar.sql`). El lead lo crea el destino
-- (D4); la forma del lote; vehículos; la identidad que se repone en cada salida; el destino borrado; empezar y terminar. Corre en PGlite
-- (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test importar-lotes: los ayudantes (los mismos de importar.sql: cada archivo corre solo)
reset role;
-- Ada (…a): datos.importar.todo, leads.crear y vehiculos.crear de todos los orígenes. Bea (…b) y Ceci (…c): leads.crear. Dani (…d): leads.ver
-- y nada más. La primera cuenta nace dueña: se le quitan sus roles.
create or replace function pg_temp.imp_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  foreach p in array array['00000000-0000-4000-8000-00000000906a', '00000000-0000-4000-8000-00000000906b',
                           '00000000-0000-4000-8000-00000000906c', '00000000-0000-4000-8000-00000000906d']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'IMP ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('imp_rol_' || i, 'IMP rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    if i = 1 then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'datos.importar.todo', null, 'todos'), (v_rol, 'leads.crear', null, 'todos'), (v_rol, 'leads.ver', null, 'todos'),
        (v_rol, 'vehiculos.crear', null, 'todos'), (v_rol, 'vehiculos.ver', null, 'todos');
    elsif i in (2, 3) then
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values
        (v_rol, 'leads.crear', null, 'todos'), (v_rol, 'leads.ver', null, 'propios');
    else
      insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'leads.ver', null, 'propios');
    end if;
  end loop;
end $f$;

-- Pone la identidad de esa persona, local a la transacción (las RPC de service_role las llama el dueño de las funciones).
create or replace function pg_temp.imp_ser(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_quien::text, ''), true);
  perform set_config('request.jwt.claim.role', case when p_quien is null then 'service_role' else 'authenticated' end, true);
  perform set_config('request.jwt.claims', case when p_quien is null then '{"role": "service_role"}'
                                                else json_build_object('sub', p_quien, 'role', 'authenticated')::text end, true);
end $f$;

-- Lo que devuelve un SQL corrido como esa persona (una fila jsonb), o «sqlstate» / «sqlstate/hint».
create or replace function pg_temp.imp_como(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v jsonb; v_hint text;
begin
  perform pg_temp.imp_ser(p_quien);
  set local role authenticated;
  execute p_sql into v;
  reset role;
  return v::text;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- Crear como esa persona: la respuesta, o el error. La ruta por omisión, en su carpeta.
create or replace function pg_temp.imp_crear(p_quien uuid, p_id uuid, p_entidad text, p_asignar uuid default null, p_origen uuid default null,
  p_ruta text default null, p_mapeo jsonb default '{"Nombre": "nombre", "Teléfono": "telefono_principal"}') returns text language sql as $f$
  select pg_temp.imp_como(p_quien, format('select public.importacion_crear(%L, %L, %L, %L, %L, %L)', p_id, p_entidad,
    coalesce(p_ruta, p_quien::text || '/' || p_id::text || '.csv'), p_mapeo, p_asignar, p_origen))
$f$;

-- Llamar como service_role (el dueño de las funciones con los claims de service_role): la respuesta, o «sqlstate» / «sqlstate/hint».
create or replace function pg_temp.imp_srv(p_sql text) returns text language plpgsql as $f$
declare v jsonb; v_hint text;
begin
  perform pg_temp.imp_ser(null);
  execute p_sql into v;
  return v::text;
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

create or replace function pg_temp.imp_lote(p_imp uuid, p_desde int, p_filas jsonb) returns text language sql as $f$
  select pg_temp.imp_srv(format('select public.importacion_procesar_lote(%L, %L, %L)', p_imp, p_desde, p_filas))
$f$;

-- Una importación de Ada (para p_destino, o de vehículos con p_origen) ya empezada con p_total filas.
create or replace function pg_temp.imp_empezada(p_id uuid, p_destino uuid, p_total int, p_entidad text default 'leads', p_origen uuid default null)
  returns void language plpgsql as $f$
declare r text;
begin
  r := pg_temp.imp_crear('00000000-0000-4000-8000-00000000906a', p_id, p_entidad, p_destino, p_origen);
  if (r::jsonb ->> 'estado') is distinct from 'pendiente' then raise exception 'no se creó: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, %L)', p_id, p_total));
  if (r::jsonb ->> 'estado') is distinct from 'procesando' then raise exception 'no empezó: %', r; end if;
end $f$;

-- Una fila de un lote de leads.
create or replace function pg_temp.imp_fila(p_fila int, p_nombre text, p_tel text) returns jsonb language sql as $f$
  select jsonb_build_object('fila', p_fila, 'datos', jsonb_build_object('nombre', p_nombre, 'telefono_principal', p_tel,
    'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))
$f$;

-- Quitarle un permiso a esa persona (en su rol).
create or replace function pg_temp.imp_quitar(p_quien uuid, p_clave text) returns void language sql as $f$
  delete from public.roles_permisos rp using public.usuarios_roles ur where ur.usuario_id = p_quien and rp.rol_id = ur.rol_id and rp.permiso_clave = p_clave
$f$;

-- @test importar-lotes: el lead lo crea el destino (D4): nace en su cartera, con su constancia, y queda el vínculo para deshacer
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        v_imp uuid := '00000000-0000-4000-8000-0000009061a1'; r text;
begin
  perform pg_temp.imp_empezada(v_imp, bea, 3);
  r := pg_temp.imp_lote(v_imp, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP D4 uno', '79063001'), pg_temp.imp_fila(2, 'IMP D4 dos', '79063002'),
                                                     pg_temp.imp_fila(3, 'IMP D4 tres', '79063003')));
  if (r::jsonb ->> 'creadas') <> '3' then raise exception 'debían entrar 3: %', r; end if;
  if exists (select 1 from public.leads where nombre like 'IMP D4 %' and (creado_por <> bea or cartera <> array[bea])) then
    raise exception 'los leads no nacieron en la cartera de Bea';
  end if;
  if (select count(*) from public.importaciones_leads x join public.leads l on l.id = x.lead_id where x.importacion_id = v_imp and l.nombre like 'IMP D4 %') <> 3 then
    raise exception 'faltan vínculos en importaciones_leads';
  end if;
  if (select filas_ok from public.importaciones where id = v_imp) <> 3 then raise exception 'filas_ok no es 3'; end if;
  if (select count(*) from public.actividad a join public.leads l on l.id::text = a.registro_id
       where a.accion = 'lead.creado' and l.nombre like 'IMP D4 %' and a.actor_id = bea) <> 3 then
    raise exception 'la constancia lead.creado no es de Bea';
  end if;
  -- Los números propios, por orden de fila.
  if (select array_agg(nombre order by numero_propio) from public.leads where nombre like 'IMP D4 %') <> array['IMP D4 uno', 'IMP D4 dos', 'IMP D4 tres'] then
    raise exception 'los números propios no siguen el orden de las filas';
  end if;
  -- Los ids salen de (importación, fila): un reintento cae en el «repetido» de _lead_crear.
  if not exists (select 1 from public.leads where id = md5(v_imp::text || ':2')::uuid and nombre = 'IMP D4 dos') then
    raise exception 'el id del lead no sale de (importación, fila)';
  end if;
end $$;
rollback;

-- @test importar-lotes: la forma del lote se valida antes de tocar nada; una clave de más en una fila (adoptar) es error de esa fila y las demás entran
begin;
select pg_temp.imp_preparar();
do $$
declare bea uuid := '00000000-0000-4000-8000-00000000906b'; v_imp uuid := '00000000-0000-4000-8000-0000009061b1'; r text; v_lote jsonb;
begin
  perform pg_temp.imp_empezada(v_imp, bea, 60);
  select jsonb_agg(pg_temp.imp_fila(g, 'IMP F ' || g, null)) into v_lote from generate_series(1, 51) g;
  foreach r in array array[
    pg_temp.imp_lote(v_imp, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP F', '79064001'), pg_temp.imp_fila(3, 'IMP F', '79064003'))),
    pg_temp.imp_lote(v_imp, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP F', '79064001') || '{"rechazo": {"motivo": "x"}}')),
    pg_temp.imp_lote(v_imp, 1, jsonb_build_array(jsonb_build_object('fila', 1))),
    pg_temp.imp_lote(v_imp, 1, jsonb_build_array(jsonb_build_object('fila', 1, 'rechazo', jsonb_build_object('motivo', '')))),
    pg_temp.imp_lote(v_imp, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP F', '79064001') || '{"otra": 1}')),
    pg_temp.imp_lote(v_imp, 1, jsonb_build_array(jsonb_build_object('fila', 1.5, 'datos', '{}'::jsonb))),
    pg_temp.imp_lote(v_imp, 1, v_lote),
    pg_temp.imp_lote(v_imp, 1, '[]'),
    pg_temp.imp_lote(v_imp, 0, jsonb_build_array(pg_temp.imp_fila(0, 'IMP F', '79064001'))),
    pg_temp.imp_lote(v_imp, 3, jsonb_build_array(pg_temp.imp_fila(3, 'IMP F', '79064003'))),
    pg_temp.imp_lote(v_imp, 60, jsonb_build_array(pg_temp.imp_fila(60, 'IMP F', '79064060'), pg_temp.imp_fila(61, 'IMP F', '79064061')))] loop
    if r not like '22023/%' then raise exception 'una forma rota debía dar 22023 con su hint: %', r; end if;
  end loop;
  if (select procesadas from public.importaciones where id = v_imp) <> 0 or exists (select 1 from public.importaciones_filas where importacion_id = v_imp)
     or exists (select 1 from public.leads where nombre like 'IMP F%') then
    raise exception 'una forma rota escribió algo';
  end if;
  r := pg_temp.imp_lote(v_imp, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP F uno', '79064001'),
    jsonb_build_object('fila', 2, 'datos', (pg_temp.imp_fila(2, 'IMP F dos', '79064002') -> 'datos') || '{"adoptar": true}'),
    pg_temp.imp_fila(3, 'IMP F tres', '79064003')));
  if r::jsonb <> jsonb_build_object('importacion', v_imp, 'procesadas', 3, 'creadas', 2, 'ya_existian', 0, 'rechazadas', 1, 'saltadas', 0) then
    raise exception 'adoptar debía ser error de su fila: %', r;
  end if;
  if (select jsonb_build_array(resultado, campo) from public.importaciones_filas where importacion_id = v_imp and fila = 2) <> '["error", "adoptar"]'::jsonb then
    raise exception 'el error de adoptar no quedó con su campo';
  end if;
end $$;
rollback;

-- @test importar-lotes: vehículos con el origen de la importación; un VIN repetido queda «ya existe»; sin vehiculos.crear a mitad, se rechaza
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; v_imp uuid := '00000000-0000-4000-8000-0000009061c1';
        v_origen uuid := (select id from public.origenes where activo order by id limit 1); r text;
begin
  perform pg_temp.imp_empezada(v_imp, null, 3, 'vehiculos', v_origen);
  r := pg_temp.imp_lote(v_imp, 1, jsonb_build_array(
    jsonb_build_object('fila', 1, 'datos', jsonb_build_object('titulo', 'IMP V uno', 'vin', 'KMHD35LE5DU906001')),
    jsonb_build_object('fila', 2, 'datos', jsonb_build_object('titulo', 'IMP V dos', 'vin', 'KMHD35LE5DU906001'))));
  if r::jsonb <> jsonb_build_object('importacion', v_imp, 'procesadas', 2, 'creadas', 1, 'ya_existian', 1, 'rechazadas', 0, 'saltadas', 0) then
    raise exception 'un vehículo entra y el del VIN repetido ya existía: %', r;
  end if;
  if (select jsonb_build_array(origen_id = v_origen, creado_por = ada) from public.vehiculos where titulo = 'IMP V uno') <> '[true, true]'::jsonb then
    raise exception 'el vehículo no quedó con su origen y a nombre de Ada';
  end if;
  if (select jsonb_build_array(resultado, motivo) from public.importaciones_filas where importacion_id = v_imp and fila = 2)
     <> '["ya_existe", "Ya hay un vehículo con ese VIN o ese lote."]'::jsonb then
    raise exception 'el VIN repetido no quedó como ya existe';
  end if;
  perform pg_temp.imp_quitar(ada, 'vehiculos.crear');
  r := pg_temp.imp_lote(v_imp, 3, jsonb_build_array(jsonb_build_object('fila', 3, 'datos', jsonb_build_object('titulo', 'IMP V tres'))));
  if r::jsonb <> jsonb_build_object('importacion', v_imp, 'estado', 'fallida', 'rechazado', 'sin_permiso') then raise exception 'sin vehiculos.crear: %', r; end if;
  if exists (select 1 from public.vehiculos where titulo = 'IMP V tres') then raise exception 'sin permiso entró un vehículo'; end if;
end $$;
rollback;

-- @test importar-lotes: los claims de quien llama vuelven en cada salida (normal, saltadas, rechazado, fallida al empezar, terminar) y tras un error
begin;
select pg_temp.imp_preparar();
create or replace function pg_temp.imp_marcar() returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000999', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claims', '{"role": "service_role", "marca": 1}', true);
end $f$;
create or replace function pg_temp.imp_marca_intacta(p_donde text) returns void language plpgsql as $f$
begin
  if current_setting('request.jwt.claim.sub', true) is distinct from '00000000-0000-4000-8000-000000000999'
     or current_setting('request.jwt.claim.role', true) is distinct from 'service_role'
     or current_setting('request.jwt.claims', true) is distinct from '{"role": "service_role", "marca": 1}' then
    raise exception 'los claims no volvieron tras %: % % %', p_donde, current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claim.role', true), current_setting('request.jwt.claims', true);
  end if;
end $f$;
create or replace function public.imp_prueba_falla() returns trigger language plpgsql as $f$
begin raise exception 'falla forzada' using errcode = '22023'; end $f$;
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        v_1 uuid := '00000000-0000-4000-8000-0000009061d1'; v_2 uuid := '00000000-0000-4000-8000-0000009061d2';
        v_3 uuid := '00000000-0000-4000-8000-0000009061d3'; v_4 uuid := '00000000-0000-4000-8000-0000009061d4';
        v_5 uuid := '00000000-0000-4000-8000-0000009061d5'; v_lote jsonb; v_r jsonb;
begin
  perform pg_temp.imp_empezada(v_1, bea, 1);
  perform pg_temp.imp_empezada(v_2, bea, 1);
  perform pg_temp.imp_empezada(v_4, bea, 1);
  perform pg_temp.imp_crear(ada, v_3, 'leads', bea);
  perform pg_temp.imp_crear(ada, v_5, 'leads', bea);
  v_lote := jsonb_build_array(pg_temp.imp_fila(1, 'IMP C uno', '79065001'));
  reset role;
  -- Normal.
  perform pg_temp.imp_marcar();
  v_r := public.importacion_procesar_lote(v_1, 1, v_lote);
  if (v_r ->> 'creadas') <> '1' then raise exception 'no entró: %', v_r; end if;
  perform pg_temp.imp_marca_intacta('un lote normal');
  -- Saltadas.
  v_r := public.importacion_procesar_lote(v_1, 1, v_lote);
  if (v_r ->> 'saltadas') <> '1' then raise exception 'no se saltó: %', v_r; end if;
  perform pg_temp.imp_marca_intacta('un lote repetido');
  -- Terminar.
  v_r := public.importacion_terminar(v_1);
  perform pg_temp.imp_marca_intacta('terminar');
  if (select actor_id from public.actividad where accion = 'datos.importado' and registro_id = v_1::text) <> ada then
    raise exception 'la constancia de terminar no es de Ada';
  end if;
  -- Un error después de la suplantación (un trigger que falla al escribir el informe): la subtransacción revierte los claims.
  create trigger imp_prueba_falla before insert on public.importaciones_filas for each row execute function public.imp_prueba_falla();
  begin
    v_r := public.importacion_procesar_lote(v_4, 1, jsonb_build_array(jsonb_build_object('fila', 1, 'rechazo', jsonb_build_object('motivo', 'x'))));
    raise exception 'el trigger debía hacer fallar el lote: %', v_r;
  exception when sqlstate '22023' then
    perform pg_temp.imp_marca_intacta('un error a mitad del lote');
  end;
  drop trigger imp_prueba_falla on public.importaciones_filas;
  -- Rechazado y fallida al empezar.
  perform pg_temp.imp_quitar(ada, 'datos.importar.todo');
  perform pg_temp.imp_marcar();
  v_r := public.importacion_procesar_lote(v_2, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP C dos', '79065002')));
  if (v_r ->> 'rechazado') <> 'sin_permiso' then raise exception 'no se rechazó: %', v_r; end if;
  perform pg_temp.imp_marca_intacta('un lote rechazado');
  v_r := public.importacion_empezar(v_3, 1);
  if (v_r ->> 'estado') <> 'fallida' then raise exception 'empezar sin permiso debía dejarla fallida: %', v_r; end if;
  perform pg_temp.imp_marca_intacta('empezar fallida');
  if (select errores from public.importaciones where id = v_3) <> '[{"motivo": "Quien importa ya no tiene el permiso para seguir."}]'::jsonb then
    raise exception 'empezar sin permiso no dejó el motivo';
  end if;
end $$;
rollback;

-- @test importar-lotes: si el perfil del destino se borra a mitad, la importación queda fallida y ningún lead nace de quien importa
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        v_imp uuid := '00000000-0000-4000-8000-0000009061e1'; r text; v public.importaciones;
begin
  perform pg_temp.imp_empezada(v_imp, bea, 2);
  delete from auth.users where id = bea;
  select * into v from public.importaciones where id = v_imp;
  if v.asignar_a is not null or not v.con_destino then raise exception 'el destino borrado debía dejar asignar_a nulo y con_destino'; end if;
  r := pg_temp.imp_lote(v_imp, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP B uno', '79066001')));
  if r::jsonb <> jsonb_build_object('importacion', v_imp, 'estado', 'fallida', 'rechazado', 'destino_no_puede') then raise exception 'destino borrado: %', r; end if;
  if exists (select 1 from public.leads where nombre like 'IMP B %') then raise exception 'un lead nació de quien importa'; end if;
end $$;
rollback;

-- @test importar-lotes: empezar fija el total (1 a 20.000) y retoma; terminar exige todo procesado, deja la constancia sin datos y es idempotente
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a'; bea uuid := '00000000-0000-4000-8000-00000000906b';
        v_1 uuid := '00000000-0000-4000-8000-0000009061f1'; v_2 uuid := '00000000-0000-4000-8000-0000009061f2'; r text; v_det jsonb;
begin
  perform pg_temp.imp_crear(ada, v_1, 'leads', bea);
  perform pg_temp.imp_crear(ada, v_2, 'leads', bea);
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 20001)', v_1));
  if r <> '22023/filas_total' then raise exception 'más de 20.000 filas: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 0)', v_1));
  if r <> '22023/filas_total' then raise exception 'cero filas: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r <> '22023' then raise exception 'terminar sin empezar: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 2)', v_1));
  if r::jsonb <> jsonb_build_object('importacion', v_1, 'estado', 'procesando', 'filas_total', 2, 'procesadas', 0, 'repetido', false) then raise exception 'empezar: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 2)', v_1));
  if (r::jsonb ->> 'repetido') <> 'true' then raise exception 'empezar otra vez retoma: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_empezar(%L, 3)', v_1));
  if r <> '22023/filas_total' then raise exception 'otro total en procesando: %', r; end if;
  r := pg_temp.imp_lote(v_1, 1, jsonb_build_array(pg_temp.imp_fila(1, 'IMP T uno', '79067001')));
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r <> '22023' then raise exception 'terminar con filas por procesar: %', r; end if;
  r := pg_temp.imp_lote(v_1, 2, jsonb_build_array(jsonb_build_object('fila', 2, 'rechazo', jsonb_build_object('motivo', 'Falta el nombre.'))));
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r::jsonb <> jsonb_build_object('importacion', v_1, 'estado', 'terminada', 'creadas', 1, 'ya_existian', 0, 'rechazadas', 1, 'repetido', false) then
    raise exception 'terminar: %', r;
  end if;
  select detalle into v_det from public.actividad where accion = 'datos.importado' and registro_id = v_1::text and actor_id = ada and tabla = 'importaciones';
  if v_det <> jsonb_build_object('entidad', 'leads', 'estado', 'terminada', 'filas', 2, 'procesadas', 2, 'creadas', 1, 'ya_existian', 0, 'rechazadas', 1,
                                 'asignar_a', bea) then
    raise exception 'la constancia trae de más o de menos: %', v_det;
  end if;
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L)', v_1));
  if r::jsonb <> jsonb_build_object('importacion', v_1, 'estado', 'terminada', 'repetido', true) then raise exception 'terminar otra vez: %', r; end if;
  -- Con error, desde pendiente: fallida con su motivo; un motivo vacío, 22023/error.
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L, %L)', v_2, '  '));
  if r <> '22023/error' then raise exception 'un motivo vacío: %', r; end if;
  r := pg_temp.imp_srv(format('select public.importacion_terminar(%L, %L)', v_2, 'El archivo no se puede leer.'));
  if (r::jsonb ->> 'estado') <> 'fallida' or (select errores from public.importaciones where id = v_2) <> '[{"motivo": "El archivo no se puede leer."}]'::jsonb then
    raise exception 'terminar con error: %', r;
  end if;
  -- Una importación de /leads no se toca por aquí.
  insert into public.importaciones (id, usuario_id, entidad, estado, filas_total) values ('00000000-0000-4000-8000-0000009061f3', ada, 'leads', 'procesando', 1);
  foreach r in array array[pg_temp.imp_srv('select public.importacion_empezar(''00000000-0000-4000-8000-0000009061f3'', 1)'),
                           pg_temp.imp_lote('00000000-0000-4000-8000-0000009061f3', 1, jsonb_build_array(pg_temp.imp_fila(1, 'x', '79067009'))),
                           pg_temp.imp_srv('select public.importacion_terminar(''00000000-0000-4000-8000-0000009061f3'')')] loop
    if r <> '22023' then raise exception 'una importación de /leads no se procesa aquí: %', r; end if;
  end loop;
end $$;
rollback;
