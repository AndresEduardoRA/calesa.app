## 2026-11-08 — Paso 4.19-3c

- **Los botones viven en el editor y los modales fuera de su `key`:** los botones necesitan saber si hay cambios sin guardar (`hayCambios`), que sólo el editor sabe; los modales los monta
  `PestanaDeLaTarjeta`, sin `key` de versión, para que «Recargar» tras un PT409 remonte el editor y no pierda la nota.
- **«Publicar…» se apaga con su motivo a la vista y no por «Con esto no se podría publicar»:** sin borrador o con cambios sin guardar (se publica lo guardado, no lo que se ve). El
  contexto del navegador es reducido: lo que sólo ve la fórmula lo decide la base y su rechazo vuelve arriba del modal con la nota intacta.
- **«Descartar borrador…» se ofrece también con cambios sin guardar:** descarta lo guardado; lo sin guardar de esa versión no vuelve (queda bajo la clave de la versión vieja).
- **Un solo hook de panel** (`usePanelDeLaTarjeta`) con dos paneles: `useVueltaDelFoco` se llama una vez por clave y dos hooks con la misma se pisarían. Los nombres `publicar-tarjeta` y
  `descartar-plantilla` los fijaron los planes del 4.19-3 y 3b; la asimetría «tarjeta» / «plantilla» se conserva para no renombrar lo ya escrito en docs y planes.
- **«Nota de la versión», no «Nota»:** el pie del editor ya tiene una «Nota de la tarjeta». El texto dice «aquí» y no el «acá» del modal de la fórmula (tú neutro).
- **Se rehacen en `plantilla` el modal, el hook de publicación, el diálogo y las acciones** en vez de importar los de `formula`: la guarda de áreas lo prohíbe. Mover la nota al núcleo
  para que las dos áreas compartan un esquema sigue pendiente (de 4.19-3a).
- **El diálogo de descartar tiene PT409 y la fórmula no:** la base de la plantilla pide la versión esperada (4.19-1), así que el diálogo la manda, dice el conflicto y espera el borrador nuevo.
- **E1 de 3b sin aserción sobre los decimales de `actualizadoEn`** (ver bitácora): la precisión la prueba el PT409 de `-conflicto.spec.ts`.
