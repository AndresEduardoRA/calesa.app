-- El último seguimiento y el próximo recordatorio en el listado de leads: dos columnas de `leads_vista` (y de `leads_cartera_vista`). No depende de otro archivo
-- (`SOLO=areas/leads/ultimo-contacto.sql`).
--
-- Qué asegura:
--   UC1. Un lead sin seguimientos ni recordatorios: las dos columnas son nulas y `ultimo_seguimiento_en` también.
--   UC2. Con el último seguimiento público, lo ven todos quienes ven el lead: tipo y título.
--   UC3. Con el último seguimiento privado de otra persona, quien mira recibe la fecha (`ultimo_seguimiento_en`) y nada más: ni tipo ni título.
--   UC4. El privado de quien mira sí le llega, y lo suyo más viejo no tapa lo más nuevo ajeno (la columna no cae al penúltimo).
--   UC5. El recordatorio es personal: el próximo pendiente de quien mira, el vencido primero, sin los completados ni los eliminados, y nunca el de otra persona.
--   UC6. `leads_cartera_vista` (míos) entrega lo mismo que `leads_vista`.
--   UC7. `leads_catalogos()` lleva los tipos de seguimiento, también los apagados.

create or replace function pg_temp.uc_persona(p_claves text[], p_alcance text default 'propios') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('uc_' || substr(v_id::text, 1, 8), 'UC ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.uc_como(p_id uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $f$;

-- @test último contacto: sin nada, nulo; con lo último público lo ven todos; con lo último privado ajeno sólo llega la fecha (UC1 a UC4, UC6)
begin;
do $$
declare
  duena uuid; a uuid; b uuid; v_lead uuid := gen_random_uuid(); v_tipo uuid := (select id from public.tipos_seguimiento order by orden, id limit 1);
  v_pub uuid := gen_random_uuid(); v_priv_a uuid := gen_random_uuid(); v_priv_b uuid := gen_random_uuid();
  v public.leads_vista; w public.leads_cartera_vista; v_t1 timestamptz := now() - interval '5 days'; v_t2 timestamptz := now() - interval '3 days';
  v_t3 timestamptz := now() - interval '1 day';
begin
  duena := pg_temp.uc_persona(array['leads.ver']);   -- con `SOLO=`, la primera cuenta nace dueña
  a := pg_temp.uc_persona(array['leads.ver', 'leads.crear', 'leads.editar'], 'todos');
  b := pg_temp.uc_persona(array['leads.ver', 'leads.crear', 'leads.editar'], 'todos');
  perform pg_temp.uc_como(a);
  set local role authenticated;
  perform public.crear_lead(v_lead, jsonb_build_object('nombre', 'UC Lucía Contacto', 'telefono_principal', '72841001', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  -- UC1
  select * into v from public.leads_vista where id = v_lead;
  if v.id is null or v.ultimo_seguimiento_visible is not null or v.proximo_recordatorio is not null or v.ultimo_seguimiento_en is not null then
    raise exception 'UC1: un lead sin nada debía dar nulos: %', to_jsonb(v);
  end if;
  reset role;
  -- Un seguimiento público de A (el más viejo), uno privado de B en medio y el último privado de A.
  insert into public.seguimientos (id, lead_id, usuario_id, tipo_id, titulo, visibilidad, ocurrido_en) values
    (v_pub, v_lead, a, v_tipo, 'UC público de A', 'publico', v_t1),
    (v_priv_b, v_lead, b, v_tipo, 'UC privado de B', 'privado', v_t2);
  -- UC2: el último es el público
  perform pg_temp.uc_como(b); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.ultimo_seguimiento_en <> v_t2 then raise exception 'UC4: la fecha pública debía ser la de lo último (B): %', v.ultimo_seguimiento_en; end if;
  -- UC4: para B lo último es lo suyo, privado
  if v.ultimo_seguimiento_visible ->> 'titulo' is distinct from 'UC privado de B'
     or (v.ultimo_seguimiento_visible ->> 'tipo_id')::uuid is distinct from v_tipo then
    raise exception 'UC4: B debía ver su propio último privado: %', v.ultimo_seguimiento_visible;
  end if;
  reset role;
  -- UC3: ahora el último es el privado de A, que B no ve
  insert into public.seguimientos (id, lead_id, usuario_id, tipo_id, titulo, visibilidad, ocurrido_en) values (v_priv_a, v_lead, a, v_tipo, 'UC privado de A', 'privado', v_t3);
  perform pg_temp.uc_como(b); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.ultimo_seguimiento_en <> v_t3 then raise exception 'UC3: la fecha debía ser la del privado ajeno: %', v.ultimo_seguimiento_en; end if;
  if v.ultimo_seguimiento_visible is not null then raise exception 'UC3: B no debía ver el detalle de un privado de A: %', v.ultimo_seguimiento_visible; end if;
  if v::text ilike '%UC privado de A%' then raise exception 'UC3: el título ajeno se filtró en la fila'; end if;
  reset role;
  -- UC2: A ve el suyo; con el último público, B lo ve también
  perform pg_temp.uc_como(a); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.ultimo_seguimiento_visible ->> 'titulo' is distinct from 'UC privado de A' then raise exception 'UC3: A debía ver su último privado: %', v.ultimo_seguimiento_visible; end if;
  -- UC6: «míos» lo entrega igual
  select * into w from public.leads_cartera_vista where id = v_lead;
  if w.ultimo_seguimiento_visible is distinct from v.ultimo_seguimiento_visible or w.proximo_recordatorio is distinct from v.proximo_recordatorio then
    raise exception 'UC6: leads_cartera_vista no coincide con leads_vista';
  end if;
  reset role;
  update public.seguimientos set visibilidad = 'publico' where id = v_priv_a;
  perform pg_temp.uc_como(b); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.ultimo_seguimiento_visible ->> 'titulo' is distinct from 'UC privado de A' then
    raise exception 'UC2: con el último público B debía verlo: %', v.ultimo_seguimiento_visible;
  end if;
  reset role;
end $$;
rollback;

-- @test último contacto: el recordatorio es el próximo pendiente de quien mira y nunca el de otra persona (UC5)
begin;
do $$
declare
  duena uuid; a uuid; b uuid; v_lead uuid := gen_random_uuid(); v public.leads_vista; v_vencido uuid := gen_random_uuid(); v_sig uuid := gen_random_uuid();
begin
  duena := pg_temp.uc_persona(array['leads.ver']);
  a := pg_temp.uc_persona(array['leads.ver', 'leads.crear', 'leads.editar'], 'todos');
  b := pg_temp.uc_persona(array['leads.ver', 'leads.crear', 'leads.editar'], 'todos');
  perform pg_temp.uc_como(a); set local role authenticated;
  perform public.crear_lead(v_lead, jsonb_build_object('nombre', 'UC Lucía Recordatorio', 'telefono_principal', '72841002', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  reset role;
  insert into public.recordatorios (id, usuario_id, lead_id, titulo, recordar_en, completado_en, eliminado_en) values
    (gen_random_uuid(), a, v_lead, 'UC completado', now() - interval '9 days', now() - interval '8 days', null),
    (gen_random_uuid(), a, v_lead, 'UC eliminado', now() - interval '8 days', null, now() - interval '7 days'),
    (v_sig, a, v_lead, 'UC próximo', now() + interval '2 days', null, null),
    (v_vencido, a, v_lead, 'UC vencido', now() - interval '1 day', null, null),
    (gen_random_uuid(), b, v_lead, 'UC de B', now() + interval '1 day', null, null);
  perform pg_temp.uc_como(a); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if (v.proximo_recordatorio ->> 'id')::uuid is distinct from v_vencido or v.proximo_recordatorio ->> 'titulo' <> 'UC vencido' then
    raise exception 'UC5: A debía ver primero el vencido: %', v.proximo_recordatorio;
  end if;
  reset role;
  update public.recordatorios set completado_en = now() where id = v_vencido;
  perform pg_temp.uc_como(a); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if (v.proximo_recordatorio ->> 'id')::uuid is distinct from v_sig then raise exception 'UC5: completado el vencido, seguía el próximo: %', v.proximo_recordatorio; end if;
  if v.proximo_recordatorio ->> 'recordar_en' is null then raise exception 'UC5: falta la hora'; end if;
  reset role;
  perform pg_temp.uc_como(b); set local role authenticated;
  select * into v from public.leads_vista where id = v_lead;
  if v.proximo_recordatorio ->> 'titulo' <> 'UC de B' then raise exception 'UC5: B debía ver el suyo y no el de A: %', v.proximo_recordatorio; end if;
  reset role;
end $$;
rollback;

-- @test último contacto: el catálogo lleva los tipos de seguimiento, también los apagados (UC7)
begin;
do $$
declare v_apagado uuid; c jsonb;
begin
  perform pg_temp.uc_persona(array['leads.ver']);
  update public.tipos_seguimiento set activo = false where id = (select id from public.tipos_seguimiento order by orden, id limit 1) returning id into v_apagado;
  perform pg_temp.uc_como(pg_temp.uc_persona(array['leads.ver']));
  set local role authenticated;
  c := public.leads_catalogos();
  reset role;
  if jsonb_array_length(c -> 'tipos_de_seguimiento') <> (select count(*) from public.tipos_seguimiento) then raise exception 'UC7: no están todos los tipos'; end if;
  if not exists (select 1 from jsonb_array_elements(c -> 'tipos_de_seguimiento') t where (t ->> 'id')::uuid = v_apagado and (t ->> 'activo')::boolean = false) then
    raise exception 'UC7: falta el tipo apagado';
  end if;
  if exists (select 1 from jsonb_array_elements(c -> 'tipos_de_seguimiento') t where not (t ?& array['id', 'nombre', 'icono', 'activo'])) then raise exception 'UC7: forma inesperada'; end if;
end $$;
rollback;
