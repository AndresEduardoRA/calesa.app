'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { etiquetaDelOrigen } from '../../../entities/plantilla/origenes-de-la-tarjeta'

type Origen = { id: string; nombre: string; activo: boolean }

// El origen de la pestaña «Tarjeta»: con más de uno, un selector que escribe `?origen=` y vuelve a leer en el servidor. Lo elegido se ve en el acto, mientras el
// servidor lee el origen nuevo.
export function SelectorDeOrigen({
  origenes,
  origenId,
}: {
  origenes: readonly Origen[]
  origenId: string
}) {
  const [pedido, setOrigen] = useQueryState('origen', parseAsString.withOptions({ shallow: false }))
  const elegido = origenes.some((uno) => uno.id === pedido) ? pedido : origenId
  if (origenes.length < 2) return null
  return (
    <div className="max-w-xs">
      <CampoSeleccion
        nombre="origen-de-la-tarjeta"
        etiqueta="Origen"
        opciones={origenes.map((uno) => ({ valor: uno.id, etiqueta: etiquetaDelOrigen(uno) }))}
        value={elegido ?? origenId}
        onChange={(evento) => {
          void setOrigen(evento.target.value)
        }}
      />
    </div>
  )
}
