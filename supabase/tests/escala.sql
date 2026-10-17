-- @test escala: ninguna función de la app usa offset, y un conteo exacto lleva tope o su motivo
-- La regla de `.claude/rules/escala.md` en el SQL **vigente** (lo que hay en `pg_proc` y `pg_views`, no las
-- migraciones viejas, que no se editan): nada pagina con `offset`, y un `count(` que no está en una función
-- o una vista con `limit` (el idioma de un conteo acotado: `count(*)` sobre un subselect con `limit tope + 1`)
-- figura abajo con su motivo y su tope. Una función nueva que cuente sin tope rompe `pnpm db:probar`: se acota
-- o se explica acá. Lo que lee una lista sin tope en una consulta no se ve desde acá: lo vigilan los planes de
-- `pnpm db:medir:volumen`.
do $$
declare
  v_excepciones constant jsonb := (select jsonb_object_agg(f, m) from (values
    -- Acciones de administración puntuales: cuestan lo que cuesta la acción, no se abren en cada pantalla.
    ('origen_eliminar', 'eliminar un origen cuenta lo que lo ata (tope: lo del origen), una acción de administración'),
    ('origenes_resumen', 'Configuración › Orígenes: un conteo por origen, 1,8 ms con 10.000 vehículos'),
    ('categorias_con_uso', 'Configuración › Orígenes: uso por categoría, 0,3 ms con 10.000 vehículos'),
    ('categoria_eliminar', 'eliminar una categoría cuenta los vehículos que la usan (administración)'),
    ('_origen_vehiculos_con_valor', 'impacto de cambiar un campo de un origen (administración)'),
    ('_lead_campo_con_valor', 'impacto de cambiar un campo de los leads (administración)'),
    ('_campo_impacto', 'cuenta los valores de un campo de un origen, ya acotados por origen (administración)'),
    ('fase_eliminar', 'eliminar una fase cuenta lo que la usa (administración)'),
    ('flujo_regla_apagar_validar', 'apagar una regla de un flujo cuenta las fases que la usan (administración)'),
    ('fuera_de_regla', 'revisión de coherencia de un flujo (administración)'),
    ('revisar_flujo', 'revisión de coherencia de un flujo (administración)'),
    ('evaluar_requisitos', 'requisitos de una fase de UN vehículo o repuesto (sus documentos)'),
    ('rbac_eliminar_rol', 'eliminar un rol cuenta sus personas y concesiones (decenas)'),
    ('alcance_de', 'los roles de UNA persona (unos pocos)'),
    ('tipo_cambio_crear', 'tipos de cambio de la empresa (decenas)'),
    ('tipo_cambio_guardar', 'tipos de cambio de la empresa (decenas)'),
    -- Topes de la base: lo contado no pasa de un máximo que ya impone otra regla.
    ('embudo_crear', 'hasta 10 embudos por persona'),
    ('embudo_eliminar', 'las oportunidades de un embudo propio (lo frena si tiene)'),
    ('embudo_etapas_guardar', 'hasta 12 etapas por embudo'),
    ('etiqueta_eliminar', 'hasta 50 etiquetas por persona'),
    ('lead_etiquetas_poner', 'hasta 20 etiquetas de una persona por lead'),
    ('lead_telefono_guardar', 'hasta 10 teléfonos extra por lead'),
    ('vehiculo_fotos_agregar', 'hasta 24 fotos por vehículo'),
    ('vehiculo_imagenes_tope', 'trigger: hasta 24 fotos por vehículo'),
    ('vehiculo_imagen_integridad', 'trigger: los dos objetos de una foto'),
    ('_papelera_purgar_leads', 'un lote tiene a lo sumo 200 leads'),
    ('_papelera_purgar_vehiculos', 'un lote tiene a lo sumo 200 vehículos'),
    ('leads_papelera_enviar', 'un envío son a lo sumo 200 leads'),
    ('leads_papelera_restaurar', 'un lote tiene a lo sumo 200 leads'),
    ('vehiculos_papelera_restaurar', 'un lote tiene a lo sumo 200 vehículos'),
    ('leads_importar_lote', 'un lote de importación son a lo sumo 50 filas de un archivo de 500'),
    ('leads_importacion_terminar', 'una importación son a lo sumo 500 filas'),
    ('leads_importacion_deshacer', 'una importación son a lo sumo 500 leads'),
    ('leads_exportacion_registrar', 'las exportaciones de UNA persona en la última hora (a lo sumo 5)'),
    ('storage_refcount', 'las referencias de UNA ruta de Storage (una o dos)'),
    ('_encolar_para_limpiar', 'las rutas de un lote de hasta 200 vehículos'),
    ('cotizacion_contadores', 'trigger: los reportes o favoritos de UNA cotización'),
    ('estado_cola_web', 'la cola de asesores de la web (el equipo)')
  ) t (f, m));
  v_malas text[];
  v_vivas text[];
