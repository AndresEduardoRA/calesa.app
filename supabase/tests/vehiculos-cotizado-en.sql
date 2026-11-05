-- `vehiculos.cotizado_en` (paso 4.14-1): cuándo se cotizó por última vez un vehículo. La escribe sólo el trigger `trg_vehiculo_cotizado` de `cotizaciones` (crear con ese
-- vehículo o pasar una cotización a él; nunca retrocede), sin mover la versión de la ficha ni escribir en `actividad`; el relleno de la migración es `_vehiculos_cotizado_rellenar()`.
-- Corre después de `cotizacion-tabla.sql`; la dueña es `…0001` (la crea `humo.sql`). Cada bloque abre su transacción y la revierte: `now()` no cambia dentro del bloque, así
-- que lo que tiene que moverse se deja antes en el pasado, como postgres y sin triggers (`session_replication_role = replica`).

create temp sequence vc_telefono;
create or replace function pg_temp.vc_como(p_quien uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_quien, 'role', 'authenticated')::text, true);
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje} si falla (lo hecho se deshace: va en su propia subtransacción).
create or replace function pg_temp.vc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text;
begin
  perform pg_temp.vc_como(p_quien);
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

-- El terreno: un origen con una fórmula publicada (un input y su total), un lead y dos vehículos. Todo lo llama la dueña.
create or replace function pg_temp.vc_preparar() returns jsonb language plpgsql as $f$
declare o uuid; f uuid; l uuid; v1 uuid; v2 uuid;
begin
  insert into public.origenes (clave, nombre) values ('vc_' || substr(gen_random_uuid()::text, 1, 8), 'VC origen ' || substr(gen_random_uuid()::text, 1, 8)) returning id into o;
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad) values (o, 1, 'publicada',
    jsonb_build_object('nodos', jsonb_build_array(
      jsonb_build_object('id', 'tc', 'tipo', 'tipo_cambio', 'clave', 'oficial', 'etiqueta', 'TC', 'formato', 'raw'),
      jsonb_build_object('id', 'visible', 'tipo', 'input', 'etiqueta', 'Visible', 'bucket', 'origen'),
      jsonb_build_object('id', 'total', 'tipo', 'calculo', 'op', 'suma', 'de', jsonb_build_array('visible'), 'etiqueta', 'Total', 'salida', 'total', 'bucket', 'origen')),
      'buckets', jsonb_build_object('origen', 'tc')),
    '{}', '{}', jsonb_build_object('tc', jsonb_build_object('ver', 'todos', 'editar', 'todos'), 'visible', jsonb_build_object('ver', 'todos', 'editar', 'todos'),
                                   'total', jsonb_build_object('ver', 'todos', 'editar', null))) returning id into f;
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('VC lead', '7214' || lpad(nextval('pg_temp.vc_telefono')::text, 4, '0'), '00000000-0000-0000-0000-000000000001', (select id from public.origenes_lead where clave = 'web'), '{}') returning id into l;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VC vehículo 1', 'toyota') returning id into v1;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VC vehículo 2', 'mazda') returning id into v2;
  return jsonb_build_object('o', o, 'f', f, 'l', l, 'v1', v1, 'v2', v2);
end $f$;

-- Crear una cotización como la dueña (la hoja abierta la firma postgres con su identidad), con un vehículo del inventario o uno «a mano» (`p_nuevo`).
create or replace function pg_temp.vc_crear(t jsonb, p_v uuid, p_nuevo jsonb default null) returns jsonb language plpgsql as $f$
declare v_tok text; r jsonb;
begin
  perform pg_temp.vc_como('00000000-0000-0000-0000-000000000001');
  v_tok := public._cotizacion_abierta_firmar((t ->> 'o')::uuid, (t ->> 'f')::uuid, now());
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('select public.cotizacion_crear(%L, %L, %L, %L::jsonb, %L, %L, %L::jsonb)',
         gen_random_uuid(), t ->> 'o', t ->> 'l', '{"inputs": {"visible": 100}}', v_tok, p_v, p_nuevo));
  if r ? 'error' then raise exception 'crear falló: %', r; end if;
  return r;
end $f$;

-- Guardar la cotización como la dueña, con su versión, ese input y ese vehículo.
create or replace function pg_temp.vc_guardar(p_c uuid, p_visible int, p_v uuid) returns jsonb language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('select public.cotizacion_guardar(%L, %L, %L, %L::jsonb, null, null, null, %L, false)',
         p_c, gen_random_uuid(), (select actualizado_en from public.cotizaciones where id = p_c), jsonb_build_object('inputs', jsonb_build_object('visible', p_visible)), p_v));
  if r ? 'error' then raise exception 'guardar falló: %', r; end if;
  return r;
