'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState, type RefObject } from 'react'
import { conRed, enfocarPrimerError, resultadoDeAccion, valoresDe } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { REDES_DEL_SITIO } from '../../../../entities/sitio/ajustes'
import { guardarAjustesDelSitio } from '../actions/guardar-ajustes'

// Los campos de texto del formulario, por su `name`. Son también los que entran al borrador (las casillas y el interruptor no).
export const CAMPOS_DE_AJUSTES_DEL_SITIO = [
  'nombreSitio',
  'lema',
  'direccionPublica',
  'whatsappRespaldo',
  'horario',
  ...REDES_DEL_SITIO,
  'seoTitulo',
  'seoDescripcion',
] as const

export type ErroresDeAjustesDelSitio = Partial<Record<string, string>>

type Opciones = {
  // La versión de la fila que se leyó al abrir: detecta un cambio ajeno (PT409 → «Recargar»).
  actualizadoEn: string
  formulario: RefObject<HTMLFormElement | null>
  // Después de guardar o de recargar: lo tipeado ya no hace falta (limpia el borrador).
  alGuardar: () => void
}

// Guardar los ajustes del sitio. Lo tipeado queda siempre: si algo falla, el motivo va junto a su campo y el foco al primero. Un conflicto
// se muestra dentro del formulario (no en un toast). Con `ok`, la revalidación trae la fila nueva y la sección vuelve a montar el
// formulario (su `key` es la versión).
export function useGuardarAjustesDelSitio({ actualizadoEn, formulario, alGuardar }: Opciones) {
  const router = useRouter()
  const { executeAsync, result, isPending } = useAction(guardarAjustesDelSitio)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<ErroresDeAjustesDelSitio>({})

  async function guardar(extra: {
    mostrarMonedaSecundaria: boolean
    origenesVisibles: string[]
  }): Promise<void> {
    const elemento = formulario.current
    if (!elemento) {
      return
    }
    setPorCampo({})
    const respuesta = await conRed(
      executeAsync({
        ...valoresDe(elemento, CAMPOS_DE_AJUSTES_DEL_SITIO),
        ...extra,
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
    avisarExito('Ajustes del sitio guardados')
    alGuardar()
  }

  // Toma la versión nueva: descarta lo tipeado y vuelve a pedir la pantalla (la versión nueva cambia la `key` del formulario).
  function recargar(): void {
    alGuardar()
    setConflicto(null)
    router.refresh()
  }

  const deValidacion: ErroresDeAjustesDelSitio = Object.fromEntries(
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
