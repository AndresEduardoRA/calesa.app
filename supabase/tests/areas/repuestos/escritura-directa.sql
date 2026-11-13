-- Lo que la base frena en las escrituras directas de repuestos: el `update` por columna de un ítem, borrar una imagen y subir a Storage. No depende de
-- otro archivo (`SOLO=areas/repuestos/escritura-directa.sql`); los ayudantes son copia de `imagenes.sql`. Cada bloque abre su transacción y la revierte.
--
-- Qué asegura:
--   D1. Un ítem de un proyecto cerrado no cambia sus datos por `update` directo (23514 hint `proyecto`); reabierto, sí. Un ítem eliminado no cambia
--       (PT409 «Este ítem ya no existe.»), aun con un `update` sin `where` que la policy de leer no filtra; sin `repuestos.ver`, ese `update` no
--       toca nada.
--   D2. Un catálogo que cambia por `update` directo es de su tipo y está activo (22023 con la columna en el hint); el valor desactivado que ya tenía
--       se conserva al editar otra columna; nulo vale.
--   D3. La cantidad no baja de lo que ya entró a stock por `sobrante` (23514 hint `cantidad`), aunque después haya salido; igual o más, sí.
--   D4. Una imagen de un proyecto cerrado (hint `proyecto`) o de un ítem eliminado (hint `item`) no se borra (23514) y sigue ahí;
--       sin `repuestos.ver`, un `delete` sin `where` no borra nada.
--   D5. Storage `repuestos`: se sube sólo a la carpeta de un ítem vivo de un proyecto abierto, con `repuestos.ver` y `repuestos.editar` (42501 en
--       otra carpeta, la raíz, un id que no es ítem, un proyecto cerrado, un ítem eliminado o sin `ver`); nadie borra objetos del bucket desde la app.

create or replace function pg_temp.rpd_sin_duena() returns void language plpgsql as $f$
begin
  if not exists (select 1 from auth.users) then
    insert into auth.users (id, email, raw_app_meta_data) values (gen_random_uuid(), 'relleno-rp@ejemplo.com', '{"invitado": true}');
  end if;
end $f$;

