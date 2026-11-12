-- Comprobantes de gastos y pagos en storage (paso 6.10-2, C1–C3). No depende de otro archivo (`SOLO=areas/dinero/comprobantes.sql`). Los ayudantes son
-- copia de `gastos.sql`. Corre sobre el doble de `storage.objects` de `probar-schema.mjs` (RLS encendida, grants a authenticated). Cada bloque abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   S1. Quien tiene `logistica.gastos.ver` en otro origen no lee el comprobante de un gasto del vehículo; con la clave del origen, sí.
--   S2. Quien ve pagos del origen y no gastos no lee el comprobante de un gasto del vehículo, y sí el de un pago de esa carpeta.
--   S3. Un prorrateo entre un vehículo de o1 y otro de o2 (el archivo en la carpeta del primero) lo lee quien ve gastos sólo en o2.
--   S4. Un objeto que ninguna fila nombra lo lee quien edita gastos del origen y no quien sólo los ve; el de un gasto borrado no lo lee quien ve.
--   S5. Subir pide editar gastos o pagos de la unidad de la carpeta y la forma `<unidad>/<64 hex>.<ext>`: fuera de eso, 42501 y nunca 22P02.
--   S6. Leer todo el bucket con un objeto de nombre roto no da error.

create or replace function pg_temp.din_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  -- La primera cuenta de la base es la dueña (con `SOLO=` no hay otra antes): una de relleno, para que ninguna de la prueba lo sea.
  if not exists (select 1 from public.perfiles) then
    insert into auth.users (id, email) values (gen_random_uuid(), 'din-primera-' || substr(v_id::text, 1, 8) || '@ejemplo.com');
  end if;
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('din_' || substr(v_id::text, 1, 8), 'DIN ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance, origen_id)
    values (v_rol, split_part(c, ':', 1), coalesce(nullif(split_part(c, ':', 2), ''), 'todos')::public.alcance_permiso, nullif(split_part(c, ':', 3), '')::uuid);
  end loop;
  return v_id;
end $f$;

-- Dos orígenes con un vehículo cada uno, una categoría, la moneda XTS y dos tipos: XTS → base y base → XTS, los dos en 6,96.
create or replace function pg_temp.din_terreno() returns jsonb language plpgsql as $f$
declare o uuid; o2 uuid; v uuid; v2 uuid; v3 uuid; cat uuid; trib uuid; tc uuid; tc_inv uuid; s text := substr(gen_random_uuid()::text, 1, 8);
  v_base text := (select moneda_base::text from public.ajustes_empresa where id = 1);
begin
  insert into public.origenes (clave, nombre) values ('din_' || s, 'DIN origen ' || s) returning id into o;
  insert into public.origenes (clave, nombre) values ('din2_' || s, 'DIN origen 2 ' || s) returning id into o2;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DIN vehículo', 'toyota') returning id into v;
  insert into public.vehiculos (origen_id, titulo, marca) values (o, 'DIN vehículo 3', 'nissan') returning id into v3;
  insert into public.vehiculos (origen_id, titulo, marca) values (o2, 'DIN vehículo 2', 'mazda') returning id into v2;
  insert into public.categorias_gasto (nombre, proposito) values ('DIN flete ' || s, 'flete') returning id into cat;
  insert into public.categorias_gasto (nombre, proposito) values ('DIN tributos ' || s, 'tributos') returning id into trib;
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X') on conflict do nothing;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_' || s, 'DIN', 'XTS', v_base, 6.96) returning id into tc;
  insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor) values ('din_inv_' || s, 'DIN inverso', v_base, 'XTS', 6.96) returning id into tc_inv;
  return jsonb_build_object('o', o, 'o2', o2, 'v', v, 'v2', v2, 'v3', v3, 'cat', cat, 'trib', trib, 'tc', tc, 'tc_inv', tc_inv, 'base', v_base);
end $f$;

-- Corre un SQL como esa persona (authenticated): su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.din_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

create or replace function pg_temp.din_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.din_ruta(p_unidad uuid, p_letra text) returns text language sql as $f$
  select p_unidad || '/' || repeat(p_letra, 64) || '.pdf';
$f$;

-- Un objeto del bucket como dueño de la base (lo que haría storage al subir).
create or replace function pg_temp.din_objeto(p_nombre text) returns void language sql as $f$
  insert into storage.objects (bucket_id, name) values ('comprobantes', p_nombre);
