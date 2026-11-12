'use client'

import { Button } from '@/shared/ui/button'
import { abrirHueco, useHayHueco } from '../../nucleo/hooks/eventos-de-la-unidad'

// «Ir a Gastos»: abre el bloque donde se registra el tributo y le lleva el foco. Sólo se dibuja si el panel tiene ese hueco (sin permiso o con la regla apagada no existe).
export function AtajoDeGastos() {
  const hay = useHayHueco('gastos')
  if (!hay) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="min-h-11 md:min-h-7"
      onClick={() => {
        abrirHueco('gastos')
      }}
    >
      Ir a Gastos
    </Button>
  )
}
