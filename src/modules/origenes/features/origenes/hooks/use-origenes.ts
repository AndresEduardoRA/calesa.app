'use client'

import { useAction } from 'next-safe-action/hooks'
import type { z } from 'zod'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarConDeshacer } from '@/shared/ui/toasts'
import { cerrarConAviso } from '../../resultado'
import { crearOrigen } from '../actions/crear-origen'
import { eliminarOrigen } from '../actions/eliminar-origen'
import { guardarOrigen } from '../actions/guardar-origen'
import type { esquemaCrearOrigen, esquemaGuardarOrigen } from '../schemas/origenes'

// Las ediciones de un origen, cada una con su estado. Lo tipeado queda siempre: si una falla
// (también por falta de conexión), el panel o el formulario siguen abiertos.
export function useOrigenes() {
  const creando = useAction(crearOrigen)
  const guardando = useAction(guardarOrigen)
  const eliminando = useAction(eliminarOrigen)

  async function guardar(edicion: z.input<typeof esquemaGuardarOrigen>) {
    return resultadoDeAccion(await conRed(guardando.executeAsync(edicion)))
  }

  return {
    crear: async (nuevo: z.input<typeof esquemaCrearOrigen>) =>
      cerrarConAviso(
        resultadoDeAccion(await conRed(creando.executeAsync(nuevo))),
        `Origen «${nuevo.nombre.trim()}» creado`,
      ),
    guardar: async (edicion: z.input<typeof esquemaGuardarOrigen>, exito: string) =>
      cerrarConAviso(await guardar(edicion), exito),
    // Reversible: se hace y se ofrece «Deshacer», con la versión que devolvió el cambio.
    cambiarActivo: async (
      origen: { id: string; nombre: string; actualizadoEn: string },
      activo: boolean,
    ) => {
      const resultado = cerrarConAviso(
        await guardar({ id: origen.id, actualizadoEnEsperado: origen.actualizadoEn, activo }),
        null,
      )
      if (resultado.ok) {
        const deshacer = resultado.data.actualizadoEn
        avisarConDeshacer(
          activo ? `«${origen.nombre}» reactivado` : `«${origen.nombre}» desactivado`,
          () => {
            void guardar({ id: origen.id, actualizadoEnEsperado: deshacer, activo: !activo }).then(
              (vuelta) => cerrarConAviso(vuelta, null),
            )
          },
        )
      }
      return resultado
    },
    eliminar: async (origen: { id: string; nombre: string; actualizadoEn: string }) =>
      cerrarConAviso(
        resultadoDeAccion(
          await conRed(
            eliminando.executeAsync({ id: origen.id, actualizadoEnEsperado: origen.actualizadoEn }),
          ),
        ),
        `Origen «${origen.nombre}» eliminado`,
      ),
    enCurso: creando.isPending || guardando.isPending || eliminando.isPending,
    errores: {
      crear: creando.result.validationErrors?.fieldErrors,
      guardar: guardando.result.validationErrors?.fieldErrors,
    },
  }
}

export type EdicionesDeOrigenes = ReturnType<typeof useOrigenes>