begin
  -- Nada pagina con offset.
  select array_agg(n.nspname || '.' || p.proname) into v_malas
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'web') and p.prokind = 'f' and p.prosrc ~* '\moffset\s+(\d|\$|p_|v_)';
  if v_malas is not null then
    raise exception 'escala: estas funciones paginan con offset (usa un cursor keyset): %', v_malas;
  end if;

  -- Un conteo exacto: la función (o vista) tiene un limit, o figura con su motivo.
  select array_agg(x.nombre) into v_malas from (
    select p.proname as nombre from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'web') and p.prokind = 'f' and p.prosrc ~* 'count\s*\(' and p.prosrc !~* '\mlimit\M'
    union
    select v.viewname from pg_views v
     where v.schemaname in ('public', 'web') and v.definition ~* 'count\s*\(' and v.definition !~* '\mlimit\M') x
   where not v_excepciones ? x.nombre;
  if v_malas is not null then
    raise exception 'escala: cuentan sin tope (cuenta sobre un subselect con limit tope + 1, o agrégala a supabase/tests/escala.sql con su motivo y su tope): %', v_malas;
  end if;

  -- Una excepción que ya no hace falta (la función se acotó o desapareció) se saca.
  select array_agg(e.key) into v_vivas from jsonb_each_text(v_excepciones) e
   where not exists (
     select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'web') and p.proname = e.key and p.prosrc ~* 'count\s*\(' and p.prosrc !~* '\mlimit\M')
     and not exists (
     select 1 from pg_views v
      where v.schemaname in ('public', 'web') and v.viewname = e.key and v.definition ~* 'count\s*\(' and v.definition !~* '\mlimit\M');
  if v_vivas is not null then
    raise exception 'escala: estas excepciones ya no coinciden con nada, sácalas: %', v_vivas;
  end if;
end $$;

-- @test escala (9g): toda función que un cliente puede llamar con un tamaño de página lo acota con _acotar_pagina
-- Lo que la app (o quien le hable a PostgREST con una sesión) puede ejecutar y recibe un parámetro de tamaño
-- (`p_tamano`, `p_tope`, `p_tope_total`, `p_limite`, `p_cantidad`, `p_primeros`…) acota **ese** parámetro con
-- `_acotar_pagina(<parámetro>, por_defecto, máximo)`: el máximo queda declarado en la base y a la vista, y nunca lo
-- decide el cliente. Un `least(greatest(coalesce(p_x, …)))` escrito a mano también falla: es lo que había antes, con un
-- literal distinto en cada una. Las funciones de los jobs (`storage_gc_reclamar`, `web_expirar_solicitudes`) no las
-- puede ejecutar `authenticated` ni `anon`, así que no entran. El máximo de cada una contra lo que pide el código lo
-- compara `scripts/guardas/paginas.test.ts` (corre en `pnpm test`).
do $$
declare
  v_malas text[];
  v_a_mano text[];
  v_vistas int;
begin
  select array_agg(n.nspname || '.' || p.proname || '(' || a || ')' order by p.proname) into v_malas
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(p.proargnames) a
   where n.nspname in ('public', 'web') and p.prokind = 'f'
     and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))
     and a ~ '^p_(tamano|tope|tope_total|limite|cantidad|limit|max|por_pagina|primeros)$'
     and p.prosrc !~* ('_acotar_pagina\(\s*' || a || '\s*,');
  if v_malas is not null then
    raise exception 'escala: estas funciones reciben un tamaño de página y no lo acotan con _acotar_pagina(parámetro, por_defecto, máximo): %', v_malas;
  end if;
  select array_agg(n.nspname || '.' || p.proname order by p.proname) into v_a_mano
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'web') and p.prokind = 'f' and p.proname <> '_acotar_pagina'
     and p.prosrc ~* 'least\s*\(\s*greatest\s*\(\s*coalesce\s*\(\s*p_(tamano|tope|tope_total|limite|cantidad|limit|max|por_pagina)\M';
  if v_a_mano is not null then
    raise exception 'escala: estas funciones acotan el tamaño a mano; usa _acotar_pagina: %', v_a_mano;
  end if;
  -- La guarda mira algo: hay funciones con tamaño que un cliente puede llamar (si no, el patrón dejó de coincidir).
  select count(*) into v_vistas
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace, unnest(p.proargnames) a
   where n.nspname in ('public', 'web') and p.prokind = 'f'
     and has_function_privilege('authenticated', p.oid, 'execute')
     and a ~ '^p_(tamano|tope|tope_total|limite|cantidad|limit|max|por_pagina|primeros)$';
  if v_vistas < 7 then
    raise exception 'escala: la guarda de páginas vio sólo % parámetros de tamaño (hoy hay 7: dos de Ver más, dos de papelera, tres del kanban)', v_vistas;
  end if;
