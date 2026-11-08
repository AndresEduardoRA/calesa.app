-- Mandar una cotización a la papelera pide lo que pide guardarla (paso 4.24-1a, cierra 4-68): verla, antes de tomar su fila y otra vez después, y una final
-- además `cotizaciones.final.gestionar` del origen. Vale para el ayudante `_cotizacion_a_papelera()` y para la genérica `papelera_enviar()`.
-- No depende de otro archivo (`SOLO=areas/papelera/pide-ver.sql`): «la jefa» es una persona que ve, edita, modera y gestiona finales en todo. Cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   E7.  La genérica da el mismo 42501 «No tienes acceso a esta cotización.», sin enviar nada ni dejar un lote, a quien edita sin ver, a una inexistente y a una
--        que ya está en la papelera (también con `moderar`, que antes las salteaba), y a un pedido con una visible y una que no ve (todo o nada). Con permiso, el
--        lote queda con su resumen y su versión.
--   E5.  Una final pide `cotizaciones.final.gestionar` del origen (como guardarla): con `ver` y `editar`, no; con `ver` y `final.gestionar`, sí.
--   E11. Quien la ve y no puede recibe «No tienes permiso para enviarla a la papelera.».
--   E9.  `cotizacion_marcar_final()` mira con los derechos de quien marca: si no ve una preventa viva del vehículo, no marca (P9 a; el texto es del 4.25-1).
--   E10. El ayudante mira ver antes de tomar la fila, y la toma con `for no key update`.
--   E12. El ayudante compara la versión cuando se la piden: vieja da PT409, nula da 22023.
--   E8a. Privilegios: la genérica sigue con `prosecdef`, `search_path` vacío, `execute` de authenticated y no de anon ni PUBLIC; el ayudante no es de nadie.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (alcance «todos») o 'clave:propios'.
create or replace function pg_temp.pv_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pv_' || substr(v_id::text, 1, 8), 'PV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

-- «La jefa»: ve, edita, modera y gestiona finales en todos los orígenes.
create or replace function pg_temp.pv_jefa() returns uuid language sql as $f$
  select pg_temp.pv_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.moderar', 'cotizaciones.final.gestionar']);
$f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla.
create or replace function pg_temp.pv_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m);
  end;
  reset role;
  return v;
end $f$;

-- Da ese error (sqlstate y mensaje exactos).
create or replace function pg_temp.pv_da_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

