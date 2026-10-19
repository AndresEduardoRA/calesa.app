-- @test número-busqueda: las personas
-- Buscar un número de lead (`leads_ids_del_numero`): con `leads.numero_global.ver`, el global y también el propio de cualquier creador, de los leads
-- que la persona ya ve; sin él, sólo el propio de quien busca. Acá el caso de Berta (propio 30, global otro) con la dueña y con quien no tiene el permiso,
-- los números imposibles, dos creadores con el mismo propio, la papelera, el limbo, una baja y el permiso concedido y quitado con la sesión abierta.
-- La policy de las dos copias es la regla; esta prueba la cuida desde la función.
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-0000000009b1', 'busqueda-berta@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009b2', 'busqueda-carlos@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009b3', 'busqueda-diego@ejemplo.com', '{"invitado": true}'),
  ('00000000-0000-0000-0000-0000000009b4', 'busqueda-eva@ejemplo.com', '{"invitado": true}');
update public.leads_campos set requerido = false where requerido;
update public.perfiles set nombre = 'Berta Búsqueda' where id = '00000000-0000-0000-0000-0000000009b1';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;
do $$ begin
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009b1', (select id from public.roles where clave = 'asesor'), true);
  perform public.rbac_asignar_rol('00000000-0000-0000-0000-0000000009b2', (select id from public.roles where clave = 'asesor'), true);
end $$;
reset role;
-- Diego ve «todos» y tiene el permiso; Eva ve «propios» y lo tiene.
insert into public.roles (clave, nombre) values ('nb_todos', 'Búsqueda todos'), ('nb_propios', 'Búsqueda propios');
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, x.p, x.a::public.alcance_permiso from public.roles r join (values
  ('nb_todos', 'leads.ver', 'todos'), ('nb_todos', 'leads.numero_global.ver', 'todos'),
  ('nb_propios', 'leads.ver', 'propios'), ('nb_propios', 'leads.numero_global.ver', 'todos')) x(rol, p, a) on x.rol = r.clave;
insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values
  ('00000000-0000-0000-0000-0000000009b3', (select id from public.roles where clave = 'nb_todos'), true),
  ('00000000-0000-0000-0000-0000000009b4', (select id from public.roles where clave = 'nb_propios'), true);

create or replace function pg_temp.ids(p_quien uuid, p_n bigint, p_todos boolean) returns uuid[] language plpgsql as $$
declare r uuid[];
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.leads_ids_del_numero(p_n, p_todos);
  reset role;
  return r;
exception when others then
  reset role;
  raise;
end $$;
create or replace function pg_temp.alta_b(p_quien uuid, p_nombre text, p_tel text) returns uuid language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
  set local role authenticated;
  r := public.crear_lead(gen_random_uuid(), format('{"nombre": %s, "telefono_principal": %s, "origen_lead_id": %s}', to_json(p_nombre), to_json(p_tel),
         to_json((select id from public.origenes_lead where clave = 'web')))::jsonb, null);
  reset role;
  if r ->> 'id' is null then raise exception 'el alta de % no creó nada: %', p_nombre, r; end if;
  return (r ->> 'id')::uuid;
exception when others then
  reset role;
  raise;
end $$;
-- Otras pruebas dejan sus propios leads (con propios y globales de verdad): quien ve todo no puede esperar una lista exacta. `contiene` pide que
-- estén, `sin` que no estén; `exacto` (quien sólo ve lo suyo) pide ni uno más ni uno menos.
create or replace function pg_temp.verifica(p_que text, p_real uuid[], p_esperado uuid[], p_modo text default 'exacto') returns void language plpgsql as $$
begin
  if p_modo = 'exacto' and (select coalesce(array_agg(x order by x), '{}') from unnest(p_real) x) is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(p_esperado) x) then
    raise exception '%: devolvió % y debía devolver %', p_que, p_real, p_esperado;
  elsif p_modo = 'contiene' and not p_real @> p_esperado then
    raise exception '%: devolvió % y debía incluir %', p_que, p_real, p_esperado;
  elsif p_modo = 'sin' and p_real && p_esperado then
    raise exception '%: devolvió % y no debía incluir %', p_que, p_real, p_esperado;
  end if;
end $$;

