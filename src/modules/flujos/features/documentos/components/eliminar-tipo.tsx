'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { TipoDeDocumento } from '../../../entities/documentos/tipo-de-documento'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  tipo: TipoDeDocumento | null
  enCurso: boolean
  // Confirmado: elimina y dice si pudo (si no, el aviso ya salió).
  alEliminar: (tipo: TipoDeDocumento) => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el «⋯» de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un tipo de documento (`?panel=eliminar-tipo&tipo=<id>`): lo irreversible pide confirmar nombrando el tipo. Sólo se llega con uno sin uso;
// si entre tanto llegó uno, la base lo desactiva en lugar de borrarlo y el aviso dice cuántos documentos y requisitos lo usan.
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
      titulo={
        tipo ? `Eliminar el tipo de documento «${tipo.nombre}»` : 'Eliminar el tipo de documento'
      }
      descripcion="Ningún documento ni requisito lo usa. Se elimina para siempre y no se puede deshacer."
      etiquetaConfirmar="Eliminar tipo"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
