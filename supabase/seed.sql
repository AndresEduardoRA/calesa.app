-- Seed: lo que un despliegue nuevo necesita para arrancar. Sin usuarios (el primero que se
-- registra es el dueño). Catálogo de permisos (FIJO POR CÓDIGO), rol dueño, monedas, tipos de cambio y tres
-- orígenes de ejemplo con su flujo. Las fórmulas del cotizador (con su diseño y su visibilidad) y las estadísticas
-- iniciales viven en `supabase/semillas/` y corren después, en el orden de `config.toml` (`[db.seed] sql_paths`).

-- ---------------------------------------------------------------------------
-- Empresa
-- ---------------------------------------------------------------------------
insert into public.ajustes_empresa (id, telefono_cc) values (1, '+591') on conflict do nothing;
insert into public.ajustes_web (id) values (1) on conflict do nothing;
insert into public.monedas (codigo, nombre, simbolo, decimales, orden) values
  ('USD', 'Dólar estadounidense', '$', 2, 0),
  ('BOB', 'Boliviano', 'Bs', 2, 1)
on conflict do nothing;
-- Los de las capturas del cotizador actual (`docs/referencias/cotizador-actual.md`: «Of 11,68 · Par 12,20», el unificado en 12,2). La aduana se paga al
-- oficial, y nace con su valor para que un modo «Aduana» tenga de dónde leerlo. Sólo el oficial es el por defecto (uno por par de monedas).
insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, es_default, orden) values
  ('oficial', 'Oficial', 'USD', 'BOB', 11.68, true, 0),
  ('paralelo', 'Paralelo', 'USD', 'BOB', 12.20, false, 1),
  ('unificado', 'Unificado', 'USD', 'BOB', 12.20, false, 2),
  ('aduana', 'Aduana', 'USD', 'BOB', 11.68, false, 3)
on conflict do nothing;
insert into public.integraciones (clave, activa, config) values
  ('apibara', false, '{"plataformas": ["copart", "iaai"], "endpoint": "https://apibara.tech/api/v1/vehicle-auction"}'),
  ('push_web', false, '{}'),
  ('web_publica', false, '{"revalidar_url": null}')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Catálogo de permisos (cada clave tiene su punto de enforcement en policies o RPC)
