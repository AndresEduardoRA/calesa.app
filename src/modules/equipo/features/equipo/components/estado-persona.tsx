'use client'

import { Badge } from '@/shared/ui/badge'
import { ETIQUETA_ESTADO, type EstadoPersona } from '../../../entities/persona'

const VARIANTE = {
  activa: 'secondary',
  invitacion_pendiente: 'outline',
  bloqueada: 'destructive',
  baja: 'outline',
} as const satisfies Record<EstadoPersona, 'secondary' | 'outline' | 'destructive'>

type Props = { estado: EstadoPersona; motivoDeBloqueo?: string | null }

// El estado de una persona, dicho con texto (el color sólo acompaña).
export function EstadoDePersona({ estado, motivoDeBloqueo }: Props) {
  return (
    <Badge variant={VARIANTE[estado]} title={motivoDeBloqueo ?? undefined}>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  )
}
