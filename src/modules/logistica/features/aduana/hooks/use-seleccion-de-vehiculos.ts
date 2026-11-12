'use client'

import { useState } from 'react'
import type { UnidadBuscada } from '../../../areas/aduana/composicion.client'

// Lo que se eligió en pantalla y aún no se guardó: los vehículos marcados para quitar y los que se sumaron con el buscador (6.09-2, D5).
export function useSeleccionDeVehiculos() {
  const [aQuitar, setAQuitar] = useState<string[]>([])
  const [aAgregar, setAAgregar] = useState<UnidadBuscada[]>([])
  return {
    aQuitar,
    aAgregar,
    limpiar: () => {
      setAQuitar([])
      setAAgregar([])
    },
    marcarParaQuitar: (id: string) => {
      setAQuitar((antes) => (antes.includes(id) ? antes : [...antes, id]))
    },
    deshacerQuitar: (id: string) => {
      setAQuitar((antes) => antes.filter((x) => x !== id))
    },
    sumar: (unidad: UnidadBuscada) => {
      setAAgregar((antes) => (antes.some((u) => u.id === unidad.id) ? antes : [...antes, unidad]))
    },
    noSumar: (id: string) => {
      setAAgregar((antes) => antes.filter((u) => u.id !== id))
    },
  }
}