-- ---------------------------------------------------------------------------
insert into public.permisos (clave, modulo, nombre, descripcion, por_origen, con_alcance, aplicado_en, orden) values
  ('equipo.usuarios.ver', 'equipo', 'Ver el equipo', 'Ver la lista de personas y sus roles', false, false, 'UI', 10),
  ('equipo.usuarios.gestionar', 'equipo', 'Gestionar usuarios', 'Invitar, asignar roles, bloquear, dar de baja', false, false, 'rbac_asignar_rol, rbac_quitar_rol, equipo_bloquear, equipo_dar_de_baja, equipo_vista_previa_baja', 20),
  ('equipo.roles.ver', 'equipo', 'Ver roles', 'Ver la matriz de roles y permisos', false, false, 'UI', 30),
  ('equipo.roles.gestionar', 'equipo', 'Gestionar roles', 'Crear roles y otorgar permisos (sólo los que uno tiene)', false, false, 'rbac_crear_rol, rbac_otorgar, rbac_revocar, rbac_eliminar_rol, permisos_efectivos', 40),
  ('empresa.ajustes.gestionar', 'empresa', 'Ajustes de la empresa', 'Marca, datos legales, registro abierto, integraciones', false, false, 'empresa_guardar_ajustes, integracion_guardar, integracion_guardar_secreto, storage marca', 50),
  ('empresa.tipos_cambio.gestionar', 'empresa', 'Tipos de cambio', 'Monedas y tipos de cambio', false, false, 'moneda_guardar, tipo_cambio_guardar, policy tipos_cambio_historial', 60),
  ('origenes.gestionar', 'origenes', 'Gestionar orígenes', 'Crear orígenes, su layout de campos y categorías', false, false, 'origen_crear, origen_guardar, origen_eliminar, origen_campo_*, categoria_*, origenes_resumen', 70),
  ('vehiculos.ver', 'vehiculos', 'Ver vehículos', 'Ver el inventario (por origen; propios = creados por mí o vinculados a mis leads)', true, true, 'policy vehiculos, puede_vehiculo', 80),
  ('vehiculos.crear', 'vehiculos', 'Crear vehículos', 'Dar de alta vehículos (por origen)', true, false, 'vehiculo_crear', 90),
  ('vehiculos.editar', 'vehiculos', 'Editar vehículos', 'Editar la ficha y las fotos, y vincular a un lead (por origen y alcance)', true, true, 'vehiculo_guardar, vehiculo_fotos_agregar, vehiculo_foto_*, vehiculo_vincular, policy storage vehiculos, puede_vehiculo', 100),
  ('vehiculos.eliminar', 'vehiculos', 'Enviar vehículos a la papelera', 'Enviar a la papelera (por origen y alcance)', true, true, 'vehiculos_papelera_enviar, vehiculos_con_permiso', 110),
  ('vehiculos.vitrina', 'vehiculos', 'Publicar en la web', 'Poner vehículos en la vitrina del sitio público (por origen)', true, false, 'vehiculo_vitrina', 120),
  ('vehiculos.papelera.purgar', 'vehiculos', 'Vaciar la papelera', 'Ver toda la papelera, restaurar y purgar antes de tiempo', false, false, 'vehiculos_papelera_*, papelera_* (cotizaciones), policy lotes_papelera', 130),
  ('leads.ver', 'leads', 'Ver leads', 'Ver leads (propios = mi cartera; todos = de todos, teléfono enmascarado); marcar los que ve como favoritos, tachados o con etiquetas propias', false, true, 'puede_lead, lead_favorito_poner, lead_tachado_poner, lead_etiquetas_poner', 140),
  ('leads.numero_global.ver', 'leads', 'Ver el número global de los leads', 'Ver el número global de cada lead (el consecutivo de toda la empresa). Sin este permiso se ve sólo el número propio, y sólo de los leads que se crearon', false, false, 'policy leads_numeros_globales, policy leads_numeros_propios', 145),
  ('leads.crear', 'leads', 'Crear leads', 'Registrar leads', false, false, 'crear_lead', 150),
  ('leads.editar', 'leads', 'Editar leads', 'Editar leads, seguimientos y oportunidades; marcar su interés en un vehículo', false, true, 'puede_actuar_lead, seguimiento_*, recordatorio_crear (con lead), oportunidad_*, vehiculo_interesado_marcar, vehiculo_interesado_quitar, vehiculo_vincular', 160),
  ('leads.compartir', 'leads', 'Compartir leads', 'Dar y quitar acceso compartido (propios = los leads de los que soy dueño; todos = cualquiera que veo)', false, true, 'lead_compartir, lead_revocar_acceso, lead_cartera_candidatos', 170),
  ('leads.transferir', 'leads', 'Transferir leads', 'Cambiar el dueño de un lead (propios = sólo los míos)', false, true, 'lead_transferir, lead_cartera_candidatos', 180),
  ('leads.eliminar', 'leads', 'Enviar leads a la papelera', 'Enviar leads a la papelera (propios = los míos como dueño)', false, true, 'leads_papelera_enviar', 190),
  ('leads.papelera.purgar', 'leads', 'Vaciar la papelera de leads', 'Ver toda la papelera de leads, restaurar y purgar antes de tiempo', false, false, 'leads_papelera_*, policy lotes_papelera', 195),
  ('leads.portal.gestionar', 'leads', 'Acceso al portal', 'Otorgar y revocar el acceso del cliente al portal', false, true, 'otorgar_portal, revocar_portal, policy accesos_portal', 200),
  ('leads.exportar', 'leads', 'Exportar leads', 'Descargar en CSV los leads de mi cartera que muestra el listado', false, false, 'leads_exportacion_registrar', 205),
  ('leads.configurar', 'leads', 'Configurar leads', 'Los campos de los leads, los orígenes de lead, los tipos de lead y los tipos de seguimiento', false, false, 'lead_campo_*, origen_lead_*, origenes_lead_con_uso, tipo_lead_*, tipos_lead_con_uso, tipo_seguimiento_*, tipos_seguimiento_con_uso', 210),
  ('cotizaciones.ver', 'cotizaciones', 'Ver cotizaciones', 'Ver cotizaciones (por origen; propios = mías o de mis leads)', true, true, 'puede_cotizacion', 220),
  ('cotizaciones.crear', 'cotizaciones', 'Cotizar', 'Crear cotizaciones preventa (por origen)', true, false, 'policy cotizaciones insert', 230),
  ('cotizaciones.editar', 'cotizaciones', 'Editar cotizaciones', 'Editar preventas, adjuntar, comentar (por origen y alcance)', true, true, 'puede_cotizacion', 240),
  ('cotizaciones.final.gestionar', 'cotizaciones', 'Cerrar cotización final', 'Marcar la final de un vehículo y editarla', true, false, 'cotizacion_marcar_final', 250),
  ('cotizaciones.configurar', 'cotizaciones', 'Configurar el cotizador', 'Fórmulas, constantes, tablas de referencia y plantilla (por origen)', true, false, 'formula_*, plantilla_*, tono_*, policy tablas_referencia', 260),
  ('cotizaciones.moderar', 'cotizaciones', 'Moderar cotizaciones', 'Invalidar, resolver reportes, borrar comentarios ajenos', false, false, 'cotizacion_moderar', 270),
  ('cotizaciones.comprobantes.emitir', 'cotizaciones', 'Emitir comprobantes', 'Emitir y anular comprobantes de venta', false, false, 'comprobante_emitir', 280),
  ('flujos.configurar', 'flujos', 'Configurar el flujo', 'Fases, transiciones, requisitos y reglas del flujo (por origen)', true, false, 'puede_configurar_flujo', 290),
  ('flujos.mover', 'flujos', 'Mover de fase', 'Mover vehículos por el flujo (por origen; además deben permitirlo los roles de la fase)', true, false, 'cambiar_fase', 300),
  ('flujos.mover.cualquiera', 'flujos', 'Mover sin restricción de rol', 'Mover aunque la fase limite los roles (por origen)', true, false, '_puede_mover', 310),
  ('logistica.ver', 'logistica', 'Ver logística', 'Ver documentos, transporte, historial y notas (por origen y alcance)', true, true, 'puede_unidad', 320),
  ('logistica.documentos.subir', 'logistica', 'Subir documentos', 'Subir documentos de un vehículo (por origen)', true, true, 'policy documentos', 330),
  ('logistica.documentos.aprobar', 'logistica', 'Aprobar documentos', 'Aprobar o rechazar documentos (por origen)', true, true, 'policy documentos', 340),
  ('logistica.transporte.editar', 'logistica', 'Editar transporte', 'Naviera, puertos, contenedor, booking y fechas (por origen)', true, true, 'policy transportes', 350),
  ('logistica.aduana.gestionar', 'logistica', 'Gestionar aduana', 'Declaraciones y su composición', false, false, 'policy declaraciones_*', 360),
  ('logistica.gastos.ver', 'logistica', 'Ver gastos', 'Ver los gastos reales (por origen)', true, true, 'policy gastos', 370),
  ('logistica.gastos.editar', 'logistica', 'Registrar gastos', 'Cargar y editar gastos (por origen)', true, true, 'policy gastos', 380),
  ('logistica.pagos.ver', 'logistica', 'Ver pagos', 'Ver pagos del cliente (por origen)', true, true, 'policy pagos', 390),
  ('logistica.pagos.editar', 'logistica', 'Registrar pagos', 'Cargar y editar pagos no confirmados (por origen)', true, true, 'policy pagos', 400),
  ('logistica.pagos.confirmar', 'logistica', 'Confirmar pagos', 'Confirmar pagos (queda sellado)', false, false, 'pago_confirmar', 410),
  ('logistica.margen.ver', 'logistica', 'Ver margen', 'Ver desviación y margen por vehículo (por origen)', true, false, 'margen_vehiculo', 420),
  ('logistica.catalogos.gestionar', 'logistica', 'Catálogos de logística', 'Puertos, navieras, categorías de gasto, tipos de documento globales', false, false, 'policy puertos, navieras, categorias_gasto, tipos_documento', 430),
  ('repuestos.ver', 'repuestos', 'Ver repuestos', 'Proyectos, ítems, documentos y stock', false, false, 'policy repuestos_*', 440),
  ('repuestos.editar', 'repuestos', 'Editar repuestos', 'Crear y editar proyectos e ítems', false, false, 'policy repuestos_*', 450),
  ('repuestos.mover', 'repuestos', 'Mover repuestos de fase', 'Mover ítems por el flujo de repuestos', false, false, 'cambiar_fase', 460),
  ('repuestos.documentos.subir', 'repuestos', 'Subir documentos de repuestos', 'Subir documentos de un ítem', false, false, 'policy documentos', 470),
  ('repuestos.documentos.aprobar', 'repuestos', 'Aprobar documentos de repuestos', 'Aprobar o rechazar', false, false, 'policy documentos', 480),
  ('repuestos.costos.ver', 'repuestos', 'Ver costos de repuestos', 'Compras, pagos y cotizaciones con costo', false, false, 'policy repuestos_compras', 490),
  ('repuestos.costos.editar', 'repuestos', 'Registrar costos de repuestos', 'Compras y pagos', false, false, 'policy repuestos_compras', 500),
  ('repuestos.cotizar', 'repuestos', 'Cotizar repuestos', 'Usar el cotizador de repuestos', false, false, 'policy repuestos_cotizaciones', 510),
  ('repuestos.configurar', 'repuestos', 'Configurar repuestos', 'Catálogos, flujo y cotizador de repuestos', false, false, 'puede_configurar_flujo, policy repuestos_catalogos', 520),
  ('agenda.eventos.publicar', 'agenda', 'Publicar eventos', 'Crear eventos visibles para todos o para seleccionados', false, false, 'policy eventos', 530),
  ('agenda.tareas.asignar', 'agenda', 'Dar tareas', 'Asignar tareas a otros', false, false, 'policy tareas, reasignar_tarea', 540),
  ('agenda.tareas.recibir', 'agenda', 'Recibir tareas', 'Puede ser responsable de tareas', false, false, 'tarea_validar', 550),
  ('agenda.ver_todo', 'agenda', 'Ver toda la agenda', 'Ver eventos y tareas de todos', false, false, 'puede_evento, policy tareas', 560),
  ('chat.participar', 'chat', 'Usar el chat', 'Conversar y crear grupos', false, false, 'policy mensajes, conversaciones', 570),
  ('chat.global', 'chat', 'Chat global', 'Entrar al canal de toda la empresa', false, false, 'policy conversaciones', 580),
  ('chat.moderar', 'chat', 'Moderar el chat', 'Borrar mensajes ajenos', false, false, 'policy mensajes', 590),
  ('notificaciones.push', 'notificaciones', 'Recibir push', 'Recibir notificaciones push', false, false, 'edge function push', 600),
  ('actividad.ver', 'actividad', 'Ver actividad', 'Ver el registro de actividad', false, false, 'policy actividad', 610),
  ('web.contenido.gestionar', 'web', 'Contenido de la web', 'Guías, preguntas, testimonios, categorías', false, false, 'policy web_*', 620),
  ('web.guias.publicar', 'web', 'Publicar guías', 'Publicar o despublicar guías', false, false, 'web_guia_publicar_validar', 630),
  ('web.ajustes.gestionar', 'web', 'Ajustes de la web', 'Lema, redes, legales, orígenes visibles, política de la cola', false, false, 'policy ajustes_web', 640),
  ('web.cola.gestionar', 'web', 'Gestionar la cola web', 'Habilitar asesores, cupos, prioridades; ver todas las solicitudes', false, false, 'cola_web_configurar', 650),
  ('web.cola.participar', 'web', 'Recibir turnos de la web', 'Estar en la rueda de turnos de la web. Sin este permiso no reciben turnos, aunque estén habilitadas', false, false, 'puede_estar_en_la_rueda: web.solicitar_asesor, web_expirar_solicitudes, estado_cola_web', 655),
  ('tablero.metricas.ver', 'tablero', 'Ver métricas', 'Tablero con métricas y gráficas', false, false, 'UI + vistas', 660),
  ('datos.exportar.todo', 'datos', 'Exportar todo', 'Exportar los datos de todos', false, false, 'UI + queries', 670),
  ('datos.importar.todo', 'datos', 'Importar para todos', 'Importar datos asignándolos a cualquiera', false, false, 'policy importaciones', 680)
