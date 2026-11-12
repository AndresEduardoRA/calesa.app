## 2026-11-12 — Paso 6.08-2: el hueco «Transporte» de la unidad (parte 2 de 4)

- **Hecho:** el hueco «Transporte» del panel de la unidad (`pantallas/transporte-unidad.ts`, sin tocar `src/app` ni `Unidad`):
  - `entities/transporte/transporte.ts` (la fila, los valores del formulario, validación con los textos de la base sólo en lo que cambió, `cambiosDeTransporte` y `porCampoDe`), `oferta.ts` (copia de `ofertaDesde` y `opcionesDeTransporte`) y
    `repositorio-de-transporte.ts`; tests `transporte.test.ts` y `oferta.test.ts` (22 ✓).
  - `infra/transporte/guardar.ts` y `rpc.ts` (`transporte_guardar`, el `hint` del rechazo a su campo), la action `guardarTransporte`; lectura en el navegador (`unidad.client.ts`: fila, flujo, `flujo_oferta` y catálogos; `permisos.client.ts`).
  - `features/transporte/`: hooks de lectura, de permisos, de borrador por campos tocados y de formulario; `HuecoDeTransporte`, `FormularioDeTransporte` y los campos en tres `<Bloque>`; carga con `diferido()`.
  - `e2e/logistica-transporte.spec.ts` (escritorio) y `e2e/soporte/transporte.ts`.
  - Docs: ficha de `logistica` (sección «Área `transporte`») y `docs/UX.md` (panel de la unidad).
- **Falta (partes 3 y 4):** `/logistica/embarques` con lista, filtros, resumen y huecos de grupo (6.08-3) y «Editar grupo» (6.08-4); el plan de cada una está servido en `.piloto/planes/6.08.md`.
- **Verificación** (`.piloto/salidas/6.08/`): `vitest` de `entities/transporte` (35 ✓ con las de la 6.08-1) y `scripts/guardas` (1113 ✓), `typecheck` y `eslint` sin avisos (el hook de cada commit); e2e dirigidos en escritorio: `e2e-2.txt` (`logistica-transporte`, 4 ✓: cargar y ver
  guardado, rechazo de la ETA junto al campo, conflicto con «Recargar» que conserva lo escrito, sólo lectura), `e2e-3.txt` (`logistica-unidad` y `logistica-aduana`, 12 ✓) y `e2e-4.txt` (`logistica-cadena`, 5 ✓).
- e2e completo: no (6.08-2, Nivel 1: lo prueba el CI del PR; dirigidos: logistica-transporte, logistica-unidad, logistica-aduana, logistica-cadena)
- **Commits:** ver `git log` de la rama (5 de código y el de docs).
