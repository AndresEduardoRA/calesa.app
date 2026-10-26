'use client'

import { bloqueoDeCelda, valorDeSubtotal, type ContextoDeHoja } from '../../../entities/binding'
import type { ItemDeHoja as Item } from '../../../entities/hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { AtajosDeHoja } from './atajos-de-hoja'
import { CeldaDeHoja } from './celda-de-hoja'
import { InterruptorDeHoja } from './interruptor-de-hoja'
import { SubtotalDeHoja } from './subtotal-de-hoja'
import { VarianteDeHoja } from './variante-de-hoja'

type Props = { item: Item; contexto: ContextoDeHoja; acciones: AccionesDeHoja }

// Cada ancho del diseño es un tramo de la grilla de 12 pistas de su sección: `mitad` desde 32 rem de la sección y `tercio` desde 48; por debajo, la fila entera. Los
// nombres completos van escritos: Tailwind no ve una clase armada con un trozo.
const ANCHO = {
  completo: 'col-span-12',
  mitad: 'col-span-12 @lg:col-span-6',
  tercio: 'col-span-12 @3xl:col-span-4',
} as const

function Atajos({ item, contexto, acciones }: Props & { item: Extract<Item, { tipo: 'atajos' }> }) {
  const celda = contexto.indice.lados.get(item.nodo)?.celda
  if (!celda) {
    return null
  }
  const { entradas } = contexto
  const posicion = entradas.atajos.get(item.nodo)
  // Sigue pulsado sólo mientras lo que vale es lo que ese chip puso.
  const chip = posicion === undefined ? undefined : item.chips[posicion]
  const vigente = chip !== undefined && entradas.overrides.get(item.nodo) === chip.valor
  return (
    <AtajosDeHoja
      item={item}
      etiquetaDeLaCelda={celda.etiqueta}
      bloqueada={bloqueoDeCelda(celda, contexto) !== undefined}
      pulsado={vigente ? (posicion ?? null) : null}
      alElegir={acciones.alElegirAtajo}
    />
  )
}

// Un ítem de una sección, con su `data-nodo` (lo que miran los e2e: el orden del DOM es el declarado).
export function ItemDeHoja({ item, contexto, acciones }: Props) {
  switch (item.tipo) {
    case 'celda':
      return (
        <div data-nodo={item.nodo} className={ANCHO[item.ancho]}>
          <CeldaDeHoja celda={item} contexto={contexto} acciones={acciones} />
        </div>
      )
    case 'atajos':
      return (
        <div data-atajos={item.nodo} className="col-span-12">
          <Atajos item={item} contexto={contexto} acciones={acciones} />
        </div>
      )
    case 'variante':
      return (
        <div data-nodo={item.nodo} className="col-span-12">
          <VarianteDeHoja
            item={item}
            elegida={contexto.entradas.variante ?? item.porDefecto}
            alElegir={acciones.alElegirVariante}
          />
        </div>
      )
    case 'interruptor':
      return (
        <div data-nodo={item.nodo} className="col-span-12">
          <InterruptorDeHoja
            item={item}
            encendido={contexto.entradas.banderas.has(item.nodo)}
            fueraDeVariante={contexto.respuesta?.estados.get(item.nodo) === 'fuera_de_variante'}
            alCambiar={acciones.alAlternarBandera}
          />
        </div>
      )
    case 'subtotal':
      return (
        <div data-nodo={item.nodo} className="col-span-12">
          <SubtotalDeHoja item={item} valor={valorDeSubtotal(item.nodo, contexto.respuesta)} />
        </div>
      )
    default: {
      const _: never = item
      return _
    }
  }
}
