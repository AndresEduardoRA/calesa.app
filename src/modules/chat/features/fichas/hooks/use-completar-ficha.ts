'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { completarTarea } from '@/modules/agenda/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import type { DatosDeFichaDeTarea } from '../../../entities/fichas'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import type { ContextoDeFichas } from '../contexto-de-fichas'

// Marcar como hecha o reabrir desde la ficha: un envío a la vez, con la versión leída. Un conflicto (otra persona cambió la tarea) o cualquier error deja
// el motivo junto al botón y un «Reintentar» que relee la ficha (trae la versión nueva) y no repite a ciegas.
export function useCompletarFicha(
  id: string,
  datos: DatosDeFichaDeTarea,
  fichas: ContextoDeFichas,
) {
  const accion = useAction(completarTarea)
  const [enCurso, setEnCurso] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hecha = datos.estado === 'completado'

  async function completar() {
    if (enCurso) {
      return
    }
    setEnCurso(true)
    setError(null)
    const envio = await enviarAccion(
      accion.executeAsync({
        id,
        actualizadoEnEsperado: datos.actualizadoEn,
        completada: !hecha,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    fichas.marcarCompletada(id, !hecha, envio.data.actualizadoEn)
    avisarExito(hecha ? 'Tarea reabierta.' : 'Tarea marcada como hecha.')
  }

  function reintentar() {
    setError(null)
    fichas.releer('tarea', id)
  }

  return { hecha, enCurso, error, completar, reintentar }
}
