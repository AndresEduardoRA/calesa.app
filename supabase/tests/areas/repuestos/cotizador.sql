-- El cotizador de repuestos en la base (paso 8.12-1): la fórmula y los tramos. No depende de otro archivo
-- (`SOLO=areas/repuestos/cotizador.sql`); cada bloque abre su transacción y la revierte. Crear y guardar están en `cotizador-guardar.sql`;
-- aceptar y anular, en `cotizador-aceptar.sql` (los tres copian el mismo arnés `rcz_`).
--
-- Qué asegura (el «Terminado» del 8.12):
--   F1. Los mismos casos que `entities/cotizador/formula.test.ts` dan el mismo resultado en la base. El literal `$casos$` es copia exacta de
--       `src/modules/repuestos/entities/cotizador/casos-del-cotizador.json` (lo vigila `entities/cotizador/casos.test.ts`).
--   F2. Dos tramos activos de una misma moneda no se cruzan (23P01); contiguos sí; otra moneda o un tramo inactivo no cuentan.
--   F3 y F4 (sin escritura directa y el permiso de las cuatro RPC) están en `cotizador-aceptar.sql`, junto a la migración que los cierra.

create or replace function pg_temp.rcz_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rcz@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio que tiene estas claves.
create or replace function pg_temp.rcz_persona(p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rcz_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rcz_' || substr(v_id::text, 1, 8), 'rcz ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance) values (v_rol, c, null, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint, detalle}`.
create or replace function pg_temp.rcz_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rcz_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rcz_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rcz_todos() returns text[] language sql as $f$
  select array['repuestos.ver', 'repuestos.editar', 'repuestos.cotizar'];
$f$;

create or replace function pg_temp.rcz_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rcz_ok('proyecto', pg_temp.rcz_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "rq"}')));
  return i;
end $f$;

-- La moneda XTS (y XTU), la configuración A de los casos (factor 1,35, recargo 0,10, redondeo 1) y sus tramos y cajas en XTS:
-- [0,100) → 15, [100,500) → 40, [500,2000) → 90; cajas de 10 y 25 (y una de 99 inactiva, y un tramo inactivo que no cuenta).
create or replace function pg_temp.rcz_terreno() returns jsonb language plpgsql as $f$
declare k bigint; c10 uuid; c25 uuid;
begin
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X'), ('XTU', 'Prueba U', 'U')
  on conflict (codigo) do update set activa = true;
  delete from public.repuestos_tramos_logistica where moneda in ('XTS', 'XTU');
  delete from public.repuestos_cajas where moneda in ('XTS', 'XTU');
  insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo) values (1.35, 0.10, 1.00) returning id into k;
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values
    ('XTS', 0, 100, 15), ('XTS', 100, 500, 40), ('XTS', 500, 2000, 90);
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto, activo) values ('XTS', 0, 50, 1, false);
  insert into public.repuestos_cajas (moneda, monto) values ('XTS', 10) returning id into c10;
  insert into public.repuestos_cajas (moneda, monto) values ('XTS', 25) returning id into c25;
  insert into public.repuestos_cajas (moneda, monto, activa) values ('XTS', 99, false);
  return jsonb_build_object('config', k, 'c10', c10, 'c25', c25);
end $f$;

create or replace function pg_temp.rcz_crear(p_quien uuid, p_id uuid, p_proyecto uuid, p_moneda text default 'XTS') returns jsonb language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_crear(%L::uuid, %L::uuid, %L)', p_id, p_proyecto, p_moneda));
$f$;

create or replace function pg_temp.rcz_guardar(p_quien uuid, p_id uuid, p_lineas jsonb, p_esperada timestamptz, p_notas text default null) returns jsonb
language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_guardar(%L::uuid, %L::jsonb, %L, %L::timestamptz)', p_id, p_lineas, p_notas, p_esperada));
$f$;

create or replace function pg_temp.rcz_aceptar(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_aceptar(%L::uuid, %L::timestamptz)', p_id, p_esperada));
$f$;

create or replace function pg_temp.rcz_anular(p_quien uuid, p_id uuid, p_esperada timestamptz) returns jsonb language sql as $f$
  select pg_temp.rcz_corre(p_quien, format('select public.repuestos_cotizacion_anular(%L::uuid, %L::timestamptz)', p_id, p_esperada));
$f$;

create or replace function pg_temp.rcz_fila(p_id uuid) returns public.repuestos_cotizaciones language sql as $f$
  select * from public.repuestos_cotizaciones where id = p_id;
$f$;

-- Una línea K1 (importado 80, logística sugerida, caja 10) y una K4 (local 80, logística 20, caja 10, × 2), con ids nuevos.
create or replace function pg_temp.rcz_k1(p_item uuid default null) returns jsonb language sql as $f$
  select jsonb_build_object('id', gen_random_uuid(), 'item_id', p_item, 'descripcion', 'K1', 'bloque', 'importado', 'cantidad', 1, 'costo', '80.00',
                            'logistica', null, 'caja', '10.00');
$f$;
create or replace function pg_temp.rcz_k4(p_item uuid default null) returns jsonb language sql as $f$
  select jsonb_build_object('id', gen_random_uuid(), 'item_id', p_item, 'descripcion', 'K4', 'bloque', 'local', 'cantidad', 2, 'costo', 80,
                            'logistica', '20.00', 'caja', 10);
$f$;

-- @test repuestos: los casos del cotizador dan en la base lo mismo que en entities/cotizador (F1)
begin;
do $$
declare
  v jsonb := $casos$
{"configs": {
  "A": {"version": 1, "moneda": "USD", "config": {"id": 1, "factor_importado": "1.3500", "recargo_local": "0.1000", "redondeo": "1.00", "vigente_desde": "2026-11-12T00:00:00+00:00"}, "tramos": [{"costo_min": "0.00", "costo_max": "100.00", "monto": "15.00"}, {"costo_min": "100.00", "costo_max": "500.00", "monto": "40.00"}, {"costo_min": "500.00", "costo_max": "2000.00", "monto": "90.00"}], "cajas": [{"id": "00000000-0000-4000-8000-0000000000a1", "monto": "10.00"}, {"id": "00000000-0000-4000-8000-0000000000a2", "monto": "25.00"}]},
  "B": {"version": 1, "moneda": "USD", "config": {"id": 2, "factor_importado": "1.2000", "recargo_local": "0.0750", "redondeo": "0.05", "vigente_desde": "2026-11-12T00:00:00+00:00"}, "tramos": [{"costo_min": "0.00", "costo_max": "100.00", "monto": "15.00"}, {"costo_min": "100.00", "costo_max": "500.00", "monto": "40.00"}, {"costo_min": "500.00", "costo_max": "2000.00", "monto": "90.00"}], "cajas": [{"id": "00000000-0000-4000-8000-0000000000a1", "monto": "10.00"}, {"id": "00000000-0000-4000-8000-0000000000a2", "monto": "25.00"}]},
  "C": {"version": 1, "moneda": "USD", "config": {"id": 3, "factor_importado": "1.3500", "recargo_local": "0.1000", "redondeo": "10.00", "vigente_desde": "2026-11-12T00:00:00+00:00"}, "tramos": [{"costo_min": "0.00", "costo_max": "100.00", "monto": "15.00"}, {"costo_min": "100.00", "costo_max": null, "monto": "50.00"}], "cajas": [{"id": "00000000-0000-4000-8000-0000000000a1", "monto": "10.00"}, {"id": "00000000-0000-4000-8000-0000000000a2", "monto": "25.00"}]},
  "D": {"version": 1, "moneda": "USD", "config": {"id": 4, "factor_importado": "1.3500", "recargo_local": "0.1000", "redondeo": "1.00", "vigente_desde": "2026-11-12T00:00:00+00:00"}, "tramos": [{"costo_min": "50.00", "costo_max": "100.00", "monto": "15.00"}], "cajas": []},
  "E": {"version": 1, "moneda": "USD", "config": {"id": 5, "factor_importado": "1.3500", "recargo_local": "0.1000", "redondeo": "0.00", "vigente_desde": "2026-11-12T00:00:00+00:00"}, "tramos": [{"costo_min": "0.00", "costo_max": "100.00", "monto": "15.00"}, {"costo_min": "100.00", "costo_max": "500.00", "monto": "40.00"}, {"costo_min": "500.00", "costo_max": "2000.00", "monto": "90.00"}], "cajas": [{"id": "00000000-0000-4000-8000-0000000000a1", "monto": "10.00"}, {"id": "00000000-0000-4000-8000-0000000000a2", "monto": "25.00"}]}
}, "casos": [
  {"nombre": "K1", "que": "importado con la logística sugerida", "config": "A", "bloque": "importado", "cantidad": 1, "costo": "80.00", "logistica": null, "caja": "10.00", "esperado": {"logistica_sugerida": "15.00", "unitario": "133.00", "total": "133.00", "falta": null}},
  {"nombre": "K2", "que": "149,9865 redondea a 150 y se multiplica por la cantidad", "config": "A", "bloque": "importado", "cantidad": 3, "costo": "99.99", "logistica": null, "caja": "0", "esperado": {"logistica_sugerida": "15.00", "unitario": "150.00", "total": "450.00", "falta": null}},
  {"nombre": "K3", "que": "el costo_min del tramo es inclusivo", "config": "A", "bloque": "importado", "cantidad": 1, "costo": "100.00", "logistica": null, "caja": "25.00", "esperado": {"logistica_sugerida": "40.00", "unitario": "200.00", "total": "200.00", "falta": null}},
  {"nombre": "K4", "que": "local con la logística escrita", "config": "A", "bloque": "local", "cantidad": 2, "costo": "80.00", "logistica": "20.00", "caja": "10.00", "esperado": {"logistica_sugerida": "15.00", "unitario": "121.00", "total": "242.00", "falta": null}},
  {"nombre": "K5", "que": "0 escrito no es nulo; 5,5 sube a 6 (mitad hacia arriba)", "config": "A", "bloque": "local", "cantidad": 1, "costo": "5.00", "logistica": "0.00", "caja": "0", "esperado": {"logistica_sugerida": "15.00", "unitario": "6.00", "total": "6.00", "falta": null}},
  {"nombre": "K6", "que": "por encima del último tramo no hay sugerencia", "config": "A", "bloque": "importado", "cantidad": 1, "costo": "2500.00", "logistica": null, "caja": "10.00", "esperado": {"logistica_sugerida": null, "unitario": null, "total": null, "falta": "logistica"}},
  {"nombre": "K7", "que": "sin tramo, con la logística escrita", "config": "A", "bloque": "importado", "cantidad": 1, "costo": "2500.00", "logistica": "120.00", "caja": "10.00", "esperado": {"logistica_sugerida": null, "unitario": "3505.00", "total": "3505.00", "falta": null}},
  {"nombre": "K8", "que": "11,83575 al múltiplo de 0,05", "config": "B", "bloque": "local", "cantidad": 1, "costo": "10.01", "logistica": "1.00", "caja": "0", "esperado": {"logistica_sugerida": "15.00", "unitario": "11.85", "total": "11.85", "falta": null}},
  {"nombre": "K9", "que": "59,9955 al múltiplo de 10", "config": "C", "bloque": "importado", "cantidad": 1, "costo": "33.33", "logistica": null, "caja": "0", "esperado": {"logistica_sugerida": "15.00", "unitario": "60.00", "total": "60.00", "falta": null}},
  {"nombre": "K10", "que": "tramo abierto; 3425 es mitad y sube a 3430", "config": "C", "bloque": "importado", "cantidad": 1, "costo": "2500.00", "logistica": null, "caja": "0", "esperado": {"logistica_sugerida": "50.00", "unitario": "3430.00", "total": "3430.00", "falta": null}},
  {"nombre": "K11", "que": "sin costo no hay sugerencia ni total", "config": "A", "bloque": "importado", "cantidad": 1, "costo": null, "logistica": null, "caja": "10.00", "esperado": {"logistica_sugerida": null, "unitario": null, "total": null, "falta": "costo"}},
  {"nombre": "K12", "que": "sin caja elegida no hay total", "config": "A", "bloque": "importado", "cantidad": 1, "costo": "80.00", "logistica": null, "caja": null, "esperado": {"logistica_sugerida": "15.00", "unitario": null, "total": null, "falta": "caja"}},
  {"nombre": "K13", "que": "debajo del primer tramo no hay sugerencia", "config": "D", "bloque": "importado", "cantidad": 1, "costo": "20.00", "logistica": null, "caja": "0", "esperado": {"logistica_sugerida": null, "unitario": null, "total": null, "falta": "logistica"}},
  {"nombre": "K14", "que": "un total desde 10^16 no cabe", "config": "A", "bloque": "importado", "cantidad": 100000, "costo": "9999999999999.99", "logistica": "0", "caja": "0", "esperado": {"logistica_sugerida": null, "unitario": null, "total": null, "falta": "no_cabe"}},
  {"nombre": "K15", "que": "local con la sugerida del segundo tramo", "config": "A", "bloque": "local", "cantidad": 3, "costo": "100.00", "logistica": null, "caja": "25.00", "esperado": {"logistica_sugerida": "40.00", "unitario": "182.00", "total": "546.00", "falta": null}},
  {"nombre": "K16", "que": "un redondeo de 0 vale 0,01", "config": "E", "bloque": "importado", "cantidad": 1, "costo": "10.01", "logistica": "0", "caja": "0", "esperado": {"logistica_sugerida": "15.00", "unitario": "13.51", "total": "13.51", "falta": null}}
]}
$casos$::jsonb;
  c jsonb; r jsonb; n integer := 0;
begin
  for c in select * from jsonb_array_elements(v -> 'casos') loop
    r := public._repuesto_cotizacion_linea(v -> 'configs' -> (c ->> 'config'), c ->> 'bloque', (c ->> 'cantidad')::integer, (c ->> 'costo')::numeric,
                                           (c ->> 'logistica')::numeric, (c ->> 'caja')::numeric);
    if r is distinct from c -> 'esperado' then
      raise exception 'F1 %: debía dar % y dio %', c ->> 'nombre', c -> 'esperado', r;
    end if;
    n := n + 1;
  end loop;
  if n < 16 then
    raise exception 'F1: se esperaban al menos 16 casos y hubo %', n;
  end if;
end $$;
rollback;

-- @test repuestos: dos tramos activos de una misma moneda no se cruzan; contiguos sí (F2)
begin;
do $$
declare t jsonb := pg_temp.rcz_terreno(); v_id uuid; r text; v_e text; v_h text;
begin
  -- Contiguo por arriba: [2000, ∞) junto a [500, 2000) pasa.
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values ('XTS', 2000, null, 120) returning id into v_id;
  -- Cruzado: [450, 600) pisa [100, 500) → 23P01 con el texto del tramo que pisa.
  begin
    insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values ('XTS', 450, 600, 1);
    raise exception 'F2: un tramo cruzado debía caer';
  exception when sqlstate '23P01' then
    get stacked diagnostics r = message_text, v_h = pg_exception_hint;
    if r <> 'Ese tramo se cruza con otro de XTS (de 100,00 a 500,00).' or v_h <> 'costo_min' then
      raise exception 'F2: el mensaje o el hint no son los de C8: % / %', r, v_h;
    end if;
  end;
  -- Contra el tramo abierto: [3000, 4000) cae y el texto dice «en adelante».
  begin
    insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values ('XTS', 3000, 4000, 1);
    raise exception 'F2: un tramo dentro del abierto debía caer';
  exception when sqlstate '23P01' then
    get stacked diagnostics r = message_text;
    if r <> 'Ese tramo se cruza con otro de XTS (de 2000,00 en adelante).' then
      raise exception 'F2: el texto contra un tramo abierto no es el de C8: %', r;
    end if;
  end;
  -- Mover uno existente encima de otro también cae.
  begin
    update public.repuestos_tramos_logistica set costo_max = 150 where moneda = 'XTS' and costo_min = 0 and activo;
    raise exception 'F2: agrandar un tramo encima del siguiente debía caer';
  exception when sqlstate '23P01' then null;
  end;
  -- Reactivar el inactivo [0, 50), que pisa [0, 100), cae.
  begin
    update public.repuestos_tramos_logistica set activo = true where moneda = 'XTS' and not activo;
    raise exception 'F2: reactivar un tramo cruzado debía caer';
  exception when sqlstate '23P01' then null;
  end;
  -- Uno inactivo cruzado se puede guardar; otra moneda no cuenta.
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto, activo) values ('XTS', 10, 20, 1, false);
  insert into public.repuestos_tramos_logistica (moneda, costo_min, costo_max, monto) values ('XTU', 0, 100, 5);
  -- El redondeo de la configuración es > 0.
  begin
    insert into public.repuestos_cotizador_config (factor_importado, recargo_local, redondeo) values (1, 0, 0);
    raise exception 'F2: un redondeo de 0 debía caer';
  exception when check_violation then null;
  end;
end $$;
rollback;
