'use client'

import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import type { ClienteDelPanel as Cliente } from '../../../entities/panel-para-cotizar'

type Props = {
  cliente: Cliente
  // El nombre de su tipo, del catálogo: como texto, no sólo color; nulo si ya no está.
  tipo: string | null
  seleccionado: boolean
  alElegir: (id: string) => void
}

// Un lead de la lista del panel: un botón que lo elige. El nombre se corta con «…»; debajo, su número y el nombre de su tipo.
export function ClienteDelPanel({ cliente, tipo, seleccionado, alElegir }: Props) {
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-current={seleccionado ? 'true' : undefined}
        onClick={() => {
          alElegir(cliente.id)
        }}
        className="grid min-h-11 w-full min-w-0 gap-0.5 rounded-(--radius-md) p-2 text-left hover:bg-(--color-surface-3) aria-[current=true]:bg-(--color-surface-3)"
      >
        <span className="truncate text-(length:--text-sm) font-medium text-(--color-ink)">
          {cliente.nombre}
        </span>
        <span className="flex min-w-0 flex-wrap gap-x-2 text-(length:--text-xs) text-(--color-ink-soft)">
          <NumeroDeLead numeros={cliente.numeros} />
          {tipo ? <span>{tipo}</span> : null}
          {seleccionado ? <span className="font-medium text-(--color-ink)">Elegido</span> : null}
        </span>
      </button>
    </li>
  )
}
