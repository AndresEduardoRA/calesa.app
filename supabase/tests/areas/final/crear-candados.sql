-- Crear una cotización final (paso 4.25-1b): el lead que ya es cliente, el vehículo a mano, el orden de candados en el cuerpo, la preventa que no cambia y los
-- privilegios. No depende de otro archivo (`SOLO=areas/final/crear-candados.sql`). Cada bloque que escribe abre su transacción y la revierte. La conducta
-- de crear una final está en `crear.sql`; las carreras, en `carreras-crear.mjs` y `carreras-crear-candados.mjs`.
--
-- Qué asegura:
--   N6. Un lead que ya es de clase cliente no cambia de tipo y la actividad lo dice.  N7. Con el vehículo a mano: nace vinculado al lead, sin lote.
--   N8. El cuerpo mira (la cartera, la ayudante) antes del primer candado; toma lead (no key update) → vehículo → las vivas del vehículo; con todo tomado
--       vuelve a mirar; inserta y recién entonces aplica. No escribe ni toma `for update` el lead ni el vehículo. La ayudante no toma candados.
--   N9. Una preventa no mira nada de eso ni aplica nada.  N10. Privilegios: crear sigue de authenticated; la ayudante, sólo de service_role.

create or replace function pg_temp.fk_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fk_' || substr(v_id::text, 1, 8), 'FK ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fk_crea() returns uuid language sql as $f$
  select pg_temp.fk_persona(array['cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.final.gestionar',
                                  'leads.ver', 'leads.editar', 'vehiculos.ver', 'vehiculos.crear']);
$f$;

create or replace function pg_temp.fk_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text;
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
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.fk_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('fk_' || substr(gen_random_uuid()::text, 1, 8), 'FK origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
            'buckets', jsonb_build_object('origen', 'tc')),
          '{}', '{}', jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                         'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

create or replace function pg_temp.fk_lead(p_quien uuid) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('FK lead', '57' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), p_quien)
  returning id into v;
  return v;
end $f$;

create or replace function pg_temp.fk_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'FK vehículo', 'toyota') returning id into v;
  return v;
end $f$;

create or replace function pg_temp.fk_cot(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid) returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, lead_id, vehiculo_id, clase, valores, fuentes, tipos_cambio, totales, total_base)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_lead, p_vehiculo, 'preventa', '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', '{"usd": 10}', 10)
  returning id into v_c;
  return v_c;
end $f$;

-- `cotizacion_crear` como esa persona, con la hoja abierta firmada para ella ahora.
create or replace function pg_temp.fk_crear(p_quien uuid, e jsonb, p_lead uuid, p_vehiculo uuid, p_clase text default 'final', p_nuevo jsonb default null)
returns jsonb language plpgsql as $f$
declare v_tok text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  v_tok := public._cotizacion_abierta_firmar((e ->> 'o')::uuid, (e ->> 'f')::uuid, now());
  return pg_temp.fk_corre(p_quien, format('select public.cotizacion_crear(%L, %L, %L, ''{"inputs": {"visible": 10}}''::jsonb, %L, %L, %L::jsonb, null, %L::public.clase_cotizacion)',
                                          gen_random_uuid(), e ->> 'o', p_lead, v_tok, p_vehiculo, p_nuevo, p_clase));
end $f$;

-- @test crear una final: un lead que ya es de clase cliente no cambia de tipo y la actividad dice lead_a_cliente falso (N6)
begin;
do $$
declare e jsonb := pg_temp.fk_origen(); q uuid := pg_temp.fk_crea(); l uuid; v uuid; t_b uuid; r jsonb;
begin
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('fk_a', 'FK A cliente', 'cliente', true, -50);
  insert into public.tipos_lead (clave, nombre, clase, activo, orden) values ('fk_b', 'FK B cliente', 'cliente', true, -40) returning id into t_b;
  l := pg_temp.fk_lead(q); v := pg_temp.fk_vehiculo(e);
  update public.leads set tipo_lead_id = t_b where id = l;
  r := pg_temp.fk_crear(q, e, l, v);
  if r ? 'error' then raise exception 'la final no se creó: %', r; end if;
  if (select tipo_lead_id from public.leads where id = l) is distinct from t_b then raise exception 'cambió el tipo de un lead que ya era de clase cliente'; end if;
  if not exists (select 1 from public.actividad a where a.accion = 'cotizacion.final' and a.registro_id = r -> 'cotizacion' ->> 'id'
                  and (a.despues -> 'lead_a_cliente') = 'false'::jsonb and (a.despues -> 'preventas_a_papelera') = '0'::jsonb) then
    raise exception 'la actividad no dice lo que pasó: %', (select jsonb_agg(a.despues) from public.actividad a where a.registro_id = r -> 'cotizacion' ->> 'id'); end if;
