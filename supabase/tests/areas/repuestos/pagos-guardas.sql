-- Corregir y eliminar un pago de un proyecto de repuestos piden lo mismo que registrarlo, y su lead queda nulo. No depende de otro archivo
-- (`SOLO=areas/repuestos/pagos-guardas.sql`); cada bloque abre su transacción y la revierte.
--
--   G1. Con `repuestos.costos.editar` y sin `repuestos.ver`, `pago_guardar` y `pago_eliminar` dan 42501 y el pago no cambia; con las dos, pasan.
--   G2. `pago_guardar` no le pone lead a un pago de proyecto (22023, hint `lead_id`), aunque quien corrige vea el lead; quitarlo (nulo) no es un cambio.

create or replace function pg_temp.pgu_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-pgu@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

create or replace function pg_temp.pgu_persona(variadic p_claves text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.pgu_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('pgu_' || substr(v_id::text, 1, 8), 'pgu ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_claves loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.pgu_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.pgu_da(p_que text, p_r jsonb, p_estado text, p_hint text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or (p_hint is not null and p_r ->> 'hint' is distinct from p_hint) then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.pgu_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.pgu_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.pgu_ok('proyecto', pg_temp.pgu_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "pgu"}')));
  return i;
end $f$;

-- Un pago sin confirmar del proyecto en la moneda base: su id.
create or replace function pg_temp.pgu_pago(p_quien uuid, p_proyecto uuid) returns uuid language plpgsql as $f$
declare p uuid := gen_random_uuid();
begin
  perform pg_temp.pgu_ok('registrar', pg_temp.pgu_corre(p_quien, format(
    'select public.pago_registrar_proyecto(%L::uuid, %L::uuid, ''Anticipo'', %L, 100, null, null, null, null, null)',
    p, p_proyecto, (select moneda_base::text from public.ajustes_empresa where id = 1))));
  return p;
end $f$;

create or replace function pg_temp.pgu_guardar(p_quien uuid, p_id uuid, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.pgu_corre(p_quien, format('select public.pago_guardar(%L::uuid, %L::timestamptz, %L::jsonb)', p_id,
    (select actualizado_en from public.pagos where id = p_id), p_cambios));
$f$;

create or replace function pg_temp.pgu_eliminar(p_quien uuid, p_id uuid) returns jsonb language sql as $f$
  select pg_temp.pgu_corre(p_quien, format('select public.pago_eliminar(%L::uuid, %L::timestamptz)', p_id,
    (select actualizado_en from public.pagos where id = p_id)));
$f$;

-- @test repuestos: corregir o eliminar un pago de proyecto pide repuestos.ver además de repuestos.costos.editar (G1)
begin;
do $$
declare
  ed uuid := pg_temp.pgu_persona('repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar');
  sin_ver uuid := pg_temp.pgu_persona('repuestos.costos.ver', 'repuestos.costos.editar');
  pr uuid := pg_temp.pgu_proyecto(ed); p uuid := pg_temp.pgu_pago(ed, pr); antes jsonb := (select to_jsonb(x) from public.pagos x where x.id = p);
begin
  perform pg_temp.pgu_da('G1: corregir sin repuestos.ver', pg_temp.pgu_guardar(sin_ver, p, '{"monto": 20}'), '42501');
  perform pg_temp.pgu_da('G1: eliminar sin repuestos.ver', pg_temp.pgu_eliminar(sin_ver, p), '42501');
  if (select to_jsonb(x) from public.pagos x where x.id = p) is distinct from antes then
    raise exception 'G1: un rechazo cambió el pago: %', (select to_jsonb(x) from public.pagos x where x.id = p);
  end if;
  perform pg_temp.pgu_ok('G1: corregir con las dos', pg_temp.pgu_guardar(ed, p, '{"monto": 20}'));
  if (select monto from public.pagos where id = p) <> 20 then raise exception 'G1: corregir con las dos debía guardar el monto'; end if;
  perform pg_temp.pgu_ok('G1: eliminar con las dos', pg_temp.pgu_eliminar(ed, p));
end $$;
rollback;

-- @test repuestos: un pago de proyecto no toma lead al corregirlo (G2)
begin;
do $$
declare
  ed uuid := pg_temp.pgu_persona('repuestos.ver', 'repuestos.editar', 'repuestos.costos.ver', 'repuestos.costos.editar', 'leads.ver');
  pr uuid := pg_temp.pgu_proyecto(ed); p uuid := pg_temp.pgu_pago(ed, pr); l uuid; r jsonb;
begin
  insert into public.leads (nombre, telefono_principal, creado_por, origen_lead_id, atributos)
  values ('PGU lead', '72190001', ed, (select id from public.origenes_lead where clave = 'web'), '{}')
  returning id into l;
  if not pg_temp.pgu_corre(ed, format('select to_jsonb(public.puede_lead(%L, ''leads.ver''))', l))::text::boolean then
    raise exception 'G2: quien corrige debía ver el lead';
  end if;
  perform pg_temp.pgu_da('G2: ponerle un lead', pg_temp.pgu_guardar(ed, p, jsonb_build_object('lead_id', l)), '22023', 'lead_id');
  if (select lead_id from public.pagos where id = p) is not null then raise exception 'G2: el pago de proyecto quedó con lead'; end if;
  r := pg_temp.pgu_ok('G2: lead nulo', pg_temp.pgu_guardar(ed, p, '{"lead_id": null}'));
  if not (r ->> 'sin_cambios')::boolean then raise exception 'G2: un lead nulo en un pago de proyecto no es un cambio: %', r; end if;
end $$;
rollback;
