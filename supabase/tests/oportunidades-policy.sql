-- @test oportunidades-policy (5a-6): lo que la policy de `oportunidades` entrega es lo que dice la regla escrita a mano
-- La policy "oportunidades: leer" dejó de armar un arreglo con toda la cartera (`_mis_leads_vivos()`) y pregunta por cada oportunidad con `_lead_vivo_en_mi_cartera()`
-- (`…20261019003600`). La visibilidad no puede cambiar: para cada persona, la huella md5 de las oportunidades que la policy le entrega (como `authenticated`) tiene que ser
-- la de la regla, escrita aparte desde `leads_asesores` y `leads` sin mirar la copia `leads.cartera` ni la policy. Cada caso además se afirma con filas concretas, para
-- que una huella igual por error no pase. Lo que no se ve responde como inexistente, también para la RPC. Corre al final: usa los roles de `matriz-leads.sql`.
--
-- La regla: una oportunidad la lee su dueña —y sólo ella, aunque otra persona vea «todos» o tenga el lead—, si no está eliminada, tiene `leads.ver` y el lead sigue vivo y
-- en la cartera vigente de la dueña (ni la papelera ni el limbo). Quien se va (baja en curso) tiene la cuenta apagada: sin permisos, no lee ninguna (como antes).
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000009c1', 'op-policy-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009c2', 'op-policy-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009c3', 'op-policy-c@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009c4', 'op-policy-todos@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009c5', 'op-policy-sin-ver@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009c1', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009c2', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009c3', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009c4', (select id from public.roles where clave = 'humo_matriz_todos'), true);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

create or replace function pg_temp.como_o(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  return r;
exception when others then
  reset role;
  raise;
end $$;

-- Lo que la policy entrega a `p_quien`: cuántas y la huella de las filas.
create or replace function pg_temp.op_policy_entrega(p_quien uuid) returns jsonb language sql as $$
  select pg_temp.como_o(p_quien, $q$
    select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(o.id::text || '|' || o.lead_id::text || '|' || o.usuario_id::text || '|' || o.titulo, ',' order by o.id), '')))
      from public.oportunidades o $q$);
$$;

-- La regla escrita a mano, como `postgres`. `p_ver`: la persona tiene `leads.ver` (con cualquier alcance).
create or replace function pg_temp.op_regla_a_mano(p_quien uuid, p_ver boolean) returns jsonb language sql as $$
  select jsonb_build_object('n', count(*), 'md5', md5(coalesce(string_agg(o.id::text || '|' || o.lead_id::text || '|' || o.usuario_id::text || '|' || o.titulo, ',' order by o.id), '')))
    from public.oportunidades o
   where p_ver and o.usuario_id = p_quien and o.eliminado_en is null
     and exists (select 1 from public.leads l where l.id = o.lead_id and l.eliminado_en is null)
     and p_quien = any (coalesce((select array_agg(x.usuario_id) from public.leads_asesores x where x.lead_id = o.lead_id and x.revocado_en is null), '{}'));
$$;

