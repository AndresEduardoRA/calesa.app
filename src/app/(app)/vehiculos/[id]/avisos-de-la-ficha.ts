import type { Permisos } from '@/modules/equipo'
import type { FaseResumen } from '@/modules/flujos'
import {
  alcanceDeAvisos,
  bloqueoParaEnviar,
  leadsVisiblesDe,
  papeleraDelVehiculo,
  vehiculoDelAviso,
  type Vehiculo,
} from '@/modules/vehiculos'

// Lo que la ficha sabe de «Enviar a la papelera» antes de intentarlo: si se ve apagada, con qué motivo y con qué acciones (quitar el vínculo, ver el
// lead, ver en logística…), y lo que el aviso ofrece si la base lo rechaza al intentar. Si el vehículo tiene lead y se puede enviar, el «Ver el
// lead» depende de que ese lead se abra (una pregunta a la base; sin lead, o sin `leads.ver`, ninguna).
export async function papeleraYAvisosDe(pedido: {
  sesion: { permisos: Permisos; usuarioId: string }
  vehiculo: Vehiculo
  origenId: string
  fase: FaseResumen | null
  editable: boolean
  eliminable: boolean
}) {
  const { sesion, vehiculo, origenId, fase, editable, eliminable } = pedido
  const leadsVisibles = await leadsVisiblesDe(
    sesion,
    [vehiculo],
    new Set(eliminable ? [vehiculo.id] : []),
  )
  const leadVisible = leadsVisibles.has(vehiculo.id)
  const alcance = alcanceDeAvisos(sesion.permisos, origenId)
  return {
    papelera: papeleraDelVehiculo({ eliminable, vehiculo, fase, editable, leadVisible, alcance }),
    avisos: { vehiculo: vehiculoDelAviso(vehiculo, { editable, leadVisible }), alcance },
    // Si, sin el vínculo, iría a la papelera: lo ofrece el aviso de desvinculado tras «Quitar el vínculo».
    ofrecerPapelera: eliminable && bloqueoParaEnviar({ ...vehiculo, leadId: null }, fase) === null,
  }
}
