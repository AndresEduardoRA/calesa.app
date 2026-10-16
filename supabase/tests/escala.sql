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
    ('_leads_al_limbo_de', 'la baja de una persona mueve esos leads: el número es lo que se mueve (tope: los leads de una persona)'),
    ('equipo_vista_previa_baja', 'vista previa de una baja puntual (tope: los leads y oportunidades de una persona)'),
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
    ('_vehiculos_papelera_lote_json', 'las fotos de un vehículo (hasta 24) dentro de un lote de hasta 200'),
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
