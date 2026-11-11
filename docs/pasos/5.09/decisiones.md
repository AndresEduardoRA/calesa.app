## 2026-11-11 — Paso 5.09: «Documentos» (tipos de documento de la empresa y del flujo)

- **D1 · La lectura va directa a la tabla**, con columnas nombradas, orden por `orden` y `nombre` y `limit(100 + 1)` por grupo (índice
  `tipos_documento_flujo_id_nombre_key`, `flujo_id` primero). El uso (`tipos_documento_con_uso`) se pide sólo si quien mira puede cambiar ese grupo: si no,
  la base da `42501`. Es un catálogo de configuración: sin medición de volumen.
- **D2 · La lista viene de props y cada escritura relee.** Ninguna RPC devuelve la lista, así que la action revalida la pantalla y el cliente espera el
  `router.refresh()`. Difiere de `tipos-de-seguimiento` de leads, donde cada RPC devuelve la lista entera.
- **D3 · Los conteos del uso se muestran acotados** (`conteoAcotado(n, 50)`, llegan como 51): «Lo usan 3 documentos y 2 requisitos», «más de 50».
- **D4 · Dos grupos con un solo componente de grupo**: «De toda la empresa» y «Sólo de este flujo».
- **D5 · La pestaña «Documentos» la ven** quienes tengan `flujos.configurar`, `repuestos.configurar` o `logistica.catalogos.gestionar`. Quien sólo tiene
  `flujos.configurar` ve los globales de sólo lectura, con el motivo.
- **D6 · Sólo lectura = «Editar» apagada con motivo y botones de orden apagados.** Se suma `motivoSinOrden` a `FilaDeCatalogo` para que el texto del botón
  apagado no diga «Ya es el primero…» cuando el motivo es el permiso (parte 2).
- **D7 · Los formatos llevan etiqueta humana** (PDF, JPG, PNG, WebP) y se guardan como MIME; al menos uno.
- **D8 · Cambiar el modo de vencimiento vacía los días que el modo nuevo no usa** (`borradorConModo`): la base los rechaza, y lo escrito no se pierde en
  silencio porque el campo desaparezca. La vigencia sólo con «renovar»; el aviso con «solicitar» o «renovar».
- **D9 · Eliminar se explica antes:** una fila sin uso ofrece «Eliminar»; una con uso, «Desactivar» con «Lo usan N documentos y M requisitos». Si el uso
  llega entre tanto, la base desactiva y el aviso lo dice con lo que devuelve.
- **D10 (5.09-1) · Las actions llevan el `flujoId` del grupo en su entrada.** Sin él no pueden exigir el permiso (`logistica.catalogos.gestionar` o
  `flujos`/`repuestos.configurar`) antes de la RPC; si alguien lo falsea, la base vuelve a exigirlo (`42501`).
- **D11 (5.09-1) · La validación del formulario se prueba contra la base**, no contra una tabla escrita a mano: PGlite con la tabla mínima y
  `_tipo_documento_validar()` de las migraciones, para que un cambio de la regla en SQL rompa la prueba de la app.
- **D12 (5.09-2) · Un solo cliente para los dos grupos.** `<TiposDeDocumento>` lleva los dos grupos, **un** modal (`?panel=nuevo-tipo|editar-tipo`) y **una**
  confirmación (`?panel=eliminar-tipo`), porque la URL tiene un solo `?panel=`. Las reglas de qué abre cada uno (`motivoParaNoAbrirTipo`,
  `motivoParaNoEliminarPorUrl`, en `entities/documentos/vista-de-grupo.ts`) cubren el grupo inexistente, el de sólo lectura, el tope y el uso.
- **D13 (5.09-2) · «Eliminar» de un tipo en uso se ve apagado con el motivo** («Lo usa 1 requisito: se desactiva en lugar de eliminarse.») en vez de
  desaparecer o cambiar de nombre; «Desactivar» ya está en el mismo menú. Es lo que pide `ui.md` (una acción que no se puede dice por qué) y deja un solo
  camino a «Desactivar».
- **D14 (5.09-2) · El foco tras «Subir»/«Bajar» se aplica cuando llega el orden nuevo.** La respuesta de la RPC no trae la lista: la página se relee y la fila
  cambia de lugar después. Mover un nodo con el foco puesto lo quita, así que el foco vuelve al botón al comparar la firma del orden contra la de antes de mover
  (`firmaDelOrden`). Al llegar al extremo, pasa al otro botón de la fila (como en las demás listas).
- **D15 (5.09-2) · La pestaña «Documentos» la ven quienes tienen alguna de `flujos.configurar`, `repuestos.configurar` o `logistica.catalogos.gestionar`**
  (la tarjeta «Flujos» del hub ya admitía las tres). Con sólo la tercera, es la única pestaña y la barra no se dibuja; con las otras dos, la barra aparece por
  primera vez («Fases» abre primero) y `pestanas.test.ts` y `configuracion-flujos.spec.ts` lo reflejan.
- **D16 (5.09-2) · `datosParaCrear` devuelve `DatosParaCrear` (todas las claves, sin `activo`)** para que el tipo coincida con el esquema de la action: un tipo
  nuevo nace activo y no manda `activo`.
