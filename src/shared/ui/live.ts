'use client'

// Modo Live: para mostrarle la pantalla a un cliente sin que vea plata. Una clase en <html>
// esconde las cifras Y los símbolos de moneda de toda la app (los imprime <Monto>). El estado
// vive en esa clase: la pone `<GuionLive>` antes del primer pintado y la conmuta `useLive()`.
import { useSyncExternalStore } from 'react'
import { CLASE_LIVE, CLAVE_LIVE } from './guion-live'

const EVENTO = 'modo-live:cambio'

function suscribir(alCambiar: () => void): () => void {
  // `storage` avisa cuando lo cambió otra pestaña: todas quedan iguales.
  function alCambiarEnOtraPestana(evento: StorageEvent) {
    if (evento.key === CLAVE_LIVE) {
      document.documentElement.classList.toggle(CLASE_LIVE, evento.newValue === '1')
      alCambiar()
    }
  }
  window.addEventListener(EVENTO, alCambiar)
  window.addEventListener('storage', alCambiarEnOtraPestana)
  return () => {
    window.removeEventListener(EVENTO, alCambiar)
    window.removeEventListener('storage', alCambiarEnOtraPestana)
  }
}

function leer(): boolean {
  return document.documentElement.classList.contains(CLASE_LIVE)
}

function alternar(): void {
  const activo = document.documentElement.classList.toggle(CLASE_LIVE)
  try {
    localStorage.setItem(CLAVE_LIVE, activo ? '1' : '0')
  } catch {
    // Sin almacenamiento (modo privado estricto) el modo vale igual hasta recargar.
  }
  window.dispatchEvent(new Event(EVENTO))
}

export function useLive(): { live: boolean; alternar: () => void } {
  // En el servidor no se sabe: se renderiza apagado y el CSS ya esconde lo que haya que esconder.
  const live = useSyncExternalStore(suscribir, leer, () => false)
  return { live, alternar }
}
