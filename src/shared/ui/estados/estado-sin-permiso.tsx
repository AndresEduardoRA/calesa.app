import { LockIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { MarcoEstado } from './marco-estado'

type Props = {
  titulo?: string
  descripcion?: string
  accion?: ReactNode
}

// La persona llegó por URL a algo que su rol no incluye. Lo que nunca va a usar ni siquiera se
// le muestra en el menú; esto es para cuando igual llega.
export function EstadoSinPermiso({ titulo, descripcion, accion }: Props) {
  return (
    <MarcoEstado
      Icono={LockIcon}
      titulo={titulo ?? 'No tienes permiso para ver esto'}
      descripcion={
        descripcion ?? 'Si lo necesitas para tu trabajo, avisa a quien administra el equipo.'
      }
      accion={accion}
    />
  )
}
