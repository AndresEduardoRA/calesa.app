## 2026-11-08 — Paso 4.23-2: las tablas de referencia se leen enteras por cursor y se publican por una action

- **Hecho:** entidades, lectura y la action del área `tablas`, sin pantalla ni base. Son cuatro commits de código.
  - El plan se auditó una vez y bloqueó por la lectura: paraba con una página corta, y con un `max_rows` menor que 1.000 una tabla se habría leído a medias y,
    al publicarla, perdido filas. Se corrigió en el plan junto con las observaciones (`.piloto/planes/4.23.respuestas.md`).
  - Sigue el **4.23-3** (la pestaña «Tablas» y 4-47).
- **Lo que quedó:**
  - `entities/tablas/validacion.ts`: el espejo de `_tabla_referencia_filas_validas` (mensajes, camino, puntos de código, orden C, `btrim`), `motivoDeCelda` y el
    Zod de una fila.
  - `entities/tablas/edicion.ts`: editar, sumar, quitar y mover filas en memoria, y las filas que se publican.
  - `infra/tablas/lectura.ts`: `leerTablasDeReferencia` (un pedido, tope 100) y `leerTablaParaEditar` (la versión y después todas las filas por cursor
    `(orden, id)`; entera o nada).
  - `features/tablas/actions/publicar-tabla.ts`: `publicarTabla`, con `puede()` antes y el PT409 y el 22023 de la base tal cual.
- **Verificación** (`.piloto/salidas/4.23-2/`):
  - vitest del área: 49 en verde (`vitest-tablas.txt`). Guardas y `mapa.test.ts`: 1.023 en verde (`guardas.txt`). `tsc`: 0 errores (`tsc.txt`).
  - Mutación M1 (parar con una página corta): caen 3, entre ellas la del `max_rows` de 500 (`m1.txt`).
  - `nivel.mjs`: Nivel 1, sin disparadores (`nivel.txt`). Sin e2e dirigidos: ningún texto dibujado cambia.
- e2e completo: no (4.23-2, entidades e infra: Nivel 1, sin interfaz; el completo lo corre el CI del PR)
