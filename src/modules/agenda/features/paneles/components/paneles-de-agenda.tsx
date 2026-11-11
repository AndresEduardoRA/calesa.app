'use client'

import { EventoDeLaUrl, type EventoPedido } from './evento-de-la-url'
import { TareaDeLaUrl, type TareaPedida } from './tarea-de-la-url'

type Props = {
  // Lo que la página leyó de `?evento=` y `?tarea=` (nulo si la URL no pide ninguno).
  evento: EventoPedido | null
  tarea: TareaPedida | null
  // Lo que quien mira puede elegir en los formularios (la base lo vuelve a exigir).
  puedePublicar: boolean
  puedeAsignar: boolean
  zona: string
  hoy: string
  fecha: string
}

// Los paneles de la agenda: «Nuevo evento», «Nueva tarea» y el detalle o la edición de un evento o de una tarea, todos por URL. Se montan sólo cuando la URL
// pide uno, y su código viaja diferido.
export function PanelesDeAgenda({
  evento,
  tarea,
  puedePublicar,
  puedeAsignar,
  zona,
  hoy,
  fecha,
}: Props) {
  return (
    <>
      <EventoDeLaUrl
        evento={evento}
        puedePublicar={puedePublicar}
        zona={zona}
        hoy={hoy}
        fecha={fecha}
      />
      <TareaDeLaUrl tarea={tarea} puedeAsignar={puedeAsignar} zona={zona} hoy={hoy} fecha={fecha} />
    </>
  )
}
