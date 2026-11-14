-- `cotizacion_aprobar()`: permisos, errores, versión, visibilidad y el orden de candados. La mecánica de la marca (quién nace aprobada, reasignar) está en
-- `reponer.sql`. No depende de otro archivo (`SOLO=areas/aprobada/aprobar.sql`). Ver `reponer.sql` sobre `ap_confirmar()`.
--
-- Qué asegura:
--   A1. Sin la clave, con la clave sólo de otro origen, o sin verla (propios ajena, inexistente, papelera): 42501; el de ver con el mismo texto.
--   A2. Sin vehículo 22023 (hint vehiculo); inválida 23514; versión vieja PT409; sin versión 22023.
--   A3. La anterior sólo llega si quien aprueba la ve; sin ella no hay «Deshacer».
--   A4. Visibilidad: cada persona lee de `cotizaciones_aprobadas` exactamente las aprobadas de las cotizaciones que ve; nadie escribe la tabla; anon, nada.
--   A5. Candados: el permiso antes de tomar nada; vehículo → cotización → candado de la aprobada; el trigger anota sin candados y repone en orden.

create or replace function pg_temp.ap_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('ap_' || substr(v_id::text, 1, 8), 'AP ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.ap_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.ap_origen() returns jsonb language plpgsql as $f$
declare o uuid; f uuid;
begin
  insert into public.origenes (clave, nombre) values ('ap_' || substr(gen_random_uuid()::text, 1, 8), 'AP origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad)
  values (o, 1, 'publicada', jsonb_build_object('nodos', jsonb_build_array(
            jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
            jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen'))),
          '{}', '{}', jsonb_build_object('visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'total', jsonb_build_object('ver', 'todos', 'editar', null)))
  returning id into f;
  return jsonb_build_object('o', o, 'f', f);
end $f$;

create or replace function pg_temp.ap_vehiculo(e jsonb) returns uuid language plpgsql as $f$
declare v uuid;
begin
  insert into public.vehiculos (origen_id, titulo, marca) values ((e ->> 'o')::uuid, 'AP vehículo', 'toyota') returning id into v;
  return v;
end $f$;

-- Una cotización viva creada hace p_min minutos (el orden de «la más antigua»), con ese totales.
create or replace function pg_temp.ap_cot(p_quien uuid, e jsonb, p_vehiculo uuid, p_min integer, p_totales jsonb default '{"usd": 10}') returns uuid language plpgsql as $f$
declare v_c uuid;
begin
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, creado_en)
  values ((e ->> 'o')::uuid, p_quien, (e ->> 'f')::uuid, p_vehiculo, '{"visible": 10, "total": 10}', '{"visible": "input"}', '{}', p_totales, 10,
          now() - make_interval(mins => p_min))
  returning id into v_c;
  return v_c;
end $f$;

-- Fuerza el trigger diferido (en un bloque revertido no correría).
create or replace function pg_temp.ap_confirmar() returns void language plpgsql as $f$
begin
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar immediate;
  set constraints public.trg_cotizaciones_aprobadas_al_confirmar deferred;
end $f$;

create or replace function pg_temp.ap_aprobada(p_v uuid) returns uuid language sql as $f$
  select a.cotizacion_id from public.cotizaciones_aprobadas a where a.vehiculo_id = p_v;
$f$;


create or replace function pg_temp.ap_error(p_que text, p_r jsonb, p_estado text, p_mensaje text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje then
    raise exception '%: debía dar % «%» y dio %', p_que, p_estado, p_mensaje, p_r;
  end if;
end $f$;

create or replace function pg_temp.ap_aprobar(p_quien uuid, p_c uuid, p_version timestamptz) returns jsonb language sql as $f$
  select pg_temp.ap_corre(p_quien, format('select public.cotizacion_aprobar(%L, %L)', p_c, p_version));
$f$;

create or replace function pg_temp.ap_version(p_c uuid) returns timestamptz language sql as $f$
  select c.actualizado_en from public.cotizaciones c where c.id = p_c;
$f$;

-- @test aprobar: sin la clave, o con la clave sólo en otro origen, 42501 con el texto del permiso; nada cambia (A1)
begin;
do $$
declare
  e jsonb := pg_temp.ap_origen(); otro jsonb := pg_temp.ap_origen(); v uuid := pg_temp.ap_vehiculo(e); jefa uuid := pg_temp.ap_persona(array['cotizaciones.ver']);
  sin uuid := pg_temp.ap_persona(array['cotizaciones.ver']); en_otro uuid := pg_temp.ap_persona(array['cotizaciones.ver']); rol uuid;
  c1 uuid; c2 uuid; texto constant text := 'No tienes permiso para aprobar cotizaciones de este origen.';
begin
  select ur.rol_id into rol from public.usuarios_roles ur where ur.usuario_id = en_otro;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (rol, 'cotizaciones.aprobar', (otro ->> 'o')::uuid, 'todos');
  c1 := pg_temp.ap_cot(jefa, e, v, 30); c2 := pg_temp.ap_cot(jefa, e, v, 20);
  perform pg_temp.ap_confirmar();
  perform pg_temp.ap_error('sin la clave', pg_temp.ap_aprobar(sin, c2, pg_temp.ap_version(c2)), '42501', texto);
  perform pg_temp.ap_error('la clave en otro origen', pg_temp.ap_aprobar(en_otro, c2, pg_temp.ap_version(c2)), '42501', texto);
  if (select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = v) <> c1 then raise exception 'A1: cambió la aprobada'; end if;
  if exists (select 1 from public.actividad where accion = 'cotizacion.aprobada' and registro_id = c2::text) then raise exception 'A1: dejó actividad'; end if;
end $$;
rollback;

-- @test aprobar: lo que no se ve (propios ajena, inexistente, papelera) da el mismo 42501 de acceso (A1)
begin;
do $$
declare
  e jsonb := pg_temp.ap_origen(); v uuid := pg_temp.ap_vehiculo(e); jefa uuid := pg_temp.ap_persona(array['cotizaciones.ver']);
  propios uuid := pg_temp.ap_persona(array['cotizaciones.ver:propios', 'cotizaciones.aprobar']); c1 uuid; c2 uuid;
  acceso constant text := 'No tienes acceso a esta cotización.';
begin
  c1 := pg_temp.ap_cot(jefa, e, v, 30); c2 := pg_temp.ap_cot(jefa, e, v, 20);
  perform pg_temp.ap_confirmar();
  perform pg_temp.ap_error('ajena', pg_temp.ap_aprobar(propios, c2, pg_temp.ap_version(c2)), '42501', acceso);
  perform pg_temp.ap_error('inexistente', pg_temp.ap_aprobar(propios, gen_random_uuid(), now()), '42501', acceso);
  update public.cotizaciones set eliminado_en = now() where id = c2;
  perform pg_temp.ap_error('papelera', pg_temp.ap_aprobar(jefa, c2, pg_temp.ap_version(c2)), '42501', acceso);
end $$;
rollback;

-- @test aprobar: sin vehículo 22023, inválida 23514, versión vieja PT409 y sin versión 22023 (A2)
begin;
do $$
declare
  e jsonb := pg_temp.ap_origen(); v uuid := pg_temp.ap_vehiculo(e); u uuid := pg_temp.ap_persona(array['cotizaciones.ver', 'cotizaciones.aprobar']);
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; r jsonb;
begin
  c1 := pg_temp.ap_cot(u, e, v, 30); c2 := pg_temp.ap_cot(u, e, v, 20); c3 := pg_temp.ap_cot(u, e, null, 10); c4 := pg_temp.ap_cot(u, e, v, 5);
  update public.cotizaciones set estado = 'invalida' where id = c4;
  perform pg_temp.ap_confirmar();
  r := pg_temp.ap_aprobar(u, c3, pg_temp.ap_version(c3));
  perform pg_temp.ap_error('sin vehículo', r, '22023', 'Para aprobarla, asígnale un vehículo.');
  perform pg_temp.ap_error('inválida', pg_temp.ap_aprobar(u, c4, pg_temp.ap_version(c4)), '23514', 'Una cotización inválida no se aprueba: reactívala primero.');
  r := pg_temp.ap_aprobar(u, c2, pg_temp.ap_version(c2) - interval '1 microsecond');
  if r ->> 'error' is distinct from 'PT409' then raise exception 'A2: la versión vieja debía dar PT409 y dio %', r; end if;
  r := pg_temp.ap_corre(u, format('select public.cotizacion_aprobar(%L, null)', c2));
  if r ->> 'error' is distinct from '22023' then raise exception 'A2: sin versión debía dar 22023 y dio %', r; end if;
  -- El hint del campo.
  begin
    perform public.cotizacion_aprobar(c3, now());
  exception when others then
    declare h text; begin get stacked diagnostics h = pg_exception_hint; if h is distinct from 'vehiculo' then raise exception 'A2: hint %', h; end if; end;
  end;
  if (select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = v) <> c1 then raise exception 'A2: cambió la aprobada'; end if;
end $$;
rollback;

-- @test aprobar: la anterior sólo llega si quien aprueba la ve; sin ella no hay «Deshacer» (A3)
begin;
do $$
declare
  e jsonb := pg_temp.ap_origen(); v uuid := pg_temp.ap_vehiculo(e); jefa uuid := pg_temp.ap_persona(array['cotizaciones.ver']);
  propios uuid := pg_temp.ap_persona(array['cotizaciones.ver:propios', 'cotizaciones.aprobar']); c1 uuid; c2 uuid; r jsonb;
begin
  c1 := pg_temp.ap_cot(jefa, e, v, 30); c2 := pg_temp.ap_cot(propios, e, v, 20);
  perform pg_temp.ap_confirmar();
  r := pg_temp.ap_aprobar(propios, c2, pg_temp.ap_version(c2));
  if r ->> 'error' is not null or (r #>> '{cotizacion,id}')::uuid <> c2 then raise exception 'A3: aprobar falló %', r; end if;
  if r -> 'anterior' <> 'null'::jsonb then raise exception 'A3: la anterior que no ve viajó: %', r; end if;
  if (select cotizacion_id from public.cotizaciones_aprobadas where vehiculo_id = v) <> c2 then raise exception 'A3: no se reemplazó'; end if;
end $$;
rollback;

-- @test aprobar: cada persona lee de cotizaciones_aprobadas exactamente las aprobadas de las cotizaciones que ve; nadie la escribe (A4)
begin;
do $$
declare
  e jsonb := pg_temp.ap_origen(); otro jsonb := pg_temp.ap_origen(); va uuid := pg_temp.ap_vehiculo(e); vb uuid := pg_temp.ap_vehiculo(otro);
  duena uuid := pg_temp.ap_persona(array['cotizaciones.ver']); creador uuid := pg_temp.ap_persona(array['cotizaciones.ver:propios']);
  ajena uuid := pg_temp.ap_persona(array['cotizaciones.ver:propios']); sin uuid := pg_temp.ap_persona(array['leads.ver']);
  solo_otro uuid := pg_temp.ap_persona(array['leads.ver']); rol uuid; lead uuid; lead_aj uuid; vc uuid := pg_temp.ap_vehiculo(e); ca uuid; cb uuid; cc uuid; p uuid; vistas jsonb; esperadas jsonb; r jsonb;
begin
  select ur.rol_id into rol from public.usuarios_roles ur where ur.usuario_id = solo_otro;
  insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (rol, 'cotizaciones.ver', (otro ->> 'o')::uuid, 'todos');
  insert into public.leads (nombre, telefono_principal, creado_por) values ('AP lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), creador) returning id into lead;
  insert into public.leads (nombre, telefono_principal, creado_por) values ('AP lead aj', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), ajena) returning id into lead_aj;
  ca := pg_temp.ap_cot(creador, e, va, 30);
  cc := pg_temp.ap_cot(duena, e, vc, 30);
  update public.cotizaciones set lead_id = lead_aj where id = cc;
  cb := pg_temp.ap_cot(duena, otro, vb, 30);
  perform pg_temp.ap_confirmar();
  foreach p in array array[duena, creador, ajena, sin, solo_otro] loop
    r := pg_temp.ap_corre(p, 'select jsonb_build_object(''vistas'', (select coalesce(jsonb_agg(cotizacion_id order by cotizacion_id), ''[]''::jsonb) from public.cotizaciones_aprobadas)) ');
    vistas := r -> 'vistas';
    -- Lo que ve de cotizaciones, intersecado (como definer) con lo aprobado.
    r := pg_temp.ap_corre(p, 'select coalesce(jsonb_agg(id order by id), ''[]''::jsonb) from public.cotizaciones');
    esperadas := (select coalesce(jsonb_agg(a.cotizacion_id order by a.cotizacion_id), '[]'::jsonb) from public.cotizaciones_aprobadas a
                   where r @> to_jsonb(a.cotizacion_id));
    if vistas is distinct from esperadas then raise exception 'A4: % ve % y debía ver %', p, vistas, esperadas; end if;
  end loop;
  -- Las esperadas no son todas iguales: la visibilidad se probó con diferencias.
  if (pg_temp.ap_corre(duena, format('select count(*)::int::text::jsonb from public.cotizaciones_aprobadas where cotizacion_id in (%L, %L, %L)', ca, cb, cc)))::int <> 3 then raise exception 'A4: la dueña debía ver las tres'; end if;
  if (pg_temp.ap_corre(ajena, format('select count(*)::int::text::jsonb from public.cotizaciones_aprobadas where cotizacion_id in (%L, %L, %L)', ca, cb, cc)))::int <> 1 then raise exception 'A4: una propia sólo debía ver la de su cartera'; end if;
  if (pg_temp.ap_corre(solo_otro, format('select count(*)::int::text::jsonb from public.cotizaciones_aprobadas where cotizacion_id in (%L, %L, %L)', ca, cb, cc)))::int <> 1 then raise exception 'A4: sólo del otro origen debía ver una'; end if;
  -- Nadie escribe la tabla.
  perform pg_temp.ap_error('insert', pg_temp.ap_corre(duena, format('insert into public.cotizaciones_aprobadas (vehiculo_id, cotizacion_id, origen_id, creado_por, moneda) values (%L, %L, %L, %L, ''USD'') returning null::jsonb', gen_random_uuid(), ca, (e ->> 'o'), duena)), '42501', 'permission denied for table cotizaciones_aprobadas');
  perform pg_temp.ap_error('update', pg_temp.ap_corre(duena, 'update public.cotizaciones_aprobadas set monto = 1 returning null::jsonb'), '42501', 'permission denied for table cotizaciones_aprobadas');
  perform pg_temp.ap_error('delete', pg_temp.ap_corre(duena, 'delete from public.cotizaciones_aprobadas returning null::jsonb'), '42501', 'permission denied for table cotizaciones_aprobadas');
  set local role anon;
  begin
    perform 1 from public.cotizaciones_aprobadas;
    raise exception 'A4: anon leyó la tabla';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;
rollback;

-- @test aprobar: el permiso se mira antes de tomar nada, los candados van vehículo → cotización → aprobada y el trigger anota sin candados (A5)
do $$
declare s text; p_tiene integer; p_veh integer; p_cot integer; p_apr integer; t text;
begin
  select pg_get_functiondef('public.cotizacion_aprobar(uuid, timestamptz)'::regprocedure) into s;
  p_tiene := position('tiene_permiso(' in s);
  p_veh := position('for key share' in s);
  p_cot := regexp_instr(s, 'for\s+share');
  p_apr := regexp_instr(s, '_aprobada_candado\(');
  if p_tiene = 0 or p_veh = 0 or p_cot = 0 or p_apr = 0 then raise exception 'A5: falta una pieza (% % % %)', p_tiene, p_veh, p_cot, p_apr; end if;
  if not (p_tiene < p_veh and p_veh < p_cot and p_cot < p_apr) then raise exception 'A5: orden de candados roto (% % % %)', p_tiene, p_veh, p_cot, p_apr; end if;
  if position('update public.cotizaciones ' in s) > 0 then raise exception 'A5: aprobar escribe cotizaciones'; end if;
  select pg_get_functiondef('public._cotizaciones_aprobadas_al_confirmar()'::regprocedure) into s;
  if position('order by x' in s) = 0 or position('_aprobada_candado' in s) = 0 or position('_aprobada_candado' in s) > position('_aprobada_reponer' in s) then
    raise exception 'A5: al confirmar debe ordenar y tomar el candado antes de reponer'; end if;
  select pg_get_functiondef('public._cotizacion_aprobada_anotar()'::regprocedure) into s;
  if s ~* 'advisory|for\s+(update|share|key|no\s+key)|insert\s+into|update\s+public|delete\s+from' then raise exception 'A5: anotar toma candados o escribe tablas'; end if;
  select pg_get_triggerdef(t.oid) into t from pg_trigger t where t.tgname = 'trg_cotizaciones_aprobadas_al_confirmar';
  if t not like '%DEFERRABLE INITIALLY DEFERRED%' then raise exception 'A5: el trigger no es diferido: %', t; end if;
end $$;
