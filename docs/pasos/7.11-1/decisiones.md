## 2026-11-12 · Decisiones del paso 7.11-1 (widget del chat)

- **D1 · En el celular la burbuja es un enlace a `/chat`:** un panel flotante taparía el pie y las listas. El botón que abre el panel existe desde 768 px.
- **D2 · La burbuja va con `z-40`, por debajo de los modales y drawers (`z-50`):** con un panel abierto su velo la cubre y no tapa el pie. El panel del widget no es modal y se cierra con Escape.
- **D3 · Abajo a la derecha;** en el celular, a 5 rem del borde para no tapar los avisos (el toaster sale abajo a la derecha allí y a la izquierda desde 768 px).
- **D4 · El estado del widget (abierto, conversación elegida) es local, no la URL:** abrirlo no cambia la pantalla de atrás, y llevarlo a la URL cambiaría la de `/leads`. Es la excepción a «registro abierto en la URL» de `.claude/rules/ui.md`; el panel no tiene `<Confirmar>` ni `<Drawer>`.
- **D5 · El panel es sólo leer y responder:** el «⋯» del mensaje no se dibuja (`AccionesDelMensaje.sinMenu`); editar, borrar, responder con cita, `/tarea`, `/evento` y silenciar viven en `/chat`. Un comando `/tarea` o `/evento` y una mención llevan allí (`?panel=`, `?mencion=`).
- **D7 · El contador cuenta sólo lo no silenciado y 100 es «99+»:** lo que dice la base (`chat_no_leidos`); no se inventa otro.
- **D8 · El hilo recibe la conversación de la lista ya leída** (con su `ultimo_leido_en`): el panel no relee una por una, y el contador se mueve cuando `useMarcarLeido` llama a `chat_leer` (la señal de mi fila de miembro).
- **D9 · El panel se monta sólo abierto** (su código ya cargado no se vuelve a pedir): al cerrar se sueltan sus canales de Realtime y al reabrir se relee la primera página. Queda una sola suscripción permanente: la del contador.
- **D10 · Tope de JS de `/cotizaciones/[id]`: 448 → 452 KB.** Ya medía 447,3 antes del paso; el marco con la burbuja suma ≈ 1,9 KB (y un chunk) en toda pantalla, más de los 1,5 KB previstos, con el panel, el hilo y Realtime por `diferido()`. Regla del 5 %: el resto de topes no se tocan.
