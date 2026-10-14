'use client'

import { useAction } from 'next-safe-action/hooks'
import { edicionesDeCampos } from '@/shared/ui/campos'
import { crearCampo } from '../actions/crear-campo'
import { eliminarCampo } from '../actions/eliminar-campo'
import { guardarCampo } from '../actions/guardar-campo'
import { moverCampo } from '../actions/mover-campo'
import { vistaPreviaDeCampo } from '../actions/vista-previa-de-campo'

// Las ediciones del layout de campos de un origen: sus Server Actions, con el resto del
// comportamiento (avisos, «Deshacer», versión) del editor compartido.
export function useCampos() {
  return edicionesDeCampos({
    creando: useAction(crearCampo),
    guardando: useAction(guardarCampo),
    moviendo: useAction(moverCampo),
    eliminando: useAction(eliminarCampo),
    contando: useAction(vistaPreviaDeCampo),
  })
}
