# Mapa del proyecto

<!-- Generado por scripts/mapa.sh. No editar a mano: edita el CLAUDE.md de la unidad y regenera. -->

Léelo antes de buscar con grep. Cada unidad tiene su propio `CLAUDE.md`, que Claude Code
carga solo al tocar sus archivos. Los términos del negocio están en `docs/GLOSARIO.md`.

## Módulos (`src/modules/`)

Entre módulos solo se importa la API pública. Dentro de un módulo, rutas relativas.

### `actividad`
Auditoría inmutable de 14 días: qué cambió, quién, cuándo y el diff, con purga automática. · 1 archivos
- Depende de: ningún otro módulo

### `agenda`
Calendario de eventos, tareas con responsable, recordatorios de leads y subastas del inventario, con visibilidad y vínculos a lead, vehículo y cotización. · 1 archivos
- Depende de: ningún otro módulo

### `buscador`
Paleta global (Ctrl/Cmd+K) que busca leads, vehículos, cotizaciones y acciones acotada a los permisos del usuario, con últimos abiertos. · 1 archivos
- Depende de: ningún otro módulo

### `chat`
Mensajería interna: conversaciones directas (deduplicadas), grupos y canal global por permiso, menciones `#` de vehículos/leads/cotizaciones/personas, tareas y eventos desde el mensaje, realtime. · 1 archivos
- Depende de: ningún otro módulo

### `cotizaciones`
Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes. · 1 archivos
- Depende de: ningún otro módulo

### `datos`
Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe. · 1 archivos
- Depende de: ningún otro módulo

### `empresa`
Ajustes de la empresa (marca, datos legales, país, formato regional, zona horaria, políticas), monedas y tipos de cambio nombrados con historial, integraciones activables. · 80 archivos
- API: `registroDisponible`, `Ajustes`, `getAjustes`, `leerAjustes`, `leerMonedasYTiposCambio`, `huellaDelFormulario`, `PoliticaDeLimpieza`, `getPoliticaDeLimpieza`, `zonasHorarias`, `FormularioEmpresa`, +13
- Depende de: ningún otro módulo
- Casos de uso: empresa, iconos, integraciones, tipos-cambio

### `equipo`
Autenticación, perfiles, roles y permisos (RBAC puro), invitaciones, bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como». · 131 archivos
- API: `cerrarSiInactiva`, `getPermisos`, `requerirSesion`, `requerirSesionDeEnlace`, `nombreVisible`, `sinRol`, `Sesion`, `puede`, `ClavePermiso`, `Permisos`, +25
- API de cliente (`client.ts`): `RoleBadge`, `usePerspectiva`, `Perspectiva`, `RolParaVerComo`, `MenuDeVistas`, `ParamsDeVista`, `VistaGuardada`
- Depende de: empresa
- Casos de uso: auth, equipo, perfil, perspectiva, roles, vistas

### `flujos`
Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos. · 7 archivos
- API: `leerFasesDeOrigen`, `FaseResumen`
- API de cliente (`client.ts`): `FaseResumen`
- Depende de: ningún otro módulo

### `leads`
Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, **campos configurables** con quién los ve, seguimientos, recordatorios, etiquetas, favoritos/tachados, la cartera (compartir, transferir, quitar acceso y salir), la papelera, oportunidades en embudos, portal del cliente y limbo. · 459 archivos
- API: `leerContextoDeAlta`, `leerLayoutDeLeads`, `CLAVES_RESERVADAS_DE_LEAD`, `valorDefectoVigente`, `CampoDeLead`, `DatosDeLaEmpresa`, `AltaDeLead`, `ContextoDeAlta`, `EditorDeCamposDeLead`, `leerListadoDeLeads`, +37
- API de cliente (`client.ts`): `CLAVES_RESERVADAS_DE_LEAD`, `soloCarteraPorTipo`, `valorDefectoVigente`, `CampoDeLead`, `DatoDeLaEmpresa`, `DatosDeLaEmpresa`, `AltaDeLead`, `ContextoDeAlta`, `normalizarTelefono`, `telefonoParaMostrar`
- Depende de: equipo
- Casos de uso: alta, campos, cartera, embudo, etiquetas, exportar, ficha, importar, listado, marcas, oportunidades, papelera, portal, rapido, recordatorios, seguimientos, telefono