$f$;

-- Cuántos objetos del bucket ve esa persona con ese nombre.
create or replace function pg_temp.din_ve(p_quien uuid, p_nombre text) returns int language sql as $f$
  select (pg_temp.din_corre(p_quien, format('select to_jsonb(count(*)) from storage.objects where bucket_id = ''comprobantes'' and name = %L', p_nombre)))::text::int;
$f$;

-- Sube como esa persona: null si entró, o el sqlstate si no.
create or replace function pg_temp.din_sube(p_quien uuid, p_nombre text) returns text language sql as $f$
  select pg_temp.din_corre(p_quien, format('insert into storage.objects (bucket_id, name) values (''comprobantes'', %L) returning to_jsonb(name)', p_nombre)) ->> 'error';
$f$;

create or replace function pg_temp.din_gasto_con(p_quien uuid, t jsonb, p_vehiculo uuid, p_ruta text) returns uuid language plpgsql as $f$
declare r jsonb;
begin
  r := pg_temp.din_corre(p_quien, format('select public.gasto_registrar(%L, %L, null, %L, %L, 10, null, null, null, %L, null)',
                                         gen_random_uuid(), p_vehiculo, t ->> 'cat', t ->> 'base', p_ruta));
  if r ? 'error' then raise exception 'no se pudo registrar el gasto: %', r; end if;
  perform pg_temp.din_objeto(p_ruta);
  return (r ->> 'id')::uuid;
end $f$;

-- @test dinero: quien ve gastos en otro origen no lee el comprobante de un gasto del vehículo (S1)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; r text;
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  r := pg_temp.din_ruta((t ->> 'v')::uuid, 'a');
  perform pg_temp.din_gasto_con(ed, t, (t ->> 'v')::uuid, r);
  if pg_temp.din_ve(pg_temp.din_persona('logistica.gastos.ver:todos:' || (t ->> 'o2')), r) <> 0 then
    raise exception 'S1: quien ve gastos sólo en otro origen leyó el comprobante';
  end if;
  if pg_temp.din_ve(pg_temp.din_persona('logistica.gastos.ver:todos:' || (t ->> 'o')), r) <> 1 then
    raise exception 'S1: quien ve gastos del origen no leyó el comprobante';
  end if;
end $$;
rollback;

-- @test dinero: ver pagos no abre los comprobantes de gastos del vehículo, sí los de sus pagos (S2)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; vp uuid; rg text; rp text; x jsonb;
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver', 'logistica.pagos.editar', 'logistica.pagos.ver');
  vp := pg_temp.din_persona('logistica.pagos.ver:todos:' || (t ->> 'o'));
  rg := pg_temp.din_ruta((t ->> 'v')::uuid, 'a');
  rp := pg_temp.din_ruta((t ->> 'v')::uuid, 'b');
  perform pg_temp.din_gasto_con(ed, t, (t ->> 'v')::uuid, rg);
  x := pg_temp.din_corre(ed, format('select public.pago_registrar(%L, %L, null, ''Anticipo'', %L, 10, null, null, null, %L, null)',
                                     gen_random_uuid(), t ->> 'v', t ->> 'base', rp));
  if x ? 'error' then raise exception 'S2: no se pudo registrar el pago: %', x; end if;
  perform pg_temp.din_objeto(rp);
  if pg_temp.din_ve(vp, rg) <> 0 then raise exception 'S2: quien sólo ve pagos leyó el comprobante de un gasto'; end if;
  if pg_temp.din_ve(vp, rp) <> 1 then raise exception 'S2: quien ve pagos no leyó el comprobante del pago'; end if;
end $$;
rollback;

-- @test dinero: un prorrateo se lee desde cualquier vehículo del lote (S3)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; r text; x jsonb;
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  r := pg_temp.din_ruta((t ->> 'v')::uuid, 'c');
  x := pg_temp.din_corre(ed, format('select public.gastos_prorratear(%L, %L::uuid[], %L, %L, 100, null, null, null, %L, null)',
                                     gen_random_uuid(), array[(t ->> 'v')::uuid, (t ->> 'v2')::uuid], t ->> 'cat', t ->> 'base', r));
  if x ? 'error' then raise exception 'S3: no se pudo prorratear: %', x; end if;
  perform pg_temp.din_objeto(r);
  if pg_temp.din_ve(pg_temp.din_persona('logistica.gastos.ver:todos:' || (t ->> 'o2')), r) <> 1 then
    raise exception 'S3: quien ve gastos del segundo vehículo del lote no leyó el comprobante';
  end if;
