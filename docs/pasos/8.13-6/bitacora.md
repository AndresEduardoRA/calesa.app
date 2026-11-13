## 2026-11-12 · Paso 8.13-6: sacar de la rama lo que es del carril b (arreglo del job «Carriles»)

### Hecho

- El job «Carriles» caía de verdad: las partes 2 y 3 editaban ocho archivos de `logistica` que son del carril `b` (`docs/plan.yaml` › `dueno_de`: áreas `transporte` y
  `documentos`). La corrida anterior se había leído mal (la guarda se probó con `HEAD` y no con el nombre de la rama: sin `/`, la guarda toma el carril base y todo pasa;
  hay que correr `node scripts/guardas/carriles.mjs <main> c/8.13`).
- Siete de los ocho vuelven a ser los de `main`; lo del ítem pasa al núcleo:
  - `Unidad` queda como en `main` (`origenId: string`) y nace `UnidadAbierta` (vehículo o ítem, con `origenId` nulo y `proyecto?`); `esUnidadDeVehiculo` estrecha a `Unidad`.
    Sólo `mover` y el núcleo tipan con `UnidadAbierta`: las áreas de `b` no se enteran del ítem y no se tocan sus tipos.
  - La variante `repuesto` de un hueco puede traer su `componente`; el panel dibuja ése para un ítem y el `componente` del hueco sólo para un vehículo.
  - El hueco «Transporte» del ítem («Sigue al vehículo…») es del núcleo: `entities/nucleo/transporte-de-item.ts`, `features/nucleo/components/hueco-de-transporte-de-item.tsx`,
    `pantallas/unidad-item.ts`. Las variantes `repuesto` de Documentos y Transporte las pone `src/app/(app)/logistica/huecos-de-la-unidad.tsx`, no los archivos de `pantallas/` de `b`.
- Queda **un** archivo de `b`: `src/modules/logistica/infra/documentos/tipos.client.ts` (`leerTiposDeLaUnidad` acepta `origenId: string | null` y busca el flujo sin origen). Sin ese
  cambio los documentos de un ítem leen `origen_id = null` como «ninguno». Va como compuerta `espera` (el cambio sirve igual en `main`: el tipo ancho acepta `Unidad`).

### Prueba

- `src/app/(app)/logistica/huecos-de-la-unidad.test.tsx`: un ítem con `repuestos.ver` ve «Qué falta», «Documentos», «Transporte», «Notas» e «Historial», cada uno con el componente de su variante, y sin
  él no ve nada; `entities/nucleo/transporte-de-item.test.ts` pasó del área `transporte` al núcleo.
