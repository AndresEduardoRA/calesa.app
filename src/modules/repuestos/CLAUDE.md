# repuestos

Proyectos de repuestos por vehículo (o externos), ítems que recorren el flujo de repuestos con el mismo motor, imágenes, stock, compras con permiso de costos y un cotizador propio con configuración versionada.

## Entra y sale

- Entra: proyectos desde la ficha del vehículo o sueltos, hoja de ítems editable celda a celda (XCell compacta), compras, movimientos de stock, cotizaciones de repuestos.
- Sale: `proyectoDe(vehiculoId)`, `esperasQueDestraban(vehiculoId)` (para `flujos`/`logistica`), `<ResumenRepuestos>`. Lo consumen `vehiculos`, `logistica`, `tablero`, `buscador`.
- Sale por `index.ts` (área `catalogos`, 8.08-2): `leerCatalogosDeRepuestos()` (los cuatro, con los desactivados, tope 200 cada uno) y `CATALOGOS_DE_REPUESTOS`; por
  `client.ts`, lo puro del formulario de un valor (`validarValor`, `cambiosDeValor`, `ordenSiguiente`…). Las actions `crearValor`, `guardarValor` y
  `eliminarValor` (`features/catalogos/actions/`, `repuestos.configurar`) no salen por los barriles: las importan en relativo los componentes de la 8.08-3.
- Sale por `pantallas/catalogos.ts` (8.08-3): `<CatalogosDeRepuestos>`, la pestaña «Catálogos» de `/configuracion/repuestos`; la lee `src/app/(app)/configuracion/repuestos/seccion-catalogos.tsx`.
- Sale por `pantallas/proyectos.ts` (8.09-1): `<ListadoDeProyectos>`, `<BotonNuevoProyecto>`, `<DrawerDeNuevoProyectoDiferido>` y `useNuevoProyectoPorUrl`; por el `index.ts` del área, el
  pedido del listado (`esquemaDelListado`, `pedidoDelListado`, `leerCursorDeProyectos`), `leerProyectosDelListado` y el estado derivado (`estadoDelProyecto`). La action
  `crearProyecto` no sale por los barriles: la importa el hook del drawer. El cursor del listado es el `numero` y no tiene «Anterior»; los buscadores de vehículo y de lead los
  compone `src/app/(app)/repuestos/` (este módulo no importa `buscador`).
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
- `entities/stock.ts` — reglas de sobrante (reasignar / vender suelto / devolver) y movimientos.
- `features/proyectos/`, `features/items/` (hoja), `features/compras/`, `features/stock/`, `features/cotizador/`, `features/catalogos/`.
- La base (8.08-1): `repuesto_proyecto_crear` / `_cerrar` / `_reabrir` / `_eliminar` / `_restaurar`, `repuesto_item_crear` / `_eliminar`,
  `repuestos_proyectos_listar`, `repuestos_pendientes_de_vehiculo`, `_repuesto_ante_espera` y el trigger `repuestos_catalogo_sin_uso`. Sus pruebas, en
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
- Los valores de catálogo se escriben directo bajo la RLS de `repuestos.configurar` (sin RPC: no otorgan permisos); guardar nunca manda `catalogo`
  (el grant de UPDATE es de toda la tabla: lo acota la 8.10, H1). Cero filas al escribir nunca es éxito.

## Ojo

- Las esperas vehículo↔repuestos (`fases_requisitos.espera_fase_id`) cumplen cuando ningún ítem vivo está pendiente; los que terminaron sin llegar no frenan y se muestran.
  La regla vive en `_repuesto_ante_espera` (`llego` / `sin_llegar` / `pendiente`) y `evaluar_requisitos` —de `flujos`— la usa en su rama `hijos`, con
  `detalle = {hijos, llegaron, sin_llegar}` (8.08-1). Si `flujos` recrea `evaluar_requisitos`, conserva esa rama.
- Por encima del último tramo de logística no hay sugerencia: la celda pide el monto (`emptyLabel`), no asume 0.