end $$;
rollback;

-- @test dinero: un objeto sin fila lo lee quien puede subir; el de un gasto borrado no lo lee quien ve (S4)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; ve uuid; suelto text; borrado text; g uuid; x jsonb;
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  ve := pg_temp.din_persona('logistica.gastos.ver');
  suelto := pg_temp.din_ruta((t ->> 'v')::uuid, 'd');
  perform pg_temp.din_objeto(suelto);
  if pg_temp.din_ve(ed, suelto) <> 1 then raise exception 'S4: quien puede subir no leyó el objeto recién subido'; end if;
  if pg_temp.din_ve(ve, suelto) <> 0 then raise exception 'S4: quien sólo ve gastos leyó un objeto que ninguna fila nombra'; end if;
  borrado := pg_temp.din_ruta((t ->> 'v')::uuid, 'e');
  g := pg_temp.din_gasto_con(ed, t, (t ->> 'v')::uuid, borrado);
  x := pg_temp.din_corre(ed, format('select public.gasto_eliminar(%L, %L)', g, (select actualizado_en from public.gastos where id = g)));
  if x ? 'error' then raise exception 'S4: no se pudo eliminar el gasto: %', x; end if;
  if pg_temp.din_ve(ve, borrado) <> 0 or pg_temp.din_ve(ed, borrado) <> 0 then
    raise exception 'S4: el comprobante de un gasto borrado se siguió leyendo';
  end if;
end $$;
rollback;

-- @test dinero: subir pide editar la unidad de la carpeta y la forma de la ruta, sin 22P02 (S5)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; v_e text; h constant text := repeat('f', 64); v text := t ->> 'v';
begin
  ed := pg_temp.din_persona('logistica.gastos.editar:todos:' || (t ->> 'o'));
  v_e := pg_temp.din_sube(ed, v || '/' || h || '.pdf');
  if v_e is not null then raise exception 'S5: quien edita gastos del origen no pudo subir: %', v_e; end if;
  v_e := pg_temp.din_sube(pg_temp.din_persona('logistica.pagos.editar:todos:' || (t ->> 'o')), v || '/' || repeat('9', 64) || '.jpg');
  if v_e is not null then raise exception 'S5: quien edita pagos del origen no pudo subir: %', v_e; end if;
  v_e := pg_temp.din_sube(ed, (t ->> 'v2') || '/' || h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'S5: subir a la carpeta de otro origen debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.din_sube(ed, 'sueltas/x.pdf');
  if v_e is distinct from '42501' then raise exception 'S5: una carpeta que no es un uuid debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.din_sube(ed, h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'S5: la raíz debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.din_sube(ed, v || '/' || h || '/x.pdf');
  if v_e is distinct from '42501' then raise exception 'S5: una subcarpeta debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.din_sube(ed, gen_random_uuid() || '/' || h || '.pdf');
  if v_e is distinct from '42501' then raise exception 'S5: una unidad que no existe debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
  v_e := pg_temp.din_sube(pg_temp.din_persona('logistica.gastos.ver'), v || '/' || repeat('1', 64) || '.pdf');
  if v_e is distinct from '42501' then raise exception 'S5: sólo con ver debía dar 42501 y dio %', coalesce(v_e, 'nada'); end if;
end $$;
rollback;

-- @test dinero: leer el bucket entero con un objeto de nombre roto no da error (S6)
begin;
do $$
declare t jsonb := pg_temp.din_terreno(); ed uuid; x jsonb;
begin
  ed := pg_temp.din_persona('logistica.gastos.editar', 'logistica.gastos.ver');
  perform pg_temp.din_objeto('sueltas/x.pdf');
  perform pg_temp.din_objeto('no-es-uuid/' || repeat('a', 64) || '.pdf');
  perform pg_temp.din_objeto(pg_temp.din_ruta((t ->> 'v')::uuid, 'a'));
  x := pg_temp.din_corre(ed, 'select to_jsonb(count(*)) from storage.objects where bucket_id = ''comprobantes''');
  if x is distinct from '1'::jsonb then raise exception 'S6: leer el bucket debía dar 1 (sin los rotos, sin error) y dio %', x; end if;
end $$;
rollback;
