'use client'

import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import type { DetalleDeEvento } from '../../../entities/detalle'
import { enlaceDePanel, type BaseDeEnlace } from '../../calendario/enlace-de-panel'
import { usePanelDeDetalle } from '../hooks/use-panel-de-detalle'
import { usePanelesDeAlta } from '../hooks/use-paneles-de-alta'
import { PanelDeEventoDiferido, PanelDeFormularioDeEventoDiferido } from './diferidos'

export type EventoPedido = {
  // `?evento=<id>` ya validado; el detalle es nulo si no existe, está eliminado o no se ve.
  id: string
  detalle: DetalleDeEvento | null
  puedeEditar: boolean
}

type Props = {
  evento: EventoPedido | null
  puedePublicar: boolean
  zona: string
  hoy: string
  fecha: string
  base: BaseDeEnlace
}

// Lo que la URL pide de un evento: «Nuevo evento» (`?panel=nuevo-evento`), su detalle (`?evento=<id>`) o su formulario de edición (`&editar=1`).
export function EventoDeLaUrl({ evento, puedePublicar, zona, hoy, fecha, base }: Props) {
  const router = useRouter()
  const alta = usePanelesDeAlta().evento
  const detalle = usePanelDeDetalle()
  if (alta.abierto) {
    return (
      <PanelDeFormularioDeEventoDiferido
        evento={null}
        fecha={fecha}
        hoy={hoy}
        zona={zona}
        puedePublicar={puedePublicar}
        alCrear={(id) => {
          router.replace(enlaceDePanel(base, 'evento', id) as Route)
        }}
        alGuardar={detalle.dejarDeEditar}
        alCancelar={alta.cerrar}
        alCerrar={alta.cerrar}
      />
    )
  }
  if (!evento) {
    return null
  }
  if (detalle.editando && evento.detalle && evento.puedeEditar) {
    return (
      <PanelDeFormularioDeEventoDiferido
        key={evento.detalle.actualizadoEn}
        evento={evento.detalle}
        fecha={fecha}
        hoy={hoy}
        zona={zona}
        puedePublicar={puedePublicar}
        alCrear={detalle.cerrar}
        alGuardar={detalle.dejarDeEditar}
        alCancelar={detalle.dejarDeEditar}
        alCerrar={detalle.cerrar}
      />
    )
  }
  return (
    <PanelDeEventoDiferido
      evento={evento.detalle}
      zona={zona}
      puedeEditar={evento.puedeEditar}
      alEditar={detalle.editar}
      alEliminar={detalle.cerrar}
      alCerrar={detalle.cerrar}
    />
  )
}