on conflict (clave) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, por_origen = excluded.por_origen, con_alcance = excluded.con_alcance, aplicado_en = excluded.aplicado_en, modulo = excluded.modulo, orden = excluded.orden;

-- ---------------------------------------------------------------------------
-- Rol dueño (todo) y tres roles de ejemplo
-- ---------------------------------------------------------------------------
insert into public.roles (clave, nombre, color, es_sistema, orden) values ('dueno', 'Dueño', '#465fff', true, 0) on conflict (clave) do nothing;
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, p.clave, 'todos' from public.roles r cross join public.permisos p where r.clave = 'dueno'
on conflict do nothing;

insert into public.roles (clave, nombre, color, orden) values
  ('asesor', 'Asesor', '#027a48', 10), ('logistica', 'Logística', '#c7680a', 20), ('repuestos', 'Repuestos', '#7a5af8', 30)
on conflict (clave) do nothing;
insert into public.roles_permisos (rol_id, permiso_clave, alcance)
select r.id, x.clave, x.alcance::public.alcance_permiso from public.roles r cross join (values
  ('asesor', 'leads.ver', 'propios'), ('asesor', 'leads.crear', 'todos'), ('asesor', 'leads.editar', 'propios'), ('asesor', 'leads.compartir', 'propios'), ('asesor', 'leads.transferir', 'propios'), ('asesor', 'leads.eliminar', 'propios'), ('asesor', 'leads.portal.gestionar', 'propios'),
  ('asesor', 'vehiculos.ver', 'todos'), ('asesor', 'vehiculos.crear', 'todos'), ('asesor', 'vehiculos.editar', 'propios'),
  ('asesor', 'cotizaciones.ver', 'propios'), ('asesor', 'cotizaciones.crear', 'todos'), ('asesor', 'cotizaciones.editar', 'propios'),
  ('asesor', 'logistica.ver', 'propios'), ('asesor', 'logistica.pagos.ver', 'propios'),
  ('asesor', 'agenda.tareas.recibir', 'todos'), ('asesor', 'web.cola.participar', 'todos'), ('asesor', 'chat.participar', 'todos'), ('asesor', 'chat.global', 'todos'), ('asesor', 'notificaciones.push', 'todos'),
  ('logistica', 'vehiculos.ver', 'todos'), ('logistica', 'logistica.ver', 'todos'), ('logistica', 'flujos.mover', 'todos'), ('logistica', 'logistica.documentos.subir', 'todos'), ('logistica', 'logistica.documentos.aprobar', 'todos'),
  ('logistica', 'logistica.transporte.editar', 'todos'), ('logistica', 'logistica.aduana.gestionar', 'todos'), ('logistica', 'logistica.gastos.ver', 'todos'), ('logistica', 'logistica.gastos.editar', 'todos'),
  ('logistica', 'agenda.tareas.recibir', 'todos'), ('logistica', 'agenda.tareas.asignar', 'todos'), ('logistica', 'chat.participar', 'todos'), ('logistica', 'chat.global', 'todos'), ('logistica', 'notificaciones.push', 'todos'),
  ('repuestos', 'vehiculos.ver', 'todos'), ('repuestos', 'repuestos.ver', 'todos'), ('repuestos', 'repuestos.editar', 'todos'), ('repuestos', 'repuestos.mover', 'todos'), ('repuestos', 'repuestos.documentos.subir', 'todos'),
  ('repuestos', 'repuestos.documentos.aprobar', 'todos'), ('repuestos', 'repuestos.costos.ver', 'todos'), ('repuestos', 'repuestos.costos.editar', 'todos'), ('repuestos', 'repuestos.cotizar', 'todos'),
  ('repuestos', 'agenda.tareas.recibir', 'todos'), ('repuestos', 'chat.participar', 'todos'), ('repuestos', 'chat.global', 'todos'), ('repuestos', 'notificaciones.push', 'todos')
) as x (rol, clave, alcance) where r.clave = x.rol
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Catálogos de leads y logística
-- ---------------------------------------------------------------------------
insert into public.origenes_lead (clave, nombre, icono, orden) values ('facebook', 'Facebook', 'compartir', 0), ('web', 'Web', 'web', 1), ('referido', 'Referido', 'personas', 2), ('tiktok', 'TikTok', 'video', 3), ('oficina', 'Oficina', 'oficina', 4), ('otro', 'Otro', 'otro', 9) on conflict do nothing;
insert into public.tipos_seguimiento (clave, nombre, icono, orden) values ('whatsapp', 'WhatsApp', 'mensaje', 10), ('llamada', 'Llamada', 'telefono', 20), ('reunion', 'Reunión', 'personas', 30), ('email', 'Email', 'correo', 40), ('visita', 'Visita', 'ubicacion', 50), ('nota', 'Nota', 'nota', 60), ('otro', 'Otro', 'otro', 70) on conflict do nothing;
insert into public.categorias_gasto (nombre, proposito, orden) values ('Tributos aduaneros', 'tributos', 0), ('Flete marítimo', 'flete', 1), ('Grúa', 'grua', 2), ('Chapería', 'chaperia', 3), ('Despachante', 'despachante', 4), ('Otros', 'otro', 9) on conflict do nothing;
insert into public.tipos_documento (nombre, descripcion, orden, visible_portal_permitido, proposito) values
  ('Título', 'Título de propiedad', 0, true, 'titulo'), ('Factura de compra', 'Invoice de la subasta o del proveedor', 1, true, 'factura'),
  ('BL', 'Bill of lading', 2, true, 'bl'), ('Declaración de importación', 'DUI / declaración aduanera', 3, true, 'declaracion'),
  ('Comprobante de tributos', 'Pago de tributos aduaneros', 4, false, 'comprobante_tributos'), ('Evidencia fotográfica', 'Fotos con fecha (puerto, aduana, entrega)', 5, true, 'evidencia')
