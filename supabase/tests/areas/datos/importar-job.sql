-- Importar todo (9.06-2): el job `importaciones-continuar` (qué elige, su tope, las 24 horas, que el pedido lleve sólo el pase y que la URL salga
-- de Vault al correr), sus privilegios y su `cron.job`. Corre en PGlite (`pnpm db:probar`): `net.http_post` deja el pedido en `net.pedidos`.
-- Cada bloque arma su terreno y lo revierte.

-- @test importar-job: los ayudantes (los mismos de importar.sql: cada archivo corre solo)
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


-- Una total de Ada (pendiente, o procesando si p_total) con su último avance hace p_hace (o creada hace p_hace si no tiene avance).
create or replace function pg_temp.imp_vieja(p_id uuid, p_hace interval, p_total int default null) returns void language plpgsql as $f$
begin
  if p_total is null then
    perform pg_temp.imp_crear('00000000-0000-4000-8000-00000000906a', p_id, 'leads');
    update public.importaciones set creado_en = now() - p_hace, avance_en = null where id = p_id;
  else
    perform pg_temp.imp_empezada(p_id, null, p_total);
    update public.importaciones set creado_en = now() - p_hace - interval '1 minute', avance_en = now() - p_hace where id = p_id;
  end if;
end $f$;

-- La URL del proyecto de la prueba (la del seed se aparta).
create or replace function pg_temp.imp_url() returns void language sql as $f$
  delete from vault.secrets where name = 'url_proyecto';
  select vault.create_secret('https://abc.supabase.co/', 'url_proyecto', 'prueba');
$f$;

-- @test importar-job: retoma sólo las totales detenidas, con un pedido que lleva sólo el pase; una de /leads vieja no se toca; sin repetir enseguida
begin;
select pg_temp.imp_preparar();
select pg_temp.imp_url();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a';
        v_a uuid := '00000000-0000-4000-8000-0000009062c1'; v_b uuid := '00000000-0000-4000-8000-0000009062c2';
        v_c uuid := '00000000-0000-4000-8000-0000009062c3'; v_d uuid := '00000000-0000-4000-8000-0000009062c4';
        v_e uuid := '00000000-0000-4000-8000-0000009062c5'; v_n integer; v_desde bigint := coalesce((select max(id) from net.pedidos), 0);
begin
  perform pg_temp.imp_vieja(v_a, interval '3 minutes', 10);   -- procesando, detenida
  perform pg_temp.imp_vieja(v_b, interval '30 seconds', 10);  -- procesando, avanzando
  perform pg_temp.imp_vieja(v_c, interval '5 minutes');       -- pendiente, nunca despertó
  perform pg_temp.imp_vieja(v_d, interval '3 days');
  update public.importaciones set estado = 'terminada', terminada_en = now() - interval '3 days' where id = v_d;
  insert into public.importaciones (id, usuario_id, entidad, estado, filas_total, creado_en, iniciada_en)
    values (v_e, ada, 'leads', 'procesando', 5, now() - interval '25 hours', now() - interval '25 hours');
  v_n := public.importaciones_continuar_correr();
  if v_n is distinct from 2 then raise exception 'debía retomar 2 detenidas: %', v_n; end if;
  if (select count(*) from net.pedidos where id > v_desde) <> 2
     or exists (select 1 from net.pedidos where id > v_desde and url <> 'https://abc.supabase.co/functions/v1/importar-csv') then
    raise exception 'los pedidos no fueron a importar-csv';
  end if;
  if exists (select 1 from net.pedidos where id > v_desde and (select array_agg(k) from jsonb_object_keys(body) k) <> array['pase']) then
    raise exception 'el cuerpo del pedido lleva algo más que el pase';
  end if;
  if (select array_agg(p.importacion_id order by p.importacion_id) from net.pedidos n
        join public.importaciones_pases p on p.pase = (n.body ->> 'pase')::uuid where n.id > v_desde) <> array[v_a, v_c] then
    raise exception 'los pases no son de las dos detenidas';
  end if;
  if (select jsonb_build_array(estado, errores) from public.importaciones where id = v_e) <> '["procesando", []]'::jsonb then
    raise exception 'el job tocó una importación de /leads';
  end if;
  if (select estado from public.importaciones where id = v_d) <> 'terminada' then raise exception 'el job tocó una terminada'; end if;
  -- Enseguida otra corrida: tienen un pase de los últimos 5 minutos.
  v_n := public.importaciones_continuar_correr();
  if v_n is distinct from 0 then raise exception 'repitió el pedido enseguida: %', v_n; end if;
