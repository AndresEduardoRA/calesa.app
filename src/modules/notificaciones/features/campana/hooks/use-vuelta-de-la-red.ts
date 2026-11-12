'use client'

import { useEffect, useState } from 'react'

// Un número que sube cada vez que el navegador vuelve a tener red (`online`). Como `key`, remonta lo que se pidió sin
// red: la suscripción de la campana vuelve a pedir su código y su contador sin esperar a «Reintentar» ni a recargar (7-2).
export function useVueltaDeLaRed(): number {
  const [vuelta, setVuelta] = useState(0)
  useEffect(() => {
    const alVolver = () => {
      setVuelta((n) => n + 1)
    }
    window.addEventListener('online', alVolver)
    return () => {
      window.removeEventListener('online', alVolver)
    }
  }, [])
  return vuelta
}
