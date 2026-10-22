-- @test equipo_lista: las personas de prueba y el estado de cada una (espejo de estadoDePersona)
-- La lista del equipo con tope (`equipo_lista()`, migración 20261019004100, `docs/PLAN.md` 5a-21). Este archivo siembra sus propias personas («Eql …») y
-- las borra en el último bloque. `_estado_de_persona()` es el espejo de `estadoDePersona()` (`entities/persona.ts`): baja > bloqueada > invitación pendiente > activa.
--   a  invitada, sin aceptar          → invitacion_pendiente      d  bloqueada                   → bloqueada
--   b  invitada y aceptada            → activa                    e  de baja                     → baja
--   c  invitada, aceptada y bloqueada                 → bloqueada                 f  de baja y bloqueada         → baja (la baja gana)
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000e1a', 'eql-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000e1b', 'eql-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000e1c', 'eql-c@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000e1d', 'eql-d@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000e1e', 'eql-e@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000e1f', 'eql-f@ejemplo.com', '{"invitado": true}');
update public.perfiles set invitacion_aceptada_en = now() where id in ('00000000-0000-0000-0000-000000000e1b', '00000000-0000-0000-0000-000000000e1c');
update public.perfiles set bloqueado = true, bloqueado_en = now() where id in ('00000000-0000-0000-0000-000000000e1c', '00000000-0000-0000-0000-000000000e1d', '00000000-0000-0000-0000-000000000e1f');
update public.perfiles set activo = false, baja_en = now() where id in ('00000000-0000-0000-0000-000000000e1e', '00000000-0000-0000-0000-000000000e1f');
do $$
declare r record;
begin
  for r in select * from (values
      ('00000000-0000-0000-0000-000000000e1a'::uuid, 'invitacion_pendiente'), ('00000000-0000-0000-0000-000000000e1b', 'activa'),
      ('00000000-0000-0000-0000-000000000e1c', 'bloqueada'), ('00000000-0000-0000-0000-000000000e1d', 'bloqueada'),
      ('00000000-0000-0000-0000-000000000e1e', 'baja'), ('00000000-0000-0000-0000-000000000e1f', 'baja')) x (id, esperado) loop
    if (select public._estado_de_persona(activo, bloqueado, invitado_en, invitacion_aceptada_en) from public.perfiles where id = r.id) is distinct from r.esperado then
      raise exception 'el estado de % no es %', r.id, r.esperado;
    end if;
  end loop;
end $$;

-- @test equipo_lista: sin permiso, anónimo y estado inválido
-- Quien no ve al equipo (ni `equipo.usuarios.ver` ni `.gestionar`) recibe 42501; `anon` ni siquiera puede llamarla; un estado que no existe, 22023.
do $$
declare
  v_duena uuid := (select ur.usuario_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id
                    where r.clave = 'dueno' and ur.usuario_id not in (select id from public.perfiles where nombre like 'Eql %') limit 1);
  v_sin uuid := '00000000-0000-0000-0000-000000000e1a';
  v_codigo text;
begin
  if v_duena is null then raise exception 'no hay una dueña para probar'; end if;
  -- Una cuenta sin rol: no tiene ningún permiso.
  perform set_config('request.jwt.claim.sub', v_sin::text, true);
  set local role authenticated;
  begin
    perform * from public.equipo_lista();
    raise exception 'una cuenta sin permiso vio al equipo';
  exception when insufficient_privilege then v_codigo := 'ok';
  end;
  reset role;
  if v_codigo is distinct from 'ok' then raise exception 'el error de una cuenta sin permiso no es 42501'; end if;

  set local role anon;
  v_codigo := null;
  begin
    perform * from public.equipo_lista();
    raise exception 'anon vio al equipo';
  exception when insufficient_privilege then v_codigo := 'ok';
  end;
  reset role;
  if v_codigo is distinct from 'ok' then raise exception 'anon no recibió 42501'; end if;

  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  v_codigo := null;
  begin
    perform * from public.equipo_lista(null, 'inventado');
    raise exception 'un estado inventado devolvió filas';
  exception when invalid_parameter_value then v_codigo := 'ok';
  end;
  reset role;
  if v_codigo is distinct from 'ok' then raise exception 'un estado inválido no dio 22023'; end if;
  -- Nulos: sin texto ni estado es «En el equipo» y el límite nulo es el de siempre.
  set local role authenticated;
  if (select count(*) from public.equipo_lista(null, null, null)) < 1 then raise exception 'sin parámetros no devolvió al equipo'; end if;
  reset role;
