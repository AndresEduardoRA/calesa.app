-- Actividad: el diff de un cambio, recortado por tabla y por cartera (paso 9.01-1). `authenticated` no tiene grant de `actividad.antes/despues`
-- (sólo de la cabecera y `detalle`): lo lee `actividad_diff()`, `security definer`, que pide `actividad.ver` y devuelve sólo las claves que
-- cambiaron y que quien mira puede ver. La regla es una lista cerrada por tabla (`_actividad_recorte`): una tabla auditada que no está declarada
-- sale `{visible: false}` y `areas/actividad/actividad.sql` cae si un trigger `%auditar%` nuevo no se declara.

-- La clase de cada tabla auditada. `lead`: lista literal de claves, con la cartera. `entidad`: espejo de la policy «leer» de su tabla.
-- `configuracion`: entera (las columnas que lee authenticated). Cualquier otra, null = no se muestra. Quedan sin declarar a propósito las que
-- sólo reciben `registrar_actividad()` sin fotos (lotes_papelera, cotizaciones_niveles, tonos, perfiles, roles, importaciones, accesos_portal,
-- oportunidades, tablas_referencia, limpieza_corridas, comprobantes_ajustes): sin fotos no hay diff que mostrar.
create function public._actividad_recorte(p_tabla text) returns text
  language sql immutable
  set search_path = ''
as $$
  select case
    when p_tabla = 'leads' then 'lead'
    when p_tabla in ('vehiculos', 'cotizaciones', 'comprobantes', 'declaraciones_aduana', 'documentos', 'gastos', 'pagos', 'transportes',
                     'repuestos_compras', 'repuestos_items') then 'entidad'
    when p_tabla in ('ajustes_empresa', 'ajustes_web', 'ajustes_leads', 'categorias', 'cola_web_asesores', 'fases', 'fases_requisitos',
                     'fases_transiciones', 'formulas', 'integraciones', 'leads_campos', 'origenes', 'origenes_campos', 'origenes_lead',
                     'plantillas_tarjeta', 'roles_permisos', 'tipos_cambio', 'tipos_lead', 'tipos_seguimiento', 'usuarios_roles') then 'configuracion'
  end;
$$;

-- ¿Quien mira puede ver esa fila de una `entidad`? El espejo de la policy «leer» de cada tabla, sobre la foto del cambio (`despues`, o `antes` si
-- fue un borrado), sin su condición `eliminado_en`: las `puede_*` ya exigen el padre vivo (conservador). Sin foto (lo que dejó
-- `registrar_actividad()`), lee la fila vigente por su PK; si ya no existe, falso. Un id que no es uuid o una clave nula: falso.
create function public._actividad_puede_ver_fila(p_tabla text, p_registro text, p_fila jsonb) returns boolean
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_id uuid;
  v_fila jsonb := p_fila;
begin
  if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_id := p_registro::uuid;
  if v_fila is null and p_tabla in ('comprobantes', 'documentos', 'gastos', 'pagos', 'transportes') then
    -- Cada una por su PK.
    v_fila := case p_tabla
      when 'comprobantes' then (select to_jsonb(t) from public.comprobantes t where t.id = v_id)
      when 'documentos' then (select to_jsonb(t) from public.documentos t where t.id = v_id)
      when 'gastos' then (select to_jsonb(t) from public.gastos t where t.id = v_id)
      when 'pagos' then (select to_jsonb(t) from public.pagos t where t.id = v_id)
      when 'transportes' then (select to_jsonb(t) from public.transportes t where t.id = v_id)
    end;
    if v_fila is null then
      return false;
    end if;
  end if;
  return coalesce(case p_tabla
    -- policy «vehiculos: leer» / «cotizaciones: leer»: la fila propia, por su id.
    when 'vehiculos' then public.puede_vehiculo(v_id, 'vehiculos.ver')
    when 'cotizaciones' then public.puede_cotizacion(v_id, 'cotizaciones.ver')
    when 'comprobantes' then public.puede_cotizacion((v_fila ->> 'cotizacion_id')::uuid, 'cotizaciones.ver')
    when 'documentos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'gastos' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.gastos.ver', 'repuestos.costos.ver')
    when 'transportes' then public.puede_unidad((v_fila ->> 'vehiculo_id')::uuid, (v_fila ->> 'repuesto_id')::uuid, 'logistica.ver', 'repuestos.ver')
    when 'pagos' then ((v_fila ->> 'vehiculo_id') is not null and public.puede_vehiculo((v_fila ->> 'vehiculo_id')::uuid, 'logistica.pagos.ver'))
                   or ((v_fila ->> 'proyecto_repuestos_id') is not null and public.tiene_permiso('repuestos.costos.ver'))
    when 'repuestos_compras' then public.tiene_permiso('repuestos.costos.ver')
    when 'repuestos_items' then public.tiene_permiso('repuestos.ver')
    -- policy «declaraciones_aduana: leer» (6.07-3): quien gestiona aduana, o un vehículo vigente de la declaración que se ve.
    when 'declaraciones_aduana' then public.tiene_permiso('logistica.aduana.gestionar')
      or exists (select 1 from public.declaraciones_vehiculos dv
                  where dv.declaracion_id = v_id and dv.removido_en is null and public.puede_vehiculo(dv.vehiculo_id, 'logistica.ver'))
  end, false);
end;
$$;

