'use client'

import { Badge } from '@/shared/ui/badge'
import {
  AVISO_DE_BAJA_EN_CURSO,
  ETIQUETA_ESTADO,
  type EstadoPersona,
} from '../../../entities/persona'

const VARIANTE = {
  activa: 'secondary',
  invitacion_pendiente: 'outline',
  bloqueada: 'destructive',
  baja: 'outline',
} as const satisfies Record<EstadoPersona, 'secondary' | 'outline' | 'destructive'>

type Props = { estado: EstadoPersona; motivoDeBloqueo?: string | null; bajaEnCurso?: boolean }

// El estado de una persona, dicho con texto (el color sólo acompaña).
// Una baja en curso (sus leads se están pasando por lotes) lo dice debajo, en texto.
export function EstadoDePersona({ estado, motivoDeBloqueo, bajaEnCurso = false }: Props) {
  const insignia = (
    <Badge variant={VARIANTE[estado]} title={motivoDeBloqueo ?? undefined}>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  )
  if (!bajaEnCurso) {
    return insignia
  }
  return (
    <span className="grid justify-items-start gap-1">
      {insignia}
      <span className="text-(length:--text-xs) text-(--color-ink-soft)">
        {AVISO_DE_BAJA_EN_CURSO}…
      </span>
    </span>
  )
}
