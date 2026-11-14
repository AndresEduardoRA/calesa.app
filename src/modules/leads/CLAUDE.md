# leads

Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, **campos configurables** con quién los ve, seguimientos, recordatorios, etiquetas, favoritos/tachados, la cartera (compartir, transferir, quitar acceso y salir), la papelera, oportunidades en embudos, portal del cliente y limbo.

## Entra y sale

- Depende de `equipo` y `shared/lib/campos` + `shared/ui/campos`. **No** importa `origenes`, `empresa`, `cotizaciones`, `chat` ni `web`: lo que
  cruza módulos lo compone `src/app` por props o promesas.
- `index.ts` (sin componentes): `leerListadoDeLeads`, `leerFichaDeLead`, `leerLayoutDeLeads`, `leerVistaDeEmbudo`, `exportarLeadsEnCsv`,
  `leerPapeleraDeLeads`, `accionesDeCartera`, `puedeEditarLead`, `puedeGestionarPortal`; para «exportar todo» de `datos`: `leerCatalogosDeLead`,
  `camposDeExportacion`, `telefonoDeExportacion`, `valorDeExportacion`, `ENCABEZADO_DEL_NUMERO_GLOBAL` (una sola regla por tipo de campo).
  - `leerNombresDeLeads(ids)`: nombres de una página de `/cotizaciones` por `leads_vista_por_ids()` (invocadora: el que no se ve no se distingue del
    que no existe), hasta 100 ids, una vez por página.
  - `leerClienteElegido(id)`: `ok(null)` sólo si no se ve; un error es un error.
  - Bandeja de Inicio (`tablero`): `leerRecordatoriosDeHoy({ hasta, tope })` (mis pendientes, `recordatorios_vista`) y
    `leerLeadsSinSeguimiento({ creadosAntesDe, tope })` (mi cartera sin seguimiento y de más de 24 h, `leads_cartera_vista`); piden `tope + 1` y
    devuelven `{ filas, hayMas }` (`entities/bandeja.ts`: `finDeHoy()`, `creadoAntesDe()`, `rutaDeSeguimientos()`).
- Pantallas por `pantallas/<pantalla>.ts` (`listado`, `ficha`, `importar`, `papelera`, `configuracion`, `cotizar`, `turno`; sólo `src/app`).
- `client.ts`: reglas puras, tipos, `<AltaDeLead>`, `normalizarTelefono()`, `interpretarBusqueda()`, `MINIMO_DE_BUSQUEDA` (para `buscador`), la
  action `completarRecordatorio` (panel `?recordatorio=` de `/agenda`; la RPC exige que sea de quien actúa) y lo puro de la importación de `datos`
  (`prepararFilas`, `preparadorDeFilas` por tramos con el mismo resultado que una pasada, `emparejarColumnas`, `convertir*`, `fecha*`, `usePaises`…):
  la importación total no tiene otras reglas.
- `shell.ts`: `<AltaDeLead>`, `<ProveedorDeEscribirPorChat>`; `shell.client.ts`: `useAbrirNuevoLead()` (paleta del buscador; no `usePanelDeAlta()`).
- Rutas: `/leads`, `/leads/[id]` (`leads.ver`; `?seccion=datos|seguimientos|vehiculos|oportunidades|cotizaciones|portal`; «Cotizaciones» con
  `cotizaciones.ver` en algún origen, sin mirar la cartera, la compone `src/app` con `cotizaciones/pantallas/lead`), `/leads/papelera`,
  `/leads/importar` (`leads.crear`), `POST /leads/exportar` (`leads.exportar`), `/configuracion/leads` («Campos» y las `lead_campo_*` piden
  `leads.campos.gestionar`; orígenes, tipos de lead y de seguimiento y `?seccion=embudo|portal` (`features/plantillas/`), `leads.configurar`).
  Todo modal en `?panel=` (`PANEL_*`); los de una fila llevan `para=<id>` y con `?lead=` no responden.
