'use client'

import { useAction } from 'next-safe-action/hooks'
import { errorDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import { generarEnlace } from '../actions/generar-enlace'

// Generar enlaces de invitación. Los errores se avisan acá; quien llama recibe el dato o null.
export function useInvitaciones() {
  const generando = useAction(generarEnlace)

  async function pedirEnlace(personaId: string): Promise<string | null> {
    const resultado = await generando.executeAsync({ personaId })
    if (resultado.data?.ok) {
      return resultado.data.data.enlace
    }
    const error = errorDeAccion(resultado)
    if (error) {
      avisarError(error)
    }
    return null
  }

  return { pedirEnlace, generando: generando.isPending }
}
