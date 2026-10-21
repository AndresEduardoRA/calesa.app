-- Configuración de leads (`…20261019004000_configuracion_de_leads.sql`): los tipos de seguimiento con escritura propia, el icono del
-- origen y del tipo de lead y de seguimiento, el origen «por defecto» y la lectura acotada del alta (5b-5). Corre después de `humo.sql`:
-- la dueña es `…0001` y `…00b1` es una persona sin `leads.configurar`. Cada bloque deja la base como la encontró.

-- @test tipos de seguimiento: de fábrica, sólo por RPC, con permiso, versión, tope, nombre e icono; con seguimientos no se elimina; un seguimiento no guarda uno apagado
create or replace function pg_temp.falla(p_sql text, p_estado text, p_texto text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'no falló: %', p_sql;
exception when others then
  if sqlstate <> p_estado or position(p_texto in sqlerrm) = 0 then
    raise exception '% debía fallar con % y «%», falló con % y «%»', p_sql, p_estado, p_texto, sqlstate, sqlerrm;
  end if;
end $$;

-- De fábrica: los siete de siempre, cada icono del catálogo (o ninguno), el orden de 10 en 10 y un nombre por tipo.
do $$
begin
  if (select count(*) from public.tipos_seguimiento) < 7 then raise exception 'faltan los tipos de fábrica'; end if;
  if exists (select 1 from public.tipos_seguimiento where icono is not null and icono <> all (public._iconos_del_catalogo())) then
    raise exception 'un icono de fábrica fuera del catálogo: %', (select string_agg(icono, ',') from public.tipos_seguimiento where icono is not null and icono <> all (public._iconos_del_catalogo())); end if;
  if (select min(orden) from public.tipos_seguimiento) <> 10 then raise exception 'el orden no parte de 10'; end if;
  if (select count(*) from public.tipos_seguimiento) <> (select count(distinct lower(btrim(nombre))) from public.tipos_seguimiento) then
    raise exception 'dos tipos con el mismo nombre'; end if;
  if cardinality(public._iconos_del_catalogo()) <> 24 or cardinality(public._iconos_del_catalogo()) <> (select count(distinct x) from unnest(public._iconos_del_catalogo()) x) then
    raise exception 'el catálogo de iconos no tiene 24 claves distintas'; end if;
end $$;

-- La dueña: nombre normalizado, clave que sale del nombre, icono validado, repetir el id no duplica, versión, orden y eliminar.
do $$
declare
  r jsonb; v_id uuid := gen_random_uuid(); v_ver timestamptz; v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid();
  v_va timestamptz; v_n int := (select count(*) from public.tipos_seguimiento);
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.tipo_seguimiento_crear(v_id, '   Mensaje   de  voz ', 'mensaje');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  if (select clave || '|' || nombre || '|' || icono from public.tipos_seguimiento where id = v_id) <> 'mensaje_de_voz|Mensaje de voz|mensaje' then
    raise exception 'el nombre, la clave o el icono: %', (select clave || '|' || nombre from public.tipos_seguimiento where id = v_id); end if;
  if (r ->> 'repetido')::boolean then raise exception 'la primera vez no es un reintento'; end if;
  if (select orden from public.tipos_seguimiento where id = v_id) <> (select max(orden) from public.tipos_seguimiento) then
    raise exception 'el nuevo no quedó al final'; end if;
  r := public.tipo_seguimiento_crear(v_id, 'Mensaje de voz', 'mensaje');
  if not (r ->> 'repetido')::boolean or (select count(*) from public.tipos_seguimiento where id = v_id) <> 1 then raise exception 'el reintento duplicó: %', r; end if;
  if (r -> 'lista' ->> 'tope')::int <> 100 then raise exception 'el tope: %', r -> 'lista' ->> 'tope'; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'lista' -> 'tipos') x
                  where x ->> 'id' = v_id::text and x ->> 'icono' = 'mensaje' and (x ->> 'con_seguimientos')::boolean = false) then
    raise exception 'la lista de vuelta: %', r; end if;
  -- Sin icono: nulo y vacío son «sin icono». Acentos y empezar con un número en la clave.
  perform public.tipo_seguimiento_crear(v_a, 'Ándale ¡ya!', null);
  perform public.tipo_seguimiento_crear(v_b, '2x1', '');
  if (select clave || '|' || coalesce(icono, '-') from public.tipos_seguimiento where id = v_a) <> 'andale_ya|-'
     or (select clave || '|' || coalesce(icono, '-') from public.tipos_seguimiento where id = v_b) <> 's_2x1|-' then
    raise exception 'claves o iconos vacíos'; end if;

  -- Nombre vacío, largo o repetido (sin importar mayúsculas ni espacios); un icono que no es del catálogo.
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), '', null)$f$, '22023', 'Escribe el nombre');
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), '    ', null)$f$, '22023', 'Escribe el nombre');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_crear(gen_random_uuid(), %L, null)$f$, repeat('x', 41)), '22023', 'hasta 40 caracteres');
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), '  LLAMADA  ', null)$f$, '23505', 'Ya hay un tipo de seguimiento');
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), 'Radio', 'marciano')$f$, '22023', 'no está en el catálogo');
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), 'Radio', 'phone')$f$, '22023', 'no está en el catálogo');
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(null, 'Radio', null)$f$, '22023', 'identificador');

  -- Guardar: pide versión; una vieja es PT409; el icono mueve la versión; repetir el nombre de otro no se puede; lo ya guardado no choca.
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, null, '{"nombre": "X"}')$f$, v_id), 'P0001', 'Falta la versión');
  r := public.tipo_seguimiento_guardar(v_id, v_ver, '{"icono": "correo"}');
  if (select icono from public.tipos_seguimiento where id = v_id) <> 'correo' or (r ->> 'actualizado_en')::timestamptz = v_ver then
    raise exception 'cambiar el icono no movió la versión: %', r; end if;
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"nombre": "VIP"}')$f$, v_id, v_ver), 'PT409', 'Otra persona cambió este tipo de seguimiento');
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  r := public.tipo_seguimiento_guardar(v_id, v_ver, '{"icono": null, "nombre": "  Nota de voz "}');
  if (select icono from public.tipos_seguimiento where id = v_id) is not null or (select nombre from public.tipos_seguimiento where id = v_id) <> 'Nota de voz' then
    raise exception 'quitar el icono o renombrar: %', r; end if;
  if (select clave from public.tipos_seguimiento where id = v_id) <> 'mensaje_de_voz' then raise exception 'renombrar cambió la clave'; end if;
  v_ver := (r ->> 'actualizado_en')::timestamptz;
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"nombre": "llamada"}')$f$, v_id, v_ver), '23505', 'Ya hay un tipo de seguimiento');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"icono": "marciano"}')$f$, v_id, v_ver), '22023', 'no está en el catálogo');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"icono": 5}')$f$, v_id, v_ver), '22023', 'clave del catálogo');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"clave": "x"}')$f$, v_id, v_ver), '22023', 'no se cambia');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"activo": "no"}')$f$, v_id, v_ver), '22023', 'sí o no');
  r := public.tipo_seguimiento_guardar(v_id, v_ver - interval '1 second', '{"nombre": "Nota de voz"}');
  if not (r ->> 'sin_cambios')::boolean then raise exception 'el reintento chocó consigo mismo: %', r; end if;

  -- Ordenar: «después de». Mover no cambia la versión de nadie y no deja dos con el mismo lugar.
  select actualizado_en into v_va from public.tipos_seguimiento where id = v_a;
  r := public.tipo_seguimiento_mover(v_id, v_ver, null);
  if (select (array_agg(t.x ->> 'id' order by t.n))[1] from jsonb_array_elements(r -> 'lista' -> 'tipos') with ordinality as t (x, n)) <> v_id::text then
    raise exception 'no quedó primero: %', r; end if;
  r := public.tipo_seguimiento_mover(v_id, v_ver, v_a);
  if (select orden from public.tipos_seguimiento where id = v_id) <= (select orden from public.tipos_seguimiento where id = v_a)
     or (select orden from public.tipos_seguimiento where id = v_id) >= (select orden from public.tipos_seguimiento where id = v_b) then
    raise exception 'no quedó entre medio'; end if;
  if (select count(distinct orden) from public.tipos_seguimiento) <> (select count(*) from public.tipos_seguimiento) then raise exception 'dos con el mismo lugar'; end if;
  if (select actualizado_en from public.tipos_seguimiento where id = v_a) <> v_va then raise exception 'mover movió la versión de otro'; end if;
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_mover(%L, %L, %L)$f$, v_id, v_ver, v_id), '22023', 'después de sí mismo');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_mover(%L, %L, %L)$f$, v_id, v_ver, gen_random_uuid()), 'PT409', 'ya no existe');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_mover(%L, null, null)$f$, v_id), 'P0001', 'Falta la versión');

  -- Eliminar uno sin seguimientos: sí (pide versión); uno que ya no está: PT409.
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_eliminar(%L, %L)$f$, v_b, (select actualizado_en from public.tipos_seguimiento where id = v_b) - interval '1 second'), 'PT409', 'Otra persona cambió');
  perform public.tipo_seguimiento_eliminar(v_b, (select actualizado_en from public.tipos_seguimiento where id = v_b));
  if exists (select 1 from public.tipos_seguimiento where id = v_b) then raise exception 'no se eliminó'; end if;
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_eliminar(%L, %L)$f$, v_b, now()), 'PT409', 'ya no existe');
  -- La lectura de la pantalla: el tope y todos.
  r := public.tipos_seguimiento_con_uso();
  if jsonb_array_length(r -> 'tipos') <> (select count(*) from public.tipos_seguimiento) or (r ->> 'tope')::int <> 100 then raise exception 'con_uso incompleto'; end if;
  reset role;
  -- Quien salta la RLS: un nombre igual sin importar mayúsculas es una violación del índice único.
  perform pg_temp.falla($f$insert into public.tipos_seguimiento (clave, nombre) values ('otra_llamada', 'LLAMADA')$f$, '23505', 'tipos_seguimiento_nombre_unico');
  delete from public.tipos_seguimiento where id in (v_id, v_a);
  if (select count(*) from public.tipos_seguimiento) <> v_n then raise exception 'la base no quedó como estaba'; end if;
