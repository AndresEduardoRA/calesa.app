-- @test matriz de leads: personas, roles y leads de prueba
-- Matriz de leads (Fase 3, parte 6a): cada RPC que recibe un lead, por cada persona, con un lead propio,
-- uno ajeno, uno en el limbo, uno en la papelera y un id que no existe. Corre después de `humo.sql`
-- (usa su base: la dueña 01, el origen «web» y un vehículo vivo). Cada celda corre en su subtransacción
-- y se deshace: las celdas no se pisan entre sí.
--
-- Personas (0050 a 0059):
--   0050 dueño de LP, asesor «propios»      0051 compartido en LP, asesor «propios»
--   0052 supervisión «todos» sin cartera    0053 asesor «propios» ajeno: dueño de LA
--   0054 sólo ve (leads.ver «todos»)        0055 dada de baja        0056 bloqueado
--   0057 destino válido (asesor «propios»)  0058 supervisión «todos» compartida en LP
--   0059 sin rol
-- Leads: LP (de 0050, compartido con 0051 y 0058), LA (de 0053), LL (limbo) y LT (papelera).
--
-- Una RPC nueva que recibe un lead entra a la matriz con su fila: el cinturón de
-- `auditoria-leads.sql` falla si no está auditada.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000050', 'matriz-duena@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000051', 'matriz-compartido@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000052', 'matriz-supervision@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000053', 'matriz-ajeno@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000054', 'matriz-lectura@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000055', 'matriz-baja@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000056', 'matriz-bloqueado@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000057', 'matriz-destino@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000058', 'matriz-supervision-2@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000059', 'matriz-sin-rol@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ declare r_p uuid; r_t uuid; r_v uuid; c text; begin
  r_p := public.rbac_crear_rol('humo_matriz_propios', 'Matriz propios');
  r_t := public.rbac_crear_rol('humo_matriz_todos', 'Matriz todos');
  r_v := public.rbac_crear_rol('humo_matriz_ver', 'Matriz sólo ver');
  foreach c in array array['leads.ver', 'leads.editar', 'leads.compartir', 'leads.transferir', 'leads.eliminar', 'leads.portal.gestionar'] loop
    perform public.rbac_otorgar(r_p, c, (select actualizado_en from public.roles where id = r_p), p_alcance => 'propios');
    perform public.rbac_otorgar(r_t, c, (select actualizado_en from public.roles where id = r_t), p_alcance => 'todos');
  end loop;
  perform public.rbac_otorgar(r_p, 'leads.crear', (select actualizado_en from public.roles where id = r_p));
  perform public.rbac_otorgar(r_t, 'leads.crear', (select actualizado_en from public.roles where id = r_t));
  perform public.rbac_otorgar(r_t, 'leads.papelera.purgar', (select actualizado_en from public.roles where id = r_t));
  perform public.rbac_otorgar(r_v, 'leads.ver', (select actualizado_en from public.roles where id = r_v), p_alcance => 'todos');
  foreach c in array array['vehiculos.ver', 'vehiculos.editar'] loop
    perform public.rbac_otorgar(r_p, c, (select actualizado_en from public.roles where id = r_p), p_alcance => 'todos');
    perform public.rbac_otorgar(r_t, c, (select actualizado_en from public.roles where id = r_t), p_alcance => 'todos');
    perform public.rbac_otorgar(r_v, c, (select actualizado_en from public.roles where id = r_v), p_alcance => 'todos');
  end loop;
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000050', r_p, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000051', r_p, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000052', r_t, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000053', r_p, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000054', r_v, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000055', r_p, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000056', r_p, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000057', r_p, true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-000000000058', r_t, true);
end $$;
reset role;
-- La baja y el bloqueo, como los deja el equipo.
update public.perfiles set activo = false, baja_en = now() where id = '00000000-0000-0000-0000-000000000055';
update public.perfiles set bloqueado = true where id = '00000000-0000-0000-0000-000000000056';
update public.perfiles set nombre = n.nombre from (values
  ('00000000-0000-0000-0000-000000000050'::uuid, 'Dueño Matriz'), ('00000000-0000-0000-0000-000000000051', 'Compartido Matriz'),
  ('00000000-0000-0000-0000-000000000052', 'Supervisión Matriz'), ('00000000-0000-0000-0000-000000000053', 'Ajeno Matriz'),
  ('00000000-0000-0000-0000-000000000057', 'Destino Matriz'), ('00000000-0000-0000-0000-000000000058', 'Supervisión Dos')) n (id, nombre)
where perfiles.id = n.id;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000050', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; n text; t text; begin
  for n, t in select * from (values ('Matriz LP', '78000001'), ('Matriz LL', '78000002'), ('Matriz LT', '78000003')) x (n, t) loop
    r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', n, 'telefono_principal', t, 'origen_lead_id', v_web));
    if r ->> 'resultado' <> 'creado' then raise exception 'alta %: %', n, r; end if;
  end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000053', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Matriz LA', 'telefono_principal', '78000004', 'origen_lead_id', v_web));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta LA: %', r; end if;
end $$;
reset role;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
select l.id, u.id, 'compartido', '00000000-0000-0000-0000-000000000050'
from public.leads l cross join (values ('00000000-0000-0000-0000-000000000051'::uuid), ('00000000-0000-0000-0000-000000000058')) u (id)
where l.nombre = 'Matriz LP';
update public.leads_asesores set revocado_en = now() where lead_id = (select id from public.leads where nombre = 'Matriz LL');
-- LT está en la papelera, en un lote que envió 0050.
do $$ declare v_lote uuid := gen_random_uuid(); begin
  insert into public.lotes_papelera (id, tipo, creado_por, resumen)
  values (v_lote, 'leads', '00000000-0000-0000-0000-000000000050', '{"cantidad": 1, "restaurados": 0, "purgados": 0}');
  update public.leads set eliminado_en = now(), eliminado_por = '00000000-0000-0000-0000-000000000050', lote_papelera_id = v_lote
  where nombre = 'Matriz LT';
  perform set_config('matriz.lote', v_lote::text, false);
end $$;
select set_config('matriz.lp', (select id::text from public.leads where nombre = 'Matriz LP'), false);
select set_config('matriz.la', (select id::text from public.leads where nombre = 'Matriz LA'), false);
select set_config('matriz.ll', (select id::text from public.leads where nombre = 'Matriz LL'), false);
select set_config('matriz.lt', (select id::text from public.leads where nombre = 'Matriz LT'), false);
select set_config('request.jwt.claim.sub', '', false);

