-- Revalidar la web pública (paso 8.06): la cola `interno.web_revalidar_pendiente`, los triggers `web_revalidar`, el job
-- `web_revalidar_correr()`, la dirección que valida `integracion_guardar` y el conteo de los vehículos que cambian al encender.
-- No depende de otro archivo (`SOLO=areas/web/revalidar.sql`). Cada bloque que escribe abre su transacción, empieza con la cola y los
-- pedidos vacíos, y la revierte. pg_net es el doble de `net.pedidos` (`scripts/probar-schema.mjs`): nunca sale un POST real.
--
-- Qué asegura:
--   R1. Dos cambios de FAQs en una transacción dejan una fila `faqs`; filas repetidas de otras transacciones se compactan en una sin enviar.
--   R2. Cada tabla anota su etiqueta; `cola_web_asesores` sólo por `orden`, no por `disponible`.
--   R3. Publicar un vehículo y cambiarle la fase anota `vehiculos`.
--   R4. Apagada, sin dirección, con `http://` de loopback o sin secreto: no hay pedido y lo pendiente sigue.
--   R5. Con todo: un pedido con el cuerpo exacto y el secreto sólo en la cabecera; la cola queda vacía y la 2.ª corrida no pide.
--   R6. El job está programado sin dirección ni secreto en su comando.
--   R7. Ningún rol de la app corre el job, el trigger, ni ve la cola; R7b: ningún índice único sobre `etiqueta`.
--   R8. `integracion_guardar` valida `revalidar_url` (hint), guarda sólo esa clave y deja apibara igual; permiso y versión.
--   R9. `web_publica_vehiculos_que_cambian()` cuenta los que cumplen las otras cuatro condiciones, acotado a 51; permiso.

create or replace function pg_temp.wr_persona(p_concesiones text[]) returns uuid language plpgsql as $f$
declare v_id uuid := gen_random_uuid(); v_rol uuid; c text;
begin
  insert into auth.users (id, email, raw_app_meta_data) values (v_id, v_id || '@ejemplo.com', '{"invitado": true}');
  insert into public.roles (clave, nombre) values ('wr_' || substr(v_id::text, 1, 8), 'WR ' || substr(v_id::text, 1, 8)) returning id into v_rol;
  insert into public.usuarios_roles (usuario_id, rol_id, es_principal) values (v_id, v_rol, true);
  foreach c in array p_concesiones loop
    insert into public.roles_permisos (rol_id, permiso_clave, alcance) values (v_rol, c, 'todos');
  end loop;
  return v_id;
end $f$;

-- Corre un SQL como esa persona (authenticated) y devuelve su resultado, o {error, mensaje, hint} si falla.
create or replace function pg_temp.wr_corre(p_quien uuid, p_sql text) returns jsonb language plpgsql as $f$
declare v jsonb; v_e text; v_m text; v_h text;
begin
  perform set_config('request.jwt.claim.sub', p_quien::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  begin
    execute p_sql into v;
  exception when others then
    get stacked diagnostics v_m = message_text, v_h = pg_exception_hint;
    v_e := sqlstate;
    reset role;
    return jsonb_build_object('error', v_e, 'mensaje', v_m, 'hint', nullif(v_h, ''));
  end;
  reset role;
  return v;
end $f$;

-- Las etiquetas pendientes, sin repetir y ordenadas.
create or replace function pg_temp.wr_pendientes() returns text[] language sql as $f$
  select coalesce(array_agg(distinct etiqueta order by etiqueta), '{}') from interno.web_revalidar_pendiente
$f$;

-- La llamada a integracion_guardar('web_publica', …) con la versión vigente, como texto para wr_corre.
create or replace function pg_temp.wr_guardar(p_config jsonb) returns text language sql as $f$
  select format('select to_jsonb(public.integracion_guardar(%L, %L::timestamptz, null, %L::jsonb))',
    'web_publica', (select actualizado_en from public.integraciones where clave = 'web_publica'), p_config)
$f$;

-- @test revalidar: cada tabla anota su etiqueta, y la cola de asesores sólo por el orden (R2)
begin;
delete from interno.web_revalidar_pendiente;
do $$
declare
  t record;
  v_tablas jsonb := '[
    ["web_guias", "id", "guias"], ["web_categorias_guias", "id", "guias"], ["web_faqs", "id", "faqs"],
    ["web_testimonios", "id", "testimonios"], ["ajustes_web", "id", "ajustes"], ["ajustes_empresa", "id", "ajustes"],
    ["perfiles", "id", "asesores"], ["cola_web_asesores", "orden", "asesores"], ["vehiculos", "id", "vehiculos"],
    ["vehiculos_imagenes", "id", "vehiculos"], ["fases", "id", "vehiculos"], ["origenes", "id", "vehiculos"],
    ["origenes_campos", "id", "vehiculos"], ["categorias", "id", "vehiculos"], ["integraciones", "clave", "vehiculos"]
  ]';
begin
  for t in select e ->> 0 as tabla, e ->> 1 as columna, e ->> 2 as etiqueta from jsonb_array_elements(v_tablas) e loop
    delete from interno.web_revalidar_pendiente;
    execute format('update public.%I set %I = %I where false', t.tabla, t.columna, t.columna);
    if pg_temp.wr_pendientes() <> array[t.etiqueta] then
      raise exception 'un update de % anotó % (debía anotar %)', t.tabla, pg_temp.wr_pendientes(), t.etiqueta;
    end if;
  end loop;
  delete from interno.web_revalidar_pendiente;
  update public.cola_web_asesores set disponible = disponible where false;
  update public.cola_web_asesores set ultima_asignacion_en = ultima_asignacion_en, asignadas_total = asignadas_total where false;
  if pg_temp.wr_pendientes() <> '{}' then
    raise exception 'cambiar la disponibilidad de un asesor anotó %', pg_temp.wr_pendientes();
  end if;
  if (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where g.tgname = 'web_revalidar' and n.nspname = 'public') <> jsonb_array_length(v_tablas) then
    raise exception 'hay triggers web_revalidar que esta prueba no mira';
  end if;
end $$;
rollback;

-- @test revalidar: publicar un vehículo y cambiarle la fase anota vehiculos (R3)
begin;
do $$
declare v_fase uuid; v_otra uuid; v_origen uuid; v_vehiculo uuid; v_autor uuid := pg_temp.wr_persona(array[]::text[]);
begin
  select f.id, fl.origen_id into v_fase, v_origen from public.fases f join public.flujos fl on fl.id = f.flujo_id
  where f.publica_web and f.activa and fl.origen_id is not null order by f.orden limit 1;
  select f.id into v_otra from public.fases f join public.flujos fl on fl.id = f.flujo_id
  where fl.origen_id = v_origen and f.id <> v_fase order by f.orden limit 1;
  if v_fase is null or v_otra is null then raise exception 'falta un origen con dos fases y una pública en la semilla'; end if;
  insert into public.vehiculos (origen_id, titulo, creado_por) values (v_origen, 'R3', v_autor) returning id into v_vehiculo;
  update public.vehiculos set fase_id = v_fase, publicado_web = true where id = v_vehiculo;
  delete from interno.web_revalidar_pendiente;
  update public.vehiculos set fase_id = v_otra where id = v_vehiculo;
  if pg_temp.wr_pendientes() <> array['vehiculos'] then
    raise exception 'cambiar la fase de un vehículo publicado anotó %', pg_temp.wr_pendientes();
  end if;
end $$;
rollback;

