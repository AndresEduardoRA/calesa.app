'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { guardarSecreto } from '../actions/guardar-secreto'
import { guardarWebPublica } from '../actions/guardar-web-publica'
import { probarWebPublica } from '../actions/probar-web-publica'

// Un error de validación ya está escrito al lado de su campo; el resto se avisa.
function cerrar(resultado: ReturnType<typeof resultadoDeAccion>, exito: string): boolean {
  if (resultado.ok) {
    avisarExito(exito)
  } else if (resultado.error.codigo !== 'validacion') {
    avisarError(resultado.error)
  }
  return resultado.ok
}

// Las ediciones de la web pública. `version` es el `actualizado_en` de su fila: el interruptor, la
// dirección y el secreto la tocan. «Probar» no escribe: su resultado lo dibuja la tarjeta.
export function useWebPublica(version: string) {
  const guardando = useAction(guardarWebPublica)
  const guardandoSecreto = useAction(guardarSecreto)
  const probando = useAction(probarWebPublica)

  return {
    cambiarEstado: async (activa: boolean) =>
      cerrar(
        resultadoDeAccion(
          await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, activa })),
        ),
        activa ? 'Web pública activada' : 'Web pública desactivada',
      ),
    guardarDireccion: async (revalidarUrl: string) =>
      cerrar(
        resultadoDeAccion(
          await conRed(guardando.executeAsync({ actualizadoEnEsperado: version, revalidarUrl })),
        ),
        'Dirección de revalidación guardada',
      ),
    guardarSecreto: async (secreto: string) =>
      cerrar(
        resultadoDeAccion(
          await conRed(
            guardandoSecreto.executeAsync({
              clave: 'web_publica',
              secreto,
              actualizadoEnEsperado: version,
            }),
          ),
        ),
        'Secreto de revalidación guardado',
      ),
    probar: async () => resultadoDeAccion(await conRed(probando.executeAsync())),
    enCurso: guardando.isPending || guardandoSecreto.isPending,
    probando: probando.isPending,
    errores: {
      config: guardando.result.validationErrors?.fieldErrors,
      secreto: guardandoSecreto.result.validationErrors?.fieldErrors,
    },
  }
}

export type EdicionesDeWebPublica = ReturnType<typeof useWebPublica>
