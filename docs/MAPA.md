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
Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes. · 176 archivos
- API: `compilarExpresion`, `ContextoDeCompilacion`, `DestinoDeCompilacion`, `ErrorDeCompilacion`, `ResultadoDeCompilacion`, `Tramo`, `CODIGOS_DE_COMPILACION`, `CodigoDeCompilacion`, `MAXIMO_DE_TEXTO`, `validarDiseno`, +47
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `configuracion`: `NivelesDeAcceso`, `EsqueletoDeNiveles`
  - `cotizar`: `EsqueletoDeHoja`, `FormulaSinPublicar`, `PantallaDeCotizar`, `PestanasDeOrigen`
- Depende de: ningún otro módulo
- Casos de uso: hoja, niveles

### `datos`
Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe. · 1 archivos
- Depende de: ningún otro módulo

### `empresa`
Ajustes de la empresa (marca, datos legales, país, formato regional, zona horaria, políticas), monedas y tipos de cambio nombrados con historial, integraciones activables. · 83 archivos
- API: `registroDisponible`, `Ajustes`, `getAjustes`, `leerAjustes`, `leerMonedasYTiposCambio`, `huellaDelFormulario`, `PoliticaDeLimpieza`, `getPoliticaDeLimpieza`, `zonasHorarias`, `getTiposCambio`, +8
- API del shell (`shell.ts`, sólo el layout `(app)`): `getAjustes`, `getTiposCambio`, `TiposCambioVigentes`
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `configuracion-empresa`: `FormularioEmpresa`, `IconosDeLaApp`, `Integraciones`, `MonedasYTiposCambio`
- Depende de: ningún otro módulo
- Casos de uso: empresa, iconos, integraciones, tipos-cambio

### `equipo`
Autenticación, perfiles, roles y permisos (RBAC puro), invitaciones, bloqueo, baja con limbo de leads, preferencias y perspectiva «ver como». · 153 archivos
- API: `cerrarSiInactiva`, `getPermisos`, `requerirSesion`, `requerirSesionDeEnlace`, `nombreVisible`, `sinRol`, `Sesion`, `puede`, `ClavePermiso`, `Permisos`, +15
- API de cliente (`client.ts`): `RoleBadge`, `usePerspectiva`, `Perspectiva`, `RolParaVerComo`, `MenuDeVistas`, `ParamsDeVista`, `VistaGuardada`
- API del shell (`shell.ts`, sólo el layout `(app)`): `requerirSesion`, `nombreVisible`, `puede`, `cerrarSesion`, `ProveedorPreferencias`, `BannerPerspectiva`, `ProveedorPerspectiva`, `usePerspectiva`
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `equipo`: `ListaEquipo`
  - `ingreso`: `FormularioIngreso`
  - `nueva-contrasena`: `FormularioNuevaContrasena`
  - `perfil`: `FormularioPerfil`, `PreferenciasPerfil`
  - `recuperar`: `FormularioRecuperar`
  - `registro`: `FormularioRegistro`, `RegistroCerrado`
  - `roles`: `MatrizDeRoles`
- Depende de: empresa
- Casos de uso: auth, equipo, perfil, perspectiva, roles, vistas

### `flujos`
Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos. · 7 archivos
- API: `leerFasesDeOrigen`, `FaseResumen`
- API de cliente (`client.ts`): `FaseResumen`
- Depende de: ningún otro módulo

### `leads`
Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, **campos configurables** con quién los ve, seguimientos, recordatorios, etiquetas, favoritos/tachados, la cartera (compartir, transferir, quitar acceso y salir), la papelera, oportunidades en embudos, portal del cliente y limbo. · 628 archivos
- API: `leerContextoDeAlta`, `leerLayoutDeLeads`, `CLAVES_RESERVADAS_DE_LEAD`, `valorDefectoVigente`, `CampoDeLead`, `DatosDeLaEmpresa`, `ContextoDeAlta`, `leerOrigenesDeLeadConUso`, `leerTiposDeLeadConUso`, `leerTiposDeSeguimientoConUso`, +26
- API de cliente (`client.ts`): `CLAVES_RESERVADAS_DE_LEAD`, `soloCarteraPorTipo`, `valorDefectoVigente`, `CampoDeLead`, `DatoDeLaEmpresa`, `DatosDeLaEmpresa`, `AltaDeLead`, `ContextoDeAlta`, `normalizarTelefono`, `telefonoParaMostrar`
- API del shell (`shell.ts`, sólo el layout `(app)`): `AltaDeLead`
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `configuracion`: `EditorDeCamposDeLead`, `OrigenesDeLead`, `EsqueletoDeOrigenes`, `TiposDeLead`, `EsqueletoDeTipos`, `TiposDeSeguimiento`, `EsqueletoDeTiposDeSeguimiento`
  - `ficha`: `FichaDeLead`, `LeadNoDisponible`, `SeccionSeguimientos`, `EsqueletoDeSeguimientos`, `SeccionOportunidades`, `EsqueletoDeOportunidades`, `SeccionPortal`, `EsqueletoDePortal`
  - `importar`: `AsistenteDeImportacion`, `ImportacionesRecientes`
  - `listado`: `ListadoDeLeads`, `VistaDeEmbudo`, `EsqueletoDeTablero`
  - `papelera`: `PapeleraDeLeads`
