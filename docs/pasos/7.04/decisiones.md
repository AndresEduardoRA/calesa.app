## 2026-11-12 — Paso 7.04: preferencias de notificaciones y activar el push

- **D1 · Las preferencias viven en `/perfil`** (duda de la fila, la recomendada), con un enlace desde `/notificaciones`: es donde ya están las demás.
- **D2 · Apagar un tipo sólo detiene el push, no la campana:** la campana es el registro (ficha del módulo); el bloque lo dice una vez.
- **D3 · La preferencia se escribe directo bajo RLS propia, no por RPC:** no otorga permisos y la base ya exige un objeto. Una acción lee la fila,
  cambia una clave y borra la fila si queda vacía (vuelve a «todo encendido»). Dos pestañas pueden pisarse una clave: aceptado.
- **D4 · El `tipo` acepta `^[a-z][a-z0-9_]{0,59}$`, no sólo el catálogo:** una fase nueva suma tipos sin tocar el esquema; la interfaz ofrece el catálogo.
- **D5 · La clave pública VAPID se lee en el servidor y llega por props:** ni el e2e ni el despliegue dependen de que el bundle la haya incrustado.
  `playwright.config.ts` le da al servidor de e2e una clave pública de prueba (no hay privada).
- **D6 · Con `push_web` apagada, el interruptor del navegador queda deshabilitado con su motivo; los de por tipo siguen activos** (son preferencias).
- **D7 · `usePush` registra `/sw.js` al encender:** el layout sólo lo registra en producción y `getRegistration()` (no `ready`) lee el estado sin colgarse.
- **D8 · «Tus navegadores» nombra el navegador desde `user_agent`** («Chrome en Windows») y nunca muestra el `endpoint`; el actual lleva «Este navegador».
- **D9 · El documento de `/perfil` sube a 96 KB** (de 91): el bloque, el esqueleto de su `<Suspense>` y las props del bloque diferido suman ≈ 6,7 KB
  (93.382 B medidos); regla del 5 %, sin refactorizar. El JS en frío no cambió de presupuesto (421,7 de 440 KB).
- **D10 · Los textos de las descripciones por tipo** (`entities/tipos.ts`) son microdecisión de UX: una línea por tipo, «Cuando …».
