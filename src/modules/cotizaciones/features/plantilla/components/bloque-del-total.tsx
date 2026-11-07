'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import { CampoConContador } from './campo-con-contador'

type Props = {
  total: Plantilla['total']
  deshabilitado: boolean
  motivoDe: (donde: string) => string | undefined
  alCambiar: (cambio: { etiqueta?: string; leyenda?: string }) => void
}

export function BloqueDelTotal({ total, deshabilitado, motivoDe, alCambiar }: Props) {
  const hayMotivo =
    motivoDe('total.etiqueta') !== undefined || motivoDe('total.leyenda') !== undefined
  return (
    <Bloque
      titulo="Total"
      descripcion="Cómo se llama el total y qué lo acompaña."
      forzarAbierto={hayMotivo}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <CampoConContador
          nombre="total-etiqueta"
          donde="total.etiqueta"
          etiqueta="Etiqueta del total"
          valor={total.etiqueta}
          tope={40}
          motivo={motivoDe('total.etiqueta')}
          deshabilitado={deshabilitado}
          alCambiar={(valor) => {
            alCambiar({ etiqueta: valor })
          }}
        />
        <CampoConContador
          nombre="total-leyenda"
          donde="total.leyenda"
          etiqueta="Leyenda del total"
          valor={total.leyenda ?? ''}
          tope={160}
          motivo={motivoDe('total.leyenda')}
          deshabilitado={deshabilitado}
          alCambiar={(valor) => {
            alCambiar({ leyenda: valor })
          }}
        />
      </div>
    </Bloque>
  )
}
