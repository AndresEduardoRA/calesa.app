## 2026-11-11 — Paso 6.11-4: prorratear y categorías de gasto (parte 4 de 4, cierra el 6.11)

- **Hecho:**
  - `entities/dinero/reparto.ts`: el reparto en partes iguales (la aritmética de centavos de `gastos_prorratear`) y la vista previa.
  - Prorratear: esquema, `RepositorioDeGastos.prorratear`, Server Action `prorratearGasto` y lectura de las unidades de un grupo (`infra/dinero/grupo.client.ts`).
  - El hueco «Prorratear un gasto entre las unidades» (`pantallas/dinero-grupo.ts`) con la vista de cuánto le toca a cada una, `<Confirmar>` con `?panel=prorratear` y envío con `lote`.
  - Categorías de gasto: entidad (propósitos, validación, cambios, textos de error), repositorio por escritura directa bajo la RLS, tres Server Actions y el catálogo de `/configuracion/logistica`.
- **Verificación** (`.piloto/salidas/6.11-4/`):
  - Vitest: `reparto.test.ts` (11), `hueco-de-prorrateo.test.tsx` (4), `categoria.test.ts` (15); `src/modules/logistica`, `scripts/guardas` y `src/app/(app)/configuracion`: 63 archivos, 1.273 ✓.
  - Mutaciones sobre `reparto.ts`: los centavos a los últimos (5 pruebas caen, `m1.txt`) y `floor` en vez de `round` (1 cae, `m2.txt`); revertidas con `cmp`.
  - e2e (escritorio): `configuracion-logistica.spec.ts` 3 ✓ (`e2e-config.txt`) y `logistica-gastos-y-pagos.spec.ts` 5 ✓ (`e2e-dirigidos.txt`, misma corrida).
- **No se hizo:** e2e del prorrateo (no hay página de grupo); la medición con volumen de `gastos_listar` y `pagos_listar` (**abierto 6-5**, de 6.11-3).
- **Para PLAN (coordinador):**
  - Fila 6.11: «**6.11 hecho** (partes 1 a 4): huecos Gastos, Pagos y Margen, `/logistica/gastos`, prorratear a un grupo y Categorías de gasto. Quedan abiertos **6-5** (medir `gastos_listar` y `pagos_listar` con volumen) y **6-6** (prorratear por valor del vehículo).»
  - Cuando 6.08 o 6.09 monten la página de un grupo con `HUECOS_DE_DINERO_EN_EL_GRUPO`, añadir el recorrido de prorratear a su e2e.
- e2e completo: no (6.11-4, pantalla de Nivel 1: lo prueba el CI del PR; los dirigidos en verde)
