'use client'

import { useRef, type ReactNode } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'
import type { AnchoDeLaVistaPrevia } from '../../../entities/diseno/anchos-de-la-vista-previa'

// El celular con el texto al doble: el hijo mide la mitad de 412 y lleva `zoom: 2`, así que ocupa 412 px en pantalla con todo (los `rem` de los cortes por contenedor también) al doble.
const MEDIDAS: Record<AnchoDeLaVistaPrevia, { width: number; zoom?: number }> = {
  '412': { width: 412 },
  '1280': { width: 1280 },
  '200': { width: 206, zoom: 2 },
}

type Props = { ancho: AnchoDeLaVistaPrevia; children: ReactNode }

// El marco de la vista previa (4.22-5): una caja que se desplaza de costado y un hijo de ancho propio fijo, de modo que lo de adentro es el mismo componente a ese ancho (los cortes
// `@4xl/hoja` y `@5xl` miran al hijo, no a la pantalla). La página no se ensancha. Sólo se ve: el hijo va `inert`, sin foco ni acciones.
export function MarcoDeLaVistaPrevia({ ancho, children }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(caja)
  return (
    <div className="relative max-w-full min-w-0">
      <div
        ref={caja}
        role="region"
        aria-label="Vista previa de la hoja"
        data-vista-previa=""
        data-ancho={ancho}
        tabIndex={0}
        className="max-w-full min-w-0 overflow-x-auto rounded-(--radius-card) border border-(--color-line) bg-(--color-paper)"
      >
        <div inert style={MEDIDAS[ancho]}>
          {children}
        </div>
      </div>
      <PistaDeDesborde {...desborde} />
    </div>
  )
}
