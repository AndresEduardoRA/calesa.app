'use client'

import { useEffect } from 'react'

// Registra public/sw.js. Sólo en producción: en desarrollo un service worker vivo entre recargas
// estorba más de lo que ayuda (y en local exige HTTPS).
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return
    }
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      console.error('No se pudo registrar el service worker', error)
    })
  }, [])

  return null
}
