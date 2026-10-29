'use client'

import type { HojaLista } from '../../../entities/hoja'
import { ModosDeLaHoja } from './modos-de-la-hoja'

type Props = {
  cabecera: HojaLista['cabecera']
  modoElegido: string | null
  alElegirModo: (clave: string) => void
}

// Lo que es de la hoja entera y va arriba de las secciones (`docs/UX.md` › «Cotizar»). Los modos de tipo de cambio sólo se dibujan si hay dos o más: con uno no hay qué elegir
// (el resumen dice cuál es) y sin modos no hay nada. Si nada se dibuja, tampoco la caja.
export function CabeceraDeHoja({ cabecera, modoElegido, alElegirModo }: Props) {
  if (cabecera.modos.length < 2) {
    return null
  }
  return (
    <div data-cabecera="" className="grid min-w-0 gap-3">
      <ModosDeLaHoja modos={cabecera.modos} elegido={modoElegido} alElegir={alElegirModo} />
    </div>
  )
}
