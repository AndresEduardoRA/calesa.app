'use client'

import { Button } from '@/shared/ui/button'
import type { Objetivo } from '../hooks/use-papelera'

type Props = {
  objetivo: Objetivo
  etiquetas: { restaurar: string; purgar: string }
  // El título de la cotización cuando los botones son de una sola (para el lector de pantalla).
  sobre?: string
  puedeRestaurar: boolean
  puedePurgar: boolean
  apagado: boolean
  alRestaurar: (objetivo: Objetivo) => void
  alPurgar: (objetivo: Objetivo) => void
}

export const DEL_LOTE = { restaurar: 'Restaurar el lote', purgar: 'Purgar el lote' }
export const DE_UNA = { restaurar: 'Restaurar', purgar: 'Purgar' }

const BOTON = 'h-11 md:h-8'

// Lo que se puede hacer con un lote o con una de sus cotizaciones: restaurar (quien lo envió o quien puede vaciar la papelera) y, sólo con la clave de
// vaciarla, purgar, que pide confirmar. La destructiva va al final.
export function AccionesDePapelera(props: Props) {
  const { objetivo, etiquetas, sobre, apagado } = props
  if (!props.puedeRestaurar && !props.puedePurgar) {
    return null
  }
  return (
    <div className="flex flex-wrap gap-2">
      {props.puedeRestaurar ? (
        <Button
          variant="outline"
          className={BOTON}
          disabled={apagado}
          aria-label={sobre ? `Restaurar ${sobre}` : undefined}
          onClick={() => {
            props.alRestaurar(objetivo)
          }}
        >
          {etiquetas.restaurar}
        </Button>
      ) : null}
      {props.puedePurgar ? (
        <Button
          variant="destructive"
          className={BOTON}
          disabled={apagado}
          aria-label={sobre ? `Purgar ${sobre}` : undefined}
          onClick={() => {
            props.alPurgar(objetivo)
          }}
        >
          {etiquetas.purgar}
        </Button>
      ) : null}
    </div>
  )
}
