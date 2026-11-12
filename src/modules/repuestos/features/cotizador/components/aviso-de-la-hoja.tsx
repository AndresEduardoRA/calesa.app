'use client'

import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'

// Lo que dijo la base al guardar la hoja editable (8.12-4, C12): un PT409 con «Recargar» (descarta lo local y trae la versión nueva); lo demás, el
// mensaje de la base. Lo escrito queda.
export function AvisoDeLaHoja({
  aviso,
  alRecargar,
}: {
  aviso: ErrorApp | null
  alRecargar: () => void
}) {
  if (aviso === null) return null
  if (aviso.codigo === 'conflicto')
    return <AvisoDeConflicto mensaje={aviso.mensaje} alRecargar={alRecargar} />
  return <Aviso tono="peligro">{aviso.mensaje}</Aviso>
}
