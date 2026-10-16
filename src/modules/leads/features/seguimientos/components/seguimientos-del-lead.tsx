'use client'

import { useState } from 'react'
import { useRegional } from '@/shared/ui/regional'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'
import { RecordatoriosDelLeadDiferido } from '../../recordatorios/components/diferidos'
import { useSeguimientos } from '../hooks/use-seguimientos'
import { LineaDeSeguimientos } from './linea-de-seguimientos'

type Props = {
  leadId: string
  inicial: PaginaDeSeguimientos
  tipos: readonly TipoDeSeguimiento[]
}

// La sección «Seguimientos» de la ficha: la línea de tiempo y, al costado (arriba en el celular), «Tus
// recordatorios», que se leen por páginas desde el navegador al abrir la sección (el mismo bloque que la
// pestaña del drawer, diferido: su código no viaja con el resto de la ficha). Anotar, editar, agendar y editar un recordatorio son modales con su URL.
export function SeguimientosDelLead({ leadId, inicial, tipos }: Props) {
  const { zonaHoraria } = useRegional()
  const seguimientos = useSeguimientos(leadId, inicial)
  // El próximo contacto que nace con un seguimiento: va a «Tus recordatorios».
  const [agendados, setAgendados] = useState<Recordatorio[]>([])
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:order-2">
        <RecordatoriosDelLeadDiferido leadId={leadId} zona={zonaHoraria} agendados={agendados} />
      </div>
      <div className="min-w-0 lg:order-1">
        <LineaDeSeguimientos
          leadId={leadId}
          tipos={tipos}
          zona={zonaHoraria}
          seguimientos={seguimientos}
          alAgendar={(recordatorio) => {
            setAgendados((antes) => [...antes, recordatorio])
          }}
        />
      </div>
    </div>
  )
}
