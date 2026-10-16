'use client'

import { useState } from 'react'

// Un conflicto se va cuando llega la versión nueva (la trae «Recargar»), no al pulsarlo: enviar en
// ese instante mandaría la vieja y volvería a chocar. `version` es la que el formulario tiene ahora.
export function useConflictoHastaLaVersion(version: string | null) {
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [vista, setVista] = useState(version)
  if (vista !== version) {
    setVista(version)
    setConflicto(null)
  }
  return [conflicto, setConflicto] as const
}
