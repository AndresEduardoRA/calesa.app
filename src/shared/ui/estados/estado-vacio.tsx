import { InboxIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MarcoEstado } from './marco-estado'

type Props = {
  titulo: string
  // Qué va a aparecer acá y qué lo hace aparecer.
  descripcion?: string
  // La acción que lo llena («Nuevo lead»), si la persona puede hacerla.
  accion?: ReactNode
  Icono?: LucideIcon
  compacto?: boolean
}

// Vacío por primera vez: todavía no hay nada cargado. Distinto del vacío por filtro.
export function EstadoVacio({ Icono = InboxIcon, ...resto }: Props) {
  return <MarcoEstado Icono={Icono} {...resto} />
}
