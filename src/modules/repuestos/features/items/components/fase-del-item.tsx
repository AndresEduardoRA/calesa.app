import { Badge } from '@/shared/ui/badge'
import type { FaseDelItem } from '../../../entities/nucleo/item'

// La fase del ítem, de sólo lectura (8.09-2, C8: se mueve en 8.13): el nombre y un punto con su color (el de la fila de la base: ningún color fijo). El texto lleva el significado, nunca sólo el color.
export function FaseDelItemInsignia({ fase }: { fase: FaseDelItem | null }) {
  if (fase === null) {
    return <Badge variant="outline">Sin fase</Badge>
  }
  return (
    <Badge variant="outline">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: fase.color }} />
      {fase.nombre}
    </Badge>
  )
}
