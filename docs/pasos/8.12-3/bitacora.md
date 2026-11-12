## 2026-11-12 · Paso 8.12-3: la pestaña «Cotizaciones» y la cotización en sólo lectura (parte 3 de 4)

### Hecho

- Lectura de las cotizaciones de un proyecto (tope 50) y de una cotización con sus líneas, con los montos como texto exacto (`::text`) y nulo nunca 0; lo que
  le falta a una línea sin total sale de la fórmula con **su** snapshot, o queda desconocido (`entities/cotizador/{cotizacion,hoja-de-lectura}.ts`).
- Crear: la action `crearCotizacion` (`repuestos.cotizar` y `repuestos.ver` con `puede()` antes) llama `repuestos_cotizacion_crear`; los rechazos de la
  configuración y la moneda vuelven en su campo.
- La pestaña «Cotizaciones» de `/repuestos/[id]` (`?pestana=cotizaciones`, sólo con `repuestos.cotizar`): «Nueva cotización» con la moneda en la misma barra
  (el id del intento se renueva al crear y al cambiar la moneda) y la lista. La hoja `/repuestos/[id]/cotizaciones/[cotizacion]` en sólo lectura.
- `e2e/repuestos-cotizaciones.spec.ts` (nuevo); `borrarPersonasDePrueba()` borra las cotizaciones de repuestos de las cuentas de prueba.

### Verificación

- Nivel 1 (sin migración ni `src/shared`). `hoja-de-lectura.test.ts` 9 y `pestanas.test.ts` 5 en verde; `vitest related` 14 y `scripts/guardas` 1129 en verde
  (`.piloto/salidas/8.12-3/vitest.log`, `guardas.log`).
- e2e dirigidos en escritorio y móvil: 22 en verde (`repuestos-cotizaciones`, `repuestos-compras`, `repuestos-proyecto`; `.piloto/salidas/8.12-3/e2e.log`).
- e2e completo: no (8.12-3, Nivel 1: lo corre el CI del PR; dirigidos repuestos-cotizaciones, repuestos-compras y repuestos-proyecto en escritorio y movil)

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.12-3 hecha: la pestaña «Cotizaciones» de `/repuestos/[id]` (lista y «Nueva cotización») y la hoja en sólo lectura. **8.12 sigue:** 8.12-4 (la hoja
  editable, «Guardar», «Aceptar», «Anular», `e2e/repuestos-cotizar.spec.ts`). La pestaña del proyecto se elige con `?pestana=`, no `?seccion=`.
- Pendiente de 8.12-4 (sin cambios): la carrera en `scripts/carreras/` (dos `aceptar` a la vez; dos tramos cruzados a la vez).
