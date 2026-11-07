## 2026-11-07 — Paso 4.21-3a-1: el editor de la fórmula en texto

- **Hecho:** Configuración › Cotización › «Fórmula» suma el editor en texto, en `?panel=editar-formula`. Se entra con «Editar» en el borrador o, sin él, con «Editar en un borrador» en la publicada, y ocupa el lugar de la pestaña.
  - Lee desde el navegador la definición del borrador o de la publicada, por `formulas_pkey`.
  - Muestra cada fila con su texto vigente tras un ⚙ (reescrito, o «El texto ya no manda»), el texto escrito desde el nodo o sus campos.
  - Compila cada fila al aplicar con `compilarFila()`. El error queda en su fila: el del compilador, el de 2.001 caracteres, «Pisar el valor» y el rechazo de `validarFormula()`.
  - Guarda lo aplicado en la pestaña con `useBorradorDeEstado`.
  - Dibuja hasta 500 filas, con su aviso y «Buscar fila».
  - **Cierra 4-5 y 4-6.** La compuerta `producto` se contestó con las seis recomendadas (P4–P6 son para el 3a-2). El 4.21-3a se partió en 3a-1 y 3a-2.
- **Verificación:**
  - Contra HEAD, en rojo: el e2e nuevo (cae en «Editar en un borrador») y las pruebas de Vitest, que caen porque el archivo que prueban no existía (T1–T5).
  - Después, en verde: T1–T5 (41), `vitest related` (125) y `scripts/guardas` (1.003). Los seis e2e dirigidos, en escritorio y movil: el editor, la lista de versiones, publicar, revertir, descartar y `cotizar-hoja`.
  - Medido con 600 filas: 77.017 B de la lectura, 3.992 nodos de la lista con 500 y 957 ms del clic a la lista. Salidas en `.piloto/salidas/4.21-3a-1/` (no se versiona).
- **Abiertos:** el editor tarda en abrir O(filas × nodos): ~1 s con 600 filas y ~2 s con 2.000. Sigue el 4.21-3a-2 (la vista previa y las filas nuevas), después el 3b y el 3c.
  e2e completo: no (4.21-3a-1, pantalla, Nivel 1: lo dirigido en escritorio y movil)
