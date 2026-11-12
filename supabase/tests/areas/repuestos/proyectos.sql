-- El ciclo de vida de un proyecto de repuestos (paso 8.08-1, C1–C4). No depende de otro archivo (`SOLO=areas/repuestos/proyectos.sql`); cada
-- bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   R1. Externo con etiqueta: devuelve {id, numero, actualizado_en}; mismo id y misma persona, la misma respuesta; otra persona, 23505.
--   R2. Sin `repuestos.editar`, 42501; un vehículo que no se ve da el mismo texto que uno inexistente (hint vehiculo_id); un segundo proyecto del mismo
--       vehículo, 23505 «Ese vehículo ya tiene un proyecto.»; un lead ajeno, 42501 hint lead_id.
--   R3. Cerrar con versión vieja: PT409 sin escribir; dos veces: 23514 hint estado; reabrir deja cerrado_en nulo.
--   R4. Eliminar con un ítem vivo: 23514 hint en_uso; vacío se elimina y deja de leerse; restaurar con el esperado vuelve; con otro proyecto del
--       vehículo, 23505.
--   R5. `authenticated` no inserta directo ni cambia cerrado_en, eliminado_en o vehiculo_id (42501); `notas` sí.
--   R6. Con `repuestos.ver` y sin `repuestos.editar`, crear, cerrar, reabrir, eliminar y restaurar dan 42501 y la fila no cambia.

