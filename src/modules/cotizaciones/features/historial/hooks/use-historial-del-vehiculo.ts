'use client'

import { useState } from 'react'
import { usePaginasDelHistorial } from './use-paginas-del-historial'

// El historial plegable del panel de la hoja: plegado y sin leer hasta desplegarlo (nunca con el panel); plegar y volver a desplegar no vuelve a leer.
// Las páginas son las de `usePaginasDelHistorial`.
export function useHistorialDelVehiculo(vehiculoId: string) {
  const [abierto, setAbierto] = useState(false)
  const paginas = usePaginasDelHistorial(vehiculoId)
  return {
    abierto,
    ...paginas,
    alternar: () => {
      setAbierto(!abierto)
      if (!abierto) {
        paginas.leerLaPrimera()
      }
    },
  }
}
