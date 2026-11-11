-- Los requisitos de fase por RPC (paso 5.07-1): crear, las reglas del trigger con su campo, los permisos y la escritura directa. No depende de
-- otro archivo (`SOLO=humo.sql,areas/flujos/requisitos.sql`). Cada bloque abre su transacción y la revierte. Guardar, mover y eliminar:
-- `requisitos-editar.sql`.
--
-- Qué asegura:
--   R1. Los tres tipos se crean por `requisito_crear` y nacen informativos (también una inserción directa sin `bloqueante`), al final de la
--       fase, la espera con el ámbito del flujo; la versión devuelta es la del flujo y avanza.
--   R2. Clave desconocida, o exclusiva de repuestos en un flujo de vehículos → 22023 `clave_dato`.
--   R3. Espera a una fase del mismo ámbito → 22023 `espera_fase_id`.
--   R4. Espera con la regla `esperas` apagada → 23514 `espera_fase_id`.
--   R5. Formatos fuera de los del tipo, o vacíos → 22023 `formatos`.
--   R6. Espera a una fase jubilada → 22023; una espera ya creada cuya fase se jubila después sigue guardando sus notas.
--   R7. `bloqueante` o `espera_ambito` al crear → 22023 con su campo.
--   R8. El asesor y quien configura otro origen → 42501 en crear, guardar, mover y eliminar; `repuestos.configurar` sólo en repuestos.
--   R9. Escritura directa como authenticated que configura → 42501; el select sigue.
--   R10. Con la versión vieja → PT409 sin escribir; authenticated no ejecuta los ayudantes.

create or replace function pg_temp.rq_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rq_' || substr(v_id::text, 1, 8), 'RQ ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.rq_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un origen nuevo (su flujo de vehículos lo crea `origen_crear_flujo`, con la regla `esperas` encendida); devuelve el id del flujo.
create or replace function pg_temp.rq_flujo() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('rq_' || s, 'RQ origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.rq_repuestos() returns uuid language sql as $f$
  select id from public.flujos where ambito = 'repuestos';
$f$;

create or replace function pg_temp.rq_origen_de(p_flujo uuid) returns uuid language sql as $f$
  select origen_id from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.rq_version(p_flujo uuid) returns timestamptz language sql as $f$
  select actualizado_en from public.flujos where id = p_flujo;
$f$;

create or replace function pg_temp.rq_fase(p_flujo uuid, p_nombre text, p_activa boolean default true) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, activa)
  values (p_flujo, p_nombre || ' ' || substr(gen_random_uuid()::text, 1, 6), 1000, p_activa) returning id;
$f$;

create or replace function pg_temp.rq_tipo_doc() returns uuid language sql as $f$
  insert into public.tipos_documento (nombre, formatos) values ('RQ doc ' || substr(gen_random_uuid()::text, 1, 8), '{application/pdf,image/png}')
  returning id;
$f$;

create or replace function pg_temp.rq_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rq_crear(p_quien uuid, p_fase uuid, p_version timestamptz, p_tipo text, p_datos jsonb, p_id uuid default gen_random_uuid())
returns jsonb language sql as $f$
  select pg_temp.rq_corre(p_quien, format('select jsonb_build_object(''version'', public.requisito_crear(%L, %L, %L, %L, %L::jsonb), ''id'', %L::uuid)',
    p_id, p_fase, p_version, p_tipo, p_datos, p_id));
$f$;

-- Falla si `r` no es el error esperado (estado y campo).
create or replace function pg_temp.rq_falla(p_que text, p_r jsonb, p_estado text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % (hint %) y dio %', p_que, p_estado, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.rq_bien(p_que text, p_r jsonb) returns timestamptz language plpgsql as $f$
begin
  if p_r ? 'error' or p_r ->> 'version' is null then raise exception '%: debía andar y dio %', p_que, p_r; end if;
  return (p_r ->> 'version')::timestamptz;
end $f$;

-- @test requisitos: los tres tipos se crean por RPC, nacen informativos y al final de la fase, y mueven la versión (R1)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); f uuid := pg_temp.rq_fase(a, 'RQ fase'); fr uuid := pg_temp.rq_fase(pg_temp.rq_repuestos(), 'RQ rep');
  config uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(a)]); td uuid := pg_temp.rq_tipo_doc();
  v0 timestamptz := pg_temp.rq_version(a); v timestamptz; r jsonb; d uuid; x uuid;