on conflict do nothing;
insert into public.puertos (nombre, pais, orden) values ('Iquique', 'Chile', 0), ('Arica', 'Chile', 1), ('Houston', 'Estados Unidos', 2), ('Los Ángeles', 'Estados Unidos', 3), ('Shanghái', 'China', 4) on conflict do nothing;
insert into public.repuestos_catalogos (catalogo, nombre, orden) values ('condicion', 'Nuevo original', 0), ('condicion', 'Reemplazo', 1), ('condicion', 'Usado', 2), ('modo_transporte', 'Aéreo', 0), ('modo_transporte', 'Marítimo', 1), ('modo_transporte', 'Compra local', 2) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Tres orígenes de ejemplo (los triggers crean flujo, reglas y campos). `planilla_usa` es el del Excel de cotización: compra en subasta como
-- `subasta_usa` (mismo tipo, mismas fases) con su propia fórmula; va último en el orden para que `subasta_usa` siga siendo el primero de su tipo.
-- ---------------------------------------------------------------------------
insert into public.origenes (clave, nombre, sustantivo, genero, tipo, color, orden, apibara_plataformas) values
  ('subasta_usa', 'Subasta EE. UU.', 'vehículo', 'm', 'subasta', '#465fff', 0, '{copart,iaai}'),
  ('oficina', 'Oficina', 'vehículo', 'm', 'manual', '#027a48', 1, '{}'),
  ('planilla_usa', 'Planilla EE. UU.', 'vehículo', 'm', 'subasta', '#7a5af8', 2, '{copart,iaai}')
