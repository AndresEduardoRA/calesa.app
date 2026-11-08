## 2026-11-08 — Paso 4.19-3b

- **Con qué nace el editor:** el borrador; sin él, **la copia de la publicada**; sin ninguna, la **omisión** (los grupos de la fórmula en su orden, el total con la etiqueta del nodo
  `total` recortada a 40 caracteres o «Total», `logo: true` y las tres columnas apagadas). Un borrador o una publicada ilegibles no se editan a medias: se dice por qué y se parte de la siguiente.
- **Lo alineado con la fórmula no se guarda solo:** quitar un grupo ajeno o sumar el nuevo cuenta como cambio y se guarda con «Guardar». «Guardar» está activo desde el principio sin borrador.
- **Lo que sólo rechaza `completa` no apaga «Guardar»:** lo que cruza con la fórmula (un nodo o un tipo de cambio de otro nivel) lo rechaza publicar; el editor lo dice arriba, «Con esto no se podría publicar».
- **Al navegador llega un contexto reducido** (`contextoParaElNavegador()`), no la `definicion`: su equivalencia con el contexto entero vale sobre el juego común y después de alinear (sin alinear, `{a sin lugar, z inexistente}` difieren).
- **Sin `maxLength` (4-74):** los topes cuentan caracteres (`caracteres()`); un emoji es uno.
- **«Buscar fila» es el camino a lo que pasa de 500 filas** (filtra en el navegador sobre todas las cargadas); mover, agregar o quitar grupos a mano queda como **4-101**.
- **Se rehacen en `plantilla` los orígenes de la pestaña** (`origenesDeLaTarjeta()` y la etiqueta «(inactivo)»), sin importar del área `formula` (la guarda de áreas lo prohíbe); si dos áreas lo necesitan, va al núcleo en otro paso.
- **La sección no lleva Vitest** (es un Server Component async): lo que decide está en `propsDelEditor()` y `origenesDeLaTarjeta()`, y la cubren E2 y E7. **No se cambia la descripción del hub** (`seccion.ts`).
- **El conflicto se va al llegar la versión**, no al pulsar «Recargar» (`useConflictoHastaLaVersion`); el editor se remonta con `key` por origen y esperada.
