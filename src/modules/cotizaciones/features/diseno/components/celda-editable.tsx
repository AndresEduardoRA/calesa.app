'use client'

import {
  ANCHOS,
  NIVEL_TODOS,
  type CeldaDeDiseno,
  type SeccionDeDiseno,
} from '../../../entities/diseno'
import { celdaAdmiteNivel, type NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { SelectorDeNivel } from './selector-de-nivel'

const ANCHO: Record<(typeof ANCHOS)[number], string> = {
  completo: 'Completo',
  mitad: 'Mitad',
  tercio: 'Un tercio',
}

export const SIN_NIVEL_EN_LA_CELDA = 'El total y lo que va aparte los ve todo el mundo.'

type Props = {
  seccion: SeccionDeDiseno
  celda: CeldaDeDiseno
  etiqueta: string
  nodos: NodosPorId
  niveles: readonly NivelDelDiseno[]
  ocupado: boolean
  alPonerAncho: (ancho: (typeof ANCHOS)[number]) => void
  alPonerNiveles: (cambios: CambioDeNiveles) => void
}

// Una celda de la sección: su etiqueta, el ancho y quién la ve y quién la edita. La celda gana a su sección: el nivel que rige es el propio y, sin él, el de la sección.
export function CeldaEditable({
  seccion,
  celda,
  etiqueta,
  nodos,
  niveles,
  ocupado,
  alPonerAncho,
  alPonerNiveles,
}: Props) {
  const base = `${seccion.id}__${celda.nodo}`
  const admite = celdaAdmiteNivel(celda, nodos)
  return (
    <li
      className="min-w-0 rounded-(--radius-md) border border-(--color-line) p-3"
      data-celda={celda.nodo}
    >
      <p className="mb-2 text-(length:--text-sm) font-medium text-(--color-ink)">{etiqueta}</p>
      <div className="grid min-w-0 gap-2 @md:grid-cols-3">
        <CampoSeleccion
          nombre={`${base}-ancho`}
          etiqueta="Ancho"
          opciones={ANCHOS.map((valor) => ({ valor, etiqueta: ANCHO[valor] }))}
          value={celda.ancho}
          disabled={ocupado}
          onChange={(evento) => {
            alPonerAncho(evento.target.value as (typeof ANCHOS)[number])
          }}
        />
        <SelectorDeNivel
          nombre={`${base}-ver`}
          etiqueta="Quién la ve"
          valor={celda.nivel_ver ?? seccion.nivel_ver ?? NIVEL_TODOS}
          niveles={niveles}
          apagado={admite ? null : SIN_NIVEL_EN_LA_CELDA}
          ocupado={ocupado}
          alCambiar={(ver) => {
            alPonerNiveles({ ver })
          }}
        />
        <SelectorDeNivel
          nombre={`${base}-editar`}
          etiqueta="Quién la edita"
          valor={celda.nivel_editar ?? seccion.nivel_editar ?? NIVEL_TODOS}
          niveles={niveles}
          apagado={null}
          ocupado={ocupado}
          alCambiar={(editar) => {
            alPonerNiveles({ editar })
          }}
        />
      </div>
    </li>
  )
}
