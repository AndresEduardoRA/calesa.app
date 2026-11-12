## 2026-11-12 — Paso 7.04: preferencias de notificaciones y activar el push

- **Hecho:** `public/sw.js` atiende `push` (carga ilegible = «Tienes un aviso nuevo», nunca lanza) y `notificationclick` (sólo abre rutas del mismo
  origen; si no, `/notificaciones`). Bloque «Notificaciones» en `/perfil` (ancla `#notificaciones`, tras `<Suspense>`): «Recibir avisos en este
  navegador» (`usePush()`), un interruptor de push por tipo del catálogo (11, con etiqueta y descripción) y «Tus navegadores» con «Quitar». Los cinco
  motivos (sin permiso, integración apagada, sin clave, sin soporte, negado) dejan el interruptor a la vista, deshabilitado y con su texto. Empresa ›
  Integraciones gana la tarjeta «Avisos push» (interruptor de `push_web`: **cierra «sin interfaz: `push_web`» de la Deuda aceptada de ESTADO**).
  `/notificaciones` suma el enlace «Preferencias de avisos». Sin migración ni cambio de `database.types.ts`.
- **Verificación** (`.piloto/salidas/7.04/`): vitest de lo nuevo y `scripts/guardas` en verde (1.320 y 1.325 al correr las carpetas tocadas);
  `e2e-perfil-notificaciones.txt`: 6 de 6 en escritorio (encender crea la fila y apagar la quita; apagar «Recordatorios» deja `{"recordatorio": false}`,
  sobrevive a recargar y encender borra la fila; sin permiso; integración apagada; Empresa enciende `push_web`; sin ajustes queda deshabilitada).
  `e2e-dirigidos.txt` (perfil-avatar, empresa-integracion-web, notificaciones-campana, interruptor-200, configuracion-200, presupuesto-js,
  rueda-por-rol; escritorio y celular): 91 verdes y 8 saltadas, y 2 caídas que son el presupuesto del documento de `/perfil` (91,19 de 91 KB);
  subido a 96 KB (lo medido, 93.382 B, más un 5 %, `docs/RENDIMIENTO.md`) y `e2e-presupuesto.txt`: 10 verdes. JS en frío de `/perfil` 421,7 de 440 KB.
- **No se probó:** el service worker real ni una suscripción a un servicio de push real (el e2e simula `navigator.serviceWorker` y `Notification`;
  la seguridad del clic la cubre `sw.test.ts`); la entrega de punta a punta ya es de 7.03.
- e2e completo: no (7.04, Nivel 1: lo prueba el CI del PR; dirigidos: perfil-notificaciones, perfil-avatar, empresa-integracion-web,
  notificaciones-campana, interruptor-200, configuracion-200, presupuesto-js, rueda-por-rol)