-- La celda: corre una sentencia como una persona y devuelve cómo terminó. Todo lo que hizo se deshace.
-- @test matriz de leads: la celda
create or replace function pg_temp.celda(p_persona text, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  begin
    perform set_config('request.jwt.claim.sub', p_persona, true);
    set local role authenticated;
    begin
      execute p_sql;
      v := 'ok';
    exception when others then
      v := sqlstate || ': ' || sqlerrm;
    end;
    raise exception 'deshacer' using errcode = 'P0999';
  exception when sqlstate 'P0999' then
    null;
  end;
  return v;
end $$;

-- @test matriz de leads: cada RPC por cada persona y cada estado del lead
do $$ declare
  v_nada constant text := '42501: No encontramos este lead o no tienes acceso.';
  v_cuenta constant text := '42501: Tu cuenta está bloqueada o dada de baja.';
  v_nulo constant text := 'P0002: nulo';
  v_lp uuid := current_setting('matriz.lp')::uuid;
  v_la uuid := current_setting('matriz.la')::uuid;
  v_ll uuid := current_setting('matriz.ll')::uuid;
  v_lt uuid := current_setting('matriz.lt')::uuid;
  v_x uuid := gen_random_uuid();
  v_veh uuid := (select id from public.vehiculos where eliminado_en is null and lead_id is null order by numero limit 1);
  v_tipo uuid := (select id from public.tipos_seguimiento order by orden limit 1);
  v_personas constant text[] := array[
    '00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000055',
    '00000000-0000-0000-0000-000000000056'];
  v_nombres constant text[] := array['dueño', 'compartido', 'supervisión', 'ajeno', 'sólo ve', 'baja', 'bloqueado'];
  v_tipos constant text[] := array['propio', 'ajeno', 'limbo', 'papelera', 'inexistente'];
  r record; p int; k int; v_lead uuid; v_sql text; v_esp text; v_real text; v_tok text;
  v_fallas text := ''; v_n int := 0; v_mal int := 0; v_filas int := 0;
begin
  if v_veh is null then raise exception 'la matriz necesita un vehículo vivo sin vínculo'; end if;
  create temp table if not exists matriz_cubiertas (rpc text primary key);
  for r in select * from (values
    -- Clase 1: contenido y datos privados (cartera + permiso)
    ('lead_guardar', $q$select public.lead_guardar({lead}, (select actualizado_en from public.leads where id = {lead}), '{"nombre": "Matriz"}')$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('cambiar_telefono_lead', $q$select public.cambiar_telefono_lead({lead}, (select actualizado_en from public.leads where id = {lead}), '', '78999901')$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('verificar_telefono_de_lead', $q$select public.verificar_telefono_de_lead({lead}, '', '78999902')$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('lead_telefono_guardar', $q$select public.lead_telefono_guardar({lead}, gen_random_uuid(), '', '78999903', null)$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('lead_telefono_quitar', $q$select public.lead_telefono_quitar({lead}, gen_random_uuid())$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('otorgar_portal', $q$select public.otorgar_portal({lead}, 'clave-de-matriz-1')$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('revocar_portal', $q$select public.revocar_portal({lead})$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('recordatorio_crear', $q$select public.recordatorio_crear(gen_random_uuid(), {lead}, 'Llamar', now() + interval '1 day')$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('seguimiento_crear', $q$select public.seguimiento_crear(gen_random_uuid(), {lead}, jsonb_build_object('tipo_id', '{tipo}'::uuid, 'titulo', 'Matriz'))$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('vehiculo_vincular', $q$select public.vehiculo_vincular({veh}, (select actualizado_en from public.vehiculos where id = {veh}), {lead})$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('vehiculo_interesado_marcar', $q$select public.vehiculo_interesado_marcar({veh}, {lead}, null)$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('vehiculo_interesado_quitar', $q$select public.vehiculo_interesado_quitar({veh}, {lead})$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    ('oportunidad_crear', $q$select public.oportunidad_crear(gen_random_uuid(), {lead}, '{"titulo": "Matriz"}')$q$, 'ok', 'ok', 'nada', 'ok', 'nada', 'nada', 'nada', 'cuenta'),
    -- Clase 2: quién tiene el lead (el dueño; la supervisión con «todos»)
    ('lead_compartir', $q$select public.lead_compartir({lead}, '00000000-0000-0000-0000-000000000057')$q$, 'ok',
      '42501: Sólo quien es dueño del lead lo comparte.', 'ok', 'ok', '42501: No tienes permiso para compartir este lead.', 'nada', 'nada', 'cuenta'),
    ('lead_transferir', $q$select public.lead_transferir({lead}, '00000000-0000-0000-0000-000000000057', (select a.usuario_id from public.leads_asesores a where a.lead_id = {lead} and a.tipo_acceso = 'dueno' and a.revocado_en is null))$q$, 'ok',
      '42501: Sólo quien es dueño del lead lo transfiere.', 'ok', 'ok', '42501: No tienes permiso para transferir este lead.', 'nada', 'nada', 'cuenta'),
    ('lead_revocar_acceso', $q$select public.lead_revocar_acceso({lead}, '00000000-0000-0000-0000-000000000051')$q$, 'ok',
      '23514: Para dejar este lead usa «Salir de este lead».', 'ok', 'ok', '42501: No tienes permiso para quitar el acceso a este lead.', 'nada', 'nada', 'cuenta'),
    ('lead_salir', $q$select public.lead_salir({lead})$q$, '23514: Eres quien tiene este lead: transfiérelo para dejarlo.', 'ok', 'nada',
      '23514: Eres quien tiene este lead: transfiérelo para dejarlo.', 'nada', 'nada', 'nada', 'cuenta'),
    -- Clase 3: papelera
    ('leads_papelera_enviar', $q$select public.leads_papelera_enviar(gen_random_uuid(), array[{lead}])$q$, 'ok',
      '42501: Sólo quien es dueño de un lead lo envía a la papelera.', 'ok', 'ok', '42501: No tienes permiso para enviar leads a la papelera.', 'nada',
      '42501: No tienes permiso para enviar leads a la papelera.', 'cuenta'),
    -- Lecturas: ver alcanza y la base recorta (el lead nulo es «no se ve»)
    ('lead_cartera', $q$do $x$ begin if public.lead_cartera({lead}) is null then raise exception 'nulo' using errcode = 'P0002'; end if; end $x$ $q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nulo', 'nulo', 'nulo'),
    ('lead_ficha', $q$do $x$ begin if public.lead_ficha({lead}) is null then raise exception 'nulo' using errcode = 'P0002'; end if; end $x$ $q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nulo', 'nulo', 'nulo'),
    ('telefono_lead', $q$do $x$ begin if public.telefono_lead({lead}) is null then raise exception 'nulo' using errcode = 'P0002'; end if; end $x$ $q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nulo', 'nulo', 'nulo'),
    ('atributos_lead', $q$do $x$ begin if public.atributos_lead({lead}) is null then raise exception 'nulo' using errcode = 'P0002'; end if; end $x$ $q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nulo', 'nulo', 'nulo'),
    ('lead_vehiculos', $q$do $x$ begin if not (public.lead_vehiculos({lead}) ->> 'puedo_actuar')::boolean then raise exception 'nulo' using errcode = 'P0002'; end if; end $x$ $q$, 'ok', 'ok', 'nulo', 'ok', 'nulo', 'nulo', 'nulo', 'nulo'),
    ('vehiculos_para_lead', $q$do $x$ begin if public.vehiculos_para_lead({lead}, null) = '[]'::jsonb then raise exception 'nulo' using errcode = 'P0002'; end if; end $x$ $q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nulo', 'nulo', 'nulo'),
    -- Las marcas de quien mira: ver alcanza
    ('lead_favorito_poner', $q$select public.lead_favorito_poner({lead}, true)$q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nada', 'nada', 'cuenta'),
    ('lead_tachado_poner', $q$select public.lead_tachado_poner({lead}, true)$q$, 'ok', 'ok', 'ok', 'ok', 'ok', 'nada', 'nada', 'cuenta')
  ) t (rpc, plantilla, a50, a51, a52, a53, a54, inv, inv54, baja)
  loop
    v_filas := v_filas + 1;
    insert into matriz_cubiertas values (r.rpc) on conflict do nothing;
    for p in 1..7 loop
      for k in 1..5 loop
        -- Qué lead es cada cosa para esta persona. «Propio» es el que tiene en su cartera (la
        -- supervisión y quien sólo ve no tienen ninguno: para ellas es uno que ven).
        v_lead := case k
          when 1 then case when p = 4 then v_la else v_lp end
          when 2 then case when p = 4 then v_lp else v_la end
          when 3 then v_ll when 4 then v_lt else v_x end;
        v_tok := case
          when p >= 6 then r.baja
          when k = 1 then (array[r.a50, r.a51, r.a52, r.a53, r.a54])[p]
          when k = 2 then case when p = 3 then r.a52 when p = 5 then r.a54 else r.inv end
          else case when p = 5 then r.inv54 else r.inv end end;
        v_esp := case v_tok when 'ok' then 'ok' when 'nada' then v_nada when 'cuenta' then v_cuenta when 'nulo' then v_nulo else v_tok end;
        v_sql := replace(replace(replace(replace(r.plantilla, '{lead}', quote_literal(v_lead::text) || '::uuid'),
                 '{veh}', quote_literal(v_veh::text) || '::uuid'), '{tipo}', v_tipo::text), '{x}', v_x::text);
        v_real := pg_temp.celda(v_personas[p], v_sql);
        v_n := v_n + 1;
        if v_real is distinct from v_esp then
          v_mal := v_mal + 1;
          if v_mal <= 12 then
            v_fallas := v_fallas || format(E'\n  %s · %s · %s: esperaba «%s» y fue «%s»', r.rpc, v_nombres[p], v_tipos[k], v_esp, v_real);
          end if;
        end if;
      end loop;
    end loop;
  end loop;
  if v_filas < 20 or v_n < 700 then raise exception 'la matriz se achicó: % filas, % celdas', v_filas, v_n; end if;
  if v_mal > 0 then raise exception '% de % celdas no dieron lo esperado:%', v_mal, v_n, v_fallas; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test matriz de leads: restaurar y purgar un lote de la papelera, por cada persona
do $$ declare
  v_lote uuid := current_setting('matriz.lote')::uuid;
  v_cuenta constant text := '42501: Tu cuenta está bloqueada o dada de baja.';
  v_resta constant text := '42501: Sólo lo restaura quien lo envió o quien puede vaciar la papelera.';
  v_purga constant text := '42501: No tienes permiso para purgar la papelera de leads.';
  v_personas constant text[] := array[
    '00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000055',
    '00000000-0000-0000-0000-000000000056'];
  v_nombres constant text[] := array['dueño', 'compartido', 'supervisión', 'ajeno', 'sólo ve', 'baja', 'bloqueado'];
  v_restaurar constant text[] := array['ok', v_resta, 'ok', v_resta, v_resta, v_cuenta, v_cuenta];
  v_purgar constant text[] := array[v_purga, v_purga, 'ok', v_purga, v_purga, v_cuenta, v_cuenta];
  p int; v_real text; v_fallas text := '';
begin
  -- Cada bloque la crea si falta: si uno anterior falló, su tabla se deshizo con él y éste igual corre.
  create temp table if not exists matriz_cubiertas (rpc text primary key);
  insert into matriz_cubiertas values ('leads_papelera_restaurar'), ('leads_papelera_purgar') on conflict do nothing;
  for p in 1..7 loop
    v_real := pg_temp.celda(v_personas[p], format(
      'select public.leads_papelera_restaurar(%L::uuid, (select actualizado_en from public.lotes_papelera where id = %L::uuid), null)', v_lote, v_lote));
    if v_real is distinct from v_restaurar[p] then
      v_fallas := v_fallas || format(E'\n  restaurar · %s: esperaba «%s» y fue «%s»', v_nombres[p], v_restaurar[p], v_real);
    end if;
    v_real := pg_temp.celda(v_personas[p], format(
      'select public.leads_papelera_purgar(%L::uuid, (select actualizado_en from public.lotes_papelera where id = %L::uuid), null)', v_lote, v_lote));
    if v_real is distinct from v_purgar[p] then
      v_fallas := v_fallas || format(E'\n  purgar · %s: esperaba «%s» y fue «%s»', v_nombres[p], v_purgar[p], v_real);
    end if;
  end loop;
  -- Un lote que no existe da lo mismo a quien sea.
  for p in 1..5 loop
    v_real := pg_temp.celda(v_personas[p], format('select public.leads_papelera_restaurar(%L::uuid, now(), null)', gen_random_uuid()));
    if v_real <> '40001' and v_real <> 'PT409: Ese lote ya no está en la papelera.' then
      v_fallas := v_fallas || format(E'\n  restaurar un lote inexistente · %s: «%s»', v_nombres[p], v_real);
    end if;
  end loop;
  if v_fallas <> '' then raise exception 'La matriz de la papelera no cierra:%', v_fallas; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test matriz de oportunidades y embudos: cada RPC por cada persona y cada estado
-- Las RPC de oportunidades reciben el id de la oportunidad, no el lead: la oportunidad es «mía» (sobre
-- un lead que tengo), de otra persona (sobre un lead que también tengo), mía sobre un lead que perdí
-- (en el limbo), mía sobre un lead en la papelera, o inexistente. Las de embudos: mío, ajeno, inexistente.
-- Ocho personas: las siete de la matriz de leads y la sin rol (0059).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000050', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.oportunidad_crear(gen_random_uuid(), current_setting('matriz.lp')::uuid, '{"titulo": "Matriz OP"}');
  perform set_config('matriz.op', r -> 'oportunidad' ->> 'id', false);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000051', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.oportunidad_crear(gen_random_uuid(), current_setting('matriz.lp')::uuid, '{"titulo": "Matriz OC"}');
  perform set_config('matriz.oc', r -> 'oportunidad' ->> 'id', false);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000053', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.oportunidad_crear(gen_random_uuid(), current_setting('matriz.la')::uuid, '{"titulo": "Matriz OA"}');
  perform set_config('matriz.oa', r -> 'oportunidad' ->> 'id', false);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
-- Las de 0050 sobre el lead que perdió (limbo) y sobre el de la papelera: como quedan después.
do $$ declare v_emb uuid := public._embudo_defecto_de('00000000-0000-0000-0000-000000000050'); v_et uuid; v_id uuid; begin
  select id into v_et from public.embudos_etapas where embudo_id = v_emb and es_inicial;
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda)
  values (current_setting('matriz.ll')::uuid, '00000000-0000-0000-0000-000000000050', v_emb, v_et, 'Matriz OL', 'USD') returning id into v_id;
  perform set_config('matriz.ol', v_id::text, false);
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda)
  values (current_setting('matriz.lt')::uuid, '00000000-0000-0000-0000-000000000050', v_emb, v_et, 'Matriz OT', 'USD') returning id into v_id;
  perform set_config('matriz.ot', v_id::text, false);
  -- Un segundo embudo (vacío, no el de por defecto) de cada persona que usa embudos.
  for v_id in select unnest(array['00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000051',
      '00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054']::uuid[]) loop
    perform public._embudo_defecto_de(v_id);
    perform public._embudo_insertar(v_id, null, 'Matriz B', false, jsonb_build_array(
      jsonb_build_object('nombre', 'Nueva', 'color', 'gris', 'es_inicial', true),
      jsonb_build_object('nombre', 'Ganada', 'color', 'verde', 'es_ganada', true),
      jsonb_build_object('nombre', 'Perdida', 'color', 'rojo', 'es_perdida', true)));
  end loop;
end $$;

do $$ declare
  v_nada constant text := '42501: No encontramos esta oportunidad o no tienes acceso.';
  v_sin_embudo constant text := '42501: No encontramos este embudo. Recarga para ver los tuyos.';
  v_cuenta constant text := '42501: Tu cuenta está bloqueada o dada de baja.';
  v_sin_ver constant text := '42501: No tienes permiso para ver leads.';
  v_op uuid := current_setting('matriz.op')::uuid;  v_oc uuid := current_setting('matriz.oc')::uuid;
  v_oa uuid := current_setting('matriz.oa')::uuid;  v_ol uuid := current_setting('matriz.ol')::uuid;
  v_ot uuid := current_setting('matriz.ot')::uuid;  v_x uuid := gen_random_uuid();
  v_personas constant text[] := array[
    '00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000055',
    '00000000-0000-0000-0000-000000000056', '00000000-0000-0000-0000-000000000059'];
  v_nombres constant text[] := array['dueño', 'compartido', 'supervisión', 'ajeno', 'sólo ve', 'baja', 'bloqueado', 'sin rol'];
  v_tipos constant text[] := array['mía', 'de otra persona', 'lead perdido', 'lead en papelera', 'inexistente'];
  v_tipos_e constant text[] := array['mío', 'ajeno', 'inexistente'];
  -- Lo que da «mía» a cada persona (las demás celdas son «nada», o «cuenta» para baja y bloqueado).
  v_mia constant text[] := array['ok', 'ok', 'nada', 'ok', 'nada', 'cuenta', 'cuenta', 'nada'];
  r record; p int; k int; v_obj uuid; v_sql text; v_esp text; v_real text; v_tok text;
  v_fallas text := ''; v_n int := 0; v_mal int := 0;
begin
  create temp table if not exists matriz_cubiertas (rpc text primary key);
  for r in select * from (values
    ('oportunidad_guardar', $q$select public.oportunidad_guardar({o}, coalesce((select actualizado_en from public.oportunidades where id = {o}), now()), '{"titulo": "Matriz 2"}')$q$),
    ('oportunidad_mover', $q$select public.oportunidad_mover({o}, (select etapa_id from public.oportunidades where id = {o}), (select s.id from public.embudos_etapas s join public.oportunidades o on o.embudo_id = s.embudo_id where o.id = {o} and s.es_ganada limit 1), null)$q$),
    ('oportunidad_eliminar', $q$select public.oportunidad_eliminar({o}, coalesce((select actualizado_en from public.oportunidades where id = {o}), now()))$q$),
    ('oportunidad_restaurar', $q$select public.oportunidad_restaurar({o}, (public.oportunidad_eliminar({o}, coalesce((select actualizado_en from public.oportunidades where id = {o}), now())) -> 'oportunidad' ->> 'actualizado_en')::timestamptz)$q$)
  ) t (rpc, plantilla)
  loop
    insert into matriz_cubiertas values (r.rpc) on conflict do nothing;
    for p in 1..8 loop
      for k in 1..5 loop
        v_obj := case k
          when 1 then case p when 2 then v_oc when 4 then v_oa else v_op end
          when 2 then case p when 1 then v_oc else v_op end
          when 3 then v_ol when 4 then v_ot else v_x end;
        v_tok := case when p in (6, 7) then 'cuenta' when k = 1 then v_mia[p] else 'nada' end;
        v_esp := case v_tok when 'ok' then 'ok' when 'nada' then v_nada when 'cuenta' then v_cuenta end;
        v_sql := replace(r.plantilla, '{o}', quote_literal(v_obj::text) || '::uuid');
        v_real := pg_temp.celda(v_personas[p], v_sql);
        v_n := v_n + 1;
        if v_real is distinct from v_esp then
          v_mal := v_mal + 1;
          if v_mal <= 12 then
            v_fallas := v_fallas || format(E'\n  %s · %s · %s: esperaba «%s» y fue «%s»', r.rpc, v_nombres[p], v_tipos[k], v_esp, v_real);
          end if;
        end if;
      end loop;
    end loop;
  end loop;

  -- Embudos: de quien mira. Sin argumento, ver leads alcanza; con uno, mío o «no lo encontramos»
  -- (eliminar uno que no es mío es `sin_cambios`, como una etiqueta).
  for r in select * from (values
    ('embudo_por_defecto', $q$select public.embudo_por_defecto()$q$, 'ok', 'ok', 'ok'),
    ('embudo_crear', $q$select public.embudo_crear(gen_random_uuid(), 'Matriz nuevo')$q$, 'ok', 'ok', 'ok'),
    ('embudo_guardar', $q$select public.embudo_guardar({e}, coalesce((select actualizado_en from public.embudos where id = {e}), now()), 'Matriz renombrado')$q$, 'ok', 'embudo', 'embudo'),
    ('embudo_eliminar', $q$select public.embudo_eliminar({e}, coalesce((select actualizado_en from public.embudos where id = {e}), now()))$q$, 'ok', 'ok', 'ok'),
    ('embudo_etapas_guardar', $q$select public.embudo_etapas_guardar({e}, coalesce((select actualizado_en from public.embudos where id = {e}), now()),
       coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre || ' 2', 'color', s.color, 'es_inicial', s.es_inicial,
         'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida) order by s.orden) from public.embudos_etapas s where s.embudo_id = {e}),
         '[{"nombre": "A", "color": "gris", "es_inicial": true}, {"nombre": "B", "color": "verde", "es_ganada": true}, {"nombre": "C", "color": "rojo", "es_perdida": true}]'))$q$, 'ok', 'embudo', 'embudo')
  ) t (rpc, plantilla, e1, e2, e3)
  loop
    insert into matriz_cubiertas values (r.rpc) on conflict do nothing;
    for p in 1..8 loop
      for k in 1..3 loop
        v_obj := case k
          when 1 then (select id from public.embudos where nombre = 'Matriz B' and usuario_id = v_personas[p]::uuid)
          when 2 then (select id from public.embudos where nombre = 'Matriz B' and usuario_id =
                        case when p = 4 then '00000000-0000-0000-0000-000000000050' else '00000000-0000-0000-0000-000000000053' end::uuid)
          else v_x end;
        v_tok := case when p in (6, 7) then 'cuenta' when p = 8 then 'sin_ver'
                      when k = 1 then r.e1 when k = 2 then r.e2 else r.e3 end;
        v_esp := case v_tok when 'ok' then 'ok' when 'embudo' then v_sin_embudo when 'cuenta' then v_cuenta when 'sin_ver' then v_sin_ver end;
        v_sql := replace(r.plantilla, '{e}', coalesce(quote_literal(v_obj::text) || '::uuid', 'null::uuid'));
        v_real := pg_temp.celda(v_personas[p], v_sql);
        v_n := v_n + 1;
        if v_real is distinct from v_esp then
          v_mal := v_mal + 1;
          if v_mal <= 12 then
            v_fallas := v_fallas || format(E'\n  %s · %s · %s: esperaba «%s» y fue «%s»', r.rpc, v_nombres[p], v_tipos_e[k], v_esp, v_real);
          end if;
        end if;
      end loop;
    end loop;
  end loop;
  if v_n < 260 then raise exception 'la matriz de oportunidades se achicó: % celdas', v_n; end if;
  if v_mal > 0 then raise exception '% de % celdas no dieron lo esperado:%', v_mal, v_n, v_fallas; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);
-- Lo que sigue (los casos de cartera y papelera) parte de leads sin oportunidades.
delete from public.oportunidades where titulo like 'Matriz O_';

-- @test matriz de vínculo: personas, vehículos y leads de prueba
-- Las cuatro RPC de vínculo e interés miran dos cosas: el lead (la matriz de arriba) y el vehículo. Esta
-- tiene sus propias personas, con alcance por origen: en «oficina» ven y editan (lo propio o todo), en
-- «subasta_usa» sólo ven, y en «humo_sin_fases» nada.
--   0060 dueño de LV («propios»)       0061 compartido en LV («propios»)
--   0062 supervisión «todos»           0063 ajeno: dueño de LW («propios»)
--   0059 sin rol (de arriba)           0055 dada de baja (de arriba)
reset role;
insert into public.origenes (clave, nombre, tipo) values ('matriz_sin_permiso', 'Matriz sin permiso', 'manual');
select set_config('request.jwt.claim.sub', '', false);
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000060', 'matriz-v-duena@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000061', 'matriz-v-compartido@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000062', 'matriz-v-supervision@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000063', 'matriz-v-ajeno@ejemplo.com', '{"invitado": true}');
insert into public.roles (clave, nombre) values ('humo_matriz_v_propios', 'Matriz vínculo propios'), ('humo_matriz_v_todos', 'Matriz vínculo todos');
insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
select r.id, x.clave, o.id, x.alcance::public.alcance_permiso
from public.roles r
cross join lateral (values
  ('leads.ver', null, case when r.clave = 'humo_matriz_v_todos' then 'todos' else 'propios' end),
  ('leads.editar', null, case when r.clave = 'humo_matriz_v_todos' then 'todos' else 'propios' end),
  ('leads.crear', null, 'todos'),
  ('leads.eliminar', null, case when r.clave = 'humo_matriz_v_todos' then 'todos' else 'propios' end),
  ('leads.transferir', null, case when r.clave = 'humo_matriz_v_todos' then 'todos' else 'propios' end),
  ('vehiculos.ver', 'oficina', case when r.clave = 'humo_matriz_v_todos' then 'todos' else 'propios' end),
  ('vehiculos.editar', 'oficina', case when r.clave = 'humo_matriz_v_todos' then 'todos' else 'propios' end),
  ('vehiculos.ver', 'subasta_usa', 'todos')) as x (clave, origen, alcance)
left join public.origenes o on o.clave = x.origen
where r.clave in ('humo_matriz_v_propios', 'humo_matriz_v_todos');
insert into public.usuarios_roles (usuario_id, rol_id)
select u.id::uuid, r.id from (values
  ('00000000-0000-0000-0000-000000000060', 'humo_matriz_v_propios'), ('00000000-0000-0000-0000-000000000061', 'humo_matriz_v_propios'),
  ('00000000-0000-0000-0000-000000000062', 'humo_matriz_v_todos'), ('00000000-0000-0000-0000-000000000063', 'humo_matriz_v_propios')
) u (id, rol) join public.roles r on r.clave = u.rol;
update public.perfiles set invitacion_aceptada_en = now()
where id in ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000061',
             '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000063');
-- Un vehículo creado por cada persona en «oficina» (lo propio), uno en «subasta_usa» (lo ve y no lo
-- edita), uno en la papelera y uno en un origen donde nadie tiene permiso.
insert into public.vehiculos (origen_id, titulo, creado_por)
select o.id, x.titulo, x.creador::uuid from public.origenes o join (values
  ('oficina', 'Matriz V propio 60', '00000000-0000-0000-0000-000000000060'),
  ('oficina', 'Matriz V propio 61', '00000000-0000-0000-0000-000000000061'),
  ('oficina', 'Matriz V propio 62', '00000000-0000-0000-0000-000000000062'),
  ('oficina', 'Matriz V propio 63', '00000000-0000-0000-0000-000000000063'),
  ('subasta_usa', 'Matriz V solo ve', '00000000-0000-0000-0000-000000000060'),
  ('oficina', 'Matriz V papelera', '00000000-0000-0000-0000-000000000060'),
  ('matriz_sin_permiso', 'Matriz V sin permiso', '00000000-0000-0000-0000-000000000060')
) as x (origen, titulo, creador) on x.origen = o.clave;
update public.vehiculos set eliminado_en = now(), eliminado_por = '00000000-0000-0000-0000-000000000060' where titulo = 'Matriz V papelera';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000060', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Matriz LV', 'telefono_principal', '78000011', 'origen_lead_id', v_web));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta LV: %', r; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000063', false);
set role authenticated;
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); r jsonb; begin
  r := public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Matriz LW', 'telefono_principal', '78000012', 'origen_lead_id', v_web));
  if r ->> 'resultado' <> 'creado' then raise exception 'alta LW: %', r; end if;
end $$;
reset role;
insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
select l.id, '00000000-0000-0000-0000-000000000061', 'compartido', '00000000-0000-0000-0000-000000000060'
from public.leads l where l.nombre = 'Matriz LV';
select set_config('request.jwt.claim.sub', '', false);

-- @test matriz de vínculo: cada RPC por cada persona y cada estado del vehículo
do $$ declare
  v_veh_nada constant text := '42501: Ese vehículo no existe o no tienes acceso.';
  v_edit constant text := '42501: No tienes permiso para editar este vehículo.';
  v_nada constant text := '42501: No encontramos este lead o no tienes acceso.';
  v_cuenta constant text := '42501: Tu cuenta está bloqueada o dada de baja.';
  v_lv uuid := (select id from public.leads where nombre = 'Matriz LV');
  v_lw uuid := (select id from public.leads where nombre = 'Matriz LW');
  v_p60 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 60');
  v_p61 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 61');
  v_p62 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 62');
  v_p63 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 63');
  v_solo uuid := (select id from public.vehiculos where titulo = 'Matriz V solo ve');
  v_tacho uuid := (select id from public.vehiculos where titulo = 'Matriz V papelera');
  v_sin uuid := (select id from public.vehiculos where titulo = 'Matriz V sin permiso');
  v_personas constant text[] := array[
    '00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000062',
    '00000000-0000-0000-0000-000000000063', '00000000-0000-0000-0000-000000000059', '00000000-0000-0000-0000-000000000055'];
  v_nombres constant text[] := array['dueño', 'compartido', 'supervisión', 'ajeno', 'sin rol', 'baja'];
  v_estados constant text[] := array['propio', 'ajeno', 'sólo lo ve', 'papelera', 'sin permiso', 'inexistente'];
  r record; p int; k int; v_veh uuid; v_lead uuid; v_esp text; v_real text; v_tok text; v_fila text[];
  v_fallas text := ''; v_n int := 0; v_mal int := 0;
begin
  if v_lv is null or v_lw is null or v_p60 is null or v_sin is null then raise exception 'falta el terreno de la matriz de vínculo'; end if;
  create temp table if not exists matriz_cubiertas (rpc text primary key);
  -- Por cada RPC, lo esperado de cada persona en cada estado del vehículo (propio, ajeno, sólo lo ve,
  -- papelera, sin permiso, inexistente), con el lead de esa persona: LV (LW para el ajeno).
  -- «v» = el vehículo no se ve; «e» = se ve y no se edita; «n» = el lead no es de su cartera.
  for r in select * from (values
    ('vehiculo_vincular', $q$select public.vehiculo_vincular({veh}, coalesce((select actualizado_en from public.vehiculos where id = {veh}), now()), {lead})$q$,
      'ok v e v v v', 'ok v e v v v', 'n n e v v v', 'ok v e v v v', 'v v v v v v', 'c c c c c c'),
    ('vehiculo_vincular', $q$select public.vehiculo_vincular({veh}, coalesce((select actualizado_en from public.vehiculos where id = {veh}), now()), null)$q$,
      'ok v e v v v', 'ok v e v v v', 'ok ok e v v v', 'ok v e v v v', 'v v v v v v', 'c c c c c c'),
    ('vehiculo_interesado_marcar', $q$select public.vehiculo_interesado_marcar({veh}, {lead}, 'Matriz')$q$,
      'ok v ok v v v', 'ok v ok v v v', 'n n n v v v', 'ok v ok v v v', 'v v v v v v', 'c c c c c c'),
    ('vehiculo_interesado_quitar', $q$select public.vehiculo_interesado_quitar({veh}, {lead})$q$,
      'ok v ok v v v', 'ok v ok v v v', 'n n n v v v', 'ok v ok v v v', 'v v v v v v', 'c c c c c c')
  ) t (rpc, plantilla, e1, e2, e3, e4, e5, e6)
  loop
    insert into matriz_cubiertas values (r.rpc) on conflict do nothing;
    for p in 1..6 loop
      v_fila := string_to_array((array[r.e1, r.e2, r.e3, r.e4, r.e5, r.e6])[p], ' ');
      v_lead := case when p = 4 then v_lw else v_lv end;
      for k in 1..6 loop
        v_veh := case k
          when 1 then (array[v_p60, v_p61, v_p62, v_p63, v_p60, v_p60])[p]
          when 2 then case when p = 4 then v_p60 else v_p63 end
          when 3 then v_solo when 4 then v_tacho when 5 then v_sin else gen_random_uuid() end;
        v_tok := v_fila[k];
        v_esp := case v_tok when 'ok' then 'ok' when 'v' then v_veh_nada when 'e' then v_edit when 'n' then v_nada when 'c' then v_cuenta end;
        v_real := pg_temp.celda(v_personas[p], replace(replace(r.plantilla, '{veh}', quote_literal(v_veh::text) || '::uuid'),
                                                       '{lead}', quote_literal(v_lead::text) || '::uuid'));
        v_n := v_n + 1;
        if v_real is distinct from v_esp then
          v_mal := v_mal + 1;
          if v_mal <= 12 then
            v_fallas := v_fallas || format(E'\n  %s · %s · %s: esperaba «%s» y fue «%s»', r.rpc, v_nombres[p], v_estados[k], v_esp, v_real);
          end if;
        end if;
      end loop;
    end loop;
  end loop;
  if v_n < 144 then raise exception 'la matriz de vínculo se achicó: % celdas', v_n; end if;
  if v_mal > 0 then raise exception '% de % celdas no dieron lo esperado:%', v_mal, v_n, v_fallas; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================================
-- Los casos que no son el camino feliz (los que la matriz no dice con una fila)
-- ===========================================================================================

-- @test casos de leads: ayudantes, y quien actúa nunca se concede un lead que no es suyo
create or replace function pg_temp.como(p_persona text, p_sql text) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_persona, true);
  set local role authenticated;
  begin
    begin
      execute p_sql into v;
    exception when invalid_text_representation or cannot_coerce then
      -- No devuelve un json (un texto, o nada): se corre igual y el valor queda vacío.
      execute p_sql;
      v := null;
    end;
    reset role;
    return jsonb_build_object('ok', true, 'valor', v);
  exception when others then
    reset role;
    return jsonb_build_object('ok', false, 'estado', sqlstate, 'mensaje', sqlerrm);
  end;
end $$;

create or replace function pg_temp.espero(p_resultado jsonb, p_estado text, p_mensaje text, p_que text) returns void language plpgsql as $$
begin
  if (p_resultado ->> 'ok')::boolean then
    raise exception '% debía fallar con «%» y salió bien: %', p_que, p_mensaje, p_resultado;
  end if;
  if p_resultado ->> 'estado' <> p_estado or p_resultado ->> 'mensaje' not like p_mensaje then
    raise exception '% daba «% %» y fue «% %»', p_que, p_estado, p_mensaje, p_resultado ->> 'estado', p_resultado ->> 'mensaje';
  end if;
end $$;

do $$ declare
  lp uuid := current_setting('matriz.lp')::uuid; la uuid := current_setting('matriz.la')::uuid;
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u51 constant text := '00000000-0000-0000-0000-000000000051';
  u52 constant text := '00000000-0000-0000-0000-000000000052'; u53 constant text := '00000000-0000-0000-0000-000000000053';
  u58 constant text := '00000000-0000-0000-0000-000000000058';
  r jsonb; n int;
begin
  -- La supervisión sin cartera no se pasa ni se comparte un lead ajeno.
  r := pg_temp.como(u52, format('select public.lead_transferir(%L, %L, %L)', la, u52, u53));
  perform pg_temp.espero(r, '42501', 'No puedes transferirte un lead que no es tuyo.', 'la supervisión se transfirió un lead ajeno');
  r := pg_temp.como(u52, format('select public.lead_compartir(%L, %L)', la, u52));
  perform pg_temp.espero(r, '42501', 'No puedes darte acceso a un lead que no tienes.', 'la supervisión se compartió un lead ajeno');
  -- Un compartido con «todos» tampoco se hace dueño.
  r := pg_temp.como(u58, format('select public.lead_transferir(%L, %L, %L)', lp, u58, u50));
  perform pg_temp.espero(r, '42501', 'No puedes transferirte un lead que no es tuyo.', 'un compartido supervisor se hizo dueño');
  -- Un compartido «propios» no transfiere: no es el dueño.
  r := pg_temp.como(u51, format('select public.lead_transferir(%L, %L, %L)', lp, u51, u50));
  perform pg_temp.espero(r, '42501', 'Sólo quien es dueño del lead lo transfiere.', 'un compartido se transfirió el lead');
  -- Compartirse a sí mismo un lead que ya tiene no cambia nada.
  r := pg_temp.como(u58, format('select public.lead_compartir(%L, %L)', lp, u58));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'compartirse un lead propio: %', r; end if;
  -- Nada quedó distinto.
  select count(*) into n from public.leads_asesores where lead_id = la and revocado_en is null;
  if n <> 1 or exists (select 1 from public.leads_asesores where lead_id = la and usuario_id = u52::uuid) then
    raise exception 'un rechazo dejó a alguien en la cartera de LA'; end if;
  if (select usuario_id from public.leads_asesores where lead_id = lp and tipo_acceso = 'dueno' and revocado_en is null) <> u50::uuid then
    raise exception 'el dueño de LP cambió'; end if;
end $$;

-- @test casos de leads: destinos (inactivo, bloqueado, sin leads.ver, inexistente, el dueño, ya compartido)
do $$ declare
  lp uuid := current_setting('matriz.lp')::uuid;
  u50 constant text := '00000000-0000-0000-0000-000000000050'; r jsonb; d text; e text; i int := 0;
begin
  for d, e in select * from (values
    ('00000000-0000-0000-0000-000000000055', 'Esa persona no está activa en el equipo.'),
    ('00000000-0000-0000-0000-000000000056', 'Esa persona no está activa en el equipo.'),
    ('00000000-0000-0000-0000-000000000059', 'Esa persona no puede ver leads.'),
    (gen_random_uuid()::text, 'No encontramos a esa persona.')) x (d, e)
  loop
    r := pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', lp, d));
    perform pg_temp.espero(r, '22023', e, 'compartir con ' || d);
    r := pg_temp.como(u50, format('select public.lead_transferir(%L, %L, %L)', lp, d, u50));
    perform pg_temp.espero(r, '22023', e, 'transferir a ' || d);
    i := i + 1;
  end loop;
  if i <> 4 then raise exception 'se probaron % de 4 destinos', i; end if;
  -- El dueño como destino, y quien ya lo tiene compartido: idempotente.
  r := pg_temp.como(u50, format('select public.lead_transferir(%L, %L, %L)', lp, u50, u50));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'transferirse al dueño actual: %', r; end if;
  r := pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', lp, '00000000-0000-0000-0000-000000000051'));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'compartir con quien ya lo tiene: %', r; end if;
  -- Nombres y tipo de acceso, sin contacto.
  r := pg_temp.como(u50, format('select public.lead_cartera(%L)', lp));
  if jsonb_array_length(r -> 'valor') <> 3 or (r -> 'valor' -> 0 ->> 'tipo_acceso') <> 'dueno' or (r -> 'valor' -> 0 ->> 'nombre') <> 'Dueño Matriz' then
    raise exception 'quién lo tiene: %', r; end if;
  if r::text ~* 'email|correo|telefono|@' then raise exception 'la cartera entrega un dato de contacto: %', r; end if;
end $$;

-- @test casos de leads: transferir con el dueño esperado, el saliente queda compartido y la versión no se mueve
do $$ declare
  lp uuid := current_setting('matriz.lp')::uuid;
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u51 constant text := '00000000-0000-0000-0000-000000000051';
  u53 constant text := '00000000-0000-0000-0000-000000000053'; u57 constant text := '00000000-0000-0000-0000-000000000057';
  r jsonb; v0 timestamptz := (select actualizado_en from public.leads where id = lp); n_act bigint;
begin
  select count(*) into n_act from public.actividad where accion = 'lead.transferido' and registro_id = lp::text;
  -- Con un dueño esperado que no es el de ahora: conflicto legible, y nada cambia.
  r := pg_temp.como(u50, format('select public.lead_transferir(%L, %L, %L)', lp, u57, u53));
  perform pg_temp.espero(r, 'PT409', 'Este lead cambió de dueño: ahora lo tiene tú. Recarga para ver quién lo tiene.', 'transferir con un dueño esperado viejo');
  -- Con el correcto, pasa.
  r := pg_temp.como(u50, format('select public.lead_transferir(%L, %L, %L)', lp, u57, u50));
  if r -> 'valor' ->> 'resultado' <> 'transferido' then raise exception 'transferir: %', r; end if;
  if (select tipo_acceso from public.leads_asesores where lead_id = lp and usuario_id = u50::uuid and revocado_en is null) <> 'compartido' then
    raise exception 'el saliente no quedó compartido'; end if;
  if (select usuario_id from public.leads_asesores where lead_id = lp and tipo_acceso = 'dueno' and revocado_en is null) <> u57::uuid then
    raise exception 'el destino no es el dueño'; end if;
  if (select actualizado_en from public.leads where id = lp) <> v0 then raise exception 'transferir movió la versión del lead'; end if;
  -- Un reintento (la respuesta se perdió) no choca: el destino ya es el dueño.
  r := pg_temp.como(u50, format('select public.lead_transferir(%L, %L, %L)', lp, u57, u50));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'el reintento: %', r; end if;
  -- Dos transferencias a la vez: la segunda ya no es del dueño que creía.
  r := pg_temp.como(u50, format('select public.lead_transferir(%L, %L, %L)', lp, u53, u50));
  perform pg_temp.espero(r, '42501', 'Sólo quien es dueño del lead lo transfiere.', 'el saliente volvió a transferir');
  r := pg_temp.como(u57, format('select public.lead_transferir(%L, %L, %L)', lp, u53, u50));
  perform pg_temp.espero(r, 'PT409', 'Este lead cambió de dueño: ahora lo tiene tú. Recarga para ver quién lo tiene.', 'transferir con el dueño anterior');
  -- La constancia no lleva teléfono.
  select count(*) into n_act from public.actividad where accion = 'lead.transferido' and registro_id = lp::text and (select count(*) from public.actividad) > 0;
  if exists (select 1 from public.actividad a where a.registro_id = lp::text and a.accion in ('lead.transferido', 'lead.compartido', 'lead.acceso_revocado')
             and (a.antes::text || a.despues::text || coalesce(a.detalle::text, '')) ~ '78000001') then
    raise exception 'la actividad dejó el teléfono'; end if;
  -- De vuelta: el dueño original, y el destino compartido se va.
  r := pg_temp.como(u57, format('select public.lead_transferir(%L, %L, %L)', lp, u50, u57));
  if r -> 'valor' ->> 'resultado' <> 'transferido' then raise exception 'volver: %', r; end if;
  r := pg_temp.como(u50, format('select public.lead_revocar_acceso(%L, %L)', lp, u57));
  if r -> 'valor' ->> 'resultado' <> 'revocado' then raise exception 'sacar al destino: %', r; end if;
  if (select count(*) from public.leads_asesores where lead_id = lp and revocado_en is null) <> 3 then raise exception 'la cartera de LP no volvió a tres'; end if;
end $$;

-- @test casos de leads: revocar, salir, y no dejar un lead sin nadie
do $$ declare
  lp uuid := current_setting('matriz.lp')::uuid; la uuid := current_setting('matriz.la')::uuid;
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u51 constant text := '00000000-0000-0000-0000-000000000051';
  u52 constant text := '00000000-0000-0000-0000-000000000052'; u53 constant text := '00000000-0000-0000-0000-000000000053';
  r jsonb;
begin
  -- Al dueño no se le quita el acceso, ni él se sale.
  r := pg_temp.como(u50, format('select public.lead_revocar_acceso(%L, %L)', lp, u50));
  perform pg_temp.espero(r, '23514', 'Al dueño no se le quita el acceso: transfiere el lead.', 'revocó al dueño');
  r := pg_temp.como(u51, format('select public.lead_revocar_acceso(%L, %L)', lp, u50));
  perform pg_temp.espero(r, '23514', 'Al dueño no se le quita el acceso: transfiere el lead.', 'un compartido le quitó el acceso al dueño');
  r := pg_temp.como(u50, format('select public.lead_salir(%L)', lp));
  perform pg_temp.espero(r, '23514', 'Eres quien tiene este lead: transfiérelo para dejarlo.', 'el dueño se salió');
  -- Un compartido se sale (y vuelve a verlo como ajeno); repetirlo ya no ve el lead.
  r := pg_temp.como(u51, format('select public.lead_salir(%L)', lp));
  if r -> 'valor' ->> 'resultado' <> 'salio' then raise exception 'salir: %', r; end if;
  r := pg_temp.como(u51, format('select public.lead_salir(%L)', lp));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'salir dos veces');
  r := pg_temp.como(u51, format('select public.lead_guardar(%L, now(), %L)', lp, '{"nombre": "Ya no"}'));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'editar tras salirse');
  -- Revocar es idempotente.
  r := pg_temp.como(u50, format('select public.lead_revocar_acceso(%L, %L)', lp, u51));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'revocar a quien ya no está: %', r; end if;
  -- Volver a compartirlo lo reactiva como compartido.
  r := pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', lp, u51));
  if r -> 'valor' ->> 'resultado' <> 'compartido' then raise exception 'volver a compartir: %', r; end if;
  -- Quien revoca mientras el revocado edita: el guardado del revocado falla con el mensaje de siempre.
  r := pg_temp.como(u50, format('select public.lead_revocar_acceso(%L, %L)', lp, u51));
  r := pg_temp.como(u51, format('select public.lead_guardar(%L, (select actualizado_en from public.leads where id = %L), %L)', lp, lp, '{"nombre": "Tarde"}'));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'el revocado guardó');
  r := pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', lp, u51));

  -- Nadie deja un lead sin nadie: LA sin dueño (se dio de baja) y con un solo compartido.
  update public.leads_asesores set revocado_en = now() where lead_id = la and usuario_id = u53::uuid;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values (la, u51::uuid, 'compartido', u53::uuid);
  r := pg_temp.como(u51, format('select public.lead_salir(%L)', la));
  perform pg_temp.espero(r, '23514', 'Eres la única persona que lo tiene: transfiérelo antes de salir.', 'el último compartido se salió');
  r := pg_temp.como(u52, format('select public.lead_revocar_acceso(%L, %L)', la, u51));
  perform pg_temp.espero(r, '23514', 'Es la única persona que lo tiene: transfiérelo antes de quitarle el acceso.', 'se quitó al último');
  -- La supervisión sí puede dárselo a otra persona (transferir, con dueño esperado nulo).
  r := pg_temp.como(u52, format('select public.lead_transferir(%L, %L, null)', la, u51));
  if r -> 'valor' ->> 'resultado' <> 'transferido' then raise exception 'transferir un lead sin dueño: %', r; end if;
  -- Se deja como estaba.
  delete from public.leads_asesores where lead_id = la and usuario_id = u51::uuid;
  update public.leads_asesores set revocado_en = null, revocado_por = null, tipo_acceso = 'dueno' where lead_id = la and usuario_id = u53::uuid;
  if (select count(*) from public.leads_asesores where lead_id = la and revocado_en is null) <> 1 then raise exception 'LA no volvió a un solo dueño'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de leads: la papelera: 200 sí, 201 no, un id ajeno en el medio es todo o nada, y repetirlo no duplica
insert into public.leads (nombre, telefono_principal, origen_lead_id, creado_por)
select 'Lote ' || g, '7910' || lpad(g::text, 5, '0'), (select id from public.origenes_lead where clave = 'web'), '00000000-0000-0000-0000-000000000050'
from generate_series(1, 201) g;
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050'; la uuid := current_setting('matriz.la')::uuid;
  v_ids uuid[]; v_lote uuid := gen_random_uuid(); r jsonb; v_lotes bigint; v_vivos bigint;
begin
  select array_agg(id order by numero) into v_ids from public.leads where nombre like 'Lote %';
  if array_length(v_ids, 1) <> 201 then raise exception 'esperaba 201 leads de prueba: %', array_length(v_ids, 1); end if;
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, %L::uuid[])', gen_random_uuid(), v_ids));
  perform pg_temp.espero(r, '22023', 'Máximo 200 por lote.', 'envió 201');
  -- Con uno ajeno en el medio: todo o nada, y sin lote huérfano.
  select count(*) into v_lotes from public.lotes_papelera;
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, %L::uuid[])', gen_random_uuid(), array[v_ids[1], la, v_ids[2]]));
  perform pg_temp.espero(r, '42501', 'No encontramos este lead o no tienes acceso.', 'envió con un lead ajeno en el medio');
  if (select count(*) from public.lotes_papelera) <> v_lotes then raise exception 'quedó un lote huérfano'; end if;
  select count(*) into v_vivos from public.leads where id = any (array[v_ids[1], v_ids[2]]) and eliminado_en is null;
  if v_vivos <> 2 then raise exception 'se envió parte de un lote rechazado'; end if;
  -- 200 sí; repetido con el mismo lote no duplica ni manda de nuevo.
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, %L::uuid[])', v_lote, v_ids[1:200]));
  if not (r ->> 'ok')::boolean or jsonb_array_length(r -> 'valor' -> 'enviados') <> 200 then raise exception 'enviar 200: %', left(r::text, 300); end if;
  if (select count(*) from public.leads where lote_papelera_id = v_lote and eliminado_en is not null) <> 200 then raise exception 'no quedaron 200 en la papelera'; end if;
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, %L::uuid[])', v_lote, v_ids[1:200]));
  if (r -> 'valor' ->> 'repetido')::boolean is not true or (select count(*) from public.lotes_papelera where id = v_lote) <> 1 then
    raise exception 'repetir el envío: %', left(r::text, 300); end if;
  -- El mismo lote lo manda otra persona: no se lo pisa.
  r := pg_temp.como('00000000-0000-0000-0000-000000000052', format('select public.leads_papelera_enviar(%L, %L::uuid[])', v_lote, array[v_ids[201]]));
  perform pg_temp.espero(r, '22023', 'No pudimos enviar estos leads. Vuelve a intentarlo.', 'otra persona usó un lote ajeno');
  -- Se devuelve entero: vuelve sin pendientes.
  r := pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if jsonb_array_length(r -> 'valor' -> 'restaurados') <> 200 or jsonb_array_length(r -> 'valor' -> 'pendientes') <> 0 then
    raise exception 'restaurar el lote de 200: %', left(r::text, 300); end if;
  if exists (select 1 from public.lotes_papelera where id = v_lote and restaurado_en is null) then raise exception 'el lote no se cerró'; end if;
end $$;

-- @test casos de leads: la papelera: enviar revoca el portal, un vehículo vinculado lo impide, y la versión se mueve
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  x uuid; y uuid; v_veh uuid := (select id from public.vehiculos where eliminado_en is null and lead_id is null order by numero limit 1);
  v_lote uuid := gen_random_uuid(); r jsonb; v0 timestamptz; v1 timestamptz;
begin
  select id into x from public.leads where nombre = 'Lote 10';
  select id into y from public.leads where nombre = 'Lote 11';
  -- Portal vigente: se revoca al enviar y se dice.
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L)', x, 'clave-larga-001'));
  if not (r ->> 'ok')::boolean then raise exception 'otorgar el portal: %', r; end if;
  select actualizado_en into v0 from public.leads where id = x;
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, x));
  if (r -> 'valor' ->> 'portal_revocados')::int <> 1 then raise exception 'no revocó el portal: %', r; end if;
  if exists (select 1 from public.accesos_portal where lead_id = x and habilitado) then raise exception 'el portal siguió vigente'; end if;
  select actualizado_en into v1 from public.leads where id = x;
  if v1 <= v0 then raise exception 'la papelera debía mover la versión del lead'; end if;
  -- Restaurar no reabre el portal.
  r := pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if jsonb_array_length(r -> 'valor' -> 'restaurados') <> 1 then raise exception 'restaurar: %', r; end if;
  if exists (select 1 from public.accesos_portal where lead_id = x and habilitado) then raise exception 'restaurar reabrió el portal'; end if;
  -- Un vehículo vinculado impide enviarlo, y el mensaje nombra al lead y no deja lote.
  update public.vehiculos set lead_id = y where id = v_veh;
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', gen_random_uuid(), y));
  perform pg_temp.espero(r, '23514', 'No se envió nada. «Lote 11»: Tiene un vehículo vinculado%', 'envió un lead con vehículo');
  update public.vehiculos set lead_id = null where id = v_veh;
