'use client'

import { useRef, useState } from 'react'

// Un envío a la vez, con una marca propia y no con `isPending`: un doble Enter, o el reintento al
// volver la conexión, llegan antes de que el estado de la acción cambie. `mandar` devuelve nulo si ya
// había uno en vuelo (no se manda nada).
export function useUnEnvioALaVez() {
  const [enCurso, setEnCurso] = useState(false)
  const enVuelo = useRef(false)
  async function mandar<T>(envio: () => Promise<T>): Promise<T | null> {
    if (enVuelo.current) {
      return null
    }
    enVuelo.current = true
    setEnCurso(true)
    try {
      return await envio()
    } finally {
      enVuelo.current = false
      setEnCurso(false)
    }
  }
  return { mandar, enCurso }
}