- Hoja de cotizar: `<BarraDelCliente>` y su panel (`features/panel-para-cotizar/`, `?panel=cliente&clase=&buscar=&cursor=`: «míos» por
  `reciente_en` o búsqueda por nombre o `#n`; elegir escribe `?lead=` con `history: 'replace', shallow: false`; lecturas del navegador en
  `infra/panel-para-cotizar.client.ts`). Su «+» abre el alta con `?panel=nuevo-lead&elegir=<clave>` (`claveParaElegir()`: 1 a 20 minúsculas, ni
  `panel` ni `elegir`): `usePanelDeAlta()` entrega `paraElegir` y `elegirElCreado(id)`, el aviso va sin «Abrir ficha» y el foco vuelve a la barra
  (`data-elige`); si el teléfono ya es de un lead que se ve, su aviso ofrece «Elegir» (`alElegir` = `elegirElCreado`). «Cotizar» de la ficha:
  `paraCotizar`, de `src/app`.
- «Vincular a lead» de un turno de la web (`features/vincular-turno/`, `?panel=vincular-turno&turno=<id>`): elegir llama `alElegir(leadId)` y decide
  `src/app/(app)/_inicio/vincular-turno.tsx`; «+» abre el alta con `?elegir=vincular` y vuelve con `?vincular=<id>`.
- «Escribirle por chat» (`features/chat/`): en el aviso «Lo tiene <persona>» del teléfono principal, enlace a `/chat?con=<duenoId>` sólo si el layout
  dijo `chat.participar` (falso por omisión) y la base mandó `dueno_id`. La base decide si se puede (`chat_directa`).
- Sin código: `getLead()`, `buscarLeads()`, `<ChipLead>`, `telefonoDe(leadId)`.

## Archivos clave

- `entities/campo.ts` (`CampoDeLead`, con `minimo`/`maximo`; `CLAVES_RESERVADAS_DE_LEAD`, espejo de `_lead_clave_reservada()`),
  `entities/telefono.ts` (espejo de la SQL, probado en PGlite), `entities/documento.ts` (lista blanca, espejo de `_seguimiento_detalle()`).
- Alta: `entities/alta.ts` (`validarAlta()`), `features/alta/` (un drawer; contexto al abrirse, `infra/contexto-de-alta.client.ts`). El aviso de
  guardado sale cuando el envío terminó (`useTrasElEnvio()` encola, `useSoltarTrasElEnvio(tras, enCurso)` suelta; también el panel de etapas;
  `vehiculos` tiene una copia).
- Listado: `entities/filtros.ts`, `fuente-del-listado.ts`, `candidatos.ts`, `infra/queries/listado.ts` (`buscarLeads`, `contarLeadsHasta`). Ficha:
  `entities/ficha.ts`, `edicion.ts`, `infra/ficha.ts`.
- `features/seguimientos/`, `features/recordatorios/`, `features/marcas/components/menu-de-lead.tsx` (el «⋯»; «Ver actividad» sólo en la ficha, con
  `actividad.ver` y la ruta de `rutaDeActividadDe`); cartera, papelera, portal, embudo, oportunidades: `entities/<x>.ts` + `infra/<x>.ts`.
- CSV: `entities/exportacion.ts`, `entities/importacion/`, `infra/importacion.ts`. Catálogos: `leads_catalogos()`, una llamada para listado, ficha y
  exportación. Números: `@/shared/lib/numeros-de-lead`.

## Tablas

`leads` (`atributos`, `atributos_publicos`, `cartera`), `leads_campos`, `leads_telefonos`, `leads_asesores`, `leads_favoritos`, `leads_tachados`,
`etiquetas`, `leads_etiquetas`, `tipos_seguimiento`, `seguimientos`, `recordatorios`, `embudos`, `embudos_etapas`, `oportunidades`, `accesos_portal`,
`origenes_lead`, `tipos_lead`, `importaciones`, `ajustes_leads` (fila única: plantillas del embudo y del mensaje del portal); `lotes_papelera` es
compartida.

