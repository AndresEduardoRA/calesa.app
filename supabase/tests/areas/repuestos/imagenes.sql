-- Las imágenes de un ítem de repuestos (paso 8.09-3, C0–C4). No depende de otro archivo (`SOLO=areas/repuestos/imagenes.sql`); cada bloque abre su
-- transacción y la revierte.
--
-- Qué asegura:
--   I1. Un ítem lleva hasta 8 imágenes (la base lo impone): la novena da 23514 hint `imagenes`; `orden` lo pone la base (0 a 7); quitar una deja entrar otra.
--   I2. Sólo imágenes del ítem y que ya subieron: ruta de otro ítem, sin patrón o `.png`, un objeto que no está en Storage, un ítem eliminado y un
--       proyecto cerrado dan 23514 con su hint; repetir la misma ruta da 23505.
--   I3. Sin UPDATE directo (42501); sin `repuestos.editar` no se crea ni se borra; con sólo `repuestos.ver` se lee; sin él, no.
--   I4. Borrar una imagen encola su objeto para limpiar; volver a insertarla la rescata; si otra fila usa la ruta, no se encola.

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

create or replace function pg_temp.rp_origen() returns uuid language plpgsql as $f$
declare s text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8); o uuid;
begin
  insert into public.origenes (clave, nombre, tipo) values ('rp_' || s, 'rp origen ' || s, 'manual') returning id into o;
  return o;
end $f$;

create or replace function pg_temp.rp_vehiculo(p_origen uuid) returns uuid language sql as $f$
  insert into public.vehiculos (origen_id, titulo) values (p_origen, 'rp vehículo') returning id;
$f$;

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

create or replace function pg_temp.rp_crear(p_quien uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', p_id, p_datos));
$f$;


create or replace function pg_temp.rp_flujo() returns uuid language sql as $f$
  select id from public.flujos where ambito = 'repuestos';
$f$;

-- Deja una sola inicial activa en el flujo de repuestos («rp inicial») y la devuelve.
create or replace function pg_temp.rp_inicial() returns uuid language plpgsql as $f$
declare f uuid;
begin
  update public.fases set es_inicial = false where flujo_id = pg_temp.rp_flujo() and es_inicial;
  insert into public.fases (flujo_id, nombre, orden, es_inicial) values (pg_temp.rp_flujo(), 'rp inicial', 1001, true) returning id into f;
  return f;
end $f$;

create or replace function pg_temp.rp_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rp_ok('proyecto', pg_temp.rp_crear(p_quien, i, '{"vehiculo_etiqueta": "rp"}'));
  return i;
end $f$;

create or replace function pg_temp.rp_item(p_quien uuid, p_proyecto uuid, p_id uuid, p_datos jsonb) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_item_crear(%L, %L, %L)', p_id, p_proyecto, p_datos));
$f$;

create or replace function pg_temp.rp_borrar(p_quien uuid, p_item uuid, p_esperado timestamptz) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('select public.repuesto_item_eliminar(%L, %L)', p_item, p_esperado));
$f$;

-- Siembra el objeto de una imagen en Storage (la base exige que ya haya subido) y devuelve su ruta.
create or replace function pg_temp.rp_ruta(p_item uuid, p_letra text) returns text language plpgsql as $f$
declare v_ruta text := p_item::text || '/' || repeat(p_letra, 64) || '.webp';
begin
  insert into storage.objects (bucket_id, name) values ('repuestos', v_ruta) on conflict do nothing;
  return v_ruta;
end $f$;

create or replace function pg_temp.rp_imagen(p_quien uuid, p_item uuid, p_ruta text) returns jsonb language sql as $f$
  select pg_temp.rp_corre(p_quien, format('with n as (insert into public.repuestos_items_imagenes (item_id, ruta) values (%L, %L) returning orden) select to_jsonb(orden) from n', p_item, p_ruta));
$f$;

-- @test repuestos: un ítem lleva hasta 8 imágenes y la base pone el orden (I1)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); l text; n int := 0; r jsonb;
begin
  perform pg_temp.rp_ok('I1 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "x"}'));
  foreach l in array array['a', 'b', 'c', 'd', 'e', 'f', '0', '1'] loop
    r := pg_temp.rp_ok('I1 imagen ' || l, pg_temp.rp_imagen(ed, i, pg_temp.rp_ruta(i, l)));
    if r <> to_jsonb(n) then raise exception 'I1: la imagen % debía tener orden %, y dio %', n + 1, n, r; end if;
    n := n + 1;
  end loop;
  if (select count(*) from public.repuestos_items_imagenes where item_id = i) <> 8 then raise exception 'I1: debían ser 8'; end if;
  perform pg_temp.rp_es('I1 novena', pg_temp.rp_imagen(ed, i, pg_temp.rp_ruta(i, '9')), '23514', 'imagenes', 'Un ítem lleva hasta 8 imágenes.');
  -- Quitar una deja lugar; el orden sigue al máximo.
  perform pg_temp.rp_ok('I1 quitar', pg_temp.rp_corre(ed, format('with d as (delete from public.repuestos_items_imagenes where item_id = %L and orden = 3 returning 1) select to_jsonb(count(*)) from d', i)));
  r := pg_temp.rp_ok('I1 otra tras quitar', pg_temp.rp_imagen(ed, i, pg_temp.rp_ruta(i, '9')));
  if r <> '8'::jsonb then raise exception 'I1: tras quitar, la nueva debía ir con orden 8 y dio %', r; end if;
