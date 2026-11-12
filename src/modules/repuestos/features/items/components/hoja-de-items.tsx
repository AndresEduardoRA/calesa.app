'use client'

import { UnaSolaVista } from '@/shared/ui/lista'
import type { CatalogosDeLaHoja, MonedaDeLaHoja } from '../../../entities/items/hoja'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { AvisoDeCerrado, AvisoDeTopeDeLaHoja, HojaVacia } from './avisos-de-la-hoja'
import { TablaDeItems } from './tabla-de-items'
import { TarjetasDeItems } from './tarjetas-de-items'

export type PropsDeLaHoja = {
  proyectoId: string
  filas: readonly FilaDeItem[]
  hayMas: boolean
  catalogos: CatalogosDeLaHoja
  // Las monedas activas, en su orden: la primera es la por defecto (D52).
  monedas: readonly MonedaDeLaHoja[]
  // `puede(permisos, 'repuestos.editar')`, calculado en el servidor.
  puedeEditar: boolean
  cerrado: boolean
}

// La hoja de ítems de un proyecto (8.09-2, C8): la tabla desde 768 px y, debajo, una tarjeta por ítem, en una sola vista. Vacío de primera vez, el aviso del proyecto cerrado y el del tope
// de 200. No filtra ni pagina: hasta 200 filas (D54).
export function HojaDeItems(props: PropsDeLaHoja) {
  const { filas, hayMas, catalogos, cerrado } = props
  return (
    <section aria-label="Ítems del proyecto" className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {cerrado ? <AvisoDeCerrado /> : null}
      {filas.length === 0 ? (
        <HojaVacia />
      ) : (
        <UnaSolaVista
          tabla={() => <TablaDeItems filas={filas} catalogos={catalogos} />}
          tarjetas={() => <TarjetasDeItems filas={filas} catalogos={catalogos} />}
        />
      )}
      {hayMas ? <AvisoDeTopeDeLaHoja /> : null}
    </section>
  )
}
