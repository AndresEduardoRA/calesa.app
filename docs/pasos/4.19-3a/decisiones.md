## 2026-11-07 — Paso 4.19-3a

- **El 4.19-3 se parte en tres** (3a servidor, 3b pestaña y editor que guarda, 3c publicar con nota y descartar): entero eran ≈ 35 archivos de capas con verificaciones distintas
  (Vitest y PostgREST contra e2e en escritorio y móvil), más de lo que caben tres commits de código. La fórmula hizo lo mismo en cuatro pasos. La cuenta de e2e: la 3a no la mueve (sin
  pantalla); la 3b la lleva a 2 y la 3c a 3, y el 4.19-4 correría el completo (confirmarlo con `cuenta-e2e.mjs`).
- **De la fórmula se lee sólo lo que mira `validarPlantilla()`** (`esquemaDefinicionParaPlantilla`, `esquemaDisenoParaPlantilla`: Zod `looseObject` sobre nodos, buckets, grupos, modos
  y secundarios de la tarjeta), no `esquemaDefinicion`: la base ya validó la fórmula al publicarla, y la plantilla no debe romperse con cada cambio de la fórmula. Lo que no tiene eso es
  «No pudimos leer la fórmula».
- **Guardar el borrador no manda `p_nota`:** el editor no escribe la nota del borrador; la nota es la de publicar, que la reemplaza.
- **El rechazo va a un campo con el `donde` de la base y su mensaje tal cual** (`rechazoHaciaUnCampo()`): `errorDePostgrest()` cambiaría por el genérico un mensaje con «column» o
  «relation», y un id de nodo puede traerlo (`columna_x`); con la regla en `details` se toma `error.message`.
- **`guardar` sólo valida la forma** (la base no pasa contexto): lo que cruza con la fórmula y los tonos lo dice publicar. El editor (4.19-3b) valida con `validarPlantilla(…, contexto)` al
  tipear, y guardar nunca sabe de un grupo ajeno.
- **La guarda del texto va en la action, con una pila y un tope de profundidad (8):** el recorrido recursivo no aguanta un pedido hostil, y `JSON.stringify` de supabase-js lanza `RangeError`
  con una profundidad grande. La ruta del problema nunca lleva el texto malo (una clave mala da la ruta de su objeto).
- **La nota de publicar tiene su propio esquema** (`esquemaDeNotaDePlantilla`): `entities/formula/publicacion.ts` es del carril B y de otra área. Los dos topes son 2.000; **pendiente:**
  mover la nota al núcleo y que las dos áreas usen una. Cuenta caracteres con `caracteres()`, no `.max(n)` (4-74).
- **La versión esperada se valida como `z.iso.datetime({ offset: true })`:** admite los 6 decimales y la zona de la base; un `Date`, un instante sin zona o vacío no pasan.