end $$;

-- Con seguimientos no se elimina, ni con el seguimiento eliminado; se desactiva, deja de ofrecerse y sigue nombrando a los que ya lo tienen.
do $$
declare
  v_t uuid := gen_random_uuid(); v_lead uuid := gen_random_uuid(); v_seg uuid := gen_random_uuid(); v_seg2 uuid := gen_random_uuid(); v_ver timestamptz; r jsonb;
  v_web uuid := (select id from public.origenes_lead where clave = 'web');
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform public.tipo_seguimiento_crear(v_t, 'Con uso cfg', 'otro');
  r := public.crear_lead(v_lead, jsonb_build_object('nombre', 'Lead tipo seguimiento cfg', 'telefono_principal', '71909201', 'origen_lead_id', v_web), null);
  if r ->> 'resultado' <> 'creado' then raise exception 'no creó el lead: %', r; end if;
  perform public.seguimiento_crear(v_seg, v_lead, jsonb_build_object('tipo_id', v_t, 'titulo', 'Con el tipo nuevo'));
  perform public.seguimiento_crear(v_seg2, v_lead, jsonb_build_object('tipo_id', (select id from public.tipos_seguimiento where clave = 'nota'), 'titulo', 'Con la nota'));
  select actualizado_en into v_ver from public.tipos_seguimiento where id = v_t;
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_eliminar(%L, %L)$f$, v_t, v_ver), '23503', 'ya tiene seguimientos');
  if not exists (select 1 from jsonb_array_elements(public.tipos_seguimiento_con_uso() -> 'tipos') x where x ->> 'id' = v_t::text and (x ->> 'con_seguimientos')::boolean) then
    raise exception 'con_uso no marca que tiene seguimientos'; end if;
  -- Desactivarlo: el alta ya no lo ofrece, anotar uno nuevo con él se rechaza, y el seguimiento viejo lo sigue nombrando.
  r := public.tipo_seguimiento_guardar(v_t, v_ver, '{"activo": false}');
  if exists (select 1 from jsonb_array_elements(public.lead_alta_contexto() -> 'tipos_seguimiento') x where x ->> 'id' = v_t::text) then
    raise exception 'el alta sigue ofreciendo un tipo de seguimiento apagado'; end if;
  perform pg_temp.falla(format($f$select public.seguimiento_crear(gen_random_uuid(), %L, %L)$f$, v_lead, jsonb_build_object('tipo_id', v_t, 'titulo', 'x')), '22023', 'tipo de seguimiento que esté activo');
  if not exists (select 1 from jsonb_array_elements(public.lead_seguimientos(v_lead, null, null, 20) -> 'seguimientos') x
                  where x ->> 'id' = v_seg::text and x ->> 'tipo_nombre' = 'Con uso cfg' and x ->> 'tipo_icono' = 'otro') then
    raise exception 'el seguimiento viejo dejó de nombrar su tipo apagado: %', public.lead_seguimientos(v_lead, null, null, 20); end if;
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_eliminar(%L, %L)$f$, v_t, (r ->> 'actualizado_en')::timestamptz), '23503', 'ya tiene seguimientos');
  reset role;
  -- El último recurso de la base: guardar un seguimiento con un tipo apagado, aunque lo haga quien salta la RLS, no se guarda; el que ya lo tiene sí lo conserva.
  perform pg_temp.falla(format($f$insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo) values (%L, '00000000-0000-0000-0000-000000000001', %L, 'directo')$f$, v_lead, v_t),
    '22023', 'se desactivó');
  perform pg_temp.falla(format($f$update public.seguimientos set tipo_id = %L where id = %L$f$, v_t, v_seg2), '22023', 'se desactivó');
  update public.seguimientos set titulo = 'Editado con el tipo apagado' where id = v_seg;
  perform pg_temp.falla(format($f$insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo) values (%L, '00000000-0000-0000-0000-000000000001', %L, 'inexistente')$f$, v_lead, gen_random_uuid()),
    '22023', 'ya no existe');
  -- Sin seguimientos, ahora sí se elimina.
  delete from public.seguimientos where lead_id = v_lead;
  delete from public.leads where id = v_lead;
  set local role authenticated;
  perform public.tipo_seguimiento_eliminar(v_t, (select actualizado_en from public.tipos_seguimiento where id = v_t));
  reset role;
  if exists (select 1 from public.tipos_seguimiento where id = v_t) then raise exception 'no se eliminó'; end if;
