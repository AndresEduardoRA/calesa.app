'use client'

import { vehiculoDelAviso } from '../../../entities/avisos-de-vehiculo'
import { papeleraDelVehiculo } from '../../../entities/papelera-permiso'
import { MenuDeVehiculo } from '../../acciones/components/menu-de-vehiculo'
import { faseDe, type DatosDelOrigen, type FilaDeVehiculo, type ParaElMenuDeLaLista } from './tipos'

type Props = {
  vehiculo: FilaDeVehiculo
  fases: DatosDelOrigen['fases']
  para: ParaElMenuDeLaLista
}

// El «⋯» de una fila o una tarjeta del inventario: «Editar» (con permiso), «Publicar en la web…» (sin el permiso, no aparece) y, separada,
// «Enviar a la papelera» (apagada con su motivo si ya se sabe que no va).
export function MenuDeFila({ vehiculo, fases, para }: Props) {
  const editable = para.editables.has(vehiculo.id)
  const leadVisible = para.leadsVisibles.has(vehiculo.id)
  return (
    <MenuDeVehiculo
      vehiculo={vehiculo}
      editar={editable}
      publicar={para.publicar.estado === 'habilitado' ? para.publicar : null}
      papelera={papeleraDelVehiculo({
        eliminable: para.eliminables.has(vehiculo.id),
        vehiculo,
        fase: faseDe(fases, vehiculo.faseId),
        editable,
        leadVisible,
        alcance: para.alcance,
      })}
      avisos={{
        vehiculo: vehiculoDelAviso(vehiculo, { editable, leadVisible }),
        alcance: para.alcance,
      }}
    />
  )
}
