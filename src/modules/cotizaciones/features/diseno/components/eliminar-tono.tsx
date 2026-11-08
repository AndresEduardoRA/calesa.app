'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { Tono } from '../../../entities/diseno/tonos'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  tono: Tono | null
  enCurso: boolean
  // Confirmado: elimina y dice si pudo (si no, el aviso ya salió).
  alEliminar: (tono: Tono) => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el botón de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un tono (`?panel=eliminar-tono&tono=<id>`): lo irreversible pide confirmar nombrando el tono. La lista no sabe cuáles usa una fórmula: si alguna versión lo
// nombra, la base lo rechaza diciendo cuál, el aviso sale con esa frase y el diálogo se cierra.
export function EliminarTono({
  abierto,
  alCerrar,
  tono,
  enCurso,
  alEliminar,
  focoAlCerrar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (tono) await alEliminar(tono)
        alCerrar()
      }}
      titulo={tono ? `Eliminar el tono «${tono.nombre}»` : 'Eliminar el tono'}
      descripcion="Si una fórmula lo usa, no se elimina y te decimos cuál. No se puede deshacer."
      etiquetaConfirmar="Eliminar tono"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
