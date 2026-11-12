# 8.01-1: decisiones (2026-11-12)

- **D1 · El HTML del sitio lo deriva la base** (duda 1 de la fila; cierra la contradicción 4 de la Fase 8, «Tiptap saneado» sin con qué). El editor
  manda un documento de ProseMirror; `_web_doc_html()` lo valida contra una lista blanca y escribe el HTML (como `_seguimiento_detalle()` en leads). Sin
  saneador de HTML ni dependencia nueva. Espejo en `src/modules/web/entities/contenido/doc.ts` con la misma tabla de casos.
- **D2 · `legales` = `{terminos|privacidad: {titulo, doc, html, actualizado_en}}`** (duda 2). `html` y `actualizado_en` los pone
  `trg_web_ajustes_legales`, escriba quien escriba (también `service_role`); `actualizado_en` cambia sólo si cambió el título o el documento. La
  migración pasó lo guardado por la misma validación y se detiene si una clave no cumple (en la nube no hubo pantalla de legales: se espera `{}`).
  **Contrato con el repo del sitio:** `web.ajustes.legales` cambia de forma; el sitio dibuja `legales.<clave>.html` y `titulo`.
- **D3 · La política de la cola la cambia quien tenga `web.cola.gestionar` o `web.ajustes.gestionar`** (duda 3; cierra la contradicción 2). Las claves
  `cola_activa`, `ttl_contacto_minutos`, `dias_pegajoso`, `max_abiertas_default` y `max_intentos`; lo demás pide `web.ajustes.gestionar`. El permiso se
  mira por las claves que llegan, no por las que cambian: la pestaña «Ajustes» (8.01-4) manda sólo las del sitio.
- **D4 · Imagen del documento = `{type: 'image', attrs: {ruta, alt?}}`**, con `ruta` relativa al bucket público `web` (letras, dígitos, `_`, `-`,
  carpetas y extensión `webp|png|jpg|jpeg` en minúsculas). Sale `<img data-ruta="…" alt="…">` y el sitio arma la URL pública, como ya lo hace con
  `portada`. Un `src`, un esquema u otro host se rechazan. **Contrato con el repo del sitio.**
- **D5 · Fuera de la lista blanca se rechaza (22023, hint `doc`), no se recorta**: el editor (8.03) limpia antes de mandar.
- **D6 · `minutos_lectura` lo calcula sólo la base**: palabras / 200 hacia arriba, al menos 1; sin palabras, nulo. No se espeja en TS.
- **D7 · Los legales no llevan imágenes** (nadie cuenta sus rutas) y no pueden quedar vacíos.
- **D8 · Una guía de antes sin documento conserva su HTML** mientras nadie escriba el cuerpo (la migración no borra contenido), pero una guía publicada
  siempre lleva el HTML derivado: la migración despublica las publicadas sin documento (con `raise notice` de cuántas) y publicar recalcula desde el
  documento. El HTML heredado no está saneado: por eso no se sirve.
- **D9 · `redes` admite `facebook`, `instagram`, `tiktok`, `youtube`, `x` y `linkedin` (`https://`, hasta 500); `seo`, `titulo` (70) y `descripcion`
  (160).** Se reemplazan enteros; un valor nulo o vacío omite la clave. Ampliar es una migración.
- **D10 · `web_testimonio_consentir` y `web_testimonio_retirar` llevan `p_actualizado_en_esperado`** aunque la fila las nombre sin él (`migraciones.md`:
  toda RPC de edición). Retirar uno ya retirado devuelve la versión sin escribir.
- **D11 · El canal del consentimiento es texto libre de 1 a 80** (la pantalla de 8.02 ofrece sugerencias). Registrarlo de nuevo tras retirarlo lo reactiva.
- **D12 · La migración despublicó los testimonios publicados sin el trío**: la vista ya no los mostraba; así el trigger no rompe sus próximas escrituras.
- **D13 · `aplicado_en` de `web.ajustes.gestionar` pasa a `web_ajustes_guardar`** y el de `web.cola.gestionar` suma la política de la cola, en la
  migración y en el seed (auditoría del plan).
- **D14 · Los ayudantes del documento y de los ajustes no son superficie de PostgREST**: sin `execute` para `anon` ni `authenticated`; los usan triggers y
  RPC `security definer`.
- **D15 · El consentimiento está atado al texto**: en un testimonio con consentimiento registrado, cambiar `cliente`, `texto` o `foto_ruta` anula el
  consentimiento y lo despublica (auditoría del plan: la persona consintió ese texto y esa foto). Cambiar la ciudad o el vehículo apaga sólo el permiso
  de mostrarlos (`consent_ciudad`, `consent_vehiculo`) y el testimonio sigue publicado (auditoría del informe); cambiar el orden no toca nada.
- **D17 · Queda para después (auditoría del informe, menores):** la migración no vuelve a validar `redes` ni `seo` ya guardados (en la nube nunca hubo
  pantalla; se validan al guardar por la RPC); `_web_doc_nodo` y `_web_ajustes_objeto` pasan las 80 líneas por función: se parten cuando se toquen.
- **D16 · La RPC no crea la fila única de `ajustes_web`**: la crea el seed y la migración (`on conflict do nothing`); un `insert … on conflict` en cada
  llamada dispararía los triggers por sentencia (revalidar) aunque no escriba.
