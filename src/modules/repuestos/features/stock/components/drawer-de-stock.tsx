'use client'

import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Drawer } from '@/shared/ui/drawer'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ApiDeLaHojaParaStock } from './panel-de-stock'
import { FormularioPasarAStock } from './formulario-pasar-a-stock'
import { HistorialDeStock } from './historial-de-stock'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Cada apertura empieza de cero (formulario vacío, historial leído de nuevo).
  apertura: number
  // El ítem vigente de la hoja (el último que se vio, mientras el panel se va).
  item: FilaDeItem | null
  // `repuestos.editar`; vale también con el proyecto cerrado (los sobrantes nacen al terminar, D3 de 8.10-1).
  puedeEditar: boolean
  cambiarFila: ApiDeLaHojaParaStock['cambiarFila']
  focoAlCerrar: () => HTMLElement | boolean
}

type PropsDelContenido = Pick<Props, 'item' | 'puedeEditar' | 'cambiarFila' | 'alCerrar'> & {
  item: FilaDeItem
}

function ContenidoDeItem({ item, puedeEditar, cambiarFila, alCerrar }: PropsDelContenido) {
  // Pasar a stock vuelve a leer el historial desde su primera página.
  const [revision, setRevision] = useState(0)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="text-(length:--text-sm) tabular-nums" aria-live="polite">
        En stock: {formatearNumero(item.stockCantidad)} de {formatearNumero(item.cantidad)}
      </p>
      {puedeEditar ? (
        <FormularioPasarAStock
          item={item}
          cambiarFila={cambiarFila}
          alCancelar={alCerrar}
          alPasar={() => {
            setRevision((n) => n + 1)
          }}
        />
      ) : (
        <Aviso tono="info">Sólo puedes ver los movimientos de este ítem.</Aviso>
      )}
      <HistorialDeStock itemId={item.id} revision={revision} />
    </div>
  )
}

// El stock de un ítem (`?panel=stock&item=<id>`, 8.10-2, C12): cuánto hay, «Pasar a stock» (cantidad y nota) con `repuestos.editar` y el historial de movimientos con
// «Ver más». Se queda montado cerrado y cada apertura remonta el contenido con su `key`. Tras pasar, el panel queda abierto (D8).
export function DrawerDeStock({ apertura, item, ...resto }: Props) {
  return (
    <Drawer
      abierto={resto.abierto}
      alCerrar={resto.alCerrar}
      titulo={item ? `Stock de «${item.descripcion}»` : 'Stock del ítem'}
      descripcion="Lo que sobró de este ítem y sus movimientos."
      focoAlCerrar={resto.focoAlCerrar}
    >
      {item ? (
        <ContenidoDeItem
          key={apertura}
          item={item}
          puedeEditar={resto.puedeEditar}
          cambiarFila={resto.cambiarFila}
          alCerrar={resto.alCerrar}
        />
      ) : null}
    </Drawer>
  )
}
