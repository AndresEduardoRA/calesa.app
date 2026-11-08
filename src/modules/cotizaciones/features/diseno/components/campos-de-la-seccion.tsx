'use client'

import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { NIVEL_TODOS, PRESENTACIONES, type SeccionDeDiseno } from '../../../entities/diseno'
import { MAXIMO_DEL_TITULO, type NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import { SelectorDeNivel } from './selector-de-nivel'

const DONDE: Record<(typeof PRESENTACIONES)[number], string> = {
  principal: 'Principal',
  avanzado: 'Avanzado',
}

export const SIN_NIVEL_EN_LA_SECCION = 'Esta sección tiene un ítem que ve todo el mundo.'

type Props = {
  seccion: SeccionDeDiseno
  niveles: readonly NivelDelDiseno[]
  // Falso si la sección tiene un ítem que ve todo el mundo: «Quién la ve» queda apagado.
  admite: boolean
  ocupado: boolean
  alPonerSeccion: (cambios: {
    titulo?: string
    presentacion?: SeccionDeDiseno['presentacion']
  }) => void
  alPonerNiveles: (cambios: CambioDeNiveles) => void
}

// Los campos de una sección: su título, dónde va, quién la ve y quién la edita.
export function CamposDeLaSeccion({
  seccion,
  niveles,
  admite,
  ocupado,
  alPonerSeccion,
  alPonerNiveles,
}: Props) {
  return (
    <div className="grid min-w-0 gap-2 @md:grid-cols-2">
      <Campo
        nombre={`${seccion.id}-titulo`}
        etiqueta="Título"
        maxLength={MAXIMO_DEL_TITULO}
        value={seccion.titulo ?? ''}
        disabled={ocupado}
        onChange={(evento) => {
          alPonerSeccion({ titulo: evento.target.value })
        }}
      />
      <CampoSeleccion
        nombre={`${seccion.id}-donde`}
        etiqueta="Dónde va"
        opciones={PRESENTACIONES.map((valor) => ({ valor, etiqueta: DONDE[valor] }))}
        value={seccion.presentacion}
        disabled={ocupado}
        onChange={(evento) => {
          alPonerSeccion({ presentacion: evento.target.value as SeccionDeDiseno['presentacion'] })
        }}
      />
      <SelectorDeNivel
        nombre={`${seccion.id}-ver`}
        etiqueta="Quién la ve"
        valor={seccion.nivel_ver ?? NIVEL_TODOS}
        niveles={niveles}
        apagado={admite ? null : SIN_NIVEL_EN_LA_SECCION}
        ocupado={ocupado}
        alCambiar={(ver) => {
          alPonerNiveles({ ver })
        }}
      />
      <SelectorDeNivel
        nombre={`${seccion.id}-editar`}
        etiqueta="Quién la edita"
        valor={seccion.nivel_editar ?? NIVEL_TODOS}
        niveles={niveles}
        apagado={null}
        ocupado={ocupado}
        alCambiar={(editar) => {
          alPonerNiveles({ editar })
        }}
      />
    </div>
  )
}
