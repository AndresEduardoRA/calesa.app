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
