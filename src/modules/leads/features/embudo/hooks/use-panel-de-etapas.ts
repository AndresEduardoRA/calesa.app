'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  etapasIguales,
  validarEtapas,
  validarNombreDeEmbudo,
  type Embudo,
} from '../../../entities/embudo'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { guardarEmbudo } from '../actions/guardar-embudo'
import { guardarEtapas } from '../actions/guardar-etapas'
import { useEtapasEditables } from './use-etapas-editables'

// El panel «Etapas» de un embudo: su nombre y sus etapas, editados en la pantalla y guardados juntos
// (primero el nombre, si cambió, y con la versión que devuelve, las etapas). Las reglas se dicen antes
// de enviar; lo que la base rechaza vuelve con su motivo, y un conflicto (otra pestaña lo cambió)
// ofrece «Recargar» dentro del panel.
export function usePanelDeEtapas(embudo: Embudo, otros: readonly Embudo[], alTerminar: () => void) {
  const router = useRouter()
  const [nombre, setNombre] = useState(embudo.nombre)
  const [error, setError] = useState<string | null>(null)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const edicion = useEtapasEditables(embudo.etapas, () => {
    setError(null)
  })
  const renombrar = useAction(guardarEmbudo)
  const guardar = useAction(guardarEtapas)

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
    const motivo = validarNombreDeEmbudo(nombre, otros, embudo.id) ?? validarEtapas(edicion.etapas)
    if (motivo) {
      setError(motivo)
      return
    }
    let version = embudo.actualizadoEn
    if (nombre.trim() !== embudo.nombre) {
      const envio = await enviarAccion(
        renombrar.executeAsync({
          id: embudo.id,
          actualizadoEnEsperado: version,
          nombre: nombre.trim(),
        }),
        MENSAJE_DE_VALIDACION,
      )
      if (!envio.ok) {
        rechazo(envio.error)
        return
      }
      version = envio.data.embudo?.actualizadoEn ?? version
    }
    if (!etapasIguales(edicion.etapas, embudo.etapas)) {
      const envio = await enviarAccion(
        guardar.executeAsync({
          embudoId: embudo.id,
          actualizadoEnEsperado: version,
          etapas: edicion.etapas,
        }),
        MENSAJE_DE_VALIDACION,
      )
      if (!envio.ok) {
        rechazo(envio.error)
        return
      }
    }
    router.refresh()
    avisarExito('Embudo guardado.')
    alTerminar()
  }

  return {
    ...edicion,
    nombre,
    setNombre: (valor: string) => {
      setNombre(valor)
      setError(null)
    },
    error,
    conflicto,
    enCurso: renombrar.isPending || guardar.isPending,
    enviar,
    recargar: () => {
      window.location.reload()
    },
  }
}

export type PanelDeEtapas = ReturnType<typeof usePanelDeEtapas>