end $$;

-- @test casos de leads: la papelera: restaurar con el teléfono tomado deja ese lead adentro, con el motivo
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u52 constant text := '00000000-0000-0000-0000-000000000052';
  z uuid; w uuid; z2 uuid; v_lote uuid := gen_random_uuid(); v_lote2 uuid := gen_random_uuid(); r jsonb; v_tel text;
begin
  select id, telefono_principal into z, v_tel from public.leads where nombre = 'Lote 20';
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, z));
  if not (r ->> 'ok')::boolean then raise exception 'enviar: %', r; end if;
  -- Otro lead de la misma persona toma el número.
  insert into public.leads (nombre, telefono_principal, origen_lead_id, creado_por)
  values ('Quien lo tomó', v_tel, (select id from public.origenes_lead where clave = 'web'), u50::uuid) returning id into w;
  r := pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if jsonb_array_length(r -> 'valor' -> 'restaurados') <> 0 or jsonb_array_length(r -> 'valor' -> 'pendientes') <> 1 then
    raise exception 'restaurar con el teléfono tomado: %', left(r::text, 400); end if;
  if r -> 'valor' -> 'pendientes' -> 0 ->> 'motivo' not like '«Quien lo tomó» (#%) ya tiene este teléfono.' then
    raise exception 'el motivo dice otra cosa: %', r -> 'valor' -> 'pendientes' -> 0; end if;
  if (r -> 'valor' ->> 'quedan')::int <> 1 or exists (select 1 from public.leads where id = z and eliminado_en is null) then
    raise exception 'el lead debía quedar en la papelera'; end if;
  -- Si el que lo tomó es de otra persona y no se ve, se dice de quién es y nada más.
  update public.leads_asesores set revocado_en = now() where lead_id = w and usuario_id = u50::uuid;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (w, '00000000-0000-0000-0000-000000000053', 'dueno')
  on conflict (lead_id, usuario_id) do update set tipo_acceso = 'dueno', revocado_en = null;
  r := pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if r -> 'valor' -> 'pendientes' -> 0 ->> 'motivo' <> 'Ese teléfono ya lo tiene un lead de Ajeno Matriz.' then
    raise exception 'el motivo de un lead que no se ve: %', r -> 'valor' -> 'pendientes' -> 0; end if;
  -- La lista dice lo mismo, para quien la ve.
  r := pg_temp.como(u50, 'select public.leads_papelera_listar()');
  if not exists (select 1 from jsonb_array_elements(r -> 'valor') l, jsonb_array_elements(l -> 'leads') x
                 where x ->> 'id' = z::text and x ->> 'motivo_de_restaurar' = 'Ese teléfono ya lo tiene un lead de Ajeno Matriz.') then
    raise exception 'la papelera no dice por qué no vuelve: %', left(r::text, 400); end if;
  if r::text like '%' || v_tel || '%' then raise exception 'la papelera entrega un teléfono'; end if;
  -- Quien purga ve todo; quien no purga y no lo envió, nada.
  r := pg_temp.como(u52, 'select public.leads_papelera_listar()');
  if not exists (select 1 from jsonb_array_elements(r -> 'valor') l where l ->> 'id' = v_lote::text) then raise exception 'quien purga no ve el lote'; end if;
  r := pg_temp.como('00000000-0000-0000-0000-000000000051', 'select public.leads_papelera_listar()');
  if jsonb_array_length(r -> 'valor') <> 0 then raise exception 'un compartido ve lotes ajenos: %', r; end if;
  r := pg_temp.como('00000000-0000-0000-0000-000000000054', 'select public.leads_papelera_listar()');
  if jsonb_array_length(r -> 'valor') <> 0 then raise exception 'quien sólo ve, ve lotes ajenos: %', r; end if;
  -- El número queda libre cuando el otro lead se va: ahora vuelve.
  delete from public.leads where id = w;
  r := pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if jsonb_array_length(r -> 'valor' -> 'restaurados') <> 1 then raise exception 'con el número libre debía volver: %', r; end if;