-- @test número-busqueda: Berta con propio 30 y global otro, vista por la dueña y por quien no tiene el permiso
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  berta constant uuid := '00000000-0000-0000-0000-0000000009b1'; carlos constant uuid := '00000000-0000-0000-0000-0000000009b2';
  diego constant uuid := '00000000-0000-0000-0000-0000000009b3';
  v_b uuid; v_c uuid; v_gb bigint; v_gc bigint;
begin
  -- Berta llega a su lead 30 (le faltaban 29) y Carlos a su 30: el mismo propio en dos creadores.
  insert into public.leads_contadores (usuario_id, ultimo) values (berta, 29), (carlos, 29) on conflict (usuario_id) do update set ultimo = 29;
  v_b := pg_temp.alta_b(berta, 'Búsqueda de Berta', '78700001');
  v_c := pg_temp.alta_b(carlos, 'Búsqueda de Carlos', '78700002');
  if (select numero_propio from public.leads where id = v_b) <> 30 or (select numero_propio from public.leads where id = v_c) <> 30 then
    raise exception 'el terreno: los propios no son 30'; end if;
  v_gb := (select numero from public.leads where id = v_b); v_gc := (select numero from public.leads where id = v_c);
  if v_gb = 30 or v_gc = 30 or v_gb = v_gc then raise exception 'el terreno: los globales no son distintos de 30 (% %)', v_gb, v_gc; end if;
  perform set_config('nb.b', v_b::text, false); perform set_config('nb.c', v_c::text, false);
  perform set_config('nb.gb', v_gb::text, false); perform set_config('nb.gc', v_gc::text, false);

  -- La dueña (con el permiso) escribe 30: encuentra el lead de Berta **y** el de Carlos, aunque ninguno sea suyo.
  perform pg_temp.verifica('la dueña, 30', pg_temp.ids(duena, 30, true), array[v_b, v_c], 'contiene');
  -- Por el global de Berta, sólo el suyo (como siempre); y el global de Carlos, sólo el de Carlos.
  perform pg_temp.verifica('la dueña, el global de Berta', pg_temp.ids(duena, v_gb, true), array[v_b], 'contiene');
  perform pg_temp.verifica('la dueña, el global de Carlos', pg_temp.ids(duena, v_gc, true), array[v_c], 'contiene');
  -- Con p_todos = false (lo que pide quien no tiene el permiso) la dueña sólo encuentra sus propios: ninguno es 30.
  perform pg_temp.verifica('la dueña sin p_todos', pg_temp.ids(duena, 30, false), array[v_b, v_c], 'sin');
  -- Diego ve «todos» y tiene el permiso: lo mismo que la dueña.
  perform pg_temp.verifica('Diego, 30', pg_temp.ids(diego, 30, true), array[v_b, v_c], 'contiene');

  -- Berta (sin el permiso) escribe 30: su lead, nada más. Pidiendo p_todos = true también: la base contesta como sin permiso.
  perform pg_temp.verifica('Berta, 30', pg_temp.ids(berta, 30, false), array[v_b]);
  perform pg_temp.verifica('Berta, 30 con p_todos', pg_temp.ids(berta, 30, true), array[v_b]);
  perform pg_temp.verifica('Carlos, 30 con p_todos', pg_temp.ids(carlos, 30, true), array[v_c]);
  -- Sin oráculo: ni el global de su lead ni el de otro le devuelven nada; ni el propio de otro creador.
  perform pg_temp.verifica('Berta, su global', pg_temp.ids(berta, v_gb, true), '{}');
  perform pg_temp.verifica('Berta, su global sin p_todos', pg_temp.ids(berta, v_gb, false), '{}');
  perform pg_temp.verifica('Berta, el global de Carlos', pg_temp.ids(berta, v_gc, true), '{}');
  -- Un lead de Carlos compartido con Berta: lo ve, pero su propio 30 es de Carlos y Berta no lo encuentra por 30.
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_c, berta, 'compartido');
  perform pg_temp.verifica('Berta, 30 con un lead compartido de Carlos', pg_temp.ids(berta, 30, true), array[v_b]);
  perform pg_temp.verifica('Berta, el global del compartido', pg_temp.ids(berta, v_gc, true), '{}');
  update public.leads_asesores set revocado_en = now() where lead_id = v_c and usuario_id = berta;
