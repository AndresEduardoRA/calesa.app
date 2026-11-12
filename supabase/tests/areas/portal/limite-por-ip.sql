-- El límite por IP del ingreso al portal (paso 8.07-1): `interno.portal_intentos`, la sal `portal:sal` de Vault y `web.portal_intento(p_ip)`.
-- No depende de otro archivo (`SOLO=areas/portal/limite-por-ip.sql`): cada bloque que escribe abre su transacción y la revierte.
--
-- Qué asegura:
--   L1. Como service_role, 10 intentos de una IP dan true; el 11.º y el 12.º, false; la fila queda con cuenta 11.
--   L2. Otra IP da true (otra huella); null y '' cuentan juntas como 'desconocida'.
--   L3. Vencida la ventana (15 min), la misma IP vuelve a dar true con cuenta 1.
--   L4. La IP no se guarda: columnas exactas, huella = HMAC-SHA256(ip, sal) y no la IP; sin la sal, 55000.
--   L5. anon y authenticated no ejecutan las funciones ni leen la tabla (llamada y catálogo); service_role sí ejecuta.

-- Corre una sentencia con un rol de la base (service_role, anon, authenticated) y devuelve cómo terminó (de `portal-cliente.sql`).
create or replace function pg_temp.con_rol(p_rol text, p_sql text) returns jsonb language plpgsql as $$
declare v jsonb;
begin
  execute format('set local role %I', p_rol);
  begin
    execute p_sql into v;
    reset role;
    return jsonb_build_object('ok', true, 'valor', v);
  exception when others then
    reset role;
    return jsonb_build_object('ok', false, 'estado', sqlstate, 'mensaje', sqlerrm);
  end;
end $$;
-- Un intento como service_role: su booleano (falla si da error).
create or replace function pg_temp.intento(p_ip text) returns boolean language plpgsql as $$
declare r jsonb;
begin
  r := pg_temp.con_rol('service_role', format('select to_jsonb(web.portal_intento(%L))', p_ip));
  if not (r ->> 'ok')::boolean then raise exception 'portal_intento(%) falló: %', p_ip, r; end if;
  return (r -> 'valor')::boolean;
end $$;
-- La huella que debería tener una IP.
create or replace function pg_temp.huella(p_ip text) returns bytea language sql as $$
  select extensions.hmac(convert_to(p_ip, 'UTF8'), decode(s.decrypted_secret, 'hex'), 'sha256')
  from vault.decrypted_secrets s where s.name = 'portal:sal'
$$;

-- @test portal_intento: diez intentos pasan, el 11.º y el 12.º no; la fila queda en 11 (L1)
begin;
do $$
declare i int; v boolean;
begin
  for i in 1..10 loop
    v := pg_temp.intento('203.0.113.7');
    if v is distinct from true then raise exception 'el intento % dio %', i, v; end if;
  end loop;
  if pg_temp.intento('203.0.113.7') is distinct from false then raise exception 'el intento 11 pasó'; end if;
  if pg_temp.intento('203.0.113.7') is distinct from false then raise exception 'el intento 12 pasó'; end if;
  if (select cuenta from interno.portal_intentos where huella = pg_temp.huella('203.0.113.7')) is distinct from 11 then
    raise exception 'la cuenta no quedó en 11: %', (select cuenta from interno.portal_intentos where huella = pg_temp.huella('203.0.113.7'));
  end if;
end $$;
rollback;

-- @test portal_intento: otra IP es otra huella; null y vacío cuentan juntas como desconocida (L2)
begin;
do $$
declare i int;
begin
  for i in 1..11 loop perform pg_temp.intento('203.0.113.7'); end loop;
  if pg_temp.intento('203.0.113.8') is distinct from true then raise exception 'otra IP quedó frenada'; end if;
  for i in 1..5 loop perform pg_temp.intento(null); end loop;
  for i in 1..5 loop perform pg_temp.intento('  '); end loop;
  if pg_temp.intento('') is distinct from false then raise exception 'null, espacios y vacío no cuentan juntas'; end if;
  if not exists (select 1 from interno.portal_intentos where huella = pg_temp.huella('desconocida') and cuenta = 11) then
    raise exception 'la IP vacía no cuenta como desconocida';
  end if;
