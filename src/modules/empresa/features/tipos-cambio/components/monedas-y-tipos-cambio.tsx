'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { Aviso } from '@/shared/ui/aviso'
import { MOTIVO_SIN_PERMISO_TIPOS_CAMBIO } from '../../../entities/motivos'
import type { CambioDeValor, Moneda, TipoCambio } from '../../../entities/tipos-cambio'
import { useTiposCambio } from '../hooks/use-tipos-cambio'
import { ListaMonedas } from './lista-monedas'
import { ListaTiposCambio } from './lista-tipos-cambio'
import { PanelMoneda } from './panel-moneda'
import { PanelNuevoTipoCambio } from './panel-nuevo-tipo-cambio'
import { PanelTipoCambio } from './panel-tipo-cambio'

type Props = {
  // Todos, también los inactivos.
  tipos: readonly TipoCambio[]
  monedas: readonly Moneda[]
  monedaBase: string
  // El historial del tipo de cambio de `?tc=`, ya leído en el servidor. null si no hay panel
  // abierto o si quien mira no puede verlo.
  historial: readonly CambioDeValor[] | null
  puedeGestionar: boolean
}

const PANEL_TIPO = 'nuevo-tipo-cambio'
const PANEL_MONEDA = 'nueva-moneda'

// La pestaña «Monedas»: tipos de cambio con su valor vigente y su historial, y las monedas. Cada
// panel tiene su URL (`?tc=`, `?moneda=`, `?panel=`).
export function MonedasYTiposCambio(props: Props) {
  const { tipos, monedas, monedaBase, historial, puedeGestionar } = props
  const [{ tc, moneda, panel }, setParametros] = useQueryStates(
    { tc: parseAsString, moneda: parseAsString, panel: parseAsString },
    { shallow: false },
  )
  const ediciones = useTiposCambio()
  const cerrar = () => void setParametros({ tc: null, moneda: null, panel: null })
  const activas = monedas.filter((una) => una.activa)
  const monedaAbierta =
    panel === PANEL_MONEDA ? 'nueva' : (monedas.find((una) => una.codigo === moneda) ?? null)

  return (
    <div className="grid gap-6">
      {puedeGestionar ? null : <Aviso>{MOTIVO_SIN_PERMISO_TIPOS_CAMBIO}</Aviso>}
      <ListaTiposCambio
        tipos={tipos}
        puedeGestionar={puedeGestionar}
        alAbrir={(id) => void setParametros({ tc: id, moneda: null, panel: null })}
        alCrear={() => void setParametros({ tc: null, moneda: null, panel: PANEL_TIPO })}
      />
      <ListaMonedas
        monedas={monedas}
        monedaBase={monedaBase}
        puedeGestionar={puedeGestionar}
        alAbrir={(codigo) => void setParametros({ tc: null, moneda: codigo, panel: null })}
        alCrear={() => void setParametros({ tc: null, moneda: null, panel: PANEL_MONEDA })}
      />
      <PanelTipoCambio
        tipo={tipos.find((tipo) => tipo.id === tc) ?? null}
        historial={puedeGestionar ? (historial ?? []) : null}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
      <PanelNuevoTipoCambio
        abierto={panel === PANEL_TIPO && puedeGestionar}
        monedas={activas}
        monedaBase={monedaBase}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
      <PanelMoneda
        moneda={monedaAbierta === 'nueva' && !puedeGestionar ? null : monedaAbierta}
        monedaBase={monedaBase}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={cerrar}
      />
    </div>
  )
}
