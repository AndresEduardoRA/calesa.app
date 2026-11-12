-- El rango en las RPC de campos de leads (9.04-2): `lead_campo_guardar` acepta `minimo`/`maximo` en `p_cambios` (null = sin límite),
-- `lead_campo_crear` los recibe al final con default, y `lead_campo_impacto(p_campo, p_cambios)` cuenta, acotado a 51, los leads con un
-- valor que quedaría fuera. Todo con `leads.campos.gestionar` (42501 sin ella). Corre en PGlite (`pnpm db:probar`, después de la lista
-- fija); cada bloque arma su terreno y lo revierte.

-- @test rango en leads: los ayudantes
reset role;
create or replace function pg_temp.cml_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- El error de un SQL corrido como esa persona: «sqlstate» o «sqlstate/hint», o «sin error».
create or replace function pg_temp.cml_codigo(p_quien uuid, p_sql text) returns text language plpgsql as $f$
declare v_hint text;
begin
  perform pg_temp.cml_como(p_quien);
  set local role authenticated;
  execute p_sql;
  reset role;
  return 'sin error';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  reset role;
  return sqlstate || coalesce('/' || nullif(v_hint, ''), '');
end $f$;

-- La respuesta jsonb de una RPC corrida como esa persona (un error sube).
create or replace function pg_temp.cml_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform pg_temp.cml_como(p_quien);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Dos personas con rol propio (la primera cuenta nace dueña: se le quita): Gala gestiona los campos de leads y Cora sólo tiene
-- `leads.configurar`. Dos campos: «RL Edad» (número) y «RL Nota» (texto).
create or replace function pg_temp.cml_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
begin
  insert into public.leads_campos (id, clave, etiqueta, tipo, orden) values
    ('00000000-0000-4000-8000-0000000991a1', 'rl_edad', 'RL Edad', 'numero', 1001),
    ('00000000-0000-4000-8000-0000000991b1', 'rl_nota', 'RL Nota', 'texto', 1002);
  foreach p in array array['00000000-0000-4000-8000-00000009910f', '00000000-0000-4000-8000-00000009910c']::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'RL ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('rl_rol_' || i, 'RL rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      values (v_rol, case when i = 1 then 'leads.campos.gestionar' else 'leads.configurar' end, null, 'todos');
  end loop;
end $f$;

create or replace function pg_temp.cml_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.leads_campos where id = p_id
$f$;

create or replace function pg_temp.cml_rango(p_id uuid) returns text language sql as $f$
  select coalesce(minimo::text, '-') || '..' || coalesce(maximo::text, '-') from public.leads_campos where id = p_id
$f$;

-- Guardar como Gala: el error o «sin error».
create or replace function pg_temp.cml_guardar(p_id uuid, p_cambios jsonb) returns text language sql as $f$
  select pg_temp.cml_codigo('00000000-0000-4000-8000-00000009910f',
    format('select public.lead_campo_guardar(%L, %L, %L)', p_id, pg_temp.cml_version(p_id), p_cambios))
$f$;

-- Leads de prueba con el valor de «RL Edad» (null = sin el campo), insertados como postgres.
create or replace function pg_temp.cml_leads(p_valores numeric[]) returns void language plpgsql as $f$
declare v numeric; i int := 0;
begin
  foreach v in array p_valores loop
    i := i + 1;
    insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
      values ('RL lead ' || i, '7273' || lpad(i::text, 4, '0'), (select id from public.perfiles order by id limit 1),
              (select id from public.origenes_lead where clave = 'web'),
              case when v is null then '{}'::jsonb else jsonb_build_object('rl_edad', v) end);
  end loop;
end $f$;

-- @test rango en leads: guardar pone, quita y rechaza el rango con su hint
begin;
select pg_temp.cml_preparar();
do $$
declare e uuid := '00000000-0000-4000-8000-0000000991a1'; t uuid := '00000000-0000-4000-8000-0000000991b1'; r text;
begin
  r := pg_temp.cml_guardar(e, '{"minimo": 18, "maximo": 99}');
  if r <> 'sin error' or pg_temp.cml_rango(e) <> '18..99' then raise exception 'poner 18–99: % / %', r, pg_temp.cml_rango(e); end if;
  r := pg_temp.cml_guardar(e, '{"etiqueta": "RL Edad 2"}');
  if r <> 'sin error' or pg_temp.cml_rango(e) <> '18..99' then raise exception 'guardar otra cosa tocó el rango: % / %', r, pg_temp.cml_rango(e); end if;
  r := pg_temp.cml_guardar(e, '{"minimo": null}');
  if r <> 'sin error' or pg_temp.cml_rango(e) <> '-..99' then raise exception 'quitar el mínimo: % / %', r, pg_temp.cml_rango(e); end if;
  r := pg_temp.cml_guardar(e, '{"minimo": 100, "maximo": 5}');
  if r <> '22023/maximo' then raise exception 'mínimo > máximo: %', r; end if;
  r := pg_temp.cml_guardar(e, '{"minimo": "x"}');
  if r <> '22023/minimo' then raise exception 'mínimo que no es número: %', r; end if;
  r := pg_temp.cml_guardar(e, '{"maximo": 2000000000000}');
  if r <> '22023/maximo' then raise exception 'máximo demasiado grande: %', r; end if;
  r := pg_temp.cml_guardar(t, '{"minimo": 1}');
  if r <> '22023/minimo' then raise exception 'mínimo en un texto: %', r; end if;
  r := pg_temp.cml_guardar(e, '{"valor_defecto": 5, "minimo": 18}');
  if r <> '22023/valor_defecto' then raise exception 'defecto fuera del rango: %', r; end if;
  r := pg_temp.cml_guardar(e, '{"valor_defecto": 20, "minimo": 18}');
  if r <> 'sin error' or pg_temp.cml_rango(e) <> '18..99' then raise exception 'defecto dentro del rango: % / %', r, pg_temp.cml_rango(e); end if;
  -- Al dejar de ser número, sin valores cargados, el rango se va solo.
  r := pg_temp.cml_guardar(e, '{"tipo": "texto", "valor_defecto": null}');
  if r <> 'sin error' or pg_temp.cml_rango(e) <> '-..-' then raise exception 'número a texto: % / %', r, pg_temp.cml_rango(e); end if;