begin
  r := pg_temp.rq_crear(config, f, v0, 'documento', jsonb_build_object('tipo_documento_id', td, 'min_archivos', 1, 'formatos', '["application/pdf"]'::jsonb));
  v := pg_temp.rq_bien('R1 documento', r);
  if v is distinct from pg_temp.rq_version(a) or v <= v0 then raise exception 'R1: la versión devuelta % no es la del flujo % o no avanzó', v, pg_temp.rq_version(a); end if;
  d := (r ->> 'id')::uuid;
  v := pg_temp.rq_bien('R1 dato', pg_temp.rq_crear(config, f, v, 'dato', '{"clave_dato": "vehiculo.vin", "notas": "  el VIN  "}'));
  v := pg_temp.rq_bien('R1 espera', pg_temp.rq_crear(config, f, v, 'espera', jsonb_build_object('espera_fase_id', fr)));
  if (select array_agg(tipo::text || ':' || bloqueante || ':' || orden order by orden) from public.fases_requisitos where fase_id = f)
     is distinct from array['documento:false:10', 'dato:false:20', 'espera:false:30'] then
    raise exception 'R1: debían quedar tres informativos en 10/20/30 y quedó %', (select array_agg(tipo::text || ':' || bloqueante || ':' || orden) from public.fases_requisitos where fase_id = f);
  end if;
  if (select espera_ambito::text from public.fases_requisitos where fase_id = f and tipo = 'espera') is distinct from 'hijos'
     or (select notas from public.fases_requisitos where fase_id = f and tipo = 'dato') is distinct from 'el VIN'
     or (select formatos from public.fases_requisitos where id = d) is distinct from array['application/pdf'] then
    raise exception 'R1: la espera debía esperar a sus hijos, las notas recortarse y los formatos quedar';
  end if;
  insert into public.fases_requisitos (fase_id, tipo, clave_dato) values (f, 'dato', 'vehiculo.lead') returning id into x;
  if (select bloqueante from public.fases_requisitos where id = x) then raise exception 'R1: el default de bloqueante debía ser false'; end if;
end $$;
rollback;

-- @test requisitos: clave desconocida o de otro ámbito, espera al mismo ámbito o con la regla apagada, formatos fuera del tipo (R2–R5)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); b uuid := pg_temp.rq_flujo(); f uuid := pg_temp.rq_fase(a, 'RQ fase'); fb uuid := pg_temp.rq_fase(b, 'RQ b');
  fr uuid := pg_temp.rq_fase(pg_temp.rq_repuestos(), 'RQ rep');
  config uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(a)]); td uuid := pg_temp.rq_tipo_doc();
  v timestamptz := pg_temp.rq_version(a);
begin
  perform pg_temp.rq_falla('R2 desconocida', pg_temp.rq_crear(config, f, v, 'dato', '{"clave_dato": "vehiculo.nada"}'), '22023', 'clave_dato');
  perform pg_temp.rq_falla('R2 de repuestos', pg_temp.rq_crear(config, f, v, 'dato', '{"clave_dato": "repuesto.precio"}'), '22023', 'clave_dato');
  perform pg_temp.rq_falla('R3 mismo ámbito', pg_temp.rq_crear(config, f, v, 'espera', jsonb_build_object('espera_fase_id', fb)), '22023', 'espera_fase_id');
  perform pg_temp.rq_falla('R5 formatos', pg_temp.rq_crear(config, f, v, 'documento',
    jsonb_build_object('tipo_documento_id', td, 'formatos', '["text/plain"]'::jsonb)), '22023', 'formatos');
  perform pg_temp.rq_falla('R5 formatos vacíos', pg_temp.rq_crear(config, f, v, 'documento',
    jsonb_build_object('tipo_documento_id', td, 'formatos', '[]'::jsonb)), '22023', 'formatos');
  update public.flujos_reglas set activa = false where flujo_id = a and regla = 'esperas';
  perform pg_temp.rq_falla('R4 regla apagada', pg_temp.rq_crear(config, f, v, 'espera', jsonb_build_object('espera_fase_id', fr)), '23514', 'espera_fase_id');
  if exists (select 1 from public.fases_requisitos where fase_id = f) then raise exception 'R2–R5: nada debía escribirse'; end if;
end $$;
rollback;

