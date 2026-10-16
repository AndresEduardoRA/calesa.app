'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import {
  MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE,
  type Recordatorio,
} from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { completarRecordatorio } from '../actions/completar-recordatorio'
import { eliminarRecordatorio } from '../actions/eliminar-recordatorio'
import { restaurarRecordatorio } from '../actions/restaurar-recordatorio'
import { useListasDeRecordatorios } from './use-listas-de-recordatorios'

// Los recordatorios de quien mira sobre el lead: las listas se leen por páginas desde el navegador al
// abrir la sección o la pestaña (`useListasDeRecordatorios`); lo que se crea, completa, edita o elimina
// se pone en su lugar con la respuesta, y se vuelve a leer la página para que el aviso de vencidos de
// la cabecera de la ficha quede al día.
export function useRecordatorios(leadId: string) {
  const router = useRouter()
  const listas = useListasDeRecordatorios(leadId)
  const completar = useAction(completarRecordatorio)
  const eliminar = useAction(eliminarRecordatorio)
  const restaurar = useAction(restaurarRecordatorio)

  function poner(uno: Recordatorio & { eliminado?: boolean }) {
    listas.poner(uno)
    router.refresh()
  }

  // Lo que vuelve de una acción: en su lugar, o el motivo. Si el recordatorio ya no está, se lee por
  // su id (sale de la lista); si el lead dejó de verse, se vuelve a leer la página (lo dice la ficha).
  function aplicar(
    envio: Envio<ResultadoDeRecordatorio>,
    r: Recordatorio,
  ): ResultadoDeRecordatorio | null {
    if (envio.ok) {
      poner(envio.data.recordatorio)
      return envio.data
    }
    avisarError(envio.error)
    if (envio.error.mensaje === MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE) {
      void listas.recargarUno(r.id)
    }
    if (envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE) {
      router.refresh()
    }
    return null
  }

  const version = (r: Recordatorio) => ({ id: r.id, actualizadoEnEsperado: r.actualizadoEn })

  async function deshacer(eliminado: Recordatorio) {
    const hecho = aplicar(
      await enviarAccion<ResultadoDeRecordatorio>(
        restaurar.executeAsync(version(eliminado)),
        MENSAJE_DE_VALIDACION,
      ),
      eliminado,
    )
    if (hecho) {
      avisarExito('Recordatorio restituido.')
    }
  }

  return {
    ...listas,
    poner,
    enCurso: completar.isPending || eliminar.isPending || restaurar.isPending,
    // Poner, no alternar: el valor que se pide, no el contrario del que se ve.
    completar: async (r: Recordatorio, completado: boolean) => {
      aplicar(
        await enviarAccion<ResultadoDeRecordatorio>(
          completar.executeAsync({ ...version(r), completado }),
          MENSAJE_DE_VALIDACION,
        ),
        r,
      )
    },
    eliminar: async (r: Recordatorio) => {
      const hecho = aplicar(
        await enviarAccion<ResultadoDeRecordatorio>(
          eliminar.executeAsync(version(r)),
          MENSAJE_DE_VALIDACION,
        ),
        r,
      )
      if (hecho) {
        const eliminado = hecho.recordatorio
        avisarConDeshacer('Recordatorio eliminado.', () => void deshacer(eliminado))
      }
    },
  }
}

export type Recordatorios = ReturnType<typeof useRecordatorios>