-- Un origen con una fórmula publicada mínima.
create or replace function pg_temp.pv_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; v_def jsonb;
begin
  insert into public.origenes (clave, nombre) values ('pv_' || substr(gen_random_uuid()::text, 1, 8), 'PV origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  v_def := jsonb_build_object('nodos', jsonb_build_array(
    jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
    jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')));
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', v_def, '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

-- Una cotización viva de esa persona (una final, con vehículo).
create or replace function pg_temp.pv_cot(p_quien uuid, e jsonb, p_vehiculo uuid default null, p_clase text default 'preventa') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, p_clase::public.clase_cotizacion, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- Un vehículo de ese origen.
create or replace function pg_temp.pv_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'PV vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Si sigue viva (fuera de la papelera).
create or replace function pg_temp.pv_viva(p_c uuid) returns boolean language sql as $f$
  select exists (select 1 from public.cotizaciones c where c.id = p_c and c.eliminado_en is null and c.lote_papelera_id is null);
$f$;

-- Cuántos lotes creó esa persona.
create or replace function pg_temp.pv_lotes(p_quien uuid) returns int language sql as $f$
  select count(*)::int from public.lotes_papelera l where l.creado_por = p_quien;
$f$;

-- @test papelera de cotizaciones: la genérica da el mismo 42501 a lo que no se ve, a lo inexistente y a lo que ya está en la papelera, sin dejar nada (E7)
begin;
do $$
declare
  jefa uuid := pg_temp.pv_jefa();
  e jsonb := pg_temp.pv_origen(); ed uuid; mo uuid; pr uuid; ok uuid; c_d uuid; c_pap uuid; c_pr uuid; c1 uuid; c2 uuid; v_l uuid; r jsonb;
  acceso constant text := 'No tienes acceso a esta cotización.';
begin
  ed := pg_temp.pv_persona(array['cotizaciones.editar']);
  mo := pg_temp.pv_persona(array['cotizaciones.ver', 'cotizaciones.moderar']);
  pr := pg_temp.pv_persona(array['cotizaciones.ver:propios', 'cotizaciones.editar:propios']);
  ok := pg_temp.pv_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  c_d := pg_temp.pv_cot(jefa, e);
  c_pap := pg_temp.pv_cot(jefa, e);
  insert into public.lotes_papelera (tipo, creado_por, resumen) values ('cotizaciones', jefa, '{"cantidad": 1}') returning id into v_l;
  update public.cotizaciones set eliminado_en = now(), eliminado_por = jefa, lote_papelera_id = v_l where id = c_pap;
  c_pr := pg_temp.pv_cot(pr, e);

  -- 1. Edita sin ver.
  perform pg_temp.pv_da_error('quien edita sin ver', pg_temp.pv_corre(ed, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', c_d)), '42501', acceso);
  if not pg_temp.pv_viva(c_d) then raise exception 'quien edita sin ver la mandó a la papelera'; end if;
  if pg_temp.pv_lotes(ed) <> 0 then raise exception 'quien edita sin ver dejó un lote'; end if;
  -- 2. Una inexistente, con moderar.
  perform pg_temp.pv_da_error('una inexistente con moderar', pg_temp.pv_corre(mo, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', gen_random_uuid())), '42501', acceso);
  -- 3. Una que ya está en la papelera, con moderar.
  perform pg_temp.pv_da_error('una ya en la papelera con moderar', pg_temp.pv_corre(mo, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', c_pap)), '42501', acceso);
  if (select lote_papelera_id from public.cotizaciones where id = c_pap) is distinct from v_l then raise exception 'la que ya estaba en la papelera cambió de lote'; end if;
  if pg_temp.pv_lotes(mo) <> 0 then raise exception 'moderar dejó un lote con lo inexistente o lo que ya estaba en la papelera'; end if;
  -- 4. Una visible junto a una que no ve: todo o nada.
  perform pg_temp.pv_da_error('una visible junto a una que no ve', pg_temp.pv_corre(pr, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L, %L]::uuid[]))', c_pr, c_d)), '42501', acceso);
  if not pg_temp.pv_viva(c_pr) or not pg_temp.pv_viva(c_d) then raise exception 'el pedido con una que no ve mandó algo a la papelera'; end if;
  if pg_temp.pv_lotes(pr) <> 0 then raise exception 'el pedido con una que no ve dejó un lote'; end if;

  -- Con permiso: las dos, en un lote con su resumen y su versión.
  c1 := pg_temp.pv_cot(jefa, e);
  c2 := pg_temp.pv_cot(jefa, e);
  r := pg_temp.pv_corre(ok, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L, %L, %L]::uuid[]))', c1, c2, c1));
  if r ? 'error' then raise exception 'quien ve y edita no pudo: %', r; end if;
  v_l := (r #>> '{}')::uuid;
  if (select count(*) from public.cotizaciones where lote_papelera_id = v_l and eliminado_en is not null and eliminado_por = ok) <> 2 then raise exception 'el lote no tiene las dos'; end if;
  if (select resumen from public.lotes_papelera where id = v_l) is distinct from '{"cantidad": 2, "restaurados": 0, "purgados": 0}'::jsonb then
    raise exception 'el resumen del lote no es el esperado: %', (select resumen from public.lotes_papelera where id = v_l); end if;
  if not (select actualizado_en > creado_en from public.lotes_papelera where id = v_l) then raise exception 'el lote no movió su versión'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: una final pide cotizaciones.final.gestionar del origen, como guardarla (E5)
begin;
do $$
declare
  jefa uuid := pg_temp.pv_jefa();
  e jsonb := pg_temp.pv_origen(); ed uuid; fg uuid; c uuid; r jsonb;
begin
  ed := pg_temp.pv_persona(array['cotizaciones.ver', 'cotizaciones.editar']);
  fg := pg_temp.pv_persona(array['cotizaciones.ver', 'cotizaciones.final.gestionar']);
  c := pg_temp.pv_cot(jefa, e, pg_temp.pv_vehiculo(e), 'final');
  perform pg_temp.pv_da_error('una final con ver y editar', pg_temp.pv_corre(ed, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', c)),
    '42501', 'No tienes permiso para enviarla a la papelera.');
  if not pg_temp.pv_viva(c) then raise exception 'la final se fue con ver y editar'; end if;
  r := pg_temp.pv_corre(fg, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', c));
  if r ? 'error' then raise exception 'con ver y final.gestionar no pudo: %', r; end if;
  if pg_temp.pv_viva(c) then raise exception 'con ver y final.gestionar no la mandó'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: quien la ve y no puede recibe el 42501 de permiso, por la genérica (E11)
begin;
do $$
declare
  jefa uuid := pg_temp.pv_jefa();
  e jsonb := pg_temp.pv_origen(); ve uuid; c uuid;
begin
  ve := pg_temp.pv_persona(array['cotizaciones.ver']);
  c := pg_temp.pv_cot(jefa, e);
  perform pg_temp.pv_da_error('quien sólo ve', pg_temp.pv_corre(ve, format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', c)),
    '42501', 'No tienes permiso para enviarla a la papelera.');
  if not pg_temp.pv_viva(c) then raise exception 'quien sólo ve la mandó a la papelera'; end if;
  if pg_temp.pv_lotes(ve) <> 0 then raise exception 'quien sólo ve dejó un lote'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: marcar final no manda a la papelera una preventa que quien marca no ve (E9, P9 a; el texto es del 4.25-1, P3 a)
begin;
do $$
declare
  jefa uuid := pg_temp.pv_persona(array['cotizaciones.ver', 'cotizaciones.editar', 'cotizaciones.final.gestionar', 'leads.ver', 'leads.editar']);
  e jsonb := pg_temp.pv_origen(); m uuid; v uuid; l uuid; a uuid; b uuid;
begin
  m := pg_temp.pv_persona(array['cotizaciones.ver:propios', 'cotizaciones.final.gestionar', 'cotizaciones.moderar', 'leads.ver', 'leads.editar']);
  v := pg_temp.pv_vehiculo(e);
  -- El lead de la marcada es de quien marca y la jefa lo comparte (marcar pide el lead en la cartera, P2 a); la otra preventa no tiene lead: m no la ve.
  insert into public.leads (nombre, telefono_principal, creado_por) values ('PV lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), m)
  returning id into l;
  insert into public.leads_asesores (lead_id, usuario_id, tipo_acceso) values (l, jefa, 'compartido');
  a := pg_temp.pv_cot(m, e, v);
  update public.cotizaciones set lead_id = l where id = a;
  b := pg_temp.pv_cot(jefa, e, v);
  perform pg_temp.pv_da_error('marcar final con una preventa que no ve', pg_temp.pv_corre(m, format('select to_jsonb(public.cotizacion_marcar_final(%L))', a)),
    '42501', 'Este vehículo tiene preventas que no puedes mandar a la papelera. Pídeselo a quien las cotizó o a quien modera.');
  if (select clase::text from public.cotizaciones where id = a) <> 'preventa' then raise exception 'la marcada cambió de clase aunque la marca abortó'; end if;
  if not pg_temp.pv_viva(b) then raise exception 'la preventa que no ve se fue a la papelera'; end if;
  -- La jefa ve todo y tiene el lead: marca y la manda.
  perform set_config('request.jwt.claim.sub', jefa::text, true);
  perform public.cotizacion_marcar_final(a);
  if (select clase::text from public.cotizaciones where id = a) <> 'final' then raise exception 'la jefa no marcó la final'; end if;
  if pg_temp.pv_viva(b) then raise exception 'la jefa marcó y la otra preventa siguió viva'; end if;
end $$;
reset role;
rollback;

-- @test papelera de cotizaciones: el ayudante mira ver antes de tomar la fila, y la toma con for no key update (E10)
do $$
declare v_src text;
begin
  select f.prosrc into v_src from pg_proc f join pg_namespace n on n.oid = f.pronamespace where n.nspname = 'public' and f.proname = '_cotizacion_a_papelera';
  if v_src is null then raise exception 'no existe public._cotizacion_a_papelera'; end if;
  if position('puede_cotizacion(' in v_src) = 0 or position('for no key update' in v_src) = 0 then
    raise exception 'el ayudante debía mirar puede_cotizacion( y tomar la fila con for no key update'; end if;
  if position('puede_cotizacion(' in v_src) > position('for no key update' in v_src) then
    raise exception 'el ayudante toma la fila antes de mirar si quien llama la ve: quien no la ve esperaría su candado (4-68)'; end if;
  if v_src ~* 'for\s+update' then raise exception 'el ayudante toma con for update (choca con el for key share de las hijas)'; end if;
end $$;

-- @test papelera de cotizaciones: el ayudante compara la versión que le piden comparar (E12)
begin;
do $$
declare
  jefa uuid := pg_temp.pv_jefa();
  e jsonb := pg_temp.pv_origen(); c uuid; v_l uuid; v_e text;
begin
  c := pg_temp.pv_cot(jefa, e);
  insert into public.lotes_papelera (tipo, creado_por) values ('cotizaciones', jefa) returning id into v_l;
  perform set_config('request.jwt.claim.sub', jefa::text, true);
  v_e := null;
  begin
    perform public._cotizacion_a_papelera(c, v_l, true, '2000-01-01'::timestamptz);
  exception when others then v_e := sqlstate;
  end;
  if v_e is distinct from 'PT409' then raise exception 'con una versión vieja debía dar PT409 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := null;
  begin
    perform public._cotizacion_a_papelera(c, v_l, true, null);
  exception when others then v_e := sqlstate;
  end;
  if v_e is distinct from '22023' then raise exception 'sin la versión debía dar 22023 y dio %', coalesce(v_e, 'nada'); end if;
  if not pg_temp.pv_viva(c) then raise exception 'con la versión mal la mandó igual'; end if;
end $$;
rollback;

-- @test papelera de cotizaciones: la genérica sigue con sus privilegios y el ayudante no es de nadie (E8a)
do $$
declare r record;
begin
  for r in select f.oid, f.proname, f.prosecdef, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.proname in ('papelera_enviar', '_cotizacion_a_papelera') loop
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío: % %', r.proname, r.prosecdef, r.proconfig; end if;
    if has_function_privilege('anon', r.oid, 'execute') then raise exception 'anon puede ejecutar %', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
    if has_function_privilege('authenticated', r.oid, 'execute') is distinct from (r.proname = 'papelera_enviar') then
      raise exception 'authenticated: execute sobre % debía ser %', r.proname, (r.proname = 'papelera_enviar'); end if;
  end loop;
  if not exists (select 1 from pg_proc f join pg_namespace n on n.oid = f.pronamespace where n.nspname = 'public' and f.proname = '_cotizacion_a_papelera') then
    raise exception 'no existe public._cotizacion_a_papelera'; end if;
end $$;
