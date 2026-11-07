## 2026-11-07 — Paso 4.21-3b-1: guardar el borrador desde el editor de la fórmula

- **Hecho:** el editor de la fórmula (`?panel=editar-formula`) guarda el borrador por `formula_guardar_borrador` (la RPC del 4.21-2), con la action
  `guardarBorrador`, y publicar y descartar mandan la hora del borrador. Cierra 4-8 de punta a punta.
  - **Guardar:** sobre la publicada crea el borrador con su diseño; sobre el borrador lo pisa con su hora, su diseño y su nota; tras guardar, la base es la fila
    que devolvió la RPC, sin releer, y el editor no se vuelve a montar (su `key` ya no lleva la versión). Una fila que el ⚙ reescribió guarda el texto con el
    valor nuevo (4-5).
  - **El botón:** arriba de la lista, con su motivo (fila abierta, fórmula que no valida, sin cambios), «Guardando…» (mientras, «Editar» y «Sumar fila»
    esperan), «Se guardó el borrador.», el conflicto de la base con «Recargar» (vuelve a montar el editor sobre lo de ahora) y textos propios para la regla, el
    permiso y la falta de respuesta.
  - **P1, guardar y avisar:** «Para publicar, el diseño de la hoja tiene que mostrar: «…». Puedes guardar igual.» con las filas cuyas constantes, inputs u
    opciones no tienen celda (también la auxiliar de un número, que sube a su fila; `entities/formula/sin-celda.ts`, espejo de §5 con paridad sobre
    `casos-de-diseno.json`); sin diseño, su propio aviso.
  - **Publicar y descartar:** mandan `p_actualizado_en_esperado`; el PT409 «El borrador cambió después de que lo abriste…» va con «Recargar» en el modal (que
    conserva la nota) y en el `<Confirmar>`.
- **Verificación:**
  - Contra HEAD, en rojo (`.piloto/salidas/4.21-3b-1/rojo-head-*.txt`): T1, T3–T5 del commit 1 (9 caídas y 2 archivos que no resolvían); el e2e de guardar
    (G1, sin el botón); T2, T6 y T7 del commit 2; T4 de la hora (3 caídas) y G6 (publica sin conflicto) del commit 3. G7 se escribió con el código ya hecho: no
    se guardó en rojo contra HEAD.
  - En verde: Vitest de lo tocado y `scripts/guardas` en cada commit (231, 190 y 190); los 11 e2e dirigidos en escritorio y movil, 111 pasaron
    (`dirigidos.txt`).
  - Mutaciones (`mutacion-*.txt`), cada una cae: M1 sin las reescritas, M2 crear en vez de pisar, M4 y M4b el diseño nulo o la nota de la publicada, M6 sin
    `puede()` (Vitest, commit 1); M3 la base que no cambia tras entrar (T6); M5 a–d el `pct` sin contar, contado sin `secundario`, la auxiliar sin subir a su
    fila y un `atajos` como celda (T2); M8 la `key` con la versión (G1: «No hay cambios por guardar.» en vez de «Se guardó», el editor se volvió a montar);
    M7 publicar y descartar sin la hora (T4 y G6).
  - Medido: el pedido de guardar con 600 filas, 69.372 B y 130 ms hasta «Se guardó» (G7, escritorio); 2.000 nodos con 2.000 ítems de diseño, 400.650 B, bajo
    el tope de 1 MB de una Server Action.
- **Abiertos:** la auxiliar de un número sin celda deja el borrador sin poder publicarse hasta el 3b-2 (P2: la migración de `validar_diseno()`, con compuerta
  `datos`). El O(filas × nodos) de abrir el editor (3a-1) sigue. Sigue el 4.21-3b-2 y el 4.21-3c.
  e2e completo: no (4.21-3b-1, pantalla y escritura, Nivel 1: lo dirigido en escritorio y movil)
