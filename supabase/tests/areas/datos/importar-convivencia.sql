-- Importar todo (9.06-2): `/leads` frente a la importación total. Sus RPC (`leads_importar_lote`, `leads_importacion_terminar`,
-- `leads_importaciones_recientes`) no la toman ni la listan, y deshacer una total mide «intacto» contra el destino, no corta una en curso
-- y pide `datos.importar.todo` si tuvo destino. Corre en PGlite (`pnpm db:probar`); cada bloque arma su terreno y lo revierte.

-- @test importar-convivencia: los ayudantes (los mismos de importar.sql: cada archivo corre solo)
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


-- Una fila de un lote de /leads (la forma de leads_importar_lote).
create or replace function pg_temp.imp_fila_leads(p_fila int, p_nombre text, p_tel text) returns jsonb language sql as $f$
  select jsonb_build_object('id', gen_random_uuid(), 'fila', p_fila, 'lead', jsonb_build_object('nombre', p_nombre, 'telefono_principal', p_tel,
    'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))
$f$;

-- @test importar-convivencia: /leads no suma filas a una total, no la termina ni la lista; la suya de /leads, sí
begin;
select pg_temp.imp_preparar();
do $$
declare ada uuid := '00000000-0000-4000-8000-00000000906a';
        v_t uuid := '00000000-0000-4000-8000-0000009062f1'; v_l uuid := '00000000-0000-4000-8000-0000009062f2'; r text; v_antes jsonb;
begin
  perform pg_temp.imp_empezada(v_t, null, 2);
  select to_jsonb(i) into v_antes from public.importaciones i where i.id = v_t;
  r := pg_temp.imp_como(ada, format('select public.leads_importar_lote(%L, 2, %L)', v_t,
         jsonb_build_array(pg_temp.imp_fila_leads(1, 'IMP CONV uno', '79068001'))));
  if r <> '42501' then raise exception '/leads le sumó filas a una total: %', r; end if;
  r := pg_temp.imp_como(ada, format('select public.leads_importacion_terminar(%L, 0, 0)', v_t));
  if r <> '42501' then raise exception '/leads terminó una total: %', r; end if;
  if (select to_jsonb(i) from public.importaciones i where i.id = v_t) <> v_antes
     or exists (select 1 from public.leads where nombre like 'IMP CONV %')
     or exists (select 1 from public.importaciones_leads where importacion_id = v_t) then
    raise exception 'la total cambió desde /leads';
  end if;
  -- Su importación de /leads de una fila entra y se lista; la total, no.
  r := pg_temp.imp_como(ada, format('select public.leads_importar_lote(%L, 1, %L)', v_l,
         jsonb_build_array(pg_temp.imp_fila_leads(1, 'IMP CONV dos', '79068002'))));
  if r like '4%' or r like '2%' then raise exception 'la de /leads no entró: %', r; end if;
  r := pg_temp.imp_como(ada, 'select public.leads_importaciones_recientes()');
  if (select array_agg(e ->> 'id') from jsonb_array_elements(r::jsonb) e) <> array[v_l::text] then
    raise exception 'recientes debía listar sólo la de /leads: %', r;
  end if;
end $$;
rollback;
