-- El impacto de un campo privado de cartera (`solo_cartera`): `lead_campo_impacto` cuenta la presencia en todos los leads (con valor,
-- sin valor: lo que también frena cambiar el tipo o eliminar), pero lo que sale de los valores (`fuera_de_rango`, `por_opcion`) sólo
-- mira los leads de la cartera de quien llama, como `atributos_lead`: acotando el rango no se hallan los extremos de un lead ajeno.
-- Corre en PGlite (`pnpm db:probar`, después de la lista fija); cada bloque arma su terreno y lo revierte.

-- @test impacto privado: los ayudantes
reset role;
create or replace function pg_temp.cip_json(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
end $f$;

-- Gala gestiona los campos de leads; Cora es otra asesora. Tres campos: «IP Secreto» (número privado), «IP Clase» (opción privada) e
-- «IP Abierto» (número público). Un lead de Gala y dos de Cora, con valores en los tres.
create or replace function pg_temp.cip_preparar() returns void language plpgsql as $f$
declare p uuid; v_rol uuid; i int := 0;
        gala uuid := '00000000-0000-4000-8000-00000009920f'; cora uuid := '00000000-0000-4000-8000-00000009920c';
begin
  insert into public.leads_campos (id, clave, etiqueta, tipo, opciones, orden, solo_cartera) values
    ('00000000-0000-4000-8000-0000000992a1', 'ip_secreto', 'IP Secreto', 'numero', '[]', 1001, true),
    ('00000000-0000-4000-8000-0000000992b1', 'ip_clase', 'IP Clase', 'opcion',
     '[{"clave": "a", "etiqueta": "A"}, {"clave": "b", "etiqueta": "B"}]', 1002, true),
    ('00000000-0000-4000-8000-0000000992c1', 'ip_abierto', 'IP Abierto', 'numero', '[]', 1003, false);
  foreach p in array array[gala, cora]::uuid[] loop
    i := i + 1;
    insert into auth.users (id, email, raw_app_meta_data) values (p, p || '@ejemplo.com', '{"invitado": true}');
    update public.perfiles set nombre = 'IP ' || i, invitacion_aceptada_en = now() where id = p;
    delete from public.usuarios_roles where usuario_id = p;
    insert into public.roles (clave, nombre) values ('ip_rol_' || i, 'IP rol ' || i) returning id into v_rol;
    insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, v_rol, true);
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
      values (v_rol, case when i = 1 then 'leads.campos.gestionar' else 'leads.ver' end, null, 'todos');
  end loop;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('IP de Gala', '72750001', gala, (select id from public.origenes_lead where clave = 'web'),
     '{"ip_secreto": 50, "ip_clase": "b", "ip_abierto": 50}'),
    ('IP de Cora 1', '72750002', cora, (select id from public.origenes_lead where clave = 'web'),
     '{"ip_secreto": 3, "ip_clase": "a", "ip_abierto": 3}'),
    ('IP de Cora 2', '72750003', cora, (select id from public.origenes_lead where clave = 'web'),
     '{"ip_secreto": 900, "ip_clase": "a", "ip_abierto": 900}');
end $f$;

-- @test impacto privado: el rango y las opciones de un campo privado sólo cuentan los valores de la cartera propia
begin;
select pg_temp.cip_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009920f'; secreto uuid := '00000000-0000-4000-8000-0000000992a1';
        clase uuid := '00000000-0000-4000-8000-0000000992b1'; j jsonb;
begin
  -- Los de Cora (3 y 900) quedan fuera de 10–100, pero Gala no los ve: 0. Su 50 queda fuera desde 60: 1.
  j := pg_temp.cip_json(gala, format('select public.lead_campo_impacto(%L, %L)', secreto, '{"minimo": 10, "maximo": 100}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '0'::jsonb then raise exception 'privado 10–100 contó ajenos: %', j; end if;
  j := pg_temp.cip_json(gala, format('select public.lead_campo_impacto(%L, %L)', secreto, '{"minimo": 60}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '1'::jsonb then raise exception 'privado desde 60: %', j; end if;
  -- La presencia sigue siendo de todos (frena cambiar el tipo o eliminar).
  if jsonb_path_query_first(j, '$.con_valor') <> '3'::jsonb then raise exception 'privado con valor: %', j; end if;
  -- Las opciones: sólo la «b» de Gala, no las «a» de Cora.
  j := pg_temp.cip_json(gala, format('select public.lead_campo_impacto(%L)', clase));
  if j -> 'por_opcion' <> '{"b": 1}'::jsonb then raise exception 'privado por opción contó ajenos: %', j; end if;
  if jsonb_path_query_first(j, '$.con_valor') <> '3'::jsonb then raise exception 'opción privada con valor: %', j; end if;
end $$;
rollback;

-- @test impacto privado: un campo público cuenta los valores de todos los leads
begin;
select pg_temp.cip_preparar();
do $$
declare gala uuid := '00000000-0000-4000-8000-00000009920f'; abierto uuid := '00000000-0000-4000-8000-0000000992c1'; j jsonb;
begin
  j := pg_temp.cip_json(gala, format('select public.lead_campo_impacto(%L, %L)', abierto, '{"minimo": 10, "maximo": 100}'));
  if jsonb_path_query_first(j, '$.fuera_de_rango') <> '2'::jsonb then raise exception 'público 10–100: %', j; end if;
  if jsonb_path_query_first(j, '$.con_valor') <> '3'::jsonb then raise exception 'público con valor: %', j; end if;
end $$;
rollback;
