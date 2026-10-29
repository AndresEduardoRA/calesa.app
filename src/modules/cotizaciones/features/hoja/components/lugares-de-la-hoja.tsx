'use client'

import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import { ordenDeLaHoja } from '../../../entities/presentacion-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { AvanzadoDeLaHoja } from './avanzado-de-la-hoja'
import { SeccionDeHoja } from './seccion-de-hoja'

type Props = {
  // Las secciones que se dibujan, en el orden declarado.
  secciones: Seccion[]
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  guardando: boolean
}

// Las secciones principales en su orden, con «Avanzado» (el botón y su modal) donde estaba la primera avanzada.
export function LugaresDeLaHoja({ secciones, contexto, acciones, guardando }: Props) {
  return ordenDeLaHoja(secciones).map((lugar) =>
    lugar.tipo === 'seccion' ? (
      <SeccionDeHoja
        key={lugar.seccion.id}
        seccion={lugar.seccion}
        contexto={contexto}
        acciones={acciones}
      />
    ) : (
      <AvanzadoDeLaHoja
        key="avanzado"
        secciones={lugar.secciones}
        contexto={contexto}
        acciones={acciones}
        guardando={guardando}
      />
    ),
  )
}
