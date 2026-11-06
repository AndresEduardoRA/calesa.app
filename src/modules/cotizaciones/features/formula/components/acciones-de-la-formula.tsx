'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { noDisponibleAlPublicar } from '../../../entities/formula/publicacion'
import type { FormulaDelOrigen } from '../../../entities/formula/versiones'
import { useAperturaDeLaFormula } from '../hooks/use-apertura-de-la-formula'
import type { PanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { ModalDePublicarDiferido, ModalDeRevertirDiferido } from './diferidos'

type Props = {
  panel: PanelDeLaFormula
  origen: { id: string; nombre: string }
  formula: FormulaDelOrigen
}

// Los modales de la pestaña «Fórmula» (4.20-2b), montados al abrirse por primera vez y con una `key` por apertura. Lo que cambia con el modal de publicar abierto (tras
// «Recargar»: el borrador ya no está o quedó atrasado) lo dice el modal; el de revertir se queda con la versión que abrió y la publicada nueva.
export function AccionesDeLaFormula({ panel, origen, formula }: Props) {
  const { apertura, publicando, revirtiendo, aRevertir } = useAperturaDeLaFormula(panel, formula)
  const publicadaId = formula.publicada?.id ?? null
  const montarPublicar = useAbiertoAlgunaVez(publicando)
  const montarRevertir = useAbiertoAlgunaVez(revirtiendo)
  return (
    <>
      {montarPublicar ? (
        <ModalDePublicarDiferido
          key={apertura}
          abierto={publicando}
          alCerrar={panel.cerrar}
          origen={origen}
          publicadaId={publicadaId}
          noDisponible={noDisponibleAlPublicar(formula)}
        />
      ) : null}
      {montarRevertir && aRevertir && publicadaId ? (
        <ModalDeRevertirDiferido
          key={`${String(apertura)}:${aRevertir.id}`}
          abierto={revirtiendo}
          alCerrar={panel.cerrar}
          origenId={origen.id}
          version={aRevertir}
          publicadaId={publicadaId}
        />
      ) : null}
    </>
  )
}
