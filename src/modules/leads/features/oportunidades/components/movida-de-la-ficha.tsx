'use client'

import type { Embudo } from '../../../entities/embudo'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import type { PanelDeMovida } from '../hooks/use-panel-de-movida'
import type { EtapaGuardada } from '../../../entities/embudo'
import { MovidaConMotivo } from './movida-con-motivo'

type Props = {
  // Sólo quien puede editar mueve oportunidades (la base lo vuelve a decidir).
  activa: boolean
  panel: PanelDeMovida
  lista: readonly OportunidadDelLead[]
  embudos: readonly Embudo[]
  moverA: (o: OportunidadDelLead, etapa: EtapaGuardada, motivo: string | null) => Promise<boolean>
}

// El modal del motivo en la sección «Oportunidades» de la ficha: las oportunidades son las de la lista y sus etapas, las de su
// embudo.
export function MovidaDeLaFicha({ activa, panel, lista, embudos, moverA }: Props) {
  const etapasDe = (o: OportunidadDelLead) => embudos.find((e) => e.id === o.embudoId)?.etapas ?? []
  if (!activa) {
    return null
  }
  return (
    <MovidaConMotivo
      panel={panel}
      buscar={(id) => {
        const o = lista.find((x) => x.id === id)
        return o ? { id: o.id, titulo: o.titulo, etapaId: o.etapaId, etapas: etapasDe(o) } : null
      }}
      alMover={(id, etapaId, motivo) => {
        const o = lista.find((x) => x.id === id)
        const etapa = o ? etapasDe(o).find((e) => e.id === etapaId) : undefined
        return o && etapa ? moverA(o, etapa, motivo) : Promise.resolve(false)
      }}
    />
  )
}
