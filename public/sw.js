// Service worker mínimo de la PWA. Sin caché offline a propósito: sin conexión la app no funciona
// y no se simula que sí. Existe para que la app sea instalable y, más adelante, para el push web.
// Lo registra src/shared/ui/registrar-service-worker.tsx sólo en producción.

self.addEventListener('install', () => {
  // La versión nueva reemplaza a la anterior sin esperar a que se cierren las pestañas.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
