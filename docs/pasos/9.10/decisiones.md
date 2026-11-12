# 9.10 · PWA: instalar la app (parte 1)

- **Partición.** El logo oscuro cambia la base (redefine `empresa_guardar_ajustes` y `web.ajustes_acceso()`, ambas `security definer`, esta
  legible por `anon`) y suma capas con otra verificación: va en 9.10-2, paso de datos (plan y informe auditados). Su alcance, archivos y trampas
  están en `.piloto/planes/9.10.md` › «Parte 2 servida». Para `docs/PLAN.md`: la fila 9.10 queda «hecha la parte 1 (instalar, manifest,
  `sw.js`)»; «PWA» (PLAN ~2454) y el logo oscuro de «Sin interfaz» (~2433) se cierran con la 9.10-2.
- **D1 · Sin aviso que invite a instalar:** sólo la entrada del menú (un aviso que nadie pidió tapa trabajo).
- **D2 · Los atajos del manifest no se filtran por permiso:** el manifest se pide sin sesión. Son rutas que la app ya protege.
- **D3 · Las instrucciones de iOS van como aviso (toast)**, no como diálogo: es una línea y un `<Modal>` exige su URL.
- **D4 · La app no se instala de verdad en Chromium de pruebas.** El clic de la notificación no depende del modo de visualización, así que se
  prueba con el service worker real y la ventana abierta. `WindowClient.focus()` lo rechaza Chromium para un evento sintético («Not allowed
  to focus a window»: pide el gesto de un clic real): el spec lo sustituye sólo durante el evento y comprueba `matchAll`, la elección de la
  ventana y `navigate()` de `sw.js`. Que `focus()` enfoque la ventana con la app instalada de verdad queda a mano de la persona (9.14).
- **D5 · `id: '/'`**, igual que el `start_url`: cambiarlo después reinstalaría la app a todos.
- **La oferta se decide con el evento guardado al evaluarse el módulo**, no en un efecto del menú (el evento no se repite). En el e2e el aviso
  puede llegar antes de hidratar: el caso lo repite hasta que la entrada aparece.

# 9.10 · el logo oscuro (parte 2)

- **D1 · La base no valida la forma de `logo_oscuro_ruta`**, igual que `logo_ruta`: la valida Zod en la action (`RUTA_DE_LOGO`) y el permiso
  `empresa.ajustes.gestionar` es el filtro. Ninguna regla nueva que el logo normal no tenga.
- **D2 · Un solo «Guardar», una sola versión:** los dos logos viajan en la misma llamada de `empresa_guardar_ajustes()`; dos llamadas darían
  `PT409` a la segunda.
- **D3 · Con logo oscuro y sin normal**, el tema claro dibuja el glifo neutro. Sin logo oscuro, `<Marca>` queda como antes.
- **D4 · Los íconos de la app, la tarjeta y el PDF de una cotización salen del logo normal:** la pantalla de instalación y el papel son claros.
- **D5 · Dos imágenes y el tema elige por CSS**, no por JS: `next-themes` pone `.dark` antes de pintar, así el servidor y el cliente dibujan lo
  mismo y no hay parpadeo. La vista previa del oscuro en el formulario lleva `dark` para verse sobre el fondo de ese tema.
