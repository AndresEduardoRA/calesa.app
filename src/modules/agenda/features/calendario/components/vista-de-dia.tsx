import type { EntradaDeAgenda } from '../../../entities/agenda'
import { ListaPorDia } from './lista-por-dia'

type Props = {
  fecha: string
  entradas: readonly EntradaDeAgenda[]
  zona: string
  hoy: string
}

// El día: la lista de lo suyo, con la hora de cada cosa. Igual en el celular y en el escritorio.
export function VistaDeDia({ fecha, entradas, zona, hoy }: Props) {
  return (
    <ListaPorDia entradas={entradas} dias={[fecha]} zona={zona} hoy={hoy} soloConCosas={false} />
  )
}
