## 9.10 · PWA: instalar la app, parte 1 (2026-11-12)

«Instalar la app» en el menú del usuario: regla pura `ofrecerInstalacion()` (`src/shared/lib/instalacion.ts`, con su test), `useInstalacion()`
que guarda el `beforeinstallprompt` desde que se evalúa el módulo, y `<InstalarApp>`; en iOS un aviso con «Compartir › Agregar a inicio».
El manifest gana `id: '/'` y los atajos «Nuevo lead» y «Cotizar». `public/sw.js` no cambió (sin caché; `push` y `notificationclick` son del
7.04). `e2e/pwa.spec.ts` (6 casos, escritorio y móvil, 12 en verde): manifest, service worker activo y sin caché, instalar llama a `prompt()`
una vez, sin evento no se ofrece, iOS, y el clic de una notificación con el service worker real navega a su ruta. Queda **9.10-2**: el logo oscuro.

- e2e completo: no (9.10, Nivel 2: lo prueba el CI del PR; dirigidos: pwa, roles-niveles y rueda-por-rol en escritorio y móvil)
