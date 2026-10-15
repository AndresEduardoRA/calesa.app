'use client'

import { Aviso } from '@/shared/ui/aviso'
import { avisoDelPortalAlTransferir } from '../../../entities/portal-mensaje'
import { useAccesoVigente } from '../hooks/use-acceso-del-cliente'

type Props = {
  leadId: string
  leadNombre: string
  // Sólo al transferir y para quien gestiona el acceso: si no, no lee nada.
  activo: boolean
  // A quién se lo pasa, en cuanto lo elige.
  destino: string | null
}

// En el panel de transferir: si el lead tiene el acceso al portal vigente, avisa que el acceso sigue y
// que el cliente verá a quien lo recibe como su asesor.
export function AvisoDelPortal({ leadId, leadNombre, activo, destino }: Props) {
  const vigente = useAccesoVigente(leadId, activo)
  return vigente ? (
    <Aviso tono="info">{avisoDelPortalAlTransferir(leadNombre, destino)}</Aviso>
  ) : null
}