end $$;

-- El tope de 100: se dice con el máximo (que pone la base), no se pasa y eliminar uno deja crear otro.
do $$
declare v_n int := (select count(*) from public.tipos_seguimiento); v_id uuid := gen_random_uuid(); r jsonb;
begin
  insert into public.tipos_seguimiento (clave, nombre, activo, orden) select 'relleno_' || g, 'Relleno ' || g, false, 500 + g from generate_series(1, 100 - v_n) g;
  if (select count(*) from public.tipos_seguimiento) <> 100 then raise exception 'no quedaron 100'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), 'El ciento uno', null)$f$, '22023', 'máximo');
  r := public.tipo_seguimiento_eliminar((select id from public.tipos_seguimiento where clave = 'relleno_1'), (select actualizado_en from public.tipos_seguimiento where clave = 'relleno_1'));
  r := public.tipo_seguimiento_crear(v_id, 'El ciento', null);
  if jsonb_array_length(r -> 'lista' -> 'tipos') <> 100 then raise exception 'la lista no trae los 100'; end if;
  reset role;
  delete from public.tipos_seguimiento where clave like 'relleno\_%' or id = v_id;
  if (select count(*) from public.tipos_seguimiento) <> v_n then raise exception 'la base no quedó como estaba'; end if;
end $$;

