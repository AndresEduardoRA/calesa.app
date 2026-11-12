'use client'

import { BellIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { FiltroDeLista } from '../../../entities/notificacion'

// Sin avisos: por primera vez («No tienes notificaciones») o, en «Por accionar», nada pide acción y se ofrece ver todas.
export function VacioDeLaLista({
  ver,
  alVerTodas,
}: {
  ver: FiltroDeLista
  alVerTodas: () => void
}) {
  if (ver === 'por-accionar') {
    return (
      <EstadoVacio
        Icono={BellIcon}
        titulo="Nada pide tu acción"
        descripcion="Cuando algo la pida, aparece acá."
        accion={
          <Button variant="outline" className="h-11 md:h-9" onClick={alVerTodas}>
            Ver todas
          </Button>
        }
      />
    )
  }
  return (
    <EstadoVacio
      Icono={BellIcon}
      titulo="No tienes notificaciones"
      descripcion="Los avisos de tus tareas, tus recordatorios y tu cartera aparecen acá."
    />
  )
}
