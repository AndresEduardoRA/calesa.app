## 2026-11-11 — Paso 6.11-2: el hueco «Pagos» (parte 2 de 4 del 6.11)

- **Hecho:**
  - `entities/dinero/`: el pago (estado, botones por permiso con `accionesDelPago`, sello, formulario con las reglas de la base, cambios), los paneles de la URL, el repositorio y el monto tipeado compartido con el gasto.
  - `infra/dinero/`: lectura de los pagos de la unidad con el nombre de quien confirmó (una consulta por todos) y escrituras por `pago_registrar`, `pago_guardar`, `pago_eliminar`, `pago_confirmar` y `pago_anular`.
  - Hueco «Pagos»: lista con «Sin confirmar» o el sello «Confirmado por <nombre> el <fecha>», registrar, corregir y eliminar sin confirmar, «Confirmar pago» y anular un confirmado con su motivo. Confirmar y anular
    avisan al hueco «Margen», que se vuelve a leer.
- **Commits:**
  - `9bc44cc5`: entidad del pago.
  - `32b310ea`: lectura y escritura de pagos por action.
  - `b5e8d400`: formulario de pago y drawer de anulación.
  - `14bce4e2`: el hueco de pagos con su sello.
  - `35ac686a`: e2e del tramo 2.
  - docs de la parte.
- **Verificación** (`.piloto/salidas/6.11-2/`):
  - `e2e/logistica-gastos-y-pagos.spec.ts` (escritorio): 3 ✓ (`e2e-gastos.txt`).
  - Dirigidos `e2e/logistica-unidad.spec.ts` (escritorio y celular) y `e2e/configuracion-logistica.spec.ts` (`e2e-dirigidos.txt`).
  - `vitest` de `src/modules/logistica` y `scripts/guardas`: 47 archivos, 1.164 ✓.
- **Para PLAN (coordinador):**
  - Fila 6.11: «**6.11-2** hecho: hueco «Pagos» (registrar, corregir, eliminar, confirmar con sello, anular), e2e tramo 2. Quedan 6.11-3 y 6.11-4.»
  - Abierto 6-3 (`pago_anular`): su interfaz está en el hueco «Pagos» (drawer con motivo).
  - Nuevo abierto: «vincular el pago a un lead» (D3 de `docs/pasos/6.11-2/decisiones.md`).
- e2e completo: no (6.11-2, Nivel 1: lo corre el CI del PR; el dirigido e2e/logistica-gastos-y-pagos.spec.ts en verde)
