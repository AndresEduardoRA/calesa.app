## 2026-11-11 — Paso 6.01-4: arreglar el CI en rojo de la navegación (fix tras el 6.01)

- **Causa:** el CI del PR del 6.01 cayó en `Nivel 1` por `src/app/(app)/_shell/navegacion.test.ts` («/logistica: «disponible» dice la verdad sobre si la pantalla existe»): el 6.01-3 creó
  `src/app/(app)/logistica/page.tsx` y la entrada de Logística en `navegacion.ts` seguía con `disponible: false`. Los cuatro bloques e2e cayeron aparte, por el paso de chromium (arreglado en main, #108).
- **Hecho:** la entrada `logistica` de `NAVEGACION` pasa a `disponible: true`.
- **Verificación** (`.piloto/salidas/6.01/vitest-4.txt`): `vitest run "src/app/(app)/_shell"`, 21 pruebas en verde.
- e2e completo: no (6.01-4, Nivel 2 por tocar `_shell`: lo corre el CI del PR en sus cuatro bloques)
