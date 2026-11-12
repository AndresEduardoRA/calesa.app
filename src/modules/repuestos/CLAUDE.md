# repuestos

Proyectos de repuestos por vehículo (o externos), ítems que recorren el flujo de repuestos con el mismo motor, imágenes, stock, compras con permiso de costos y un cotizador propio con configuración versionada.

## Entra y sale

- Entra: proyectos desde la ficha del vehículo o sueltos, hoja de ítems editable celda a celda (XCell compacta), compras, movimientos de stock, cotizaciones de repuestos.
- Sale: `proyectoDe(vehiculoId)` y `leerResumenDeVehiculo(vehiculoId)` (8.09-4, por el `index.ts` del área `proyectos`), `esperasQueDestraban(vehiculoId)` (para `flujos`/`logistica`), `<ResumenRepuestos>` (por `pantallas/proyectos-vehiculo.ts`, 8.09-4: la pestaña «Repuestos» de `/vehiculos/[id]`). Lo consumen `vehiculos`, `logistica`, `tablero`, `buscador`.
- Sale por `index.ts` (área `catalogos`, 8.08-2): `leerCatalogosDeRepuestos()` (los cuatro, con los desactivados, tope 200 cada uno) y `CATALOGOS_DE_REPUESTOS`; por
  `client.ts`, lo puro del formulario de un valor (`validarValor`, `cambiosDeValor`, `ordenSiguiente`…). Las actions `crearValor`, `guardarValor` y
  `eliminarValor` (`features/catalogos/actions/`, `repuestos.configurar`) no salen por los barriles: las importan en relativo los componentes de la 8.08-3.
- Sale por `pantallas/catalogos.ts` (8.08-3): `<CatalogosDeRepuestos>`, la pestaña «Catálogos» de `/configuracion/repuestos`; la lee `src/app/(app)/configuracion/repuestos/seccion-catalogos.tsx`.
- Sale por `pantallas/proyectos.ts` (8.09-1): `<ListadoDeProyectos>`, `<BotonNuevoProyecto>`, `<DrawerDeNuevoProyectoDiferido>` y `useNuevoProyectoPorUrl`; por el `index.ts` del área, el
  pedido del listado (`esquemaDelListado`, `pedidoDelListado`, `leerCursorDeProyectos`), `leerProyectosDelListado` y el estado derivado (`estadoDelProyecto`). La action
  `crearProyecto` no sale por los barriles: la importa el hook del drawer. El cursor del listado es el `numero` y no tiene «Anterior»; los buscadores de vehículo y de lead los
  compone `src/app/(app)/repuestos/` (este módulo no importa `buscador`).
- Sale por `pantallas/items.ts` (8.09-2): `<HojaDeItems>` (la hoja de `/repuestos/[id]`); por `pantallas/proyectos.ts`, además, `<CabeceraDeProyecto>`. Por el `index.ts`: `leerProyecto`, `leerItemsDelProyecto`,
  `leerItem`, `cuentasDeLaHoja` y `FilaDeItem` (núcleo). Las actions `guardarCelda`, `crearItem`, `eliminarItem`, `cerrarProyecto` y `reabrirProyecto` no salen por los barriles.
- **La hoja** (`features/items/`): sólo cantidad y precio son `XCell` (es numérica); el resto son celdas propias. Guardar una celda es un `update` directo por columna que **versiona el repositorio**
  (`infra/items/guardar.ts`, `.eq('actualizado_en', …)`): cero filas nunca es éxito. Una cola por fila (`colaPorClave`) evita que dos celdas del mismo ítem choquen. Las funciones que bajan a las
  `XCell` son estables (`memo`). Sin `repuestos.editar` o con el proyecto cerrado, texto plano. La base **no** frena el `update` de un ítem de un proyecto cerrado (hueco para 8.10).
