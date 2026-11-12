## 2026-11-11 — Paso 5.04-2: la lista de fases (parte 2 de 3 del 5.04)

- **Hecho:** «Nueva fase» (modal por `?panel=nueva-fase`: nombre, color de la paleta y tipo), subir y bajar con `<BotonesDeOrden>`, y el «⋯» de cada fila
  (Editar, Jubilar o eliminar con confirmación que lee `fase_impacto`, Reactivar). `pantallas/fases.ts` da los dos huecos `accionesDeLaLista` y
  `accionesDeFila`; `src/app/(app)/configuracion/flujos/huecos.ts` los llena; el subtítulo de la lista ya no dice «sólo se pueden mirar». Registro de la
  confirmación en `scripts/guardas/areas-b/confirmar-con-url.ts`.
- **Commits:** reglas de la lista (`entities/fases/panel-de-fase.ts`, `erroresDeFaseNueva`, `accionesDeFase`) y las acciones de la lista (hooks, componentes, hueco, e2e).
- **Verificación** (`.piloto/salidas/5.04-2/`): `vitest run src/modules/flujos scripts/guardas`: 57 archivos, 1.256 pruebas en verde (`vitest.txt`);
  `e2e/configuracion-flujos-fases.spec.ts` (escritorio, nuevo: crea tres fases —repetir un nombre dice su motivo junto al campo—, sube una con el teclado y elimina
  otra): 1 en verde (`e2e-fases.txt`); los vecinos `configuracion-flujos` y `-documentos`: 6 en verde (`e2e-vecinos.txt`).
- **Para el carril A:** en `docs/PLAN.md`, fila 5.04: «**5.04-2 hecho** (la lista; `docs/pasos/5.04-2/`). Falta el **5.04-3** (el inspector › Datos y el
  recorrido e2e completo)».
- **5.04 sigue:** este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (5.04-2, Nivel 1, pantalla: lo corre el CI del PR; dirigidos en escritorio, sin celular por ser Configuración)