end $$;
rollback;

-- @test importar-job: 5 por corrida; a las 24 horas sin avance, fallida con su motivo y sin pedido; sin url_proyecto no hace nada
begin;
select pg_temp.imp_preparar();
do $$
declare v_viejo uuid := '00000000-0000-4000-8000-0000009062d9'; v_n integer; v_desde bigint := coalesce((select max(id) from net.pedidos), 0); r text;
begin
  for i in 1..7 loop
    perform pg_temp.imp_vieja(('00000000-0000-4000-8000-0000009062d' || i)::uuid, make_interval(mins => 3 + i));
  end loop;
  perform pg_temp.imp_vieja(v_viejo, interval '25 hours');
  -- Sin url_proyecto: null, ningún pedido, nada cambia.
  delete from vault.secrets where name = 'url_proyecto';
  if public.importaciones_continuar_correr() is not null then raise exception 'sin url_proyecto devolvió algo'; end if;
  if exists (select 1 from net.pedidos where id > v_desde) or (select estado from public.importaciones where id = v_viejo) <> 'pendiente' then
    raise exception 'sin url_proyecto el job hizo algo';
  end if;
  perform pg_temp.imp_url();
  v_n := public.importaciones_continuar_correr();
  if v_n is distinct from 5 then raise exception 'el tope por corrida es 5: %', v_n; end if;
  if (select jsonb_build_array(estado, errores) from public.importaciones where id = v_viejo)
     <> '["fallida", [{"motivo": "La importación no avanzó en 24 horas: vuelve a subir el archivo."}]]'::jsonb then
    raise exception 'la de 24 horas no quedó fallida con su motivo';
  end if;
  if exists (select 1 from public.importaciones_pases where importacion_id = v_viejo) then raise exception 'la fallida recibió un pase'; end if;
  -- Las 5 más viejas primero (la 7.ª y la 6.ª, la de menos tiempo detenida, quedan para la siguiente).
  if exists (select 1 from public.importaciones_pases where importacion_id in ('00000000-0000-4000-8000-0000009062d1', '00000000-0000-4000-8000-0000009062d2')) then
    raise exception 'el job no tomó primero las más viejas';
  end if;
  r := pg_temp.imp_srv('select to_jsonb(public.importaciones_continuar_disparar(''https://abc.supabase.co/functions/v1/storage-gc''))');
  if r <> '22023' then raise exception 'otra función debía dar 22023: %', r; end if;
  r := pg_temp.imp_srv('select to_jsonb(public.importaciones_continuar_disparar(null))');
  if r <> '22023' then raise exception 'sin dirección debía dar 22023: %', r; end if;
end $$;
rollback;

