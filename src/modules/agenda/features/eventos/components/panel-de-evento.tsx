'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import type { DetalleDeEvento as Detalle } from '../../../entities/detalle'
import { ConfirmarEliminarEvento } from './confirmar-eliminar-evento'
import { VistaDeEvento } from './detalle-de-evento'

type Props = {
  // Nulo: no existe, está eliminado o no se ve (el panel dice lo mismo en los tres casos).
  evento: Detalle | null
  zona: string
  puedeEditar: boolean
  alEditar: () => void
  alEliminar: () => void
  alCerrar: () => void
}

// El panel de un evento (`?evento=<id>`): su detalle, con «Editar» y «Eliminar» sólo para quien puede (no se dibujan para el resto). Editar cambia el cuerpo
// por el formulario (`PanelDeFormularioDeEvento`).
export function PanelDeEvento({
  evento,
  zona,
  puedeEditar,
  alEditar,
  alEliminar,
  alCerrar,
}: Props) {
  return (
    <Drawer
      abierto
      alCerrar={alCerrar}
      titulo="Evento"
      pie={
        evento && puedeEditar ? (
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11 md:min-h-9" onClick={alEditar}>
              Editar
            </Button>
            <ConfirmarEliminarEvento evento={evento} alEliminar={alEliminar} />
          </div>
        ) : undefined
      }
    >
      {evento ? (
        <VistaDeEvento evento={evento} zona={zona} />
      ) : (
        <EstadoVacio
          titulo="No encontramos este evento."
          descripcion="Pudo haberse eliminado o ya no lo ves."
        />
      )}
    </Drawer>
  )
}