on conflict (clave) do nothing;

-- Flujo de ejemplo para los orígenes de subasta (fases con transiciones lineales)
do $$
declare v_flujo uuid; f1 uuid; f2 uuid; f3 uuid; f4 uuid; f5 uuid; f6 uuid; f7 uuid; v_doc_titulo uuid; v_doc_bl uuid; v_doc_dui uuid; v_clave text;
begin
 foreach v_clave in array array['subasta_usa', 'planilla_usa'] loop
  select f.id into v_flujo from public.flujos f join public.origenes o on o.id = f.origen_id where o.clave = v_clave;
  if v_flujo is null or exists (select 1 from public.fases where flujo_id = v_flujo) then continue; end if;
  insert into public.fases (flujo_id, nombre, color, orden, es_inicial, es_logistica, publica_web, visible_portal, alias_portal, demora_dias) values (v_flujo, 'En subasta', '#465fff', 10, true, false, true, false, null, 0) returning id into f1;
  insert into public.fases (flujo_id, nombre, color, orden, es_logistica, visible_portal, alias_portal, demora_dias) values (v_flujo, 'Comprado', '#7a5af8', 20, true, true, 'Comprado en subasta', 7) returning id into f2;
  insert into public.fases (flujo_id, nombre, color, orden, es_logistica, visible_portal, alias_portal, demora_dias) values (v_flujo, 'En tránsito a puerto USA', '#c7680a', 30, true, true, 'En camino al puerto', 14) returning id into f3;
  insert into public.fases (flujo_id, nombre, color, orden, es_logistica, visible_portal, alias_portal, permite_contenedor, demora_dias) values (v_flujo, 'Embarcado', '#0e7490', 40, true, true, 'Navegando', true, 45) returning id into f4;
  insert into public.fases (flujo_id, nombre, color, orden, es_logistica, visible_portal, alias_portal, permite_aduana, demora_dias) values (v_flujo, 'En aduana', '#f04438', 50, true, true, 'En aduana', true, 10) returning id into f5;
  insert into public.fases (flujo_id, nombre, color, orden, es_logistica, visible_portal, alias_portal, cuenta_llegada_repuestos, demora_dias) values (v_flujo, 'En taller', '#f79009', 60, true, true, 'En preparación', true, 30) returning id into f6;
  insert into public.fases (flujo_id, nombre, color, orden, es_final, es_logistica, visible_portal, alias_portal, demora_dias) values (v_flujo, 'Entregado', '#027a48', 70, true, true, true, 'Entregado', 0) returning id into f7;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, accion) values
    (v_flujo, f1, f2, 'Marcar comprado'), (v_flujo, f2, f3, 'Salió hacia el puerto'), (v_flujo, f3, f4, 'Embarcar'), (v_flujo, f4, f5, 'Marcar llegó'), (v_flujo, f5, f6, 'Nacionalizado'), (v_flujo, f6, f7, 'Entregar'), (v_flujo, f6, f5, 'Volver a aduana');
  select id into v_doc_titulo from public.tipos_documento where nombre = 'Título' and flujo_id is null;
  select id into v_doc_bl from public.tipos_documento where nombre = 'BL' and flujo_id is null;
  select id into v_doc_dui from public.tipos_documento where nombre = 'Declaración de importación' and flujo_id is null;
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato, orden) values (f2, 'dato', true, 'vehiculo.cotizacion_final', 0), (f2, 'dato', true, 'vehiculo.lead', 1);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id, min_archivos, orden) values (f4, 'documento', true, v_doc_bl, 1, 0);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato, orden) values (f4, 'dato', true, 'transporte.contenedor', 1);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id, min_archivos, orden) values (f6, 'documento', true, v_doc_dui, 1, 0);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato, orden) values (f6, 'dato', true, 'aduana.tributos_pagados', 1);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id, min_archivos, orden) values (f7, 'documento', true, v_doc_titulo, 1, 0);
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato, config, orden) values (f7, 'dato', true, 'pagos.umbral_pct', '{"pct": 100}', 1);
 end loop;
