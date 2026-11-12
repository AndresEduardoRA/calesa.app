## 2026-11-12 · Paso 8.03-1: guías con el editor, publicar y la página de la guía (parte 1 de 2 del 8.03)

- **Hecho:**
  - **Reglas** (`entities/contenido/`): `guias.ts` (estado, dirección, `puedePublicar`, acciones y motivo de la barra, `rutasDeImagenes`) y `documento-limpio.ts`
    (reduce lo que emite Tiptap a la lista blanca de `doc.ts`), con sus pruebas.
  - **Lectura y escritura** (`infra/contenido/`): la lista con búsqueda y tope + 1, la guía, categorías y autores para los selectores, y la escritura con la versión
    esperada; actions `crearGuia`, `guardarGuia` (permisos antes de la base) y `eliminarGuia`.
  - **El editor** propio del área (`features/contenido/editor/`): títulos, negrita, cursiva, listas, cita, enlace e imagen al bucket `web`; viaja diferido.
  - **Pestaña «Guías»** (lista, búsqueda, «Nueva guía» en un panel) y **página de la guía** (`/configuracion/web/guias/[id]`): contenido con el editor, datos
    (categoría, autor, portada), buscadores, Guardar, Publicar, Programar, Despublicar y Eliminar con confirmación por URL.
  - Sin migración, sin `src/shared`. Decisiones en `decisiones.md` (D1–D18).
- **e2e completo: no (8.03-1, Nivel 1: lo corre el CI del PR; dirigidos: configuracion-web-guias y configuracion-web-ajustes en escritorio)**
- **Para el carril a (coordinador):** anotar bajo la fila 8.03 de `docs/PLAN.md`: «8.03-1 hecha (guías con el editor: lista, página, publicar, programar,
  despublicar y eliminar; el editor propio del área en `features/contenido/editor/`); quedan categorías y legales (8.03-2)»; el paso sigue asignado a b.
  Al unir con la rama del 8.02 habrá choques triviales en `seccion-abierta.tsx`, `pestanas.test.ts`, `areas/contenido/*`, `scripts/guardas/areas-b/*` y la
  ficha de `web`.
