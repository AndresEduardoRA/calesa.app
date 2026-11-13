## 2026-11-12 · Paso 8.13-2: el panel del ítem de repuestos (parte 2 de 5)

### Hecho

- `?item=<id>` sobre la hoja de `/repuestos/[id]` abre `<PanelDeLaUnidad>` con el ítem: «Qué falta» y mover (`{ repuesto }` al motor de `flujos`), Documentos, Transporte («Sigue al vehículo» o
  «Este proyecto no tiene vehículo»), Notas e Historial; «Abrir proyecto» en vez de «Abrir ficha». Cada fila de la hoja gana «Abrir panel».
- `logistica` (núcleo y áreas `mover`, `documentos`, `transporte`): `Unidad.origenId` nulo para el ítem y `proyecto?`, `esUnidadDeVehiculo`, huecos con variante `repuesto?` y `huecosVisibles({ tipo })`,
  notas e historial por `repuesto_id`, tipos de documento del flujo de repuestos (`origen_id is null`), `unidadAMover`. Sin permiso, «Elegir» sale apagado con su motivo sólo para un ítem.
- `flujos`: `estadoDelBoton({ tipo })` y `MOTIVO_SIN_PERMISO_DE_MOVER_UN_REPUESTO`. `repuestos` (área `flujo`): `leerItemDelPanel`, `itemAbiertoDe`, `<DrawerDelItem>` (diferido), `<BotonDelPanelDelItem>`, `useItemPorUrl`.
- Fichas de `logistica` y `repuestos`. Sin migración ni permisos nuevos.
- **Abiertos:** **8-13a** (fuera de regla y quién la movió del ítem) sigue; **nuevo 8-13b**: el transporte propio de un ítem sin vehículo (formulario con `transporte_guardar(p_repuesto)`); hoy sólo texto.
  La fila 8.13 queda «partes 3 a 5 pendientes» (lo anota el carril `a`).

### Verificación

- Nivel 1: vitest de `scripts/guardas`, `src/app`, `logistica`, `flujos` y `repuestos` (2323 en verde); nuevas pruebas de `hueco`, `nota` (esquemas), `unidad-a-mover`, `transporte`, `paneles`, `item-del-panel` y `boton-de-mover`.
- e2e dirigidos (escritorio): `repuestos-item-panel` (2, también en movil), `logistica-documentos`, `logistica-mover`, `logistica-transporte`, `logistica-unidad`, `repuestos-proyecto` y `repuestos-stock`: 31 en verde.
- e2e completo: no (8.13-2, Nivel 1: lo prueba el CI del PR; dirigidos: repuestos-item-panel, logistica-mover, logistica-documentos, logistica-transporte, logistica-unidad, repuestos-proyecto, repuestos-stock)
