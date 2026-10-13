'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { PantallaConVistas, ParamsDeVista, VistaGuardada } from '../../../entities/vista'
import { eliminarVista } from '../actions/eliminar-vista'
import { guardarVista } from '../actions/guardar-vista'

// Guardar y eliminar vistas de un listado. Eliminar es reversible: se hace y ofrece «Deshacer»
// (que la vuelve a guardar con el mismo nombre y los mismos filtros).
export function useVistas(pantalla: PantallaConVistas) {
  const guardando = useAction(guardarVista)
  const eliminando = useAction(eliminarVista)

  async function guardar(nombre: string, params: ParamsDeVista, avisar = true) {
    const resultado = resultadoDeAccion(
      await conRed(guardando.executeAsync({ pantalla, nombre, params })),
    )
    if (resultado.ok) {
      if (avisar) {
        avisarExito(`Vista «${resultado.data.nombre}» guardada`)
      }
    } else if (resultado.error.codigo !== 'validacion') {
      avisarError(resultado.error)
    }
    return resultado.ok
  }

  async function eliminar(vista: VistaGuardada) {
    const resultado = resultadoDeAccion(
      await conRed(eliminando.executeAsync({ pantalla, id: vista.id })),
    )
    if (resultado.ok) {
      avisarConDeshacer(`Vista «${vista.nombre}» eliminada`, () => {
        void guardar(vista.nombre, vista.params, false)
      })
    } else {
      avisarError(resultado.error)
    }
  }

  return {
    guardar,
    eliminar,
    enCurso: guardando.isPending || eliminando.isPending,
    errorDeNombre: guardando.result.validationErrors?.fieldErrors.nombre?.[0],
  }
}
