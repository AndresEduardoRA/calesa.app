import {
  textoDeMotivo,
  type EstadoDeVitrina,
  type MotivoDeNoVisible,
} from '../../../entities/vitrina'
import { BadgeDeVitrina } from './badge-de-vitrina'

type Props = {
  estado: EstadoDeVitrina
  // Por qué no se ve, de lo más general a lo más particular: se dice el primero.
  motivos: readonly MotivoDeNoVisible[]
  // Los nombres salen de sus filas.
  origen: { nombre: string }
  fase: { nombre: string } | null
}

// El estado de un vehículo en la vitrina, con su motivo ya puesto en palabras.
export function InsigniaDeVitrina({ estado, motivos, origen, fase }: Props) {
  const [primero] = motivos
  const motivo =
    estado === 'no_visible' && primero
      ? textoDeMotivo(primero, { origen: origen.nombre, fase: fase?.nombre ?? null })
      : undefined
  return <BadgeDeVitrina estado={estado} motivo={motivo} />
}
