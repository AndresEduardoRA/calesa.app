# repuestos

Proyectos de repuestos por vehículo (o externos), ítems que recorren el flujo de repuestos con el mismo motor, imágenes, stock, compras con permiso de costos y un cotizador propio con configuración versionada.

Abiertos que lo tocan: **8-13a** a **8-13c** y la revisión de seguridad del stock y de los pagos de repuestos (`docs/PENDIENTES.md`).

## Entra y sale

- Entra: proyectos desde la ficha del vehículo o sueltos, hoja de ítems editable celda a celda, compras, movimientos de stock, cotizaciones de repuestos.
- Depende de: `vehiculos`, `flujos`, `leads`. Lo consumen `vehiculos`, `logistica`, `tablero`, `buscador`.
- Las actions **no salen por los barriles** (las importan en relativo sus hooks) y comprueban su permiso con `puede()` antes de la base. Lo que cruza áreas
  lo compone `src/app/(app)/repuestos/` (render prop, hueco o props).
- **`proyectos`** — `index.ts`: `proyectoDe(vehiculoId)`, `leerResumenDeVehiculo(vehiculoId)`, `esquemaDelListado`, `pedidoDelListado`,
  `leerCursorDeProyectos`, `leerProyectosDelListado` (cursor = `numero`, sin «Anterior»), `estadoDelProyecto`. `pantallas/proyectos.ts`:
  `<ListadoDeProyectos>`, `<BotonNuevoProyecto>`, `<DrawerDeNuevoProyectoDiferido>`, `useNuevoProyectoPorUrl`, `<CabeceraDeProyecto>`,
  `buscarProyectoAbierto`. `pantallas/proyectos-vehiculo.ts`: `<ResumenRepuestos>`, la pestaña «Repuestos» de `/vehiculos/[id]` (`repuestos.ver` global;
  ítems por fase, ≤ 201 leídos). El módulo no importa `buscador`: los buscadores de vehículo y lead los compone `src/app`.
- **`items`** — `pantallas/items.ts`: `<HojaDeItems>` (`/repuestos/[id]`) con el panel `?panel=imagenes&item=`; `index.ts`: `leerProyecto`,
  `leerItemsDelProyecto`, `leerItem`, `cuentasDeLaHoja`, `FilaDeItem`.
- **`stock`** — la hoja expone un hueco (`HuecoDeLaHoja`: `accionDeFila(fila)`, `panel(api)` con `cambiarFila`) que llena `hoja-con-stock.tsx` con
  `pantallas/stock.ts` (`BotonDeStock`, `PanelDeStock`, `useStockPorUrl`; `?panel=stock&item=`). Vista `/repuestos?vista=stock`: `leerStock`,
  `leerCursorDeStock`, `esVistaDeStock`, `CLAVE_DE_VISTA_DE_REPUESTOS` (`areas/stock/index.ts`) y `<VistaDeStock>` (`pantallas/stock-vista.ts`), con
  `?panel=reasignar-stock|vender-stock|devolver-stock&item=`; el destino lo busca `buscarProyectoAbierto` por render prop.
- **`compras`** — `?pestana=compras` de `/repuestos/[id]`: `leerComprasDelProyecto` (tope 200), `leerMargenDelProyecto`, `<MargenDelProyecto>`,
  `<ComprasDelProyecto>` (`pantallas/compras.ts`); Drawer `?panel=compra&compra=<id|nueva>`. `?pestana=pagos` la dibuja `PagosDelProyectoDiferido` de
  `logistica`: registrar, corregir y eliminar piden `repuestos.costos.editar` y `repuestos.ver` (`pago_registrar_proyecto`, `pago_guardar`, `pago_eliminar`),
  confirmar y anular `logistica.pagos.confirmar`; un pago de proyecto no lleva lead (`pago_guardar` da 22023, hint `lead_id`).
  Un pago vivo cumple `proyecto.pago_cliente`: `pago_anular` y `pago_eliminar` no quitan el último si un ítem vivo está en una fase que lo pide. Las dos pestañas sólo
  existen con `repuestos.costos.ver` (`pestanasLlenas(permisos)`; sin él la URL abre «Ítems» y no se lee nada de costos).
