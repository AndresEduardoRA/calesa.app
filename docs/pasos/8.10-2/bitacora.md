## 2026-11-12 · Paso 8.10-2: el servidor del stock, «Pasar a stock» y el historial del ítem (parte 2 de 3)

### Hecho

- La fila de la hoja lee `stock_cantidad` (núcleo, `FilaDeItem.stockCantidad`).
- El servidor del stock: `moverStock` (`repuestos.editar` con `puede()` antes de `repuesto_stock_mover`; `sobrante`, `vendido` y `devuelto`) y
  `leerMovimientosDeItem` (RLS de `repuestos.ver`, `id desc` por cursor sobre `repuestos_stock_movimientos_item_id_idx`), con su esquema Zod, la traducción
  del rechazo de la base por campo (`rechazoDeStock`) y la fila tras mover (`filaTrasMover`).
- El hueco de la hoja (`HuecoDeLaHoja`: una acción por fila y un panel, con `cambiarFila` sobre la fila vigente): lo llena
  `src/app/(app)/repuestos/[id]/hoja-con-stock.tsx`, así el área `items` no importa `stock`.
- «Stock» en cada fila con «En stock: N» y el panel `?panel=stock&item=<id>`: «Pasar a stock» (cantidad y nota) con `repuestos.editar` y el historial con
  «Ver más» hasta 500. Registrado en `scripts/guardas/areas-c/drawers-con-salida.ts`.
- `e2e/repuestos-stock.spec.ts`: pasar 2 de 3 a stock, la fila y el historial, recargar con el panel abierto.

Commits: `3c57dc82`, `b891f4b1`, `d0318c76`, `389825f9`, `becf6626`, `6ea05695` y el de docs.

### Verificación

- e2e dirigidos `repuestos-stock` y `repuestos-proyecto` en escritorio y movil: 14 de 14 (`.piloto/salidas/8.10-2/e2e-dirigidos.txt`).
- `vitest` de `scripts/guardas` y `src/modules/repuestos`: 1.263 en verde (`.piloto/salidas/8.10-2/vitest.txt`); `pnpm typecheck` limpio
  (`.piloto/salidas/8.10-2/typecheck.txt`); `lint` en cada commit (hook).
- Sin SQL: no corre `db:probar` (la parte no toca `supabase/`).

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.10-2 hecha: el servidor del stock (mover y movimientos), «Pasar a stock» y el historial del ítem en la hoja. **8.10 sigue:** falta 8.10-3 (reasignar del lado
  servidor, la vista «Stock» con reasignar, vender suelto y devolver, y el e2e del assert).
- Pulido para la Fase 9: tras pasar a stock, el estado derivado de la cabecera del proyecto (pendientes) se ve al volver a entrar (D8 de 8.10-2).

e2e completo: no (8.10-2, Nivel 1: lo corre el CI del PR; dirigidos repuestos-stock y repuestos-proyecto en escritorio y movil)