-- Sin el permiso: nada de esto. Leer, sí (la ficha y anotar lo necesitan); escribir directo, no.
do $$
declare v_t uuid := (select id from public.tipos_seguimiento where clave = 'llamada'); v_ver timestamptz := (select actualizado_en from public.tipos_seguimiento where clave = 'llamada');
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  set local role authenticated;
  perform pg_temp.falla($f$select public.tipo_seguimiento_crear(gen_random_uuid(), 'Intruso', null)$f$, '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_guardar(%L, %L, '{"activo": false}')$f$, v_t, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_mover(%L, %L, null)$f$, v_t, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.tipo_seguimiento_eliminar(%L, %L)$f$, v_t, v_ver), '42501', 'leads.configurar');
  perform pg_temp.falla($f$select public.tipos_seguimiento_con_uso()$f$, '42501', 'leads.configurar');
  perform pg_temp.falla($f$insert into public.tipos_seguimiento (clave, nombre) values ('directo', 'Directo')$f$, '42501', 'permission denied');
  perform pg_temp.falla(format($f$update public.tipos_seguimiento set activo = false where id = %L$f$, v_t), '42501', 'permission denied');
  perform pg_temp.falla(format($f$delete from public.tipos_seguimiento where id = %L$f$, v_t), '42501', 'permission denied');
  if (select count(*) from public.tipos_seguimiento) = 0 then raise exception 'no lee los tipos'; end if;
  reset role;
  -- La dueña con la matriz de permisos sin `leads.configurar` tampoco: el permiso es el mismo, sin uno nuevo.
  if (select aplicado_en from public.permisos where clave = 'leads.configurar') not like '%tipo_seguimiento_*%' then raise exception 'el permiso no dice que gobierna los tipos de seguimiento'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test orígenes y tipos de lead: el icono es del catálogo; el origen «por defecto» es uno solo, activo, y no se apaga ni se elimina mientras lo sea
create or replace function pg_temp.falla(p_sql text, p_estado text, p_texto text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'no falló: %', p_sql;
exception when others then
  if sqlstate <> p_estado or position(p_texto in sqlerrm) = 0 then
    raise exception '% debía fallar con % y «%», falló con % y «%»', p_sql, p_estado, p_texto, sqlstate, sqlerrm;
  end if;
end $$;

do $$
declare
  r jsonb; v_a uuid := gen_random_uuid(); v_b uuid := gen_random_uuid(); v_c uuid := gen_random_uuid(); v_t uuid := gen_random_uuid();
  v_va timestamptz; v_vb timestamptz; v_vc timestamptz; v_n int := (select count(*) from public.origenes_lead); v_ver timestamptz;
begin
  if exists (select 1 from public.origenes_lead where por_defecto) then raise exception 'de fábrica no hay un origen por defecto'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;

  -- El icono de un origen: del catálogo o ninguno; mueve la versión; un tipo de lead igual (la clase sigue sin cambiar).
  r := public.origen_lead_crear(v_a, 'Cfg A', 'web');
  v_va := (r ->> 'actualizado_en')::timestamptz;
  perform public.origen_lead_crear(v_b, 'Cfg B', null);
  perform public.origen_lead_crear(v_c, 'Cfg C', 'tienda');
  perform pg_temp.falla($f$select public.origen_lead_crear(gen_random_uuid(), 'Cfg X', 'marciano')$f$, '22023', 'no está en el catálogo');
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"icono": "marciano"}')$f$, v_a, v_va), '22023', 'no está en el catálogo');
  r := public.origen_lead_guardar(v_a, v_va, '{"icono": "casa"}');
  if (select icono from public.origenes_lead where id = v_a) <> 'casa' or (r ->> 'actualizado_en')::timestamptz = v_va then raise exception 'el icono del origen: %', r; end if;
  v_va := (r ->> 'actualizado_en')::timestamptz;
  if not exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ->> 'id' = v_a::text and x ->> 'icono' = 'casa' and (x ->> 'por_defecto')::boolean = false) then
    raise exception 'la lista de orígenes no dice el icono: %', r; end if;
  r := public.tipo_lead_crear(v_t, 'Cfg tipo', 'cliente', 'estrella');
  if (select icono from public.tipos_lead where id = v_t) <> 'estrella' then raise exception 'el icono del tipo'; end if;
  perform pg_temp.falla($f$select public.tipo_lead_crear(gen_random_uuid(), 'Cfg tipo 2', 'cliente', 'marciano')$f$, '22023', 'no está en el catálogo');
  v_ver := (select actualizado_en from public.tipos_lead where id = v_t);
  r := public.tipo_lead_guardar(v_t, v_ver, '{"icono": null}');
  if (select icono from public.tipos_lead where id = v_t) is not null or (r ->> 'actualizado_en')::timestamptz = v_ver then raise exception 'quitar el icono del tipo: %', r; end if;
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"icono": "marciano"}')$f$, v_t, (r ->> 'actualizado_en')::timestamptz), '22023', 'no está en el catálogo');
  perform pg_temp.falla(format($f$select public.tipo_lead_guardar(%L, %L, '{"clase": "prospecto"}')$f$, v_t, (r ->> 'actualizado_en')::timestamptz), '22023', 'La clase de un tipo no cambia');
  if (select count(*) from public.tipos_lead where id = v_t) = 1 then perform public.tipo_lead_eliminar(v_t, (select actualizado_en from public.tipos_lead where id = v_t)); end if;
  -- `leads_catalogos()` entrega el icono para dibujarlo junto al nombre.
  if not exists (select 1 from jsonb_array_elements(public.leads_catalogos() -> 'origenes') x where x ->> 'id' = v_a::text and x ->> 'icono' = 'casa') then
    raise exception 'leads_catalogos no trae el icono del origen'; end if;
  if not exists (select 1 from jsonb_array_elements(public.leads_catalogos() -> 'tipos') x where x ->> 'clave' = 'cliente' and x ->> 'icono' = 'trato') then
    raise exception 'leads_catalogos no trae el icono del tipo'; end if;

  -- El origen por defecto: marcar, uno solo (marcar otro desmarca el anterior), sin mover la versión.
  select actualizado_en into v_vb from public.origenes_lead where id = v_b;
  r := public.origen_lead_guardar(v_a, v_va, '{"por_defecto": true}');
  if (select count(*) from public.origenes_lead where por_defecto) <> 1 or not (select por_defecto from public.origenes_lead where id = v_a) then raise exception 'marcar uno: %', r; end if;
  if (r ->> 'actualizado_en')::timestamptz <> v_va then raise exception 'marcar «por defecto» movió la versión'; end if;
  if (public.lead_alta_contexto() ->> 'origen_por_defecto_id') is distinct from v_a::text then raise exception 'el alta no dice el origen por defecto'; end if;
  r := public.origen_lead_guardar(v_a, v_va, '{"por_defecto": true}');
  if not (r ->> 'sin_cambios')::boolean then raise exception 'repetir la marca no es «sin cambios»: %', r; end if;
  r := public.origen_lead_guardar(v_b, v_vb, '{"por_defecto": true}');
  if (select count(*) from public.origenes_lead where por_defecto) <> 1 or (select por_defecto from public.origenes_lead where id = v_a) or not (select por_defecto from public.origenes_lead where id = v_b) then
    raise exception 'marcar otro no desmarcó el anterior: %', r; end if;
  if not exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ->> 'id' = v_b::text and (x ->> 'por_defecto')::boolean)
     or exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ->> 'id' = v_a::text and (x ->> 'por_defecto')::boolean) then raise exception 'la lista de vuelta: %', r; end if;
  if (select actualizado_en from public.origenes_lead where id = v_a) <> v_va then raise exception 'desmarcar el anterior movió su versión'; end if;
  if not exists (select 1 from public.actividad where accion = 'origenes_lead.por_defecto' and registro_id = v_b::text) then raise exception 'sin constancia de la marca'; end if;

  -- Apagar o eliminar el que es por defecto: se rechaza con el motivo; quitarle la marca y apagarlo en una sola vez, sí.
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"activo": false}')$f$, v_b, v_vb), '22023', 'es el origen por defecto');
  perform pg_temp.falla(format($f$select public.origen_lead_eliminar(%L, %L)$f$, v_b, v_vb), '22023', 'es el origen por defecto');
  if not (select activo from public.origenes_lead where id = v_b) then raise exception 'se apagó el por defecto'; end if;
  -- Marcar uno apagado se rechaza; marcarlo y activarlo a la vez, sí.
  r := public.origen_lead_guardar(v_c, (select actualizado_en from public.origenes_lead where id = v_c), '{"activo": false}');
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"por_defecto": true}')$f$, v_c, (r ->> 'actualizado_en')::timestamptz), '22023', 'actívalo antes');
  r := public.origen_lead_guardar(v_c, (r ->> 'actualizado_en')::timestamptz, '{"por_defecto": true, "activo": true}');
  if not (select por_defecto and activo from public.origenes_lead where id = v_c) or (select por_defecto from public.origenes_lead where id = v_b) then raise exception 'marcar y activar a la vez: %', r; end if;
  r := public.origen_lead_guardar(v_c, (r ->> 'actualizado_en')::timestamptz, '{"por_defecto": false, "activo": false}');
  if (select por_defecto or activo from public.origenes_lead where id = v_c) or exists (select 1 from public.origenes_lead where por_defecto) then
    raise exception 'quitar la marca y apagar a la vez: %', r; end if;
  if public.lead_alta_contexto() -> 'origen_por_defecto_id' is distinct from 'null'::jsonb then raise exception 'sin por defecto el alta dice nulo'; end if;
  -- Un origen que no es el por defecto sí se elimina.
  perform public.origen_lead_eliminar(v_c, (select actualizado_en from public.origenes_lead where id = v_c));

  -- Con el por defecto marcado, el último origen que se apagó cede: el alta dice los dos por separado y el cliente elige.
  perform public.origen_lead_guardar(v_b, (select actualizado_en from public.origenes_lead where id = v_b), '{"por_defecto": true}');
  reset role;
  insert into public.preferencias_usuario (usuario_id, clave, valor) values ('00000000-0000-0000-0000-000000000001', 'leads.ultimo_origen_lead', to_jsonb(v_a::text))
    on conflict (usuario_id, clave) do update set valor = excluded.valor;
  set local role authenticated;
  r := public.lead_alta_contexto();
  if r ->> 'ultimo_origen_id' is distinct from v_a::text or r ->> 'origen_por_defecto_id' is distinct from v_b::text then raise exception 'el último y el por defecto: %', r; end if;
  perform public.origen_lead_guardar(v_a, (select actualizado_en from public.origenes_lead where id = v_a), '{"activo": false}');
  r := public.lead_alta_contexto();
  if r -> 'ultimo_origen_id' is distinct from 'null'::jsonb or r ->> 'origen_por_defecto_id' is distinct from v_b::text then raise exception 'el último origen se apagó: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ->> 'id' = v_a::text) then raise exception 'el alta ofrece un origen apagado'; end if;
  reset role;

  -- Quien salta la RLS: dos «por defecto» a la vez son una violación del índice único, y uno apagado, del check.
  perform pg_temp.falla(format($f$update public.origenes_lead set por_defecto = true where id = %L$f$, v_a), '23514', 'origenes_lead_por_defecto_activo');
  update public.origenes_lead set activo = true where id = v_a;
  perform pg_temp.falla(format($f$update public.origenes_lead set por_defecto = true where id = %L$f$, v_a), '23505', 'origenes_lead_por_defecto_unico');
  perform pg_temp.falla(format($f$update public.origenes_lead set activo = false where id = %L$f$, v_b), '23514', 'origenes_lead_por_defecto_activo');
  perform pg_temp.falla($f$insert into public.origenes_lead (clave, nombre, por_defecto) values ('cfg_otro_defecto', 'Cfg otro', true)$f$, '23505', 'origenes_lead_por_defecto_unico');

  -- Sin el permiso: marcar el por defecto o poner un icono, no.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"por_defecto": true}')$f$, v_a, (select actualizado_en from public.origenes_lead where id = v_a)), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$select public.origen_lead_guardar(%L, %L, '{"icono": "casa"}')$f$, v_a, (select actualizado_en from public.origenes_lead where id = v_a)), '42501', 'leads.configurar');
  perform pg_temp.falla(format($f$update public.origenes_lead set por_defecto = true where id = %L$f$, v_a), '42501', 'permission denied');
  reset role;

  -- La base queda como estaba.
  delete from public.preferencias_usuario where usuario_id = '00000000-0000-0000-0000-000000000001' and clave = 'leads.ultimo_origen_lead';
  update public.origenes_lead set por_defecto = false where por_defecto;
  delete from public.origenes_lead where id in (v_a, v_b, v_c);
  if (select count(*) from public.origenes_lead) <> v_n then raise exception 'la base no quedó como estaba'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);