end $f$;

-- Deja el vehículo con su versión hace un día y ese `cotizado_en`, sin triggers (ni versión ni auditoría).
create or replace function pg_temp.vc_pasado(p_v uuid, p_cotizado timestamptz) returns void language plpgsql as $f$
begin
  perform set_config('session_replication_role', 'replica', true);
  update public.vehiculos set actualizado_en = now() - interval '1 day', cotizado_en = p_cotizado where id = p_v;
  perform set_config('session_replication_role', 'origin', true);
end $f$;

-- En plpgsql y no en sql: sin la migración, la prueba cae en su bloque y no al crear el ayudante.
create or replace function pg_temp.vc_cot(p_v uuid) returns timestamptz language plpgsql as $f$ begin return (select cotizado_en from public.vehiculos where id = p_v); end $f$;
create or replace function pg_temp.vc_ver(p_v uuid) returns timestamptz language sql as $f$ select actualizado_en from public.vehiculos where id = p_v $f$;
create or replace function pg_temp.vc_auditado(p_v uuid, p_accion text) returns bigint language sql as $f$
  select count(*) from public.actividad where tabla = 'vehiculos' and registro_id = p_v::text and accion = p_accion
$f$;

-- @test cotizado_en: crear con un vehículo del inventario lo pone en la hora de la cotización; sin vehículo no toca ninguno; «a mano» nace cotizado
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); r jsonb; v1 uuid := (t ->> 'v1')::uuid; v2 uuid := (t ->> 'v2')::uuid; vn uuid := gen_random_uuid(); c public.cotizaciones;
begin
  if pg_temp.vc_cot(v1) is not null or pg_temp.vc_cot(v2) is not null then raise exception 'un vehículo nuevo debía nacer sin cotizar'; end if;
  -- Una preventa sin vehículo sólo se guarda con el ajuste en «no».
  update public.ajustes_empresa set vehiculo_obligatorio_al_cotizar = false where id = 1;
  r := pg_temp.vc_crear(t, null);
  if pg_temp.vc_cot(v1) is not null or pg_temp.vc_cot(v2) is not null then raise exception 'crear sin vehículo tocó uno'; end if;
  r := pg_temp.vc_crear(t, v1);
  select * into c from public.cotizaciones where id = (r -> 'cotizacion' ->> 'id')::uuid;
  if pg_temp.vc_cot(v1) is distinct from c.creado_en then raise exception 'crear con el vehículo debía dejarlo en la hora de la cotización: % y %', pg_temp.vc_cot(v1), c.creado_en; end if;
  if pg_temp.vc_cot(v2) is not null then raise exception 'crear con un vehículo tocó otro'; end if;
  r := pg_temp.vc_crear(t, null, jsonb_build_object('id', vn, 'datos', jsonb_build_object('titulo', 'VC a mano')));
  if pg_temp.vc_cot(vn) is distinct from now() then raise exception '«a mano» debía dejar el vehículo nuevo cotizado: %', pg_temp.vc_cot(vn); end if;
end $$;
rollback;

-- @test cotizado_en: nunca retrocede (otra cotización más vieja no lo baja) y la papelera de la cotización, ida y vuelta, no lo cambia
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); r jsonb; v1 uuid := (t ->> 'v1')::uuid; c uuid; v_lote uuid; v_futuro constant timestamptz := now() + interval '1 day';
        v_atras constant timestamptz := now() - interval '3 days';
begin
  perform pg_temp.vc_pasado(v1, v_futuro);
  r := pg_temp.vc_crear(t, v1);
  if pg_temp.vc_cot(v1) is distinct from v_futuro then raise exception 'crear hizo retroceder cotizado_en: %', pg_temp.vc_cot(v1); end if;
  c := (r -> 'cotizacion' ->> 'id')::uuid;
  perform pg_temp.vc_pasado(v1, v_atras);
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('select to_jsonb(public.papelera_enviar(''cotizaciones'', array[%L]::uuid[]))', c));
  if r ? 'error' then raise exception 'mandar a la papelera falló: %', r; end if;
  v_lote := (r #>> '{}')::uuid;
  if pg_temp.vc_cot(v1) is distinct from v_atras then raise exception 'mandar la cotización a la papelera cambió cotizado_en: %', pg_temp.vc_cot(v1); end if;
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('select to_jsonb(public.papelera_restaurar(%L))', v_lote));
  if r ? 'error' then raise exception 'restaurar falló: %', r; end if;
  if pg_temp.vc_cot(v1) is distinct from v_atras then raise exception 'restaurar la cotización cambió cotizado_en: %', pg_temp.vc_cot(v1); end if;
