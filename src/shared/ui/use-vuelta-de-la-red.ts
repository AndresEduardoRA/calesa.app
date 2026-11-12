'use client'

import { useEffect, useState } from 'react'

// Un número que sube cada vez que el navegador vuelve a tener red (`online`). Como `key`, remonta lo que se pidió sin
// red: una suscripción diferida del marco (la campana, los no leídos del chat) vuelve a pedir su código sin esperar a
// «Reintentar» ni a recargar, y su aviso fijo «Sin conexión» no queda tapando la pantalla (7-2).
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
