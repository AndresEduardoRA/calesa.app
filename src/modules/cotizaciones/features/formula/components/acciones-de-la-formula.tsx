'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  motivoParaNoAbrirPublicar,
  noDisponibleAlPublicar,
} from '../../../entities/formula/publicacion'
import type { FormulaDelOrigen } from '../../../entities/formula/versiones'
import type { PanelDeLaFormula } from '../hooks/use-panel-de-la-formula'
import { ModalDePublicarDiferido } from './diferidos'

type Props = {
  panel: PanelDeLaFormula
  origen: { id: string; nombre: string }
  formula: FormulaDelOrigen
}

// Los modales de la pestaña «Fórmula» (4.20-2b), montados al abrirse por primera vez. La URL se revisa una vez, al llegar: lo que no se puede abrir (sin borrador, uno
// atrasado) no abre, se avisa y la URL se limpia. Lo que cambia con el modal abierto (tras «Recargar») lo dice el modal.
export function AccionesDeLaFormula({ panel, origen, formula }: Props) {
  const apertura = useApertura(panel.publicando)
  const rechazada = useRevisionAlAbrir(
    panel.publicando ? `${String(apertura)}:publicar` : null,
    panel.publicando ? motivoParaNoAbrirPublicar(formula) : null,
    panel.cerrar,
  )
  const abierto = panel.publicando && !rechazada
  const montar = useAbiertoAlgunaVez(abierto)
  return montar ? (
    <ModalDePublicarDiferido
      key={apertura}
      abierto={abierto}
      alCerrar={panel.cerrar}
      origen={origen}
      publicadaId={formula.publicada?.id ?? null}
      noDisponible={noDisponibleAlPublicar(formula)}
    />
  ) : null
}
