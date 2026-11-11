## 2026-11-11 — Paso 5.07-2: la base de «Requisitos», la lectura (parte 2 de 2, cierra el paso)

- **Hecho:** `requisito_impacto(p_requisito, p_tope)` → `{fuera, hay_mas, revisadas}`; `flujo_fuera_de_regla(p_flujo, p_tope)` → ids, fase y `faltan`, a lo sumo
  `tope + 1` filas; las dos exigen `puede_configurar_flujo()`, acotan con `_acotar_pagina(p_tope, 50, 100)` y revisan ≤ 1.000 unidades por fase por su índice.
  `fuera_de_regla()` borrada (y su excepción de `supabase/tests/escala.sql`). `fase_requisito_validar()` recupera el `for share` del 5.03 (D11). Migraciones
  `20261111214851_requisitos_validar_con_candado`, `210116_requisitos_impacto`, `210119_requisitos_fuera_de_regla`; pruebas
  `supabase/tests/areas/flujos/requisitos-lectura.sql` (R11–R15) y R16 en `requisitos.sql`.
- **Auditoría del informe:** observaciones; R12 suma una segunda fase para probar que el tope es del total (`fix(db)` aparte).
- **Verificación** (`.piloto/salidas/5.07-2/`): `db:probar` 831 pruebas ✓, 0 ✗ (`db-probar-final.txt`); `db:lint` sin avisos en lo nuevo (`db-lint.txt`);
  guardas 1.058 ✓ (`guardas.txt`); `nivel.mjs` de esta parte → Nivel 1 (el PR, con la parte 1, es Nivel 2).
- **Para el 5.08:** el alta de `requisito_impacto` y `flujo_fuera_de_regla` en `scripts/guardas/areas-c/paginas-en-la-base.ts` (`pideElCodigo` 50) va con su
  primera llamada desde `src/` (5.07-1:D3). Firmas: `requisito_impacto(uuid, int default null) returns jsonb`, `flujo_fuera_de_regla(uuid, int default null)
returns table (vehiculo_id, repuesto_id, fase_id, faltan)`. Si el panel la lee al abrirse, se mide ahí (`docs/RENDIMIENTO.md`).
- **Para el coordinador:** `docs/PLAN.md:751,757,1063` todavía nombran `fuera_de_regla` (D16). El assert de la fila nombra `requisitos.sql`; R11–R15 viven en
  `requisitos-lectura.sql` (D12). Si el panel del 5.08 lee `flujo_fuera_de_regla` al abrirse, su
  medición va en el `terminado` del 5.08 (`docs/RENDIMIENTO.md`).
- e2e completo: no (5.07-2, Nivel 2: lo corre el CI del PR)
