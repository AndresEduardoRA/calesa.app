'use client'

import { descartarFotoDeTestimonio } from '../../../../areas/contenido/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { Testimonio } from '../../../../entities/contenido/testimonios'
import { eliminarTestimonio } from '../actions/eliminar-testimonio'
import { guardarTestimonio } from '../actions/guardar-testimonio'
import { retirarConsentimiento } from '../actions/retirar-consentimiento'

// Publicar, despublicar, retirar el consentimiento y eliminar un testimonio desde la lista (8.02-2), una escritura a la vez. La lista se renueva con el
// `revalidatePath` de la action. `retirar` y `eliminar` devuelven el motivo si la base no lo dejó, para que el diálogo lo diga.
export function useEscrituraDeTestimonios() {
  const { mandar, enCurso } = useUnEnvioALaVez()
  return {
    enCurso,
    publicar: async (testimonio: Testimonio, publicado: boolean) => {
      const envio = await mandar(() =>
        enviarAccion(
          guardarTestimonio({
            id: testimonio.id,
            actualizadoEnEsperado: testimonio.actualizadoEn,
            cambios: { publicado },
          }),
          'No se pudo guardar el testimonio.',
        ),
      )
      if (envio === null) return
      if (envio.ok) {
        avisarExito(publicado ? 'Testimonio publicado.' : 'Testimonio despublicado.')
      } else {
        avisarError(envio.error)
      }
    },
    retirar: async (testimonio: Testimonio): Promise<ErrorApp | null> => {
      const envio = await enviarAccion(
        retirarConsentimiento({
          id: testimonio.id,
          actualizadoEnEsperado: testimonio.actualizadoEn,
        }),
        'No se pudo retirar el consentimiento.',
      )
      if (envio.ok) {
        avisarExito('Consentimiento retirado.')
        return null
      }
      return envio.error
    },
    eliminar: async (testimonio: Testimonio): Promise<ErrorApp | null> => {
      const envio = await enviarAccion(
        eliminarTestimonio({
          id: testimonio.id,
          actualizadoEnEsperado: testimonio.actualizadoEn,
        }),
        'No se pudo eliminar el testimonio.',
      )
      if (envio.ok) {
        // Su foto ya no la usa esta fila: se borra sólo si ninguna otra la usa.
        if (testimonio.fotoRuta !== null) await descartarFotoDeTestimonio(testimonio.fotoRuta)
        avisarExito('Testimonio eliminado.')
        return null
      }
      return envio.error
    },
  }
}
