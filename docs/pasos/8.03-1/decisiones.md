# 8.03-1: decisiones (2026-11-12)

Guías con el editor, publicar y la página de la guía (parte 1 de 2 del 8.03; categorías y legales son el 8.03-2).

- **D1 · Legales (8.03-2): `terminos` y `privacidad`**, los dos que la base admite (`_web_ajustes_validar`). La recomendada de la fila.
- **D2 · «Programar» entra**: `publicada_en` futura; `web.guias` ya filtra `publicada_en <= now()`. Sin base nueva. La recomendada de la fila.
- **D3 · Guardar, publicar, programar y despublicar son un solo `update`** con `actualizado_en` esperado: publicar guarda lo que hay en pantalla (no existe «publicar
  lo guardado» con cambios sin guardar). Sin RPC ni migración: la policy `web_guias: editar` y `trg_web_guia_publicar_validar` (`42501` sin `web.guias.publicar`, sólo si
  cambia `publicada_en`) ya lo cubren. La action comprueba los dos permisos antes de escribir; la base los repite.
- **D4 · «Nueva guía» crea el borrador con título y dirección** en un `<Drawer>` (`?panel=guia-nueva`) y lleva a `/configuracion/web/guias/<id>`: la página sólo edita
  filas que existen.
- **D5 · Conflicto = cero filas** del `update … where actualizado_en = <esperado>`; un segundo `select` distingue «Esta guía ya no existe.». Es una tabla de configuración
  sin RPC de versión.
- **D6 · «Publicar» pone `publicada_en = ahora − 60 s`**: el reloj de Next no es el de la base y con «ahora» exacto la guía saldría «Programada» unos segundos.
  «Programar» pide una fecha de al menos un minuto adelante.
- **D7 · Publicar y programar exigen texto**, permiso y red, con ese orden de motivos; despublicar sólo pide el permiso. El motivo del botón apagado queda a la vista
  bajo los botones (`aria-describedby`), no sólo en un `title`.
- **D8 · La dirección** (`slug`) se arma con el título en «Nueva guía» y se puede editar. En la página de la guía **no sigue al título** (cambiaría la URL de una
  guía ya publicada) y la ayuda lo advierte.
- **D9 · Categoría y autor** se leen con tope + 1 (100); la categoría y el autor actuales entran aunque ya no estén activos («(desactivada)»). El nombre del autor sólo
  se ve en la web si su perfil es público: la ayuda lo dice. Hasta el 8.03-2 no hay forma de crear categorías.
- **D10 · Sin migración, sin `src/shared`**: la ruta de la guía se arma en `entities/contenido/guias.ts` (`rutaDeGuia`), no en `rutas.ts`.
- **D11 · Imágenes en `guias/<hash>.webp` del bucket `web`** (WebP de hasta 1600 px). Al guardar o eliminar se retiran con `quitarSiHuerfano` las que dejaron de estar; una
  imagen subida y nunca guardada queda huérfana (deuda aceptada).
- **D12 · La imagen sólo entra en el primer nivel del documento** (así lo exige `_web_doc_html`): el botón la inserta tras el bloque donde está el cursor y
  `documentoLimpio` descarta lo anidado. Una `<img>` pegada de otro sitio no crea nada (el nodo sólo lee `img[data-ruta]`).
- **D13 · La búsqueda por título es del servidor** (`?q=`, desde 3 letras, `ilike` con `%`, `_` y `\` escapados): son decenas de guías, sin índice ni cursor.
- **D14 · El estado se calcula al leer** (`ahora` se toma tras la consulta, tras `await connection()`): «Borrador», «Programada para el …» o «Publicada el …», siempre
  con palabras.
- **D15 · «Programar…» es un campo en línea bajo la barra** (fecha y hora de la empresa; ISO al servidor), no un modal: ningún modal abre otro nivel y evita un
  `?panel=` más sin ganar nada. Microdecisión de pantalla.
- **D16 · «Eliminar guía» es un botón al pie de la página**, no un menú «⋯» (la cabecera no tiene otra acción secundaria). Abre `<Confirmar>` con `?eliminar=guia`.
- **D17 · La lista no tiene «⋯»**: un clic en la fila (o el botón con el título) abre la página de la guía. Con `<AbrirResumen>` como parada de Tab.
- **D18 · `documentoLimpio` aplana las listas demasiado hondas** (la base admite profundidad 6: una lista sólo cabe hasta la profundidad 3) y baja a párrafo un
  título dentro de una lista o una cita; los títulos de nivel distinto de 2 y 3 pasan a 3. Defensa en el navegador y otra vez en la action: la base es la frontera.