end $$;
reset role;
rollback;

-- @test crear una final: con el vehículo a mano, el vehículo nace vinculado al lead, el lead pasa a cliente y no hay lote (N7)
begin;
do $$
declare e jsonb := pg_temp.fk_origen(); q uuid := pg_temp.fk_crea(); l uuid; v uuid := gen_random_uuid(); r jsonb;
begin
  l := pg_temp.fk_lead(q);
  r := pg_temp.fk_crear(q, e, l, null, 'final', jsonb_build_object('id', v, 'datos', jsonb_build_object('titulo', 'FK a mano')));
  if r ? 'error' then raise exception 'la final a mano no se creó: %', r; end if;
  if (select lead_id from public.vehiculos where id = v) is distinct from l then raise exception 'el vehículo a mano no quedó con el lead'; end if;
  if (select count(*) from public.vehiculos_vinculos where vehiculo_id = v and lead_id = l and hasta is null) <> 1 then raise exception 'el vínculo no quedó en el historial'; end if;
  if (select t.clase::text from public.leads x join public.tipos_lead t on t.id = x.tipo_lead_id where x.id = l) <> 'cliente' then raise exception 'el lead no pasó a cliente'; end if;
  if exists (select 1 from public.lotes_papelera where creado_por = q) then raise exception 'hubo un lote sin nada que mandar a la papelera'; end if;
end $$;
reset role;
rollback;

-- @test crear una final: mira antes del primer candado, toma lead → vehículo → las vivas, vuelve a mirar, inserta y aplica; la ayudante no toma candados (N8)
do $$
declare
  src text; ayu text; s text; p int[];
  pat_lead constant text := 'puede_actuar_lead\(';
  pat_mira constant text := '_final_crear_mirar\(';
begin
  select pg_get_functiondef(p2.oid) into ayu from pg_proc p2 join pg_namespace n on n.oid = p2.pronamespace where n.nspname = 'public' and p2.proname = '_final_crear_mirar';
  if ayu is null then raise exception 'no existe public._final_crear_mirar'; end if;
  select pg_get_functiondef(p2.oid) into src from pg_proc p2 join pg_namespace n on n.oid = p2.pronamespace where n.nspname = 'public' and p2.proname = 'cotizacion_crear';
  p := array[regexp_instr(src, pat_lead), regexp_instr(src, pat_mira),
             regexp_instr(src, 'public\.leads[^;]*for\s+no\s+key\s+update'), position('_cotizacion_vehiculo(' in src),
             regexp_instr(src, 'public\.cotizaciones[^;]*for\s+no\s+key\s+update'),
             regexp_instr(src, pat_lead, 1, 2), regexp_instr(src, pat_mira, 1, 2),
             regexp_instr(src, 'insert\s+into\s+public\.cotizaciones'), position('_final_aplicar(' in src)];
  if 0 = any (p) then raise exception 'al cuerpo le falta una pieza (cartera, ayudante, lead, vehículo, pasada, segunda cartera, segunda ayudante, insert, aplicar): %', p; end if;
  for i in 1 .. array_length(p, 1) - 1 loop
    if p[i] >= p[i + 1] then raise exception 'el orden del cuerpo no es mirar → lead → vehículo → pasada → mirar → insert → aplicar: %', p; end if;
  end loop;
  if src ~* 'update\s+public\.(vehiculos|leads)' then raise exception 'crear escribe el vehículo o el lead: eso es de _final_aplicar'; end if;
  if src ~* 'public\.(leads|vehiculos)[^;]*for\s+update' then raise exception 'crear toma un lead o un vehículo for update'; end if;
  if ayu ~* 'for\s+(update|no\s+key\s+update|share|key\s+share)' then raise exception 'la ayudante toma candados'; end if;
  if ayu !~* 'select[^;]*lead_id[^;]*from\s+public\.vehiculos' then raise exception 'la ayudante no lee el lead del vehículo'; end if;
