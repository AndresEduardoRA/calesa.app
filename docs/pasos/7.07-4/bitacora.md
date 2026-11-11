## 2026-11-11 — Paso 7.07-4: arreglar el e2e que la entrada de Agenda rompió (CI rojo del 7.07)

- **Causa:** el 7.07-1 (`41afa436`) encendió la entrada «Agenda» en la navegación y, en el e2e completo del PR, cayó `cotizar-tarea-de-oro-recorrido.spec.ts` R1 en escritorio (esperaba 57 teclas de control, midió 58): una parada más en el camino, como con Logística en el 6.01-4. El celular no cambia (53 y 49).
- **Hecho:** `CONTROLES_DE_LA_ASESORA` y `CONTROLES_DE_LA_DUENA` de escritorio +1 (58 y 54).
- **Verificación** (`.piloto/salidas/7.07-4/e2e-recorrido.txt`): `E2E_SIN_FUNCIONES=1 pnpm test:e2e e2e/cotizar-tarea-de-oro-recorrido.spec.ts`, 6 en verde (escritorio 58 y 54, móvil 53 y 49). Los demás bloques del e2e completo del CI habían pasado.
- e2e completo: no (7.07-4, sólo un spec: lo corre el CI del PR)
