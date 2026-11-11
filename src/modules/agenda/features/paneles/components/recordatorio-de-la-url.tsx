'use client'

import type { DetalleDeRecordatorio } from '../../../entities/recordatorio'
import { usePanelDeDetalle } from '../hooks/use-panel-de-detalle'
import { PanelDeRecordatorioDiferido } from './diferidos'

export type RecordatorioPedido = {
  // `?recordatorio=<id>` ya validado; el detalle es nulo si no existe, está eliminado o no es de quien mira.
  id: string
  detalle: DetalleDeRecordatorio | null
}

type Props = {
  recordatorio: RecordatorioPedido | null
  zona: string
  // El instante en que se pidió la página, ISO: lo que decide «Vencido».
  ahora: string
}

// Lo que la URL pide de un recordatorio: su panel (`?recordatorio=<id>`).
export function RecordatorioDeLaUrl({ recordatorio, zona, ahora }: Props) {
  const detalle = usePanelDeDetalle()
  if (!recordatorio) {
    return null
  }
  return (
    <PanelDeRecordatorioDiferido
      recordatorio={recordatorio.detalle}
      zona={zona}
      ahora={ahora}
      alCerrar={detalle.cerrar}
    />
  )
}