end $$;

-- @test casos de leads: la papelera: purgar, lo que lo bloquea, y el job
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u52 constant text := '00000000-0000-0000-0000-000000000052';
  a uuid; b uuid; c uuid; d uuid; v_lote uuid := gen_random_uuid(); r jsonb; n int;
  v_veh uuid := (select id from public.vehiculos where eliminado_en is null and lead_id is null order by numero limit 1);
begin
  select id into a from public.leads where nombre = 'Lote 30';
  select id into b from public.leads where nombre = 'Lote 31';
  select id into c from public.leads where nombre = 'Lote 32';
  select id into d from public.leads where nombre = 'Lote 33';
  r := pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L, %L, %L, %L]::uuid[])', v_lote, a, b, c, d));
  if (r ->> 'ok')::boolean is not true then raise exception 'enviar cuatro: %', r; end if;
  -- Después de enviados: uno con un vehículo, uno con el portal vigente (lo reabre alguien a mano) y uno con un pago.
  update public.vehiculos set lead_id = b where id = v_veh;
  update public.accesos_portal set habilitado = true where lead_id = c;
  insert into public.accesos_portal (lead_id, codigo, clave_hash, habilitado) values (c, 'MAT-ABCDE', 'x', true)
  on conflict (lead_id) do update set habilitado = true;
  -- Sin el permiso, no.
  r := pg_temp.como(u50, format('select public.leads_papelera_purgar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  perform pg_temp.espero(r, '42501', 'No tienes permiso para purgar la papelera de leads.', 'purgó sin el permiso');
  -- Con la versión vieja, conflicto.
  r := pg_temp.como(u52, format('select public.leads_papelera_purgar(%L, now() - interval ''1 day'', null)', v_lote));
  if (r ->> 'ok')::boolean or r ->> 'estado' <> 'PT409' then raise exception 'purgar con una versión vieja: %', r; end if;
  -- Con el permiso: se va lo que se puede y se queda lo que lo impide, con su motivo.
  r := pg_temp.como(u52, format('select public.leads_papelera_purgar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if (r ->> 'ok')::boolean is not true then raise exception 'purgar: %', r; end if;
  if jsonb_array_length(r -> 'valor' -> 'purgados') <> 2 or jsonb_array_length(r -> 'valor' -> 'bloqueados') <> 2 then
    raise exception 'purgar: %', left(r::text, 500); end if;
  if exists (select 1 from public.leads where id in (a, d)) then raise exception 'lo purgable quedó'; end if;
  if not exists (select 1 from public.leads where id = b and eliminado_en is not null) or not exists (select 1 from public.leads where id = c and eliminado_en is not null) then
    raise exception 'lo bloqueado se fue'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'valor' -> 'bloqueados') x where x ->> 'motivo' like 'Tiene un vehículo vinculado%')
     or not exists (select 1 from jsonb_array_elements(r -> 'valor' -> 'bloqueados') x where x ->> 'motivo' = 'Tiene el acceso al portal vigente.') then
    raise exception 'los motivos: %', r -> 'valor' -> 'bloqueados'; end if;
  -- El job es la misma función: con el lote vencido purga lo que se puede y lo bloqueado se queda.
  update public.vehiculos set lead_id = null where id = v_veh;
  update public.lotes_papelera set creado_en = now() - interval '400 days' where id = v_lote;
  n := public.papelera_purgar_vencidos();
  if n <> 1 then raise exception 'el job debía purgar uno (el del vehículo ya libre): %', n; end if;
  if exists (select 1 from public.leads where id = b) then raise exception 'el job no purgó el que se liberó'; end if;
  if not exists (select 1 from public.leads where id = c and eliminado_en is not null) then raise exception 'el job purgó uno con el portal vigente'; end if;
  -- Un lead con pagos tampoco se va (dinero registrado).
  update public.accesos_portal set habilitado = false where lead_id = c;
  -- Un pago con el lead de otra persona lo escribe el dueño de la base, sin sesión.
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.pagos (vehiculo_id, lead_id, concepto, moneda, monto, monto_base)
  values (v_veh, c, 'Anticipo', 'USD', 100, 100);
  n := public.papelera_purgar_vencidos();
  if n <> 0 or not exists (select 1 from public.leads where id = c) then raise exception 'purgó un lead con pagos'; end if;
  delete from public.pagos where lead_id = c;
end $$;

-- @test casos de leads: lo que se escribía directo, ya no; y las genéricas no aceptan leads
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u52 constant text := '00000000-0000-0000-0000-000000000052';
  lp uuid := current_setting('matriz.lp')::uuid; r jsonb;
begin
  r := pg_temp.como(u50, format('insert into public.oportunidades (lead_id, usuario_id, titulo) values (%L, %L, %L) returning to_jsonb(oportunidades)', lp, u50, 'x'));
  perform pg_temp.espero(r, '42501', 'permission denied%', 'insertó una oportunidad directo');
  r := pg_temp.como(u50, format('update public.oportunidades set lead_id = %L where usuario_id = %L', lp, u50));
  perform pg_temp.espero(r, '42501', 'permission denied%', 'movió una oportunidad directo');
  r := pg_temp.como(u50, format('update public.cotizaciones set lead_id = %L where creado_por = %L', lp, u50));
  perform pg_temp.espero(r, '42501', 'permission denied%', 'colgó una cotización de un lead directo');
  r := pg_temp.como(u52, format('select public.papelera_enviar(%L, array[%L]::uuid[])', 'leads', lp));
  perform pg_temp.espero(r, '22023', 'Los leads tienen su propia papelera%', 'la genérica aceptó leads');
  r := pg_temp.como(u52, 'select public.papelera_listar(''leads'')::text');
  perform pg_temp.espero(r, '22023', 'Los leads tienen su propia papelera%', 'la genérica listó leads');
  -- El portal: lo ve quien lo gestiona con la cartera; la supervisión sin cartera no ve ni el código.
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L)', lp, 'clave-larga-002'));
  if (r ->> 'ok')::boolean is not true then raise exception 'otorgar: %', r; end if;
  r := pg_temp.como(u50, format('select count(*)::text::jsonb from public.accesos_portal where lead_id = %L', lp));
  if (r ->> 'valor')::int <> 1 then raise exception 'el dueño no ve su acceso al portal: %', r; end if;
  r := pg_temp.como(u52, format('select count(*)::text::jsonb from public.accesos_portal where lead_id = %L', lp));
  if (r ->> 'valor')::int <> 0 then raise exception 'la supervisión sin cartera ve el acceso al portal: %', r; end if;
  -- Clave corta.
  r := pg_temp.como(u50, format('select public.otorgar_portal(%L, %L)', lp, 'corta'));
  perform pg_temp.espero(r, '22023', 'La clave necesita al menos 8 caracteres.', 'aceptó una clave corta');
  r := pg_temp.como(u50, format('select public.revocar_portal(%L)', lp));
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de leads: lead_id en otras tablas sólo de un lead que se ve
do $$ declare
  lp uuid := current_setting('matriz.lp')::uuid; la uuid := current_setting('matriz.la')::uuid;
  u50 constant text := '00000000-0000-0000-0000-000000000050';
  v_veh uuid := (select id from public.vehiculos where eliminado_en is null order by numero limit 1);
  r jsonb;
begin
  -- El lead propio entra; uno ajeno o inexistente da lo mismo, sin decir si existe.
  r := pg_temp.como(u50, format('insert into public.pagos (vehiculo_id, lead_id, concepto, moneda, monto, monto_base) values (%L, %L, %L, %L, 1, 1) returning to_jsonb(pagos)', v_veh, lp, 'Seña', 'USD'));
  if r ->> 'ok' = 'true' then null;
  elsif r ->> 'estado' <> '42501' or r ->> 'mensaje' like 'No encontramos%' then
    raise exception 'el pago de un lead propio: %', r;
  end if;
  r := pg_temp.como(u50, format('insert into public.pagos (vehiculo_id, lead_id, concepto, moneda, monto, monto_base) values (%L, %L, %L, %L, 1, 1)', v_veh, la, 'Seña', 'USD'));
  if (r ->> 'ok')::boolean or r ->> 'mensaje' <> 'No encontramos este lead o no tienes acceso.' then
    raise exception 'el pago de un lead ajeno no dio el mensaje de siempre: %', r; end if;
  r := pg_temp.como(u50, format('insert into public.pagos (vehiculo_id, lead_id, concepto, moneda, monto, monto_base) values (%L, %L, %L, %L, 1, 1)', v_veh, gen_random_uuid(), 'Seña', 'USD'));
  if (r ->> 'ok')::boolean or r ->> 'mensaje' <> 'No encontramos este lead o no tienes acceso.' then
    raise exception 'el pago de un lead inexistente dio otro mensaje: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- ===========================================================================================
-- Vínculo e interesados desde el lead (parte 6b), sobre el terreno de la matriz de vínculo
-- ===========================================================================================
-- @test casos de vínculo: vincular, reemplazar, el historial y lo que ve cada uno
do $$ declare
  u60 constant text := '00000000-0000-0000-0000-000000000060'; u61 constant text := '00000000-0000-0000-0000-000000000061';
  u62 constant text := '00000000-0000-0000-0000-000000000062'; u63 constant text := '00000000-0000-0000-0000-000000000063';
  lv uuid := (select id from public.leads where nombre = 'Matriz LV');
  lw uuid := (select id from public.leads where nombre = 'Matriz LW');
  p60 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 60');
  p61 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 61');
  version_lv timestamptz := (select actualizado_en from public.leads where nombre = 'Matriz LV');
  vieja timestamptz; r jsonb; x jsonb;
begin
  -- Vincular, repetirlo, y una versión vieja.
  vieja := (select actualizado_en from public.vehiculos where id = p60);
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, %L, %L)', p60, vieja, lv));
  if r -> 'valor' ->> 'resultado' <> 'vinculado' then raise exception 'vincular: %', r; end if;
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, %L, %L)', p60, vieja, lv));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'vincular dos veces no es sin_cambios: %', r; end if;
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, %L, null)', p60, vieja));
  if r ->> 'estado' <> 'PT409' then raise exception 'desvincular con la versión vieja no dio conflicto: %', r; end if;
  -- Vincular no mueve la versión del lead.
  if (select actualizado_en from public.leads where id = lv) <> version_lv then raise exception 'vincular movió la versión del lead'; end if;

  -- Lo que ve cada uno. El compartido ve el vinculado (el vínculo se lo da) pero no el interés en un
  -- vehículo que su alcance no le deja ver; la supervisión ve los dos.
  r := pg_temp.como(u61, format('select public.vehiculo_interesado_marcar(%L, %L, %L)', p61, lv, 'Lo vio en la oficina'));
  if r -> 'valor' ->> 'resultado' <> 'marcado' then raise exception 'el compartido marcó interés: %', r; end if;
  r := pg_temp.como(u60, format('select public.lead_vehiculos(%L)', lv));
  x := r -> 'valor';
  if jsonb_array_length(x -> 'vinculados') <> 1 or x -> 'vinculados' -> 0 ->> 'id' <> p60::text then raise exception 'el dueño no ve su vinculado: %', x; end if;
  if jsonb_array_length(x -> 'interesados') <> 0 then raise exception 'el dueño ve el interés en un vehículo que no ve: %', x; end if;
  if not (x ->> 'puedo_actuar')::boolean then raise exception 'el dueño no puede actuar sobre su lead'; end if;
  r := pg_temp.como(u61, format('select public.lead_vehiculos(%L)', lv));
  x := r -> 'valor';
  if jsonb_array_length(x -> 'vinculados') <> 1 or jsonb_array_length(x -> 'interesados') <> 1 then raise exception 'el compartido: %', x; end if;
  if x -> 'interesados' -> 0 ->> 'nota' <> 'Lo vio en la oficina' then raise exception 'la nota del interés: %', x; end if;
  r := pg_temp.como(u62, format('select public.lead_vehiculos(%L)', lv));
  x := r -> 'valor';
  if jsonb_array_length(x -> 'vinculados') <> 1 or jsonb_array_length(x -> 'interesados') <> 1 or (x ->> 'puedo_actuar')::boolean then
    raise exception 'la supervisión: %', x; end if;
  -- La ficha cuenta sólo los vinculados que quien mira ve.
  r := pg_temp.como(u60, format('select public.lead_ficha(%L)', lv));
  if (r -> 'valor' ->> 'vehiculos_vinculados')::int <> 1 then raise exception 'la ficha no cuenta el vinculado: %', r; end if;
  -- Un lead que no se ve no entrega nada, ni la búsqueda.
  r := pg_temp.como(u63, format('select public.lead_vehiculos(%L)', lv));
  if jsonb_array_length(r -> 'valor' -> 'vinculados') <> 0 then raise exception 'el ajeno vio los vehículos de LV: %', r; end if;
  r := pg_temp.como(u63, format('select public.vehiculos_para_lead(%L, null)', lv));
  if r -> 'valor' <> '[]'::jsonb then raise exception 'el ajeno buscó en LV: %', r; end if;

  -- La búsqueda: por número y por título, con el estado frente al lead.
  r := pg_temp.como(u60, format('select public.vehiculos_para_lead(%L, %L)', lv, '#' || (select numero from public.vehiculos where id = p60)));
  if jsonb_array_length(r -> 'valor') <> 1 or not (r -> 'valor' -> 0 ->> 'vinculado_aqui')::boolean then raise exception 'buscar por número: %', r; end if;
  r := pg_temp.como(u60, format('select public.vehiculos_para_lead(%L, %L)', lv, 'propio 6'));
  if exists (select 1 from jsonb_array_elements(r -> 'valor') e where e ->> 'id' = p61::text) then raise exception 'la búsqueda trajo un vehículo que no ve: %', r; end if;
  r := pg_temp.como(u60, format('select public.vehiculos_para_lead(%L, %L)', lv, '50%_\'));
  if not (r ->> 'ok')::boolean then raise exception 'un texto con comodines rompió la búsqueda: %', r; end if;

  -- Reemplazar: con el lead actual en la cartera, se puede y la búsqueda lo nombra.
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) values (lw, u60::uuid, 'compartido', u63::uuid);
  r := pg_temp.como(u60, format('select public.vehiculos_para_lead(%L, %L)', lw, 'Matriz V propio 60'));
  x := r -> 'valor' -> 0;
  if not (x ->> 'vinculado_a_otro')::boolean or not (x ->> 'reemplazable')::boolean or x -> 'otro_lead' ->> 'nombre' <> 'Matriz LV' then
    raise exception 'el estado frente a LW: %', x; end if;
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, (select actualizado_en from public.vehiculos where id = %L), %L)', p60, p60, lw));
  if r -> 'valor' ->> 'resultado' <> 'reemplazado' then raise exception 'reemplazar con la cartera de los dos: %', r; end if;
  if (select count(*) from public.vehiculos_vinculos where vehiculo_id = p60 and hasta is null) <> 1
     or not exists (select 1 from public.vehiculos_vinculos where vehiculo_id = p60 and lead_id = lv and hasta is not null) then
    raise exception 'reemplazar no cerró el vínculo anterior'; end if;
  -- Sin el lead actual en la cartera, no: ni lo nombra, ni lo reemplaza.
  update public.leads_asesores set revocado_en = now() where lead_id = lw and usuario_id = u60::uuid;
  r := pg_temp.como(u60, format('select public.vehiculos_para_lead(%L, %L)', lv, 'Matriz V propio 60'));
  x := r -> 'valor' -> 0;
  if x -> 'otro_lead' <> 'null'::jsonb or (x ->> 'reemplazable')::boolean then raise exception 'nombró o dejó reemplazar un lead que no ve: %', x; end if;
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, (select actualizado_en from public.vehiculos where id = %L), %L)', p60, p60, lv));
  perform pg_temp.espero(r, '23514', 'Este vehículo ya está vinculado a otro lead.%', 'reemplazó sin tener el lead actual');
  -- El historial del lead: una línea por vínculo cerrado, sin personas.
  r := pg_temp.como(u60, format('select public.lead_vehiculos(%L)', lv));
  x := r -> 'valor' -> 'historial';
  if jsonb_array_length(x) <> 1 or x -> 0 ->> 'vehiculo_id' <> p60::text or x -> 0 ->> 'hasta' is null or x -> 0 ? 'por_nombre' then
    raise exception 'el historial de LV: %', x; end if;
  -- Quien lo tiene ahora (LW) lo desvincula y vuelve a LV: queda como al principio.
  r := pg_temp.como(u63, format('select public.vehiculo_vincular(%L, (select actualizado_en from public.vehiculos where id = %L), null)', p60, p60));
  if r -> 'valor' ->> 'resultado' <> 'desvinculado' then raise exception 'el dueño de LW desvinculó: %', r; end if;
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, (select actualizado_en from public.vehiculos where id = %L), %L)', p60, p60, lv));
  if r -> 'valor' ->> 'resultado' <> 'vinculado' then raise exception 'volver a vincular: %', r; end if;

  -- Interés: la nota de más de 500 y un vehículo que no ve.
  r := pg_temp.como(u60, format('select public.vehiculo_interesado_marcar(%L, %L, %L)', p60, lv, repeat('x', 501)));
  perform pg_temp.espero(r, '22023', 'La nota no puede pasar de 500 caracteres.', 'aceptó una nota de 501');
  r := pg_temp.como(u60, format('select public.vehiculo_interesado_quitar(%L, %L)', p61, lv));
  perform pg_temp.espero(r, '42501', 'Ese vehículo no existe o no tienes acceso.', 'quitó el interés en un vehículo que no ve');
  r := pg_temp.como(u61, format('select public.vehiculo_interesado_quitar(%L, %L)', p61, lv));
  if r -> 'valor' ->> 'resultado' <> 'quitado' or r -> 'valor' ->> 'nota' <> 'Lo vio en la oficina' then raise exception 'quitar devuelve la nota: %', r; end if;
  r := pg_temp.como(u61, format('select public.vehiculo_interesado_quitar(%L, %L)', p61, lv));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'quitar dos veces: %', r; end if;
  if (select actualizado_en from public.leads where id = lv) <> version_lv then raise exception 'el vínculo o el interés movieron la versión del lead'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de vínculo: seguimientos y recordatorios con un vehículo que se ve, que se deja de ver y que se purga
