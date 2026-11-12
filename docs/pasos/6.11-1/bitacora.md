## 2026-11-11 — Paso 6.11-1: los huecos «Gastos» y «Margen» (parte 1 de 4 del 6.11)

- **Hecho:**
  - `entities/dinero/`: el margen (el texto de cada nulo), el gasto y su formulario (con las reglas de la base), los tipos de cambio que se ofrecen, las categorías y los paneles de la URL.
  - `infra/dinero/`: lecturas del navegador (los gastos de la unidad, `margen_vehiculo`, `mis_permisos`, catálogos, comprobante) y escrituras por las RPC de 6.10 con el campo de cada validación.
  - Hueco «Gastos»: lista, «Registrar gasto» y «Editar» en un `<Drawer>` con tipo de cambio y comprobante, borrador, conflicto y sin conexión, y eliminar con `<Confirmar>`.
  - Hueco «Margen»: cotizado, real, desviación, venta y margen, y el real por categoría; se vuelve a leer al guardar o eliminar un gasto.
- **Commits:**
  - `180d1a88`: entities de dinero.
  - `f7a28200`: lecturas y escrituras de los gastos.
  - `ae8bcdcc`: hueco de gastos.
  - `0daaa713`: hueco de margen.
  - `a1430dee`: e2e del camino feliz.
  - docs de la parte.
- **Verificación** (`.piloto/salidas/6.11/`):
  - `e2e/logistica-gastos-y-pagos.spec.ts` (escritorio): 2 ✓ (`e2e-gastos.txt`).
  - Dirigidos `e2e/logistica-unidad.spec.ts` (escritorio y celular) y `e2e/configuracion-logistica.spec.ts`: 18 ✓ (`e2e-dirigidos.txt`).
  - `vitest` de `entities/dinero` y `features/dinero`, y las guardas.
- **Para PLAN (coordinador):**
  - Fila 6.11: «Partes: 4. **6.11-1** hecho: entities de dinero, hueco «Gastos» y hueco «Margen» del panel de la unidad, e2e tramo 1. Quedan 6.11-2 (pagos, confirmar, anular), 6.11-3 (`/logistica/gastos`) y
    6.11-4 (prorratear y categorías).» La fila sólo se marca integrada con la parte 4.
- e2e completo: no (6.11-1, Nivel 1: lo corre el CI del PR; el dirigido e2e/logistica-gastos-y-pagos.spec.ts en verde)
