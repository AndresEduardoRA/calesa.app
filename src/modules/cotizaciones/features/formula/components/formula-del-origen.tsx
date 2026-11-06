'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import { ListaDeVersiones } from './lista-de-versiones'
import { TarjetaDeLaPublicada } from './tarjeta-de-la-publicada'
import { TarjetaDelBorrador } from './tarjeta-del-borrador'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Los orígenes donde quien mira configura la fórmula (al menos uno), en el orden del catálogo.
  origenes: readonly Origen[]
  origen: Origen
  formula: Formula
}

const etiquetaDe = (origen: Origen) =>
  origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`

// La pestaña «Fórmula» de Configuración › Cotización (4.20-2a): el origen (con más de uno, un selector que escribe `?origen=`), su publicada, su borrador y sus versiones.
// De sólo lectura: publicar, descartar y revertir llegan en el 4.20-2b.
export function FormulaDelOrigen({ origenes, origen, formula }: Props) {
  const [pedido, setOrigen] = useQueryState('origen', parseAsString.withOptions({ shallow: false }))
  // Lo elegido se ve en el acto, mientras el servidor lee el origen nuevo.
  const elegido = origenes.some((uno) => uno.id === pedido) ? pedido : origen.id
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-0.5">
        <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">Fórmula</h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La versión con la que se cotiza en cada origen, su borrador y las versiones anteriores.
        </p>
      </div>
      {origenes.length > 1 ? (
        <div className="max-w-xs">
          <CampoSeleccion
            nombre="origen-de-la-formula"
            etiqueta="Origen"
            opciones={origenes.map((uno) => ({ valor: uno.id, etiqueta: etiquetaDe(uno) }))}
            value={elegido ?? origen.id}
            onChange={(evento) => {
              void setOrigen(evento.target.value)
            }}
          />
        </div>
      ) : null}
      <TarjetaDeLaPublicada publicada={formula.publicada} origen={origen.nombre} />
      {formula.borrador ? (
        <TarjetaDelBorrador borrador={formula.borrador} publicada={formula.publicada} />
      ) : null}
      <ListaDeVersiones key={origen.id} origenId={origen.id} inicial={formula.versiones} />
    </div>
  )
}
