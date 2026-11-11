'use client'

import type { DetalleDeTarea } from '../../../entities/detalle'
import { usePanelDeDetalle } from '../hooks/use-panel-de-detalle'
import { usePanelesDeAlta } from '../hooks/use-paneles-de-alta'
import { PanelDeFormularioDeTareaDiferido, PanelDeTareaDiferido } from './diferidos'

export type TareaPedida = {
  // `?tarea=<id>` ya validado; el detalle es nulo si no existe, está eliminada o no se ve.
  id: string
  detalle: DetalleDeTarea | null
  puedeEditar: boolean
  puedeCompletar: boolean
  puedeReasignar: boolean
}

type Props = {
  tarea: TareaPedida | null
  puedeAsignar: boolean
  zona: string
  hoy: string
  fecha: string
}

// Lo que la URL pide de una tarea: «Nueva tarea» (`?panel=nueva-tarea`), su detalle (`?tarea=<id>`) o su formulario de edición (`&editar=1`).
export function TareaDeLaUrl({ tarea, puedeAsignar, zona, hoy, fecha }: Props) {
  const alta = usePanelesDeAlta().tarea
  const detalle = usePanelDeDetalle()
  if (alta.abierto) {
    return (
      <PanelDeFormularioDeTareaDiferido
        tarea={null}
        fecha={fecha}
        hoy={hoy}
        zona={zona}
        puedeElegirResponsable={puedeAsignar}
        alCrear={detalle.abrirTarea}
        alGuardar={detalle.dejarDeEditar}
        alCancelar={alta.cerrar}
        alCerrar={alta.cerrar}
      />
    )
  }
  if (!tarea) {
    return null
  }
  if (detalle.editando && tarea.detalle && tarea.puedeEditar) {
    return (
      <PanelDeFormularioDeTareaDiferido
        key={tarea.detalle.actualizadoEn}
        tarea={tarea.detalle}
        fecha={fecha}
        hoy={hoy}
        zona={zona}
        puedeElegirResponsable={false}
        alCrear={detalle.cerrar}
        alGuardar={detalle.dejarDeEditar}
        alCancelar={detalle.dejarDeEditar}
        alCerrar={detalle.cerrar}
      />
    )
  }
  return (
    <PanelDeTareaDiferido
      tarea={tarea.detalle}
      zona={zona}
      puedeEditar={tarea.puedeEditar}
      puedeCompletar={tarea.puedeCompletar}
      puedeReasignar={tarea.puedeReasignar}
      alEditar={detalle.editar}
      alEliminar={detalle.cerrar}
      alCerrar={detalle.cerrar}
    />
  )
}
