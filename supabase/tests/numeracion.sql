-- @test numeración (9f-2): las personas
-- La numeración de los leads: el número propio por creador, su contador y el permiso del número global. Qué lee cada
-- persona (el enmascarado) lo prueba `numero-global.sql`; acá, cómo se asigna y qué no cambia nunca.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000009a1', 'numeracion-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009a2', 'numeracion-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009a3', 'numeracion-c@ejemplo.com', '{"invitado": true}');
update public.leads_campos set requerido = false where requerido;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009a1', (select id from public.roles where clave = 'asesor'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009a2', (select id from public.roles where clave = 'asesor'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009a3', (select id from public.roles where clave = 'asesor'), true);
end $$;
reset role;

-- @test numeración (9f-2): consecutiva por creador, sin hueco tras un fallo, sin número sin creador y nunca se reutiliza
create or replace function pg_temp.como_n(p_quien uuid, p_sql text) returns jsonb language plpgsql as $$
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
create or replace function pg_temp.alta(p_quien uuid, p_nombre text, p_tel text, p_id uuid default gen_random_uuid(), p_extra text default '') returns jsonb language sql as $$
  select pg_temp.como_n(p_quien, format('select public.crear_lead(%L, %L::jsonb, null)', p_id,
    format('{"nombre": %s, "telefono_principal": %s, "origen_lead_id": %s%s}', to_json(p_nombre), to_json(p_tel),
           to_json((select id from public.origenes_lead where clave = 'web')), p_extra)));
$$;
create or replace function pg_temp.propio(p_lead uuid) returns integer language sql as $$
  select numero_propio from public.leads where id = p_lead;
$$;
create or replace function pg_temp.ultimo(p_quien uuid) returns integer language sql as $$
  select ultimo from public.leads_contadores where usuario_id = p_quien;
$$;
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009a1'; b constant uuid := '00000000-0000-0000-0000-0000000009a2';
  r jsonb; v_a1 uuid; v_a2 uuid; v_a3 uuid; v_b1 uuid; v_b2 uuid; v_repe uuid := gen_random_uuid(); v_sin uuid; v_n int;
begin
  -- Cada creador cuenta lo suyo, desde 1.
  v_a1 := (pg_temp.alta(a, 'Num A1', '78500001') ->> 'id')::uuid;
  v_a2 := (pg_temp.alta(a, 'Num A2', '78500002') ->> 'id')::uuid;
  v_b1 := (pg_temp.alta(b, 'Num B1', '78500003') ->> 'id')::uuid;
  v_a3 := (pg_temp.alta(a, 'Num A3', '78500004') ->> 'id')::uuid;
  v_b2 := (pg_temp.alta(b, 'Num B2', '78500005') ->> 'id')::uuid;
  if (pg_temp.propio(v_a1), pg_temp.propio(v_a2), pg_temp.propio(v_a3)) is distinct from (1, 2, 3) then
    raise exception 'A: % % %', pg_temp.propio(v_a1), pg_temp.propio(v_a2), pg_temp.propio(v_a3); end if;
  if (pg_temp.propio(v_b1), pg_temp.propio(v_b2)) is distinct from (1, 2) then
    raise exception 'B: % %', pg_temp.propio(v_b1), pg_temp.propio(v_b2); end if;
  if pg_temp.ultimo(a) <> 3 or pg_temp.ultimo(b) <> 2 then raise exception 'los contadores: % %', pg_temp.ultimo(a), pg_temp.ultimo(b); end if;
  -- El global sigue su propia cuenta: el número de un lead no depende del creador.
  if (select count(distinct numero) from public.leads where id in (v_a1, v_a2, v_a3, v_b1, v_b2)) <> 5 then raise exception 'globales repetidos'; end if;

  -- Un alta que falla (un atributo que no existe) no consume número: el contador vuelve atrás con ella.
  begin
    perform pg_temp.alta(a, 'Num falla', '78500006', gen_random_uuid(), ', "atributos": {"no_existe": 1}');
    raise exception 'el alta con un atributo inexistente entró';
  exception when others then
    if sqlerrm like 'el alta con un atributo%' then raise; end if;
  end;
  if pg_temp.ultimo(a) <> 3 then raise exception 'un alta que falló dejó un hueco: último = %', pg_temp.ultimo(a); end if;
  -- Un reintento con el mismo id (se perdió la respuesta) devuelve lo mismo y no gasta otro número.
  r := pg_temp.alta(a, 'Num A4', '78500007', v_repe);
  r := pg_temp.alta(a, 'Num A4', '78500007', v_repe);
  if not (r ->> 'repetido')::boolean then raise exception 'el reintento no fue repetido: %', r; end if;
  if pg_temp.propio(v_repe) <> 4 or pg_temp.ultimo(a) <> 4 then raise exception 'el reintento gastó número: % %', pg_temp.propio(v_repe), pg_temp.ultimo(a); end if;

  -- Un lead sin creador (la web, un creador que ya no está) no lleva número propio, y sí global.
  insert into public.leads (nombre, telefono_principal, creado_por) values ('Num sin creador', '59178500099', null) returning id into v_sin;
  if pg_temp.propio(v_sin) is not null then raise exception 'un lead sin creador lleva número propio'; end if;
  if not exists (select 1 from public.leads_numeros_globales where lead_id = v_sin) then raise exception 'sin copia del número global'; end if;
  if exists (select 1 from public.leads_numeros_propios where lead_id = v_sin) then raise exception 'sin creador y con copia del número propio'; end if;

  -- Transferir no cambia el número propio ni su creador: es de quien creó el lead.
  perform pg_temp.como_n(a, format('select public.lead_transferir(%L, %L, %L)', v_a1, b, a));
  if pg_temp.propio(v_a1) <> 1 or (select creado_por from public.leads where id = v_a1) <> a
     or (select creado_por from public.leads_numeros_propios where lead_id = v_a1) <> a then
    raise exception 'transferir cambió el número propio o su creador'; end if;
  if not exists (select 1 from public.leads_asesores where lead_id = v_a1 and usuario_id = b and tipo_acceso = 'dueno' and revocado_en is null) then
    raise exception 'la transferencia no pasó'; end if;

  -- El creador desaparece (creado_por nulo): el número se conserva, también su copia con quién fue, y el contador no se toca.
  update public.leads set creado_por = null where id = v_a2;
  if pg_temp.propio(v_a2) <> 2 or (select creado_por from public.leads_numeros_propios where lead_id = v_a2) <> a then
    raise exception 'el número no se conservó al quedar sin creador'; end if;

  -- Purgar un lead borra sus copias, pero el contador no baja: el número nunca se reutiliza.
  delete from public.leads where id = v_repe;
  if exists (select 1 from public.leads_numeros_globales where lead_id = v_repe) or exists (select 1 from public.leads_numeros_propios where lead_id = v_repe) then
    raise exception 'las copias de un lead purgado siguen'; end if;
  v_n := pg_temp.propio((pg_temp.alta(a, 'Num A5', '78500008') ->> 'id')::uuid);
  if v_n <> 5 then raise exception 'se reutilizó un número: el siguiente fue %', v_n; end if;

  -- Inmutable: ni siquiera quien tiene derechos sobre la tabla lo cambia sin la excepción interna.
  begin
    update public.leads set numero_propio = 99 where id = v_a3;
    raise exception 'cambió el número propio';
  exception when others then
    if sqlstate <> '42501' or sqlerrm not like '%no cambia%' then raise exception 'debía ser 42501 «no cambia», fue % %', sqlstate, sqlerrm; end if;
  end;
  begin
    update public.leads set numero_propio = 3 where id = v_a1;  -- el de otro lead de A
    raise exception 'cambió el número propio';
  exception when others then
    if sqlstate <> '42501' then raise exception 'otro estado: % %', sqlstate, sqlerrm; end if;
  end;

  -- Las copias son exactamente los leads: ninguno sin copia global, y propia sólo con creador (o que lo tuvo).
  if (select count(*) from public.leads) <> (select count(*) from public.leads_numeros_globales) then
    raise exception 'copias globales: % de %', (select count(*) from public.leads_numeros_globales), (select count(*) from public.leads); end if;
  if (select count(*) from public.leads where numero_propio is not null) <> (select count(*) from public.leads_numeros_propios) then
    raise exception 'copias propias: % de %', (select count(*) from public.leads_numeros_propios), (select count(*) from public.leads where numero_propio is not null); end if;
  if exists (select 1 from public.leads l join public.leads_numeros_globales g on g.lead_id = l.id where g.numero <> l.numero) then
    raise exception 'una copia global difiere'; end if;
  if exists (select 1 from public.leads l join public.leads_numeros_propios p on p.lead_id = l.id where p.numero <> l.numero_propio) then
    raise exception 'una copia propia difiere'; end if;
end $$;

-- @test numeración (9f-2): el relleno de lo que ya existía, por creador, en el orden creado_en, id
do $$
declare
  c constant uuid := '00000000-0000-0000-0000-0000000009a3';
  r record; v_otros text[];
begin
  -- Insertados sin triggers (como estaban antes de la 9f-2): sin número y con las fechas al revés del orden de inserción;
  -- uno en la papelera cuenta (su número no se reutiliza) y uno sin creador no lleva.
  set local session_replication_role = replica;
  -- Sin triggers tampoco llega el tipo por defecto (`trg_lead_tipo_por_defecto`): se lo da la fila.
  insert into public.leads (id, nombre, telefono_principal, creado_por, creado_en, eliminado_en, tipo_lead_id)
  select x.id::uuid, x.nombre, x.telefono, x.creador, x.creado, x.eliminado, public._tipo_lead_por_defecto() from (values
    ('00000000-0000-4000-8000-0000000fa001', 'Rel 3', '59179100003', c, now() - interval '1 day', null::timestamptz),
    ('00000000-0000-4000-8000-0000000fa002', 'Rel 1', '59179100001', c, now() - interval '3 days', null),
    ('00000000-0000-4000-8000-0000000fa003', 'Rel 4 papelera', '59179100004', c, now() - interval '5 hours', now()),
    ('00000000-0000-4000-8000-0000000fa004', 'Rel 2', '59179100002', c, now() - interval '2 days', null),
    ('00000000-0000-4000-8000-0000000fa005', 'Rel sin creador', '59179100005', null, now() - interval '4 days', null)
  ) as x (id, nombre, telefono, creador, creado, eliminado);
  set local session_replication_role = origin;
  if (select count(*) from public.leads where nombre like 'Rel %' and numero_propio is not null) <> 0 then raise exception 'ya traían número'; end if;
  if exists (select 1 from public.leads_numeros_globales where lead_id::text like '00000000-0000-4000-8000-0000000fa00%') then raise exception 'ya traían copia'; end if;

  perform public._leads_numerar_existentes();
  -- «Rel 1» es el más viejo de C, «Rel 4 papelera» el más nuevo: el número sale del orden, no del nombre ni de la inserción.
  for r in select nombre, numero_propio from public.leads where creado_por = c and nombre like 'Rel %' loop
    if r.numero_propio is distinct from substring(r.nombre from 'Rel (\d)')::int then
      raise exception 'el orden de la numeración: % tiene %', r.nombre, r.numero_propio; end if;
  end loop;
  if (select numero_propio from public.leads where nombre = 'Rel sin creador') is not null then raise exception 'sin creador y con número'; end if;
  if (select ultimo from public.leads_contadores where usuario_id = c) <> 4 then
    raise exception 'el contador de C: %', (select ultimo from public.leads_contadores where usuario_id = c); end if;
  if (select count(*) from public.leads_numeros_globales g join public.leads l on l.id = g.lead_id where l.nombre like 'Rel %') <> 5
     or (select count(*) from public.leads_numeros_propios p join public.leads l on l.id = p.lead_id where l.nombre like 'Rel %') <> 4 then
    raise exception 'las copias del relleno'; end if;
  -- Idempotente: correrla otra vez no cambia nada.
  select array_agg(l.id::text || ':' || l.numero_propio::text order by l.id) into v_otros from public.leads l
   where l.numero_propio is not null and l.nombre not like 'Rel %';
  perform public._leads_numerar_existentes();
  -- Lo que ya tenía número (también con un hueco por un lead purgado o un creador que se fue) no se mueve.
  if v_otros is distinct from (select array_agg(l.id::text || ':' || l.numero_propio::text order by l.id) from public.leads l
                                where l.numero_propio is not null and l.nombre not like 'Rel %') then
    raise exception 'el relleno renumeró lo que ya tenía número'; end if;
  if (select count(*) from public.leads_numeros_propios where creado_por is null) <> 0 then raise exception 'una copia propia perdió a su creador'; end if;
  if (select ultimo from public.leads_contadores where usuario_id = c) <> 4 or (select count(*) from public.leads_numeros_propios p join public.leads l on l.id = p.lead_id where l.nombre like 'Rel %') <> 4 then
    raise exception 'el relleno no es idempotente'; end if;
  -- Y el siguiente alta de C sigue donde quedó.
  perform set_config('request.jwt.claim.sub', c::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  perform public.crear_lead(gen_random_uuid(), jsonb_build_object('nombre', 'Rel 5 nueva', 'telefono_principal', '78500050', 'origen_lead_id', (select id from public.origenes_lead where clave = 'web')), null);
  reset role;
  if (select numero_propio from public.leads where nombre = 'Rel 5 nueva') <> 5 then raise exception 'el siguiente de C no fue el 5'; end if;
end $$;

-- @test numeración (9f-2): importar reparte los números por orden de fila, sin huecos y sin gastar con un reintento
do $$
declare
  a constant uuid := '00000000-0000-0000-0000-0000000009a1';
  v_imp uuid := gen_random_uuid(); v_ids uuid[] := array(select gen_random_uuid() from generate_series(1, 6));
  v_lote jsonb; r jsonb; v_antes int; v_nums int[]; v_web uuid := (select id from public.origenes_lead where clave = 'web');
begin
  v_antes := (select ultimo from public.leads_contadores where usuario_id = a);
  -- Las filas llegan con los teléfonos al revés (la base inserta en el orden del teléfono: fila 1 es la última en entrar);
  -- la fila 4 es inválida y no consume número.
  v_lote := jsonb_build_array(
    jsonb_build_object('id', v_ids[1], 'fila', 2, 'lead', jsonb_build_object('nombre', 'Imp F2', 'telefono_principal', '78600006', 'origen_lead_id', v_web)),
    jsonb_build_object('id', v_ids[2], 'fila', 3, 'lead', jsonb_build_object('nombre', 'Imp F3', 'telefono_principal', '78600005', 'origen_lead_id', v_web)),
    jsonb_build_object('id', v_ids[3], 'fila', 4, 'lead', jsonb_build_object('nombre', '', 'telefono_principal', '78600004', 'origen_lead_id', v_web)),
    jsonb_build_object('id', v_ids[4], 'fila', 5, 'lead', jsonb_build_object('nombre', 'Imp F5', 'telefono_principal', '78600003', 'origen_lead_id', v_web)),
    jsonb_build_object('id', v_ids[5], 'fila', 6, 'lead', jsonb_build_object('nombre', 'Imp F6', 'telefono_principal', '78600002', 'origen_lead_id', v_web)),
    jsonb_build_object('id', v_ids[6], 'fila', 7, 'lead', jsonb_build_object('nombre', 'Imp F7', 'telefono_principal', '78600001', 'origen_lead_id', v_web)));
  r := pg_temp.como_n(a, format('select public.leads_importar_lote(%L, 6, %L)', v_imp, v_lote));
  if (select count(*) from jsonb_array_elements(r -> 'filas') e where e ->> 'resultado' = 'creado') <> 5 then raise exception 'creadas: %', r; end if;
  if (select ultimo from public.leads_contadores where usuario_id = a) <> v_antes + 5 then
    raise exception 'la fila inválida dejó un hueco o faltó contar: % → %', v_antes, (select ultimo from public.leads_contadores where usuario_id = a); end if;
  -- Por orden de fila: F2, F3, F5, F6, F7 llevan v_antes+1 … v_antes+5.
  select array_agg(l.numero_propio order by (e ->> 'fila')::int) into v_nums
    from jsonb_array_elements(r -> 'filas') e join public.leads l on l.id = (e ->> 'id')::uuid where e ->> 'resultado' = 'creado';
  if v_nums is distinct from array[v_antes + 1, v_antes + 2, v_antes + 3, v_antes + 4, v_antes + 5] then
    raise exception 'los números por fila: % (esperaba % a %)', v_nums, v_antes + 1, v_antes + 5; end if;
  -- La copia que se lee sigue al renumerado.
  if exists (select 1 from public.leads l join public.leads_numeros_propios p on p.lead_id = l.id where l.id = any (v_ids) and p.numero <> l.numero_propio) then
    raise exception 'la copia propia no siguió al renumerado'; end if;
  -- Un reintento (se perdió la respuesta): todo vuelve repetido, los números no se mueven y no se gasta otro.
  r := pg_temp.como_n(a, format('select public.leads_importar_lote(%L, 6, %L)', v_imp, v_lote));
  if (select count(*) from jsonb_array_elements(r -> 'filas') e where (e ->> 'repetido')::boolean) <> 5 then raise exception 'el reintento: %', r; end if;
  if (select ultimo from public.leads_contadores where usuario_id = a) <> v_antes + 5 then raise exception 'el reintento gastó números'; end if;
  if (select array_agg(l.numero_propio order by l.numero_propio) from public.leads l where l.id = any (v_ids)) is distinct from
     array[v_antes + 1, v_antes + 2, v_antes + 3, v_antes + 4, v_antes + 5] then raise exception 'el reintento movió los números'; end if;
end $$;

-- @test numeración (9f-2): el permiso del número global existe, con su punto de enforcement, y se concede por defecto sólo al dueño
do $$
begin
  if not exists (select 1 from public.permisos where clave = 'leads.numero_global.ver' and modulo = 'leads' and not por_origen and not con_alcance
                   and aplicado_en like '%leads_numeros_globales%') then raise exception 'el permiso no está en el catálogo'; end if;
  if not exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id where r.clave = 'dueno' and rp.permiso_clave = 'leads.numero_global.ver') then
    raise exception 'el dueño no lo tiene'; end if;
  if exists (select 1 from public.roles_permisos rp join public.roles r on r.id = rp.rol_id where r.clave in ('asesor', 'logistica', 'repuestos') and rp.permiso_clave = 'leads.numero_global.ver') then
    raise exception 'un rol de propios lo recibió'; end if;
end $$;
