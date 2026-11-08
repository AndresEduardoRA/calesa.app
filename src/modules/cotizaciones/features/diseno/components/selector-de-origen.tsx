'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'

type Origen = { id: string; nombre: string; activo: boolean }

const etiquetaDe = (origen: Origen) =>
  origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`

// El origen del diseño: sólo con 2 o más; escribe `?origen=` y lo elegido se ve en el acto, mientras el servidor lee el origen nuevo.
export function SelectorDeOrigen({
  origenes,
  origen,
}: {
  origenes: readonly Origen[]
  origen: Origen
}) {
  const [pedido, setOrigen] = useQueryState('origen', parseAsString.withOptions({ shallow: false }))
  if (origenes.length < 2) return null
  const elegido = origenes.some((uno) => uno.id === pedido) ? pedido : origen.id
  return (
    <div className="max-w-xs">
      <CampoSeleccion
        nombre="origen-del-diseno"
        etiqueta="Origen"
        opciones={origenes.map((uno) => ({ valor: uno.id, etiqueta: etiquetaDe(uno) }))}
        value={elegido ?? origen.id}
        onChange={(evento) => {
          void setOrigen(evento.target.value)
        }}
      />
    </div>
  )
}