end $$;

-- @test número-busqueda: lo que no es un número que exista no encuentra nada ni falla
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001'; berta constant uuid := '00000000-0000-0000-0000-0000000009b1';
  n bigint;
begin
  foreach n in array array[999999, 0, -1, -5, -9223372036854775807, 2147483647, 2147483648, 4294967297, 9223372036854775807]::bigint[] loop
    perform pg_temp.verifica('la dueña, ' || n, pg_temp.ids(duena, n, true), '{}');
    perform pg_temp.verifica('Berta, ' || n, pg_temp.ids(berta, n, true), '{}');
    perform pg_temp.verifica('Berta sin p_todos, ' || n, pg_temp.ids(berta, n, false), '{}');
  end loop;
  -- Un número que cabe en la columna pero se salta (4294967297 = 2^32 + 1) no se confunde con el 1 por un desborde.
  if pg_temp.ids(duena, null, true) <> '{}' then raise exception 'un número nulo encontró algo'; end if;
end $$;

-- @test número-busqueda: la papelera, el limbo y una baja
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  berta constant uuid := '00000000-0000-0000-0000-0000000009b1'; carlos constant uuid := '00000000-0000-0000-0000-0000000009b2';
  v_pap uuid; v_limbo uuid; v_baja uuid; v_n int;
begin
  -- Los propios 31, 32 y 33 de Berta: uno irá a la papelera, otro al limbo y el tercero lo hereda la dueña con la baja de Berta.
  v_pap := pg_temp.alta_b(berta, 'Búsqueda papelera', '78700003');
  v_limbo := pg_temp.alta_b(berta, 'Búsqueda limbo', '78700004');
  v_baja := pg_temp.alta_b(berta, 'Búsqueda baja', '78700005');
  if (select array_agg(numero_propio order by numero_propio) from public.leads where id in (v_pap, v_limbo, v_baja)) <> array[31, 32, 33] then
    raise exception 'el terreno: los propios no son 31, 32 y 33'; end if;
  perform pg_temp.verifica('la dueña, 31 antes de la papelera', pg_temp.ids(duena, 31, true), array[v_pap], 'contiene');

  update public.leads set eliminado_en = now() where id = v_pap;
  perform pg_temp.verifica('la dueña, 31 en la papelera', pg_temp.ids(duena, 31, true), array[v_pap], 'sin');
  perform pg_temp.verifica('Berta, 31 en la papelera', pg_temp.ids(berta, 31, false), '{}');
  update public.leads set eliminado_en = null where id = v_pap;
  perform pg_temp.verifica('la dueña, 31 restaurado', pg_temp.ids(duena, 31, true), array[v_pap], 'contiene');

  update public.leads_asesores set revocado_en = now() where lead_id = v_limbo and revocado_en is null;
  perform pg_temp.verifica('la dueña, 32 en el limbo', pg_temp.ids(duena, 32, true), array[v_limbo], 'sin');
  perform pg_temp.verifica('Berta, 32 en el limbo', pg_temp.ids(berta, 32, false), '{}');

  -- Berta transfiere el 33 a la dueña y la dan de baja: el lead sigue siendo suyo (propio de Berta), visible para la dueña, y se encuentra por 33.
  perform set_config('request.jwt.claim.sub', berta::text, true);
  set local role authenticated;
  perform public.lead_transferir(v_baja, duena, berta);
  reset role;
  perform set_config('request.jwt.claim.sub', duena::text, true);
  set local role authenticated;
  perform public.equipo_dar_de_baja(berta);
  reset role;
  if (select creado_por from public.leads_numeros_propios where lead_id = v_baja) <> berta then raise exception 'la baja cambió el creador del propio'; end if;
  perform pg_temp.verifica('la dueña, 33 tras la baja de Berta', pg_temp.ids(duena, 33, true), array[v_baja], 'contiene');
  -- Y con Berta dada de baja: el 30 de Carlos se encuentra y el de Berta, que la baja dejó en el limbo, no.
  perform pg_temp.verifica('la dueña, 30 tras la baja de Berta', pg_temp.ids(duena, 30, true), array[current_setting('nb.c')::uuid], 'contiene');
  perform pg_temp.verifica('la dueña, el 30 de Berta tras su baja', pg_temp.ids(duena, 30, true), array[current_setting('nb.b')::uuid], 'sin');
