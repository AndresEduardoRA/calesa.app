-- «Revisar» un flujo (paso 5.12-1): `revisar_flujo(p_flujo)` sólo responde a quien configura ese flujo y suma `rol_sin_personas`,
-- `entrada_no_automatica`, `tipo_documento_inactivo` y `salida_a_jubilada` a los ocho códigos de antes. No depende de otro archivo
-- (`SOLO=humo.sql,flujos-revisar.sql`). Cada bloque abre su transacción y la revierte. Se compara el conjunto exacto de
-- `codigo:fase_id` del flujo, nunca el texto.
--
-- Qué asegura:
--   R1. Quien no configura (asesor, otro origen, `repuestos.configurar` en vehículos) recibe cero filas, sin error; inexistente y nulo,
--       cero filas; quien configura, filas. anon no la ejecuta.
--   R2. Una fase sin salida y una espera mutua con repuestos dan exactamente `sin_salida` y `espera_cruzada` en esas fases.
--   R3. `rol_sin_personas` por fase y por transición: aparece sólo si ningún rol de la lista tiene una persona activa.
--   R4. `entrada_no_automatica`: dos iniciales (fase nula), o la única inicial con nota, rol o requisito bloqueante; nunca en repuestos.
--   R5. `tipo_documento_inactivo`: un requisito pide un tipo desactivado.
--   R6. `salida_a_jubilada`: una salida hacia una fase jubilada, sin `sin_salida` ni `inalcanzable` de más.
--   R7. Los códigos de antes siguen: `sin_inicial`, `orden_duplicado`, `inalcanzable`.

-- Una persona activa con un rol propio y estas concesiones: 'clave' (global) o 'clave@<origen>'.
create or replace function pg_temp.frv_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('frv_' || substr(v_id::text, 1, 8), 'FRV ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid);
  end loop;
  return v_id;
end $f$;

create or replace function pg_temp.frv_asesor() returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) select v_id, id, true from public.roles where clave = 'asesor';
  return v_id;
end $f$;

-- Un rol sin ninguna persona.
create or replace function pg_temp.frv_rol_vacio() returns uuid language sql as $f$
  insert into public.roles (clave, nombre)
  select 'frv_v_' || s, 'FRV vacío ' || s from (select substr(replace(gen_random_uuid()::text, '-', ''), 1, 8) s) x
  returning id;
$f$;

-- Un origen manual nuevo: su flujo de vehículos nace sin fases y con «esperas» encendida.
create or replace function pg_temp.frv_flujo_vacio() returns uuid language plpgsql as $f$
declare o uuid; s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  insert into public.origenes (clave, nombre, tipo) values ('frv_' || s, 'FRV origen ' || s, 'manual') returning id into o;
  return (select id from public.flujos where origen_id = o);
end $f$;

create or replace function pg_temp.frv_fase(p_flujo uuid, p_nombre text, p_orden int, p_inicial boolean default false, p_final boolean default false)
returns uuid language sql as $f$
  insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final) values (p_flujo, p_nombre, p_orden, p_inicial, p_final) returning id;
$f$;

create or replace function pg_temp.frv_fase_id(p_flujo uuid, p_nombre text) returns uuid language sql as $f$
  select id from public.fases where flujo_id = p_flujo and nombre = p_nombre;
$f$;

create or replace function pg_temp.frv_salida(p_de uuid, p_a uuid) returns uuid language sql as $f$
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id) select flujo_id, p_de, p_a from public.fases where id = p_de returning id;
$f$;

-- El flujo base: I (inicial) → A → F (final) e I → B; con `con_salida_de_b`, también B → F (todo conectado: no da avisos).
create or replace function pg_temp.frv_flujo(p_con_salida_de_b boolean default true) returns uuid language plpgsql as $f$
declare fl uuid := pg_temp.frv_flujo_vacio(); i uuid; a uuid; b uuid; f uuid;
begin
  i := pg_temp.frv_fase(fl, 'I', 10, true, false);
  a := pg_temp.frv_fase(fl, 'A', 20);
  b := pg_temp.frv_fase(fl, 'B', 30);
  f := pg_temp.frv_fase(fl, 'F', 40, false, true);
  perform pg_temp.frv_salida(i, a);
  perform pg_temp.frv_salida(a, f);
  perform pg_temp.frv_salida(i, b);
  if p_con_salida_de_b then perform pg_temp.frv_salida(b, f); end if;
  return fl;
