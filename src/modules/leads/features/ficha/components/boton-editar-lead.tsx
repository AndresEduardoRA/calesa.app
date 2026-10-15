'use client'

import { PencilIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'

// «Editar» en la cabecera de la ficha. Sólo se dibuja para quien puede editar este lead.
export function BotonEditarLead() {
  const panel = usePanelDeLead()
  return (
    <Button variant="outline" className="h-11 md:h-9" onClick={panel.abrir}>
      <PencilIcon aria-hidden />
      Editar
    </Button>
  )
}
