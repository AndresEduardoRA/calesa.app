-- La oportunidad base (C3): todo lead nuevo nace con su oportunidad, abierta, en la etapa inicial del embudo por defecto de quien lo crea y con el
-- nombre del lead de título, en la misma transacción del alta. No depende de otro archivo (`SOLO=areas/leads/oportunidad-base.sql`).
--
-- Qué asegura:
--   OB1. `crear_lead` deja una oportunidad abierta del creador, en la etapa inicial de su embudo por defecto, titulada con el nombre.
--   OB2. Repetir el mismo intento no suma otra.
--   OB3. `_lead_oportunidad_base` es privada (sólo service_role).
--   OB4. El primer lead de alguien sin embudos le crea el embudo por defecto, con sus etapas de fábrica.
--   OB5. La importación crea una base por fila, en la moneda base, con su actividad y su historial; reenviar un lote no duplica.
--   OB6. Deshacer la importación: la base intacta no frena; movida o con una segunda oportunidad, sí («oportunidades»).
--   OB7. Un lead adoptado del limbo no es nuevo: quien lo adopta no recibe una base.

create or replace function pg_temp.ob_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ob_' || substr(v_id::text, 1, 8), 'OB ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'propios');
  end loop;
  return v_id;
end $f$;

-- @test oportunidad base: el alta deja una oportunidad abierta en la etapa inicial del embudo por defecto, y repetir no suma (OB1, OB2)
begin;
do $$
declare q uuid; v_lead uuid := gen_random_uuid(); r jsonb; n int; o public.oportunidades;
begin
  perform pg_temp.ob_persona(array['leads.ver']);   -- con `SOLO=`, la primera cuenta nace dueña
  q := pg_temp.ob_persona(array['leads.ver', 'leads.crear', 'leads.editar']);
  perform set_config('request.jwt.claim.sub', q::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  r := public.crear_lead(v_lead, jsonb_build_object('nombre', 'OB Lucía Base', 'telefono_principal', '72831001', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  r := public.crear_lead(v_lead, jsonb_build_object('nombre', 'OB Lucía Base', 'telefono_principal', '72831001', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  reset role;
  select count(*) into n from public.oportunidades x where x.lead_id = v_lead;
  if n <> 1 then raise exception 'OB1/OB2: debía haber una oportunidad y hay %', n; end if;
  select * into o from public.oportunidades x where x.lead_id = v_lead;
  if o.usuario_id <> q or o.estado <> 'abierta' or o.titulo <> 'OB Lucía Base' then
    raise exception 'OB1: la oportunidad no es la esperada: %', to_jsonb(o);
  end if;
  if o.embudo_id is distinct from public._embudo_defecto_de(q)
     or not exists (select 1 from public.embudos_etapas s where s.id = o.etapa_id and s.es_inicial) then
    raise exception 'OB1: no está en la etapa inicial del embudo por defecto';
  end if;
end $$;
rollback;

-- @test oportunidad base: la función es privada (OB3)
begin;
do $$
begin
  if has_function_privilege('authenticated', 'public._lead_oportunidad_base(uuid, uuid, text)', 'execute') then
    raise exception 'OB3: _lead_oportunidad_base no es privada';
  end if;
end $$;
rollback;

-- @test oportunidad base: el primer lead crea el embudo por defecto (OB4)
begin;
do $$
declare q uuid;
begin
  perform pg_temp.ob_persona(array['leads.ver']);
  q := pg_temp.ob_persona(array['leads.ver', 'leads.crear']);
  if exists (select 1 from public.embudos e where e.usuario_id = q) then raise exception 'OB4: la persona nueva ya tenía embudo'; end if;
  perform set_config('request.jwt.claim.sub', q::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'OB Primero', 'telefono_principal', '72831101', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')));
  reset role;
  if (select count(*) from public.embudos e where e.usuario_id = q and e.es_default) <> 1 then raise exception 'OB4: no nació el embudo por defecto'; end if;
  if (select count(*) from public.embudos_etapas s join public.embudos e on e.id = s.embudo_id where e.usuario_id = q) <> 6 then
    raise exception 'OB4: el embudo no tiene las seis etapas de fábrica'; end if;
end $$;
rollback;

-- @test oportunidad base: la importación crea una por fila y reenviar no duplica; deshacer no cuenta la intacta (OB5, OB6)
begin;
do $$
declare
  q uuid; v_imp uuid := gen_random_uuid(); v_web uuid := (select id from public.origenes_lead where clave = 'web');
  f1 uuid := gen_random_uuid(); f2 uuid := gen_random_uuid(); f3 uuid := gen_random_uuid(); v_lote jsonb; r jsonb; n int;
begin
  perform pg_temp.ob_persona(array['leads.ver']);
  q := pg_temp.ob_persona(array['leads.ver', 'leads.crear', 'leads.editar']);
  perform set_config('request.jwt.claim.sub', q::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  v_lote := jsonb_build_array(
    jsonb_build_object('id', f1, 'fila', 1, 'lead', jsonb_build_object('nombre', 'OB Importado 1', 'telefono_principal', '72831201', 'origen_lead_id', v_web)),
    jsonb_build_object('id', f2, 'fila', 2, 'lead', jsonb_build_object('nombre', 'OB Importado 2', 'telefono_principal', '72831202', 'origen_lead_id', v_web)));
  set local role authenticated;
  perform public.leads_importar_lote(v_imp, 3, v_lote);
  perform public.leads_importar_lote(v_imp, 3, v_lote);   -- el mismo lote otra vez (un reintento de la red)
  perform public.leads_importar_lote(v_imp, 3, jsonb_build_array(
    jsonb_build_object('id', f3, 'fila', 3, 'lead', jsonb_build_object('nombre', 'OB Importado 3', 'telefono_principal', '72831203', 'origen_lead_id', v_web))));
  reset role;
  select count(*) into n from public.oportunidades o where o.lead_id in (f1, f2, f3);
  if n <> 3 then raise exception 'OB5: debía haber una base por fila (3) y hay %', n; end if;
  if exists (select 1 from public.oportunidades o where o.lead_id in (f1, f2, f3)
              and (o.usuario_id <> q or o.moneda is distinct from (select a.moneda_base from public.ajustes_empresa a where a.id = 1))) then
    raise exception 'OB5: una base no es de quien importó o no está en la moneda base'; end if;
  if (select count(*) from public.actividad x join public.oportunidades o on o.id::text = x.registro_id
       where x.accion = 'oportunidad.creada' and (x.detalle ->> 'base')::boolean and o.lead_id in (f1, f2, f3)) <> 3 then
    raise exception 'OB5: falta la actividad de alguna base'; end if;
  if (select count(distinct h.oportunidad_id) from public.oportunidades_historial h join public.oportunidades o on o.id = h.oportunidad_id
       where o.lead_id in (f1, f2, f3)) <> 3 then
    raise exception 'OB5: falta el historial de alguna base'; end if;
  -- La regla de deshacer, una por una: intacta no frena; movida o con otra oportunidad, sí.
  if public._lead_motivo_para_deshacer(f1, q) is not null then raise exception 'OB6: la base intacta frenó: %', public._lead_motivo_para_deshacer(f1, q); end if;
  update public.oportunidades o set actualizado_en = o.actualizado_en + interval '1 second' where o.lead_id = f2;
  if public._lead_motivo_para_deshacer(f2, q) is distinct from 'oportunidades' then raise exception 'OB6: la base tocada no frenó'; end if;
  set local role authenticated;
  perform public.oportunidad_crear(gen_random_uuid(), f3, '{"titulo": "OB segunda"}');
  reset role;
  if public._lead_motivo_para_deshacer(f3, q) is distinct from 'oportunidades' then raise exception 'OB6: la segunda oportunidad no frenó'; end if;
  set local role authenticated;
  r := public.leads_importacion_deshacer(v_imp);
  reset role;
  if (r ->> 'movidos')::int <> 1 or r -> 'quedaron' <> '[{"filas": [2, 3], "motivo": "oportunidades", "cantidad": 2}]'::jsonb then
    raise exception 'OB6: deshacer: %', r; end if;
end $$;
rollback;

-- @test oportunidad base: quien adopta un lead del limbo no recibe una base (OB7)
begin;
do $$
declare q uuid; w uuid; v_lead uuid := gen_random_uuid(); v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb;
begin
  perform pg_temp.ob_persona(array['leads.ver']);
  q := pg_temp.ob_persona(array['leads.ver', 'leads.crear']);
  w := pg_temp.ob_persona(array['leads.ver', 'leads.crear']);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', q::text, true);
  set local role authenticated;
  perform public.crear_lead(v_lead, jsonb_build_object('nombre', 'OB Limbo', 'telefono_principal', '72831301', 'origen_lead_id', v_web));
  reset role;
  update public.leads_asesores set revocado_en = now() where lead_id = v_lead and revocado_en is null;   -- queda en el limbo
  perform set_config('request.jwt.claim.sub', w::text, true);
  set local role authenticated;
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'OB Limbo otra vez', 'telefono_principal', '72831301', 'origen_lead_id', v_web, 'adoptar', true));
  reset role;
  if not exists (select 1 from public.leads_asesores a where a.lead_id = v_lead and a.usuario_id = w and a.revocado_en is null) then
    raise exception 'OB7: no lo adoptó: %', r; end if;
  if exists (select 1 from public.oportunidades o where o.lead_id = v_lead and o.usuario_id = w) then
    raise exception 'OB7: quien adoptó recibió una base'; end if;
end $$;
rollback;