### `logistica`
Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final. · 1 archivos
- Depende de: ningún otro módulo

### `notificaciones`
Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por `notificar()`. · 1 archivos
- Depende de: ningún otro módulo

### `origenes`
Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos y sus categorías. Al crear uno nacen, por trigger y en la misma transacción, su flujo de logística (con sus reglas, sin fases) y los campos de su tipo. Uno de subasta nace con **un campo por cada dato normalizado que devuelve apibara** (el catálogo), todos encendidos. **No** nace una fórmula: «fórmula pendiente» es no tener una fila `publicada`. · 74 archivos
- API: `getOrigenes`, `OrigenResumen`, `leerDatosNuevosDeApibara`, `leerLayout`, `agruparCampos`, `tieneOpciones`, `CampoDeLayout`, `GrupoDeCampos`, `OpcionDeCampo`, `TipoDeCampo`, +15
- API de cliente (`client.ts`): `articulo`, `concordar`, `contados`, `frasePorVacio`, `generoSugerido`, `ninguno`, `pluralDe`, `Genero`, `OrigenResumen`, `TipoDeOrigen`, +9
- Depende de: ningún otro módulo
- Casos de uso: campos, categorias, origenes, pasos

### `repuestos`
Proyectos de repuestos por vehículo (o externos), ítems que recorren el flujo de repuestos con el mismo motor, imágenes, stock, compras con permiso de costos y un cotizador propio con configuración versionada. · 1 archivos
- Depende de: ningún otro módulo

### `tablero`
Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública. · 4 archivos
- API: `Bandeja`
- Depende de: ningún otro módulo
- Casos de uso: bandeja

### `vehiculos`
Inventario de vehículos por origen con atributos dinámicos: listado con filtros en la URL y vistas guardadas, ficha según el layout del origen, alta y edición en un panel, fotos (hasta 24, con portada), el vínculo a un lead con sus interesados (en la ficha del vehículo, con «Desvincular»; y la sección «Vehículos» de la ficha del lead, que vive acá), la vitrina (publicar en la web con precio público y vista previa de lo que verá el visitante) la papelera por lotes (enviar con «Deshacer», restaurar y purgar) y, en un origen de subasta con apibara encendida, el alta pegando un enlace de Copart o IAAI, un VIN o un lote (de a uno o varios), con sus fotos, y «Refrescar» la subasta desde la ficha; y la limpieza automática de lo importado de una subasta que nadie compró, con su aviso previo y «Conservar». · 213 archivos
- API: `buscarVehiculos`, `leerGaleria`, `leerRelaciones`, `leerSubasta`, `leerVehiculo`, `Vehiculo`, `Galeria`, `origenElegido`, `origenesVisibles`, `permisoDeAlta`, +57
- API de cliente (`client.ts`): `TarjetaVehiculo`, `BadgeDeFase`, `Vehiculo`
- Depende de: empresa, equipo, flujos, origenes
- Casos de uso: alta, ficha, fotos, limpieza, listado, papelera, permisos, subasta, vinculo, vitrina

### `web`
Lo que el CRM configura para la web pública y el portal del cliente: ajustes del sitio, guías, FAQs, testimonios con consentimiento, cola web round-robin («turnos»), vistas y RPC del esquema `web`, revalidación on-demand. · 4 archivos
- API: `leerDireccionPublica`
- Depende de: ningún otro módulo

## Compartido (`src/shared/`)

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

