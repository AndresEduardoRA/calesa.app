-- @test derivados (9h): las comparaciones
-- La cartera y los atributos públicos en la fila del lead (9h) son copias: `leads.cartera` de `leads_asesores` y
-- `leads.atributos_publicos` de `leads.atributos` con el layout. Este archivo compara las copias con su fuente para TODOS
-- los leads de la base (los que dejaron las pruebas anteriores y los suyos), y lo que cada persona ve con la regla de
-- siempre leída de `leads_asesores`. Falla nombrando la primera discrepancia. Corre al final: usa los roles y las
-- personas que quedan de `matriz-leads.sql` (0050 a 0058, sin 0057, que esa prueba borra) y suma las suyas (09d1 a 09d4).
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000009d1', 'derivados-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009d2', 'derivados-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009d3', 'derivados-c@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009d4', 'derivados-todos@ejemplo.com', '{"invitado": true}');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009d1', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009d2', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009d3', (select id from public.roles where clave = 'humo_matriz_propios'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009d4', (select id from public.roles where clave = 'humo_matriz_todos'), true);
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
--
-- Las claves de un campo con un cambio de privacidad pendiente.
create or replace function pg_temp.claves_en_transicion() returns text[] language sql as $$
  select coalesce(array_agg(c.clave), '{}') from public.leads_campos c where c.solo_cartera_pendiente is not null;
$$;

-- La sesión de una persona, para una sentencia (como PostgREST).
create or replace function pg_temp.como_d(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  execute p_sql into r;
  reset role;
  return r;
exception when others then
  reset role;
  raise;
end $$;

-- Cambiar la privacidad de un campo como la pantalla (la dueña de la semilla, con `leads.configurar`).
create or replace function pg_temp.privacidad(p_clave text, p_privado boolean) returns void language sql as $$
  select pg_temp.como_d('00000000-0000-0000-0000-000000000001', format(
    'select to_jsonb(public.lead_campo_guardar(%L, %L, %L::jsonb))',
    (select id from public.leads_campos where clave = p_clave), (select actualizado_en from public.leads_campos where clave = p_clave),
    jsonb_build_object('solo_cartera', p_privado)));
$$;

-- La primera discrepancia de las copias, o nulo.
create or replace function pg_temp.derivados_discrepancia() returns text language sql as $$
  select coalesce(
    (select format('cartera de %s (%s): %s, y en leads_asesores %s', l.id, l.nombre, l.cartera, public._lead_cartera_calcular(l.id))
       from public.leads l where l.cartera is distinct from public._lead_cartera_calcular(l.id) order by l.id limit 1),
    -- Un campo con un cambio de privacidad a medias (`solo_cartera_pendiente`) puede estar o no según el lote: se compara lo demás.
    (select format('atributos_publicos de %s (%s): %s, y recalculados %s', l.id, l.nombre, l.atributos_publicos,
                   public._lead_atributos_publicos(l.atributos))
       from public.leads l
      where (l.atributos_publicos - pg_temp.claves_en_transicion())
            is distinct from (public._lead_atributos_publicos(l.atributos) - pg_temp.claves_en_transicion())
      order by l.id limit 1),
    (select format('atributos_publicos de %s (%s) trae «%s» con un valor que no es el de atributos', l.id, l.nombre, k.key)
       from public.leads l cross join lateral jsonb_each(l.atributos_publicos) k
      where l.atributos -> k.key is distinct from k.value
      order by l.id limit 1),
    (select format('atributos_publicos de %s (%s) trae «%s», que no es un campo público', l.id, l.nombre, k.key)
       from public.leads l cross join lateral jsonb_each(l.atributos_publicos) k
      where not exists (select 1 from public.leads_campos c where c.clave = k.key and not c.solo_cartera)
      order by l.id limit 1));
$$;

-- Lo que `p_quien` ve de `leads` (la policy, como `authenticated`) contra la regla de siempre, de `leads_asesores`: vivo,
-- fuera del limbo y con «todos», o con «propios» y en su cartera. Y «míos» de `leads_vista` contra `en_cartera()`.
create or replace function pg_temp.visibilidad_discrepancia(p_quien uuid) returns text language plpgsql as $$
declare v_esperado uuid[]; v_visto uuid[]; v_mios uuid[]; v_mios_vista uuid[]; v_x uuid;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  select coalesce(array_agg(l.id order by l.id), '{}') into v_esperado from public.leads l
   where l.eliminado_en is null and not public.lead_en_limbo(l.id)
     and (public.alcance_de('leads.ver') = 'todos' or (public.alcance_de('leads.ver') = 'propios' and l.id in (select public.mis_leads())));
  select coalesce(array_agg(l.id order by l.id), '{}') into v_mios from public.leads l
   where l.id = any (v_esperado) and public.en_cartera(l.id);
  set local role authenticated;
  select coalesce(array_agg(l.id order by l.id), '{}') into v_visto from public.leads l;
  select coalesce(array_agg(v.id order by v.id), '{}') into v_mios_vista from public.leads_vista v where v.en_cartera;
  reset role;
  select x into v_x from unnest(v_esperado) x except select y from unnest(v_visto) y limit 1;
  if v_x is not null then return format('%s no ve %s y debería', p_quien, v_x); end if;
  select y into v_x from unnest(v_visto) y except select x from unnest(v_esperado) x limit 1;
  if v_x is not null then return format('%s ve %s y no debería', p_quien, v_x); end if;
  if v_mios is distinct from v_mios_vista then
    return format('«míos» de %s: la vista dice %s y en_cartera() %s', p_quien, v_mios_vista, v_mios);
  end if;
  return null;
exception when others then
  reset role;
  raise;
end $$;

-- Todo junto: las copias y cada persona de la matriz y la dueña de la semilla.
create or replace function pg_temp.derivados_comprobar(p_cuando text) returns void language plpgsql as $$
declare v text; p uuid;
begin
  v := pg_temp.derivados_discrepancia();
  if v is not null then raise exception '%: %', p_cuando, v; end if;
  foreach p in array array['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000050',
    '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000053',
    '00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000055', '00000000-0000-0000-0000-000000000056',
    '00000000-0000-0000-0000-000000000058', '00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009d2',
    '00000000-0000-0000-0000-0000000009d3', '00000000-0000-0000-0000-0000000009d4']::uuid[] loop
    v := pg_temp.visibilidad_discrepancia(p);
    if v is not null then raise exception '%: %', p_cuando, v; end if;
  end loop;
end $$;

-- @test derivados (9h): todo lead que dejaron las pruebas anteriores tiene su cartera y sus atributos públicos
select pg_temp.derivados_comprobar('lo que dejaron las pruebas anteriores');

-- @test derivados (9h): una prueba que no ve una discrepancia no prueba nada (se rompe una a propósito y se deshace)
do $$ declare v text; begin
  begin
    update public.leads set cartera = '{}' where id = (select id from public.leads where cartera <> '{}' order by id limit 1);
    v := pg_temp.derivados_discrepancia();
    if v is null or v not like 'cartera de %' then raise exception 'no vio la cartera rota: %', v; end if;
    raise exception using errcode = 'P0004', message = 'deshacer';
  exception when sqlstate 'P0004' then null;
  end;
  begin
    update public.leads_campos set solo_cartera = true where clave = 'ciudad';
    v := pg_temp.derivados_discrepancia();
    if (select count(*) from public.leads where atributos_publicos ? 'ciudad') > 0 and v is null then
      raise exception 'no vio un campo privado en los atributos públicos';
    end if;
    raise exception using errcode = 'P0004', message = 'deshacer';
  exception when sqlstate 'P0004' then null;
  end;
end $$;

-- @test derivados (9h): 300 cambios al azar sobre la cartera y los leads, y después de cada 25 todo sigue igual a su fuente
-- Los cambios van directo a las tablas (como postgres): lo que se prueba es que los triggers cubren todo camino, también
-- uno que hoy no existe. Las RPC, con sus nombres, en el bloque siguiente.
do $$
declare
  v_personas constant uuid[] := array['00000000-0000-0000-0000-0000000009d1', '00000000-0000-0000-0000-0000000009d2',
    '00000000-0000-0000-0000-0000000009d3', '00000000-0000-0000-0000-0000000009d4', '00000000-0000-0000-0000-000000000051']::uuid[];
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_leads uuid[]; v_lead uuid; v_persona uuid; v_op int; i int;
begin
  perform setseed(0.42);
  -- 30 leads propios de esta prueba: el dueño lo pone el trigger de `leads` (como el alta).
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  select 'Derivados ' || g, (78900000 + g)::text, v_personas[1 + g % 5], v_web,
         jsonb_build_object('ciudad', 'Ciudad ' || g % 3, 'direccion', 'Calle ' || g)
    from generate_series(1, 30) g;
  select array_agg(id order by nombre) into v_leads from public.leads where nombre like 'Derivados %';
  perform pg_temp.derivados_comprobar('al crear los 30');
  for i in 1..300 loop
    -- Sin sesión: los cambios son de la base (la comprobación deja puesta la última persona).
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    v_lead := v_leads[1 + floor(random() * 30)::int];
    v_persona := v_personas[1 + floor(random() * 5)::int];
    v_op := floor(random() * 13)::int;
    case v_op
      when 0 then  -- compartir (o volver a compartir un acceso revocado)
        insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_lead, v_persona, 'compartido')
        on conflict (lead_id, usuario_id) do update set tipo_acceso = 'compartido', revocado_en = null, revocado_por = null
        where public.leads_asesores.tipo_acceso = 'compartido' or public.leads_asesores.revocado_en is not null;
      when 1 then  -- revocar un acceso
        update public.leads_asesores set revocado_en = now()
         where (lead_id, usuario_id) = (select la.lead_id, la.usuario_id from public.leads_asesores la
                                         where la.lead_id = v_lead and la.revocado_en is null order by la.usuario_id limit 1);
      when 2 then  -- transferir: el dueño pasa a compartido y entra otro
        update public.leads_asesores set tipo_acceso = 'compartido' where lead_id = v_lead and tipo_acceso = 'dueno' and revocado_en is null;
        insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_lead, v_persona, 'dueno')
        on conflict (lead_id, usuario_id) do update set tipo_acceso = 'dueno', revocado_en = null, revocado_por = null;
      when 3 then  -- la baja de una persona: todos sus accesos de una vez (deja leads sin dueño y con compartidos)
        update public.leads_asesores set revocado_en = now() where usuario_id = v_persona and revocado_en is null
           and lead_id = any (v_leads);
      when 4 then  -- a la papelera
        update public.leads set eliminado_en = now() where id = v_lead and eliminado_en is null;
      when 5 then  -- restaurar
        update public.leads set eliminado_en = null where id = v_lead and eliminado_en is not null;
      when 6 then  -- editar los atributos (uno público y uno privado)
        update public.leads set atributos = atributos || jsonb_build_object('ciudad', 'Otra ' || i, 'direccion', 'Otra calle ' || i)
         where id = v_lead;
      when 7 then  -- borrar la fila de un acceso (lo que hace la cascada)
        delete from public.leads_asesores
         where (lead_id, usuario_id) = (select la.lead_id, la.usuario_id from public.leads_asesores la
                                         where la.lead_id = v_lead order by la.usuario_id desc limit 1);
      when 9 then  -- cambiar la privacidad de «ciudad» por la RPC (con pocos leads, termina en la llamada)
        perform pg_temp.privacidad('ciudad', not (select solo_cartera or coalesce(solo_cartera_pendiente, false) from public.leads_campos where clave = 'ciudad'));
      when 10 then  -- empezar a pasarla a privado sin el primer lote (lo que deja la RPC con una base grande)
        update public.leads_campos set solo_cartera_pendiente = true where clave = 'ciudad' and not solo_cartera;
      when 11 then  -- un lote chico del job
        perform public._lead_campo_privacidad_lote((select id from public.leads_campos where clave = 'ciudad'), 4);
      else  -- tomar del limbo: un lead sin nadie recibe dueño
        if public._lead_cartera_calcular(v_lead) = '{}' then
          insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_lead, v_persona, 'dueno')
          on conflict (lead_id, usuario_id) do update set tipo_acceso = 'dueno', revocado_en = null, revocado_por = null;
        end if;
    end case;
    if i % 25 = 0 then
      perform pg_temp.derivados_comprobar(format('tras %s cambios', i));
    end if;
  end loop;
  if (select count(*) from public.leads where id = any (v_leads) and cartera = '{}') = 0 then
    raise exception 'los cambios al azar no dejaron ningún lead en el limbo: la prueba no cubre ese caso';
  end if;
  -- Lo que quede a medias se termina, y «ciudad» vuelve a ser pública para lo que sigue.
  while not public._lead_campo_privacidad_lote((select id from public.leads_campos where clave = 'ciudad'), 5000) loop end loop;
  if (select solo_cartera from public.leads_campos where clave = 'ciudad') then perform pg_temp.privacidad('ciudad', false); end if;
  perform pg_temp.derivados_comprobar('al terminar los cambios al azar');
