-- Las tablas de referencia se escriben sólo publicando (4.23-1, C2 y C3): quien configura el origen las lee como antes, pero un `insert`, `update` o
-- `delete` directo en `tablas_referencia` o en `tablas_referencia_filas` da 42501; la tabla nace en la versión 1, sin nota ni autor.
-- docs/COTIZADOR.md › «Las tablas congeladas (D5)». Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno en su
-- transacción y la revierte.

-- @test tablas: los ayudantes de la escritura directa
reset role;
create or replace function pg_temp.te_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El código de un SQL corrido como esa persona: el sqlstate, o «sin error».
create or replace function pg_temp.te_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
begin
  perform pg_temp.te_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  return sqlstate;
end $f$;

-- Un origen con una tabla de dos filas y una persona que lo configura (con su rol propio: si corre sola, la primera cuenta nace dueña).
create or replace function pg_temp.te_preparar() returns uuid language plpgsql as $f$
declare o uuid; t uuid; v_rol uuid; p uuid := '00000000-0000-4000-8000-000000007e0a';
begin
  insert into public.origenes (clave, nombre) values ('prueba_te', 'Prueba te') returning id into o;
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
  values (o, 'te_tabla', 'Tabla te', '[{"clave":"tipo","etiqueta":"Tipo","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]')
  returning id into t;
  insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (t, '{"tipo":"a","monto":1}', 0), (t, '{"tipo":"b","monto":2}', 1);
  insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Teo', invitacion_aceptada_en = now() where id = p;
  delete from public.usuarios_roles where usuario_id = p;
  insert into public.roles (clave, nombre) values ('te_configura', 'TE configura') returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, 'cotizaciones.configurar', o, 'todos');
  return t;
end $f$;

-- @test tablas: quien configura el origen lee la tabla, pero no la escribe directo (42501 en las dos tablas)
begin;
select pg_temp.te_preparar();
do $$
declare p uuid := '00000000-0000-4000-8000-000000007e0a'; t uuid := (select id from public.tablas_referencia where clave = 'te_tabla');
        v_sql text; v_n int;
begin
  perform pg_temp.te_como(p);
  set local role authenticated;
  select count(*) into v_n from public.tablas_referencia_filas where tabla_id = t;
  reset role;
  if v_n <> 2 then raise exception 'quien configura el origen lee % filas, y eran 2', v_n; end if;
  foreach v_sql in array array[
    format('insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values (%L, %L, %L, %L)',
           (select origen_id from public.tablas_referencia where id = t), 'te_otra', 'Otra', '[]'),
    format('update public.tablas_referencia set nombre = %L where id = %L', 'Cambiada', t),
    format('delete from public.tablas_referencia where id = %L', t),
    format('insert into public.tablas_referencia_filas (tabla_id, valores, orden) values (%L, %L, 2)', t, '{"tipo":"c","monto":3}'),
    format('update public.tablas_referencia_filas set valores = %L where tabla_id = %L', '{"tipo":"z","monto":9}', t),
    format('delete from public.tablas_referencia_filas where tabla_id = %L', t)
  ] loop
    if pg_temp.te_codigo(p, v_sql) <> '42501' then raise exception 'la escritura directa no dio 42501: %', v_sql; end if;
  end loop;
  if (select count(*) from public.tablas_referencia_filas where tabla_id = t) <> 2
     or (select nombre from public.tablas_referencia where id = t) <> 'Tabla te' then
    raise exception 'la escritura directa cambió algo';
  end if;
end $$;
rollback;

-- @test tablas: la tabla nace en la versión 1, sin nota, sin autor y sin fecha de publicación
begin;
select pg_temp.te_preparar();
do $$
declare r record;
begin
  select version, nota, publicado_por, publicado_en into r from public.tablas_referencia where clave = 'te_tabla';
  if r.version is distinct from 1 or r.nota is not null or r.publicado_por is not null or r.publicado_en is not null then
    raise exception 'la tabla nueva no nace en la versión 1 sin publicación: %', row_to_json(r);
  end if;
  if exists (select 1 from public.tablas_referencia where version <> 1) then raise exception 'una tabla de la semilla no quedó en la versión 1'; end if;
end $$;
rollback;