end $$;

-- @test número-busqueda: el permiso concedido y quitado con la sesión abierta, y con «propios»
do $$
declare
  carlos constant uuid := '00000000-0000-0000-0000-0000000009b2'; diego constant uuid := '00000000-0000-0000-0000-0000000009b3';
  eva constant uuid := '00000000-0000-0000-0000-0000000009b4';
  v_c uuid := current_setting('nb.c')::uuid; v_gc bigint := current_setting('nb.gc')::bigint; v_e uuid;
begin
  -- Diego, con el permiso, encuentra el 30 de Carlos y su global.
  perform pg_temp.verifica('Diego, 30', pg_temp.ids(diego, 30, true), array[v_c], 'contiene');
  perform pg_temp.verifica('Diego, el global de Carlos', pg_temp.ids(diego, v_gc, true), array[v_c], 'contiene');
  -- Eva ve «propios»: con el permiso, el global y el propio de cualquier creador, pero sólo de los leads de su cartera.
  perform pg_temp.verifica('Eva, 30 sin nada en su cartera', pg_temp.ids(eva, 30, true), '{}');
  perform pg_temp.verifica('Eva, el global de Carlos sin nada en su cartera', pg_temp.ids(eva, v_gc, true), '{}');
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (v_c, eva, 'compartido');
  perform pg_temp.verifica('Eva, 30 con el lead de Carlos compartido', pg_temp.ids(eva, 30, true), array[v_c]);
  perform pg_temp.verifica('Eva, el global de Carlos compartido', pg_temp.ids(eva, v_gc, true), array[v_c]);
  update public.leads_asesores set revocado_en = now() where lead_id = v_c and usuario_id = eva;
  perform pg_temp.verifica('Eva, 30 tras salir del lead', pg_temp.ids(eva, 30, true), '{}');

  -- Se lo quitan a Diego con la sesión abierta: la siguiente consulta, pidiendo p_todos como antes, ya no le trae el global ni el propio ajeno.
  delete from public.roles_permisos where permiso_clave = 'leads.numero_global.ver' and rol_id = (select id from public.roles where clave = 'nb_todos');
  perform pg_temp.verifica('Diego sin el permiso, 30 con p_todos', pg_temp.ids(diego, 30, true), array[v_c], 'sin');
  perform pg_temp.verifica('Diego sin el permiso, el global con p_todos', pg_temp.ids(diego, v_gc, true), array[v_c], 'sin');
  -- Y si lo tenía y se lo vuelven a dar, vuelve al instante.
  insert into public.roles_permisos (rol_id, permiso_clave, alcance)
  values ((select id from public.roles where clave = 'nb_todos'), 'leads.numero_global.ver', 'todos');
  perform pg_temp.verifica('Diego con el permiso otra vez', pg_temp.ids(diego, 30, true), array[v_c], 'contiene');
end $$;

-- @test número-busqueda: el tope de 100 y un lead cuyo global y propio coinciden
do $$
declare
  duena constant uuid := '00000000-0000-0000-0000-000000000001';
  v_c uuid := current_setting('nb.c')::uuid;
  v_ids uuid[]; v_n int;
begin
  -- Nunca más de 100 ids, y el 30 de Carlos está entre ellos.
  v_ids := pg_temp.ids(duena, 30, true);
  select count(*) into v_n from unnest(v_ids);
  if v_n > 100 then raise exception 'más de 100 ids: %', v_n; end if;
  if not v_c = any(v_ids) then raise exception 'el 30 de Carlos no está'; end if;
  -- La función no devuelve nunca un duplicado (un lead cuyo global y propio coinciden aparece una sola vez).
  update public.leads_numeros_globales set numero = 7770030 where lead_id = v_c;
  update public.leads_numeros_propios set numero = 7770030 where lead_id = v_c;
  v_ids := pg_temp.ids(duena, 7770030, true);
  if cardinality(v_ids) <> 1 or v_ids[1] <> v_c then raise exception 'global y propio iguales: %', v_ids; end if;
end $$;
