'use client'

import { motivoParaNoEnviar, permisoDePapelera } from '../../../entities/papelera'
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
  return (
    <MenuDeVehiculo
      vehiculo={vehiculo}
      editar={para.editables.has(vehiculo.id)}
      publicar={para.publicar.estado === 'habilitado' ? para.publicar : null}
      papelera={permisoDePapelera(
        para.eliminables.has(vehiculo.id),
        motivoParaNoEnviar(vehiculo, faseDe(fases, vehiculo.faseId)),
      )}
    />
  )
}
