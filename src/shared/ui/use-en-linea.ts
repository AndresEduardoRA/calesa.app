'use client'

import { useSyncExternalStore } from 'react'

function suscribir(alCambiar: () => void): () => void {
  window.addEventListener('online', alCambiar)
  window.addEventListener('offline', alCambiar)
  return () => {
    window.removeEventListener('online', alCambiar)
    window.removeEventListener('offline', alCambiar)
  }
}

// Si el navegador dice tener conexión. Sirve para avisar con el formulario abierto, antes de que
// la persona intente guardar; no reemplaza al error del envío, que es el que manda.
export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  )
}
