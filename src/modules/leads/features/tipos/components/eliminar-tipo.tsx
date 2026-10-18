'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { TipoDeLeadConUso } from '../../../entities/tipo-de-lead'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  tipo: TipoDeLeadConUso | null
  enCurso: boolean
  // Confirmado: elimina y dice si pudo (si no, el aviso ya salió).
  alEliminar: (tipo: TipoDeLeadConUso) => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el botón de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un tipo del lead (`?panel=eliminar-tipo&tipo=<id>`): lo irreversible pide confirmar nombrando el tipo. Sólo
// se llega con uno sin leads; si entre tanto llegó uno, la base lo rechaza, la lista lo muestra «Tiene leads» y el diálogo se cierra.
export function EliminarTipo({
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
      titulo={tipo ? `Eliminar el tipo «${tipo.nombre}»` : 'Eliminar el tipo'}
      descripcion="Ningún lead lo usa. Se elimina para siempre y no se puede deshacer."
      etiquetaConfirmar="Eliminar tipo"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
