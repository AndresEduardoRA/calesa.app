'use client'

import { Button } from '@/shared/ui/button'

// La lectura de «Revisar» falló: el motivo y «Reintentar». Si ya había algo leído, va bajo el resumen y lo leído se queda.
export function FalloDeRevisar({ alReintentar }: { alReintentar: () => void }) {
  return (
    <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>No pudimos revisar el flujo.</span>
      <Button variant="link" className="h-auto p-0" onClick={alReintentar}>
        Reintentar
      </Button>
    </p>
  )
}