end $$;

-- Flujo de ejemplo para oficina (venta en plaza: dos fases)
do $$
declare v_flujo uuid; f1 uuid; f2 uuid; f3 uuid;
begin
  select f.id into v_flujo from public.flujos f join public.origenes o on o.id = f.origen_id where o.clave = 'oficina';
  if v_flujo is null or exists (select 1 from public.fases where flujo_id = v_flujo) then return; end if;
  insert into public.fases (flujo_id, nombre, color, orden, es_inicial, es_logistica, publica_web, demora_dias) values (v_flujo, 'Disponible', '#027a48', 10, true, false, true, 0) returning id into f1;
  insert into public.fases (flujo_id, nombre, color, orden, es_logistica, visible_portal, alias_portal, demora_dias) values (v_flujo, 'Reservado', '#c7680a', 20, true, true, 'Reservado', 7) returning id into f2;
  insert into public.fases (flujo_id, nombre, color, orden, es_final, es_logistica, visible_portal, alias_portal) values (v_flujo, 'Vendido', '#465fff', 30, true, true, true, 'Entregado') returning id into f3;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, accion) values (v_flujo, f1, f2, 'Reservar'), (v_flujo, f2, f1, 'Liberar'), (v_flujo, f2, f3, 'Vender');
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato, orden) values (f2, 'dato', true, 'vehiculo.lead', 0), (f3, 'dato', true, 'vehiculo.cotizacion_final', 0), (f3, 'dato', true, 'pagos.confirmado', 1);
end $$;