do $$ declare
  u60 constant text := '00000000-0000-0000-0000-000000000060'; u61 constant text := '00000000-0000-0000-0000-000000000061';
  lv uuid := (select id from public.leads where nombre = 'Matriz LV');
  p61 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 61');
  p63 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 63');
  tipo uuid := (select id from public.tipos_seguimiento where activo order by orden limit 1);
  s_id uuid := gen_random_uuid(); r_id uuid := gen_random_uuid(); r jsonb; x jsonb;
begin
  -- Uno que no ve se rechaza, con el campo.
  r := pg_temp.como(u60, format('select public.seguimiento_crear(%L, %L, jsonb_build_object(%L, %L::uuid, %L, %L, %L, %L::uuid))',
    gen_random_uuid(), lv, 'tipo_id', tipo, 'titulo', 'Con vehículo', 'vehiculo_id', p61));
  perform pg_temp.espero(r, '42501', 'Ese vehículo no existe o no tienes acceso.', 'anotó con un vehículo que no ve');
  r := pg_temp.como(u60, format('select public.recordatorio_crear(%L, %L, %L, now() + interval %L, %L)', gen_random_uuid(), lv, 'Llamar', '1 day', p61));
  perform pg_temp.espero(r, '42501', 'Ese vehículo no existe o no tienes acceso.', 'agendó con un vehículo que no ve');
  r := pg_temp.como(u60, format('select public.seguimiento_crear(%L, %L, jsonb_build_object(%L, %L::uuid, %L, %L, %L, 12))',
    gen_random_uuid(), lv, 'tipo_id', tipo, 'titulo', 'Mal formado', 'vehiculo_id'));
  perform pg_temp.espero(r, '22023', 'Ese dato no es válido.', 'aceptó un vehículo que no es un uuid');

  -- P63 vinculado a LV: el dueño lo ve (el vínculo se lo da) y lo nombra en un seguimiento público y en
  -- su recordatorio, que nace con el mismo vehículo.
  update public.vehiculos set lead_id = null where lead_id = lv;
  update public.vehiculos set lead_id = lv where id = p63;
  r := pg_temp.como(u60, format('select public.seguimiento_crear(%L, %L, jsonb_build_object(%L, %L::uuid, %L, %L, %L, %L, %L, %L::uuid), jsonb_build_object(%L, now() + interval %L))',
    s_id, lv, 'tipo_id', tipo, 'titulo', 'Le mostré el auto', 'visibilidad', 'publico', 'vehiculo_id', p63, 'recordar_en', '2 days'));
  x := r -> 'valor';
  if x -> 'seguimiento' -> 'vehiculo' ->> 'titulo' <> 'Matriz V propio 63' then raise exception 'el seguimiento no nombra el vehículo: %', r; end if;
  if (select vehiculo_id from public.recordatorios where id = (x -> 'recordatorio' ->> 'id')::uuid) <> p63 then raise exception 'el recordatorio no heredó el vehículo'; end if;
  r := pg_temp.como(u60, format('select public.recordatorio_crear(%L, %L, %L, now() + interval %L, %L)', r_id, lv, 'Mandar fotos', '1 day', p63));
  if r -> 'valor' -> 'recordatorio' -> 'vehiculo' ->> 'titulo' <> 'Matriz V propio 63' then raise exception 'recordatorio con vehículo: %', r; end if;

  -- Se desvincula: el dueño deja de ver P63. Todo sigue, sin el nombre; a su autor se le dice que había uno.
  update public.vehiculos set lead_id = null where id = p63;
  r := pg_temp.como(u60, format('select public.lead_seguimientos(%L)', lv));
  x := (select e from jsonb_array_elements(r -> 'valor' -> 'seguimientos') e where e ->> 'id' = s_id::text);
  if x -> 'vehiculo' <> 'null'::jsonb or not (x ->> 'vehiculo_oculto')::boolean then raise exception 'el autor tras dejar de verlo: %', x; end if;
  r := pg_temp.como(u61, format('select public.lead_seguimientos(%L)', lv));
  x := (select e from jsonb_array_elements(r -> 'valor' -> 'seguimientos') e where e ->> 'id' = s_id::text);
  if x -> 'vehiculo' <> 'null'::jsonb or (x ->> 'vehiculo_oculto')::boolean then raise exception 'el compartido supo del vehículo ajeno: %', x; end if;
  r := pg_temp.como(u60, format('select to_jsonb(v) from public.recordatorios_vista v where v.id = %L', r_id));
  if r -> 'valor' ->> 'vehiculo_id' is not null or not (r -> 'valor' ->> 'vehiculo_oculto')::boolean then raise exception 'la vista del recordatorio: %', r; end if;
  -- Editar lo demás conserva el vehículo que ya no ve; cambiarlo por otro que no ve, no.
  r := pg_temp.como(u60, format('select public.seguimiento_guardar(%L, (select actualizado_en from public.seguimientos where id = %L), %L)', s_id, s_id, '{"titulo": "Le mostré el auto rojo"}'));
  if r -> 'valor' ->> 'resultado' <> 'guardado' or (select vehiculo_id from public.seguimientos where id = s_id) <> p63 then raise exception 'editar perdió el vehículo: %', r; end if;
  r := pg_temp.como(u60, format('select public.seguimiento_guardar(%L, (select actualizado_en from public.seguimientos where id = %L), jsonb_build_object(%L, %L::uuid))', s_id, s_id, 'vehiculo_id', p61));
  perform pg_temp.espero(r, '42501', 'Ese vehículo no existe o no tienes acceso.', 'cambió a un vehículo que no ve');
  r := pg_temp.como(u60, format('select public.recordatorio_guardar(%L, (select actualizado_en from public.recordatorios where id = %L), %L)', r_id, r_id, '{"titulo": "Mandar fotos ya"}'));
  if not (r -> 'valor' -> 'recordatorio' ->> 'vehiculo_oculto')::boolean or (select vehiculo_id from public.recordatorios where id = r_id) <> p63 then
    raise exception 'editar el recordatorio: %', r; end if;
  -- Quitarlo (nulo) sí se puede.
  r := pg_temp.como(u60, format('select public.recordatorio_guardar(%L, (select actualizado_en from public.recordatorios where id = %L), %L)', r_id, r_id, '{"vehiculo_id": null}'));
  if (select vehiculo_id from public.recordatorios where id = r_id) is not null then raise exception 'no quitó el vehículo del recordatorio: %', r; end if;
  update public.recordatorios set vehiculo_id = p63 where id = r_id;

  -- En la papelera, igual que no verlo. Purgado, el seguimiento y el recordatorio siguen, sin vehículo.
  update public.vehiculos set lead_id = lv where id = p63;
  update public.vehiculos set eliminado_en = now(), eliminado_por = u60::uuid where id = p63;
  r := pg_temp.como(u60, format('select public.lead_seguimientos(%L)', lv));
  x := (select e from jsonb_array_elements(r -> 'valor' -> 'seguimientos') e where e ->> 'id' = s_id::text);
  if x -> 'vehiculo' <> 'null'::jsonb then raise exception 'nombró un vehículo en la papelera: %', x; end if;
  update public.vehiculos set lead_id = null where id = p63;
  delete from public.vehiculos where id = p63;
  if not exists (select 1 from public.seguimientos where id = s_id and vehiculo_id is null)
     or not exists (select 1 from public.recordatorios where id = r_id and vehiculo_id is null and eliminado_en is null) then
    raise exception 'purgar el vehículo se llevó el seguimiento o el recordatorio'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de vínculo: la papelera del lead sabe si el vehículo que la frena se ve, y transferir no toca los vínculos