end $f$;

-- Los avisos que recibe una persona, como `codigo:fase_id` ordenados. Un error de la llamada hace caer el bloque.
create or replace function pg_temp.frv_avisos(p_quien uuid, p_flujo uuid) returns text[] language plpgsql as $f$
declare v text[];
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  execute $q$select coalesce(array_agg(r.codigo || ':' || coalesce(r.fase_id::text, '-') order by r.codigo || ':' || coalesce(r.fase_id::text, '-') collate "C"), '{}')
             from public.revisar_flujo($1) r$q$ into v using p_flujo;
  reset role;
  return v;
end $f$;

-- El conjunto esperado, ordenado igual que `frv_avisos`.
create or replace function pg_temp.frv_esperado(variadic p text[]) returns text[] language sql as $f$
  select coalesce(array_agg(x order by x collate "C"), '{}') from unnest(p) x;
$f$;

create or replace function pg_temp.frv_es(p_que text, p_dio text[], p_esperado text[]) returns void language plpgsql as $f$
begin
  if p_dio is distinct from p_esperado then raise exception '%: debía dar % y dio %', p_que, p_esperado, p_dio; end if;
end $f$;

-- @test revisar: quien no configura no recibe filas; inexistente y nulo tampoco; quien configura sí (R1)
begin;
do $$
declare
  a uuid := pg_temp.frv_flujo_vacio(); b uuid := pg_temp.frv_flujo_vacio();
  config_a uuid := pg_temp.frv_persona(array['flujos.configurar@' || (select origen_id from public.flujos where id = a)]);
  config_b uuid := pg_temp.frv_persona(array['flujos.configurar@' || (select origen_id from public.flujos where id = b)]);
  config_rep uuid := pg_temp.frv_persona(array['repuestos.configurar']);
  asesor uuid := pg_temp.frv_asesor();
begin
  perform pg_temp.frv_es('R1 asesor', pg_temp.frv_avisos(asesor, a), '{}');
  perform pg_temp.frv_es('R1 otro origen', pg_temp.frv_avisos(config_b, a), '{}');
  perform pg_temp.frv_es('R1 repuestos en vehículos', pg_temp.frv_avisos(config_rep, a), '{}');
  perform pg_temp.frv_es('R1 inexistente', pg_temp.frv_avisos(config_a, gen_random_uuid()), '{}');
  perform pg_temp.frv_es('R1 nulo', pg_temp.frv_avisos(config_a, null), '{}');
  perform pg_temp.frv_es('R1 quien configura', pg_temp.frv_avisos(config_a, a), pg_temp.frv_esperado('sin_inicial:-'));
  if has_function_privilege('anon', 'public.revisar_flujo(uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.revisar_flujo(uuid)', 'execute') then
    raise exception 'R1: anon ejecuta revisar_flujo o authenticated no';
  end if;
end $$;
rollback;

-- @test revisar: una fase sin salida y una espera mutua con repuestos dan exactamente sin_salida y espera_cruzada (R2)
begin;
do $$
declare
  fl uuid := pg_temp.frv_flujo(false); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config uuid := pg_temp.frv_persona(array['flujos.configurar']);
  a uuid := pg_temp.frv_fase_id(fl, 'A'); b uuid := pg_temp.frv_fase_id(fl, 'B'); r uuid := pg_temp.frv_fase(rep, 'FRV de repuestos', 1000);
begin
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, espera_fase_id, espera_ambito) values (a, 'espera', true, r, 'hijos');
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, espera_fase_id, espera_ambito) values (r, 'espera', true, a, 'padre');
  perform pg_temp.frv_es('R2', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('espera_cruzada:' || a, 'sin_salida:' || b));
end $$;
rollback;

