## 2026-11-11 — Paso 5.08-2: «Requisitos para entrar», documento, espera y editar (parte 2 de 3)

- **Hecho:** «Agregar requisito» pasa por un selector (Dato, Documento, Espera) y suma las formas **Documento** y **Espera**; «Editar» abre en el lugar del botón.
  - `entities/requisitos/`: `formulario-de-documento` (mínimo, máximo, formatos dentro de los del tipo), `formulario-de-espera`, `formulario-de-edicion` (sólo lo que
    cambió; `null` al vaciar; «No hay nada que guardar.»), `notas` (la regla de las notas, una sola), la descripción de una espera nombra la fase, y
    `opciones` suma las fases activas del otro flujo y `delFlujo` en cada tipo.
  - `infra/` y `features/`: `requisito_crear` con cualquier tipo y `requisito_guardar`; una action `crearRequisito` con unión por tipo y `guardarRequisito`;
    `leerOpcionesDeRequisitos` recibe el ámbito. `useFormularioDeRequisito` es el estado común de los cuatro formularios.
  - URL: `?agregar=nuevo&forma=elegir|dato|documento|espera` y `?editar=requisito&requisito=<id>`. Sin migración.
  - `docs/UX.md` y la ficha de `flujos` al día. Queda para 5.08-3: «Bloqueante» con el aviso de impacto, «fuera de regla» y `sobreLaLista`.
- **Cambió respecto del plan:** ver `decisiones.md` (D9 la URL del selector; D10 `delFlujo`).
- **Verificación** (`.piloto/salidas/5.08-2/`): e2e dirigido en escritorio, `configuracion-flujos-requisitos` 4 ✓ (dato, quien sólo configura, documento y espera, editar) y
  los vecinos `configuracion-flujos` y `configuracion-flujos-documentos` ✓ (`e2e-3.txt`, `e2e-4.txt`). Vitest de `src/modules/flujos` y `scripts/guardas` ✓; `tsc` y `eslint` sin avisos.
  e2e completo: no (5.08-2, Nivel 1, sin disparadores: lo corre el CI del PR; dirigidos en escritorio, sin celular por ser Configuración)
