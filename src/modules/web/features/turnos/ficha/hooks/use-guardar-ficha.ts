'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState, type RefObject } from 'react'
import { conRed, enfocarPrimerError, resultadoDeAccion, valoresDe } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarFicha } from '../actions/guardar-ficha'

// Los campos de texto del formulario, por su `name`.
export const CAMPOS_DE_FICHA = [
  'whatsapp',
  'handle',
  'cargo',
  'presentacion',
  'especialidades',
] as const

export type ErroresDeFicha = Partial<Record<string, string>>

type Opciones = {
  // La versión del perfil que se leyó al abrir: detecta un cambio ajeno (PT409 → «Recargar»).
  actualizadoEn: string
  formulario: RefObject<HTMLFormElement | null>
}

// Guardar mi ficha. Lo tipeado queda siempre: si algo falla, el motivo va junto a su campo y el foco al primero. Un conflicto se muestra dentro del formulario, no en un
// toast. Con `ok`, la página se vuelve a pedir y el formulario se monta con la versión nueva (su `key`).
export function useGuardarFicha({ actualizadoEn, formulario }: Opciones) {
  const router = useRouter()
  const { executeAsync, result, isPending } = useAction(guardarFicha)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<ErroresDeFicha>({})

  async function guardar(publicoWeb: boolean): Promise<void> {
    const elemento = formulario.current
    if (!elemento) {
      return
    }
    setPorCampo({})
    const respuesta = await conRed(
      executeAsync({
        ...valoresDe(elemento, CAMPOS_DE_FICHA),
        publicoWeb,
        actualizadoEnEsperado: actualizadoEn,
      }),
    )
    const resultado = resultadoDeAccion(respuesta)
    if (!resultado.ok) {
      if (resultado.error.codigo === 'conflicto') {
        setConflicto(resultado.error.mensaje)
        return
      }
      const delCampo =
        respuesta.data && 'porCampo' in respuesta.data ? respuesta.data.porCampo : undefined
      if (delCampo) {
        setPorCampo(delCampo)
      } else if (resultado.error.codigo !== 'validacion') {
        // Un error de validación ya está escrito al lado de su campo.
        avisarError(resultado.error)
      }
      enfocarPrimerError(elemento)
      return
    }
    avisarExito('Tu ficha en la web quedó guardada')
    router.refresh()
  }

  // Toma la versión nueva: descarta lo tipeado y vuelve a pedir la pantalla (la versión nueva cambia la `key` del formulario).
  function recargar(): void {
    setConflicto(null)
    router.refresh()
  }

  const deValidacion: ErroresDeFicha = Object.fromEntries(
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