**Papelera con causa:** `_lead_bloqueo(l, al_enviar) → {causa, motivo}` (`_lead_motivo_de_bloqueo` es su texto); el 23514 de `leads_papelera_enviar` lleva
la causa en `hint` (`errorConCausa()`), y `entities/avisos-de-lead.ts` la vuelve acciones del aviso («Ver los vehículos» con un solo lead).

**Sólo se leen; se escriben por RPC:** `leads` (`crear_lead`, `lead_guardar`; `telefono_principal` sólo `crear_lead` y `cambiar_telefono_lead`),
`leads_telefonos` (`lead_telefono_*`), `leads_asesores` (`lead_compartir|transferir|revocar_acceso|salir`), marcas (`lead_*_poner`, `etiqueta_*`), y
`seguimiento_*`, `recordatorio_*`, `embudo_*`, `oportunidad_*`, `origen_lead_*`, `tipo_lead_*`, `tipo_seguimiento_*`, `lead_campo_*`,
`leads_papelera_*`, `leads_importar_lote`, `otorgar_portal`, `ajustes_leads` (`embudo_plantilla_guardar`, `portal_mensaje_guardar`:
`leads.configurar`, PT409 con versiones independientes `embudo_actualizado_en` y `portal_actualizado_en`). Lecturas: `ajustes_leads_leer()` (sin
permiso), `leads_vista`, `leads_cartera_vista`, `lead_ficha()`, `leads_candidatos()` + `leads_vista_por_ids()`, `lead_oportunidades()` (invocadora,
por cursor, de a 20 y hasta 100, por `oportunidades_lead_abiertas_idx` y `oportunidades_lead_cerradas_idx`; «Ver más» hasta 500).

## No se rompe

- **Último contacto del listado:** `leads_vista` (y `leads_cartera_vista`) trae `ultimo_seguimiento_visible` `{tipo_id, titulo}` y `proximo_recordatorio`
  `{id, titulo, recordar_en}`: subconsultas con `limit 1` por `seguimientos_lead_fecha_idx` (igualdad con `ultimo_seguimiento_en`) y
  `recordatorios_lead_pendientes_idx`, invocadoras (la RLS decide). Sólo se entrega el seguimiento si es el que marca `ultimo_seguimiento_en`; un último
  privado ajeno deja la fecha y nada más (`entities/ultimo-contacto.ts`, `supabase/tests/areas/leads/ultimo-contacto.sql`). El tipo se nombra con
  `leads_catalogos().tipos_de_seguimiento`. Una columna más a `leads_vista` pasa por `medir-leads-ultimo-contacto.sql`. El listado no ordena por esto.
- **Privados recortados en la base:** un campo `solo_cartera` y el teléfono completo sólo llegan a quien tiene el lead en su cartera, también con
  «todos» (incluido el dueño: deliberado). `leads.atributos` y `telefono_principal` sin grant: la app lee `leads_vista`. Falla cerrada: a un ajeno
  sólo llegan claves que el layout conoce como no privadas. Un privado ajeno no se encuentra filtrando.
- **Clase 1** (editar, teléfonos, seguimientos, recordatorios, portal, vehículos): cartera **y** permiso, vía `puede_actuar_lead()` o `_lead_mio()`,
  nunca `puede_lead(…, 'leads.editar')`; limbo, papelera, ajeno e inexistente dan el mismo `42501`. **Clase 2** (compartir, transferir, quitar,
  salir): el dueño o, con «todos», quien lo ve; nadie se da acceso a sí mismo (salvo `crear_lead` con `adoptar`). **Clase 3** (papelera): el permiso
  con su alcance; purgar pide `leads.papelera.purgar`. Toda RPC que recibe un lead figura en `supabase/tests/auditoria-leads.sql`.
- **`lead_guardar` es la única puerta de edición** y exige `actualizado_en` (`PT409`). La versión la mueven sólo nombre, tipo, origen, atributos,
  teléfono o papelera (`lead_version()`): una columna derivada nueva se suma fuera. `atributos` es un parche y nunca guarda un nulo.
