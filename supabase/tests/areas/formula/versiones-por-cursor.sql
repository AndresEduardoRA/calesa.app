-- La lista de versiones de la fórmula de Configuración › Cotización › «Fórmula» (4.20-2a, `infra/formula/consulta-de-versiones.ts`): PostgREST sobre `formulas` con la
-- sesión de quien mira, `origen_id = $1 and version is not null [and version < $cursor] order by version desc limit 21`. La sostiene
-- `formulas_origen_id_version_key (origen_id, version)` recorrido hacia atrás, sin `Sort`, con y sin cursor y a cualquier profundidad; la policy `formulas: leer`
-- deja ver sólo los orígenes con `cotizaciones.configurar`. Corre en PGlite (`pnpm db:probar`), después de la lista fija; crea su persona, su rol y sus orígenes
-- (no se apoya en las del humo) y los borra al terminar.

-- @test fórmula: las versiones de un origen se leen por cursor sobre su índice, sin ordenar
reset role;
-- 2.000 versiones archivadas en un origen propio (sin la auditoría por fila: no es lo que se prueba) y unas pocas en otro, para que el índice tenga vecinos.
alter table public.formulas disable trigger trg_auditar;
do $$
declare
  o uuid;
  o2 uuid;
  modelo public.formulas;
begin
  select * into modelo from public.formulas where estado = 'publicada' and diseno is not null limit 1;
  if modelo.id is null then raise exception 'la semilla no trae una fórmula publicada con diseño'; end if;
  insert into public.origenes (clave, nombre) values ('prueba_versiones', 'Prueba versiones') returning id into o;
  insert into public.origenes (clave, nombre) values ('prueba_versiones_vecino', 'Prueba versiones vecino') returning id into o2;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  select x.origen, n, 'archivada', modelo.definicion, modelo.params, modelo.diseno, modelo.visibilidad, 'Versión ' || n,
         now() - make_interval(mins => 3000 - n)
    from (values (o, 2000), (o2, 30)) as x (origen, cuantas), generate_series(1, x.cuantas) as n;
  -- Vera configura la fórmula sólo del origen nuevo.
  insert into auth.users (id, email, raw_app_meta_data) values
    ('00000000-0000-4000-8000-0000000f0501', 'vera.versiones@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'Vera Versiones', invitacion_aceptada_en = now() where id = '00000000-0000-4000-8000-0000000f0501';
  -- Si corre sola (`SOLO=`) es la primera cuenta y nace dueña: se le deja sólo su rol.
  delete from public.usuarios_roles where usuario_id = '00000000-0000-4000-8000-0000000f0501';
  insert into public.roles (clave, nombre) values ('prueba_versiones', 'Prueba versiones');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal)
  select '00000000-0000-4000-8000-0000000f0501', id, true from public.roles where clave = 'prueba_versiones';
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
  select r.id, 'cotizaciones.configurar', o, 'todos' from public.roles r where r.clave = 'prueba_versiones';
end $$;
alter table public.formulas enable trigger trg_auditar;
analyze public.formulas;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000f0501', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$
declare
  o uuid := (select id from public.origenes where clave = 'prueba_versiones');
  consulta text;
  linea text;
  plan text;
  n int;
begin
  -- Sin cursor, y con cursor cerca de la más nueva (1.981) y en lo hondo (101).
  foreach consulta in array array[
    format('select id, version, estado, nota, publicado_por, publicado_en from public.formulas where origen_id = %L and version is not null order by version desc limit 21', o),
    format('select id, version, estado, nota, publicado_por, publicado_en from public.formulas where origen_id = %L and version is not null and version < 1981 order by version desc limit 21', o),
    format('select id, version, estado, nota, publicado_por, publicado_en from public.formulas where origen_id = %L and version is not null and version < 101 order by version desc limit 21', o)
  ] loop
    plan := '';
    for linea in execute 'explain (costs off) ' || consulta loop
      plan := plan || linea || E'\n';
    end loop;
    if plan !~ 'Index Scan Backward using formulas_origen_id_version_key' then
      raise exception 'la lista de versiones dejó de ir por su índice hacia atrás: %', plan;
    end if;
    if plan ~ 'Sort' or plan ~ 'Seq Scan' then
      raise exception 'la lista de versiones ordena o recorre la tabla: %', plan;
    end if;
    execute 'select count(*) from (' || consulta || ') q' into n;
    if n <> 21 then raise exception 'la página debía traer 21 (20 y una de más), trajo %', n; end if;
  end loop;
  -- El cursor corta donde debe: la primera de la página con cursor 101 es la 100.
  if (select max(version) from (select version from public.formulas where origen_id = o and version is not null and version < 101 order by version desc limit 21) q) <> 100 then
    raise exception 'el cursor no cortó en la 100';
  end if;
end $$;
reset role;

-- Sin `cotizaciones.configurar` en el vecino, Vera no lee sus versiones; una persona sin roles no lee ninguna.
set role authenticated;
do $$ begin
  if exists (select 1 from public.formulas where origen_id = (select id from public.origenes where clave = 'prueba_versiones_vecino') limit 1) then
    raise exception 'leyó versiones de un origen donde no tiene cotizaciones.configurar';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000f00d', false);
set role authenticated;
do $$ begin
  if exists (select 1 from public.formulas where origen_id = (select id from public.origenes where clave = 'prueba_versiones') limit 1) then
    raise exception 'sin cotizaciones.configurar leyó versiones de la fórmula';
  end if;
  if exists (select 1 from public.formulas limit 1) then raise exception 'sin cotizaciones.configurar leyó alguna fórmula'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

alter table public.formulas disable trigger trg_auditar;
delete from public.formulas where origen_id in (select id from public.origenes where clave in ('prueba_versiones', 'prueba_versiones_vecino'));
alter table public.formulas enable trigger trg_auditar;
delete from public.usuarios_roles where usuario_id = '00000000-0000-4000-8000-0000000f0501';
delete from public.roles where clave = 'prueba_versiones';
delete from auth.users where id = '00000000-0000-4000-8000-0000000f0501';
delete from public.origenes where clave in ('prueba_versiones', 'prueba_versiones_vecino');
