'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import type { NivelDeAcceso } from '../../../entities/nivel'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El que se elimina (el último que se vio, mientras el diálogo se va).
  nivel: NivelDeAcceso | null
  enCurso: boolean
  // Confirmado: elimina y dice si pudo (si no, el aviso ya salió).
  alEliminar: (nivel: NivelDeAcceso) => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el «⋯» de esa fila, que sigue ahí si no se eliminó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Eliminar» un nivel (`?panel=eliminar-nivel&nivel=<id>`): lo irreversible pide confirmar nombrando el nivel. Sólo se llega con uno que ninguna
// versión de ninguna fórmula nombra; si entre tanto otra persona lo puso en uso, la base lo rechaza con su motivo, la lista lo muestra y el
// diálogo se cierra.
export function EliminarNivel({
  abierto,
  alCerrar,
  nivel,
  enCurso,
  alEliminar,
  focoAlCerrar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        if (nivel) {
          await alEliminar(nivel)
        }
        alCerrar()
      }}
      titulo={nivel ? `Eliminar el nivel «${nivel.nombre}»` : 'Eliminar el nivel'}
      descripcion="Ninguna hoja lo usa. Se eliminan también sus permisos en los roles y no se puede deshacer."
      etiquetaConfirmar="Eliminar nivel"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