create or replace function pg_temp.rp_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rp@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`.
create or replace function pg_temp.rp_persona(p_concesiones text[], p_alcance text default 'todos') returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rp_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rp_' || substr(v_id::text, 1, 8), 'rp ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, p_alcance::public.alcance_permiso);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rp_origen() returns uuid language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); o uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('rp_' || s, 'rp origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

create or replace function pg_temp.rp_vehiculo(p_origen uuid) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo) values (p_origen, 'rp vehículo') returning id;
$f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.rp_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.rp_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rp_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rp_crear(p_quien uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', p_id, p_datos));
$f$;

-- @test repuestos: crear un proyecto externo, idempotente por id; otra persona con el mismo id da 23505 (R1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  otra uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  i uuid := gen_random_uuid(); r jsonb; r2 jsonb;
begin
  r := pg_temp.rp_ok('R1 crear', pg_temp.rp_crear(ed, i, '{"vehiculo_etiqueta": "  Hilux 2015 ", "cliente_nombre": ""}'));
  if (select array_agg(k order by k) from jsonb_object_keys(r) k) <> array['actualizado_en', 'id', 'numero'] or (r ->> 'id')::uuid <> i then
    raise exception 'R1: la respuesta debía ser {id, numero, actualizado_en} y dio %', r;
  end if;
  if not exists (select 1 from public.repuestos_proyectos where id = i and creado_por = ed and vehiculo_etiqueta = 'Hilux 2015' and cliente_nombre is null) then
    raise exception 'R1: el proyecto no quedó con su creador, la etiqueta recortada y el cliente vacío como nulo';
  end if;
  r2 := pg_temp.rp_crear(ed, i, '{"vehiculo_etiqueta": "otra"}');
  if r2 is distinct from r then raise exception 'R1: el mismo id debía dar la misma respuesta: % y %', r, r2; end if;
  perform pg_temp.rp_es('R1 otra persona, mismo id', pg_temp.rp_crear(otra, i, '{"vehiculo_etiqueta": "x"}'), '23505', 'id');
  perform pg_temp.rp_es('R1 clave de más', pg_temp.rp_crear(ed, gen_random_uuid(), '{"vehiculo_etiqueta": "x", "cerrado_en": "2026-01-01"}'), '22023', 'cerrado_en');
  perform pg_temp.rp_es('R1 externo sin etiqueta', pg_temp.rp_crear(ed, gen_random_uuid(), '{}'), '22023', 'vehiculo_etiqueta', 'Escribe qué vehículo es.');
  perform pg_temp.rp_es('R1 uuid mal escrito', pg_temp.rp_crear(ed, gen_random_uuid(), '{"vehiculo_id": "abc"}'), '22023', 'vehiculo_id');
end $$;
rollback;

-- @test repuestos: crear pide repuestos.editar y un vehículo que se ve; uno por vehículo; el lead lo exige el trigger (R2)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); otro uuid := pg_temp.rp_origen();
  v uuid := pg_temp.rp_vehiculo(o); ajeno uuid := pg_temp.rp_vehiculo(otro);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'vehiculos.ver@' || o]);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  l uuid; a jsonb; b jsonb;
begin
  perform pg_temp.rp_es('R2 sin repuestos.editar', pg_temp.rp_crear(ve, gen_random_uuid(), '{"vehiculo_etiqueta": "x"}'), '42501', null);
  a := pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_id', ajeno));
  b := pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_id', gen_random_uuid()));
  perform pg_temp.rp_es('R2 vehículo que no ve', a, '42501', 'vehiculo_id', 'No encontramos este vehículo o no tienes acceso.');
  perform pg_temp.rp_es('R2 vehículo inexistente', b, '42501', 'vehiculo_id', a ->> 'mensaje');
  perform pg_temp.rp_es('R2 vehículo con etiqueta', pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_id', v, 'vin', 'X1')), '22023', 'vehiculo_etiqueta');
  perform pg_temp.rp_ok('R2 con acceso', pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_id', v)));
  perform pg_temp.rp_es('R2 segundo del vehículo', pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_id', v)), '23505', 'vehiculo_id',
    'Ese vehículo ya tiene un proyecto.');
  insert into public.leads (nombre, telefono_principal, creado_por)
  values ('rp lead', '59' || lpad((('x' || substr(md5(gen_random_uuid()::text), 1, 7))::bit(28)::int % 100000000)::text, 8, '0'), ve) returning id into l;
  perform pg_temp.rp_es('R2 lead ajeno', pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_etiqueta', 'x', 'lead_id', l)), '42501', 'lead_id');
end $$;
rollback;

-- @test repuestos: cerrar y reabrir con versión; cerrar dos veces da 23514 (R3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  i uuid := gen_random_uuid(); r jsonb; t timestamptz;
begin
  t := (pg_temp.rp_ok('R3 crear', pg_temp.rp_crear(ed, i, '{"vehiculo_etiqueta": "x"}')) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rp_es('R3 versión vieja', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', i, t - interval '1 second')), 'PT409', null);
  if (select cerrado_en from public.repuestos_proyectos where id = i) is not null then raise exception 'R3: un PT409 cerró el proyecto'; end if;
  r := pg_temp.rp_ok('R3 cerrar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', i, t)));
  if r ->> 'cerrado_en' is null then raise exception 'R3: cerrar no dejó cerrado_en: %', r; end if;
  perform pg_temp.rp_es('R3 cerrar dos veces', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', i, r ->> 'actualizado_en')), '23514', 'estado');
  r := pg_temp.rp_ok('R3 reabrir', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_reabrir(%L, %L)', i, r ->> 'actualizado_en')));
  if (select cerrado_en from public.repuestos_proyectos where id = i) is not null then raise exception 'R3: reabrir no dejó cerrado_en nulo'; end if;
end $$;
rollback;

-- @test repuestos: eliminar sólo vacío; restaurar vuelve si el vehículo no tiene otro (R4)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); v uuid := pg_temp.rp_vehiculo(o);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'vehiculos.ver@' || o]);
  i uuid := gen_random_uuid(); r jsonb; t timestamptz; it uuid;
begin
  t := (pg_temp.rp_ok('R4 crear', pg_temp.rp_crear(ed, i, jsonb_build_object('vehiculo_id', v))) ->> 'actualizado_en')::timestamptz;
  insert into public.repuestos_items (proyecto_id, descripcion) values (i, 'rp ítem') returning id into it;
  perform pg_temp.rp_es('R4 con ítem', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', i, t)), '23514', 'en_uso',
    'Tiene ítems: ciérralo en vez de eliminarlo.');
  delete from public.repuestos_items where id = it;
  insert into public.repuestos_compras (proyecto_id, moneda, monto) values (i, 'USD', 10);
  perform pg_temp.rp_es('R4 con compra', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', i, t)), '23514', 'en_uso',
    'Tiene compras, pagos o cotizaciones: ciérralo en vez de eliminarlo.');
  delete from public.repuestos_compras where proyecto_id = i;
  r := pg_temp.rp_ok('R4 eliminar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', i, t)));
  if pg_temp.rp_corre(ed, format('select to_jsonb(count(*)) from public.repuestos_proyectos where id = %L', i)) <> '0'::jsonb then
    raise exception 'R4: un proyecto eliminado se sigue leyendo';
  end if;
  perform pg_temp.rp_es('R4 restaurar con otro esperado', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_restaurar(%L, %L)', i, t - interval '1 second')), 'PT409', 'conflicto');
  perform pg_temp.rp_ok('R4 restaurar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_restaurar(%L, %L)', i, r ->> 'eliminado_en')));
  if (select eliminado_en from public.repuestos_proyectos where id = i) is not null then raise exception 'R4: restaurar no lo devolvió'; end if;
  -- Eliminado otra vez, y el vehículo con un proyecto nuevo: restaurar choca con el único por vehículo.
  r := pg_temp.rp_ok('R4 eliminar otra vez', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', i,
         (select actualizado_en from public.repuestos_proyectos where id = i))));
  perform pg_temp.rp_ok('R4 otro proyecto', pg_temp.rp_crear(ed, gen_random_uuid(), jsonb_build_object('vehiculo_id', v)));
  perform pg_temp.rp_es('R4 restaurar con otro', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_restaurar(%L, %L)', i, r ->> 'eliminado_en')),
    '23505', 'vehiculo_id', 'Ese vehículo ya tiene otro proyecto.');
end $$;
rollback;

-- @test repuestos: sin INSERT directo ni UPDATE de cerrado_en, eliminado_en o vehiculo_id; notas sí (R5)
begin;
do $$
declare
  o uuid := pg_temp.rp_origen(); v uuid := pg_temp.rp_vehiculo(o);
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  i uuid := gen_random_uuid(); c text;
begin
  perform pg_temp.rp_ok('R5 crear', pg_temp.rp_crear(ed, i, '{"vehiculo_etiqueta": "x"}'));
  perform pg_temp.rp_es('R5 insert directo', pg_temp.rp_corre(ed, format(
    'insert into public.repuestos_proyectos (vehiculo_etiqueta, creado_por) values (%L, %L) returning to_jsonb(id)', 'y', ed)), '42501', null);
  foreach c in array array['cerrado_en = now()', 'eliminado_en = now()', format('vehiculo_id = %L, vehiculo_etiqueta = null', v)] loop
    perform pg_temp.rp_es('R5 update ' || c, pg_temp.rp_corre(ed, format('update public.repuestos_proyectos set %s where id = %L returning to_jsonb(id)', c, i)),
      '42501', null);
  end loop;
  perform pg_temp.rp_ok('R5 notas', pg_temp.rp_corre(ed, format('update public.repuestos_proyectos set notas = %L where id = %L returning to_jsonb(id)', 'n', i)));
  -- El check: un proyecto con vehículo no toma etiqueta por la columna editable.
  update public.repuestos_proyectos set vehiculo_etiqueta = null where id = i;
  begin
    update public.repuestos_proyectos set vehiculo_id = v, vehiculo_etiqueta = 'z' where id = i;
    raise exception 'R5: un proyecto con vehículo aceptó etiqueta';
  exception when check_violation then null;
  end;
end $$;
rollback;

-- @test repuestos: con repuestos.ver y sin repuestos.editar ninguna RPC del proyecto escribe (R6)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); ta timestamptz; r jsonb; antes jsonb; f text;
begin
  ta := (pg_temp.rp_ok('R6 crear abierto', pg_temp.rp_crear(ed, a, '{"vehiculo_etiqueta": "a"}')) ->> 'actualizado_en')::timestamptz;
  perform pg_temp.rp_ok('R6 crear b', pg_temp.rp_crear(ed, b, '{"vehiculo_etiqueta": "b"}'));
  r := pg_temp.rp_ok('R6 eliminar b', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_eliminar(%L, %L)', b,
         (select actualizado_en from public.repuestos_proyectos where id = b))));
  antes := (select jsonb_agg(to_jsonb(x) order by x.id) from public.repuestos_proyectos x where x.id in (a, b));
  perform pg_temp.rp_es('R6 crear', pg_temp.rp_crear(ve, gen_random_uuid(), '{"vehiculo_etiqueta": "x"}'), '42501', null);
  foreach f in array array['cerrar', 'reabrir', 'eliminar'] loop
    perform pg_temp.rp_es('R6 ' || f, pg_temp.rp_corre(ve, format('select public.repuesto_proyecto_%s(%L, %L)', f, a, ta)), '42501', null);
  end loop;
  perform pg_temp.rp_es('R6 restaurar', pg_temp.rp_corre(ve, format('select public.repuesto_proyecto_restaurar(%L, %L)', b, r ->> 'eliminado_en')), '42501', null);
  if (select jsonb_agg(to_jsonb(x) order by x.id) from public.repuestos_proyectos x where x.id in (a, b)) is distinct from antes then
    raise exception 'R6: un rechazo cambió un proyecto';
  end if;
  if (select count(*) from public.repuestos_proyectos where creado_por = ve) <> 0 then raise exception 'R6: sin permiso creó un proyecto'; end if;
end $$;
rollback;
