'use client'

import { Button } from '@/shared/ui/button'

// «Elegir los de esta columna»: lo cargado y filtrado de la fase, hasta 200 (6.04-3).
export function BotonElegirLaColumna({ alElegir }: { alElegir: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      data-elegir-la-columna
      className="min-h-11 md:min-h-8"
      onClick={alElegir}
    >
      Elegir los de esta columna
    </Button>
  )
}
