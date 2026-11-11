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