end $$;
rollback;

-- @test cotizado_en: guardar una cotización que pasa a otro vehículo mueve ése (y no el de antes); guardarla sin cambiar de vehículo no mueve nada
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); r jsonb; v1 uuid := (t ->> 'v1')::uuid; v2 uuid := (t ->> 'v2')::uuid; c uuid; v_atras constant timestamptz := now() - interval '1 day';
begin
  c := (pg_temp.vc_crear(t, v1) -> 'cotizacion' ->> 'id')::uuid;
  perform pg_temp.vc_pasado(v1, v_atras);
  perform pg_temp.vc_pasado(v2, v_atras);
  r := pg_temp.vc_guardar(c, 100, v2);
  if (select vehiculo_id from public.cotizaciones where id = c) is distinct from v2 then raise exception 'la cotización no pasó al otro vehículo: %', r; end if;
  if pg_temp.vc_cot(v2) is distinct from now() then raise exception 'pasar la cotización a un vehículo debía moverlo: %', pg_temp.vc_cot(v2); end if;
  if pg_temp.vc_cot(v1) is distinct from v_atras then raise exception 'pasar la cotización movió el vehículo de antes: %', pg_temp.vc_cot(v1); end if;
  perform pg_temp.vc_pasado(v2, v_atras);
  r := pg_temp.vc_guardar(c, 200, v2);
  if (select (valores ->> 'visible')::numeric from public.cotizaciones where id = c) is distinct from 200 then raise exception 'guardar sin cambiar de vehículo no guardó: %', r; end if;
  if pg_temp.vc_cot(v2) is distinct from v_atras then raise exception 'guardar sin cambiar de vehículo movió cotizado_en: %', pg_temp.vc_cot(v2); end if;
end $$;
rollback;

-- @test cotizado_en: cotizar no edita el vehículo (ni su versión ni actividad), y quien tenía la ficha abierta guarda sin conflicto
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); r jsonb; v1 uuid := (t ->> 'v1')::uuid; v_ver timestamptz; n bigint;
begin
  perform pg_temp.vc_pasado(v1, now() - interval '1 day');
  v_ver := pg_temp.vc_ver(v1);
  n := pg_temp.vc_auditado(v1, 'vehiculos.update');
  r := pg_temp.vc_crear(t, v1);
  if pg_temp.vc_cot(v1) is distinct from now() then raise exception 'cotizar debía mover cotizado_en'; end if;
  if pg_temp.vc_ver(v1) is distinct from v_ver then raise exception 'cotizar movió la versión de la ficha: % y %', pg_temp.vc_ver(v1), v_ver; end if;
  if pg_temp.vc_auditado(v1, 'vehiculos.update') <> n then raise exception 'cotizar escribió el vehículo en actividad'; end if;
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('select public.vehiculo_guardar(%L, %L, %L::jsonb)', v1, v_ver, '{"marca": "VC editada"}'));
  if r ? 'error' then raise exception 'quien tenía la ficha abierta antes de cotizar debía guardar sin conflicto: %', r; end if;
end $$;
rollback;

-- @test cotizado_en: lo demás sigue editando el vehículo (guardar la ficha mueve la versión y se audita; el alta se audita)
-- Es la guarda contra un `when` de más en los triggers de `vehiculos`: no nombra `cotizado_en`, así que también pasa sin la migración.
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); r jsonb; v1 uuid := (t ->> 'v1')::uuid; v_ver timestamptz; n bigint; v_nuevo uuid;
begin
  perform set_config('session_replication_role', 'replica', true);
  update public.vehiculos set actualizado_en = now() - interval '1 day' where id = v1;
  perform set_config('session_replication_role', 'origin', true);
  v_ver := pg_temp.vc_ver(v1);
  n := pg_temp.vc_auditado(v1, 'vehiculos.update');
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('select public.vehiculo_guardar(%L, %L, %L::jsonb)', v1, v_ver, '{"marca": "VC editada"}'));
  if r ? 'error' then raise exception 'guardar la ficha falló: %', r; end if;
  if pg_temp.vc_ver(v1) is distinct from now() then raise exception 'guardar la ficha debía mover la versión: %', pg_temp.vc_ver(v1); end if;
  if pg_temp.vc_auditado(v1, 'vehiculos.update') <> n + 1 then raise exception 'guardar la ficha debía quedar en actividad'; end if;
  if not exists (select 1 from public.actividad where tabla = 'vehiculos' and registro_id = v1::text and accion = 'vehiculos.update'
                  and antes ->> 'marca' = 'toyota' and despues ->> 'marca' = 'VC editada') then
    raise exception 'la fila de actividad no trae antes y después';
  end if;
  insert into public.vehiculos (origen_id, titulo, marca) values ((t ->> 'o')::uuid, 'VC alta', 'kia') returning id into v_nuevo;
  if pg_temp.vc_auditado(v_nuevo, 'vehiculos.insert') <> 1 then raise exception 'el alta de un vehículo debía quedar en actividad'; end if;
