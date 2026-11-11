## 2026-11-11 — Paso 6.05: documentos en la base

- **D1 · Un objeto y N filas** (duda 1, la recomendada). Un archivo subido para N vehículos es un objeto en la carpeta del primero y N filas de
  `documentos` con la misma ruta. Quien ve cualquiera de esas filas vivas lee el objeto (policy «documentos: leer» de `storage.objects`).
- **D2 · Eliminar no se deshace** (duda 2, la recomendada). Es un borrado suave y no hay restaurar. Para corregir, se sube otro.
- **D3 · `visible_portal` lo marca quien aprueba** (duda 3, la recomendada). `documento_registrar` no lo recibe; sólo lo cambia `documento_editar`
  con la clave de aprobar.
- **D4 · El refcount cuenta sólo las filas vivas.** `storage_refcount('documentos', …)` ignora las eliminadas. Si no, un documento eliminado retendría su
  objeto para siempre, porque `storage_gc_reclamar` vuelve a contar antes de borrar.
- **D5 · Hasta 100 vehículos por llamada.** Cubre un contenedor o un embarque y acota la transacción.
- **D6 · Los ids derivan de `p_id` y de la unidad** (`md5(p_id || ':' || unidad)::uuid`). Reintentar devuelve las mismas filas, sin importar el orden del
  arreglo. Si los ids ya existen con otra ruta, de otra persona o con otro conjunto de unidades, `23505/id`. Un reintento simultáneo cae en
  `on conflict do nothing` y vuelve a la rama idempotente, así que nunca sale un `23505` crudo.
- **D7 · El vencimiento se valida, no se limpia.**
  - `ninguno` con fecha da `22023/vence_el`, y `solicitar` sin fecha también.
  - `renovar` sin fecha calcula la emisión (o la subida) más `vigencia_dias`.
  - Al editar, las fechas se revalidan sólo si cambian: un tipo que cambió de modo no traba editar la nota.
- **D8 · El mime y los bytes de `storage.objects.metadata` pesan más que los del cliente**, como en `cotizacion_adjuntar`. Los formatos admitidos salen del
  tipo.
- **D9 · Quien subió puede editar y eliminar mientras siga «subido»**, si conserva la clave de subir. Lo aprobado o rechazado sólo lo toca quien aprueba.
- **D10 · Quien aprueba puede aprobar lo que subió él mismo.** El producto no tiene regla de cuatro ojos. Es reversible.
- **D11 · La carrera de dos quitas se prueba (K1, `supabase/tests/areas/documentos/carreras.mjs`).** El trigger serializa con un candado por unidad y
  tipo.
- **D12 · Queda una carrera para 6.02 (1), del carril a.** Mover a una fase que exige el documento mientras alguien lo quita puede dejar la unidad «fuera de
  regla», porque `cambiar_fase` evalúa antes de tomar la unidad. Cuando `cambiar_fase` tome la unidad `for update` antes de
  `previsualizar_cambio_fase`, el `for share` del trigger serializa los dos órdenes sin interbloqueo.
- **D13 · El portal oculta los tipos sin `visible_portal_permitido` al leer**, sin tocar `documentos.visible_portal`: volver a permitirlo los muestra de
  nuevo. Además, `documento_sellos` mira el permiso del tipo sólo cuando `visible_portal` se enciende. Así, un visible de un tipo al que se le apagó el
  permiso (D8 de 5.03) se sigue revisando, editando y eliminando.
- **D14 · El paso cabe en una parte** (6 commits de código). La fila estimaba 3.
