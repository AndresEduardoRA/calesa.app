'use client'

import { Badge } from '@/shared/ui/badge'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { chipsDeLaFila } from '../../../entities/transiciones/vista-de-salidas'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El hueco `salidasDeFila` (5.06): las salidas de la fase como chips junto a su nombre («→ Embarcado · Embarcar»). Texto y el color de la fase destino, nunca
// sólo color; un chip no es un enlace (el clic en la fila abre el inspector). Con más de tres, «+N más»: la lista completa está en el inspector.
export function SalidasDeLaFila({ flujo, fase }: Props) {
  const { chips, resto } = chipsDeLaFila(flujo, fase)
  if (chips.length === 0) {
    return null
  }
  return (
    <ul aria-label="Salidas" className="flex min-w-0 flex-wrap items-center gap-1">
      {chips.map((chip) => (
        <li key={chip.id} className="max-w-full min-w-0">
          <Badge variant="outline" className="max-w-full gap-1.5">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: chip.color }}
            />
            <span className="truncate">{chip.texto}</span>
            {chip.jubilada ? <span className="text-(--color-ink-soft)">(jubilada)</span> : null}
          </Badge>
        </li>
      ))}
      {resto > 0 ? (
        <li>
          <Badge variant="secondary">+{resto} más</Badge>
        </li>
      ) : null}
    </ul>
  )
}
