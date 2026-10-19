'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'

type Props = {
  nombre: string
  abierto: boolean
  alCerrar: () => void
  children: ReactNode
}

// El panel de edición mientras no hay formulario: llega lo que necesita, no se pudo leer o el lead ya no se ve. Dice qué pasa en el lugar
// del formulario, con el mismo título y ancho que él (lo comparten la ficha y el resumen de la lista).
export function PanelSinFormulario({ nombre, abierto, alCerrar, children }: Props) {
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo={`Editar ${nombre}`} ancho="amplio">
      {children}
    </Drawer>
  )
}
