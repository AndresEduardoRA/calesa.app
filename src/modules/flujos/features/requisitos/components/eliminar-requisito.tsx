'use client'

import { Confirmar } from '@/shared/ui/confirmar'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La descripción del que se quita (el último que se vio, mientras el diálogo se va).
  descripcion: string | null
  enCurso: boolean
  // Confirmado: quita y dice si pudo (si no, el aviso ya salió).
  alQuitar: () => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el «⋯» de esa fila, que sigue ahí si no se quitó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Quitar» un requisito (`?eliminar=requisito&quitar=<id>`): lo irreversible pide confirmar nombrando el requisito. Quitarlo no mueve a nadie: las unidades que
// estaban bloqueadas por él dejan de estarlo.
export function EliminarRequisito({
  abierto,
  alCerrar,
  descripcion,
  enCurso,
  alQuitar,
  focoAlCerrar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        await alQuitar()
        alCerrar()
      }}
      titulo={descripcion ? `Quitar el requisito «${descripcion}»` : 'Quitar el requisito'}
      descripcion="Se quita de esta fase para siempre y no se puede deshacer."
      etiquetaConfirmar="Quitar requisito"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
