## 2026-11-11 — Paso 5.07-1: la base de «Requisitos», la escritura (parte 1 de 2)

- **Hecho:** `fase_requisito_validar()` recreada (cada error con su campo en `hint`, no se espera a una fase jubilada, en UPDATE sólo revalida el grupo cuyo campo
  cambió); `requisito_crear` (nace informativo; el default de `fases_requisitos.bloqueante` pasa a `false`), `requisito_guardar`, `requisito_mover` y
  `requisito_eliminar`, todas por `_flujo_para_editar` y `_flujo_tocar`; sin policies ni grants de escritura en `fases_requisitos` (queda leer). Migraciones
  `20261111202346`–`202354_requisitos_*`; pruebas `supabase/tests/areas/flujos/requisitos.sql` (R1–R10) y `requisitos-editar.sql` (E1–E4).
- **Verificación** (`.piloto/salidas/5.07/`): `db:probar` 813 pruebas ✓, 0 ✗ (`db-probar-2.txt`); `db:lint` sin avisos en lo nuevo (`db-lint-2.txt`); guardas
  1.058 ✓ (`guardas.txt`); `nivel.mjs` → Nivel 2 (rls, estructura).
- **Sigue en el 5.07-2:** `requisito_impacto`, `flujo_fuera_de_regla`, borrar `fuera_de_regla()` y su línea de `supabase/tests/escala.sql`, glosario y RENDIMIENTO
  (plan servido en `.piloto/planes/5.07.md` › «Partición»).
- **Para el 5.08:** el alta de `requisito_impacto` y `flujo_fuera_de_regla` en `scripts/guardas/areas-c/paginas-en-la-base.ts` (con `pideElCodigo` 50) va con su
  primera llamada desde `src/` (D3): conviene sumarlo al `terminado` del 5.08.
- **Para el 6.02:** `evaluar_requisitos()` tiene EXECUTE para `authenticated` sin pedir permiso sobre la unidad; el 6.02 la recrea.
- e2e completo: no (5.07-1, Nivel 2: lo corre el CI del PR)