-- Flujo de repuestos
do $$
declare v_flujo uuid; f1 uuid; f2 uuid; f3 uuid; f4 uuid; f5 uuid;
begin
  if exists (select 1 from public.flujos where ambito = 'repuestos') then return; end if;
  insert into public.flujos (ambito, nombre) values ('repuestos', 'Repuestos') returning id into v_flujo;
  insert into public.flujos_reglas (flujo_id, regla, activa) select v_flujo, r, true from unnest(array['logistica', 'alerta_demora', 'transporte', 'contenedor', 'gastos', 'pagos', 'esperas']) r;
  insert into public.fases (flujo_id, nombre, color, orden, es_inicial, demora_dias) values (v_flujo, 'Por cotizar', '#717c93', 10, true, 3) returning id into f1;
  insert into public.fases (flujo_id, nombre, color, orden, demora_dias) values (v_flujo, 'Comprado', '#7a5af8', 20, 7) returning id into f2;
  insert into public.fases (flujo_id, nombre, color, orden, permite_contenedor, demora_dias) values (v_flujo, 'En tránsito', '#c7680a', 30, true, 30) returning id into f3;
  insert into public.fases (flujo_id, nombre, color, orden, es_final) values (v_flujo, 'Recibido', '#027a48', 40, true) returning id into f4;
  insert into public.fases (flujo_id, nombre, color, orden, es_final) values (v_flujo, 'Perdido', '#f04438', 50, true) returning id into f5;
  insert into public.fases_transiciones (flujo_id, de_fase_id, a_fase_id, accion) values (v_flujo, f1, f2, 'Comprar'), (v_flujo, f2, f3, 'Despachar'), (v_flujo, f3, f4, 'Recibir'), (v_flujo, f3, f5, 'Dar por perdido');
  insert into public.fases_requisitos (fase_id, tipo, bloqueante, clave_dato, orden) values (f2, 'dato', true, 'repuesto.precio', 0), (f3, 'dato', false, 'repuesto.tracking', 0);
end $$;

-- Plantilla de tarjeta v1 (mínima) para cada origen
insert into public.plantillas_tarjeta (origen_id, version, estado, definicion, nota, publicado_en)
select o.id, 1, 'publicada',
  '{"paleta": {"fondo": "#ffffff", "tinta": "#1b2230", "acento": "#465fff"}, "columnas": [{"id": "etiqueta", "ancho": 640}, {"id": "monto", "ancho": 320}], "encabezado": {"logo": true, "titulo": "{{titulo}}", "fecha": "{{fecha}}"}, "grupos": [{"titulo": "Detalle", "filas": "secciones"}], "totales": [{"variable": "total", "formato": "usd"}], "pie": "Cotización válida por 7 días. Precios sujetos a cambio de tipo de cambio."}'::jsonb,
  'Plantilla inicial', now()
from public.origenes o where not exists (select 1 from public.plantillas_tarjeta p where p.origen_id = o.id);

-- Chat global
insert into public.conversaciones (tipo, nombre, es_global) select 'grupo', 'Equipo', true where not exists (select 1 from public.conversaciones where es_global);
