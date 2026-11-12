## 2026-11-12 · Paso 8.09-2: `/repuestos/[id]`, cerrar y la hoja de ítems (parte 2 de 4 del 8.09)

### Hecho

- Lectura: `leerProyecto` (proyecto por clave bajo la RLS; nulo = no existe o no se ve) y `leerItemsDelProyecto` (hasta 200 con la fase embebida, `limit 201` por `repuestos_items_proyecto_id_idx`);
  `FilaDeItem` vive en el núcleo (`entities/nucleo/item.ts`). Con tests.
- Cerrar y reabrir un proyecto (`cerrarProyecto`, `reabrirProyecto`, `repuesto_proyecto_cerrar` y `_reabrir` con la versión que se vio) con toast «Deshacer».
- `/repuestos/[id]`: cabecera (número, vehículo con enlace o «Externo», cliente, notas, estado, Cerrar/Reabrir), `pestanas.ts` con los huecos de Compras (8.11) y Cotizaciones (8.12) sin dibujar, y la hoja de
  ítems en tabla desde 768 px y tarjetas debajo. `disponible: true` en `_shell/navegacion.ts`; «Nuevo proyecto» ahora va al detalle (D61).
- Editar la hoja con `repuestos.editar` y el proyecto abierto: `guardarCelda` (un `update` por columna con `actualizado_en`; cero filas = conflicto o «ya no existe»), cola por fila, fila nueva
  (`crearItem`, idempotente por id, el foco queda en la fila nueva) y `eliminarItem` con su `<Confirmar>` con URL (`?panel=eliminar-item&item=<id>`, registrado en `confirmar-con-url`).

### Commits

- `feat(repuestos): leer un proyecto y los ítems de su hoja`
- `feat(repuestos): cerrar y reabrir un proyecto`
- `feat(repuestos): detalle del proyecto con cabecera y la hoja de lectura`
- `feat(repuestos): guardar una celda de la hoja con su versión`
- `feat(repuestos): editar la hoja, fila nueva y eliminar un ítem`
- `test(repuestos): recorrido de la hoja de ítems`

### Verificación

- `e2e/repuestos-proyecto.spec.ts`: 8 de 8 (4 pruebas, escritorio y celular; `.piloto/salidas/8.09-2/e2e-proyecto.txt`) y `e2e/repuestos-listado.spec.ts`: 6 de 6 (`e2e-listado-3.txt`).
- `vitest` de `src/modules/repuestos`, `src/app/(app)/repuestos` y `scripts/guardas`: en verde (`vitest-5.txt`). `typecheck` y `lint` sin avisos.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.09 se parte así: **8.09-1** hecha (`/repuestos`, «Nuevo proyecto»); **8.09-2** hecha (detalle, cerrar, hoja); **8.09-3** imágenes del ítem (`?panel=imagenes&item=<id>`, un botón en la columna de acciones de la fila);
  **8.09-4** `<ResumenRepuestos>`, `proyectoDe(vehiculoId)` (`pantallas/vehiculo.ts`), el caso «desde la ficha del vehículo» en `repuestos-proyecto.spec.ts` y eliminar un proyecto vacío con «Deshacer» (D55).
- Pulido para la Fase 9: la `XCell` muestra su etiqueta en cada celda de la hoja (densidad compacta, D48).
- Hueco para 8.10: el `update` por columna de un ítem no mira el proyecto cerrado ni el catálogo (ver `decisiones.md`).

8.09 sigue: faltan las partes 3 y 4 (imágenes y `<ResumenRepuestos>`).
e2e completo: no (8.09-2, Nivel 2 por navegacion.ts: lo corre el CI del PR; los dirigidos en verde)
