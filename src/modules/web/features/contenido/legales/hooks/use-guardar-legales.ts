'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarLegales } from '../actions/guardar-legales'
import type { ValoresDeLegalesEnPantalla } from './valores-de-legales'

// Los motivos por campo: `terminos` y `privacidad` (el texto), `terminosTitulo` y `privacidadTitulo`, o `legales` (lo que dijo la base).
export type ErroresDeLegales = Partial<Record<string, string>>

// Guardar los dos legales de una vez. Lo escrito queda siempre: si algo falla, el motivo va junto a su campo. Un conflicto (la versión de
// la fila cambió, aquí o en «Ajustes») se muestra dentro del formulario, no en un toast; «Recargar» toma la versión nueva.
export function useGuardarLegales({
  actualizadoEn,
  valores,
  alGuardar,
}: {
  actualizadoEn: string
  valores: ValoresDeLegalesEnPantalla
  // Después de guardar o de recargar: lo escrito ya no hace falta (limpia el borrador).
  alGuardar: () => void
}) {
  const router = useRouter()
  const { executeAsync, isPending } = useAction(guardarLegales)
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [errores, setErrores] = useState<ErroresDeLegales>({})

  async function guardar(): Promise<void> {
    setErrores({})
    const respuesta = await conRed(
      executeAsync({
        actualizadoEnEsperado: actualizadoEn,
        terminos: { titulo: valores.terminosTitulo, doc: valores.terminosDoc },
        privacidad: { titulo: valores.privacidadTitulo, doc: valores.privacidadDoc },
      }),
    )
    const resultado = resultadoDeAccion(respuesta)
    if (resultado.ok) {
      avisarExito('Legales guardados')
      alGuardar()
      return
    }
    if (resultado.error.codigo === 'conflicto') {
      setConflicto(resultado.error.mensaje)
      return
    }
    const delCampo =
      respuesta.data && 'porCampo' in respuesta.data ? respuesta.data.porCampo : undefined
    if (delCampo) {
      setErrores(delCampo)
    } else {
      avisarError(resultado.error)
    }
  }

  // Toma la versión nueva: descarta lo escrito y vuelve a pedir la pantalla (la versión nueva cambia la `key` del formulario).
  function recargar(): void {
    alGuardar()
    setConflicto(null)
    router.refresh()
  }

  return { guardar, recargar, enCurso: isPending, conflicto, errores }
}
