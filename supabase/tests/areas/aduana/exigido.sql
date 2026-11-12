-- La tabla protege la composición de una declaración (paso 6.07-2, C17–C19). No depende de otro archivo (`SOLO=areas/aduana/exigido.sql`). Los
-- ayudantes son copia de `guardar.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   X1. Un vehículo en una fase con aduana.declaracion bloqueante: quitarlo por la RPC da 23514 hint aduana.declaracion y la fila sigue viva; lo mismo
--       con aduana.canal (hint aduana.canal); con el requisito no bloqueante, quitar pasa.
--   X2. Como superusuario (la tabla, no la RPC): borrar la fila viva del X1 y borrar su cabecera, 23514; con canal, quitar o agregar directo, 23514
--       canal; cambiar vehiculo_id, 22023; borrar una fila ya quitada pasa; purgar un vehículo de una declaración con canal pasa por la cascada (D27).

-- La primera cuenta de una base vacía queda dueña (con `SOLO=`): una de relleno antes, para que ninguna de la prueba lo sea.
create or replace function pg_temp.adu_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-adu@ejemplo.com', '{"invitado": true}');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('adu_' || substr(v_id::text, 1, 8), 'adu ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Un origen `manual` con la regla `aduana` encendida, una fase que permite aduana (con v1, v2, v3) y otra que no (con v4); otro origen, sin la regla aduana, con w.
create or replace function pg_temp.adu_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; fb uuid; v1 uuid; v2 uuid; v3 uuid; v4 uuid; w uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('adu_' || s, 'adu origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('adu2_' || s, 'adu origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'aduana', true)
    on conflict (flujo_id, regla) do update set activa = true;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, permite_aduana) values (fl, 'adu en aduana', 1, true, true) returning id into fa;
  insert into public.fases (flujo_id, nombre, orden, permite_aduana) values (fl, 'adu sin aduana', 2, false) returning id into fb;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v1', fa) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v2', fa) returning id into v2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v3', fa) returning id into v3;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v4', fb) returning id into v4;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w') returning id into w;
  return jsonb_build_object('o', o, 'o2', o2, 'flujo', fl, 'fase', fa, 'fase_no', fb, 'v1', v1, 'v2', v2, 'v3', v3, 'v4', v4, 'w', w);
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.adu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.adu_guardar(p_quien uuid, p_id uuid, p_esperada timestamptz, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select public.declaracion_guardar(%L, %L, %L)', p_id, p_esperada, p_datos));
$f$;

create or replace function pg_temp.adu_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.adu_pasa(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'actualizado_en' is null then raise exception '%: debía guardar y dio %', p_que, p_r; end if;
  return (p_r ->> 'actualizado_en')::timestamptz;
end $f$;

create or replace function pg_temp.adu_poner(p_quien uuid, p_id uuid, p_esperada timestamptz, p_agregar uuid[], p_quitar uuid[] default '{}')
returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select public.declaracion_vehiculos_poner(%L, %L, %L, %L)', p_id, p_esperada, p_agregar, p_quitar));
$f$;

create or replace function pg_temp.adu_version(p_id uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.declaraciones_aduana where id = p_id;
$f$;

-- Una declaración como `p_quien` con `p_vehiculos` vivos: su id.
create or replace function pg_temp.adu_con(p_quien uuid, p_numero text, p_vehiculos uuid[]) returns uuid language plpgsql as $f$
declare r jsonb := pg_temp.adu_guardar(p_quien, null, null, jsonb_build_object('numero', p_numero));
begin
  perform pg_temp.adu_pasa('crear ' || p_numero, r);
  perform pg_temp.adu_pasa('poner ' || p_numero, pg_temp.adu_poner(p_quien, (r ->> 'id')::uuid, (r ->> 'actualizado_en')::timestamptz, p_vehiculos));
  return (r ->> 'id')::uuid;
end $f$;

-- Corre `p_sql` como superusuario dentro de un subbloque: `{}` o `{error, hint}`.
create or replace function pg_temp.adu_directo(p_sql text) returns jsonb language plpgsql as $f$
declare v_e text; v_h text;
begin
  execute p_sql;
  return '{}'::jsonb;
exception when others then
  get stacked diagnostics v_e = returned_sqlstate, v_h = pg_exception_hint;
  return jsonb_build_object('error', v_e, 'hint', nullif(v_h, ''));
end $f$;

-- @test aduana: no se quita un vehículo cuya fase exige la declaración o el canal como bloqueante (X1)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; d1 uuid; r jsonb; q uuid; x1 uuid := (t ->> 'v1')::uuid;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d1 := pg_temp.adu_con(p, 'DUI-X1', array[x1]);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values ((t ->> 'fase')::uuid, 'dato', true, 'aduana.declaracion') returning id into q;
  r := pg_temp.adu_poner(p, d1, pg_temp.adu_version(d1), '{}', array[x1]);
  perform pg_temp.adu_es('X1 declaración', r, '23514', 'aduana.declaracion');
  if (select removido_en from public.declaraciones_vehiculos where declaracion_id = d1 and vehiculo_id = x1) is not null then
    raise exception 'X1: la fila debía seguir viva';
  end if;
  delete from public.fases_requisitos where fases_requisitos.id = q;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values ((t ->> 'fase')::uuid, 'dato', true, 'aduana.canal') returning id into q;
  r := pg_temp.adu_poner(p, d1, pg_temp.adu_version(d1), '{}', array[x1]);
  perform pg_temp.adu_es('X1 canal', r, '23514', 'aduana.canal');
  update public.fases_requisitos set bloqueante = false where fases_requisitos.id = q;
  perform pg_temp.adu_pasa('X1 no bloqueante', pg_temp.adu_poner(p, d1, pg_temp.adu_version(d1), '{}', array[x1]));
end $$;
rollback;

-- @test aduana: la tabla, por cualquier camino, congela la composición con canal y respeta lo que la fase exige (X2)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; d1 uuid; d2 uuid; r jsonb; q uuid;
  x1 uuid := (t ->> 'v1')::uuid; x2 uuid := (t ->> 'v2')::uuid; x3 uuid := (t ->> 'v3')::uuid;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d1 := pg_temp.adu_con(p, 'DUI-X2-1', array[x1]);
  d2 := pg_temp.adu_con(p, 'DUI-X2-2', array[x2]);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato) values ((t ->> 'fase')::uuid, 'dato', true, 'aduana.declaracion') returning id into q;
  r := pg_temp.adu_directo(format('delete from public.declaraciones_vehiculos where declaracion_id = %L and vehiculo_id = %L', d1, x1));
  perform pg_temp.adu_es('X2 borrar la fila viva', r, '23514', 'aduana.declaracion');
  r := pg_temp.adu_directo(format('delete from public.declaraciones_aduana where id = %L', d1));
  perform pg_temp.adu_es('X2 borrar la cabecera', r, '23514', 'aduana.declaracion');
  delete from public.fases_requisitos where fases_requisitos.id = q;
  perform pg_temp.adu_pasa('X2 canal', pg_temp.adu_corre(p, format('select public.declaracion_canal(%L, %L, %L)', d2, pg_temp.adu_version(d2), 'verde')));
  r := pg_temp.adu_directo(format('update public.declaraciones_vehiculos set removido_en = now() where declaracion_id = %L', d2));
  perform pg_temp.adu_es('X2 quitar con canal', r, '23514', 'canal');
  r := pg_temp.adu_directo(format('insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) values (%L, %L)', d2, x3));
  perform pg_temp.adu_es('X2 agregar con canal', r, '23514', 'canal');
  r := pg_temp.adu_directo(format('update public.declaraciones_vehiculos set vehiculo_id = %L where declaracion_id = %L', x3, d1));
  perform pg_temp.adu_es('X2 cambiar vehiculo_id', r, '22023');
  perform pg_temp.adu_pasa('X2 quitar x1', pg_temp.adu_poner(p, d1, pg_temp.adu_version(d1), '{}', array[x1]));
  r := pg_temp.adu_directo(format('delete from public.declaraciones_vehiculos where declaracion_id = %L and vehiculo_id = %L', d1, x1));
  if r ? 'error' then raise exception 'X2: borrar una fila ya quitada debía pasar: %', r; end if;
  r := pg_temp.adu_directo(format('delete from public.vehiculos where id = %L', x2));
  if r ? 'error' then raise exception 'X2: purgar el vehículo debía pasar por la cascada: %', r; end if;
  if exists (select 1 from public.declaraciones_vehiculos where vehiculo_id = x2) then raise exception 'X2: la cascada debía borrar la fila'; end if;
end $$;
rollback;
