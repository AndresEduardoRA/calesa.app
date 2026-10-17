-- @test cartera-policy (cierre 3): lo que la policy de `leads_asesores` entrega es lo que dice la regla escrita a mano
-- La policy "leads_asesores: leer" se reescribió dos veces por rendimiento (`…002500`, `…002700`) y la primera vez se comprobó con
-- una huella md5 suelta. Acá queda permanente: para cada persona, la huella md5 de las filas que la policy le entrega (como
-- `authenticated`) contra la huella de la regla, escrita aparte desde `leads_asesores` y `equipo_bajas` sin mirar la copia
-- `leads.cartera` ni la policy. Cada caso además se afirma con filas concretas, para que una huella igual por error no pase.
--
-- La regla: una fila de `leads_asesores` la lee quien ve el lead (vivo, con alguien vigente que no está en una baja en curso y
-- con «todos», o con «propios» y en su cartera) y, de él, la fila del dueño vigente que no está en baja, o la que es de una
-- cartera a la que pertenece.
-- Corre al final: usa los roles de `matriz-leads.sql` y la dueña de la semilla.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000009e1', 'cartera-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009e2', 'cartera-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009e3', 'cartera-c@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009e4', 'cartera-todos@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009e1', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009e2', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009e3', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009e4', (select id from public.roles where clave = 'humo_matriz_todos'), true);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

-- La sesión de una persona, para una sentencia (como PostgREST).
create or replace function pg_temp.como_c(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
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

-- La huella y la cantidad de filas de lo que la policy entrega a `p_quien`.
create or replace function pg_temp.policy_entrega(p_quien uuid) returns jsonb language sql as $$
  select pg_temp.como_c(p_quien, $q$
    select jsonb_build_object('n', count(*),
      'md5', md5(coalesce(string_agg(la.lead_id::text || '|' || la.usuario_id::text || '|' || la.tipo_acceso::text || '|' || (la.revocado_en is null)::text,
                                     ',' order by la.lead_id, la.usuario_id, la.tipo_acceso, la.desde), '')))
      from public.leads_asesores la $q$);
$$;

-- La regla escrita a mano, leída como `postgres`. `p_todos`: la persona tiene `leads.ver` con «todos» (no «propios»).
create or replace function pg_temp.regla_a_mano(p_quien uuid, p_todos boolean) returns jsonb language sql as $$
  with fuera as (select b.usuario_id from public.equipo_bajas b where b.terminada_en is null),
  vigentes as (select la.lead_id, la.usuario_id from public.leads_asesores la where la.revocado_en is null),
  visible as (
    select l.id as lead_id,
           coalesce((select array_agg(v.usuario_id) from vigentes v where v.lead_id = l.id), '{}') as cartera,
           coalesce((select array_agg(v.usuario_id) from vigentes v where v.lead_id = l.id and v.usuario_id not in (select f.usuario_id from fuera f)), '{}') as cartera_sin_baja
      from public.leads l where l.eliminado_en is null),
  lectura as (
    select la.*
      from public.leads_asesores la join visible vi on vi.lead_id = la.lead_id
     where cardinality(vi.cartera_sin_baja) > 0
       and (p_todos or p_quien = any (vi.cartera))
       and la.usuario_id not in (select f.usuario_id from fuera f)
       and ((la.tipo_acceso = 'dueno' and la.revocado_en is null) or p_quien = any (vi.cartera)))
  select jsonb_build_object('n', count(*),
    'md5', md5(coalesce(string_agg(l.lead_id::text || '|' || l.usuario_id::text || '|' || l.tipo_acceso::text || '|' || (l.revocado_en is null)::text,
                                   ',' order by l.lead_id, l.usuario_id, l.tipo_acceso, l.desde), '')))
    from lectura l;
$$;

-- Los siete casos, como `postgres`: el dueño de cada lead lo pone el trigger de `leads` (como el alta).
-- A = e1, B = e2, C = e3 (la que se va), T = e4 (con «todos»).
do $$ declare v_web uuid := (select id from public.origenes_lead where clave = 'web'); a constant uuid := '00000000-0000-0000-0000-0000000009e1';
  b constant uuid := '00000000-0000-0000-0000-0000000009e2'; c constant uuid := '00000000-0000-0000-0000-0000000009e3'; begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos) values
    ('Policy solo A', '78920001', a, v_web, '{}'),
    ('Policy compartido A y B', '78920002', a, v_web, '{}'),
    ('Policy en la papelera', '78920003', a, v_web, '{}'),
    ('Policy privado de B', '78920004', b, v_web, '{"direccion": "Calle privada 4"}'),
    ('Policy en el limbo', '78920005', a, v_web, '{}'),
    ('Policy con la baja en curso', '78920006', c, v_web, '{}'),
    ('Policy sólo de quien se va', '78920007', c, v_web, '{}');
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
    select id, b, 'compartido', a from public.leads where nombre = 'Policy compartido A y B';
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso, compartido_por)
    select id, a, 'compartido', c from public.leads where nombre = 'Policy con la baja en curso';
  update public.leads set eliminado_en = now() where nombre = 'Policy en la papelera';
  update public.leads_asesores set revocado_en = now(), revocado_por = a where lead_id = (select id from public.leads where nombre = 'Policy en el limbo');
  -- La baja en curso: la cuenta apagada y su fila sin terminar (lo que se ve entre el primer lote y el último).
  update public.perfiles set activo = false, baja_en = now(), baja_por = '00000000-0000-0000-0000-000000000001' where id = c;
  insert into public.equipo_bajas (usuario_id, por) values (c, '00000000-0000-0000-0000-000000000001');
