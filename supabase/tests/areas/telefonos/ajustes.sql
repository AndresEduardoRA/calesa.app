-- Teléfonos extra: los ajustes de la empresa (`telefonos_extra_ajustes_guardar()` con `leads.configurar`, versión propia, rango 0 a 20) y los
-- choques (`telefonos_extra_choques()`: por cursor, enmascarados, sin nombres que quien configura no ve). No depende de otro archivo
-- (`SOLO=areas/telefonos/ajustes.sql`).

-- Ayudantes (prefijo tel_): personas con rol propio, correr un SQL como una persona y armar leads. La primera cuenta nace dueña: se
-- crea primero la dueña (tel_duena) y las demás se arman con roles de a una concesión.
create or replace function pg_temp.tel_persona(p_conc text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  update public.perfiles set nombre = 'TEL ' || substr(v_id::text, 1, 6), invitacion_aceptada_en = now() where id = v_id;
  delete from public.usuarios_roles where usuario_id = v_id;
  insert into public.roles (clave, nombre) values ('tel_' || substr(v_id::text, 1, 8), 'TEL ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_conc loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, split_part(c, ':', 1), split_part(c, ':', 2)::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- La dueña (primera cuenta) y un asesor con ver, crear, editar y editar teléfonos extra de su cartera.
create or replace function pg_temp.tel_duena() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  return v_id;
end $f$;
create or replace function pg_temp.tel_asesor() returns uuid language sql as $f$
  select pg_temp.tel_persona(array['leads.ver:propios', 'leads.crear:todos', 'leads.editar:propios', 'leads.telefonos_extra.editar:propios'])
$f$;

-- Un SQL como esa persona: su jsonb, o {error, mensaje, hint} si falla.
create or replace function pg_temp.tel_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', v_h);
  end;
  reset role;
  return v;
end $f$;

-- Un lead de esa persona con ese principal (devuelve su id).
create or replace function pg_temp.tel_lead(p_quien uuid, p_tel text) returns uuid language plpgsql as $f$
declare v uuid := gen_random_uuid(); r jsonb;
begin
  r := pg_temp.tel_corre(p_quien, format('select public.crear_lead(%L, %L::jsonb)', v, jsonb_build_object(
    'nombre', 'TEL ' || p_tel, 'telefono_principal', p_tel, 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'))));
  if r ->> 'resultado' is distinct from 'creado' then raise exception 'tel_lead(%): %', p_tel, r; end if;
  return v;
end $f$;

-- Agrega un extra como esa persona y devuelve la respuesta.
create or replace function pg_temp.tel_extra(p_quien uuid, p_lead uuid, p_tel text) returns jsonb language sql as $f$
  select pg_temp.tel_corre(p_quien, format('select public.lead_telefono_guardar(%L, gen_random_uuid(), %L, %L, null)', p_lead, '', p_tel))
$f$;

create or replace function pg_temp.tel_regla(p_maximo int, p_como boolean) returns void language sql as $f$
  update public.ajustes_leads set telefonos_extra_maximo = p_maximo, telefonos_extra_como_principal = p_como where id = 1
$f$;

create or replace function pg_temp.tel_n_extras(p_lead uuid) returns bigint language sql as $f$
  select count(*) from public.leads_telefonos where lead_id = p_lead
$f$;

-- @test telefonos: ajustes_leads_leer() trae los teléfonos y guardar valida el rango, la versión y el permiso
begin;
select pg_temp.tel_duena();
do $$
declare gala uuid := pg_temp.tel_persona(array['leads.configurar:todos']); a uuid := pg_temp.tel_asesor(); j jsonb; v timestamptz; v2 timestamptz; r jsonb;
begin
  j := pg_temp.tel_corre(a, 'select public.ajustes_leads_leer()');
  if (select array_agg(k order by k) from jsonb_object_keys(j) k) <> array['embudo', 'portal', 'telefonos']
     or (select array_agg(k order by k) from jsonb_object_keys(j -> 'telefonos') k) <> array['actualizado_en', 'como_principal', 'maximo']
     or (j #>> '{telefonos,maximo}')::int <> 6 or (j #>> '{telefonos,como_principal}')::boolean is not false then
    raise exception 'la lectura: %', j;
  end if;
  v := (j #>> '{telefonos,actualizado_en}')::timestamptz;
  -- Sin leads.configurar: 42501.
  r := pg_temp.tel_corre(a, format('select public.telefonos_extra_ajustes_guardar(8, true, %L)', v));
  if r ->> 'error' <> '42501' then raise exception 'sin leads.configurar: %', r; end if;
  -- Rango.
  r := pg_temp.tel_corre(gala, format('select public.telefonos_extra_ajustes_guardar(21, false, %L)', v));
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'maximo' or r ->> 'mensaje' <> 'El máximo va de 0 a 20.' then raise exception '21: %', r; end if;
  r := pg_temp.tel_corre(gala, format('select public.telefonos_extra_ajustes_guardar(-1, false, %L)', v));
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'maximo' then raise exception '-1: %', r; end if;
  -- Guardar mueve la versión; sin cambios no la mueve; una versión vieja es PT409.
  v2 := (pg_temp.tel_corre(gala, format('select to_jsonb(public.telefonos_extra_ajustes_guardar(20, true, %L))', v)) #>> '{}')::timestamptz;
  if v2 <= v then raise exception 'la versión no avanzó'; end if;
  if (select telefonos_extra_maximo from public.ajustes_leads where id = 1) <> 20 or (select telefonos_extra_como_principal from public.ajustes_leads where id = 1) is not true then
    raise exception 'no guardó';
  end if;
  if (pg_temp.tel_corre(gala, format('select to_jsonb(public.telefonos_extra_ajustes_guardar(20, true, %L))', v2)) #>> '{}')::timestamptz <> v2 then raise exception 'sin cambios mueve la versión'; end if;
  r := pg_temp.tel_corre(gala, format('select public.telefonos_extra_ajustes_guardar(0, true, %L)', v));
  if r ->> 'error' <> 'PT409' then raise exception 'versión vieja: %', r; end if;
  r := pg_temp.tel_corre(gala, format('select public.telefonos_extra_ajustes_guardar(0, true, %L)', v2 - interval '1 microsecond'));
  if r ->> 'error' <> 'PT409' then raise exception 'la versión menos 1 µs: %', r; end if;
  r := pg_temp.tel_corre(gala, 'select public.telefonos_extra_ajustes_guardar(0, true, null)');
  if r ->> 'error' is null then raise exception 'sin versión debía fallar'; end if;
  -- Las versiones de embudo y portal no se tocan.
  if (select embudo_actualizado_en from public.ajustes_leads where id = 1) = v2 then raise exception 'movió la del embudo'; end if;
end $$;
rollback;

-- @test telefonos: los choques salen enmascarados, por cursor y sin nombres de leads que no se ven
begin;
select pg_temp.tel_duena();
-- Terreno limpio: otros archivos dejan leads y extras que también chocan (todo se revierte).
delete from public.leads_telefonos;
do $$
declare gala uuid := pg_temp.tel_persona(array['leads.configurar:todos', 'leads.ver:propios', 'leads.crear:todos', 'leads.telefonos_extra.editar:propios']); a uuid := pg_temp.tel_asesor(); b uuid := pg_temp.tel_asesor();
        la uuid; lb uuid; lc uuid; r jsonb; r2 jsonb; g int; v_sin uuid := pg_temp.tel_persona(array['leads.ver:todos']);
begin
  la := pg_temp.tel_lead(a, '74110001');
  lb := pg_temp.tel_lead(b, '74110002');
  lc := pg_temp.tel_lead(gala, '74110003');
  r := pg_temp.tel_corre(gala, 'select public.telefonos_extra_choques()');
  if r ->> 'error' is not null or r -> 'filas' <> '[]'::jsonb or (r ->> 'hay_mas')::boolean or (r ->> 'recorrido_cortado')::boolean then raise exception 'sin choques: %', r; end if;
  -- Un extra de A que es el principal de B; un extra de B repetido en C (extra con extra); un extra de A propio de nadie más.
  perform pg_temp.tel_extra(a, la, '74110002');
  perform pg_temp.tel_extra(a, la, '74110009');
  perform pg_temp.tel_extra(b, lb, '74110009');
  perform pg_temp.tel_extra(gala, lc, '74110009');
  perform pg_temp.tel_extra(a, la, '74110008');
  -- «El más antiguo» es de creado_en (en una transacción todos valen lo mismo): A antes que B, B antes que C.
  update public.leads_telefonos set creado_en = now() - interval '3 days' where lead_id = la;
  update public.leads_telefonos set creado_en = now() - interval '2 days' where lead_id = lb;
  update public.leads_telefonos set creado_en = now() - interval '1 day' where lead_id = lc;
  r := pg_temp.tel_corre(gala, 'select public.telefonos_extra_choques()');
  -- 74110002 (extra de A = principal de B) y 74110009: de B contra A, de C contra A (el más antiguo): 3 filas.
  if jsonb_array_length(r -> 'filas') <> 3 then raise exception 'las filas: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'filas') f where f ->> 'telefono' !~ '^[•*]|\*' and f ->> 'telefono' like '%74110002%') then raise exception 'el número no va enmascarado: %', r; end if;
  if r::text like '%59174110002%' or r::text like '%59174110009%' then raise exception 'asoma un número completo: %', r; end if;
  -- Gala sólo ve lo suyo (propios): los demás nombres son nulos, el suyo no.
  if exists (select 1 from jsonb_array_elements(r -> 'filas') f where f #>> '{lead,id}' = la::text) then raise exception 'mostró el id de un lead que no ve: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'filas') f where f #>> '{lead,id}' = lc::text and f #>> '{lead,nombre}' = 'TEL 74110003') then raise exception 'perdió el lead que sí ve: %', r; end if;
  if r::text like '%TEL 74110001%' or r::text like '%TEL 74110002%' then raise exception 'asoma el nombre de un lead ajeno: %', r; end if;
  -- Por cursor: de a una fila.
  r := pg_temp.tel_corre(gala, 'select public.telefonos_extra_choques(null, 1)');
  if jsonb_array_length(r -> 'filas') <> 1 or (r ->> 'hay_mas')::boolean is not true or r ->> 'siguiente' is null then raise exception 'primera página: %', r; end if;
  r2 := pg_temp.tel_corre(gala, format('select public.telefonos_extra_choques(%L, 1)', r ->> 'siguiente'));
  if jsonb_array_length(r2 -> 'filas') <> 1 or r2 #>> '{filas,0,id}' = r #>> '{filas,0,id}' or (r2 ->> 'hay_mas')::boolean is not true then raise exception 'segunda página: %', r2; end if;
  r2 := pg_temp.tel_corre(gala, format('select public.telefonos_extra_choques(%L, 1)', r2 ->> 'siguiente'));
  if jsonb_array_length(r2 -> 'filas') <> 1 or (r2 ->> 'hay_mas')::boolean is not false or r2 ->> 'siguiente' is not null then raise exception 'tercera página: %', r2; end if;
  -- El tamaño se acota (0 → 1) y se exige el permiso.
  r := pg_temp.tel_corre(gala, 'select public.telefonos_extra_choques(null, 0)');
  if jsonb_array_length(r -> 'filas') <> 1 then raise exception 'tamaño 0: %', r; end if;
  r := pg_temp.tel_corre(v_sin, 'select public.telefonos_extra_choques()');
  if r ->> 'error' <> '42501' then raise exception 'sin leads.configurar: %', r; end if;
  -- Un lead en la papelera no choca.
  update public.leads set eliminado_en = now() where id = lb;
  r := pg_temp.tel_corre(gala, 'select public.telefonos_extra_choques()');
  if jsonb_array_length(r -> 'filas') <> 1 then raise exception 'con B en la papelera sólo queda C contra A: %', r; end if;
end $$;
rollback;