- **Resumen en la ficha y eliminar** (8.09-4, `features/proyectos/`): la pestaña «Repuestos» (`repuestos.ver` global; la lee `src/app/(app)/vehiculos/[id]/seccion-repuestos.tsx` al abrirla) dibuja `<ResumenRepuestos>`: sin proyecto, «Crear proyecto de repuestos» (sólo con `repuestos.editar`) que abre `/repuestos?panel=nuevo-proyecto&vehiculo=<id>`; con él, el enlace, el estado y los ítems por fase (≤ 201 leídos; «más de 200»). Un archivo `pantallas/<x>.ts` sin prefijo de área es del núcleo y no importa un área (D76). «Eliminar proyecto» (cabecera, `repuestos.editar` y hoja sin ítems) va sin confirmación y con «Deshacer» (`eliminarProyecto` y `restaurarProyecto`, que no salen por los barriles).
- **Imágenes del ítem** (8.09-3, `features/items/`): panel `?panel=imagenes&item=<id>` (`pantallas/items.ts` lo trae con la hoja), objetos `<item_id>/<sha-256>.webp` en el bucket `repuestos`, **tope 8 en la base** (`repuestos_imagen_integridad`, candado por ítem) y el mismo 8 en `entities/items/imagenes.ts`. La tabla sólo se escribe por insert y delete (sin UPDATE). La app **no borra objetos**: borrar la fila encola la ruta (`repuestos_imagen_encolar`, por refcount) y «Deshacer» la rescata. Las actions `leerImagenesDeItem`, `agregarImagenes` y `quitarImagen` no salen por los barriles. La subida usa `subirPorHash` de `shared` desde el hook (D73). La base no frena borrar una imagen de un proyecto cerrado (hueco para 8.10).
- **Stock del ítem** (8.10-2, área `stock`): la hoja tiene un hueco (`HuecoDeLaHoja`: `accionDeFila(fila)` y `panel(api)` con `cambiarFila` sobre la fila vigente; tipos por
  `pantallas/items.ts`) que llena `src/app/(app)/repuestos/[id]/hoja-con-stock.tsx` con lo de `pantallas/stock.ts` (`BotonDeStock`, `PanelDeStock`, `useStockPorUrl`): el
  área `items` no importa `stock`. Panel `?panel=stock&item=<id>` con «Pasar a stock» y el historial con «Ver más». Tras mover, la fila toma `stock_cantidad`,
  `en_stock_desde` y `actualizado_en` de la respuesta de la RPC, sin releer (D3 de 8.10-2). La fila de la hoja lee `stock_cantidad` (núcleo). Las actions `moverStock`
  (`repuestos.editar` con `puede()` antes; `sobrante`, `vendido`, `devuelto`) y `leerMovimientosDeItem` (RLS de `repuestos.ver`) no salen por los barriles.
- **Vista «Stock»** (8.10-3): `/repuestos?vista=stock` la arma `src/app/(app)/repuestos/` (`listado-de-stock.tsx`, `stock-con-destino.tsx`) con `leerStock`,
  `leerCursorDeStock`, `esVistaDeStock` y `CLAVE_DE_VISTA_DE_REPUESTOS` (por `areas/stock/index.ts`) y `<VistaDeStock>` (por `pantallas/stock-vista.ts`). El «⋯» abre
  reasignar, vender suelto y devolver (`?panel=reasignar-stock|vender-stock|devolver-stock&item=<id>`). El campo «Proyecto destino» lo compone
  `src/app/(app)/repuestos/buscador-de-proyecto-destino.tsx` con `buscarProyectoAbierto` de `pantallas/proyectos.ts` (render prop: el área `stock` no importa
  `proyectos`). Las actions `reasignarStock` y `buscarProyectosAbiertos` (las dos con `repuestos.editar` antes) no salen por los barriles.
- Depende de: `vehiculos`, `flujos`, `leads`.

## Áreas