end $$;
rollback;

-- @test portal_intento: vencida la ventana de 15 minutos, la misma IP vuelve a pasar con cuenta 1 (L3)
begin;
do $$
declare i int;
begin
  for i in 1..11 loop perform pg_temp.intento('203.0.113.7'); end loop;
  update interno.portal_intentos set ventana_desde = now() - interval '14 minutes' where huella = pg_temp.huella('203.0.113.7');
  if pg_temp.intento('203.0.113.7') is distinct from false then raise exception 'pasó antes de vencer la ventana'; end if;
  update interno.portal_intentos set ventana_desde = now() - interval '16 minutes' where huella = pg_temp.huella('203.0.113.7');
  if pg_temp.intento('203.0.113.7') is distinct from true then raise exception 'vencida la ventana, siguió frenada'; end if;
  if not exists (select 1 from interno.portal_intentos where huella = pg_temp.huella('203.0.113.7') and cuenta = 1 and ventana_desde = now()) then
    raise exception 'la ventana no se reinició en cuenta 1 y ahora';
  end if;
end $$;
rollback;

-- @test portal_intento: la IP no se guarda, la huella es un HMAC con la sal y sin sal da 55000 (L4)
begin;
do $$
declare v_cols text[]; r jsonb;
begin
  select array_agg(a.attname::text order by a.attnum) into v_cols from pg_attribute a
   where a.attrelid = 'interno.portal_intentos'::regclass and a.attnum > 0 and not a.attisdropped;
  if v_cols is distinct from array['huella', 'ventana_desde', 'cuenta'] then raise exception 'columnas: %', v_cols; end if;
  perform pg_temp.intento('203.0.113.7');
  if (select count(*) from interno.portal_intentos) <> 1 then raise exception 'se esperaba una fila'; end if;
  if not exists (select 1 from interno.portal_intentos where huella = pg_temp.huella('203.0.113.7')) then
    raise exception 'la huella no es el HMAC de la IP con la sal';
  end if;
  if exists (select 1 from interno.portal_intentos where huella = convert_to('203.0.113.7', 'UTF8')
             or position(convert_to('203.0.113.7', 'UTF8') in huella) > 0) then
    raise exception 'la IP quedó guardada';
  end if;
  delete from vault.secrets where name = 'portal:sal';
  r := pg_temp.con_rol('service_role', 'select to_jsonb(web.portal_intento(''203.0.113.9''))');
  if r ->> 'estado' is distinct from '55000' then raise exception 'sin sal: %', r; end if;
end $$;
rollback;

-- @test portal_intento: anon y authenticated no ejecutan ni leen; service_role ejecuta (L5)
do $$
declare r jsonb; v_rol text;
begin
  foreach v_rol in array array['anon', 'authenticated'] loop
    r := pg_temp.con_rol(v_rol, 'select to_jsonb(web.portal_intento(''203.0.113.7''))');
    if r ->> 'estado' is distinct from '42501' then raise exception '% ejecutó portal_intento: %', v_rol, r; end if;
    r := pg_temp.con_rol(v_rol, 'select to_jsonb(count(*)) from interno.portal_intentos');
    if r ->> 'estado' is distinct from '42501' then raise exception '% leyó portal_intentos: %', v_rol, r; end if;
    if has_table_privilege(v_rol, 'interno.portal_intentos', 'select') or has_table_privilege(v_rol, 'interno.portal_intentos', 'insert') then
      raise exception '% tiene grant sobre portal_intentos', v_rol;
    end if;
  end loop;
  foreach v_rol in array array['anon', 'authenticated', 'public'] loop
    if has_function_privilege(v_rol, 'web.portal_intento(text)', 'execute') then
      raise exception '% puede ejecutar web.portal_intento', v_rol;
    end if;
  end loop;
  if not has_function_privilege('service_role', 'web.portal_intento(text)', 'execute') then
    raise exception 'service_role no puede ejecutar web.portal_intento';
  end if;
end $$;