- **`crear_lead(p_id, …)`:** con la oportunidad base (`_lead_oportunidad_base`, también en las importaciones); idempotente por `p_id`; un duplicado es un valor (`existe`, `de_otro`, `limbo`); adoptar exige `adoptar: true`.
- **Teléfono:** único entre vivos; se busca por nombre y por número (`#124`), **nunca por teléfono** (oráculo). El tope de 10 extras lo aplica
  «agregar», no el cambio.
- **Marcas:** de quien mira, `poner(valor)` y nunca alternar, sin versión, sin tocar `leads`. Embudos personales; oportunidades clase 1.
- **Un origen o tipo de lead con leads se desactiva, no se elimina.** Siempre queda un tipo activo de cada clase; la clase no cambia. **Se razona
  por la clase, nunca por nombre o clave**. Un campo con datos no cambia de tipo ni se elimina.
- **Seguimientos:** privado = sólo su autor; el detalle es un documento validado contra la lista blanca, nunca HTML ni `innerHTML`.
- **CSV:** exportar sólo la cartera (`en_cartera = true`), tope 5.000, 5 por hora, apóstrofo ante `= + - @`. Importar pasa cada fila por
  `validarAlta()` y no adopta del limbo. `FILAS_POR_LOTE` (50) lo vigila `scripts/guardas/lote-de-importacion.test.ts`.
- **Portal:** la clave se ve una vez y nunca cruza registro, URL ni almacenamiento (`logging.serverFunctions` apagado); `otorgado_en` es la versión.
  El texto para WhatsApp sale de `ajustes_leads.portal_mensaje` (`aplicarMensaje()`, una pasada; `validarMensajeDelPortal()`, espejo de
  `_portal_mensaje_normalizar`); nulo = el de fábrica de `entities/portal-mensaje.ts`. Lo lee `leerAjustesDeLeads()`.
- **Visibilidad:** `_lead_visible_para(eliminado_en, cartera, alcance, yo, fuera)`; una función que lee `leads_asesores … revocado_en is null` entra
  al inventario de `humo.sql` o filtra con `_bajas_en_curso()`.
- **`leads_asesores.lead_reciente_en`** copia `coalesce(ultimo_seguimiento_en, creado_en)` en **todas** las filas del lead, también las revocadas
  (compartir revive por `on conflict`). La llena `leads_asesores_creado_en()`, la sigue `leads_reciente_seguir()` y
  nadie más la escribe (`leads_asesores_creado_en_guarda()`); las vistas la exponen como `reciente_en`. Un `insert` con triggers apagados nombra las
  dos copias.
- Ningún componente decide qué número mostrar: el global si llegó, si no el propio.
- **Recordatorios:** avisa el job `recordatorios-notificar` (cada minuto, `recordatorios_notificar()`), una vez por hora fijada. La `ruta` nombra el
  lead sólo si su dueño aún lo tiene vivo en la cartera; si no, `/agenda?recordatorio=<id>`. Cambiar la hora reemplaza el aviso abierto.
- **La cartera avisa:** `lead_compartir` deja `lead_compartido` a quien recibe; `lead_transferir`, `lead_transferido` al destino; `sin_cambios` no
  avisa y repetir reemplaza el abierto. Ningún aviso lleva teléfono, número ni nombre del lead
  (`supabase/tests/areas/notificaciones/avisos-de-cartera.sql`).

## Ojo

- Un resultado de RPC se pone sólo dentro de lo cargado (`ponerEnLaVentana()`).
- Búsqueda y campos van por `leads_candidatos()` (`security definer`): `condicionesDeLaPagina()` **quita** lo que ya cumplen (repetirlo cambia el
  plan). `_leads_vista_crear()` define `leads_vista` y `leads_cartera_vista`: nada de `drop view` a mano. `atributos_lead()` lleva `COST 20000`.
- La tabla de países (`entities/paises/`) sólo con `import()`; un lead no cambia de país al cambiar un teléfono.
- Los e2e que insertan leads con el cliente de servicio completan los requeridos (`e2e/soporte/leads.ts`).
- Las carreras se prueban en `pnpm db:carreras`, no en `db:probar`.
