'use client'

import { useEffect, useState } from 'react'

// El instante contra el que se cuenta lo relativo («hace 3 días», lo que le queda a un plazo). Empieza en el que dio quien dibujó la pantalla
// (el servidor: el mismo al hidratar, sin diferencia entre lo que el servidor escribió y lo que el navegador pinta) y avanza cada minuto, sin
// recargar. Se llama una vez por lista y el instante baja por props: nunca un reloj por fila.
const UN_MINUTO = 60_000

export function useAhora(inicial: string): Date {
  const [ahora, setAhora] = useState(() => new Date(inicial))
  useEffect(() => {
    const reloj = setInterval(() => {
      setAhora(new Date())
    }, UN_MINUTO)
    return () => {
      clearInterval(reloj)
    }
  }, [])
  return ahora
}