end $$;

-- @test derivados (9h): por las RPC, con sus nombres: alta, compartir, transferir, salir, revocar, papelera y restaurar, importar y deshacer, la baja y tomar del limbo
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; b constant uuid := '00000000-0000-0000-0000-0000000009d2';
  d constant uuid := '00000000-0000-0000-0000-0000000009d3'; duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
  v_1 uuid := gen_random_uuid(); v_2 uuid := gen_random_uuid(); v_3 uuid := gen_random_uuid(); v_lote uuid := gen_random_uuid();
  v_imp uuid := gen_random_uuid(); r jsonb;
begin
  -- El alta: la cartera es el dueño.
  perform pg_temp.como_d(a, format('select public.crear_lead(%L, %L::jsonb, null, null)', v_1, jsonb_build_object('nombre', 'RPC uno', 'telefono_principal', '78910001', 'origen_lead_id', v_web, 'atributos', jsonb_build_object('ciudad', 'Sucre', 'direccion', 'Privada 1'))));
  perform pg_temp.como_d(a, format('select public.crear_lead(%L, %L::jsonb, null, null)', v_2, jsonb_build_object('nombre', 'RPC dos', 'telefono_principal', '78910002', 'origen_lead_id', v_web)));
  perform pg_temp.como_d(a, format('select public.crear_lead(%L, %L::jsonb, null, null)', v_3, jsonb_build_object('nombre', 'RPC tres', 'telefono_principal', '78910003', 'origen_lead_id', v_web)));
  if (select cartera from public.leads where id = v_1) <> array[a] then raise exception 'alta: %', (select cartera from public.leads where id = v_1); end if;
  if (select atributos_publicos from public.leads where id = v_1) <> '{"ciudad": "Sucre"}'::jsonb then
    raise exception 'alta, los atributos públicos: %', (select atributos_publicos from public.leads where id = v_1); end if;
  perform pg_temp.derivados_comprobar('tras el alta');
  -- Compartir, transferir, salir y revocar.
  perform pg_temp.como_d(a, format('select public.lead_compartir(%L, %L)', v_1, b));
  perform pg_temp.como_d(a, format('select public.lead_compartir(%L, %L)', v_2, b));
  perform pg_temp.como_d(a, format('select public.lead_transferir(%L, %L, %L)', v_1, d, a));
  if (select cartera from public.leads where id = v_1) <> (select array_agg(x order by x) from unnest(array[a, b, d]) x) then
    raise exception 'transferir: %', (select cartera from public.leads where id = v_1); end if;
  perform pg_temp.como_d(b, format('select public.lead_salir(%L)', v_2));
  perform pg_temp.como_d(d, format('select public.lead_revocar_acceso(%L, %L)', v_1, a));
  perform pg_temp.derivados_comprobar('tras compartir, transferir, salir y revocar');
  -- La papelera y restaurar no mueven la cartera; la policy mira `eliminado_en`.
  perform pg_temp.como_d(a, format('select public.leads_papelera_enviar(%L, array[%L]::uuid[])', v_lote, v_3));
  perform pg_temp.derivados_comprobar('con un lead en la papelera');
  perform pg_temp.como_d(a, format('select public.leads_papelera_restaurar(%L, %L, null)', v_lote, (select actualizado_en from public.lotes_papelera where id = v_lote)));
  perform pg_temp.derivados_comprobar('tras restaurar');
  -- Importar dos filas y deshacerlas: el delete en cascada no deja nada que comparar mal.
  r := pg_temp.como_d(a, format('select public.leads_importar_lote(%L, 2, %L::jsonb)', v_imp, jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'fila', 1, 'lead', jsonb_build_object('nombre', 'RPC importado 1', 'telefono_principal', '78910011', 'origen_lead_id', v_web, 'atributos', jsonb_build_object('ciudad', 'Tarija'))),
    jsonb_build_object('id', gen_random_uuid(), 'fila', 2, 'lead', jsonb_build_object('nombre', 'RPC importado 2', 'telefono_principal', '78910012', 'origen_lead_id', v_web)))));
  if (select count(*) from public.leads where nombre like 'RPC importado %' and cartera = array[a]) <> 2 then
    raise exception 'importar: %', r; end if;
  perform pg_temp.derivados_comprobar('tras importar');
  r := pg_temp.como_d(a, format('select public.leads_importacion_deshacer(%L)', v_imp));
  if exists (select 1 from public.leads where nombre like 'RPC importado %' and eliminado_en is null) then raise exception 'deshacer: %', r; end if;
  perform pg_temp.derivados_comprobar('tras deshacer la importación');
  -- La baja de quien es dueño de v_1 (d): el lead queda sin dueño y con su compartido (b), visible para «todos».
  perform pg_temp.como_d(duena, format('select to_jsonb(public.equipo_dar_de_baja(%L))', d));
  if (select cartera from public.leads where id = v_1) <> array[b] then raise exception 'la baja: %', (select cartera from public.leads where id = v_1); end if;
  perform pg_temp.derivados_comprobar('tras la baja');
  -- Tomar del limbo: a v_2 le quedaba sólo su dueño; se le revoca a mano (lo que deja una baja) y otra persona lo adopta
  -- al registrar su teléfono (el alta con el mismo número y `adoptar`).
  update public.leads_asesores set revocado_en = now() where lead_id = v_2 and revocado_en is null;
  if (select cartera from public.leads where id = v_2) <> '{}' then raise exception 'al limbo: %', (select cartera from public.leads where id = v_2); end if;
  r := pg_temp.como_d(b, format('select public.crear_lead(%L, %L::jsonb, null, null)', gen_random_uuid(), jsonb_build_object('nombre', 'RPC dos otra vez', 'telefono_principal', '78910002', 'origen_lead_id', v_web, 'adoptar', true)));
  if (select cartera from public.leads where id = v_2) <> array[b] then raise exception 'tomar del limbo: % (%)', (select cartera from public.leads where id = v_2), r; end if;
  perform pg_temp.derivados_comprobar('tras tomar del limbo');