end $$;

-- @test escala (9g): _acotar_pagina vuelve a algo que vale lo que pida el cliente
do $$
declare
  c record;
begin
  for c in select * from (values
      (null::int, 20, 50, 20), (0, 20, 50, 1), (-1, 20, 50, 1), (-100000, 20, 50, 1), (1, 20, 50, 1),
      (7, 20, 50, 7), (30, 20, 50, 30), (50, 20, 50, 50), (51, 20, 50, 50), (100000, 20, 50, 50),
      (2147483647, 20, 50, 50), (null, 6, 51, 6), (100, 50, 100, 100), (101, 50, 100, 100)) t (pedido, defecto, maximo, esperado) loop
    if public._acotar_pagina(c.pedido, c.defecto, c.maximo) <> c.esperado then
      raise exception '_acotar_pagina(%, %, %) dio %, y se esperaba %', c.pedido, c.defecto, c.maximo,
        public._acotar_pagina(c.pedido, c.defecto, c.maximo), c.esperado;
    end if;
  end loop;
end $$;

-- @test escala (9g): una llamada directa a la RPC con otro tamaño no trae más del máximo ni rompe con 0 o -1
-- Con 120 seguimientos y 120 recordatorios propios de un lead, pedidos como la dueña: 100000 y 51 dan el máximo (50),
-- 30 da 30, 0 y -1 dan 1 (nunca 0 ni un error de `limit`), y sin tamaño, 20. Las demás RPC (papeleras, kanban) pasan por
-- el mismo ayudante y las vigila la guarda de arriba; su plan con volumen, `pnpm db:medir:volumen`.
create function pg_temp.escala_como(p_persona text, p_sql text) returns text language plpgsql as $f$
declare v text;
begin
  begin
    perform set_config('request.jwt.claim.sub', p_persona, true);
    set local role authenticated;
    begin
      execute p_sql into v;
    exception when others then
      v := 'ERROR ' || sqlstate || ': ' || sqlerrm;
    end;
    raise exception 'deshacer' using errcode = 'P0999';
  exception when sqlstate 'P0999' then
    null;
  end;
  return v;
end $f$;

do $$
declare
  p01 constant text := '00000000-0000-0000-0000-000000000001';
  v_origen uuid := (select id from public.origenes_lead order by orden limit 1);
  v_tipo uuid := (select id from public.tipos_seguimiento order by orden limit 1);
  v_lead uuid;
  c record;
  v text;
begin
  insert into public.leads (nombre, telefono_principal, origen_lead_id, creado_por)
  values ('Escala 9g tamaños', '59170019977', v_origen, p01::uuid) returning id into v_lead;
  insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, ocurrido_en)
    select v_lead, p01::uuid, v_tipo, 'S ' || g, now() - (g || ' minutes')::interval from generate_series(1, 120) g;
  insert into public.recordatorios (usuario_id, lead_id, titulo, recordar_en)
    select p01::uuid, v_lead, 'R ' || g, now() + (g || ' hours')::interval from generate_series(1, 120) g;
  for c in select * from (values ('100000', 50), ('51', 50), ('30', 30), ('0', 1), ('-1', 1), ('null', 20)) t (pedido, esperado) loop
    v := pg_temp.escala_como(p01, format(
      $q$select jsonb_array_length(public.lead_seguimientos(%L, null, null, %s) -> 'seguimientos')::text$q$, v_lead, c.pedido));
    if v <> c.esperado::text then
      raise exception 'lead_seguimientos con p_tamano = % trajo % (se esperaban %)', c.pedido, v, c.esperado; end if;
    v := pg_temp.escala_como(p01, format(
      $q$select jsonb_array_length(public.lead_recordatorios(%L, false, null, null, %s) -> 'recordatorios')::text$q$, v_lead, c.pedido));
    if v <> c.esperado::text then
      raise exception 'lead_recordatorios con p_tamano = % trajo % (se esperaban %)', c.pedido, v, c.esperado; end if;
  end loop;
  -- El kanban y las papeleras: sin ninguna fila de más con pedidos raros (lo que traen es vacío, pero no fallan con 0 o -1).
  for c in select * from (values ('100000'), ('0'), ('-1'), ('null')) t (pedido) loop
    v := pg_temp.escala_como(p01, format($q$select public.leads_papelera_listar(null, null, false, %s)::text$q$, c.pedido));
    if v like 'ERROR%' then raise exception 'leads_papelera_listar con p_tope = % falló: %', c.pedido, v; end if;
    v := pg_temp.escala_como(p01, format($q$select public.vehiculos_papelera_listar(null, null, false, %s)::text$q$, c.pedido));
    if v like 'ERROR%' then raise exception 'vehiculos_papelera_listar con p_tope = % falló: %', c.pedido, v; end if;
  end loop;
