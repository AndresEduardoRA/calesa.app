-- La fase de subasta (`fases.es_subasta`, «Es la subasta»): sólo en el flujo de un origen de subasta y nunca con `es_final`, en `fase_crear`,
-- `fase_guardar` y el trigger de `fases`. No depende de otro archivo (`SOLO=areas/flujos/fases-subasta.sql`). Cada bloque abre su transacción
-- y la revierte.
--
-- Qué asegura:
--   S1. En un origen de subasta, crear y guardar con `es_subasta` pasa y queda escrito; crear sin la clave la deja apagada.
--   S2. En un origen manual o en repuestos → 23514 con hint `es_subasta`, al crear y al guardar.
--   S3. Con `es_final` → 22023 con hint `es_subasta`.
--   S4. La clave está en la lista cerrada (un texto por booleano da 22023 con hint `es_subasta`).
--   S5. El trigger de `fases` lo frena también sin pasar por la RPC (23514).

create or replace function pg_temp.fs_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fs_' || substr(v_id::text, 1, 8), 'FS ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave) values (v_rol, c);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fs_flujo(p_tipo text) returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fs_' || s, 'FS origen ' || s, p_tipo::public.tipo_origen) returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fs_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.fs_crear(p_quien uuid, p_flujo uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.fs_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_crear(%L, %L, %L, %L::jsonb))',
    p_id, p_flujo, (select actualizado_en from public.flujos where id = p_flujo), p_datos));
$f$;

create or replace function pg_temp.fs_guardar(p_quien uuid, p_fase uuid, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.fs_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_guardar(%L, %L, %L::jsonb))',
    p_fase, (select fl.actualizado_en from public.flujos fl join public.fases f on f.flujo_id = fl.id where f.id = p_fase), p_cambios));
$f$;

create or replace function pg_temp.fs_es(p_que text, p_r jsonb, p_estado text, p_mensaje text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % «%» (hint %) y dio %', p_que, p_estado, p_mensaje, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.fs_pasa(p_que text, p_r jsonb) returns void language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
end $f$;

-- @test fases-subasta: en un origen de subasta crear y guardar con es_subasta pasa; sin la clave nace apagada (S1)
begin;
do $$
declare fl uuid := pg_temp.fs_flujo('subasta'); yo uuid := pg_temp.fs_persona(array['flujos.configurar']);
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
begin
  perform pg_temp.fs_pasa('S1 crear', pg_temp.fs_crear(yo, fl, a, '{"nombre": "FS Subasta", "es_inicial": true, "es_subasta": true}'));
  if not (select es_subasta from public.fases where id = a) then raise exception 'S1: crear no dejó es_subasta'; end if;
  perform pg_temp.fs_pasa('S1 crear sin la clave', pg_temp.fs_crear(yo, fl, b, '{"nombre": "FS Comprado"}'));
  if (select es_subasta from public.fases where id = b) then raise exception 'S1: sin la clave nació como subasta'; end if;
  perform pg_temp.fs_pasa('S1 guardar', pg_temp.fs_guardar(yo, b, '{"es_subasta": true}'));
  if not (select es_subasta from public.fases where id = b) then raise exception 'S1: guardar no dejó es_subasta'; end if;
  perform pg_temp.fs_pasa('S1 guardar con nombre', pg_temp.fs_guardar(yo, b, '{"nombre": "FS Otra", "es_subasta": false}'));
  if (select es_subasta from public.fases where id = b) then raise exception 'S1: guardar con nombre no apagó es_subasta'; end if;
end $$;
rollback;

-- @test fases-subasta: en un origen manual o en repuestos da 23514 con hint es_subasta (S2)
begin;
do $$
declare man uuid := pg_temp.fs_flujo('manual'); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  yo uuid := pg_temp.fs_persona(array['flujos.configurar', 'repuestos.configurar']); f uuid := gen_random_uuid(); m text :=
  'Sólo una fase del flujo de un origen de subasta puede ser la subasta.';
begin
  perform pg_temp.fs_es('S2 crear manual', pg_temp.fs_crear(yo, man, gen_random_uuid(), '{"nombre": "FS", "es_subasta": true}'), '23514', m, 'es_subasta');
  perform pg_temp.fs_es('S2 crear repuestos', pg_temp.fs_crear(yo, rep, gen_random_uuid(), '{"nombre": "FS rep", "es_subasta": true}'), '23514', m, 'es_subasta');
  perform pg_temp.fs_pasa('S2 crear manual sin subasta', pg_temp.fs_crear(yo, man, f, '{"nombre": "FS"}'));
  perform pg_temp.fs_es('S2 guardar manual', pg_temp.fs_guardar(yo, f, '{"es_subasta": true}'), '23514', m, 'es_subasta');
end $$;
rollback;

-- @test fases-subasta: con es_final da 22023 con hint es_subasta (S3)
begin;
do $$
declare fl uuid := pg_temp.fs_flujo('subasta'); yo uuid := pg_temp.fs_persona(array['flujos.configurar']); f uuid := gen_random_uuid();
  m text := 'La subasta no puede ser la fase final.';
begin
  perform pg_temp.fs_es('S3 crear', pg_temp.fs_crear(yo, fl, gen_random_uuid(), '{"nombre": "FS", "es_final": true, "es_subasta": true}'), '22023', m, 'es_subasta');
  perform pg_temp.fs_pasa('S3 crear final', pg_temp.fs_crear(yo, fl, f, '{"nombre": "FS F", "es_final": true}'));
  perform pg_temp.fs_es('S3 guardar', pg_temp.fs_guardar(yo, f, '{"es_subasta": true}'), '22023', m, 'es_subasta');
end $$;
rollback;

-- @test fases-subasta: es_subasta está en la lista cerrada con su tipo (S4)
begin;
do $$
declare fl uuid := pg_temp.fs_flujo('subasta'); yo uuid := pg_temp.fs_persona(array['flujos.configurar']);
begin
  perform pg_temp.fs_es('S4 texto', pg_temp.fs_crear(yo, fl, gen_random_uuid(), '{"nombre": "FS", "es_subasta": "si"}'),
    '22023', 'El dato «es_subasta» no tiene el formato esperado.', 'es_subasta');
  perform pg_temp.fs_es('S4 nulo', pg_temp.fs_crear(yo, fl, gen_random_uuid(), '{"nombre": "FS", "es_subasta": null}'),
    '22023', 'El dato «es_subasta» no tiene el formato esperado.', 'es_subasta');
end $$;
rollback;

-- @test fases-subasta: el trigger de fases lo frena sin pasar por la RPC (S5)
begin;
do $$
declare man uuid := pg_temp.fs_flujo('manual'); sub uuid := pg_temp.fs_flujo('subasta'); f uuid; v_e text;
begin
  insert into public.fases (flujo_id, nombre, es_subasta) values (sub, 'FS directa', true) returning id into f;
  begin
    insert into public.fases (flujo_id, nombre, es_subasta) values (man, 'FS directa', true);
    raise exception 'S5: el insert directo en un origen manual pasó';
  exception when check_violation then
    get stacked diagnostics v_e = message_text;
    if v_e <> 'Sólo una fase del flujo de un origen de subasta puede ser la subasta.' then raise exception 'S5: dio %', v_e; end if;
  end;
  insert into public.fases (flujo_id, nombre) values (man, 'FS manual') returning id into f;
  begin
    update public.fases set es_subasta = true where id = f;
    raise exception 'S5: el update directo en un origen manual pasó';
  exception when check_violation then null;
  end;
end $$;
rollback;
