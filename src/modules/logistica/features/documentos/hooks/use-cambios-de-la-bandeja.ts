'use client'

import { useEffect } from 'react'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'

// Con archivos en la bandeja, salir pregunta (6.06-2): cerrar el panel de la unidad lo pregunta en su pie (`useCambiosSinGuardar`, sin borrador: `preguntaAlCerrar`) y, como la pestaña
// de la ficha no tiene panel, recargar o cerrar la pestaña lo pregunta el navegador.
export function useCambiosDeLaBandeja(hayArchivos: boolean, alDescartar: () => void): void {
  useCambiosSinGuardar(hayArchivos, alDescartar, { preguntaAlCerrar: true })
  useEffect(() => {
    if (!hayArchivos) return
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
    }
    window.addEventListener('beforeunload', avisar)
    return () => {
      window.removeEventListener('beforeunload', avisar)
    }
  }, [hayArchivos])
}