- Depende de: equipo
- Casos de uso: alta, campos, cartera, embudo, etiquetas, exportar, ficha, importar, listado, marcas, oportunidades, origenes, papelera, portal, rapido, recordatorios, seguimientos, telefono, tipos, tipos-de-seguimiento

### `logistica`
Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final. · 1 archivos
- Depende de: ningún otro módulo

### `notificaciones`
Campana in-app con «requiere acción», realtime, web push (VAPID) y preferencias por usuario; todo lo que avisa pasa por `notificar()`. · 1 archivos
- Depende de: ningún otro módulo

### `origenes`
Orígenes de vehículos configurables (subasta/apibara o manual), su layout de campos y sus categorías. Al crear uno nacen, por trigger y en la misma transacción, su flujo de logística (con sus reglas, sin fases) y los campos de su tipo. Uno de subasta nace con **un campo por cada dato normalizado que devuelve apibara** (el catálogo), todos encendidos. **No** nace una fórmula: «fórmula pendiente» es no tener una fila `publicada`. · 77 archivos
- API: `getOrigenes`, `OrigenResumen`, `leerDatosNuevosDeApibara`, `leerLayout`, `agruparCampos`, `tieneOpciones`, `CampoDeLayout`, `GrupoDeCampos`, `OpcionDeCampo`, `TipoDeCampo`, +9
- API de cliente (`client.ts`): `articulo`, `concordar`, `contados`, `frasePorVacio`, `generoSugerido`, `ninguno`, `pluralDe`, `Genero`, `OrigenResumen`, `TipoDeOrigen`, +9
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `origen`: `DatosDelOrigen`, `SiguientesPasos`, `EditorDeCampos`, `DatosNuevosDeApibara`, `ArbolDeCategorias`
  - `origenes`: `ListaDeOrigenes`
- Depende de: ningún otro módulo
- Casos de uso: campos, categorias, origenes, pasos

### `repuestos`
Proyectos de repuestos por vehículo (o externos), ítems que recorren el flujo de repuestos con el mismo motor, imágenes, stock, compras con permiso de costos y un cotizador propio con configuración versionada. · 1 archivos
- Depende de: ningún otro módulo

### `tablero`
Bandeja de inicio por rol y tablero de métricas con widgets personalizables por usuario; compone a los demás módulos por su API pública. · 5 archivos
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `inicio`: `Bandeja`
- Depende de: ningún otro módulo
- Casos de uso: bandeja

### `vehiculos`
Inventario de vehículos por origen con atributos dinámicos: listado con filtros en la URL y vistas guardadas, ficha según el layout del origen, alta y edición en un panel, fotos (hasta 24, con portada), el vínculo a un lead con sus interesados (en la ficha del vehículo, con «Desvincular»; y la sección «Vehículos» de la ficha del lead, que vive acá), la vitrina (publicar en la web con precio público y vista previa de lo que verá el visitante) la papelera por lotes (enviar con «Deshacer», restaurar y purgar) y, en un origen de subasta con apibara encendida, el alta pegando un enlace de Copart o IAAI, un VIN o un lote (de a uno o varios), con sus fotos, y «Refrescar» la subasta desde la ficha; y la limpieza automática de lo importado de una subasta que nadie compró, con su aviso previo y «Conservar». · 237 archivos
- API: `buscarVehiculos`, `leerGaleria`, `leerRelaciones`, `leerSubasta`, `leerVehiculo`, `MAXIMO_DE_PAGINA_DE_VEHICULOS`, `Vehiculo`, `Galeria`, `origenElegido`, `origenesVisibles`, +39
- API de cliente (`client.ts`): `TarjetaVehiculo`, `BadgeDeFase`, `Vehiculo`
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `ficha`: `AvisoDeLimpieza`, `BloqueDeSubasta`, `BotonDesvincular`, `VinculoEInteresados`, `EsqueletoDeFotos`, `SeccionDeFotos`, `BotonEditarVehiculo`, `CabeceraDeVehiculo`, `InsigniaDeVitrina`, `MenuDeVehiculoDeLaFicha`, +3
  - `listado`: `ListadoDeVehiculos`
  - `papelera`: `PapeleraDeVehiculos`
  - `vehiculos-del-lead`: `SeccionVehiculosDelLead`, `EsqueletoDeVehiculosDelLead`
