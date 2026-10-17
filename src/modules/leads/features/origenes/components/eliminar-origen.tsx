'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { OrigenDeLeadConUso } from '../../../entities/origen-de-lead'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  origen: OrigenDeLeadConUso | null
  enCurso: boolean
  // Confirmado: elimina y dice si pudo (si no, el aviso ya salió).
  alEliminar: (origen: OrigenDeLeadConUso) => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el botón de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un origen del lead (`?panel=eliminar-origen&origen=<id>`): lo irreversible pide confirmar nombrando el origen. Sólo
// se llega con uno sin leads; si entre tanto llegó uno, la base lo rechaza, la lista lo muestra «Tiene leads» y el diálogo se cierra.
export function EliminarOrigen({
  abierto,
  alCerrar,
  origen,
  enCurso,
  alEliminar,
  focoAlCerrar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (origen) {
          await alEliminar(origen)
        }
        alCerrar()
      }}
      titulo={origen ? `Eliminar el origen «${origen.nombre}»` : 'Eliminar el origen'}
      descripcion="Ningún lead lo usa. Se elimina para siempre y no se puede deshacer."
      etiquetaConfirmar="Eliminar origen"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
