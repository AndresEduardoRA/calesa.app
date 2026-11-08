## 2026-11-08 — Paso 4.22-3

- **Preguntas:** ninguna nueva; P1–P4 siguen como las dejó el 4.22-1 (la recomendada). P2 y P3 son del 4.22-5; P4 (4-30), del 4.22-6, compuerta `datos`.
- **Lo no obvio:**
  - **Variante y subtotal sin campo:** no tienen más que su nodo (y el nivel de un ítem que no es celda lo hereda de su sección); cambiarles el nodo es mover estructura.
    Se dibujan como tarjeta de sólo lectura.
  - **Atajos:** la columna ofrece las claves de `match` y la `columna` del nodo `tabla` más la actual, sin leer la tabla de referencia (la base admite esas columnas).
  - **Ayuda de tabla:** sale de las tablas que nombran los nodos de la fórmula (`tabla` de tabla, tramo y depreciar) más la actual.
  - **`sumarModo` copia** `buckets` y `total_en` de la fórmula: valida de entrada. La clave se deriva del nombre (minúsculas sin tildes, `_`, `_2`…) y no cambia si se
    renombra el modo. Sin `total_en` o sin buckets no hay modos nuevos; los que ya hubiera siguen editables.
  - **`ver_total_bs`** no lo mira ninguna regla de `validarDiseno()`: el interruptor siempre está habilitado.
  - **Texto sin recortar al escribir:** la ayuda no pasa por `trim()` (un espacio al final es el de la palabra que sigue); sólo blancos la quitan. El nombre de un modo
    se aplica al salir del campo, por lo mismo. (El título de una sección, del 4.22-2, sí recorta al escribir.)
- **Para el coordinador:**
  - **Mover, sumar y quitar secciones o ítems** (la estructura) sigue sin dueño: asignarlo como un 4.22-3b o descartarlo.
  - `docs/ESTADO.md`: «4.22-3: ítems, cabecera y tarjeta del diseño; siguen 4.22-4 (tonos), -5 (vista previa) y -6 (4-30); mover/sumar/quitar sin dueño». `docs/PLAN.md`: en la fila
    del 4.22, sumar «4.22-3 (ítems, cabecera y tarjeta)».
  - El hub dice «La fórmula y el diseño de la hoja de cada origen y los niveles de acceso.» (`seccion.ts`): el 4.20-4b (carril A) edita la misma línea; al integrar, unir ambos textos.