-- @test importar-job: el job está programado sin URL; disparar es de service_role y correr sólo del job; anon y authenticated, nada
do $$
declare v_f regprocedure;
begin
  if not exists (select 1 from cron.job where jobname = 'importaciones-continuar' and schedule = '*/2 * * * *'
                   and command = 'select public.importaciones_continuar_correr()') then
    raise exception 'falta el job importaciones-continuar cada 2 minutos que lee la URL de Vault';
  end if;
  -- Sólo los de la importación: humo.sql (que corre antes en la lista fija) reprograma storage-gc con una dirección a mano.
  if exists (select 1 from cron.job where jobname like 'importaciones-%' and command ~ 'https?://') then
    raise exception 'un job de la importación lleva una URL escrita en su comando';
  end if;
  v_f := 'public.importaciones_continuar_disparar(text)'::regprocedure;
  if not has_function_privilege('service_role', v_f, 'execute') then raise exception 'service_role no ejecuta disparar'; end if;
  if has_function_privilege('authenticated', v_f, 'execute') or has_function_privilege('anon', v_f, 'execute') then
    raise exception 'disparar lo ejecuta la app';
  end if;
  v_f := 'public.importaciones_continuar_correr()'::regprocedure;
  if has_function_privilege('service_role', v_f, 'execute') or has_function_privilege('authenticated', v_f, 'execute')
     or has_function_privilege('anon', v_f, 'execute') then
    raise exception 'correr lo ejecuta alguien más que el job';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname like 'importaciones\_continuar\_%'
                and (not p.prosecdef or not ('search_path=""' = any (coalesce(p.proconfig, '{}'))))) then
    raise exception 'las del job van definer con search_path vacío';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'importaciones_continuar_programar') then
    raise exception 'no hay _programar: la URL nunca se escribe en el comando';
  end if;
end $$;

-- @test importar-job: la purga borra el informe de las totales terminadas hace más de 30 días y los pases de más de 7; lo demás queda
begin;
select pg_temp.imp_preparar();
do $$
declare v_31 uuid := '00000000-0000-4000-8000-0000009062e1'; v_29 uuid := '00000000-0000-4000-8000-0000009062e2';
        v_viva uuid := '00000000-0000-4000-8000-0000009062e3'; v_n integer;
begin
  perform pg_temp.imp_vieja(v_31, interval '40 days');
  perform pg_temp.imp_vieja(v_29, interval '40 days');
  perform pg_temp.imp_vieja(v_viva, interval '40 days', 10);
  update public.importaciones set estado = 'terminada', terminada_en = now() - interval '31 days' where id = v_31;
  update public.importaciones set estado = 'fallida', terminada_en = now() - interval '29 days' where id = v_29;
  insert into public.importaciones_filas (importacion_id, fila, resultado, motivo)
    select x.id, g, 'error', 'Falta el nombre.' from unnest(array[v_31, v_29, v_viva]) x(id), generate_series(1, 3) g;
  insert into public.importaciones_pases (importacion_id, creado_en) values (v_31, now() - interval '8 days'), (v_29, now() - interval '1 day');
  v_n := public.importaciones_filas_purgar();
  if v_n is distinct from 3 then raise exception 'debía borrar las 3 filas de la de hace 31 días: %', v_n; end if;
  if exists (select 1 from public.importaciones_filas where importacion_id = v_31)
     or (select count(*) from public.importaciones_filas where importacion_id in (v_29, v_viva)) <> 6 then
    raise exception 'la purga borró de más o de menos';
  end if;
  if exists (select 1 from public.importaciones_pases where creado_en < now() - interval '7 days')
     or not exists (select 1 from public.importaciones_pases where importacion_id = v_29) then
    raise exception 'la purga de pases borró de más o de menos';
  end if;
end $$;
rollback;

-- @test importar-job: la purga está programada sin URL y sólo la corre el job
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'importaciones-filas-purgar' and command = 'select public.importaciones_filas_purgar()') then
    raise exception 'falta el job importaciones-filas-purgar';
  end if;
  if has_function_privilege('service_role', 'public.importaciones_filas_purgar()', 'execute')
     or has_function_privilege('authenticated', 'public.importaciones_filas_purgar()', 'execute')
     or has_function_privilege('anon', 'public.importaciones_filas_purgar()', 'execute') then
    raise exception 'la purga la ejecuta alguien más que el job';
  end if;
  if not exists (select 1 from pg_proc where oid = 'public.importaciones_filas_purgar()'::regprocedure and prosecdef
                   and 'search_path=""' = any (coalesce(proconfig, '{}'))) then
    raise exception 'la purga va definer con search_path vacío';
  end if;
end $$;
