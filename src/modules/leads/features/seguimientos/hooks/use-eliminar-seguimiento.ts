'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { ResultadoDeSeguimiento } from '../../../entities/repositorios'
import {
  MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE,
  type Seguimiento,
} from '../../../entities/seguimiento'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { eliminarSeguimiento } from '../actions/eliminar-seguimiento'
import { restaurarSeguimiento } from '../actions/restaurar-seguimiento'

// Eliminar no pregunta: se hace y ofrece «Deshacer» 10 s, que lo vuelve con su contenido y su
// lugar. La versión que pide restaurar es la que devolvió eliminar.
export function useEliminarSeguimiento(poner: (seguimiento: Seguimiento) => void) {
  const router = useRouter()
  const eliminar = useAction(eliminarSeguimiento)
  const restaurar = useAction(restaurarSeguimiento)

  function fallo(error: { mensaje: string; codigo: string }) {
    avisarError(error as Parameters<typeof avisarError>[0])
    if (
      error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE ||
      error.mensaje === MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE
    ) {
      router.refresh()
    }
  }

  async function deshacer(eliminado: Seguimiento) {
    const envio = await enviarAccion<ResultadoDeSeguimiento>(
      restaurar.executeAsync({ id: eliminado.id, actualizadoEnEsperado: eliminado.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      fallo(envio.error)
      return
    }
    poner(envio.data.seguimiento)
    avisarExito('Seguimiento restituido.')
  }

  return {
    enCurso: eliminar.isPending || restaurar.isPending,
    eliminar: async (seguimiento: Seguimiento) => {
      const envio = await enviarAccion<ResultadoDeSeguimiento>(
        eliminar.executeAsync({
          id: seguimiento.id,
          actualizadoEnEsperado: seguimiento.actualizadoEn,
        }),
        MENSAJE_DE_VALIDACION,
      )
      if (!envio.ok) {
        fallo(envio.error)
        return
      }
      const eliminado = envio.data.seguimiento
      poner(eliminado)
      avisarConDeshacer('Seguimiento eliminado.', () => void deshacer(eliminado))
    },
  }
}
