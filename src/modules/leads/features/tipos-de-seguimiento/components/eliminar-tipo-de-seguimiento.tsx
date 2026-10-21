'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { TipoDeSeguimientoConUso } from '../../../entities/tipo-de-seguimiento'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  tipo: TipoDeSeguimientoConUso | null
  enCurso: boolean
  // Confirmado: elimina y dice si pudo (si no, el aviso ya salió).
  alEliminar: (tipo: TipoDeSeguimientoConUso) => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el «⋯» de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un tipo de seguimiento (`?panel=eliminar-tipo-de-seguimiento&…=<id>`): lo irreversible pide confirmar nombrando el tipo. Sólo se llega con
// uno sin seguimientos; si entre tanto llegó uno, la base lo rechaza, la lista lo muestra «Tiene seguimientos» y el diálogo se cierra.
export function EliminarTipoDeSeguimiento({
  abierto,
  alCerrar,
  tipo,
  enCurso,
  alEliminar,
  focoAlCerrar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (tipo) {
          await alEliminar(tipo)
        }
        alCerrar()
      }}
      titulo={
        tipo
          ? `Eliminar el tipo de seguimiento «${tipo.nombre}»`
          : 'Eliminar el tipo de seguimiento'
      }
      descripcion="Ningún seguimiento lo usa. Se elimina para siempre y no se puede deshacer."
      etiquetaConfirmar="Eliminar tipo"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
