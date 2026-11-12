-- El margen de un proyecto de repuestos, por moneda (paso 8.11-1, C9–C11). No depende de otro archivo (`SOLO=areas/repuestos/compras-margen.sql`); cada
-- bloque abre su transacción y la revierte. Ítems y compras se siembran como superusuario: la hoja escribe precio y moneda por celdas separadas.
--
-- Qué asegura (el «Terminado» del 8.11):
--   M1. Por moneda: Σ cantidad × precio de los ítems vivos − Σ compras vivas; una moneda sin ítems o sin compras suma 0 de ese lado.
--   M2. Nulo, no 0: un ítem vivo sin precio (o con precio y sin moneda) deja el margen nulo en todas las monedas; `sin_precio` corta en 201.
--   M3. Un margen que da 0 es 0 y no nulo; sin ítems ni compras, `monedas = []`.
--   M4. Sin `repuestos.ver` (o sin `repuestos.costos.ver`), 42501; un proyecto eliminado o inexistente, PT409.

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

create or replace function pg_temp.rp_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('proyecto', pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "rp"}')));
  return i;
end $f$;

create or replace function pg_temp.rpm_monedas() returns void language sql as $f$
  insert into public.monedas (codigo, nombre, simbolo) values ('XTS', 'Prueba', 'X'), ('XTU', 'Prueba U', 'U'), ('XTV', 'Prueba V', 'V')
  on conflict (codigo) do update set activa = true;
$f$;

create or replace function pg_temp.rpm_margen(p_quien uuid, p_proyecto uuid) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuestos_proyecto_margen(%L::uuid)', p_proyecto));
$f$;

create or replace function pg_temp.rpm_item(p_proyecto uuid, p_cantidad integer, p_precio numeric, p_moneda text, p_eliminado boolean default false)
returns void language sql as $f$
  insert into public.repuestos_items (proyecto_id, descripcion, cantidad, precio_cliente, moneda, eliminado_en)
  values (p_proyecto, 'rpm ítem', p_cantidad, p_precio, p_moneda, case when p_eliminado then now() end);
$f$;

create or replace function pg_temp.rpm_compra(p_proyecto uuid, p_monto numeric, p_moneda text, p_eliminada boolean default false)
returns void language sql as $f$
  insert into public.repuestos_compras (proyecto_id, moneda, monto, eliminado_en) values (p_proyecto, p_moneda, p_monto, case when p_eliminada then now() end);
$f$;

-- @test repuestos: el margen por moneda es Σ precios de los ítems vivos − Σ compras vivas (M1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver']); p uuid := pg_temp.rp_proyecto(ed); r jsonb;
begin
  perform pg_temp.rpm_monedas();
  perform pg_temp.rpm_item(p, 2, 50, 'XTS');
  perform pg_temp.rpm_item(p, 1, 30, 'XTU');
  perform pg_temp.rpm_item(p, 9, 9, 'XTS', true);
  perform pg_temp.rpm_compra(p, 60, 'XTS');
  perform pg_temp.rpm_compra(p, 10, 'XTU');
  perform pg_temp.rpm_compra(p, 5, 'XTV');
  perform pg_temp.rpm_compra(p, 1000, 'XTS', true);
  r := pg_temp.rp_ok('M1', pg_temp.rpm_margen(ed, p));
  if r <> '{"sin_precio": 0, "monedas": [
        {"moneda": "XTS", "precios": 100, "compras": 60, "margen": 40},
        {"moneda": "XTU", "precios": 30, "compras": 10, "margen": 20},
        {"moneda": "XTV", "precios": 0, "compras": 5, "margen": -5}]}'::jsonb then
    raise exception 'M1: el margen por moneda no es el esperado: %', r;
  end if;
end $$;
rollback;