end $$;

-- @test escala (9g): la preferencia «ítems por página» (listas.por_pagina) sólo admite 10, 25, 50 o 100, y es de cada persona
-- La base valida el valor (un número, uno de los cuatro del selector): ni 7, ni 1000, ni 0, ni -1, ni «50» como texto, ni un
-- objeto. Cualquier otra clave de preferencia no se mira. La policy deja escribir sólo la fila propia.
do $$
declare
  p01 constant text := '00000000-0000-0000-0000-000000000001';
  p50 constant text := '00000000-0000-0000-0000-000000000050';
  v text;
  c record;
begin
  for c in select * from (values ('10'), ('25'), ('50'), ('100'), ('50.0')) t (valor) loop
    v := pg_temp.escala_como(p01, format(
      $q$with i as (insert into public.preferencias_usuario (usuario_id, clave, valor) values (%L, 'listas.por_pagina', %L::jsonb)
                    on conflict (usuario_id, clave) do update set valor = excluded.valor returning 1) select 'ok'$q$, p01, c.valor));
    if v <> 'ok' then raise exception 'la preferencia % debía aceptarse: %', c.valor, v; end if;
  end loop;
  for c in select * from (values ('7'), ('0'), ('-1'), ('1000'), ('101'), ('9'), ('"50"'), ('"cien"'), ('null'), ('true'), ('{}'), ('[50]'), ('50.5')) t (valor) loop
    v := pg_temp.escala_como(p01, format(
      $q$with i as (insert into public.preferencias_usuario (usuario_id, clave, valor) values (%L, 'listas.por_pagina', %L::jsonb)
                    on conflict (usuario_id, clave) do update set valor = excluded.valor returning 1) select 'ok'$q$, p01, c.valor));
    if v not like 'ERROR 23514%' and v not like 'ERROR 23502%' then
      raise exception 'la preferencia % debía rechazarse (check): %', c.valor, v; end if;
  end loop;
  -- Una clave que no es ésta no pasa por el check.
  v := pg_temp.escala_como(p01, format(
    $q$with i as (insert into public.preferencias_usuario (usuario_id, clave, valor) values (%L, 'densidad', '"compacta"'::jsonb)
                  on conflict (usuario_id, clave) do update set valor = excluded.valor returning 1) select 'ok'$q$, p01));
  if v <> 'ok' then raise exception 'otra clave de preferencia debía seguir aceptándose: %', v; end if;
  -- Es de cada persona: no se escribe la de otra.
  v := pg_temp.escala_como(p01, format(
    $q$with i as (insert into public.preferencias_usuario (usuario_id, clave, valor) values (%L, 'listas.por_pagina', '25'::jsonb) returning 1) select 'ok'$q$, p50));
  if v not like 'ERROR 42501%' then raise exception 'la dueña pudo escribir la preferencia de otra persona: %', v; end if;
  -- Y no se lee la de otra.
  if (select count(*) from public.preferencias_usuario where usuario_id = p50::uuid and clave = 'listas.por_pagina') = 0 then
    insert into public.preferencias_usuario (usuario_id, clave, valor) values (p50::uuid, 'listas.por_pagina', '100'::jsonb);
  end if;
  v := pg_temp.escala_como(p01, $q$select count(*)::text from public.preferencias_usuario where usuario_id <> (select auth.uid())$q$);
  if v <> '0' then raise exception 'la dueña leyó preferencias de otra persona: %', v; end if;
end $$;
