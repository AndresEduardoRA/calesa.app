'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { DetalleDeTarea } from '../../../entities/detalle'
import { MENSAJE_DE_VALIDACION } from '../../resultado'
import { completarTarea } from '../actions/completar-tarea'
import { reasignarTarea } from '../actions/reasignar-tarea'

// La página relee la tarea tras cada cambio (la action revalida `/agenda`) y el panel se reinicia con su versión nueva.
// Completar, reabrir y reasignar una tarea desde su panel: comparten el conflicto (`PT409`, con «Recargar») y el estado en curso.
export function useAccionesDeTarea(tarea: DetalleDeTarea) {
  const completar = useAction(completarTarea)
  const reasignar = useAction(reasignarTarea)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [errorDeResponsable, setErrorDeResponsable] = useState<string | undefined>()

  async function poner(completada: boolean) {
    setConflicto(null)
    const envio = await enviarAccion(
      completar.executeAsync({
        id: tarea.id,
        actualizadoEnEsperado: tarea.actualizadoEn,
        completada,
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
    avisarExito(completada ? 'Tarea hecha.' : 'Tarea reabierta.')
  }

  async function cambiarDeResponsable(persona: { id: string; nombre: string }) {
    setConflicto(null)
    setErrorDeResponsable(undefined)
    const envio = await enviarAccion(
      reasignar.executeAsync({
        id: tarea.id,
        actualizadoEnEsperado: tarea.actualizadoEn,
        responsableId: persona.id,
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if (envio.error.codigo === 'conflicto') {
        setConflicto(envio.error.mensaje)
      } else if ('porCampo' in envio && envio.porCampo?.['responsable_id']) {
        setErrorDeResponsable(envio.porCampo['responsable_id'])
      } else {
        avisarError(envio.error)
      }
      return
    }
    avisarExito(`Tarea reasignada a ${persona.nombre}.`)
  }

  return {
    conflicto,
    errorDeResponsable,
    limpiarConflicto: () => {
      setConflicto(null)
    },
    enCurso: completar.isPending || reasignar.isPending,
    completar: poner,
    reasignar: cambiarDeResponsable,
  }
}
