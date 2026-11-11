## 2026-11-11 — Paso 5.03: la base de «Tipos de documento»

- **D1 · Qué significa cada modo de vencimiento** (duda (a) de la fila, la recomendada):
  - `ninguno`: no vence;
  - `solicitar`: quien sube el documento escribe su fecha;
  - `renovar`: vence a los `vigencia_dias` de subido;
  - `aviso_dias`: cuántos días antes se avisa.
    Queda en `comment on column`. Lo hace cumplir la Fase 6 en `documentos.vence_el`.
- **D2 · `proposito` no se edita** (duda (b), la recomendada): ni crear ni guardar lo aceptan (`22023` con `hint = 'proposito'`).
- **D3 · Una combinación inválida se rechaza**, no se limpia en silencio. Son, por ejemplo, `renovar` sin vigencia, días de vigencia en otro modo o un aviso
  sin vencimiento. La pantalla manda el estado entero, y rechazar no borra un dato que la persona escribió. No hay `check` nuevo en la tabla: la única
  escritura es la RPC.
- **D4 · La versión es por fila, con un trigger propio** (`tipo_documento_version()`). El genérico pone `now()` y no se mueve dos veces en una transacción.
  Ordenar no cambia versiones.
- **D5 · El permiso del grupo se exige antes que la versión.** Que la fila exista no se oculta, porque todo `authenticated` lee la tabla.
- **D6 · Un global nuevo puede llevar el nombre de un tipo de un flujo.** Sólo se prohíbe la otra dirección: un tipo de flujo activo no repite un global
  activo. Quien gestiona los catálogos no puede arreglar los tipos de un flujo que no configura.
- **D7 · Un tipo que pide un requisito se puede desactivar, y el requisito queda.** Qué hacer con un requisito de un tipo inactivo lo deciden «Revisar» o la
  Fase 6.
- **D8 · Apagar `visible_portal_permitido` no oculta los documentos ya marcados visibles.** Eso es de `documentos` (6.05).
- **D9 · Tope de 100 tipos por grupo, y conteos de uso con tope de 50 + 1.** Es un catálogo de configuración: sin `medir-*.sql` ni fila en RENDIMIENTO.
- **D10 · Sin `trg_auditar` nuevo.** La actividad es de la Fase 9.
- **D11 · El candado de `fase_requisito_validar()` (`for share`) va sin prueba de carrera.** `scripts/carreras/` se limita a marcar final y comprobantes.
  El 5.07 parte de esta definición.
- **D12 · El paso cabe en una parte**, con cinco commits de código, uno por intención.
- **Ningún ayudante recibe sólo la fila** (`_tipo_documento_validar(fila, válidos)`, `_tipo_documento_nombre_libre(id, flujo, nombre, activo)`).
  PostgREST toma una función de un solo argumento de tipo fila como columna calculada de la tabla, y `db:types` la mostraba en `ComputedFields`.