-- @test alta acotada (5b-5): cada catálogo se pide hasta su tope, la respuesta lo dice y no manda clave ni icono
do $$
declare
  r jsonb; v_o int := (select count(*) from public.origenes_lead); v_t int := (select count(*) from public.tipos_lead); v_s int := (select count(*) from public.tipos_seguimiento);
begin
  -- 101 activos de cada uno, escritos por quien salta las RPC (las RPC no dejarían pasar de 100): la lectura del alta no crece con ellos.
  insert into public.origenes_lead (clave, nombre, orden) select 'cfg_o_' || g, 'Cfg origen ' || g, 1000 + g from generate_series(1, 101) g;
  insert into public.tipos_lead (clave, nombre, clase, orden) select 'cfg_t_' || g, 'Cfg tipo ' || g, 'prospecto', 1000 + g from generate_series(1, 101) g;
  insert into public.tipos_seguimiento (clave, nombre, orden) select 'cfg_s_' || g, 'Cfg seguimiento ' || g, 1000 + g from generate_series(1, 101) g;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  set local role authenticated;
  r := public.lead_alta_contexto();
  reset role;
  if jsonb_array_length(r -> 'origenes') <> 100 or jsonb_array_length(r -> 'tipos') <> 100 or jsonb_array_length(r -> 'tipos_seguimiento') <> 100 then
    raise exception 'el alta no acotó a 100: % % %', jsonb_array_length(r -> 'origenes'), jsonb_array_length(r -> 'tipos'), jsonb_array_length(r -> 'tipos_seguimiento'); end if;
  if r -> 'topes' <> '{"tipos": 100, "origenes": 100, "tipos_seguimiento": 100}'::jsonb then raise exception 'la respuesta no dice los topes: %', r -> 'topes'; end if;
  -- Los primeros por orden, no cualesquiera: el 101.º (el de más orden) queda afuera.
  if exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ->> 'nombre' = 'Cfg origen 101')
     or exists (select 1 from jsonb_array_elements(r -> 'tipos_seguimiento') x where x ->> 'nombre' = 'Cfg seguimiento 101') then
    raise exception 'quedó afuera uno de los primeros, no el último'; end if;
  -- Sin la clave ni el icono: el alta dibuja `<select>`.
  if exists (select 1 from jsonb_array_elements(r -> 'origenes') x where x ? 'clave' or x ? 'icono')
     or exists (select 1 from jsonb_array_elements(r -> 'tipos') x where x ? 'clave' or x ? 'icono')
     or exists (select 1 from jsonb_array_elements(r -> 'tipos_seguimiento') x where x ? 'clave' or x ? 'icono') then
    raise exception 'el alta sigue mandando la clave o el icono'; end if;
  if not r ? 'origen_por_defecto_id' or not r ? 'ultimo_origen_id' or not r ? 'tipo_por_defecto_id' then raise exception 'faltan el por defecto o el último origen'; end if;
  delete from public.origenes_lead where clave like 'cfg\_o\_%';
  delete from public.tipos_lead where clave like 'cfg\_t\_%';
  delete from public.tipos_seguimiento where clave like 'cfg\_s\_%';
  if (select count(*) from public.origenes_lead) <> v_o or (select count(*) from public.tipos_lead) <> v_t or (select count(*) from public.tipos_seguimiento) <> v_s then
    raise exception 'la base no quedó como estaba'; end if;
end $$;
select set_config('request.jwt.claim.sub', '', false);