-- Los casos, como `postgres`. A = d1, B = d2, C = d3 (la que se va), T = d4 (con «todos»), S = d5 (sin `leads.ver`).
do $$ declare
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  a constant uuid := '00000000-0000-0000-0000-0000000009c1'; b constant uuid := '00000000-0000-0000-0000-0000000009c2'; c constant uuid := '00000000-0000-0000-0000-0000000009c3';
  t constant uuid := '00000000-0000-0000-0000-0000000009c4'; s constant uuid := '00000000-0000-0000-0000-0000000009c5';
  u uuid; v_emb uuid; v_et uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('OpPol solo A', '78910001', a, v_web, '{}'),
    ('OpPol compartido A y B', '78910002', a, v_web, '{}'),
    ('OpPol en la papelera', '78910003', a, v_web, '{}'),
    ('OpPol en el limbo', '78910004', a, v_web, '{}'),
    ('OpPol de quien se va', '78910005', c, v_web, '{}'),
    ('OpPol de T', '78910006', t, v_web, '{}');
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por) select id, b, 'compartido', a from public.leads where nombre = 'OpPol compartido A y B';
  update public.leads set eliminado_en = now() where nombre = 'OpPol en la papelera';
  update public.leads_asesores set revocado_en = now(), revocado_por = a where lead_id = (select id from public.leads where nombre = 'OpPol en el limbo');
  update public.perfiles set activo = false, baja_en = now(), baja_por = '00000000-0000-0000-0000-000000000001' where id = c;
  insert into public.equipo_bajas (usuario_id, por) values (c, '00000000-0000-0000-0000-000000000001');
  -- Las oportunidades, cada una de su dueña en la etapa inicial de su embudo de siempre.
  for u in select unnest(array[a, b, c, t, s]) loop
    v_emb := public._embudo_defecto_de(u);
  end loop;
  insert into public.oportunidades (lead_id, usuario_id, embudo_id, etapa_id, titulo, moneda, eliminado_en)
  select l.id, x.quien, e.id, (select se.id from public.embudos_etapas se where se.embudo_id = e.id and se.es_inicial), x.titulo, 'USD', x.eliminada
    from (values
      ('OpPol solo A', a, 'A en lo suyo', null::timestamptz),
      ('OpPol compartido A y B', a, 'A en lo compartido', null),
      ('OpPol compartido A y B', a, 'A en lo compartido, otra', null),
      ('OpPol compartido A y B', b, 'B en lo compartido', null),
      ('OpPol en la papelera', a, 'A en la papelera', null),
      ('OpPol en el limbo', a, 'A en el limbo', null),
      ('OpPol solo A', a, 'A eliminada', now()),
      ('OpPol solo A', b, 'B en un lead que no ve', null),
      ('OpPol solo A', t, 'T con «todos» en un lead ajeno', null),
      ('OpPol de T', t, 'T en lo suyo', null),
      ('OpPol de quien se va', c, 'C en lo suyo', null),
      ('OpPol solo A', s, 'S sin leads.ver', null)) x (lead, quien, titulo, eliminada)
    join public.leads l on l.nombre = x.lead
    join public.embudos e on e.usuario_id = x.quien and e.es_default;
end $$;

do $$ declare p record; e jsonb; r jsonb; begin
  for p in select * from (values
    ('A (propios)', '00000000-0000-0000-0000-0000000009c1'::uuid, true, 3),
    ('B (propios)', '00000000-0000-0000-0000-0000000009c2'::uuid, true, 1),
    ('C (que se va: cuenta apagada, sin permisos)', '00000000-0000-0000-0000-0000000009c3'::uuid, false, 0),
    ('T (todos)', '00000000-0000-0000-0000-0000000009c4'::uuid, true, 1),
    ('S (sin leads.ver)', '00000000-0000-0000-0000-0000000009c5'::uuid, false, 0)) t(nombre, id, ver, esperadas) loop
    e := pg_temp.op_policy_entrega(p.id);
    r := pg_temp.op_regla_a_mano(p.id, p.ver);
    if e is distinct from r then raise exception 'la policy entrega a % algo distinto de la regla: policy %, regla %', p.nombre, e, r; end if;
    if (e ->> 'n')::int <> p.esperadas then raise exception '% debía ver % oportunidades y ve % (%)', p.nombre, p.esperadas, e ->> 'n', e; end if;
  end loop;
end $$;

-- @test oportunidades-policy: lo que no se ve responde como inexistente (cero filas y la misma respuesta de las RPC), y la visibilidad sigue a la cartera al instante
do $$ declare
  a constant uuid := '00000000-0000-0000-0000-0000000009c1'; b constant uuid := '00000000-0000-0000-0000-0000000009c2'; t constant uuid := '00000000-0000-0000-0000-0000000009c4';
  v_ajena uuid; v_papelera uuid; v_limbo uuid; v_de_b uuid; v_compartida uuid; v_msg text; n int;
