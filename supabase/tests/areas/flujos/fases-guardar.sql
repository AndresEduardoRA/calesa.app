-- Los datos de una fase (paso 5.01-1): lista cerrada, tipos, validaciones, reglas del flujo y únicos, con el campo en `hint`, en `fase_crear` y
-- `fase_guardar`. No depende de otro archivo (`SOLO=humo.sql,areas/flujos/fases-guardar.sql`). Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   G1. Una clave fuera de la lista (también `activa`, `orden`, `flujo_id`) → 22023 con la clave en `hint`.
--   G2. Un tipo que no es el suyo (texto por booleano, decimal o entero enorme por entero, nulo por nombre) → 22023 con la clave en `hint`.
--   G3. Cada validación da su mensaje y su campo; en guardar, sobre la fila mezclada.
--   G4. Las reglas del flujo: aduana sin la regla (origen manual, repuestos) → 23514; con la regla, pasa; sin logística, crear deja `es_logistica` apagada.
--   G5. Los únicos con mensaje humano: nombre repetido en el flujo y dos fases que cuentan la llegada de repuestos.
--   V7. `authenticated` no escribe directo `fases` ni `flujos` (42501) y las policies de escritura ya no existen.

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
  foreach c in array array['{"nombre": "FG", "es_final": "si"}', '{"nombre": "FG", "demora_dias": 1.5}', '{"nombre": "FG", "demora_dias": 1e12}', '{"nombre": "FG", "demora_dias": 1.0}',
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

create or replace function pg_temp.fg_fase(p_flujo uuid, p_nombre text) returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre) values (p_flujo, p_nombre) returning id;
$f$;

-- @test fases: guardar con una clave fuera de la lista, un tipo ajeno o nada que guardar da 22023 con la clave en hint (G1, G2)
begin;
do $$
declare a uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']); f uuid := pg_temp.fg_fase(a, 'FG'); k text;
begin
  foreach k in array array['activa', 'orden', 'flujo_id', 'xyz'] loop
    perform pg_temp.fg_es('G1 guardar ' || k, pg_temp.fg_guardar(yo, f, jsonb_build_object(k, 1)), '22023', format('El dato «%s» no se cambia desde una fase.', k), k);
  end loop;
  perform pg_temp.fg_es('G1 guardar vacío', pg_temp.fg_guardar(yo, f, '{}'), '22023', 'No hay cambios para guardar.', null);
  perform pg_temp.fg_es('G2 guardar booleano', pg_temp.fg_guardar(yo, f, '{"publica_web": "si"}'), '22023', 'El dato «publica_web» no tiene el formato esperado.', 'publica_web');
  perform pg_temp.fg_es('G2 guardar entero', pg_temp.fg_guardar(yo, f, '{"alerta_cada_horas": 2.5}'), '22023', 'El dato «alerta_cada_horas» no tiene el formato esperado.', 'alerta_cada_horas');
  perform pg_temp.fg_es('G2 guardar nombre nulo', pg_temp.fg_guardar(yo, f, '{"nombre": null}'), '22023', 'El dato «nombre» no tiene el formato esperado.', 'nombre');
end $$;
rollback;

-- @test fases: guardar valida la fila mezclada; un tope nuevo no impide guardar otro campo de una fase vieja (G3)
begin;
do $$
declare a uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']); f uuid := pg_temp.fg_fase(a, 'FG');
begin
  perform pg_temp.fg_pasa('G3 portal', pg_temp.fg_guardar(yo, f, '{"visible_portal": true, "alias_portal": "En camino"}'));
  perform pg_temp.fg_es('G3 quitar el alias', pg_temp.fg_guardar(yo, f, '{"alias_portal": null}'),
    '22023', 'Para mostrarla en el portal escribe su nombre para el cliente.', 'alias_portal');
  perform pg_temp.fg_pasa('G3 inicial', pg_temp.fg_guardar(yo, f, '{"es_inicial": true}'));
  perform pg_temp.fg_es('G3 final sobre inicial', pg_temp.fg_guardar(yo, f, '{"es_final": true}'), '22023', 'Una fase no puede ser inicial y final a la vez.', 'es_final');
  perform pg_temp.fg_es('G3 nombre vacío', pg_temp.fg_guardar(yo, f, '{"nombre": ""}'), '22023', 'La fase necesita un nombre.', 'nombre');
  update public.fases set nombre = repeat('v', 80), icono = 'Viejo Icono' where id = f;
  perform pg_temp.fg_pasa('G3 fase vieja', pg_temp.fg_guardar(yo, f, '{"color": "#000000"}'));
  perform pg_temp.fg_es('G3 nombre largo', pg_temp.fg_guardar(yo, f, jsonb_build_object('nombre', repeat('n', 61))),
    '22023', 'El nombre de la fase tiene hasta 60 caracteres.', 'nombre');
  if (select color from public.fases where id = f) <> '#000000' or not (select visible_portal and alias_portal = 'En camino' and es_inicial from public.fases where id = f) then
    raise exception 'G3: guardar no dejó la fila esperada: %', (select to_jsonb(x) from public.fases x where id = f);
  end if;
