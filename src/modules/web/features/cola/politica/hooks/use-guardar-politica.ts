'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { conRed, enfocarPrimerError, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { EdicionDePolitica } from '../../../../entities/cola/politica'
import { guardarPoliticaDeLaCola } from '../actions/guardar-politica'

export type ErroresDePolitica = Partial<Record<string, string>>

// Guardar la política. Lo escrito queda siempre: si algo falla, el motivo va junto a su campo y el foco al primero. Un conflicto se muestra dentro del
// formulario con «Recargar». Con `ok`, la revalidación trae la versión nueva y el formulario vuelve a montarse (su `key` es la versión).
export function useGuardarPolitica(actualizadoEn: string) {
  const router = useRouter()
  const { executeAsync, result, isPending } = useAction(guardarPoliticaDeLaCola)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<ErroresDePolitica>({})

  async function guardar(edicion: EdicionDePolitica, formulario: HTMLFormElement | null) {
    setPorCampo({})
    const respuesta = await conRed(
      executeAsync({ ...edicion, actualizadoEnEsperado: actualizadoEn }),
    )
    const resultado = resultadoDeAccion(respuesta)
    if (resultado.ok) {
      avisarExito('Guardaste la política de la cola.')
      return
    }
    if (resultado.error.codigo === 'conflicto') {
      setConflicto(resultado.error.mensaje)
      return
    }
    const delCampo =
      respuesta.data && 'porCampo' in respuesta.data ? respuesta.data.porCampo : undefined
    if (delCampo) {
      setPorCampo(delCampo)
    } else if (resultado.error.codigo !== 'validacion') {
      avisarError(resultado.error)
    }
    enfocarPrimerError(formulario)
  }

  function recargar() {
    setConflicto(null)
    router.refresh()
  }

  const deValidacion: ErroresDePolitica = Object.fromEntries(
    Object.entries(result.validationErrors?.fieldErrors ?? {}).map(([campo, mensajes]) => [
      campo,
      (mensajes as string[] | undefined)?.[0],
    ]),
  )
  return {
    guardar,
    recargar,
    enCurso: isPending,
    conflicto,
    errores: { ...deValidacion, ...porCampo },
  }
}
