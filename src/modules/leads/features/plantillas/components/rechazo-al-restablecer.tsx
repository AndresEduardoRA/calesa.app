'use client'

import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'

// Lo que la base rechazó al restablecer una plantilla, dentro de su diálogo: un conflicto con «Recargar», lo demás con su motivo.
export function RechazoAlRestablecer({
  rechazo,
  alRecargar,
}: {
  rechazo: ErrorApp | null
  alRecargar: () => void
}) {
  if (!rechazo) {
    return null
  }
  return rechazo.codigo === 'conflicto' ? (
    <AvisoDeConflicto
      mensaje={rechazo.mensaje}
      alRecargar={alRecargar}
      detalle="No se restableció nada. Recargar trae su versión."
    />
  ) : (
    <Aviso tono="peligro">
      <p>{rechazo.mensaje}</p>
    </Aviso>
  )
}
