'use client'

import { useAction } from 'next-safe-action/hooks'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { conRed, enfocarPrimerError, resultadoDeAccion } from '@/shared/lib/formularios'
import { RUTAS } from '@/shared/lib/rutas'
import { avisar, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  TEXTO_HABILITADA_SIN_PERMISO,
  type ConfiguracionEnLaRueda,
} from '../../../../entities/cola/rueda'
import { configurarEnLaRueda } from '../actions/configurar-en-la-rueda'

type Opciones = {
  // Quien mira puede abrir Roles: el aviso del rol lleva el enlace.
  puedeVerRoles: boolean
  alGuardar: () => void
}

export type ErroresDeLaRueda = Partial<Record<'maxAbiertas' | 'prioridad' | 'orden', string>>

// Guardar a alguien en la rueda. Si algo falla, lo escrito queda y el foco va al primer campo con error. Con `ok`, el panel se cierra (la página se relee
// por la revalidación) y, si su rol no recibe turnos, lo avisa con «Abrir Roles» (8-1).
export function useAgregarALaRueda({ puedeVerRoles, alGuardar }: Opciones) {
  const router = useRouter()
  const { executeAsync, result, isPending } = useAction(configurarEnLaRueda)

  async function guardar(
    configuracion: ConfiguracionEnLaRueda,
    nombre: string,
    formulario: HTMLFormElement | null,
  ): Promise<void> {
    const resultado = resultadoDeAccion(await conRed(executeAsync(configuracion)))
    if (!resultado.ok) {
      // Un error de validación ya está escrito al lado de su campo.
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      enfocarPrimerError(formulario)
      return
    }
    alGuardar()
    if (resultado.data.enLaRueda === false) {
      avisar(
        TEXTO_HABILITADA_SIN_PERMISO,
        puedeVerRoles
          ? {
              etiqueta: 'Abrir Roles',
              alHacer: () => {
                router.push(RUTAS.roles as Route)
              },
              sale: true,
            }
          : undefined,
      )
    } else if (resultado.data.enLaRueda === true) {
      avisarExito(`${nombre} está en la rueda.`)
    } else {
      avisarExito(`Guardaste a ${nombre} en la cola.`)
    }
  }

  const campos = result.validationErrors?.fieldErrors ?? {}
  const errores: ErroresDeLaRueda = {
    maxAbiertas: campos.maxAbiertas?.[0],
    prioridad: campos.prioridad?.[0],
    orden: campos.orden?.[0],
  }
  return { guardar, enCurso: isPending, errores }
}
