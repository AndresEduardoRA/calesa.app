'use client'

import { useEffect, useRef, useState } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { avisarError } from '@/shared/ui/toasts'

// La versión de las fotos que manda cada edición, y lo que se anuncia después de cada una.
// La versión llega con la página; entre una action y el redibujado vale la que devolvió la action.
export function useVersionDeFotos(deLaPagina: string | null) {
  const version = useRef(deLaPagina)
  useEffect(() => {
    version.current = deLaPagina
  }, [deLaPagina])
  // Lo que se le dice a un lector de pantalla.
  const [anuncio, setAnuncio] = useState('')

  // Cierra una edición: si no salió, lo dice (un conflicto ofrece «Recargar»); si salió, toma
  // la versión nueva y anuncia el cambio.
  function cerrar(resultado: Resultado<{ actualizadoEn: string | null }>, dicho: string): boolean {
    if (!resultado.ok) {
      avisarError(resultado.error)
      return false
    }
    version.current = resultado.data.actualizadoEn ?? version.current
    setAnuncio(dicho)
    return true
  }

  return { vigente: () => version.current, cerrar, anuncio }
}
