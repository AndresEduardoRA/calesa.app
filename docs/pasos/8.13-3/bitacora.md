## 2026-11-12 · Paso 8.13-3: la «Cadena», el hueco «Repuestos» del vehículo y el assert (parte 3 de 5)

### Hecho

- **Cadena de repuestos** (`/repuestos?vista=cadena`): una columna por fase del flujo de repuestos (más «Sin fase» si tiene ítems), una consulta por fase con `limit 51` y «Ver más» por cursor `(fase_desde, id)`;
  las fases finales, de lo más reciente. Tarjeta = enlace a `?item=<id>` (abre el panel de la parte 2), «Proyecto #N» y días en la fase. Búsqueda por descripción (3 letras) y `?proyecto=` en la URL con «Mostrando un solo proyecto».
  Celular: pestañas por fase (`?fase=`). Estados: sin fases (con «Configurar el flujo» si `repuestos.configurar`), sin repuestos, sin resultados, columna vacía. `PanelDelItem` pasa a `src/app/(app)/repuestos/panel-del-item.tsx`.
- **Hueco «Repuestos»** del panel de logística del vehículo (clave nueva `repuestos` en `ORDEN_DE_HUECOS`, tras `transporte`): «Espera N repuestos», cada ítem con su proyecto y «Para pasar a «X» espera que llegue a «Y».», enlace a su panel.
- **Assert del paso** `e2e/repuestos-espera-recorrido.spec.ts` (escritorio y movil, 3 pruebas): la dueña ve la espera en el vehículo y en «Qué falta»; con sólo `repuestos.ver` mover está apagado con su motivo; la dueña recibe el ítem desde
  la Cadena y el vehículo queda con «Cumplido» y `Mover a «Listo»` habilitado.
- **Para `docs/PLAN.md` (lo anota el carril `a`):** la fila 8.13 queda «partes 4 y 5 pendientes». **Para `docs/UX.md`:** fila «Repuestos»: vista «Cadena» y sus estados; panel de logística del vehículo: hueco «Repuestos».
- **Abiertos:** 8-13a y 8-13b siguen; **nuevo 8-13c**: índice `(fase_id, fase_desde, id)` en `repuestos_items` si la Cadena llega a miles (es una migración: otro paso).

### Verificación

- Nivel 1: vitest de `scripts/guardas`, `src/app`, `repuestos` y `logistica` (1977 en verde); pruebas nuevas de `cadena`, `cadena-filas`, `esperas` (encabezado y frase), `use-cadena-de-repuestos`, `hueco` y `huecos-de-la-unidad`. `lint` y `typecheck` limpios.
- e2e dirigidos, escritorio y movil: `repuestos-espera-recorrido` (3), `repuestos-item-panel`, `repuestos-stock`, `repuestos-proyecto`, `logistica-unidad`, `logistica-mover`: 50 en verde.
- e2e completo: no (8.13-3, Nivel 1: lo prueba el CI del PR; dirigidos: repuestos-espera-recorrido, repuestos-item-panel, repuestos-stock, repuestos-proyecto, logistica-unidad, logistica-mover)
