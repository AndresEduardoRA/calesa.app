'use client'

import { useCallback, useState } from 'react'

// Margen para empezar a leer un poco antes de que la sección llegue a la pantalla.
const MARGEN = '200px'

// Si el nodo ya estuvo a la vista alguna vez (4.27-2): la sección de comentarios lee y pide su código recién ahí, no con la página. Sin
// `IntersectionObserver`, enseguida.
export function useALaVista<T extends Element>(): [
  (nodo: T | null) => (() => void) | undefined,
  boolean,
] {
  const [visto, setVisto] = useState(false)
  const observar = useCallback((nodo: T | null) => {
    if (nodo === null) {
      return undefined
    }
    if (typeof IntersectionObserver === 'undefined') {
      setVisto(true)
      return undefined
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          setVisto(true)
          observador.disconnect()
        }
      },
      { rootMargin: MARGEN },
    )
    observador.observe(nodo)
    return () => {
      observador.disconnect()
    }
  }, [])
  return [observar, visto]
}
