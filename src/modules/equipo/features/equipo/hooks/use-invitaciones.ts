'use client'

import { useAction } from 'next-safe-action/hooks'
import { errorDeAccion } from '@/shared/lib/formularios'
import { avisarError } from '@/shared/ui/toasts'
import { generarEnlace } from '../actions/generar-enlace'
import { invitar } from '../actions/invitar'

// Invitar y generar enlaces. Los errores se avisan acá; quien llama recibe el dato o null.
export function useInvitaciones() {
  const invitando = useAction(invitar)
  const generando = useAction(generarEnlace)

  async function enviar(datos: { email: string; nombre: string; rolId: string }) {
    const resultado = await invitando.executeAsync(datos)
    if (resultado.data?.ok) {
      return resultado.data.data
    }
    const error = errorDeAccion(resultado)
    if (error) {
      avisarError(error)
    }
    return null
  }

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

  return {
    enviar,
    pedirEnlace,
    invitando: invitando.isPending,
    generando: generando.isPending,
    errores: invitando.result.validationErrors?.fieldErrors,
  }
}
