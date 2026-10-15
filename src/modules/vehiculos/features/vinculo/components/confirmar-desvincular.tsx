'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import { rotuloDeVehiculo } from '../../../entities/vehiculos-del-lead'

type Props = {
  vehiculo: { titulo: string; numero: number } | null
  alCerrar: () => void
  alConfirmar: () => void
  enCurso: boolean
}

// Desvincular cuando quien lo hace no podría volver a vincularlo (edita el vehículo, pero no tiene el
// lead en su cartera): no hay «Deshacer» para esa persona, así que se pregunta antes.
export function ConfirmarDesvincular({ vehiculo, alCerrar, alConfirmar, enCurso }: Props) {
  return (
    <Confirmar
      abierto={vehiculo !== null}
      alCerrar={alCerrar}
      alConfirmar={alConfirmar}
      titulo={vehiculo ? `Desvincular «${rotuloDeVehiculo(vehiculo)}»` : 'Desvincular'}
      descripcion="Quien tiene el lead en su cartera dejará de ver y editar este vehículo por el vínculo. Para volver a vincularlo hace falta tener el lead en la cartera."
      etiquetaConfirmar="Desvincular"
      enCurso={enCurso}
    />
  )
}
