-- Teléfonos extra: el máximo por lead (`ajustes_leads.telefonos_extra_maximo`, 6 de fábrica, 0 a 20). Lo aplica «agregar»: quitar, rotular y
-- cambiar el principal (que deja «Anterior») no miran el tope. No depende de otro archivo (`SOLO=areas/telefonos/tope.sql`).

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

-- @test telefonos: con el máximo de fábrica (6) el séptimo extra se rechaza con el texto
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); la uuid; r jsonb; g int;
begin
  la := pg_temp.tel_lead(a, '72110001');
  if (select telefonos_extra_maximo from public.ajustes_leads where id = 1) <> 6 then raise exception 'el máximo no nace en 6'; end if;
  for g in 1..6 loop
    r := pg_temp.tel_extra(a, la, '7211001' || g);
    if r ->> 'resultado' <> 'agregado' then raise exception 'el extra % debía entrar: %', g, r; end if;
  end loop;
  r := pg_temp.tel_extra(a, la, '72110099');
  if r ->> 'error' <> '22023' or r ->> 'hint' <> 'telefono' or r ->> 'mensaje' <> 'Un lead admite hasta 6 teléfonos extra. Quita uno para agregar otro.' then
    raise exception 'el séptimo: %', r;
  end if;
  if pg_temp.tel_n_extras(la) <> 6 then raise exception 'se pasó del tope'; end if;
end $$;
rollback;

-- @test telefonos: bajar el máximo deja lo que ya hay; quitar y rotular siguen, agregar espera a bajar del tope
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); la uuid; r jsonb; g int; v_id uuid;
begin
  la := pg_temp.tel_lead(a, '72120001');
  for g in 1..5 loop perform pg_temp.tel_extra(a, la, '7212001' || g); end loop;
  perform pg_temp.tel_regla(3, false);
  r := pg_temp.tel_extra(a, la, '72120099');
  if r ->> 'error' <> '22023' or r ->> 'mensaje' <> 'Un lead admite hasta 3 teléfonos extra. Quita uno para agregar otro.' then raise exception 'sobre el tope: %', r; end if;
  select t.id into v_id from public.leads_telefonos t where t.lead_id = la order by t.creado_en, t.id limit 1;
  r := pg_temp.tel_corre(a, format('select public.lead_telefono_guardar(%L, %L, %L, %L, %L)', la, v_id, '', (select telefono from public.leads_telefonos where id = v_id), 'Casa'));
  if r ->> 'resultado' <> 'rotulado' then raise exception 'rotular sobre el tope: %', r; end if;
  r := pg_temp.tel_corre(a, format('select public.lead_telefono_quitar(%L, %L)', la, v_id));
  if r ->> 'resultado' <> 'quitado' or pg_temp.tel_n_extras(la) <> 4 then raise exception 'quitar sobre el tope: %', r; end if;
  -- Restituir lo quitado también cuenta contra el tope: hay 4 y el máximo es 3.
  r := pg_temp.tel_extra(a, la, '72120098');
  if r ->> 'error' <> '22023' then raise exception 'con 4 y máximo 3 no entra: %', r; end if;
  perform pg_temp.tel_corre(a, format('select public.lead_telefono_quitar(%L, (select id from public.leads_telefonos where lead_id = %L order by creado_en, id limit 1))', la, la));
  perform pg_temp.tel_corre(a, format('select public.lead_telefono_quitar(%L, (select id from public.leads_telefonos where lead_id = %L order by creado_en, id limit 1))', la, la));
  r := pg_temp.tel_extra(a, la, '72120097');
  if r ->> 'resultado' <> 'agregado' then raise exception 'con 2 y máximo 3 entra: %', r; end if;
end $$;
rollback;

-- @test telefonos: con 0 no se agregan extra; el texto lo dice
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); la uuid; r jsonb;
begin
  la := pg_temp.tel_lead(a, '72130001');
  perform pg_temp.tel_regla(0, false);
  r := pg_temp.tel_extra(a, la, '72130002');
  if r ->> 'error' <> '22023' or r ->> 'mensaje' <> 'Esta empresa no admite teléfonos extra.' or r ->> 'hint' <> 'telefono' then raise exception 'con 0: %', r; end if;
end $$;
rollback;

-- @test telefonos: cambiar el principal agrega «Anterior» aunque el lead esté en el tope
begin;
select pg_temp.tel_duena();
do $$
declare a uuid := pg_temp.tel_asesor(); la uuid; r jsonb; g int;
begin
  la := pg_temp.tel_lead(a, '72140001');
  perform pg_temp.tel_regla(2, false);
  perform pg_temp.tel_extra(a, la, '72140002');
  perform pg_temp.tel_extra(a, la, '72140003');
  r := pg_temp.tel_corre(a, format('select public.cambiar_telefono_lead(%L, (select actualizado_en from public.leads where id = %L), %L, %L)', la, la, '', '72140009'));
  if r ->> 'resultado' <> 'cambiado' or pg_temp.tel_n_extras(la) <> 3
     or not exists (select 1 from public.leads_telefonos where lead_id = la and telefono = '59172140001' and etiqueta = 'Anterior') then
    raise exception 'cambiar el principal en el tope: %', r;
  end if;
end $$;
rollback;
