'use client'

import { Button } from '@/shared/ui/button'
import { textoDelAtajo } from '../../../entities/mover/textos'
import { abrirHueco, useHayHueco } from '../../nucleo/hooks/eventos-de-la-unidad'

// «Ir a Documentos»: abre el bloque donde se cumple la falta y le lleva el foco. Sólo se dibuja si el panel tiene ese hueco (sin permiso, con la regla apagada o con el área sin llenar no existe).
export function AtajoDeRequisito({ ancla }: { ancla: string }) {
  const hay = useHayHueco(ancla)
  if (!hay) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className="min-h-11 md:min-h-7"
      onClick={() => {
        abrirHueco(ancla)
      }}
    >
      {textoDelAtajo(ancla)}
    </Button>
  )
}