-- @test requisitos: no se espera a una jubilada; una espera cuya fase se jubila después sigue guardando sus notas (R6)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); f uuid := pg_temp.rq_fase(a, 'RQ fase'); rep uuid := pg_temp.rq_repuestos();
  jubilada uuid := pg_temp.rq_fase(rep, 'RQ jubilada', false); fr uuid := pg_temp.rq_fase(rep, 'RQ rep');
  config uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(a)]);
  v timestamptz := pg_temp.rq_version(a); r jsonb;
begin
  perform pg_temp.rq_falla('R6 jubilada', pg_temp.rq_crear(config, f, v, 'espera', jsonb_build_object('espera_fase_id', jubilada)), '22023', 'espera_fase_id');
  r := pg_temp.rq_crear(config, f, v, 'espera', jsonb_build_object('espera_fase_id', fr));
  v := pg_temp.rq_bien('R6 activa', r);
  update public.fases set activa = false where id = fr;
  v := pg_temp.rq_bien('R6 notas', pg_temp.rq_corre(config, format('select jsonb_build_object(''version'', public.requisito_guardar(%L, %L, %L::jsonb))',
    r ->> 'id', v, '{"notas": "sigue", "bloqueante": true}')));
  if (select notas || ':' || bloqueante from public.fases_requisitos where id = (r ->> 'id')::uuid) is distinct from 'sigue:true' then
    raise exception 'R6: las notas y bloqueante debían guardarse';
  end if;
end $$;
rollback;

-- @test requisitos: bloqueante, espera_ambito, una clave de otro tipo o un obligatorio que falta al crear dan 22023 con su campo (R7)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); f uuid := pg_temp.rq_fase(a, 'RQ fase'); fr uuid := pg_temp.rq_fase(pg_temp.rq_repuestos(), 'RQ rep');
  config uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(a)]); v timestamptz := pg_temp.rq_version(a);
begin
  perform pg_temp.rq_falla('R7 bloqueante', pg_temp.rq_crear(config, f, v, 'dato', '{"clave_dato": "vehiculo.vin", "bloqueante": true}'), '22023', 'bloqueante');
  perform pg_temp.rq_falla('R7 espera_ambito', pg_temp.rq_crear(config, f, v, 'espera',
    jsonb_build_object('espera_fase_id', fr, 'espera_ambito', 'padre')), '22023', 'espera_ambito');
  perform pg_temp.rq_falla('R7 de otro tipo', pg_temp.rq_crear(config, f, v, 'dato', '{"clave_dato": "vehiculo.vin", "formatos": ["a"]}'), '22023', 'formatos');
  perform pg_temp.rq_falla('R7 falta', pg_temp.rq_crear(config, f, v, 'documento', '{}'), '22023', 'tipo_documento_id');
  if exists (select 1 from public.fases_requisitos where fase_id = f) then raise exception 'R7: nada debía escribirse'; end if;
end $$;
rollback;

-- @test requisitos: el asesor y quien configura otro origen reciben 42501 en las cuatro; repuestos.configurar sólo en repuestos (R8)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); b uuid := pg_temp.rq_flujo(); rep uuid := pg_temp.rq_repuestos();
  f uuid := pg_temp.rq_fase(a, 'RQ fase'); fr uuid := pg_temp.rq_fase(rep, 'RQ rep');
  config_b uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(b)]);
  config_rep uuid := pg_temp.rq_persona(array['repuestos.configurar']); asesor uuid := pg_temp.rq_asesor();
  v timestamptz := pg_temp.rq_version(a); q uuid; quien uuid; r jsonb;
begin
  insert into public.fases_requisitos (fase_id, tipo, clave_dato) values (f, 'dato', 'vehiculo.vin') returning id into q;
  foreach quien in array array[asesor, config_b, config_rep] loop
    perform pg_temp.rq_falla('R8 crear', pg_temp.rq_crear(quien, f, v, 'dato', '{"clave_dato": "vehiculo.lead"}'), '42501', null);
    perform pg_temp.rq_falla('R8 guardar', pg_temp.rq_corre(quien, format('select to_jsonb(public.requisito_guardar(%L, %L, %L::jsonb))', q, v, '{"notas": "x"}')), '42501', null);
    perform pg_temp.rq_falla('R8 mover', pg_temp.rq_corre(quien, format('select to_jsonb(public.requisito_mover(%L, %L))', q, v)), '42501', null);
    perform pg_temp.rq_falla('R8 eliminar', pg_temp.rq_corre(quien, format('select to_jsonb(public.requisito_eliminar(%L, %L))', q, v)), '42501', null);
  end loop;
  if (select count(*) from public.fases_requisitos where fase_id = f) <> 1 or (select notas from public.fases_requisitos where id = q) is not null
     or pg_temp.rq_version(a) is distinct from v then
    raise exception 'R8: nada debía escribirse ni moverse la versión';
  end if;
  r := pg_temp.rq_crear(config_rep, fr, pg_temp.rq_version(rep), 'dato', '{"clave_dato": "repuesto.precio"}');
  perform pg_temp.rq_bien('R8 repuestos.configurar en repuestos', r);
