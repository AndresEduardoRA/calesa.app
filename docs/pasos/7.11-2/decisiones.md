## 2026-11-12 · Decisiones del paso 7.11-2 («Escribirle por chat» y `/chat?con=`)

- **D6 · El enlace se ofrece a quien tiene `chat.participar`;** que la otra persona también lo tenga no se sabe en el navegador sin una RPC nueva: lo decide `chat_directa` y la página `/chat` lo dice. Sin SQL.
- **D11 · No se agrega `RUTAS.chat`:** no existe y el widget y la barra usan la ruta literal; el enlace usa `/chat?con=` con `as Route`.
- **D12 · Un `?con=` que falla se dice con `<Aviso tono="peligro">` y la lista debajo,** no con `EstadoError` (de cliente, exige «Reintentar»): no se pierde la pantalla; reintentar es recargar. El mensaje es el de la base.
- **D13 · `ASESORA` de los e2e del alta no se toca** (no trae `chat.participar`; sumarlo movería el marco de unos 15 specs): el caso feliz va en `chat-widget.spec.ts` (con chat y `leads.ver` sólo de los propios, para que el aviso diga «Lo tiene Luis» y no «Ya existe») y `leads-alta.spec.ts` afirma que sin chat no hay enlace.
- **D14 · `?con=` se resuelve en el render con `chat_directa`,** una RPC idempotente (devuelve la directa existente), en vez de una action desde el cliente: un enlace plano sirve con el botón de atrás y en el celular sin JS extra. Una directa recién creada y vacía no aparece en la lista del otro hasta el primer mensaje.