El módulo se parte por **área** (8.08-2, igual que `logistica`) para que los pasos 8.09–8.13 agreguen archivos propios y no editen los compartidos. Un área vive en
`features/<área>/`, `entities/<área>/`, `infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts` (y `pantallas/<área>-<pantalla>.ts`). El
**núcleo** es la carpeta `nucleo` de cada capa. `index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área: nadie los edita.

| Área        | La llena                | Qué es                                                          |
| ----------- | ----------------------- | --------------------------------------------------------------- |
| `nucleo`    | —                       | lo compartido entre áreas (hoy vacío)                           |
| `proyectos` | 8.09                    | `/repuestos`: el listado de proyectos, crear, cerrar, eliminar  |
| `items`     | 8.09                    | `/repuestos/[id]`: la hoja de ítems                             |
| `stock`     | 8.10                    | movimientos de stock y sobrantes                                |
| `compras`   | 8.11                    | compras y pagos (con `repuestos.costos.*`)                      |
| `cotizador` | 8.12                    | la configuración versionada y las cotizaciones de repuestos     |
| `catalogos` | 8.08 (pantalla: 8.08-3) | los cuatro catálogos: leer, crear, guardar y borrar valores     |
| `flujo`     | 8.13                    | el panel de pendientes para `logistica` y los bloques de Inicio |

**Un área no importa otra** (lo vigila `scripts/guardas/areas-c/areas-de-repuestos.test.ts`): lo compartido va al núcleo.

## Archivos clave

- `entities/cotizador.ts` — fórmula importado (costo × factor + logística + caja) / local ((costo + logística + caja) × (1 + recargo)) con redondeo del snapshot; tests.
- `entities/stock/` (8.10-1) — `motivos.ts` (los cinco motivos, su sentido y su texto; `MOTIVOS_POR_MOVER`, `MOTIVOS_CON_BOTON`), `reglas.ts` (espejo de las RPC del stock:
  `disponibleParaStock`, `validarMovimiento`, `validarReasignacion`, `enStockTras`; los textos son los de la base y un test lo compara con la migración) y `listado.ts`
  (la fila de `repuestos_stock_listar` y su cursor `(en_stock_desde, id)` con `codificarCursor` de `shared`, sin «Anterior»).
- `infra/stock/listar.ts` (8.10-1) — `leerStock(cursor)`: `repuestos_stock_listar` con `TAMANO_DE_PAGINA_POR_DEFECTO` (la lee la vista «Stock» de 8.10-3).
- `entities/stock/{errores,mover,movimientos,paneles,repositorio}.ts` (8.10-2) — el rechazo de la base por campo (`rechazoDeStock`), la respuesta de mover y la fila tras
  moverlo (`filaTrasMover`), la página del historial (cursor `id`) y el panel. `infra/stock/{mover,movimientos}.ts` los leen y escriben; `areas/stock/composicion.ts` los une.
- `entities/stock/{reasignar,vista}.ts` (8.10-3) — la respuesta de reasignar y las claves y rutas de la vista «Stock»; `infra/stock/reasignar.ts` la llama.
- `entities/compras/margen.ts` (8.11-1) — `leerMargen` (la respuesta de `repuestos_proyecto_margen`: `sinPrecio` como conteo acotado, tope 200, y el margen en nulo
  si hay ítems sin precio aunque llegue un número) y `textoSinPrecio` («Sin precio en N ítems»). Sin aritmética de dinero: la cuenta es de la base.
- `features/proyectos/`, `features/items/` (hoja), `features/compras/`, `features/stock/`, `features/cotizador/`, `features/catalogos/`.
- La base (8.08-1): `repuesto_proyecto_crear` / `_cerrar` / `_reabrir` / `_eliminar` / `_restaurar`, `repuesto_item_crear` / `_eliminar`,
  `repuestos_proyectos_listar`, `repuestos_pendientes_de_vehiculo`, `_repuesto_ante_espera` y el trigger `repuestos_catalogo_sin_uso`. De 8.09-3: los triggers `repuestos_imagen_integridad` y `repuestos_imagen_encolar` (prueba `areas/repuestos/imagenes.sql`). De 8.10-1: `repuesto_stock_mover`,
  `repuesto_stock_reasignar` (con `_repuesto_stock_item` y `_repuesto_stock_aplicar`, privadas) y `repuestos_stock_listar` (pruebas `stock.sql`, `stock-reasignar.sql`,
  `stock-listar.sql` y E7 de `esperas.sql`; carreras `scripts/carreras/repuestos-stock.mjs`). De 8.11-1: `repuesto_compra_guardar` / `_eliminar` / `_restaurar`
  (con `_repuesto_compra_tc_vigente`, `_repuesto_compra_proyecto` y `_repuesto_compra_de_datos`, privadas; prueba `compras.sql`) y
  `repuestos_proyecto_margen` (prueba `compras-margen.sql`). Sus pruebas, en
  `supabase/tests/areas/repuestos/` (`proyectos`, `base`, `listar`, `esperas`, `catalogos`).

## Tablas

`repuestos_catalogos` (un catálogo genérico: `catalogo` ∈ tipo_pieza | condicion | modo_transporte | pais_origen, con `datos` jsonb), `repuestos_proyectos`, `repuestos_items`, `repuestos_items_imagenes`, `repuestos_stock_movimientos`, `repuestos_compras`, `repuestos_cotizador_config`, `repuestos_tramos_logistica`, `repuestos_cajas`, `repuestos_cotizaciones`, `repuestos_cotizaciones_lineas`.

## No se rompe

- Es el **ítem**, no el proyecto, el que recorre el flujo; el estado del proyecto se deriva. Mover pasa por `cambiar_fase(repuesto_id)`.
- Ningún costo vive en `repuestos_items` (RLS no esconde columnas): compras y pagos tienen su tabla y su permiso (`repuestos.costos.*`).
- `repuestos_cotizador_config` es append-only: la vigente es la de id más alto; una cotización congela su `config_snapshot`.
- Un ítem con historial, documentos, compras, gastos o stock no se borra: pasa a stock o se marca perdido (fase final sin llegar).
- Proyectos e ítems se crean, cierran, eliminan y restauran **sólo por RPC** (sin INSERT directo; `eliminado_en`, `cerrado_en`, `vehiculo_id`, `fase_id` y
  `stock_cantidad` no tienen grant de UPDATE). Toda RPC que escribe pide `repuestos.editar`. Un proyecto sólo se elimina vacío.
- El ítem nace en la única fase inicial activa del flujo de repuestos con su fila de historial; si hay cero o varias, o algo que decidir, nace sin fase.
- Un valor de catálogo en uso (por un ítem, aun eliminado, o una línea de cotización) no se borra: se desactiva.
- **El stock se mueve sólo por RPC** (8.10-1): sin INSERT de `repuestos_stock_movimientos` (ni su secuencia) ni UPDATE de `en_stock_desde` o `stock_cantidad`.
  `repuesto_stock_mover` (cantidad positiva, el sentido sale del motivo; `PT409` si el stock cambió) y `repuesto_stock_reasignar` (todo o nada, idempotente
  por el id del ítem nuevo, comprobado tras el candado del origen) toman el ítem `for update`; el stock nunca queda negativo. Lo que entra por `sobrante` no pasa
  de la cantidad menos lo ya entrado. `en_stock_desde` lo fija la base al pasar de 0 y lo limpia al volver a 0: con algo en stock, el ítem no cuenta para la
  espera de su vehículo (una sola unidad basta). Valen en un proyecto cerrado; el destino cerrado no recibe. El parámetro es `p_unidades` (`escala.sql` toma
  `p_cantidad` por un tamaño de página).
- **Las compras se escriben sólo por RPC** (8.11-1): `repuesto_compra_guardar` (la esperada nula crea, idempotente por id; puesta, edita con `PT409`),
  `repuesto_compra_eliminar` y `repuesto_compra_restaurar`, con `repuestos.costos.editar` y `repuestos.ver`; sin INSERT, UPDATE ni DELETE directos. `monto_base`,
  `tipo_cambio_aplicado` y `tipo_cambio_id` los pone la base con el tipo de cambio **por defecto vigente** al crear o al cambiar la moneda, y quedan congelados al
  editar el monto (como `pagos`); mandarlos en `p_datos` da 22023. Un proyecto cerrado no recibe ni cambia compras (23514); restaurar una compra cuyo ítem se
  eliminó, tampoco. Se leen sólo con `repuestos.costos.ver` (RLS).
- **El margen del proyecto** (`repuestos_proyecto_margen`, 8.11-1) lo calcula la base por moneda: Σ cantidad × `precio_cliente` (unitario) de los ítems vivos − Σ
  compras vivas. Con algún ítem vivo sin precio **o con precio y sin moneda**, el margen es nulo en todas las monedas (nulo no es 0); `sin_precio` corta en 201. Pide
  `repuestos.costos.ver` y `repuestos.ver`. Usa la cantidad pedida: lo que pasó a stock o se reasignó no la descuenta.
- Los valores de catálogo se escriben directo bajo la RLS de `repuestos.configurar` (sin RPC: no otorgan permisos); el UPDATE es sólo de `nombre`, `activo` y
  `orden` (8.10-1): `catalogo`, `id` y `datos` dan 42501. Cero filas al escribir nunca es éxito.

## Ojo

- Las esperas vehículo↔repuestos (`fases_requisitos.espera_fase_id`) cumplen cuando ningún ítem vivo está pendiente; los que terminaron sin llegar no frenan y se muestran.
  La regla vive en `_repuesto_ante_espera` (`llego` / `sin_llegar` / `pendiente`) y `evaluar_requisitos` —de `flujos`— la usa en su rama `hijos`, con
  `detalle = {hijos, llegaron, sin_llegar}` (8.08-1). Si `flujos` recrea `evaluar_requisitos`, conserva esa rama.
- Por encima del último tramo de logística no hay sugerencia: la celda pide el monto (`emptyLabel`), no asume 0.
