-- Leer una declaración de aduana (paso 6.07-3, C12–C15, D31–D33, D41). No depende de otro archivo (`SOLO=areas/aduana/leer.sql`). Cada bloque abre su
-- transacción y la revierte. Los ayudantes son copia de `listar.sql`; la cabecera y la composición se siembran como superusuario.
--
-- Qué asegura:
--   R1. Quien ve v1 y no w recibe sólo v1 y hay_ocultos; quien no ve ninguno y no gestiona, P0002, igual que un id que no existe; con gestionar y sin ver
--       ninguno, la cabecera con vehiculos = []; sin las claves, 42501; un vehículo quitado no sale; pagada, faltan y tributo por vehículo siguen al
--       tributo del último (el assert de la fila, también en la lectura).
--   R2. El actualizado_en que devuelve sirve de esperada para declaracion_guardar; tras guardar, el viejo da PT409.

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

-- Un origen con v1, v2, v3 (en una fase que permite aduana) y otro con w y w2; las categorías de tributos y de flete.
create or replace function pg_temp.adu_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; fl uuid; fa uuid; v1 uuid; v2 uuid; v3 uuid; w uuid; w2 uuid; trib uuid; flete uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('adu_' || s, 'adu origen ' || s, 'manual') returning id into o;
  insert into public.origenes (clave, nombre, tipo) values ('adu2_' || s, 'adu origen 2 ' || s, 'manual') returning id into o2;
  select id into fl from public.flujos where origen_id = o;
  insert into public.flujos_reglas (flujo_id, regla, activa) values (fl, 'aduana', true)
    on conflict (flujo_id, regla) do update set activa = true;
  insert into public.fases (flujo_id, nombre, orden, es_inicial, permite_aduana) values (fl, 'adu en aduana', 1, true, true) returning id into fa;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v1', fa) returning id into v1;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v2', fa) returning id into v2;
  insert into public.vehiculos (origen_id, titulo, fase_id) values (o, 'adu v3', fa) returning id into v3;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w') returning id into w;
  insert into public.vehiculos (origen_id, titulo) values (o2, 'adu w2') returning id into w2;
  insert into public.categorias_gasto (nombre, proposito) values ('adu tributos ' || s, 'tributos') returning id into trib;
  insert into public.categorias_gasto (nombre, proposito) values ('adu flete ' || s, 'flete') returning id into flete;
  return jsonb_build_object('o', o, 'o2', o2, 'v1', v1, 'v2', v2, 'v3', v3, 'w', w, 'w2', w2, 'trib', trib, 'flete', flete, 's', s);
end $f$;

-- Una declaración con esos vehículos, como superusuario.
create or replace function pg_temp.adu_decl(p_numero text, p_vehiculos uuid[], p_creado timestamptz default now()) returns uuid language plpgsql as $f$
declare v_id uuid;
begin
  insert into public.declaraciones_aduana (numero, creado_en) values (p_numero, p_creado) returning id into v_id;
  insert into public.declaraciones_vehiculos (declaracion_id, vehiculo_id) select v_id, x from unnest(p_vehiculos) x;
  return v_id;
end $f$;

create or replace function pg_temp.adu_gasto(p_vehiculo uuid, p_categoria uuid) returns uuid language sql as $f$
  insert into public.gastos (vehiculo_id, categoria_id, moneda, monto, monto_base) values (p_vehiculo, p_categoria, 'USD', 10, 10) returning id;
$f$;

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

