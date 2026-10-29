'use client'

import { useMemo } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import { ordenDeLaHoja } from '../../../entities/presentacion-de-la-hoja'
import { useAyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { AvanzadoDeLaHoja } from './avanzado-de-la-hoja'
import { LugarDeAyuda } from './lugar-de-ayuda'
import { SeccionDeHoja } from './seccion-de-hoja'

type Props = {
  // Las secciones que se dibujan, en el orden declarado.
  secciones: Seccion[]
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  guardando: boolean
}

// Las secciones principales en su orden, con «Avanzado» (el botón y su modal) donde estaba la primera avanzada, y la ayuda de texto de sus celdas: quien guarda en la URL cuál se
// abre es la hoja, y el callback que reciben las celdas es uno solo (la `XCell` está en `memo`).
export function LugaresDeLaHoja({ secciones, contexto, acciones: deLaHoja, guardando }: Props) {
  const { ayuda, alAyudar } = useAyudaDeLaHoja()
  const acciones = useMemo(() => ({ ...deLaHoja, alAyudar }), [deLaHoja, alAyudar])
  const lugares = ordenDeLaHoja(secciones)
  return (
    <>
      {lugares.map((lugar) =>
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
            ayuda={ayuda}
          />
        ),
      )}
      <LugarDeAyuda
        secciones={secciones.filter((s) => s.presentacion !== 'avanzado')}
        contexto={contexto}
        ayuda={ayuda}
      />
    </>
  )
}