-- @test revisar: rol_sin_personas por fase y por transición, sólo si ningún rol de la lista tiene una persona activa (R3)
begin;
do $$
declare
  fl uuid := pg_temp.frv_flujo(); config uuid := pg_temp.frv_persona(array['flujos.configurar']);
  a uuid := pg_temp.frv_fase_id(fl, 'A'); f uuid := pg_temp.frv_fase_id(fl, 'F');
  rv uuid := pg_temp.frv_rol_vacio(); rv2 uuid := pg_temp.frv_rol_vacio(); p uuid := pg_temp.frv_persona(array[]::text[]);
begin
  perform pg_temp.frv_es('R3 base', pg_temp.frv_avisos(config, fl), '{}');
  insert into public.fases_roles (fase_id, rol_id) values (f, rv);
  perform pg_temp.frv_es('R3 fase con rol vacío', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('rol_sin_personas:' || f));
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (p, rv, false);
  perform pg_temp.frv_es('R3 el rol ya tiene persona', pg_temp.frv_avisos(config, fl), '{}');
  update public.perfiles set activo = false where id = p;
  perform pg_temp.frv_es('R3 la persona ya no está activa', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('rol_sin_personas:' || f));
  update public.perfiles set activo = true, bloqueado = true where id = p;
  perform pg_temp.frv_es('R3 la persona está bloqueada', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('rol_sin_personas:' || f));
  update public.perfiles set bloqueado = false where id = p;
  insert into public.fases_roles (fase_id, rol_id) values (f, rv2);
  perform pg_temp.frv_es('R3 un rol vacío junto a uno con gente', pg_temp.frv_avisos(config, fl), '{}');
  insert into public.fases_transiciones_roles (transicion_id, rol_id)
  select t.id, rv2 from public.fases_transiciones t where t.de_fase_id = a and t.a_fase_id = f;
  perform pg_temp.frv_es('R3 salida con rol vacío', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('rol_sin_personas:' || a));
end $$;
rollback;

-- @test revisar: entrada_no_automatica con dos iniciales o con la única que pide nota, rol o requisito bloqueante; nunca en repuestos (R4)
begin;
do $$
declare
  fl uuid := pg_temp.frv_flujo(); rep uuid := (select id from public.flujos where ambito = 'repuestos');
  config uuid := pg_temp.frv_persona(array['flujos.configurar', 'repuestos.configurar']);
  i uuid := pg_temp.frv_fase_id(fl, 'I'); a uuid := pg_temp.frv_fase_id(fl, 'A'); i2 uuid; td uuid; r1 uuid; v text[];
  -- Su rol propio (en una base sin cuentas, la primera también recibe «dueno»).
  con_gente uuid := (select ur.rol_id from public.usuarios_roles ur join public.roles r on r.id = ur.rol_id where ur.usuario_id = config and r.clave like 'frv\_%');