end $$;
rollback;

-- @test repuestos: sólo imágenes del ítem, que ya subieron; sin ítem vivo ni proyecto abierto no entran (I2)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); j uuid := gen_random_uuid(); ruta text; v timestamptz;
begin
  perform pg_temp.rp_ok('I2 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "x"}'));
  perform pg_temp.rp_ok('I2 otro ítem', pg_temp.rp_item(ed, p, j, '{"descripcion": "y"}'));
  -- Ruta de otro ítem, sin el patrón, con extensión que no es.
  perform pg_temp.rp_es('I2 de otro ítem', pg_temp.rp_imagen(ed, i, pg_temp.rp_ruta(j, 'a')), '23514', 'ruta');
  insert into storage.objects (bucket_id, name) values ('repuestos', i::text || '/foto.webp'), ('repuestos', i::text || '/' || repeat('a', 64) || '.png');
  perform pg_temp.rp_es('I2 sin patrón', pg_temp.rp_imagen(ed, i, i::text || '/foto.webp'), '23514', 'ruta');
  perform pg_temp.rp_es('I2 png', pg_temp.rp_imagen(ed, i, i::text || '/' || repeat('a', 64) || '.png'), '23514', 'ruta');
  -- Un objeto que no subió.
  perform pg_temp.rp_es('I2 sin objeto', pg_temp.rp_imagen(ed, i, i::text || '/' || repeat('c', 64) || '.webp'), '23514', 'ruta', 'La imagen no terminó de subir. Vuelve a intentarlo.');
  -- La misma ruta dos veces.
  ruta := pg_temp.rp_ruta(i, 'b');
  perform pg_temp.rp_ok('I2 una vez', pg_temp.rp_imagen(ed, i, ruta));
  perform pg_temp.rp_es('I2 repetida', pg_temp.rp_imagen(ed, i, ruta), '23505', null);
  -- Un proyecto cerrado.
  select actualizado_en into v from public.repuestos_proyectos where id = p;
  perform pg_temp.rp_ok('I2 cerrar', pg_temp.rp_corre(ed, format('select public.repuesto_proyecto_cerrar(%L, %L)', p, v)));
  perform pg_temp.rp_es('I2 cerrado', pg_temp.rp_imagen(ed, i, pg_temp.rp_ruta(i, 'd')), '23514', 'proyecto');
  update public.repuestos_proyectos set cerrado_en = null where id = p;
  -- Un ítem eliminado.
  update public.repuestos_items set eliminado_en = now() where id = i;
  perform pg_temp.rp_es('I2 eliminado', pg_temp.rp_imagen(ed, i, pg_temp.rp_ruta(i, 'e')), '23514', 'item');
end $$;
rollback;

-- @test repuestos: sin UPDATE directo; sin repuestos.editar no se crea ni se borra; sin repuestos.ver no se lee (I3)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  ve uuid := pg_temp.rp_persona(array['repuestos.ver']);
  nadie uuid := pg_temp.rp_persona(array['vehiculos.ver']);
  p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); ruta text;
begin
  perform pg_temp.rp_ok('I3 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "x"}'));
  ruta := pg_temp.rp_ruta(i, 'a');
  perform pg_temp.rp_ok('I3 imagen', pg_temp.rp_imagen(ed, i, ruta));
  -- UPDATE: ni de la ruta ni del ítem.
  perform pg_temp.rp_es('I3 update ruta', pg_temp.rp_corre(ed, format('update public.repuestos_items_imagenes set ruta = %L where item_id = %L returning to_jsonb(1)', i::text || '/otra.webp', i)), '42501', null);
  perform pg_temp.rp_es('I3 update ítem', pg_temp.rp_corre(ed, format('update public.repuestos_items_imagenes set item_id = %L where item_id = %L returning to_jsonb(1)', gen_random_uuid(), i)), '42501', null);
  -- Sin editar: no crea (42501) y no borra (0 filas).
  perform pg_temp.rp_es('I3 sin editar crea', pg_temp.rp_imagen(ve, i, pg_temp.rp_ruta(i, 'b')), '42501', null);
  if pg_temp.rp_corre(ve, format('with d as (delete from public.repuestos_items_imagenes where item_id = %L returning 1) select to_jsonb(count(*)) from d', i)) <> '0'::jsonb then
    raise exception 'I3: sin repuestos.editar se borró una imagen';
  end if;
  -- Leer.
  if pg_temp.rp_corre(ve, format('select to_jsonb(count(*)) from public.repuestos_items_imagenes where item_id = %L', i)) <> '1'::jsonb then
    raise exception 'I3: con repuestos.ver debía leer la imagen';
  end if;
  if pg_temp.rp_corre(nadie, format('select to_jsonb(count(*)) from public.repuestos_items_imagenes where item_id = %L', i)) <> '0'::jsonb then
    raise exception 'I3: sin repuestos.ver se leyó una imagen';
  end if;
