'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useModalDeMovida, type OportunidadAMover } from '../hooks/use-modal-de-movida'
import type { PanelDeMovida } from '../hooks/use-panel-de-movida'
import { ModalDeMovidaDiferido } from './diferidos'

type Props = {
  panel: PanelDeMovida
  // La oportunidad de una id, entre las que se ven (nula si no está).
  buscar: (id: string) => OportunidadAMover | null
  // Mueve la oportunidad `oportunidadId` a `etapaId` con el motivo; `true` si se movió.
  alMover: (oportunidadId: string, etapaId: string, motivo: string | null) => Promise<boolean>
}

// Quien tiene las oportunidades (el kanban, la sección de la ficha) monta esto una vez: el modal de «Mover a …» una
// etapa perdida, que vive en la URL. El foco vuelve al botón «Mover a…» de la oportunidad que se movió.
export function MovidaConMotivo({ panel, buscar, alMover }: Props) {
  const modal = useModalDeMovida(panel, buscar)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const { oportunidad, destino } = modal
  if (!montar || !oportunidad || !destino) {
    return null
  }
  return (
    <ModalDeMovidaDiferido
      key={modal.apertura}
      abierto={modal.abierto}
      alCerrar={modal.alCerrar}
      etapa={destino.nombre}
      titulo={oportunidad.titulo}
      alMover={(motivo) => alMover(oportunidad.id, destino.id, motivo)}
      noDisponible={modal.noDisponible}
      focoAlCerrar={() =>
        document.querySelector<HTMLElement>(`[data-mover-a="${oportunidad.id}"]`) ?? true
      }
    />
  )
}