end $$;

-- @test cartera-policy: cada persona recibe exactamente lo que dice la regla
do $$ declare p record; e jsonb; r jsonb; begin
  for p in select * from (values
    ('la dueña', '00000000-0000-0000-0000-000000000001'::uuid, true),
    ('A (propios)', '00000000-0000-0000-0000-0000000009e1'::uuid, false),
    ('B (propios)', '00000000-0000-0000-0000-0000000009e2'::uuid, false),
    ('T (todos)', '00000000-0000-0000-0000-0000000009e4'::uuid, true)) t(nombre, id, todos) loop
    e := pg_temp.policy_entrega(p.id);
    r := pg_temp.regla_a_mano(p.id, p.todos);
    if e is distinct from r then raise exception 'la policy entrega a % algo distinto de la regla: policy %, regla %', p.nombre, e, r; end if;
    if (e ->> 'n')::int = 0 then raise exception 'la comparación para % es vacía: no prueba nada', p.nombre; end if;
  end loop;
end $$;

-- @test cartera-policy: los casos, con filas concretas
do $$ declare
  a constant uuid := '00000000-0000-0000-0000-0000000009e1'; b constant uuid := '00000000-0000-0000-0000-0000000009e2';
  c constant uuid := '00000000-0000-0000-0000-0000000009e3'; t constant uuid := '00000000-0000-0000-0000-0000000009e4';
  d constant uuid := '00000000-0000-0000-0000-000000000001'; x uuid;
  q_filas text := $f$select to_jsonb(count(*)) from public.leads_asesores la join public.leads l on l.id = la.lead_id where l.nombre = %L$f$;
begin
  -- Solo A: A lo lee (su fila de dueña), B no; la dueña y T lo ven por «todos» (la fila del dueño).
  if pg_temp.como_c(a, format(q_filas, 'Policy solo A'))::int <> 1 then raise exception 'A no lee su lead'; end if;
  if pg_temp.como_c(b, format(q_filas, 'Policy solo A'))::int <> 0 then raise exception 'B lee un lead que no es suyo'; end if;
  if pg_temp.como_c(d, format(q_filas, 'Policy solo A'))::int <> 1 then raise exception 'la dueña no ve al dueño de un lead ajeno'; end if;
  -- Compartido: quien lo tiene en su cartera lee las dos filas; quien lo ve sin tenerlo, sólo la del dueño.
  if pg_temp.como_c(a, format(q_filas, 'Policy compartido A y B'))::int <> 2 then raise exception 'A no lee el compartido entero'; end if;
  if pg_temp.como_c(b, format(q_filas, 'Policy compartido A y B'))::int <> 2 then raise exception 'B no lee el compartido entero'; end if;
  if pg_temp.como_c(t, format(q_filas, 'Policy compartido A y B'))::int <> 1 then raise exception 'quien ve sin tenerlo lee más que al dueño'; end if;
  -- En la papelera: nadie lo lee.
  foreach x in array array[a, b, t, d] loop
    if pg_temp.como_c(x, format(q_filas, 'Policy en la papelera'))::int <> 0 then raise exception 'se lee la cartera de un lead en la papelera (%)', x; end if;
  end loop;
  -- Privado de B (con un campo «solo la cartera»): A no lo ve; la dueña sólo ve al dueño.
  if pg_temp.como_c(a, format(q_filas, 'Policy privado de B'))::int <> 0 then raise exception 'A lee la cartera de un lead de B'; end if;
  if pg_temp.como_c(d, format(q_filas, 'Policy privado de B'))::int <> 1 then raise exception 'la dueña no ve al dueño del lead de B'; end if;
  -- En el limbo (nadie vigente): nadie lo lee.
  foreach x in array array[a, b, t, d] loop
    if pg_temp.como_c(x, format(q_filas, 'Policy en el limbo'))::int <> 0 then raise exception 'se lee la cartera de un lead en el limbo (%)', x; end if;
  end loop;
  -- Con la baja en curso: A (compartida) lee sólo su fila, no la de C; la dueña ve el lead (queda A) pero el dueño vigente es C, que
  -- se va: no lee ninguna fila.
  if pg_temp.como_c(a, format(q_filas, 'Policy con la baja en curso'))::int <> 1 then raise exception 'A debería leer sólo su fila del lead de quien se va'; end if;
  if exists (select 1 from jsonb_array_elements_text(pg_temp.como_c(a, $q$select coalesce(jsonb_agg(la.usuario_id), '[]') from public.leads_asesores la join public.leads l on l.id = la.lead_id where l.nombre = 'Policy con la baja en curso'$q$)) e(v) where e.v = c::text) then
    raise exception 'A lee la fila de quien está en baja';
  end if;
  if pg_temp.como_c(d, format(q_filas, 'Policy con la baja en curso'))::int <> 0 then raise exception 'la dueña lee al dueño que se va, o una fila que no es la del dueño vigente'; end if;
  -- Sólo de quien se va: ya es limbo para todos.
  foreach x in array array[a, b, t, d] loop
    if pg_temp.como_c(x, format(q_filas, 'Policy sólo de quien se va'))::int <> 0 then raise exception 'se lee la cartera de un lead cuyo único dueño se va (%)', x; end if;
  end loop;
end $$;