end $$;
rollback;

-- @test fases: guardar con aduana sin su regla da 23514 y con la regla pasa (G4)
begin;
do $$
declare
  manual uuid := pg_temp.fg_flujo('manual'); subasta uuid := pg_temp.fg_flujo('subasta'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']);
  fm uuid := pg_temp.fg_fase(manual, 'FG'); fs uuid := pg_temp.fg_fase(subasta, 'FG');
begin
  perform pg_temp.fg_es('G4 guardar aduana manual', pg_temp.fg_guardar(yo, fm, '{"permite_aduana": true}'), '23514', 'La aduana está apagada en este flujo.', 'permite_aduana');
  perform pg_temp.fg_pasa('G4 guardar aduana subasta', pg_temp.fg_guardar(yo, fs, '{"permite_aduana": true}'));
  if not (select permite_aduana from public.fases where id = fs) or (select permite_aduana from public.fases where id = fm) then
    raise exception 'G4: aduana quedó mal';
  end if;
end $$;
rollback;

-- @test fases: guardar un nombre repetido o una segunda llegada de repuestos da 23505 humano (G5)
begin;
do $$
declare
  a uuid := pg_temp.fg_flujo('manual'); yo uuid := pg_temp.fg_persona(array['flujos.configurar']);
  f1 uuid := pg_temp.fg_fase(a, 'FG uno'); f2 uuid := pg_temp.fg_fase(a, 'FG dos');
begin
  perform pg_temp.fg_es('G5 guardar nombre', pg_temp.fg_guardar(yo, f2, '{"nombre": "FG uno"}'), '23505', 'Ya hay una fase «FG uno» en este flujo.', 'nombre');
  perform pg_temp.fg_pasa('G5 guardar llegada', pg_temp.fg_guardar(yo, f1, '{"cuenta_llegada_repuestos": true}'));
  perform pg_temp.fg_es('G5 guardar segunda llegada', pg_temp.fg_guardar(yo, f2, '{"cuenta_llegada_repuestos": true}'),
    '23505', 'Otra fase de este flujo ya cuenta la llegada de repuestos.', 'cuenta_llegada_repuestos');
end $$;
rollback;

-- @test fases: authenticated no escribe directo fases ni flujos (42501) y las policies de escritura ya no existen (V7)
begin;
do $$
declare
  a uuid := pg_temp.fg_flujo('manual'); config_a uuid := pg_temp.fg_persona(array['flujos.configurar']); fa uuid := pg_temp.fg_fase(a, 'FG en A'); r jsonb;
begin
  r := pg_temp.fg_corre(config_a, format('insert into public.fases (flujo_id, nombre) values (%L, ''FG directa'')', a));
  if r ->> 'error' is distinct from '42501' then raise exception 'V7: el insert directo en fases debía dar 42501 y dio %', r; end if;
  r := pg_temp.fg_corre(config_a, format('update public.fases set nombre = ''FG directa'' where id = %L', fa));
  if r ->> 'error' is distinct from '42501' then raise exception 'V7: el update directo de fases debía dar 42501 y dio %', r; end if;
  r := pg_temp.fg_corre(config_a, format('update public.flujos set nombre = ''FG directa'' where id = %L', a));
  if r ->> 'error' is distinct from '42501' then raise exception 'V7: el update directo de flujos debía dar 42501 y dio %', r; end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and policyname in ('fases: crear', 'fases: editar', 'flujos: editar')) then
    raise exception 'V7: quedó una policy de escritura de fases o flujos';
  end if;
  if (select nombre from public.fases where id = fa) <> 'FG en A' then raise exception 'V7: una escritura directa cambió la fase'; end if;
end $$;
rollback;
