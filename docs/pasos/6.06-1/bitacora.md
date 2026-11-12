## 2026-11-12 — Paso 6.06-1: documentos de la unidad, lectura (parte 1 de 3)

- **Hecho:** el hueco «Documentos» del panel de la unidad y la pestaña «Documentos» de `/vehiculos/[id]` (un solo componente) leen y muestran, sin escribir todavía:
  - `entities/documentos/`: tipos y esquemas Zod, estado en texto, vencimiento (vence hoy aún vale), qué cuenta para un requisito (el predicado de `evaluar_requisitos`), `agruparPorTipo`
    y `formatearBytes`. Test: `requisito.test.ts`.
  - `infra/documentos/*.client.ts` y `areas/documentos/composicion.client.ts`: documentos vivos con tope 50 y nombres de `perfiles`, tipos del flujo, requisitos de las
    fases siguientes y URL firmada de 60 s.
  - `features/documentos/`: hook con relectura al volver el foco y al avisar `logistica:unidad-cambio`, y los cinco estados.
  - La pestaña sale con `logistica.ver` del origen (`pestanasDeQuienMira`), tras `<Suspense>`.
- **Falta (partes 2 y 3):** subir con la bandeja (6.06-2); aprobar, rechazar, editar fechas, «Visible en el portal», eliminar, el hueco del grupo y `e2e/logistica-documentos.spec.ts` (6.06-3).
- **Verificación** (`.piloto/salidas/6.06-1/`): `vitest-entities.txt` (12 ✓), `pnpm typecheck` y `eslint` sin avisos, `scripts/guardas` 1.092 ✓, `vitest` de la ficha de vehículos 7 ✓,
  e2e dirigidos en `e2e.txt` (logistica-unidad, logistica-mover, logistica-gastos-y-pagos, vehiculos-cotizaciones).
- e2e completo: no (6.06-1, Nivel 1, lectura sin e2e propio: lo corre el CI del PR)
- **Commits:** ver `git log` de la rama (4 de código y el de docs).