create or replace function pg_temp.adu_es(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.adu_leer(p_quien uuid, p_id uuid) returns jsonb language sql as $f$
  select pg_temp.adu_corre(p_quien, format('select public.declaracion_leer(%L)', p_id));
$f$;

-- Los vehiculo_id que devolvió, ordenados.
create or replace function pg_temp.adu_ids(p_r jsonb) returns text[] language sql as $f$
  select coalesce(array_agg(x ->> 'vehiculo_id' order by x ->> 'vehiculo_id'), '{}') from jsonb_array_elements(p_r -> 'vehiculos') x;
$f$;

-- @test aduana: leer devuelve los vehículos que ves; la que no ves y la que no existe dan el mismo P0002; sin las claves, 42501 (R1)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); sin uuid; uno uuid; gestor uuid; todo uuid; d_mix uuid; d_w uuid; r jsonb; r2 jsonb;
begin
  sin := pg_temp.adu_persona(array['vehiculos.ver']);
  uno := pg_temp.adu_persona(array['logistica.ver@' || (t ->> 'o')]);
  gestor := pg_temp.adu_persona(array['logistica.aduana.gestionar']);
  todo := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d_mix := pg_temp.adu_decl('RLEE-' || (t ->> 's') || '-1', array[(t ->> 'v1')::uuid, (t ->> 'v2')::uuid, (t ->> 'w')::uuid]);
  d_w := pg_temp.adu_decl('RLEE-' || (t ->> 's') || '-2', array[(t ->> 'w2')::uuid]);
  perform pg_temp.adu_es('R1 sin las claves', pg_temp.adu_leer(sin, d_mix), '42501');
  perform pg_temp.adu_es('R1 sin id', pg_temp.adu_leer(uno, null), '22023', 'id');
  r := pg_temp.adu_leer(uno, d_mix);
  if pg_temp.adu_ids(r) is distinct from (select array_agg(x order by x) from unnest(array[t ->> 'v1', t ->> 'v2']) x)
     or r -> 'hay_ocultos' is distinct from 'true'::jsonb or r -> 'hay_mas' is distinct from 'false'::jsonb then
    raise exception 'R1: quien ve el origen de v1 y v2 debía recibir esos dos y hay_ocultos: %', r;
  end if;
  r := pg_temp.adu_leer(uno, d_w);
  r2 := pg_temp.adu_leer(uno, gen_random_uuid());
  perform pg_temp.adu_es('R1 la que no ve', r, 'P0002');
  perform pg_temp.adu_es('R1 la que no existe', r2, 'P0002');
  if r ->> 'mensaje' is distinct from r2 ->> 'mensaje' then raise exception 'R1: no ver y no existir debían decir lo mismo: % / %', r, r2; end if;
  r := pg_temp.adu_leer(gestor, d_w);
  if r -> 'vehiculos' is distinct from '[]'::jsonb or r ->> 'numero' is distinct from 'RLEE-' || (t ->> 's') || '-2' or r -> 'hay_ocultos' is distinct from 'true'::jsonb then
    raise exception 'R1: con gestionar y sin ver ninguno debía dar la cabecera sin vehículos: %', r;
  end if;
  -- pagada, faltan y tributo por vehículo (D31): pagada recién con el tributo del último vivo, lo vea o no quien lee.
  r := pg_temp.adu_leer(todo, d_mix);
  if (r -> 'pagada', r -> 'faltan') is distinct from ('false'::jsonb, '3'::jsonb) then raise exception 'R1: sin tributos, pagada false y faltan 3: %', r; end if;
  perform pg_temp.adu_gasto((t ->> 'v1')::uuid, (t ->> 'trib')::uuid);
  perform pg_temp.adu_gasto((t ->> 'w')::uuid, (t ->> 'trib')::uuid);
  r := pg_temp.adu_leer(uno, d_mix);
  if (r -> 'pagada', r -> 'faltan') is distinct from ('false'::jsonb, '1'::jsonb)
     or (select array_agg((x ->> 'tributo')::boolean order by x ->> 'vehiculo_id' = t ->> 'v2') from jsonb_array_elements(r -> 'vehiculos') x)
        is distinct from array[true, false] then
    raise exception 'R1: falta el de v2: pagada false, faltan 1, tributo de v1 sí y de v2 no: %', r;
  end if;
  perform pg_temp.adu_gasto((t ->> 'v2')::uuid, (t ->> 'trib')::uuid);
  r := pg_temp.adu_leer(uno, d_mix);
  if (r -> 'pagada', r -> 'faltan') is distinct from ('true'::jsonb, '0'::jsonb) then raise exception 'R1: con el último, pagada: %', r; end if;
  -- Un vehículo quitado no sale.
  update public.declaraciones_vehiculos set removido_en = now() where declaracion_id = d_mix and vehiculo_id = (t ->> 'v2')::uuid;
  r := pg_temp.adu_leer(uno, d_mix);
  if pg_temp.adu_ids(r) is distinct from array[t ->> 'v1'] then raise exception 'R1: el quitado no debía salir: %', r; end if;
end $$;
rollback;

-- @test aduana: el actualizado_en de leer sirve de esperada para guardar; tras guardar, el viejo da PT409 (R2)
begin;
do $$
declare t jsonb := pg_temp.adu_terreno(); p uuid; d uuid; r jsonb; v_ver timestamptz;
begin
  p := pg_temp.adu_persona(array['logistica.ver', 'logistica.aduana.gestionar']);
  d := pg_temp.adu_decl('RVER-' || (t ->> 's'), array[(t ->> 'v1')::uuid]);
  v_ver := (pg_temp.adu_leer(p, d) ->> 'actualizado_en')::timestamptz;
  r := pg_temp.adu_corre(p, format('select public.declaracion_guardar(%L, %L, %L)', d, v_ver, '{"deposito": "Zofra"}'));
  if r ? 'error' or (r ->> 'actualizado_en')::timestamptz <= v_ver then raise exception 'R2: con la versión leída debía guardar: %', r; end if;
  if (pg_temp.adu_leer(p, d) ->> 'actualizado_en')::timestamptz is distinct from (r ->> 'actualizado_en')::timestamptz then
    raise exception 'R2: leer debía devolver la versión nueva';
  end if;
  r := pg_temp.adu_corre(p, format('select public.declaracion_guardar(%L, %L, %L)', d, v_ver, '{"deposito": "Otro"}'));
  perform pg_temp.adu_es('R2 la vieja', r, 'PT409');
end $$;
rollback;