do $$ declare
  u60 constant text := '00000000-0000-0000-0000-000000000060'; u61 constant text := '00000000-0000-0000-0000-000000000061';
  lv uuid := (select id from public.leads where nombre = 'Matriz LV');
  p60 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 60');
  sin uuid := (select id from public.vehiculos where titulo = 'Matriz V sin permiso');
  r jsonb; v_lote uuid := gen_random_uuid();
begin
  update public.vehiculos set lead_id = null where lead_id = lv;
  -- Dos vinculados: uno que ve y uno de un origen donde no tiene permiso. La ficha cuenta uno; la papelera
  -- dice que hay uno que no ve.
  update public.vehiculos set lead_id = lv where id in (p60, sin);
  r := pg_temp.como(u60, format('select public.lead_ficha(%L)', lv));
  if (r -> 'valor' ->> 'vehiculos_vinculados')::int <> 1 then raise exception 'la ficha contó uno que no ve: %', r; end if;
  r := pg_temp.como(u60, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', gen_random_uuid(), lv));
  perform pg_temp.espero(r, '23514', '%Tiene un vehículo vinculado que no ves%', 'envió un lead con un vehículo que no ve');
  update public.vehiculos set lead_id = null where id = sin;
  r := pg_temp.como(u60, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', gen_random_uuid(), lv));
  perform pg_temp.espero(r, '23514', '%desvincúlalo en «Vehículos» antes de enviarlo.', 'envió un lead con un vehículo que ve');
  -- Transferir no toca los vínculos.
  r := pg_temp.como(u60, format('select public.lead_transferir(%L, %L, %L)', lv, u61, u60));
  if not (r ->> 'ok')::boolean then raise exception 'transferir: %', r; end if;
  if (select lead_id from public.vehiculos where id = p60) <> lv then raise exception 'transferir cambió el vínculo'; end if;
  r := pg_temp.como(u61, format('select public.lead_transferir(%L, %L, %L)', lv, u60, u61));
  -- Desvincular y ahora sí va a la papelera; vuelve con «Deshacer».
  r := pg_temp.como(u60, format('select public.vehiculo_vincular(%L, (select actualizado_en from public.vehiculos where id = %L), null)', p60, p60));
  if r -> 'valor' ->> 'resultado' <> 'desvinculado' then raise exception 'desvincular: %', r; end if;
  r := pg_temp.como(u60, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, lv));
  if not (r ->> 'ok')::boolean then raise exception 'desvinculado, debía ir a la papelera: %', r; end if;
  r := pg_temp.como(u60, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote));
  if jsonb_array_length(r -> 'valor' -> 'restaurados') <> 1 then raise exception 'restaurar LV: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de embudos: el de por defecto, nombres, topes y las invariantes de las etapas