begin
  i2 := pg_temp.frv_fase(fl, 'I2', 50, true, false);
  perform pg_temp.frv_salida(i2, a);
  perform pg_temp.frv_es('R4 dos iniciales', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('entrada_no_automatica:-'));
  update public.fases set activa = false where id = i2;
  perform pg_temp.frv_es('R4 una inicial sin pedidos', pg_temp.frv_avisos(config, fl), '{}');
  update public.fases set nota_obligatoria = true where id = i;
  perform pg_temp.frv_es('R4 la inicial pide nota', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('entrada_no_automatica:' || i));
  update public.fases set nota_obligatoria = false where id = i;
  insert into public.fases_roles (fase_id, rol_id) values (i, con_gente);
  perform pg_temp.frv_es('R4 la inicial pide un rol', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('entrada_no_automatica:' || i));
  delete from public.fases_roles where fase_id = i;
  insert into public.tipos_documento (nombre) values ('FRV tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id into td;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) values (i, 'documento', true, td);
  perform pg_temp.frv_es('R4 la inicial pide un requisito bloqueante', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('entrada_no_automatica:' || i));
  -- El flujo de repuestos es uno y compartido (trae sus fases de la siembra): sólo se afirma que no aparece el código.
  -- Que «FRV inicial 1» (sin salida) aparezca asegura que la llamada sí respondió.
  r1 := pg_temp.frv_fase(rep, 'FRV inicial 1', 1001, true, false);
  perform pg_temp.frv_fase(rep, 'FRV inicial 2', 1002, true, false);
  if (select count(*) from public.fases where flujo_id = rep and es_inicial and activa) < 2 then raise exception 'R4: repuestos debía tener dos iniciales'; end if;
  v := pg_temp.frv_avisos(config, rep);
  if not ('sin_salida:' || r1) = any (v) then raise exception 'R4: repuestos debía responder (sin_salida de FRV inicial 1) y dio %', v; end if;
  if exists (select 1 from unnest(v) x where x like 'entrada_no_automatica:%') then
    raise exception 'R4: repuestos no debía dar entrada_no_automatica';
  end if;
end $$;
rollback;

-- @test revisar: tipo_documento_inactivo cuando un requisito pide un tipo desactivado (R5)
begin;
do $$
declare
  fl uuid := pg_temp.frv_flujo(); config uuid := pg_temp.frv_persona(array['flujos.configurar']);
  f uuid := pg_temp.frv_fase_id(fl, 'F'); td uuid;
begin
  insert into public.tipos_documento (nombre) values ('FRV tipo ' || substr(gen_random_uuid()::text, 1, 8)) returning id into td;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id) values (f, 'documento', true, td);
  perform pg_temp.frv_es('R5 tipo activo', pg_temp.frv_avisos(config, fl), '{}');
  update public.tipos_documento set activo = false where id = td;
  perform pg_temp.frv_es('R5 tipo desactivado', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('tipo_documento_inactivo:' || f));
  update public.tipos_documento set activo = true where id = td;
  perform pg_temp.frv_es('R5 tipo reactivado', pg_temp.frv_avisos(config, fl), '{}');
end $$;
rollback;

-- @test revisar: salida_a_jubilada sin sin_salida ni inalcanzable de más, también si es la única salida (R6, D4)
begin;
do $$
declare
  fl uuid := pg_temp.frv_flujo(false); config uuid := pg_temp.frv_persona(array['flujos.configurar']);
  b uuid := pg_temp.frv_fase_id(fl, 'B'); f uuid := pg_temp.frv_fase_id(fl, 'F'); j uuid := pg_temp.frv_fase(fl, 'J', 50);
begin
  -- La única salida de B va a J.
  perform pg_temp.frv_salida(b, j);
  perform pg_temp.frv_salida(j, f);
  perform pg_temp.frv_es('R6 J activa', pg_temp.frv_avisos(config, fl), '{}');
  update public.fases set activa = false where id = j;
  perform pg_temp.frv_es('R6 J jubilada', pg_temp.frv_avisos(config, fl), pg_temp.frv_esperado('salida_a_jubilada:' || b));
end $$;
rollback;

-- @test revisar: los códigos de antes siguen (sin_inicial, orden_duplicado, inalcanzable) (R7)
begin;
do $$
declare
  vacio uuid := pg_temp.frv_flujo_vacio(); fl uuid := pg_temp.frv_flujo(); config uuid := pg_temp.frv_persona(array['flujos.configurar']);
  i uuid := pg_temp.frv_fase_id(fl, 'I'); a uuid := pg_temp.frv_fase_id(fl, 'A'); f uuid := pg_temp.frv_fase_id(fl, 'F'); x uuid; y uuid;
begin
  perform pg_temp.frv_es('R7 sin fases', pg_temp.frv_avisos(config, vacio), pg_temp.frv_esperado('sin_inicial:-'));
  x := pg_temp.frv_fase(fl, 'X', 20);
  perform pg_temp.frv_salida(i, x);
  perform pg_temp.frv_salida(x, f);
  y := pg_temp.frv_fase(fl, 'Y', 60);
  perform pg_temp.frv_salida(y, f);
  perform pg_temp.frv_es('R7 orden repetido e inalcanzable', pg_temp.frv_avisos(config, fl),
    pg_temp.frv_esperado('orden_duplicado:' || a, 'inalcanzable:' || y));
end $$;
rollback;
