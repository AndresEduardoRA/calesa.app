// Service worker de la PWA. Sin caché offline a propósito: sin conexión la app no funciona
// y no se simula que sí. Atiende el push web (7.04) y abre la ruta del aviso al tocarlo.
// Lo registra src/shared/ui/registrar-service-worker.tsx en producción y, al encender los avisos, usePush().

self.addEventListener('install', () => {
  // La versión nueva reemplaza a la anterior sin esperar a que se cierren las pestañas.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const RUTA_POR_OMISION = '/notificaciones'

// La carga del push es { titulo, cuerpo, ruta } (supabase/functions/push). Una carga ilegible nunca lanza.
function leerCarga(event) {
  try {
    const carga = event.data ? event.data.json() : null
    if (carga && typeof carga === 'object') return carga
  } catch {
    // cae al aviso genérico
  }
  return {}
}

self.addEventListener('push', (event) => {
  const carga = leerCarga(event)
  const titulo = typeof carga.titulo === 'string' && carga.titulo !== '' ? carga.titulo : 'Tienes un aviso nuevo'
  const cuerpo = typeof carga.cuerpo === 'string' && carga.cuerpo !== '' ? carga.cuerpo : undefined
  const ruta = typeof carga.ruta === 'string' ? carga.ruta : null
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      data: { ruta },
      icon: '/iconos/icono-192.png',
      tag: 'importadora',
    }),
  )
})

// La ruta es la única entrada que no controla la base: sólo se abre si es del mismo origen y empieza con una sola «/».
function destinoSeguro(ruta) {
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) {
    return new URL(RUTA_POR_OMISION, self.location.origin).href
  }
  try {
    const url = new URL(ruta, self.location.origin)
    if (url.origin === self.location.origin) return url.href
  } catch {
    // cae a la ruta por omisión
  }
  return new URL(RUTA_POR_OMISION, self.location.origin).href
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const ruta = event.notification.data ? event.notification.data.ruta : null
  const destino = destinoSeguro(ruta)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin)
      if (!abierta) return self.clients.openWindow(destino)
      return abierta.focus().then((enfocada) => {
        const ventana = enfocada || abierta
        return typeof ventana.navigate === 'function' ? ventana.navigate(destino) : undefined
      })
    }),
  )
})
