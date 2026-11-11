'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import type { DetalleDeTarea } from '../../../entities/detalle'
import { ConfirmarEliminarTarea } from './confirmar-eliminar-tarea'
import { VistaDeTarea } from './detalle-de-tarea'

type Props = {
  // Nula: no existe, está eliminada o no se ve (el panel dice lo mismo en los tres casos).
  tarea: DetalleDeTarea | null
  zona: string
  puedeEditar: boolean
  alEditar: () => void
  alEliminar: () => void
  alCerrar: () => void
}

// El panel de una tarea (`?tarea=<id>`): su detalle, con «Editar» y «Eliminar» sólo para su creador (no se dibujan para el resto).
export function PanelDeTarea({ tarea, zona, puedeEditar, alEditar, alEliminar, alCerrar }: Props) {
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo="Tarea"
      pie={
        tarea && puedeEditar ? (
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 md:min-h-9" onClick={alEditar}>
              Editar
            </Button>
            <ConfirmarEliminarTarea tarea={tarea} alEliminar={alEliminar} />
          </div>
        ) : undefined
      }
    >
      {tarea ? (
        <VistaDeTarea tarea={tarea} zona={zona} />
      ) : (
        <EstadoVacio
          titulo="No encontramos esta tarea."
          descripcion="Pudo haberse eliminado o ya no la ves."
        />
      )}
    </Drawer>
  )
}
