'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import { usePanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { AccionesDeLaFormula } from './acciones-de-la-formula'
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
// Desde el borrador se publica (4.20-2b, `?panel=publicar-formula`).
export function FormulaDelOrigen({ origenes, origen, formula }: Props) {
  const [pedido, setOrigen] = useQueryState('origen', parseAsString.withOptions({ shallow: false }))
  // Lo elegido se ve en el acto, mientras el servidor lee el origen nuevo.
  const elegido = origenes.some((uno) => uno.id === pedido) ? pedido : origen.id
  const panel = usePanelDeLaFormula()
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
        <TarjetaDelBorrador
          borrador={formula.borrador}
          publicada={formula.publicada}
          alPublicar={panel.abrirPublicar}
        />
      ) : null}
      {/* Con otra publicada (se publicó o se revirtió) la lista vuelve a la primera página del servidor. */}
      <ListaDeVersiones
        key={`${origen.id}:${formula.publicada?.id ?? ''}`}
        origenId={origen.id}
        inicial={formula.versiones}
      />
      <AccionesDeLaFormula panel={panel} origen={origen} formula={formula} />
    </div>
  )
}