- **`cotizador`** — `?seccion=cotizador` de `/configuracion/repuestos`: `leerConfiguracionDelCotizador()` (vigente, historial tope 20, tramos y cajas tope
  200), `<ConfiguracionDelCotizador>` (`pantallas/cotizador-configuracion.ts`), modales `?panel=tramo|caja&tramo|caja=<id|nuevo>&moneda=`.
  `?pestana=cotizaciones` de `/repuestos/[id]`, sólo con `repuestos.cotizar`: `leerCotizacionesDelProyecto` (tope 50), `<CotizacionesDelProyecto>`
  (`pantallas/cotizador.ts`). `/repuestos/[id]/cotizaciones/[cotizacion]`: `leerCotizacion(proyectoId, id)`, `<HojaDeLectura>` (los montos guardados,
  nada se recalcula) o, si es borrador con proyecto abierto y snapshot válido, `<HojaEditable key={actualizadoEn}>` y `<AccionesDeCotizacion>`
  (`?panel=aceptar-cotizacion|anular-cotizacion`) por `pantallas/cotizador-cotizacion.ts`. Los ítems para «Agregar desde un ítem» los pasa la página
  (`ItemParaCotizar[]`).
- **`catalogos`** — `index.ts`: `leerCatalogosDeRepuestos()` (los cuatro, con desactivados, tope 200 cada uno), `CATALOGOS_DE_REPUESTOS`; `client.ts`: lo
  puro del formulario (`validarValor`, `cambiosDeValor`, `ordenSiguiente`…); `pantallas/catalogos.ts`: `<CatalogosDeRepuestos>`.
- **`flujo`** — panel del ítem: `?item=<id>` abre `<PanelDeLaUnidad>` de `logistica` (`item-abierto.tsx`: `repuestos` lee, `logistica` dibuja; mover,
  documentos, notas e historial son de `logistica`, variante `repuesto`; el transporte sólo dice «Sigue al vehículo», 8-13b). `index.ts`:
  `leerItemDelPanel(id)` (nulo si no existe, está en la papelera, no se ve o su proyecto no se ve: los cuatro se dicen igual), `itemAbiertoDe(parametros)`
  (el guid de `?item=` **sólo sin `?panel=`**), `ItemDelPanel`; `pantallas/flujo.ts`: `<DrawerDelItem>`, `<BotonDelPanelDelItem>`, `useItemPorUrl()`.
- **`flujo`** — esperas: `esperasQueDestraban(vehiculoId)` (`Resultado<{ items, hayMas }>`, hasta 50, por `repuestos_pendientes_de_vehiculo`, que oculta los
  nombres de fase sin `logistica.ver`). `pantallas/flujo-esperas.ts`: `HUECOS_DE_ESPERAS_EN_LA_UNIDAD` (`repuestos.ver`, regla `esperas`, tipo estructural
  propio: no importa `logistica`; el cast va en `huecos-de-la-unidad.tsx` de logística); lee con `leerEsperasDelVehiculo` al abrir y si cambia la fase,
  **sin** escuchar `logistica:unidad-cambio`.
- **`flujo`** — la Cadena, `/repuestos?vista=cadena` (`pantallas/flujo-cadena.ts`: `CadenaDeRepuestos`, columnas por fase, `?fase=` en el celular):
  `leerCadenaDeRepuestos(filtros)`, `esquemaDeLaCadena`, `pedidoDeLaCadena`, `rutaDeLaCadena({ proyecto?, q? })`, claves `vista`, `q`, `proyecto`, `fase`.
  Una consulta por fase con `limit 51` (nunca por tarjeta), «Ver más» por cursor `(fase_desde, id)` (`verMasDeLaColumnaDeRepuestos`); `?proyecto=` sólo por URL.
- **`flujo`** — Inicio: `leerRepuestosPorMover(tope)` y `leerEsperasDeInicio(tope)` (`tope` 1..`TOPE_DE_INICIO` = 20, otro es `validacion`) para los
  bloques `repuestos-por-mover` (`repuestos.mover`) y `esperas-repuestos` (`repuestos.ver`) de `tablero`: ítem vivo, sin stock, en fase no final de un
  proyecto vivo (el segundo, sólo con vehículo), `limit tope + 1`, bajo la RLS de `repuestos.ver` (sin ella, vacío). «Por mover» es «en vuelo», no
  «listo»: la fila abre el panel del ítem (`rutaDelItemDeInicio`). Sin cruce exacto con la fase del vehículo (8-13a); `fase_desde` sin índice (8-13c).

## Áreas

