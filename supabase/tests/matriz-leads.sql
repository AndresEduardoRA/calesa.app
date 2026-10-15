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
