# leads

Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, **campos configurables** con quién los ve, seguimientos, recordatorios, etiquetas, favoritos/tachados, la cartera (compartir, transferir, quitar acceso y salir), la papelera, oportunidades en embudos, portal del cliente y limbo.

Ficha completa (historia, partes, mediciones, trampas viejas): `docs/archivo/modulos/leads.md`, sólo con grep.

## Entra y sale

- Depende de `equipo` (permisos, alcance propios/todos) y `shared/lib/campos` + `shared/ui/campos`. **No** importa `origenes` ni `empresa`: lo que cruza módulos (ciudad/país de la empresa, vehículos, `web`) lo compone la página por props o promesas.
- `index.ts` (servidor): lecturas, actions, reglas y tipos, **ningún componente**. Ej.: `leerListadoDeLeads`, `leerFichaDeLead`, `leerLayoutDeLeads`, `leerVistaDeEmbudo`, `exportarLeadsEnCsv`, `leerPapeleraDeLeads`, `accionesDeCartera`, `puedeEditarLead`, `puedeGestionarPortal`. Los componentes salen por `pantallas/<pantalla>.ts` (`listado`, `ficha`, `importar`, `papelera`, `configuracion`; sólo `src/app`): pantalla nueva = su archivo.
- `client.ts`: reglas puras, tipos, `<AltaDeLead>`, `normalizarTelefono()`. `shell.ts`: sólo `<AltaDeLead>`; el layout `(app)` nunca importa el `index.ts`.
- Rutas: `/leads`, `/leads/[id]` (`leads.ver`; `?seccion=datos|seguimientos|vehiculos|oportunidades|portal`), `/leads/papelera`, `/leads/importar` (`leads.crear`), `POST /leads/exportar` (`leads.exportar`), `/configuracion/leads` (`leads.configurar`). Todo modal vive en `?panel=` (constantes `PANEL_*`); los de una fila del listado llevan `para=<id>` y con `?lead=` no responden.
- Pendiente (sin código): `getLead()`, `buscarLeads()`, `<SelectorLead>`, `<ChipLead>`, `telefonoDe(leadId)`.

## Archivos clave

- `entities/campo.ts` (`CampoDeLead`, `CLAVES_RESERVADAS_DE_LEAD`, espejo de `_lead_clave_reservada()`); `entities/telefono.ts` (`normalizarTelefono()`, espejo de la SQL, probado en PGlite); `entities/documento.ts` (lista blanca, espejo de `_seguimiento_detalle()`).
- Alta: `entities/alta.ts` (`validarAlta()`), `features/alta/` (un solo drawer, `marco-del-alta.tsx`; lee su contexto al abrirse: `infra/contexto-de-alta.client.ts`).
- Listado: `entities/filtros.ts`, `fuente-del-listado.ts`, `candidatos.ts`, `infra/queries/listado.ts` (`buscarLeads`, `contarLeadsHasta`). Ficha: `entities/ficha.ts`, `edicion.ts`, `infra/ficha.ts` (`lead_guardar`).
- `features/seguimientos/`, `features/recordatorios/`, `features/marcas/components/menu-de-lead.tsx` (el «⋯» en cuatro superficies); cartera, papelera, portal, embudo y oportunidades: `entities/<x>.ts` + `infra/<x>.ts`.
- CSV: `entities/exportacion.ts`, `entities/importacion/`, `infra/importacion.ts`. Catálogos: `entities/catalogos.ts` + `infra/queries/catalogos.ts` (`leads_catalogos()`, una llamada para listado, ficha y exportación). Números: `@/shared/lib/numeros-de-lead`.

## Tablas

`leads` (con `atributos`, `atributos_publicos`, `cartera`), `leads_campos`, `leads_telefonos`, `leads_asesores`, `leads_favoritos`, `leads_tachados`, `etiquetas`, `leads_etiquetas`, `tipos_seguimiento`, `seguimientos`, `recordatorios`, `embudos`, `embudos_etapas`, `oportunidades`, `accesos_portal`, `origenes_lead`, `tipos_lead`, `importaciones`; `lotes_papelera` es compartida.

**Sólo se leen; se escriben por RPC:** `leads` (`crear_lead`, `lead_guardar`; `telefono_principal` sólo `crear_lead` y `cambiar_telefono_lead`), `leads_telefonos` (`lead_telefono_*`, sin grant), `leads_asesores` (`lead_compartir|transferir|revocar_acceso|salir`), marcas (`lead_favorito_poner`, `lead_tachado_poner`, `lead_etiquetas_poner`, `etiqueta_*`), y por prefijo `seguimiento_*`, `recordatorio_*`, `embudo_*`, `oportunidad_*`, `origen_lead_*`, `tipo_lead_*`, `tipo_seguimiento_*`, `lead_campo_*`, `leads_papelera_*`, `leads_importar_lote`, `otorgar_portal`. Lecturas: `leads_vista`, `leads_cartera_vista`, `lead_ficha()`, `leads_candidatos()` + `leads_vista_por_ids()`.

