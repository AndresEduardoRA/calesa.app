'use client'

import { useAction } from 'next-safe-action/hooks'
import type { RefObject } from 'react'
import { conRed, enfocarPrimerError, resultadoDeAccion, valoresDe } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarAjustesDeCotizacion } from '../actions/guardar-ajustes-de-cotizacion'

type Opciones = {
  // La versión de la fila que se leyó al abrir: detecta un cambio ajeno (PT409 → «Recargar»).
  actualizadoEn: string
  formulario: RefObject<HTMLFormElement | null>
}

// Guardar la vigencia y el vehículo obligatorio. Lo tipeado queda siempre: si algo falla, el foco va al primer error. Con `ok`, la
// revalidación trae la fila nueva y la sección vuelve a montar el formulario (su `key` es la versión).
export function useGuardarAjustesDeCotizacion({ actualizadoEn, formulario }: Opciones) {
  const { executeAsync, result, isPending } = useAction(guardarAjustesDeCotizacion)

  async function guardar(vehiculoObligatorioAlCotizar: boolean): Promise<void> {
    const elemento = formulario.current
    if (!elemento) {
      return
    }
    const { vigenciaDias } = valoresDe(elemento, ['vigenciaDias'] as const)
    const resultado = resultadoDeAccion(
      await conRed(
        executeAsync({
          vigenciaDias: Number(vigenciaDias),
          vehiculoObligatorioAlCotizar,
          actualizadoEnEsperado: actualizadoEn,
        }),
      ),
    )
    if (!resultado.ok) {
      // Un error de validación ya está escrito al lado de su campo.
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      enfocarPrimerError(elemento)
      return
    }
    avisarExito('Ajustes de cotización guardados')
  }

  return { guardar, enCurso: isPending, errores: result.validationErrors?.fieldErrors }
}