create or replace function pg_temp.etapas_de(p_embudo uuid) returns jsonb language sql as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'nombre', s.nombre, 'color', s.color, 'es_inicial', s.es_inicial,
           'es_ganada', s.es_ganada, 'es_perdida', s.es_perdida) order by s.orden, s.id), '[]'::jsonb)
    from public.embudos_etapas s where s.embudo_id = p_embudo;
$$;
create or replace function pg_temp.version_embudo(p_embudo uuid) returns timestamptz language sql as $$
  select actualizado_en from public.embudos where id = p_embudo;
$$;
-- Una llamada que tiene que salir bien: si falla, lo dice (comparar contra un nulo no avisaría).
create or replace function pg_temp.bien(p_resultado jsonb) returns jsonb language plpgsql as $$
begin
  if not coalesce((p_resultado ->> 'ok')::boolean, false) then
    raise exception 'tenía que salir bien: %', p_resultado;
  end if;
  return p_resultado;
end $$;
do $$ declare
  u57 constant text := '00000000-0000-0000-0000-000000000057'; u50 constant text := '00000000-0000-0000-0000-000000000050';
  r jsonb; v_emb uuid; v_otro uuid; v_et jsonb; v_ver timestamptz; i int; v_id uuid := gen_random_uuid();
begin
  -- El de por defecto nace una vez, con seis etapas genéricas; la segunda vez es el mismo.
  r := pg_temp.bien(pg_temp.como(u57, 'select public.embudo_por_defecto()'));
  if not (r ->> 'ok')::boolean or r -> 'valor' ->> 'resultado' <> 'creado' or jsonb_array_length(r -> 'valor' -> 'embudo' -> 'etapas') <> 6 then
    raise exception 'el embudo por defecto: %', r; end if;
  v_emb := (r -> 'valor' -> 'embudo' ->> 'id')::uuid;
  r := pg_temp.bien(pg_temp.como(u57, 'select public.embudo_por_defecto()'));
  if r -> 'valor' ->> 'resultado' is distinct from 'existente' or (r -> 'valor' -> 'embudo' ->> 'id')::uuid is distinct from v_emb then
    raise exception 'el embudo por defecto dos veces: %', r; end if;
  -- Nombre repetido sin importar mayúsculas; el mismo id es un reintento.
  r := pg_temp.como(u57, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), 'VENTAS'));
  perform pg_temp.espero(r, '22023', 'Ya tienes un embudo «Ventas».', 'otro embudo «VENTAS»');
  r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_crear(%L, %L)', v_id, 'Postventa')));
  if r -> 'valor' ->> 'resultado' <> 'creado' then raise exception 'crear Postventa: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_crear(%L, %L)', v_id, 'Postventa')));
  if r -> 'valor' ->> 'resultado' <> 'repetido' then raise exception 'crear dos veces: %', r; end if;
  r := pg_temp.como(u57, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), repeat('x', 41)));
  perform pg_temp.espero(r, '22023', 'El nombre de un embudo lleva entre 1 y 40 caracteres.', 'un nombre de 41');
  -- Hasta 10.
  for i in 3..10 loop
    r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), 'Embudo ' || i)));
    if not (r ->> 'ok')::boolean then raise exception 'crear el embudo %: %', i, r; end if;
  end loop;
  r := pg_temp.como(u57, format('select public.embudo_crear(%L, %L)', gen_random_uuid(), 'El once'));
  perform pg_temp.espero(r, '22023', 'Puedes tener hasta 10 embudos.%', 'el embudo once');
  -- El de por defecto no se elimina; uno vacío sí, y eliminarlo otra vez no hace nada.
  r := pg_temp.como(u57, format('select public.embudo_eliminar(%L, %L)', v_emb, pg_temp.version_embudo(v_emb)));
  perform pg_temp.espero(r, '23514', 'El embudo por defecto no se elimina: puedes renombrarlo.', 'eliminar el de por defecto');
  v_otro := (select id from public.embudos where usuario_id = u57::uuid and nombre = 'Embudo 10');
  r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_eliminar(%L, %L)', v_otro, pg_temp.version_embudo(v_otro))));
  if r -> 'valor' ->> 'resultado' <> 'eliminado' then raise exception 'eliminar uno vacío: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_eliminar(%L, %L)', v_otro, now())));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'eliminar dos veces: %', r; end if;

  -- Las invariantes de las etapas.
  v_et := pg_temp.etapas_de(v_emb);
  v_ver := pg_temp.version_embudo(v_emb);
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         jsonb_set(v_et, '{1,es_inicial}', 'true')));
  perform pg_temp.espero(r, '22023', 'Marca una sola etapa como inicial.', 'dos iniciales');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver, v_et - 4));
  perform pg_temp.espero(r, '22023', 'Hace falta al menos una etapa ganada.', 'sin la única ganada');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver, v_et - 5));
  perform pg_temp.espero(r, '22023', 'Hace falta al menos una etapa perdida.', 'sin la única perdida');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         jsonb_set(v_et, '{2,nombre}', '"CONTACTADO"')));
  perform pg_temp.espero(r, '22023', 'Hay dos etapas «CONTACTADO».%', 'un nombre repetido con otras mayúsculas');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         jsonb_set(v_et, '{1,color}', '"fucsia"')));
  perform pg_temp.espero(r, '22023', 'Elige un color de la paleta para «Contactado».', 'un color fuera de la paleta');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         jsonb_set(v_et, '{0,es_ganada}', 'true')));
  perform pg_temp.espero(r, '22023', 'La etapa inicial no puede ser ganada ni perdida.', 'la inicial ganada');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         v_et || (select jsonb_agg(jsonb_build_object('nombre', 'Extra ' || g, 'color', 'gris')) from generate_series(1, 7) g)));
  perform pg_temp.espero(r, '22023', 'Un embudo lleva entre 3 y 12 etapas.', 'trece etapas');
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         jsonb_set(v_et, '{1,id}', to_jsonb((select id from public.embudos_etapas where embudo_id = v_id limit 1)))));
  perform pg_temp.espero(r, '22023', 'Una de las etapas no es de este embudo.%', 'una etapa de otro embudo');
  -- Lo mismo con una versión vieja es `sin_cambios`; intercambiar dos nombres y reordenar no choca.
  r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver - interval '1 day', v_et)));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'lo mismo: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver,
         jsonb_build_array(v_et -> 0, jsonb_set(v_et -> 2, '{nombre}', '"Contactado"'), jsonb_set(v_et -> 1, '{nombre}', '"Cotizado"'),
                           v_et -> 3, v_et -> 4, v_et -> 5))));
  if r -> 'valor' ->> 'resultado' <> 'guardado' then raise exception 'intercambiar nombres: %', r; end if;
  -- Otra pestaña con la versión de antes: conflicto.
  r := pg_temp.como(u57, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, v_ver, v_et - 3));
  perform pg_temp.espero(r, 'PT409', 'Cambiaste este embudo % desde otra ventana.%', 'guardar las etapas con la versión vieja');
  -- Renombrar con versión vieja también; uno ajeno no se encuentra.
  r := pg_temp.como(u57, format('select public.embudo_guardar(%L, %L, %L)', v_emb, v_ver, 'Otro nombre'));
  perform pg_temp.espero(r, 'PT409', 'Cambiaste este embudo %', 'renombrar con la versión vieja');
  r := pg_temp.como(u50, format('select public.embudo_guardar(%L, %L, %L)', v_emb, pg_temp.version_embudo(v_emb), 'Mío'));
  perform pg_temp.espero(r, '42501', 'No encontramos este embudo. Recarga para ver los tuyos.', 'renombrar uno ajeno');
  -- Nadie lee los embudos de otra persona.
  r := pg_temp.bien(pg_temp.como(u50, format('select count(*)::int from public.embudos where usuario_id = %L', u57)));
  if (r -> 'valor')::int <> 0 then raise exception 'leyó embudos ajenos: %', r; end if;
  -- Sin escritura directa.
  r := pg_temp.como(u57, format('update public.embudos_etapas set es_inicial = true where embudo_id = %L', v_emb));
  perform pg_temp.espero(r, '42501', 'permission denied%', 'escribió una etapa directo');
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de oportunidades: validaciones, mover, cerrar, reabrir, versión, y quién la ve
do $$ declare
  u50 constant text := '00000000-0000-0000-0000-000000000050'; u51 constant text := '00000000-0000-0000-0000-000000000051';
  u52 constant text := '00000000-0000-0000-0000-000000000052'; u53 constant text := '00000000-0000-0000-0000-000000000053';
  u58 constant text := '00000000-0000-0000-0000-000000000058';
  r jsonb; v_lead uuid; v_emb uuid; v_b uuid; v_op uuid := gen_random_uuid(); v_oc uuid := gen_random_uuid(); v_os uuid := gen_random_uuid();
  v_ini uuid; v_cont uuid; v_gan uuid; v_per uuid; v_ver timestamptz; v_lead_ver timestamptz; v_lote uuid := gen_random_uuid();