- `config/`: `app.ts`, `entorno.ts`
- `lib/`: `almacen.ts`, `apibara.ts`, `atajos.ts`, `borrador.ts`, `color.ts`, `enviar-accion.ts`, `errores.ts`, `fechas.ts`, `formato.ts`, `formularios.ts`, `imagenes.ts`, `navegacion.ts`, `paginacion.ts`, `permisos.ts`, `rutas.ts`, `safe-action.ts`, `utils.ts`
- `lib/campos/`: `agrupar.ts`, `cambios.ts`, `clave.ts`, `controles.ts`, `esquema-de-valor.ts`, `esquemas.ts`, `impacto.ts`, `index.ts`, `mostrar.ts`, `motivos.ts`, `orden.ts`, `tipos.ts`, `valor-defecto.ts`, `valor.ts`
- `lib/csv/`: `descargar.ts`, `escribir.ts`, `leer.ts`
- `lib/filtros/`: `campos.ts`, `chips.ts`, `esquema.ts`, `index.ts`, `opciones.ts`, `url.ts`
- `lib/supabase/`: `admin.ts`, `almacen.client.ts`, `browser.ts`, `consultas.ts`, `funciones.client.ts`, `proxy.ts`, `server.ts`
- `types/`: `database.types.ts`
- `ui/`: `avatar.tsx`, `aviso-de-conflicto.tsx`, `aviso.tsx`, `avisos-del-formulario.tsx`, `badge.tsx`, `bloque.tsx`, `button.tsx`, `campo-seleccion.tsx`, `campo.tsx`, `checkbox.tsx`, `command.tsx`, `confirmar-descarte.tsx`, `confirmar.tsx`, `conmutador-tema.tsx`, `densidad.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `estilo-de-marca.tsx`, `guion-live.tsx`, `input-group.tsx`, `input.tsx`, `interruptor.tsx`, `label.tsx`, `live.ts`, `marca.tsx`, `modal-de-formulario.tsx`, `modal.tsx`, `monto.tsx`, `opciones.tsx`, `paginacion.tsx`, `pie-del-panel.tsx`, `popover.tsx`, `regional.tsx`, `registrar-service-worker.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toasts.ts`, `tooltip.tsx`, `transicion-pagina.tsx`, `use-abierto-alguna-vez.ts`, `use-apertura.ts`, `use-borrador-de-estado.ts`, `use-borrador.ts`, `use-cierre-con-cambios.ts`, `use-conflicto-hasta-la-version.ts`, `use-consulta-de-medios.ts`, `use-en-linea.ts`, `use-reintento-al-volver.ts`, `use-revision-al-abrir.ts`, `use-ultimo.ts`, `use-un-envio-a-la-vez.ts`, `zona-de-archivos.tsx`
- `ui/atajos/`: `index.ts`, `proveedor-atajos.tsx`, `use-atajo.ts`
- `ui/campos/`: `aviso-de-impacto.tsx`, `bloque-de-campos.tsx`, `campo-de-formulario.tsx`, `campo-valor-defecto.tsx`, `campos-de-campo.tsx`, `campos-desactivados.tsx`, `cerrar-con-aviso.ts`, `datos-por-grupo.tsx`, `ediciones.ts`, `editor-de-campos.tsx`, `editor-de-opciones.tsx`, `fila-de-campo.tsx`, `formulario-de-campo.tsx`, `grupos-de-campos.tsx`, `index.ts`, `panel-de-campo.tsx`, `pie-del-formulario.tsx`, `tipos.ts`, `use-formulario-de-campo.ts`, `valor-mostrado.tsx`
- `ui/esqueletos/`: `esqueleto-bandeja.tsx`, `esqueleto-detalle.tsx`, `esqueleto-formulario.tsx`, `esqueleto-listado.tsx`, `esqueleto-tabla.tsx`, `index.ts`
- `ui/estados/`: `estado-error.tsx`, `estado-pagina-sin-filas.tsx`, `estado-sin-permiso.tsx`, `estado-sin-resultados.tsx`, `estado-vacio.tsx`, `index.ts`, `marco-estado.tsx`
- `ui/filtros/`: `chips-de-filtros.tsx`, `contexto.ts`, `controles.tsx`, `estilos.ts`, `filter-shell.tsx`, `index.ts`, `panel-de-filtros.tsx`, `radios.tsx`, `use-filtros.ts`

## Rutas

- `/` — página
- `/auth/callback` — API
- `/auth/cerrar` — API
- `/auth/nueva-contrasena` — página
- `/configuracion/empresa` — página
- `/configuracion/equipo` — página
- `/configuracion/leads` — página
- `/configuracion/origenes/[id]` — página
- `/configuracion/origenes` — página
- `/configuracion/roles` — página
- `/configuracion` — página
- `/iconos/vigente/[tamano]` — API
- `/ingreso` — página
- `/leads/[id]` — página
- `/leads/exportar` — API
- `/leads/importar` — página
- `/leads/papelera` — página
- `/leads` — página
- `/perfil` — página
- `/recuperar` — página
- `/registro` — página
- `/vehiculos/[id]` — página
- `/vehiculos/papelera` — página
- `/vehiculos` — página

## Tablas (supabase/schemas)

- `ajustes_empresa` — `supabase/schemas/01_empresa/01_empresa.sql`
- `monedas` — `supabase/schemas/01_empresa/01_empresa.sql`
- `tipos_cambio` — `supabase/schemas/01_empresa/01_empresa.sql`
- `tipos_cambio_historial` — `supabase/schemas/01_empresa/01_empresa.sql`
- `integraciones` — `supabase/schemas/01_empresa/01_empresa.sql`
- `perfiles` — `supabase/schemas/02_equipo/01_equipo.sql`
- `roles` — `supabase/schemas/02_equipo/01_equipo.sql`
- `permisos` — `supabase/schemas/02_equipo/01_equipo.sql`
- `roles_permisos` — `supabase/schemas/02_equipo/01_equipo.sql`
- `usuarios_roles` — `supabase/schemas/02_equipo/01_equipo.sql`
- `preferencias_usuario` — `supabase/schemas/02_equipo/01_equipo.sql`
- `vistas_guardadas` — `supabase/schemas/02_equipo/01_equipo.sql`
- `visitados` — `supabase/schemas/02_equipo/01_equipo.sql`
- `origenes` — `supabase/schemas/03_origenes/01_origenes.sql`
- `origenes_campos` — `supabase/schemas/03_origenes/01_origenes.sql`
- `categorias` — `supabase/schemas/03_origenes/01_origenes.sql`
- `flujos` — `supabase/schemas/04_flujos/01_flujos.sql`
- `flujos_reglas` — `supabase/schemas/04_flujos/01_flujos.sql`
- `fases` — `supabase/schemas/04_flujos/01_flujos.sql`
- `fases_transiciones` — `supabase/schemas/04_flujos/01_flujos.sql`
- `fases_roles` — `supabase/schemas/04_flujos/01_flujos.sql`
- `fases_transiciones_roles` — `supabase/schemas/04_flujos/01_flujos.sql`
- `tipos_documento` — `supabase/schemas/04_flujos/01_flujos.sql`
- `fases_requisitos` — `supabase/schemas/04_flujos/01_flujos.sql`
- `historial_fases` — `supabase/schemas/04_flujos/01_flujos.sql`
- `origenes_lead` — `supabase/schemas/05_leads/01_leads.sql`
- `lotes_papelera` — `supabase/schemas/05_leads/01_leads.sql`
- `leads` — `supabase/schemas/05_leads/01_leads.sql`
- `leads_campos` — `supabase/schemas/05_leads/01_leads.sql`
- `leads_telefonos` — `supabase/schemas/05_leads/01_leads.sql`
- `leads_asesores` — `supabase/schemas/05_leads/01_leads.sql`
- `leads_favoritos` — `supabase/schemas/05_leads/01_leads.sql`
- `leads_tachados` — `supabase/schemas/05_leads/01_leads.sql`
- `etiquetas` — `supabase/schemas/05_leads/01_leads.sql`
- `leads_etiquetas` — `supabase/schemas/05_leads/01_leads.sql`
- `tipos_seguimiento` — `supabase/schemas/05_leads/01_leads.sql`
- `seguimientos` — `supabase/schemas/05_leads/01_leads.sql`
- `recordatorios` — `supabase/schemas/05_leads/01_leads.sql`
- `embudos` — `supabase/schemas/05_leads/01_leads.sql`
- `embudos_etapas` — `supabase/schemas/05_leads/01_leads.sql`
- `oportunidades` — `supabase/schemas/05_leads/01_leads.sql`
- `oportunidades_historial` — `supabase/schemas/05_leads/01_leads.sql`
- `accesos_portal` — `supabase/schemas/05_leads/01_leads.sql`
- `vehiculos` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `apibara_consultas` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `vehiculos_imagenes` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `vehiculos_imagenes_version` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `vehiculos_interesados` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `vehiculos_vinculos` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `cola_gc_storage` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `cola_gc_pases` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `vehiculos_conservados` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `limpieza_corridas` — `supabase/schemas/06_vehiculos/01_vehiculos.sql`
- `formulas` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `tablas_referencia` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `tablas_referencia_filas` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `plantillas_tarjeta` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `cotizaciones` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `cotizaciones_revisiones` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `cotizaciones_comentarios` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `cotizaciones_adjuntos` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `cotizaciones_reportes` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `cotizaciones_favoritos` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `comprobantes_contadores` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `comprobantes` — `supabase/schemas/07_cotizaciones/01_cotizaciones.sql`
- `repuestos_catalogos` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_proyectos` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_items` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_items_imagenes` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_stock_movimientos` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_compras` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_cotizador_config` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_tramos_logistica` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_cajas` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_cotizaciones` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `repuestos_cotizaciones_lineas` — `supabase/schemas/08_repuestos/01_repuestos.sql`
- `documentos` — `supabase/schemas/09_logistica/01_logistica.sql`
- `puertos` — `supabase/schemas/09_logistica/01_logistica.sql`
- `navieras` — `supabase/schemas/09_logistica/01_logistica.sql`
- `transportes` — `supabase/schemas/09_logistica/01_logistica.sql`
- `flujos_transporte_oferta` — `supabase/schemas/09_logistica/01_logistica.sql`
- `declaraciones_aduana` — `supabase/schemas/09_logistica/01_logistica.sql`
- `declaraciones_vehiculos` — `supabase/schemas/09_logistica/01_logistica.sql`
- `categorias_gasto` — `supabase/schemas/09_logistica/01_logistica.sql`
- `gastos` — `supabase/schemas/09_logistica/01_logistica.sql`
- `pagos` — `supabase/schemas/09_logistica/01_logistica.sql`
- `notas` — `supabase/schemas/09_logistica/01_logistica.sql`
- `eventos` — `supabase/schemas/10_agenda/01_agenda.sql`
- `eventos_destinatarios` — `supabase/schemas/10_agenda/01_agenda.sql`
- `tareas` — `supabase/schemas/10_agenda/01_agenda.sql`
- `conversaciones` — `supabase/schemas/11_chat/01_chat.sql`
- `conversaciones_miembros` — `supabase/schemas/11_chat/01_chat.sql`
- `mensajes` — `supabase/schemas/11_chat/01_chat.sql`
- `mensajes_menciones` — `supabase/schemas/11_chat/01_chat.sql`
- `notificaciones` — `supabase/schemas/12_notificaciones/01_notificaciones.sql`
- `suscripciones_push` — `supabase/schemas/12_notificaciones/01_notificaciones.sql`
- `actividad` — `supabase/schemas/13_actividad/01_actividad.sql`
- `ajustes_web` — `supabase/schemas/14_web/01_web.sql`
- `web_categorias_guias` — `supabase/schemas/14_web/01_web.sql`
- `web_guias` — `supabase/schemas/14_web/01_web.sql`
- `web_faqs` — `supabase/schemas/14_web/01_web.sql`
- `web_testimonios` — `supabase/schemas/14_web/01_web.sql`
- `cola_web_asesores` — `supabase/schemas/14_web/01_web.sql`
- `solicitudes_contacto_web` — `supabase/schemas/14_web/01_web.sql`
- `eventos_web` — `supabase/schemas/14_web/01_web.sql`
- `importaciones` — `supabase/schemas/15_datos/01_datos.sql`
- `importaciones_leads` — `supabase/schemas/15_datos/01_datos.sql`

## Reglas que se cargan solas (.claude/rules)

- `acciones.md` → `'src/modules/*/features/**/actions/**'`, `'src/app/api/**'`
- `datos.md` → `'src/modules/*/infra/**'`, `'src/shared/lib/supabase/**'`
- `migraciones.md` → `'supabase/**/*.sql'`, `'supabase/config.toml'`
- `modulos.md` → `'src/modules/**'`
- `ui.md` → `'src/app/**/*.tsx'`, `'src/modules/**/features/**/*.tsx'`, `'src/shared/ui/**'`