- Depende de: empresa, equipo, flujos, origenes
- Casos de uso: acciones, alta, ficha, fotos, limpieza, listado, papelera, permisos, resumen, subasta, vinculo, vitrina

### `web`
Lo que el CRM configura para la web pública y el portal del cliente: ajustes del sitio, guías, FAQs, testimonios con consentimiento, cola web round-robin («turnos»), vistas y RPC del esquema `web`, revalidación on-demand. · 8 archivos
- API: `leerDireccionPublica`, `puedeEstarEnLaRueda`
- Pantallas (\`pantallas/<pantalla>\`, sólo \`src/app\`):
  - `perfil`: `EstadoEnLaRueda`
- Depende de: ningún otro módulo
- Casos de uso: rueda

## Compartido (`src/shared/`)

Infraestructura transversal sin reglas de negocio: clientes de Supabase, permisos, errores como valores, formato de números y fechas, configuración y los componentes de interfaz que usan todos los módulos.

- `config/`: `app.ts`, `entorno.ts`, `esquemas.ts`, `servidor.ts`
- `lib/`: `almacen.ts`, `ancho.server.ts`, `ancho.ts`, `apibara.ts`, `atajos.ts`, `borrador.ts`, `clic-de-fila.ts`, `color.ts`, `conteo.ts`, `enviar-accion.ts`, `errores.ts`, `fechas.ts`, `formato.ts`, `formularios.ts`, `iconos.ts`, `imagenes.ts`, `memoria-de-lectura.ts`, `navegacion.ts`, `numero-tipeado.ts`, `numeros-de-lead.ts`, `paginacion.ts`, `permisos.ts`, `rutas.ts`, `safe-action.ts`, `utils.ts`
- `lib/campos/`: `agrupar.ts`, `cambios.ts`, `clave.ts`, `controles.ts`, `esquema-de-valor.ts`, `esquemas.ts`, `impacto.ts`, `index.ts`, `mostrar.ts`, `motivos.ts`, `orden.ts`, `tipos.ts`, `valor-defecto.ts`, `valor.ts`
- `lib/csv/`: `descargar.ts`, `escribir.ts`, `leer.ts`
- `lib/email/`: `index.ts`, `tipos.ts`
- `lib/email/adaptadores/`: `mailpit.ts`
- `lib/filtros/`: `campos.ts`, `chips.ts`, `esquema.ts`, `index.ts`, `minimo.ts`, `opciones.ts`, `url.ts`
- `lib/supabase/`: `admin.ts`, `almacen.client.ts`, `browser.ts`, `consultas.ts`, `funciones.client.ts`, `proxy.ts`, `server.ts`
- `types/`: `database.types.ts`
- `ui/`: `ancho-de-pantalla.tsx`, `avatar.tsx`, `aviso-de-conflicto.tsx`, `aviso-de-tope.tsx`, `aviso.tsx`, `avisos-del-formulario.tsx`, `avisos-sobre-el-pie.ts`, `badge.tsx`, `bloque.tsx`, `button.tsx`, `cambios-del-panel.ts`, `cambios-sin-guardar.tsx`, `campo-seleccion.tsx`, `campo.tsx`, `checkbox.tsx`, `command.tsx`, `confirmar-descarte.tsx`, `confirmar.tsx`, `conmutador-tema.tsx`, `densidad.tsx`, `dialog.tsx`, `diferido.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `estilo-de-marca.tsx`, `foco-de-quien-abre.ts`, `guion-live.tsx`, `input-group.tsx`, `input.tsx`, `interruptor.tsx`, `label.tsx`, `live.ts`, `marca.tsx`, `modal-de-formulario.tsx`, `modal.tsx`, `monto.tsx`, `mostrar-todos.tsx`, `numero-de-lead.tsx`, `opciones.tsx`, `paginacion.tsx`, `pestanas-con-desborde.tsx`, `pie-con-salida.tsx`, `pie-del-panel.tsx`, `pista-de-desborde.tsx`, `popover.tsx`, `por-pagina.tsx`, `regional.tsx`, `registrar-service-worker.tsx`, `salida-con-cambios.ts`, `select.tsx`, `selector-de-icono.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toasts.ts`, `tooltip.tsx`, `transicion-pagina.tsx`, `use-abierto-alguna-vez.ts`, `use-apertura.ts`, `use-borrador-de-estado.ts`, `use-borrador.ts`, `use-cierre-con-cambios.ts`, `use-conflicto-hasta-la-version.ts`, `use-consulta-de-medios.ts`, `use-desborde.ts`, `use-en-linea.ts`, `use-envio-de-modal.ts`, `use-hay-cambios-en-formulario.ts`, `use-lectura-a-pedido.ts`, `use-lectura-al-montar.ts`, `use-panel-por-url.ts`, `use-reintento-al-volver.ts`, `use-revision-al-abrir.ts`, `use-ultimo.ts`, `use-un-envio-a-la-vez.ts`, `zona-de-archivos.tsx`
- `ui/atajos/`: `index.ts`, `proveedor-atajos.tsx`, `use-atajo.ts`
- `ui/campos/`: `aviso-de-impacto.tsx`, `bloque-de-campos.tsx`, `campo-de-formulario.tsx`, `campo-valor-defecto.tsx`, `campos-de-campo.tsx`, `campos-desactivados.tsx`, `cerrar-con-aviso.ts`, `datos-por-grupo.tsx`, `ediciones.ts`, `editor-de-campos.tsx`, `editor-de-opciones.tsx`, `fila-de-campo.tsx`, `formulario-de-campo.tsx`, `grupos-de-campos.tsx`, `index.ts`, `nombre-de-campo.tsx`, `panel-de-campo.tsx`, `pie-del-formulario.tsx`, `tipos.ts`, `use-formulario-de-campo.ts`, `valor-mostrado.tsx`
- `ui/esqueletos/`: `esqueleto-bandeja.tsx`, `esqueleto-detalle.tsx`, `esqueleto-formulario.tsx`, `esqueleto-listado.tsx`, `esqueleto-tabla.tsx`, `index.ts`
- `ui/estados/`: `estado-error.tsx`, `estado-pagina-sin-filas.tsx`, `estado-sin-permiso.tsx`, `estado-sin-resultados.tsx`, `estado-vacio.tsx`, `index.ts`, `marco-estado.tsx`
- `ui/filtros/`: `chips-de-filtros.tsx`, `contexto.ts`, `controles-de-texto.tsx`, `controles.tsx`, `estilos.ts`, `filter-shell.tsx`, `index.ts`, `panel-de-filtros.tsx`, `radios.tsx`, `selector-de-por-pagina.tsx`, `use-filtros.ts`, `use-panel-al-costado.ts`, `use-por-pagina-del-listado.ts`, `use-texto-de-url.ts`
- `ui/icono-del-catalogo/`: `icono-del-catalogo.tsx`, `simbolos-de-iconos.tsx`, `trazos.tsx`
- `ui/lista/`: `abrir-resumen.tsx`, `acciones.ts`, `fila-de-lista.tsx`, `index.ts`, `mas-acciones.tsx`, `pestanas-del-resumen.tsx`, `simbolos-de-lista.tsx`, `tabla-de-lista.tsx`, `tarjeta-de-lista.tsx`, `una-sola-vista.tsx`
- `ui/lista-de-catalogo/`: `botones-de-orden.tsx`, `lista-de-catalogo.tsx`, `tipos.ts`, `use-foco-tras-mover.ts`
- `ui/xcell/`: `boton-del-valor.tsx`, `cabecera-de-xcell.tsx`, `clases.ts`, `entrada-de-xcell.tsx`, `estado.ts`, `estilo-de-tonos.tsx`, `index.ts`, `lado-de-xcell.tsx`, `nota-de-xcell.tsx`, `simbolos-de-xcell.tsx`, `texto-de-valor.tsx`, `tonos.ts`, `use-edicion.ts`, `xcell.tsx`

## Rutas

- `/` — página
- `/auth/callback` — API
- `/auth/cerrar` — API
- `/auth/nueva-contrasena` — página
- `/configuracion/cotizacion` — página
- `/configuracion/empresa` — página
- `/configuracion/equipo` — página
- `/configuracion/leads` — página
- `/configuracion/origenes/[id]` — página
- `/configuracion/origenes` — página
- `/configuracion/roles` — página
- `/configuracion` — página
- `/cotizaciones/nuevo` — página
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

## Tablas (supabase/migrations)

- `20261028180656_base.sql`: `accesos_portal`, `actividad`, `ajustes_empresa`, `ajustes_web`, `apibara_consultas`, `categorias`, `categorias_gasto`, `cola_gc_barrido`, `cola_gc_pases`, `cola_gc_storage`, `cola_web_asesores`, `comprobantes`, `comprobantes_contadores`, `conversaciones`, `conversaciones_miembros`, `cotizaciones`, `cotizaciones_adjuntos`, `cotizaciones_comentarios`, `cotizaciones_favoritos`, `cotizaciones_niveles`, `cotizaciones_reportes`, `cotizaciones_revisiones`, `declaraciones_aduana`, `declaraciones_vehiculos`, `documentos`, `embudos`, `embudos_etapas`, `equipo_bajas`, `etiquetas`, `eventos`, `eventos_destinatarios`, `eventos_web`, `fases`, `fases_requisitos`, `fases_roles`, `fases_transiciones`, `fases_transiciones_roles`, `flujos`, `flujos_reglas`, `flujos_transporte_oferta`, `formulas`, `gastos`, `historial_fases`, `importaciones`, `importaciones_leads`, `integraciones`, `leads`, `leads_asesores`, `leads_campos`, `leads_contadores`, `leads_etiquetas`, `leads_favoritos`, `leads_numeros_globales`, `leads_numeros_propios`, `leads_tachados`, `leads_telefonos`, `limpieza_corridas`, `lotes_papelera`, `mensajes`, `mensajes_menciones`, `monedas`, `navieras`, `notas`, `notificaciones`, `oportunidades`, `oportunidades_historial`, `origenes`, `origenes_campos`, `origenes_lead`, `pagos`, `perfiles`, `permisos`, `plantillas_tarjeta`, `preferencias_usuario`, `puertos`, `recordatorios`, `repuestos_cajas`, `repuestos_catalogos`, `repuestos_compras`, `repuestos_cotizaciones`, `repuestos_cotizaciones_lineas`, `repuestos_cotizador_config`, `repuestos_items`, `repuestos_items_imagenes`, `repuestos_proyectos`, `repuestos_stock_movimientos`, `repuestos_tramos_logistica`, `roles`, `roles_permisos`, `seguimientos`, `solicitudes_contacto_web`, `suscripciones_push`, `tablas_referencia`, `tablas_referencia_filas`, `tareas`, `tipos_cambio`, `tipos_cambio_historial`, `tipos_documento`, `tipos_lead`, `tipos_seguimiento`, `tonos`, `transportes`, `usuarios_roles`, `vehiculos`, `vehiculos_conservados`, `vehiculos_imagenes`, `vehiculos_imagenes_version`, `vehiculos_interesados`, `vehiculos_vinculos`, `visitados`, `vistas_guardadas`, `web_categorias_guias`, `web_faqs`, `web_guias`, `web_testimonios`

## Reglas que se cargan solas (.claude/rules)

- `acciones.md` → `'src/modules/*/features/**/actions/**'`, `'src/app/api/**'`
- `datos.md` → `'src/modules/*/infra/**'`, `'src/shared/lib/supabase/**'`
- `e2e.md` → `'e2e/**'`, `'scripts/**'`
- `escala.md` → `'src/**'`, `'supabase/**'`, `'e2e/**'`, `'scripts/**'`
- `migraciones.md` → `'supabase/**/*.sql'`, `'supabase/config.toml'`
- `modulos.md` → `'src/modules/**'`
- `ui.md` → `'src/app/**/*.tsx'`, `'src/modules/**/features/**/*.tsx'`, `'src/shared/ui/**'`