end $$;

-- @test derivados (9h): pasar un campo a privado y a público por lotes, sin que la clave quede legible a medias
do $$
declare
  v_campo uuid := (select id from public.leads_campos where clave = 'ciudad');
  a constant uuid := '00000000-0000-0000-0000-0000000009d1'; todos constant uuid := '00000000-0000-0000-0000-0000000009d4';
  v_lead uuid := (select id from public.leads where nombre = 'RPC uno'); v_lotes int := 0;
begin
  -- RPC uno es de b (la baja le dejó la cartera) y lo ve «todos» (09d4) sin estar en ella: recibe «ciudad» mientras sea pública.
  if pg_temp.como_d(todos, format('select public.atributos_lead(%L)', v_lead)) ->> 'ciudad' is null then
    raise exception 'el terreno: «todos» no ve la ciudad de RPC uno'; end if;
  -- Con la RPC y pocos leads, el primer lote termina en la misma llamada.
  perform pg_temp.privacidad('ciudad', true);
  if (select (solo_cartera, solo_cartera_pendiente) from public.leads_campos where id = v_campo) is distinct from (true, null::boolean) then
    raise exception 'a privado, en la llamada: %', (select row(solo_cartera, solo_cartera_pendiente) from public.leads_campos where id = v_campo); end if;
  if exists (select 1 from public.leads where atributos_publicos ? 'ciudad') then raise exception 'quedó la ciudad en atributos_publicos'; end if;
  if pg_temp.como_d(todos, format('select public.atributos_lead(%L)', v_lead)) ? 'ciudad' then raise exception 'a privado: «todos» sigue recibiendo la ciudad'; end if;
  perform pg_temp.derivados_comprobar('tras pasar «ciudad» a privado');
  -- A público: inmediato, y la copia se completa.
  perform pg_temp.privacidad('ciudad', false);
  if (select (solo_cartera, solo_cartera_pendiente) from public.leads_campos where id = v_campo) is distinct from (false, null::boolean) then
    raise exception 'a público: %', (select row(solo_cartera, solo_cartera_pendiente) from public.leads_campos where id = v_campo); end if;
  if (select atributos_publicos ->> 'ciudad' from public.leads where id = v_lead) <> 'Sucre' then raise exception 'a público: la copia no se completó'; end if;
  perform pg_temp.derivados_comprobar('tras volver «ciudad» a público');
  -- Por lotes, como con una base grande: mientras quede algún lead con la clave, el campo sigue público (lo enmascarado
  -- lo da a «todos») y ningún lead nuevo la lleva en la copia.
  update public.leads_campos set solo_cartera_pendiente = true where id = v_campo;
  perform public._lead_campo_privacidad_lote(v_campo, 2);
  if (select solo_cartera from public.leads_campos where id = v_campo) then raise exception 'a medias ya era privado'; end if;
  if not exists (select 1 from public.leads where atributos_publicos ? 'ciudad') then raise exception 'el terreno: un lote de 2 lo terminó todo'; end if;
  if pg_temp.como_d(todos, format('select public.atributos_lead(%L)', v_lead)) ->> 'ciudad' is null and
     (select atributos_publicos ? 'ciudad' from public.leads where id = v_lead) then
    raise exception 'a medias, «todos» dejó de ver un dato que todavía es público'; end if;
  perform pg_temp.como_d(a, format('select public.crear_lead(%L, %L::jsonb, null, null)', gen_random_uuid(), jsonb_build_object(
    'nombre', 'RPC a medias', 'telefono_principal', '78910021', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web'),
    'atributos', jsonb_build_object('ciudad', 'Oruro'))));
  if (select atributos_publicos ? 'ciudad' from public.leads where nombre = 'RPC a medias') then raise exception 'un alta a medias llevó la clave'; end if;
  perform pg_temp.derivados_comprobar('a medias');
  while not public._lead_campo_privacidad_lote(v_campo, 2) loop
    v_lotes := v_lotes + 1;
    if v_lotes > 500 then raise exception 'la transición no termina'; end if;
  end loop;
  if not (select solo_cartera from public.leads_campos where id = v_campo) or exists (select 1 from public.leads where atributos_publicos ? 'ciudad') then
    raise exception 'al terminar los lotes'; end if;
  -- El job no hace nada si no hay nada pendiente, y vuelve a dejar «ciudad» pública para lo que sigue.
  if (public.leads_campos_privacidad_aplicar() ->> 'lotes')::int <> 0 then raise exception 'el job corrió sin nada pendiente'; end if;
  perform pg_temp.privacidad('ciudad', false);
  perform pg_temp.derivados_comprobar('al final');
end $$;