## No se rompe

- **Privados recortados en la base:** un campo `solo_cartera` y el teléfono completo sólo llegan a quien tiene el lead en su cartera, también quien ve «todos» (incluido el dueño: deliberado). `leads.atributos` y `telefono_principal` no tienen grant: la app lee `leads_vista`. Falla cerrada: a un ajeno sólo llegan claves que el layout conoce como no privadas. Filtrar es leer: un privado ajeno no se encuentra.
- **Clase 1** (editar, teléfonos, seguimientos, recordatorios, portal, vehículos): cartera **y** permiso con cualquier alcance, vía `puede_actuar_lead()` o `_lead_mio()`, nunca `puede_lead(…, 'leads.editar')`. Limbo, papelera, ajeno e inexistente dan el mismo `42501`. **Clase 2** (compartir, transferir, quitar, salir): el dueño o, con «todos», quien lo ve; nadie se concede acceso a sí mismo (salvo `crear_lead` con `adoptar`). **Clase 3** (papelera): el permiso con su alcance; purgar pide `leads.papelera.purgar`. Toda RPC que recibe un lead cae en una clase: `supabase/tests/auditoria-leads.sql` falla si una nueva no figura.
- **`lead_guardar` es la única puerta de edición** y exige `actualizado_en` (`PT409`). La versión la mueve sólo nombre, tipo, origen, atributos, teléfono o papelera (`lead_version()`); una columna derivada nueva se suma fuera. `atributos` es un parche y nunca guarda un nulo.
- **`crear_lead(p_id, …)`:** una transacción idempotente por `p_id`; un duplicado es un valor (`existe`, `de_otro`, `limbo`), no una excepción; adoptar exige `adoptar: true`.
- **Teléfono:** único entre leads vivos; la búsqueda es por nombre y por número de lead (`#124`), **nunca por teléfono** (oráculo). El tope de 10 extras lo aplica «agregar», no el cambio.
- **Marcas** (favorito, tachado, etiquetas): de quien mira, `poner(valor)` y nunca alternar, sin versión, sin tocar `leads`. Embudos personales; oportunidades clase 1.
- **Un origen o tipo de lead con leads no se elimina: se desactiva.** Siempre queda un tipo activo de cada clase; la clase no cambia. **Se razona por la clase, nunca por nombre o clave de un tipo**; ningún texto de `src/` ni `supabase/` nombra un origen o tipo. Un campo con datos no cambia de tipo ni se elimina.
- **Seguimientos:** privado = sólo su autor; el detalle es un documento validado contra la lista blanca, nunca HTML ni `innerHTML`.
- **CSV:** exportar sólo la cartera (`en_cartera = true`), tope 5.000, 5 por hora, apóstrofo ante `= + - @`. Importar pasa cada fila por `validarAlta()` y no adopta del limbo. `FILAS_POR_LOTE` (50) lo compara `scripts/guardas/lote-de-importacion.test.ts`.
- **Portal:** la clave se ve una vez y nunca cruza registro, URL ni almacenamiento (`logging.serverFunctions` apagado); `otorgado_en` es la versión del acceso.
- **Visibilidad:** `_lead_visible_para(eliminado_en, cartera, alcance, yo, fuera)`; una función que lee `leads_asesores … revocado_en is null` entra al inventario de `humo.sql` o filtra con `_bajas_en_curso()`.
- Ningún componente decide qué número de lead mostrar: dibujan el global si llegó, si no el propio.

## Ojo

- Los números mostrados son acotados (`contarLeadsHasta`, «500+») y las listas hijas tienen tope (`.claude/rules/escala.md`); un resultado de RPC se pone sólo dentro de lo cargado (`ponerEnLaVentana()`).
- Búsqueda y campos van por `leads_candidatos()` (`security definer`): `condicionesDeLaPagina()` **quita** lo que ya cumplen (repetirlo cambia el plan). `_leads_vista_crear()` define `leads_vista` y `leads_cartera_vista`: no `drop view` a mano. `atributos_lead()` lleva `COST 20000`; un campo público se filtra por `atributos_publicos`.
- La tabla de países (`entities/paises/`) sólo con `import()`, nunca estática; un lead existente no cambia de país al cambiar un teléfono.
- Los e2e que insertan leads con el cliente de servicio completan los requeridos (`e2e/soporte/leads.ts`).
- Las carreras se prueban en `pnpm db:carreras`, no en `db:probar`.
