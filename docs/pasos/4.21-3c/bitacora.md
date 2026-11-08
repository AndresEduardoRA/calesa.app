## 2026-11-08 — Paso 4.21-3c: los grupos de la fórmula en el editor (cierra el 4.21)

- **Hecho:** el editor de la fórmula edita los grupos que hay: etiqueta, plazo, tono, el bucket que le da su tipo de cambio y qué filas suman a cada uno. Un
  rechazo de un grupo va a su tarjeta y cada fila dice su grupo. La compuerta `producto` se contestó con las recomendadas (P1–P4). Es la última parte del 4.21:
  sale sin `parcial`.
  - **Lo puro:** `entities/formula/grupos.ts` (`aplicarGrupo()`, `grupoDelRechazo()`, `puedeSumarAlGrupo()`, `filasQuePuedenSumar()`, `opcionesDeBucket()`).
  - **La lectura:** el catálogo de tonos desde el navegador (`infra/formula/tonos.client.ts`, por la composición del área), con `limit` 24.
  - **La pantalla:** la sección «Grupos» (`grupos-de-la-formula.tsx`, `grupo-del-editor.tsx`, `formulario-del-grupo.tsx`, `filas-del-grupo.tsx`), con
    `use-grupos-del-editor.ts`, `use-miembros-del-grupo.ts` y `use-tonos.ts`. El «Aplicar» de una fila pasó a `use-aplicar-fila.ts`, sin cambiar su conducta.
- **Verificación:**
  - `grupos.test.ts`: 7 pasaron (T1–T6). T5 es la de dinero: con tipos de cambio 7 y 10, mover una constante de 5 sube el total en Bs en 15.
  - Dos mutaciones: `nodoConGrupo` sin escribir `grupo` hace caer T5 y los dos T3 (`mutacion-sin-grupo.txt`), y `filasQuePuedenSumar()` sobre todos los nodos hace caer
    T4 (`mutacion-auxiliar-suma.txt`; la prueba es el `fix` de la auditoría del informe).
  - Vitest de `features/formula` y `entities/formula`: 526 pasaron. `scripts/guardas`: 1.019 pasaron. Typecheck 0, y el hook pasó en los cinco commits.
  - e2e dirigidos en escritorio: 27 pasaron (grupos, editor, filas, previa, guardar y previa-volumen), con E1 nuevo. Configuración no corre en `movil`.
  - Las salidas están en `.piloto/salidas/4.21-3c/`.
- **Abiertos:** sumar y quitar grupos, y editar `buckets`, `total_en` y los modos, esperan a que la plantilla de la tarjeta se edite junto con la fórmula (P2.1 y P1.1).
  e2e completo: no (4.21-3c, grupos del editor de la fórmula, Nivel 1: lo dirigido en escritorio)
