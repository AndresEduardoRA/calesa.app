'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAtajo } from '@/shared/ui/atajos'
import { usePanelesDeAlta } from '../../paneles/hooks/use-paneles-de-alta'

// «Nuevo evento» y «Nueva tarea»: abren su panel por URL. La tecla N abre «Nuevo evento» mientras la agenda esté a la vista.
export function BotonesDeAlta() {
  const alta = usePanelesDeAlta()
  useAtajo('nuevo', () => {
    alta.evento.abrir()
  })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        className="h-11 md:h-9"
        onClick={() => {
          alta.evento.abrir()
        }}
      >
        <PlusIcon aria-hidden />
        Nuevo evento
      </Button>
      <Button
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => {
          alta.tarea.abrir()
        }}
      >
        <PlusIcon aria-hidden />
        Nueva tarea
      </Button>
    </div>
  )
}