end $$;
rollback;

-- @test cotizado_en: nadie de la app ejecuta las funciones del trigger y del relleno, ni escribe la columna
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); r jsonb; f text; quien text;
begin
  foreach f in array array['public._vehiculo_cotizado()', 'public._vehiculos_cotizado_rellenar()'] loop
    foreach quien in array array['authenticated', 'anon'] loop
      if has_function_privilege(quien, f, 'execute') then raise exception '% ejecuta %', quien, f; end if;
    end loop;
    if exists (select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0) then
      raise exception 'PUBLIC ejecuta %', f;
    end if;
  end loop;
  r := pg_temp.vc_corre('00000000-0000-0000-0000-000000000001', format('update public.vehiculos set cotizado_en = now() where id = %L', t ->> 'v1'));
  if r ->> 'error' is distinct from '42501' then raise exception 'authenticated escribió cotizado_en: %', r; end if;
end $$;
rollback;

-- @test cotizado_en: el relleno toma la cotización más nueva de cada vehículo (también la de la papelera), nunca retrocede, no edita el vehículo y es idempotente
begin;
do $$
declare t jsonb := pg_temp.vc_preparar(); o uuid := (t ->> 'o')::uuid; f uuid := (t ->> 'f')::uuid; va uuid; vb uuid; vc uuid; vd uuid; v uuid; n bigint;
        d constant uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VC A', 'kia') returning id into va;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VC B', 'kia') returning id into vb;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VC C', 'kia') returning id into vc;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'VC D', 'kia') returning id into vd;
  perform pg_temp.vc_pasado(va, null);
  perform pg_temp.vc_pasado(vb, null);
  perform pg_temp.vc_pasado(vc, null);
  perform pg_temp.vc_pasado(vd, now());
  -- Sin triggers (no mueven nada al insertar) y cada una con su hora.
  perform set_config('session_replication_role', 'replica', true);
  insert into public.cotizaciones (origen_id, creado_por, formula_id, vehiculo_id, valores, fuentes, tipos_cambio, totales, total_base, creado_en, eliminado_en, eliminado_por)
  values (o, d, f, va, '{}', '{}', '{}', '{"usd": 1}', 1, now() - interval '3 days', null, null),
         (o, d, f, va, '{}', '{}', '{}', '{"usd": 1}', 1, now() - interval '1 day', null, null),
         (o, d, f, vb, '{}', '{}', '{}', '{"usd": 1}', 1, now() - interval '5 days', null, null),
         (o, d, f, vb, '{}', '{}', '{}', '{"usd": 1}', 1, now() - interval '2 days', now() - interval '1 hour', d),
         (o, d, f, vd, '{}', '{}', '{}', '{"usd": 1}', 1, now() - interval '4 days', null, null);
  perform set_config('session_replication_role', 'origin', true);
  n := (select count(*) from public.actividad where tabla = 'vehiculos' and accion = 'vehiculos.update' and registro_id in (va::text, vb::text, vc::text, vd::text));
  for i in 1 .. 2 loop
    perform public._vehiculos_cotizado_rellenar();
    if pg_temp.vc_cot(va) is distinct from now() - interval '1 day' then raise exception 'A debía quedar en su cotización más nueva (vuelta %): %', i, pg_temp.vc_cot(va); end if;
    if pg_temp.vc_cot(vb) is distinct from now() - interval '2 days' then raise exception 'B debía quedar en la de la papelera, la más nueva (vuelta %): %', i, pg_temp.vc_cot(vb); end if;
    if pg_temp.vc_cot(vc) is not null then raise exception 'C no tiene cotizaciones y quedó cotizado (vuelta %)', i; end if;
    if pg_temp.vc_cot(vd) is distinct from now() then raise exception 'D retrocedió (vuelta %): %', i, pg_temp.vc_cot(vd); end if;
  end loop;
  foreach v in array array[va, vb, vc, vd] loop
    if pg_temp.vc_ver(v) is distinct from now() - interval '1 day' then raise exception 'el relleno movió la versión de %', v; end if;
  end loop;
  if (select count(*) from public.actividad where tabla = 'vehiculos' and accion = 'vehiculos.update' and registro_id in (va::text, vb::text, vc::text, vd::text)) <> n then
    raise exception 'el relleno escribió los vehículos en actividad';
  end if;
end $$;
rollback;