El módulo se parte por **área**, como `logistica`: `features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts`
(o `pantallas/<área>-<pantalla>.ts`). El **núcleo** es la carpeta `nucleo` de cada capa; un `pantallas/<x>.ts` sin prefijo de área es del núcleo.
`index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área: lo nuevo va en su área.

| Área        | Qué es                                                                             |
| ----------- | ---------------------------------------------------------------------------------- |
| `nucleo`    | lo compartido entre áreas                                                          |
| `proyectos` | `/repuestos`: el listado de proyectos, crear, cerrar, eliminar                     |
| `items`     | `/repuestos/[id]`: la hoja de ítems y sus imágenes                                 |
| `stock`     | movimientos de stock y sobrantes                                                   |
| `compras`   | compras y pagos (con `repuestos.costos.*`)                                         |
| `cotizador` | la configuración versionada y las cotizaciones de repuestos                        |
| `catalogos` | los cuatro catálogos: leer, crear, guardar y borrar valores                        |
| `flujo`     | el panel del ítem, el panel de pendientes para `logistica` y los bloques de Inicio |

**Un área no importa otra y el núcleo no importa ningún área** (lo vigila `scripts/guardas/areas-c/areas-de-repuestos.test.ts`).

## Archivos clave

- `entities/cotizador/formula.ts` (`calcularLinea`, `sugerirLogistica`, `totalDeLaCotizacion`, `TOPE_DE_LINEAS`): importado = costo × factor + logística +
  caja; local = (costo + logística + caja) × (1 + recargo); el unitario al múltiplo de `redondeo` (mitad hacia arriba) y × cantidad. Exacta con `decimal.ts`
  (enteros a escala fija, nunca `float`). `casos-del-cotizador.json` corre en `formula.test.ts` y en `supabase/tests/areas/repuestos/cotizador.sql` (copia
  literal; `casos.test.ts` cae si difieren). La fórmula de la base es `_repuesto_cotizacion_linea`: cambiar una exige cambiar la otra y el JSON.
- `entities/cotizador/hoja-editable.ts`: lo que emite una `XCell` pasa a texto exacto (`montoDeCelda`, `cantidadDeCelda`); `calcularHoja` sólo informa;
  `pedidoDeGuardar` nunca manda totales ni sugerencias (↺ de la logística = `null`). El error de una línea llega a su celda por `details` + `hint`
  (`errores.ts`). Montos leídos como texto (`::text`), nulo nunca 0.
- `entities/cotizador/configuracion.ts`: `leerDecimal` (locale de la empresa, texto exacto), `decimalCanonico` (lo que valida la action), recargo % ↔
  fracción con el mismo entero; `errores-de-configuracion.ts` (23P01 en «Desde», los `check` por nombre, 23505 en «Monto»).
- `entities/stock/reglas.ts`: espejo de las RPC del stock (`disponibleParaStock`, `validarMovimiento`, `validarReasignacion`, `enStockTras`); los textos
  son los de la base y un test los compara con la migración.
- `entities/compras/margen.ts`: `leerMargen` (margen nulo si hay ítems sin precio aunque llegue un número). Sin aritmética de dinero: cuenta la base.
  `monto_base` se lee, nunca se calcula ni se manda (`cambiosDeCompra`; las actions usan `z.strictObject` sin `monto_base` ni `proyecto_id`).
- `infra/compras/comprobante.client.ts`: al bucket privado `comprobantes`, `<proyecto>/<sha-256>.<ext>`, sin comprimir (copia del de `logistica`, que no se
  importa). «Ver comprobante» pide una URL de 60 s al tocarlo.
- `infra/items/guardar.ts`: guardar una celda es un `update` directo por columna versionado (`.eq('actualizado_en', …)`): cero filas nunca es éxito. Una
  cola por fila (`colaPorClave`) evita que dos celdas del mismo ítem choquen.
- La base: `repuesto_proyecto_crear` / `_cerrar` / `_reabrir` / `_eliminar` / `_restaurar`, `repuesto_item_crear` / `_eliminar`,
  `repuestos_proyectos_listar`, `repuestos_pendientes_de_vehiculo`, `_repuesto_ante_espera`, triggers `repuestos_catalogo_sin_uso`,
  `repuestos_imagen_integridad`, `repuestos_imagen_encolar`; `repuesto_stock_mover`, `repuesto_stock_reasignar`, `repuestos_stock_listar`;
  `repuesto_compra_guardar` / `_eliminar` / `_restaurar`, `repuestos_proyecto_margen`; `repuestos_cotizacion_crear` / `_guardar` / `_aceptar` / `_anular`.
  Pruebas en `supabase/tests/areas/repuestos/`; carreras en `scripts/carreras/repuestos-stock.mjs`.

## Tablas

`repuestos_catalogos` (un catálogo genérico: `catalogo` ∈ tipo_pieza | condicion | modo_transporte | pais_origen, con `datos` jsonb), `repuestos_proyectos`, `repuestos_items`, `repuestos_items_imagenes`, `repuestos_stock_movimientos`, `repuestos_compras`, `repuestos_cotizador_config`, `repuestos_tramos_logistica`, `repuestos_cajas`, `repuestos_cotizaciones`, `repuestos_cotizaciones_lineas`.

## No se rompe

- Es el **ítem**, no el proyecto, el que recorre el flujo; el estado del proyecto se deriva. Mover pasa por `cambiar_fase(repuesto_id)`.
- Ningún costo vive en `repuestos_items` (RLS no esconde columnas): compras y pagos tienen su tabla y su permiso (`repuestos.costos.*`).
- Proyectos e ítems se crean, cierran, eliminan y restauran **sólo por RPC** (sin INSERT directo; `eliminado_en`, `cerrado_en`, `vehiculo_id`, `fase_id` y
  `stock_cantidad` sin grant de UPDATE); toda RPC que escribe pide `repuestos.editar`. Un proyecto sólo se elimina vacío. El `update` por columna de un
  ítem pide `repuestos.editar` y `repuestos.ver` (policy) y el trigger `repuestos_item_escritura` exige, sólo en lo que cambia, ítem vivo (`PT409`), proyecto
  vivo y abierto (23514 hint `proyecto`, tras su `for share`), catálogo activo de su tipo (22023, hint = columna; el desactivado que ya tenía se conserva) y una
  cantidad no menor que lo que entró por `sobrante` (23514 hint `cantidad`). La interfaz además lo muestra como texto plano sin `repuestos.editar` o con
  el proyecto cerrado.
- El ítem nace en la única fase inicial activa del flujo de repuestos con su fila de historial; si hay cero o varias, o algo que decidir, nace sin fase.
- Un ítem con historial, documentos, compras, gastos o stock no se borra: pasa a stock o se marca perdido (fase final sin llegar).
- Imágenes: **tope 8 por ítem en la base** (`repuestos_imagen_integridad`, candado por ítem; el mismo 8 en `entities/items/imagenes.ts`); la tabla sólo
  admite insert y delete, las dos con `repuestos.editar` y `repuestos.ver`, y sólo de un ítem vivo de un proyecto abierto (`repuestos_imagen_integridad`,
  `repuestos_imagen_quitar`: 23514 hint `item` o `proyecto`; un borrado en cascada con su ítem pasa). La app **no borra objetos**: borrar la fila encola la
  ruta (`repuestos_imagen_encolar`, por refcount) y «Deshacer» la rescata; Storage `repuestos` no tiene policy de borrar, y subir pide la carpeta `<ítem>/`
  de un ítem vivo de un proyecto abierto con los dos permisos (`puede_objeto_de_repuesto`).
- Un valor de catálogo en uso (por un ítem, aun eliminado, o una línea de cotización) no se borra: se desactiva. Los valores se escriben directo bajo la
  RLS de `repuestos.configurar`; el UPDATE es sólo de `nombre`, `activo` y `orden` (`catalogo`, `id` y `datos` dan 42501).
- **El stock se mueve sólo por RPC**: sin INSERT de `repuestos_stock_movimientos` (ni su secuencia) ni UPDATE de `en_stock_desde` o `stock_cantidad`.
  `repuesto_stock_mover` (cantidad positiva, el sentido sale del motivo; `PT409` si el stock cambió) y `repuesto_stock_reasignar` (todo o nada, idempotente
  por el id del ítem nuevo, comprobado tras el candado del origen) toman el ítem `for update`; el stock nunca queda negativo. Lo que entra por `sobrante` no
  pasa de la cantidad menos lo ya entrado. `en_stock_desde` lo fija la base al pasar de 0 y lo limpia al volver a 0: con algo en stock, el ítem no cuenta
  para la espera de su vehículo. Valen en un proyecto cerrado; el destino cerrado no recibe. El parámetro es `p_unidades` (`escala.sql` toma `p_cantidad`
  por un tamaño de página). Tras mover, la fila toma `stock_cantidad`, `en_stock_desde` y `actualizado_en` de la respuesta, sin releer.
- **Las compras se escriben sólo por RPC** (`repuesto_compra_guardar`: esperada nula crea, idempotente por id; puesta, edita con `PT409`; `_eliminar`,
  `_restaurar`), con `repuestos.costos.editar` y `repuestos.ver`. `monto_base`, `tipo_cambio_aplicado` y `tipo_cambio_id` los pone la base con el tipo de
  cambio **por defecto vigente** al crear o al cambiar la moneda, y quedan congelados al editar el monto; mandarlos en `p_datos` da 22023. Un proyecto
  cerrado no recibe ni cambia compras (23514); tampoco se restaura una compra cuyo ítem se eliminó. Se leen sólo con `repuestos.costos.ver` (RLS).
- **El margen** (`repuestos_proyecto_margen`) lo calcula la base por moneda: Σ cantidad × `precio_cliente` de los ítems vivos − Σ compras vivas. Con algún
  ítem vivo sin precio **o con precio y sin moneda**, el margen es nulo en todas las monedas; `sin_precio` corta en 201. Pide `repuestos.costos.ver` y
  `repuestos.ver`. Usa la cantidad pedida: lo que pasó a stock o se reasignó no la descuenta. En pantalla, nulo es «Sin precio en N ítems» y 0 es un monto.
- Las pestañas de costos se esconden con `puede(permisos, 'repuestos.costos.ver')`, nunca por rol; es comodidad: la autoridad es la RLS y el
  `assert_permiso` del margen. «Cotizaciones» pide `repuestos.cotizar`, no basta `repuestos.costos.ver`.
- `repuestos_cotizador_config` es append-only: la vigente es la de id más alto; una cotización congela su `config_snapshot`. Configuración, tramos y cajas
  se escriben directo bajo la RLS de `repuestos.configurar` (no otorgan permisos); publicar agrega una fila (`creado_por` = quien pide, lo exige la policy)
  y sólo afecta a las cotizaciones nuevas. Tramos y cajas se desactivan, no se borran; un tramo no tiene montos negativos
  (`repuestos_tramos_logistica_signo_check`). Los decimales viajan como texto canónico, nunca como `float` («2.000» es 2000 en es-BO).
- Dos tramos activos de una misma moneda no se cruzan (`trg_tramo_sin_solape`, 23P01 hint `costo_min`); contiguos sí.
- **Las cotizaciones se escriben sólo por RPC**: `repuestos_cotizacion_crear` (congela la config de id más alto y los tramos y cajas activos de la moneda;
  idempotente por id), `_guardar` (reemplaza las líneas y recalcula cada total con **su** snapshot; mandar `total` o una sugerencia da 22023; el error dice
  «Línea N», `hint` = campo, `detail` = id), `_aceptar` (pide además `repuestos.editar`: copia unitario y moneda a cada ítem vivo y anula la aceptada
  anterior; **una sola aceptada por proyecto**, índice parcial) y `_anular` (no revierte precios). Todas piden `repuestos.cotizar` y `repuestos.ver` y el
  proyecto vivo y abierto. Aceptada o anulada no se edita. Sin INSERT, UPDATE ni DELETE directos en cotizaciones y líneas. Al aceptar, `<Confirmar>`
  muestra el total **guardado**; «Aceptar» se apaga con `motivoParaNoAceptar` (sin `repuestos.editar`, cambios sin guardar o sin total).

## Ojo

- Las esperas vehículo↔repuestos (`fases_requisitos.espera_fase_id`) cumplen cuando ningún ítem vivo está pendiente; los que terminaron sin llegar no
  frenan y se muestran. La regla vive en `_repuesto_ante_espera` (`llego` / `sin_llegar` / `pendiente`) y `evaluar_requisitos` —de `flujos`— la usa en su
  rama `hijos`, con `detalle = {hijos, llegaron, sin_llegar}`. Si `flujos` recrea `evaluar_requisitos`, conserva esa rama.
- Por encima del último tramo de logística no hay sugerencia: la celda queda vacía y el total dice «Sin total · Falta la logística»; no asume 0 (`XCell`
  no tiene `emptyLabel`).
