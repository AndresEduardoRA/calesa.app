## 2026-11-11 — Paso 5.04-3: el inspector › Datos y el recorrido (parte 3 de 3 del 5.04)

- **Hecho:** «Datos» del inspector es un formulario en cinco bloques (Identidad, En el flujo, Alerta por demora, Transporte y aduana, Web y portal) que guarda con
  `fase_guardar` sólo lo que cambió: validación con el espejo de la base, el motivo junto a cada campo con el foco en el primero, interruptores apagados con su
  motivo cuando la regla del flujo está apagada, aviso de otra inicial, alias del portal obligatorio, borrador por fase y conflicto con «Recargar». El registro del
  drawer pasó de `sinFormulario` a `formulario`. Dos pruebas nuevas en el e2e de fases: editar los datos y jubilar con historial y reactivar.
- **Commits:** `feat(flujos): editar los datos de una fase en el inspector` y `test(flujos): recorrido de fases en configuración de flujos`, más este de docs. Antes, el
  merge con `origin/main` (el choque era `scripts/guardas/areas-b/confirmar-con-url.ts`: se juntaron las confirmaciones de fases y de agenda).
- **Verificación** (`.piloto/salidas/5.04-3/`): `vitest run src/modules/flujos scripts/guardas`: 58 archivos, 1.264 pruebas en verde (`vitest.txt`);
  `e2e/configuracion-flujos-fases.spec.ts` (escritorio): 3 en verde, 16,8 s (`e2e-fases.txt`); vecinos `configuracion-flujos` y `-documentos`: 6 en verde (`e2e-vecinos.txt`).
  `eslint` y `typecheck` sin avisos. Sin SQL.
- **Para el carril A:** en `docs/PLAN.md`, fila 5.04: «**5.04 completo** (5.04-1 a 5.04-3: `docs/pasos/5.04-n/`)»; en `docs/ESTADO.md`: «Configuración › Flujos › Fases se
  edita: crear, ordenar, jubilar o eliminar, reactivar y los datos en el inspector (5.04)»; `integrado 5.04` con `parcial: false`.
- **Pulido para la Fase 9:** no se miró el inspector al 200 % (los bloques anidados miden con `minmax(0, 1fr)`, sin captura).
- e2e completo: no (5.04-3, Nivel 1, pantalla: lo corre el CI del PR; dirigidos en escritorio, sin celular por ser Configuración)
