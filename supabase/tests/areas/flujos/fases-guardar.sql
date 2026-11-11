-- Los datos de una fase (paso 5.01-1): lista cerrada, tipos, validaciones, reglas del flujo y únicos, con el campo en `hint`, en `fase_crear` y
-- `fase_guardar`. No depende de otro archivo (`SOLO=humo.sql,areas/flujos/fases-guardar.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   G1. Una clave fuera de la lista (también `activa`, `orden`, `flujo_id`) → 22023 con la clave en `hint`.
--   G2. Un tipo que no es el suyo (texto por booleano, decimal o entero enorme por entero, nulo por nombre) → 22023 con la clave en `hint`.
--   G3. Cada validación da su mensaje y su campo; en guardar, sobre la fila mezclada.
--   G4. Las reglas del flujo: aduana sin la regla (origen manual, repuestos) → 23514; con la regla, pasa; sin logística, crear deja `es_logistica` apagada.
--   G5. Los únicos con mensaje humano: nombre repetido en el flujo y dos fases que cuentan la llegada de repuestos.

create or replace function pg_temp.fg_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('fg_' || substr(v_id::text, 1, 8), 'FG ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave) values (v_rol, c);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.fg_flujo(p_tipo text) returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('fg_' || s, 'FG origen ' || s, p_tipo::public.tipo_origen) returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.fg_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

-- Crea en ese flujo con su versión vigente.
create or replace function pg_temp.fg_crear(p_quien uuid, p_flujo uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.fg_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_crear(%L, %L, %L, %L::jsonb))',
    gen_random_uuid(), p_flujo, (select actualizado_en from public.flujos where id = p_flujo), p_datos));
$f$;

-- Guarda esa fase con la versión vigente de su flujo.
create or replace function pg_temp.fg_guardar(p_quien uuid, p_fase uuid, p_cambios jsonb) returns jsonb language sql as $f$
  select pg_temp.fg_corre(p_quien, format('select jsonb_build_object(''version'', public.fase_guardar(%L, %L, %L::jsonb))',
    p_fase, (select fl.actualizado_en from public.flujos fl join public.fases f on f.flujo_id = fl.id where f.id = p_fase), p_cambios));
$f$;

-- Da ese error con ese hint.
create or replace function pg_temp.fg_es(p_que text, p_r jsonb, p_estado text, p_mensaje text, p_hint text) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'mensaje' is distinct from p_mensaje or p_r ->> 'hint' is distinct from p_hint then
    raise exception '%: debía dar % «%» (hint %) y dio %', p_que, p_estado, p_mensaje, p_hint, p_r;
  end if;
end $f$;

create or replace function pg_temp.fg_pasa(p_que text, p_r jsonb) returns void language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
end $f$;

-- @test fases: crear con una clave fuera de la lista da 22023 con la clave en hint (G1)
begin;
do $$
declare a uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']); k text;
begin
  foreach k in array array['activa', 'orden', 'flujo_id', 'id', 'xyz'] loop
    perform pg_temp.fg_es('G1 crear ' || k, pg_temp.fg_crear(yo, a, jsonb_build_object('nombre', 'FG', k, true)),
      '22023', format('El dato «%s» no se cambia desde una fase.', k), k);
  end loop;
  perform pg_temp.fg_es('G1 crear nulo', pg_temp.fg_crear(yo, a, 'null'), '22023', 'Faltan los datos de la fase.', null);
  perform pg_temp.fg_es('G1 crear arreglo', pg_temp.fg_crear(yo, a, '[]'), '22023', 'Faltan los datos de la fase.', null);
end $$;
rollback;

-- @test fases: crear con un tipo que no es el suyo da 22023 con la clave en hint (G2)
begin;
do $$
declare a uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']); c jsonb;
begin
  foreach c in array array['{"nombre": "FG", "es_final": "si"}', '{"nombre": "FG", "demora_dias": 1.5}', '{"nombre": "FG", "demora_dias": 1e12}',
                           '{"nombre": null}', '{"nombre": "FG", "color": null}', '{"nombre": "FG", "icono": 3}']::jsonb[] loop
    perform pg_temp.fg_es('G2 ' || c::text, pg_temp.fg_crear(yo, a, c), '22023',
      format('El dato «%s» no tiene el formato esperado.', (select k from jsonb_object_keys(c - 'nombre') k union all select 'nombre' limit 1)),
      (select k from jsonb_object_keys(c - 'nombre') k union all select 'nombre' limit 1));
  end loop;
end $$;
rollback;

-- @test fases: crear da el mensaje y el campo de cada validación (G3)
begin;
do $$
declare a uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']);
begin
  perform pg_temp.fg_es('G3 sin nombre', pg_temp.fg_crear(yo, a, '{}'), '22023', 'La fase necesita un nombre.', 'nombre');
  perform pg_temp.fg_es('G3 nombre vacío', pg_temp.fg_crear(yo, a, '{"nombre": "   "}'), '22023', 'La fase necesita un nombre.', 'nombre');
  perform pg_temp.fg_es('G3 nombre largo', pg_temp.fg_crear(yo, a, jsonb_build_object('nombre', repeat('n', 61))),
    '22023', 'El nombre de la fase tiene hasta 60 caracteres.', 'nombre');
  perform pg_temp.fg_es('G3 descripción', pg_temp.fg_crear(yo, a, jsonb_build_object('nombre', 'FG', 'descripcion', repeat('d', 501))),
    '22023', 'La descripción tiene hasta 500 caracteres.', 'descripcion');
  perform pg_temp.fg_es('G3 descripción portal', pg_temp.fg_crear(yo, a, jsonb_build_object('nombre', 'FG', 'descripcion_portal', repeat('d', 501))),
    '22023', 'La descripción tiene hasta 500 caracteres.', 'descripcion_portal');
  perform pg_temp.fg_es('G3 alias', pg_temp.fg_crear(yo, a, jsonb_build_object('nombre', 'FG', 'alias_portal', repeat('a', 61))),
    '22023', 'El nombre para el cliente tiene hasta 60 caracteres.', 'alias_portal');
  perform pg_temp.fg_es('G3 color', pg_temp.fg_crear(yo, a, '{"nombre": "FG", "color": "rojo"}'), '22023', 'El color va como #rrggbb.', 'color');
  perform pg_temp.fg_es('G3 ícono', pg_temp.fg_crear(yo, a, '{"nombre": "FG", "icono": "Mal Icono"}'), '22023', 'El ícono no tiene el formato esperado.', 'icono');
  perform pg_temp.fg_es('G3 demora', pg_temp.fg_crear(yo, a, '{"nombre": "FG", "demora_dias": -1}'), '22023', 'La demora va en días enteros, desde 0.', 'demora_dias');
  perform pg_temp.fg_es('G3 alerta', pg_temp.fg_crear(yo, a, '{"nombre": "FG", "alerta_cada_horas": 0}'),
    '22023', 'La alerta se repite cada 1 a 720 horas.', 'alerta_cada_horas');
  perform pg_temp.fg_es('G3 inicial y final', pg_temp.fg_crear(yo, a, '{"nombre": "FG", "es_inicial": true, "es_final": true}'),
    '22023', 'Una fase no puede ser inicial y final a la vez.', 'es_final');
  perform pg_temp.fg_es('G3 portal sin alias', pg_temp.fg_crear(yo, a, '{"nombre": "FG", "visible_portal": true, "alias_portal": " "}'),
    '22023', 'Para mostrarla en el portal escribe su nombre para el cliente.', 'alias_portal');
  if exists (select 1 from public.fases where flujo_id = a) then raise exception 'G3: una validación escribió'; end if;
  perform pg_temp.fg_pasa('G3 buena', pg_temp.fg_crear(yo, a, '{"nombre": "  FG buena ", "descripcion": "", "icono": "camion-2", "alerta_cada_horas": 720}'));
  if (select to_jsonb(f) - array['id', 'flujo_id', 'orden', 'creado_en', 'actualizado_en'] from public.fases f where flujo_id = a)
     is distinct from jsonb_build_object('nombre', 'FG buena', 'descripcion', null, 'icono', 'camion-2', 'alerta_cada_horas', 720, 'color', '#717c93',
       'es_inicial', false, 'es_final', false, 'activa', true, 'es_logistica', true, 'demora_dias', null, 'nota_obligatoria', false, 'permite_contenedor', true,
       'permite_aduana', false, 'cuenta_llegada_repuestos', false, 'publica_web', false, 'visible_portal', false, 'alias_portal', null, 'descripcion_portal', null) then
    raise exception 'G3: la fase creada no quedó como se pidió: %', (select to_jsonb(f) from public.fases f where flujo_id = a);
  end if;
end $$;
rollback;

-- @test fases: crear con aduana sin su regla da 23514; con la regla pasa; sin logística deja es_logistica apagada (G4)
begin;
do $$
declare
  manual uuid := pg_temp.fg_flujo('manual'); subasta uuid := pg_temp.fg_flujo('subasta');
  rep uuid := (select id from public.flujos where ambito = 'repuestos');
  yo uuid := pg_temp.fg_persona(array['flujos.configurar', 'repuestos.configurar']);
begin
  perform pg_temp.fg_es('G4 aduana manual', pg_temp.fg_crear(yo, manual, '{"nombre": "FG", "permite_aduana": true}'),
    '23514', 'La aduana está apagada en este flujo.', 'permite_aduana');
  perform pg_temp.fg_es('G4 aduana repuestos', pg_temp.fg_crear(yo, rep, '{"nombre": "FG", "permite_aduana": true}'),
    '23514', 'La aduana está apagada en este flujo.', 'permite_aduana');
  perform pg_temp.fg_pasa('G4 aduana subasta', pg_temp.fg_crear(yo, subasta, '{"nombre": "FG", "permite_aduana": true}'));
  update public.flujos_reglas set activa = false where flujo_id = manual and regla in ('logistica', 'vitrina_web');
  perform pg_temp.fg_es('G4 logística apagada', pg_temp.fg_crear(yo, manual, '{"nombre": "FG", "es_logistica": true}'),
    '23514', 'La logística está apagada en este flujo.', 'es_logistica');
  perform pg_temp.fg_es('G4 vitrina apagada', pg_temp.fg_crear(yo, manual, '{"nombre": "FG", "publica_web": true}'),
    '23514', 'La vitrina web está apagada en este flujo.', 'publica_web');
  perform pg_temp.fg_pasa('G4 sin es_logistica', pg_temp.fg_crear(yo, manual, '{"nombre": "FG sin logística"}'));
  if (select es_logistica from public.fases where flujo_id = manual and nombre = 'FG sin logística') then
    raise exception 'G4: sin la regla, crear debía dejar es_logistica apagada';
  end if;
end $$;
rollback;

-- @test fases: crear con un nombre repetido en el flujo o una segunda llegada de repuestos da 23505 humano (G5)
begin;
do $$
declare a uuid := pg_temp.fg_flujo('manual'); b uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']);
begin
  perform pg_temp.fg_pasa('G5 uno', pg_temp.fg_crear(yo, a, '{"nombre": "FG uno", "cuenta_llegada_repuestos": true}'));
  perform pg_temp.fg_es('G5 nombre', pg_temp.fg_crear(yo, a, '{"nombre": " FG uno "}'), '23505', 'Ya hay una fase «FG uno» en este flujo.', 'nombre');
  perform pg_temp.fg_pasa('G5 otro flujo', pg_temp.fg_crear(yo, b, '{"nombre": "FG uno"}'));
  perform pg_temp.fg_es('G5 llegada', pg_temp.fg_crear(yo, a, '{"nombre": "FG dos", "cuenta_llegada_repuestos": true}'),
    '23505', 'Otra fase de este flujo ya cuenta la llegada de repuestos.', 'cuenta_llegada_repuestos');
end $$;
rollback;
