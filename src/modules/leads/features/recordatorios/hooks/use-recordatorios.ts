'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import {
  conRecordatorio,
  MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE,
  type Recordatorio,
} from '../../../entities/recordatorios'
import type { ResultadoDeRecordatorio } from '../../../entities/repositorios'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { completarRecordatorio } from '../actions/completar-recordatorio'
import { eliminarRecordatorio } from '../actions/eliminar-recordatorio'
import { restaurarRecordatorio } from '../actions/restaurar-recordatorio'

const firmaDe = (lista: readonly Recordatorio[]) =>
  lista.map((r) => `${r.id}:${r.actualizadoEn}`).join(',')

// Los recordatorios de quien mira sobre el lead: la lista la trae el servidor; lo que se crea,
// completa, edita o elimina se pone en su lugar con la respuesta, y se vuelve a leer la ficha para
// que el aviso de vencidos de la cabecera quede al día.
export function useRecordatorios(inicial: readonly Recordatorio[]) {
  const router = useRouter()
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [lista, setLista] = useState<Recordatorio[]>([...inicial])
  if (vista !== firma) {
    setVista(firma)
    setLista([...inicial])
  }
  const completar = useAction(completarRecordatorio)
  const eliminar = useAction(eliminarRecordatorio)
  const restaurar = useAction(restaurarRecordatorio)

  function poner(uno: Recordatorio & { eliminado?: boolean }) {
    setLista((antes) => conRecordatorio(antes, uno))
    router.refresh()
  }

  // Lo que vuelve de una acción: en su lugar, o el motivo (y si ya no se ve, se vuelve a leer).
  function aplicar(envio: Envio<ResultadoDeRecordatorio>): ResultadoDeRecordatorio | null {
    if (envio.ok) {
      poner(envio.data.recordatorio)
      return envio.data
    }
    avisarError(envio.error)
    if (
      envio.error.mensaje === MENSAJE_DE_RECORDATORIO_NO_DISPONIBLE ||
      envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE
    ) {
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
    )
    if (hecho) {
      avisarExito('Recordatorio restituido.')
    }
  }

  return {
    lista,
    poner,
    enCurso: completar.isPending || eliminar.isPending || restaurar.isPending,
    // Poner, no alternar: el valor que se pide, no el contrario del que se ve.
    completar: async (r: Recordatorio, completado: boolean) => {
      aplicar(
        await enviarAccion<ResultadoDeRecordatorio>(
          completar.executeAsync({ ...version(r), completado }),
          MENSAJE_DE_VALIDACION,
        ),
      )
    },
    eliminar: async (r: Recordatorio) => {
      const hecho = aplicar(
        await enviarAccion<ResultadoDeRecordatorio>(
          eliminar.executeAsync(version(r)),
          MENSAJE_DE_VALIDACION,
        ),
      )
      if (hecho) {
        const eliminado = hecho.recordatorio
        avisarConDeshacer('Recordatorio eliminado.', () => void deshacer(eliminado))
      }
    },
  }
}

export type Recordatorios = ReturnType<typeof useRecordatorios>
