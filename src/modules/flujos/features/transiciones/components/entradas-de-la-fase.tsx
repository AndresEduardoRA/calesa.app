import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import { entradasDe } from '../../../entities/transiciones/formulario-de-salida'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// «Entradas»: desde qué fases se llega a ésta (las salidas de las otras que la nombran). Sólo lectura. Una fase inicial puede no tener entradas.
export function EntradasDeLaFase({ flujo, fase }: Props) {
  const entradas = entradasDe(flujo, fase.id)
  return (
    <p className="text-(length:--text-sm) break-words text-(--color-ink)">
      <span className="font-medium">Entradas: </span>
      {entradas.length > 0 ? (
        `Se llega desde: ${entradas.map((f) => f.nombre).join(', ')}`
      ) : (
        <span className="text-(--color-ink-soft)">
          {fase.esInicial
            ? 'Es una fase inicial: nadie llega aquí.'
            : 'Nadie llega aquí: es una fase inicial o le falta una entrada.'}
        </span>
      )}
    </p>
  )
}