-- @test repuestos: un ítem vivo sin precio (o sin moneda) deja el margen nulo, no 0, en todas las monedas; sin_precio corta en 201 (M2)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver']); p uuid := pg_temp.rp_proyecto(ed); r jsonb;
begin
  perform pg_temp.rpm_monedas();
  perform pg_temp.rpm_item(p, 2, 50, 'XTS');
  perform pg_temp.rpm_compra(p, 60, 'XTS');
  perform pg_temp.rpm_compra(p, 5, 'XTV');
  perform pg_temp.rpm_item(p, 1, null, null);
  r := pg_temp.rp_ok('M2 sin precio', pg_temp.rpm_margen(ed, p));
  if r <> '{"sin_precio": 1, "monedas": [
        {"moneda": "XTS", "precios": 100, "compras": 60, "margen": null},
        {"moneda": "XTV", "precios": 0, "compras": 5, "margen": null}]}'::jsonb then
    raise exception 'M2: con un ítem sin precio el margen debía ser nulo en todas las monedas: %', r;
  end if;
  -- Con precio y sin moneda: cuenta como sin precio y no arma un grupo de moneda nula.
  delete from public.repuestos_items where proyecto_id = p and precio_cliente is null;
  perform pg_temp.rpm_item(p, 1, 50, null);
  r := pg_temp.rp_ok('M2 sin moneda', pg_temp.rpm_margen(ed, p));
  if (r ->> 'sin_precio')::integer <> 1 or jsonb_path_exists(r, '$.monedas[*] ? (@.moneda == null)')
     or jsonb_path_exists(r, '$.monedas[*] ? (@.margen != null)') or jsonb_array_length(r -> 'monedas') <> 2 then
    raise exception 'M2: un precio sin moneda debía contar como sin precio, sin grupo de moneda nula y con margen nulo: %', r;
  end if;
  -- Un ítem eliminado sin precio no cuenta.
  delete from public.repuestos_items where proyecto_id = p and moneda is null;
  perform pg_temp.rpm_item(p, 1, null, null, true);
  r := pg_temp.rp_ok('M2 eliminado sin precio', pg_temp.rpm_margen(ed, p));
  if (r ->> 'sin_precio')::integer <> 0 or (r #>> '{monedas,0,margen}')::numeric <> 40 then
    raise exception 'M2: un ítem eliminado sin precio no cuenta: %', r;
  end if;
  insert into public.repuestos_items (proyecto_id, descripcion) select p, 'rpm sin precio ' || g from generate_series(1, 250) g;
  r := pg_temp.rp_ok('M2 tope', pg_temp.rpm_margen(ed, p));
  if (r ->> 'sin_precio')::integer <> 201 then
    raise exception 'M2: con 250 ítems sin precio, sin_precio debía cortar en 201: %', r ->> 'sin_precio';
  end if;
end $$;
rollback;

-- @test repuestos: un margen que da 0 es 0 y no nulo; sin ítems ni compras, monedas vacía (M3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver']);
  p uuid := pg_temp.rp_proyecto(ed); q uuid := pg_temp.rp_proyecto(ed); r jsonb;
begin
  perform pg_temp.rpm_monedas();
  r := pg_temp.rp_ok('M3 vacío', pg_temp.rpm_margen(ed, q));
  if r <> '{"sin_precio": 0, "monedas": []}'::jsonb then raise exception 'M3: sin ítems ni compras: %', r; end if;
  perform pg_temp.rpm_item(p, 1, 10, 'XTS');
  perform pg_temp.rpm_compra(p, 10, 'XTS');
  r := pg_temp.rp_ok('M3 cero', pg_temp.rpm_margen(ed, p));
  if jsonb_typeof(r #> '{monedas,0,margen}') <> 'number' or (r #>> '{monedas,0,margen}')::numeric <> 0 then
    raise exception 'M3: un margen de 0 es 0, no nulo: %', r;
  end if;
end $$;
rollback;

-- @test repuestos: el margen pide repuestos.costos.ver y repuestos.ver; un proyecto eliminado o que no existe da PT409 (M4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver']);
  sin_ver uuid := pg_temp.rp_persona(array['repuestos.costos.ver']);
  p uuid := pg_temp.rp_proyecto(ed);
begin
  perform pg_temp.rp_es('M4 sin repuestos.ver', pg_temp.rpm_margen(sin_ver, p), '42501', null);
  perform pg_temp.rp_es('M4 no existe', pg_temp.rpm_margen(ed, gen_random_uuid()), 'PT409', 'conflicto', 'Este proyecto ya no existe.');
  update public.repuestos_proyectos set eliminado_en = now() where id = p;
  perform pg_temp.rp_es('M4 eliminado', pg_temp.rpm_margen(ed, p), 'PT409', 'conflicto');
end $$;
rollback;
