'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import type { ConfigApibara } from '../../../entities/integraciones'
import { guardarApibara } from '../actions/guardar-apibara'
import { guardarSecreto } from '../actions/guardar-secreto'

// Un error de validación ya está escrito al lado de su campo; el resto se avisa.
function cerrar(resultado: ReturnType<typeof resultadoDeAccion>, exito: string): boolean {
  if (resultado.ok) {
    avisarExito(exito)
  } else if (resultado.error.codigo !== 'validacion') {
    avisarError(resultado.error)
  }
  return resultado.ok
}

// Las tres ediciones de apibara. `version` es el `actualizado_en` que tiene la pantalla: las tres
// tocan la misma fila.
export function useApibara(version: string) {
  const guardando = useAction(guardarApibara)
  const guardandoSecreto = useAction(guardarSecreto)

  return {
    cambiarEstado: async (activa: boolean) =>
      cerrar(
        resultadoDeAccion(
          await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, activa })),
        ),
        activa ? 'apibara activada' : 'apibara desactivada',
      ),
    guardarConfig: async (config: ConfigApibara) =>
      cerrar(
        resultadoDeAccion(
          await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, ...config })),
        ),
        'Configuración de apibara guardada',
      ),
    guardarClave: async (secreto: string) =>
      cerrar(
        resultadoDeAccion(
          await conRed(
            guardandoSecreto.executeAsync({
              clave: 'apibara',
              secreto,
              actualizadoEnEsperado: version,
            }),
          ),
        ),
        'Clave de apibara guardada',
      ),
    enCurso: guardando.isPending || guardandoSecreto.isPending,
    errores: {
      config: guardando.result.validationErrors?.fieldErrors,
      secreto: guardandoSecreto.result.validationErrors?.fieldErrors,
    },
  }
}

export type EdicionesDeApibara = ReturnType<typeof useApibara>
