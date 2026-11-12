'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { useUnEnvioALaVez } from '@/shared/ui/use-un-envio-a-la-vez'
import type { Faq } from '../../../../entities/contenido/faqs'
import { eliminarFaq } from '../actions/eliminar-faq'
import { guardarFaq } from '../actions/guardar-faq'
import { moverFaq } from '../actions/mover-faq'

// Publicar, despublicar, mover y eliminar una pregunta desde la lista (8.02-1), una escritura a la vez. La lista se renueva con el `revalidatePath` de la
// action. `eliminar` devuelve el motivo si la base no lo dejó, para que el diálogo lo diga.
export function useEscrituraDeFaqs() {
  const { mandar, enCurso } = useUnEnvioALaVez()
  return {
    enCurso,
    publicar: async (faq: Faq, publicada: boolean) => {
      const envio = await mandar(() =>
        enviarAccion(
          guardarFaq({
            id: faq.id,
            actualizadoEnEsperado: faq.actualizadoEn,
            cambios: { publicada },
          }),
          'No se pudo guardar la pregunta.',
        ),
      )
      if (envio === null) return
      if (envio.ok) {
        avisarExito(publicada ? 'Pregunta publicada.' : 'Pregunta despublicada.')
      } else {
        avisarError(envio.error)
      }
    },
    mover: async (id: string, direccion: 'subir' | 'bajar') => {
      const envio = await mandar(() =>
        enviarAccion(moverFaq({ id, direccion }), 'No se pudo mover la pregunta.'),
      )
      if (envio !== null && !envio.ok) {
        avisarError(envio.error)
      }
    },
    eliminar: async (faq: Faq): Promise<ErrorApp | null> => {
      const envio = await enviarAccion(
        eliminarFaq({ id: faq.id, actualizadoEnEsperado: faq.actualizadoEn }),
        'No se pudo eliminar la pregunta.',
      )
      if (envio.ok) {
        avisarExito('Pregunta eliminada.')
        return null
      }
      return envio.error
    },
  }
}
