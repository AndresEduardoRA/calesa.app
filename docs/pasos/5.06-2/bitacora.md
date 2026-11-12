## 2026-11-11 — Paso 5.06-2: «Salidas y quién mueve», editar y limitar a roles (parte 2 de 2)

- **Hecho:** editar una salida y limitar a roles la fase y cada salida; con esto el 5.06 queda completo.
  - `entities/transiciones/roles-de-lista.ts` (`alternarRol`, `mismosRoles`, `firmaDeRoles`, roles guardados de fase y de salida) y `cambiosDeSalida` en `formulario-de-salida.ts`, con tests.
  - `infra/transiciones/escribir.ts`, schemas y las actions `guardarTransicion`, `ponerRolesDeFase` y `ponerRolesDeTransicion` (permiso por ámbito, revalida la ruta).
  - Interfaz: `selector-de-roles`, `campos-de-salida` (factoriza el alta), `formulario-de-edicion-de-salida` (diferido), «Editar» en la fila, `quien-mueve-a-la-fase` con selector y «Guardar quién mueve». Una forma a la vez en el bloque.
  - `docs/UX.md`, ficha de `flujos`. Sin migración ni SQL.
- **Verificación** (`.piloto/salidas/5.06-2/`): e2e dirigido en escritorio, 2 ✓ (`e2e-transiciones.txt`: el segundo limita la fase a un rol, edita la salida —acción, sin nota, su rol—, recarga y siguen; la base tiene 1 fila en `fases_roles` y 1 en `fases_transiciones_roles`); vecinos (`configuracion-flujos`, `-requisitos`, `-documentos`, `-fases`), 11 ✓ (`e2e-vecinos.txt`). `src/modules/flujos` y `scripts/guardas`: 71 archivos, 1.300 ✓ (`vitest.txt`). `tsc` y `eslint` sin avisos.
- **Arreglo en el e2e de la parte 1:** `getByText('Cualquiera con el permiso de mover')` pasó a `exact: true`: la ayuda del selector contiene el mismo texto.
- **Para el carril A:** `docs/PLAN.md`, fila 5.06 → «**5.06 completo**»; `ESTADO`: «Inspector › Salidas: se ven, se agregan, se editan y se quitan; la fase y cada salida se limitan a roles (5.06-2)»; registrar `integrado 5.06-2` con `parcial: false`.
  e2e completo: no (5.06-2, pantalla de Configuración, Nivel 1: lo prueba el CI del PR; dirigidos en escritorio, sin celular)
