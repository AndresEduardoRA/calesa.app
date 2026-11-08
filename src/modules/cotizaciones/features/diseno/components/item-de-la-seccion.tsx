'use client'

import type { SeccionDeDiseno } from '../../../entities/diseno'
import type { NodosPorId } from '../../../entities/diseno/admite-nivel'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'
import { columnasParaAtajos } from '../../../entities/diseno/edicion-de-items'
import type { CambioDeNiveles } from '../../../entities/diseno/niveles'
import type { EdicionesDelDiseno } from '../hooks/use-ediciones-del-diseno'
import { CeldaEditable } from './celda-editable'
import { ItemDeAtajos } from './item-de-atajos'
import { ItemDeInterruptor } from './item-de-interruptor'
import { ItemDeLectura } from './item-de-lectura'

type Props = {
  seccion: SeccionDeDiseno
  item: SeccionDeDiseno['items'][number]
  etiqueta: string
  nodos: NodosPorId
  niveles: readonly NivelDelDiseno[]
  tablas: readonly string[]
  ediciones: EdicionesDelDiseno
  ocupado: boolean
  alPonerAncho: (nodo: string, ancho: 'completo' | 'mitad' | 'tercio') => void
  alPonerNiveles: (nodo: string | undefined, cambios: CambioDeNiveles) => void
}

// Un ítem de la sección, según su tipo: la celda con su ancho, niveles y ayuda; los atajos y el interruptor con sus campos; la variante y el subtotal, de sólo
// lectura (no tienen más campo que su nodo).
export function ItemDeLaSeccion({
  seccion,
  item,
  etiqueta,
  nodos,
  niveles,
  tablas,
  ediciones,
  ocupado,
  alPonerAncho,
  alPonerNiveles,
}: Props) {
  switch (item.tipo) {
    case 'celda':
      return (
        <CeldaEditable
          seccion={seccion}
          celda={item}
          etiqueta={etiqueta}
          nodos={nodos}
          niveles={niveles}
          tablas={tablas}
          ocupado={ocupado}
          alPonerAncho={(ancho) => {
            alPonerAncho(item.nodo, ancho)
          }}
          alPonerNiveles={(cambios) => {
            alPonerNiveles(item.nodo, cambios)
          }}
          alPonerAyuda={(ayuda) => {
            ediciones.ponerAyuda(seccion.id, item.nodo, ayuda)
          }}
        />
      )
    case 'atajos':
      return (
        <ItemDeAtajos
          seccionId={seccion.id}
          item={item}
          etiqueta={etiqueta}
          columnas={columnasParaAtajos(nodos, item.nodo, item.columna)}
          ocupado={ocupado}
          alPonerAtajos={(cambios) => {
            ediciones.ponerAtajos(seccion.id, item.nodo, cambios)
          }}
        />
      )
    case 'interruptor':
      return (
        <ItemDeInterruptor
          seccionId={seccion.id}
          item={item}
          etiqueta={etiqueta}
          ocupado={ocupado}
          alPonerEfecto={(efecto) => {
            ediciones.ponerEfecto(seccion.id, item.nodo, efecto)
          }}
        />
      )
    case 'variante':
    case 'subtotal':
      return (
        <ItemDeLectura
          tipo={item.tipo}
          nodo={item.nodo}
          etiqueta={etiqueta}
          definicion={nodos.get(item.nodo)}
        />
      )
  }
}
