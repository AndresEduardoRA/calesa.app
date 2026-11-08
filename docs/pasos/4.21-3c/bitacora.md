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
- **CI del PR (2026-11-08):** la guarda de carriles cayó porque la migración de la auxiliar (`20261108043918`) era anterior a la última de main
  (`20261108084712`); pasó a `20261108124129_diseno_auxiliar_sin_celda.sql` sin cambiar su contenido (`db:reset`, `db:types` sin diferencia, `db:probar`
  739 ✓ y 0 ✗, `.piloto/salidas/4.21/`). **Ojo al integrar con el PR 78 (4.22-6):** las dos migraciones reescriben `validar_diseno()` entera desde la base;
  la que se aplique después pisa a la otra (la auxiliar sin celda o `demasiados_items`). La del PR que se integre segundo se rehace sobre la otra.
  e2e completo: no (4.21-3c, grupos del editor de la fórmula, Nivel 1: lo dirigido en escritorio)