end $$;
rollback;

-- @test repuestos: borrar una imagen encola su objeto, volver a insertarla lo rescata, y con otra fila que la use no se encola (I4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); v_ruta text;
begin
  perform pg_temp.rp_ok('I4 ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "x"}'));
  v_ruta := pg_temp.rp_ruta(i, 'a');
  perform pg_temp.rp_ok('I4 imagen', pg_temp.rp_imagen(ed, i, v_ruta));
  if exists (select 1 from public.cola_gc_storage where bucket = 'repuestos' and cola_gc_storage.ruta = v_ruta) then raise exception 'I4: una imagen viva no se encola'; end if;
  perform pg_temp.rp_ok('I4 borrar', pg_temp.rp_corre(ed, format('with d as (delete from public.repuestos_items_imagenes where item_id = %L returning 1) select to_jsonb(count(*)) from d', i)));
  if not exists (select 1 from public.cola_gc_storage where bucket = 'repuestos' and cola_gc_storage.ruta = v_ruta and reclamado_en is null) then
    raise exception 'I4: borrar la imagen debía encolar su objeto';
  end if;
  -- «Deshacer»: la ruta sale de la cola y el refcount vuelve a 1.
  perform pg_temp.rp_ok('I4 deshacer', pg_temp.rp_imagen(ed, i, v_ruta));
  if exists (select 1 from public.cola_gc_storage where bucket = 'repuestos' and cola_gc_storage.ruta = v_ruta) then raise exception 'I4: volver a insertar debía rescatar la ruta de la cola'; end if;
  if public.storage_refcount('repuestos', v_ruta) <> 1 then raise exception 'I4: el refcount debía ser 1'; end if;
  -- Ya reclamada por la limpieza: no se puede rescatar (falla con su mensaje, no entra).
  perform pg_temp.rp_ok('I4 borrar 2', pg_temp.rp_corre(ed, format('with d as (delete from public.repuestos_items_imagenes where item_id = %L returning 1) select to_jsonb(count(*)) from d', i)));
  update public.cola_gc_storage set reclamado_en = now() where bucket = 'repuestos' and cola_gc_storage.ruta = v_ruta;
  if (pg_temp.rp_imagen(ed, i, v_ruta)) ->> 'error' is null then raise exception 'I4: una ruta ya reclamada no debía entrar'; end if;
end $$;
rollback;

-- @test repuestos: si otra fila usa la ruta, borrar una no encola el objeto (I4)
begin;
do $$
declare
  ed uuid := pg_temp.rp_persona(array['repuestos.ver', 'repuestos.editar']);
  p uuid := pg_temp.rp_proyecto(ed); i uuid := gen_random_uuid(); v_ruta text;
begin
  perform pg_temp.rp_ok('I4b ítem', pg_temp.rp_item(ed, p, i, '{"descripcion": "x"}'));
  v_ruta := pg_temp.rp_ruta(i, 'a');
  perform pg_temp.rp_ok('I4b imagen', pg_temp.rp_imagen(ed, i, v_ruta));
  -- Otra referencia a la misma ruta (la tabla de adjuntos de vehículo no aplica: se simula con otra fila del mismo ítem desactivando el índice único).
  drop index public.repuestos_items_imagenes_item_ruta_key;
  alter table public.repuestos_items_imagenes disable trigger user;
  insert into public.repuestos_items_imagenes (item_id, ruta, orden) values (i, v_ruta, 5);
  alter table public.repuestos_items_imagenes enable trigger user;
  delete from public.repuestos_items_imagenes where item_id = i and orden = 5;
  if exists (select 1 from public.cola_gc_storage where bucket = 'repuestos' and cola_gc_storage.ruta = v_ruta) then
    raise exception 'I4: con otra fila que usa la ruta, borrar no debía encolarla';
  end if;
end $$;
rollback;
