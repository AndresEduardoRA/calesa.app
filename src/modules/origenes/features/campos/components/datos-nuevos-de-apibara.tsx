'use client'

import { useAction } from 'next-safe-action/hooks'
import { resultadoDeAccion } from '@/shared/lib/formularios'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  textoDeDatosNuevos,
  type DatoNuevoDeApibara,
} from '../../../entities/datos-nuevos-de-apibara'
import { agregarDatosDeApibara } from '../actions/agregar-datos-de-apibara'

type Props = {
  origenId: string
  datos: readonly DatoNuevoDeApibara[]
}

// «apibara trae N datos que este origen no usa»: lo que la API sumó después de que el origen nació.
// Nada se pierde (está en la respuesta guardada de cada vehículo); agregarlos los vuelve campos.
export function DatosNuevosDeApibara({ origenId, datos }: Props) {
  const { executeAsync, isPending } = useAction(agregarDatosDeApibara)

  async function agregar() {
    try {
      const resultado = resultadoDeAccion(
        await executeAsync({ origenId, rutas: datos.map((dato) => dato.ruta) }),
      )
      if (resultado.ok) {
        const { agregados } = resultado.data
        avisarExito(
          agregados === 1
            ? 'Se agregó 1 campo nuevo.'
            : `Se agregaron ${String(agregados)} campos nuevos.`,
        )
      } else {
        avisarError(resultado.error)
      }
    } catch {
      avisarError({
        codigo: 'inesperado',
        mensaje: 'No pudimos llegar al servidor. Revisa tu conexión y vuelve a intentar.',
      })
    }
  }

  return (
    <Aviso tono="info">
      <div className="grid gap-2">
        <p>{textoDeDatosNuevos(datos.length)}</p>
        <details>
          <summary className="cursor-pointer text-(length:--text-sm)">Ver cuáles</summary>
          <ul className="mt-1 grid gap-0.5 text-(length:--text-sm)">
            {datos.map((dato) => (
              <li key={dato.ruta}>
                <code>{dato.ruta}</code>
                {dato.ejemplo ? ` · por ejemplo ${dato.ejemplo}` : ''}
              </li>
            ))}
          </ul>
        </details>
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            disabled={isPending}
            onClick={() => void agregar()}
          >
            {isPending ? 'Agregando…' : 'Agregarlos'}
          </Button>
        </div>
      </div>
    </Aviso>
  )
}