-- El recorte de un cambio: `{visible: false}`, o `{visible: true, cambios: {campo: {antes, despues}}}` con las claves permitidas cuyo valor cambió
-- (un `null` de JSON cuenta como ausente: un alta no lista sus columnas vacías). De un lead, primero si quien mira lo ve (`puede_lead` con
-- `leads.ver`, la misma `_lead_visible_para` de la policy «leads: leer»); después, la lista literal, sin `atributos` fuera de su cartera. El número
-- de un lead (numero, numero_propio, telefono_principal) nunca sale: `lead_auditar()` ya no lo guarda y aquí se quita otra vez de la foto.
create function public._actividad_recortar(p_tabla text, p_registro text, p_antes jsonb, p_despues jsonb) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  v_clase text := public._actividad_recorte(p_tabla);
  v_antes jsonb := coalesce(p_antes, '{}'::jsonb);
  v_despues jsonb := coalesce(p_despues, '{}'::jsonb);
  v_claves text[];
  v_cambios jsonb;
  v_id uuid;
begin
  if v_clase is null then
    return jsonb_build_object('visible', false);
  end if;
  if v_clase = 'lead' then
    if p_registro is null or p_registro !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('visible', false);
    end if;
    v_id := p_registro::uuid;
    if not public.puede_lead(v_id, 'leads.ver') then
      return jsonb_build_object('visible', false);
    end if;
    v_antes := v_antes - 'numero' - 'numero_propio' - 'telefono_principal';
    v_despues := v_despues - 'numero' - 'numero_propio' - 'telefono_principal';
    -- Nunca: cartera (quién la tiene), cliente_desde (sin grant), actualizado_en (ruido).
    v_claves := array['nombre', 'telefono_cc', 'tipo_lead_id', 'origen_lead_id', 'creado_por', 'ultimo_seguimiento_en', 'atributos_publicos',
                      'eliminado_en', 'lote_papelera_id', 'creado_en'];
    if public._lead_vivo_en_mi_cartera(v_id) then
      v_claves := array_append(v_claves, 'atributos');
    end if;
  else
    if v_clase = 'entidad' and not public._actividad_puede_ver_fila(p_tabla, p_registro, coalesce(p_despues, p_antes)) then
      return jsonb_build_object('visible', false);
    end if;
    -- Las columnas de la tabla que authenticated puede leer (una columna nueva sin grant no sale), menos ruido y secretos.
    select coalesce(array_agg(a.attname::text), '{}') into v_claves
      from pg_catalog.pg_attribute a
     where a.attrelid = to_regclass('public.' || quote_ident(p_tabla)) and a.attnum > 0 and not a.attisdropped
       and has_column_privilege('authenticated', a.attrelid, a.attnum, 'select')
       and a.attname not in ('actualizado_en', 'clave_hash', 'apibara_raw');
  end if;
  select coalesce(jsonb_object_agg(k, jsonb_build_object('antes', v_antes -> k, 'despues', v_despues -> k)), '{}'::jsonb) into v_cambios
    from unnest(v_claves) k
   where nullif(v_antes -> k, 'null'::jsonb) is distinct from nullif(v_despues -> k, 'null'::jsonb);
  return jsonb_build_object('visible', true, 'cambios', v_cambios);
end;
$$;

-- El diff de un cambio de la actividad. Sin `actividad.ver`, 42501 antes de leer nada. Inexistente, purgado o sin acceso: `{id, visible: false}`
-- (no dice si existe). Nunca devuelve `detalle`, `antes` ni `despues` en bruto.
create function public.actividad_diff(p_id bigint) returns jsonb
  language plpgsql stable security definer
  set search_path = ''
as $$
declare
  a public.actividad;
  v jsonb;
begin
  if not public.tiene_permiso('actividad.ver') then
    raise exception 'No tienes permiso para ver la actividad.' using errcode = '42501';
  end if;
  -- actividad_pkey
  select x.* into a from public.actividad x where x.id = p_id;
  if not found then
    return jsonb_build_object('id', p_id, 'visible', false);
  end if;
  v := public._actividad_recortar(a.tabla, a.registro_id, a.antes, a.despues);
  if not (v ->> 'visible')::boolean then
    return jsonb_build_object('id', p_id, 'visible', false);
  end if;
  return jsonb_build_object(
    'id', a.id, 'accion', a.accion, 'tabla', a.tabla, 'registro_id', a.registro_id, 'actor_id', a.actor_id,
    'actor_nombre', (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = a.actor_id),
    'creado_en', a.creado_en, 'visible', true, 'cambios', v -> 'cambios');
end;
$$;

revoke all on function public._actividad_recorte(text) from public, anon, authenticated;
revoke all on function public._actividad_puede_ver_fila(text, text, jsonb) from public, anon, authenticated;
revoke all on function public._actividad_recortar(text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.actividad_diff(bigint) from public, anon, authenticated;
grant execute on function public.actividad_diff(bigint) to authenticated, service_role;

comment on function public._actividad_recorte(text) is
  'La lista cerrada de la actividad (9.01-1): lead, entidad, configuracion o null (no se muestra). Una tabla con trigger auditar nueva se declara aquí o areas/actividad/actividad.sql cae.';
comment on function public._actividad_puede_ver_fila(text, text, jsonb) is
  'Espejo de la policy «leer» de una entidad auditada sobre la foto del cambio o, sin foto, sobre la fila vigente (9.01-1).';
comment on function public._actividad_recortar(text, text, jsonb, jsonb) is
  'El recorte de un cambio de la actividad (9.01-1): sólo claves que cambiaron y que quien mira puede ver; de un lead, nunca su número ni su teléfono.';
comment on function public.actividad_diff(bigint) is
  'El diff de un cambio de la actividad, recortado (9.01-1). Pide actividad.ver (42501). {id, visible: false} si no existe o no se ve.';
