import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import {
  NOTA_DE_PERMISO_GENERAL,
  quienMueve,
  textoDeQuienMueve,
} from '../../../entities/transiciones/quien-mueve'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar; roles: readonly RolLeido[] }

// «Quién puede mover a esta fase»: la lista de la fase (sin tomar en cuenta las listas de cada salida, que van en su fila). Sólo lectura.
export function QuienMueveALaFase({ flujo, fase, roles }: Props) {
  const texto = textoDeQuienMueve(quienMueve(flujo, null, fase.id), roles, false)
  return (
    <div className="grid gap-0.5 text-(length:--text-sm) break-words">
      <p className="font-medium text-(--color-ink)">Quién puede mover a esta fase</p>
      <p className="text-(--color-ink)">{texto}</p>
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">{NOTA_DE_PERMISO_GENERAL}</p>
    </div>
  )
}
