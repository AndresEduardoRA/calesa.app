'use client'

import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import type { DetalleDeTarea } from '../../../entities/detalle'
import { enlaceDePanel, type BaseDeEnlace } from '../../calendario/enlace-de-panel'
import { usePanelDeDetalle } from '../hooks/use-panel-de-detalle'
import { usePanelesDeAlta } from '../hooks/use-paneles-de-alta'
import { PanelDeFormularioDeTareaDiferido, PanelDeTareaDiferido } from './diferidos'

export type TareaPedida = {
  // `?tarea=<id>` ya validado; el detalle es nulo si no existe, está eliminada o no se ve.
  id: string
  detalle: DetalleDeTarea | null
  puedeEditar: boolean
}

type Props = {
  tarea: TareaPedida | null
  puedeAsignar: boolean
  zona: string
  hoy: string
  fecha: string
  base: BaseDeEnlace
}

// Lo que la URL pide de una tarea: «Nueva tarea» (`?panel=nueva-tarea`), su detalle (`?tarea=<id>`) o su formulario de edición (`&editar=1`).
export function TareaDeLaUrl({ tarea, puedeAsignar, zona, hoy, fecha, base }: Props) {
  const router = useRouter()
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
        alCrear={(id) => {
          router.replace(enlaceDePanel(base, 'tarea', id) as Route)
        }}
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
      alEditar={detalle.editar}
      alEliminar={detalle.cerrar}
      alCerrar={detalle.cerrar}
    />
  )
}