begin
  r := pg_temp.bien(pg_temp.como(u50, format('select public.crear_lead(%L, %L)', gen_random_uuid(),
    jsonb_build_object('nombre', 'Matriz LO', 'telefono_principal', '78000099', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')))));
  v_lead := (r -> 'valor' ->> 'id')::uuid;
  if v_lead is null then raise exception 'alta de LO: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', v_lead, u51)));
  v_emb := (select id from public.embudos where usuario_id = u50::uuid and es_default);
  v_b := (select id from public.embudos where usuario_id = u50::uuid and nombre = 'Matriz B');
  select id into v_ini from public.embudos_etapas where embudo_id = v_emb and nombre = 'Nuevo';
  select id into v_cont from public.embudos_etapas where embudo_id = v_emb and nombre = 'Contactado';
  select id into v_gan from public.embudos_etapas where embudo_id = v_emb and es_ganada;
  select id into v_per from public.embudos_etapas where embudo_id = v_emb and es_perdida;
  v_lead_ver := (select actualizado_en from public.leads where id = v_lead);

  -- Validaciones, cada una con su campo.
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead, '{"titulo": "  "}'));
  perform pg_temp.espero(r, '22023', 'El título lleva entre 1 y 120 caracteres.', 'un título vacío');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead, jsonb_build_object('titulo', repeat('x', 500))));
  perform pg_temp.espero(r, '22023', 'El título lleva entre 1 y 120 caracteres.', 'un título de 500');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead, '{"titulo": "x", "monto_estimado": -1}'));
  perform pg_temp.espero(r, '22023', 'El monto no puede ser negativo.', 'un monto negativo');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead, '{"titulo": "x", "monto_estimado": 1000000000000}'));
  perform pg_temp.espero(r, '22023', 'El monto es demasiado grande.', 'un monto gigante');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead, '{"titulo": "x", "monto_estimado": 1.234}'));
  perform pg_temp.espero(r, '22023', 'El monto lleva hasta 2 decimales.', 'un monto con 3 decimales');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead, '{"titulo": "x", "estado": "ganada"}'));
  perform pg_temp.espero(r, '22023', 'El dato «estado» no es de una oportunidad.', 'un dato que no es de ella');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead,
         jsonb_build_object('titulo', 'x', 'etapa_id', (select id from public.embudos_etapas where embudo_id = v_b and es_inicial))));
  perform pg_temp.espero(r, '22023', 'Esa etapa no es de este embudo.', 'una etapa de otro embudo al crear');
  r := pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), v_lead,
         jsonb_build_object('titulo', 'x', 'embudo_id', (select id from public.embudos where usuario_id = u53::uuid and es_default))));
  perform pg_temp.espero(r, '22023', 'No encontramos ese embudo.%', 'el embudo de otra persona');

  -- Crear: en la inicial, abierta, con la moneda de la empresa, historial y constancia sin monto. No mueve el lead.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', v_op, v_lead, '{"titulo": "Hilux 2020", "monto_estimado": 25000.5, "notas": "Quiere financiar"}')));
  if r -> 'valor' ->> 'resultado' <> 'creada' or (r -> 'valor' -> 'oportunidad' ->> 'etapa_id')::uuid <> v_ini
     or r -> 'valor' -> 'oportunidad' ->> 'estado' <> 'abierta'
     or r -> 'valor' -> 'oportunidad' ->> 'moneda' <> (select moneda_base from public.ajustes_empresa) then
    raise exception 'crear: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_crear(%L, %L, %L)', v_op, v_lead, '{"titulo": "Otra cosa"}')));
  if r -> 'valor' ->> 'resultado' <> 'repetido' then raise exception 'crear dos veces: %', r; end if;
  if (select count(*) from public.oportunidades_historial where oportunidad_id = v_op) <> 1 then raise exception 'el historial al crear'; end if;
  if not exists (select 1 from public.actividad where accion = 'oportunidad.creada' and registro_id = v_op::text
                 and not (coalesce(detalle, '{}') ?| array['monto_estimado', 'notas', 'titulo'])) then
    raise exception 'la constancia de crear'; end if;
  if (select actualizado_en from public.leads where id = v_lead) <> v_lead_ver then raise exception 'crear movió la versión del lead'; end if;

  -- Mover: la misma etapa no hace nada; con la esperada vieja, conflicto; a otro embudo, no.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L)', v_op, v_cont, v_ini)));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'mover a la misma: %', r; end if;
  r := pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L)', v_op, v_cont, v_gan));
  perform pg_temp.espero(r, 'PT409', 'Esta oportunidad ya está en «Nuevo». Recarga para verla donde está.', 'mover con la esperada vieja');
  r := pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L)', v_op, v_ini,
         (select id from public.embudos_etapas where embudo_id = v_b and es_ganada)));
  perform pg_temp.espero(r, '22023', 'Esa etapa no es de este embudo.', 'mover a otro embudo');
  r := pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L)', v_op, v_ini,
         (select s.id from public.embudos_etapas s join public.embudos e on e.id = s.embudo_id where e.usuario_id = u53::uuid limit 1)));
  perform pg_temp.espero(r, '22023', 'Esa etapa no es de este embudo.', 'mover a una etapa de otra persona');
  -- Perdida, con motivo (hasta 200); la constancia; reabrir limpia el motivo; ganada.
  r := pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L, %L)', v_op, v_ini, v_per, repeat('m', 201)));
  perform pg_temp.espero(r, '22023', 'El motivo lleva hasta 200 caracteres.', 'un motivo de 201');
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L, %L)', v_op, v_ini, v_per, 'Compró en otra parte')));
  if r -> 'valor' -> 'oportunidad' ->> 'estado' <> 'perdida' or r -> 'valor' -> 'oportunidad' ->> 'motivo_perdida' <> 'Compró en otra parte' then
    raise exception 'perdida: %', r; end if;
  if not exists (select 1 from public.actividad where accion = 'oportunidad.perdida' and registro_id = v_op::text) then
    raise exception 'la constancia de perdida'; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L, %L)', v_op, v_per, v_cont, 'no se guarda')));
  if r -> 'valor' -> 'oportunidad' ->> 'estado' <> 'abierta' or r -> 'valor' -> 'oportunidad' ->> 'motivo_perdida' is not null then
    raise exception 'reabrir: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L)', v_op, v_cont, v_gan)));
  if r -> 'valor' -> 'oportunidad' ->> 'estado' <> 'ganada' then raise exception 'ganada: %', r; end if;
  if (select count(*) from public.oportunidades_historial where oportunidad_id = v_op) <> 4 then raise exception 'el historial al mover'; end if;
  if (select actualizado_en from public.leads where id = v_lead) <> v_lead_ver then raise exception 'mover movió la versión del lead'; end if;
  -- Editar: con la versión vieja, conflicto; lo mismo con la vieja no choca.
  v_ver := (select actualizado_en from public.oportunidades where id = v_op);
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_guardar(%L, %L, %L)', v_op, v_ver, '{"titulo": "Hilux 2021"}')));
  if r -> 'valor' ->> 'resultado' <> 'guardada' then raise exception 'guardar: %', r; end if;
  r := pg_temp.como(u50, format('select public.oportunidad_guardar(%L, %L, %L)', v_op, v_ver, '{"titulo": "Hilux 2022"}'));
  perform pg_temp.espero(r, 'PT409', 'Cambiaste esta oportunidad % desde otra ventana.%', 'guardar con la versión vieja');
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_guardar(%L, %L, %L)', v_op, v_ver, '{"titulo": "Hilux 2021"}')));
  if r -> 'valor' ->> 'resultado' <> 'sin_cambios' then raise exception 'guardar lo mismo: %', r; end if;
  -- Una etapa que pasa de abierta a ganada cierra lo que tiene; y vuelve.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_mover(%L, %L, %L)', v_op, v_gan, v_cont)));
  r := pg_temp.bien(pg_temp.como(u50, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, pg_temp.version_embudo(v_emb),
         jsonb_set(pg_temp.etapas_de(v_emb), '{1,es_ganada}', 'true'))));
  if (select estado from public.oportunidades where id = v_op) <> 'ganada' then raise exception 'la etapa ganada no cerró la oportunidad'; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, pg_temp.version_embudo(v_emb),
         jsonb_set(pg_temp.etapas_de(v_emb), '{1,es_ganada}', 'false'))));
  if (select estado from public.oportunidades where id = v_op) <> 'abierta' then raise exception 'la etapa abierta no la reabrió'; end if;
  -- Una etapa con oportunidades no se quita; un embudo con oportunidades no se elimina.
  r := pg_temp.como(u50, format('select public.embudo_etapas_guardar(%L, %L, %L)', v_emb, pg_temp.version_embudo(v_emb), pg_temp.etapas_de(v_emb) - 1));
  perform pg_temp.espero(r, '23514', '«Contactado» tiene 1 oportunidad: muévelas antes de quitarla.', 'quitar una etapa con oportunidades');

  -- Quién la ve: sólo su dueña. El compartido y la supervisión no.
  r := pg_temp.bien(pg_temp.como(u51, format('select count(*)::int from public.oportunidades where lead_id = %L', v_lead)));
  if (r -> 'valor')::int <> 0 then raise exception 'el compartido vio la oportunidad de la dueña'; end if;
  r := pg_temp.bien(pg_temp.como(u52, 'select count(*)::int from public.oportunidades'));
  if (r -> 'valor')::int <> 0 then raise exception 'la supervisión vio oportunidades ajenas'; end if;
  -- Tampoco la supervisión que tiene el lead compartido: «todos» no abre las oportunidades de nadie.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', v_lead, u58)));
  r := pg_temp.bien(pg_temp.como(u58, format('select count(*)::int from public.oportunidades where id = %L', v_op)));
  if (r -> 'valor')::int <> 0 then raise exception 'la supervisión compartida vio la oportunidad de la dueña'; end if;
  -- Y con «todos» y sin la cartera, su propia oportunidad no se toca (ver el lead no alcanza).
  r := pg_temp.bien(pg_temp.como(u58, format('select public.oportunidad_crear(%L, %L, %L)', v_os, v_lead, '{"titulo": "La de la supervisión"}')));
  if r -> 'valor' ->> 'resultado' <> 'creada' then raise exception 'crear de la supervisión: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.lead_revocar_acceso(%L, %L)', v_lead, u58)));
  r := pg_temp.como(u58, format('select public.oportunidad_guardar(%L, (select actualizado_en from public.oportunidades where id = %L), %L)', v_os, v_os, '{"titulo": "x"}'));
  perform pg_temp.espero(r, '42501', 'No encontramos esta oportunidad o no tienes acceso.', 'la supervisión editó la suya sin la cartera');
  r := pg_temp.bien(pg_temp.como(u58, format('select count(*)::int from public.oportunidades where id = %L', v_os)));
  if (r -> 'valor')::int <> 0 then raise exception 'la supervisión sin la cartera siguió viendo la suya'; end if;
  r := pg_temp.bien(pg_temp.como(u52, 'select count(*)::int from public.oportunidades_historial'));
  if (r -> 'valor')::int <> 0 then raise exception 'la supervisión vio el historial ajeno'; end if;
  -- El compartido tiene la suya; si pierde la cartera deja de verla (y de moverla); si vuelve, la ve.
  r := pg_temp.bien(pg_temp.como(u51, format('select public.oportunidad_crear(%L, %L, %L)', v_oc, v_lead, '{"titulo": "La del compartido"}')));
  if r -> 'valor' ->> 'resultado' <> 'creada' then raise exception 'crear del compartido: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.lead_revocar_acceso(%L, %L)', v_lead, u51)));
  r := pg_temp.bien(pg_temp.como(u51, format('select count(*)::int from public.oportunidades where id = %L', v_oc)));
  if (r -> 'valor')::int <> 0 then raise exception 'sin la cartera, la siguió viendo'; end if;
  r := pg_temp.como(u51, format('select public.oportunidad_guardar(%L, now(), %L)', v_oc, '{"titulo": "x"}'));
  perform pg_temp.espero(r, '42501', 'No encontramos esta oportunidad o no tienes acceso.', 'editar sin la cartera');
  if not exists (select 1 from public.oportunidades where id = v_oc and eliminado_en is null and estado = 'abierta') then
    raise exception 'perder la cartera cerró o borró la oportunidad'; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.lead_compartir(%L, %L)', v_lead, u51)));
  r := pg_temp.bien(pg_temp.como(u51, format('select count(*)::int from public.oportunidades where id = %L', v_oc)));
  if (r -> 'valor')::int <> 1 then raise exception 'con la cartera de vuelta, no la vio'; end if;
  -- La papelera las oculta; restaurar las devuelve.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, v_lead)));
  if not (r ->> 'ok')::boolean then raise exception 'enviar LO: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select count(*)::int from public.oportunidades where id = %L', v_op)));
  if (r -> 'valor')::int <> 0 then raise exception 'con el lead en la papelera, la siguió viendo'; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.leads_papelera_restaurar(%L, (select actualizado_en from public.lotes_papelera where id = %L), null)', v_lote, v_lote)));
  r := pg_temp.bien(pg_temp.como(u50, format('select count(*)::int from public.oportunidades where id = %L', v_op)));
  if (r -> 'valor')::int <> 1 then raise exception 'restaurado el lead, no la vio'; end if;
  -- Eliminar la oculta; restaurar con la versión que devolvió la trae.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_eliminar(%L, (select actualizado_en from public.oportunidades where id = %L))', v_op, v_op)));
  if r -> 'valor' ->> 'resultado' <> 'eliminada' then raise exception 'eliminar: %', r; end if;
  v_ver := (r -> 'valor' -> 'oportunidad' ->> 'actualizado_en')::timestamptz;
  r := pg_temp.bien(pg_temp.como(u50, format('select count(*)::int from public.oportunidades where id = %L', v_op)));
  if (r -> 'valor')::int <> 0 then raise exception 'eliminada, la siguió viendo'; end if;
  r := pg_temp.bien(pg_temp.como(u50, format('select public.oportunidad_restaurar(%L, %L)', v_op, v_ver)));
  if r -> 'valor' ->> 'resultado' <> 'restaurada' then raise exception 'restaurar: %', r; end if;
  -- Sin escritura directa.
  r := pg_temp.como(u50, format('update public.oportunidades set etapa_id = %L where id = %L', v_gan, v_op));
  perform pg_temp.espero(r, '42501', 'permission denied%', 'movió una oportunidad directo');
  -- La sección de la ficha: las suyas y si puede crear.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.lead_oportunidades(%L)', v_lead)));
  if not (r -> 'valor' ->> 'puedo_crear')::boolean or jsonb_array_length(r -> 'valor' -> 'oportunidades') <> 1 then
    raise exception 'lead_oportunidades de la dueña: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u52, format('select public.lead_oportunidades(%L)', v_lead)));
  if (r -> 'valor' ->> 'puedo_crear')::boolean or jsonb_array_length(r -> 'valor' -> 'oportunidades') <> 0 then
    raise exception 'lead_oportunidades de la supervisión: %', r; end if;
  -- El tablero: el total por etapa cuenta lo que se ve.
  r := pg_temp.bien(pg_temp.como(u50, format('select public.embudo_tablero(%L, 50)', v_emb)));
  if (select sum((c ->> 'total')::int) from jsonb_array_elements(r -> 'valor' -> 'columnas') c) <> 1 then
    raise exception 'el tablero: %', r; end if;
  r := pg_temp.bien(pg_temp.como(u53, format('select public.embudo_tablero(%L, 50)', v_emb)));
  if r -> 'valor' is not null and r -> 'valor' <> 'null'::jsonb then raise exception 'el tablero de un embudo ajeno: %', r; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test casos de oportunidades: un vehículo que no se ve no se elige, y si deja de verse se conserva
do $$ declare
  u60 constant text := '00000000-0000-0000-0000-000000000060';
  lv uuid := (select id from public.leads where nombre = 'Matriz LV');
  p60 uuid := (select id from public.vehiculos where titulo = 'Matriz V propio 60');
  sin uuid := (select id from public.vehiculos where titulo = 'Matriz V sin permiso');
  r jsonb; v_id uuid := gen_random_uuid();
begin
  r := pg_temp.como(u60, format('select public.oportunidad_crear(%L, %L, %L)', gen_random_uuid(), lv, jsonb_build_object('titulo', 'x', 'vehiculo_id', sin)));
  perform pg_temp.espero(r, '42501', 'Ese vehículo no existe o no tienes acceso.', 'un vehículo que no ve');
  r := pg_temp.bien(pg_temp.como(u60, format('select public.oportunidad_crear(%L, %L, %L)', v_id, lv, jsonb_build_object('titulo', 'Con vehículo', 'vehiculo_id', p60))));
  if (r -> 'valor' -> 'oportunidad' -> 'vehiculo' ->> 'id')::uuid <> p60 then raise exception 'crear con vehículo: %', r; end if;
  -- Deja de verlo (pasa a un origen sin permiso): editar otra cosa lo conserva y no lo nombra.
  update public.oportunidades set vehiculo_id = sin where id = v_id;
  r := pg_temp.bien(pg_temp.como(u60, format('select public.oportunidad_guardar(%L, (select actualizado_en from public.oportunidades where id = %L), %L)', v_id, v_id, '{"titulo": "Otro"}')));
  if r -> 'valor' -> 'oportunidad' -> 'vehiculo' <> 'null'::jsonb or not (r -> 'valor' -> 'oportunidad' ->> 'vehiculo_oculto')::boolean
     or (select vehiculo_id from public.oportunidades where id = v_id) <> sin then
    raise exception 'el vehículo que dejó de ver: %', r; end if;
  delete from public.oportunidades where id = v_id;
end $$;
select set_config('request.jwt.claim.sub', '', false);
