## 2026-11-12 · 8.13-6

- **`UnidadAbierta` en vez de volver nulo `Unidad.origenId`.** El 8.13 pedía a las áreas `transporte` y `documentos` (del carril b) leer un ítem sin origen; la guarda de carriles no lo
  deja y un pedido a b era circular (sus cambios no compilan sin el tipo nuevo). Con dos tipos, b no cambia y el núcleo (que el c sí puede editar) lleva al ítem.
- **Sólo `tipos.client.ts` se le pide a b** (compuerta `espera`): es el único lugar donde un área de b decide con `origenId`, y ensanchar su parámetro compila y pasa lint sobre `main`.