end $$;
rollback;

-- @test requisitos: la escritura directa como authenticated que configura da 42501 y el select sigue (R9)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); f uuid := pg_temp.rq_fase(a, 'RQ fase');
  config uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(a)]); q uuid; r jsonb;
begin
  insert into public.fases_requisitos (fase_id, tipo, clave_dato) values (f, 'dato', 'vehiculo.vin') returning id into q;
  r := pg_temp.rq_corre(config, format('insert into public.fases_requisitos (fase_id, tipo, clave_dato) values (%L, ''dato'', ''vehiculo.lead'') returning ''{}''::jsonb', f));
  perform pg_temp.rq_falla('R9 insert', r, '42501', null);
  r := pg_temp.rq_corre(config, format('update public.fases_requisitos set bloqueante = true where id = %L returning ''{}''::jsonb', q));
  perform pg_temp.rq_falla('R9 update', r, '42501', null);
  r := pg_temp.rq_corre(config, format('delete from public.fases_requisitos where id = %L returning ''{}''::jsonb', q));
  perform pg_temp.rq_falla('R9 delete', r, '42501', null);
  r := pg_temp.rq_corre(config, format('select jsonb_build_object(''n'', count(*)) from public.fases_requisitos where id = %L', q));
  if r ->> 'n' is distinct from '1' then raise exception 'R9: el select debía leer la fila y dio %', r; end if;
  if has_table_privilege('authenticated', 'public.fases_requisitos', 'truncate') then raise exception 'R9: authenticated no debía poder truncar'; end if;
end $$;
rollback;

-- @test requisitos: crear con la versión vieja da PT409 sin escribir; authenticated no ejecuta los ayudantes; anon nada (R10)
begin;
do $$
declare
  a uuid := pg_temp.rq_flujo(); f uuid := pg_temp.rq_fase(a, 'RQ fase');
  config uuid := pg_temp.rq_persona(array['flujos.configurar@' || pg_temp.rq_origen_de(a)]);
  v0 timestamptz := pg_temp.rq_version(a); v timestamptz; id uuid := gen_random_uuid();
begin
  v := pg_temp.rq_bien('R10 primero', pg_temp.rq_crear(config, f, v0, 'dato', '{"clave_dato": "vehiculo.vin"}', id));
  perform pg_temp.rq_falla('R10 vieja', pg_temp.rq_crear(config, f, v0, 'dato', '{"clave_dato": "vehiculo.lead"}'), 'PT409', null);
  perform pg_temp.rq_falla('R10 id repetido', pg_temp.rq_crear(config, f, v, 'dato', '{"clave_dato": "vehiculo.lead"}', id), '23505', 'id');
  if (select count(*) from public.fases_requisitos where fase_id = f) <> 1 then raise exception 'R10: debía quedar uno solo'; end if;
  if has_function_privilege('authenticated', 'public._requisito_forma(public.tipo_requisito, jsonb, boolean)', 'execute')
     or has_function_privilege('authenticated', 'public._requisito_validar(public.fases_requisitos, text[])', 'execute')
     or has_function_privilege('authenticated', 'public.fase_requisito_validar()', 'execute')
     or has_function_privilege('anon', 'public.requisito_crear(uuid, uuid, timestamptz, public.tipo_requisito, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.requisito_guardar(uuid, timestamptz, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.requisito_mover(uuid, timestamptz, uuid)', 'execute')
     or has_function_privilege('anon', 'public.requisito_eliminar(uuid, timestamptz)', 'execute') then
    raise exception 'R10: authenticated ejecuta un ayudante o anon una RPC';
  end if;
end $$;
rollback;