-- Una persona con un rol propio: cada concesión es `clave` o `clave@origen`.
create or replace function pg_temp.rpd_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  perform pg_temp.rpd_sin_duena();
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('rp_' || substr(v_id::text, 1, 8), 'rp ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, origen_id, alcance)
    values (v_rol, split_part(c, '@', 1), nullif(split_part(c, '@', 2), '')::uuid, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre `p_sql` como `p_quien` (authenticated): el jsonb que devuelve, o `{error, mensaje, hint}`.
create or replace function pg_temp.rpd_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
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

create or replace function pg_temp.rpd_es(p_que text, p_r jsonb, p_estado text, p_hint text, p_mensaje text default null) returns void language plpgsql as $f$
begin
  if p_r ->> 'error' is distinct from p_estado or p_r ->> 'hint' is distinct from p_hint
     or (p_mensaje is not null and p_r ->> 'mensaje' is distinct from p_mensaje) then
    raise exception '%: debía dar % (hint %) «%» y dio %', p_que, p_estado, p_hint, coalesce(p_mensaje, '…'), p_r;
  end if;
end $f$;

create or replace function pg_temp.rpd_ok(p_que text, p_r jsonb) returns jsonb language plpgsql as $f$
begin
  if p_r ? 'error' then raise exception '%: debía pasar y dio %', p_que, p_r; end if;
  return p_r;
end $f$;

create or replace function pg_temp.rpd_proyecto(p_quien uuid) returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rpd_ok('proyecto', pg_temp.rpd_corre(p_quien, format('select public.repuesto_proyecto_crear(%L, %L)', i, '{"vehiculo_etiqueta": "rp"}')));
  return i;
end $f$;

create or replace function pg_temp.rpd_item(p_quien uuid, p_proyecto uuid, p_datos jsonb default '{"descripcion": "x"}') returns uuid language plpgsql as $f$
declare i uuid := gen_random_uuid();
begin
  perform pg_temp.rpd_ok('ítem', pg_temp.rpd_corre(p_quien, format('select public.repuesto_item_crear(%L, %L, %L)', i, p_proyecto, p_datos)));
  return i;
end $f$;

create or replace function pg_temp.rpd_cerrar(p_quien uuid, p_proyecto uuid) returns void language plpgsql as $f$
begin
  perform pg_temp.rpd_ok('cerrar', pg_temp.rpd_corre(p_quien, format('select public.repuesto_proyecto_cerrar(%L, %L)', p_proyecto,
    (select actualizado_en from public.repuestos_proyectos where id = p_proyecto))));
end $f$;

-- Un `update` directo de una columna del ítem, como lo manda la hoja: el número de filas, o el error.
create or replace function pg_temp.rpd_poner(p_quien uuid, p_item uuid, p_columna text, p_valor text) returns jsonb language sql as $f$
  select pg_temp.rpd_corre(p_quien, format('with x as (update public.repuestos_items set %I = %L where id = %L returning 1) select to_jsonb(count(*)) from x',
    p_columna, p_valor, p_item));
$f$;

create or replace function pg_temp.rpd_catalogo(p_catalogo text, p_activo boolean default true) returns uuid language sql as $f$
  insert into public.repuestos_catalogos (catalogo, nombre, activo) values (p_catalogo, 'rp ' || p_catalogo || ' ' || gen_random_uuid(), p_activo) returning id;
$f$;

-- Siembra el objeto de una imagen en Storage (la base exige que ya haya subido) y devuelve su ruta.
create or replace function pg_temp.rpd_ruta(p_item uuid, p_letra text) returns text language plpgsql as $f$
declare v_ruta text := p_item::text || '/' || repeat(p_letra, 64) || '.webp';
begin
  insert into storage.objects (bucket_id, name) values ('repuestos', v_ruta) on conflict do nothing;
  return v_ruta;
end $f$;

create or replace function pg_temp.rpd_imagen(p_quien uuid, p_item uuid, p_ruta text) returns jsonb language sql as $f$
  select pg_temp.rpd_corre(p_quien, format('with n as (insert into public.repuestos_items_imagenes (item_id, ruta) values (%L, %L) returning orden) select to_jsonb(orden) from n', p_item, p_ruta));
$f$;

create or replace function pg_temp.rpd_quitar(p_quien uuid, p_item uuid) returns jsonb language sql as $f$
  select pg_temp.rpd_corre(p_quien, format('with d as (delete from public.repuestos_items_imagenes where item_id = %L returning 1) select to_jsonb(count(*)) from d', p_item));
$f$;

create or replace function pg_temp.rpd_subir(p_quien uuid, p_nombre text) returns jsonb language sql as $f$
  select pg_temp.rpd_corre(p_quien, format('with x as (insert into storage.objects (bucket_id, name) values (%L, %L) returning 1) select to_jsonb(count(*)) from x',
    'repuestos', p_nombre));
$f$;

-- @test repuestos: el update directo de un ítem no cambia uno de un proyecto cerrado ni uno eliminado (D1)
begin;
do $$
declare
  ed uuid := pg_temp.rpd_persona(array['repuestos.ver', 'repuestos.editar']);
  sin_ver uuid := pg_temp.rpd_persona(array['repuestos.editar']);
  p uuid := pg_temp.rpd_proyecto(ed); i uuid; j uuid;
begin
  i := pg_temp.rpd_item(ed, p); j := pg_temp.rpd_item(ed, p);
  perform pg_temp.rpd_cerrar(ed, p);
  perform pg_temp.rpd_es('D1 notas cerrado', pg_temp.rpd_poner(ed, i, 'notas', 'otra'), '23514', 'proyecto',
    'El proyecto está cerrado: reábrelo para cambiar los ítems.');
  perform pg_temp.rpd_es('D1 cantidad cerrado', pg_temp.rpd_poner(ed, i, 'cantidad', '4'), '23514', 'proyecto');
  perform pg_temp.rpd_es('D1 precio cerrado', pg_temp.rpd_poner(ed, i, 'precio_cliente', '10'), '23514', 'proyecto');
  if (select notas is not null or cantidad <> 1 or precio_cliente is not null from public.repuestos_items where id = i) then
    raise exception 'D1: el ítem de un proyecto cerrado cambió';
  end if;
  update public.repuestos_proyectos set cerrado_en = null where id = p;
  if pg_temp.rpd_ok('D1 reabierto', pg_temp.rpd_poner(ed, i, 'notas', 'otra')) <> '1'::jsonb then raise exception 'D1: reabierto debía cambiar una fila'; end if;

  -- Eliminado: un `update` sin `where` (ni `returning` de columnas) no pasa por la policy de leer, que es la que oculta lo eliminado.
  update public.repuestos_items set eliminado_en = now() where id = j;
  perform pg_temp.rpd_es('D1 eliminado', pg_temp.rpd_corre(ed, 'with x as (update public.repuestos_items set notas = ''todas'' returning 1) select to_jsonb(count(*)) from x'),
    'PT409', 'conflicto', 'Este ítem ya no existe.');
  if (select notas from public.repuestos_items where id = j) is not null then raise exception 'D1: el ítem eliminado cambió'; end if;
  -- Sin `repuestos.ver`, el mismo `update` sin `where` no toca nada.
  if pg_temp.rpd_corre(sin_ver, 'with x as (update public.repuestos_items set notas = ''sin ver'' returning 1) select to_jsonb(count(*)) from x') <> '0'::jsonb then
    raise exception 'D1: sin repuestos.ver se cambió un ítem';
  end if;
end $$;
rollback;

-- @test repuestos: un catálogo que cambia por update directo es de su tipo y está activo (D2)
begin;
do $$
declare
  ed uuid := pg_temp.rpd_persona(array['repuestos.ver', 'repuestos.editar']);
  p uuid := pg_temp.rpd_proyecto(ed); i uuid;
  tp uuid := pg_temp.rpd_catalogo('tipo_pieza'); cond uuid := pg_temp.rpd_catalogo('condicion');
  pais_off uuid := pg_temp.rpd_catalogo('pais_origen', false); modo uuid := pg_temp.rpd_catalogo('modo_transporte');
begin
  i := pg_temp.rpd_item(ed, p, jsonb_build_object('descripcion', 'x', 'tipo_pieza_id', tp));
  perform pg_temp.rpd_es('D2 de otro tipo', pg_temp.rpd_poner(ed, i, 'tipo_pieza_id', cond::text), '22023', 'tipo_pieza_id', 'Ese valor ya no está en el catálogo.');
  perform pg_temp.rpd_es('D2 desactivado', pg_temp.rpd_poner(ed, i, 'pais_origen_id', pais_off::text), '22023', 'pais_origen_id');
  perform pg_temp.rpd_es('D2 inexistente', pg_temp.rpd_poner(ed, i, 'condicion_id', gen_random_uuid()::text), '22023', 'condicion_id');
  if (select tipo_pieza_id <> tp or pais_origen_id is not null from public.repuestos_items where id = i) then raise exception 'D2: un rechazo cambió el ítem'; end if;
  perform pg_temp.rpd_ok('D2 de su tipo', pg_temp.rpd_poner(ed, i, 'modo_transporte_id', modo::text));
  perform pg_temp.rpd_ok('D2 condición', pg_temp.rpd_poner(ed, i, 'condicion_id', cond::text));
  -- El que ya tenía se desactiva: editar otra columna lo conserva; quitarlo vale.
  update public.repuestos_catalogos set activo = false where id = tp;
  perform pg_temp.rpd_ok('D2 conserva el desactivado', pg_temp.rpd_poner(ed, i, 'notas', 'n'));
  perform pg_temp.rpd_ok('D2 el mismo desactivado', pg_temp.rpd_poner(ed, i, 'tipo_pieza_id', tp::text));
  perform pg_temp.rpd_ok('D2 nulo', pg_temp.rpd_corre(ed, format('with x as (update public.repuestos_items set tipo_pieza_id = null where id = %L returning 1) select to_jsonb(count(*)) from x', i)));
  if (select tipo_pieza_id is not null or condicion_id <> cond or modo_transporte_id <> modo from public.repuestos_items where id = i) then
    raise exception 'D2: no quedaron los catálogos que se pusieron';
  end if;
end $$;
rollback;

-- @test repuestos: la cantidad no baja de lo que ya entró a stock por sobrante (D3)
begin;
do $$
declare
  ed uuid := pg_temp.rpd_persona(array['repuestos.ver', 'repuestos.editar']);
  p uuid := pg_temp.rpd_proyecto(ed); i uuid;
begin
  i := pg_temp.rpd_item(ed, p, '{"descripcion": "x", "cantidad": 3}');
  perform pg_temp.rpd_ok('D3 sobrante 2', pg_temp.rpd_corre(ed, format('select public.repuesto_stock_mover(%L, 2, %L, 0)', i, 'sobrante')));
  perform pg_temp.rpd_es('D3 bajo lo entrado', pg_temp.rpd_poner(ed, i, 'cantidad', '1'), '23514', 'cantidad',
    'Ya pasaron 2 de este ítem a stock: la cantidad no puede ser menor.');
  perform pg_temp.rpd_ok('D3 igual a lo entrado', pg_temp.rpd_poner(ed, i, 'cantidad', '2'));
  perform pg_temp.rpd_ok('D3 más', pg_temp.rpd_poner(ed, i, 'cantidad', '5'));
  -- Lo que salió después no devuelve el margen: lo entrado sigue siendo 2.
  perform pg_temp.rpd_ok('D3 vender 2', pg_temp.rpd_corre(ed, format('select public.repuesto_stock_mover(%L, 2, %L, 2)', i, 'vendido')));
  perform pg_temp.rpd_es('D3 tras vender', pg_temp.rpd_poner(ed, i, 'cantidad', '1'), '23514', 'cantidad');
  if (select cantidad from public.repuestos_items where id = i) <> 5 then raise exception 'D3: un rechazo cambió la cantidad'; end if;
end $$;
rollback;

-- @test repuestos: una imagen de un proyecto cerrado o de un ítem eliminado no se borra (D4)
begin;
do $$
declare
  ed uuid := pg_temp.rpd_persona(array['repuestos.ver', 'repuestos.editar']);
  sin_ver uuid := pg_temp.rpd_persona(array['repuestos.editar']);
  p uuid := pg_temp.rpd_proyecto(ed); i uuid;
begin
  i := pg_temp.rpd_item(ed, p);
  perform pg_temp.rpd_ok('D4 imagen', pg_temp.rpd_imagen(ed, i, pg_temp.rpd_ruta(i, 'a')));
  perform pg_temp.rpd_cerrar(ed, p);
  perform pg_temp.rpd_es('D4 cerrado', pg_temp.rpd_quitar(ed, i), '23514', 'proyecto', 'El proyecto está cerrado: reábrelo para cambiar las imágenes.');
  update public.repuestos_proyectos set cerrado_en = null where id = p;
  update public.repuestos_items set eliminado_en = now() where id = i;
  perform pg_temp.rpd_es('D4 eliminado', pg_temp.rpd_quitar(ed, i), '23514', 'item', 'Este ítem ya no existe.');
  if (select count(*) from public.repuestos_items_imagenes where item_id = i) <> 1 then raise exception 'D4: la imagen debía seguir'; end if;
  if exists (select 1 from public.cola_gc_storage where bucket = 'repuestos' and ruta like i::text || '/%') then raise exception 'D4: un rechazo encoló el objeto'; end if;
  -- Vivo y abierto, se borra; sin `repuestos.ver`, un `delete` sin `where` no toca nada.
  update public.repuestos_items set eliminado_en = null where id = i;
  if pg_temp.rpd_corre(sin_ver, 'with d as (delete from public.repuestos_items_imagenes returning 1) select to_jsonb(count(*)) from d') <> '0'::jsonb then
    raise exception 'D4: sin repuestos.ver se borró una imagen';
  end if;
  if pg_temp.rpd_ok('D4 abierto', pg_temp.rpd_quitar(ed, i)) <> '1'::jsonb then raise exception 'D4: abierto debía borrar la imagen'; end if;
end $$;
rollback;

-- @test repuestos: Storage sube sólo a la carpeta de un ítem vivo de un proyecto abierto y nadie borra objetos (D5)
begin;
do $$
declare
  ed uuid := pg_temp.rpd_persona(array['repuestos.ver', 'repuestos.editar']);
  sin_ver uuid := pg_temp.rpd_persona(array['repuestos.editar']);
  p uuid := pg_temp.rpd_proyecto(ed); q uuid := pg_temp.rpd_proyecto(ed); i uuid; k uuid; e uuid;
  h text := '/' || repeat('c', 64) || '.webp';
begin
  i := pg_temp.rpd_item(ed, p); e := pg_temp.rpd_item(ed, p); k := pg_temp.rpd_item(ed, q);
  perform pg_temp.rpd_cerrar(ed, q);
  update public.repuestos_items set eliminado_en = now() where id = e;
  if pg_temp.rpd_ok('D5 su carpeta', pg_temp.rpd_subir(ed, i::text || h)) <> '1'::jsonb then raise exception 'D5: debía subir a la carpeta del ítem'; end if;
  perform pg_temp.rpd_es('D5 otra carpeta', pg_temp.rpd_subir(ed, 'sueltas' || h), '42501', null);
  perform pg_temp.rpd_es('D5 raíz', pg_temp.rpd_subir(ed, repeat('c', 64) || '.webp'), '42501', null);
  perform pg_temp.rpd_es('D5 no es ítem', pg_temp.rpd_subir(ed, gen_random_uuid()::text || h), '42501', null);
  perform pg_temp.rpd_es('D5 proyecto cerrado', pg_temp.rpd_subir(ed, k::text || h), '42501', null);
  perform pg_temp.rpd_es('D5 ítem eliminado', pg_temp.rpd_subir(ed, e::text || h), '42501', null);
  perform pg_temp.rpd_es('D5 sin ver', pg_temp.rpd_subir(sin_ver, i::text || '/' || repeat('d', 64) || '.webp'), '42501', null);
  if pg_temp.rpd_corre(ed, format('with d as (delete from storage.objects where bucket_id = %L and name like %L returning 1) select to_jsonb(count(*)) from d',
       'repuestos', i::text || '/%')) <> '0'::jsonb then
    raise exception 'D5: se borró un objeto del bucket repuestos desde la app';
  end if;
end $$;
rollback;
