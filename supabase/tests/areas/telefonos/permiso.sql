-- Teléfonos extra: el permiso `leads.telefonos_extra.editar` (clase 1: cartera y permiso, no pide `leads.editar`), `verificar_telefono_extra()`,
-- `lead_telefonos_leer()` y lo enmascarado. No depende de otro archivo (`SOLO=areas/telefonos/permiso.sql`).

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

-- @test telefonos: sin el permiso nuevo, guardar, quitar y verificar dan 42501; con él y sin leads.editar, agrega
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor();
        v_solo_editar uuid := pg_temp.tel_persona(array['leads.ver:propios', 'leads.crear:todos', 'leads.editar:propios']);
        v_solo_extra uuid := pg_temp.tel_persona(array['leads.ver:propios', 'leads.crear:todos', 'leads.telefonos_extra.editar:propios']);
        v_todos uuid := pg_temp.tel_persona(array['leads.ver:todos', 'leads.telefonos_extra.editar:todos']);
        l1 uuid; l2 uuid; r jsonb;
begin
  l1 := pg_temp.tel_lead(v_solo_editar, '73110001');
  l2 := pg_temp.tel_lead(v_solo_extra, '73110002');
  r := pg_temp.tel_extra(v_solo_editar, l1, '73110011');
  if r ->> 'error' <> '42501' then raise exception 'con leads.editar y sin la clave nueva: %', r; end if;
  r := pg_temp.tel_corre(v_solo_editar, format('select public.lead_telefono_quitar(%L, gen_random_uuid())', l1));
  if r ->> 'error' <> '42501' then raise exception 'quitar sin la clave nueva: %', r; end if;
  r := pg_temp.tel_corre(v_solo_editar, format('select public.verificar_telefono_extra(%L, %L, %L)', l1, '', '73110011'));
  if r ->> 'error' <> '42501' then raise exception 'verificar sin la clave nueva: %', r; end if;
  r := pg_temp.tel_extra(v_solo_extra, l2, '73110012');
  if r ->> 'resultado' <> 'agregado' then raise exception 'con la clave nueva y sin leads.editar: %', r; end if;
  r := pg_temp.tel_corre(v_solo_extra, format('select public.verificar_telefono_extra(%L, %L, %L)', l2, '', '73110013'));
  if r ->> 'estado' <> 'libre' then raise exception 'verificar con la clave nueva: %', r; end if;
  -- Cambiar el principal sigue pidiendo leads.editar.
  r := pg_temp.tel_corre(v_solo_extra, format('select public.cambiar_telefono_lead(%L, (select actualizado_en from public.leads where id = %L), %L, %L)', l2, l2, '', '73110014'));
  if r ->> 'error' <> '42501' then raise exception 'cambiar el principal sin leads.editar: %', r; end if;
  -- Sin cartera, aun con «todos», 42501 (limbo, ajeno e inexistente se parecen).
  r := pg_temp.tel_extra(v_todos, l2, '73110015');
  if r ->> 'error' <> '42501' then raise exception 'sin cartera, con todos: %', r; end if;
  r := pg_temp.tel_corre(v_todos, format('select public.verificar_telefono_extra(%L, %L, %L)', l2, '', '73110015'));
  if r ->> 'error' <> '42501' then raise exception 'verificar sin cartera: %', r; end if;
  r := pg_temp.tel_extra(v_solo_extra, gen_random_uuid(), '73110016');
  if r ->> 'error' <> '42501' then raise exception 'un lead que no existe: %', r; end if;
end $$;
rollback;

-- @test telefonos: todo rol con leads.editar tiene la clave nueva con el mismo alcance (los del seed)
begin;
select pg_temp.tel_duena();
do $$
declare n int;
begin
  select count(*) into n from public.roles_permisos e
   where e.permiso_clave = 'leads.editar' and e.rol_id in (select id from public.roles where clave in ('dueno', 'asesor'))
     and not exists (select 1 from public.roles_permisos x where x.rol_id = e.rol_id and x.permiso_clave = 'leads.telefonos_extra.editar'
                       and x.alcance = e.alcance and x.origen_id is not distinct from e.origen_id);
  if n <> 0 then raise exception '% rol(es) con leads.editar sin la clave nueva', n; end if;
  if not exists (select 1 from public.roles r join public.roles_permisos x on x.rol_id = r.id
                  where r.clave = 'asesor' and x.permiso_clave = 'leads.telefonos_extra.editar' and x.alcance = 'propios') then
    raise exception 'el asesor del seed no tiene la clave nueva';
  end if;
  if not exists (select 1 from public.permisos where clave = 'leads.telefonos_extra.editar' and con_alcance and modulo = 'leads' and orden = 165) then
    raise exception 'el catálogo no tiene el permiso';
  end if;
end $$;
rollback;

-- @test telefonos: lead_telefonos_leer() y lead_ficha() enmascaran los extra fuera de la cartera y traen el máximo
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); v_ve uuid := pg_temp.tel_persona(array['leads.ver:todos']); v_nada uuid := pg_temp.tel_persona(array['leads.crear:todos']);
        la uuid; r jsonb; f jsonb;
begin
  la := pg_temp.tel_lead(a, '73120001');
  perform pg_temp.tel_extra(a, la, '73120002');
  perform pg_temp.tel_regla(4, false);
  r := pg_temp.tel_corre(a, format('select public.lead_telefonos_leer(%L)', la));
  if r ->> 'telefono' <> '59173120001' or r -> 'telefonos' -> 0 ->> 'telefono' <> '59173120002' or (r ->> 'en_cartera')::boolean is not true or (r ->> 'maximo')::int <> 4 then
    raise exception 'la cartera lo recibe completo: %', r;
  end if;
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['en_cartera', 'id', 'maximo', 'telefono', 'telefono_cc', 'telefonos'] then raise exception 'las claves: %', r; end if;
  r := pg_temp.tel_corre(v_ve, format('select public.lead_telefonos_leer(%L)', la));
  if (r ->> 'en_cartera')::boolean is not false or r ->> 'telefono' like '%73120001%' or r -> 'telefonos' -> 0 ->> 'telefono' like '%73120002%' or r -> 'telefonos' -> 0 ->> 'telefono' is null then
    raise exception 'fuera de la cartera va enmascarado: %', r;
  end if;
  f := pg_temp.tel_corre(v_ve, format('select public.lead_ficha(%L)', la));
  if f -> 'telefonos' -> 0 ->> 'telefono' like '%73120002%' or (f ->> 'telefonos_maximo')::int <> 4 then raise exception 'la ficha ajena: %', f; end if;
  f := pg_temp.tel_corre(a, format('select public.lead_ficha(%L)', la));
  if f -> 'telefonos' -> 0 ->> 'telefono' <> '59173120002' or (f ->> 'telefonos_maximo')::int <> 4 then raise exception 'la ficha de la cartera: %', f; end if;
  r := pg_temp.tel_corre(v_nada, format('select public.lead_telefonos_leer(%L)', la));
  if r is not null and r <> 'null'::jsonb then raise exception 'sin leads.ver no hay nada: %', r; end if;
end $$;
rollback;
