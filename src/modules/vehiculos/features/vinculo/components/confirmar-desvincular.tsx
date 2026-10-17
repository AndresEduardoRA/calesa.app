'use client'

import { Confirmar } from '@/shared/ui/confirmar'
import { rotuloDeVehiculo } from '../../../entities/vehiculos-del-lead'

type Props = {
  abierto: boolean
  // El vehículo (el último que se vio, mientras el diálogo se va).
  vehiculo: { titulo: string; numero: number } | null
  alCerrar: () => void
  alConfirmar: () => Promise<unknown>
  enCurso: boolean
}

// Desvincular cuando quien lo hace no podría volver a vincularlo (edita el vehículo, pero no tiene el
// lead en su cartera): no hay «Deshacer» para esa persona, así que se pregunta antes. Tiene su URL
// (`?panel=desvincular`).
export function ConfirmarDesvincular({ abierto, vehiculo, alCerrar, alConfirmar, enCurso }: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={alConfirmar}
      titulo={vehiculo ? `Desvincular «${rotuloDeVehiculo(vehiculo)}»` : 'Desvincular'}
      descripcion="Quien tiene el lead en su cartera dejará de ver y editar este vehículo por el vínculo. Para volver a vincularlo hace falta tener el lead en la cartera."
      etiquetaConfirmar="Desvincular"
      enCurso={enCurso}
    />
  )
}