end $$;

-- @test equipo_lista: el orden, el límite de 101 y el desempate entre nombres repetidos
-- 150 personas «Eql NNN» y tres con el mismo nombre que la 099. El orden es (nombre, correo, id) y no depende de en qué orden se leyó; el límite lo acota la base
-- aunque el cliente pida 100.000 o 0 o nada.
insert into auth.users (id, email, raw_app_meta_data)
select ('00000000-0000-0000-0000-00000000' || lpad(to_hex(4096 + n), 4, '0'))::uuid, 'eql-' || lpad(n::text, 3, '0') || '@ejemplo.com', '{"invitado": true}'
  from generate_series(1, 150) n;
update public.perfiles set nombre = 'Eql ' || lpad(substr(email::text, 5, 3), 3, '0') where email::text like 'eql-___@ejemplo.com';
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000d01', 'eql-099-b@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000d02', 'eql-099-a@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000d03', 'eql-099-c@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Eql 099' where id in ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-000000000d03');
do $$
declare
  v_duena uuid := (select ur.usuario_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' limit 1);
  v_ids uuid[]; v_esperado uuid[]; v_n int;
begin
  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  -- Con texto, todas las «Eql» vigentes (150 + 3) → corta en 101 y son las primeras en el orden de la base.
  select array_agg(i) into v_ids from public.equipo_lista('eql ', 'vigentes', 101) i;
  reset role;
  select array_agg(id order by nombre, email, id) into v_esperado
    from (select id, nombre, email from public.perfiles where activo and nombre like 'Eql %' order by nombre, email, id limit 101) x;
  if cardinality(v_ids) <> 101 then raise exception 'el tope no es 101: %', cardinality(v_ids); end if;
  if v_ids is distinct from v_esperado then raise exception 'el orden de equipo_lista no es (nombre, correo, id)'; end if;

  -- «Eql 099» está cuatro veces (la 099 y tres más): el orden entre ellas es el del correo y después el del id, el mismo en toda lectura.
  if (select count(*) from public.perfiles where nombre = 'Eql 099') <> 4 then raise exception 'faltan las repetidas'; end if;

  -- El cliente no manda el límite: 100.000, 0, -5 o nada se acotan.
  set local role authenticated;
  select count(*) into v_n from public.equipo_lista('eql ', 'vigentes', 100000);
  if v_n <> 101 then raise exception 'un límite de 100.000 devolvió %', v_n; end if;
  select count(*) into v_n from public.equipo_lista('eql ', 'vigentes', 0);
  if v_n <> 1 then raise exception 'un límite de 0 devolvió % (se acota a 1)', v_n; end if;
  select count(*) into v_n from public.equipo_lista('eql ', 'vigentes', -5);
  if v_n <> 1 then raise exception 'un límite negativo devolvió %', v_n; end if;
  select count(*) into v_n from public.equipo_lista('eql ', 'vigentes', null);
  if v_n <> 101 then raise exception 'un límite nulo devolvió %', v_n; end if;
  -- Un límite chico es el chico.
  select count(*) into v_n from public.equipo_lista('eql ', 'vigentes', 7);
  if v_n <> 7 then raise exception 'un límite de 7 devolvió %', v_n; end if;
  reset role;
end $$;

-- @test equipo_lista: las tildes y las mayúsculas no cuentan, ni en el nombre ni en el correo
-- «jose» encuentra «José», «NUNEZ» a «Núñez», «nandu» a «Ñandú» y al revés (con tilde busca lo que no la tiene): lo mismo que hacía el filtro del cliente.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000c01', 'eql-tilde-1@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000c02', 'eql-tilde-2@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000c03', 'eql-tilde-3@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000c04', 'ÁNGEL-eql@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'José Núñez Eqltilde' where id = '00000000-0000-0000-0000-000000000c01';
update public.perfiles set nombre = 'JOSE PEREZ EQLTILDE' where id = '00000000-0000-0000-0000-000000000c02';
update public.perfiles set nombre = 'Ñandú Gómez Eqltilde' where id = '00000000-0000-0000-0000-000000000c03';
update public.perfiles set nombre = 'Angel Sin Tilde Eqltilde' where id = '00000000-0000-0000-0000-000000000c04';
do $$
declare
  v_duena uuid := (select ur.usuario_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' limit 1);
  r record; v_ids text[];
begin
  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  for r in select * from (values
      ('jose', array['c01', 'c02']), ('JOSÉ', array['c01', 'c02']), ('nunez', array['c01']), ('NÚÑEZ eqltilde', array['c01']), ('nandu', array['c03']),
      ('ñandú', array['c03']), ('ñand', array['c03']), ('gomez', array['c03']), ('jose perez', array['c02']),
      ('angel', array['c04']), ('ángel', array['c04']), ('eql-tilde-1', array['c01']), ('TILDE-2@', array['c02']),
      ('  jose  ', array['c01', 'c02']), ('zzz-nada', array[]::text[])) x (q, esperados) loop
    select coalesce(array_agg(right(i::text, 3) order by i), '{}') into v_ids from public.equipo_lista(r.q, 'vigentes', 101) i
      where i in (select p.id from public.perfiles p where p.nombre like '%Eqltilde' or p.email::text like '%eql%');
    if v_ids is distinct from (select coalesce(array_agg(e order by e), '{}') from unnest(r.esperados) e) then
      raise exception 'la búsqueda «%» devolvió % y se esperaba %', r.q, v_ids, r.esperados;
    end if;
  end loop;
  reset role;
end $$;

-- @test equipo_lista: lo escrito es literal (comodines, barra, comillas)
-- `%` y `_` son comodines de `like`, `\` su escape: buscar «50% desc_uento» encuentra esa persona y no otras. Las comillas no rompen la consulta (el texto entra como literal).
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000b01', 'eql-com-1@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-000000000b02', 'eql-com-2@ejemplo.com', '{"invitado": true}');
update public.perfiles set nombre = 'Eql 50% desc_uento \ d"q ''x' where id = '00000000-0000-0000-0000-000000000b01';
update public.perfiles set nombre = 'Eql 50X descXuento / d q x' where id = '00000000-0000-0000-0000-000000000b02';
do $$
declare
  v_duena uuid := (select ur.usuario_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' limit 1);
  r record; v_n int;
begin
  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  -- Cada búsqueda trae sólo a la de los comodines (la otra tiene X y «/» donde esta tiene %, _ y \). Todas tienen un tramo de 3 letras o dígitos: sin él
  -- el texto no filtra (5a-31, abajo).
  for r in select * from (values ('50% desc'), ('desc_uento'), ('Eql 50%'), ('desc_'), ('_uento'), ('uento \'), ('uento \ d"q'), ('uento \ d"q ''x')) x (q) loop
    if not exists (select 1 from public.equipo_lista(r.q) i where i = '00000000-0000-0000-0000-000000000b01') then
      raise exception 'la búsqueda «%» no encontró a la persona de los comodines', r.q;
    end if;
    if exists (select 1 from public.equipo_lista(r.q) i where i = '00000000-0000-0000-0000-000000000b02') then
      raise exception 'la búsqueda «%» trajo a la persona que no tiene esos caracteres: un comodín se interpretó', r.q;
    end if;
    -- Lo que devuelve lo contiene tal cual (sin tildes ni mayúsculas): ningún % o _ hizo de comodín.
    select count(*) into v_n from public.equipo_lista(r.q, 'vigentes', 101) i join public.perfiles p on p.id = i
      where position(public._sin_tildes(r.q) in public._sin_tildes(p.nombre || ' ' || coalesce(p.email::text, ''))) = 0;
    if v_n > 0 then raise exception 'la búsqueda «%» trajo % personas que no contienen el texto', r.q, v_n; end if;
  end loop;
  -- Escritos como comodines no encuentran a «Eql 001»: `_` no es un carácter cualquiera y `%` no es «cualquier cosa».
  if exists (select 1 from public.equipo_lista('Eql_001')) then raise exception '«Eql_001» encontró algo: el _ hizo de comodín'; end if;
  if exists (select 1 from public.equipo_lista('Eql%001')) then raise exception '«Eql%%001» encontró algo: el %% hizo de comodín'; end if;
  -- 5a-31: un comodín, una barra o una comilla sueltos (sin tramo de 3) no filtran: la lista sin texto, sin error.
  for r in select * from (values ('%'), ('_'), ('\'), ('"'), (''''), ('d"q ''x'), ('\ d"q'), ('c_u')) x (q) loop
    if (select array_agg(i) from public.equipo_lista(r.q) i) is distinct from (select array_agg(i) from public.equipo_lista(null) i) then
      raise exception '«%» (sin tramo de 3) no devolvió la lista sin filtro de texto', r.q;
    end if;
  end loop;
  reset role;
end $$;

-- @test equipo_lista: cada estado trae sólo a los suyos, solo o con un texto
do $$
declare
  v_duena uuid := (select ur.usuario_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' limit 1);
  e text; v_malas int;
begin
  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  foreach e in array array['activa', 'invitacion_pendiente', 'bloqueada', 'baja'] loop
    select count(*) into v_malas from public.equipo_lista(null, e, 101) i join public.perfiles p on p.id = i
      where public._estado_de_persona(p.activo, p.bloqueado, p.invitado_en, p.invitacion_aceptada_en) <> e;
    if v_malas > 0 then raise exception 'el estado % trajo % personas de otro estado', e, v_malas; end if;
    if not exists (select 1 from public.equipo_lista(null, e, 101)) then raise exception 'el estado % no trajo a nadie', e; end if;
  end loop;
  -- «En el equipo» = todas menos las dadas de baja.
  if exists (select 1 from public.equipo_lista(null, 'vigentes', 101) i join public.perfiles p on p.id = i where not p.activo) then
    raise exception '«vigentes» trajo a alguien dado de baja';
  end if;
  if not exists (select 1 from public.equipo_lista(null, 'baja', 101) i where i = '00000000-0000-0000-0000-000000000e1e') then raise exception '«baja» no trajo a la persona e'; end if;
  if not exists (select 1 from public.equipo_lista(null, 'baja', 101) i where i = '00000000-0000-0000-0000-000000000e1f') then raise exception '«baja» no trajo a la persona f (de baja y bloqueada)'; end if;
  if exists (select 1 from public.equipo_lista(null, 'bloqueada', 101) i where i = '00000000-0000-0000-0000-000000000e1f') then raise exception '«bloqueada» trajo a la dada de baja'; end if;
  -- Estado y texto a la vez.
  if (select count(*) from public.equipo_lista('eql-d@', 'bloqueada', 101)) <> 1 then raise exception 'estado + texto no encontró a la bloqueada «eql-d»'; end if;
  if (select count(*) from public.equipo_lista('eql-d@', 'activa', 101)) <> 0 then raise exception 'estado + texto trajo a una bloqueada como «activa»'; end if;
  reset role;
end $$;

-- @test equipo_lista: las tres consultas (recorrer, índice, todo) dan lo que la consulta directa
-- Cada etapa es una consulta distinta; las tres, para el mismo texto y estado, tienen que dar los mismos ids que la consulta más simple (`like` sobre el texto sin tildes,
-- en el orden de la lista): es lo que hace que ir de una a otra, según cuánto coincide, no cambie lo que se ve.
create or replace function pg_temp.ids_de(p_sql text) returns uuid[] language plpgsql as $$
declare v uuid[];
begin
  execute 'select coalesce(array_agg(x.id), ''{}'') from (' || p_sql || ') x' into v;
  return v;
end $$;
do $$
declare
  r record; v_oraculo uuid[]; v_w uuid[];
begin
  for r in select * from (values ('eql', 'vigentes'), ('jose', 'vigentes'), ('nunez', 'vigentes'), ('50%', 'vigentes'), ('desc_', 'vigentes'), ('\', 'vigentes'),
                                 ('"', 'vigentes'), ('eql-d@', 'bloqueada'), ('eql', 'baja'), ('eql', 'invitacion_pendiente'), ('zzz-nada', 'vigentes'), ('099', 'vigentes'),
                                 ('ñand', 'activa'), ('ejemplo', 'vigentes')) x (q, e) loop
    select coalesce(array_agg(o.id order by o.nombre, o.email, o.id), '{}') into v_oraculo from (
      select p.id, p.nombre, p.email from public.perfiles p
       where (case r.e when 'vigentes' then p.activo else public._estado_de_persona(p.activo, p.bloqueado, p.invitado_en, p.invitacion_aceptada_en) = r.e end)
         and strpos(public._sin_tildes(p.nombre || ' ' || coalesce(p.email::text, '')), public._sin_tildes(r.q)) > 0
       order by p.nombre, p.email, p.id limit 101) o;
    if pg_temp.ids_de(public._equipo_lista_sql(r.q, r.e, 101, 'indice')) is distinct from v_oraculo then raise exception 'la etapa «índice» de «%» (%) no da lo de la consulta directa', r.q, r.e; end if;
    if pg_temp.ids_de(public._equipo_lista_sql(r.q, r.e, 101, 'todo')) is distinct from v_oraculo then raise exception 'la etapa «todo» de «%» (%) no da lo de la consulta directa', r.q, r.e; end if;
    execute public._equipo_lista_sql(r.q, r.e, 101, 'recorrer') into v_w;
    if v_w is distinct from v_oraculo then raise exception 'la etapa «recorrer» de «%» (%) no da lo de la consulta directa', r.q, r.e; end if;
  end loop;
end $$;

-- @test equipo_lista: pasada la recorrida (más de 2.000 personas) el texto se busca por el índice, y da lo mismo que recorriendo todo
-- 2.600 personas «Zeql NNNN» insertadas por conjunto (sin los triggers: no es lo que se prueba) y una «Zeql Rara» que ordena DESPUÉS de todas: la etapa de recorrer
-- (las primeras 2.000 en el orden) no la ve; la del índice sí. Un texto común sigue resolviéndose en la recorrida.
do $$
declare
  v_duena uuid := (select ur.usuario_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where r.clave = 'dueno' limit 1);
  v_ids uuid[]; v_n int;
begin
  set local session_replication_role = replica;
  insert into public.perfiles (id, nombre, email, activo)
  select ('00000000-0000-0000-0000-' || lpad(to_hex(2000000 + g), 12, '0'))::uuid, 'Zeql ' || lpad(g::text, 4, '0'), 'zeql' || g || '@ejemplo.com', true
    from generate_series(1, 2600) g;
  insert into public.perfiles (id, nombre, email, activo) values ('00000000-0000-0000-0000-000000ffffff', 'Zeql ZZZ Rara Ñoño', 'zeql-rara@ejemplo.com', true);
  set local session_replication_role = origin;
  analyze public.perfiles;

  -- La recorrida de las primeras 2.000 no la ve.
  execute public._equipo_lista_sql('zzz rara', 'vigentes', 101, 'recorrer') into v_ids;
  if cardinality(v_ids) <> 0 then raise exception 'la recorrida no debería ver a la persona que ordena después de las primeras % (vio %)', public._equipo_lista_recorrido(), cardinality(v_ids); end if;

  perform set_config('request.jwt.claim.sub', v_duena::text, true);
  set local role authenticated;
  -- …y la RPC la encuentra, con tildes y sin ellas, por el índice.
  if (select array_agg(i) from public.equipo_lista('ZZZ rara nono', 'vigentes', 101) i) is distinct from array['00000000-0000-0000-0000-000000ffffff'::uuid] then raise exception 'la RPC no encontró a la persona que ordena después de la recorrida'; end if;
  if (select array_agg(i) from public.equipo_lista('zeql-rara@', 'vigentes', 101) i) is distinct from array['00000000-0000-0000-0000-000000ffffff'::uuid] then raise exception 'la RPC no la encontró por el correo'; end if;
  -- Un texto común (juntaría 101 enseguida) y uno que coincide con las 2.601 devuelven el tope, el mismo que la consulta directa.
  select count(*) into v_n from public.equipo_lista('zeql', 'vigentes', 101);
  if v_n <> 101 then raise exception '«zeql» devolvió % y se esperaba el tope (101)', v_n; end if;
  reset role;
  if (select array_agg(i) from (select p.id i from public.perfiles p where p.activo and p.nombre like 'Zeql%' order by p.nombre, p.email, p.id limit 101) x)
       is distinct from (select array_agg(i) from (select i from public.equipo_lista('zeql', 'vigentes', 101) i) y) then
    raise exception '«zeql» no devolvió las primeras 101 en el orden de la lista';
  end if;
  -- 5a-31: un texto sin tramo de 3 letras o dígitos seguidos («ño» → «no», «zq», «a b c», «%») no filtra: la RPC devuelve la lista sin texto, la
  -- misma que `equipo_lista(null, …)` (como el buscador de leads, `cumpleElMinimo`). Antes caminaba el orden entero buscándolo (172 ms con 100.000).
  declare
    v_sin_texto uuid[] := (select array_agg(i) from public.equipo_lista(null, 'vigentes', 101) i);
    v_corto text;
  begin
    if cardinality(v_sin_texto) <> 101 then raise exception 'sin texto se esperaba el tope (101) y llegaron %', cardinality(v_sin_texto); end if;
    foreach v_corto in array array['ño', 'zq', 'a', 'jo', 'a b c', '%', ' z q '] loop
      if (select array_agg(i) from public.equipo_lista(v_corto, 'vigentes', 101) i) is distinct from v_sin_texto then
        raise exception '«%» (sin tramo de 3) no devolvió la lista sin filtro de texto', v_corto;
      end if;
    end loop;
    -- Con el estado, también: el texto corto no cambia lo que dice el estado.
    if (select array_agg(i) from public.equipo_lista('zq', 'invitacion_pendiente', 101) i)
         is distinct from (select array_agg(i) from public.equipo_lista(null, 'invitacion_pendiente', 101) i) then
      raise exception '«zq» con un estado no devolvió lo mismo que sin texto';
    end if;
  end;
  reset role;
  set local session_replication_role = replica;
  delete from public.perfiles where id = '00000000-0000-0000-0000-000000ffffff' or id::text like '00000000-0000-0000-0000-0000001%' or id::text like '00000000-0000-0000-0000-0000002%';
  set local session_replication_role = origin;
end $$;

-- @test equipo_lista: se limpian las personas de prueba
delete from auth.users where email::text like 'eql-%' or email::text like 'ÁNGEL-eql@%';
do $$ begin
  if exists (select 1 from public.perfiles where nombre like 'Eql %' or nombre like '%Eqltilde' or email::text like 'eql-%') then raise exception 'quedaron personas de prueba'; end if;
end $$;
