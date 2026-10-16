'use client'

import { useRegional } from '@/shared/ui/regional'
import type { TipoDeSeguimiento } from '../../../entities/alta'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { PaginaDeSeguimientos } from '../../../entities/seguimiento'
import { BloqueDeRecordatorios } from '../../recordatorios/components/bloque-de-recordatorios'
import { useRecordatorios } from '../../recordatorios/hooks/use-recordatorios'
import { useSeguimientos } from '../hooks/use-seguimientos'
import { LineaDeSeguimientos } from './linea-de-seguimientos'

type Props = {
  leadId: string
  inicial: PaginaDeSeguimientos
  tipos: readonly TipoDeSeguimiento[]
  recordatorios: readonly Recordatorio[]
}

// La sección «Seguimientos» de la ficha: la línea de tiempo y, al costado (arriba en el celular), «Tus
// recordatorios». Anotar, editar, agendar y editar un recordatorio son modales con su URL.
export function SeguimientosDelLead({ leadId, inicial, tipos, recordatorios }: Props) {
  const { zonaHoraria } = useRegional()
  const seguimientos = useSeguimientos(leadId, inicial)
  const deQuienMira = useRecordatorios(recordatorios)
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:order-2">
        <BloqueDeRecordatorios
          leadId={leadId}
          zona={zonaHoraria}
          recordatorios={deQuienMira}
          puedeAgendar={seguimientos.puedoAnotar}
        />
      </div>
      <div className="min-w-0 lg:order-1">
        <LineaDeSeguimientos
          leadId={leadId}
          tipos={tipos}
          zona={zonaHoraria}
          seguimientos={seguimientos}
          alAgendar={deQuienMira.poner}
        />
      </div>
    </div>
  )
}
