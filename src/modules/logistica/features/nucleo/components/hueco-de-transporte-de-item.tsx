import { textoDelTransporteDelItem } from '../../../entities/nucleo/transporte-de-item'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'

// El hueco «Transporte» de un ítem de repuesto (D5 de 8.13-2): sigue al vehículo de su proyecto. El de un vehículo es del área `transporte` y no ve un ítem.
export function HuecoDeTransporteDeItem({ unidad }: { unidad: UnidadAbierta }) {
  return (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">
      {textoDelTransporteDelItem(unidad.proyecto)}
    </p>
  )
}
