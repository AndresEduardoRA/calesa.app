'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { etapasIguales, validarEtapas, type Etapa } from '../../../entities/embudo'
import { useEtapasEditables } from '../../embudo/hooks/use-etapas-editables'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarPlantillaDelEmbudo } from '../actions/guardar-plantilla-del-embudo'

const sinId = (etapas: readonly Etapa[]): Etapa[] => etapas.map((etapa) => ({ ...etapa, id: null }))

// La plantilla del embudo en Configuración: las etapas se editan con el editor del panel del embudo y se guardan juntas, con la versión
// de la plantilla. Las reglas se dicen antes de enviar; lo que la base rechaza vuelve con su motivo, y un conflicto ofrece «Recargar».
// «Restablecer» es `useRestablecerPlantillaDelEmbudo()`.
export function usePlantillaDelEmbudo(embudo: AjustesDeLeads['embudo']) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  // Un id local sólo para la `key` de cada fila (el foco sigue a la etapa al moverla); no viaja.
  const [inicial] = useState(() =>
    embudo.etapas.map((etapa) => ({ ...etapa, id: crypto.randomUUID() })),
  )
  const edicion = useEtapasEditables(inicial, () => {
    setError(null)
  })
  const guardar = useAction(guardarPlantillaDelEmbudo)

  function rechazo(falla: ErrorApp) {
    if (falla.codigo === 'conflicto') {
      setConflicto(falla.mensaje)
    } else if (falla.codigo === 'regla' || falla.codigo === 'validacion') {
      setError(falla.mensaje)
    } else {
      avisarError(falla)
    }
  }

  async function enviar() {
    const motivo = validarEtapas(edicion.etapas)
    if (motivo) {
      setError(motivo)
      return
    }
    const envio = await enviarAccion(
      guardar.executeAsync({
        actualizadoEnEsperado: embudo.actualizadoEn,
        etapas: sinId(edicion.etapas),
      }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      rechazo(envio.error)
      return
    }
    router.refresh()
    avisarExito('Plantilla del embudo guardada.')
  }

  return {
    ...edicion,
    // Algo cambiado que todavía no se guardó: «Guardar» se apaga sin cambios.
    hayCambios: !etapasIguales(sinId(edicion.etapas), embudo.etapas),
    error,
    conflicto,
    enCurso: guardar.isPending,
    enviar,
    // Trae la versión nueva: la `key` del formulario es la versión, así que vuelve a montarse con ella.
    recargar: () => {
      router.refresh()
    },
  }
}