begin
  select id into v_papelera from public.oportunidades where titulo = 'A en la papelera';
  select id into v_limbo from public.oportunidades where titulo = 'A en el limbo';
  select id into v_de_b from public.oportunidades where titulo = 'B en un lead que no ve';
  select id into v_ajena from public.oportunidades where titulo = 'A en lo suyo';
  select id into v_compartida from public.oportunidades where titulo = 'A en lo compartido';
  -- Una oportunidad ajena, una de un lead de la papelera, una de un lead en el limbo, una de B sobre un lead que B no ve y una inexistente: cero filas para A, B y T.
  for n in select 1 loop
    if (pg_temp.como_o(a, format('select to_jsonb(count(*)) from public.oportunidades where id = any (%L::uuid[])', array[v_papelera, v_limbo, v_de_b, gen_random_uuid()]))::int) <> 0 then
      raise exception 'A lee una oportunidad de la papelera, del limbo, ajena o inexistente'; end if;
    if (pg_temp.como_o(b, format('select to_jsonb(count(*)) from public.oportunidades where id = any (%L::uuid[])', array[v_ajena, v_papelera, v_limbo, v_de_b]))::int) <> 0 then
      raise exception 'B lee una oportunidad de A o la suya sobre un lead que no ve'; end if;
    if (pg_temp.como_o(t, format('select to_jsonb(count(*)) from public.oportunidades where id = any (%L::uuid[])', array[v_ajena, v_papelera, v_limbo, v_de_b]))::int) <> 0 then
      raise exception 'T lee, por tener «todos», una oportunidad ajena'; end if;
  end loop;
  -- La RPC dice lo mismo que dice de una que no existe.
  foreach v_ajena in array array[v_papelera, v_limbo, v_de_b, gen_random_uuid()] loop
    begin
      perform pg_temp.como_o(a, format($q$select public.oportunidad_guardar(%L, now(), '{"titulo": "x"}')$q$, v_ajena));
      raise exception 'oportunidad_guardar aceptó una oportunidad que A no ve';
    exception when sqlstate '42501' then null; end;
  end loop;
  -- Que la cartera cambie se nota enseguida: A pierde lo compartido y deja de ver sus dos oportunidades ahí; recuperarlo las trae.
  update public.leads_asesores set revocado_en = now(), revocado_por = b
   where usuario_id = a and lead_id = (select lead_id from public.oportunidades where id = v_compartida);
  if (pg_temp.op_policy_entrega(a) ->> 'n')::int <> 1 or pg_temp.op_policy_entrega(a) is distinct from pg_temp.op_regla_a_mano(a, true) then
    raise exception 'sin el lead compartido en su cartera, A debía ver sólo su oportunidad sobre lo suyo (ve %)', pg_temp.op_policy_entrega(a);
  end if;
  update public.leads_asesores set revocado_en = null, revocado_por = null
   where usuario_id = a and lead_id = (select lead_id from public.oportunidades where id = v_compartida);
  if pg_temp.op_policy_entrega(a) is distinct from pg_temp.op_regla_a_mano(a, true) or (pg_temp.op_policy_entrega(a) ->> 'n')::int <> 3 then
    raise exception 'al recuperar el lead compartido, A debía volver a ver 3 (ve %)', pg_temp.op_policy_entrega(a);
  end if;
  -- Un lead que va a la papelera y vuelve.
  update public.leads set eliminado_en = now() where id = (select lead_id from public.oportunidades where id = v_compartida);
  if (pg_temp.op_policy_entrega(a) ->> 'n')::int <> 1 then raise exception 'con el lead compartido en la papelera, A debía ver 1'; end if;
  update public.leads set eliminado_en = null where id = (select lead_id from public.oportunidades where id = v_compartida);
  if (pg_temp.op_policy_entrega(a) ->> 'n')::int <> 3 then raise exception 'al restaurar el lead, A debía volver a ver 3'; end if;
  -- La función nueva la ejecuta quien está conectado y nadie anónimo; la vieja ya no existe.
  if has_function_privilege('anon', 'public._lead_vivo_en_mi_cartera(uuid)', 'execute') then raise exception 'anon ejecuta _lead_vivo_en_mi_cartera'; end if;
  if not has_function_privilege('authenticated', 'public._lead_vivo_en_mi_cartera(uuid)', 'execute') then raise exception 'authenticated no ejecuta _lead_vivo_en_mi_cartera: la policy fallaría'; end if;
  if to_regprocedure('public._mis_leads_vivos()') is not null then raise exception 'sigue _mis_leads_vivos(): nadie la usa'; end if;
  -- Sin sesión, la función dice que no (no hay cartera de nadie).
  if (select public._lead_vivo_en_mi_cartera((select lead_id from public.oportunidades where id = v_compartida))) is distinct from false then
    raise exception 'sin sesión, _lead_vivo_en_mi_cartera() debía decir que no';
  end if;
end $$;
