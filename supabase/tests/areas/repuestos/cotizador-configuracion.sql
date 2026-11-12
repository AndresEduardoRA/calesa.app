-- Configuración del cotizador de repuestos bajo RLS (paso 8.12-2, C1 y C2). No depende de otro archivo
-- (`SOLO=areas/repuestos/cotizador-configuracion.sql`); cada bloque abre su transacción y la revierte. El arnés `rcc_` es copia del de `cotizador-aceptar.sql`.
--
-- Qué asegura:
--   Q1. La pantalla escribe configuración, tramos y cajas sólo con `repuestos.configurar`: con `repuestos.cotizar` solo, INSERT da 42501 y UPDATE no
--       toca filas; nadie publica a nombre de otro; la configuración es append-only (UPDATE y DELETE dan 42501).
--   Q2. Un tramo no tiene `costo_min` ni `monto` negativos (23514); un monto 0 vale; el redondeo 0 da 23514; los dos `check` quedan validados.
--   Q3. `aplicado_en` de `repuestos.configurar` nombra las tres policies.

create or replace function pg_temp.rcc_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rcc@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio que tiene estas claves.
create or replace function pg_temp.rcc_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rcc_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rcc_' || substr(v_id::text, 1, 8), 'rcc ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, null, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint, detalle}`.
create or replace function pg_temp.rcc_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_m text; v_e text; v_h text; v_d text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_e = returned_sqlstate, v_h = pg_exception_hint, v_d = pg_exception_detail;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''), 'detalle', nullif(v_d, ''));
  end;
  reset role;
  return coalesce(v, '{}'::jsonb);
end $f$;

create or replace function pg_temp.rcc_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;


create or replace function pg_temp.rcc_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rcc_monedas() returns void language sql as $f$
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X') on conflict (codigo) do update set activa = true;
  delete from public.repuestos_tramos_logistica where moneda = 'XTS';
  delete from public.repuestos_cajas where moneda = 'XTS';
$f$;

-- Cuántas filas tocó un UPDATE o DELETE que corre como `p_quien`.
create or replace function pg_temp.rcc_n(p_quien uuid, p_sql text) returns jsonb language sql as $f$
  select pg_temp.rcc_corre(p_quien, format('with u as (%s returning 1) select jsonb_build_object(''n'', count(*)) from u', p_sql));
$f$;

create or replace function pg_temp.rcc_igual(p_que text, p_dio jsonb, p_debia jsonb) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_debia then raise exception '%: debía dar % y dio %', p_que, p_debia, p_dio; end if;
end $f$;

create or replace function pg_temp.rcc_config(p_quien uuid, p_creado_por uuid, p_redondeo numeric default 1) returns jsonb language sql as $f$
  select pg_temp.rcc_corre(p_quien, format(
    'insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo, creado_por) values (1.35, 0.1, %s, %L) returning to_jsonb(id)',
    p_redondeo, p_creado_por));
$f$;

create or replace function pg_temp.rcc_tramo(p_quien uuid, p_min numeric, p_max numeric, p_monto numeric) returns jsonb language sql as $f$
  select pg_temp.rcc_corre(p_quien, format(
    'insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values (%L, %s, %s, %s) returning to_jsonb(id)',
    'XTS', p_min, p_max, p_monto));
$f$;

create or replace function pg_temp.rcc_caja(p_quien uuid, p_monto numeric) returns jsonb language sql as $f$
  select pg_temp.rcc_corre(p_quien, format('insert into public.repuestos_cajas (moneda, monto) values (%L, %s) returning to_jsonb(id)', 'XTS', p_monto));
$f$;

create or replace function pg_temp.rcc_check(p_que text, p_r jsonb, p_check text) returns void language plpgsql as $f$
begin
  perform pg_temp.rcc_es(p_que, p_r, '23514', null);
  if strpos(p_r ->> 'mensaje', p_check) = 0 then raise exception '%: debía romper % y dio %', p_que, p_check, p_r; end if;
end $f$;

-- @test repuestos: configuración, tramos y cajas se escriben sólo con repuestos.configurar; la configuración es append-only (Q1)
begin;
do $$
declare
  cot uuid := pg_temp.rcc_persona(array['repuestos.cotizar']); conf uuid := pg_temp.rcc_persona(array['repuestos.configurar']);
  t uuid; c uuid; k bigint;
begin
  perform pg_temp.rcc_monedas();
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values ('XTS', 0, 100, 15) returning id into t;
  insert into public.repuestos_cajas (moneda, monto) values ('XTS', 10) returning id into c;

  -- Con cotizar solo: lee, pero no escribe.
  perform pg_temp.rcc_es('Q1 cot config', pg_temp.rcc_config(cot, cot), '42501', null);
  perform pg_temp.rcc_es('Q1 cot tramo', pg_temp.rcc_tramo(cot, 100, 200, 5), '42501', null);
  perform pg_temp.rcc_es('Q1 cot caja', pg_temp.rcc_caja(cot, 20), '42501', null);
  perform pg_temp.rcc_igual('Q1 cot editar tramo',
    pg_temp.rcc_n(cot, format('update public.repuestos_tramos_logistica set monto = 1 where id = %L', t)), '{"n": 0}');
  perform pg_temp.rcc_igual('Q1 cot editar caja',
    pg_temp.rcc_n(cot, format('update public.repuestos_cajas set activa = false where id = %L', c)), '{"n": 0}');
  perform pg_temp.rcc_igual('Q1 cot lee tramos',
    pg_temp.rcc_corre(cot, format('select jsonb_build_object(%L, count(*)) from public.repuestos_tramos_logistica where id = %L', 'n', t)), '{"n": 1}');

  -- Con configurar: nunca a nombre de otro; con el propio, sí; lo publicado no se edita ni se borra.
  perform pg_temp.rcc_es('Q1 conf config ajena', pg_temp.rcc_config(conf, cot), '42501', null);
  k := (pg_temp.rcc_ok('Q1 conf config propia', pg_temp.rcc_config(conf, conf)) #>> '{}')::bigint;
  perform pg_temp.rcc_es('Q1 conf editar config',
    pg_temp.rcc_corre(conf, format('update public.repuestos_cotizador_config set factor_importado = 2 where id = %s returning to_jsonb(id)', k)), '42501', null);
  perform pg_temp.rcc_es('Q1 conf borrar config',
    pg_temp.rcc_corre(conf, format('delete from public.repuestos_cotizador_config where id = %s returning to_jsonb(id)', k)), '42501', null);
  perform pg_temp.rcc_ok('Q1 conf tramo', pg_temp.rcc_tramo(conf, 100, 200, 5));
  perform pg_temp.rcc_ok('Q1 conf caja', pg_temp.rcc_caja(conf, 20));
  perform pg_temp.rcc_igual('Q1 conf editar tramo',
    pg_temp.rcc_n(conf, format('update public.repuestos_tramos_logistica set monto = 1 where id = %L', t)), '{"n": 1}');
  perform pg_temp.rcc_igual('Q1 conf editar caja',
    pg_temp.rcc_n(conf, format('update public.repuestos_cajas set activa = false where id = %L', c)), '{"n": 1}');
end $$;
rollback;

-- @test repuestos: un tramo no tiene montos negativos y el redondeo es mayor que cero; los dos check quedan validados (Q2)
begin;
do $$
declare conf uuid := pg_temp.rcc_persona(array['repuestos.configurar']);
begin
  perform pg_temp.rcc_monedas();
  perform pg_temp.rcc_check('Q2 costo_min negativo', pg_temp.rcc_tramo(conf, -1, 100, 15), 'repuestos_tramos_logistica_signo_check');
  perform pg_temp.rcc_check('Q2 monto negativo', pg_temp.rcc_tramo(conf, 0, 100, -1), 'repuestos_tramos_logistica_signo_check');
  perform pg_temp.rcc_ok('Q2 monto 0', pg_temp.rcc_tramo(conf, 0, 100, 0));
  perform pg_temp.rcc_check('Q2 redondeo 0', pg_temp.rcc_config(conf, conf, 0), 'repuestos_cotizador_config_redondeo_check');
  if (select count(*) from pg_constraint
       where conname in ('repuestos_tramos_logistica_signo_check', 'repuestos_cotizador_config_redondeo_check') and convalidated) <> 2 then
    raise exception 'Q2: los dos check debían quedar validados';
  end if;
end $$;
rollback;

-- @test repuestos: aplicado_en de repuestos.configurar nombra las policies del cotizador (Q3)
begin;
do $$
declare v text := (select aplicado_en from public.permisos where clave = 'repuestos.configurar');
begin
  if strpos(v, 'policy repuestos_cotizador_config') = 0 or strpos(v, 'policy repuestos_tramos_logistica') = 0 or strpos(v, 'policy repuestos_cajas') = 0 then
    raise exception 'Q3: aplicado_en de repuestos.configurar es «%»', v;
  end if;
end $$;
rollback;
