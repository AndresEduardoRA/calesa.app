'use client'

import { useAction } from 'next-safe-action/hooks'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { ConfiguracionEnLaRueda } from '../../../../entities/cola/rueda'
import { deshacerQuitar } from '../actions/deshacer-quitar'
import { quitarDeLaRueda } from '../actions/quitar-de-la-rueda'

type Props = { configuracion: ConfiguracionEnLaRueda; nombre: string }

// «Quitar» de una fila del tablero: se hace en el acto y ofrece «Deshacer» (vuelve a habilitarla con los mismos valores). Sin versión: la última escritura
// gana (8.04-1, D8). La página se relee por la revalidación.
export function QuitarDeLaRueda({ configuracion, nombre }: Props) {
  const quitar = useAction(quitarDeLaRueda)
  const deshacer = useAction(deshacerQuitar)

  async function alQuitar() {
    const resultado = resultadoDeAccion(await conRed(quitar.executeAsync(configuracion)))
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    avisarConDeshacer(`Quitaste a ${nombre} de la rueda.`, () => {
      void alDeshacer()
    })
  }

  async function alDeshacer() {
    const resultado = resultadoDeAccion(await conRed(deshacer.executeAsync(configuracion)))
    if (resultado.ok) {
      avisarExito(`${nombre} volvió a la rueda.`)
    } else {
      avisarError(resultado.error)
    }
  }

  return (
    <Button
      variant="ghost"
      className="ml-auto h-11 md:h-7"
      disabled={quitar.isPending || deshacer.isPending}
      aria-label={`Quitar a ${nombre} de la rueda`}
      onClick={() => {
        void alQuitar()
      }}
    >
      Quitar
    </Button>
  )
}
