'use client'

import type { SeccionDeDiseno } from '../../../entities/diseno'
import { seccionAdmiteNivel, type NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import { CamposDeLaSeccion } from './campos-de-la-seccion'
import { CeldaEditable } from './celda-editable'

type Props = {
  seccion: SeccionDeDiseno
  nodos: NodosPorId
  etiquetas: ReadonlyMap<string, string>
  niveles: readonly NivelDelDiseno[]
  ocupado: boolean
  alPonerSeccion: (cambios: {
    titulo?: string
    presentacion?: SeccionDeDiseno['presentacion']
  }) => void
  alPonerAncho: (nodo: string, ancho: 'completo' | 'mitad' | 'tercio') => void
  alPonerNiveles: (nodo: string | undefined, cambios: CambioDeNiveles) => void
}

const nombreDe = (etiquetas: ReadonlyMap<string, string>, nodo: string) =>
  etiquetas.get(nodo) ?? nodo

// Lo que la sección dibuja sin campos: atajos, variante, interruptor y subtotal se editan en la parte siguiente del editor (4.22-3).
function textoDeLaLinea(
  item: SeccionDeDiseno['items'][number],
  etiquetas: ReadonlyMap<string, string>,
) {
  switch (item.tipo) {
    case 'atajos':
      return `Atajos de ${nombreDe(etiquetas, item.nodo)}`
    case 'variante':
      return `Variante ${nombreDe(etiquetas, item.nodo)}`
    case 'interruptor':
      return `Interruptor ${nombreDe(etiquetas, item.nodo)}`
    case 'subtotal':
      return `Subtotal ${nombreDe(etiquetas, item.nodo)}`
    case 'celda':
      return nombreDe(etiquetas, item.nodo)
  }
}

// Una sección: su título, dónde va, quién la ve y quién la edita, y sus ítems (las celdas con campos; lo demás, una línea de sólo lectura).
export function SeccionEditable({
  seccion,
  nodos,
  etiquetas,
  niveles,
  ocupado,
  alPonerSeccion,
  alPonerAncho,
  alPonerNiveles,
}: Props) {
  return (
    <li
      className="@container min-w-0 rounded-(--radius-lg) border border-(--color-line-strong) p-3"
      data-seccion={seccion.id}
    >
      <CamposDeLaSeccion
        seccion={seccion}
        niveles={niveles}
        admite={seccionAdmiteNivel(seccion, nodos)}
        ocupado={ocupado}
        alPonerSeccion={alPonerSeccion}
        alPonerNiveles={(cambios) => {
          alPonerNiveles(undefined, cambios)
        }}
      />
      <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
        {seccion.items.map((item, i) =>
          item.tipo === 'celda' ? (
            <CeldaEditable
              key={`${item.tipo}:${item.nodo}`}
              seccion={seccion}
              celda={item}
              etiqueta={nombreDe(etiquetas, item.nodo)}
              nodos={nodos}
              niveles={niveles}
              ocupado={ocupado}
              alPonerAncho={(ancho) => {
                alPonerAncho(item.nodo, ancho)
              }}
              alPonerNiveles={(cambios) => {
                alPonerNiveles(item.nodo, cambios)
              }}
            />
          ) : (
            <li
              key={`${item.tipo}:${item.nodo}:${String(i)}`}
              className="min-w-0 px-3 text-(length:--text-sm) text-(--color-ink-soft)"
            >
              {textoDeLaLinea(item, etiquetas)}
            </li>
          ),
        )}
      </ul>
    </li>
  )
}
