'use client'

import { createContext, useContext } from 'react'

export type ContextoDelFlujo = {
  flujoId: string
  // `flujos.actualizado_en` tal cual se leyó: la que cada acción manda de vuelta (D1).
  version: string
  // El aviso de conflicto de ahora, o null.
  conflicto: string | null
  // Una acción que chocó (`PT409`) lo llama con el mensaje de la base; sin mensaje, el de siempre.
  avisarConflicto: (mensaje?: string) => void
  // Trae la versión nueva (`router.refresh()`).
  recargar: () => void
  recargando: boolean
}

export const ContextoDelFlujoAbierto = createContext<ContextoDelFlujo | null>(null)

// La versión del flujo abierto y cómo avisar que otra persona lo cambió. Es lo que llaman las acciones de configuración (5.04 y siguientes) para mandar
// la `version` y, ante `PT409`, `avisarConflicto(mensaje)`. Sólo vive dentro de `<ProveedorDelFlujo>`.
export function useVersionDelFlujo(): ContextoDelFlujo {
  const contexto = useContext(ContextoDelFlujoAbierto)
  if (!contexto) {
    throw new Error('useVersionDelFlujo() sólo se usa dentro de <ProveedorDelFlujo>.')
  }
  return contexto
}
