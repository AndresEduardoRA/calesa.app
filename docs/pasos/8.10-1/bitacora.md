## 2026-11-12 · Paso 8.10-1: la base del stock de repuestos (parte 1 de 3)

### Hecho

- Migración `repuestos_stock_mover`: `nota` en los movimientos; sin INSERT directo de movimientos (ni la secuencia) ni `UPDATE(en_stock_desde)`;
  `repuesto_stock_mover` (candado `for update`, nunca negativo, `PT409` si el stock cambió, tope de lo que entra por `sobrante`) y `repuesto_stock_reasignar`
  (todo o nada, idempotente por el id del ítem nuevo tras el candado del origen; el ítem nace en la fase de entrada del destino).
- Migración `repuestos_stock_listar`: el índice parcial `repuestos_items_en_stock_idx` y la lista por cursor `(en_stock_desde, id)`, en el registro de páginas del C.
- Migración `repuestos_catalogos_columnas` (H1 de 8.08-2): el UPDATE de un valor de catálogo es sólo de `nombre`, `activo` y `orden`.
- Carreras `scripts/carreras/repuestos-stock.mjs` (K1, K2, K2b y K3; K3 cierra la D10 de 8.08-1).
- `entities/stock/` (motivos, reglas del sobrante y la lista) y `infra/stock/listar.ts` (D16).
- Las RPC nuevas, en `supabase/tests/auditoria-leads.sql`.

### Verificación

- `SOLO=areas/repuestos/{stock,stock-reasignar,stock-listar,esperas,catalogos}.sql pnpm db:probar`: S1–S4, S6, E1–E7 y K1–K4 en verde (`.piloto/salidas/8.10-1/probar-areas.txt`).
  S4 no prueba el orden de las escrituras (Postgres revierte toda la llamada ante un error): guarda contra un `exception when` que atrape adentro.
- `pnpm db:probar` completo: 1.288 en verde, 0 caídas (`.piloto/salidas/8.10-1/db-probar.txt`).
- `pnpm db:carreras`: todas en verde (`.piloto/salidas/8.10-1/db-carreras.txt`).
- `vitest` de `scripts/guardas` y `entities/stock`: 1.132 en verde (`.piloto/salidas/8.10-1/vitest-guardas.txt`). `pnpm typecheck` limpio.
- e2e dirigidos en escritorio, `configuracion-repuestos-catalogos` y `repuestos-proyecto`: 9 de 9 (`.piloto/salidas/8.10-1/e2e-dirigidos.txt`).

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.10-1 hecha: la base del stock (`repuesto_stock_mover`, `repuesto_stock_reasignar`, `repuestos_stock_listar` con su índice), sin escrituras directas del stock,
  el UPDATE de catálogos por columnas (H1 de 8.08-2), las carreras y `entities/stock/`. **8.10 sigue:** faltan 8.10-2 (servidor, «Pasar a stock» e historial) y
  8.10-3 (vista «Stock» y el e2e del assert).
- Abiertos para «Pulido para la Fase 9» › seguridad: los de D14 de `docs/pasos/8.10-1/decisiones.md`.

e2e completo: no (8.10-1, Nivel 2: lo corre el CI del PR; dirigidos configuracion-repuestos-catalogos y repuestos-proyecto en escritorio)
