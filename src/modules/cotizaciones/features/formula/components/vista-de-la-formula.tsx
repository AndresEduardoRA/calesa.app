'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { FormulaDelOrigen as Formula } from '../../../entities/formula/versiones'
import type { PanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { ListaDeVersiones } from './lista-de-versiones'
import { TarjetaDeLaPublicada } from './tarjeta-de-la-publicada'
import { TarjetaDelBorrador } from './tarjeta-del-borrador'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Los orígenes donde quien mira configura la fórmula (al menos uno), en el orden del catálogo.
  origenes: readonly Origen[]
  origen: Origen
  formula: Formula
  panel: PanelDeLaFormula
}

const etiquetaDe = (origen: Origen) =>
  origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`

// Lo que la pestaña «Fórmula» muestra cuando no edita (4.20-2a): el origen (con más de uno, un selector que escribe `?origen=`), su publicada, su borrador y sus
// versiones. «Editar» (el borrador) y «Editar en un borrador» (la publicada, si no hay borrador) abren el editor (4.21-3a-1).
export function VistaDeLaFormula({ origenes, origen, formula, panel }: Props) {
  const [pedido, setOrigen] = useQueryState('origen', parseAsString.withOptions({ shallow: false }))
  // Lo elegido se ve en el acto, mientras el servidor lee el origen nuevo.
  const elegido = origenes.some((uno) => uno.id === pedido) ? pedido : origen.id
  return (
    <>
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
      <TarjetaDeLaPublicada
        publicada={formula.publicada}
        origen={origen.nombre}
        {...(formula.borrador ? {} : { alEditar: panel.abrirEditor })}
      />
      {formula.borrador ? (
        <TarjetaDelBorrador
          borrador={formula.borrador}
          publicada={formula.publicada}
          alPublicar={panel.abrirPublicar}
          alDescartar={panel.abrirDescartar}
          alEditar={panel.abrirEditor}
        />
      ) : null}
      {/* Con otra publicada (se publicó o se revirtió) la lista vuelve a la primera página del servidor. */}
      <ListaDeVersiones
        key={`${origen.id}:${formula.publicada?.id ?? ''}`}
        origenId={origen.id}
        inicial={formula.versiones}
        conPublicada={formula.publicada !== null}
        alRevertir={panel.abrirRevertir}
      />
    </>
  )
}
