'use client'

import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { completarRecordatorio } from '@/modules/leads/client'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { DetalleDeRecordatorio } from '../../../entities/recordatorio'

const MENSAJE_DE_VALIDACION = 'No pudimos completar el recordatorio. Vuelve a intentar.'

// «Completar» y «Reabrir» un recordatorio: la action es la de `leads` (la RPC exige que sea de quien actúa). Poner, no alternar. Un conflicto (`PT409`) ofrece
// «Recargar»; tras un cambio se relee la página, porque esa action no revalida `/agenda`.
export function useCompletarRecordatorio(recordatorio: DetalleDeRecordatorio) {
  const router = useRouter()
  const completar = useAction(completarRecordatorio)
  const [conflicto, setConflicto] = useState<string | null>(null)

  async function poner(completado: boolean) {
    setConflicto(null)
    const envio = await enviarAccion(
      completar.executeAsync({
        id: recordatorio.id,
        actualizadoEnEsperado: recordatorio.actualizadoEn,
        completado,
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if (envio.error.codigo === 'conflicto') {
        setConflicto(envio.error.mensaje)
      } else {
        avisarError(envio.error)
      }
      return
    }
    avisarExito(completado ? 'Recordatorio completado.' : 'Recordatorio reabierto.')
    router.refresh()
  }

  return {
    conflicto,
    enCurso: completar.isPending,
    completar: poner,
    recargar: () => {
      setConflicto(null)
      router.refresh()
    },
  }
}
