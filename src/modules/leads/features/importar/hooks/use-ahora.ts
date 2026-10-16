'use client'

import { useEffect, useState } from 'react'

// El instante contra el que se cuenta lo que le queda al plazo. Empieza en el que dio quien dibujó la
// pantalla (el servidor, o el cierre de la importación: el mismo al hidratar) y avanza cada minuto.
export function useAhora(inicial: string): Date {
  const [ahora, setAhora] = useState(() => new Date(inicial))
  useEffect(() => {
    const reloj = setInterval(() => {
      setAhora(new Date())
    }, 60_000)
    return () => {
      clearInterval(reloj)
    }
  }, [])
  return ahora
}