end $$;
rollback;

-- @test rango en leads: crear recibe el rango al final; en un texto, 22023
begin;
select pg_temp.cml_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009910f'; j jsonb; r text;
begin
  j := pg_temp.cml_json(gala, format('select public.lead_campo_crear(%L, %L, %L, p_minimo => 18, p_maximo => 99)', 'rl_peso', 'RL Peso', 'numero'));
  if pg_temp.cml_rango((j ->> 'id')::uuid) <> '18..99' then raise exception 'crear con rango: %', pg_temp.cml_rango((j ->> 'id')::uuid); end if;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_crear(%L, %L, %L)', 'rl_alto', 'RL Alto', 'moneda'));
  if pg_temp.cml_rango((j ->> 'id')::uuid) <> '-..-' then raise exception 'crear sin rango: %', pg_temp.cml_rango((j ->> 'id')::uuid); end if;
  r := pg_temp.cml_codigo(gala, format('select public.lead_campo_crear(%L, %L, %L, p_minimo => 1)', 'rl_txt', 'RL Txt', 'texto'));
  if r <> '22023/minimo' then raise exception 'crear un texto con mínimo: %', r; end if;
  r := pg_temp.cml_codigo(gala, format('select public.lead_campo_crear(%L, %L, %L, p_valor_defecto => %L, p_minimo => 18)', 'rl_def', 'RL Def', 'numero', '5'));
  if r <> '22023/valor_defecto' then raise exception 'crear con el defecto fuera: %', r; end if;
end $$;
rollback;

-- @test rango en leads: el impacto cuenta los fuera del rango propuesto o del vigente, acotado a 51
begin;
select pg_temp.cml_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009910f'; e uuid := '00000000-0000-4000-8000-0000000991a1';
        t uuid := '00000000-0000-4000-8000-0000000991b1'; j jsonb;
begin
  perform pg_temp.cml_leads(array[10, 50, 120, null]::numeric[]);
  update public.leads_campos set minimo = 0, maximo = 200 where id = e;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_impacto(%L, %L)', e, '{"minimo": 18, "maximo": 99}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '2'::jsonb then raise exception 'propuesto 18–99: %', j; end if;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_impacto(%L, %L)', e, '{"maximo": null, "minimo": 11}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '1'::jsonb then raise exception 'propuesto desde 11: %', j; end if;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_impacto(%L)', e));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '0'::jsonb then raise exception 'vigente 0–200: %', j; end if;
  if not j ? 'total' then raise exception 'el impacto perdió sus claves de siempre: %', j; end if;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_impacto(%L, %L)', e, '{"minimo": null, "maximo": null}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> 'null'::jsonb then raise exception 'sin límites: %', j; end if;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_impacto(%L)', t));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> 'null'::jsonb then raise exception 'en un texto: %', j; end if;
  -- 60 fuera: se cuentan 51 (tope 50 y uno de más).
  update public.leads_campos set minimo = null, maximo = null where id = e;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
    select 'RL masivo ' || g, '7274' || lpad(g::text, 4, '0'), (select id from public.perfiles order by id limit 1),
           (select id from public.origenes_lead where clave = 'web'), jsonb_build_object('rl_edad', -5)
      from generate_series(1, 60) g;
  j := pg_temp.cml_json(gala, format('select public.lead_campo_impacto(%L, %L)', e, '{"minimo": 0}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '51'::jsonb then raise exception 'acotado: %', j; end if;
end $$;
rollback;

-- @test rango en leads: sin leads.campos.gestionar, 42501; un p_cambios que no es objeto, 22023
begin;
select pg_temp.cml_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009910f'; cora uuid := '00000000-0000-4000-8000-00000009910c';
        e uuid := '00000000-0000-4000-8000-0000000991a1'; r text;
begin
  r := pg_temp.cml_codigo(cora, format('select public.lead_campo_impacto(%L, %L)', e, '{}'));
  if r <> '42501' then raise exception 'impacto sin la clave: %', r; end if;
  r := pg_temp.cml_codigo(cora, format('select public.lead_campo_crear(%L, %L, %L, p_minimo => 1)', 'rl_x', 'RL X', 'numero'));
  if r <> '42501' then raise exception 'crear sin la clave: %', r; end if;
  r := pg_temp.cml_codigo(cora, format('select public.lead_campo_guardar(%L, %L, %L)', e, pg_temp.cml_version(e), '{"minimo": 1}'));
  if r <> '42501' then raise exception 'guardar sin la clave: %', r; end if;
  r := pg_temp.cml_codigo(gala, format('select public.lead_campo_impacto(%L, %L)', e, '[1]'));
  if r not like '22023%' then raise exception 'impacto con un arreglo: %', r; end if;
end $$;
rollback;
