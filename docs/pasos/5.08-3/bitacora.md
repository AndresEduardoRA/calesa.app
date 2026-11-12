## 2026-11-11 — Paso 5.08-3: «Bloqueante», el aviso de impacto y «fuera de regla» (parte 3 de 3)

- **Hecho:** «Bloqueante» pasa a un interruptor en cada fila; el aviso «N unidades fuera de regla» y su panel. **5.08 queda completo.**
  - `entities/requisitos/{impacto,fuera-de-regla}.ts` con sus pruebas: el texto del impacto, la lectura de `flujo_fuera_de_regla`, la agrupación por fase y los textos del aviso.
  - `infra/` y `features/`: lecturas de `requisito_impacto` y `flujo_fuera_de_regla`, la action `leerImpactoDeRequisito`, `bloqueante` en `guardarRequisito`, el hook `useBloqueanteDeRequisito`, el interruptor y la confirmación en línea.
  - `PantallaDelFlujo` suma la prop de servidor `sobreLaLista`; `src/app/.../requisitos/fuera-de-regla.tsx` lee, resuelve los títulos con `vehiculos` y arma el camino al inventario. `FILTRO_FASE` sale por `vehiculos/index.ts` (una línea).
  - Guardas del C: las dos RPC en `paginas-en-la-base.ts` y el panel `sinFormulario` en `drawers-con-salida.ts` (archivo nuevo). Sin migración.
- **Verificación** (`.piloto/salidas/5.08-3/`): e2e escritorio `configuracion-flujos-requisitos` 5 ✓ (`e2e-1.txt`), vecinos `configuracion-flujos` y `-documentos` 6 ✓ (`e2e-2.txt`); vitest de `scripts/guardas` (1.068 ✓) y de lo tocado; `tsc` y `eslint` limpios.
  e2e completo: no (5.08-3, Nivel 1, sin disparadores: lo corre el CI del PR; dirigidos en escritorio, sin celular por ser Configuración)
