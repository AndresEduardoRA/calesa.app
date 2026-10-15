'use client'

import { useSyncExternalStore } from 'react'

// ¿Se cumple esta media query? En el servidor y en la primera pintura es `false`: una hoja que
// cambia de lado según el ancho abre primero como en el celular y se acomoda al hidratar.
export function useConsultaDeMedios(consulta: string): boolean {
  return useSyncExternalStore(
    (alCambiar) => {
      const medios = window.matchMedia(consulta)
      medios.addEventListener('change', alCambiar)
      return () => {
        medios.removeEventListener('change', alCambiar)
      }
    },
    () => window.matchMedia(consulta).matches,
    () => false,
  )
}