end $$;

-- @test crear una preventa: no mira la cartera, el vínculo ni las demás del vehículo, y no aplica nada de una final (N9)
begin;
do $$
declare e jsonb := pg_temp.fk_origen(); jefa uuid := pg_temp.fk_crea(); q uuid; l uuid; v uuid; p uuid; r jsonb; tipo uuid; lotes bigint; vinc bigint;
begin
  -- Ve todos los leads sin editarlos, sólo sus cotizaciones y sin final.gestionar; el lead es de la jefa, el vehículo de otro lead y con una preventa que no ve.
  q := pg_temp.fk_persona(array['cotizaciones.ver:propios', 'cotizaciones.crear', 'leads.ver', 'vehiculos.ver']);
  l := pg_temp.fk_lead(jefa); v := pg_temp.fk_vehiculo(e);
  update public.vehiculos set lead_id = pg_temp.fk_lead(jefa) where id = v;
  p := pg_temp.fk_cot(jefa, e, l, v);
  select tipo_lead_id into tipo from public.leads where id = l;
  select count(*) into lotes from public.lotes_papelera; select count(*) into vinc from public.vehiculos_vinculos where vehiculo_id = v;
  r := pg_temp.fk_crear(q, e, l, v, 'preventa');
  if r ? 'error' then raise exception 'la preventa no se creó: %', r; end if;
  if (select clase::text from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid) <> 'preventa' then raise exception 'no quedó preventa'; end if;
  if (select eliminado_en from public.cotizaciones where id = p) is not null then raise exception 'la otra preventa se fue a la papelera'; end if;
  if (select count(*) from public.lotes_papelera) <> lotes or (select count(*) from public.vehiculos_vinculos where vehiculo_id = v) <> vinc
     or (select tipo_lead_id from public.leads where id = l) is distinct from tipo then raise exception 'una preventa cambió lotes, vínculos o el tipo del lead'; end if;
  if exists (select 1 from public.actividad a where a.accion = 'cotizacion.final' and a.registro_id = r -> 'cotizacion' ->> 'id') then raise exception 'una preventa registró cotizacion.final'; end if;
end $$;
reset role;
rollback;

-- @test crear una final: cotizacion_crear sigue de authenticated; la ayudante es sólo de service_role; las dos definer con search_path vacío (N10)
do $$
declare r record; n int := 0;
begin
  for r in select f.oid, f.proname, f.prosecdef, f.proconfig from pg_proc f join pg_namespace n on n.oid = f.pronamespace
            where n.nspname = 'public' and f.proname in ('cotizacion_crear', '_final_crear_mirar', '_final_aplicar') loop
    n := n + 1;
    if not r.prosecdef or r.proconfig is distinct from array['search_path=""'] then raise exception '% perdió prosecdef o el search_path vacío: % %', r.proname, r.prosecdef, r.proconfig; end if;
    if has_function_privilege('anon', r.oid, 'execute') then raise exception 'anon puede ejecutar %', r.proname; end if;
    if exists (select 1 from pg_proc f, aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) a where f.oid = r.oid and a.grantee = 0 and a.privilege_type = 'EXECUTE') then
      raise exception 'PUBLIC puede ejecutar %', r.proname; end if;
    if has_function_privilege('authenticated', r.oid, 'execute') is distinct from (r.proname = 'cotizacion_crear') then
      raise exception 'authenticated: el permiso de ejecutar % no es el esperado', r.proname; end if;
    if not has_function_privilege('service_role', r.oid, 'execute') then raise exception 'service_role no puede ejecutar %', r.proname; end if;
  end loop;
  if n <> 3 then raise exception 'faltan funciones: % de 3 (una sola de cada una)', n; end if;
end $$;
