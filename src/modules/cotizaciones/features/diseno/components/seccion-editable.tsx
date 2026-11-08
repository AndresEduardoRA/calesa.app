'use client'

import type { SeccionDeDiseno } from '../../../entities/diseno'
import { seccionAdmiteNivel, type NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { CamposDeLaSeccion } from './campos-de-la-seccion'
import { ItemDeLaSeccion } from './item-de-la-seccion'

type Props = {
  seccion: SeccionDeDiseno
  nodos: NodosPorId
  etiquetas: ReadonlyMap<string, string>
  niveles: readonly NivelDelDiseno[]
  // Las tablas de referencia que nombra la fórmula, para la ayuda de una celda.
  tablas: readonly string[]
  ediciones: EdicionesDelDiseno
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

// Una sección: su título, dónde va, quién la ve y quién la edita, y sus ítems: las celdas con su ancho, niveles y ayuda; los atajos y el interruptor con los suyos;
// la variante y el subtotal, de sólo lectura (no tienen más campo que su nodo).
export function SeccionEditable({
  seccion,
  nodos,
  etiquetas,
  niveles,
  tablas,
  ediciones,
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
        {seccion.items.map((item) => (
          <ItemDeLaSeccion
            key={`${item.tipo}:${item.nodo}`}
            seccion={seccion}
            item={item}
            etiqueta={nombreDe(etiquetas, item.nodo)}
            nodos={nodos}
            niveles={niveles}
            tablas={tablas}
            ediciones={ediciones}
            ocupado={ocupado}
            alPonerAncho={alPonerAncho}
            alPonerNiveles={alPonerNiveles}
          />
        ))}
      </ul>
    </li>
  )
}
