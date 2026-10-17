'use client'

import { createContext, use, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { ANCHO_DE_ESCRITORIO, CORTES_DE_ANCHO, cookieDeAncho } from '@/shared/lib/ancho'

// El ancho que el servidor supuso para esta página (`anchoDeEstaPeticion()`): es lo que se dibuja en el servidor y en la
// hidratación. Después manda la pantalla de verdad.
const ContextoDeAncho = createContext<number>(ANCHO_DE_ESCRITORIO)

// La única cookie que escribe el navegador: el ancho, sin datos de nadie.
function recordarAncho(): void {
  document.cookie = cookieDeAncho(window.innerWidth)
}

// Lo pone el layout `(app)` una vez, con el ancho de la petición. Deja el ancho en una cookie al hidratar y cada vez que la
// pantalla cruza un corte (girar el celular, redimensionar), así la próxima página llega ya con su vista.
export function ProveedorDeAncho({ inicial, children }: { inicial: number; children: ReactNode }) {
  useEffect(() => {
    recordarAncho()
    const medios = CORTES_DE_ANCHO.map((corte) =>
      window.matchMedia(`(min-width: ${String(corte)}px)`),
    )
    for (const medio of medios) {
      medio.addEventListener('change', recordarAncho)
    }
    return () => {
      for (const medio of medios) {
        medio.removeEventListener('change', recordarAncho)
      }
    }
  }, [])
  return <ContextoDeAncho value={inicial}>{children}</ContextoDeAncho>
}

// ¿La pantalla mide al menos `corte` px? En el servidor y al hidratar, lo que supuso la petición (así el HTML y la primera
// pintura coinciden y no hay salto); después, la pantalla, y cambia al girar o redimensionar sin pedir nada al servidor.
export function useAlMenos(corte: number): boolean {
  const inicial = use(ContextoDeAncho)
  return useSyncExternalStore(
    (alCambiar) => {
      const medio = window.matchMedia(`(min-width: ${String(corte)}px)`)
      medio.addEventListener('change', alCambiar)
      return () => {
        medio.removeEventListener('change', alCambiar)
      }
    },
    () => window.matchMedia(`(min-width: ${String(corte)}px)`).matches,
    () => inicial >= corte,
  )
}
